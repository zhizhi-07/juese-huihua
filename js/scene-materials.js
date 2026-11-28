window.PE=window.PE||{};
PE.isSceneProject=(p,id=p===PE.app?.project?PE.app?.persistence?.projectId:'')=>
  !p.spriteSheets.some(PE.isCharacterSheet)&&(!!id?.startsWith('scene-')||!!p.sceneAssembly||p.spriteSheets.some(s=>s.name==='场景画布'));
function sceneMaterialName(p,name,index=-1){
  if(typeof name!=='string'||!name.trim()||name.trim().length>40)throw new Error('素材名称需要1到40个字');
  name=name.trim();
  if(p.spriteSheets.some((s,i)=>i!==index&&s.name===name))throw new Error('已有同名素材，请换一个名称');
  if(name==='场景画布'||PE.isCharacterSheet({name})||!PE.isEditorSheet({name}))throw new Error('这是工程保留名称，请换一个名称');
  return name;
}
PE.renameSceneMaterial=function(p,index,name){
  const sheet=p.spriteSheets[index];
  if(!PE.isSceneProject(p)||!sheet||sheet.name==='场景画布')throw new Error('请选择要重命名的场景素材');
  const oldName=sheet.name;
  name=sceneMaterialName(p,name,index);
  if(oldName===name)return false;
  sheet.name=name;
  if(p===PE.app?.project&&PE.app?.persistence?.ready){
    const prefix='scene-png:'+PE.app.persistence.localKey+':';
    scenePngHandle(PE.app,prefix+oldName).then(h=>h&&scenePngHandle(PE.app,prefix+name,h).then(()=>scenePngHandle(PE.app,prefix+oldName,null))).catch(()=>{});
  }
  return true;
};
PE.deleteSceneMaterial=function(p,index){
  const sheet=p.spriteSheets[index];
  if(!PE.isSceneProject(p)||!sheet||sheet.name==='场景画布')throw new Error('请选择要删除的场景素材');
  if(p.spriteSheets.filter(PE.isEditorSheet).length<=1)throw new Error('至少需要保留一个场景素材');
  p.spriteSheets.splice(index,1);
  p.spriteSheets.forEach((s,si)=>s.actions.forEach(a=>a.frames.forEach(f=>{f.sheetIndex=si;})));
  p.layers=p.layers.filter(l=>l.sheetIndex!==index).map(l=>{
    if(l.sheetIndex>index)l.sheetIndex-=1;
    const next=new Map();
    for(const [key,data] of l.frameData.entries()){
      const sep=key.indexOf('_'),si=Number(key.slice(0,sep));
      if(si===index)continue;
      next.set(si>index?(si-1)+key.slice(sep):key,data);
    }
    l.frameData=next;
    return l;
  });
  if(!p.layers.length)p.addLayer('图层 1');
  const next=Math.min(index,p.spriteSheets.length-1);
  p.currentSheetIndex=next;p.currentActionIndex=0;p.currentFrameIndex=0;
  p.currentLayerIndex=Math.max(0,p.layers.findIndex(l=>!l.isGroup&&(l.sheetIndex===undefined||l.sheetIndex===next)));
  return next;
};
PE.addSceneMaterial=function(p,name,width,height){
  if(!PE.isSceneProject(p))throw new Error('请在场景工程中新建素材');
  name=sceneMaterialName(p,name);
  if(![width,height].every(n=>Number.isSafeInteger(n)&&n>=1&&n<=1024))throw new Error('宽高需要是1到1024的整数');
  const si=p.spriteSheets.length,sheet=new PE.SpriteSheet(name),action=new PE.Action('画面','none');
  sheet.frameWidth=width;sheet.frameHeight=height;
  action.frames.push(new PE.Frame(si,0,0,width,height));sheet.actions.push(action);
  const pixels=PE.utils.createTransparentImageData(width,height);
  p.spriteSheets.push(sheet);
  const layer=p.addLayer(name);layer.sheetIndex=si;layer.frameData.set(p.getFrameKey(si,0,0),pixels);
  p.currentSheetIndex=si;p.currentActionIndex=0;p.currentFrameIndex=0;
  return si;
};

PE.scenePngKey=function(app){
  const name=app.project.getCurrentSheet()?.name;
  if(app.persistence?.ready&&name&&name!=='场景画布'&&PE.isSceneProject(app.project,app.persistence.projectId)){
    return 'scene-png:'+app.persistence.localKey+':'+name;
  }
};
async function scenePngHandle(app,key,handle){
  const db=await app.persistence.db();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('projects',handle===undefined?'readonly':'readwrite');
    const store=tx.objectStore('projects');
    const request=handle===undefined?store.get(key):handle===null?store.delete(key):store.put(handle,key);
    tx.oncomplete=()=>resolve(request.result);
    tx.onabort=()=>reject(tx.error||new Error('无法读取或保存固定位置'));
  });
}
PE.markSceneSheetDirty=function(app){
  const p=app?.project,sheet=p?.getCurrentSheet?.();
  if(!sheet||!PE.isSceneProject(p,app.persistence?.projectId))return;
  (app._dirtySceneSheets??=new Map()).set(sheet,[p.currentActionIndex||0,p.currentFrameIndex||0]);
};
function isAtlasSheet(sheet){
  const sw=sheet?.imageData?.width||sheet?.image?.naturalWidth||sheet?.image?.width||0;
  const sh=sheet?.imageData?.height||sheet?.image?.naturalHeight||sheet?.image?.height||0;
  if(sw<=0||sh<=0||!Array.isArray(sheet.actions))return false;
  const frames=sheet.actions.flatMap(a=>a.frames||[]);
  return frames.length>1&&frames.some(f=>(f.sourceX||0)!==0||(f.sourceY||0)!==0);
}
function renderSceneMaterialBlob(app,frame,sheetMode=false){
  const sheet=app.project.spriteSheets[frame[0]];
  const useSheet=sheetMode===true||(sheetMode==='auto'&&isAtlasSheet(sheet));
  return useSheet?app.exportManager._renderSpriteSheetBlob(frame[0]):app.exportManager.exportFrameAsBlob(...frame);
}
function checkFolderBasename(app,project,sheet,onlyCanvas=false){
  const sanitize=name=>app.exportManager._sanitizeFilename(name);
  const basename=sanitize(onlyCanvas?(project.name||sheet.name):sheet.name);
  if(!basename)throw new Error('素材导出名称无效');
  if(!onlyCanvas&&project.spriteSheets.some(s=>s!==sheet&&s.name!=='场景画布'&&PE.isEditorSheet(s)&&!PE.isCharacterSheet(s)&&sanitize(s.name).toLowerCase()===basename.toLowerCase())){
    throw new Error('存在导出文件名相同的素材，请分别设置固定 PNG 位置');
  }
  return basename;
}
async function writeScenePngBlob(blob,handle,folder,basename){
  if(!blob?.size)throw new Error('生成的 PNG 为空，未写入文件');
  const target=folder?await folder.getFileHandle(basename+'.png',{create:true}):handle;
  const writer=await target.createWritable();
  try{await writer.write(blob);await writer.close();}
  catch(error){await writer.abort().catch(()=>{});throw error;}
  const bytes=new Uint8Array(await blob.arrayBuffer()),actual=new Uint8Array(await (await target.getFile()).arrayBuffer());
  if(actual.length!==bytes.length||!actual.every((byte,i)=>byte===bytes[i]))throw new Error('PNG 写入后校验失败：'+target.name);
  return (folder?folder.name+'/':'')+target.name;
}
const scenePngFolderKey=app=>'scene-png-folder:'+app.persistence.localKey;
PE.configureScenePngFolder=async function(app,clear){
  if(!app.persistence?.ready||!PE.isSceneProject(app.project,app.persistence.projectId))return;
  const key=scenePngFolderKey(app);
  if(clear){
    if(confirm('取消本工程的默认 PNG 导出文件夹？不会删除图片或取消单件绑定。'))await scenePngHandle(app,key,null);
    return;
  }
  if(!window.showDirectoryPicker)throw new Error('请使用 Edge 或 Chrome 打开本地编辑器');
  const folder=await window.showDirectoryPicker({mode:'readwrite',id:'scene-png-folder'});
  await ensureScenePngWrite(folder);
  await scenePngHandle(app,key,folder);
  let exported='';
  const p=app.project,cur=p.getCurrentSheet();
  const onlyCanvas=p.spriteSheets.every(s=>s.name==='场景画布'||!PE.isEditorSheet(s)||PE.isCharacterSheet(s));
  if(cur&&PE.isEditorSheet(cur)&&!PE.isCharacterSheet(cur)&&(cur.name!=='场景画布'||onlyCanvas)){
    const saved=cur.name==='场景画布'?null:await scenePngHandle(app,'scene-png:'+app.persistence.localKey+':'+cur.name);
    if(!saved){
      const basename=checkFolderBasename(app,p,cur,cur.name==='场景画布'&&onlyCanvas);
      const blob=await renderSceneMaterialBlob(app,[p.currentSheetIndex,p.currentActionIndex,p.currentFrameIndex],'auto');
      const written=await writeScenePngBlob(blob,null,folder,basename);
      app._dirtySceneSheets?.delete(cur);
      app.exportManager.notifyExport('已写入 PNG：'+written);
      app.persistence.show('已写入 PNG：'+written+(app.persistence.dirty?' · 工程未保存':''));
      exported='，并已导出「'+basename+'.png」';
    }
  }
  alert('已记住文件夹「'+folder.name+'」'+exported+'。未单独绑定的素材在点击“保存工程 (Ctrl+S)”或导出时会自动写入并替换同名 PNG。');
};
PE.configureScenePng=async function(app,clear){
  const key=PE.scenePngKey(app);
  if(!key)return;
  if(clear){
    const name=app.project.getCurrentSheet().name;
    if(!confirm('取消「'+name+'」的固定导出位置？不会删除 PNG。'))return;
    await scenePngHandle(app,key,null);
    return;
  }
  const p=app.project;
  await PE.exportScenePng(app,[p.currentSheetIndex,p.currentActionIndex,p.currentFrameIndex],true,'auto');
};
const pngPickerOptions={
  excludeAcceptAllOption:true,
  types:[{description:'PNG 图片',accept:{'image/png':['.png']}}]
};
async function pickScenePng(app,name){
  if(!window.showSaveFilePicker)throw new Error('此浏览器不支持固定位置，请用 Edge 或 Chrome 打开本地编辑器');
  const handle=await window.showSaveFilePicker({
    ...pngPickerOptions,suggestedName:app.exportManager._sanitizeFilename(name)+'.png'
  }).catch(error=>{if(error.name!=='AbortError')throw error;});
  if(!handle)return;
  if(!/\.png$/i.test(handle.name))throw new Error('请选择 .png 文件');
  return handle;
}
async function ensureScenePngWrite(handle){
  const options={mode:'readwrite'};
  if(await handle.queryPermission(options)!=='granted'&&await handle.requestPermission(options)!=='granted'){
    throw new Error('没有「'+handle.name+'」的写入权限；请允许 Chrome 写入已选位置');
  }
}
PE.exportScenePng=async function(app,frame,chooseNew=false,sheetMode=false){
  const project=app.project,sheet=project?.spriteSheets?.[frame[0]];
  if(!app.persistence?.ready||!sheet||!PE.isSceneProject(project,app.persistence.projectId))return false;
  const onlyCanvas=!chooseNew&&sheet.name==='场景画布'&&project.spriteSheets.every(s=>s.name==='场景画布'||!PE.isEditorSheet(s)||PE.isCharacterSheet(s));
  const key=PE.scenePngKey(app);
  if(!key&&!onlyCanvas)return false;
  const saved=chooseNew||!key?null:await scenePngHandle(app,key);
  const folder=saved||chooseNew?null:await scenePngHandle(app,scenePngFolderKey(app));
  if(!chooseNew&&!saved&&!folder)return false;
  // Ask before rendering so Chrome can use the export click to renew write permission.
  if(saved||folder)await ensureScenePngWrite(saved||folder);
  if(app.project!==project||project.spriteSheets[frame[0]]!==sheet)throw new Error('素材已变化，请重新导出');
  const basename=folder?checkFolderBasename(app,project,sheet,onlyCanvas):app.exportManager._sanitizeFilename(sheet.name);
  const blob=await renderSceneMaterialBlob(app,frame,sheetMode);
  if(!blob.size)throw new Error('生成的 PNG 为空，未写入文件');
  const handle=chooseNew?await pickScenePng(app,sheet.name):saved;
  if(!handle&&!folder){
    app.exportManager.notifyExport('已取消，未导出 PNG');
    return true;
  }
  if(chooseNew)await ensureScenePngWrite(handle);
  const written=await writeScenePngBlob(blob,handle,folder,basename);
  app._dirtySceneSheets?.delete(sheet);
  if(!saved&&!folder){
    try{await scenePngHandle(app,key,handle);}
    catch(error){throw new Error('PNG 已写入，但固定位置未能保存：'+error.message);}
  }
  const message='已写入 PNG：'+written;
  app.exportManager.notifyExport(message);
  app.persistence.show(message+(app.persistence.dirty?' · 工程未保存':''));
  return true;
};
PE.prepareScenePngSave=async function(app){
  const p=app?.project;
  if(!app?.persistence?.ready||!p||!PE.isSceneProject(p,app.persistence.projectId))return null;
  const onlyCanvas=p.spriteSheets.every(s=>s.name==='场景画布'||!PE.isEditorSheet(s)||PE.isCharacterSheet(s));
  const candidates=new Map();
  if(app._dirtySceneSheets instanceof Map){
    for(const [sheet,pos] of app._dirtySceneSheets.entries()){
      const si=p.spriteSheets.indexOf(sheet);
      if(si>=0)candidates.set(si,pos);
    }
  }
  const cur=p.currentSheetIndex;
  if(p.spriteSheets[cur])candidates.set(cur,[p.currentActionIndex||0,p.currentFrameIndex||0]);
  if(!candidates.size)return null;
  const folder=await scenePngHandle(app,scenePngFolderKey(app));
  const targets=[],checked=new Set();
  for(const [si,[ai,fi]] of candidates.entries()){
    const sheet=p.spriteSheets[si];
    if(!sheet||!PE.isEditorSheet(sheet)||PE.isCharacterSheet(sheet))continue;
    const isCanvas=sheet.name==='场景画布';
    if(isCanvas&&!onlyCanvas)continue;
    const saved=isCanvas?null:await scenePngHandle(app,'scene-png:'+app.persistence.localKey+':'+sheet.name);
    const handle=saved||folder;
    if(!handle)continue;
    const safeAi=Math.min(Math.max(0,ai),Math.max(0,(sheet.actions?.length||1)-1));
    const safeFi=Math.min(Math.max(0,fi),Math.max(0,(sheet.actions?.[safeAi]?.frames?.length||1)-1));
    targets.push({sheet,ai:safeAi,fi:safeFi,saved,folder:saved?null:folder,onlyCanvas:isCanvas&&onlyCanvas});
  }
  if(!targets.length)return null;
  // Request write permission while user click / Ctrl+S activation is still active.
  for(const t of targets){
    const h=t.saved||t.folder;
    if(checked.has(h))continue;
    checked.add(h);
    await ensureScenePngWrite(h);
  }
  return {project:p,targets};
};
PE.commitScenePngSave=async function(app,plan){
  if(!plan?.targets?.length||app.project!==plan.project)return [];
  const written=[];
  for(const t of plan.targets){
    const si=plan.project.spriteSheets.indexOf(t.sheet);
    if(si<0)continue;
    const basename=t.folder?checkFolderBasename(app,plan.project,t.sheet,t.onlyCanvas):app.exportManager._sanitizeFilename(t.sheet.name);
    const blob=await renderSceneMaterialBlob(app,[si,t.ai,t.fi],'auto');
    written.push(await writeScenePngBlob(blob,t.saved,t.folder,basename));
    app._dirtySceneSheets?.delete(t.sheet);
  }
  if(written.length){
    const label=written.length===1?written[0]:`${written[0]} 等 ${written.length} 个 PNG`;
    app.exportManager.notifyExport('已写入 PNG：'+label);
  }
  return written;
};
