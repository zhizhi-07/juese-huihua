const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createCanvas,loadImage,ImageData}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;
global.document={addEventListener(){},createElement:()=>createCanvas(1,1)};
for(const name of ['core','history','frame-tools']){
  const file=name==='frame-tools'&&process.argv.includes('--before')?'test/output/front-side-copy-20261103/before/frame-tools.js':'js/'+name+'.js';
  vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
}
const out='test/output/front-side-copy-20261103';
async function main(){
  const raw=JSON.parse(fs.readFileSync(out+'/project-snapshot.json','utf8'));
  const p=Object.assign(new PE.Project(),raw);
  p.spriteSheets=raw.spriteSheets.map(s=>Object.assign(new PE.SpriteSheet(s.name),s,{actions:s.actions.map(a=>Object.assign(new PE.Action(a.name,a.direction),a,{frames:a.frames.map(f=>Object.assign(new PE.Frame(),f))}))}));
  p.layers=raw.layers.map(l=>Object.assign(new PE.Layer(l.name),l,{frameData:new Map()}));
  const si=p.spriteSheets.findIndex(s=>s.name==='original32_idle');
  const front=p.spriteSheets[si].actions.findIndex(a=>a.direction==='down'),side=p.spriteSheets[si].actions.findIndex(a=>a.direction==='side');
  const li=p.layers.findIndex(l=>l.sheetIndex===si&&l.name==='后发'),hair=p.layers[li];
  const sourceKey=p.getFrameKey(si,front,0),targetKey=p.getFrameKey(si,side,0);
  const image=await loadImage(raw.layers[li].frameData[sourceKey].dataURL),canvas=createCanvas(image.width,image.height),ctx=canvas.getContext('2d');
  ctx.drawImage(image,0,0);const source=ctx.getImageData(0,0,image.width,image.height);hair.frameData.set(sourceKey,source);
  p.currentSheetIndex=si;p.currentActionIndex=front;p.currentFrameIndex=0;p.currentLayerIndex=li;
  const history=new PE.HistoryManager(),app={project:p,history,toolManager:{isDrawing:false,clearSelection(){}},animationPlayer:{pause(){}},canvasManager:{render(){}},updateAll(){},persistence:{markDirty(){}}};
  PE.FrameEditing.copy(app,{});p.selectFrame(si,side,0);
  assert.equal(p.getCurrentFrame().width,28);assert.equal(source.width,32);
  const result=PE.FrameEditing.paste(app);
  const pasted=hair.getFrameData(targetKey);assert(result.modifiedPixels>0);
  let count=0;
  for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
    const i=(y*source.width+x)*4;if(!source.data[i+3])continue;count++;
    assert.deepEqual(pasted.data.subarray((y*pasted.width+x-1)*4,(y*pasted.width+x)*4),source.data.subarray(i,i+4),'every source RGBA survives the minimal one-pixel shift');
  }
  assert.equal(result.modifiedPixels,count);assert.equal(count,428);
  assert.deepEqual(hair.getFrameData(sourceKey).data,source.data);
  history.undo(p);assert.equal(hair.getFrameData(targetKey),null);history.redo(p);assert.deepEqual(hair.getFrameData(targetKey).data,pasted.data);
  history.undo(p);
  assert.throws(()=>PE.FrameEditing.paste(app,[{}],{x:0,y:0}),/超出/,'explicit coordinates must not be silently moved');
  assert.throws(()=>PE.FrameEditing.paste(app,[{}],{mode:'replace'}),/超出/,'transparent replace boundaries stay strict');
  const steps=history.undoStack.length;
  const frame=p.getCurrentFrame();frame.width=25;
  assert.throws(()=>PE.FrameEditing.paste(app),/放不下|超出/);assert.equal(hair.getFrameData(targetKey),null);assert.equal(history.undoStack.length,steps);frame.width=28;
  frame.lockedRegions=[{x:0,y:0,w:28,h:36}];assert.throws(()=>PE.FrameEditing.paste(app),/保护/);frame.lockedRegions=[];
  frame.height=20;const vertical=PE.FrameEditing.paste(app);assert.equal(vertical.modifiedPixels,count);history.undo(p);frame.height=36;
  const detached={...app.frameClipboard,detached:true,source:{layerName:'后发'}};
  const edits=PE.FrameEditing.plan(app,detached,[{}]);assert.deepEqual(edits[0].after.data,pasted.data,'shared clipboard uses the same fit');
  const layerCount=p.layers.length,body=p.layers.findIndex(l=>l.sheetIndex===si&&l.name==='body');
  assert.throws(()=>PE.FrameEditing.paste(app,[{layerIndex:body}]),/锁定|保护|其他朝向/);assert.equal(p.layers.length,layerCount);
  PE.FrameEditing.paste(app);
  const preview=createCanvas(32*8+28*8+24,36*8),pc=preview.getContext('2d');pc.imageSmoothingEnabled=false;
  pc.fillStyle='#d9dce3';pc.fillRect(0,0,preview.width,preview.height);
  for(const [data,x]of [[source,0],[pasted,32*8+24]]){const c=createCanvas(data.width,data.height);c.getContext('2d').putImageData(data,0,0);pc.drawImage(c,x,0,data.width*8,data.height*8);}
  fs.writeFileSync(out+'/source-and-pasted.png',preview.toBuffer('image/png'));
  console.log('PASS: actual 中性 front 32x36 -> side 28x36; all 428 pixels exact, minimum shift -1; source intact; undo/redo; shared clipboard; vertical fit; oversized/explicit/replace/lock guards; no project writes.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
