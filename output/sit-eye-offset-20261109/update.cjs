const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const png=require('../../scripts/png.cjs');
const url='http://127.0.0.1:8765/api/project?id=', id='draft-7278d7c9-a753-4c98-bf8b-d7c2d45119ba';
const putHeaders={'Content-Type':'application/json','X-Pixel-Editor':'1'};
const dir=__dirname, sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const save=(name,bytes)=>fs.writeFileSync(path.join(dir,name),bytes);
async function get(id){
 const r=await fetch(url+id); assert.equal(r.status,200); const etag=r.headers.get('etag'); assert(etag);
 return {etag,bytes:Buffer.from(await r.arrayBuffer())};
}
function ink(cel,dx=0,dy=0){
 const {width:w,height:h,data}=png.decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));
 const p=cel.placement, pts=[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4;if(data[i+3])pts.push([p.x+dx+x*p.w/w,p.y+dy+y*p.h/h,...data.subarray(i,i+4)]);
 }
 return pts;
}
(async()=>{
 const before=await get(id), main=await get('main');
 save('before.json',before.bytes); save('main-before.json',main.bytes);
 const p=JSON.parse(before.bytes), idle=p.spriteSheets.findIndex(s=>s.name==='original16_idle'),si=p.spriteSheets.findIndex(s=>s.name==='original16_sit');
 const ia=p.spriteSheets[idle].actions.findIndex(a=>a.direction==='side');
 const s=p.spriteSheets[si];assert.deepEqual(s.actions.map(a=>a.direction),['side']);
 const masters=p.layers.filter(l=>l.sheetIndex===idle&&l.hairAnimation?.part==='eyes');assert.equal(masters.length,1);
 const source=masters[0],g=source.hairAnimation, base=source.frameData[idle+'_'+ia+'_0'];
 const target=p.layers.find(l=>l.sheetIndex===si&&l.hairAnimationId===g.id);assert(target&&g.live);
 const changes=s.actions[0].frames.map((frame,fi)=>{
  const key=si+'_0_'+fi,address=s.name+'/side/'+fi,cel=target.frameData[key];
  assert(!g.preserved.includes(address)&&!frame.locked&&!frame.lockedRegions?.length&&!target.locked);
  const offsetBefore=g.offsets[address], placementBefore={...cel.placement};
  cel.placement.y+=2;
  const offsetAfter=g.offsets[address]={x:cel.placement.x-base.placement.x,y:cel.placement.y-base.placement.y};
  assert.deepEqual(ink(cel),ink(base,offsetAfter.x,offsetAfter.y),'live sync must reproduce every visible source pixel');
  assert(ink(cel).every(([x,y])=>x>=0&&y>=0&&x<frame.width&&y<frame.height));
  return {key,address,offsetBefore,offsetAfter,placementBefore,placementAfter:cel.placement};
 });
 const bytes=Buffer.from(JSON.stringify(p));
 save('candidate.json',bytes);
 const report={id,before:{etag:before.etag,sha256:sha(before.bytes)},main:{etag:main.etag,sha256:sha(main.bytes)},changes};
 save('verification.json',JSON.stringify(report,null,2));
 console.log('Before: GET 200',report.before, 'main',report.main,'changes',changes);
 if(!process.argv.includes('--save'))return;
 const response=await fetch(url+id,{method:'PUT',headers:{...putHeaders,'If-Match':before.etag},body:bytes});
 const responseText=await response.text();console.log('PUT',response.status,responseText);
 assert.equal(response.status,200);
 const after=await get(id), mainAfter=await get('main');
 assert.deepEqual(JSON.parse(after.bytes),p,'readback must match entire candidate');
 assert.equal(sha(mainAfter.bytes),sha(main.bytes),'main must be untouched');
 save('after.json',after.bytes);
 report.after={etag:after.etag,sha256:sha(after.bytes)};report.put={status:response.status,body:responseText};
 save('verification.json',JSON.stringify(report,null,2));
 console.log('Readback: GET 200, full project match; main unchanged.',report.after);
})().catch(e=>{console.error(e);process.exitCode=1;});
