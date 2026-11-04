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
  const size=document.createElement('dialog');size.className='advanced-dialog hd-create-dialog';size.setAttribute('aria-label','新建高清画布');
  size.innerHTML='<h2>新建可编辑高清画布</h2><p>直接在下方参考画面拖框，自动确定位置、宽高和高清源尺寸（默认6倍，单边最大512）。可反向拖动或重新框选；只创建空白图层，不复制参考图。</p><canvas class="hd-region-preview" data-region aria-label="高清画布框选范围"></canvas><p data-region-info></p><div class="pixel-import-controls"><label>名称 <input data-name value="眼睛" aria-label="高清画布名称"></label><label>源宽 <input type="number" data-w value="96" min="1" max="512" aria-label="高清源宽度"></label><label>源高 <input type="number" data-h value="48" min="1" max="512" aria-label="高清源高度"></label><label>放置宽 <input type="number" data-place value="16" min="1" aria-label="新建高清放置宽度"></label></div><p data-status role="status"></p><button type="button" data-create class="studio-button">创建并绘画</button><button type="button" data-cancel class="studio-button">取消新建</button>';
  const preview=size.querySelector('[data-region]'),info=size.querySelector('[data-region-info]'),width=size.querySelector('[data-w]'),height=size.querySelector('[data-h]'),placed=size.querySelector('[data-place]'),status=size.querySelector('[data-status]');
  const reference=document.createElement('canvas');let target=null,region=null,drag=null;
  function placement(){
    const w=Number(placed.value),h=Math.max(1,Math.round(w*(region?region.h/region.w:Number(height.value)/Number(width.value))));
    return {x:region?.x??Math.floor((target.frame.width-w)/2),y:region?.y??Math.floor((target.frame.height-h)/2),w,h};
  }
  function drawRegion(){
    const ctx=preview.getContext('2d'),f=target.frame,r=placement(),sx=preview.width/f.width,sy=preview.height/f.height;
    ctx.clearRect(0,0,preview.width,preview.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(reference,0,0,preview.width,preview.height);
    if(![r.x,r.y,r.w,r.h].every(Number.isFinite))return;
    ctx.fillStyle='#00b5d733';ctx.fillRect(r.x*sx,r.y*sy,r.w*sx,r.h*sy);ctx.strokeStyle='#007b91';ctx.lineWidth=2;ctx.setLineDash([5,3]);ctx.strokeRect(r.x*sx,r.y*sy,r.w*sx,r.h*sy);
    info.textContent=(region?'已框选':'也可手动输入尺寸，默认居中')+'：位置 '+r.x+', '+r.y+' · 范围 '+r.w+'×'+r.h+' · 高清源 '+width.value+'×'+height.value;
  }
  function point(event){
    const b=preview.getBoundingClientRect(),f=target.frame;
    return {x:Math.max(0,Math.min(f.width,Math.round((event.clientX-b.left)/b.width*f.width))),y:Math.max(0,Math.min(f.height,Math.round((event.clientY-b.top)/b.height*f.height)))};
  }
  function selectRegion(event){
    const end=point(event),f=target.frame;
    region={x:Math.min(drag.start.x,end.x,f.width-1),y:Math.min(drag.start.y,end.y,f.height-1),w:Math.max(1,Math.abs(end.x-drag.start.x)),h:Math.max(1,Math.abs(end.y-drag.start.y))};
    const scale=Math.min(6,512/region.w,512/region.h);
    width.value=Math.max(1,Math.round(region.w*scale));height.value=Math.max(1,Math.round(region.h*scale));placed.value=region.w;status.textContent='';drawRegion();
  }
  preview.onpointerdown=event=>{
    if(event.button!==0||drag)return;event.preventDefault();
    drag={id:event.pointerId,start:point(event),region,values:[width.value,height.value,placed.value]};preview.setPointerCapture(event.pointerId);selectRegion(event);
  };
  preview.onpointermove=event=>{if(drag?.id===event.pointerId)selectRegion(event);};
  preview.onpointerup=event=>{if(drag?.id===event.pointerId){selectRegion(event);drag=null;}};
  preview.onlostpointercapture=preview.onpointercancel=()=>{if(!drag)return;region=drag.region;[width.value,height.value,placed.value]=drag.values;drag=null;drawRegion();};
  for(const input of [width,height,placed])input.oninput=()=>{if(target)drawRegion();};
  document.body.append(size);create.onclick=()=>{
    try{
      if(app.toolManager.isDrawing)throw new Error('请先结束当前笔画');
      const p=app.project,f=p.getCurrentFrame();if(!f||f.locked)throw new Error('当前帧不可编辑');
      app.animationPlayer.pause();target={project:p,frame:f,key:p.getFrameKey()};region=null;drag=null;status.textContent='';
      const scale=Math.max(1,Math.min(6,Math.floor(1024/Math.max(f.width,f.height)))),image=app.canvasManager.getCompositeImageData(undefined,undefined,undefined,!app.canvasManager.hideHands,scale);
      reference.width=image.width;reference.height=image.height;reference.getContext('2d').putImageData(image,0,0);
      preview.width=Math.max(1,Math.round(420*f.width/Math.max(f.width,f.height)));preview.height=Math.max(1,Math.round(420*f.height/Math.max(f.width,f.height)));
      drawRegion();size.showModal();
    }catch(e){bar.querySelector('[data-edit-status]').textContent=e.message;}
  };size.querySelector('[data-cancel]').onclick=()=>size.close();size.addEventListener('close',()=>{drag=null;});size.addEventListener('keydown',event=>event.stopPropagation());
  size.querySelector('[data-create]').onclick=()=>{
    try{
      if(app.project!==target?.project||app.project.getCurrentFrame()!==target.frame||app.project.getFrameKey()!==target.key)throw new Error('当前工程或帧已变化，请取消后重新框选，未修改工程');
      const w=Number(width.value),h=Number(height.value),pw=Number(placed.value),f=app.project.getCurrentFrame();
      if(![w,h,pw].every(Number.isSafeInteger)||w<1||h<1||w>512||h>512||pw<1)throw new Error('源宽高需为 1–512 的整数，放置宽度需为正整数');
      const pixels=new ImageData(w,h);pixels.placement=PE.utils.validateImagePlacement(placement(),f);
      PE.addImageLayer(app,pixels,size.querySelector('[data-name]').value.trim()||'画布',pixels.placement);app.updateAll();size.close();open();
    }catch(e){status.textContent=e.message;}
  };
});
