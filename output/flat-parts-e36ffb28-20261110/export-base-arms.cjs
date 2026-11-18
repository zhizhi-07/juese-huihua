const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'导出'),png=require(path.join(root,'scripts/png.cjs'));
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;Object.assign(global,{Image,ImageData,JSZip:require(path.join(root,'js/vendor/jszip.min.js')),FileReader:class{async readAsText(blob){this.result=await blob.text();this.onload();}},document:{createElement(){return createCanvas(1,1);}}});
for(const n of ['core','export'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
(async()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'source.json')),revision=JSON.parse(fs.readFileSync(path.join(__dirname,'revision.json')));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),revision.sha256);
 const p=(await new PE.ExportManager().importProject(new Blob([bytes]))).project;
 const previous=await JSZip.loadAsync(fs.readFileSync(path.join(dir,'人物分支-e36ffb28-眼睛前发后发-每款一文件夹.zip')),{checkCRC32:true});
 const match=JSON.parse(await previous.file('部件说明.json').async('string'));
 const parts={'素体':/^(body|head)( 描边)?$/,'前手臂':/^hand( 描边)?$/,'后手臂':/^hand 2( 描边)?$/};
 const zip=new JSZip(),files=[],order=[];
 for(const [si,s] of p.spriteSheets.entries()){
  const m=match.files.find(f=>f.sheetIndex===si);assert(m);
  const {frameWidth:w,frameHeight:h,columns:cols,rows,action}=m,scale=m.pixelScale||1;
  assert.equal(rows.length,s.actions.length);
  for(const [part,re] of Object.entries(parts)){
   const c=createCanvas(w*cols,h*rows.length),ctx=c.getContext('2d');
   for(const [ai,a] of s.actions.entries()){
    assert.equal(rows[ai].direction,a.direction);assert.equal(rows[ai].frames,a.frames.length);
    for(const [fi,f] of a.frames.entries()){
     assert.equal(f.width*scale,w);assert.equal(f.height*scale,h);
     const key=p.getFrameKey(si,ai,fi),tile=createCanvas(w,h),tc=tile.getContext('2d');
     for(const l of PE.getRenderLayers(p,si,ai)){
      if(!re.test(l.name)||!PE.isLayerVisible(p,l,si))continue;
      const im=l.getFrameData(key);if(!im)continue;
      tc.globalAlpha=l.opacity??1;PE.utils.drawImageData(tc,im,0,0,scale);
     }
     ctx.drawImage(tile,fi*w,ai*h);
    }
   }
   const file=part+'/'+part+'-'+action+'.png';
   zip.file(file,c.toBuffer('image/png'));files.push({...m,file,part});
  }
  for(const a of s.actions)order.push({sheetIndex:si,direction:a.direction,backToFront:a.direction==='up'?['前手臂','后手臂','素体']:['后手臂','素体','前手臂']});
 }
 zip.file('部件说明.json',JSON.stringify({version:1,sourceSHA256:revision.sha256,files,order},null,2));
 zip.file('使用说明.txt','与同分支的眼睛、前发、后发包使用同一工程快照，帧格、方向、帧号和时长一致。素体只有头和身体；前手臂、后手臂分开。描边按工程当时的可见状态输出。\n透明背景，不裁剪；全部以2倍像素输出。坐姿只有侧面。背面两只手臂都放在素体下面；正面和侧面前手在上，后手在下。\n');
 const out=path.join(dir,'人物分支-e36ffb28-素体与手臂.zip');
 fs.writeFileSync(out,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}),{flag:'wx'});
 const check=await JSZip.loadAsync(fs.readFileSync(out),{checkCRC32:true});
 assert.equal(files.length,12);assert.equal(Object.values(check.files).filter(f=>f.dir).length,3);
 for(const f of files){const im=png.decode(await check.file(f.file).async('nodebuffer'));assert.equal(im.width,f.frameWidth*f.columns);assert.equal(im.height,f.frameHeight*f.rows.length);assert(im.data.some((v,i)=>i%4===3&&v),f.file);}
 console.log('PASS: 12 transparent PNGs in 3 folders; alignment and ZIP readback verified; source snapshot SHA256 verified.');
 console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1;});
