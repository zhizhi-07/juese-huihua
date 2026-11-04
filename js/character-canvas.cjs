/* Canvas borders only: one translation for every frame/layer in an action. */
const png=require('../scripts/png.cjs');
const decode=url=>png.decode(Buffer.from(url.split(',')[1],'base64'));
const encode=im=>'data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64');
function move(cel,width,height,x,y,{preserveOffCanvas=false}={}){
  if(cel.placement)return {...cel,placement:{...cel.placement,x:cel.placement.x+x,y:cel.placement.y+y}};
  if(![width,height,x,y].every(Number.isSafeInteger)||width<1||height<1||width>512||height>512)throw Error('人物画布尺寸或边界无效');
  const src=decode(cel.dataURL),data=new Uint8Array(width*height*4);
  if(src.width!==cel.width||src.height!==cel.height)throw Error('人物图层PNG尺寸不一致');
  for(let sy=0;sy<src.height;sy++)for(let sx=0;sx<src.width;sx++){
    const i=(sy*src.width+sx)*4,tx=sx+x,ty=sy+y;
    if(tx<0||ty<0||tx>=width||ty>=height){if(src.data[i+3]){if(preserveOffCanvas)return {...cel,placement:{x,y,w:src.width,h:src.height}};throw Error('画布调整会裁掉人物像素，未保存');}continue;}
    data.set(src.data.subarray(i,i+4),(ty*width+tx)*4);
  }
  return {...cel,width,height,dataURL:encode({width,height,data})};
}
function visible(p,l,si,ai){
  if(l.isGroup||l.visible===false||(l.opacity??1)<=0||(l.sheetIndex!==undefined&&l.sheetIndex!==si))return false;
  const seen=new Set(),actions=p.spriteSheets[si].actions,action=actions[ai];let checkAction=true;
  for(let parent=l.parent;parent!=null;){
    if(seen.has(parent))throw Error('人物分组循环');seen.add(parent);
    const g=p.layers[parent];if(!g||g.visible===false)return false;
    if(!g.isGroup)checkAction=false;
    if(checkAction&&actions.some(a=>a.name===g.name||a.direction===g.name)&&g.name!==action.name&&g.name!==action.direction)return false;
    parent=g.parent;
  }
  return true;
}
function measure(p){
  return p.spriteSheets.flatMap((s,si)=>!s.name.startsWith('original32_')||s.canvasLayout?[]:[{si,actions:s.actions.map((a,ai)=>{
    let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
    for(const l of p.layers)if(visible(p,l,si,ai))for(let fi=0;fi<a.frames.length;fi++){
      const c=l.frameData?.[`${si}_${ai}_${fi}`];if(!c)continue;
      const im=decode(c.dataURL),r=c.placement;
      for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]){
        left=Math.min(left,r?r.x+x*r.w/im.width:x);top=Math.min(top,r?r.y+y*r.h/im.height:y);
        right=Math.max(right,r?r.x+(x+1)*r.w/im.width:x+1);bottom=Math.max(bottom,r?r.y+(y+1)*r.h/im.height:y+1);
      }
    }
    if(!Number.isFinite(left))throw Error('动作没有可见主体，未调整：'+s.name+'/'+a.direction);
    left=Math.floor(left);top=Math.floor(top);right=Math.ceil(right);bottom=Math.ceil(bottom);
    const ow=Math.max(...a.frames.map(f=>f.width)),oh=Math.max(...a.frames.map(f=>f.height));
    return {name:a.name,direction:a.direction,left,top,right,bottom,ow,oh,minimumMargin:Math.max(4,left,top,ow-right,oh-bottom)};
  })}]);
}
function align(p,margin,onlyNames){
  for(const plan of measure(p)){
    const s=p.spriteSheets[plan.si];if(onlyNames&&!onlyNames.has(s.name))continue;
    const layouts=plan.actions.map(b=>{if(margin<b.minimumMargin)throw Error('透明留白不足以保留原画布');return {name:b.name,direction:b.direction,x:margin-b.left,y:margin-b.top,width:b.right-b.left+margin*2,height:b.bottom-b.top+margin*2};});
    const width=Math.max(...layouts.map(b=>b.width)),height=Math.max(...layouts.map(b=>b.height)),columns=Math.max(...s.actions.map(a=>a.frames.length));
    if(width>512||height>512||width*columns*height*s.actions.length>16*1024*1024)throw Error('人物画布过大');
    const source=s.imageDataURL?decode(s.imageDataURL):null,atlas=new Uint8Array(width*columns*height*s.actions.length*4);
    for(let ai=0;ai<s.actions.length;ai++){
      const layout=layouts[ai],a=s.actions[ai];
      for(let fi=0;fi<a.frames.length;fi++){
        const f=a.frames[fi],key=`${plan.si}_${ai}_${fi}`;
        for(const l of p.layers)if(l.frameData?.[key])l.frameData[key]=move(l.frameData[key],layout.width,layout.height,layout.x,layout.y);
        if(source){
          if(f.sourceX<0||f.sourceY<0||f.sourceX+f.width>source.width||f.sourceY+f.height>source.height)throw Error('人物原始图集切帧越界');
          for(let y=0;y<f.height;y++)atlas.set(source.data.subarray(((f.sourceY+y)*source.width+f.sourceX)*4,((f.sourceY+y)*source.width+f.sourceX+f.width)*4),(((ai*height+layout.y+y)*width*columns)+fi*width+layout.x)*4);
        }
        Object.assign(f,{width:layout.width,height:layout.height,sourceX:fi*width,sourceY:ai*height,lockedRegions:(f.lockedRegions||[]).map(r=>({...r,x:r.x+layout.x,y:r.y+layout.y}))});
      }
    }
    Object.assign(s,{frameWidth:width,frameHeight:height,columns,rows:s.actions.length,spacingX:0,spacingY:0,offsetX:0,offsetY:0,imageDataURL:encode({width:width*columns,height:height*s.actions.length,data:atlas}),canvasLayout:{version:1,margin,actions:layouts}});
  }
  return p;
}
function inherit(cel,sourceSheet,sourceAI,targetSheet,targetAI,frame){
  const source=sourceSheet.canvasLayout?.actions[sourceAI],target=targetSheet.canvasLayout?.actions[targetAI];
  if(!source&&!target)return cel;
  if(!source||!target)throw Error('人物画布版本不同，未同步底稿');
  return move(cel,frame.width,frame.height,target.x-source.x,target.y-source.y,{preserveOffCanvas:true});
}
module.exports={measure,align,move,inherit};
