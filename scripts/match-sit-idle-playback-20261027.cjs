const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};
global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/待机坐姿真实播放对比-'+Date.now()),url='http://127.0.0.1:8765/api/project?id=main';
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
(async()=>{
 fs.mkdirSync(out,{recursive:true});const r=await fetch(url);assert(r.ok);const raw=await r.text(),before=JSON.parse(raw),p=JSON.parse(raw);fs.writeFileSync(path.join(out,'before.json'),raw);
 const idle=p.spriteSheets.findIndex(s=>s.name==='original32_idle'),sit=p.spriteSheets.findIndex(s=>s.name==='original32_sit');assert(idle>=0&&sit>=0);
 for(const action of p.spriteSheets[sit].actions){const ref=p.spriteSheets[idle].actions.find(a=>a.direction===action.direction);assert(ref&&ref.frames.length===action.frames.length);action.frames.forEach((f,i)=>f.duration=ref.frames[i].duration);}
 p.spriteSheets[sit].fps=p.spriteSheets[idle].fps;
 assert.deepEqual(p.layers,before.layers,'Timing change must preserve all artwork');
 const normalized=structuredClone(p);normalized.spriteSheets[sit]=before.spriteSheets[sit];assert.deepEqual(normalized,before,'Only sit timing may change');
 const {project}=await new PE.ExportManager().importProject(new File([JSON.stringify(p)],'p.json'));
 const cm=new PE.CanvasManager(document.createElement('canvas'),project);
 const atlas=createCanvas(1024,804),atlasCtx=atlas.getContext('2d');atlasCtx.imageSmoothingEnabled=false;
 for(let fi=0;fi<4;fi++){
  const c=createCanvas(512,804),ctx=c.getContext('2d');ctx.fillStyle='#ddd5ed';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#28383b';ctx.font='18px sans-serif';ctx.fillText('待机 · 100ms',45,25);ctx.fillText('坐姿 · 100ms',301,25);
  for(let ai=0;ai<3;ai++)for(const [col,si]of [[0,idle],[1,sit]]){
   const im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);
   ctx.drawImage(tile,col*256,36+ai*256,256,256);
  }
  fs.writeFileSync(path.join(out,`pair-${fi}.png`),c.toBuffer('image/png'));
  atlasCtx.drawImage(c,fi*256,0,512,804,fi*256,0,256,804);
 }
 fs.writeFileSync(path.join(out,'comparison.png'),atlas.toBuffer('image/png'));fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));
 const save=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});assert(save.ok,'save conflict '+save.status);assert.deepEqual(await(await fetch(url)).json(),p);
 console.log(JSON.stringify({out,timing:[100,100,100,100],pixels:'unchanged',readback:'exact'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
