const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib);
const samples=JSON.parse(fs.readFileSync(D+'/rack-samples.json','utf8').replace(/^\uFEFF/,''));
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
 fs.writeFileSync(D+'/before-rack.json',raw);fs.writeFileSync(D+'/before-rack.etag',etag);fs.writeFileSync(D+'/before-rack.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 const mask=['.###############.','#################','#################','.###############.','..###...###..###.','..###...###..###.','..###...###..###.','.#####..###.#####','#################','#################','.#####.#####.###.','..###...###......'];
 for(const [name,key,w,h] of [['厨具挂架','rack',17,12]]){
  assert.equal(samples.length,w*h);assert(mask.every(row=>row.length===w));
  const pixels=Buffer.alloc(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   if(mask[y][x]==='.')continue;
   let rgb=samples[y*w+x];
   const potBody=(y===7||y===10)?x>=2&&x<=4:(y===8||y===9)&&x>=1&&x<=5;
   if(Math.max(...rgb)<110&&!potBody)rgb=[47,59,61];
   pixels.set([...rgb,255],(y*w+x)*4);
  }
  const oldIndex=p.spriteSheets.findIndex(s=>s.name===name);
  assert(oldIndex<0||oldIndex===p.spriteSheets.length-1);
  if(oldIndex>=0){p.spriteSheets.pop();p.layers=p.layers.filter(l=>l.sheetIndex!==oldIndex);}
  const encoded=png(pixels,w,h),data=uri(encoded),si=p.spriteSheets.length;
  p.spriteSheets.push({name,frameWidth:w,frameHeight:h,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:data,actions:[{name,direction:'',frames:[{sheetIndex:si,sourceX:0,sourceY:0,width:w,height:h,locked:false,lockedRegions:[],status:'completed',duration:0}]}]});
  p.layers.push({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData:{[si+'_0_0']:{width:w,height:h,dataURL:data}}});
  fs.writeFileSync(D+'/'+name+'.png',encoded);
  const scale=28,large=Buffer.alloc(w*h*scale*scale*4);
  for(let y=0;y<h*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;pixels.copy(large,(y*w*scale+x)*4,n,n+4);}
  fs.writeFileSync(D+'/'+name+'-preview.png',png(large,w*scale,h*scale));
 }
 p.currentSheetIndex=p.spriteSheets.length-1;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.length-1;
 const untouched=before.spriteSheets.filter(s=>s.name!=='厨具挂架');
 assert.deepStrictEqual(p.spriteSheets.slice(0,untouched.length),untouched);assert.deepStrictEqual(p.layers.filter(l=>l.sheetIndex<untouched.length),before.layers.filter(l=>l.sheetIndex<untouched.length));
 fs.writeFileSync(D+'/rack-candidate.json',JSON.stringify(p));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/rack-readback.json',JSON.stringify(back));
 console.log('Verified: rack 17x12; all existing sheets and layers unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
