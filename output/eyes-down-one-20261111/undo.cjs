const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');const {decode}=require('../../scripts/png.cjs');const pixels=c=>({...c,dataURL:decode(Buffer.from(c.dataURL.split(',')[1],'base64'))});
(async()=>{
 const d='output/eyes-down-one-20261111/',info=JSON.parse(fs.readFileSync(d+'backup-info.json')),before=JSON.parse(fs.readFileSync(d+'before.json')),after=JSON.parse(fs.readFileSync(d+'after.json')),report=JSON.parse(fs.readFileSync(d+'verification.json'));
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(d+'before.json')).digest('hex'),info.sha256);
 const list=await fetch('http://127.0.0.1:8765/api/projects');assert(list.ok);assert((await list.json()).some(p=>p.id==='base-outlined-1794365455561'));
 const r=await fetch(info.url),raw=await r.text(),etag=r.headers.get('etag');assert(r.ok&&etag);const current=JSON.parse(raw),p=structuredClone(current);
 fs.writeFileSync(d+'undo-before.json',raw);fs.writeFileSync(d+'undo-backup-info.json',JSON.stringify({etag,sha256:crypto.createHash('sha256').update(raw).digest('hex')},null,2));
 let restored=0,alreadyOriginal=0;
 for(const {layer,key} of report.changes){const now=p.layers[layer];assert.equal(now.name,before.layers[layer].name);assert.equal(now.sheetIndex,before.layers[layer].sheetIndex);const cel=now.frameData[key];if(JSON.stringify(pixels(cel))===JSON.stringify(pixels(before.layers[layer].frameData[key]))){alreadyOriginal++;continue;}now.frameData[key]=structuredClone(before.layers[layer].frameData[key]);restored++;}
 fs.writeFileSync(d+'undo-candidate.json',JSON.stringify(p));
 if(restored){const s=await fetch(info.url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});const msg=await s.text();fs.writeFileSync(d+'undo-response.txt',s.status+'\n'+msg);assert(s.ok,msg);}
 const read=await(await fetch(info.url)).json();assert.deepEqual(read,p);fs.writeFileSync(d+'undo-after.json',JSON.stringify(read));
 const verify=structuredClone(read);for(const {layer,key}of report.changes)verify.layers[layer].frameData[key]=current.layers[layer].frameData[key];assert.deepEqual(verify,current);
 const result={restored,alreadyOriginal,verified:true,otherDataUnchanged:true};fs.writeFileSync(d+'undo-verification.json',JSON.stringify(result,null,2));console.log(result);
})().catch(e=>{console.error(e);process.exitCode=1});


