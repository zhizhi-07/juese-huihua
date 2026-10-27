const fs=require('fs'),path=require('path'),assert=require('assert'),os=require('os'),{spawn}=require('child_process');
(async()=>{
 const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'shared-server-test-'));fs.copyFileSync(path.join(root,'server.js'),path.join(dir,'server.js'));fs.mkdirSync(path.join(dir,'js'));fs.copyFileSync(path.join(root,'js/character-base.js'),path.join(dir,'js/character-base.js'));
 const port=18766,base='http://127.0.0.1:'+port,child=spawn(process.execPath,[path.join(dir,'server.js'),String(port)],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server start timeout')),8000);child.stdout.on('data',()=>{clearTimeout(timer);resolve();});child.on('error',reject);});
  assert.equal((await fetch(base+'/api/status').then(r=>r.json())).version,2);
  assert.equal((await fetch(base+'/api/project')).status,404);
  const project={name:'drawing-one',layers:[{name:'paint'}],spriteSheets:[{actions:[{frames:[{width:32,height:32}]}]}]},body=JSON.stringify(project);
  const put=(body,rev,extra={})=>fetch(base+'/api/project',{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':rev,...extra},body});
  let r=await put(body,'none');assert.equal(r.status,200);const first=r.headers.get('ETag');assert(first);
  assert.equal((await fetch(base+'/api/project',{headers:{'If-None-Match':first}})).status,304);
  project.name='drawing-two';r=await put(JSON.stringify(project),first);assert.equal(r.status,200);const second=r.headers.get('ETag');
  assert.equal((await put(body,first)).status,409);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'data/shared-project.json'))).name,'drawing-two');
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'data/shared-project.json.bak'))).name,'drawing-one');
  assert.equal((await put('{',second)).status,400);assert.equal((await put('{"layers":[{}],"spriteSheets":[null]}',second)).status,400);
  assert.equal((await fetch(base+'/api/project',{headers:{Origin:'https://untrusted.example'}})).status,403);
  assert.equal((await put(body,second,{Origin:'https://untrusted.example'})).status,403);
  assert.equal((await fetch(base+'/data/shared-project.json')).status,403);
  assert.equal((await fetch(base+'/js/%2e%2e/data/bridge-token')).status,403);
  const script=fs.readFileSync(path.join(dir,'js/local-bridge.js'),'utf8'),token=JSON.parse(script.slice(script.indexOf('=')+1,-1)).token;
  assert(!(await fetch(base+'/js/local-bridge.js').then(r=>r.text())).includes(token));
  assert.equal((await fetch(base+'/api/project',{headers:{Origin:'null'}})).status,403);
  assert.equal((await fetch(base+'/api/project',{headers:{Origin:'null','X-Pixel-Token':token}})).status,200);
  assert.equal((await fetch(base+'/api/project',{method:'OPTIONS',headers:{Origin:'null','Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'x-pixel-token'}})).status,204);
  assert(!fs.existsSync(path.join(dir,'data/shared-project.json.tmp')));
  const branchUrl=base+'/api/project?id=character-cached-page',legacy={...project,layers:[{name:'头发'},{name:'down',isGroup:true,parent:null},{name:'body',parent:1,frameData:{pixels:'body'}},{name:'head',parent:1,frameData:{pixels:'head'}},{name:'眼睛'},{name:'hand'},{name:'服装'}],currentLayerIndex:6};
  const saveBranch=(data,rev)=>fetch(branchUrl,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':rev},body:JSON.stringify(data)});
  r=await saveBranch(legacy,'none');assert.equal(r.status,200);const branchRev=r.headers.get('ETag'),clean=await fetch(branchUrl).then(r=>r.json());assert.deepEqual(clean.layers.map(l=>l.name),['down','body','head']);assert.equal(clean.layers[1].parent,0);assert.equal(clean.currentLayerIndex,1);
  clean.layers.push({name:'服装 / 新白裙'});assert.equal((await saveBranch(clean,branchRev)).status,200);assert.equal((await fetch(branchUrl).then(r=>r.json())).layers.at(-1).name,'服装 / 新白裙');assert.equal((await saveBranch(legacy,'none')).status,409);
  console.log('PASS: shared file atomic save, version conflict protection, last-file backup, schema rejection, private data/token routes and authenticated file-page bridge.');
 }finally{child.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
