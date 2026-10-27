/* Match idle breathing: fixed base, compressed torso, head lowered one pixel. */
PE.makeBreathingPose = function(project, sheetIndex, name, direction) {
  const sheet=project.spriteSheets[sheetIndex];
  const selected=sheet.actions.map((action,index)=>({action,index})).filter(({action})=>!direction||action.direction===direction);
  if(!selected.length)throw new Error('找不到姿势朝向：'+direction);
  const phases=[0,0,1,1],width=sheet.frameWidth,height=sheet.frameHeight;
  function openEyes(source,action){
    const idleIndex=project.spriteSheets.findIndex(s=>s.name==='idle');
    const ai=project.spriteSheets[idleIndex]?.actions.findIndex(a=>a.direction===action.direction);
    const idle=project.layers.find(l=>l.sheetIndex===idleIndex&&l.name==='head'&&l.frameData.has(`${idleIndex}_${ai}_0`))?.frameData.get(`${idleIndex}_${ai}_0`);
    if(!idle)throw new Error('找不到待机睁眼图层');
    function origin(image){let x0=width,y0=height;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(image.data[(y*width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);}return [x0,y0];}
    const [sx,sy]=origin(source),[ix,iy]=origin(idle),out=PE.utils.cloneImageData(source);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const tx=x+sx-ix,ty=y+sy-iy;if(tx<0||ty<0||tx>=width||ty>=height)continue;
      const from=(y*width+x)*4,to=(ty*width+tx)*4;
      if(idle.data[from+3]&&source.data[to+3])out.data.set(idle.data.subarray(from,from+4),to);
    }
    return out;
  }
  function breathe(image,layer,phase){
    if(!phase||PE.isHandLayer(layer)||!['head','body'].includes(layer.name))return PE.utils.cloneImageData(image);
    const out=new ImageData(width,height);let top=height,bottom=-1;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(image.data[(y*width+x)*4+3]){top=Math.min(top,y);bottom=Math.max(bottom,y);}
    const cut=Math.floor((top+bottom)/2);
    for(let y=0;y<height;y++){
      if(layer.name==='body'&&y===cut)continue;
      const dy=layer.name==='head'||y<cut?1:0;
      if(y+dy>=height){if(image.data.subarray(y*width*4,(y+1)*width*4).some(v=>v))throw new Error('呼吸动作超出画布');continue;}
      out.data.set(image.data.subarray(y*width*4,(y+1)*width*4),(y+dy)*width*4);
    }
    return out;
  }
  const replacements=project.layers.filter(l=>l.sheetIndex===sheetIndex).map(layer=>{
    const data=new Map();
    selected.forEach(({index,action},ai)=>{let source=layer.frameData.get(`${sheetIndex}_${index}_0`);if(source){if(name==='sit'&&layer.name==='head')source=openEyes(source,action);phases.forEach((phase,fi)=>data.set(`${sheetIndex}_${ai}_${fi}`,breathe(source,layer,phase)));}});
    return {layer,data};
  });
  sheet.actions=selected.map(({action},ai)=>{
    const result=new PE.Action(action.name,action.direction);
    result.frames=phases.map((_,fi)=>{const frame=new PE.Frame(sheetIndex,fi*width,ai*height,width,height);frame.duration=450;return frame;});return result;
  });
  replacements.forEach(({layer,data})=>{layer.frameData=data;if(layer.name.includes('衣服与发型'))layer.name=name+' / 衣服与发型';});
  sheet.name=name;sheet.columns=phases.length;sheet.rows=selected.length;sheet.fps=1000/450;
  const canvas=document.createElement('canvas');canvas.width=width*sheet.columns;canvas.height=height*sheet.rows;
  const ctx=canvas.getContext('2d'),cm=new PE.CanvasManager(document.createElement('canvas'),project);
  sheet.actions.forEach((a,ai)=>a.frames.forEach((frame,fi)=>{frame.originalPixels=cm.getCompositeImageData(sheetIndex,ai,fi);ctx.putImageData(frame.originalPixels,frame.sourceX,frame.sourceY);}));
  sheet.imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
};
