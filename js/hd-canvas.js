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
    if(!r||l.isGroup||l.locked||l.inheritedBase||PE.isProtectedHandLayer(l)||!PE.isLayerVisible(p,l)||!f||f.locked)throw new Error('请选择当前帧可编辑的高清图层（受保护图层不能编辑）');
    PE.utils.validateImagePlacement(r,f);
    if(PE.utils.imagePlacementLocked(r,f))throw new Error('高清画布覆盖保护区域，不能编辑');
  }
  changed(){return this.project.layers[0].getFrameData('0_0_0').data.some((v,i)=>v!==this.original.data[i]);}
  apply(){
    this.check();if(!this.changed())return false;
    const next=PE.utils.cloneImageData(this.project.layers[0].getFrameData('0_0_0'));next.placement={...this.original.placement};
    const l=this.layer,k=this.key,before=this.original,h=this.app.history,keep=this.keepOriginal(k);
    l.frameData.set(k,next);
    if(keep)keep.group.preserved.push(keep.address);
    h.undoStack.push({description:'编辑高清源画布',changes:[],undo:()=>{l.frameData.set(k,before);if(keep)keep.group.preserved=keep.list;},redo:()=>{l.frameData.set(k,next);if(keep)keep.group.preserved.push(keep.address);}});
    if(h.undoStack.length>h.maxSteps)h.undoStack.shift();h.redoStack=[];h._notifyChange();
    this.app.persistence?.markDirty();this.app.updateAll();return true;
  }
  // 眼睛联动的自动帧一旦被手画过，就记成“保留原画”，实时同步不会把它改回基准的样子。
  keepOriginal(key){
    const group=PE.HairAnimation?.master?.(this.target,this.layer)?.hairAnimation;
    if(group?.part!=='eyes'||!group.offsets||!group.preserved)return null;
    const [si,ai,fi]=key.split('_').map(Number),sheet=this.target.spriteSheets[si],dir=sheet?.actions[ai]?.direction;
    if(!sheet||!dir)return null;
    const address=`${sheet.name}/${dir}/${fi}`;
    if(PE.HairAnimation.isIdle(sheet)&&fi===0)return null;
    if(!Object.hasOwn(group.offsets,address)||group.preserved.includes(address))return null;
    return {group,address,list:group.preserved.slice()};
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
  size.innerHTML=`<h2>新建可编辑高清画布</h2>
<p>在下面拖框（或直接填数字）决定位置和放置大小。高清源就是你能画的格子数：源 32×32 就是 32×32 个格子，每格摊几颗源像素由“高清倍数”决定。只创建空白图层，不复制参考图。</p>
<canvas class="hd-region-preview" data-region aria-label="高清画布框选范围"></canvas>
<p data-region-info></p>
<div class="pixel-import-controls"><label>名称 <input data-name value="眼睛" aria-label="高清画布名称"></label><label>放置宽 <input type="number" data-place value="16" min="1" aria-label="新建高清放置宽度"></label><label>源宽 <input type="number" data-w value="96" min="1" max="512" aria-label="高清源宽度"></label><label>源高 <input type="number" data-h value="48" min="1" max="512" aria-label="高清源高度"></label></div>
<div class="pixel-import-controls"><label>高清倍数 <select data-scale aria-label="高清倍数"><option value="1">1× 同格</option><option value="2">2×</option><option value="3">3×</option><option value="4">4×</option><option value="6" selected>6×</option><option value="8">8×</option></select></label><span>源尺寸快捷 <button type="button" data-preset="16" class="studio-button">16×16</button><button type="button" data-preset="24" class="studio-button">24×24</button><button type="button" data-preset="32" class="studio-button">32×32</button><button type="button" data-preset="48" class="studio-button">48×48</button><button type="button" data-preset="64" class="studio-button">64×64</button></span></div>
<p data-status role="status"></p>
<button type="button" data-create class="studio-button">创建并绘画</button><button type="button" data-cancel class="studio-button">取消新建</button>`;
  const preview=size.querySelector('[data-region]'),info=size.querySelector('[data-region-info]'),sourceW=size.querySelector('[data-w]'),sourceH=size.querySelector('[data-h]'),placed=size.querySelector('[data-place]'),multiplier=size.querySelector('[data-scale]'),status=size.querySelector('[data-status]');
  const reference=document.createElement('canvas');let target=null,region=null,drag=null,sourceLocked=false;
  const clampInt=(value,min,max)=>Math.max(min,Math.min(max,Math.round(value)));
  const factor=()=>{const n=Math.round(Number(multiplier.value));return Number.isFinite(n)&&n>=1?Math.min(8,n):1;};
  function sourceSize(){return {w:clampInt(Number(sourceW.value)||1,1,512),h:clampInt(Number(sourceH.value)||1,1,512)};}
  // 放置范围始终塞得进当前画布：填大了自动缩到画布上限，源像素一颗都不丢。
  function placement(){
    if(!target)return {x:0,y:0,w:1,h:1};
    const f=target.frame,s=sourceSize();
    let w=clampInt(Number(placed.value)||f.width,1,f.width),h=clampInt(w*s.h/s.w,1,f.height);
    if(Math.round(w*s.h/s.w)>f.height){h=f.height;w=clampInt(h*s.w/s.h,1,f.width);h=clampInt(w*s.h/s.w,1,f.height);}
    const x=clampInt(region?region.x:(f.width-w)/2,0,f.width-w),y=clampInt(region?region.y:(f.height-h)/2,0,f.height-h);
    return {x,y,w,h};
  }
  function drawRegion(){
    if(!target)return;
    const ctx=preview.getContext('2d'),f=target.frame,r=placement(),s=sourceSize(),sx=preview.width/f.width,sy=preview.height/f.height;
    ctx.clearRect(0,0,preview.width,preview.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(reference,0,0,preview.width,preview.height);
    if(![r.x,r.y,r.w,r.h].every(Number.isFinite))return;
    ctx.fillStyle='#00b5d733';ctx.fillRect(r.x*sx,r.y*sy,r.w*sx,r.h*sy);ctx.strokeStyle='#007b91';ctx.lineWidth=2;ctx.setLineDash([5,3]);ctx.strokeRect(r.x*sx,r.y*sy,r.w*sx,r.h*sy);ctx.setLineDash([]);
    const asked=clampInt(Number(placed.value)||r.w,1,Math.max(1,f.width)),shrunk=asked>f.width||clampInt(asked*s.h/s.w,1,512)>f.height;
    info.textContent=`当前画布 ${f.width}×${f.height} 格 · ${region?'已框选':'未框选（默认居中）'}：位置 ${r.x}, ${r.y} · 放置 ${r.w}×${r.h} 格 · 高清源 ${s.w}×${s.h}（每格 ${Math.round(s.w/r.w*100)/100}×）`+(shrunk?` · 放不下，已收到 ${r.w}×${r.h}`:'');
  }
  function point(event){
    const b=preview.getBoundingClientRect(),f=target.frame;
    return {x:clampInt((event.clientX-b.left)/b.width*f.width,0,f.width),y:clampInt((event.clientY-b.top)/b.height*f.height,0,f.height)};
  }
  function selectRegion(event){
    const end=point(event),f=target.frame,start=drag.start,x=Math.min(start.x,end.x),y=Math.min(start.y,end.y);
    region={x,y,w:Math.max(1,Math.min(Math.abs(end.x-x),f.width-x)),h:Math.max(1,Math.min(Math.abs(end.y-y),f.height-y))};
    placed.value=region.w;
    if(!sourceLocked){const n=factor();sourceW.value=Math.min(512,region.w*n);sourceH.value=Math.min(512,region.h*n);}
    status.textContent='';drawRegion();
  }
  preview.onpointerdown=event=>{
    if(event.button!==0||drag)return;event.preventDefault();
    drag={id:event.pointerId,start:point(event),region,values:[placed.value,sourceW.value,sourceH.value],locked:sourceLocked};preview.setPointerCapture(event.pointerId);selectRegion(event);
  };
  preview.onpointermove=event=>{if(drag?.id===event.pointerId)selectRegion(event);};
  preview.onpointerup=event=>{if(drag?.id===event.pointerId){selectRegion(event);drag=null;}};
  preview.onlostpointercapture=preview.onpointercancel=()=>{if(!drag)return;region=drag.region;[placed.value,sourceW.value,sourceH.value]=drag.values;sourceLocked=drag.locked;drag=null;drawRegion();};
  // 手填源尺寸后不再被拖框改写，想看 32×32 就一直保持 32×32。
  for(const input of [sourceW,sourceH])input.oninput=()=>{sourceLocked=true;status.textContent='';if(target)drawRegion();};
  placed.oninput=()=>{status.textContent='';if(target)drawRegion();};
  for(const button of size.querySelectorAll('[data-preset]'))button.onclick=()=>{
    sourceW.value=sourceH.value=button.dataset.preset;sourceLocked=true;status.textContent='';if(target)drawRegion();
  };
  multiplier.onchange=()=>{
    if(!target)return;
    const r=placement(),n=factor();
    sourceW.value=Math.min(512,r.w*n);sourceH.value=Math.min(512,r.h*n);sourceLocked=false;status.textContent='';drawRegion();
  };
  document.body.append(size);create.onclick=()=>{
    try{
      if(app.toolManager.isDrawing)throw new Error('请先结束当前笔画');
      const p=app.project,f=p.getCurrentFrame();if(!f||f.locked)throw new Error('当前帧不可编辑');
      app.animationPlayer.pause();target={project:p,frame:f,key:p.getFrameKey()};region=null;drag=null;status.textContent='';sourceLocked=false;
      // 默认铺满当前画布，源按当前倍数生成，省得在 16×16 的画布上一开就是固定的小尺寸。
      const n=factor();placed.value=f.width;sourceW.value=Math.min(512,f.width*n);sourceH.value=Math.min(512,f.height*n);
      const scale=Math.max(1,Math.min(6,Math.floor(1024/Math.max(f.width,f.height)))),image=app.canvasManager.getCompositeImageData(undefined,undefined,undefined,!app.canvasManager.hideHands,scale);
      reference.width=image.width;reference.height=image.height;reference.getContext('2d').putImageData(image,0,0);
      preview.width=Math.max(1,Math.round(420*f.width/Math.max(f.width,f.height)));preview.height=Math.max(1,Math.round(420*f.height/Math.max(f.width,f.height)));
      drawRegion();size.showModal();
    }catch(e){bar.querySelector('[data-edit-status]').textContent=e.message;}
  };size.querySelector('[data-cancel]').onclick=()=>size.close();size.addEventListener('close',()=>{drag=null;});size.addEventListener('keydown',event=>event.stopPropagation());
  size.querySelector('[data-create]').onclick=()=>{
    try{
      if(app.project!==target?.project||app.project.getCurrentFrame()!==target.frame||app.project.getFrameKey()!==target.key)throw new Error('当前工程或帧已变化，请取消后重新框选，未修改工程');
      const s=sourceSize(),r=placement(),f=app.project.getCurrentFrame();
      if(s.w<1||s.h<1||s.w>512||s.h>512)throw new Error('源宽高需为 1–512 的整数');
      if(r.w<1||r.h<1||r.w>f.width||r.h>f.height)throw new Error('放置范围无效，请重填放置宽或重新框选');
      const pixels=new ImageData(s.w,s.h);pixels.placement=PE.utils.validateImagePlacement(r,f);
      PE.addImageLayer(app,pixels,size.querySelector('[data-name]').value.trim()||'画布',pixels.placement);app.updateAll();size.close();open();
    }catch(e){status.textContent=e.message;}
  };
});
