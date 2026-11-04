const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const out=__dirname,read=n=>JSON.parse(fs.readFileSync(path.join(out,n))),write=(n,s)=>fs.writeFileSync(path.join(out,n),typeof s==='string'?s:JSON.stringify(s,null,2)),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
(async()=>{
const meta=read('meta.json'),p=read('candidate.json'),v=read('验证结果.json'),url='http://127.0.0.1:8765/api/project?id='+meta.id;
assert.equal(hash(fs.readFileSync(path.join(out,'candidate.json'))),v.candidateSHA256,'Candidate differs from verified file');let logs=[];
async function get(label,u=url){let r=await fetch(u),raw=await r.text();logs.push({method:'GET',url:u,label,status:r.status,etag:r.headers.get('etag'),sha256:hash(raw)});return {r,raw}}
async function put(data,etag){let body=JSON.stringify(data),r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body}),raw=await r.text();logs.push({method:'PUT',url,inputSHA256:hash(body),ifMatch:etag,status:r.status,output:raw});write('保存事务.json',logs);assert(r.ok,raw)}
let initial=await get('new target must not exist');assert.equal(initial.r.status,404,'Refusing to replace an existing project');
let base=read('branch-before-hair.json');base.name=p.name;base.currentSheetIndex=8;base.currentActionIndex=1;base.currentFrameIndex=0;
// The server deliberately strips wardrobe on initial character-creation; publish the hair only in the guarded second transaction.
await put(base,'none');let before=await get('new project before hair');assert(before.r.ok);write('branch-api-before-hair.json',before.raw);write('branch-before-etag.txt',before.r.headers.get('etag'));let savedBase=JSON.parse(before.raw);
assert.deepEqual(savedBase.layers,base.layers,'Synced base changed: keep candidate, do not overwrite');assert.deepEqual(savedBase.spriteSheets,base.spriteSheets);
await put(p,before.r.headers.get('etag'));let after=await get('final readback');assert(after.r.ok);let saved=JSON.parse(after.raw);write('api-readback.json',after.raw);assert.deepEqual(saved,p,'API readback differs from candidate');
let src=await get('reference still unchanged','http://127.0.0.1:8765/api/project?id='+meta.sourceId);assert(src.r.ok);let referenceUnchanged=hash(src.raw)===meta.sourceSHA256;
let listed=await fetch('http://127.0.0.1:8765/api/projects');assert(listed.ok);assert((await listed.json()).some(x=>x.id===meta.id&&x.name===p.name));
write('saved-meta.json',{...meta,finalETag:after.r.headers.get('etag'),beforeSHA256:hash(before.raw),finalSHA256:hash(after.raw),referenceUnchanged,url:'http://localhost:8765/index.html?project='+meta.id,projectFile:path.resolve('data/projects/'+meta.id+'.json')});write('保存事务.json',logs);console.log('SAVED',meta.id,'referenceUnchanged',referenceUnchanged,'API readback exact match');
})().catch(e=>{fs.appendFileSync(path.join(out,'执行记录.txt'),'PUBLISH ERROR: '+e.stack+'\n');console.error(e);process.exitCode=1});
