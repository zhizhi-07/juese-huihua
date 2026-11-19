const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib);
function decode(data,w,h){
 const b=Buffer.from(data.split(',')[1],'base64'),parts=[];
 assert.equal(b[24],8);assert.equal(b[25],6);
 for(let n=8;n<b.length;){const len=b.readUInt32BE(n);if(b.toString('ascii',n+4,n+8)==='IDAT')parts.push(b.subarray(n+8,n+8+len));n+=len+12;}
 const raw=zlib.inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(w*h*4),stride=w*4;
 for(let y=0;y<h;y++)for(let x=0;x<stride;x++){
  const i=y*stride+x,f=raw[y*(stride+1)],a=x>=4?pixels[i-4]:0,b=y?pixels[i-stride]:0,c=y&&x>=4?pixels[i-stride-4]:0;assert(f<=4);
  const q=a+b-c,A=Math.abs(q-a),B=Math.abs(q-b),C=Math.abs(q-c);
  const predict=[0,a,b,Math.floor((a+b)/2),A<=B&&A<=C?a:B<=C?b:c][f];
  pixels[i]=(raw[y*(stride+1)+1+x]+predict)&255;
 }
 return pixels;
}
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const si=p.spriteSheets.findIndex(s=>s.name==='长桌');assert(si>=0);
 const s=p.spriteSheets[si],w=s.frameWidth,h=s.frameHeight;assert.equal(w,11);assert.equal(h,40);
 const layers=p.layers.filter(l=>l.sheetIndex===si);assert.equal(layers.length,1);
 const f=layers[0].frameData[si+'_0_0'],pixels=decode(f.dataURL,w,h),old=Buffer.from(pixels),K=[47,59,61,255];
 fs.writeFileSync(D+'/before-long-table-edge.json',raw);fs.writeFileSync(D+'/before-long-table-edge.etag',etag);fs.writeFileSync(D+'/before-long-table-edge.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 for(let y=33;y<h;y++){
  if(y<h-1){const source=(y*w+8)*4;pixels.copy(pixels,(y*w+9)*4,source,source+4);}
  pixels.set(K,(y*w+10)*4);
 }
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(y<33||x<9){const i=(y*w+x)*4;assert.deepStrictEqual(pixels.subarray(i,i+4),old.subarray(i,i+4));}
 const data='data:image/png;base64,'+png(pixels,w,h).toString('base64');f.dataURL=data;s.imageDataURL=data;
 assert.deepStrictEqual(p.spriteSheets.filter((_,i)=>i!==si),before.spriteSheets.filter((_,i)=>i!==si));assert.deepStrictEqual(p.layers.filter(l=>l.sheetIndex!==si),before.layers.filter(l=>l.sheetIndex!==si));
 fs.writeFileSync(D+'/长桌.png',png(pixels,w,h));
 const scale=20,large=Buffer.alloc(w*h*scale*scale*4);
 for(let y=0;y<h*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;pixels.copy(large,(y*w*scale+x)*4,n,n+4);}
 fs.writeFileSync(D+'/长桌-preview.png',png(large,w*scale,h*scale));fs.writeFileSync(D+'/long-table-edge-candidate.json',JSON.stringify(p));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/long-table-edge-readback.json',JSON.stringify(back));console.log('Verified: lower right outline extended one pixel; previous outline filled with wood; unrelated pixels unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
