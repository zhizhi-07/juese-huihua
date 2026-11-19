const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib);
const samples=JSON.parse(fs.readFileSync(D+'/door-samples.json','utf8').replace(/^\uFEFF/,''));
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const si=p.spriteSheets.findIndex(s=>s.name==='门');assert(si>=0);
 fs.writeFileSync(D+'/before-door-balance.json',raw);fs.writeFileSync(D+'/before-door-balance.etag',etag);fs.writeFileSync(D+'/before-door-balance.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 const w=33,h=22,K=[47,59,61],pixels=Buffer.alloc(w*h*4),put=(x,y,rgb)=>pixels.set([...rgb,255],(y*w+x)*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  let rgb=K;
  if(y===1&&x>0&&x<32)rgb=samples[w+2];
  if(y>=2&&y<21&&(x===1||x===2||x===30||x===31))rgb=samples[Math.min(y,14)*w+x];
  put(x,y,rgb);
 }
 for(const start of [4,13,22]){
  for(let y=3;y<=10;y++)for(let x=0;x<7;x++)put(start+x,y,samples[y*w+4+x]);
  for(const dx of [1,5])for(let y=1;y<=2;y++)put(start+dx,y,[170,76,76]);
 }
 // Equal panel dimensions, two-pixel gaps, and identical hanging straps.
 for(let y=1;y<=10;y++)for(let x=0;x<7;x++){
  const at=X=>pixels.subarray((y*w+X)*4,(y*w+X)*4+4);
  assert.deepStrictEqual(at(4+x),at(13+x));assert.deepStrictEqual(at(4+x),at(22+x));
 }
 const data='data:image/png;base64,'+png(pixels,w,h).toString('base64');
 p.spriteSheets[si].imageDataURL=data;
 const layer=p.layers.filter(l=>l.sheetIndex===si);assert.equal(layer.length,1);layer[0].frameData[si+'_0_0'].dataURL=data;
 assert.deepStrictEqual(p.spriteSheets.filter((_,i)=>i!==si),before.spriteSheets.filter((_,i)=>i!==si));
 assert.deepStrictEqual(p.layers.filter(l=>l.sheetIndex!==si),before.layers.filter(l=>l.sheetIndex!==si));
 fs.writeFileSync(D+'/门.png',png(pixels,w,h));
 const scale=22,large=Buffer.alloc(w*h*scale*scale*4);
 for(let y=0;y<h*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;pixels.copy(large,(y*w*scale+x)*4,n,n+4);}
 fs.writeFileSync(D+'/门-preview.png',png(large,w*scale,h*scale));fs.writeFileSync(D+'/door-balance-candidate.json',JSON.stringify(p));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/door-balance-readback.json',JSON.stringify(back));
 console.log('Verified equal panels 7x8, gaps 2px, straps 1x2; other assets unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
