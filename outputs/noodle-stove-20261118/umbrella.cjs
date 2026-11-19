const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib);
const samples=JSON.parse(fs.readFileSync(D+'/umbrella-samples.json','utf8').replace(/^\uFEFF/,''));
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const name='雨伞桶',w=9,h=16;
 const existing=p.spriteSheets.findIndex(s=>s.name===name);assert(existing<0||existing===p.spriteSheets.length-1);
 if(existing>=0){p.spriteSheets.pop();p.layers=p.layers.filter(l=>l.sheetIndex!==existing);}
 const si=p.spriteSheets.length;assert.equal(samples.length,w*h);
 fs.writeFileSync(D+'/before-umbrella.json',raw);fs.writeFileSync(D+'/before-umbrella.etag',etag);fs.writeFileSync(D+'/before-umbrella.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 const K=[47,59,61],bucket=Buffer.alloc(w*h*4),umbrellas=Buffer.alloc(w*h*4);
 const put=(b,x,y,c)=>b.set([...c,255],(y*w+x)*4);
 for(let y=6;y<h;y++)for(let x=0;x<w;x++){
  if(y===15&&(x===0||x===8))continue;
  let rgb=samples[y*w+x];
  if(y<=7&&x>=2&&x<=6)rgb=K;
  if(y===8&&x>=2&&x<=6)rgb=samples[8*w+1];
  if(x===0||x===8||y===15)rgb=K;
  put(bucket,x,y,rgb);
 }
 const mask=['..###..#.','.###..###','.###.####','.###.####','.########','.########','..######.','...####..','...###...'];
 assert(mask.every(row=>row.length===w));
 for(let y=0;y<mask.length;y++)for(let x=0;x<w;x++)if(mask[y][x]==='#'){
  let rgb=samples[y*w+x];
  const color=(x===3&&y===0)||(x===2&&y>=1&&y<=3)||(x>=2&&x<=3&&y>=4&&y<=7)||(x===7&&y===1)||(x===6&&(y===2||y===3))||(x>=5&&x<=7&&y===4)||(x>=5&&x<=6&&y===5)||(x===5&&(y===6||y===7));
  if(!color)rgb=K;
  put(umbrellas,x,y,rgb);
 }
 const uri=b=>'data:image/png;base64,'+png(b,w,h).toString('base64'),all=Buffer.from(bucket);
 for(let i=0;i<all.length;i+=4)if(umbrellas[i+3])umbrellas.copy(all,i,i,i+4);
 const data=uri(all);
 p.spriteSheets.push({name,frameWidth:w,frameHeight:h,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:data,actions:[{name,direction:'',frames:[{sheetIndex:si,sourceX:0,sourceY:0,width:w,height:h,locked:false,lockedRegions:[],status:'completed',duration:0}]}]});
 for(const [layer,b] of [['空桶',bucket],['雨伞',umbrellas]])p.layers.push({sheetIndex:si,parent:null,name:layer,visible:true,locked:false,opacity:1,frameData:{[si+'_0_0']:{width:w,height:h,dataURL:uri(b)}}});
 p.currentSheetIndex=si;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.length-1;
 assert.deepStrictEqual(p.spriteSheets.slice(0,si),before.spriteSheets.slice(0,si));assert.deepStrictEqual(p.layers.filter(l=>l.sheetIndex<si),before.layers.filter(l=>l.sheetIndex<si));assert.equal(p.layers.filter(l=>l.sheetIndex===si).length,2);
 for(let y=6;y<h;y++)for(let x=1;x<w-1;x++)assert.equal(bucket[(y*w+x)*4+3],255);
 for(const [file,b] of [['雨伞桶',all],['空桶',bucket],['雨伞',umbrellas]]){
  fs.writeFileSync(D+'/'+file+'.png',png(b,w,h));const scale=32,large=Buffer.alloc(w*h*scale*scale*4);
  for(let y=0;y<h*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;b.copy(large,(y*w*scale+x)*4,n,n+4);}
  fs.writeFileSync(D+'/'+file+'-preview.png',png(large,w*scale,h*scale));
 }
 fs.writeFileSync(D+'/umbrella-candidate.json',JSON.stringify(p));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/umbrella-readback.json',JSON.stringify(back));console.log('Verified umbrella stand 9x16, two layers: complete empty bucket and umbrellas; existing assets unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
