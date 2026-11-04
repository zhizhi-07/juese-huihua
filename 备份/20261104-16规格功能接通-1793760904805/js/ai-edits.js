/* Validate the entire proposal before touching any pixels. */
(function(root){
  const A={
    isIdle(project,si,ai){
      const sheet=project.spriteSheets[si],name=sheet?.name||'';
      if(/待机|(?:^|[_\s-])idle(?:[_\s-]|$)/i.test(name))return true;
      if(/行走|拾取|坐姿|睡觉|walk|pick|sit|sleep/i.test(name))return false;
      return /待机|\bidle\b/i.test(sheet?.actions[ai]?.name||'');
    },
    motion(project,category,edits,allowed=false){
      if(!['hair','eyes','clothes','character'].includes(category)||allowed)return;
      if(edits.some(e=>!A.isIdle(project,e.sheetIndex,e.actionIndex)))throw new Error('必须先画待机；待机全部确认并明确授权后，才能画其他动作。请切到待机素材表。');
    },
    changed(project,layerIndex,edits){
      const layer=project.layers[layerIndex];
      return edits.map(e=>({...e,pixels:e.pixels.filter(p=>{const old=layer.getPixel(project.getFrameKey(e.sheetIndex,e.actionIndex,e.frameIndex),p.x,p.y)||{r:0,g:0,b:0,a:0};return !(old.a===0&&p.a===0)&&['r','g','b','a'].some(k=>old[k]!==p[k]);})})).filter(e=>e.pixels.length);
    },
    validate(project,layerIndex,edits){
      const layer=project.layers[layerIndex];
      if(!Number.isSafeInteger(layerIndex)||!layer||layer.locked||layer.isGroup||layer.referenceOnly||layer.isOriginal||root.PE?.isHandLayer?.(layer))throw new Error('请选择一个可编辑的绘画图层');
      if(!Array.isArray(edits)||edits.length>256)throw new Error('绘画结果过大或格式错误');
      let count=0;
      for(const edit of edits){
        if(!edit||!['sheetIndex','actionIndex','frameIndex'].every(k=>Number.isSafeInteger(edit[k])&&edit[k]>=0)||edit.sheetIndex!==project.currentSheetIndex||(layer.sheetIndex!==undefined&&layer.sheetIndex!==edit.sheetIndex))throw new Error('AI 只能修改当前素材表中的目标图层');
        const frame=project.spriteSheets[edit.sheetIndex]?.actions[edit.actionIndex]?.frames[edit.frameIndex];
        if(!frame||frame.locked||!Array.isArray(edit.pixels))throw new Error('目标帧不存在、已锁定或像素格式错误');
        count+=edit.pixels.length;if(count>20000)throw new Error('单次最多应用 20000 个像素，请让 AI 分步修改');
        const seen=new Set();
        for(const p of edit.pixels){
          if(!p||!['x','y','r','g','b','a'].every(k=>Number.isSafeInteger(p[k]))||p.x<0||p.y<0||p.x>=frame.width||p.y>=frame.height||['r','g','b','a'].some(k=>p[k]<0||p[k]>255)||frame.isPixelLocked?.(p.x,p.y))throw new Error('AI 像素越界、颜色无效或触及锁定区域');
          const key=p.x+','+p.y;if(seen.has(key))throw new Error('AI 在同一帧中提供了重复像素');seen.add(key);
        }
      }
      return count;
    },
    pixels(data){
      const pixels=[];if(!data)return pixels;
      for(let y=0;y<data.height;y++)for(let x=0;x<data.width;x++){
        const i=(y*data.width+x)*4;if(data.data[i+3])pixels.push([x,y,...data.data.slice(i,i+4)]);
      }
      return pixels;
    }
  };
  root.PE=root.PE||{};root.PE.AIEdits=A;
  if(typeof module!=='undefined')module.exports=A;
})(typeof window==='undefined'?globalThis:window);
