const {load,pic,save,createCanvas,assert}=require('./helpers.cjs');
const {createHash}=require('node:crypto');
const url='http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561';
(async()=>{
 const list=await fetch(new URL('/api/projects',url));assert.equal(list.status,200);
 assert((await list.json()).some(p=>p.id==='base-outlined-1794365455561'));
 const r=await fetch(url);assert.equal(r.status,200);
 const raw=Buffer.from(await r.arrayBuffer()),etag=r.headers.get('etag');assert(etag);
 save('before.json',raw);save('before.meta.json',JSON.stringify({url,status:r.status,etag,sha256:createHash('sha256').update(raw).digest('hex')},null,2));
 const before=JSON.parse(raw),candidate=structuredClone(before);
 const si=before.spriteSheets.findIndex(s=>s.name==='吃东西');
 assert.deepEqual(before.spriteSheets[si].actions.map(a=>[a.direction,a.frames.length]),[['side',6],['down',6],['up',6]]);
 const [p,original]=await load(before),edits=[];
 const find=(direction,name)=>before.layers.findIndex(l=>l.sheetIndex===si&&l.name===name&&before.layers[l.parent]?.name===direction);
 function passive(a,x){return a===0||(a===1?x>=10:x<=8);}
 const yTop=im=>Math.floor(im.data.findIndex((v,i)=>i%4===3&&v)/4/im.width);
 for(const [a,direction] of ['side','down','up'].entries()){
   const hand=find(direction,a===0?'hand 2':'hand'),body=find(direction,'body');
   const keys=before.spriteSheets[si].actions[a].frames.map((_,f)=>si+'_'+a+'_'+f);
   const heights=keys.map(k=>yTop(p.layers[body].getFrameData(k)));
   assert.equal(Math.max(...heights)-Math.min(...heights),1);
   for(const [f,frame] of keys.entries()){
     const dy=heights[f]-Math.max(...heights);if(!dy)continue;
     const prior=p.layers[hand].getFrameData(frame),{width:w,height:h}=prior;
     const c=createCanvas(w,h),ctx=c.getContext('2d'),out=ctx.createImageData(w,h);
     for(let y=0;y<h;y++)for(let x=0;x<w;x++){
       const i=4*(y*w+x);if(!prior.data[i+3])continue;
       const yy=y+(passive(a,x)?dy:0);
       assert(yy>=0&&yy<h);
       out.data.set(prior.data.subarray(i,i+4),4*(yy*w+x));
     }
     ctx.putImageData(out,0,0);
     candidate.layers[hand].frameData[frame].dataURL=c.toDataURL();
     edits.push({layer:hand,frame,direction,dy});
   }
 }
 const [updated,render]=await load(candidate);
 const preview=createCanvas(6*123,6*122),ctx=preview.getContext('2d');ctx.fillStyle='#b8c8c3';ctx.fillRect(0,0,preview.width,preview.height);
 for(const [a,direction] of ['side','down','up'].entries())for(let f=0;f<6;f++){
   const frame=si+'_'+a+'_'+f,layer=find(direction,a===0?'hand 2':'hand'),dy=edits.find(e=>e.frame===frame)?.dy??0;
   const old=p.layers[layer].getFrameData(frame),now=updated.layers[layer].getFrameData(frame);
   for(let y=0;y<old.height;y++)for(let x=0;x<old.width;x++){
     const sy=y-(passive(a,x)?dy:0),i=4*(y*old.width+x),j=4*(sy*old.width+x);
     assert.deepEqual(now.data.slice(i,i+4),sy<old.height?old.data.slice(j,j+4):new Uint8ClampedArray(4));
   }
   assert.deepEqual(original.getCompositeImageData(si,a,f,false).data,render.getCompositeImageData(si,a,f,false).data);
   pic(ctx,original.getCompositeImageData(si,a,f),123*f,122*a,7);
   pic(ctx,render.getCompositeImageData(si,a,f),123*f,122*(a+3),7);
 }
 const reversed=structuredClone(candidate);
 for(const {layer,frame} of edits)reversed.layers[layer].frameData[frame]=before.layers[layer].frameData[frame];
 assert.deepEqual(reversed,before);assert.equal(edits.length,12);
 save('candidate.json',JSON.stringify(candidate));save('diff.json',JSON.stringify({sheet:si,edits},null,2));save('compare.png',preview.toBuffer('image/png'));
 console.log('GET',r.status,etag,'; verified edits',edits.map(e=>e.frame).join(', '));
})().catch(e=>{console.error(e);process.exitCode=1});
