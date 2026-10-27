const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),png=require('./png.cjs');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};
global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8765';
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
const encode=(f,data)=>({...f,dataURL:'data:image/png;base64,'+png.encode(f.width,f.height,data).toString('base64')});
const count=im=>im.data.filter((v,i)=>i%4===3&&v).length;
function bottom(im){for(let y=im.height-1;y>=0;y--)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3])return y;return -1;}
function move(f,shift){const im=decode(f),data=new Uint8Array(im.data.length);for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const a=(y*im.width+x)*4;if(!im.data[a+3])continue;assert(y+shift<im.height,'Rigid component would be cropped');data.set(im.data.subarray(a,a+4),((y+shift)*im.width+x)*4);}const result=encode(f,data);assert.equal(count(decode(result)),count(im),'Rigid part loses pixels');return result;}
function torso(f){const im=decode(f),data=new Uint8Array(im.data.length);for(let y=0;y<im.height;y++){const sy=y<27?y-4:y;if(sy>=0)data.set(im.data.subarray(sy*im.width*4,(sy+1)*im.width*4),y*im.width*4);}assert.deepEqual(data.subarray(27*im.width*4),im.data.subarray(27*im.width*4),'Seat/soles changed');return encode(f,data);}
function head(f){const im=decode(f),data=new Uint8Array(im.data.length);for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const a=(y*im.width+x)*4;if(!im.data[a+3])continue;const dy=y<24?y+4:y;data.set(im.data.subarray(a,a+4),(dy*im.width+x)*4);}return encode(f,data);}
async function read(id){const r=await fetch(base+'/api/project?id='+encodeURIComponent(id));assert(r.ok,`GET ${id}: ${r.status}`);return {raw:await r.text(),etag:r.headers.get('etag')};}
async function render(p,si,file,{bare=false,bg='#ddd5ed'}={}){
 const {project}=await new PE.ExportManager().importProject(new File([JSON.stringify(p)],'p.json'));
 if(bare)project.layers.forEach(l=>{if(l.sheetIndex===si&&!l.isGroup&&!/^(body|head|hand(?: 2)?)$/.test(l.name))l.visible=false;});
 const cm=new PE.CanvasManager(document.createElement('canvas'),project),canvas=createCanvas(768,576),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  const im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v),'Empty composite');const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);
  ctx.fillStyle=bg;ctx.fillRect(fi*192,ai*192,192,192);ctx.drawImage(tile,fi*192,ai*192,192,192);
 }
 fs.writeFileSync(file,canvas.toBuffer('image/png'));
 return {project,cm};
}
(async()=>{
 if(process.argv[2]==='--publish'){
  const dir=path.resolve(process.argv[3]);assert(dir.startsWith(path.join(root,'自检记录')+path.sep));const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'))),report=[];
  for(const item of manifest){const body=fs.readFileSync(path.join(dir,item.id,'candidate.json'),'utf8');const r=await fetch(base+'/api/project?id='+encodeURIComponent(item.id),{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':item.etag},body});if(!r.ok){report.push({id:item.id,status:'conflict '+r.status});continue;}assert.deepEqual(JSON.parse((await read(item.id)).raw),JSON.parse(body));report.push({id:item.id,status:'saved-and-verified'});}
  fs.writeFileSync(path.join(dir,'saved.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));return;
 }
 const out=path.join(root,'自检记录/坐姿降低高度-'+Date.now());fs.mkdirSync(out,{recursive:true});
 const projects=await(await fetch(base+'/api/projects')).json(),manifest=[];
 for(const info of projects.filter(q=>q.id==='main'||q.id.startsWith('character-'))){
  const current=await read(info.id),before=JSON.parse(current.raw),p=JSON.parse(current.raw),si=p.spriteSheets.findIndex(s=>s.name==='original32_sit');assert(si>=0);const dir=path.join(out,info.id);fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'before.json'),current.raw);
  const allowed=new Set();let frames=0;
  for(let li=0;li<p.layers.length;li++){
   const l=p.layers[li];if(l.sheetIndex!==si||l.isGroup||!l.frameData)continue;
   const keys=Object.keys(l.frameData).filter(k=>k.startsWith(si+'_'));
   const isHand=/^hand(?: 2)?$/.test(l.name)||l.name==='坐姿 / 手部';
   const isHead=l.name==='head',isBody=l.name==='body',isClothes=/^服装\s*\//.test(l.name);
   const isAttached=/^(眼睛|嘴巴|头发|发饰)(\s*\/|$)/.test(l.name);
   if(!isHand&&!isHead&&!isBody&&!isClothes&&!isAttached)continue;
   const handBottom=isHand?Math.max(-1,...keys.map(k=>bottom(decode(l.frameData[k])))):-1;
   const handShift=Math.min(4,31-handBottom);
   for(const k of keys){const f=l.frameData[k];assert.equal(f.width,32);assert.equal(f.height,32);
    l.frameData[k]=isHand?move(f,handShift):isHead?head(f):(isBody||isClothes)?torso(f):move(f,4);
    allowed.add(`${li}:${k}`);frames++;
   }
  }
  const normalized=structuredClone(p);for(let li=0;li<p.layers.length;li++)for(const [key,value]of Object.entries(before.layers[li].frameData||{}))if(allowed.has(`${li}:${key}`))normalized.layers[li].frameData[key]=value;
  assert.deepEqual(normalized,before,'Other actions or layer metadata changed');
  await render(before,si,path.join(dir,'before.png'));await render(p,si,path.join(dir,'after.png'));await render(p,si,path.join(dir,'after-dark.png'),{bg:'#263238'});await render(p,si,path.join(dir,'after-bare.png'),{bare:true});
  const {cm}=await render(p,si,path.join(dir,'after.png'));
  const idle=p.spriteSheets.findIndex(s=>s.name==='original32_idle');
  const comparison=createCanvas(576,576),ctx=comparison.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#ddd5ed';ctx.fillRect(0,0,576,576);
  const {project:oldProject}=await new PE.ExportManager().importProject(new File([current.raw],'old.json'));const oldCM=new PE.CanvasManager(document.createElement('canvas'),oldProject);
  for(let ai=0;ai<3;ai++)for(const [col,manager,sheet]of [[0,oldCM,idle],[1,oldCM,si],[2,cm,si]]){
   const im=manager.getCompositeImageData(sheet,ai,0),tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);ctx.drawImage(tile,col*192,ai*192,192,192);
  }
  fs.writeFileSync(path.join(dir,'standing-old-new.png'),comparison.toBuffer('image/png'));
  fs.writeFileSync(path.join(dir,'candidate.json'),JSON.stringify(p));manifest.push({id:info.id,name:info.name,etag:current.etag,frames});
 }
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({out,manifest},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
