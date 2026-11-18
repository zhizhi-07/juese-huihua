window.PE=window.PE||{};
PE.addCharacterAction=function(p,name){
  if(PE.isSceneProject(p))throw new Error('请在人物工程中新建动作');
  if(typeof name!=='string'||!name.trim()||name.trim().length>40)throw new Error('动作名称需要1到40个字');
  name=name.trim();
  const titles={original16_idle:'待机',original16_walk:'行走',original16_pickup:'拾取',original16_sit:'坐姿'};
  if(p.spriteSheets.some(s=>s.name===name||titles[s.name]===name))throw new Error('已有同名动作，请换一个名称');
  if(name==='场景画布'||PE.isCharacterSheet({name})||!PE.isEditorSheet({name}))throw new Error('这是工程保留名称，请换一个名称');
  const from=p.spriteSheets.findIndex(s=>s.name==='original16_idle'),source=p.spriteSheets[from];
  if(!source?.actions.length||source.actions.some(a=>!a.frames.length))throw new Error('当前工程没有完整的16×16待机动作，未新建动作');
  const si=p.spriteSheets.length,prefix=from+'_',keep=new Set();
  p.layers.forEach((l,i)=>{if(l.sheetIndex===from||[...l.frameData.keys()].some(k=>k.startsWith(prefix)))keep.add(i);});
  for(const i of keep){
    let parent=p.layers[i].parent;const seen=new Set([i]);
    while(parent!=null){
      if(seen.has(parent)||!p.layers[parent]?.isGroup)throw new Error('待机图层分组无效，未新建动作');
      seen.add(parent);keep.add(parent);parent=p.layers[parent].parent;
    }
  }
  if(![...keep].some(i=>!p.layers[i].isGroup&&PE.isHandLayer(p.layers[i])))throw new Error('待机缺少独立手部图层，未新建动作');
  const pixels=[...p.spriteSheets,source].reduce((n,s)=>n+s.actions.reduce((n,a)=>n+a.frames.reduce((n,f)=>n+f.width*f.height,0),0),0);
  if(si>=128||p.layers.length+keep.size>1024||pixels>16*1024*1024)throw new Error('工程已达到保存容量上限，未新建动作');
  const sheet=Object.assign(new PE.SpriteSheet(name),source,{
    name,copiedFromIdle:true,image:null,imageData:PE.utils.cloneImageData(source.imageData),
    canvasLayout:structuredClone(source.canvasLayout),
    actions:source.actions.map(a=>Object.assign(new PE.Action(a.name,a.direction),a,{
      frames:a.frames.map(f=>Object.assign(new PE.Frame(si,f.sourceX,f.sourceY,f.width,f.height),f,{
        sheetIndex:si,locked:false,lockedRegions:[],originalPixels:PE.utils.cloneImageData(f.originalPixels)
      }))
    }))
  });
  delete sheet.sourceBytes;delete sheet.sourceFormat;
  const indices=[...keep].sort((a,b)=>a-b),mapping=new Map(indices.map((old,i)=>[old,p.layers.length+i]));
  const layers=indices.map(i=>{
    const original=p.layers[i],layer=Object.assign(new PE.Layer(original.name),original,{
      sheetIndex:si,parent:original.parent==null?original.parent:mapping.get(original.parent),
      locked:false,inheritedBase:false,isOriginal:false,frameData:new Map()
    });
    if(PE.isHandLayer(original))layer.referenceOnly=false;
    // Independent drawing copy: do not duplicate masters or keep automatic-sync ownership.
    for(const key of ['hairAnimation','hairAnimationId','clothingSync','clothingSyncId'])delete layer[key];
    for(const [key,data]of original.frameData)if(key.startsWith(prefix))layer.frameData.set(si+'_'+key.slice(prefix.length),PE.utils.cloneImageData(data));
    return layer;
  });
  p.spriteSheets.push(sheet);p.layers.push(...layers);
  p.currentSheetIndex=si;p.currentActionIndex=p.currentFrameIndex=0;
  p.currentLayerIndex=p.layers.indexOf(layers.find(l=>!l.isGroup&&PE.isHandLayer(l)&&l.frameData.has(si+'_0_0'))||layers.find(l=>!l.isGroup));
  return si;
};
