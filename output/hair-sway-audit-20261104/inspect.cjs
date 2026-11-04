const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createCanvas,ImageData,Image}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const name of ['core','canvas','export','hair-animation'])vm.runInThisContext(fs.readFileSync('js/'+name+'.js','utf8'),{filename:name});
const dir='output/hair-sway-audit-20261104',id='draft-user-canvas-merged-1793608789349-dbd059d3';
(async()=>{
 const r=await fetch('http://127.0.0.1:8765/api/project?id='+id);assert.equal(r.status,200);const raw=await r.text(),etag=r.headers.get('etag');
 fs.writeFileSync(dir+'/source.json',raw);const hash=crypto.createHash('sha256').update(raw).digest('hex');
 const p=(await new PE.ExportManager().importProject(new Blob([raw]))).project;
 const cm=new PE.CanvasManager(document.createElement('canvas'),p),H=PE.HairAnimation;
 const si=p.spriteSheets.findIndex(s=>s.name==='original32_walk'),sheet=p.spriteSheets[si];
 const owner=p.layers.find(l=>l.hairAnimation?.enabled&&!l.isGroup&&/后发/.test(l.name));assert(owner,'active rear-hair recipe exists');
 const result=H.plan(p,owner);const canvas=createCanvas(8*145,6*178),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const stats=[];
 for(const [ai,a] of sheet.actions.entries())for(let fi=0;fi<a.frames.length;fi++){
  const key=p.getFrameKey(si,ai,fi),edit=result.edits.find(e=>e.key===key&&e.layer.sheetIndex===si);assert(edit);
  const saved=edit.layer.getFrameData(key),before=cm.getCompositeImageData(si,ai,fi);
  edit.layer.frameData.set(key,edit.image);const after=cm.getCompositeImageData(si,ai,fi);edit.layer.frameData.set(key,saved);
  assert(before.data.some((v,i)=>i%4===3&&v));assert(after.data.some((v,i)=>i%4===3&&v));
  let changed=0;for(let i=0;i<before.data.length;i+=4)if(before.data.slice(i,i+4).some((v,j)=>v!==after.data[i+j]))changed++;
  stats.push({direction:a.direction,frame:fi+1,duration:a.frames[fi].duration,changed});
  for(let bg=0;bg<2;bg++){
   const x=fi*145,y=(ai+bg*3)*178;ctx.fillStyle=bg?'#151827':'#eae7df';ctx.fillRect(x,y,145,178);ctx.fillStyle=bg?'white':'black';ctx.font='12px sans-serif';ctx.fillText(a.direction+' '+(fi+1)+' saved / live',x+3,y+15);
   for(const [j,im]of [before,after].entries()){const c=createCanvas(im.width,im.height);c.getContext('2d').putImageData(im,0,0);ctx.drawImage(c,x+3+j*70,y+23,im.width*2,im.height*2);ctx.drawImage(c,x+3+j*70,y+102);}
  }
 }
 fs.writeFileSync(dir+'/saved-vs-generated.png',canvas.toBuffer('image/png'));
 const summary={id,etag,sha256:hash,name:p.name,owner:owner.name,live:owner.hairAnimation.live,enabled:owner.hairAnimation.enabled,settings:sheet.actions.map(a=>{const s=H.settingsFor(owner.hairAnimation,sheet.name,a.direction);return{dir:a.direction,ampH:s.ampH,ampV:s.ampV,cycles:s.cycles,lag:s.lag,protected:s.protectedMasks?.[a.direction]?.data.reduce((a,b)=>a+b,0)||0,movable:s.masks[a.direction]?.data.reduce((a,b)=>a+b,0)||'all'};}),stats,clipped:result.clipped};
 const reread=await fetch('http://127.0.0.1:8765/api/project?id='+id);assert.equal(crypto.createHash('sha256').update(await reread.text()).digest('hex'),hash);summary.projectUnchanged=true;
 fs.writeFileSync(dir+'/audit.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
