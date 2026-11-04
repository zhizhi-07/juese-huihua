/* A native-resolution working canvas; placement never resamples its pixels. */
window.PE=window.PE||{};
PE.HDCanvasSession=class{
  constructor(app){
    this.app=app;this.target=app.project;this.layer=this.target.getCurrentLayer();this.key=this.target.getFrameKey();
    this.frame=this.target.getCurrentFrame();this.original=this.layer?.getFrameData(this.key);
    this.check();
    // shortcut: existing per-pixel history/fill is object-heavy; larger sources need tiled tools first.
    if(this.original.width>512||this.original.height>512)throw new Error('高清画布编辑目前支持最大 512×512；更大的原图仍可无损放置');
    const p=this.project=new PE.Project(),s=new PE.SpriteSheet('高清源画布'),a=new PE.Action('源像素');
    s.frameWidth=this.original.width;s.frameHeight=this.original.height;
    a.frames=[new PE.Frame(0,0,0,s.frameWidth,s.frameHeight)];s.actions=[a];p.spriteSheets=[s];
    p.layers[0].frameData.set('0_0_0',new ImageData(this.original.data.slice(),s.frameWidth,s.frameHeight));
    this.history=new PE.HistoryManager();
  }
  check(){
    const p=this.target,l=this.layer,f=this.frame,d=this.original,r=d?.placement;
    const [si,ai,fi]=this.key.split('_').map(Number);
    if(this.app.project!==p||p.spriteSheets[si]?.actions[ai]?.frames[fi]!==f||!p.layers.includes(l)||l?.getFrameData(this.key)!==d)throw new Error('原图层已变化；请保留当前画布，取消后重新打开，未覆盖工程');
    if(!r||l.isGroup||l.locked||l.inheritedBase||PE.isHandLayer(l)||!PE.isLayerVisible(p,l)||!f||f.locked)throw new Error('请选择当前帧可编辑的高清图层（受保护图层不能编辑）');
    PE.utils.validateImagePlacement(r,f);
    if(PE.utils.imagePlacementLocked(r,f))throw new Error('高清画布覆盖保护区域，不能编辑');
  }
  changed(){return this.project.layers[0].getFrameData('0_0_0').data.some((v,i)=>v!==this.original.data[i]);}
  apply(){
    this.check();if(!this.changed())return false;
    const next=PE.utils.cloneImageData(this.project.layers[0].getFrameData('0_0_0'));next.placement={...this.original.placement};
    const l=this.layer,k=this.key,before=this.original,h=this.app.history;
    l.frameData.set(k,next);
    h.undoStack.push({description:'编辑高清源画布',changes:[],undo:()=>l.frameData.set(k,before),redo:()=>l.frameData.set(k,next)});
    if(h.undoStack.length>h.maxSteps)h.undoStack.shift();h.redoStack=[];h._notifyChange();
    this.app.persistence?.markDirty();this.app.updateAll();return true;
  }
};
document.addEventListener('DOMContentLoaded',()=>{
  const app=PE.app,bar=document.querySelector('.image-edit-toolbar');if(!bar)return;
  const create=document.createElement('button'),edit=document.createElement('button');
  for(const b of [create,edit]){b.type='button';b.className='studio-button';}
  create.textContent='新建高清画布';edit.textContent='编辑高清画布';bar.querySelector('strong').after(create,edit);
  const dialog=document.createElement('dialog');dialog.className='advanced-dialog hd-canvas-dialog';dialog.setAttribute('aria-label','可编辑高清源画布');
  dialog.innerHTML=`<div class="dialog-title"><h2>高清源画布</h2><button type="button" data-cancel class="studio-button">取消</button></div>
    <p data-info></p><div class="pixel-import-controls">
    <button type="button" data-tool="pencil" class="studio-button">画笔</button><button type="button" data-tool="eraser" class="studio-button">橡皮</button><button type="button" data-tool="fill" class="studio-button">填充</button><button type="button" data-tool="eyedropper" class="studio-button">取色</button>
    <label>颜色 <input type="color" value="#000000" aria-label="高清画布颜色"></label><label>笔宽 <input type="number" value="1" min="1" max="32" aria-label="高清画布笔宽"></label>
    <button type="button" data-undo class="studio-button">撤销源画布</button><button type="button" data-redo class="studio-button">重做源画布</button>
    <button type="button" data-minus class="studio-button" aria-label="缩小源画布视图">−</button><button type="button" data-plus class="studio-button" aria-label="放大源画布视图">＋</button><button type="button" data-fit class="studio-button">居中适合</button><label><input type="checkbox" data-grid checked>像素网格</label></div>
    <div class="hd-source-viewport"><canvas data-canvas aria-label="高清源像素画布" tabindex="0"></canvas></div>
    <p>直接修改源像素，不是缩小后涂抹。滚轮缩放视图，中键拖动画布；Ctrl+Z 撤销源画布。应用仅修改当前图层当前帧，工程仍需手动保存。</p>
    <p data-status role="status"></p><button type="button" data-apply class="studio-button save-primary">应用到当前图层</button>`;
  const size=document.createElement('dialog');size.className='advanced-dialog';size.setAttribute('aria-label','新建高清画布');
  size.innerHTML=`<h2>新建可编辑高清画布</h2><p>源画布可以比人物脸大，放置尺寸只决定它在人物上占多大。</p>
    <div class="pixel-import-controls"><label>名称 <input data-name value="眼睛" aria-label="高清画布名称"></label><label>源宽 <input type="number" data-w value="96" min="1" max="512" aria-label="高清源宽度"></label><label>源高 <input type="number" data-h value="48" min="1" max="512" aria-label="高清源高度"></label><label>放置宽 <input type="number" data-place value="16" min="1" aria-label="新建高清放置宽度"></label></div>
    <p data-status role="status"></p><button type="button" data-create class="studio-button">创建并绘画</button><button type="button" data-cancel class="studio-button">取消新建</button>`;
  document.body.append(dialog,size);
  let session,cm,tm,pan=null,pointer=null;
  const canvas=dialog.querySelector('[data-canvas]'),status=dialog.querySelector('[data-status]'),color=dialog.querySelector('input[type=color]');
  const report=e=>{bar.querySelector('[data-edit-status]').textContent=e.message;};
  function fit(){canvas.width=canvas.parentElement.clientWidth;canvas.height=canvas.parentElement.clientHeight;cm.zoom=Math.max(1,Math.min(16,Math.floor(Math.min((canvas.width-24)/session.original.width,(canvas.height-24)/session.original.height))));cm.centerView();cm.render();}
  function open(){
    try{
      if(app.toolManager.isDrawing)throw new Error('请先结束当前笔画');
      session=new PE.HDCanvasSession(app);app.animationPlayer.pause();app.toolManager.clearSelection();
      cm=new PE.CanvasManager(canvas,session.project);tm=new PE.ToolManager();tm.init(session.project,cm,session.history);
      tm.setColor(app.toolManager.primaryColor);color.value=PE.utils.rgbaToHex(tm.primaryColor.r,tm.primaryColor.g,tm.primaryColor.b);
      tm.onColorPick=c=>color.value=PE.utils.rgbaToHex(c.r,c.g,c.b);
      dialog.querySelector('[aria-label="高清画布笔宽"]').value='1';status.textContent='';dialog.querySelector('[data-grid]').checked=true;
      dialog.querySelector('[data-info]').textContent=session.layer.name+' · 源 '+session.original.width+'×'+session.original.height+' → 人物上 '+session.original.placement.w+'×'+session.original.placement.h;
      dialog.showModal();fit();setTool('pencil');canvas.focus();
    }catch(e){report(e);}
  }
  function finish(){if(pointer!==null){tm.onMouseUp();pointer=null;pan=null;cm.render();}}
  function close(){finish();if(session.changed()&&!confirm('放弃尚未应用的高清画布修改？'))return;dialog.close();}
  function setTool(tool){finish();tm.setTool(tool);for(const b of dialog.querySelectorAll('[data-tool]'))b.setAttribute('aria-pressed',String(b.dataset.tool===tool));}
  edit.onclick=open;create.onclick=()=>{size.querySelector('[data-status]').textContent='';size.showModal();};
  size.querySelector('[data-cancel]').onclick=()=>size.close();
  size.querySelector('[data-create]').onclick=()=>{
    try{
      const w=Number(size.querySelector('[data-w]').value),h=Number(size.querySelector('[data-h]').value),pw=Number(size.querySelector('[data-place]').value),f=app.project.getCurrentFrame();
      if(![w,h,pw].every(Number.isSafeInteger)||w<1||h<1||w>512||h>512||pw<1)throw new Error('源宽高需为 1–512 的整数，放置宽度需为正整数');
      const pixels=new ImageData(w,h);pixels.placement=PE.utils.validateImagePlacement({x:0,y:0,w:pw,h:Math.max(1,Math.round(pw*h/w))},f);
      PE.addImageLayer(app,pixels,size.querySelector('[data-name]').value.trim()||'画布');app.updateAll();size.close();open();
    }catch(e){size.querySelector('[data-status]').textContent=e.message;}
  };
  dialog.querySelector('[data-cancel]').onclick=close;
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.querySelector('[data-apply]').onclick=()=>{finish();try{session.apply();dialog.close();}catch(e){status.textContent=e.message;}};
  for(const b of dialog.querySelectorAll('[data-tool]'))b.onclick=()=>setTool(b.dataset.tool);
  color.oninput=()=>tm.setColor(PE.utils.hexToRGBA(color.value));
  dialog.querySelector('[aria-label="高清画布笔宽"]').onchange=e=>tm.setBrushSize(Number(e.target.value));
  for(const action of ['undo','redo'])dialog.querySelector('[data-'+action+']').onclick=()=>{finish();session.history[action](session.project);cm.render();};
  function zoom(inside){cm.setZoom(Math.min(16,inside?cm.zoom*2:Math.max(1,Math.floor(cm.zoom/2))));}
  dialog.querySelector('[data-minus]').onclick=()=>zoom(false);dialog.querySelector('[data-plus]').onclick=()=>zoom(true);dialog.querySelector('[data-fit]').onclick=fit;
  dialog.querySelector('[data-grid]').onchange=e=>{cm.showGrid=e.target.checked;cm.render();};
  const point=e=>{const p=cm.screenToPixel(e.clientX,e.clientY);return {x:Math.max(-1,Math.min(session.original.width,p.x)),y:Math.max(-1,Math.min(session.original.height,p.y))};};
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(pointer!==null)return;e.preventDefault();canvas.focus();pointer=e.pointerId;canvas.setPointerCapture(pointer);if(e.button===1)pan={x:e.clientX,y:e.clientY};else{const p=point(e);tm.onMouseDown(p.x,p.y,e.button);cm.render();}});
  canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;if(pan){cm.pan(e.clientX-pan.x,e.clientY-pan.y);pan={x:e.clientX,y:e.clientY};}else{const p=point(e);tm.onMouseMove(p.x,p.y);}cm.render();});
  canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',()=>{session.history.discardBatch(session.project);tm.isDrawing=false;pointer=null;pan=null;cm.render();});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0);},{passive:false});
  window.addEventListener('keydown',e=>{
    if(!dialog.open&&!size.open)return;e.stopImmediatePropagation();
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();if(dialog.open)status.textContent='先应用到图层，再保存工程；源画布尚未自动保存。';return;}
    if(!dialog.open||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
    if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();finish();session.history[e.key.toLowerCase()==='y'||e.shiftKey?'redo':'undo'](session.project);cm.render();}
  },true);
  window.addEventListener('beforeunload',e=>{if(dialog.open&&session.changed()){e.preventDefault();e.returnValue='';}});
  new ResizeObserver(()=>{if(dialog.open)fit();}).observe(canvas.parentElement);
});
