const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib);
const samples=JSON.parse(fs.readFileSync(D+'/poster-rug-samples.json','utf8').replace(/^\uFEFF/,''));
const poster=[
'......##......','.....#..#.....','....#....#....',
'.############.','##############',
'.############.','.############.','.############.',
'.############.','.############.','.############.',
'.############.','.############.','.############.',
'.############.','.############.','.############.',
'##############','##############'];
const uri=b=>'data:image/png;base64,'+b.toString('base64');
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),p=JSON.parse(raw),before=JSON.parse(raw),etag=r.headers.get('etag');assert(etag);
 fs.writeFileSync(D+'/before-poster-rug.json',raw);fs.writeFileSync(D+'/before-poster-rug.etag',etag);fs.writeFileSync(D+'/before-poster-rug.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 for(const [name,key,w,h] of [['海报','poster',14,19],['地毯','rug',19,10]]){
  assert(!p.spriteSheets.some(s=>s.name===name));assert.equal(samples[key].length,w*h);
  const pixels=Buffer.alloc(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   if(key==='poster'&&poster[y][x]==='.')continue;
   if(key==='rug'&&(y===0||y===h-1)&&(x===0||x===w-1))continue;
   let rgb=samples[key][y*w+x];
   if(Math.max(...rgb)<110)rgb=[47,59,61];
   pixels.set([...rgb,255],(y*w+x)*4);
  }
  const encoded=png(pixels,w,h),data=uri(encoded),si=p.spriteSheets.length;
  p.spriteSheets.push({name,frameWidth:w,frameHeight:h,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:data,actions:[{name,direction:'',frames:[{sheetIndex:si,sourceX:0,sourceY:0,width:w,height:h,locked:false,lockedRegions:[],status:'completed',duration:0}]}]});
  p.layers.push({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData:{[si+'_0_0']:{width:w,height:h,dataURL:data}}});
  fs.writeFileSync(D+'/'+name+'.png',encoded);
  const scale=28,large=Buffer.alloc(w*h*scale*scale*4);
  for(let y=0;y<h*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;pixels.copy(large,(y*w*scale+x)*4,n,n+4);}
  fs.writeFileSync(D+'/'+name+'-preview.png',png(large,w*scale,h*scale));
 }
 p.currentSheetIndex=before.spriteSheets.length;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=before.layers.length;
 assert.deepStrictEqual(p.spriteSheets.slice(0,before.spriteSheets.length),before.spriteSheets);assert.deepStrictEqual(p.layers.slice(0,before.layers.length),before.layers);
 fs.writeFileSync(D+'/poster-rug-candidate.json',JSON.stringify(p));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/poster-rug-readback.json',JSON.stringify(back));
 console.log('Verified: 海报 14x19, 地毯 19x10; all existing sheets and layers unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
