const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8765',h={'X-Pixel-Editor':'1'};
const DRAFT='draft-7278d7c9-a753-4c98-bf8b-d7c2d45119ba',BRANCH='character-036f28f0-189b-4ec8-83b5-6475c88e0239';
const out=fs.readFileSync(path.join(root,'备份','latest-body-sync-path.txt'),'utf8').trim();
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const get=async id=>{const r=await fetch(base+'/api/project?id='+id,{headers:h});return {status:r.status,etag:r.headers.get('etag'),bytes:Buffer.from(await r.arrayBuffer())};};
const put=async(id,etag,bytes)=>{const r=await fetch(base+'/api/project?id='+id,{method:'PUT',headers:{...h,'Content-Type':'application/json','If-Match':etag},body:bytes});return {status:r.status,etag:r.headers.get('etag'),text:await r.text()};};
const dec=cel=>png.decode(Buffer.from(cel.dataURL.slice(cel.dataURL.indexOf(',')+1),'base64'));
const enc=im=>'data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64');
const BODY=/^(?:body|身体)$/;
const log=[];
function say(...args){console.log(...args);log.push(args.join(' '));}
(async()=>{
 const meta=JSON.parse(fs.readFileSync(path.join(out,'metadata.json'),'utf8'));
 const mainStart=await get('main');
 assert.equal(sha(mainStart.bytes),meta.main.readSha256,'测试开始前主工程已不是备份时状态');
 const branchFilePath=path.join(root,'data','projects',BRANCH+'.json'),branchShaBefore=sha(fs.readFileSync(branchFilePath));
 // 1. 在素体主里画一格
 const draftView=await get(DRAFT);
 const project=JSON.parse(draftView.bytes.toString('utf8'));
 const si=0,ai=1,fi=0,key=`${si}_${ai}_${fi}`;
 const layer=project.layers.find(l=>!l.isGroup&&l.sheetIndex===si&&BODY.test(l.name)&&l.frameData?.[key]);
 assert.ok(layer,'找不到 walk/down/0 的 body 图层');
 const originalCel=structuredClone(layer.frameData[key]);
 const image=dec(originalCel),px=2,py=2,pi=(py*image.width+px)*4;
 assert.equal(image.data[pi+3],0,'测试点必须原本是透明格');
 image.data.set([255,0,255,255],pi);
 layer.frameData[key]={...originalCel,dataURL:enc(image)};
 const painted=JSON.parse(JSON.stringify(project));
 const save1=await put(DRAFT,draftView.etag,Buffer.from(JSON.stringify(painted)));
 say('画一格保存:',save1.status,save1.text.trim());
 assert.equal(save1.status,200,'保存失败');
 // 2. 主工程与分支都应该收到这一格
 const mainEdited=await get('main');
 const mainProject=JSON.parse(mainEdited.bytes.toString('utf8'));
 const mainLayer=mainProject.layers.find(l=>!l.isGroup&&l.sheetIndex===si&&BODY.test(l.name)&&l.frameData?.[key]);
 assert.ok(mainLayer,'主工程缺少对应 body 图层');
 const mainImage=dec(mainLayer.frameData[key]);
 const offset=((py+1)*mainImage.width+(px+1))*4;
 assert.deepEqual([...mainImage.data.subarray(offset,offset+4)],[255,0,255,255],'主工程未收到这一格');
 const branchView=await get(BRANCH);
 const branchProject=JSON.parse(branchView.bytes.toString('utf8'));
 const branchLayer=branchProject.layers.find(l=>!l.isGroup&&l.sheetIndex===si&&BODY.test(l.name)&&l.frameData?.[key]);
 assert.deepEqual([...dec(branchLayer.frameData[key]).data.subarray(offset,offset+4)],[255,0,255,255],'分支未收到这一格');
 const branchShaAfter=sha(fs.readFileSync(branchFilePath));
 say('写回主工程:', 'PASS','分支继承:', 'PASS','分支文件未被改写:', branchShaAfter===branchShaBefore);
 // 3. 还原：先把原始一格写回素体主
 const draftAfter=await get(DRAFT);
 const restore=JSON.parse(draftAfter.bytes.toString('utf8'));
 const restoreLayer=restore.layers.find(l=>!l.isGroup&&l.sheetIndex===si&&BODY.test(l.name)&&l.frameData?.[key]);
 restoreLayer.frameData[key]=originalCel;
 const save2=await put(DRAFT,draftAfter.etag,Buffer.from(JSON.stringify(restore)));
 say('还原素体主:',save2.status,save2.text.trim());
 assert.equal(save2.status,200,'还原保存失败');
 // 4. 主工程恢复成备份时的那份字节
 const mainNow=await get('main');
 const save3=await put('main',mainNow.etag,fs.readFileSync(path.join(out,'main-read-prepull.json')));
 say('还原主工程:',save3.status,save3.text.trim());
 assert.equal(save3.status,200,'主工程还原失败');
 const mainFinal=await get('main');
 assert.equal(sha(mainFinal.bytes),meta.main.readSha256,'主工程未恢复到原始字节');
 // 5. 素体主归一化，并确认读取稳定、体型仍等于主工程
 const draftFinal=await get(DRAFT);
 const save4=await put(DRAFT,draftFinal.etag,draftFinal.bytes);
 assert.equal(save4.status,200,'素体主归一化保存失败');
 const a=await get(DRAFT),b=await get(DRAFT);
 assert.equal(a.etag,b.etag,'素体主连续两次读取版本不一致');
 const finalProject=JSON.parse(b.bytes.toString('utf8'));
 const frameImage=dec(finalProject.layers.find(l=>!l.isGroup&&l.sheetIndex===si&&BODY.test(l.name)&&l.frameData?.[key]).frameData[key]);
 assert.equal(frameImage.data[pi+3],0,'还原后测试点应恢复透明');
 const mainFinalProject=JSON.parse(mainFinal.bytes.toString('utf8'));
 assert.deepEqual(dec(mainFinalProject.layers.find(l=>!l.isGroup&&l.sheetIndex===si&&BODY.test(l.name)&&l.frameData?.[key]).frameData[key]).data,dec(JSON.parse(fs.readFileSync(path.join(out,'main-read-prepull.json'),'utf8')).layers.find(l=>!l.isGroup&&l.sheetIndex===si&&BODY.test(l.name)&&l.frameData?.[key]).frameData[key]).data,'主工程体型与备份不一致');
 const branchShaFinal=sha(fs.readFileSync(branchFilePath));
 const verification={
  task:'素体主改体型 → 主工程写回 → 全部分支跟随（含还原）',
  writeThrough:'PASS',
  branchFollows:'PASS',
  branchFileUntouched:branchShaFinal===branchShaBefore,
  revertMainByteExact:'PASS',
  draftReadStable:'PASS',
  draftETag:b.etag,
  mainETag:mainFinal.etag,
  log
 };
 fs.writeFileSync(path.join(out,'write-through-verification.json'),JSON.stringify(verification,null,2));
 console.log(JSON.stringify({...verification,log:undefined},null,2));
})().catch(e=>{console.error(e);console.error(log.join('\n'));process.exitCode=1});
