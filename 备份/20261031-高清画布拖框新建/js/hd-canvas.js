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
  create.textContent='新建高清画布';edit.textContent='编辑高清画布';edit.title='直接在主画布上修改当前高清图层，不另开窗口';bar.querySelector('strong').after(create,edit);
  function open(){
    try{
      if(app.toolManager.isDrawing)throw new Error('请先结束当前笔画');
      const session=new PE.HDCanvasSession(app),r=session.original.placement,cm=app.canvasManager;
      app.animationPlayer.pause();app.toolManager.clearSelection();app.toolManager.setTool('pencil');
      cm.setZoom(Math.max(cm.zoom,Math.ceil(Math.max(session.original.width/r.w,session.original.height/r.h)*4)));
      cm.offsetX=Math.round(cm.canvas.width/2-(r.x+r.w/2)*cm.zoom);cm.offsetY=Math.round(cm.canvas.height/2-(r.y+r.h/2)*cm.zoom);
      app.updateToolbar();app.updateZoomDisplay();cm.render();
      bar.querySelector('[data-edit-status]').textContent='直接在主画布编辑当前高清层：1px 笔宽 = 1 个源像素；脸和其他图层作为位置参考。改动可撤销，工程仍需保存。';
      cm.canvas.focus();
    }catch(e){bar.querySelector('[data-edit-status]').textContent=e.message;}
  }
  edit.onclick=open;
  const size=document.createElement('dialog');size.className='advanced-dialog';size.setAttribute('aria-label','新建高清画布');
  size.innerHTML='<h2>新建可编辑高清画布</h2><p>创建后直接在主画布绘画，其他图层仍可作为参考。</p><div class="pixel-import-controls"><label>名称 <input data-name value="眼睛" aria-label="高清画布名称"></label><label>源宽 <input type="number" data-w value="96" min="1" max="512" aria-label="高清源宽度"></label><label>源高 <input type="number" data-h value="48" min="1" max="512" aria-label="高清源高度"></label><label>放置宽 <input type="number" data-place value="16" min="1" aria-label="新建高清放置宽度"></label></div><p data-status role="status"></p><button type="button" data-create class="studio-button">创建并绘画</button><button type="button" data-cancel class="studio-button">取消新建</button>';
  document.body.append(size);create.onclick=()=>{size.querySelector('[data-status]').textContent='';size.showModal();};size.querySelector('[data-cancel]').onclick=()=>size.close();
  size.querySelector('[data-create]').onclick=()=>{
    try{
      const w=Number(size.querySelector('[data-w]').value),h=Number(size.querySelector('[data-h]').value),pw=Number(size.querySelector('[data-place]').value),f=app.project.getCurrentFrame();
      if(![w,h,pw].every(Number.isSafeInteger)||w<1||h<1||w>512||h>512||pw<1)throw new Error('源宽高需为 1–512 的整数，放置宽度需为正整数');
      const pixels=new ImageData(w,h);pixels.placement=PE.utils.validateImagePlacement({x:0,y:0,w:pw,h:Math.max(1,Math.round(pw*h/w))},f);
      PE.addImageLayer(app,pixels,size.querySelector('[data-name]').value.trim()||'画布');app.updateAll();size.close();open();
    }catch(e){size.querySelector('[data-status]').textContent=e.message;}
  };
});
