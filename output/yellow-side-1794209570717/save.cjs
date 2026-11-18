const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const read=n=>fs.readFileSync(path.join(__dirname,n)),write=(n,b)=>fs.writeFileSync(path.join(__dirname,n),b);
const url='http://127.0.0.1:8765/api/project?id=',id='draft-7278d7c9-a753-4c98-bf8b-d7c2d45119ba';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
  const before=read('before.json'),candidate=read('candidate.json'),etag=/^etag:\s*("[a-f0-9]+")/im.exec(read('headers.txt').toString())[1];
  assert.equal('"'+sha(before)+'"',etag);
  const mainPre=await fetch(url+'main');assert.equal(mainPre.status,200);
  assert.equal(sha(Buffer.from(await mainPre.arrayBuffer())),sha(read('main-before.json')));
  const put=await fetch(url+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:candidate});
  const response=await put.text();write('put-result.json',JSON.stringify({status:put.status,etag:put.headers.get('etag'),body:response}));
  console.log('PUT',put.status,response);assert.equal(put.status,200);
  const res=await fetch(url+id),result=Buffer.from(await res.arrayBuffer());
  write('readback.json',result);write('readback-headers.txt',JSON.stringify(Object.fromEntries(res.headers)));
  assert.equal(res.status,200);assert.equal(res.headers.get('etag'),put.headers.get('etag'));assert.deepEqual(JSON.parse(result),JSON.parse(candidate));
  const main=await fetch(url+'main');assert.equal(main.status,200);assert.equal(sha(Buffer.from(await main.arrayBuffer())),sha(read('main-before.json')));
  console.log('GET',res.status,'readback matches the candidate; shared main unchanged.');
  console.log('Original SHA256:',sha(before),'Readback SHA256:',sha(result));
})().catch(e=>{console.error(e);process.exitCode=1});
