const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,h=fs.readFileSync(D+'/../noodle-stove-20261118/complete.cjs','utf8'),source=fs.readFileSync(D+'/../noodle-stove-20261118/long-table-edge.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
const decode=Function('zlib','assert',source.slice(source.indexOf('function decode('),source.indexOf('(async()=>'))+';return decode;')(zlib,assert);
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const si=p.spriteSheets.findIndex(s=>s.name==='前台钥匙挂板'),s=p.spriteSheets[si];assert(s&&s.frameWidth===18&&s.frameHeight===11);
 const layers=p.layers.filter(l=>l.sheetIndex===si);assert.equal(layers.length,1);const f=layers[0].frameData[si+'_0_0'],w=18,H=11,b=decode(f.dataURL,w,H),old=Buffer.from(b);
 fs.writeFileSync(D+'/before-move-lower-keys.json',raw);fs.writeFileSync(D+'/before-move-lower-keys.etag',etag);fs.writeFileSync(D+'/before-move-lower-keys.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 const shape=[[0,0],[1,0],[0,1],[0,2]];
 for(const x of [2,6]){
  for(const [dx,dy] of shape){const source=((8+dy)*w+x+2)*4;old.copy(b,((8+dy)*w+x+dx)*4,source,source+4);}
  for(const [dx,dy] of shape){const source=((8+dy)*w+x+dx)*4;old.copy(b,((7+dy)*w+x+dx)*4,source,source+4);}
  for(const [dx,dy] of shape){const from=((8+dy)*w+x+dx)*4,to=((7+dy)*w+x+dx)*4;assert.deepStrictEqual(b.subarray(to,to+4),old.subarray(from,from+4));}
 }
 for(let y=0;y<H;y++)for(let x=0;x<w;x++)if(y<7||!([2,3,6,7].includes(x))){const n=(y*w+x)*4;assert.deepStrictEqual(b.subarray(n,n+4),old.subarray(n,n+4));}
 const data='data:image/png;base64,'+png(b,w,H).toString('base64');f.dataURL=data;s.imageDataURL=data;
 assert.deepStrictEqual(p.spriteSheets.filter((_,i)=>i!==si),before.spriteSheets.filter((_,i)=>i!==si));assert.deepStrictEqual(p.layers.filter(l=>l.sheetIndex!==si),before.layers.filter(l=>l.sheetIndex!==si));
 fs.writeFileSync(D+'/keys-moved-candidate.json',JSON.stringify(p));
 const scale=26,large=Buffer.alloc(w*H*scale*scale*4);
 for(let y=0;y<H*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;b.copy(large,(y*w*scale+x)*4,n,n+4);}
 fs.writeFileSync(D+'/keys-moved-preview.png',png(large,w*scale,H*scale));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/keys-moved-readback.json',JSON.stringify(back));console.log('Verified lower two keys moved up exactly one pixel; map and remaining pixels preserved.');
})().catch(e=>{console.error(e);process.exitCode=1;});
