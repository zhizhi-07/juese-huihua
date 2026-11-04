const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const file=n=>path.join(__dirname,n),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
(async()=>{
 const original=fs.readFileSync(file('before.json'),'utf8');
 assert.equal(sha(original),fs.readFileSync(file('before-sha256.txt'),'utf8').trim());
 if(process.argv.includes('--check')){
  fs.copyFileSync(file('final-api-readback.json'),file('恢复演练副本.json'));
  fs.writeFileSync(file('恢复演练副本.json'),original);
  assert.equal(sha(fs.readFileSync(file('恢复演练副本.json'))),sha(original));
  console.log('PASS: restored an extra copy; saved project not touched');return;
 }
 assert(process.argv.includes('--restore'),'Use --check or --restore');
 const url='http://127.0.0.1:8765/api/project?id=character-gold-mix-1793320553623';
 let r=await fetch(url);assert(r.ok);const etag=r.headers.get('etag');
 assert.equal(etag,JSON.parse(fs.readFileSync(file('验证结果.json'))).etag,'Project changed since this edit; stop to protect later edits');
 r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:original});
 assert(r.ok,await r.text());r=await fetch(url);assert(r.ok);assert.deepEqual((await r.json()).layers,JSON.parse(original).layers);
 console.log('PASS: previous saved hair restored and API read back');
})().catch(e=>{console.error(e);process.exitCode=1});
