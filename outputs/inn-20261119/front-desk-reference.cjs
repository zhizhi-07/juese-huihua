const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,h=fs.readFileSync(D+'/../noodle-stove-20261118/complete.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
const read=file=>JSON.parse(fs.readFileSync(D+'/'+file,'utf8').replace(/^\uFEFF/,'')),ref=read('front-desk-samples.json'),bookRef=read('book-reference-samples.json');
const K=[47,59,61],woodColors=[K,[163,118,91],[150,106,83],[132,87,74],[116,75,68],[101,65,62]];
const distance=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0),snap=(rgb,colors)=>colors.reduce((a,b)=>distance(rgb,a)<=distance(rgb,b)?a:b);
const assets=[];
function asset(name,w,H){const pixels=Buffer.alloc(w*H*4);return {name,w,H,pixels,put(x,y,c){pixels.set([...c,255],(y*w+x)*4);}};}
const desk=asset('前台桌子',55,28);
for(let y=0;y<28;y++)for(let x=0;x<55;x++){
 if(y===0&&(x<45||x>53)||y>=1&&y<12&&x<44||y===27&&!(x>=2&&x<=3||x>=51&&x<=52))continue;
 let sx=x,sy=y;
 // Replace only the objects covering the desk, sampling exposed wood on the same row.
 if(y>=13&&y<=16&&x>=4&&x<=8||y>=13&&y<=18&&x>=10&&x<=20||y>=15&&y<=20&&x>=23&&x<=33||y>=15&&y<=18&&x>=36&&x<=41)sx=21+x%2;
 if(y>=8&&y<=18&&x>=45&&x<=52){sy=6;}
 if(y>=22&&y<=26&&x>=22&&x<=34)sx=16;
 const sampled=ref.desk[sy*55+sx];
 const darkOutline=Math.max(...sampled)<85&&sampled[1]>=sampled[0]*.85&&sampled[2]>=sampled[0]*.9;
 let color=darkOutline?K:snap(sampled,woodColors.slice(1));
 if(y===0||x===0||x===54||y===21||y===12&&x<44||y<12&&x===44||y===26&&x>=4&&x<=50||y===27)color=K;
 desk.put(x,y,color);
}
assets.push(desk);
const book=asset('登记簿',11,7),paperColors=[K,[109,67,64],[232,224,186],[214,210,174],[177,170,140],[145,163,121],[112,139,99]];
for(let y=0;y<7;y++)for(let x=0;x<11;x++)book.put(x,y,x===0||x===10||y===0||y===6?K:snap(bookRef[y*11+x],paperColors));
assets.push(book);
const sign=asset('旅馆招牌',21,9),signColors=[K,[164,120,88],[139,93,72],[117,70,65],[98,57,60],[231,222,184],[206,195,153],[174,156,119]];
for(let y=0;y<9;y++)for(let x=0;x<21;x++){
 if(y===0&&(x===0||x===20)||y===8&&(x<2||x>18)||y===7&&(x===0||x===20))continue;
 let c=snap(ref.sign[(y+1)*21+x],signColors);
 if(y===8||x===0||x===20||(y===0||y===7)&&(x===1||x===19))c=K;
 sign.put(x,y,c);
}
assets.push(sign);
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 fs.writeFileSync(D+'/before-reference-correction.json',raw);fs.writeFileSync(D+'/before-reference-correction.etag',etag);fs.writeFileSync(D+'/before-reference-correction.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 const changed=[];
 for(const {name,w,H,pixels} of assets){
  const si=p.spriteSheets.findIndex(s=>s.name===name);assert(si>=0);changed.push(si);
  const s=p.spriteSheets[si],layer=p.layers.filter(l=>l.sheetIndex===si);assert.equal(layer.length,1);
  const data='data:image/png;base64,'+png(pixels,w,H).toString('base64');s.frameWidth=w;s.frameHeight=H;s.imageDataURL=data;Object.assign(s.actions[0].frames[0],{width:w,height:H});
  layer[0].frameData[si+'_0_0']={width:w,height:H,dataURL:data};
  fs.writeFileSync(D+'/'+name+'-reference.png',png(pixels,w,H));const scale=w>30?16:28,large=Buffer.alloc(w*H*scale*scale*4);
  for(let y=0;y<H*scale;y++)for(let x=0;x<w*scale;x++){const i=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;pixels.copy(large,(y*w*scale+x)*4,i,i+4);}
  fs.writeFileSync(D+'/'+name+'-reference-preview.png',png(large,w*scale,H*scale));
 }
 assert.deepStrictEqual(p.spriteSheets.filter((_,i)=>!changed.includes(i)),before.spriteSheets.filter((_,i)=>!changed.includes(i)));assert.deepStrictEqual(p.layers.filter(l=>!changed.includes(l.sheetIndex)),before.layers.filter(l=>!changed.includes(l.sheetIndex)));assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);
 fs.writeFileSync(D+'/reference-correction-candidate.json',JSON.stringify(p));
 if(!process.argv.includes('--save'))return console.log('Reference-based previews ready: sampled visible desk/book/sign pixels; only occluded desk areas reconstructed.');
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/reference-correction-readback.json',JSON.stringify(back));console.log('Verified reference corrections to three materials only; all other assets and scene layout preserved.');
})().catch(e=>{console.error(e);process.exitCode=1;});
