const fs=require('fs'),zlib=require('zlib'),assert=require('assert');
const D=__dirname,W=40,H=36;
const helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib','W','H',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib,W,H);
function decode(uri){const b=Buffer.from(uri.split(',')[1],'base64'),parts=[];for(let n=8;n<b.length;){const length=b.readUInt32BE(n);if(b.toString('ascii',n+4,n+8)==='IDAT')parts.push(b.subarray(n+8,n+8+length));n+=length+12;}const rows=zlib.inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(W*H*4);for(let y=0;y<H;y++){const filter=rows[y*(W*4+1)];for(let x=0;x<W*4;x++){const n=y*W*4+x,a=x>=4?pixels[n-4]:0,b=y?pixels[n-W*4]:0,c=y&&x>=4?pixels[n-W*4-4]:0;let v=0;if(filter===1)v=a;if(filter===2)v=b;if(filter===3)v=Math.floor((a+b)/2);if(filter===4){const q=a+b-c,A=Math.abs(q-a),B=Math.abs(q-b),C=Math.abs(q-c);v=A<=B&&A<=C?a:B<=C?b:c;}pixels[n]=(rows[y*(W*4+1)+1+x]+v)&255;}}return pixels;}


(async()=>{
const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url),raw=await r.text(),p=JSON.parse(raw);
fs.writeFileSync(D+'/before-fire-tips.json',raw);fs.writeFileSync(D+'/before-fire-tips.etag',r.headers.get('etag'));
const si=p.spriteSheets.findIndex(s=>s.name==='灶台'),fire=p.layers.find(l=>l.sheetIndex===si&&l.name==='火'),base=decode(fire.frameData[si+'_0_0'].dataURL);
const rows=[];for(let y=0;y<H;y++){let count=0;for(let x=0;x<W;x++)if(base[(y*W+x)*4+3])count++;if(count)rows.push({y,count});}assert(rows.length>=3);
console.log('Fire rows: '+JSON.stringify(rows));
fs.writeFileSync(D+'/fire-first-current.png',png(base));
const top=rows[0].y,tips=[];for(let x=0;x<W;x++)if(base[(top*W+x)*4+3])tips.push(x);
const motions=[[0,0],[1,0],[0,-1],[-1,0],[0,1],[1,1],[0,-1],[-1,-1]],uri=b=>'data:image/png;base64,'+png(b).toString('base64');
for(let f=1;f<8;f++){
 const b=Buffer.from(base);b.fill(0,top*W*4,(top+1)*W*4);
 tips.forEach((x,i)=>{let X=x+motions[f][i%2];if(X<0||X>=W||!base[((top+1)*W+X)*4+3])X=x;const n=(top*W+X)*4,old=(top*W+x)*4;b.set([Math.min(255,base[old]+(f%3-1)*8),Math.min(255,base[old+1]+(f%3-1)*5),base[old+2],base[old+3]],n);});
 for(let y=top+1;y<H;y++)assert(b.subarray(y*W*4,(y+1)*W*4).equals(base.subarray(y*W*4,(y+1)*W*4)),'Lower fire must remain exactly unchanged');
 fire.frameData[si+'_0_'+f].dataURL=uri(b);
}
const before=JSON.parse(raw);assert.equal(fire.frameData[si+'_0_0'].dataURL,before.layers.find(l=>l.name==='火'&&l.sheetIndex===si).frameData[si+'_0_0'].dataURL);
const sheet=p.spriteSheets[si],atlas=Buffer.alloc(W*8*H*4);
for(let f=0;f<8;f++){
 const out=Buffer.alloc(W*H*4);for(const l of p.layers.filter(l=>l.sheetIndex===si)){const b=decode(l.frameData[si+'_0_'+f].dataURL);for(let n=0;n<b.length;n+=4){const a=b[n+3]/255;if(!a)continue;const prev=out[n+3]/255,total=a+prev*(1-a);for(let c=0;c<3;c++)out[n+c]=Math.round((b[n+c]*a+out[n+c]*prev*(1-a))/total);out[n+3]=Math.round(total*255);}}for(let y=0;y<H;y++)out.copy(atlas,(y*W*8+f*W)*4,y*W*4,(y+1)*W*4);
}
sheet.imageDataURL='data:image/png;base64,'+png(atlas,W*8,H).toString('base64');
for(let i=0;i<p.layers.length;i++)if(p.layers[i]!==fire)assert.deepStrictEqual(p.layers[i],before.layers[i]);
fs.writeFileSync(D+'/fire-tips-contact.png',png(atlas,W*8,H));
const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':r.headers.get('etag')},body:JSON.stringify(p)});assert(saved.ok,await saved.text());const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/fire-tips-readback.json',JSON.stringify(back));console.log('Verified first frame preserved; only top flame tips animate; every lower pixel identical to user first frame.');
})();
