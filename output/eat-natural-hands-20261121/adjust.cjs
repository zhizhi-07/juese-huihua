const {load,pic,save,createCanvas,assert}=require('./helpers.cjs');
const {createHash}=require('node:crypto');
const url='http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561';
(async()=>{
 const list=await fetch(new URL('/api/projects',url));assert.equal(list.status,200);
 assert((await list.json()).some(p=>p.id==='base-outlined-1794365455561'));
 const r=await fetch(url,{cache:'no-store'});assert.equal(r.status,200);
 const raw=Buffer.from(await r.arrayBuffer()),etag=r.headers.get('etag');assert(etag);
 save('before.json',raw);save('before.meta.json',JSON.stringify({url,status:r.status,etag,sha256:createHash('sha256').update(raw).digest('hex')},null,2));
 const before=JSON.parse(raw),candidate=structuredClone(before);
 const si=before.spriteSheets.findIndex(s=>s.name==='吃东西'),idle=before.spriteSheets.findIndex(s=>s.name==='original16_idle');
 assert.deepEqual(before.spriteSheets[si].actions.map(a=>[a.direction,a.frames.length]),[['side',6],['down',6],['up',6]]);
 const [p,cm]=await load(before),edits=[];
 const find=(sheet,direction,name)=>before.layers.findIndex(l=>l.sheetIndex===sheet&&l.name===name&&before.layers[l.parent]?.name===direction);
 for(const [a,direction] of ['side','down','up'].entries()){
   const name=a===0?'hand 2':'hand';
   const layer=find(si,direction,name),src=find(idle,direction,name);
   assert(layer>=0&&src>=0);assert.equal(before.spriteSheets[idle].actions[a].direction,direction);
   const rest=p.layers[src].getFrameData(idle+'_'+a+'_0');
   for(let f=0;f<6;f++){
     const frame=si+'_'+a+'_'+f;
     const prior=p.layers[layer].getFrameData(frame);
     assert(prior&&rest);assert.equal(prior.width,rest.width);assert.equal(prior.height,rest.height);assert(!prior.placement&&!rest.placement);
     const {width:w,height:h}=rest,c=createCanvas(w,h),ctx=c.getContext('2d'),out=ctx.createImageData(w,h);
     for(let y=0;y<h;y++)for(let x=0;x<w;x++){
       const originalIndex=4*(y*w+x);
       const activeFront=a===1&&x<10;
       const lift=a===2&&x>8&&f>=1&&f<=4?1:0;
       // Front keeps the existing eating-hand path; the other hand stays in the idle pose.
       const data=(activeFront?prior:rest).data;
       if(!data[originalIndex+3])continue;
       assert(y>=lift);
       out.data.set(data.subarray(originalIndex,originalIndex+4),4*((y-lift)*w+x));
     }
     const count=(im,predicate)=>im.data.filter((v,i)=>i%4===3&&v&&predicate(i/4%w|0)).length;
     for(const check of a===0?[()=>true]:[x=>x<10,x=>x>=10])assert.equal(count(out,check),count(a===1&&check(1)?prior:rest,check));
     if(Buffer.from(prior.data).equals(Buffer.from(out.data)))continue;
     ctx.putImageData(out,0,0);
     candidate.layers[layer].frameData[frame].dataURL=c.toDataURL();
     edits.push({layer,frame,direction});
   }
 }
 const [updated,render]=await load(candidate);
 const c=createCanvas(6*123,6*122);const ctx=c.getContext('2d');ctx.fillStyle='#b8c8c3';ctx.fillRect(0,0,c.width,c.height);
 for(let a=0;a<3;a++)for(let f=0;f<6;f++){
    pic(ctx,cm.getCompositeImageData(si,a,f),123*f,122*a,7);
    pic(ctx,render.getCompositeImageData(si,a,f),123*f,122*(a+3),7);
    assert.deepEqual(cm.getCompositeImageData(si,a,f,false).data,render.getCompositeImageData(si,a,f,false).data);
    const direction=before.spriteSheets[si].actions[a].direction,name=a===0?'hand 2':'hand';
    const rest=p.layers[find(idle,direction,name)].getFrameData(idle+'_'+a+'_0');
    const frame=si+'_'+a+'_'+f,now=updated.layers[find(si,direction,name)].getFrameData(frame);
    const old=p.layers[find(si,direction,name)].getFrameData(frame);
    for(let y=0;y<now.height;y++)for(let x=0;x<now.width;x++){
      const lift=a===2&&x>8&&f>=1&&f<=4?1:0,i=4*(y*now.width+x),j=4*((y+lift)*now.width+x);
      assert.deepEqual(now.data.slice(i,i+4),a===1&&x<10?old.data.slice(i,i+4):y+lift<now.height?rest.data.slice(j,j+4):new Uint8ClampedArray(4));
    }
 }
 const reversed=structuredClone(candidate);
 for(const {layer,frame} of edits)reversed.layers[layer].frameData[frame]=before.layers[layer].frameData[frame];
 assert.deepEqual(reversed,before);assert(edits.length);
 save('candidate.json',JSON.stringify(candidate));save('diff.json',JSON.stringify({sheet:si,edits},null,2));save('compare.png',c.toBuffer('image/png'));
 console.log('GET',r.status,etag);console.log('Verified changed frames:',edits.map(e=>e.frame).join(', '));
})().catch(e=>{console.error(e);process.exitCode=1});
