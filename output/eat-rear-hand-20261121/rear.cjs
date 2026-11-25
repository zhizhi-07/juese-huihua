const {read,load,pic,save,createCanvas,assert}=require('./helpers.cjs');
const {createHash}=require('node:crypto');
const url='http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561';
(async()=>{
 const l=await fetch(new URL('/api/projects',url));assert(l.ok);assert((await l.json()).some(p=>p.id===new URL(url).searchParams.get('id')));
 const r=await fetch(url);assert.equal(r.status,200);
 const raw=Buffer.from(await r.arrayBuffer()),etag=r.headers.get('etag');assert(etag);
 save('before.json',raw);save('before.meta.json',JSON.stringify({url,status:r.status,etag,sha256:createHash('sha256').update(raw).digest('hex')},null,2));
 const before=JSON.parse(raw),si=before.spriteSheets.findIndex(s=>s.name==='吃东西');
 const a=before.spriteSheets[si].actions.findIndex(a=>a.direction==='side');
 assert.equal(a,0);assert.equal(before.spriteSheets[si].actions[a].frames.length,6);
 const layer=before.layers.findIndex(l=>l.sheetIndex===si&&l.name==='hand 2'&&before.layers[l.parent]?.name==='side');
 const edits=Object.keys(before.layers[layer].frameData).map(frame=>({layer,frame}));assert.equal(edits.length,6);
 const [p,original]=await load(before),source=p.layers[layer].getFrameData(si+'_0_0');
 const cv=createCanvas(6*123,3*122),ctx=cv.getContext('2d');ctx.fillStyle='#b8c8c3';ctx.fillRect(0,0,cv.width,cv.height);
 for(let f=0;f<6;f++)pic(ctx,original.getCompositeImageData(si,a,f),f*123,0,7);
 for(const [v,dx] of [0,-1].entries()){
   const candidate=structuredClone(before);
   const c=createCanvas(source.width,source.height), art=c.getContext('2d'),im=art.createImageData(source.width,source.height);
   let n=0;
   for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
     const from=(y*source.width+x)*4;
     if(!source.data[from+3])continue;
     assert(x+dx>=0&&x+dx<source.width);im.data.set(source.data.subarray(from,from+4),(y*source.width+x+dx)*4);n++;
   }
   assert.equal(n,12);
   art.putImageData(im,0,0);
   for(const {frame} of edits)candidate.layers[layer].frameData[frame].dataURL=c.toDataURL();
   const [updated,render]=await load(candidate);
   for(let f=0;f<6;f++){
     assert.deepEqual(updated.layers[layer].getFrameData(si+'_0_'+f).data,im.data);
     pic(ctx,render.getCompositeImageData(si,a,f),f*123,(v+1)*122,7);
   }
   save('candidate-'+v+'.json',JSON.stringify(candidate));
 }
 save('rear-compare.png',cv.toBuffer('image/png'));
 save('diff.json',JSON.stringify({sheet:si,direction:'side',edits},null,2));
 console.log('Original composite rendered, and two contained rear-hand variants verified.');
})().catch(e=>{console.error(e);process.exitCode=1});
