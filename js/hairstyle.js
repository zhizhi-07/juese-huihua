/* Hand-authored native pixel masks, anchored to each original head cel. */
PE.addDoubleBuns = function(project,sheetIndex) {
  const sheet=project.spriteSheets[sheetIndex],layer=project.addLayer(sheet.name+' / 双丸子头');layer.sheetIndex=sheetIndex;
  const colors={O:[104,98,85,255],S:[173,157,126,255],B:[222,211,180,255],H:[247,239,215,255]};
  const bun=['.OOO.','OHBBO','OHBSO','OBBBO','.OOO.'];
  const front=['..OOOOOOOOO..','.OBHHHHHHHBO.','OBHHHHHHBBBO','OBHHHHBBBBBBO','OBHHBBBSSSSBO','OBHBBS.....SO','OBBS........O','OBS..........'];
  const back=['..OOOOOOOOO..','.OBHHHHHHHBO.','OBHHHHHHHBBBO','OBHHHHHHBBBBO','OBHHHHHBBBBBO','OBHHHHBBBBBBO','OBHHHBBBBBSBO','OBHHBBBBBSSBO','.OBBBBSSSSBO.','..OBSSSSSBO..','...OOOOOOO...'];
  const side=['..OOOOOOO..','.OBHHHHHBO.','OBHHHHBBBBO','OBHHHBBBBBO','OBHHBBSSSBO','OBHBS....SO','OBBS......O','OBS........','OS.........'];
  sheet.actions.forEach((action,ai)=>action.frames.forEach((frame,fi)=>{
    const key=`${sheetIndex}_${ai}_${fi}`;
    const head=project.layers.find(l=>l.sheetIndex===sheetIndex&&l.name==='head'&&l.frameData.has(key))?.frameData.get(key);
    if(!head)throw new Error('发型缺少对应头部帧');
    let x0=frame.width,y0=frame.height;
    for(let y=0;y<head.height;y++)for(let x=0;x<head.width;x++)if(head.data[(y*head.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);}
    const data=new ImageData(frame.width,frame.height);
    function stamp(mask,dx,dy){mask.forEach((row,y)=>[...row].forEach((c,x)=>{if(!colors[c])return;const px=x0+dx+x,py=y0+dy+y;if(px<0||py<0||px>=frame.width||py>=frame.height)throw new Error('发型超出画布');data.data.set(colors[c],(py*frame.width+px)*4);}));}
    if(action.direction==='side'){
      stamp(side,0,-1);stamp(bun,-3,4);
    }else{
      stamp(action.direction==='up'?back:front,0,-1);stamp(bun,-4,4);stamp(bun,12,4);
    }
    layer.frameData.set(key,data);
  }));
  return layer;
};
