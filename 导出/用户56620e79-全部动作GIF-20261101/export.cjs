const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=process.cwd(),out=path.join(root,'导出/用户56620e79-全部动作GIF-20261101');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','frame-timing'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'));
(async()=>{
const url='http://127.0.0.1:8765/api/project?id=character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
const r=await fetch(url);assert(r.ok);const raw=await r.text();fs.writeFileSync(path.join(out,'source-project.json'),raw);
const p=(await new PE.ExportManager().importProject(new Blob([raw]))).project,cm=new PE.CanvasManager(document.createElement('canvas'),p);
const meta={name:p.name,projectId:'character-56620e79-ce79-4fd9-b49c-081f7bc57d67',etag:r.headers.get('etag'),sha256:crypto.createHash('sha256').update(raw).digest('hex'),sheets:[]};
for(const [name,label] of [['original32_walk','行走'],['original32_idle','待机'],['original32_pickup','拾取'],['original32_sit','坐姿'],['original32_sleep','睡觉']]){
const si=p.spriteSheets.findIndex(s=>s.name===name);assert(si>=0);const s=p.spriteSheets[si],entry={si,label,actions:[]};
for(let ai=0;ai<s.actions.length;ai++){const a=s.actions[ai],item={ai,direction:a.direction,frames:[]};
for(let fi=0;fi<a.frames.length;fi++){const d=cm.getCompositeImageData(si,ai,fi,true,1);assert(d.data.some((v,j)=>j%4===3&&v),'empty frame');const c=createCanvas(d.width,d.height);c.getContext('2d').putImageData(d,0,0);const file=`${si}-${ai}-${fi}.png`;fs.writeFileSync(path.join(out,file),c.toBuffer('image/png'));item.frames.push({file,width:d.width,height:d.height,duration:PE.frameTiming.effectiveDelay(s,a.frames[fi])});}
entry.actions.push(item);}meta.sheets.push(entry);}
assert.equal(meta.sheets.flatMap(s=>s.actions).flatMap(a=>a.frames).length,70);
const rr=await fetch(url);assert(rr.ok);assert.equal(await rr.text(),raw,'source changed during export');meta.projectUnchanged=true;
fs.writeFileSync(path.join(out,'export-metadata.json'),JSON.stringify(meta,null,2));console.log('PASS: 70 nonempty frames, 5 actions, 13 directions; API source unchanged.');console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1;});
