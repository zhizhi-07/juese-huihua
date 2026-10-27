/* A focused drawing desk around the existing editor, not a second pixel engine. */
document.addEventListener('DOMContentLoaded', async () => {
  const app=PE.app,$=id=>document.getElementById(id);
  document.body.classList.add('studio');
  const buttons=[...document.querySelectorAll('button')];
  const byText=text=>buttons.find(b=>b.textContent.trim()===text);
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
  function button(label,fn,cls='studio-button'){const e=node('button',cls,label);e.onclick=fn;return e;}
  const toolButtons=['pencil','eraser','eyedropper','fill','select'].map(t=>$('tool-'+t));
  const extraTools=['移动选区','复制选区','粘贴选区','取消选区'].map(byText);
  const header=node('header','studio-header');header.id='studio-header';
  const brand=node('div','studio-brand');brand.innerHTML='<span class="brand-pixels" aria-hidden="true">▦</span><div><strong>像素衣橱</strong><small>HANA CARAKA · 角色绘画工作台</small></div>';
  const primary=node('div','primary-actions');
  $('import-btn').textContent='导入素材';$('import-project-btn').textContent='打开工程';$('export-project-btn').textContent='保存工程';$('export-project-btn').classList.add('save-primary');
  const dropdown=document.querySelector('.dropdown-wrapper');dropdown.querySelector('.dropdown-toggle').textContent='导出 PNG / ZIP ▾';
  primary.append($('import-btn'),$('import-project-btn'),$('export-project-btn'),dropdown);header.append($('import-file-input'),$('import-project-input'));
  const more=button('更多 ···',()=>advanced.showModal());primary.append(more);header.append(brand,primary);

  const advanced=node('dialog','advanced-dialog');advanced.id='advanced-dialog';
  const advancedTitle=node('div','dialog-title');advancedTitle.append(node('h2','','更多工具'),button('关闭',()=>advanced.close()));advanced.append(advancedTitle);
  advanced.addEventListener('click',event=>{const b=event.target.closest('button');if(b&&b.textContent!=='关闭')advanced.close();},true);
  const advancedGrid=node('div','advanced-grid');advanced.append(advancedGrid);document.body.append(advanced);
  const slicing=$('cfg-apply-btn').closest('section'),actionConfig=$('cfg-action-name').parentElement;
  const properties=$('properties-panel'),inspection=$('validate-btn').closest('section');
  const secondary=node('section','panel-section secondary-tools');secondary.append(node('h3','','项目与选区'));
  for(const t of ['新建画布','提取原图色板','导出原始源文件','立即保存','恢复备份']){const e=byText(t);if(e)secondary.append(e);}
  secondary.append(...extraTools.filter(Boolean));secondary.append($('diff-toggle'));
  const fps=$('fps-input').closest('.fps-control');secondary.append(fps);
  for(const section of [slicing,properties,inspection,secondary])advancedGrid.append(section);
  actionConfig.style.display='none';advancedGrid.append(actionConfig);
  const backupText=$('save-status');
  if(backupText){backupText.className='save-status';primary.prepend(backupText);}

  const rail=node('aside','tool-rail');rail.setAttribute('aria-label','绘画工具');
  const labels=['铅笔','橡皮','吸色','填充','框选'],shortcuts=['B','E','I','G','M'];
  const icons=['M5 19l3.5-1 10-10-2.5-2.5-10 10L5 19 M14 7l3 3','M5 14l8-9 7 6-8 9H9z M12 20h8','M5 19l2-5L17 4l3 3-10 10z M13 6l5 5','M4 12l8-8 8 8-8 8z M4 12h16','M4 8V4h4 M16 4h4v4 M20 16v4h-4 M8 20H4v-4'];
  toolButtons.forEach((b,i)=>{b.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[i]}"/></svg><span>${labels[i]}</span><kbd>${shortcuts[i]}</kbd>`;b.title=labels[i]+' ('+shortcuts[i]+')';b.setAttribute('aria-label',labels[i]);rail.append(b);});
  const undoGroup=node('div','rail-history');$('undo-btn').textContent='↶';$('undo-btn').setAttribute('aria-label','撤销');$('redo-btn').textContent='↷';$('redo-btn').setAttribute('aria-label','重做');undoGroup.append($('undo-btn'),$('redo-btn'));rail.append(undoGroup);

  const sources=$('sheet-list').closest('section');sources.querySelector('h3').textContent='动作素材';
  const libraryNote=node('p','section-caption','六套原始动作 · 图层完整保留');sources.querySelector('.section-header').after(libraryNote);
  const directionList=$('action-list');
  const left=$('left-sidebar');left.replaceChildren(sources);
  const guide=node('div','library-guide');guide.innerHTML='<strong>从这里开始</strong><p>选择动作和朝向，再在右侧选择要画的图层。</p><span>每次只修改当前帧</span>';left.append(guide);
  const builtinReset=button('重新载入内置角色',()=>loadBuiltins(true),'subtle-button');left.append(builtinReset);
  const center=$('center-viewport'),canvasHeader=node('div','canvas-header');
  const heading=node('div','canvas-title');const drawingTitle=node('strong','','正在载入角色…'),drawingMeta=node('span','','');heading.append(drawingTitle,drawingMeta);
  const handSwitch=node('label','hand-switch');const handCheckbox=node('input');handCheckbox.type='checkbox';handCheckbox.id='show-hands';handCheckbox.setAttribute('aria-label','显示手部');handSwitch.append(handCheckbox,node('span','','显示手部'));
  const background=node('label','background-control','背景 '),backgroundColor=node('input'),backgroundHex=node('input');
  backgroundColor.type='color';backgroundColor.setAttribute('aria-label','画布背景颜色');
  backgroundHex.type='text';backgroundHex.setAttribute('aria-label','背景颜色十六进制');backgroundHex.maxLength=7;
  background.append(backgroundColor,backgroundHex);
  const backgroundPresets=node('span','background-presets');
  for(const [name,color]of [['白色','#ffffff'],['灰绿','#b8c8c3'],['淡紫','#ddd5ed'],['深色','#2c3335']]){
    const b=button('',()=>app.setPreviewBackground(color),'background-swatch');b.style.backgroundColor=color;b.title=name;b.setAttribute('aria-label','背景：'+name);backgroundPresets.append(b);
  }
  background.append(backgroundPresets);
  const canvasOptions=node('div','canvas-options');canvasOptions.append(background,handSwitch);canvasHeader.append(heading,canvasOptions);
  app.syncBackgroundControls=()=>{const color=app.project.bgColor||'#b8c8c3';backgroundColor.value=color;backgroundHex.value=color;$('preview-canvas').style.backgroundColor=color;};
  app.setPreviewBackground=color=>{
    if(!/^#[0-9a-f]{6}$/i.test(color))return false;
    app.project.bgColor=color;const rgb=PE.utils.hexToRGBA(color);
    app.project.gridColor=rgb.r+rgb.g+rgb.b>480?'rgba(48,68,62,.2)':'rgba(215,230,222,.22)';
    app.syncBackgroundControls();app.canvasManager.render();app.persistence.markDirty();return true;
  };
  backgroundColor.oninput=()=>app.setPreviewBackground(backgroundColor.value);
  backgroundHex.oninput=()=>app.setPreviewBackground(backgroundHex.value);
  pixelAPI.setPreviewBackground=color=>({success:app.setPreviewBackground(color)});
  const viewbar=node('div','canvas-viewbar');const directions=directionList;directions.className='direction-tabs';
  const viewActions=node('div','view-actions');
  const focusButton=button('聚焦角色',focusCharacter,'subtle-button');byText('适应画布').textContent='完整画布';viewActions.append(focusButton,byText('适应画布')||buttons.find(b=>b.textContent==='完整画布'));
  for(const id of ['grid-toggle','onion-toggle']){const b=$(id);b.textContent=id==='grid-toggle'?'网格':'洋葱皮';viewActions.append(b);}
  const zoom=node('div','zoom-control');$('zoom-out').textContent='−';$('zoom-in').textContent='+';zoom.append($('zoom-out'),$('zoom-level'),$('zoom-in'));viewActions.append(zoom);viewbar.append(directions,viewActions);
  center.prepend(canvasHeader,viewbar);
  const canvasHelp=node('div','canvas-help','空格拖动 · 滚轮缩放 · 右键擦除');$('canvas-container').append(canvasHelp);
  const strip=$('frame-strip-wrapper');const stripHeader=strip.firstElementChild;stripHeader.className='timeline-header';stripHeader.replaceChildren(node('strong','','动画帧'));
  const playback=node('div','timeline-playback');for(const [id,text]of [['prev-frame-btn','‹'],['play-btn','▶ 播放'],['pause-btn','Ⅱ 暂停'],['next-frame-btn','›']]){$(id).textContent=text;playback.append($(id));}stripHeader.append(playback);
  const timelineHint=node('span','timeline-hint','点击切换 · ← → 逐帧');stripHeader.append(timelineHint);

  const right=$('right-sidebar'),palette=$('palette-container').closest('section'),layers=$('layer-list').closest('section');
  palette.querySelector('h3').textContent='颜色';layers.querySelector('h3').textContent='绘画图层';$('add-layer-btn').textContent='+ 新图层';
  const paintControls=node('div','paint-controls');const color=$('color-primary'),hex=document.querySelector('input[aria-label="颜色十六进制"]');paintControls.append(color,hex);const addColor=button('+',()=>{const c=app.toolManager.primaryColor;pixelAPI.addColor(c.r,c.g,c.b,c.a,'自选色');},'color-add');addColor.title='把当前颜色加入色板';addColor.setAttribute('aria-label','把当前颜色加入色板');paintControls.append(addColor);palette.querySelector('.section-header').after(paintControls);
  const sizeControl=node('label','brush-control','画笔大小 ');sizeControl.append($('brush-size'),$('brush-size-val'));palette.append(sizeControl);
  const handCard=node('section','hand-card');const handHeading=node('div','hand-card-heading');handHeading.append(node('strong','','独立手部'),node('span','protection-pill','只读保护'));const handList=node('div','hand-layer-names');handCard.append(handHeading,handList,node('small','','不参与绘画，导出时原样保留。'));
  const preview=node('section','preview-card');preview.append(node('div','preview-label','动画预览'),$('preview-canvas'));
  right.replaceChildren(palette,layers,handCard,preview);
  const oldHeader=$('top-toolbar');oldHeader.replaceWith(header);document.querySelector('.workbench-hint')?.remove();
  const workspace=$('workspace');workspace.prepend(rail);
  $('animation-bar').remove();$('bottom-panel').className='studio-footer';
  const names=new Map((window.PE_BUILTIN_PACKS||[]).map(x=>[x.name.replace('.aseprite',''),x.title]));
  names.set('sit','坐姿');names.set('sleep','睡觉');
  const commonActions=[['original32_walk','行走'],['original32_idle','待机'],['original32_pickup','拾取'],['original32_sit','坐姿'],['original32_sleep','睡觉']];
  for(const [name,title]of commonActions)names.set(name,title);
  const directionNames={down:'正面',side:'侧面',up:'背面',left:'向左',right:'向右',none:'当前方向'};

  app.updateSheetList=function(){const list=$('sheet-list');list.replaceChildren();
    const hasCommon=this.project.spriteSheets.some(s=>commonActions.some(([name])=>name===s.name));
    const originals=new Set(window.PE_BUILTIN_PACKS.map(p=>p.name.replace('.aseprite','')));
    const archive=node('details','source-archive');archive.append(node('summary','','原始动作备份'));
    let visible=0,archived=0;
    const items=this.project.spriteSheets.map((s,i)=>({s,i}));
    items.sort((a,b)=>{const rank=s=>{const n=commonActions.findIndex(([name])=>name===s.name);return n<0?99:n;};return rank(a.s)-rank(b.s);});
    items.forEach(({s,i})=>{
    const b=button('',()=>this.selectSheet(i),'sheet-item'+(i===this.project.currentSheetIndex?' active':''));
    const icon=node('span','sheet-icon','▤'),text=node('span','sheet-copy');text.append(node('strong','',names.get(s.name)||s.name),node('small','',s.actions.length+' 个方向 · '+s.getTotalFrames()+' 帧'));b.append(icon,text);
    if(hasCommon&&originals.has(s.name)){archive.append(b);archived++;if(i===this.project.currentSheetIndex)archive.open=true;}else{list.append(b);visible++;}
  });if(archived){archive.firstElementChild.textContent='原始动作备份 · '+archived+' 套';list.append(archive);}libraryNote.textContent=visible+' 套常用动作 · 手部独立保留';};
  app.updateActionList=function(){const list=$('action-list');list.replaceChildren();this.project.getCurrentSheet()?.actions.forEach((a,i)=>{const b=button(directionNames[a.direction]||a.name,()=>this.selectAction(i),'direction-tab'+(i===this.project.currentActionIndex?' active':''));b.setAttribute('aria-pressed',i===this.project.currentActionIndex?'true':'false');list.append(b);});};
  function bounds(image) {let x0=image.width,y0=image.height,x1=-1,y1=-1;for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)if(image.data[(y*image.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}return x1<0?null:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};}
  function paintThumbnail(canvas,image,size=64){const box=bounds(image);canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;if(!box)return;const temp=document.createElement('canvas');temp.width=image.width;temp.height=image.height;temp.getContext('2d').putImageData(image,0,0);const scale=Math.max(1,Math.floor((size-12)/Math.max(box.w,box.h)));ctx.drawImage(temp,box.x,box.y,box.w,box.h,Math.floor((size-box.w*scale)/2),Math.floor((size-box.h*scale)/2),box.w*scale,box.h*scale);}
  const frameList=app.updateFrameList.bind(app);app.updateFrameList=function(){frameList();const p=this.project;[...$('frame-list').querySelectorAll('canvas')].forEach((c,i)=>{const image=this.canvasManager.getCompositeImageData(p.currentSheetIndex,p.currentActionIndex,i,!this.canvasManager.hideHands);if(image)paintThumbnail(c,image);});};
  const layerList=app.updateLayerList.bind(app);app.updateLayerList=function(){layerList();for(const label of $('layer-list').querySelectorAll('.layer-name')){const original=label.textContent;label.textContent=original.includes('衣服与发型')?'衣服与发型':({'head':'头部','body':'身体','vfx':'特效','▾ down':'▾ 正面分组','▾ side':'▾ 侧面分组','▾ up':'▾ 背面分组'}[original]||original);}
    const p=this.project,prefix=p.currentSheetIndex+'_'+p.currentActionIndex+'_';handList.replaceChildren();for(const l of p.layers){if(!PE.isHandLayer(l)||l.sheetIndex!==p.currentSheetIndex||![...l.frameData.keys()].some(k=>k.startsWith(prefix)))continue;handList.append(node('span','hand-name',l.name));}if(!handList.children.length)handList.append(node('span','hand-name','此动作无独立手层'));};
  app.updateStatusBar=function(){const p=this.project,s=p.getCurrentSheet(),a=p.getCurrentAction(),f=p.getCurrentFrame();drawingTitle.textContent=(names.get(s?.name)||s?.name||'新画布')+' / '+(directionNames[a?.direction]||a?.name||'');drawingMeta.textContent=f?f.width+' × '+f.height+' · 第 '+(p.currentFrameIndex+1)+' / '+(a?.frames.length||1)+' 帧':'';$('status-bar').replaceChildren(node('span','','当前图层：'+(p.getCurrentLayer()?.name||'未选择')),node('span','status-hands',this.canvasManager.hideHands?'手部已隐藏 · 手部只读':'手部预览已显示 · 手部仍受保护'));};
  function focusCharacter(){const cm=app.canvasManager,image=cm.getCompositeImageData(undefined,undefined,undefined,!cm.hideHands);if(!image)return;const box=bounds(image);if(!box){cm.centerView();return;}cm.zoom=Math.max(1,Math.min(24,Math.floor(Math.min((cm.canvas.width-100)/box.w,(cm.canvas.height-100)/box.h))));cm.offsetX=Math.round(cm.canvas.width/2-(box.x+box.w/2)*cm.zoom);cm.offsetY=Math.round(cm.canvas.height/2-(box.y+box.h/2)*cm.zoom);cm.render();app.updateZoomDisplay();app.updateStatusBar();}
  app.canvasManager.hideHands=true;app.project.bgColor='#b8c8c3';app.project.gridColor='rgba(48,68,62,.2)';app.syncBackgroundControls();
  handCheckbox.onchange=()=>{app.canvasManager.hideHands=!handCheckbox.checked;app.canvasManager.render();app.updateFrameList();app.updateStatusBar();app.animationPlayer._renderPreviewFrame();};
  pixelAPI.setHandsPreviewVisible=show=>{handCheckbox.checked=!!show;handCheckbox.onchange();return {success:true,visible:handCheckbox.checked,referenceOnly:true};};
  pixelAPI.getHandsInfo=()=>({success:true,visible:handCheckbox.checked,layers:app.project.layers.map((l,index)=>({layer:l,index})).filter(({layer:l})=>PE.isHandLayer(l)&&l.sheetIndex===app.project.currentSheetIndex).map(({layer:l,index})=>({index,name:l.name,referenceOnly:true}))});
  const selectedSheet=app.selectSheet.bind(app),selectedAction=app.selectAction.bind(app);
  app.selectSheet=i=>{selectedSheet(i);focusCharacter();};app.selectAction=i=>{selectedAction(i);focusCharacter();};
  // Tight, stable animation framing uses the union of every frame, never per-frame centering.
  app.animationPlayer._renderPreviewFrame=function(){
    const p=app.project,action=p.spriteSheets[this.sheetIndex]?.actions[this.actionIndex];if(!action)return;let union=null;const images=action.frames.map((_,i)=>app.canvasManager.getCompositeImageData(this.sheetIndex,this.actionIndex,i,!app.canvasManager.hideHands));
    for(const image of images){const b=bounds(image);if(!b)continue;if(!union)union={...b};else {const x=Math.min(union.x,b.x),y=Math.min(union.y,b.y),right=Math.max(union.x+union.w,b.x+b.w),bottom=Math.max(union.y+union.h,b.y+b.h);union={x,y,w:right-x,h:bottom-y};}}
    const canvas=this.canvas;canvas.width=144;canvas.height=144;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;const image=images[this.currentFrame];if(!union||!image)return;const tmp=document.createElement('canvas');tmp.width=image.width;tmp.height=image.height;tmp.getContext('2d').putImageData(image,0,0);const scale=Math.max(1,Math.min(6,Math.floor(124/Math.max(union.w,union.h))));ctx.drawImage(tmp,union.x,union.y,union.w,union.h,Math.floor((144-union.w*scale)/2),Math.floor((144-union.h*scale)/2),union.w*scale,union.h*scale);
  };
  const originalSetTool=app.toolManager.setTool.bind(app.toolManager);app.toolManager.setTool=t=>{originalSetTool(t);toolButtons.forEach((b,i)=>b.setAttribute('aria-pressed',['pencil','eraser','eyedropper','fill','select'][i]===t?'true':'false'));};
  toolButtons[0].setAttribute('aria-pressed','true');
  const resizeObserver=new ResizeObserver(()=>{if(!app.toolManager.isDrawing)focusCharacter();});resizeObserver.observe($('canvas-container'));
  const loading=node('div','studio-loading');loading.innerHTML='<span class="loading-pixel">▦</span><strong>正在打开你的角色素材</strong><span>保留原始图层与全部动作帧</span>';document.body.append(loading);
  async function loadBuiltins(reset=false){
    if(reset&&!confirm('重新载入内置原始角色会替换当前工程，请先保存工程。继续吗？'))return;
    if(reset&&app.persistence.dirty&&!await app.persistence.saveNow()){alert('请先导出当前工程，避免覆盖尚未同步的绘画。');return;}
    builtinReset.disabled=true;loading.hidden=false;app.suspendBackup=true;
    try{
      // Build in a separate project; a failed import must never replace current edits.
      const project=new PE.Project();project.layers=[];project.spriteSheets=[];
      for(const item of window.PE_BUILTIN_PACKS){const bytes=Uint8Array.from(atob(item.base64),c=>c.charCodeAt(0));await PE.importAseprite(new File([bytes],item.name),project);}
      for(const [pack,name,pose,direction]of [
        ['walk.aseprite','original32_walk'],['idle.aseprite','original32_idle'],['pick up.aseprite','original32_pickup'],
        ['hurt.aseprite','original32_sit','sit'],['death.aseprite','original32_sleep','sleep','down']
      ]){const index=await PE.addOriginal32Action(project,pack,name,pose,direction);PE.addReferenceEyes32(project,index);}
      const base32Index=project.spriteSheets.findIndex(s=>s.name==='original32_idle');
      project.bgColor='#b8c8c3';project.gridColor='rgba(48,68,62,.2)';
      project.name='Hana Caraka · 角色衣橱';project.currentSheetIndex=base32Index;
      project.currentActionIndex=Math.max(0,project.spriteSheets[base32Index].actions.findIndex(a=>a.direction==='down'));project.currentFrameIndex=0;
      project.currentLayerIndex=project.layers.findIndex(l=>l.sheetIndex===base32Index&&!l.isGroup&&!PE.isHandLayer(l)&&l.name.includes('眼型'));
      app.animationPlayer.pause();app.project=project;PE.project=project;app.canvasManager.setProject(project);app.toolManager.init(project,app.canvasManager,app.history);app.animationPlayer.project=project;app.exportManager.init(project,app.canvasManager);app.inspectionManager.init(project,app.canvasManager);app.history.clear();app.updateAll();app.syncBackgroundControls();focusCharacter();
      const sample=project.getCurrentFrame()?.originalPixels;if(sample){const colors=new Map();for(let i=0;i<sample.data.length;i+=4){if(!sample.data[i+3])continue;const [r,g,b,a]=sample.data.slice(i,i+4);colors.set([r,g,b,a].join(','),{r,g,b,a});}project.palette=[...colors.values(),...[['#E8A6B6','柔粉'],['#A7CBB1','浅绿'],['#ECCF8D','奶黄'],['#9CB6D6','浅蓝'],['#B7A5CF','浅紫']].map(([hex,name])=>({...PE.utils.hexToRGBA(hex),name}))];app.updatePalette();}
    }catch(error){alert('内置素材载入失败：'+error.message+'。当前工程未被替换。');console.error(error);}
    finally{loading.hidden=true;builtinReset.disabled=false;app.suspendBackup=false;}
    if(reset)app.persistence.markDirty();
  }
  const importProject=app.exportManager.importProject.bind(app.exportManager);app.exportManager.importProject=async file=>{const result=await importProject(file);app.canvasManager.hideHands=!handCheckbox.checked;app.syncBackgroundControls();app.updateAll();focusCharacter();return result;};
  app.updateAll();
  try{if(!await app.persistence.restore()){await loadBuiltins();await app.persistence.seed();}}
  catch(error){alert('恢复工程失败，已保留原备份。请使用“恢复备份”或打开已保存工程。');console.error(error);}
  finally{loading.hidden=true;builtinReset.disabled=false;}
});
