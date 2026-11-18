const fs=require('node:fs'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const read=n=>fs.readFileSync(__dirname+'/'+n),hash=b=>createHash('sha256').update(b).digest('hex');
(async()=>{
 const rev=JSON.parse(read('revision.json')),bytes=read('candidate.json');assert.equal(hash(read('before.json')),rev.sha256);
 const r=await fetch(rev.api,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':rev.etag},body:bytes});
 const put={status:r.status,etag:r.headers.get('etag'),body:await r.text()};console.log('PUT',put);assert.equal(put.status,200);
 const after=await fetch(rev.api),body=Buffer.from(await after.arrayBuffer()),get={status:after.status,etag:after.headers.get('etag'),sha256:hash(body)};
 console.log('GET',get);assert.equal(get.status,200);assert.equal(get.etag,put.etag);assert.deepEqual(body,bytes);
 fs.writeFileSync(__dirname+'/verified.json',body);fs.writeFileSync(__dirname+'/verification.json',JSON.stringify({put,get},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
