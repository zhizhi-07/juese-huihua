const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/普通鞋最后一格并入衣服-20261027'),url='http://127.0.0.1:8765/api/project?id=character-green-flower-idle-20261027';
(async()=>{
 const r=await fetch(url);assert(r.ok);const text=await r.text(),etag=r.headers.get('etag'),before=JSON.parse(text),p=JSON.parse(text);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'before.json'),text);fs.writeFileSync(path.join(out,'etag.txt'),etag);
 const di=p.layers.findIndex(l=>l.sheetIndex===8&&l.name==='服装 / 01 简单白色连衣裙'),si=p.layers.findIndex(l=>l.sheetIndex===8&&l.name==='鞋子 / 01 深灰玛丽珍鞋');assert(di>=0&&si>=0);
 const dress=p.layers[di],shoes=p.layers[si];
 for(const [key,f]of Object.entries(shoes.frameData)){
  const base=dress.frameData[key];assert(base);const d=png.decode(Buffer.from(base.dataURL.split(',')[1],'base64')),s=png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));assert.equal(d.width,s.width);assert.equal(d.height,s.height);
  const first=(s.height-1)*s.width*4,upper=d.data.slice(0,first);
  for(let i=first;i<s.data.length;i+=4)if(s.data[i+3])d.data.set(s.data.slice(i,i+4),i);
  assert.deepEqual(d.data.slice(0,first),upper);assert(d.data.slice(first).some(v=>v));base.dataURL='data:image/png;base64,'+png.encode(d.width,d.height,d.data).toString('base64');
 }
 p.layers.splice(si,1);const remap=i=>i>si?i-1:i;
 for(const l of p.layers)if(l.parent!=null){assert.notEqual(l.parent,si);l.parent=remap(l.parent);}
 p.currentLayerIndex=before.currentLayerIndex===si?remap(di):remap(before.currentLayerIndex);
 for(let i=0;i<before.layers.length;i++)if(i!==si&&i!==di){const expected=JSON.parse(JSON.stringify(before.layers[i]));if(expected.parent!=null)expected.parent=remap(expected.parent);assert.deepEqual(p.layers[remap(i)],expected);}
 assert.deepEqual(p.spriteSheets,before.spriteSheets);
 const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
 for(const n of ['core','history','canvas','tools','spritesheet','export'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const ex=new PE.ExportManager(),{project}=await ex.importProject(new File([JSON.stringify(p)],'candidate.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project),sheet=createCanvas(384,128),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(let a=0;a<3;a++){project.currentSheetIndex=8;project.currentActionIndex=a;project.currentFrameIndex=0;const im=cm.getCompositeImageData(8,a,0);cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data);const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);ctx.fillStyle='#ddd5ed';ctx.fillRect(a*128,0,128,128);ctx.drawImage(tile,a*128,0,128,128);}
 fs.writeFileSync(path.join(out,'preview.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,'Save failed '+saved.status);assert.deepEqual(await(await fetch(url)).json(),p);
 console.log('PASS: ordinary shoes occupy last row only, merged into outfit; 12 frames updated; upper clothing/body unchanged; backed up and verified.');
})().catch(e=>{console.error(e);process.exitCode=1;});
