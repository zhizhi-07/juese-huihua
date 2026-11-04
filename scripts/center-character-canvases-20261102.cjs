const fs=require('fs'),path=require('path'),assert=require('assert/strict'),png=require('./png.cjs'),canvas=require('../js/character-canvas.cjs'),sync=require('../js/character-sync.js');
const dir=fs.readFileSync(path.resolve(__dirname,'../自检记录/当前画布居中备份路径.txt'),'utf8'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'))),items=manifest.plans.filter(p=>p.id==='main'||/^(character-|draft-hair-study-)/.test(p.id)),projects=new Map(items.map(p=>[p.id,JSON.parse(fs.readFileSync(path.join(dir,p.id+'.before.json')))]));
const get=id=>'http://127.0.0.1:8765/api/project?id='+id;
async function put(id,raw,etag){const r=await fetch(get(id),{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:raw});assert.equal(r.status,200,id+' '+await r.text());return r;}
function check(before,after){let count=0;assert.equal(before.layers.length,after.layers.length);
 for(let si=0;si<before.spriteSheets.length;si++){const s=before.spriteSheets[si],now=after.spriteSheets[si];if(!now.canvasLayout){assert.deepEqual(now,s);continue;}
  for(let ai=0;ai<s.actions.length;ai++)for(let fi=0;fi<s.actions[ai].frames.length;fi++){
   const b=now.canvasLayout.actions[ai],f=s.actions[ai].frames[fi],n=now.actions[ai].frames[fi];assert.equal(n.duration,f.duration);assert.equal(n.locked,f.locked);assert.equal(n.status,f.status);assert.equal(n.notes,f.notes);assert.deepEqual(n.lockedRegions,(f.lockedRegions||[]).map(r=>({...r,x:r.x+b.x,y:r.y+b.y})));
  }
 }
 for(let i=0;i<before.layers.length;i++){
  const old=before.layers[i],now=after.layers[i];assert.deepEqual({...now,frameData:undefined},{...old,frameData:undefined});assert.deepEqual(Object.keys(now.frameData||{}),Object.keys(old.frameData||{}));
  for(const [key,c]of Object.entries(old.frameData||{})){
   const [si,ai]=key.split('_').map(Number),layout=after.spriteSheets[si]?.canvasLayout?.actions[ai],n=now.frameData[key];if(!layout){assert.deepEqual(n,c);continue;}
   if(c.placement){assert.equal(n.dataURL,c.dataURL);assert.deepEqual(n.placement,{...c.placement,x:c.placement.x+layout.x,y:c.placement.y+layout.y});continue;}
   const src=png.decode(Buffer.from(c.dataURL.split(',')[1],'base64')),dst=png.decode(Buffer.from(n.dataURL.split(',')[1],'base64'));
   assert(dst.width>=src.width+layout.x&&dst.height>=src.height+layout.y,'expansion only');
   for(let y=0;y<src.height;y++)assert.deepEqual(Buffer.from(dst.data.subarray(((y+layout.y)*dst.width+layout.x)*4,((y+layout.y)*dst.width+layout.x+src.width)*4)),Buffer.from(src.data.subarray(y*src.width*4,(y+1)*src.width*4)));
   let a=0,b=0;for(let j=3;j<src.data.length;j+=4)if(src.data[j])a++;for(let j=3;j<dst.data.length;j+=4)if(dst.data[j])b++;assert.equal(b,a,'no painted pixels added or removed');count++;
  }
 }
 return count;
}
(async()=>{
 const margin=Math.max(4,...[...projects.values()].flatMap(p=>canvas.measure(p).flatMap(s=>s.actions.map(a=>a.minimumMargin)))),candidates=new Map([...projects].map(([id,p])=>[id,canvas.align(structuredClone(p),margin)])),report=[];
 for(const item of items){const p=candidates.get(item.id);if(item.id.startsWith('character-'))sync(p,candidates.get('main'));const checked=check(projects.get(item.id),p);fs.writeFileSync(path.join(dir,item.id+'.candidate.json'),JSON.stringify(p));report.push({id:item.id,name:item.name,checkedCels:checked,sheets:p.spriteSheets.filter(s=>s.canvasLayout).map(s=>({name:s.name,layout:s.canvasLayout}))});console.log('VERIFIED',item.id,checked);}
 fs.writeFileSync(path.join(dir,'canvas-plan.json'),JSON.stringify({margin,report},null,2));
 if(process.argv.includes('--repair')){
  const live=new Map(),tags=new Map();for(const item of items){const r=await fetch(get(item.id));assert.equal(r.status,200);const p=await r.json();assert.deepEqual(p,JSON.parse(fs.readFileSync(path.join(dir,item.id+'.after-api.json'))),'新的用户保存，不能覆盖：'+item.id);live.set(item.id,p);tags.set(item.id,r.headers.get('etag'));}
  await put('main',JSON.stringify(candidates.get('main')),tags.get('main'));const results=[];
  for(const item of items){let r=await fetch(get(item.id));assert.equal(r.status,200);let actual=await r.json();if(item.id!=='main'){const interim=structuredClone(live.get(item.id));if(item.id.startsWith('character-'))sync(interim,candidates.get('main'));assert.deepEqual(actual,interim,'提交前出现并发修改：'+item.id);await put(item.id,JSON.stringify(candidates.get(item.id)),r.headers.get('etag'));r=await fetch(get(item.id));actual=await r.json();}assert.deepEqual(actual,candidates.get(item.id));fs.writeFileSync(path.join(dir,item.id+'.after-api.json'),JSON.stringify(actual));results.push({id:item.id,etag:r.headers.get('etag')});console.log('SAVED',item.id);}
  fs.writeFileSync(path.join(dir,'save-results.json'),JSON.stringify(results,null,2));console.log('COMPLETE',results.length,dir);return;
 }
 if(!process.argv.includes('--apply')){console.log('STAGED',items.length,'margin',margin,dir);return;}
 for(const item of items){const r=await fetch(get(item.id));assert.equal(r.status,200);assert.equal(r.headers.get('etag'),item.etag,'工程在检查期间被保存，请重新合并：'+item.id);}
 // Materialize the existing inherited base before changing the common canvas coordinate system.
 for(const item of items.filter(i=>i.id.startsWith('character-')))await put(item.id,fs.readFileSync(path.join(dir,item.id+'.before.json'),'utf8'),item.etag);
 const main=items.find(i=>i.id==='main');await put('main',fs.readFileSync(path.join(dir,'main.candidate.json'),'utf8'),main.etag);
 const results=[];
 for(const item of items){let r=await fetch(get(item.id));assert.equal(r.status,200,item.id+' '+await r.clone().text());let raw=await r.text();const expected=candidates.get(item.id);
  if(item.id.startsWith('character-'))assert.deepEqual(JSON.parse(raw),expected,'automatic border alignment differs: '+item.id);
  if(item.id!=='main'){await put(item.id,JSON.stringify(expected),r.headers.get('etag'));r=await fetch(get(item.id));assert.equal(r.status,200);raw=await r.text();}
  assert.deepEqual(JSON.parse(raw),expected);fs.writeFileSync(path.join(dir,item.id+'.after-api.json'),raw);results.push({id:item.id,etag:r.headers.get('etag')});console.log('SAVED',item.id);
 }
 fs.writeFileSync(path.join(dir,'save-results.json'),JSON.stringify(results,null,2));console.log('COMPLETE',results.length,dir);
})().catch(e=>{console.error(e);process.exitCode=1});
