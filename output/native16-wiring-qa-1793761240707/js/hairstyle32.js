/* Pale, low ear-side buns with an open forehead; native 32×32 pixel masks. */
PE.addDoubleBuns32 = function(project,si) {
  const sheet=project.spriteSheets[si],layer=project.addLayer('32×32 / 双丸子头');layer.sheetIndex=si;
  const palette={O:[151,145,132,255],D:[191,183,163,255],S:[216,207,186,255],B:[240,234,217,255],H:[255,251,237,255]};
  const bun=['..OOOO..','..OBBO..','OBHHHHBO','OHBSSBHO','OHSHHBBO','OHBHSBBO','.OBBBSO.','..OOOO..'];
  const farBun=['.OOOO.','OBHHBO','OHBSBO','OHSHBO','OBBSSO','.OOOO.'];
  sheet.actions.forEach((action,ai)=>action.frames.forEach((frame,fi)=>{
    const key=`${si}_${ai}_${fi}`,head=project.layers.find(l=>l.sheetIndex===si&&l.name==='head'&&l.frameData.has(key))?.frameData.get(key);
    if(!head)throw new Error('32×32 发型缺少头部帧');
    let x0=32,y0=32,x1=-1;for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(head.data[(y*32+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);}
    const width=x1-x0+1,data=new ImageData(32,32),mask=new Set(),side=action.direction==='side',back=action.direction==='up';
    function put(x,y,c){if(x<0||y<0||x>=32||y>=32)throw new Error('32×32 发型超出画布');data.data.set(palette[c],(y*32+x)*4);}
    function stamp(rows,x,y){rows.forEach((row,dy)=>[...row].forEach((c,dx)=>{if(palette[c])put(x+dx,y+dy,c);}));}
    if(side)stamp(farBun,26,y0+13);
    for(let v=-2;v<20;v++){
      let inset=v===-2?8:v===-1?5:v===0?3:v===1?2:v===2?1:0;
      if(back&&v>=17)inset=[1,3,5][v-17];
      for(let u=inset;u<width-inset;u++){
        if(!back&&v>3){
          const left=side?Math.max(1,Math.floor(8-(v-4)*.45)):Math.max(0,Math.floor(9-(v-4)*.75));
          const right=u>=width*.43&&v<=3+(u-width*.43)*.36;
          if(u>left&&!right&&!(u>=width-2&&v<=13))continue;
          if(v>16&&u<2)continue;
        }
        mask.add(u+','+v);
      }
    }
    for(const pixel of mask){const [u,v]=pixel.split(',').map(Number);
      const outer=!mask.has((u-1)+','+v)||!mask.has((u+1)+','+v)||!mask.has(u+','+(v-1));
      const bottom=!mask.has(u+','+(v+1));
      let c=outer?'O':bottom?'S':u>width-5||v>16?'S':'B';
      if(!outer&&!bottom&&u<width*.6&&v<8)c='H';
      if(back&&!outer&&v>17)c='D';
      put(x0+u,y0+v,c);
    }
    // Sparse connected locks follow the parting; keep the forehead and eyes open.
    const strands=back?[[[12,0],[11,5],[8,10],[3,15]],[[14,0],[15,5],[18,10],[23,15]]]:
      [[[10,0],[8,3],[5,7],[2,13]],[[12,0],[16,3],[21,5]]];
    for(const points of strands)for(let i=1;i<points.length;i++){
      const [ax,ay]=points[i-1],[bx,by]=points[i],steps=Math.max(Math.abs(bx-ax),Math.abs(by-ay));
      for(let t=0;t<=steps;t++){const u=Math.round(ax+(bx-ax)*t/steps),v=Math.round(ay+(by-ay)*t/steps);if(mask.has(u+','+v)&&u>0&&u<width-1)put(x0+u,y0+v,'S');}
    }
    if(side)stamp(bun,0,y0+14);
    else {stamp(bun,0,y0+14);stamp(bun,24,y0+14);}
    layer.frameData.set(key,data);
  }));
  return layer;
};
