const {read,load,save,pic,createCanvas,assert}=require('./helpers.cjs');
const j=read('before.json'),candidate=structuredClone(j);
const si=j.spriteSheets.findIndex(s=>s.name==='吃东西'),idle=j.spriteSheets.findIndex(s=>s.name==='original16_idle');
const poses=[
 [[6,11],[7,10],[9,9],[9,9],[8,10],[7,11]], // side: chest to right of chin
 [[4,11],[5,10],[7,9],[7,9],[6,10],[5,11]], // front: centered at the mouth
 [[12,11],[12,10],[11,9],[11,9],[12,10],[12,11]], // back: fingers occluded by the head
];
const layer=(s,a)=>j.layers.findIndex(l=>l.sheetIndex===s&&l.name==='hand'&&j.layers[l.parent]?.name===j.spriteSheets[s].actions[a].direction);
const key=(s,a,f)=>[s,a,f].join('_');
const count=im=>im.data.filter((v,i)=>i%4===3&&v).length;
(async()=>{
 const [p,original]=await load(j);
 const edits=[];
 for(const [a,points] of poses.entries()){
   const src=p.layers[layer(idle,a)].getFrameData(key(idle,a,0));
   const index=layer(si,a);
   assert(index>=0);
   const movable=a===2?12:a===0?3:2;
   const phase=[0,1,2,3,3,1];
   for(const [f,[left,top]] of points.entries()){
     const k=key(si,a,f),cell=j.layers[index].frameData[k];
     assert.equal(cell.width,17);assert.equal(cell.height,17);assert(!cell.placement);
     const keep=a!==0?p.layers[layer(idle,a)].getFrameData(key(idle,a,phase[f])):null;
     const canvas=createCanvas(cell.width,cell.height),ctx=canvas.getContext('2d'),out=ctx.createImageData(cell.width,cell.height);
     for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
       const i=(y*src.width+x)*4;
       const moving=a===0||(a===1?x<8:x>8);
       const pixels=moving?src:keep;
       if(!pixels.data[i+3])continue;
       const X=moving?x-movable+(a===2?left-1:left):x,Y=moving?y-12+top:y;
       assert(X>=0&&X<cell.width&&Y>=0&&Y<cell.height,'hand stays inside frame');
       const at=(Y*cell.width+X)*4;
       assert(!out.data[at+3],'hands do not overlap');
       out.data.set(pixels.data.subarray(i,i+4),at);
     }
     assert.equal(count(out),count(src),'preserved every outline and skin pixel');
     ctx.putImageData(out,0,0);
     candidate.layers[index].frameData[k]={...cell,dataURL:canvas.toDataURL('image/png')};
     edits.push({layer:index,frame:k,handX:left,handY:top});
   }
 }
 const [changed,preview]=await load(candidate);
 const overview=createCanvas(6*113+64,3*128+30),ctx=overview.getContext('2d');
 ctx.fillStyle='#b8c8c3';ctx.fillRect(0,0,overview.width,overview.height);
 ctx.fillStyle='#2a3432';ctx.font='bold 16px sans-serif';
 for(let f=0;f<6;f++)ctx.fillText(['Hold','Lift','Bite','Pause','Lower','Hold'][f],77+f*113,23);
 for(let a=0;a<3;a++){
   ctx.fillText(['Side','Front','Back'][a],14,90+a*128);
   const distinct=new Set();
   for(let f=0;f<6;f++){
     const k=key(si,a,f),im=preview.getCompositeImageData(si,a,f);
     distinct.add(Buffer.from(im.data).toString('base64'));
     const origin=original.getCompositeImageData(si,a,f,false),same=preview.getCompositeImageData(si,a,f,false);
     assert.deepEqual(same.data,origin.data,'non-hand composite identical');
     const src=p.layers[layer(idle,a)].getFrameData(key(idle,a,0));
     const actual=changed.layers[layer(si,a)].getFrameData(k);
     function colors(d){return [...Array(d.width*d.height).keys()].map(i=>Buffer.from(d.data.slice(i*4,i*4+4)).toString('hex')).filter(s=>!s.endsWith('00')).sort()}
     assert.deepEqual(colors(actual),colors(src),'original hand palette, shading and outline retained');
     pic(ctx,im,66+f*113,27+a*128,6);
   }
   assert(distinct.size>=4);
 }
 const delta=structuredClone(candidate);for(const {layer,frame} of edits)delta.layers[layer].frameData[frame]=j.layers[layer].frameData[frame];
 assert.deepEqual(delta,j,'only allowed hands changed anywhere in the project');
 save('preview.png',overview.toBuffer('image/png'));
 save('candidate.json',JSON.stringify(candidate));
 save('diff.json',JSON.stringify({sheet:si,name:'吃东西',edits},null,2));
 console.log('PASS: 3 directions × 6 frames; only 18 front-hand cels replaced; project metadata and other layers identical; all hand/outline RGBA and dimensions retained; actual editor composites verified.');
})().catch(e=>{console.error(e);process.exitCode=1});
