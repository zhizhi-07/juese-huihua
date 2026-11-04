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
PE.removeImageColor=function(image,{rgb,tolerance=0,neutralOnly=false}){
  if(!Array.isArray(rgb)||rgb.length!==3||!rgb.every(v=>Number.isInteger(v)&&v>=0&&v<=255)||!Number.isInteger(tolerance)||tolerance<0||tolerance>255)throw new Error('抠图颜色或容差无效');
  const d=image.data;
  for(let i=0;i<d.length;i+=4){
    if(!d[i+3])continue;
    if(neutralOnly&&Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])>20)continue;
    if(rgb.every((v,c)=>Math.abs(d[i+c]-v)<=tolerance))d.fill(0,i,i+4);
  }
  return image;
};
PE.flipImagePixels=function(image,vertical=false){
  const {width:w,height:h,data}=image,source=data.slice();
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=((vertical?h-1-y:y)*w+(vertical?x:w-1-x))*4;
    data.set(source.subarray(i,i+4),(y*w+x)*4);
  }
  return image;
};
PE.hairGrayImage=function(image){
  const d=image.data,w=image.width,h=image.height;
  for(let i=0;i<d.length;i+=4){
    if(d[i+3]<128){d.fill(0,i,i+4);continue;}
    const x=i/4%w,y=Math.floor(i/4/w),edge=x===0||y===0||x===w-1||y===h-1||[i-4,i+4,i-w*4,i+w*4].some(j=>d[j+3]<128);
    // Dark filled regions are shadows, not thick outlines; retain dark ink only beside transparency.
    const light=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2],v=light<145&&edge?119:light<195?178:209;
    d.set([v,v,v,255],i);
  }
  return image;
};
// Existing pixel art defaults to nearest-neighbor; photos can explicitly select smooth reduction.
PE.imageToPixels=function(image,crop,width,{pixelize=true,colors=0,sampling='nearest',keyColor=null,palette='original',flipX=false,flipY=false,preserveThin=false,keepSource=false}={}){
  if(!crop||![crop.x,crop.y,crop.w,crop.h,width].every(Number.isSafeInteger)||crop.w<1||crop.h<1||crop.w>16384||crop.h>16384||crop.w*crop.h>16*1024*1024||crop.x>=image.width||crop.y>=image.height||crop.x+crop.w<=0||crop.y+crop.h<=0)throw new Error('裁选范围无效或与原图没有交集（最大1600万像素）');
  if(keepSource){width=crop.w;pixelize=false;sampling='nearest';palette='original';preserveThin=false;}
  const height=Math.max(1,Math.round(crop.h*width/crop.w)),limit=keepSource?16384:512;
  if(width<1||width>limit||height>limit)throw new Error('输出宽高需要在 1–'+limit+' 像素之间');
  if(!['nearest','smooth'].includes(sampling)||!['original','hair-gray'].includes(palette))throw new Error('采样方式或色板无效');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=sampling==='smooth'&&(width!==crop.w||height!==crop.h);ctx.imageSmoothingQuality='high';
  const source=document.createElement('canvas');source.width=crop.w;source.height=crop.h;
  const cropped=source.getContext('2d');cropped.imageSmoothingEnabled=false;
  cropped.translate(flipX?crop.w:0,flipY?crop.h:0);cropped.scale(flipX?-1:1,flipY?-1:1);cropped.drawImage(image,-crop.x,-crop.y);cropped.resetTransform();
  // Crop overflow stays transparent; key before resampling to avoid black fringes.
  if(keyColor)cropped.putImageData(PE.removeImageColor(cropped.getImageData(0,0,crop.w,crop.h),keyColor),0,0);
  ctx.drawImage(source,0,0,crop.w,crop.h,0,0,width,height);
  const pixels=ctx.getImageData(0,0,width,height);
  if(preserveThin&&sampling==='nearest'&&pixelize&&(width<crop.w||height<crop.h)){
    const original=cropped.getImageData(0,0,crop.w,crop.h).data;
    // Retain thin opaque strokes that nearest-neighbor misses inside each destination pixel's footprint.
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4;if(pixels.data[i+3]>=128)continue;let best=-1,distance=Infinity;
      const cx=(x+.5)*crop.w/width,cy=(y+.5)*crop.h/height;
      for(let sy=Math.floor(y*crop.h/height);sy<Math.ceil((y+1)*crop.h/height);sy++)for(let sx=Math.floor(x*crop.w/width);sx<Math.ceil((x+1)*crop.w/width);sx++){
        const j=(sy*crop.w+sx)*4,d=(sx+.5-cx)**2+(sy+.5-cy)**2;
        if(original[j+3]>=128&&d<distance){distance=d;best=j;}
      }
      if(best>=0)pixels.data.set(original.subarray(best,best+4),i);
    }
  }
  if(palette==='hair-gray')return PE.hairGrayImage(pixels);return pixelize?PE.quantizeImage(pixels,colors):pixels;
};
PE.addImageLayer=function(app,pixels,name){
  const p=app.project,frame=p.getCurrentFrame();
  if(!frame||frame.locked)throw new Error('当前帧不可编辑');
  const w=pixels?.placement?.w||pixels?.width,h=pixels?.placement?.h||pixels?.height;
  if(!pixels?.data||w>frame.width||h>frame.height)throw new Error('图片比当前画布大，请减小像素宽度或点击“适合当前画布”');
  const x=Math.floor((frame.width-w)/2),y=Math.floor((frame.height-h)/2);
  const data=pixels.placement?PE.utils.cloneImageData(pixels):new ImageData(frame.width,frame.height);
  if(pixels.placement){data.placement=PE.utils.validateImagePlacement({x,y,w,h},frame);for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)if(frame.isPixelLocked(col,row))throw new Error('图片会覆盖当前帧的保护区域，请先调整锁定区域');}
  else for(let row=0;row<pixels.height;row++)for(let col=0;col<pixels.width;col++){
    const i=(row*pixels.width+col)*4;if(!pixels.data[i+3])continue;
    if(frame.isPixelLocked(x+col,y+row))throw new Error('图片会覆盖当前帧的保护区域，请先调整锁定区域');
    data.data.set(pixels.data.subarray(i,i+4),((y+row)*frame.width+x+col)*4);
  }
  const previousTool=app.toolManager.currentTool;app.animationPlayer.pause();app.toolManager.clearSelection();
  const before=p.layers.slice(),selected=p.currentLayerIndex,layer=new PE.Layer((pixels.placement?'高清 · ':'导入 · ')+name);layer.sheetIndex=p.currentSheetIndex;layer.frameData.set(p.getFrameKey(),data);p.layers.push(layer);p.currentLayerIndex=p.layers.length-1;
  const after=p.layers.slice(),index=p.currentLayerIndex;
  app.history.undoStack.push({description:'放入裁选图片',changes:[],undo:()=>{p.layers=before.slice();p.currentLayerIndex=selected;app.toolManager.clearSelection();app.toolManager.setTool(previousTool);app.updateToolbar();},redo:()=>{p.layers=after.slice();p.currentLayerIndex=index;app.toolManager.setSelection(x,y,w,h);app.toolManager.setTool('move');app.updateToolbar();}});
  app.history.redoStack=[];app.toolManager.setSelection(x,y,w,h);app.toolManager.setTool('move');app.updateToolbar();app.history._notifyChange();app.persistence?.markDirty();
  return layer;
};
document.addEventListener('DOMContentLoaded',()=>{
  const app=PE.app,original=document.getElementById('import-btn');
  const menu=document.createElement('details');menu.className='import-menu';
  const summary=document.createElement('summary');summary.textContent='文件 ▾';
  const actions=document.createElement('div');actions.className='import-actions';original.before(menu);menu.append(summary,actions);actions.append(original);original.textContent='原样导入素材 / Aseprite';
  const projectImport=document.getElementById('import-project-btn');projectImport.textContent='导入工程文件（JSON）';actions.append(projectImport);
  const trigger=document.createElement('button');trigger.className='studio-button';trigger.textContent='上传图片';menu.before(trigger);
  const imageTools=document.createElement('section');imageTools.className='image-edit-toolbar';imageTools.setAttribute('aria-label','画布图片工具');
  imageTools.innerHTML=`<strong>图片工具</strong><button type="button" data-edit-flip-x class="studio-button">水平翻转</button><button type="button" data-edit-flip-y class="studio-button">上下翻转</button><label>抠除颜色 <input type="color" value="#303030" aria-label="画布抠除颜色"></label><label>容差 <input type="number" value="32" min="0" max="255" aria-label="画布抠图容差"></label><label><input type="checkbox" data-edit-neutral>只抠灰黑</label><button type="button" data-edit-key class="studio-button">按颜色抠图</button><button type="button" data-edit-black class="studio-button">去黑色人形</button><span data-edit-status role="status">作用于当前图层的选区；未框选时作用于当前图层整帧，可撤销。</span>`;
  document.querySelector('.canvas-viewbar').after(imageTools);
  for(const button of imageTools.querySelectorAll('button'))button.setAttribute('aria-label',button.textContent+'当前图层或选区');
  const editStatus=imageTools.querySelector('[data-edit-status]'),editColor=imageTools.querySelector('input[type=color]'),editTolerance=imageTools.querySelector('input[type=number]'),editNeutral=imageTools.querySelector('[data-edit-neutral]');
  const imageSize=document.createElement('label'),placedWidth=document.createElement('input'),imageInfo=document.createElement('span');
  imageSize.textContent='高清放置宽度 ';placedWidth.type='number';placedWidth.min='1';placedWidth.max='4096';placedWidth.setAttribute('aria-label','高清图层放置宽度');imageSize.append(placedWidth);editStatus.before(imageSize,imageInfo);
  const freeLabel=document.createElement('label'),freePlacement=document.createElement('input'),positionFields=document.createElement('span');
  freePlacement.type='checkbox';freePlacement.setAttribute('aria-label','无视像素格放置');freeLabel.append(freePlacement,'无视像素格放置（普通 / 高清图层）');
  positionFields.className='pixel-import-controls image-position-fields';positionFields.innerHTML='<label>X <input type="number" min="0" step="1" aria-label="图层位置 X"></label><label>Y <input type="number" min="0" step="1" aria-label="图层位置 Y"></label>';
  const positionX=positionFields.querySelector('[aria-label="图层位置 X"]'),positionY=positionFields.querySelector('[aria-label="图层位置 Y"]');editStatus.before(freeLabel,positionFields);
  function imageDetails(){
    const p=app.project,data=p.getCurrentLayer()?.getFrameData(p.getFrameKey()),r=data?.placement;
    imageSize.style.display=r?'flex':'none';imageInfo.textContent=r?'原图 '+data.width+'×'+data.height+' 保持不变 → 放置 '+r.w+'×'+r.h+' · PNG 自动高清导出':'';
    if(r)placedWidth.value=r.w;
    const position=r||(freePlacement.checked?app.toolManager.getLayerPlacement():null);
    positionFields.style.display=position?'flex':'none';
    for(const [input,axis]of [[positionX,'x'],[positionY,'y']]){input.step=freePlacement.checked?'0.1':'1';if(position&&document.activeElement!==input)input.value=Math.round(position[axis]*1e6)/1e6;}
  }
  freePlacement.onchange=()=>{
    if(app.toolManager.isDrawing){freePlacement.checked=app.toolManager.freeImagePlacement;editStatus.textContent='请先结束当前拖动';return;}
    app.toolManager.freeImagePlacement=freePlacement.checked;imageDetails();
    editStatus.textContent=freePlacement.checked?'普通 / 高清图层均可整层自由放置，方向键微调 0.1 格；高清局部可框选移动，不重采样。画笔请用“编辑高清画布”。':'按像素格放置；已有位置不会因取消勾选而改变，下次移动时吸附到格子。';
  };
  for(const [input,axis]of [[positionX,'x'],[positionY,'y']])input.onchange=()=>{
    try{
      const p=app.project,tm=app.toolManager,r=tm.getLayerPlacement(),value=Number(input.value);
      if(!r||tm.isDrawing||input.value.trim()===''||!Number.isFinite(value)||!freePlacement.checked&&!Number.isSafeInteger(value))throw new Error('自由小数坐标需先勾选“无视像素格放置”，否则请输入整数');
      app.animationPlayer.pause();
      if(!tm.transformSelection(p.currentLayerIndex,p.getFrameKey(),r,{...r,[axis]:value}))throw new Error('位置越界或包含保护区域，未修改');
      app.persistence?.markDirty();app.updateAll();editStatus.textContent='已调整当前帧图层位置，源像素未重采样，可撤销';
    }catch(e){editStatus.textContent=e.message;}
    finally{imageDetails();}
  };
  const updateStatus=app.updateStatusBar.bind(app);app.updateStatusBar=()=>{updateStatus();imageDetails();};imageDetails();
  placedWidth.onchange=()=>{
    const p=app.project,tm=app.toolManager,data=p.getCurrentLayer()?.getFrameData(p.getFrameKey()),r=data?.placement,w=Number(placedWidth.value);
    try{
      if(!r||tm.isDrawing||!Number.isSafeInteger(w)||w<1||w>4096)throw new Error('请输入有效的放置宽度，并先结束拖动');
      const target={...r,w,h:Math.max(1,Math.round(w*data.height/data.width))};
      if(!tm.transformSelection(p.currentLayerIndex,p.getFrameKey(),r,target))throw new Error('图片越界或包含保护区域，未修改原图');
      app.persistence?.markDirty();app.updateAll();editStatus.textContent='只改变高清图片摆放尺寸，原始像素未重采样';
    }catch(error){editStatus.textContent=error.message;imageDetails();}
  };
  app.toolManager.onImageEditBlocked=message=>editStatus.textContent=message;
  function editCurrent(edit,description){
    const tm=app.toolManager,p=app.project,frame=p.getCurrentFrame();
    if(!frame||tm.isDrawing){editStatus.textContent='请先结束当前操作并选择可编辑图层';return;}
    const hadSelection=!!tm.selection;
    try{
      app.animationPlayer.pause();
      if(!hadSelection){const r=p.getCurrentLayer()?.getFrameData(p.getFrameKey())?.placement||{x:0,y:0,w:frame.width,h:frame.height};tm.setSelection(r.x,r.y,r.w,r.h);}
      const r=p.getCurrentLayer()?.getFrameData(p.getFrameKey())?.placement;
      if(r&&!['x','y','w','h'].every(k=>tm.selection?.[k]===r[k]))throw new Error('高清图片按整张源图翻转 / 抠图；请取消框选或用“移动 / 缩放”点选整张图片');
      if(!tm.editSelection(edit,description))throw new Error('当前图层、帧或选区被保护，未修改图片');
      app.persistence?.markDirty();app.updateAll();editStatus.textContent=description+'完成 · 仅修改当前图层 / 当前帧，可撤销';
    }catch(error){editStatus.textContent=error.message;}
    finally{if(!hadSelection)tm.clearSelection();}
  }
  imageTools.querySelector('[data-edit-flip-x]').onclick=()=>editCurrent(p=>PE.flipImagePixels(p),'水平翻转');
  imageTools.querySelector('[data-edit-flip-y]').onclick=()=>editCurrent(p=>PE.flipImagePixels(p,true),'上下翻转');
  imageTools.querySelector('[data-edit-key]').onclick=()=>editCurrent(p=>PE.removeImageColor(p,{rgb:editColor.value.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)),tolerance:Number(editTolerance.value),neutralOnly:editNeutral.checked}),'按颜色抠图');
  imageTools.querySelector('[data-edit-black]').onclick=()=>editCurrent(p=>PE.removeImageColor(p,{rgb:[48,48,48],tolerance:66,neutralOnly:true}),'去黑色人形');
  menu.addEventListener('click',e=>{if(e.target.closest('button'))menu.open=false;});
  const dialog=document.createElement('dialog');dialog.className='advanced-dialog pixel-import-dialog';dialog.setAttribute('aria-label','上传图片与裁选');
  dialog.innerHTML=`<div class="dialog-title"><h2>上传图片 · 裁选 / 转像素</h2><button type="button" data-close class="studio-button">关闭</button></div>
    <label>选择图片 <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="上传源图片"></label>
    <p><label><input type="checkbox" data-hd>高清图片图层（保留原图，无损缩放）</label><br>勾选后，尺寸只控制图片在画布上占多大；不减色、不像素化。放入后可点击“编辑高清画布”继续逐像素修改（最大512×512）。</p>
    <div class="image-crop-area"><section><h3>原图：拖动框选 · 框内移动 · 右下角缩放</h3><canvas data-source aria-label="原图裁选"></canvas>
    <div class="crop-fields"><label>X <input type="number" min="-16384" value="0" aria-label="裁选 X"></label><label>Y <input type="number" min="-16384" value="0" aria-label="裁选 Y"></label><label>宽 <input type="number" min="1" value="1" aria-label="裁选宽度"></label><label>高 <input type="number" min="1" value="1" aria-label="裁选高度"></label></div>
    <button type="button" data-all class="studio-button">选整张图</button><button type="button" data-reselect class="studio-button" aria-pressed="false">重新框选</button>
    <div class="pixel-import-controls"><select data-row aria-label="精灵方向"><option value="0">正面</option><option value="1">左侧</option><option value="2">右侧</option><option value="3">背面</option></select><select data-column aria-label="精灵帧"><option value="0">第1帧</option><option value="1" selected>第2帧</option><option value="2">第3帧</option></select><button type="button" data-cell class="studio-button">按3×4精灵格裁选</button></div>
    </section><section><h3>导入预览</h3><canvas data-preview aria-label="裁选结果预览"></canvas></section></div>
    <div class="pixel-import-controls"><label><span data-width-label>像素宽度</span> <input type="number" min="1" max="512" value="32" aria-label="像素宽度"></label><button type="button" data-fit class="studio-button">适合当前画布</button>
    <label><input type="checkbox" data-pixel checked>转成像素图</label><label>颜色 <select data-colors aria-label="颜色数量"><option value="0" selected>保留原图颜色</option><option>8</option><option>16</option><option>32</option><option>64</option></select></label>
    <label>缩小方式 <select data-sampling aria-label="缩小方式"><option value="nearest">最近邻（保留像素形状）</option><option value="smooth">平滑缩小（照片 / 大图）</option></select></label>
    <label>色板 <select data-palette aria-label="输出色板"><option value="original">原色</option><option value="hair-gray">头发规则灰色（三色）</option></select></label></div>
    <div class="pixel-import-controls"><button type="button" data-flip-x class="studio-button" aria-pressed="false">水平翻转</button><button type="button" data-flip-y class="studio-button" aria-pressed="false">上下翻转</button><label><input type="checkbox" data-thin aria-label="保细线轮廓">保细线轮廓（可能增粗，默认关闭）</label><button type="button" data-photo class="studio-button">原图缩放（不做像素化）</button></div>
    <div class="pixel-import-controls"><label><input type="checkbox" data-key>按颜色抠图</label><input type="color" data-key-color value="#303030" aria-label="抠除颜色"><button type="button" data-pick class="studio-button" aria-pressed="false">从原图取色</button><label>容差 <input type="number" data-tolerance value="32" min="0" max="255" aria-label="抠图容差"></label><label><input type="checkbox" data-neutral>只抠灰黑</label><button type="button" data-black class="studio-button">去黑色人形</button></div>
    <p>头发灰色：描边 #777777 · 阴影 #B2B2B2 · 底色 #D1D1D1。裁框可拖出原图，外部留透明边；高清素材可用原图缩放保留半透明，不减色。预览不改原文件。</p>
    <p data-status aria-live="polite">选择图片后可框选局部，再调整尺寸和颜色。</p><div class="image-import-actions"><button type="button" data-place class="studio-button save-primary" disabled>放到当前画布</button><button type="button" data-import class="studio-button" disabled>新建独立素材</button></div>
    <p>放入后拖动图片移动，拖动右下角白色方块等比缩放。取消选中后，用“移动 / 缩放”点回图片；方向键微调，Ctrl+Z 撤销。</p>`;
  document.body.append(dialog);
  const file=dialog.querySelector('input[type=file]'),width=dialog.querySelector('[aria-label="像素宽度"]'),colors=dialog.querySelector('[data-colors]'),sampling=dialog.querySelector('[data-sampling]'),pixelize=dialog.querySelector('[data-pixel]'),sourceCanvas=dialog.querySelector('[data-source]'),preview=dialog.querySelector('[data-preview]'),status=dialog.querySelector('[data-status]'),place=dialog.querySelector('[data-place]'),submit=dialog.querySelector('[data-import]'),fields=[...dialog.querySelectorAll('.crop-fields input')];
  const palette=dialog.querySelector('[data-palette]'),key=dialog.querySelector('[data-key]'),keyColor=dialog.querySelector('[data-key-color]'),tolerance=dialog.querySelector('[data-tolerance]'),neutral=dialog.querySelector('[data-neutral]'),pick=dialog.querySelector('[data-pick]');
  const flipX=dialog.querySelector('[data-flip-x]'),flipY=dialog.querySelector('[data-flip-y]'),thin=dialog.querySelector('[data-thin]'),reselect=dialog.querySelector('[data-reselect]');
  const hd=dialog.querySelector('[data-hd]');
  let image=null,filename='',loading=false,crop=null,pixels=null,start=null,picking=false,selectAgain=false;
  trigger.onclick=()=>dialog.showModal();dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  function drawSource(){
    if(!image)return;const scale=Math.min(360/image.width,200/image.height);sourceCanvas.width=Math.max(1,Math.round(image.width*scale));sourceCanvas.height=Math.max(1,Math.round(image.height*scale));
    const ctx=sourceCanvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,sourceCanvas.width,sourceCanvas.height);ctx.strokeStyle='#227865';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.strokeRect(crop.x*sourceCanvas.width/image.width,crop.y*sourceCanvas.height/image.height,crop.w*sourceCanvas.width/image.width,crop.h*sourceCanvas.height/image.height);
    ctx.setLineDash([]);ctx.fillStyle='#fff';const x=(crop.x+crop.w)*sourceCanvas.width/image.width,y=(crop.y+crop.h)*sourceCanvas.height/image.height;ctx.fillRect(x-4,y-4,8,8);ctx.strokeRect(x-4,y-4,8,8);
    fields.forEach((input,i)=>input.value=[crop.x,crop.y,crop.w,crop.h][i]);
  }
  function fit(){if(!crop)return;const f=app.project.getCurrentFrame();width.value=Math.max(1,Math.min(512,crop.w,f?.width||512,Math.floor((f?.height||512)*crop.w/crop.h)));}
  function render(){
    submit.disabled=place.disabled=true;pixels=null;colors.disabled=hd.checked||!pixelize.checked||palette.value!=='original';thin.disabled=hd.checked||!pixelize.checked||sampling.value!=='nearest';pixelize.disabled=sampling.disabled=palette.disabled=hd.checked;
    dialog.querySelector('[data-photo]').disabled=hd.checked;dialog.querySelector('[data-width-label]').textContent=hd.checked?'放置宽度':'像素宽度';
    width.setAttribute('aria-label',hd.checked?'放置宽度':'像素宽度');if(!image||loading)return;
    try{
      const rgb=keyColor.value.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
      const w=Number(width.value),h=Math.max(1,Math.round(crop.h*w/crop.w));
      if(!Number.isSafeInteger(w)||w<1||w>512||h>512)throw new Error('放置或输出宽高需要在 1–512 之间');
      pixels=PE.imageToPixels(image,crop,w,{keepSource:hd.checked,pixelize:pixelize.checked,colors:Number(colors.value),sampling:sampling.value,palette:palette.value,keyColor:key.checked?{rgb,tolerance:Number(tolerance.value),neutralOnly:neutral.checked}:null,flipX:flipX.getAttribute('aria-pressed')==='true',flipY:flipY.getAttribute('aria-pressed')==='true',preserveThin:thin.checked});
      if(hd.checked)pixels.placement={x:0,y:0,w,h};
      preview.width=pixels.width;preview.height=pixels.height;preview.getContext('2d').putImageData(pixels,0,0);
      const f=app.project.getCurrentFrame(),fits=f&&!f.locked&&w<=f.width&&h<=f.height;
      status.textContent=(hd.checked?'高清原图 '+pixels.width+' × '+pixels.height+' 像素保持不变 · 放置 '+w+' × '+h+' 画布单位':'裁选 '+crop.w+' × '+crop.h+' → '+pixels.width+' × '+pixels.height+' 像素'+(palette.value==='hair-gray'?' · 头发三色灰':pixelize.checked&&Number(colors.value)?' · 最多 '+colors.value+' 色':' · 保留原图颜色'))+(key.checked?' · 已抠色':'')+(fits?'':'；比当前画布大，可点“适合当前画布”或新建独立素材');
      submit.disabled=false;place.disabled=!fits;
    }catch(error){status.textContent=error.message;}
  }
  function point(event){const r=sourceCanvas.getBoundingClientRect();return {x:Math.max(-16384,Math.min(image.width+16384,Math.floor((event.clientX-r.left)*image.width/r.width))),y:Math.max(-16384,Math.min(image.height+16384,Math.floor((event.clientY-r.top)*image.height/r.height)))};}
  function cropMode(p){
    if(selectAgain)return 'select';
    const r=sourceCanvas.getBoundingClientRect();
    if(Math.abs(p.x-crop.x-crop.w)<=6*image.width/r.width&&Math.abs(p.y-crop.y-crop.h)<=6*image.height/r.height)return 'resize';
    return (crop.w<image.width||crop.h<image.height)&&p.x>=crop.x&&p.x<crop.x+crop.w&&p.y>=crop.y&&p.y<crop.y+crop.h?'move':'select';
  }
  sourceCanvas.onpointerdown=event=>{
    if(!image||loading||event.button!==0)return;const p=point(event);
    if(picking){
      const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');ctx.drawImage(image,Math.max(0,Math.min(image.width-1,p.x)),Math.max(0,Math.min(image.height-1,p.y)),1,1,0,0,1,1);const rgb=ctx.getImageData(0,0,1,1).data;
      if(!rgb[3]){status.textContent='这里已透明，请选择有颜色的像素';return;}
      keyColor.value='#'+[...rgb.slice(0,3)].map(v=>v.toString(16).padStart(2,'0')).join('');key.checked=true;neutral.checked=false;picking=false;pick.setAttribute('aria-pressed','false');render();return;
    }
    start={...p,crop:{...crop},mode:cropMode(p)};sourceCanvas.setPointerCapture(event.pointerId);
  };
  sourceCanvas.onpointermove=event=>{
    if(!image||loading)return;const end=point(event);sourceCanvas.style.cursor=picking?'copy':({resize:'nwse-resize',move:'move',select:'crosshair'})[start?.mode||cropMode(end)];if(!start)return;
    const s=start.crop;
    if(start.mode==='move')crop={...s,x:s.x+end.x-start.x,y:s.y+end.y-start.y};
    else if(start.mode==='resize')crop={...s,w:Math.max(1,end.x-s.x),h:Math.max(1,end.y-s.y)};
    else crop={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),w:Math.max(1,Math.abs(end.x-start.x)),h:Math.max(1,Math.abs(end.y-start.y))};
    drawSource();
  };
  sourceCanvas.onpointerup=()=>{if(!start)return;const mode=start.mode;start=null;selectAgain=false;reselect.setAttribute('aria-pressed','false');if(mode!=='move')fit();render();};
  sourceCanvas.onpointercancel=()=>{if(!start)return;crop=start.crop;start=null;drawSource();render();};
  fields.forEach(input=>input.oninput=()=>{const [x,y,w,h]=fields.map(f=>Number(f.value));crop={x,y,w,h};fit();render();if(pixels)drawSource();});
  dialog.querySelector('[data-all]').onclick=()=>{if(!image)return;crop={x:0,y:0,w:image.width,h:image.height};drawSource();fit();render();};
  dialog.querySelector('[data-fit]').onclick=()=>{fit();render();};
  reselect.onclick=()=>{selectAgain=true;reselect.setAttribute('aria-pressed','true');status.textContent='从原图任意位置重新拖框；可拖出图像边界留透明边';};
  for(const button of [flipX,flipY])button.onclick=()=>{button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed')!=='true'));render();};
  thin.onchange=render;
  dialog.querySelector('[data-photo]').onclick=()=>{pixelize.checked=false;sampling.value='smooth';palette.value='original';colors.value='0';key.checked=false;render();};
  dialog.querySelector('[data-cell]').onclick=()=>{
    if(!image||loading)return;
    if(image.width%3||image.height%4){status.textContent='此图不能均分为3列×4行，请手动裁选';return;}
    crop={x:Number(dialog.querySelector('[data-column]').value)*image.width/3,y:Number(dialog.querySelector('[data-row]').value)*image.height/4,w:image.width/3,h:image.height/4};drawSource();fit();render();
  };
  pick.onclick=()=>{picking=!picking;pick.setAttribute('aria-pressed',String(picking));if(picking)status.textContent='点击原图选择要抠除的颜色；再次点取色按钮可取消';};
  dialog.querySelector('[data-black]').onclick=()=>{key.checked=true;keyColor.value='#303030';tolerance.value=66;neutral.checked=true;render();};
  file.onchange=async()=>{
    image?.close();image=null;pixels=null;picking=selectAgain=false;for(const button of [pick,reselect,flipX,flipY])button.setAttribute('aria-pressed','false');submit.disabled=place.disabled=true;const selected=file.files[0];if(!selected)return;
    if(!['image/png','image/jpeg','image/webp'].includes(selected.type)||selected.size>64*1024*1024){status.textContent='请选择 64 MB 以内的 PNG、JPEG 或 WebP 图片';return;}
    loading=true;file.disabled=true;status.textContent='读取图片…';
    try{const decoded=await createImageBitmap(selected);if(decoded.width*decoded.height>16*1024*1024){decoded.close();throw new Error('图片超过 1600 万像素，请先缩小原图');}image=decoded;filename=selected.name.replace(/\.[^/.]+$/,'');crop={x:0,y:0,w:image.width,h:image.height};drawSource();fit();}
    catch(error){status.textContent='图片读取失败：'+error.message;}
    finally{loading=false;file.disabled=false;render();}
  };
  width.oninput=colors.onchange=sampling.onchange=pixelize.onchange=render;
  hd.onchange=()=>{if(hd.checked){pixelize.checked=false;colors.value='0';palette.value='original';sampling.value='nearest';thin.checked=false;}render();};
  palette.onchange=key.onchange=keyColor.oninput=tolerance.oninput=neutral.onchange=render;
  place.onclick=()=>{try{if(!pixels)return;PE.addImageLayer(app,pixels,filename);dialog.close();}catch(error){status.textContent=error.message;}};
  submit.onclick=async()=>{
    submit.disabled=place.disabled=true;
    try{
      const prepared=PE.utils.cloneImageData(pixels),r=prepared.placement;
      const importCanvas=r?document.createElement('canvas'):preview;if(r){importCanvas.width=r.w;importCanvas.height=r.h;}
      const blob=await new Promise(resolve=>importCanvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('图片转换失败');
      const p=app.project,si=p.spriteSheets.length;await app.handleImport([new File([blob],filename+'-裁选.png',{type:'image/png'})]);
      if(app.project!==p||p.spriteSheets.length!==si+1)throw new Error('工程已变化，请重新导入');
      const sheet=p.spriteSheets[si];sheet.frameWidth=importCanvas.width;sheet.frameHeight=importCanvas.height;sheet.columns=1;sheet.rows=1;
      for(const l of p.layers)if(l.sheetIndex===si)l.frameData.clear();app.sheetManager.cutFrames(p,si);
      const blank=p.layers.findIndex(l=>l.sheetIndex===si&&!l.isOriginal&&!l.frameData.size);if(blank>=0)p.removeLayer(blank);
      const base=p.layers.find(l=>l.sheetIndex===si&&l.isOriginal);base.locked=false;base.name='导入 · '+filename;p.currentLayerIndex=p.layers.indexOf(base);
      if(r){base.frameData.set(p.getFrameKey(),prepared);base.name='高清 · '+filename;}
      app.updateAll();app.canvasManager.centerView();app.toolManager.setSelection(0,0,importCanvas.width,importCanvas.height);app.toolManager.setTool('move');app.updateToolbar();app.canvasManager.render();app.persistence.markDirty();dialog.close();
    }catch(error){status.textContent=error.message;}
    finally{render();}
  };
});
