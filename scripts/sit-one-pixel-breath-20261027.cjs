const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),png=require('./png.cjs');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};
global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8765',out=path.join(root,'自检记录/坐姿一像素呼吸-'+Date.now());
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
function compress(first,cut){const im=decode(first),data=new Uint8Array(im.data.length);for(let y=0;y<im.height;y++){const sy=y<cut?y-1:y;if(sy>=0)data.set(im.data.subarray(sy*128,(sy+1)*128),y*128);}assert.deepEqual(data.subarray(cut*128),im.data.subarray(cut*128));return {...first,dataURL:'data:image/png;base64,'+png.encode(32,32,data).toString('base64')};}
function raise(first,shift){const im=decode(first),data=new Uint8Array(im.data.length);if(shift===0)data.set(im.data);else data.set(im.data.subarray(128));assert.equal(data.filter((v,i)=>i%4===3&&v).length,im.data.filter((v,i)=>i%4===3&&v).length);return {...first,dataURL:'data:image/png;base64,'+png.encode(32,32,data).toString('base64')};}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const list=await(await fetch(base+'/api/projects')).json(),report=[];
 for(const info of list.filter(p=>p.id==='main'||p.id.startsWith('character-'))){
  const url=base+'/api/project?id='+encodeURIComponent(info.id),r=await fetch(url);assert(r.ok);const raw=await r.text(),before=JSON.parse(raw),p=JSON.parse(raw),si=p.spriteSheets.findIndex(s=>s.name==='original32_sit');assert(si>=0);const dir=path.join(out,info.id);fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'before.json'),raw);
  const changed=new Set();
  for(let li=0;li<p.layers.length;li++){
   const l=p.layers[li];if(l.sheetIndex!==si||!l.frameData||l.isGroup)continue;
   const hand=/^hand(?: 2)?$/.test(l.name)||l.name==='坐姿 / 手部';
   const body=l.name==='body'||l.name==='head'||/^服装\s*\//.test(l.name);
   const attached=/^(眼睛|嘴巴|头发|发饰)(\s*\/|$)/.test(l.name);
   if(!hand&&!body&&!attached)continue;
   for(let ai=0;ai<3;ai++){
    const first=l.frameData[`${si}_${ai}_0`];if(!first)continue;
    for(const fi of hand?[1,2,3]:[2,3]){const key=`${si}_${ai}_${fi}`;if(!l.frameData[key])continue;
     l.frameData[key]=hand?raise(first,fi===3?0:-1):compress(first,body?27:30);changed.add(`${li}:${key}`);
    }
   }
  }
  const normalized=structuredClone(p);for(let li=0;li<p.layers.length;li++)for(const [key,value]of Object.entries(before.layers[li].frameData||{}))if(changed.has(`${li}:${key}`))normalized.layers[li].frameData[key]=value;assert.deepEqual(normalized,before,'Unexpected change outside sit animation');
  const {project}=await new PE.ExportManager().importProject(new File([JSON.stringify(p)],'p.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project),canvas=createCanvas(768,576),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){const im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);ctx.fillStyle='#ddd5ed';ctx.fillRect(fi*192,ai*192,192,192);ctx.drawImage(tile,fi*192,ai*192,192,192);}fs.writeFileSync(path.join(dir,'after.png'),canvas.toBuffer('image/png'));fs.writeFileSync(path.join(dir,'candidate.json'),JSON.stringify(p));
  const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});if(!saved.ok){report.push({id:info.id,status:'conflict '+saved.status});continue;}assert.deepEqual(await(await fetch(url)).json(),p);report.push({id:info.id,status:'saved-and-verified'});
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,report},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
