const fs=require('fs'),zlib=require('zlib'),assert=require('assert');
const D=__dirname,W=40,H=36;
const helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib','W','H',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib,W,H);
function decode(uri){const b=Buffer.from(uri.split(',')[1],'base64'),parts=[];for(let n=8;n<b.length;){const length=b.readUInt32BE(n);if(b.toString('ascii',n+4,n+8)==='IDAT')parts.push(b.subarray(n+8,n+8+length));n+=length+12;}const rows=zlib.inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(W*H*4);for(let y=0;y<H;y++){const filter=rows[y*(W*4+1)];for(let x=0;x<W*4;x++){const n=y*W*4+x,a=x>=4?pixels[n-4]:0,b=y?pixels[n-W*4]:0,c=y&&x>=4?pixels[n-W*4-4]:0;let v=0;if(filter===1)v=a;if(filter===2)v=b;if(filter===3)v=Math.floor((a+b)/2);if(filter===4){const q=a+b-c,A=Math.abs(q-a),B=Math.abs(q-b),C=Math.abs(q-c);v=A<=B&&A<=C?a:B<=C?b:c;}pixels[n]=(rows[y*(W*4+1)+1+x]+v)&255;}}return pixels;}
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url),raw=await r.text(),p=JSON.parse(raw);
 fs.writeFileSync(D+'/before-fire-smoke.json',raw);fs.writeFileSync(D+'/before-fire-smoke.etag',r.headers.get('etag'));
 const pot=p.layers.find(l=>l.name==='锅'),fire=p.layers.find(l=>l.name==='火');assert(pot&&fire);assert(!p.layers.some(l=>l.name==='烟雾'));
 const potPixels=decode(pot.frameData['0_0_0'].dataURL),original=Buffer.from(potPixels),smoke=Buffer.alloc(W*H*4);
 for(let y=0;y<13;y++)for(let x=0;x<W;x++){const n=(y*W+x)*4;potPixels.copy(smoke,n,n,n+4);potPixels.fill(0,n,n+4);}
 for(let n=0;n<original.length;n++)assert.equal(potPixels[n]||smoke[n],original[n]);
 const uri=b=>'data:image/png;base64,'+png(b).toString('base64');
 pot.frameData['0_0_0'].dataURL=uri(potPixels);
 p.layers.splice(p.layers.indexOf(pot)+1,0,{sheetIndex:0,parent:null,name:'烟雾',visible:true,locked:false,opacity:1,frameData:{'0_0_0':{width:W,height:H,dataURL:uri(smoke)}}});
 const flame=Buffer.alloc(W*H*4),colors={r:[177,76,51],o:[226,126,58],y:[247,184,79],h:[255,216,130]};
 ['..r..r..','.rorrro.','roryoyor','.oyhyyo.','.rooor..'].forEach((row,y)=>[...row].forEach((c,x)=>{if(colors[c])flame.set([...colors[c],255],((29+y)*W+7+x)*4);}));
 fire.frameData['0_0_0'].dataURL=uri(flame);
 const combined=Buffer.alloc(W*H*4);for(const l of p.layers){const b=decode(l.frameData['0_0_0'].dataURL);for(let n=0;n<b.length;n+=4)if(b[n+3])b.copy(combined,n,n,n+4);fs.writeFileSync(D+'/final-'+p.layers.indexOf(l)+'.png',png(b));}
 p.spriteSheets[0].imageDataURL=uri(combined);assert.equal(p.layers.length,6);
 const enlarged=Buffer.alloc(W*H*16*16*4);for(let y=0;y<H*16;y++)for(let x=0;x<W*16;x++){const n=(Math.floor(y/16)*W+Math.floor(x/16))*4;combined.copy(enlarged,(y*W*16+x)*4,n,n+4);}fs.writeFileSync(D+'/fire-smoke-preview.png',png(enlarged,W*16,H*16));
 const save=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});assert(save.ok,await save.text());const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/fire-smoke-readback.json',JSON.stringify(back));console.log('Verified six layers; lossless pot/smoke split; redrawn flame.');
})();

