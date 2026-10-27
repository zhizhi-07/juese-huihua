/* Keep the original cels and a fixed crop for every frame of an action. */
PE.addOriginal32Action = async function(project,packName,name,pose,direction) {
  const pack=window.PE_BUILTIN_PACKS.find(p=>p.name===packName);
  if(!pack)throw new Error('缺少动作素材：'+packName);
  const bytes=Uint8Array.from(atob(pack.base64),c=>c.charCodeAt(0));
  const result=await PE.importAseprite(new File([bytes],pack.name),project);
  const si=result.sheetIndex,sheet=project.spriteSheets[si];
  if(pose)PE.makeBreathingPose(project,si,pose,direction);
  const pickup=packName==='pick up.aseprite',size=pickup?40:32,cropX=pickup?29:31,cropY=pickup?23:24;
  function doubled(source){
    const target=new ImageData(size,size);
    for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
      const from=(y*source.width+x)*4;if(!source.data[from+3])continue;
      if(x<cropX||x>=cropX+size/2||y<cropY||y>=cropY+size/2)throw new Error(name+' 超出统一裁切区域');
      for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)target.data.set(source.data.subarray(from,from+4),(((y-cropY)*2+dy)*size+(x-cropX)*2+dx)*4);
    }
    return target;
  }
  for(const layer of project.layers.filter(l=>l.sheetIndex===si)){
    layer.frameData=new Map([...layer.frameData].map(([key,data])=>[key,doubled(data)]));
    if(layer.name.includes('衣服与发型'))layer.name=name+' / 衣服与发型';
  }
  sheet.name=name;sheet.frameWidth=size;sheet.frameHeight=size;
  sheet.actions.forEach((action,ai)=>action.frames.forEach((frame,fi)=>{
    frame.width=size;frame.height=size;frame.sourceX=fi*size;frame.sourceY=ai*size;frame.originalPixels=doubled(frame.originalPixels);
  }));
  const canvas=document.createElement('canvas');canvas.width=sheet.columns*size;canvas.height=sheet.rows*size;
  const ctx=canvas.getContext('2d');sheet.actions.forEach(a=>a.frames.forEach(f=>ctx.putImageData(f.originalPixels,f.sourceX,f.sourceY)));
  sheet.imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
  return si;
};
PE.addOriginal32Idle = project=>PE.addOriginal32Action(project,'idle.aseprite','original32_idle');
