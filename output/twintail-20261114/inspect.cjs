const fs=require('fs'),crypto=require('crypto');
(async()=>{
for(const id of ['main','merchant-original-1794364657183']){
const r=await fetch('http://127.0.0.1:8765/api/project?id='+id);const raw=Buffer.from(await r.arrayBuffer());
const etag=r.headers.get('etag');
fs.writeFileSync(`output/twintail-20261114/${id}-original.json`,raw);
fs.writeFileSync(`output/twintail-20261114/${id}-original.meta.json`,JSON.stringify({etag,sha256:crypto.createHash('sha256').update(raw).digest('hex'),bytes:raw.length,at:new Date().toISOString()}));
const j=JSON.parse(raw);
console.log('==',id,j.name,etag,'palette',JSON.stringify(j.palette).slice(0,300));
if(id!=='main'){console.log(j.spriteSheets.map((s,i)=>i+':'+s.name+' '+s.actions.map(a=>a.name+'/'+a.direction+'x'+a.frames.length+'@'+a.frames[0].width+'x'+a.frames[0].height).join(', ')).join('\n'));
console.log(j.layers.map((l,i)=>i+' sh'+l.sheetIndex+' '+(l.isGroup?'[G] ':'')+l.name+' vis='+l.visible+' par='+l.parent+' cels='+Object.keys(l.frameData||{}).length).join('\n'));}
}
const j=JSON.parse(fs.readFileSync('output/twintail-20261114/main-original.json'));
for(const i of [0,87,23,86]){const l=j.layers[i];const o={...l,frameData:undefined};console.log(i,JSON.stringify(o));const k=Object.keys(l.frameData);console.log(k.join(','));const c=l.frameData[k[0]];console.log(JSON.stringify({...c,dataURL:c.dataURL&&c.dataURL.slice(0,60)}));}
console.log(JSON.stringify(j.spriteSheets[1],null,0).slice(0,1500));
})();
