const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};
global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8765',out=path.join(root,'自检记录/坐姿素体同步全部角色分支-'+Date.now());
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
async function read(id){const r=await fetch(base+'/api/project?id='+encodeURIComponent(id));assert(r.ok,`${id}: GET ${r.status}`);return {raw:await r.text(),etag:r.headers.get('etag')};}
function sheet(p){const si=p.spriteSheets.findIndex(s=>s.name==='original32_sit');assert(si>=0,'Missing sit sheet');return si;}
function layerFor(p,si,ai,name){const group=p.layers.findIndex(l=>l.sheetIndex===si&&l.isGroup&&l.name===p.spriteSheets[si].actions[ai].direction);const matches=p.layers.filter(l=>l.sheetIndex===si&&l.name===name&&l.frameData?.[`${si}_${ai}_0`]&&(name.startsWith('hand')||l.parent===group));assert(matches.length<=1,`Ambiguous ${name} for ${ai}`);return matches[0];}
async function render(p,si,filename){const {project}=await new PE.ExportManager().importProject(new File([JSON.stringify(p)],'p.json'));const cm=new PE.CanvasManager(document.createElement('canvas'),project),canvas=createCanvas(768,576),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){const im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v),'Empty branch composite');const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);ctx.fillStyle='#ddd5ed';ctx.fillRect(fi*192,ai*192,192,192);ctx.drawImage(tile,fi*192,ai*192,192,192);}fs.writeFileSync(filename,canvas.toBuffer('image/png'));}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const source=await read('main'),main=JSON.parse(source.raw),sourceSI=sheet(main);fs.writeFileSync(path.join(out,'main-source.json'),source.raw);
 const list=await(await fetch(base+'/api/projects')).json(),prepared=[];
 for(const info of list.filter(i=>i.id.startsWith('character-'))){
  const current=await read(info.id),before=JSON.parse(current.raw),p=JSON.parse(current.raw),si=sheet(p),dir=path.join(out,info.id);fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'before.json'),current.raw);fs.writeFileSync(path.join(dir,'etag.txt'),current.etag);
  const allowed=new Set();let changedFrames=0,handLayers=0;
  for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++){
   const sourceAI=main.spriteSheets[sourceSI].actions.findIndex(a=>a.direction===p.spriteSheets[si].actions[ai].direction);assert(sourceAI>=0);
   assert.equal(p.spriteSheets[si].actions[ai].frames.length,main.spriteSheets[sourceSI].actions[sourceAI].frames.length);
   for(const name of ['body','head','hand','hand 2']){
    const target=layerFor(p,si,ai,name);if(!target){assert(name.startsWith('hand'),`Missing ${name}`);continue;}
    const src=layerFor(main,sourceSI,sourceAI,name);assert(src,`Missing main ${name}`);if(name.startsWith('hand'))handLayers++;
    for(let fi=0;fi<4;fi++){const key=`${si}_${ai}_${fi}`,sourceKey=`${sourceSI}_${sourceAI}_${fi}`;assert(target.frameData[key]&&src.frameData[sourceKey]);assert.equal(target.frameData[key].width,src.frameData[sourceKey].width);assert.equal(target.frameData[key].height,src.frameData[sourceKey].height);
     if(JSON.stringify(target.frameData[key])!==JSON.stringify(src.frameData[sourceKey]))changedFrames++;
     target.frameData[key]=structuredClone(src.frameData[sourceKey]);allowed.add(`${p.layers.indexOf(target)}:${key}`);
    }
   }
   p.spriteSheets[si].actions[ai].frames.forEach((f,fi)=>{f.duration=main.spriteSheets[sourceSI].actions[sourceAI].frames[fi].duration;});
  }
  p.spriteSheets[si].fps=main.spriteSheets[sourceSI].fps;
  const normalized=structuredClone(p);normalized.spriteSheets=before.spriteSheets;
  for(let li=0;li<p.layers.length;li++)for(const [key,value]of Object.entries(before.layers[li].frameData||{}))if(allowed.has(`${li}:${key}`))normalized.layers[li].frameData[key]=value;
  assert.deepEqual(normalized,before,'Only authorized base pixels and sit timing may change');
  const expectedSheets=structuredClone(before.spriteSheets);expectedSheets[si].fps=p.spriteSheets[si].fps;expectedSheets[si].actions.forEach((a,ai)=>a.frames.forEach((f,fi)=>f.duration=p.spriteSheets[si].actions[ai].frames[fi].duration));assert.deepEqual(p.spriteSheets,expectedSheets);
  await render(before,si,path.join(dir,'before.png'));await render(p,si,path.join(dir,'after.png'));
  fs.writeFileSync(path.join(dir,'candidate.json'),JSON.stringify(p));prepared.push({info,p,current,changedFrames,handLayers,dir});
 }
 assert.equal((await read('main')).etag,source.etag,'Main changed during preparation; retain candidates without publishing');
 const report=[];
 for(const item of prepared){const save=await fetch(base+'/api/project?id='+encodeURIComponent(item.info.id),{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':item.current.etag},body:JSON.stringify(item.p)});if(!save.ok){report.push({id:item.info.id,name:item.info.name,status:`conflict/error ${save.status}`});continue;}const actual=await read(item.info.id);assert.deepEqual(JSON.parse(actual.raw),item.p,'API readback mismatch');report.push({id:item.info.id,name:item.info.name,status:'saved-and-verified',changedFrames:item.changedFrames,handLayers:item.handLayers});}
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,report},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
