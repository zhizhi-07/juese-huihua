const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),id='base-outlined-1794365455561',dir=fs.mkdtempSync(path.join(os.tmpdir(),'base-source-')),port=18789;
for(const name of ['js','scripts'])fs.cpSync(path.join(root,name),path.join(dir,name),{recursive:true});
fs.copyFileSync(path.join(root,'server.js'),path.join(dir,'server.js'));fs.mkdirSync(path.join(dir,'data/projects'),{recursive:true});
const source=JSON.parse(fs.readFileSync(path.join(root,'output/base-source-20261111',id+'.json')));
fs.writeFileSync(path.join(dir,'data/projects',id+'.json'),JSON.stringify(source));
const child=spawn(process.execPath,[path.join(dir,'server.js'),String(port)],{windowsHide:true,stdio:['ignore','pipe','pipe']});
const url='http://127.0.0.1:'+port+'/api/',get=async name=>{let r=await fetch(url+name);assert.equal(r.status,200);return {data:await r.json(),etag:r.headers.get('etag')}};
const put=(name,data,etag)=>fetch(url+'project?id='+name,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(data)});
(async()=>{try{
await new Promise((ok,no)=>{child.stdout.once('data',ok);child.once('error',no);setTimeout(()=>no(Error('timeout')),8000).unref()});
assert.equal((await get('status')).data.characterBaseProjectId,id);
for(const bid of ['character-test-a','character-test-b'])assert.equal((await put(bid,source,'none')).status,200);
let a=await get('project?id=character-test-a');
assert.deepEqual(a.data.spriteSheets.map(s=>s.name),['original16_walk','original16_idle','original16_pickup','original16_sit']);
const base=require('../js/character-base');assert(a.data.layers.every(l=>l.isGroup||base.isBody(l)||base.isHand(l)));
assert(a.data.layers.some(l=>l.sheetIndex===3&&Object.keys(l.frameData||{}).some(k=>k.startsWith('3_'))));
const wardrobe={name:'test wardrobe',sheetIndex:0,frameData:{'0_0_0':{marker:'independent'}}};a.data.layers.push(wardrobe);assert.equal((await put('character-test-a',a.data,a.etag)).status,200);
a=await get('project?id=character-test-a');const src=await get('project?id='+id),layer=src.data.layers.find(l=>base.isBody(l)&&Object.keys(l.frameData||{}).length),key=Object.keys(layer.frameData)[0],png=require('../scripts/png.cjs'),cel=layer.frameData[key],im=png.decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));im.data[0]^=1;cel.dataURL='data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64');
assert.equal((await put(id,src.data,src.etag)).status,200);
for(const bid of ['character-test-a','character-test-b']){let b=await get('project?id='+bid);assert(b.data.layers.some(l=>l.name===layer.name&&l.frameData?.[key]?.dataURL===cel.dataURL));assert.notEqual(b.etag,a.etag);if(bid.endsWith('a'))assert.deepEqual(b.data.layers.at(-1),wardrobe);}
assert.equal((await put('character-test-a',a.data,a.etag)).status,409);
console.log('PASS: selected source; four actions including remapped sit; only body/head/hands; saved pixel propagates to two branches; wardrobe preserved; stale draft rejected.');
}finally{child.kill();}})().catch(e=>{console.error(e);process.exitCode=1});
