const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),{createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement(){const c=createCanvas(1,1);c.style={};c.toBlob=cb=>cb(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;},body:{appendChild(){}}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','animation','export'])vm.runInThisContext(fs.readFileSync(path.resolve(__dirname,'../js/'+f+'.js'),'utf8'));
const dir=fs.readFileSync(path.resolve(__dirname,'../自检记录/当前画布居中备份路径.txt'),'utf8'),plan=JSON.parse(fs.readFileSync(path.join(dir,'canvas-plan.json')));
async function load(raw){return (await new PE.ExportManager().importProject(new Blob([raw]))).project;}
function bounds(im){let x0=im.width,y0=im.height,x1=-1,y1=-1;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}return {x0,y0,x1,y1};}
(async()=>{
 const preview=createCanvas(1100,15*280),pc=preview.getContext('2d');pc.fillStyle='#ded7eb';pc.fillRect(0,0,preview.width,preview.height);pc.imageSmoothingEnabled=false;let row=0,total=0;const report=[];
 for(const item of plan.report){const r=await fetch('http://127.0.0.1:8765/api/project?id='+item.id);assert.equal(r.status,200);const raw=await r.text();assert.deepEqual(JSON.parse(raw),JSON.parse(fs.readFileSync(path.join(dir,item.id+'.candidate.json'))));const before=await load(fs.readFileSync(path.join(dir,item.id+'.before.json'),'utf8')),after=await load(raw),bc=new PE.CanvasManager(document.createElement('canvas'),before),ac=new PE.CanvasManager(document.createElement('canvas'),after),ex=new PE.ExportManager();ex.init(after,ac);let frames=0;
  for(let si=0;si<after.spriteSheets.length;si++){const s=after.spriteSheets[si];if(!s.canvasLayout)continue;
   for(let ai=0;ai<s.actions.length;ai++){const a=s.actions[ai],layout=s.canvasLayout.actions[ai];let union={x0:Infinity,y0:Infinity,x1:-1,y1:-1};
    for(let fi=0;fi<a.frames.length;fi++){
     const old=bc.getCompositeImageData(si,ai,fi),im=ac.getCompositeImageData(si,ai,fi);assert(old.data.some((v,i)=>i%4===3&&v),'nonempty reference');
     for(let y=0;y<old.height;y++)assert.deepEqual(Buffer.from(im.data.subarray(((y+layout.y)*im.width+layout.x)*4,((y+layout.y)*im.width+layout.x+old.width)*4)),Buffer.from(old.data.subarray(y*old.width*4,(y+1)*old.width*4)),'real compositor preserved '+item.id+'/'+si+'/'+ai+'/'+fi);
     const b=bounds(im);union={x0:Math.min(union.x0,b.x0),y0:Math.min(union.y0,b.y0),x1:Math.max(union.x1,b.x1),y1:Math.max(union.y1,b.y1)};frames++;
     if(item.id==='main'&&fi===0){
      pc.fillStyle='#44394e';pc.font='18px sans-serif';pc.fillText(s.name+' / '+a.direction,12,row*280+22);
      for(const [image,x]of [[old,180],[im,600]]){const tile=createCanvas(image.width,image.height);tile.getContext('2d').putImageData(image,0,0);const scale=4,px=x+Math.floor((300-image.width*scale)/2),py=row*280+32;pc.strokeStyle='#797183';pc.strokeRect(px-.5,py-.5,image.width*scale+1,image.height*scale+1);pc.drawImage(tile,px,py,image.width*scale,image.height*scale);}
      pc.fillStyle='#44394e';pc.fillText('before',190,row*280+270);pc.fillText('after',610,row*280+270);row++;
     }
    }
    assert.deepEqual([union.x0,union.y0,layout.width-1-union.x1,layout.height-1-union.y1],[plan.margin,plan.margin,plan.margin,plan.margin],'actual rendered envelope is centered '+item.id+'/'+s.name+'/'+a.direction);
   }
  }
  const saved=ex.exportProject(false),restored=await load(await saved.text());assert.deepEqual(restored.spriteSheets.map(s=>s.canvasLayout),after.spriteSheets.map(s=>s.canvasLayout),'canvas origin roundtrip');
  if(item.id==='character-56620e79-ce79-4fd9-b49c-081f7bc57d67'){const si=after.currentSheetIndex,ai=after.currentActionIndex,fi=after.currentFrameIndex,im=ac.getCompositeImageData(si,ai,fi),c=createCanvas(im.width*5,im.height*5),tile=createCanvas(im.width,im.height);tile.getContext('2d').putImageData(im,0,0);const ctx=c.getContext('2d');ctx.fillStyle='#ded7eb';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(tile,0,0,c.width,c.height);fs.writeFileSync(path.join(dir,'用户分支当前画布.png'),c.toBuffer('image/png'));}
  if(item.id==='main'){
   const si=after.currentSheetIndex,ai=after.currentActionIndex,fi=after.currentFrameIndex,im=ac.getCompositeImageData(si,ai,fi),blob=await ex.exportFrameAsBlob(si,ai,fi);fs.writeFileSync(path.join(dir,'主工程当前帧-透明.png'),Buffer.from(await blob.arrayBuffer()));
   const f=after.getCurrentFrame();ac.canvas.width=f.width*5+20;ac.canvas.height=f.height*5+20;ac.zoom=5;ac.offsetX=10;ac.offsetY=10;ac.showGrid=false;ac.render();fs.writeFileSync(path.join(dir,'主画布实际render.png'),ac.canvas.toBuffer('image/png'));
   const rendered=ac.offscreenCtx.getImageData(0,0,im.width,im.height);assert.deepEqual(Buffer.from(rendered.data),Buffer.from(im.data),'actual main render uses the same pixels');
   const source=fs.readFileSync(path.resolve(__dirname,'../js/studio.js'),'utf8'),start=source.indexOf('  function bounds(image)'),boundFn=source.slice(start,source.indexOf('\n',start)),render=source.slice(source.indexOf('  app.animationPlayer._renderPreviewFrame=function'),source.indexOf('  const originalSetTool=')),app={project:after,canvasManager:ac,animationPlayer:{canvas:createCanvas(144,144),sheetIndex:si,actionIndex:ai,currentFrame:fi}};ac.hideHands=false;vm.runInNewContext(boundFn+'\n'+render,{app,PE,document,console});app.animationPlayer._renderPreviewFrame();fs.writeFileSync(path.join(dir,'动画预览实际路径.png'),app.animationPlayer.canvas.toBuffer('image/png'));
  }
  total+=frames;report.push({id:item.id,frames,equalMargin:plan.margin});console.log('RENDER_OK',item.id,frames);
 }
 const trimmed=createCanvas(preview.width,row*280);trimmed.getContext('2d').drawImage(preview,0,0);fs.writeFileSync(path.join(dir,'主工程全部动作-前后对比.png'),trimmed.toBuffer('image/png'));fs.writeFileSync(path.join(dir,'render-validation.json'),JSON.stringify({totalFrames:total,report,browserTested:false},null,2));console.log('PASS',total,'frames;',plan.margin,'equal margins;',dir);
})().catch(e=>{console.error(e);process.exitCode=1});
