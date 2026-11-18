const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const deps='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {PNG}=require(path.join(deps,'pngjs'));
const root=path.resolve(__dirname,'..'),url='http://127.0.0.1:8765/api/project?id=draft-7278d7c9-a753-4c98-bf8b-d7c2d45119ba';
const out=path.join(root,'备份','20261108-素体主八层分离-'+Date.now());fs.mkdirSync(out,{recursive:true});
const decode=f=>PNG.sync.read(Buffer.from(f.dataURL.split(',')[1],'base64'));
const encode=p=>'data:image/png;base64,'+PNG.sync.write(p).toString('base64');
(async()=>{
 await (await fetch('http://127.0.0.1:8765/api/projects')).json();
 const r=await fetch(url),raw=Buffer.from(await r.arrayBuffer()),etag=r.headers.get('etag');assert(r.ok&&etag);
 fs.writeFileSync(path.join(out,'before.json'),raw);
 const hash=crypto.createHash('sha256').update(raw).digest('hex');
 fs.writeFileSync(path.join(out,'original-metadata.json'),JSON.stringify({url,etag,sha256:hash},null,2));
 const before=JSON.parse(raw),after=structuredClone(before),map=new Map(),layers=[],checks=[];
 for(const [i,l] of before.layers.entries()){
  map.set(i,layers.length);
  if(l.isGroup){layers.push(structuredClone(l));continue;}
  assert(['body','head','hand','hand 2'].includes(l.name),'Unexpected layer '+l.name);
  const fill=structuredClone(l),line=structuredClone(l);line.name=l.name+' 描边';
  let count=0;
  for(const [key,f] of Object.entries(l.frameData)){
   const src=decode(f),a=new PNG({width:src.width,height:src.height}),b=new PNG({width:src.width,height:src.height});
   for(let p=0;p<src.data.length;p+=4){
    const dark=src.data[p]===70&&src.data[p+1]===70&&src.data[p+2]===94&&src.data[p+3]>0;
    src.data.copy(dark?b.data:a.data,p,p,p+4);if(dark)count++;
   }
   for(let p=0;p<src.data.length;p+=4){
    const result=b.data[p+3]?b.data.subarray(p,p+4):a.data.subarray(p,p+4);
    assert.deepEqual(result,src.data.subarray(p,p+4),'Pixel mismatch '+i+':'+key);
   }
   fill.frameData[key].dataURL=encode(a);line.frameData[key].dataURL=encode(b);
  }
  layers.push(line,fill);checks.push({oldIndex:i,name:l.name,frames:Object.keys(l.frameData).length,outlinePixels:count});
 }
 for(const l of layers)if(l.parent!==null&&l.parent!==undefined)l.parent=map.get(l.parent);
 after.layers=layers;after.currentLayerIndex=map.get(before.currentLayerIndex)+1;
 // Each adjacent pair reconstructs its original pixels, preserving cross-part occlusion.
 const reverse=structuredClone(after);reverse.layers=structuredClone(before.layers);reverse.currentLayerIndex=before.currentLayerIndex;assert.deepEqual(reverse,before);
 assert.equal(layers.filter(l=>!l.isGroup).length,96);
 fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(after));
 const put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(after)});
 const response=await put.text();fs.writeFileSync(path.join(out,'save-response.txt'),put.status+'\n'+response);assert(put.ok,'Save stopped: '+put.status);
 const rr=await fetch(url),saved=await rr.json();assert.deepEqual(saved,after);
 fs.writeFileSync(path.join(out,'verified.json'),JSON.stringify(saved));
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({originalSHA256:hash,newETag:rr.headers.get('etag'),groups:12,layersPerGroup:8,checks,pixelReconstruction:'PASS',unchangedOtherData:'PASS',apiReadback:'PASS',restore:'GET current ETag, PUT before.json to same URL with If-Match; stop on conflict.'},null,2));
 console.log(JSON.stringify({out,groups:12,layers:96,splitFrames:checks.reduce((s,c)=>s+c.frames,0),outlinePixels:checks.reduce((s,c)=>s+c.outlinePixels,0),verified:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
