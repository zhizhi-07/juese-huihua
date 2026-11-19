const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,h=fs.readFileSync(D+'/../noodle-stove-20261118/complete.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
const ref=JSON.parse(fs.readFileSync(D+'/front-desk-samples.json','utf8').replace(/^\uFEFF/,'')),K=[47,59,61];
const distance=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);
// Extract the palette from the reference instead of choosing replacement colors.
function reduceColors(colors,count){
 const points=colors.filter(c=>c&&c!==K),centers=[points[0].slice()];
 while(centers.length<count)centers.push(points.reduce((a,b)=>Math.min(...centers.map(c=>distance(b,c)))>Math.min(...centers.map(c=>distance(a,c)))?b:a).slice());
 for(let pass=0;pass<20;pass++){
  const groups=centers.map(()=>[]);
  for(const c of points){let best=0;for(let i=1;i<centers.length;i++)if(distance(c,centers[i])<distance(c,centers[best]))best=i;groups[best].push(c);}
  for(let i=0;i<centers.length;i++)if(groups[i].length)centers[i]=[0,1,2].map(k=>Math.round(groups[i].reduce((s,c)=>s+c[k],0)/groups[i].length));
 }
 return colors.map(c=>!c?null:c===K?K:centers.reduce((a,b)=>distance(c,a)<=distance(c,b)?a:b));
}
const assets=[];
const desk=[];
for(let y=0;y<28;y++)for(let x=0;x<55;x++){
 if(y===0&&(x<45||x>53)||y>0&&y<12&&x<44||y===27&&!(x>=2&&x<=3||x>=51&&x<=52)){desk.push(null);continue;}
 let sx=x,sy=y;
 const plant=y>=13&&y<=16&&x>=4&&x<=8,book=y>=13&&y<=18&&x>=10&&x<=20;
 const guest=y>=15&&y<=20&&x>=23&&x<=33,cup=y>=15&&y<=18&&x>=36&&x<=41;
 if(plant||book||guest||cup)sx=21+x%2;
 if(y>=8&&y<=18&&x>=45&&x<=52)sy=6;
 if(y>=22&&y<=26&&x>=22&&x<=34)sx=16;
 let c=ref.desk[sy*55+sx];
 if(y===0||x===0||x===54||y===21||y===12&&x<44||y<12&&x===44||y===26&&x>=4&&x<=50||y===27)c=K;
 desk.push(c);
}
assets.push({name:'前台桌子',w:55,H:28,colors:reduceColors(desk,7)});
const book=ref.book.map((c,i)=>{
 const x=i%11,y=Math.floor(i/11);
 if(y===0&&(x===0||x===10))return null;
 if(y===5||y>0&&(x===0||x===10))return K;
 return c;
});
assets.push({name:'登记簿',w:11,H:6,colors:reduceColors(book,5)});
const sign=[];
for(let y=0;y<9;y++)for(let x=0;x<21;x++){
 if(y===0&&(x===0||x===20)||y===8&&(x<2||x>18)||y===7&&(x===0||x===20)){sign.push(null);continue;}
 sign.push(y===8||x===0||x===20||(y===0||y===7)&&(x===1||x===19)?K:ref.sign[(y+1)*21+x]);
}
assets.push({name:'旅馆招牌',w:21,H:9,colors:reduceColors(sign,7)});
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 fs.writeFileSync(D+'/before-direct-copy.json',raw);fs.writeFileSync(D+'/before-direct-copy.etag',etag);fs.writeFileSync(D+'/before-direct-copy.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 const indices=[];
 for(const {name,w,H,colors} of assets){
  assert.equal(colors.length,w*H);const b=Buffer.alloc(w*H*4);colors.forEach((c,i)=>{if(c)b.set([...c,255],i*4);});
  const si=p.spriteSheets.findIndex(s=>s.name===name);assert(si>=0);indices.push(si);
  const s=p.spriteSheets[si],layers=p.layers.filter(l=>l.sheetIndex===si);assert.equal(layers.length,1);
  const data='data:image/png;base64,'+png(b,w,H).toString('base64');Object.assign(s,{frameWidth:w,frameHeight:H,imageDataURL:data});Object.assign(s.actions[0].frames[0],{width:w,height:H});layers[0].frameData[si+'_0_0']={width:w,height:H,dataURL:data};
  fs.writeFileSync(D+'/'+name+'-copy.png',png(b,w,H));const scale=w>30?16:32,large=Buffer.alloc(w*H*scale*scale*4);
  for(let y=0;y<H*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;b.copy(large,(y*w*scale+x)*4,n,n+4);}
  fs.writeFileSync(D+'/'+name+'-copy-preview.png',png(large,w*scale,H*scale));
 }
 assert.deepStrictEqual(p.spriteSheets.filter((_,i)=>!indices.includes(i)),before.spriteSheets.filter((_,i)=>!indices.includes(i)));assert.deepStrictEqual(p.layers.filter(l=>!indices.includes(l.sheetIndex)),before.layers.filter(l=>!indices.includes(l.sheetIndex)));assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);
 fs.writeFileSync(D+'/direct-copy-candidate.json',JSON.stringify(p));
 if(!process.argv.includes('--save'))return console.log('Three reference-sampled candidates rendered; palettes derived from source, book proportions restored.');
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/direct-copy-readback.json',JSON.stringify(back));console.log('Saved and verified three corrected materials; other assets unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
