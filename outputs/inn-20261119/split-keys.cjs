const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,h=fs.readFileSync(D+'/../noodle-stove-20261118/complete.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const si=p.spriteSheets.findIndex(s=>s.name==='前台钥匙挂板'),s=p.spriteSheets[si];assert(s&&s.frameWidth===18&&s.frameHeight===11);
 const indices=p.layers.map((l,i)=>l.sheetIndex===si?i:-1).filter(i=>i>=0);assert.equal(indices.length,1);
 const index=indices[0],w=18,H=11,board=Buffer.alloc(w*H*4),keys=Buffer.alloc(w*H*4);
 const C={edge:[47,59,61],wood:[160,124,96],back:[118,84,87],shade:[101,75,80],gold:[226,177,102],light:[238,193,121]};
 const put=(b,x,y,c)=>b.set([...c,255],(y*w+x)*4);
 for(let y=0;y<H;y++)for(let x=0;x<w;x++){
  let color=C.back;if(y===1)color=C.wood;if(y===2||y===9)color=C.shade;
  if(x===0||x===w-1||y===0||y===H-1)color=C.edge;put(board,x,y,color);
 }
 for(const y of [3,7])for(const x of [2,6,10,14])put(board,x,y,C.edge);
 for(const [x,y] of [[2,3],[6,3],[10,3],[14,3],[2,7],[6,7]]){
  put(keys,x+1,y,C.light);put(keys,x,y+1,C.gold);put(keys,x,y+2,C.gold);
 }
 const merged=Buffer.from(board);for(let i=0;i<keys.length;i+=4)if(keys[i+3])keys.copy(merged,i,i,i+4);
 const colors=new Set();for(let i=0;i<merged.length;i+=4)colors.add(merged.subarray(i,i+4).toString('hex'));assert.equal(colors.size,6);
 for(const x of [10,14])assert.deepStrictEqual([...board.subarray((7*w+x)*4,(7*w+x)*4+3)],C.edge);
 assert.equal([...keys].filter((_,i)=>i%4===3&&keys[i]===255).length,18);
 const uri=b=>'data:image/png;base64,'+png(b,w,H).toString('base64');
 s.imageDataURL=uri(merged);
 const layers=[['挂板',board],['钥匙',keys]].map(([name,b])=>({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData:{[si+'_0_0']:{width:w,height:H,dataURL:uri(b)}}}));
 p.layers.splice(index,1,...layers);
 if(p.currentLayerIndex>index)p.currentLayerIndex++;else if(p.currentLayerIndex===index)p.currentLayerIndex=index+1;
 assert.deepStrictEqual(p.spriteSheets.filter((_,i)=>i!==si),before.spriteSheets.filter((_,i)=>i!==si));
 assert.deepStrictEqual(p.layers.filter(l=>l.sheetIndex!==si),before.layers.filter(l=>l.sheetIndex!==si));assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);
 fs.writeFileSync(D+'/before-split-keys.json',raw);fs.writeFileSync(D+'/before-split-keys.etag',etag);fs.writeFileSync(D+'/before-split-keys.sha256',crypto.createHash('sha256').update(raw).digest('hex'));fs.writeFileSync(D+'/split-keys-candidate.json',JSON.stringify(p));
 for(const [name,b] of [['挂板',board],['钥匙',keys],['钥匙挂板-精简',merged]]){
  fs.writeFileSync(D+'/'+name+'.png',png(b,w,H));const scale=26,large=Buffer.alloc(w*H*scale*scale*4);
  for(let y=0;y<H*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;b.copy(large,(y*w*scale+x)*4,n,n+4);}
  fs.writeFileSync(D+'/'+name+'-preview.png',png(large,w*scale,H*scale));
 }
 if(!process.argv.includes('--save'))return console.log('Preview: aligned empty hooks; six colors total; separate board and keys.');
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/split-keys-readback.json',JSON.stringify(back));console.log('Verified aligned lower hooks, six colors, separate board/key layers; map unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
