const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib);
const samples=JSON.parse(fs.readFileSync(D+'/partition-samples.json','utf8').replace(/^\uFEFF/,''));
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const name='隔断',w=24,h=20;
 const existing=p.spriteSheets.findIndex(s=>s.name===name);assert(existing<0||existing===p.spriteSheets.length-1);
 if(existing>=0){p.spriteSheets.pop();p.layers=p.layers.filter(l=>l.sheetIndex!==existing);}
 const si=p.spriteSheets.length;assert.equal(samples.length,w*h);
 fs.writeFileSync(D+'/before-partition.json',raw);fs.writeFileSync(D+'/before-partition.etag',etag);fs.writeFileSync(D+'/before-partition.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 const pixels=Buffer.alloc(w*h*4),K=[47,59,61];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if(y>10&&x>9)continue;
  let rgb=samples[y*w+x];
  // The bottle hides a few cells of the horizontal panel and its bottom border.
  if(y===9&&x>=10&&x<=14)rgb=samples[y*w+16];
  if(y===0||x===0||(x===23&&y<=10)||(y===10&&x>=10)||(x===9&&y>=8)||y===19||Math.max(...rgb)<80)rgb=K;
  pixels.set([...rgb,255],(y*w+x)*4);
 }
 const data='data:image/png;base64,'+png(pixels,w,h).toString('base64');
 p.spriteSheets.push({name,frameWidth:w,frameHeight:h,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:data,actions:[{name,direction:'',frames:[{sheetIndex:si,sourceX:0,sourceY:0,width:w,height:h,locked:false,lockedRegions:[],status:'completed',duration:0}]}]});
 p.layers.push({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData:{[si+'_0_0']:{width:w,height:h,dataURL:data}}});
 p.currentSheetIndex=si;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.length-1;
 assert.deepStrictEqual(p.spriteSheets.slice(0,si),before.spriteSheets.slice(0,si));assert.deepStrictEqual(p.layers.filter(l=>l.sheetIndex<si),before.layers.filter(l=>l.sheetIndex<si));
 fs.writeFileSync(D+'/隔断.png',png(pixels,w,h));
 const scale=24,large=Buffer.alloc(w*h*scale*scale*4);
 for(let y=0;y<h*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;pixels.copy(large,(y*w*scale+x)*4,n,n+4);}
 fs.writeFileSync(D+'/隔断-preview.png',png(large,w*scale,h*scale));fs.writeFileSync(D+'/partition-candidate.json',JSON.stringify(p));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/partition-readback.json',JSON.stringify(back));
 console.log('Verified partition 24x20; existing sheets and layers unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
