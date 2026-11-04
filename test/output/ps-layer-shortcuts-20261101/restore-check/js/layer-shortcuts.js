/* Photoshop-style layer shortcuts: Ctrl+J duplicates the selected layer, Ctrl+E merges it down. */
document.addEventListener('DOMContentLoaded',()=>{
  const app=PE.app;
  if(!app)return;
  const toast=document.createElement('div');
  toast.className='layer-toast';
  toast.style.bottom='64px';
  toast.setAttribute('role','status');
  document.body.append(toast);
  let toastTimer=0;
  function notify(text){toast.textContent=text;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);}

  const cloneMap=map=>new Map([...map].map(([key,data])=>[key,PE.utils.cloneImageData(data)]));
  function restoreMap(map,data){map.clear();for(const [key,value] of data)map.set(key,PE.utils.cloneImageData(value));}
  function structure(p){return{layers:p.layers.slice(),names:p.layers.map(l=>l.name),parents:p.layers.map(l=>l.parent),selected:p.currentLayerIndex};}
  function restoreStructure(p,s){
    p.layers.length=0;
    for(const layer of s.layers)p.layers.push(layer);
    p.layers.forEach((layer,i)=>{layer.name=s.names[i];layer.parent=s.parents[i];});
    p.currentLayerIndex=s.selected;
  }
  function frameSize(project,key){
    const [si,ai,fi]=key.split('_').map(Number);
    const frame=project.spriteSheets?.[si]?.actions?.[ai]?.frames?.[fi];
    return frame?{w:frame.width,h:frame.height}:null;
  }
  // 图层内容在画布中的矩形范围：普通图层铺满整帧，高清图层按放置信息。
  function rectOf(data,frame){
    if(data?.placement){
      const r=data.placement;
      return{x:r.x,y:r.y,w:r.w,h:r.h};
    }
    if(data)return{x:0,y:0,w:data.width,h:data.height};
    return frame?{x:0,y:0,w:frame.w,h:frame.h}:null;
  }
  function unionRect(a,b){
    if(!a)return b;if(!b)return a;
    const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);
    return{x,y,w:Math.max(a.x+a.w,b.x+b.w)-x,h:Math.max(a.y+a.h,b.y+b.h)-y};
  }
  // 把两张图层内容叠加成一张，透明区域保留底下那层。
  function blend(targetData,sourceData,rect,sourceOpacity){
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(rect.w));
    canvas.height=Math.max(1,Math.round(rect.h));
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    ctx.translate(-rect.x,-rect.y);
    if(targetData)PE.utils.drawImageData(ctx,targetData,0,0,1);
    if(sourceData){
      ctx.globalAlpha=Math.max(0,Math.min(1,sourceOpacity===undefined?1:sourceOpacity));
      PE.utils.drawImageData(ctx,sourceData,0,0,1);
      ctx.globalAlpha=1;
    }
    const result=ctx.getImageData(0,0,canvas.width,canvas.height);
    if(targetData?.placement||sourceData?.placement)result.placement={x:rect.x,y:rect.y,w:rect.w,h:rect.h};
    return result;
  }

  /* Ctrl+J：复制当前图层，副本紧贴原图层上方，并保留分组关系。 */
  app.duplicateCurrentLayer=function(){
    const p=this.project,index=p.currentLayerIndex,layer=p.layers[index];
    if(!layer){notify('请先选择图层');return;}
    if(layer.isGroup){notify('图层组不能复制，请选择组内的具体图层');return;}
    if(layer.inheritedBase){notify('头部、身体和手部跟随主工程，不能复制');return;}
    if(PE.isHandLayer(layer)){notify('手部参考层受保护，不能复制');return;}
    const copy=new PE.Layer(layer.name+' 副本');
    copy.sheetIndex=layer.sheetIndex;
    copy.depth=layer.depth;
    copy.opacity=layer.opacity;
    copy.visible=layer.visible;
    copy.parent=layer.parent;
    for(const [key,data] of layer.frameData)copy.frameData.set(key,PE.utils.cloneImageData(data));
    const before=structure(p);
    const position=index+1,parentIndex=layer.parent;
    p.layers.splice(position,0,copy);
    for(const item of p.layers){
      if(item===copy)continue;
      if(item.parent!=null&&item.parent>=position)item.parent++;
    }
    copy.parent=parentIndex==null?null:(parentIndex>=position?parentIndex+1:parentIndex);
    p.currentLayerIndex=position;
    const after=structure(p);
    p.history.undoStack.push({description:'复制图层',changes:[],undo:()=>restoreStructure(p,before),redo:()=>restoreStructure(p,after)});
    p.history.redoStack=[];
    p.history._notifyChange();
    notify('已复制图层「'+layer.name+'」');
    this.updateAll();
  };

  /* Ctrl+E：把当前图层向下合并到它下面那层（同 Photoshop 的“向下合并”）。 */
  app.mergeLayerDown=function(){
    const p=this.project,index=p.currentLayerIndex,source=p.layers[index];
    if(!source){notify('请先选择图层');return;}
    if(source.isGroup){notify('图层组不能合并，请选择组内的具体图层');return;}
    if(source.inheritedBase){notify('头部、身体和手部跟随主工程，不能合并');return;}
    if(PE.isHandLayer(source)){notify('手部参考层受保护，不能合并');return;}
    if(source.locked){notify('图层已锁定，请先解锁');return;}
    const parent=source.parent;
    let targetIndex=-1;
    for(let j=index-1;j>=0;j--){
      if(p.layers[j].parent===parent){targetIndex=j;break;}
    }
    if(targetIndex<0){notify('下方没有可合并的图层');return;}
    const target=p.layers[targetIndex];
    if(target.isGroup){notify('图层组不能作为合并目标，请选择具体图层');return;}
    if(target.inheritedBase||PE.isHandLayer(target)){notify('下方图层受保护，无法合并');return;}
    if(target.locked){notify('下方图层已锁定，请先解锁');return;}
    if(p.layers.some(l=>l.parent===index)){notify('该图层下面还有子图层，请先处理子图层');return;}
    const keys=new Set([...target.frameData.keys(),...source.frameData.keys()]);
    if(!keys.size){notify('两个图层都没有内容，无需合并');return;}
    const merged=new Map();
    for(const key of keys){
      const frame=frameSize(p,key);
      const targetData=target.getFrameData(key),sourceData=source.getFrameData(key);
      const rect=unionRect(rectOf(targetData,frame),rectOf(sourceData,frame));
      if(!rect)continue;
      merged.set(key,blend(targetData,sourceData,rect,source.opacity));
    }
    const before={
      structure:structure(p),
      targetData:cloneMap(target.frameData),
      sourceData:cloneMap(source.frameData)
    };
    target.frameData.clear();
    for(const [key,data] of merged)target.frameData.set(key,data);
    p.layers.splice(index,1);
    for(const item of p.layers){
      if(item.parent!=null&&item.parent>index)item.parent--;
    }
    p.currentLayerIndex=targetIndex;
    const after={
      structure:structure(p),
      targetData:cloneMap(target.frameData),
      sourceData:cloneMap(source.frameData)
    };
    const restore=snapshot=>{
      restoreStructure(p,snapshot.structure);
      restoreMap(target.frameData,snapshot.targetData);
      restoreMap(source.frameData,snapshot.sourceData);
    };
    p.history.undoStack.push({description:'向下合并图层',changes:[],undo:()=>restore(before),redo:()=>restore(after)});
    p.history.redoStack=[];
    p.history._notifyChange();
    notify('已把「'+source.name+'」合并到「'+target.name+'」');
    this.updateAll();
  };

  /* 图层面板上的快捷按钮，和快捷键共用同一实现。 */
  const header=document.querySelector('.layer-header-actions');
  if(header){
    const add=(text,title,handler)=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='icon-action-btn';
      b.textContent=text;
      b.title=title;
      b.setAttribute('aria-label',title);
      b.onclick=()=>{try{app[handler]();}catch(error){notify(error&&error.message||'操作失败');}};
      header.append(b);
      return b;
    };
    add('复制图层','复制当前图层（Ctrl+J，同 Photoshop）','duplicateCurrentLayer');
    add('合并图层','把当前图层向下合并到下面那层（Ctrl+E，同 Photoshop）','mergeLayerDown');
  }
});
