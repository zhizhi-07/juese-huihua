const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const {createCanvas,loadImage,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement(){let c=createCanvas(1,1);c.style={};return c},body:{appendChild(){}}};global.File=class extends Blob{constructor(p,n){super(p);this.name=n}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(let n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
const file=n=>path.join(__dirname,n),url='http://127.0.0.1:8765/api/project?id=character-gold-mix-1793320553623';
async function read(f){let c=createCanvas(32,32),g=c.getContext('2d');g.drawImage(await loadImage(f.dataURL),0,0);return g.getImageData(0,0,32,32)}
function store(im){let c=createCanvas(32,32);c.getContext('2d').putImageData(im,0,0);return {width:32,height:32,dataURL:c.toDataURL()}}
function top(im){for(let y=0;y<20;y++)for(let x=0;x<32;x++)if(im.data[(y*32+x)*4+3])return y;return null}
(async()=>{
let before=JSON.parse(fs.readFileSync(file('before.json'))),p=structuredClone(before),si=p.spriteSheets.findIndex(s=>s.name==='original32_sit'),ai=p.spriteSheets[si].actions.findIndex(a=>a.direction==='side');assert(si>=0&&ai>=0);
let li=p.layers.findIndex(l=>l.sheetIndex===si&&l.name==='头发 / 80011 / 前发'),layer=p.layers[li],sourceKey=`${si}_${ai}_3`,source=await read(layer.frameData[sourceKey]);assert.equal(top(source),5);
let changes=[];
for(let fi=0;fi<3;fi++){
 let key=`${si}_${ai}_${fi}`,headLayer=p.layers.find(l=>l.sheetIndex===si&&l.name==='head'&&l.frameData?.[key]),headTop=top(await read(headLayer.frameData[key])),dy=headTop-5;
 assert([0,-1].includes(dy),'Unexpected sit head pose');let im=new ImageData(32,32),old=await read(layer.frameData[key]);
 for(let y=0;y<32;y++){
  // Restore the repeated straight-strand row in the higher pose; keep the lower tips stable.
  let sy=dy===-1&&y<=18?y+1:y;
  im.data.set(source.data.subarray(sy*128,(sy+1)*128),y*128);
 }
 assert.equal(top(im),headTop);if(dy===0)assert.deepEqual(im.data,source.data);
 let pixels=[];for(let i=0;i<im.data.length;i+=4)if(im.data.slice(i,i+4).some((v,j)=>v!==old.data[i+j]))pixels.push({x:i/4%32,y:Math.floor(i/4/32),from:Array.from(old.data.slice(i,i+4)),to:Array.from(im.data.slice(i,i+4))});
 layer.frameData[key]=store(im);changes.push({key,headTop,headOffsetFromFourth:dy,tipRowHeld:23,changedPixels:pixels.length,pixels});
}
assert.deepEqual(layer.frameData[sourceKey],before.layers[li].frameData[sourceKey]);
let stripped=structuredClone(p),oldStripped=structuredClone(before);for(let fi=0;fi<3;fi++){delete stripped.layers[li].frameData[`${si}_${ai}_${fi}`];delete oldStripped.layers[li].frameData[`${si}_${ai}_${fi}`]}assert.deepEqual(stripped,oldStripped,'Data outside the three front-hair cels changed');
fs.writeFileSync(file('candidate.json'),JSON.stringify(p));fs.writeFileSync(file('像素差异.json'),JSON.stringify(changes,null,2));
let {project}=await new PE.ExportManager().importProject(new File([JSON.stringify(p)],'candidate.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project),ex=new PE.ExportManager();ex.init(project,null);cm.zoom=1;cm.showGrid=false;
let sheet=createCanvas(768,192),g=sheet.getContext('2d');g.imageSmoothingEnabled=false;
for(let fi=0;fi<4;fi++){
 project.currentSheetIndex=si;project.currentActionIndex=ai;project.currentFrameIndex=fi;let im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data);assert.deepEqual(ex._getCompositeImageData(si,ai,fi).data,im.data);
 let c=createCanvas(32,32);c.getContext('2d').putImageData(im,0,0);fs.writeFileSync(file(`侧面-${fi+1}.png`),c.toBuffer('image/png'));g.fillStyle=fi%2?'#35434b':'#d7dbd7';g.fillRect(fi*192,0,192,192);g.drawImage(c,fi*192,0,192,192);
}
fs.writeFileSync(file('侧面四帧核对.png'),sheet.toBuffer('image/png'));
let report={sourceKey,sourceFourthFramePreserved:true,changedOnlyFrontHairFrames:[1,2,3],bodyRearHairOtherDirectionsAndActionsUnchanged:true,headTops:[4,4,5,5],allFourMainCanvasAndExportMatch:true,browserTested:false,saved:false};
if(process.argv.includes('--save')){
 let r=await fetch(url),raw=await r.text();assert(r.ok);assert.equal(r.headers.get('etag'),fs.readFileSync(file('etag.txt'),'utf8'),'Concurrent edit; stop rather than overwrite');assert.deepEqual(JSON.parse(raw),before);
 r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});let msg=await r.text();fs.writeFileSync(file('保存响应.txt'),r.status+'\n'+msg);assert(r.ok,msg);
 r=await fetch(url);raw=await r.text();assert(r.ok);assert.deepEqual(JSON.parse(raw).layers,p.layers);fs.writeFileSync(file('final-api-readback.json'),raw);report.saved=true;report.etag=r.headers.get('etag');report.sha256=crypto.createHash('sha256').update(raw).digest('hex');
}
fs.writeFileSync(file('验证结果.json'),JSON.stringify(report,null,2));console.log('PASS: side front hair frames 1-3 synced from user frame 4; roots follow head, lower tip fixed; frame 4 and all other data unchanged; render/export match; saved='+report.saved);
})().catch(e=>{console.error(e);process.exitCode=1});
