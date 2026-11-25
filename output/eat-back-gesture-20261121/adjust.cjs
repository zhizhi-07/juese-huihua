const {load,pic,save,createCanvas,assert}=require('./helpers.cjs');
const {createHash}=require('node:crypto');
const url='http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561';
(async()=>{
 const list=await fetch(new URL('/api/projects',url));assert.equal(list.status,200);
 assert((await list.json()).some(p=>p.id==='base-outlined-1794365455561'));
 const r=await fetch(url);assert.equal(r.status,200);
 const raw=Buffer.from(await r.arrayBuffer()),etag=r.headers.get('etag');assert(etag);
 save('before.json',raw);save('before.meta.json',JSON.stringify({url,status:r.status,etag,sha256:createHash('sha256').update(raw).digest('hex')},null,2));
 const before=JSON.parse(raw),si=before.spriteSheets.findIndex(s=>s.name==='吃东西');
 const a=before.spriteSheets[si].actions.findIndex(a=>a.direction==='up');
 const layer=before.layers.findIndex(l=>l.sheetIndex===si&&l.name==='hand'&&before.layers[l.parent]?.name==='up');
 assert(a>=0&&layer>=0);assert.equal(before.spriteSheets[si].actions[a].frames.length,6);
 const [p,original]=await load(before),source=p.layers[layer].getFrameData(si+'_'+a+'_0');
 function part(im,on){
   const pixels=[];
   for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const i=4*(y*im.width+x);if(im.data[i+3]&&on(x))pixels.push([x,y,...im.data.slice(i,i+4)]);}
   return pixels;
 }
 const sourceRight=part(source,x=>x>8);
 assert.equal(sourceRight.length,12);
 const minX=Math.min(...sourceRight.map(p=>p[0])),minY=Math.min(...sourceRight.map(p=>p[1]));
 const c=createCanvas(6*123,3*126);const ctx=c.getContext('2d');ctx.fillStyle='#b8c8c3';ctx.fillRect(0,0,c.width,c.height);
 for(let f=0;f<6;f++)pic(ctx,original.getCompositeImageData(si,a,f),123*f,0,7);
 for(const [v,peak] of [[12,9],[13,8]].entries()){
   const candidate=structuredClone(before),edits=[];
   const poses=[[11,12],[12,10],peak,peak,[12,10],[11,12]];
   for(const [f,[left,top]] of poses.entries()){
     const frame=si+'_'+a+'_'+f,old=p.layers[layer].getFrameData(frame);
     const {width:w,height:h}=old,s=createCanvas(w,h),d=s.getContext('2d'),im=d.createImageData(w,h);
     const right=sourceRight.map(([x,y,...rgba])=>[x-minX+left,y-minY+top,...rgba]);
     for(const [x,y,...rgba] of [...part(old,x=>x<=8),...right]){
       assert(x>=0&&x<w&&y>=0&&y<h);
       im.data.set(rgba,4*(y*w+x));
     }
     if(Buffer.from(old.data).equals(Buffer.from(im.data)))continue;
     d.putImageData(im,0,0);
     candidate.layers[layer].frameData[frame].dataURL=s.toDataURL();
     edits.push({layer,frame,left,top});
   }
   const [updated,render]=await load(candidate),visible=[];
   for(const [f,[left,top]] of poses.entries()){
     const frame=si+'_'+a+'_'+f,now=updated.layers[layer].getFrameData(frame),old=p.layers[layer].getFrameData(frame);
     assert.deepEqual(part(now,x=>x<=8),part(old,x=>x<=8));
     assert.deepEqual(part(now,x=>x>8),sourceRight.map(([x,y,...rgba])=>[x-minX+left,y-minY+top,...rgba]));
     const im=render.getCompositeImageData(si,a,f);
     assert.deepEqual(original.getCompositeImageData(si,a,f,false).data,render.getCompositeImageData(si,a,f,false).data);
     visible.push(part(now,x=>x>8).filter(([x,y,...rgba])=>rgba.every((v,j)=>v===im.data[4*(y*im.width+x)+j])).length);
     pic(ctx,im,123*f,126*(v+1),7);
   }
   const reverse=structuredClone(candidate);
   for(const {layer,frame} of edits)reverse.layers[layer].frameData[frame]=before.layers[layer].frameData[frame];
   assert.deepEqual(reverse,before);
   save('candidate-'+v+'.json',JSON.stringify(candidate));
   save('diff-'+v+'.json',JSON.stringify({sheet:si,direction:'up',edits,visible},null,2));
   console.log('Variant',v,poses,'visible hand pixels',visible,'edits',edits.length);
 }
 save('compare.png',c.toBuffer('image/png'));
 console.log('GET',r.status,etag);
})().catch(e=>{console.error(e);process.exitCode=1});
