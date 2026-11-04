const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
global.window=global;global.document={addEventListener(){},createElement(){return {}}};global.location={protocol:'http:',href:'http://localhost:8765/index.html?project=main'};global.PE={};
vm.runInThisContext(fs.readFileSync(path.resolve(__dirname,'../js/persistence.js'),'utf8'));
function setup(){let local={},applied='';const app={suspendBackup:false,project:{value:1},toolManager:{isDrawing:false},exportManager:{exportProject(){return new Blob([JSON.stringify(app.project)])}}};const status={textContent:'',classList:{toggle(){}},append(){}};const p=new PE.ProjectPersistence(app,status);p.localRead=async()=>local;p.localWrite=async(blob,pending)=>{local={blob,meta:{pending,revision:p.revision}}};p.apply=async blob=>{applied=await blob.text()};p.openConflictDialog=()=>{p.dialogShown=true};p.schedule=()=>{};return {p,app,status,get local(){return local},set local(v){local=v},get applied(){return applied}};}
(async()=>{
 let t=setup();t.p.ready=true;t.p.dirty=true;t.p.revision='"one"';global.fetch=async(url,o)=>new Response('{}',{status:200,headers:{ETag:'"two"'}});assert(await t.p.saveNow());assert(!t.p.dirty);assert(!t.local.meta.pending);assert.equal(t.p.revision,'"two"');clearTimeout(t.p.timer);
 t=setup();t.p.ready=true;t.p.dirty=true;global.fetch=async()=>new Response('{}',{status:409});assert.equal(await t.p.saveNow(),false);assert(t.p.conflict&&t.p.dirty&&t.local.meta.pending);
 t=setup();t.local={blob:new Blob(['legacy-drawing'])};global.fetch=async()=>new Response('{}',{status:404});assert(await t.p.restore());assert.equal(t.applied,'legacy-drawing');assert(t.p.dirty&&t.p.ready);
 t=setup();t.local={blob:new Blob(['browser-drawing']),meta:{pending:false,revision:'"one"'}};global.fetch=async()=>new Response('agent-shared-drawing',{status:200,headers:{ETag:'"two"'}});assert(await t.p.restore());assert.equal(t.applied,'agent-shared-drawing');assert(!t.p.dirty);
 t=setup();t.local={blob:new Blob(['unsynced-user-drawing']),meta:{pending:true,revision:'"one"'}};assert(await t.p.restore());assert.equal(t.applied,'unsynced-user-drawing');assert(t.p.conflict&&t.p.dirty);
 assert.equal(t.p.revision,'"one"','restoring a pending draft must not adopt an unrelated server revision');
 let writes=0;global.fetch=async()=>{writes++;throw Error('must not overwrite shared drawing')};assert.equal(await t.p.saveNow(),false);assert(t.p.dialogShown);assert.equal(t.local.meta.revision,'"one"');assert.equal(writes,0);
 t=setup();t.local={blob:new Blob(['offline-drawing']),meta:{pending:true,revision:'"one"'}};global.fetch=async()=>{throw Error('offline')};assert(await t.p.restore());assert.equal(t.applied,'offline-drawing');assert(t.p.dirty);
 t=setup();t.p.ready=true;global.fetch=async()=>new Response('agent-edit',{status:200,headers:{ETag:'"three"'}});await t.p.pull();assert.equal(t.applied,'agent-edit');assert.equal(t.p.revision,'"three"');t.p.dirty=true;global.fetch=()=>{throw Error('must not poll while drawing is unsaved')};await t.p.pull();
 for(const mode of ['copy','shared','put-fail','readback-mismatch','shared-fail','edited-during-copy']){
   t=setup();t.p.ready=t.p.dirty=t.p.conflict=true;t.p.revision='"old"';const original=JSON.stringify(t.app.project),calls=[];let backup;
   global.fetch=async(url,o={})=>{
     calls.push([url,o]);
     if(url.includes('id=draft-conflict-')){
       if(o.method==='PUT'){assert.equal(o.headers['If-Match'],'none');assert.equal(o.headers['X-Pixel-Editor'],'1');backup=await o.body.text();return new Response('{}',{status:mode==='put-fail'?500:200});}
       if(mode==='edited-during-copy')t.p.markDirty();
       return new Response(mode==='readback-mismatch'?'wrong':backup);
     }
     assert(!o.method,'the original shared project must never be overwritten by conflict resolution');
     return new Response('latest-shared-drawing',{status:mode==='shared-fail'?500:200,headers:{ETag:'"latest"'}});
   };
   if(['put-fail','readback-mismatch','shared-fail','edited-during-copy'].includes(mode)){
     await assert.rejects(t.p.preserveConflictDraft(mode==='shared-fail'||mode==='edited-during-copy'));
     assert.equal(t.applied,'');assert(t.p.conflict&&t.p.dirty);assert.equal(t.p.revision,'"old"');
   }else{
     const url=await t.p.preserveConflictDraft(mode==='shared');assert(url.includes('project=draft-conflict-'));assert.equal(backup,original);
     if(mode==='shared'){assert.equal(t.applied,'latest-shared-drawing');assert.equal(t.p.revision,'"latest"');assert(!t.p.conflict&&!t.p.dirty&&!t.local.meta.pending);}else{assert.equal(t.applied,'');assert(t.p.conflict&&t.p.dirty);assert.equal(calls.length,2);}
   }
   assert(!t.p.resolving);assert.equal(JSON.stringify(t.app.project),original);
 }
 console.log('PASS: successful autosave, unsynced local fallback, legacy draft recovery, shared restore, conflicts retain user draft, clean-only agent synchronization.');
 console.log('PASS: pending draft keeps its base revision across retries; conflicts offer a safe exit; exact create-only backup + readback precede explicit shared restore; failures and racing edits never replace the original.');
})().catch(e=>{console.error(e);process.exitCode=1});
