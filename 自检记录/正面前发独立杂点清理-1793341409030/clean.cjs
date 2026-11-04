const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto'),png=require('../../scripts/png.cjs');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement(){let c=createCanvas(1,1);c.style={};return c},body:{appendChild(){}}};global.File=class extends Blob{constructor(p,n){super(p);this.name=n}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(let n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
const file=n=>path.join(__dirname,n),before=JSON.parse(fs.readFileSync(file('before.json'))),p=structuredClone(before),locations=JSON.parse(fs.readFileSync(file('杂点定位.json')));
(async()=>{
assert.equal(locations.length,26);let diff=[],unchanged=structuredClone(before);
for(let loc of locations){
 assert.equal(loc.small.length,2);let li=p.layers.findIndex(l=>l.sheetIndex===loc.si&&l.name==='头发 / 80011 / 前发'),f=p.layers[li].frameData[loc.key],im=png.decode(Buffer.from(f.dataURL.split(',')[1],'base64')),old=im.data.slice();
 for(let component of loc.small){assert.equal(component.length,1);let {x,y,rgba}=component[0],i=(y*im.width+x)*4;assert.deepEqual(rgba,[178,178,178,255]);assert.deepEqual(Array.from(im.data.slice(i,i+4)),rgba);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)assert.equal(im.data[((y+dy)*im.width+x+dx)*4+3],0,'Not an isolated dot');im.data.fill(0,i,i+4);diff.push({key:loc.key,x,y,removed:rgba})}
 let changed=0;for(let i=0;i<im.data.length;i+=4)if(im.data.slice(i,i+4).some((v,j)=>v!==old[i+j]))changed++;assert.equal(changed,2);
 p.layers[li].frameData[loc.key]={width:f.width,height:f.height,dataURL:'data:image/png;base64,'+png.encode(f.width,f.height,im.data).toString('base64')};
 // Replacing these allowed entries in a comparison copy must account for the entire project diff.
 unchanged.layers[li].frameData[loc.key]=p.layers[li].frameData[loc.key];
}
assert.deepEqual(p,unchanged,'Changed something other than the identified dots');assert.equal(diff.length,52);fs.writeFileSync(file('candidate.json'),JSON.stringify(p));fs.writeFileSync(file('像素差异.json'),JSON.stringify(diff,null,2));
let {project}=await new PE.ExportManager().importProject(new File([JSON.stringify(p)],'candidate.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project),ex=new PE.ExportManager();ex.init(project,null);cm.zoom=1;cm.showGrid=false;
let atlas=createCanvas(8*160,5*160),g=atlas.getContext('2d');g.imageSmoothingEnabled=false;let sample=createCanvas(800,160),sg=sample.getContext('2d');sg.imageSmoothingEnabled=false;let checks=[];
for(let [ri,si]of [7,8,9,10,11].entries()){
 let ai=p.spriteSheets[si].actions.findIndex(a=>a.direction==='down');
 for(let fi=0;fi<p.spriteSheets[si].actions[ai].frames.length;fi++){
  let key=`${si}_${ai}_${fi}`,l=project.layers.find(l=>l.sheetIndex===si&&l.name==='头发 / 80011 / 前发'),hair=l.getFrameData(key),old=locations.find(v=>v.key===key);for(let c of old.small)assert.equal(hair.data[(c[0].y*hair.width+c[0].x)*4+3],0);
  project.currentSheetIndex=si;project.currentActionIndex=ai;project.currentFrameIndex=fi;let im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,im.width,im.height).data,im.data);assert.deepEqual(ex._getCompositeImageData(si,ai,fi).data,im.data);
  let c=createCanvas(im.width,im.height);c.getContext('2d').putImageData(im,0,0);fs.writeFileSync(file(`帧-${key}.png`),c.toBuffer('image/png'));g.fillStyle=fi%2?'#35434b':'#d7dbd7';g.fillRect(fi*160,ri*160,160,160);g.drawImage(c,fi*160,ri*160,160,160);
  if(fi===0){let hc=createCanvas(im.width,im.height);hc.getContext('2d').putImageData(hair,0,0);sg.fillStyle='#35434b';sg.fillRect(ri*160,0,160,160);sg.drawImage(hc,ri*160,0,160,160)}checks.push({key,onlyTwoDotsRemoved:true,mainCanvasMatchesExport:true});
 }
}
fs.writeFileSync(file('全部正面核对.png'),atlas.toBuffer('image/png'));fs.writeFileSync(file('五套正面前发-清理后.png'),sample.toBuffer('image/png'));
let report={checks,frames:26,removedPixels:52,allOtherPixelsAndMetadataUnchanged:true,browserTested:false,saved:false};
if(process.argv.includes('--save')){let url='http://127.0.0.1:8765/api/project?id=character-gold-mix-1793320553623',r=await fetch(url),raw=await r.text();assert(r.ok);assert.equal(r.headers.get('etag'),fs.readFileSync(file('etag.txt'),'utf8'),'Concurrent edit; stop to protect newer user work');assert.deepEqual(JSON.parse(raw),before);r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});let msg=await r.text();fs.writeFileSync(file('保存响应.txt'),r.status+'\n'+msg);assert(r.ok,msg);r=await fetch(url);raw=await r.text();assert(r.ok);assert.deepEqual(JSON.parse(raw).layers,p.layers);fs.writeFileSync(file('final-api-readback.json'),raw);report.saved=true;report.etag=r.headers.get('etag');report.sha256=crypto.createHash('sha256').update(raw).digest('hex')}
fs.writeFileSync(file('验证结果.json'),JSON.stringify(report,null,2));console.log('PASS: exactly 52 isolated gray pixels removed from 26 front-facing hair cels; every other pixel and metadata unchanged; 26 main canvas/export checks; saved='+report.saved);
})().catch(e=>{console.error(e);process.exitCode=1});

