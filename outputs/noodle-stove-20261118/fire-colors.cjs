const fs=require('fs'),zlib=require('zlib'),assert=require('assert');
const D=__dirname,W=40,H=36;
const helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib','W','H',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib,W,H);
function decode(uri){const b=Buffer.from(uri.split(',')[1],'base64'),parts=[];for(let n=8;n<b.length;){const length=b.readUInt32BE(n);if(b.toString('ascii',n+4,n+8)==='IDAT')parts.push(b.subarray(n+8,n+8+length));n+=length+12;}const rows=zlib.inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(W*H*4);for(let y=0;y<H;y++){const filter=rows[y*(W*4+1)];for(let x=0;x<W*4;x++){const n=y*W*4+x,a=x>=4?pixels[n-4]:0,b=y?pixels[n-W*4]:0,c=y&&x>=4?pixels[n-W*4-4]:0;let v=0;if(filter===1)v=a;if(filter===2)v=b;if(filter===3)v=Math.floor((a+b)/2);if(filter===4){const q=a+b-c,A=Math.abs(q-a),B=Math.abs(q-b),C=Math.abs(q-c);v=A<=B&&A<=C?a:B<=C?b:c;}pixels[n]=(rows[y*(W*4+1)+1+x]+v)&255;}}return pixels;}


(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url),raw=await r.text(),p=JSON.parse(raw),before=JSON.parse(raw);
 fs.writeFileSync(D+'/before-fire-colors.json',raw);fs.writeFileSync(D+'/before-fire-colors.etag',r.headers.get('etag'));
 const si=p.spriteSheets.findIndex(s=>s.name==='灶台'),fire=p.layers.find(l=>l.sheetIndex===si&&l.name==='火'),base=decode(fire.frameData[si+'_0_0'].dataURL),palette=[[177,76,51],[226,126,58],[247,184,79],[255,216,130]];
 let top=H;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(base[(y*W+x)*4+3])top=Math.min(top,y);
 const changed=[];
 for(let f=1;f<8;f++){
  const key=si+'_0_'+f,b=decode(fire.frameData[key].dataURL);let count=0;
  for(let y=top+1;y<H;y++)for(let x=0;x<W;x++){
   const n=(y*W+x)*4;if(!base[n+3])continue;
   const brightness=base[n]+base[n+1]+base[n+2],original=brightness<370?0:brightness<510?1:brightness<610?2:3;
   const wave=Math.sin(f*Math.PI/4+(y-top)*1.15+x*.8),delta=wave>.25?1:wave<-.25?-1:0,index=Math.max(0,Math.min(3,original+delta));
   b.set([...palette[index],base[n+3]],n);if(!b.subarray(n,n+3).equals(base.subarray(n,n+3)))count++;
  }
  for(let y=top+1;y<H;y++)for(let x=0;x<W;x++){const n=(y*W+x)*4;assert.equal(b[n+3],base[n+3],'Lower outline changed');}
  assert(count>0,'Interior must change color');changed.push(count);fire.frameData[key].dataURL='data:image/png;base64,'+png(b).toString('base64');
 }
 const atlas=Buffer.alloc(W*8*H*4);
 for(let f=0;f<8;f++){
  const out=Buffer.alloc(W*H*4);for(const l of p.layers.filter(l=>l.sheetIndex===si)){const b=decode(l.frameData[si+'_0_'+f].dataURL);for(let n=0;n<b.length;n+=4){const a=b[n+3]/255;if(!a)continue;const prev=out[n+3]/255,total=a+prev*(1-a);for(let c=0;c<3;c++)out[n+c]=Math.round((b[n+c]*a+out[n+c]*prev*(1-a))/total);out[n+3]=Math.round(total*255);}}for(let y=0;y<H;y++)out.copy(atlas,(y*W*8+f*W)*4,y*W*4,(y+1)*W*4);
 }
 p.spriteSheets[si].imageDataURL='data:image/png;base64,'+png(atlas,W*8,H).toString('base64');
 assert.equal(fire.frameData[si+'_0_0'].dataURL,before.layers.find(l=>l.name==='火'&&l.sheetIndex===si).frameData[si+'_0_0'].dataURL);p.layers.forEach((l,i)=>{if(l!==fire)assert.deepStrictEqual(l,before.layers[i]);});
 fs.writeFileSync(D+'/fire-color-contact.png',png(atlas,W*8,H));
 const save=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});assert(save.ok,await save.text());const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/fire-colors-readback.json',JSON.stringify(back));console.log(JSON.stringify({verified:'Fixed lower silhouette, moving interior colors, first frame preserved',interiorChangedPixels:changed}));
})();
