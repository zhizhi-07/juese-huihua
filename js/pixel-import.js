/* Native image resizing and a small median-cut palette, entirely local. */
window.PE=window.PE||{};
PE.quantizeImage=function(image,maxColors){
  if(!Number.isInteger(maxColors)||(maxColors!==0&&(maxColors<2||maxColors>64)))throw new Error('颜色数量需为 0（保留原色）或 2–64');
  const histogram=new Map(),d=image.data;
  for(let i=0;i<d.length;i+=4){if(d[i+3]<128){d.fill(0,i,i+4);continue;}d[i+3]=255;if(!maxColors)continue;const key=(d[i]<<16)|(d[i+1]<<8)|d[i+2];const c=histogram.get(key)||{rgb:[d[i],d[i+1],d[i+2]],count:0};c.count++;histogram.set(key,c);}
  if(!histogram.size)return image;
  const boxes=[[...histogram.values()]];
  function range(box){const spans=[0,1,2].map(c=>{let min=255,max=0;for(const p of box){min=Math.min(min,p.rgb[c]);max=Math.max(max,p.rgb[c]);}return max-min;});return {value:Math.max(...spans),axis:spans.indexOf(Math.max(...spans))};}
  while(boxes.length<maxColors){
    let index=-1,best=-1;
    boxes.forEach((b,i)=>{const score=range(b).value*b.reduce((n,p)=>n+p.count,0);if(b.length>1&&score>best){index=i;best=score;}});
    if(index<0)break;
    const box=boxes[index],axis=range(box).axis;box.sort((a,b)=>a.rgb[axis]-b.rgb[axis]);
    const total=box.reduce((n,p)=>n+p.count,0);let n=0,cut=1;
    for(;cut<box.length;cut++){n+=box[cut-1].count;if(n>=total/2)break;}
    cut=Math.min(cut,box.length-1);boxes.splice(index,1,box.slice(0,cut),box.slice(cut));
  }
  const palette=boxes.map(box=>{const total=box.reduce((n,p)=>n+p.count,0);return [0,1,2].map(c=>Math.round(box.reduce((n,p)=>n+p.rgb[c]*p.count,0)/total));});
  const mapped=new Map();
  for(const [key,c]of histogram){let best=Infinity,color;for(const rgb of palette){const distance=rgb.reduce((n,v,i)=>n+(v-c.rgb[i])**2,0);if(distance<best){best=distance;color=rgb;}}mapped.set(key,color);}
  for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;d.set(mapped.get((d[i]<<16)|(d[i+1]<<8)|d[i+2]),i);d[i+3]=255;}
  return image;
};
// Pixel It uses a smoothed reduction and nearest-neighbor display: https://github.com/giventofly/pixelit
PE.imageToPixels=function(image,crop,width,{pixelize=true,colors=0,sampling='smooth'}={}){
  if(!crop||![crop.x,crop.y,crop.w,crop.h,width].every(Number.isSafeInteger)||crop.x<0||crop.y<0||crop.w<1||crop.h<1||crop.x+crop.w>image.width||crop.y+crop.h>image.height)throw new Error('裁选范围超出原图');
  const height=Math.max(1,Math.round(crop.h*width/crop.w));
  if(width<1||width>512||height>512)throw new Error('输出宽高需要在 1–512 像素之间');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=sampling==='smooth'&&(width!==crop.w||height!==crop.h);ctx.imageSmoothingQuality='high';
  let source=image,sx=crop.x,sy=crop.y;
  // Isolate the crop so the smoothing filter cannot pull colors from outside it.
  if(ctx.imageSmoothingEnabled&&(crop.x||crop.y||crop.w!==image.width||crop.h!==image.height)){
    source=document.createElement('canvas');source.width=crop.w;source.height=crop.h;
    const cropped=source.getContext('2d');cropped.imageSmoothingEnabled=false;cropped.drawImage(image,crop.x,crop.y,crop.w,crop.h,0,0,crop.w,crop.h);sx=sy=0;
  }
  ctx.drawImage(source,sx,sy,crop.w,crop.h,0,0,width,height);
  const pixels=ctx.getImageData(0,0,width,height);return pixelize?PE.quantizeImage(pixels,colors):pixels;
};
PE.addImageLayer=function(app,pixels,name){
  const p=app.project,frame=p.getCurrentFrame();
  if(!frame||frame.locked)throw new Error('当前帧不可编辑');
  if(!pixels?.data||pixels.width>frame.width||pixels.height>frame.height)throw new Error('图片比当前画布大，请减小像素宽度或点击“适合当前画布”');
  const x=Math.floor((frame.width-pixels.width)/2),y=Math.floor((frame.height-pixels.height)/2);
  const data=new ImageData(frame.width,frame.height);
  for(let row=0;row<pixels.height;row++)for(let col=0;col<pixels.width;col++){
    const i=(row*pixels.width+col)*4;if(!pixels.data[i+3])continue;
    if(frame.isPixelLocked(x+col,y+row))throw new Error('图片会覆盖当前帧的保护区域，请先调整锁定区域');
    data.data.set(pixels.data.subarray(i,i+4),((y+row)*frame.width+x+col)*4);
  }
  const previousTool=app.toolManager.currentTool;app.animationPlayer.pause();app.toolManager.clearSelection();
  const before=p.layers.slice(),selected=p.currentLayerIndex,layer=new PE.Layer('导入 · '+name);layer.sheetIndex=p.currentSheetIndex;layer.frameData.set(p.getFrameKey(),data);p.layers.push(layer);p.currentLayerIndex=p.layers.length-1;
  const after=p.layers.slice(),index=p.currentLayerIndex;
  app.history.undoStack.push({description:'放入裁选图片',changes:[],undo:()=>{p.layers=before.slice();p.currentLayerIndex=selected;app.toolManager.clearSelection();app.toolManager.setTool(previousTool);app.updateToolbar();},redo:()=>{p.layers=after.slice();p.currentLayerIndex=index;app.toolManager.setSelection(x,y,pixels.width,pixels.height);app.toolManager.setTool('move');app.updateToolbar();}});
  app.history.redoStack=[];app.toolManager.setSelection(x,y,pixels.width,pixels.height);app.toolManager.setTool('move');app.updateToolbar();app.history._notifyChange();app.persistence?.markDirty();
  return layer;
};
document.addEventListener('DOMContentLoaded',()=>{
  const app=PE.app,original=document.getElementById('import-btn');
  const menu=document.createElement('details');menu.className='import-menu';
  const summary=document.createElement('summary');summary.textContent='文件 ▾';
  const actions=document.createElement('div');actions.className='import-actions';original.before(menu);menu.append(summary,actions);actions.append(original);original.textContent='原样导入素材 / Aseprite';
  const projectImport=document.getElementById('import-project-btn');projectImport.textContent='导入工程文件（JSON）';actions.append(projectImport);
  const trigger=document.createElement('button');trigger.className='studio-button';trigger.textContent='上传图片';menu.before(trigger);
  menu.addEventListener('click',e=>{if(e.target.closest('button'))menu.open=false;});
  const dialog=document.createElement('dialog');dialog.className='advanced-dialog pixel-import-dialog';dialog.setAttribute('aria-label','上传图片与裁选');
  dialog.innerHTML=`<div class="dialog-title"><h2>上传图片 · 裁选 / 转像素</h2><button type="button" data-close class="studio-button">关闭</button></div>
    <label>选择图片 <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="上传源图片"></label>
    <div class="image-crop-area"><section><h3>原图：拖动框选 · 框内移动 · 右下角缩放</h3><canvas data-source aria-label="原图裁选"></canvas>
    <div class="crop-fields"><label>X <input type="number" min="0" value="0" aria-label="裁选 X"></label><label>Y <input type="number" min="0" value="0" aria-label="裁选 Y"></label><label>宽 <input type="number" min="1" value="1" aria-label="裁选宽度"></label><label>高 <input type="number" min="1" value="1" aria-label="裁选高度"></label></div>
    <button type="button" data-all class="studio-button">选整张图</button></section><section><h3>导入预览</h3><canvas data-preview aria-label="裁选结果预览"></canvas></section></div>
    <div class="pixel-import-controls"><label>像素宽度 <input type="number" min="1" max="512" value="32" aria-label="像素宽度"></label><button type="button" data-fit class="studio-button">适合当前画布</button>
    <label><input type="checkbox" data-pixel checked>转成像素图</label><label>颜色 <select data-colors aria-label="颜色数量"><option value="0" selected>保留原图颜色</option><option>8</option><option>16</option><option>32</option><option>64</option></select></label>
    <label>缩小方式 <select data-sampling aria-label="缩小方式"><option value="smooth">平滑缩小（照片 / 大图）</option><option value="nearest">最近邻（已有像素画）</option></select></label></div>
    <p data-status aria-live="polite">选择图片后可框选局部，再调整尺寸和颜色。</p><div class="image-import-actions"><button type="button" data-place class="studio-button save-primary" disabled>放到当前画布</button><button type="button" data-import class="studio-button" disabled>新建独立素材</button></div>
    <p>放入后拖动图片移动，拖动右下角白色方块等比缩放。取消选中后，用“移动 / 缩放”点回图片；方向键微调，Ctrl+Z 撤销。</p>`;
  document.body.append(dialog);
  const file=dialog.querySelector('input[type=file]'),width=dialog.querySelector('[aria-label="像素宽度"]'),colors=dialog.querySelector('[data-colors]'),sampling=dialog.querySelector('[data-sampling]'),pixelize=dialog.querySelector('[data-pixel]'),sourceCanvas=dialog.querySelector('[data-source]'),preview=dialog.querySelector('[data-preview]'),status=dialog.querySelector('[data-status]'),place=dialog.querySelector('[data-place]'),submit=dialog.querySelector('[data-import]'),fields=[...dialog.querySelectorAll('.crop-fields input')];
  let image=null,filename='',loading=false,crop=null,pixels=null,start=null;
  trigger.onclick=()=>dialog.showModal();dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  function drawSource(){
    if(!image)return;const scale=Math.min(360/image.width,200/image.height);sourceCanvas.width=Math.max(1,Math.round(image.width*scale));sourceCanvas.height=Math.max(1,Math.round(image.height*scale));
    const ctx=sourceCanvas.getContext('2d');ctx.drawImage(image,0,0,sourceCanvas.width,sourceCanvas.height);ctx.strokeStyle='#227865';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.strokeRect(crop.x*sourceCanvas.width/image.width,crop.y*sourceCanvas.height/image.height,crop.w*sourceCanvas.width/image.width,crop.h*sourceCanvas.height/image.height);
    ctx.setLineDash([]);ctx.fillStyle='#fff';const x=(crop.x+crop.w)*sourceCanvas.width/image.width,y=(crop.y+crop.h)*sourceCanvas.height/image.height;ctx.fillRect(x-4,y-4,8,8);ctx.strokeRect(x-4,y-4,8,8);
    fields.forEach((input,i)=>input.value=[crop.x,crop.y,crop.w,crop.h][i]);
  }
  function fit(){if(!crop)return;const f=app.project.getCurrentFrame();width.value=Math.max(1,Math.min(512,crop.w,f?.width||512,Math.floor((f?.height||512)*crop.w/crop.h)));}
  function render(){
    submit.disabled=place.disabled=true;pixels=null;colors.disabled=!pixelize.checked;if(!image||loading)return;
    try{
      pixels=PE.imageToPixels(image,crop,Number(width.value),{pixelize:pixelize.checked,colors:Number(colors.value),sampling:sampling.value});
      preview.width=pixels.width;preview.height=pixels.height;preview.getContext('2d').putImageData(pixels,0,0);
      const f=app.project.getCurrentFrame(),fits=f&&!f.locked&&pixels.width<=f.width&&pixels.height<=f.height;
      status.textContent='裁选 '+crop.w+' × '+crop.h+' → '+pixels.width+' × '+pixels.height+' 像素'+(pixelize.checked&&Number(colors.value)?' · 最多 '+colors.value+' 色':' · 保留原图颜色')+(fits?'':'；比当前画布大，可点“适合当前画布”或新建独立素材');
      submit.disabled=false;place.disabled=!fits;
    }catch(error){status.textContent=error.message;}
  }
  function point(event){const r=sourceCanvas.getBoundingClientRect();return {x:Math.max(0,Math.min(image.width,Math.floor((event.clientX-r.left)*image.width/r.width))),y:Math.max(0,Math.min(image.height,Math.floor((event.clientY-r.top)*image.height/r.height)))};}
  function cropMode(p){
    const r=sourceCanvas.getBoundingClientRect();
    if(Math.abs(p.x-crop.x-crop.w)<=6*image.width/r.width&&Math.abs(p.y-crop.y-crop.h)<=6*image.height/r.height)return 'resize';
    return (crop.w<image.width||crop.h<image.height)&&p.x>=crop.x&&p.x<crop.x+crop.w&&p.y>=crop.y&&p.y<crop.y+crop.h?'move':'select';
  }
  sourceCanvas.onpointerdown=event=>{if(!image||loading||event.button!==0)return;const p=point(event);start={...p,crop:{...crop},mode:cropMode(p)};sourceCanvas.setPointerCapture(event.pointerId);};
  sourceCanvas.onpointermove=event=>{
    if(!image||loading)return;const end=point(event);sourceCanvas.style.cursor=({resize:'nwse-resize',move:'move',select:'crosshair'})[start?.mode||cropMode(end)];if(!start)return;
    const s=start.crop;
    if(start.mode==='move')crop={...s,x:Math.max(0,Math.min(image.width-s.w,s.x+end.x-start.x)),y:Math.max(0,Math.min(image.height-s.h,s.y+end.y-start.y))};
    else if(start.mode==='resize')crop={...s,w:Math.max(1,end.x-s.x),h:Math.max(1,end.y-s.y)};
    else{crop={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),w:Math.max(1,Math.abs(end.x-start.x)),h:Math.max(1,Math.abs(end.y-start.y))};crop.x=Math.min(crop.x,image.width-crop.w);crop.y=Math.min(crop.y,image.height-crop.h);}
    drawSource();
  };
  sourceCanvas.onpointerup=()=>{if(!start)return;const mode=start.mode;start=null;if(mode!=='move')fit();render();};
  sourceCanvas.onpointercancel=()=>{if(!start)return;crop=start.crop;start=null;drawSource();render();};
  fields.forEach(input=>input.oninput=()=>{const [x,y,w,h]=fields.map(f=>Number(f.value));crop={x,y,w,h};fit();render();if(pixels)drawSource();});
  dialog.querySelector('[data-all]').onclick=()=>{if(!image)return;crop={x:0,y:0,w:image.width,h:image.height};drawSource();fit();render();};
  dialog.querySelector('[data-fit]').onclick=()=>{fit();render();};
  file.onchange=async()=>{
    image?.close();image=null;pixels=null;submit.disabled=place.disabled=true;const selected=file.files[0];if(!selected)return;
    if(!['image/png','image/jpeg','image/webp'].includes(selected.type)||selected.size>64*1024*1024){status.textContent='请选择 64 MB 以内的 PNG、JPEG 或 WebP 图片';return;}
    loading=true;file.disabled=true;status.textContent='读取图片…';
    try{const decoded=await createImageBitmap(selected);if(decoded.width*decoded.height>16*1024*1024){decoded.close();throw new Error('图片超过 1600 万像素，请先缩小原图');}image=decoded;filename=selected.name.replace(/\.[^/.]+$/,'');crop={x:0,y:0,w:image.width,h:image.height};drawSource();fit();}
    catch(error){status.textContent='图片读取失败：'+error.message;}
    finally{loading=false;file.disabled=false;render();}
  };
  width.oninput=colors.onchange=sampling.onchange=pixelize.onchange=render;
  place.onclick=()=>{try{if(!pixels)return;PE.addImageLayer(app,pixels,filename);dialog.close();}catch(error){status.textContent=error.message;}};
  submit.onclick=async()=>{
    submit.disabled=place.disabled=true;
    try{
      const blob=await new Promise(resolve=>preview.toBlob(resolve,'image/png'));if(!blob)throw new Error('图片转换失败');
      const p=app.project,si=p.spriteSheets.length;await app.handleImport([new File([blob],filename+'-裁选.png',{type:'image/png'})]);
      if(app.project!==p||p.spriteSheets.length!==si+1)throw new Error('工程已变化，请重新导入');
      const sheet=p.spriteSheets[si];sheet.frameWidth=preview.width;sheet.frameHeight=preview.height;sheet.columns=1;sheet.rows=1;
      for(const l of p.layers)if(l.sheetIndex===si)l.frameData.clear();app.sheetManager.cutFrames(p,si);
      const blank=p.layers.findIndex(l=>l.sheetIndex===si&&!l.isOriginal&&!l.frameData.size);if(blank>=0)p.removeLayer(blank);
      const base=p.layers.find(l=>l.sheetIndex===si&&l.isOriginal);base.locked=false;base.name='导入 · '+filename;p.currentLayerIndex=p.layers.indexOf(base);
      app.updateAll();app.canvasManager.centerView();app.toolManager.setSelection(0,0,preview.width,preview.height);app.toolManager.setTool('move');app.updateToolbar();app.canvasManager.render();app.persistence.markDirty();dialog.close();
    }catch(error){status.textContent=error.message;}
    finally{render();}
  };
});
