const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const {decode}=require('../../scripts/png.cjs');
const before=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/before.json','utf8'));
const after=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/after-api.json','utf8'));
const disk=fs.readFileSync('data/projects/base-outlined-1794365455561.json');
const api=fs.readFileSync('output/eyes-down-1px-20261111/after-api.json');
assert.ok(disk.equals(api),'disk bytes != API bytes');
const isEyes=l=>!l.isGroup&&/眼睛/.test(l.name);
const changed=[];
for(let i=0;i<after.layers.length;i++){
 const a=after.layers[i],b=before.layers[i];
 assert.equal(a.name,b.name);assert.equal(a.sheetIndex,b.sheetIndex);assert.deepEqual(a.frames,b.frames);
 if(a.isGroup){assert.deepEqual(a.frameData,b.frameData);continue;}
 for(const k of Object.keys(a.frameData||{})){
  const ca=a.frameData[k],cb=b.frameData[k];assert.ok(cb,'new cel '+k);
  if(JSON.stringify(ca)===JSON.stringify(cb))continue;
  assert.ok(isEyes(a),'non-eye change '+a.name+' '+k);
  const ia=decode(Buffer.from(ca.dataURL.split(',')[1],'base64')),ib=decode(Buffer.from(cb.dataURL.split(',')[1],'base64'));
  assert.equal(ia.width,ib.width);assert.equal(ia.height,ib.height);
  assert.equal(ca.width,ia.width);assert.equal(ca.height,ia.height);
  for(let y=0;y<ia.height;y++)for(let x=0;x<ia.width;x++){const o=(y*ia.width+x)*4;
   if(y===0){assert.equal(ia.data[o+3],0,'top row not cleared');continue;}
   assert.deepEqual([...ia.data.subarray(o,o+4)],[...ib.data.subarray(o-ia.width*4,o-ia.width*4+4)]);}
  changed.push(a.name+'#'+a.sheetIndex+'/'+k);
 }
}
// frame geometry and durations untouched
assert.deepEqual(after.spriteSheets.map(s=>s.name),before.spriteSheets.map(s=>s.name));
for(let si=0;si<after.spriteSheets.length;si++)for(let ai=0;ai<after.spriteSheets[si].actions.length;ai++){
 const A=after.spriteSheets[si].actions[ai].frames,B=before.spriteSheets[si].actions[ai].frames;assert.equal(A.length,B.length);
 for(let fi=0;fi<A.length;fi++)for(const k of ['width','height','sourceX','sourceY','duration','status','locked','lockedRegions','notes'])assert.deepEqual(A[fi][k],B[fi][k]);
}
const otherKeys=['version','name','bgColor','gridColor','currentSheetIndex','currentActionIndex','currentFrameIndex','currentLayerIndex','palette'];
for(const k of otherKeys)assert.deepEqual(after[k],before[k]);
console.log('changed eye cels:',changed.length);
console.log('layers:',after.layers.length,'sheets:',after.spriteSheets.length);
const out={changedCels:changed.length,diskEqualsApi:true,etag:'4493814377daf1962e41cbb4d1f6b094b5fd95f78bdc52ae80d833c2b30432a8',changed};
fs.writeFileSync('output/eyes-down-1px-20261111/independent-verification.json',JSON.stringify(out,null,2));
console.log('OK');
