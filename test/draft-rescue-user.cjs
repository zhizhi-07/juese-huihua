const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto').webcrypto;
const html=fs.readFileSync(require('path').resolve(__dirname,'../draft-rescue-user.html'),'utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1],original=JSON.stringify({name:'重要用户稿',layers:[{name:'用户手改',frameData:{}}],spriteSheets:[{name:'idle',actions:[]}]}),blob=new Blob([original]);
async function run(mode){const elements=Object.fromEntries(['status','download','open','retry'].map(id=>[id,{dataset:{},hidden:false}])),calls=[],key='project-character-56620e79-ce79-4fd9-b49c-081f7bc57d67';let closed=false;
const indexedDB={open(){
 const r={};queueMicrotask(()=>{
  r.result={transaction(store,kind){
   assert.equal(store,'projects');assert.equal(kind,'readonly','never edit the browser draft');
   const tx={objectStore(){return {get(k){assert([key,key+'-meta'].includes(k));return {result:k===key?(mode==='missing'?undefined:blob):{pending:true,revision:'old-etag',savedAt:123}};}};}};
   queueMicrotask(()=>tx.oncomplete());return tx;
  },close(){closed=true;}};
  r.onsuccess();
 });return r;
}};
const fetch=async(url,options)=>{calls.push({url,options});assert(url.startsWith('/api/project?id=draft-rescue-user-'));if(options?.method==='PUT'){assert.equal(options.headers['If-Match'],'none');assert.equal(options.headers['X-Pixel-Editor'],'1');assert.equal(await options.body.text(),original);return {ok:mode!=='put-fail',status:mode==='put-fail'?500:200};}return {ok:true,text:async()=>mode==='mismatch'?'wrong':original};};
const context={document:{getElementById:id=>elements[id]},indexedDB,Blob,crypto,URL:{createObjectURL:()=> 'blob:backup',revokeObjectURL(){}},fetch,Date,JSON,Array,Uint8Array,Error,console};vm.createContext(context);vm.runInContext(script.replace('retry.onclick=rescue;rescue();','retry.onclick=rescue;'),context);await vm.runInContext('rescue()',context);assert(closed);assert.equal(await blob.text(),original);
if(mode==='ok'){assert(elements.status.textContent.includes('已独立保存'));assert.equal(calls.length,2);assert(elements.status.dataset.savedId.startsWith('draft-rescue-user-'));assert.equal(elements.status.dataset.sha256,require('crypto').createHash('sha256').update(original).digest('hex'));assert.equal(elements.download.hidden,false);assert.equal(elements.open.href,'/index.html?project='+elements.status.dataset.savedId);assert.equal(elements.open.hidden,false);}else{assert(elements.status.textContent.startsWith('尚未完成'));assert(!elements.status.dataset.savedId);assert.equal(elements.open.hidden,true);if(mode==='missing')assert.equal(calls.length,0);else assert.equal(elements.download.hidden,false);}}
(async()=>{for(const mode of ['ok','missing','put-fail','mismatch'])await run(mode);console.log('PASS: readonly exact project draft; unique create-only disk backup; source bytes and SHA256 preserved; full readback; missing draft, save failure and bad readback never report success; no reload or original overwrite.');})().catch(e=>{console.error(e);process.exitCode=1});
