const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,h=fs.readFileSync(D+'/../noodle-stove-20261118/complete.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
const samples=JSON.parse(fs.readFileSync(D+'/front-desk-samples.json','utf8').replace(/^\uFEFF/,''));
const K=[47,59,61],wood=[164,117,89],trim=[148,99,79],front=[128,84,73],shadow=[107,69,64],cream=[231,222,181],ink=[173,164,129],green=[116,140,94];
const nearest=(rgb,palette)=>palette.reduce((best,c)=>c.reduce((sum,v,i)=>sum+(v-rgb[i])**2,0)<best.distance?{color:c,distance:c.reduce((sum,v,i)=>sum+(v-rgb[i])**2,0)}:best,{color:palette[0],distance:Infinity}).color;
const assets=[];
function canvas(name,w,H){const b=Buffer.alloc(w*H*4),put=(x,y,c)=>{assert(x>=0&&x<w&&y>=0&&y<H);b.set([...c,255],(y*w+x)*4);};return {name,w,H,b,put};}
const desk=canvas('前台桌子',55,28);
for(let y=0;y<28;y++)for(let x=0;x<55;x++){
 let c=null;
 if(y===0&&x>=45&&x<=53)c=K;
 if(y>=1&&y<=12&&x>=44){c=x===44||x===54?K:wood;}
 if(y===12&&x<44)c=K;
 if(y>=13&&y<=19)c=x===0||x===54?K:wood;
 if(y===20)c=x===0||x===54?K:trim;
 if(y===21)c=K;
 if(y>=22&&y<=25){c=x===0||x===54?K:x===1||x===3||x===51||x===53?trim:front;if(y===22&&x>=4&&x<=50)c=shadow;}
 if(y===26&&x>=1&&x<=53)c=x===1||x===53?trim:K;
 if(y===27&&(x===2||x===3||x===51||x===52))c=K;
 if(c)desk.put(x,y,c);
}
// A narrow shadow inside the raised return gives the desktop a visible side edge.
for(let y=2;y<20;y++)desk.put(53,y,trim);
assets.push(desk);
const book=canvas('登记簿',11,7),bookPalette=[cream,ink,front,green];
for(let y=0;y<7;y++)for(let x=0;x<11;x++){
 let c=x===0||x===10||y===0||y===6?K:x===5?front:nearest(samples.book[Math.min(y-1,5)*11+x],bookPalette);
 if(y===5&&x>0&&x<10&&x!==5)c=green;
 book.put(x,y,c);
}
assets.push(book);
const sign=canvas('旅馆招牌',21,10),signPalette=[K,wood,trim,front,shadow,cream];
for(let y=0;y<10;y++)for(let x=0;x<21;x++){
 if((y===0||y===9)&&(x<2||x>18))continue;
 if((y===1||y===8)&&(x<1||x>19))continue;
 let c=nearest(samples.sign[y*21+x],signPalette);
 if(y===0||y===9||x===0||x===20||(y===1||y===8)&&(x===1||x===19))c=K;
 sign.put(x,y,c);
}
assets.push(sign);
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 fs.writeFileSync(D+'/before-front-desk.json',raw);fs.writeFileSync(D+'/before-front-desk.etag',etag);fs.writeFileSync(D+'/before-front-desk.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 for(const {name,w,H,b} of assets){
  assert(!p.spriteSheets.some(s=>s.name===name));const si=p.spriteSheets.length,data='data:image/png;base64,'+png(b,w,H).toString('base64');
  p.spriteSheets.push({name,frameWidth:w,frameHeight:H,columns:1,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:8,imageDataURL:data,actions:[{name,direction:'',frames:[{sheetIndex:si,sourceX:0,sourceY:0,width:w,height:H,locked:false,lockedRegions:[],status:'completed',duration:0}]}]});
  p.layers.push({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData:{[si+'_0_0']:{width:w,height:H,dataURL:data}}});
  const colors=new Set();for(let i=0;i<b.length;i+=4)if(b[i+3])colors.add(b.subarray(i,i+4).toString('hex'));assert(colors.size<=6);
  fs.writeFileSync(D+'/'+name+'.png',png(b,w,H));const scale=w>30?16:28,large=Buffer.alloc(w*H*scale*scale*4);
  for(let y=0;y<H*scale;y++)for(let x=0;x<w*scale;x++){const n=(Math.floor(y/scale)*w+Math.floor(x/scale))*4;b.copy(large,(y*w*scale+x)*4,n,n+4);}
  fs.writeFileSync(D+'/'+name+'-preview.png',png(large,w*scale,H*scale));
 }
 p.currentSheetIndex=before.spriteSheets.length;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=before.layers.length;
 assert.deepStrictEqual(p.spriteSheets.slice(0,before.spriteSheets.length),before.spriteSheets);assert.deepStrictEqual(p.layers.slice(0,before.layers.length),before.layers);assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);
 fs.writeFileSync(D+'/front-desk-candidate.json',JSON.stringify(p));
 if(!process.argv.includes('--save'))return console.log('Preview ready: three separate materials, reconstructed counter thickness, six colors or fewer each.');
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/front-desk-readback.json',JSON.stringify(back));console.log('Verified front desk, register book and sign; existing hotel materials and animation unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
