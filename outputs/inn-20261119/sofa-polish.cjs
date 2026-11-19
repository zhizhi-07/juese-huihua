const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,h=fs.readFileSync(D+'/../noodle-stove-20261118/complete.cjs','utf8'),src=fs.readFileSync(D+'/../noodle-stove-20261118/long-table-edge.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
const decode=Function('zlib','assert',src.slice(src.indexOf('function decode('),src.indexOf('(async()=>'))+';return decode;')(zlib,assert);
const K=[47,59,61],cloth=[[113,105,69],[101,96,65],[81,76,53],[65,63,47]],W=32,H=21;
const distance=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const si=p.spriteSheets.findIndex(s=>s.name==='沙发'),s=p.spriteSheets[si];assert(s&&s.frameWidth===W&&s.frameHeight===H);
 const layers=p.layers.filter(l=>l.sheetIndex===si);assert.equal(layers.length,1);const l=layers[0],images=[],stats=[];
 fs.writeFileSync(D+'/before-sofa-polish.json',raw);fs.writeFileSync(D+'/before-sofa-polish.etag',etag);fs.writeFileSync(D+'/before-sofa-polish.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 for(let a=0;a<2;a++){
  const key=si+'_'+a+'_0',old=decode(l.frameData[key].dataURL,W,H),b=Buffer.from(old),boundary=new Set();
  const opaque=(x,y)=>x>=0&&x<W&&y>=0&&y<H&&old[(y*W+x)*4+3]>0;
  const black=(buf,x,y)=>x>=0&&x<W&&y>=0&&y<H&&buf[(y*W+x)*4+3]&&K.every((c,i)=>buf[(y*W+x)*4+i]===c);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   if(!opaque(x,y))continue;const n=(y*W+x)*4;
   if([[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([X,Y])=>!opaque(X,Y))){boundary.add(y*W+x);b.set([...K,255],n);}
   else if(!black(old,x,y)){const rgb=[...old.subarray(n,n+3)],c=cloth.reduce((a,c)=>distance(rgb,a)<=distance(rgb,c)?a:c);b.set([...c,255],n);}
  }
  const solid=Buffer.from(b),thin=[];
  // Recolor only the inner pixels of double-width black bands; preserve the silhouette.
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   if(boundary.has(y*W+x)||!black(solid,x,y))continue;
   if([[-1,-1],[0,-1],[-1,0],[0,0]].some(([dx,dy])=>[[0,0],[1,0],[0,1],[1,1]].every(([X,Y])=>black(solid,x+dx+X,y+dy+Y))))thin.push([x,y]);
  }
  for(const [x,y] of thin)b.set([...cloth[3],255],(y*W+x)*4);
  const colors=new Set();let changed=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const n=(y*W+x)*4;assert.equal(b[n+3],old[n+3]);if(b[n+3])colors.add(b.subarray(n,n+3).toString('hex'));
   if(boundary.has(y*W+x))assert(black(b,x,y));
   if(!b.subarray(n,n+4).equals(old.subarray(n,n+4)))changed++;
   if(!boundary.has(y*W+x)&&black(b,x,y))assert(![[-1,-1],[0,-1],[-1,0],[0,0]].some(([dx,dy])=>[[0,0],[1,0],[0,1],[1,1]].every(([X,Y])=>black(b,x+dx+X,y+dy+Y))));
  }
  assert(colors.size<=5);stats.push({direction:s.actions[a].direction,innerOutlinePixelsThinned:thin.length,colors:colors.size,changedPixels:changed});
  l.frameData[key].dataURL='data:image/png;base64,'+png(b,W,H).toString('base64');images.push(b);
  const scale=20,large=Buffer.alloc(W*H*scale*scale*4);
  for(let y=0;y<H*scale;y++)for(let x=0;x<W*scale;x++){const n=(Math.floor(y/scale)*W+Math.floor(x/scale))*4;b.copy(large,(y*W*scale+x)*4,n,n+4);}
  fs.writeFileSync(D+'/沙发-'+(a===0?'正面':'背面')+'-优化.png',png(large,W*scale,H*scale));
 }
 s.imageDataURL='data:image/png;base64,'+png(Buffer.concat(images),W,H*2).toString('base64');
 assert.deepStrictEqual(p.spriteSheets.filter((_,i)=>i!==si),before.spriteSheets.filter((_,i)=>i!==si));assert.deepStrictEqual(p.layers.filter(layer=>layer.sheetIndex!==si),before.layers.filter(layer=>layer.sheetIndex!==si));assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);assert.deepStrictEqual(s.actions,before.spriteSheets[si].actions);
 fs.writeFileSync(D+'/sofa-polish-candidate.json',JSON.stringify(p));fs.writeFileSync(D+'/sofa-polish-checks.json',JSON.stringify(stats));
 if(!process.argv.includes('--save'))return console.log(JSON.stringify(stats));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/sofa-polish-readback.json',JSON.stringify(back));console.log('Saved and verified: '+JSON.stringify(stats));
})().catch(e=>{console.error(e);process.exitCode=1;});
