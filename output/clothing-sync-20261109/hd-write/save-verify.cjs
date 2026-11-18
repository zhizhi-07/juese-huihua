const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const read=n=>fs.readFileSync(path.join(__dirname,n)),write=(n,b)=>fs.writeFileSync(path.join(__dirname,n),b);
const url='http://127.0.0.1:8765/api/project?id=draft-7278d7c9-a753-4c98-bf8b-d7c2d45119ba',main='http://127.0.0.1:8765/api/project?id=main';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
  const etag=/^etag:\s*("[a-f0-9]+")/im.exec(read('headers.txt').toString())[1],orig=read('before.json'),candidate=read('candidate.json');
  assert.equal('"'+sha(orig)+'"',etag);
  const put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:candidate});
  const response=await put.text();write('put-result.json',JSON.stringify({status:put.status,etag:put.headers.get('etag'),body:response},null,2));console.log('PUT',put.status,response);
  if(!put.ok){process.exitCode=1;return;}
  const res=await fetch(url),result=Buffer.from(await res.arrayBuffer());write('readback.json',result);
  assert.equal(res.status,200);assert.equal(res.headers.get('etag'),put.headers.get('etag'));
  assert.deepEqual(JSON.parse(result),JSON.parse(candidate));
  const before=JSON.parse(orig),after=JSON.parse(result),src=before.currentLayerIndex;
  for(let i=0;i<before.layers.length;i++)if(i!==src)assert.deepEqual(after.layers[i],before.layers[i]);
  for(const [key,cel]of Object.entries(before.layers[src].frameData))assert.deepEqual(after.layers[src].frameData[key],cel);
  const mf=await fetch(main),mainAfter=Buffer.from(await mf.arrayBuffer());write('main-readback.json',mainAfter);assert.equal(mf.status,200);assert.equal(sha(mainAfter),sha(read('main-before.json')));
  console.log('Verified API readback',res.headers.get('etag'),'main unchanged',sha(mainAfter));
})().catch(e=>{console.error(e);process.exitCode=1});
