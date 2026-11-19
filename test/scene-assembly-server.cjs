const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const model=require('../js/scene-assembly-model.js');
const scene={version:1,width:160,height:128,objects:[{id:'one',material:'桌子',variant:'桌子',x:24,y:42,flip:false}]};
model.validate(scene);for(const bad of [{...scene,width:0},{...scene,objects:[...scene.objects,...scene.objects]},{...scene,objects:[{...scene.objects[0],x:.5}]}])assert.throws(()=>model.validate(bad));
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scene-assembly-')),root=path.resolve(__dirname,'..');fs.mkdirSync(path.join(dir,'js'));
  fs.copyFileSync(path.join(root,'server.js'),path.join(dir,'server.js'));for(const f of ['body-sync.cjs','character-base.js','character-sync.js','scene-assembly-model.js'])fs.copyFileSync(path.join(root,'js',f),path.join(dir,'js',f));
  fs.mkdirSync(path.join(dir,'scripts'));fs.copyFileSync(path.join(root,'scripts/png.cjs'),path.join(dir,'scripts/png.cjs'));
  const child=spawn(process.execPath,[path.join(dir,'server.js'),'18789'],{windowsHide:true,stdio:['ignore','pipe','pipe']}),url='http://127.0.0.1:18789/api/project?id=scene-test';
  try{
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),8000);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.once('error',reject);});
    const source={name:'fixture',layers:[{name:'paint'}],spriteSheets:[{name:'桌子',actions:[{name:'桌子',frames:[{width:17,height:18}]}]}]},put=(data,rev)=>fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':rev},body:JSON.stringify(data)});
    let r=await put({...source,sceneAssembly:scene},'none');assert.equal(r.status,200);const rev=r.headers.get('etag');assert.equal((await put(source,'none')).status,409);
    r=await put({...source,name:'drawing saved by an old page'},rev);assert.equal(r.status,200);let read=await fetch(url);assert.deepEqual((await read.json()).sceneAssembly,scene);
    assert.equal((await put({...source,sceneAssembly:{...scene,width:-1}},r.headers.get('etag'))).status,400);
    assert.equal((await put({...source,sceneAssembly:scene},rev)).status,409);
    assert(fs.existsSync(path.join(dir,'data/projects/scene-test.json.bak')));
    console.log('PASS: validates instances; existing API preserves scene data from older drawing pages, backs up saves, and rejects ETag conflicts. Isolated temp server; no user data written.');
  }finally{child.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
