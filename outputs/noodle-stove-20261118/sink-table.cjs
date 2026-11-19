const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib);
const samples=JSON.parse(fs.readFileSync(D+'/sink-table-samples.json','utf8').replace(/^\uFEFF/,''));
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 fs.writeFileSync(D+'/before-sink-table.json',raw);fs.writeFileSync(D+'/before-sink-table.etag',etag);fs.writeFileSync(D+'/before-sink-table.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 const K=[47,59,61];
 for(const [name,key,w,h] of [['洗手池','sink',13,16],['备菜桌','table',13,13]]){
  const existing=p.spriteSheets.findIndex(s=>s.name===name);
  const target=existing<0?p.spriteSheets.length:existing;
  const pixels=Buffer.alloc(w*h*4),put=(x,y,c)=>pixels.set([...c,255],(y*w+x)*4);
  if(key==='sink'){
   for(let y=0;y<14;y++)for(let x=0;x<w;x++){
    let rgb=samples.sink[y*w+x];
    // Restore the basin rim and interior concealed by the vegetables.
    if(y>=10&&x>=2&&x<=9)rgb=y===12?samples.sink[12*w+11]:x<=3?samples.sink[9*w+3]:samples.sink[9*w+6];
    if(x===0||x===12||y===0||y===13)rgb=K;
    put(x,y+2,rgb);
   }
   for(let x=4;x<=8;x++)put(x,0,K);
   for(let x=4;x<=8;x++)put(x,1,x===4||x===8?K:[166,170,172]);
  }else{
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    // Use the exposed right-hand tabletop to fill the area under the food.
    const sourceX=11,sourceY=Math.min(y,8);
    let rgb=samples.table[sourceY*w+sourceX];
    if(x===0||x===12||y===0||y===h-1)rgb=K;
    put(x,y,rgb);
   }
  }
  const data='data:image/png;base64,'+png(pixels,w,h).toString('base64'),si=target;
  p.spriteSheets[si]={name,frameWidth:w,frameHeight:h,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:data,actions:[{name,direction:'',frames:[{sheetIndex:si,sourceX:0,sourceY:0,width:w,height:h,locked:false,lockedRegions:[],status:'completed',duration:0}]}]};
  p.layers=p.layers.filter(l=>l.sheetIndex!==si);
  p.layers.push({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData:{[si+'_0_0']:{width:w,height:h,dataURL:data}}});
  fs.writeFileSync(D+'/'+name+'.png',png(pixels,w,h));const scale=32,large=Buffer.alloc(w*h*scale*scale*4);
  for(let y=0;y<h*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;pixels.copy(large,(y*w*scale+x)*4,n,n+4);}
  fs.writeFileSync(D+'/'+name+'-preview.png',png(large,w*scale,h*scale));
 }
 p.currentSheetIndex=p.spriteSheets.findIndex(s=>s.name==='洗手池');p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.findIndex(l=>l.sheetIndex===p.currentSheetIndex);
 const keep=s=>!['洗手池','备菜桌'].includes(s.name);
 assert.deepStrictEqual(p.spriteSheets.filter(keep),before.spriteSheets.filter(keep));assert.deepStrictEqual(p.layers.filter(keep),before.layers.filter(keep));
 fs.writeFileSync(D+'/sink-table-candidate.json',JSON.stringify(p));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/sink-table-readback.json',JSON.stringify(back));console.log('Verified sink and cleared preparation table; other assets unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
