window.PE=window.PE||{};
PE.isSceneProject=p=>p.spriteSheets.some(s=>s.name==='场景画布')&&!p.spriteSheets.some(PE.isCharacterSheet);
PE.addSceneMaterial=function(p,name,width,height){
  if(!PE.isSceneProject(p))throw new Error('请在场景工程中新建素材');
  if(typeof name!=='string'||!name.trim()||name.trim().length>40)throw new Error('素材名称需要1到40个字');
  if(![width,height].every(n=>Number.isSafeInteger(n)&&n>=1&&n<=1024))throw new Error('宽高需要是1到1024的整数');
  name=name.trim();
  if(p.spriteSheets.some(s=>s.name===name))throw new Error('已有同名素材，请换一个名称');
  const si=p.spriteSheets.length,sheet=new PE.SpriteSheet(name),action=new PE.Action('画面','none');
  sheet.frameWidth=width;sheet.frameHeight=height;
  action.frames.push(new PE.Frame(si,0,0,width,height));sheet.actions.push(action);
  const pixels=PE.utils.createTransparentImageData(width,height);
  p.spriteSheets.push(sheet);
  const layer=p.addLayer(name);layer.sheetIndex=si;layer.frameData.set(p.getFrameKey(si,0,0),pixels);
  p.currentSheetIndex=si;p.currentActionIndex=0;p.currentFrameIndex=0;
  return si;
};
