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
  function structure(p){return{layers:p.layers.slice(),names:p.layers.map(l=>l.name),parents:p.layers.map(l=>l.parent),opacities:p.layers.map(l=>l.opacity),selected:p.currentLayerIndex};}
  function restoreStructure(p,s){
    p.layers.length=0;
    for(const layer of s.layers)p.layers.push(layer);
    p.layers.forEach((layer,i)=>{layer.name=s.names[i];layer.parent=s.parents[i];layer.opacity=s.opacities[i];});
    p.currentLayerIndex=s.selected;
  }
  // 图层内容在画布中的矩形范围：普通图层铺满整帧，高清图层按放置信息。
  function rectOf(data){
    if(data?.placement){
      const r=data.placement;
      return{x:r.x,y:r.y,w:r.w,h:r.h};
    }
    if(data)return{x:0,y:0,w:data.width,h:data.height};
    return null;
  }
  function unionRect(a,b){
    if(!a)return b;if(!b)return a;
    const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);
    return{x,y,w:Math.max(a.x+a.w,b.x+b.w)-x,h:Math.max(a.y+a.h,b.y+b.h)-y};
  }
  // 把两张图层内容叠加成一张，透明区域保留底下那层。
  function blend(targetData,sourceData,rect,targetOpacity,sourceOpacity){
    // 合并需要栅格化，但不能把高清源压回一格一个像素。
    let scale=1;
    for(const data of [targetData,sourceData])if(data?.placement){
      const r=data.placement;
      scale=Math.max(scale,Math.ceil(data.width/r.w),Math.ceil(data.height/r.h),!Number.isInteger(r.x)||!Number.isInteger(r.y)?10:1);
    }
    const x=Math.floor(rect.x*scale)/scale,y=Math.floor(rect.y*scale)/scale;
    const w=Math.ceil((rect.x+rect.w)*scale)-Math.round(x*scale),h=Math.ceil((rect.y+rect.h)*scale)-Math.round(y*scale);
    if(![w,h].every(Number.isSafeInteger)||w<1||h<1||w>32767||h>32767||w*h>16*1024*1024)throw new Error('合并后的源画布过大，未修改图层');
    const canvas=document.createElement('canvas');
    canvas.width=w;
    canvas.height=h;
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    ctx.translate(-x*scale,-y*scale);
    ctx.globalAlpha=Math.max(0,Math.min(1,targetOpacity??1));
    if(targetData)PE.utils.drawImageData(ctx,targetData,0,0,scale);
    if(sourceData){
      ctx.globalAlpha=Math.max(0,Math.min(1,sourceOpacity===undefined?1:sourceOpacity));
      PE.utils.drawImageData(ctx,sourceData,0,0,scale);
      ctx.globalAlpha=1;
    }
    const result=ctx.getImageData(0,0,canvas.width,canvas.height);
    if(targetData?.placement||sourceData?.placement)result.placement={x,y,w:w/scale,h:h/scale};
    return result;
  }

  /* Ctrl+J：复制当前图层，副本紧贴原图层上方，并保留分组关系。 */
  app.duplicateCurrentLayer=function(){
    if(this.toolManager.isDrawing){notify('请先结束当前绘画或拖动');return;}
    const p=this.project,index=p.currentLayerIndex,layer=p.layers[index];
    if(!layer){notify('请先选择图层');return;}
    if(layer.isGroup){notify('图层组不能复制，请选择组内的具体图层');return;}
    if(layer.inheritedBase){notify('头部、身体和手部跟随主工程，不能复制');return;}
    if(PE.isHandLayer(layer)){notify('手部参考层受保护，不能复制');return;}
    if(layer.sheetIndex!==undefined&&layer.sheetIndex!==p.currentSheetIndex){notify('请选择当前素材表的图层');return;}
    const copy=new PE.Layer(layer.name+' 副本');
    copy.sheetIndex=layer.sheetIndex;
    copy.depth=layer.depth;
    copy.opacity=layer.opacity;
    copy.visible=layer.visible;
    copy.parent=layer.parent;
    const selection=this.toolManager.selection;
    if(selection){
      try{
        const clip=PE.FrameEditing.read(this,{rect:selection}),pixels=clip.pixels,r=pixels.placement;
        for(let y=0;y<pixels.height;y++)for(let x=0;x<pixels.width;x++){
          let px=r?r.x+(x+.5)*r.w/pixels.width:clip.x+x,py=r?r.y+(y+.5)*r.h/pixels.height:clip.y+y;
          if(PE.selectionPlus?.mask){px=Math.floor(px);py=Math.floor(py);}
          if(PE.insideSelection&&!PE.insideSelection(px,py,selection))pixels.data.fill(0,(y*pixels.width+x)*4,(y*pixels.width+x+1)*4);
        }
        if(!pixels.data.some((v,i)=>i%4===3&&v)){notify('选区没有可复制的像素');return;}
        const result=r?pixels:new ImageData(clip.ref.frame.width,clip.ref.frame.height);
        if(!r)for(let y=0;y<pixels.height;y++)result.data.set(pixels.data.subarray(y*pixels.width*4,(y+1)*pixels.width*4),((clip.y+y)*result.width+clip.x)*4);
        copy.frameData.set(clip.ref.key,result);
      }catch(error){notify(error.message);return;}
    }else for(const [key,data] of layer.frameData)copy.frameData.set(key,PE.utils.cloneImageData(data));
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
    PE.FrameEditing.record(this,selection?'通过拷贝选区新建图层':'复制图层',()=>restoreStructure(p,before),()=>restoreStructure(p,after));
    notify('已复制'+(selection?'选区到新图层':'图层「'+layer.name+'」'));
  };

  /* Ctrl+E：把当前图层向下合并到它下面那层（同 Photoshop 的“向下合并”）。 */
  app.mergeLayerDown=function(){
    if(this.toolManager.isDrawing){notify('请先结束当前绘画或拖动');return;}
    const p=this.project,index=p.currentLayerIndex,source=p.layers[index];
    if(!source){notify('请先选择图层');return;}
    if(source.isGroup){notify('图层组不能合并，请选择组内的具体图层');return;}
    if(source.inheritedBase){notify('头部、身体和手部跟随主工程，不能合并');return;}
    if(PE.isHandLayer(source)){notify('手部参考层受保护，不能合并');return;}
    if(source.locked){notify('图层已锁定，请先解锁');return;}
    const parent=source.parent??null;
    let targetIndex=-1;
    for(let j=index-1;j>=0;j--){
      if((p.layers[j].parent??null)===parent){targetIndex=j;break;}
    }
    if(targetIndex<0){notify('下方没有可合并的图层');return;}
    const target=p.layers[targetIndex];
    if(target.isGroup){notify('图层组不能作为合并目标，请选择具体图层');return;}
    if(target.inheritedBase||PE.isHandLayer(target)){notify('下方图层受保护，无法合并');return;}
    if(target.locked){notify('下方图层已锁定，请先解锁');return;}
    if(source.sheetIndex!==target.sheetIndex){notify('不同素材表的图层不能合并');return;}
    if(p.layers.some(l=>l.parent===index)){notify('该图层下面还有子图层，请先处理子图层');return;}
    const keys=new Set([...target.frameData.keys(),...source.frameData.keys()]);
    if(!keys.size){notify('两个图层都没有内容，无需合并');return;}
    const merged=new Map();
    try{
      for(const key of keys){
        const [si,ai,fi]=key.split('_').map(Number),frame=p.spriteSheets[si]?.actions[ai]?.frames[fi];
        if(!frame||frame.locked||frame.lockedRegions.length)throw new Error('合并涉及锁定帧、保护区域或无效帧，未修改图层');
        if(!PE.isLayerVisible(p,source,si)||!PE.isLayerVisible(p,target,si))throw new Error('请先显示两个图层及其分组再合并');
        const order=PE.getRenderLayers(p,si,ai).filter(l=>PE.isLayerVisible(p,l,si));
        if(order.indexOf(source)!==order.indexOf(target)+1)throw new Error('两个图层之间还有其他图层，或动作层序不同，不能直接向下合并');
        const targetData=target.getFrameData(key),sourceData=source.getFrameData(key);
        const rect=unionRect(rectOf(targetData),rectOf(sourceData));
        if(rect)merged.set(key,blend(targetData,sourceData,rect,target.opacity,source.opacity));
      }
    }catch(error){notify(error.message);return;}
    const before={
      structure:structure(p),
      targetData:cloneMap(target.frameData),
      sourceData:cloneMap(source.frameData)
    };
    target.frameData.clear();
    for(const [key,data] of merged)target.frameData.set(key,data);
    target.opacity=1;
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
    PE.FrameEditing.record(this,'向下合并图层',()=>restore(before),()=>restore(after));
    notify('已把「'+source.name+'」合并到「'+target.name+'」');
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
    add('复制图层','复制当前图层；有选区时仅复制选区到新图层（Ctrl+J）','duplicateCurrentLayer');
    add('合并图层','把当前图层向下合并到下面那层（Ctrl+E，同 Photoshop）','mergeLayerDown');
  }
});
