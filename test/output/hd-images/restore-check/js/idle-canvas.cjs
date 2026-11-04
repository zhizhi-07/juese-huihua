/* Transparent padding only: every existing idle pixel keeps its value and relative position. */
const png=require('../scripts/png.cjs');
module.exports=function padIdle(project,width,height=width,{allowCrop=false}={}){
  const si=project.spriteSheets.findIndex(s=>s.name==='original32_idle');if(si<0)return false;
  const sheet=project.spriteSheets[si],ow=sheet.frameWidth,oh=sheet.frameHeight;
  if(ow===width&&oh===height)return false;
  if(![ow,oh,width,height].every(Number.isSafeInteger)||width<1||height<1||(!allowCrop&&(width<ow||height<oh))||width>128||height>128)throw new Error('待机画布只支持扩边，最大128×128');
  const dx=Math.floor((width-ow)/2),dy=Math.floor((height-oh)/2),updates=[],cache=new Map();
  function decode(url){if(typeof url!=='string'||!url.startsWith('data:image/png;base64,'))throw new Error('待机像素不是PNG，未修改工程');return png.decode(Buffer.from(url.split(',')[1],'base64'));}
  function url(w,h,data){return 'data:image/png;base64,'+png.encode(w,h,data).toString('base64');}
  function blit(src,sx,sy,w,h,target,tw,tx,ty){
    if(sx<0||sy<0||sx+w>src.width||sy+h>src.height)throw new Error('待机原图切帧越界，未修改工程');
    for(let y=0;y<h;y++)target.set(src.data.subarray(((sy+y)*src.width+sx)*4,((sy+y)*src.width+sx+w)*4),((ty+y)*tw+tx)*4);
  }
  function resize(src){
    const data=new Uint8Array(width*height*4);
    for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){
      const i=(y*ow+x)*4,nx=x+dx,ny=y+dy;
      if(nx<0||ny<0||nx>=width||ny>=height){if(src.data[i+3])throw new Error('扩边内已有绘画，拒绝裁掉像素');continue;}
      data.set(src.data.subarray(i,i+4),(ny*width+nx)*4);
    }
    return data;
  }
  for(const layer of project.layers)for(const [key,frame]of Object.entries(layer.frameData||{})){
    if(Number(key.split('_')[0])!==si)continue;
    if(frame.width!==ow||frame.height!==oh)throw new Error('待机图层尺寸混杂，未修改工程');
    let padded=cache.get(frame.dataURL);
    if(!padded){const src=decode(frame.dataURL);if(src.width!==ow||src.height!==oh)throw new Error('PNG尺寸与待机图层不符，未修改工程');padded={width,height,dataURL:url(width,height,resize(src))};cache.set(frame.dataURL,padded);}
    updates.push([layer,key,{...frame,...padded}]);
  }
  const columns=Math.max(...sheet.actions.map(a=>a.frames.length)),rows=sheet.actions.length;
  if(!columns||!rows||columns*width*rows*height>16*1024*1024)throw new Error('待机素材表大小无效');
  const source=sheet.imageDataURL?decode(sheet.imageDataURL):null,data=new Uint8Array(columns*width*rows*height*4);
  const actions=sheet.actions.map((action,ai)=>({...action,frames:action.frames.map((frame,fi)=>{
    if(frame.width!==ow||frame.height!==oh)throw new Error('待机动作尺寸混杂，未修改工程');
    if(source){const cel=new Uint8Array(ow*oh*4);blit(source,frame.sourceX||0,frame.sourceY||0,ow,oh,cel,ow,0,0);blit({width,height,data:resize({data:cel})},0,0,width,height,data,columns*width,fi*width,ai*height);}
    return {...frame,width,height,sourceX:fi*width,sourceY:ai*height,lockedRegions:(frame.lockedRegions||[]).map(r=>({...r,x:r.x+dx,y:r.y+dy}))};
  })}));
  const imageDataURL=url(columns*width,rows*height,data);
  for(const [layer,key,value]of updates)layer.frameData[key]=value;
  Object.assign(sheet,{frameWidth:width,frameHeight:height,columns,rows,spacingX:0,spacingY:0,offsetX:0,offsetY:0,actions,imageDataURL});
  return true;
};
