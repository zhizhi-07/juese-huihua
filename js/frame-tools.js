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
document.addEventListener('DOMContentLoaded',()=>{
  const b=document.createElement('button');b.className='studio-button';b.textContent='＋ 复制为新帧';
  b.title='把当前帧的所有图层复制到末尾，然后逐像素修改动画';
  document.querySelector('#frame-strip-wrapper .strip-header')?.append(b);
  // Studio replaces the strip heading; fall back to its persistent wrapper.
  if(!b.isConnected)document.getElementById('frame-strip-wrapper').prepend(b);
  b.onclick=()=>{
    const app=PE.app;if(!app.persistence?.ready)return;
    try{
      app.animationPlayer.pause();
      const p=app.project,index=PE.duplicateAnimationFrame(p);
      app.updateAll();app.selectFrame(p.currentSheetIndex,p.currentActionIndex,index);
      app.persistence.markDirty();
    }catch(e){alert(e.message);}
  };
});
