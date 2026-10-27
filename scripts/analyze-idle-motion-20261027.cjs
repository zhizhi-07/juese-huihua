const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),png=require('./png.cjs');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};
global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/待机实际动作分析-20261027');
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
function rows(im){const result=[];for(let y=0;y<im.height;y++){const xs=[];for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3])xs.push(x);if(xs.length)result.push([y,Math.min(...xs),Math.max(...xs),xs.length]);}return result;}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const r=await fetch('http://127.0.0.1:8765/api/project?id=main');assert(r.ok);const raw=await r.text(),p=JSON.parse(raw);
 fs.writeFileSync(path.join(out,'snapshot.json'),raw);
 const {project}=await new PE.ExportManager().importProject(new File([raw],'p.json'));
 const cm=new PE.CanvasManager(document.createElement('canvas'),project),report=[];
 for(const sheetName of ['original32_idle','original32_sit']){
  const si=p.spriteSheets.findIndex(s=>s.name===sheetName);assert(si>=0);
  project.layers.forEach(l=>{if(l.sheetIndex===si&&!l.isGroup)l.visible=['body','head','hand','hand 2'].includes(l.name);});
  const c=createCanvas(1024,768),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
   const im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));
   const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);
   ctx.fillStyle='#ddd5ed';ctx.fillRect(fi*256,ai*256,256,256);ctx.drawImage(tile,fi*256,ai*256,256,256);
   for(const l of p.layers.filter(l=>l.sheetIndex===si&&['body','head','hand','hand 2'].includes(l.name))){const f=l.frameData?.[`${si}_${ai}_${fi}`];if(f)report.push({sheet:sheetName,direction:p.spriteSheets[si].actions[ai].direction,frame:fi+1,layer:p.layers.indexOf(l),name:l.name,rows:rows(decode(f))});}
  }
  fs.writeFileSync(path.join(out,sheetName+'-素体.png'),c.toBuffer('image/png'));
 }
 fs.writeFileSync(path.join(out,'逐层逐行.json'),JSON.stringify(report,null,2));
 for(const item of report)console.log(JSON.stringify(item));
})().catch(e=>{console.error(e);process.exitCode=1;});
