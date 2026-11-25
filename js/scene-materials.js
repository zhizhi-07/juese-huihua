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
  name=sceneMaterialName(p,name,index);
  if(sheet.name===name)return false;
  sheet.name=name;
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
  await scenePngHandle(app,key,folder);
  alert('已记住文件夹「'+folder.name+'」。未单独绑定的素材按素材名导出并替换同名 PNG。');
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
  await PE.exportScenePng(app,[p.currentSheetIndex,p.currentActionIndex,p.currentFrameIndex],true);
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
PE.exportScenePng=async function(app,frame,chooseNew=false){
  const key=PE.scenePngKey(app);
  if(!key)return false;
  const project=app.project, sheet=project.spriteSheets[frame[0]];
  const saved=chooseNew?null:await scenePngHandle(app,key);
  const folder=saved||chooseNew?null:await scenePngHandle(app,scenePngFolderKey(app));
  if(!chooseNew&&!saved&&!folder)return false;
  // Ask before rendering so Chrome can use the export click to renew write permission.
  if(saved||folder)await ensureScenePngWrite(saved||folder);
  if(app.project!==project||project.spriteSheets[frame[0]]!==sheet)throw new Error('素材已变化，请重新导出');
  const sanitize=name=>app.exportManager._sanitizeFilename(name);
  const basename=sanitize(sheet.name);
  if(folder&&project.spriteSheets.some(s=>s!==sheet&&sanitize(s.name).toLowerCase()===basename.toLowerCase())){
    throw new Error('存在导出文件名相同的素材，请分别设置固定 PNG 位置');
  }
  const blob=await app.exportManager.exportFrameAsBlob(...frame);
  if(!blob.size)throw new Error('生成的 PNG 为空，未写入文件');
  const handle=chooseNew?await pickScenePng(app,sheet.name):saved;
  if(!handle&&!folder){
    app.exportManager.notifyExport('已取消，未导出 PNG');
    return true;
  }
  if(chooseNew)await ensureScenePngWrite(handle);
  const target=folder?await folder.getFileHandle(basename+'.png',{create:true}):handle;
  const writer=await target.createWritable();
  try{await writer.write(blob);await writer.close();}
  catch(error){await writer.abort().catch(()=>{});throw error;}
  const bytes=new Uint8Array(await blob.arrayBuffer()), actual=new Uint8Array(await (await target.getFile()).arrayBuffer());
  if(actual.length!==bytes.length||!actual.every((byte,i)=>byte===bytes[i]))throw new Error('PNG 写入后校验失败：'+target.name);
  if(!saved&&!folder){
    try{await scenePngHandle(app,key,handle);}
    catch(error){throw new Error('PNG 已写入，但固定位置未能保存：'+error.message);}
  }
  const message='已写入 PNG：'+(folder?folder.name+'/':'')+target.name;
  app.exportManager.notifyExport(message);
  app.persistence.show(message+(app.persistence.dirty?' · 工程未保存':''));
  return true;
};
