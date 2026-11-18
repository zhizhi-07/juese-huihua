/* 换装试验场里的房间与家具全部来自已保存的场景绘制工程；这里不内置任何假家具。 */
window.PE=window.PE||{};
PE.WardrobeFurniture={
  layout:[],
  room:null,
  source:null,
  hint:'',
  clear(){this.layout=[];this.room=null;this.source=null;this.hint='';return this;},
  isScene(raw){return !!raw&&Array.isArray(raw.spriteSheets)&&raw.spriteSheets.some(s=>s&&s.name==='场景画布')&&!raw.spriteSheets.some(s=>PE.isCharacterSheet&&PE.isCharacterSheet(s));},
  isFurnitureLayer(layer){return /家具|设施|物件|furniture/i.test(String(layer?.name||''));},
  make(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w||1));c.height=Math.max(1,Math.round(h||1));return c;},
  decode(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('场景图层像素读取失败'));image.src=url;});},
  frameOf(sheet){const frames=(sheet?.actions||[]).flatMap(a=>a.frames||[]);return frames.length?{width:Math.max(...frames.map(f=>f.width)),height:Math.max(...frames.map(f=>f.height))}:null;},
  // 把一张场景画布（或一件素材）里的指定图层按原像素合成到原生尺寸画布上。
  async composite(raw,index,{furniture}={}){
    const sheet=raw.spriteSheets[index],frame=this.frameOf(sheet);
    if(!frame)return null;
    const canvas=this.make(frame.width,frame.height),ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    for(const layer of raw.layers||[]){
      if(!layer||layer.isGroup||layer.visible===false)continue;
      if(layer.sheetIndex!==undefined&&layer.sheetIndex!==index)continue;
      if(furniture!==undefined&&this.isFurnitureLayer(layer)!==furniture)continue;
      const data=layer.frameData?.[`${index}_0_0`];
      if(!data||!data.dataURL)continue;
      const image=await this.decode(data.dataURL),rect=data.placement||{x:0,y:0,w:frame.width,h:frame.height};
      ctx.globalAlpha=Math.max(0,Math.min(1,layer.opacity??1));
      ctx.drawImage(image,0,0,image.naturalWidth||image.width,image.naturalHeight||image.height,rect.x,rect.y,rect.w,rect.h);
    }
    ctx.globalAlpha=1;
    return canvas;
  },
  hasPixels(canvas){if(!canvas)return false;const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;for(let i=3;i<data.length;i+=4)if(data[i])return true;return false;},
  trim(canvas){
    if(!canvas)return null;
    const {width,height}=canvas,data=canvas.getContext('2d').getImageData(0,0,width,height).data;
    let x0=width,y0=height,x1=-1,y1=-1;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
    if(x1<0)return null;
    const art=this.make(x1-x0+1,y1-y0+1);
    art.getContext('2d').drawImage(canvas,x0,y0,art.width,art.height,0,0,art.width,art.height);
    return art;
  },
  // 家具层里不相连的每一块像素就是一件家具，位置就是你画的位置。
  split(canvas){
    if(!canvas)return [];
    const width=canvas.width,height=canvas.height,data=canvas.getContext('2d').getImageData(0,0,width,height).data;
    const seen=new Uint8Array(width*height),boxes=[];
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const start=y*width+x;
      if(seen[start]||!data[start*4+3])continue;
      const stack=[start];seen[start]=1;
      let left=x,right=x,top=y,bottom=y,count=0;
      while(stack.length){
        const point=stack.pop(),px=point%width,py=(point-px)/width;count++;
        if(px<left)left=px;if(px>right)right=px;if(py<top)top=py;if(py>bottom)bottom=py;
        for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
          if(!ox&&!oy)continue;
          const nx=px+ox,ny=py+oy;
          if(nx<0||ny<0||nx>=width||ny>=height)continue;
          const next=ny*width+nx;
          if(seen[next]||!data[next*4+3])continue;
          seen[next]=1;stack.push(next);
        }
      }
      if(count<3)continue;
      boxes.push({x:left,y:top,w:right-left+1,h:bottom-top+1});
    }
    boxes.sort((a,b)=>a.y-b.y||a.x-b.x);
    return boxes.map((box,index)=>{
      const art=this.make(box.w,box.h);
      art.getContext('2d').drawImage(canvas,box.x,box.y,box.w,box.h,0,0,box.w,box.h);
      return {id:'furniture-'+(index+1),name:'家具 '+(index+1),x:box.x+Math.floor(box.w/2),y:box.y+box.h,art};
    });
  },
  // 没有在场景画布里摆放时，把独立家具素材按原生像素自动排到地面，衣柜因此可以自己放家具。
  autoPlace(items){
    const room=this.room,left=room?3:20,right=room?room.width-4:300,bottom=room?room.height-2:208,gap=4,placed=[];
    let x=left,rowBottom=bottom,rowHeight=0;
    for(const item of items){
      const w=item.art.width,h=item.art.height;
      if(x+w>right&&x>left){rowBottom-=rowHeight+gap;rowHeight=0;x=left;}
      placed.push({id:'furniture-'+(placed.length+1),name:item.name||('家具 '+(placed.length+1)),x:x+Math.floor(w/2),y:rowBottom,art:item.art});
      x+=w+gap;if(h>rowHeight)rowHeight=h;
    }
    return placed;
  },
  async fromScene(raw){
    this.clear();
    const canvasIndex=raw.spriteSheets.findIndex(s=>s&&s.name==='场景画布'),materials=[];
    raw.spriteSheets.forEach((sheet,index)=>{
      if(index===canvasIndex||PE.isCharacterSheet?.(sheet))return;
      if(!this.frameOf(sheet))return;
      materials.push({index,name:sheet.name});
    });
    if(canvasIndex>=0){
      const ground=await this.composite(raw,canvasIndex,{furniture:false});
      if(this.hasPixels(ground))this.room={canvas:ground,width:ground.width,height:ground.height};
      this.layout=this.split(await this.composite(raw,canvasIndex,{furniture:true}));
    }
    if(!this.layout.length){
      const pieces=[];
      for(const material of materials){
        const art=this.trim(await this.composite(raw,material.index));
        if(art)pieces.push({name:material.name,art});
      }
      this.layout=this.autoPlace(pieces);
    } else if(!this.room){
      const pieces=this.layout.map(item=>({name:item.name,art:item.art}));
      this.layout=this.autoPlace(pieces);
    }
    if(!this.layout.length)this.hint=this.room?'场景画布里的“家具与设施”层还是空的：把家具画在那里，衣柜就会按你画的位置摆好。':'场景工程里还没有画家具：画在“家具与设施”层或新建家具素材后点“刷新场景”。';
    return this;
  },
  async projects(api){
    const response=await fetch(api.base+'/api/projects',{headers:api.headers,cache:'no-store'});
    if(!response.ok)throw new Error('工程列表读取失败：'+response.status);
    return (await response.json()).filter(project=>/^scene-/.test(project.id));
  },
  async load(api,id){
    this.clear();
    if(!id)return this;
    const response=await fetch(api.base+'/api/project?id='+encodeURIComponent(id),{headers:api.headers,cache:'no-store'});
    if(!response.ok)throw new Error('场景工程读取失败：'+response.status);
    const raw=await response.json();
    if(!this.isScene(raw))throw new Error('所选的工程不是场景画布工程');
    await this.fromScene(raw);
    this.source={id,name:raw.name};
    return this;
  },
  sprite(f){return f.art;},
  bounds(f){const width=f.art.width,left=f.x-Math.floor(width/2);return {left,right:left+width,top:f.y-f.art.height,bottom:f.y};},
  blocked(x,y){return this.layout.some(f=>{const box=this.bounds(f);return x>box.left-2&&x<box.right+2&&y>box.top-2&&y<box.bottom+2;});},
  nearest(player){
    let best=null;
    for(const f of this.layout){
      const box=this.bounds(f),distance=Math.hypot(Math.max(box.left-player.x,0,player.x-box.right),Math.max(box.top-player.y,0,player.y-box.bottom));
      if(distance<=24&&(!best||distance<best.distance))best={f,distance};
    }
    return best?best.f:null;
  },
  draw(ctx,f){if(!f?.art)return;ctx.drawImage(f.art,Math.round(f.x-Math.floor(f.art.width/2)),Math.round(f.y-f.art.height));}
};
