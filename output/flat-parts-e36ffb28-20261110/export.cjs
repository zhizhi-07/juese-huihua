const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const png=require(path.join(root,'scripts/png.cjs'));
global.window=global;Object.assign(global,{Image,ImageData,JSZip:require(path.join(root,'js/vendor/jszip.min.js')),FileReader:class{async readAsText(blob){this.result=await blob.text();this.onload();}},document:{addEventListener(){},createElement(){const c=createCanvas(1,1);c.style={};return c;}}});
for(const n of ['core','export','visual-layers'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const id='draft-conflict-1794277219868-e36ffb28',url='http://localhost:8765/api/project?id='+id;
async function read(){const r=await fetch(url);assert(r.ok);return {bytes:Buffer.from(await r.arrayBuffer()),etag:r.headers.get('etag')};}
(async()=>{
 const before=await read(),raw=JSON.parse(before.bytes);
 fs.writeFileSync(path.join(__dirname,'source.json'),before.bytes);
 const revision={url,etag:before.etag,sha256:crypto.createHash('sha256').update(before.bytes).digest('hex')};
 fs.writeFileSync(path.join(__dirname,'revision.json'),JSON.stringify(revision,null,2));
 const ex=new PE.ExportManager();ex._downloadBlob=()=>{};
 const p=(await ex.importProject(new Blob([before.bytes]))).project;ex.project=p;
 const V=PE.VisualLayers,partName=V.partName.bind(V);
 V.partName=l=>{
  if(l.isGroup)return null;
  const slot=V.slot(l);
  if(l.name==='眼睛')return '眼睛-未分组眼睛';
  if(V.category(l)==='衣服')return '衣服-'+slot;
  return ['眼睛','前发','后发'].includes(slot)?partName(l):null;
 };
 // Only toggle visibility on the in-memory export copy so alternate styles are included.
 for(const l of p.layers)if(l.isGroup||V.partName(l))l.visible=true;
 const blob=await ex.exportPartsAsZip(),zip=await JSZip.loadAsync(await blob.arrayBuffer(),{checkCRC32:true});
 const manifest=JSON.parse(await zip.file('部件说明.json').async('string'));
 const expected=new Set();
 for(const [si,s] of p.spriteSheets.entries())for(const [ai,a] of s.actions.entries())for(const l of PE.getRenderLayers(p,si,ai)){
  const name=V.partName(l);
  if(name&&l.opacity>0&&a.frames.some((_,fi)=>l.getFrameData(p.getFrameKey(si,ai,fi))?.data.some((v,i)=>i%4===3&&v)))expected.add(si+' '+name);
 }
 assert.deepEqual(new Set(manifest.files.map(m=>m.sheetIndex+' '+m.part)),expected);
 const categories={},variants={};
 for(const item of manifest.files){
  const category=item.part.split('-')[0];categories[category]=(categories[category]||0)+1;(variants[category]??=new Set()).add(item.part);
  const s=p.spriteSheets[item.sheetIndex],d=png.decode(await zip.file(item.file).async('nodebuffer'));
  assert.equal(d.width,item.frameWidth*item.columns);
  assert.equal(d.height,item.frameHeight*item.rows.length);
  assert(d.data.some((v,i)=>i%4===3&&v));
  for(const row of item.rows){
   assert.equal(row.frames,s.actions[row.row].frames.length);
   if(row.direction==='up'&&category==='眼睛')assert(!d.data.subarray(row.row*item.frameHeight*d.width*4,(row.row+1)*item.frameHeight*d.width*4).some(Boolean));
  }
 }
 assert.deepEqual(Object.keys(categories).sort(),['前发','后发','眼睛','衣服'].sort());
 const originalGuide=await zip.file('使用说明.txt').async('string');
 zip.file('使用说明.txt','包内包含该工程已保存的可导出款式（含隐藏备选），任选一款使用，不要把同类款式同时叠上。所有 PNG 均在 ZIP 根目录。没有素材的动作不补图。\n'+originalGuide);
 const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}),dest=path.join(root,'导出','人物分支-e36ffb28-眼睛前发后发衣服.zip');
 fs.writeFileSync(dest,bytes,{flag:'wx'});
 const verified=await JSZip.loadAsync(fs.readFileSync(dest),{checkCRC32:true});
 assert(Object.values(verified.files).every(f=>!f.dir&&!f.name.includes('/')));
 assert.equal(Object.keys(verified.files).length,manifest.files.length+2);
 const after=await read();assert.equal(after.etag,before.etag);assert.deepEqual(after.bytes,before.bytes);
 const report={project:raw.name,...revision,dest,files:manifest.files.length,categories,variants:Object.fromEntries(Object.entries(variants).map(([k,v])=>[k,v.size])),sha256Zip:crypto.createHash('sha256').update(bytes).digest('hex'),projectUnchanged:true};
 fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(report,null,2));console.log(report);
})().catch(e=>{console.error(e);process.exitCode=1;});
