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
    if(!PE.isLayerInAction(p,layer,sheetIndex,actionIndex))throw new Error('图层属于其他朝向，请选择目标朝向的图层');
    return {sheetIndex,actionIndex,frameIndex,layerIndex,action,frame,layer,key:p.getFrameKey(sheetIndex,actionIndex,frameIndex)};
  },
  editable(ref){
    if(ref.layer.locked||ref.layer.inheritedBase||PE.isHandLayer(ref.layer))throw new Error('目标图层锁定或属于受保护底稿');
    if(ref.frame.locked)throw new Error('目标帧已锁定');
  },
  read(app,source={}){
    if(app.toolManager.isDrawing)throw new Error('请先结束当前绘画或拖动');
    const p=app.project,ref=this.resolve(p,source),data=ref.layer.getFrameData(ref.key),r=source.rect||{x:0,y:0,w:ref.frame.width,h:ref.frame.height};
    if(data?.placement){PE.utils.validateImagePlacement(r,ref.frame);}
    else if(![r.x,r.y,r.w,r.h].every(Number.isSafeInteger)||r.x<0||r.y<0||r.w<1||r.h<1||r.x+r.w>ref.frame.width||r.y+r.h>ref.frame.height)throw new Error('复制选区超出源帧');
    if(!data)throw new Error('当前图层在源帧没有内容，请先选择有内容的帧');
    if(data.placement){
      const bounds=data.placement;
      const partial=!!source.rect&&!['x','y','w','h'].every(k=>r[k]===bounds[k]),box=PE.utils.imageSourceRect(data,partial?r:bounds);
      if(!box.w||!box.h)throw new Error('选区没有源像素');
      const pixels=partial?new ImageData(box.w,box.h):PE.utils.cloneImageData(data);
      if(partial){
        for(let y=0;y<box.h;y++)pixels.data.set(data.data.subarray(((box.y+y)*data.width+box.x)*4,((box.y+y)*data.width+box.x+box.w)*4),y*box.w*4);
        pixels.placement={x:bounds.x+box.x*bounds.w/data.width,y:bounds.y+box.y*bounds.h/data.height,w:box.w*bounds.w/data.width,h:box.h*bounds.h/data.height};
      }
      const pixelCount=pixels.data.reduce((n,v,i)=>n+(i%4===3&&v>0?1:0),0);
      if(!pixelCount)throw new Error('选中的图层没有可复制的像素');
      return {project:p,ref,pixels,x:pixels.placement.x,y:pixels.placement.y,pixelCount,partial,sourceRect:box};
    }
    const pixels=new ImageData(r.w,r.h);let pixelCount=0;
    for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++){
      const i=((r.y+y)*data.width+r.x+x)*4;pixels.data.set(data.data.subarray(i,i+4),(y*r.w+x)*4);if(data.data[i+3])pixelCount++;
    }
    if(!pixelCount)throw new Error('选中的图层或区域没有可复制的像素');
    return {project:p,ref,pixels,x:r.x,y:r.y,pixelCount};
  },
  info(clip){
    if(clip.detached)return {layerIndex:-1,layerName:clip.source?.layerName||'跨窗口复制的图层',sheetIndex:clip.source?.sheetIndex??-1,actionIndex:clip.source?.actionIndex??-1,frameIndex:clip.source?.frameIndex??-1,x:clip.x,y:clip.y,width:clip.pixels.width,height:clip.pixels.height,pixelCount:clip.pixelCount,shared:true};
    return {layerIndex:clip.project.layers.indexOf(clip.ref.layer),layerName:clip.ref.layer.name,sheetIndex:clip.ref.sheetIndex,actionIndex:clip.ref.actionIndex,frameIndex:clip.ref.frameIndex,x:clip.x,y:clip.y,width:clip.pixels.width,height:clip.pixels.height,pixelCount:clip.pixelCount,shared:false};
  },
  /**
   * 把剪贴板内容发布到跨窗口共享通道（localStorage + BroadcastChannel + 系统文本剪贴板）。
   * 只写像素与来源信息，不写任何工程内容。
   */
  publish(app,clip){
    const Shared=PE.SharedClipboard;if(!Shared?.encodeClip)return null;
    const ref=clip.ref;
    const payload=Shared.encodeClip(clip,{layerName:ref?.layer?.name||'',layerIndex:ref?.layerIndex??-1,layerSheetIndex:ref?.layer?.sheetIndex??-1,sheetIndex:ref?.sheetIndex??-1,actionIndex:ref?.actionIndex??-1,frameIndex:ref?.frameIndex??-1,opacity:ref?.layer?.opacity??1,projectId:app?.persistence?.projectId||null});
    if(payload){
      // 用本地复制时间作为时间戳：同一窗口优先用本地对象，其它窗口取时间更新的那一份。
      payload.createdAt=clip.copiedAt||Date.now();
      // 本地对象也记下同一时间，粘贴时才能比较新旧。
      app.frameClipboard=clip;
      Shared.save(payload);
    }
    return payload;
  },
  /**
   * 解析当前应当使用的剪贴板：优先最新的一份（本地窗口内复制，或别的窗口刚复制的）。
   * 跨窗口来源返回 detached 剪贴板，不绑定任何工程对象。
   */
  resolveClipboard(app){
    const local=app?.frameClipboard||null;
    const Shared=PE.SharedClipboard;
    const shared=Shared?.load?Shared.load():null;
    // 本地剪贴板如果属于别的工程（切换过工程），不能直接用来粘贴。
    const localUsable=local&&(local.detached||!app||local.project===app.project);
    const localTime=localUsable?(local.copiedAt||0):0,sharedTime=shared?.createdAt||0;
    if(shared&&sharedTime>localTime)return shared;
    if(localUsable)return local;
    return shared;
  },
  copy(app,source){const clip=this.read(app,source);clip.copiedAt=Date.now();app.frameClipboard=clip;this.publish(app,clip);return this.info(clip);},
  plan(app,clip,targets=[{}],options={}){
    const {mode='overlay',x=clip?.x,y=clip?.y}=options;
    if(!clip)throw new Error('请先复制图层或选区');
    // 跨窗口复制的内容没有工程对象绑定，只要像素本身有效即可粘贴。
    const detached=!!clip.detached;
    if(!detached&&clip.project!==app.project)throw new Error('请先在当前工程复制图层或选区');
    if(app.toolManager.isDrawing)throw new Error('请先结束当前绘画或拖动');
    if(!['overlay','replace'].includes(mode)||![x,y].every(clip.pixels.placement?Number.isFinite:Number.isSafeInteger))throw new Error('粘贴方式或坐标无效');
    if(!Array.isArray(targets)||!targets.length||targets.length>256)throw new Error('一次请选择 1–256 个目标帧');
    // 默认叠加只按有色像素最小平移；明确坐标、透明覆盖和高清图片保留原有边界语义。
    let bounds=null;
    if(!clip.pixels.placement&&mode==='overlay'&&options.x===undefined&&options.y===undefined){
      let left=Infinity,top=Infinity,right=-1,bottom=-1;
      for(let row=0;row<clip.pixels.height;row++)for(let col=0;col<clip.pixels.width;col++)if(clip.pixels.data[(row*clip.pixels.width+col)*4+3]){
        left=Math.min(left,col);top=Math.min(top,row);right=Math.max(right,col);bottom=Math.max(bottom,row);
      }
      if(right>=0)bounds={left,top,right,bottom};
    }
    const edits=[],seen=new Set(),p=app.project,layers=p.layers.slice(),plannedProject=Object.assign(Object.create(p),{layers});
    for(const target of targets){
      if(!target||typeof target!=='object'||Array.isArray(target))throw new Error('目标帧需要是对象');
      const sheetIndex=target.sheetIndex??p.currentSheetIndex,actionIndex=target.actionIndex??p.currentActionIndex;let layerIndex=target.layerIndex;
      // 跨窗口粘贴：按来源图层名在目标里找同名图层，找不到就新建一个独立图层。
      if(detached){
        if(layerIndex===undefined){
          const name=clip.source?.layerName||'粘贴图层';
          const usable=layers.filter(l=>!l.isGroup&&l.name===name&&PE.isLayerInAction(plannedProject,l,sheetIndex,actionIndex));
          // 先用同素材表的同名图层；没有再退到其它素材表里唯一同名的那个。
          let matches=usable.filter(l=>l.sheetIndex===undefined||l.sheetIndex===sheetIndex);
          if(matches.length!==1)matches=usable;
          if(matches.length>1)throw new Error('目标有多个同名图层，请明确选择目标图层');
          let layer=matches[0];
          if(!layer){layer=Object.assign(new PE.Layer(name),{sheetIndex,opacity:clip.source?.opacity??1});layers.push(layer);}
          layerIndex=layers.indexOf(layer);
        }
      } else if(layerIndex===undefined&&clip.ref.layer.sheetIndex!==undefined&&(sheetIndex!==clip.ref.sheetIndex||!PE.isLayerInAction(p,clip.ref.layer,sheetIndex,actionIndex))){
        const matches=layers.filter(l=>!l.isGroup&&l.sheetIndex===sheetIndex&&l.name===clip.ref.layer.name&&PE.isLayerInAction(plannedProject,l,sheetIndex,actionIndex));
        if(matches.length>1)throw new Error('目标动作有多个同名图层，请明确选择目标图层');
        let layer=matches[0];
        if(!layer){
          layer=Object.assign(new PE.Layer(clip.ref.layer.name),{sheetIndex,opacity:clip.ref.layer.opacity});
          layers.push(layer);
        }
        layerIndex=layers.indexOf(layer);
      }
      const ref=this.resolve(plannedProject,{...target,...(layerIndex===undefined?{}:{layerIndex})});this.editable(ref);
      const id=ref.layerIndex+':'+ref.key;if(seen.has(id))continue;seen.add(id);
      const before=ref.layer.getFrameData(ref.key);
      if(clip.pixels.placement){
        if(clip.partial&&before?.placement){
          const r=before.placement,c=clip.pixels,cr=c.placement,sx=before.width/r.w,sy=before.height/r.h,dx=Math.round((x-r.x)*sx),dy=Math.round((y-r.y)*sy);
          if(Math.abs(c.width/cr.w-sx)>1e-6||Math.abs(c.height/cr.h-sy)>1e-6||Math.abs((x-r.x)*sx-dx)>1e-6||Math.abs((y-r.y)*sy-dy)>1e-6)throw new Error('目标源像素网格不同，不能无损粘贴；请粘贴到空白图层');
          const left=Math.min(0,dx),top=Math.min(0,dy),w=Math.max(before.width,dx+c.width)-left,h=Math.max(before.height,dy+c.height)-top;
          if(w>32767||h>32767||w*h>16*1024*1024)throw new Error('粘贴后源画布过大，未修改');
          const after=new ImageData(w,h);after.placement=PE.utils.validateImagePlacement({x:r.x+left/sx,y:r.y+top/sy,w:w/sx,h:h/sy},ref.frame);
          for(const rect of [r,{x,y,w:cr.w,h:cr.h}])if(PE.utils.imagePlacementLocked(rect,ref.frame))throw new Error('目标包含保护区域；没有修改任何目标');
          for(let row=0;row<before.height;row++)after.data.set(before.data.subarray(row*before.width*4,(row+1)*before.width*4),((row-top)*w-left)*4);
          for(let row=0;row<c.height;row++)for(let col=0;col<c.width;col++){const i=(row*c.width+col)*4;if(mode==='overlay'&&!c.data[i+3])continue;after.data.set(c.data.subarray(i,i+4),((dy+row-top)*w+dx+col-left)*4);}
          edits.push({ref,before,after,modified:clip.pixelCount});continue;
        }
        if(before?.data.some((v,i)=>i%4===3&&v)&&mode!=='replace')throw new Error('高清图片请粘贴到空白图层 / 空白帧，或明确选择覆盖方式；不会合并压缩原图');
        if(before&&!before.placement&&before.data.some((v,i)=>i%4===3&&v))throw new Error('高清图片不能覆盖已有像素绘画，请新建图层');
        const after=PE.utils.cloneImageData(clip.pixels);after.placement=PE.utils.validateImagePlacement({...after.placement,x,y},ref.frame);
        if(detached){const r=after.placement;after.placement=PE.utils.validateImagePlacement({x:Math.max(0,Math.min(r.x,Math.max(0,ref.frame.width-r.w))),y:Math.max(0,Math.min(r.y,Math.max(0,ref.frame.height-r.h))),w:r.w,h:r.h},ref.frame);}
        for(const r of [after.placement,before?.placement].filter(Boolean))if(PE.utils.imagePlacementLocked(r,ref.frame))throw new Error('目标包含保护区域；没有修改任何目标');
        edits.push({ref,before,after,modified:clip.pixelCount});continue;
      }
      if(before?.placement)throw new Error('不能把像素选区直接写入高清图片，请选择像素图层');
      const after=before?PE.utils.cloneImageData(before):new ImageData(ref.frame.width,ref.frame.height);let modified=0;
      // 跨窗口粘贴：来源坐标按原帧算，目标帧可能更小，需要夹到可见范围内。
      let baseX=detached?Math.max(0,Math.min(x,Math.max(0,ref.frame.width-clip.pixels.width))):x;
      let baseY=detached?Math.max(0,Math.min(y,Math.max(0,ref.frame.height-clip.pixels.height))):y;
      if(bounds){
        if(bounds.right-bounds.left+1>ref.frame.width||bounds.bottom-bounds.top+1>ref.frame.height)throw new Error('复制内容放不下目标画布，请扩大目标画布或缩小选区；没有修改任何目标');
        baseX=Math.max(-bounds.left,Math.min(x,ref.frame.width-1-bounds.right));
        baseY=Math.max(-bounds.top,Math.min(y,ref.frame.height-1-bounds.bottom));
      }
      for(let row=0;row<clip.pixels.height;row++)for(let col=0;col<clip.pixels.width;col++){
        const i=(row*clip.pixels.width+col)*4;if(mode==='overlay'&&!clip.pixels.data[i+3])continue;
        const dx=baseX+col,dy=baseY+row;
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
    const p=app.project,added=[...new Set(edits.map(e=>e.ref.layer))].filter(l=>!p.layers.includes(l));
    const beforeLayers=p.layers.slice(),parents=p.layers.map(l=>l.parent),selected=p.currentLayerIndex;
    const restore=side=>{for(const edit of edits){const data=edit[side];if(data)edit.ref.layer.frameData.set(edit.ref.key,PE.utils.cloneImageData(data));else edit.ref.layer.frameData.delete(edit.ref.key);}};
    if(edits.length)this.record(app,description,()=>{
      restore('before');
      if(added.length){p.layers=beforeLayers.slice();p.layers.forEach((l,i)=>l.parent=parents[i]);}
      p.currentLayerIndex=selected;
    },()=>{
      for(const layer of added){p.layers.push(layer);PE.autoPlaceLayer(p,p.layers.indexOf(layer),{rename:false});}
      restore('after');
      const current=edits.find(e=>e.ref.key===p.getFrameKey());
      p.currentLayerIndex=current?p.layers.indexOf(current.ref.layer):p.layers.indexOf(beforeLayers[selected]);
    });
    return {targetCount:edits.length,modifiedPixels:edits.reduce((n,e)=>n+e.modified,0),targets:edits.map(({ref})=>({sheetIndex:ref.sheetIndex,actionIndex:ref.actionIndex,frameIndex:ref.frameIndex,layerIndex:p.layers.indexOf(ref.layer)}))};
  },
  paste(app,targets,options){const clip=this.resolveClipboard(app);return this.apply(app,this.plan(app,clip,targets,options),'粘贴图层 / 选区');},
  cut(app,source){
    const clip=this.read(app,source);
    if(clip.pixels.placement){
      this.editable(clip.ref);const r=clip.pixels.placement;
      if(PE.utils.imagePlacementLocked(r,clip.ref.frame))throw new Error('图片包含保护区域');
      if(clip.partial){
        const before=clip.ref.layer.getFrameData(clip.ref.key),after=PE.utils.cloneImageData(before),b=clip.sourceRect;
        for(let row=0;row<b.h;row++)after.data.fill(0,((b.y+row)*after.width+b.x)*4,((b.y+row)*after.width+b.x+b.w)*4);
        const result=this.apply(app,[{ref:clip.ref,before,after,modified:clip.pixelCount}],'剪切高清源像素选区');app.frameClipboard=clip;clip.copiedAt=Date.now();this.publish(app,clip);return result;
      }
      const result=this.apply(app,[{ref:clip.ref,before:clip.ref.layer.getFrameData(clip.ref.key),after:null,modified:clip.pixelCount}],'剪切高清图片');app.frameClipboard=clip;clip.copiedAt=Date.now();this.publish(app,clip);return result;
    }
    const blank={...clip,pixels:new ImageData(clip.pixels.width,clip.pixels.height)};
    const edits=this.plan(app,blank,[clip.ref],{mode:'replace'}),result=this.apply(app,edits,'剪切图层 / 选区');app.frameClipboard=clip;clip.copiedAt=Date.now();this.publish(app,clip);return result;
  },
  copyToFrames(app,source,targets,options){
    const clip=this.read(app,source);
    if(!Array.isArray(targets))throw new Error('请提供目标帧数组');
    const list=targets.map(t=>{if(!t||typeof t!=='object'||Array.isArray(t))throw new Error('目标帧需要是对象');return {sheetIndex:clip.ref.sheetIndex,...(PE.isLayerInAction(app.project,clip.ref.layer,t.sheetIndex??clip.ref.sheetIndex,t.actionIndex??app.project.currentActionIndex)?{layerIndex:clip.ref.layerIndex}:{}),...t};});
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
  delete(app){
    if(app.toolManager.isDrawing)throw new Error('请先结束当前绘画或拖动');
    const p=app.project,si=p.currentSheetIndex,ai=p.currentActionIndex,fi=p.currentFrameIndex,a=p.getCurrentAction(),frame=a?.frames[fi];
    if(!Number.isSafeInteger(fi)||!frame)throw new Error('请先选择有效帧');
    if(a.frames.length<=1)throw new Error('每个朝向至少保留一帧');
    if(frame.locked||frame.lockedRegions?.length)throw new Error('当前帧已锁定或含保护区域，请先解除保护');
    const layers=p.layers.filter(l=>l.sheetIndex===undefined||l.sheetIndex===si);
    // shortcut: shared-base branches need stable frame mapping before independent deletion is safe.
    if(layers.some(l=>l.inheritedBase))throw new Error('共享人物底稿分支暂不支持删帧，请在人物主工程操作');
    const keys=a.frames.map((_,i)=>p.getFrameKey(si,ai,i)).slice(fi),before=layers.map(l=>keys.map(k=>{
      const d=l.getFrameData(k);return d?PE.utils.cloneImageData(d):null;
    }));
    const restore=data=>layers.forEach((l,i)=>keys.forEach((k,j)=>{
      if(data[i][j])l.frameData.set(k,PE.utils.cloneImageData(data[i][j]));else l.frameData.delete(k);
    }));
    const after=before.map(data=>[...data.slice(1),null]),selected=Math.min(fi,a.frames.length-2);
    this.record(app,'删除当前帧',()=>{a.frames.splice(fi,0,frame);restore(before);p.selectFrame(si,ai,fi);},()=>{
      a.frames.splice(fi,1);restore(after);p.selectFrame(si,ai,selected);
    });
    return {sheetIndex:si,actionIndex:ai,deletedFrameIndex:fi,frameIndex:selected,frameCount:a.frames.length};
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
  const status=document.createElement('span');status.className='frame-edit-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='有选区时复制选区；无选区时复制当前图层。可切换到待机、坐姿等动作后粘贴。';
  const historyChange=app.history.onChange;app.history.onChange=()=>{historyChange?.();status.textContent='当前图层：'+(app.project.getCurrentLayer()?.name||'未选择')+' · 第 '+(app.project.currentFrameIndex+1)+' 帧 · Ctrl+C / X / V 复制、剪切、粘贴。';};
  const source=()=>app.toolManager.selection?{rect:{...app.toolManager.selection}}:{};
  function call(method,...args){const result=pixelAPI[method](...args);if(!result.success)throw new Error(result.error);return result.data;}
  function run(fn){try{fn();}catch(error){status.textContent=error.message;}}
  function button(id,label,title,fn){const b=document.createElement('button');b.id=id;b.type='button';b.className='studio-button';b.textContent=label;b.title=title;b.onclick=()=>run(fn);bar.append(b);return b;}
  button('copy-cel-btn','复制','复制选区或当前图层（Ctrl+C）；可到其它窗口 / 其它工程粘贴',()=>{const c=call('copyLayerFrame',source());status.textContent='已复制“'+c.layerName+'”第 '+(c.frameIndex+1)+' 帧；可切换动作、朝向、帧，或换到另一个窗口粘贴。';});
  button('cut-cel-btn','剪切','剪切选区或当前图层（Ctrl+X），可撤销',()=>{call('cutLayerFrame',source());status.textContent='已剪切，可切换帧后粘贴；Ctrl+Z 可恢复原处。';});
  button('paste-cel-btn','粘贴','粘贴到当前帧；跨窗口、跨动作自动匹配同名图层，没有则新建（Ctrl+V）',()=>{const result=call('pasteLayerFrames',[{}]);status.textContent='已粘贴，修改 '+result.modifiedPixels+' 个像素；跨窗口与跨动作使用同名图层，原处保留。'+(PE.isLayerVisible(app.project,app.project.getCurrentLayer())?'':'目标图层可能隐藏，请打开小眼睛。');});
  button('copy-next-cel-btn','复制到下一帧','复制当前图层或选区并跳到下一帧；末帧会复制整帧追加，可连续点击',()=>{const result=call('copyLayerToNextFrame',source());status.textContent=(result.createdFrame?'已复制整帧新建':'已复制到')+'第 '+(result.frameIndex+1)+' 帧，可继续复制。';});
  button('batch-copy-cel-btn','批量复制…','复制当前图层或选区到指定动作、朝向、帧范围',openBatch);
  button('duplicate-frame-btn','复制整帧到末尾','把当前帧所有图层复制到末尾，可撤销',()=>{const r=call('duplicateFrame');status.textContent='已复制整帧到第 '+(r.frameIndex+1)+' 帧；Ctrl+Z 可撤销。';});
  button('delete-frame-btn','删除当前帧','删除当前朝向的整帧（所有图层），至少保留一帧；Ctrl+Z 可撤销',()=>{
    const p=app.project,a=p.getCurrentAction();
    if(!a)throw new Error('请先打开工程');
    if(a.frames.length<=1)throw new Error('每个朝向至少保留一帧');
    if(!confirm('删除当前朝向第 '+(p.currentFrameIndex+1)+' 帧的所有图层内容？其他朝向不变，可用 Ctrl+Z 撤销。'))return;
    const r=call('deleteFrame');status.textContent='已删除第 '+(r.deletedFrameIndex+1)+' 帧，当前朝向剩 '+r.frameCount+' 帧；Ctrl+Z 可撤销，保存工程后生效。';
  });
  bar.append(status);document.getElementById('frame-strip-wrapper').prepend(bar);

  const dialog=document.createElement('dialog');dialog.className='advanced-dialog frame-copy-dialog';dialog.setAttribute('aria-label','批量复制图层');
  dialog.innerHTML=`<div class="dialog-title"><h2>批量复制图层 / 选区</h2><button type="button" data-close class="studio-button">关闭</button></div>
    <p data-source></p><div class="frame-copy-fields"><label>目标动作 <select data-sheet aria-label="目标动作"></select></label><label>目标朝向 <select data-action aria-label="目标朝向"></select></label>
    <label><input type="checkbox" data-all>目标朝向全部帧</label><label>起始帧 <input type="number" min="1" data-start aria-label="起始帧"></label><label>结束帧 <input type="number" min="1" data-end aria-label="结束帧"></label>
    <label>粘贴方式 <select data-mode aria-label="粘贴方式"><option value="overlay">叠加（保留目标其他像素）</option><option value="replace">覆盖粘贴范围（含透明像素）</option></select></label></div>
    <p>仅复制所选图层，朝向按原样复制，不自动改姿势或对齐头部。跨动作匹配同名图层，没有则新建。每个目标都是独立副本，后续修改互不影响。遇到锁定或越界会整批取消。</p>
    <p data-summary aria-live="polite"></p><button type="button" data-apply class="studio-button save-primary">复制</button>`;
  document.body.append(dialog);
  const sheet=dialog.querySelector('[data-sheet]'),action=dialog.querySelector('[data-action]'),all=dialog.querySelector('[data-all]'),start=dialog.querySelector('[data-start]'),end=dialog.querySelector('[data-end]'),mode=dialog.querySelector('[data-mode]'),summary=dialog.querySelector('[data-summary]'),apply=dialog.querySelector('[data-apply]');
  let copied=null;
  function targetActions(){return copied.project.spriteSheets[Number(sheet.value)].actions.map((a,i)=>({a,i})).filter(({i})=>action.value==='all'||i===Number(action.value));}
  function targets(){
    if(app.project!==copied.project||app.project.layers[copied.ref.layerIndex]!==copied.ref.layer)throw new Error('工程或源图层已变化，请重新打开批量复制');
    const first=Number(start.value),last=Number(end.value);
    if(!all.checked&&(![first,last].every(Number.isSafeInteger)||first<1||last<first))throw new Error('请输入有效帧范围（从 1 开始）');
    return targetActions().flatMap(({a,i})=>{if(!all.checked&&last>a.frames.length)throw new Error('结束帧超出目标朝向');return a.frames.flatMap((_,fi)=>all.checked||fi>=first-1&&fi<=last-1?[{sheetIndex:Number(sheet.value),actionIndex:i,frameIndex:fi,...(Number(sheet.value)===copied.ref.sheetIndex?{layerIndex:copied.ref.layerIndex}:{})}]:[]);});
  }
  function review(){
    start.disabled=end.disabled=all.checked;
    try{
      const list=targets();F.plan(app,copied,list,{mode:mode.value});
      const layer=Number(sheet.value)===copied.ref.sheetIndex?copied.ref.layer:app.project.layers.find(l=>!l.isGroup&&l.sheetIndex===Number(sheet.value)&&l.name===copied.ref.layer.name);
      const existing=list.filter(t=>{const d=layer?.getFrameData(app.project.getFrameKey(t.sheetIndex,t.actionIndex,t.frameIndex));return d?.data.some((v,i)=>i%4===3&&v);}).length;
      summary.textContent='将复制到 '+list.length+' 帧，其中 '+existing+' 帧此图层已有内容；'+(mode.value==='overlay'?'只叠加源图中的非透明像素。':'粘贴范围内将包含透明像素一起覆盖。')+' 可一次撤销。';apply.disabled=false;apply.textContent='复制到 '+list.length+' 帧';
    }catch(error){summary.textContent=error.message;apply.disabled=true;}
  }
  function resetRange(){const length=Math.min(...targetActions().map(({a})=>a.frames.length));start.max=end.max=length;start.value=end.value=Math.min(copied.ref.frameIndex+1,length);review();}
  function resetActions(){
    const p=copied.project,sourceDirection=copied.ref.action.direction;
    action.replaceChildren();for(const [i,a]of p.spriteSheets[Number(sheet.value)].actions.entries()){const o=document.createElement('option');o.value=i;o.textContent=({down:'正面',up:'背面',side:'侧面',left:'左侧',right:'右侧'})[a.direction]||a.name||'朝向 '+(i+1);action.append(o);}
    const option=document.createElement('option');option.value='all';option.textContent='全部朝向';action.append(option);
    const matching=p.spriteSheets[Number(sheet.value)].actions.findIndex(a=>a.direction===sourceDirection);action.value=Math.max(0,matching);resetRange();
  }
  function openBatch(){
    copied=F.read(app,source());const p=copied.project,ref=copied.ref;
    dialog.querySelector('[data-source]').textContent='源：'+ref.layer.name+' · '+(p.getCurrentAction().name||'当前朝向')+' 第 '+(ref.frameIndex+1)+' 帧 · '+copied.pixels.width+' × '+copied.pixels.height+' 像素';
    const names={original32_walk:'行走',original32_idle:'待机',original32_pickup:'拾取',original32_sit:'坐姿',original32_sleep:'睡觉'};
    sheet.replaceChildren();for(const [i,s]of p.spriteSheets.entries()){if(!PE.isEditorSheet(s))continue;const o=document.createElement('option');o.value=i;o.textContent=names[s.name]||s.name;sheet.append(o);}
    if(!sheet.options.length)throw Error('没有可编辑的目标动作');
    sheet.value=PE.isEditorSheet(p.spriteSheets[ref.sheetIndex])?ref.sheetIndex:sheet.options[0].value;all.checked=false;mode.value='overlay';resetActions();dialog.showModal();
  }
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();sheet.onchange=resetActions;action.onchange=resetRange;all.onchange=start.oninput=end.oninput=mode.onchange=review;
  apply.onclick=()=>{try{const list=targets(),result=F.apply(app,F.plan(app,copied,list,{mode:mode.value}),'批量复制图层 / 选区');status.textContent='批量复制完成：'+result.targetCount+' 帧内容发生变化，Ctrl+Z 可一次撤销。';dialog.close();}catch(error){summary.textContent=error.message;}};
  // 其它窗口复制后，这里给出提示；粘贴时优先用共享剪贴板。
  PE.SharedClipboard?.onUpdate(payload=>{
    if(!payload)return;
    const name=payload.source?.layerName||'图层';
    status.textContent='其它窗口刚复制了“'+name+'”（'+payload.width+' × '+payload.height+' 像素），可直接在本窗口 Ctrl+V 粘贴。';
  });
  // 系统剪贴板兜底：不同浏览器实例之间复制时，localStorage 不共享。
  document.addEventListener('paste',event=>{
    const active=document.activeElement;
    if(active&&(['INPUT','TEXTAREA'].includes(active.tagName)||active.isContentEditable))return;
    const text=event.clipboardData?.getData('text/plain');
    const clip=PE.SharedClipboard?.decodeText(text);
    if(!clip)return;
    event.preventDefault();
    app.frameClipboard=clip;
    try{
      const result=F.apply(app,F.plan(app,clip,[{}]),'粘贴跨窗口内容');
      status.textContent='已从系统剪贴板粘贴跨窗口内容，修改 '+result.modifiedPixels+' 个像素。';
    }catch(error){status.textContent=error.message;}
  });
  window.addEventListener('keydown',event=>{
    if(!(event.ctrlKey||event.metaKey)||event.altKey||event.shiftKey||event.defaultPrevented||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.activeElement.isContentEditable||document.querySelector('dialog[open]')||window.getSelection()?.toString())return;
    const key=event.key.toLowerCase();
    if(key==='v'&&!F.resolveClipboard(app)){
      // 共享剪贴板里没有内容时，放行系统粘贴事件，由上面的 paste 监听器处理。
      return;
    }
    const id={c:'copy-cel-btn',x:'cut-cel-btn',v:'paste-cel-btn'}[key];if(!id)return;event.preventDefault();document.getElementById(id).click();
  });
});
