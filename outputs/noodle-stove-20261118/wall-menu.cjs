const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,helper=fs.readFileSync(D+'/complete.cjs','utf8');
const png=Function('zlib',helper.slice(helper.indexOf('function crc('),helper.indexOf('function fill('))+';return png;')(zlib);
const samples=JSON.parse(fs.readFileSync(D+'/wall-menu-samples.json','utf8').replace(/^\uFEFF/,''));
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-noodle-shop-20261118',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const name='墙挂价目菜单',w=16,h=10,si=p.spriteSheets.length;assert(!p.spriteSheets.some(s=>s.name===name));assert.equal(samples.length,w*h);
 fs.writeFileSync(D+'/before-wall-menu.json',raw);fs.writeFileSync(D+'/before-wall-menu.etag',etag);fs.writeFileSync(D+'/before-wall-menu.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 const pixels=Buffer.alloc(w*h*4),K=[47,59,61];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const rgb=x===0||x===w-1||y===0||y===h-1?K:samples[y*w+x];
  pixels.set([...rgb,255],(y*w+x)*4);
 }
 const data='data:image/png;base64,'+png(pixels,w,h).toString('base64');
 p.spriteSheets.push({name,frameWidth:w,frameHeight:h,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:data,actions:[{name,direction:'',frames:[{sheetIndex:si,sourceX:0,sourceY:0,width:w,height:h,locked:false,lockedRegions:[],status:'completed',duration:0}]}]});
 p.layers.push({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData:{[si+'_0_0']:{width:w,height:h,dataURL:data}}});
 p.currentSheetIndex=si;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.length-1;
 assert.deepStrictEqual(p.spriteSheets.slice(0,si),before.spriteSheets);assert.deepStrictEqual(p.layers.slice(0,before.layers.length),before.layers);
 fs.writeFileSync(D+'/'+name+'.png',png(pixels,w,h));
 const scale=32,large=Buffer.alloc(w*h*scale*scale*4);
 for(let y=0;y<h*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;pixels.copy(large,(y*w*scale+x)*4,n,n+4);}
 fs.writeFileSync(D+'/'+name+'-preview.png',png(large,w*scale,h*scale));fs.writeFileSync(D+'/wall-menu-candidate.json',JSON.stringify(p));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/wall-menu-readback.json',JSON.stringify(back));console.log('Verified wall menu 16x10; other assets unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
