const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const {createCanvas}=require('@napi-rs/canvas');
require('../../test/eye-sync.cjs');
const folder=name=>path.join(__dirname,name), old=JSON.parse(fs.readFileSync(folder('../sit-eye-algorithm-offset-20261110/verification.json'),'utf8'));
const url='http://127.0.0.1:8765/api/project?id=', sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const save=(name,data)=>fs.writeFileSync(folder(name),data,{flag:'wx'});
async function get(id){
 const r=await fetch(url+id);assert.equal(r.status,200);const etag=r.headers.get('etag'),bytes=Buffer.from(await r.arrayBuffer());assert(etag);console.log('GET',id,r.status,etag,sha(bytes));return {etag,bytes};
}
async function check(p, changes){
 const {project}=await new PE.ExportManager().importProject(new Blob([JSON.stringify(p)]));
 const src=project.layers.find(l=>l.hairAnimation?.part==='eyes');
 const result=PE.HairAnimation.plan(project,src,src.hairAnimation,new Set(changes.map(c=>c.key)));
 assert.equal(result.edits.length,4);assert.equal(result.clipped,0);
 function raster(im){const ctx=createCanvas(32,32).getContext('2d');assert.equal(im.placement.w*2,im.width);assert.equal(im.placement.h*2,im.height);ctx.putImageData(im,im.placement.x*2,im.placement.y*2);return ctx.getImageData(0,0,32,32).data;}
 for(const e of result.edits)assert.deepEqual(raster(e.image),raster(e.layer.getFrameData(e.key)));
}
(async()=>{
 const projects=await fetch('http://127.0.0.1:8765/api/projects');assert.equal(projects.status,200);assert((await projects.json()).some(x=>x.id===old.id));
 const before=await get(old.id),main=await get('main');
 save('before.json',before.bytes);
 const p=JSON.parse(before.bytes), prior=JSON.parse(before.bytes);
 const idle=p.spriteSheets.findIndex(s=>s.name==='original16_idle'),si=p.spriteSheets.findIndex(s=>s.name==='original16_sit'),ia=p.spriteSheets[idle].actions.findIndex(a=>a.direction==='side');
 assert.deepEqual(p.spriteSheets[si].actions.map(a=>a.direction),['side']);assert.equal(p.spriteSheets[si].actions[0].frames.length,4);
 const source=p.layers.find(l=>l.sheetIndex===idle&&l.hairAnimation?.part==='eyes'),g=source.hairAnimation,base=source.frameData[idle+'_'+ia+'_0'];
 const target=p.layers.find(l=>l.sheetIndex===si&&l.hairAnimationId===g.id);assert(g.live&&target);
 const changes=old.changes.map(({key,address,original,offset:previous})=>{
  const current=g.offsets[address];assert.deepEqual(current,previous,'target offsets changed since previous edit');
  assert(!g.preserved.includes(address));
  const offset=g.offsets[address]={x:original.x,y:original.y-2};
  const cel=target.frameData[key],placement={...base.placement,x:base.placement.x+offset.x,y:base.placement.y+offset.y};
  if(offset.y!==current.y)target.frameData[key]={...base,placement};
  return {key,address,original,current,offset,placementBefore:cel.placement,placementAfter:target.frameData[key].placement};
 });
 assert.deepEqual(changes.map(c=>c.offset.y),[-1,-1,0,0]);
 const reverted=structuredClone(p);
 for(const c of changes){reverted.layers[p.layers.indexOf(source)].hairAnimation.offsets[c.address]=c.current;reverted.layers[p.layers.indexOf(target)].frameData[c.key]=prior.layers[p.layers.indexOf(target)].frameData[c.key];}
 assert.deepEqual(reverted,prior);
 await check(p,changes);
 console.log('Candidate: four rendered cels match the real sync algorithm; reverse diff on a copy matches original.');
 const bytes=Buffer.from(JSON.stringify(p));save('candidate.json',bytes);console.log(changes);
 const response=await fetch(url+old.id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':before.etag},body:bytes});
 const body=await response.text();console.log('PUT',response.status,body);assert.equal(response.status,200);
 const after=await get(old.id),mainAfter=await get('main');assert.equal(sha(mainAfter.bytes),sha(main.bytes));
 assert.deepEqual(JSON.parse(after.bytes),p);await check(JSON.parse(after.bytes),changes);
 save('after.json',after.bytes);
 save('verification.json',JSON.stringify({id:old.id,before:{etag:before.etag,sha256:sha(before.bytes)},after:{etag:after.etag,sha256:sha(after.bytes)},main:{etag:main.etag,sha256:sha(main.bytes)},put:{status:response.status,body},changes},null,2));
 console.log('PASS: readback exactly matches candidate; all four eyes match regenerated pixels; main unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1});

