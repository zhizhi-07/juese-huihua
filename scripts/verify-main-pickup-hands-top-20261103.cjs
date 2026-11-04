const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
const canvas=()=>{const c=createCanvas(1,1);c.style={};return c;};
global.document={createElement:canvas,addEventListener(){}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const n of ['core','canvas','export','animation','wardrobe'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
(async()=>{
 const d=fs.readFileSync('latest-main-hand-order-path.txt','utf8'),raw=JSON.parse(fs.readFileSync(d+'/original.json')),candidate=JSON.parse(fs.readFileSync(d+'/'+(process.argv[2]||'candidate.json'))),diff=JSON.parse(fs.readFileSync(d+'/diff.json'));
 const p=await PE.Wardrobe.decode(raw),q=await PE.Wardrobe.decode(candidate),cms=[p,q].map(p=>new PE.CanvasManager(canvas(),p)),report={unchangedFrames:0,changedFrames:[],renderPathChecks:0,handTopChecks:0,pixelsUnchanged:true};
 const restored=structuredClone(candidate);restored.layers=diff.newIndexToOldIndex.map((old,i)=>({old,l:restored.layers[i]})).sort((a,b)=>a.old-b.old).map(({l})=>l);for(const l of restored.layers)if(l.parent!=null)l.parent=diff.newIndexToOldIndex[l.parent];restored.currentLayerIndex=diff.newIndexToOldIndex[restored.currentLayerIndex];assert.deepEqual(restored,raw,'inverse order must recover exact original');
 const eq=(a,b,msg)=>assert.deepEqual(Buffer.from(a.data),Buffer.from(b.data),msg);
 for(let si=0;si<p.spriteSheets.length;si++)for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++)for(let fi=0;fi<p.spriteSheets[si].actions[ai].frames.length;fi++){
  const a=cms[0].getCompositeImageData(si,ai,fi),b=cms[1].getCompositeImageData(si,ai,fi);assert(b.data.some((v,i)=>i%4===3&&v),'empty composite');
  if(si!==diff.sheet||p.spriteSheets[si].actions[ai].direction==='up'){eq(a,b,'unauthorized frame changed');report.unchangedFrames++;}
  else{let n=0;for(let i=0;i<a.data.length;i+=4)if(a.data.subarray(i,i+4).some((v,j)=>v!==b.data[i+j]))n++;report.changedFrames.push({si,ai,fi,differentPixels:n});}
 }
 const si=diff.sheet,sheet=q.spriteSheets[si];
 for(const mode of ['saved','hair-02']){
  if(mode==='hair-02')for(const project of [p,q])for(const l of project.layers)if(l.sheetIndex===si&&l.name.startsWith('头发 / 02 '))l.visible=true;
  const atlas=createCanvas(960,768),ctx=atlas.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(let ai=0;ai<sheet.actions.length;ai++)for(let fi=0;fi<sheet.actions[ai].frames.length;fi++){
   const a=cms[0].getCompositeImageData(si,ai,fi),b=cms[1].getCompositeImageData(si,ai,fi),key=q.getFrameKey(si,ai,fi);
   if(sheet.actions[ai].direction==='up')eq(a,b,'back with hair changed');
   else{
    const order=PE.getRenderLayers(q,si,ai).filter(l=>l.getFrameData(key)&&PE.isLayerVisible(q,l,si));assert(order.slice(-2).every(PE.isHandLayer),'hands must be highest');report.handTopChecks++;
    const handOnly=canvas();handOnly.width=b.width;handOnly.height=b.height;const hc=handOnly.getContext('2d');for(const l of order.filter(PE.isHandLayer))PE.utils.drawImageData(hc,l.getFrameData(key),0,0);const h=hc.getImageData(0,0,b.width,b.height);for(let i=0;i<h.data.length;i+=4)if(h.data[i+3])assert.deepEqual([...b.data.subarray(i,i+4)],[...h.data.subarray(i,i+4)],'covered hand pixel');
   }
   q.currentSheetIndex=si;q.currentActionIndex=ai;q.currentFrameIndex=fi;const cm=cms[1];cm.zoom=1;cm.showGrid=false;cm.render();eq(cm.offscreenCtx.getImageData(0,0,b.width,b.height),b,'main render differs');
   const ex=new PE.ExportManager();ex.project=q;eq(ex._getCompositeImageData(si,ai,fi,1),b,'PNG export differs');
   const ap=new PE.AnimationPlayer();ap.previewScale=1;ap.init(canvas(),q,cm);ap.sheetIndex=si;ap.actionIndex=ai;ap.currentFrame=fi;let seen;const get=cm.getCompositeImageData.bind(cm);cm.getCompositeImageData=(...args)=>{seen=get(...args);return seen;};ap._renderPreviewFrame();cm.getCompositeImageData=get;eq(seen,b,'preview input differs');report.renderPathChecks+=3;
   for(const [before,img]of [a,b].entries())for(let bg=0;bg<2;bg++){const x=fi*160,y=ai*256+before*128+bg*64;ctx.fillStyle=bg?'#283138':'#edf0ed';ctx.fillRect(x,y,160,64);ctx.fillStyle=bg?'#ffffff':'#111111';ctx.font='10px sans-serif';ctx.fillText(`${before?'AFTER':'BEFORE'} ${sheet.actions[ai].direction} ${fi+1}`,x+2,y+11);const t=canvas();t.width=img.width;t.height=img.height;t.getContext('2d').putImageData(img,0,0);ctx.drawImage(t,x+45,y+12,img.width*1.5,img.height*1.5);}
  }
  fs.writeFileSync(d+'/compare-'+mode+'.png',atlas.toBuffer('image/png'));
 }
 fs.writeFileSync(d+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
