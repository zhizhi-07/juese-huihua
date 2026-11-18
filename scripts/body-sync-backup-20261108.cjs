const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8765',h={'X-Pixel-Editor':'1'};
const DRAFT='draft-7278d7c9-a753-4c98-bf8b-d7c2d45119ba',BRANCHES=['character-036f28f0-189b-4ec8-83b5-6475c88e0239','character-682ea651-ce3e-45b6-bdf2-23c5a6766e6e'];
const out=path.join(root,'备份','20261108-素体主体型同步-'+Date.now());
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=async url=>{const r=await fetch(url,{headers:h});return {status:r.status,etag:r.headers.get('etag'),bytes:Buffer.from(await r.arrayBuffer())};};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const files={main:path.join(root,'data','shared-project.json'),draft:path.join(root,'data','projects',DRAFT+'.json')};
 for(const [name,file]of Object.entries(files)){
  const bytes=fs.readFileSync(file);fs.writeFileSync(path.join(out,name+'-file-before.json'),bytes);
 }
 const main=await read(base+'/api/project?id=main'),draft=await read(base+'/api/project?id='+DRAFT);
 fs.writeFileSync(path.join(out,'main-read-before.json'),main.bytes);
 fs.writeFileSync(path.join(out,'draft-read-before.json'),draft.bytes);
 const branches={};
 for(const id of BRANCHES){const r=await read(base+'/api/project?id='+id);fs.writeFileSync(path.join(out,id+'-read-before.json'),r.bytes);branches[id]={etag:r.etag,sha256:sha(r.bytes)};}
 fs.writeFileSync(path.join(out,'metadata.json'),JSON.stringify({
  createdAt:new Date().toISOString(),
  out,
  main:{file:files.main,sha256:sha(fs.readFileSync(files.main)),etag:main.etag,readSha256:sha(main.bytes)},
  draft:{file:files.draft,sha256:sha(fs.readFileSync(files.draft)),etag:draft.etag,readSha256:sha(draft.bytes)},
  branches,
  restore:'素体主：GET 取当前 ETag，用 If-Match 把 draft-file-before.json PUT 回同一编号；主工程：GET 取 ETag，用 If-Match 把 main-file-before.json PUT 回 main。'
 },null,2));
 fs.writeFileSync(path.join(root,'备份','latest-body-sync-path.txt'),out);
 console.log(JSON.stringify({out,mainEtag:main.etag,draftEtag:draft.etag,mainSha:sha(main.bytes),draftSha:sha(draft.bytes)}));
})().catch(e=>{console.error(e);process.exitCode=1});
