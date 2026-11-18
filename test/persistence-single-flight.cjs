const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
global.window=global;global.document={addEventListener(){}};
global.location={protocol:'http:',search:''};global.PE={};
vm.runInThisContext(fs.readFileSync(__dirname+'/../js/persistence.js','utf8'));
(async()=>{
 const p=new PE.ProjectPersistence({toolManager:{isDrawing:false}},{textContent:'',classList:{toggle(){}}});p.ready=true;
 let requests=0,release,finishApply,applied=0;
 p.request=()=>{requests++;return new Promise(resolve=>release=resolve);};
 p.apply=()=>{applied++;return new Promise(resolve=>finishApply=resolve);};p.localWrite=async()=>{};
 const first=p.pull();await p.pull();assert.equal(requests,1,'polls cannot overlap');
 release(new Response('{}',{headers:{ETag:'one'}}));
 while(!finishApply)await new Promise(resolve=>setImmediate(resolve));
 await p.pull();assert.equal(requests,1,'imports cannot overlap either');
 finishApply();await first;assert.equal(applied,1);assert.equal(p.pulling,false);
 p.request=async()=>new Response(null,{status:304});await p.pull();assert.equal(p.pulling,false,'304 releases guard');
 p.request=async()=>{throw Error('test offline');};await p.pull();assert.equal(p.pulling,false,'failure releases guard');
 console.log('PASS: only one poll/import in flight; success, 304 and failure release guard.');
})().catch(e=>{console.error(e);process.exitCode=1;});
