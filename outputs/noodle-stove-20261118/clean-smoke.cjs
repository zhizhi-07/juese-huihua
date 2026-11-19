const fs=require('fs'),zlib=require('zlib'),assert=require('assert');
const D=__dirname,W=40,H=36;
const helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib','W','H',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib,W,H);
function decode(uri){const b=Buffer.from(uri.split(',')[1],'base64'),parts=[];for(let n=8;n<b.length;){const length=b.readUInt32BE(n);if(b.toString('ascii',n+4,n+8)==='IDAT')parts.push(b.subarray(n+8,n+8+length));n+=length+12;}const rows=zlib.inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(W*H*4);for(let y=0;y<H;y++){const filter=rows[y*(W*4+1)];for(let x=0;x<W*4;x++){const n=y*W*4+x,a=x>=4?pixels[n-4]:0,b=y?pixels[n-W*4]:0,c=y&&x>=4?pixels[n-W*4-4]:0;let v=0;if(filter===1)v=a;if(filter===2)v=b;if(filter===3)v=Math.floor((a+b)/2);if(filter===4){const q=a+b-c,A=Math.abs(q-a),B=Math.abs(q-b),C=Math.abs(q-c);v=A<=B&&A<=C?a:B<=C?b:c;}pixels[n]=(rows[y*(W*4+1)+1+x]+v)&255;}}return pixels;}

(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url),raw=await r.text(),p=JSON.parse(raw);
 fs.writeFileSync(D+'/before-clean-smoke.json',raw);
 const pot=p.layers.find(l=>l.name==='锅'),steam=p.layers.find(l=>l.name==='烟雾');assert(pot&&steam);
 const b=decode(pot.frameData['0_0_0'].dataURL),s=decode(steam.frameData['0_0_0'].dataURL);
 const edits=[[10,13,[47,59,61]],[11,13,[47,59,61]],[12,13,[47,59,61]],[10,14,[156,162,174]],[11,14,[151,158,168]],[10,15,[122,112,121]],[10,16,[157,107,84]]];
 for(const [x,y,color] of edits){const n=(y*W+x)*4;b.copy(s,n,n,n+4);b.set([...color,255],n);assert.deepStrictEqual([...b.subarray(n,n+3)],color);}
 const uri=b=>'data:image/png;base64,'+png(b).toString('base64');pot.frameData['0_0_0'].dataURL=uri(b);steam.frameData['0_0_0'].dataURL=uri(s);
 const all=Buffer.alloc(W*H*4);for(const l of p.layers){const a=decode(l.frameData['0_0_0'].dataURL);for(let n=0;n<a.length;n+=4)if(a[n+3])a.copy(all,n,n,n+4);}p.spriteSheets[0].imageDataURL=uri(all);
 const scale=24,out=Buffer.alloc(W*H*scale*scale*4);for(let y=0;y<H*scale;y++)for(let x=0;x<W*scale;x++){const n=(Math.floor(y/scale)*W+Math.floor(x/scale))*4;b.copy(out,(y*W*scale+x)*4,n,n+4);}fs.writeFileSync(D+'/clean-pot-preview.png',png(out,W*scale,H*scale));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});assert(saved.ok,await saved.text());const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/clean-smoke-readback.json',JSON.stringify(back));console.log('Verified seven residual smoke pixels moved and pot restored; other layers unchanged.');
})();
