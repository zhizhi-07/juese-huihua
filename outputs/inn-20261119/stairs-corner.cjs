const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,h=fs.readFileSync(D+'/../noodle-stove-20261118/complete.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
const sampled=JSON.parse(fs.readFileSync(D+'/stairs-colors.json','utf8').replace(/^\uFEFF/,''));
const W=24,H=74,left=9,first=22,landing=66,C={edge:[47,59,61],opening:sampled.opening,tread:sampled.tread,treadEdge:sampled.treadEdge,riser:sampled.riser},b=Buffer.alloc(W*H*4);
const put=(x,y,c)=>b.set([...c,255],(y*W+x)*4);
for(let y=0;y<landing;y++)for(let x=left;x<W;x++){
 let c=C.edge;
 if(y>0&&x===left+1)c=C.tread;
 if(x>=left+3&&x<W-1){
  if(y===1)c=C.treadEdge;
  else if(y>=2&&y<first)c=C.opening;
  else if(y>=first){const phase=(y-first)%4;c=phase===0?C.treadEdge:phase===1?(x===left+3||x===W-2?C.treadEdge:C.tread):phase===2?C.riser:C.edge;}
 }
 put(x,y,c);
}
// The bottom flight turns left out of frame; no wall pixels surround that opening.
for(let y=landing;y<H;y++)for(let x=0;x<W;x++){
 const phase=(y-landing)%4;
 let c=phase===0?C.treadEdge:phase===1?(x===W-2?C.treadEdge:C.tread):phase===2?C.riser:C.edge;
 if(x===W-1)c=C.edge;put(x,y,c);
}
for(let y=0;y<landing;y++)for(let x=0;x<left;x++)assert.equal(b[(y*W+x)*4+3],0,'No left wall');
for(let k=1;k<11;k++)for(let y=0;y<4;y++)for(let x=left+3;x<W-1;x++){
 const a=((first+y)*W+x)*4,n=((first+k*4+y)*W+x)*4;assert.deepStrictEqual(b.subarray(a,a+4),b.subarray(n,n+4));
}
for(let y=landing;y<H;y++)for(let x=0;x<W;x++)assert.equal(b[(y*W+x)*4+3],255,'Left-turn landing must extend beyond flight');
for(let y=2;y<first;y++)for(let x=left+3;x<W-1;x++){const i=(y*W+x)*4;assert.deepStrictEqual([...b.subarray(i,i+3)],C.opening);}
const scale=11,large=Buffer.alloc(W*H*scale*scale*4);
for(let y=0;y<H*scale;y++)for(let x=0;x<W*scale;x++){const i=(Math.floor(y/scale)*W+Math.floor(x/scale))*4;b.copy(large,(y*W*scale+x)*4,i,i+4);}
fs.writeFileSync(D+'/半边楼梯-拐角.png',png(b,W,H));fs.writeFileSync(D+'/半边楼梯-拐角-preview.png',png(large,W*scale,H*scale));
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const si=p.spriteSheets.findIndex(s=>s.name==='半边楼梯'),s=p.spriteSheets[si];assert(s);
 const layers=p.layers.filter(l=>l.sheetIndex===si);assert.equal(layers.length,1);
 fs.writeFileSync(D+'/before-stairs-corner.json',raw);fs.writeFileSync(D+'/before-stairs-corner.etag',etag);fs.writeFileSync(D+'/before-stairs-corner.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 const data='data:image/png;base64,'+png(b,W,H).toString('base64');Object.assign(s,{frameWidth:W,frameHeight:H,imageDataURL:data});Object.assign(s.actions[0].frames[0],{width:W,height:H});layers[0].frameData[si+'_0_0']={width:W,height:H,dataURL:data};
 assert.deepStrictEqual(p.spriteSheets.filter((_,i)=>i!==si),before.spriteSheets.filter((_,i)=>i!==si));assert.deepStrictEqual(p.layers.filter(l=>l.sheetIndex!==si),before.layers.filter(l=>l.sheetIndex!==si));assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);
 fs.writeFileSync(D+'/stairs-corner-candidate.json',JSON.stringify(p));
 if(!process.argv.includes('--save'))return console.log('Preview: left-turn lower steps restored, wall strips removed, 11 uniform upper steps and extended black opening retained.');
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/stairs-corner-readback.json',JSON.stringify(back));console.log('Verified corrected corner staircase; other materials and scene layout unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
