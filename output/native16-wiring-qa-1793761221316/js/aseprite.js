/* Native Aseprite RGBA import. Unsupported rendering features fail before project mutation. */
window.PE = window.PE || {};
(() => {
  async function inflate(bytes, expected) {
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
    const out = new Uint8Array(expected); let offset = 0;
    try {
      while (true) {
        const {done, value} = await reader.read(); if (done) break;
        if (offset + value.length > expected) throw new Error('压缩像素数据超出声明尺寸');
        out.set(value, offset); offset += value.length;
      }
    } finally { await reader.cancel(); }
    if (offset !== expected) throw new Error('压缩像素数据不完整');
    return out;
  }
  PE.parseAseprite = async function(buffer) {
    const v = new DataView(buffer), bytes = new Uint8Array(buffer);
    const check = (p,n,end=buffer.byteLength) => { if(p<0 || n<0 || p+n>end) throw new Error('Aseprite 文件截断或长度无效'); };
    check(0,128);
    const u16=p=>v.getUint16(p,true), u32=p=>v.getUint32(p,true), i16=p=>v.getInt16(p,true);
    if (u16(4)!==0xA5E0 || u32(0)!==buffer.byteLength) throw new Error('不是有效的 Aseprite 源文件');
    const count=u16(6), width=u16(8), height=u16(10), depth=u16(12), flags=u32(14);
    if(depth!==32) throw new Error('当前支持 RGBA 32 位源文件；索引色/灰度文件暂不支持，原文件未更改');
    if(!count || !width || !height || width*height*count>16*1024*1024) throw new Error('素材尺寸或帧数超过本地编辑上限');
    const text=(p,end)=>{check(p,2,end);const n=u16(p);check(p+2,n,end);return new TextDecoder().decode(bytes.subarray(p+2,p+2+n));};
    const layers=[], frames=[], tags=[]; let pos=128;
    for(let fi=0;fi<count;fi++) {
      check(pos,16);const end=pos+u32(pos);check(pos,16,end);check(pos,end-pos);
      if(u16(pos+4)!==0xF1FA) throw new Error('无效动画帧');
      const frame={duration:u16(pos+8)||u16(18)||100,cels:new Map()};frames.push(frame);
      const chunks=u32(pos+12)||u16(pos+6);let q=pos+16;
      for(let ci=0;ci<chunks;ci++) {
        check(q,6,end);const size=u32(q), type=u16(q+4), stop=q+size, p=q+6;
        if(size<6) throw new Error('无效 chunk 长度');check(q,size,end);
        if(type===0x2004) {
          check(p,18,stop);const kind=u16(p+2),blend=u16(p+10), opacity=(flags&1)?bytes[p+12]/255:1;
          if(kind>1 || blend!==0 || (kind===1 && opacity!==1)) throw new Error('此文件使用尚不支持的瓦片图层、混合模式或半透明图层组，已停止导入');
          const level=u16(p+4);let parent=null;
          for(let li=layers.length-1;li>=0;li--) if(layers[li].depth<level){parent=li;break;}
          layers.push({name:text(p+16,stop),isGroup:kind===1,depth:level,parent,visible:!!(u16(p)&1),locked:!(u16(p)&2),opacity});
        } else if(type===0x2005) {
          check(p,16,stop);const li=u16(p),kind=u16(p+7);
          if(i16(p+9)!==0) throw new Error('当前不支持动态 Z 排序的 cel');
          const cel={x:i16(p+2),y:i16(p+4),opacity:bytes[p+6]/255};
          if(kind===1) { check(p+16,2,stop);cel.link=u16(p+16);if(cel.link>=fi)throw new Error('关联帧必须指向已存在的帧'); }
          else if(kind===0 || kind===2) {
            check(p+16,4,stop);cel.width=u16(p+16);cel.height=u16(p+18);
            const length=cel.width*cel.height*4;
            if(length>64*1024*1024)throw new Error('Cel 超出像素上限');
            const payload=bytes.subarray(p+20,stop);
            cel.data=kind===2?await inflate(payload,length):payload.slice();
            if(cel.data.length!==length)throw new Error('Cel 像素长度错误');
          } else throw new Error('不支持的 cel 类型：'+kind);
          frame.cels.set(li,cel);
        } else if(type===0x2018) {
          check(p,10,stop);let t=p+10;
          for(let ti=0;ti<u16(p);ti++) {check(t,19,stop);const name=text(t+17,stop);tags.push({from:u16(t),to:u16(t+2),direction:bytes[t+4],name});t+=19+u16(t+17);}
        } else if(type===0x2006 || type===0x2023) throw new Error('此素材含尚不支持的外部像素资源');
        q=stop;
      }
      if(q!==end)throw new Error('动画帧数据长度不一致');pos=end;
    }
    if(pos!==buffer.byteLength)throw new Error('文件尾长度不一致');
    for(const f of frames)for(const li of f.cels.keys())if(!layers[li] || layers[li].isGroup)throw new Error('Cel 引用了无效图层');
    function resolve(fi,li) {const cel=frames[fi].cels.get(li);if(!cel)return null;if(cel.link==null)return cel;const src=resolve(cel.link,li);if(!src)throw new Error('关联帧缺少像素');return {...src,x:cel.x,y:cel.y,opacity:cel.opacity};}
    if(layers.length>512 || width*height*frames.length*layers.filter(l=>!l.isGroup).length>32*1024*1024)throw new Error('分层像素总量超过本地编辑上限');
    const pixels=frames.map((f,fi)=>layers.map((l,li)=>{
      if(l.isGroup)return null;const out=new ImageData(width,height),cel=resolve(fi,li);if(!cel)return out;
      for(let y=0;y<cel.height;y++)for(let x=0;x<cel.width;x++) {
        const dx=x+cel.x,dy=y+cel.y;if(dx<0||dy<0||dx>=width||dy>=height)continue;
        const s=(y*cel.width+x)*4,d=(dy*width+dx)*4;
        out.data.set(cel.data.subarray(s,s+4),d);out.data[d+3]=Math.round(out.data[d+3]*cel.opacity);
      }return out;
    }));
    return {width,height,layers,frames,pixels,tags};
  };
  PE.importAseprite = async function(file,project) {
    if(file.size>64*1024*1024)throw new Error('源文件超过 64 MB');
    const buffer=await file.arrayBuffer(), parsed=await PE.parseAseprite(buffer);
    const {width,height,layers,frames,pixels,tags}=parsed,si=project.spriteSheets.length;
    const sheet=new PE.SpriteSheet(file.name.replace(/\.(ase|aseprite)$/i,''));
    sheet.sourceFormat='aseprite';sheet.frameWidth=width;sheet.frameHeight=height;sheet.fps=1000/frames[0].duration;
    // These source packs store directions in separate named top-level groups.
    const roots=layers.map((l,i)=>({...l,index:i})).filter(l=>l.depth===0 && l.isGroup);
    const directional=roots.length>1 && roots.every(l=>/^(up|down|side|left|right)$/i.test(l.name));
    const sequences=directional?roots.slice().reverse().map(l=>({name:l.name,root:l.index,ids:frames.map((_,i)=>i)})):
      (tags.length?tags.map(t=>{if(t.from>t.to||t.to>=frames.length)throw new Error('动作标签范围无效');let ids=Array.from({length:t.to-t.from+1},(_,i)=>t.from+i);if(t.direction===1||t.direction===3)ids.reverse();if(t.direction===2||t.direction===3)ids=ids.concat(ids.slice(1,-1).reverse());return {name:t.name,ids};}):[{name:sheet.name,ids:frames.map((_,i)=>i)}]);
    for(const l of layers) if(PE.isHandLayer(l)) {l.referenceOnly=true;l.locked=true;}
    const layerStart=project.layers.length, imported=layers.map(l=>Object.assign(new PE.Layer(l.name),l,{sheetIndex:si,parent:l.parent==null?null:l.parent+layerStart}));
    function belongs(li,root){while(li!=null){if(li===root)return true;li=layers[li].parent;}return false;}
    sheet.columns=Math.max(...sequences.map(a=>a.ids.length));sheet.rows=sequences.length;
    const image=document.createElement('canvas');image.width=width*sheet.columns;image.height=height*sheet.rows;
    if(image.width*image.height>32*1024*1024)throw new Error('导出动作表超过像素上限');
    const ctx=image.getContext('2d'),temp=document.createElement('canvas');temp.width=width;temp.height=height;const tc=temp.getContext('2d');
    sequences.forEach((seq,ai)=>{
      const action=new PE.Action(seq.name,directional?seq.name:'');sheet.actions.push(action);
      seq.ids.forEach((fi,index)=>{
        const frame=new PE.Frame(si,index*width,ai*height,width,height);frame.duration=frames[fi].duration;action.frames.push(frame);
        const composite=document.createElement('canvas');composite.width=width;composite.height=height;const cc=composite.getContext('2d');
        layers.forEach((l,li)=>{
          if(l.isGroup || (directional&&!belongs(li,seq.root)))return;
          const data=PE.utils.cloneImageData(pixels[fi][li]);imported[li].frameData.set(`${si}_${ai}_${index}`,data);
          let visible=l.visible,parent=l.parent;while(parent!=null){visible=visible&&layers[parent].visible;parent=layers[parent].parent;}
          if(!visible)return;tc.clearRect(0,0,width,height);tc.putImageData(data,0,0);cc.globalAlpha=l.opacity;cc.drawImage(temp,0,0);
        });
        frame.originalPixels=cc.getImageData(0,0,width,height);ctx.drawImage(composite,index*width,ai*height);
      });
    });
    sheet.imageData=ctx.getImageData(0,0,image.width,image.height);
    // Retain the unmodified source in the editable project for recovery.
    let binary='';for(let p=0;p<buffer.byteLength;p+=8192)binary+=String.fromCharCode(...new Uint8Array(buffer,p,Math.min(8192,buffer.byteLength-p)));
    sheet.sourceBytes=btoa(binary);
    project.spriteSheets.push(sheet);project.layers.push(...imported);
    const overlay=project.addLayer(sheet.name+' / 衣服与发型');overlay.sheetIndex=si;
    return {success:true,sheetIndex:si,layered:true,width,height};
  };
})();
