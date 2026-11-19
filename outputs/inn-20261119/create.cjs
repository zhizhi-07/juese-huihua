const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,h=fs.readFileSync(D+'/../noodle-stove-20261118/complete.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
const samples=JSON.parse(fs.readFileSync(D+'/samples.json','utf8').replace(/^\uFEFF/,'')),K=[47,59,61];
const p={version:'1.0',name:'旅馆',bgColor:'#ffffff',gridColor:'rgba(48,68,62,.2)',currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,currentLayerIndex:0,palette:[{r:47,g:59,b:61,a:255}],spriteSheets:[],layers:[],sceneAssembly:{version:1,width:160,height:128,objects:[]}};
for(const [name,key,w,H] of [['前台钥匙挂板','keys',18,11],['墙挂地图','map',18,14]]){
 assert.equal(samples[key].length,w*H);const pixels=Buffer.alloc(w*H*4);
 for(let y=0;y<H;y++)for(let x=0;x<w;x++){
  let rgb=samples[key][y*w+x];
  if(x===0||x===w-1||y===0||y===H-1)rgb=K;
  if(key==='keys'){
   if((y===3||y===8)&&[2,6,10,14].includes(x))rgb=K;
   // The lower two keys extend across the bottom frame in the reference.
   if(y===H-1&&[2,6].includes(x))rgb=samples.keys[y*w+x];
  }
  pixels.set([...rgb,255],(y*w+x)*4);
 }
 const si=p.spriteSheets.length,data='data:image/png;base64,'+png(pixels,w,H).toString('base64');
 p.spriteSheets.push({name,frameWidth:w,frameHeight:H,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:data,actions:[{name,direction:'',frames:[{sheetIndex:si,sourceX:0,sourceY:0,width:w,height:H,locked:false,lockedRegions:[],status:'completed',duration:0}]}]});
 p.layers.push({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData:{[si+'_0_0']:{width:w,height:H,dataURL:data}}});
 fs.writeFileSync(D+'/'+name+'.png',png(pixels,w,H));const scale=26,large=Buffer.alloc(w*H*scale*scale*4);
 for(let y=0;y<H*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;pixels.copy(large,(y*w*scale+x)*4,n,n+4);}
 fs.writeFileSync(D+'/'+name+'-preview.png',png(large,w*scale,H*scale));
}
assert.equal(p.spriteSheets.length,2);assert.equal(p.layers.length,2);
fs.writeFileSync(D+'/candidate.json',JSON.stringify(p));
(async()=>{
 const base='http://127.0.0.1:8765',id='scene-inn-20261119',url=base+'/api/project?id='+id;
 const list=await(await fetch(base+'/api/projects')).json();assert(!list.some(s=>s.id===id),'旅馆工程已存在，停止重复新建');
 const probe=await fetch(url);assert.equal(probe.status,404);fs.writeFileSync(D+'/before-new-project.json',await probe.text());
 if(!process.argv.includes('--save'))return console.log('New 旅馆 preview ready; not saved yet.');
 const oldURL=base+'/api/project?id=scene-noodle-shop-20261118',old=await fetch(oldURL),oldBytes=Buffer.from(await old.arrayBuffer());
 fs.writeFileSync(D+'/noodle-before.json',oldBytes);fs.writeFileSync(D+'/noodle-before.etag',old.headers.get('etag'));fs.writeFileSync(D+'/noodle-before.sha256',crypto.createHash('sha256').update(oldBytes).digest('hex'));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':'none'},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const read=await fetch(url),back=await read.json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/readback.json',JSON.stringify(back));fs.writeFileSync(D+'/readback.etag',read.headers.get('etag'));
 const projects=await(await fetch(base+'/api/projects')).json();assert(projects.some(s=>s.id===id&&s.name==='旅馆'));
 const oldAfter=await fetch(oldURL);assert.equal(oldAfter.headers.get('etag'),old.headers.get('etag'));
 console.log('Verified new 旅馆 project, key board and map; 面馆 revision unchanged. URL: http://192.168.43.40:8765/?project='+id);
})().catch(e=>{console.error(e);process.exitCode=1;});
