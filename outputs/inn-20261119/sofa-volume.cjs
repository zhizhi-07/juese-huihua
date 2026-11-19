const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,h=fs.readFileSync(D+'/../noodle-stove-20261118/complete.cjs','utf8'),src=fs.readFileSync(D+'/../noodle-stove-20261118/long-table-edge.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
const decode=Function('zlib','assert',src.slice(src.indexOf('function decode('),src.indexOf('(async()=>'))+';return decode;')(zlib,assert);
const W=32,H=21,C={edge:[47,59,61],light:[124,120,78],seat:[110,109,71],back:[91,91,60],shade:[76,79,54]};
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const si=p.spriteSheets.findIndex(s=>s.name==='沙发'),s=p.spriteSheets[si];assert(s&&s.frameWidth===W&&s.frameHeight===H);
 const layers=p.layers.filter(l=>l.sheetIndex===si);assert.equal(layers.length,1);const l=layers[0],images=[];
 fs.writeFileSync(D+'/before-sofa-volume.json',raw);fs.writeFileSync(D+'/before-sofa-volume.etag',etag);fs.writeFileSync(D+'/before-sofa-volume.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 for(let a=0;a<2;a++){
  const key=si+'_'+a+'_0',old=decode(l.frameData[key].dataURL,W,H),b=Buffer.from(old);
  const isEdge=(buf,n)=>buf[n+3]&&C.edge.every((v,i)=>buf[n+i]===v);
  const put=(x,y,c)=>{const n=(y*W+x)*4;if(old[n+3]&&!isEdge(old,n))b.set([...c,255],n);};
  const row=(y,x1,x2,c)=>{for(let x=x1;x<=x2;x++)put(x,y,c);};
  if(a===0){
   // Broad bevels and continuous seams model soft cushions without scattered marks.
   row(2,6,25,C.seat);row(3,6,25,C.light);row(4,7,24,C.seat);
   row(9,6,25,C.shade);
   for(let y=5;y<=8;y++){put(5,y,C.shade);put(26,y,C.shade);}
   for(const [left,right] of [[5,15],[17,26]]){
    row(11,left,right,C.back);row(11,left+1,right-1,C.light);
    for(let y=12;y<=14;y++){put(left,y,C.back);put(right,y,C.back);}
    row(12,left+1,right-1,C.seat);
    row(15,left,right,C.back);row(16,left+1,right-1,C.shade);
   }
   for(let y=9;y<=13;y++){put(3,y,C.seat);put(28,y,C.seat);}
   row(7,2,4,C.light);row(7,27,29,C.light);
   row(15,1,3,C.back);row(15,28,30,C.back);
   row(17,6,25,C.back);
  }else{
   row(11,6,24,C.light);row(12,6,24,C.seat);
   for(let y=13;y<=17;y++){put(4,y,C.shade);put(26,y,C.shade);}
   row(18,5,25,C.shade);row(19,7,23,C.back);
   for(let y=10;y<=15;y++){put(3,y,C.seat);put(27,y,C.seat);}
   row(16,1,3,C.back);row(16,27,29,C.back);
  }
  const colors=new Set();for(let i=0;i<b.length;i+=4){assert.equal(b[i+3],old[i+3]);assert.equal(!!isEdge(b,i),!!isEdge(old,i));if(b[i+3])colors.add(b.subarray(i,i+3).toString('hex'));}assert.equal(colors.size,5);
  images.push(b);l.frameData[key].dataURL='data:image/png;base64,'+png(b,W,H).toString('base64');
  const scale=20,large=Buffer.alloc(W*H*scale*scale*4);
  for(let y=0;y<H*scale;y++)for(let x=0;x<W*scale;x++){const i=(Math.floor(y/scale)*W+Math.floor(x/scale))*4;b.copy(large,(y*W*scale+x)*4,i,i+4);}
  fs.writeFileSync(D+'/沙发-'+(a===0?'正面':'背面')+'-软包质感.png',png(large,W*scale,H*scale));
 }
 s.imageDataURL='data:image/png;base64,'+png(Buffer.concat(images),W,H*2).toString('base64');
 assert.deepStrictEqual(s.actions,before.spriteSheets[si].actions);assert.deepStrictEqual(p.spriteSheets.filter((_,i)=>i!==si),before.spriteSheets.filter((_,i)=>i!==si));assert.deepStrictEqual(p.layers.filter(layer=>layer.sheetIndex!==si),before.layers.filter(layer=>layer.sheetIndex!==si));assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);
 fs.writeFileSync(D+'/sofa-volume-candidate.json',JSON.stringify(p));
 if(!process.argv.includes('--save'))return console.log('Preview: coherent upholstery bevels; same five colors, silhouette, outline pixels and directions.');
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/sofa-volume-readback.json',JSON.stringify(back));console.log('Verified upholstery volume restored with continuous edge bands; original five colors, outlines and other assets preserved.');
})().catch(e=>{console.error(e);process.exitCode=1;});
