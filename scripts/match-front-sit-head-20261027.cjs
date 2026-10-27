const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),png=require('./png.cjs');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8765',decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
async function read(id){const r=await fetch(base+'/api/project?id='+encodeURIComponent(id));assert(r.ok);return {raw:await r.text(),etag:r.headers.get('etag')};}
function indexes(p,name){const si=p.spriteSheets.findIndex(s=>s.name===name);assert(si>=0);const ai=p.spriteSheets[si].actions.findIndex(a=>a.direction==='down');assert(ai>=0);const group=p.layers.findIndex(l=>l.isGroup&&l.sheetIndex===si&&l.name==='down'),li=p.layers.findIndex(l=>l.sheetIndex===si&&l.parent===group&&l.name==='head');assert(li>=0);return {si,ai,li};}
async function load(p){const {project}=await new PE.ExportManager().importProject(new File([JSON.stringify(p)],'p.json'));return {project,cm:new PE.CanvasManager(document.createElement('canvas'),project)};}
async function compare(before,after,file){const c=createCanvas(768,1152),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(const bare of [false,true]){const old=await load(before),newer=await load(after);if(bare)for(const m of [old,newer])m.project.layers.forEach(l=>{if(!l.isGroup&&!/^(head|body|hand(?: 2)?)$/.test(l.name))l.visible=false;});
  for(const [row,label,model,sheet]of [[0,'IDLE',old,'original32_idle'],[1,'SIT BEFORE',old,'original32_sit'],[2,'SIT AFTER',newer,'original32_sit']]){const {si,ai}=indexes(model.project,sheet);for(let fi=0;fi<4;fi++){const im=model.cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v),'Empty render');const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);const y=(row+(bare?3:0))*192;ctx.fillStyle=bare?'#263238':'#ddd5ed';ctx.fillRect(fi*192,y,192,192);ctx.drawImage(tile,fi*192,y,192,192);ctx.fillStyle=bare?'#fff':'#222';ctx.font='12px sans-serif';ctx.fillText(label+' #'+(fi+1),fi*192+4,y+14);}}
 }fs.writeFileSync(file,c.toBuffer('image/png'));
 const compact=createCanvas(384,384),small=compact.getContext('2d');small.imageSmoothingEnabled=false;
 for(const [x,y,row]of [[0,0,0],[192,0,1],[0,192,3],[192,192,4]])small.drawImage(c,0,row*192,192,192,x,y,192,192);
 fs.writeFileSync(file.replace('.png','-first-frame.png'),compact.toBuffer('image/png'));
}
(async()=>{const current=await read('main'),p=JSON.parse(current.raw),out=path.join(root,'自检记录/坐姿正面头部对照-'+Date.now());fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'main-before.json'),current.raw);await compare(p,p,path.join(out,'inspect.png'));console.log(out);})().catch(e=>{console.error(e);process.exitCode=1;});
