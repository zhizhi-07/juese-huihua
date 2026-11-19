const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib);
const samples=JSON.parse(fs.readFileSync(D+'/partition-samples.json','utf8').replace(/^\uFEFF/,''));
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const si=p.spriteSheets.findIndex(s=>s.name==='隔断');assert(si>=0);
 fs.writeFileSync(D+'/before-partition-complete.json',raw);fs.writeFileSync(D+'/before-partition-complete.etag',etag);fs.writeFileSync(D+'/before-partition-complete.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 const w=24,h=11,K=[47,59,61],pixels=Buffer.alloc(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  // Repeat the visible wood pattern into cells concealed by the lower object and bottle.
  const sourceX=y>=7&&x>=1&&x<=14?15+(x-1)%7:x;
  const rgb=y===0||y===h-1||x===0||x===w-1?K:samples[y*w+sourceX];
  pixels.set([...rgb,255],(y*w+x)*4);
 }
 const data='data:image/png;base64,'+png(pixels,w,h).toString('base64'),s=p.spriteSheets[si];
 s.frameWidth=w;s.frameHeight=h;s.imageDataURL=data;
 Object.assign(s.actions[0].frames[0],{width:w,height:h});
 const layers=p.layers.filter(l=>l.sheetIndex===si);assert.equal(layers.length,1);
 layers[0].frameData={[si+'_0_0']:{width:w,height:h,dataURL:data}};
 assert.deepStrictEqual(p.spriteSheets.filter((_,i)=>i!==si),before.spriteSheets.filter((_,i)=>i!==si));
 assert.deepStrictEqual(p.layers.filter(l=>l.sheetIndex!==si),before.layers.filter(l=>l.sheetIndex!==si));
 for(let x=0;x<w;x++){assert.deepStrictEqual([...pixels.subarray(x*4,x*4+3)],K);const n=((h-1)*w+x)*4;assert.deepStrictEqual([...pixels.subarray(n,n+3)],K);}
 fs.writeFileSync(D+'/隔断.png',png(pixels,w,h));
 const scale=24,large=Buffer.alloc(w*h*scale*scale*4);
 for(let y=0;y<h*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;pixels.copy(large,(y*w*scale+x)*4,n,n+4);}
 fs.writeFileSync(D+'/隔断-preview.png',png(large,w*scale,h*scale));fs.writeFileSync(D+'/partition-complete-candidate.json',JSON.stringify(p));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/partition-complete-readback.json',JSON.stringify(back));
 console.log('Verified rectangular partition 24x11, complete border, other assets unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
