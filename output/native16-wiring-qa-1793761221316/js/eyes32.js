/* Compact violet eyes: upper lashes, vertical irises and a clean lower edge. */
PE.addReferenceEyes32 = function(project,si) {
  const sheet=project.spriteSheets[si],layer=project.addLayer('32×32 / 眼型');layer.sheetIndex=si;
  const palette={K:[38,35,44,255],B:[0,0,0,255],G:[227,227,227,255],W:[255,255,255,255],V:[113,88,171,255],D:[83,65,124,255],M:[148,105,202,255],L:[201,151,232,255]};
  const leftEye=['.KKK','KGVD','BWML','.WLL'];
  const rightEye=['KKK.','DVGK','LMWB','LLW.'];
  sheet.actions.forEach((action,ai)=>action.frames.forEach((frame,fi)=>{
    if(action.direction==='up')return;
    const key=`${si}_${ai}_${fi}`,head=project.layers.find(l=>l.sheetIndex===si&&l.name==='head'&&l.frameData.has(key))?.frameData.get(key);
    if(!head)throw new Error('眼型缺少对应头部帧');
    const width=frame.width,height=frame.height,data=new ImageData(width,height);
    let x0=width,y0=height,x1=-1,y1=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(head.data[(y*width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    const sample=((y0+8)*width+Math.floor((x0+x1)/2))*4,skin=head.data.subarray(sample,sample+4);
    for(let y=y0+10;y<=Math.min(y0+17,y1-3);y++)for(let x=x0+3;x<=x1-3;x++){
      const at=(y*width+x)*4;if(head.data[at+3]&&head.data[at]<100&&head.data[at+1]<100)data.data.set(skin,at);
    }
    const sleeping=sheet.name==='original32_sleep',eyes=sleeping?[[['KKKK'],6],[['KKKK'],16]]:[[leftEye,6],[rightEye,16]];
    for(const [mask,dx] of eyes)mask.forEach((row,y)=>[...row].forEach((c,x)=>{
      const px=x0+dx+x,py=y0+(sleeping?14:12)+y;
      if(px<0||py<0||px>=width||py>=height)throw new Error('眼型超出动作画布');
      if(palette[c])data.data.set(palette[c],(py*width+px)*4);
    }));
    layer.frameData.set(key,data);
  }));
  return layer;
};

