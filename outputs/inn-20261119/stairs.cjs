const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,h=fs.readFileSync(D+'/../noodle-stove-20261118/complete.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
const sampled=JSON.parse(fs.readFileSync(D+'/stairs-colors.json','utf8').replace(/^\uFEFF/,''));
const W=18,openingHeight=20,count=11,stepHeight=3,gap=1,start=openingHeight+2,H=start+count*(stepHeight+gap);
const C={edge:[47,59,61],opening:sampled.opening,tread:sampled.tread,treadEdge:sampled.treadEdge,riser:sampled.riser,trim:sampled.trim},pixels=Buffer.alloc(W*H*4);
const put=(x,y,c)=>pixels.set([...c,255],(y*W+x)*4);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 let c=C.edge;
 if(y>0&&y<H-1){if(x===1)c=C.tread;if(x===2)c=C.treadEdge;if(x===16)c=C.trim;}
 if(x>=4&&x<=14){
  if(y===1)c=C.trim;
  else if(y>=2&&y<start)c=C.opening;
  else if(y>=start){const phase=(y-start)%(stepHeight+gap);if(phase===0)c=C.treadEdge;if(phase===1)c=x===4||x===14?C.treadEdge:C.tread;if(phase===2)c=C.riser;}
 }
 put(x,y,c);
}
assert(openingHeight>=16);assert.equal(H,66);
for(let k=1;k<count;k++)for(let y=0;y<stepHeight+gap;y++)for(let x=4;x<=14;x++){
 const a=((start+y)*W+x)*4,b=((start+k*(stepHeight+gap)+y)*W+x)*4;assert.deepStrictEqual(pixels.subarray(a,a+4),pixels.subarray(b,b+4));
}
for(let y=2;y<start;y++)for(let x=4;x<=14;x++){const i=(y*W+x)*4;assert.deepStrictEqual([...pixels.subarray(i,i+3)],C.opening);}
const scale=12,large=Buffer.alloc(W*H*scale*scale*4);
for(let y=0;y<H*scale;y++)for(let x=0;x<W*scale;x++){const i=(Math.floor(y/scale)*W+Math.floor(x/scale))*4;pixels.copy(large,(y*W*scale+x)*4,i,i+4);}
fs.writeFileSync(D+'/半边楼梯.png',png(pixels,W,H));fs.writeFileSync(D+'/半边楼梯-preview.png',png(large,W*scale,H*scale));
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const name='半边楼梯',si=p.spriteSheets.length;assert(!p.spriteSheets.some(s=>s.name===name));
 fs.writeFileSync(D+'/before-stairs.json',raw);fs.writeFileSync(D+'/before-stairs.etag',etag);fs.writeFileSync(D+'/before-stairs.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 const data='data:image/png;base64,'+png(pixels,W,H).toString('base64');
 p.spriteSheets.push({name,frameWidth:W,frameHeight:H,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:data,actions:[{name:'正面',direction:'down',frames:[{sheetIndex:si,sourceX:0,sourceY:0,width:W,height:H,locked:false,lockedRegions:[],status:'completed',duration:0}]}]});
 p.layers.push({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData:{[si+'_0_0']:{width:W,height:H,dataURL:data}}});
 p.currentSheetIndex=si;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.length-1;
 assert.deepStrictEqual(p.spriteSheets.slice(0,si),before.spriteSheets);assert.deepStrictEqual(p.layers.slice(0,before.layers.length),before.layers);assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);
 fs.writeFileSync(D+'/stairs-candidate.json',JSON.stringify(p));
 if(!process.argv.includes('--save'))return console.log('Preview ready: 11 identical 3px steps, 1px gaps, 20px-long dark entry, 6 source colors.');
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/stairs-readback.json',JSON.stringify(back));console.log('Verified staircase: uniform steps and extended opening; existing hotel materials and layout unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
