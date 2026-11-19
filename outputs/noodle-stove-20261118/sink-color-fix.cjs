const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,h=fs.readFileSync(D+'/complete.cjs','utf8'),source=fs.readFileSync(D+'/long-table-edge.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
const decode=Function('zlib','assert',source.slice(source.indexOf('function decode('),source.indexOf('(async()=>'))+';return decode;')(zlib,assert);
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const si=p.spriteSheets.findIndex(s=>s.name==='洗手池和木桌');assert(si>=0);
 const s=p.spriteSheets[si],w=s.frameWidth,H=s.frameHeight;assert(w===14&&H===34);
 const layer=p.layers.find(l=>l.sheetIndex===si&&l.name==='洗手池'),frame=layer.frameData[si+'_0_0'],b=decode(frame.dataURL,w,H),old=Buffer.from(b);
 const put=(x,y,c)=>b.set([...c,255],(y*w+x)*4);
 // Restrict changes to the metal basin; retain the user's surround and silhouette.
 for(let y=3;y<=14;y++)for(let x=2;x<=11;x++){
  let c=[166,169,166];
  if(x>=3&&x<=10&&y>=4&&y<=13){
   c=[127,131,131];
   if(y===4||y===5)c=[92,98,101];
   if(x===3)c=[101,107,109];
   if(x===10)c=[113,119,120];
   if(y===13&&x>=4&&x<=9)c=[148,154,152];
  }
  put(x,y,c);
 }
 put(7,8,[76,83,85]);put(7,9,[169,173,169]);
 put(6,3,[91,100,102]);put(7,3,[195,198,190]);put(8,3,[91,100,102]);
 put(7,4,[184,189,183]);put(7,5,[158,167,164]);
 for(let y=0;y<H;y++)for(let x=0;x<w;x++)if(x<2||x>11||y<3||y>14){const n=(y*w+x)*4;assert.deepStrictEqual(b.subarray(n,n+4),old.subarray(n,n+4));}
 for(let i=3;i<b.length;i+=4)assert.equal(b[i],old[i]);
 fs.writeFileSync(D+'/before-sink-metal-fix.json',raw);fs.writeFileSync(D+'/before-sink-metal-fix.etag',etag);fs.writeFileSync(D+'/before-sink-metal-fix.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 frame.dataURL='data:image/png;base64,'+png(b,w,H).toString('base64');
 const merged=Buffer.alloc(w*H*4);
 for(const l of p.layers.filter(l=>l.sheetIndex===si&&l.visible!==false)){
  const pixels=decode(l.frameData[si+'_0_0'].dataURL,w,H);for(let i=0;i<pixels.length;i+=4)if(pixels[i+3])pixels.copy(merged,i,i,i+4);
 }
 s.imageDataURL='data:image/png;base64,'+png(merged,w,H).toString('base64');
 assert.deepStrictEqual(p.layers.filter(l=>l!==layer),before.layers.filter(l=>l.sheetIndex!==si||l.name!=='洗手池'));
 assert.deepStrictEqual(p.spriteSheets.filter((_,i)=>i!==si),before.spriteSheets.filter((_,i)=>i!==si));assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);
 fs.writeFileSync(D+'/sink-metal-candidate.json',JSON.stringify(p));
 const scale=24,large=Buffer.alloc(w*H*scale*scale*4);
 for(let y=0;y<H*scale;y++)for(let x=0;x<w*scale;x++){const i=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;merged.copy(large,(y*w*scale+x)*4,i,i+4);}
 fs.writeFileSync(D+'/sink-metal-preview.png',png(large,w*scale,H*scale));
 if(!process.argv.includes('--save'))return console.log('Candidate rendered; user surround, silhouette, table and layout preserved.');
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/sink-metal-readback.json',JSON.stringify(back));console.log('Verified neutral metal sink, recessed basin and small spout; user surround, table and layout unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
