const {load,pic,save,createCanvas,assert}=require('./helpers.cjs');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const url='http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561';
(async()=>{
 const list=await fetch(new URL('/api/projects',url));assert.equal(list.status,200);
 assert((await list.json()).some(p=>p.id==='base-outlined-1794365455561'));
 const response=await fetch(url);assert.equal(response.status,200);
 const raw=Buffer.from(await response.arrayBuffer()),etag=response.headers.get('etag');assert(etag);
 const sha=b=>createHash('sha256').update(b).digest('hex');
 save('before.json',raw);save('before.meta.json',JSON.stringify({url,status:response.status,etag,sha256:sha(raw)},null,2));
 const refPath=path.join(__dirname,'../eat-rear-hand-20261121/after.json'),ref=fs.readFileSync(refPath);
 assert.equal(sha(ref),'430c9ed21a9cadbc961ee1ce5416b5585a409336621865c51192671c16774d34');
 const before=JSON.parse(raw),reference=JSON.parse(ref);
 const candidate=structuredClone(before),si=before.spriteSheets.findIndex(s=>s.name==='吃东西'),ri=reference.spriteSheets.findIndex(s=>s.name==='吃东西');
 const dirs=['side','down','up'];
 for(const [j,s] of [[before,si],[reference,ri]])assert.deepEqual(j.spriteSheets[s].actions.map(a=>[a.direction,a.frames.length]),dirs.map(d=>[d,6]));
 const [current,original]=await load(before),[previous]=await load(reference);
 const find=(j,s,d,name)=>j.layers.findIndex(l=>l.sheetIndex===s&&l.name===name&&j.layers[l.parent]?.name===d);
 const active=(a,x)=>a===0||(a===1?x<10:x>8);
 const edits=[];
 const cells=[];
 for(const [a,d] of dirs.entries())for(let f=0;f<6;f++){
   const layer=find(before,si,d,'hand'),refLayer=find(reference,ri,d,'hand');
   assert(layer>=0&&refLayer>=0);
   const frame=si+'_'+a+'_'+f,old=current.layers[layer].getFrameData(frame),originalActive=previous.layers[refLayer].getFrameData(ri+'_'+a+'_'+f);
   assert.deepEqual([old.width,old.height,old.placement],[originalActive.width,originalActive.height,originalActive.placement]);
   const {width:w,height:h}=old,c=createCanvas(w,h),ctx=c.getContext('2d'),im=ctx.createImageData(w,h);
   for(let i=0;i<w*h;i++){
     const pixels=active(a,i%w)?originalActive:old;
     im.data.set(pixels.data.subarray(i*4,i*4+4),i*4);
   }
   cells.push({layer,frame,im});
   if(Buffer.from(old.data).equals(Buffer.from(im.data)))continue;
   ctx.putImageData(im,0,0);
   candidate.layers[layer].frameData[frame].dataURL=c.toDataURL();
   edits.push({direction:d,layer,frame});
 }
 const [merged,preview]=await load(candidate);
 for(const {layer,frame,im} of cells)assert.deepEqual(merged.layers[layer].getFrameData(frame).data,im.data);
 const reverse=structuredClone(candidate);
 for(const {layer,frame} of edits)reverse.layers[layer].frameData[frame]=before.layers[layer].frameData[frame];
 assert.deepEqual(reverse,before);
 const c=createCanvas(6*122,3*123),ctx=c.getContext('2d');ctx.fillStyle='#b8c8c3';ctx.fillRect(0,0,c.width,c.height);
 for(let a=0;a<3;a++)for(let f=0;f<6;f++){
   assert.deepEqual(preview.getCompositeImageData(si,a,f,false).data,original.getCompositeImageData(si,a,f,false).data);
   pic(ctx,preview.getCompositeImageData(si,a,f),f*122,a*123,7);
 }
 assert(edits.length);
 save('preview.png',c.toBuffer('image/png'));
 save('candidate.json',JSON.stringify(candidate));
 save('diff.json',JSON.stringify({sheet:si,reference:refPath,referenceSHA256:sha(ref),edits},null,2));
 console.log('GET',response.status,etag,'; changed',edits);
})().catch(e=>{console.error(e);process.exitCode=1});
