const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8765',h={'X-Pixel-Editor':'1'};
const DRAFT='draft-7278d7c9-a753-4c98-bf8b-d7c2d45119ba',BRANCH='character-036f28f0-189b-4ec8-83b5-6475c88e0239';
const out=fs.readFileSync(path.join(root,'备份','latest-body-sync-path.txt'),'utf8').trim();
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const get=async id=>{const r=await fetch(base+'/api/project?id='+id,{headers:h});return {status:r.status,etag:r.headers.get('etag'),bytes:Buffer.from(await r.arrayBuffer())};};
const put=async(id,etag,bytes)=>{const r=await fetch(base+'/api/project?id='+id,{method:'PUT',headers:{...h,'Content-Type':'application/json','If-Match':etag},body:bytes});return {status:r.status,etag:r.headers.get('etag'),text:await r.text()};};
const dec=cel=>png.decode(Buffer.from(cel.dataURL.slice(cel.dataURL.indexOf(',')+1),'base64'));
const BODY=/^(?:body|身体)$/,BODY_LINE=/^(?:body|身体) 描边$/;
function canvas(w,h){return {width:w,height:h,data:new Uint8Array(w*h*4)};}
function stack(images,w,h){const d=canvas(w,h);for(const im of images){if(!im)continue;for(let i=0;i<im.data.length;i+=4){if(!im.data[i+3])continue;d.data.set(im.data.subarray(i,i+4),i);}}return d;}
function place(image,w,h,dx,dy){const d=canvas(w,h);for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){const i=(y*image.width+x)*4;if(!image.data[i+3])continue;const tx=x+dx,ty=y+dy;if(tx<0||ty<0||tx>=w||ty>=h)throw new Error('像素超出画布');d.data.set(image.data.subarray(i,i+4),(ty*w+tx)*4);}return d;}
function visibleSame(a,b){
 if(!a||!b)return false;
 if(a.width!==b.width||a.height!==b.height)return false;
 for(let i=0;i<a.data.length;i+=4){
  if(!a.data[i+3]&&!b.data[i+3])continue; // 两边都透明的残留色不影响画面
  if(a.data[i]!==b.data[i]||a.data[i+1]!==b.data[i+1]||a.data[i+2]!==b.data[i+2]||a.data[i+3]!==b.data[i+3])return false;
 }
 return true;
}
const celOf=(p,si,test,key)=>p.layers.find(l=>!l.isGroup&&l.sheetIndex===si&&test.test(l.name)&&l.frameData?.[key])?.frameData[key];
function mapping(mainSheet,mai,mainFrame,draftFrame){
 const layout=mainSheet.canvasLayout?.actions?.[mai];
 const padded=layout&&mainFrame.width===layout.width&&mainFrame.height===layout.height;
 return {
  dx:padded?layout.x:mainFrame.width===draftFrame.width?0:layout?.x??0,
  dy:padded?layout.y:mainFrame.height===draftFrame.height?0:layout?.y??0
 };
}
function check(main,draft,label){
 const report={frames:0,mismatch:[],outlinePixels:0,fillOutlineLeft:0,perSheet:{}};
 for(const [msi,sheet]of main.spriteSheets.entries()){
  const dsi=draft.spriteSheets.findIndex(s=>s.name===sheet.name);
  if(dsi<0){report.mismatch.push(sheet.name+' 素体主缺少素材表');continue;}
  const dSheet=draft.spriteSheets[dsi];
  report.perSheet[sheet.name]={frames:0,outline:0};
  for(const [mai,action]of sheet.actions.entries()){
   const dai=dSheet.actions.findIndex(a=>a.name===action.name&&a.direction===action.direction);
   if(dai<0){report.mismatch.push(sheet.name+'/'+action.name+' 素体主缺少动作');continue;}
   for(const fi of action.frames.keys()){
    const key=`${mai}_${fi}`,mKey=`${msi}_${mai}_${fi}`,dKey=`${dsi}_${dai}_${fi}`;
    const mainLedger=main.layers.find(l=>!l.isGroup&&l.sheetIndex===msi&&BODY.test(l.name)&&l.frameData?.[mKey]);
    const fill=draft.layers.find(l=>!l.isGroup&&l.sheetIndex===dsi&&BODY.test(l.name)&&l.frameData?.[dKey]);
    const line=draft.layers.find(l=>!l.isGroup&&l.sheetIndex===dsi&&BODY_LINE.test(l.name)&&l.frameData?.[dKey]);
    if(!mainLedger||!fill){report.mismatch.push(label+' '+sheet.name+'/'+action.name+'/f'+fi+' 缺 body');continue;}
    const mainImage=dec(mainLedger.frameData[mKey]),fillImage=dec(fill.frameData[dKey]),lineImage=line&&dec(line.frameData[dKey]);
    const df=dSheet.actions[dai].frames[fi],mf=action.frames[fi];
    const layout=sheet.canvasLayout?.actions?.[mai];
    const padded=layout&&mainImage.width===layout.width&&mainImage.height===layout.height&&(fillImage.width!==mainImage.width||fillImage.height!==mainImage.height);
    const dx=padded?layout.x:0,dy=padded?layout.y:0;
    const composite=stack([lineImage,fillImage],fillImage.width,fillImage.height);
    const inMain=place(composite,mainImage.width,mainImage.height,dx,dy);
    if(!visibleSame(inMain,mainImage))report.mismatch.push(label+' '+sheet.name+'/'+action.name+'/f'+fi+' 体型与主工程不一致');
    if(lineImage)for(let i=0;i<lineImage.data.length;i+=4)if(lineImage.data[i+3]){report.outlinePixels++;report.perSheet[sheet.name].outline++;}
    for(let i=0;i<fillImage.data.length;i+=4)if(fillImage.data[i+3]&&fillImage.data[i]===70&&fillImage.data[i+1]===70&&fillImage.data[i+2]===94)report.fillOutlineLeft++;
    report.frames++;report.perSheet[sheet.name].frames++;
   }
  }
 }
 return report;
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const meta=JSON.parse(fs.readFileSync(path.join(out,'metadata.json'),'utf8'));
 const mainBefore=await get('main');
 assert.equal(mainBefore.etag,meta.main.etag,'主工程版本在校验前已变化');
 fs.writeFileSync(path.join(out,'main-read-prepull.json'),mainBefore.bytes);
 const mainProject=JSON.parse(mainBefore.bytes.toString('utf8'));
 const draft=await get(DRAFT);
 assert.equal(draft.status,200,'素体主读取失败 '+draft.status);
 fs.writeFileSync(path.join(out,'candidate.json'),draft.bytes);
 const candidate=JSON.parse(draft.bytes.toString('utf8'));
 const before=check(mainProject,candidate,'读取');
 assert.equal(before.mismatch.length,0,'读取后体型与主工程不一致：'+before.mismatch.slice(0,3).join('; '));
 assert.equal(before.fillOutlineLeft,0,'body 填充层仍含描边色像素');
 const save=await put(DRAFT,draft.etag,draft.bytes);
 fs.writeFileSync(path.join(out,'save-response.txt'),save.status+'\n'+save.text);
 assert.equal(save.status,200,'保存失败 '+save.status+' '+save.text);
 const readback=await get(DRAFT);
 fs.writeFileSync(path.join(out,'readback.json'),readback.bytes);
 const after=JSON.parse(readback.bytes.toString('utf8'));
 const post=check(mainProject,after,'回读');
 assert.equal(post.mismatch.length,0,'回读体型与主工程不一致：'+post.mismatch.slice(0,3).join('; '));
 const stripBody=p=>JSON.stringify({...p,layers:p.layers.map(l=>({...l,frameData:Object.fromEntries(Object.entries(l.frameData||{}).filter(([k])=>!BODY.test(l.name)&&!BODY_LINE.test(l.name))) }))});
 assert.equal(stripBody(after),stripBody(candidate),'非 body 图层被改动');
 const mainAfter=await get('main');
 const mainUntouched=mainAfter.etag===meta.main.etag;
 fs.writeFileSync(path.join(out,'main-read-after.json'),mainAfter.bytes);
 const branch=await get(BRANCH);
 fs.writeFileSync(path.join(out,'branch-'+BRANCH+'-read.json'),branch.bytes);
 const branchProject=JSON.parse(branch.bytes.toString('utf8'));
 const branchReport={checked:0,mismatch:0};
 for(const [msi,sheet]of mainProject.spriteSheets.entries()){
  for(const [ai,action]of sheet.actions.entries())for(const fi of action.frames.keys()){
   const mKey=`${msi}_${ai}_${fi}`;
   const mainCel=celOf(mainProject,msi,BODY,mKey),branchCel=celOf(branchProject,msi,BODY,mKey);
   if(!mainCel||!branchCel)continue;
   branchReport.checked++;
   if(!visibleSame(dec(branchCel),dec(mainCel)))branchReport.mismatch++;
  }
 }
 const verification={
  task:'素体主 body 与主工程体型一致（描边单独成层），并写回主工程',
  before:{mainETag:meta.main.etag,draftETag:meta.draft.etag},
  after:{draftETag:readback.etag,mainETag:mainAfter.etag,mainUntouched},
  framesSynced:post.frames,
  outlinePixels:post.outlinePixels,
  perSheet:post.perSheet,
  fillOutlineLeft:post.fillOutlineLeft,
  bodyMatchesMain:'PASS',
  nonBodyUnchanged:'PASS',
  branchFollowsMain:`${branchReport.checked-branchReport.mismatch}/${branchReport.checked}`,
  restore:`备份目录 ${out}；主工程用 main-read-prepull.json 以 If-Match 回写；素体主旧稿 draft-file-before.json。`
 };
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(verification,null,2));
 console.log(JSON.stringify(verification,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
