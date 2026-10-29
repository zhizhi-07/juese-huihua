window.PE=window.PE||{};
// Copy all layers together so the new frame starts with the current composition.
PE.duplicateAnimationFrame=function(p){
  const a=p.getCurrentAction(),source=p.getCurrentFrame(),si=p.currentSheetIndex,ai=p.currentActionIndex;
  if(!a||!source)throw new Error('请先打开工程');
  if(a.frames.length>=256)throw new Error('单个动作最多256帧');
  const index=a.frames.length,oldKey=p.getFrameKey(si,ai,p.currentFrameIndex),newKey=p.getFrameKey(si,ai,index);
  const frame=Object.assign(new PE.Frame(si,source.sourceX,source.sourceY,source.width,source.height),source);
  frame.originalPixels=source.originalPixels?PE.utils.cloneImageData(source.originalPixels):null;
  frame.lockedRegions=JSON.parse(JSON.stringify(source.lockedRegions||[]));
  for(const layer of p.layers){
    if(layer.sheetIndex!==undefined&&layer.sheetIndex!==si)continue;
    const pixels=layer.getFrameData(oldKey);
    if(pixels)layer.frameData.set(newKey,PE.utils.cloneImageData(pixels));
  }
  a.frames.push(frame);return index;
};
PE.FrameEditing={
  resolve(p,ref={}){
    if(!ref||typeof ref!=='object'||Array.isArray(ref))throw new Error('请使用对象指定图层与帧');
    const {sheetIndex=p.currentSheetIndex,actionIndex=p.currentActionIndex,frameIndex=p.currentFrameIndex,layerIndex=p.currentLayerIndex}=ref;
    if(![sheetIndex,actionIndex,frameIndex,layerIndex].every(Number.isSafeInteger))throw new Error('图层、动作与帧编号必须为整数');
    const action=p.spriteSheets[sheetIndex]?.actions[actionIndex],frame=action?.frames[frameIndex],layer=p.layers[layerIndex];
    if(!frame||!layer)throw new Error('图层、动作或帧不存在');
    if(layer.isGroup||layer.sheetIndex!==undefined&&layer.sheetIndex!==sheetIndex)throw new Error('请选择属于目标素材表的具体图层');
    return {sheetIndex,actionIndex,frameIndex,layerIndex,action,frame,layer,key:p.getFrameKey(sheetIndex,actionIndex,frameIndex)};
  },
  editable(ref){
    if(ref.layer.locked||ref.layer.inheritedBase||PE.isHandLayer(ref.layer))throw new Error('目标图层锁定或属于受保护底稿');
    if(ref.frame.locked)throw new Error('目标帧已锁定');
  },
  read(app,source={}){
    if(app.toolManager.isDrawing)throw new Error('请先结束当前绘画或拖动');
    const p=app.project,ref=this.resolve(p,source),data=ref.layer.getFrameData(ref.key),r=source.rect||{x:0,y:0,w:ref.frame.width,h:ref.frame.height};
    if(![r.x,r.y,r.w,r.h].every(Number.isSafeInteger)||r.x<0||r.y<0||r.w<1||r.h<1||r.x+r.w>ref.frame.width||r.y+r.h>ref.frame.height)throw new Error('复制选区超出源帧');
    if(!data)throw new Error('当前图层在源帧没有内容，请先选择有内容的帧');
    const pixels=new ImageData(r.w,r.h);let pixelCount=0;
    for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++){
      const i=((r.y+y)*data.width+r.x+x)*4;pixels.data.set(data.data.subarray(i,i+4),(y*r.w+x)*4);if(data.data[i+3])pixelCount++;
    }
    if(!pixelCount)throw new Error('选中的图层或区域没有可复制的像素');
    return {project:p,ref,pixels,x:r.x,y:r.y,pixelCount};
  },
  info(clip){return {layerIndex:clip.ref.layerIndex,layerName:clip.ref.layer.name,sheetIndex:clip.ref.sheetIndex,actionIndex:clip.ref.actionIndex,frameIndex:clip.ref.frameIndex,x:clip.x,y:clip.y,width:clip.pixels.width,height:clip.pixels.height,pixelCount:clip.pixelCount};},
  copy(app,source){const clip=this.read(app,source);app.frameClipboard=clip;return this.info(clip);},
  plan(app,clip,targets=[{}],{mode='overlay',x=clip?.x,y=clip?.y}={}){
    if(!clip||clip.project!==app.project)throw new Error('请先在当前工程复制图层或选区');
    if(app.toolManager.isDrawing)throw new Error('请先结束当前绘画或拖动');
    if(!['overlay','replace'].includes(mode)||![x,y].every(Number.isSafeInteger))throw new Error('粘贴方式或坐标无效');
    if(!Array.isArray(targets)||!targets.length||targets.length>256)throw new Error('一次请选择 1–256 个目标帧');
    const edits=[],seen=new Set();
    for(const target of targets){
      const ref=this.resolve(app.project,target);this.editable(ref);
      const id=ref.layerIndex+':'+ref.key;if(seen.has(id))continue;seen.add(id);
      const before=ref.layer.getFrameData(ref.key),after=before?PE.utils.cloneImageData(before):new ImageData(ref.frame.width,ref.frame.height);let modified=0;
      for(let row=0;row<clip.pixels.height;row++)for(let col=0;col<clip.pixels.width;col++){
        const i=(row*clip.pixels.width+col)*4;if(mode==='overlay'&&!clip.pixels.data[i+3])continue;
        const dx=x+col,dy=y+row;
        if(dx<0||dy<0||dx>=ref.frame.width||dy>=ref.frame.height)throw new Error('粘贴超出目标帧，请调整位置；没有修改任何目标');
        if(ref.frame.isPixelLocked(dx,dy))throw new Error('目标包含保护区域；没有修改任何目标');
        const j=(dy*after.width+dx)*4;
        if(clip.pixels.data.subarray(i,i+4).every((v,c)=>v===after.data[j+c]))continue;
        after.data.set(clip.pixels.data.subarray(i,i+4),j);modified++;
      }
      if(modified)edits.push({ref,before,after,modified});
    }
    return edits;
  },
  record(app,description,undo,redo){
    const run=fn=>{app.animationPlayer.pause();fn();app.toolManager.clearSelection();app.updateAll();app.canvasManager.render();app.persistence?.markDirty();};
    run(redo);app.history.undoStack.push({description,changes:[],undo:()=>run(undo),redo:()=>run(redo)});
    if(app.history.undoStack.length>app.history.maxSteps)app.history.undoStack.shift();
    app.history.redoStack=[];app.history._notifyChange();
  },
  apply(app,edits,description){
    const restore=side=>{for(const edit of edits){const data=edit[side];if(data)edit.ref.layer.frameData.set(edit.ref.key,PE.utils.cloneImageData(data));else edit.ref.layer.frameData.delete(edit.ref.key);}};
    if(edits.length)this.record(app,description,()=>restore('before'),()=>restore('after'));
    return {targetCount:edits.length,modifiedPixels:edits.reduce((n,e)=>n+e.modified,0),targets:edits.map(({ref})=>({sheetIndex:ref.sheetIndex,actionIndex:ref.actionIndex,frameIndex:ref.frameIndex,layerIndex:ref.layerIndex}))};
  },
  paste(app,targets,options){return this.apply(app,this.plan(app,app.frameClipboard,targets,options),'粘贴图层 / 选区');},
  cut(app,source){
    const clip=this.read(app,source),blank={...clip,pixels:new ImageData(clip.pixels.width,clip.pixels.height)};
    const edits=this.plan(app,blank,[clip.ref],{mode:'replace'}),result=this.apply(app,edits,'剪切图层 / 选区');app.frameClipboard=clip;return result;
  },
  copyToFrames(app,source,targets,options){
    const clip=this.read(app,source);
    if(!Array.isArray(targets))throw new Error('请提供目标帧数组');
    const list=targets.map(t=>{if(!t||typeof t!=='object'||Array.isArray(t))throw new Error('目标帧需要是对象');return {sheetIndex:clip.ref.sheetIndex,layerIndex:clip.ref.layerIndex,...t};});
    return this.apply(app,this.plan(app,clip,list,options),'批量复制图层 / 选区');
  },
  duplicate(app){
    if(app.toolManager.isDrawing)throw new Error('请先结束当前绘画或拖动');
    const p=app.project,si=p.currentSheetIndex,ai=p.currentActionIndex,fi=p.currentFrameIndex,a=p.getCurrentAction();
    if(!a)throw new Error('请先打开工程');
    const index=a.frames.length,key=p.getFrameKey(si,ai,index),layers=p.layers.filter(l=>l.sheetIndex===undefined||l.sheetIndex===si),before=layers.map(l=>l.getFrameData(key));
    PE.duplicateAnimationFrame(p);const frame=a.frames[index],after=layers.map(l=>l.getFrameData(key));
    const restore=data=>layers.forEach((l,i)=>{if(data[i])l.frameData.set(key,PE.utils.cloneImageData(data[i]));else l.frameData.delete(key);});
    this.record(app,'复制整帧到末尾',()=>{a.frames.splice(index,1);restore(before);p.selectFrame(si,ai,fi);},()=>{a.frames[index]=frame;restore(after);p.selectFrame(si,ai,index);});
    return {sheetIndex:si,actionIndex:ai,frameIndex:index};
  },
  next(app,source={}){
    const clip=this.read(app,source),r=clip.ref;this.editable(r);
    if(r.sheetIndex!==app.project.currentSheetIndex||r.actionIndex!==app.project.currentActionIndex||r.frameIndex!==app.project.currentFrameIndex)throw new Error('复制到下一帧请使用当前帧；指定源请用批量复制');
    if(r.frameIndex+1===r.action.frames.length)return {...this.duplicate(app),createdFrame:true};
    const frameIndex=r.frameIndex+1,result=this.apply(app,this.plan(app,clip,[{sheetIndex:r.sheetIndex,actionIndex:r.actionIndex,frameIndex,layerIndex:r.layerIndex}]),'复制到下一帧');
    app.selectFrame(r.sheetIndex,r.actionIndex,frameIndex);return {...result,frameIndex,createdFrame:false};
  }
};

document.addEventListener('DOMContentLoaded',()=>{
  const app=PE.app,F=PE.FrameEditing,bar=document.createElement('div');bar.className='frame-edit-toolbar';
  const status=document.createElement('span');status.className='frame-edit-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='有选区时复制选区；无选区时复制当前图层。切换帧或朝向后可粘贴。';
  const historyChange=app.history.onChange;app.history.onChange=()=>{historyChange?.();status.textContent='当前图层：'+(app.project.getCurrentLayer()?.name||'未选择')+' · 第 '+(app.project.currentFrameIndex+1)+' 帧 · Ctrl+C / X / V 复制、剪切、粘贴。';};
  const source=()=>app.toolManager.selection?{rect:{...app.toolManager.selection}}:{};
  function call(method,...args){const result=pixelAPI[method](...args);if(!result.success)throw new Error(result.error);return result.data;}
  function run(fn){try{fn();}catch(error){status.textContent=error.message;}}
  function button(id,label,title,fn){const b=document.createElement('button');b.id=id;b.type='button';b.className='studio-button';b.textContent=label;b.title=title;b.onclick=()=>run(fn);bar.append(b);return b;}
  button('copy-cel-btn','复制','复制选区或当前图层（Ctrl+C）',()=>{const c=call('copyLayerFrame',source());status.textContent='已复制“'+c.layerName+'”第 '+(c.frameIndex+1)+' 帧；可切换朝向或帧后粘贴。';});
  button('cut-cel-btn','剪切','剪切选区或当前图层（Ctrl+X），可撤销',()=>{call('cutLayerFrame',source());status.textContent='已剪切，可切换帧后粘贴；Ctrl+Z 可恢复原处。';});
  button('paste-cel-btn','粘贴','粘贴到当前图层和当前帧（Ctrl+V）',()=>{const result=call('pasteLayerFrames',[{}]);status.textContent='已粘贴到当前图层，修改 '+result.modifiedPixels+' 个像素；原处保留。';});
  button('copy-next-cel-btn','复制到下一帧','复制当前图层或选区并跳到下一帧；末帧会复制整帧追加，可连续点击',()=>{const result=call('copyLayerToNextFrame',source());status.textContent=(result.createdFrame?'已复制整帧新建':'已复制到')+'第 '+(result.frameIndex+1)+' 帧，可继续复制。';});
  button('batch-copy-cel-btn','批量复制…','复制当前图层或选区到指定朝向、帧范围',openBatch);
  button('duplicate-frame-btn','复制整帧到末尾','把当前帧所有图层复制到末尾，可撤销',()=>{const r=call('duplicateFrame');status.textContent='已复制整帧到第 '+(r.frameIndex+1)+' 帧；Ctrl+Z 可撤销。';});
  bar.append(status);document.getElementById('frame-strip-wrapper').prepend(bar);

  const dialog=document.createElement('dialog');dialog.className='advanced-dialog frame-copy-dialog';dialog.setAttribute('aria-label','批量复制图层');
  dialog.innerHTML=`<div class="dialog-title"><h2>批量复制图层 / 选区</h2><button type="button" data-close class="studio-button">关闭</button></div>
    <p data-source></p><div class="frame-copy-fields"><label>目标朝向 <select data-action aria-label="目标朝向"></select></label>
    <label><input type="checkbox" data-all>目标朝向全部帧</label><label>起始帧 <input type="number" min="1" data-start aria-label="起始帧"></label><label>结束帧 <input type="number" min="1" data-end aria-label="结束帧"></label>
    <label>粘贴方式 <select data-mode aria-label="粘贴方式"><option value="overlay">叠加（保留目标其他像素）</option><option value="replace">覆盖粘贴范围（含透明像素）</option></select></label></div>
    <p>仅复制所选图层，朝向按原样复制。每个目标都是独立副本，后续修改互不影响。遇到锁定或越界会整批取消。</p>
    <p data-summary aria-live="polite"></p><button type="button" data-apply class="studio-button save-primary">复制</button>`;
  document.body.append(dialog);
  const action=dialog.querySelector('[data-action]'),all=dialog.querySelector('[data-all]'),start=dialog.querySelector('[data-start]'),end=dialog.querySelector('[data-end]'),mode=dialog.querySelector('[data-mode]'),summary=dialog.querySelector('[data-summary]'),apply=dialog.querySelector('[data-apply]');
  let copied=null;
  function targetActions(){return copied.project.spriteSheets[copied.ref.sheetIndex].actions.map((a,i)=>({a,i})).filter(({i})=>action.value==='all'||i===Number(action.value));}
  function targets(){
    if(app.project!==copied.project||app.project.layers[copied.ref.layerIndex]!==copied.ref.layer)throw new Error('工程或源图层已变化，请重新打开批量复制');
    const first=Number(start.value),last=Number(end.value);
    if(!all.checked&&(![first,last].every(Number.isSafeInteger)||first<1||last<first))throw new Error('请输入有效帧范围（从 1 开始）');
    return targetActions().flatMap(({a,i})=>{if(!all.checked&&last>a.frames.length)throw new Error('结束帧超出目标朝向');return a.frames.flatMap((_,fi)=>all.checked||fi>=first-1&&fi<=last-1?[{sheetIndex:copied.ref.sheetIndex,actionIndex:i,frameIndex:fi,layerIndex:copied.ref.layerIndex}]:[]);});
  }
  function review(){
    start.disabled=end.disabled=all.checked;
    try{
      const list=targets();F.plan(app,copied,list,{mode:mode.value});
      const existing=list.filter(t=>{const d=copied.ref.layer.getFrameData(app.project.getFrameKey(t.sheetIndex,t.actionIndex,t.frameIndex));return d?.data.some((v,i)=>i%4===3&&v);}).length;
      summary.textContent='将复制到 '+list.length+' 帧，其中 '+existing+' 帧此图层已有内容；'+(mode.value==='overlay'?'只叠加源图中的非透明像素。':'粘贴范围内将包含透明像素一起覆盖。')+' 可一次撤销。';apply.disabled=false;apply.textContent='复制到 '+list.length+' 帧';
    }catch(error){summary.textContent=error.message;apply.disabled=true;}
  }
  function resetRange(){const length=Math.min(...targetActions().map(({a})=>a.frames.length));start.max=end.max=length;start.value=end.value=Math.min(copied.ref.frameIndex+1,length);review();}
  function openBatch(){
    copied=F.read(app,source());const p=copied.project,ref=copied.ref;
    dialog.querySelector('[data-source]').textContent='源：'+ref.layer.name+' · '+(p.getCurrentAction().name||'当前朝向')+' 第 '+(ref.frameIndex+1)+' 帧 · '+copied.pixels.width+' × '+copied.pixels.height+' 像素';
    action.replaceChildren();for(const [i,a]of p.getCurrentSheet().actions.entries()){const o=document.createElement('option');o.value=i;o.textContent=({down:'正面',up:'背面',side:'侧面',left:'左侧',right:'右侧'})[a.direction]||a.name||'朝向 '+(i+1);action.append(o);}
    const option=document.createElement('option');option.value='all';option.textContent='全部朝向';action.append(option);action.value=ref.actionIndex;all.checked=false;mode.value='overlay';resetRange();dialog.showModal();
  }
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();action.onchange=resetRange;all.onchange=start.oninput=end.oninput=mode.onchange=review;
  apply.onclick=()=>{try{const list=targets(),result=F.apply(app,F.plan(app,copied,list,{mode:mode.value}),'批量复制图层 / 选区');status.textContent='批量复制完成：'+result.targetCount+' 帧内容发生变化，Ctrl+Z 可一次撤销。';dialog.close();}catch(error){summary.textContent=error.message;}};
  window.addEventListener('keydown',event=>{
    if(!(event.ctrlKey||event.metaKey)||event.altKey||event.shiftKey||event.defaultPrevented||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.activeElement.isContentEditable||document.querySelector('dialog[open]')||window.getSelection()?.toString())return;
    const id={c:'copy-cel-btn',x:'cut-cel-btn',v:'paste-cel-btn'}[event.key.toLowerCase()];if(!id)return;event.preventDefault();document.getElementById(id).click();
  });
});
