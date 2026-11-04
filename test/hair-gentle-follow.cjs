const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {createCanvas,ImageData,Image}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const name of ['core','canvas','export','hair-animation'])vm.runInThisContext(fs.readFileSync(`${__dirname}/../js/${name}.js`,'utf8'),{filename:name});
if(process.argv.includes('--original'))vm.runInThisContext(fs.readFileSync(`${__dirname}/../output/hair-gentle-follow-20261104/before/js/hair-animation.js`,'utf8'));
const H=PE.HairAnimation,hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const raster=(im,w=36,h=36)=>{const c=createCanvas(w,h);PE.utils.drawImageData(c.getContext('2d'),im);return c.getContext('2d').getImageData(0,0,w,h);};
(async()=>{
 const url='http://localhost:8765/api/project?id=draft-conflict-1793608335313-038e0c03',r=await fetch(url);assert.equal(r.status,200);const raw=await r.text(),originalHash=hash(raw);
 const p=(await new PE.ExportManager().importProject(new Blob([raw]))).project,si=p.spriteSheets.findIndex(s=>s.name==='original32_idle'),sheet=p.spriteSheets[si];
 const source=p.layers.find(l=>l.sheetIndex===si&&l.visible&&/后发/.test(l.name)&&l.getFrameData(`${si}_1_0`));assert(source,'reference rear hair');
 const offsets=H.calibrate(p,source),base=p.layers.map(l=>[...l.frameData.entries()].map(([k,v])=>[k,Buffer.from(v.data)]));
 source.hairAnimationId='gentle-reference-test';source.hairAnimation={version:1,id:source.hairAnimationId,live:false,enabled:true,params:{...H.params(),followHead:true},overrides:{},offsets};
 H.validate(p);const result=H.plan(p,source),old=H.plan(p,source,{...source.hairAnimation,params:{...source.hairAnimation.params,followHead:false}});
 assert.equal(result.edits.length,9);const cm=new PE.CanvasManager(document.createElement('canvas'),p),contact=createCanvas(4*210,3*190),ctx=contact.getContext('2d');ctx.imageSmoothingEnabled=false;
 const sideFrame=sheet.actions[0].frames[2];sideFrame.locked=true;
 const only=new Set(sheet.actions[1].frames.map((_,fi)=>p.getFrameKey(si,1,fi)));
 assert.equal(H.plan(p,source,source.hairAnimation,only).edits.length,3,'current direction does not rewrite or inspect protected frames elsewhere');
 assert.throws(()=>H.plan(p,source),/保护区域/);sideFrame.locked=false;
 let changed=0;for(const [ai,a] of sheet.actions.entries()){
  const src=source.getFrameData(`${si}_${ai}_0`),baseImage=raster(src);
  for(const [fi,f] of a.frames.entries()){
   const key=p.getFrameKey(si,ai,fi),offset=offsets[H.address(sheet,a.direction,fi)],edit=result.edits.find(e=>e.key===key),image=fi?edit.image:src;
   const rigid=H.deform(src,f,offset,0,H.params(),null,false).image,actual=raster(image),straight=raster(rigid);
   assert(actual.data.some((v,i)=>i%4===3&&v),'generated hair nonempty');
   for(let y=0;y<10;y++)for(let x=0;x<36;x++){const i=((y+offset.y)*36+x)*4;if(i+3<actual.data.length)assert.deepEqual(actual.data.slice(i,i+4),straight.data.slice(i,i+4),'roots follow head without extra displacement');}
   if(fi>=2){assert.notDeepEqual(actual.data,straight.data,'tail actually lags after the head moves');changed++;}
   if(fi<2)assert.deepEqual(actual.data,straight.data,'hair does not sway when the head is stationary');
   const saved=source.getFrameData(key),before=cm.getCompositeImageData(si,ai,fi);source.frameData.set(key,image);const after=cm.getCompositeImageData(si,ai,fi);source.frameData.set(key,saved);
   const x=fi*210,y=ai*190;ctx.fillStyle='#eae7df';ctx.fillRect(x,y,210,190);ctx.fillStyle='#121827';ctx.font='12px sans-serif';ctx.fillText(`${a.direction} ${fi+1} reference / generated`,x+4,y+15);
   for(const [j,im]of [before,after].entries()){assert(im.data.some((v,i)=>i%4===3&&v),'composite nonempty');const c=createCanvas(im.width,im.height);c.getContext('2d').putImageData(im,0,0);ctx.drawImage(c,x+4+j*102,y+25,im.width*2.5,im.height*2.5);ctx.drawImage(c,x+4+j*102,y+130);}
  }
 }
 assert.equal(changed,6);assert(old.edits.some((e,i)=>!Buffer.from(raster(e.image).data).equals(Buffer.from(raster(result.edits[i].image).data))),'new mode differs from previous algorithm');
 const first=source.getFrameData(`${si}_1_0`),f=sheet.actions[1].frames[2],mask={width:first.width,height:first.height,data:Array(first.width*first.height).fill(1)};
 const protectedResult=H.deform(first,f,{x:0,y:2},0,H.params(),null,true,mask,null,null,2).image,rigid=H.deform(first,f,{x:0,y:2},0,H.params(),null,false).image;
 assert.deepEqual(raster(protectedResult).data,raster(rigid).data,'protected hair never gets extra motion');
 for(const [i,l]of p.layers.entries())for(const [j,[k,v]]of [...l.frameData.entries()].entries()){assert.equal(k,base[i][j][0]);assert.deepEqual(Buffer.from(v.data),base[i][j][1],'no stored pixels were changed');}
 const exporter=new PE.ExportManager();exporter.project=p;const blob=exporter.exportProject(false),reopened=(await new PE.ExportManager().importProject(blob)).project;
 const reopenedSource=reopened.layers.find(l=>l.hairAnimation?.id==='gentle-reference-test');assert(reopenedSource.hairAnimation.params.followHead,'mode survives local project serialization');
 const reopenedPlan=H.plan(reopened,reopenedSource);assert.equal(reopenedPlan.edits.length,result.edits.length);
 for(const [i,e]of reopenedPlan.edits.entries())assert.deepEqual(raster(e.image).data,raster(result.edits[i].image).data,'save/reopen keeps the generated result');
 const bad=JSON.parse(JSON.stringify(source.hairAnimation));bad.params.followHead='yes';source.hairAnimation=bad;assert.throws(()=>H.validate(p),/跟随设置无效/);
 fs.writeFileSync('output/hair-gentle-follow-20261104/reference-vs-generated.png',contact.toBuffer('image/png'));
 const after=await fetch(url);assert.equal(hash(await after.text()),originalHash,'reference project not modified');
 console.log(JSON.stringify({directions:3,frames:12,tailLagFrames:changed,rootAndProtection:true,originalSha256:originalHash,referenceProjectUnchanged:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
