const fs=require('fs'),crypto=require('crypto');
(async()=>{const id='base-outlined-1794365455561';
const r=await fetch('http://127.0.0.1:8765/api/project?id='+id);const raw=Buffer.from(await r.arrayBuffer());const etag=r.headers.get('etag');
fs.writeFileSync(__dirname+'/base-original.json',raw);fs.writeFileSync(__dirname+'/base-original.meta.json',JSON.stringify({etag,sha256:crypto.createHash('sha256').update(raw).digest('hex'),bytes:raw.length,at:new Date().toISOString()}));
const j=JSON.parse(raw);console.log(j.name,etag);
console.log(j.spriteSheets.map((s,i)=>i+':'+s.name+' '+s.actions.map(a=>a.name+'/'+a.direction+'x'+a.frames.length+'@'+a.frames[0].width+'x'+a.frames[0].height).join(', ')).join('\n'));
console.log(j.layers.map((l,i)=>i+' sh'+l.sheetIndex+' '+(l.isGroup?'[G] ':'')+l.name+' vis='+l.visible+' par='+l.parent+' lock='+l.locked+' cels='+Object.keys(l.frameData||{}).length+(l.hairAnimation?' MASTER live='+l.hairAnimation.live+' ho='+!!l.hairAnimation.headOffsets:'')+(l.hairAnimationId?' hid='+l.hairAnimationId.slice(0,6):'')).join('\n'));
})();
