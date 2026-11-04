const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const sync=require('../js/character-sync');
const frame={width:32,height:32},sheets=[{name:'idle',actions:[{name:'down',direction:'down',frames:[frame]},{name:'side',direction:'side',frames:[frame]}]}];
const main={name:'main',spriteSheets:sheets,layers:[{name:'down',isGroup:true,sheetIndex:0},{name:'head',sheetIndex:0,parent:0,frameData:{'0_0_0':{dataURL:'new head'}}},{name:'body',sheetIndex:0,parent:0,frameData:{'0_0_0':{dataURL:'new body'}}},{name:'头发',sheetIndex:0,frameData:{'0_0_0':{dataURL:'main hair'}}}]};
const branch={name:'dress',spriteSheets:[{name:'other',actions:[]},{name:'idle',actions:[sheets[0].actions[1],sheets[0].actions[0]]}],layers:[{name:'down',isGroup:true,sheetIndex:1},{name:'head',sheetIndex:1,parent:0,frameData:{'1_1_0':{dataURL:'old head'}}},{name:'body',sheetIndex:1,parent:0,frameData:{'1_1_0':{dataURL:'old body'}}},...['服装 / 白裙','头发','眼睛','嘴巴'].map(name=>({name,sheetIndex:1,frameData:{'1_1_0':{dataURL:name+' independent'}}}))]};
const independent=JSON.stringify(branch.layers.slice(3)),originalMain=JSON.stringify(main);sync(branch,main);assert.equal(branch.layers[1].frameData['1_1_0'].dataURL,'new head');assert.equal(branch.layers[2].frameData['1_1_0'].dataURL,'new body');assert.equal(JSON.stringify(branch.layers.slice(3)),independent);assert.equal(JSON.stringify(main),originalMain);assert(branch.layers[1].inheritedBase&&branch.layers[1].locked);
main.layers[1].frameData['0_0_0'].dataURL='newer head';sync(branch,main);assert.equal(branch.layers[1].frameData['1_1_0'].dataURL,'newer head');assert.equal(JSON.stringify(branch.layers.slice(3)),independent);
const wrong=structuredClone(branch);wrong.spriteSheets[1].actions[1].frames=[{width:64,height:32}];assert.throws(()=>sync(wrong,main),/尺寸/);
(async()=>{
 const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'character-sync-test-'));fs.mkdirSync(path.join(dir,'js'));fs.mkdirSync(path.join(dir,'data/projects'),{recursive:true});for(const file of ['server.js','js/character-base.js','js/character-sync.js'])fs.copyFileSync(path.join(root,file),path.join(dir,file));
 fs.writeFileSync(path.join(dir,'data/shared-project.json'),JSON.stringify(main));fs.writeFileSync(path.join(dir,'data/projects/character-test.json'),JSON.stringify(branch));
 const child=spawn(process.execPath,[path.join(dir,'server.js'),'18769'],{windowsHide:true,stdio:['ignore','pipe','pipe']}),base='http://127.0.0.1:18769/api/project';
 try{
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server start timeout')),8000);child.stdout.once('data',()=>{clearTimeout(t);resolve();});child.once('error',reject);});
  let r=await fetch(base+'?id=character-test'),etag=r.headers.get('etag'),draft=await r.json();assert.equal(r.status,200);assert.equal(draft.layers[1].frameData['1_1_0'].dataURL,'newer head');
  assert.equal((await fetch(base+'?id=character-test',{headers:{'If-None-Match':etag}})).status,304);
  main.layers[1].frameData['0_0_0'].dataURL='live update';fs.writeFileSync(path.join(dir,'data/shared-project.json'),JSON.stringify(main));
  r=await fetch(base+'?id=character-test',{headers:{'If-None-Match':etag}});assert.equal(r.status,200);const latest=r.headers.get('etag');assert.notEqual(latest,etag);assert.equal((await r.json()).layers[1].frameData['1_1_0'].dataURL,'live update');
  const put=(data,rev)=>fetch(base+'?id=character-test',{method:'PUT',headers:{'X-Pixel-Editor':'1','Content-Type':'application/json','If-Match':rev},body:JSON.stringify(data)});
  assert.equal((await put(draft,etag)).status,409,'main base changed while branch draft is unsaved: reject stale save');
  draft.layers[1].frameData['1_1_0'].dataURL='attempted override';draft.layers[3].frameData['1_1_0'].dataURL='new dress';r=await put(draft,latest);assert.equal(r.status,200);const saved=r.headers.get('etag');
  r=await fetch(base+'?id=character-test');const result=await r.json();assert.equal(result.layers[1].frameData['1_1_0'].dataURL,'live update');assert.equal(result.layers[3].frameData['1_1_0'].dataURL,'new dress');assert.equal(r.headers.get('etag'),saved);
  main.layers[3].frameData['0_0_0'].dataURL='changed main hair';fs.writeFileSync(path.join(dir,'data/shared-project.json'),JSON.stringify(main));assert.equal((await fetch(base+'?id=character-test',{headers:{'If-None-Match':saved}})).status,304,'main hair does not change independent branch');
  console.log('PASS: reordered sheet/action matching; only head/body inherit; live main updates; conditional GET; stale draft conflict; server rejects base overrides while saving independent wardrobe.');
 }finally{child.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
