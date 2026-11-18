const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:8765',h={'X-Pixel-Editor':'1'};
const DRAFT='draft-7278d7c9-a753-4c98-bf8b-d7c2d45119ba';
const metaPath=path.join(root,'备份','latest-body-sync-path.txt').trim();
const meta=JSON.parse(fs.readFileSync(path.join(fs.readFileSync(metaPath,'utf8').trim(),'metadata.json'),'utf8'));
(async()=>{
 const ids=['main',DRAFT,'character-036f28f0-189b-4ec8-83b5-6475c88e0239','character-682ea651-ce3e-45b6-bdf2-23c5a6766e6e','character-8675d184-f5d7-4b85-88cb-95428736e5cf','character-1f622669-b72b-4df8-bafd-ce25df22c486','draft-conflict-1793762650078-819fdffe','scene-df0d69f2-a484-41f9-a384-3235026c9653'];
 const rows=[];
 for(const id of ids){
  const r=await fetch(base+'/api/project?id='+id,{headers:h});
  rows.push({id,status:r.status,etag:(r.headers.get('etag')||'').slice(0,14),mainEtagSame:id==='main'?r.headers.get('etag')===meta.main.etag:undefined});
 }
 const a=await fetch(base+'/api/project?id='+DRAFT,{headers:h}),b=await fetch(base+'/api/project?id='+DRAFT,{headers:h});
 const stable=a.headers.get('etag')===b.headers.get('etag');
 const page=await fetch(base+'/index.html?project='+DRAFT),module=await fetch(base+'/js/body-sync.cjs');
 console.log(JSON.stringify({rows,draftEtagStable:stable,indexHtml:page.status,bodySyncModuleExposed:module.status},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
