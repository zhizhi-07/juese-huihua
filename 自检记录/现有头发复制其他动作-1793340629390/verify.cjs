const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto'),png=require('../../scripts/png.cjs');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement(){let c=createCanvas(1,1);c.style={};return c},body:{appendChild(){}}};global.File=class extends Blob{constructor(p,n){super(p);this.name=n}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(let n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
const file=n=>path.join(__dirname,n),p=JSON.parse(fs.readFileSync(file('candidate.json'))),before=JSON.parse(fs.readFileSync(file('before.json'))),map=JSON.parse(fs.readFileSync(file('复制粘贴映射.json'))),decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
(async()=>{
assert.equal(p.layers.length,before.layers.length+map.newLayers);assert.deepEqual(p.spriteSheets,before.spriteSheets);
for(let i=0;i<before.layers.length;i++){let expected=structuredClone(before.layers[i]);if(expected.parent!=null)expected.parent+=map.shift;assert.deepEqual(p.layers[i+map.shift],expected,'Existing pixels or layer settings changed')}
for(let k of Object.keys(before))if(!['layers','currentLayerIndex'].includes(k))assert.deepEqual(p[k],before[k]);assert.equal(p.currentLayerIndex,before.currentLayerIndex+map.shift);
for(let m of map.manifest){
 let si=Number(m.key.split('_')[0]),source=decode(before.layers.find(l=>l.sheetIndex===8&&l.name===m.layer).frameData[m.sourceKey]),dest=decode(p.layers.find(l=>l.sheetIndex===si&&l.name===m.layer).frameData[m.key]),expected=new Uint8Array(dest.width*dest.height*4),count=0;
 for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){let i=(y*source.width+x)*4;if(!source.data[i+3])continue;expected.set(source.data.subarray(i,i+4),((y+m.dy)*dest.width+x+m.dx)*4);count++}
 assert.equal(count,m.pixels);assert.deepEqual(Buffer.from(dest.data),Buffer.from(expected),'Copied pixels differ from source');
}
let {project}=await new PE.ExportManager().importProject(new File([JSON.stringify(p)],'candidate.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project),ex=new PE.ExportManager();ex.init(project,null);cm.zoom=1;cm.showGrid=false;let checks=[];
for(let si of [7,9,11]){
 let sheet=p.spriteSheets[si],cols=Math.max(...sheet.actions.map(a=>a.frames.length)),unit=si===9?160:128,c=createCanvas(cols*unit,sheet.actions.length*unit),g=c.getContext('2d');g.imageSmoothingEnabled=false;
 for(let ai=0;ai<sheet.actions.length;ai++)for(let fi=0;fi<sheet.actions[ai].frames.length;fi++){
  project.currentSheetIndex=si;project.currentActionIndex=ai;project.currentFrameIndex=fi;let im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,im.width,im.height).data,im.data);assert.deepEqual(ex._getCompositeImageData(si,ai,fi).data,im.data);
  if(sheet.actions[ai].direction==='up'){let l=project.layers.find(l=>l.sheetIndex===si&&l.name.endsWith('/ 前发'));assert(!l.getFrameData(`${si}_${ai}_${fi}`).data.some((v,i)=>i%4===3&&v))}
  let tile=createCanvas(im.width,im.height);tile.getContext('2d').putImageData(im,0,0);fs.writeFileSync(file(`帧-${si}-${ai}-${fi}.png`),tile.toBuffer('image/png'));g.fillStyle=fi%2?'#35434b':'#d7dbd7';g.fillRect(fi*unit,ai*unit,unit,unit);g.drawImage(tile,fi*unit,ai*unit,unit,unit);checks.push({si,ai,fi,mainCanvasMatchesExport:true});
 }
 fs.writeFileSync(file(`${si}-全部帧.png`),c.toBuffer('image/png'));
}
assert.equal(checks.length,46);
let report={checks,copyMode:'existing-pixels-only',idleSittingAndAllOldCelsUnchanged:true,noScalingRepaintingOrCropping:true,browserTested:false,saved:false};
if(process.argv.includes('--save')){
 let url='http://127.0.0.1:8765/api/project?id=character-gold-mix-1793320553623',r=await fetch(url),raw=await r.text();assert(r.ok);assert.equal(r.headers.get('etag'),fs.readFileSync(file('etag.txt'),'utf8'),'Concurrent edit; merge required');assert.deepEqual(JSON.parse(raw),before);
 r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});let msg=await r.text();fs.writeFileSync(file('保存响应.txt'),r.status+'\n'+msg);assert(r.ok,msg);
 r=await fetch(url);raw=await r.text();assert(r.ok);assert.deepEqual(JSON.parse(raw).layers,p.layers);fs.writeFileSync(file('final-api-readback.json'),raw);report.saved=true;report.etag=r.headers.get('etag');report.sha256=crypto.createHash('sha256').update(raw).digest('hex');
}
fs.writeFileSync(file('验证结果.json'),JSON.stringify(report,null,2));console.log('PASS: 46 pasted frames exactly match translated source RGBA; 46 main-canvas/export frames agree; all original cels and timings untouched; saved='+report.saved);
})().catch(e=>{console.error(e);process.exitCode=1});
