/* Reference-based layered idle; all masks use a consistent native 2×2 pixel grid. */
PE.addBase32Idle = function(project) {
  const si=project.spriteSheets.length,sheet=new PE.SpriteSheet('base32_idle');
  sheet.frameWidth=32;sheet.frameHeight=64;sheet.columns=4;sheet.rows=4;sheet.fps=1000/350;
  project.spriteSheets.push(sheet);
  const layers={};
  for(const [key,name] of [['far','hand 后手'],['body','body'],['clothes','32×64 / 衣服'],['head','head'],['near','hand 前手'],['hair','32×64 / 发型']]){
    const layer=project.addLayer(name);layer.sheetIndex=si;
    if(key==='near'||key==='far'){layer.referenceOnly=true;layer.locked=true;}
    layers[key]=layer;
  }
  const palette=window.PE_BASE32_DATA.palette;
  const blank=()=>Array.from({length:32},()=>Array(16).fill('.'));
  ['down','right','up','left'].forEach((direction,ai)=>{
    const source=window.PE_BASE32_DATA.poses[direction],parts={head:blank(),body:blank(),near:blank(),far:blank()};
    source.forEach((row,y)=>[...row].forEach((c,x)=>{
      if(y<23){parts.head[y][x]=c;return;}
      let part='body';
      if(direction==='down'||direction==='up'){
        if(y<=27&&x<=3)part='far';else if(y<=27&&x>=12)part='near';
      }else if(y>=24&&y<=28){
        if(x>=6&&x<=9)part='near';
        else if(direction==='right'&&x>=10)part='far';
        else if(direction==='left'&&x<=5)part='far';
      }
      parts[part][y][x]=c;
    }));
    // Fill the torso beneath the separated arms so clothing never needs hand pixels.
    const side=direction==='left'||direction==='right',left=side?5:3,right=side?10:12;
    for(let y=24;y<=27;y++)for(let x=left;x<=right;x++)parts.body[y][x]=(x===left||x===right)?'B':(y===24?'C':'A');
    if(side)for(let x=left;x<=right;x++)parts.body[28][x]=(x===left||x===right)?'B':'A';
    const handPositions=side?(direction==='right'?[[10,24],[6,25]]:[[2,24],[6,25]]):[[0,24],[12,24]];
    for(const [i,part] of ['far','near'].entries()){
      parts[part]=blank();const [hx,hy]=handPositions[i];
      ['.BB.','BEAB','BACC','.DD.'].forEach((row,y)=>[...row].forEach((c,x)=>{parts[part][hy+y][hx+x]=c;}));
    }
    const action=new PE.Action('待机 / '+direction,direction);sheet.actions.push(action);
    [0,0,1,1].forEach((phase,fi)=>{
      const frame=new PE.Frame(si,fi*32,ai*64,32,64);frame.duration=350;action.frames.push(frame);
      for(const [part,mask] of Object.entries(parts)){
        const data=new ImageData(32,64);
        mask.forEach((row,y)=>row.forEach((c,x)=>{
          if(!palette[c])return;
          if(part==='body'&&phase&&y===25)return;
          const dy=phase&&(part==='head'||part==='body'&&y<25)?1:0;
          for(let sy=0;sy<2;sy++)for(let sx=0;sx<2;sx++)data.data.set(palette[c],(((y+dy)*2+sy)*32+x*2+sx)*4);
        }));
        layers[part].frameData.set(`${si}_${ai}_${fi}`,data);
      }
    });
  });
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;
  const ctx=canvas.getContext('2d'),cm=new PE.CanvasManager(document.createElement('canvas'),project);
  sheet.actions.forEach((action,ai)=>action.frames.forEach((frame,fi)=>{
    frame.originalPixels=cm.getCompositeImageData(si,ai,fi);ctx.putImageData(frame.originalPixels,frame.sourceX,frame.sourceY);
  }));
  sheet.imageData=ctx.getImageData(0,0,128,256);
  return si;
};
