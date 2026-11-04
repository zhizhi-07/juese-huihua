const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,ImageData,Image}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const name of ['core','canvas','export','hair-animation'])vm.runInThisContext(fs.readFileSync(`${__dirname}/../js/${name}.js`,'utf8'),{filename:name});
const output=__dirname+'/../output/hair-sway-audit-20261104',original=process.argv.includes('--original');
if(original)vm.runInThisContext(fs.readFileSync(output+'/before/js/hair-animation.js','utf8'));
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
function raster(im,w,h){const c=createCanvas(w,h);PE.utils.drawImageData(c.getContext('2d'),im);return c.getContext('2d').getImageData(0,0,w,h);}
// Independent copy of the approved demo's horizontal formula (ampV is zero there).
function reference(src,frame,offset,phase,s,mask){
 const w=src.width,h=src.height,out=new ImageData(frame.width,frame.height),locked=new Set();let top=h,bottom=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(src.data[(y*w+x)*4+3]&&(!mask||mask.data[y*w+x])){top=Math.min(top,y);bottom=Math.max(bottom,y);}
 for(let pass=0;pass<2;pass++)for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4;if(!src.data[i+3])continue;
  const weight=mask&&!mask.data[y*w+x]?0:Math.max(0,Math.min(1,(y-top)/Math.max(1,bottom-top)));
  if((weight===0?0:1)!==pass)continue;
  const dx=Math.round(s.ampH*weight*(Math.sin(s.cycles*phase-s.lag*weight)-Math.sin(-s.lag*weight)));
  const X=x+offset.x+dx,Y=y+offset.y;if(X<0||Y<0||X>=frame.width||Y>=frame.height)continue;
  const at=Y*frame.width+X;if(pass&&locked.has(at))continue;
  out.data.set(src.data.subarray(i,i+4),at*4);if(!pass)locked.add(at);
 }
 return out;
}
(async()=>{
 const id='draft-user-canvas-merged-1793608789349-dbd059d3',url='http://127.0.0.1:8765/api/project?id='+id;
 const response=await fetch(url);assert.equal(response.status,200);const raw=await response.text(),before=hash(raw);
 const p=(await new PE.ExportManager().importProject(new Blob([raw]))).project,H=PE.HairAnimation;
 const si=p.spriteSheets.findIndex(s=>s.name==='original32_walk'),sheet=p.spriteSheets[si],cm=new PE.CanvasManager(document.createElement('canvas'),p);
 const contact=createCanvas(8*190,3*180),ctx=contact.getContext('2d');ctx.imageSmoothingEnabled=false;
 let mismatches=0,checks=0;const sources=[];
 for(const [ai,a] of sheet.actions.entries()){
  const layers=PE.getRenderLayers(p,si,ai).filter(l=>PE.isLayerVisible(p,l,si)),hair=layers.find(l=>/后发/.test(l.name)&&l.getFrameData(`${si}_${ai}_0`));assert(hair,'visible rear-hair layer');
  const frame=a.frames[0],src=raster(hair.getFrameData(`${si}_${ai}_0`),frame.width,frame.height),owner=H.master(p,hair);assert(owner);sources.push(src.data.slice());
  const mask={width:src.width,height:src.height,data:Array.from({length:src.width*src.height},(_,i)=>i%src.width<src.width/2?1:0)};
  const config=JSON.parse(JSON.stringify(owner.hairAnimation));
  config.directionOverrides??={};config.directionOverrides[`${sheet.name}/${a.direction}`]=H.params();
  const planned=H.plan(p,owner,config).edits;
  const durations=a.frames.map(f=>f.duration),total=durations.reduce((n,d)=>n+d,0);let elapsed=0;
  for(const [fi,f] of a.frames.entries()){
   const phase=2*Math.PI*elapsed/total;elapsed+=durations[fi];
   const offset=owner.hairAnimation.offsets[H.address(sheet,a.direction,fi)];
   const first=owner.hairAnimation.offsets[H.address(sheet,a.direction,0)];
   const relative={x:offset.x-first.x,y:offset.y-first.y};
   for(const selection of [null,mask])for(const ampH of [.4,2,6])for(const lag of [0,.6,1.5]){
    const settings={...H.params(),ampH,ampV:0,lag},expected=reference(src,f,relative,phase,settings,selection);
    const actual=raster(H.deform(src,f,relative,phase,settings,selection,true).image,f.width,f.height);
    const same=Buffer.from(expected.data).equals(Buffer.from(actual.data));checks++;if(!same)mismatches++;
    if(!selection&&ampH===2&&lag===.6){
     const key=`${si}_${ai}_${fi}`,saved=hair.getFrameData(key),images=[];
     const plannedFrame=planned.find(e=>e.layer===hair&&e.key===key);assert(plannedFrame);
     checks++;if(!Buffer.from(raster(plannedFrame.image,f.width,f.height).data).equals(Buffer.from(expected.data)))mismatches++;
     for(const im of [expected,actual]){hair.frameData.set(key,im);images.push(cm.getCompositeImageData(si,ai,fi));}hair.frameData.set(key,saved);
     const x=fi*190,y=ai*180;ctx.fillStyle='#eae7df';ctx.fillRect(x,y,190,180);ctx.fillStyle='#121827';ctx.font='12px sans-serif';ctx.fillText(`${a.direction} ${fi+1} demo / editor`,x+3,y+15);
     for(const [j,im] of images.entries()){assert(im.data.some((v,i)=>i%4===3&&v));const tile=createCanvas(im.width,im.height);tile.getContext('2d').putImageData(im,0,0);ctx.drawImage(tile,x+3+j*92,y+25,im.width*2.5,im.height*2.5);ctx.drawImage(tile,x+3+j*92,y+125);}
    }
   }
  }
  assert.deepEqual(src.data,sources.at(-1),'source pixels unchanged');
 }
 fs.mkdirSync(output,{recursive:true});fs.writeFileSync(`${output}/${original?'before':'after'}-demo-vs-editor.png`,contact.toBuffer('image/png'));
 const reread=await fetch(url);assert.equal(hash(await reread.text()),before,'saved project not modified');
 const summary={mode:original?'before':'after',checks,mismatches,projectUnchanged:true,sha256:before};console.log(JSON.stringify(summary));
 assert.equal(mismatches,0,'editor horizontal sway must match approved demo for the same source, timing, mask and parameters');
})().catch(e=>{console.error(e);process.exitCode=1;});
