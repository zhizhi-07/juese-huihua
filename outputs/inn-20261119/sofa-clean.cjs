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
 fs.writeFileSync(D+'/before-sofa-clean.json',raw);fs.writeFileSync(D+'/before-sofa-clean.etag',etag);fs.writeFileSync(D+'/before-sofa-clean.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 for(let a=0;a<2;a++){
  const key=si+'_'+a+'_0',old=decode(l.frameData[key].dataURL,W,H),b=Buffer.alloc(old.length);
  const opaque=(x,y)=>x>=0&&x<W&&y>=0&&y<H&&old[(y*W+x)*4+3]>0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   if(!opaque(x,y))continue;
   let c=C.back;
   if(a===0){
    if(y<=2)c=C.light;
    if(y===3)c=C.seat;
    if(y>=7&&y<=16&&(x<=4||x>=27))c=C.seat;
    if(y>=8&&y<=14&&(x===2||x===3||x===28||x===29))c=C.light;
    if(y>=15&&(x<=4||x>=27))c=C.shade;
    if(y>=11&&y<=15&&x>=5&&x<=26)c=y===11?C.light:C.seat;
    if(y>=16)c=C.shade;
    if(y>=11&&y<=16&&(x===5||x===16||x===26))c=C.shade;
    if(y===10&&x>=6&&x<=25||y>=10&&y<=16&&(x===4||x===27))c=C.edge;
   }else{
    if(y<=12)c=C.seat;
    if(y>=8&&y<=15&&(x===2||x===3||x===27||x===28))c=C.light;
    if(y===10&&x>=5&&x<=25)c=C.light;
    if(y===11&&x>=5&&x<=25)c=C.seat;
    if(y>=12&&y<=18&&x>=4&&x<=26)c=C.back;
    if(y>=17&&(x<=3||x>=27)||y===19)c=C.shade;
   }
   if([[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([X,Y])=>!opaque(X,Y)))c=C.edge;
   b.set([...c,old[(y*W+x)*4+3]],(y*W+x)*4);
  }
  const colors=new Set();for(let i=0;i<b.length;i+=4){assert.equal(b[i+3],old[i+3]);if(b[i+3])colors.add(b.subarray(i,i+3).toString('hex'));}assert.equal(colors.size,5);
  // Large surfaces use uninterrupted fills; only seams and edge strips vary.
  for(let y=4;y<=8;y++)for(let x=7;x<=24;x++)if(a===0){const i=(y*W+x)*4;assert.deepStrictEqual([...b.subarray(i,i+3)],C.back);}
  for(let y=13;y<=18;y++)for(let x=5;x<=25;x++)if(a===1){const i=(y*W+x)*4;assert.deepStrictEqual([...b.subarray(i,i+3)],C.back);}
  images.push(b);l.frameData[key].dataURL='data:image/png;base64,'+png(b,W,H).toString('base64');
  const scale=20,large=Buffer.alloc(W*H*scale*scale*4);
  for(let y=0;y<H*scale;y++)for(let x=0;x<W*scale;x++){const i=(Math.floor(y/scale)*W+Math.floor(x/scale))*4;b.copy(large,(y*W*scale+x)*4,i,i+4);}
  fs.writeFileSync(D+'/沙发-'+(a===0?'正面':'背面')+'-干净版.png',png(large,W*scale,H*scale));
 }
 s.imageDataURL='data:image/png;base64,'+png(Buffer.concat(images),W,H*2).toString('base64');
 assert.deepStrictEqual(s.actions,before.spriteSheets[si].actions);assert.deepStrictEqual(p.spriteSheets.filter((_,i)=>i!==si),before.spriteSheets.filter((_,i)=>i!==si));assert.deepStrictEqual(p.layers.filter(layer=>layer.sheetIndex!==si),before.layers.filter(layer=>layer.sheetIndex!==si));assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);
 fs.writeFileSync(D+'/sofa-clean-candidate.json',JSON.stringify(p));
 if(!process.argv.includes('--save'))return console.log('Clean five-color sofa preview ready; original silhouette and directions preserved, no surface speckles.');
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/sofa-clean-readback.json',JSON.stringify(back));console.log('Verified clean sofa: 5 coherent colors, flat surfaces, restrained edge shading; other assets unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
