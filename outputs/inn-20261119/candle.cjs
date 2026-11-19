const fs=require('fs'),zlib=require('zlib'),assert=require('assert'),crypto=require('crypto');
const D=__dirname,h=fs.readFileSync(D+'/../noodle-stove-20261118/complete.cjs','utf8');
const png=Function('zlib',h.slice(h.indexOf('function crc('),h.indexOf('function fill('))+';return png;')(zlib);
const W=10,H=14,N=8,delay=140,C={edge:[47,59,61],wax:[235,222,176],light:[250,238,196],shadow:[192,177,145],metal:[153,158,155],metalShade:[119,128,128],orange:[224,149,61],gold:[244,180,70],core:[255,222,132]};
const base=Buffer.alloc(W*H*4),wax=Buffer.alloc(W*H*4),flames=[],frames=[];
function dot(b,x,y,c){assert(x>=0&&x<W&&y>=0&&y<H);b.set([...c,255],(y*W+x)*4);}
function row(b,y,x1,x2,c){for(let x=x1;x<=x2;x++)dot(b,x,y,c);}
for(const y of [11,12]){row(base,y,2,7,C.edge);row(base,y,3,6,y===11?C.metal:C.metalShade);}
row(base,13,3,6,C.edge);
for(let y=6;y<=10;y++){dot(wax,3,y,C.edge);dot(wax,6,y,C.edge);dot(wax,4,y,y===10?C.shadow:C.light);dot(wax,5,y,y===10?C.shadow:C.wax);}
dot(wax,3,5,C.edge);dot(wax,4,5,C.light);dot(wax,5,5,C.edge);
// Keep the root fixed while only the upper flame leans and changes height.
const lean=[0,0,-1,-1,0,1,1,0],tipY=[2,1,2,2,1,2,2,2];
for(let f=0;f<N;f++){
 const fire=Buffer.alloc(W*H*4),dx=lean[f],top=tipY[f];
 dot(fire,4,4,C.core);dot(fire,4,3,C.gold);
 for(let y=top;y<=3;y++)dot(fire,5+dx,y,C.orange);
 for(let x=5;x<5+dx;x++)dot(fire,x,3,C.gold);
 dot(fire,5+dx,top,f%3===0?C.gold:C.orange);
 if(f===3||f===6)dot(fire,4+dx,2,C.gold);
 flames.push(fire);const frame=Buffer.alloc(W*H*4);
 for(const b of [base,wax,fire])for(let i=0;i<b.length;i+=4)if(b[i+3])b.copy(frame,i,i,i+4);
 frames.push(frame);
}
assert(new Set(flames.map(b=>b.toString('hex'))).size>=5);
for(const fire of flames){
 const visited=new Set(),todo=[[4,4]];
 while(todo.length){const [x,y]=todo.pop(),i=y*W+x;if(x<0||x>=W||y<0||y>=H||visited.has(i)||!fire[i*4+3])continue;visited.add(i);todo.push([x-1,y],[x+1,y],[x,y-1],[x,y+1]);}
 assert.equal(visited.size,fire.filter((_,i)=>i%4===3&&fire[i]===255).length,'Flame must remain connected to its root');
}
for(const b of flames)for(let y=5;y<H;y++)for(let x=0;x<W;x++)assert.equal(b[(y*W+x)*4+3],0);
const uri=b=>'data:image/png;base64,'+png(b,W,H).toString('base64');
function scale(b,w,h,s){const out=Buffer.alloc(w*h*s*s*4);for(let y=0;y<h*s;y++)for(let x=0;x<w*s;x++){const i=(Math.floor(y/s)*w+Math.floor(x/s))*4;b.copy(out,(y*w*s+x)*4,i,i+4);}return out;}
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id=scene-inn-20261119',r=await fetch(url);assert(r.ok);
 const raw=await r.text(),etag=r.headers.get('etag'),p=JSON.parse(raw),before=JSON.parse(raw);assert(etag);
 const name='蜡烛',si=p.spriteSheets.length;assert(!p.spriteSheets.some(s=>s.name===name));
 fs.writeFileSync(D+'/before-candle.json',raw);fs.writeFileSync(D+'/before-candle.etag',etag);fs.writeFileSync(D+'/before-candle.sha256',crypto.createHash('sha256').update(raw).digest('hex'));
 const atlas=Buffer.alloc(W*N*H*4);
 for(let f=0;f<N;f++)for(let y=0;y<H;y++)frames[f].copy(atlas,(y*W*N+f*W)*4,y*W*4,(y+1)*W*4);
 p.spriteSheets.push({name,frameWidth:W,frameHeight:H,columns:N,rows:1,spacingX:0,spacingY:0,offsetX:0,offsetY:0,fps:7,imageDataURL:'data:image/png;base64,'+png(atlas,W*N,H).toString('base64'),actions:[{name:'火苗摇曳',direction:'',frames:frames.map((_,f)=>({sheetIndex:si,sourceX:f*W,sourceY:0,width:W,height:H,locked:false,lockedRegions:[],status:'completed',duration:delay}))}]});
 for(const [name,buffers] of [['烛台',frames.map(()=>base)],['蜡烛',frames.map(()=>wax)],['火苗',flames]]){
  const frameData={};buffers.forEach((b,f)=>frameData[si+'_0_'+f]={width:W,height:H,dataURL:uri(b)});
  p.layers.push({sheetIndex:si,parent:null,name,visible:true,locked:false,opacity:1,frameData});
 }
 const added=p.layers.filter(l=>l.sheetIndex===si);
 for(const l of added){assert.equal(Object.keys(l.frameData).length,N);if(l.name!=='火苗')assert.equal(new Set(Object.values(l.frameData).map(f=>f.dataURL)).size,1);}
 p.currentSheetIndex=si;p.currentActionIndex=0;p.currentFrameIndex=0;p.currentLayerIndex=p.layers.length-1;
 assert.deepStrictEqual(p.spriteSheets.slice(0,si),before.spriteSheets);assert.deepStrictEqual(p.layers.slice(0,before.layers.length),before.layers);assert.deepStrictEqual(p.sceneAssembly,before.sceneAssembly);
 fs.writeFileSync(D+'/candle-candidate.json',JSON.stringify(p));fs.writeFileSync(D+'/蜡烛-preview.png',png(scale(frames[0],W,H,28),W*28,H*28));
 fs.writeFileSync(D+'/蜡烛-动画帧.png',png(scale(atlas,W*N,H,12),W*N*12,H*12));
 const gif=Function('window',fs.readFileSync(D+'/../../js/scene-assembly-gif.js','utf8')+';return window.SceneAssemblyGIF;')({});
 const blob=await gif(frames.map(b=>({pixels:{data:scale(b,W,H,16)},delay})),W*16,H*16);
 fs.writeFileSync(D+'/蜡烛-摇曳.gif',Buffer.from(await blob.arrayBuffer()));
 if(!process.argv.includes('--save'))return console.log('8-frame candle animation preview ready; body/base static; flame moves with fixed root.');
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,await saved.text());
 const back=await(await fetch(url)).json();assert.deepStrictEqual(back,p);fs.writeFileSync(D+'/candle-readback.json',JSON.stringify(back));console.log('Verified candle: 8 frames x 140ms, static body/base, separate flame; existing hotel assets unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1;});
