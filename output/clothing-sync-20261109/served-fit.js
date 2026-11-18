/* Native-pixel garment fitting, shared by the editor and offline checks. */
((root,factory)=>{const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.PE=root.PE||{}).ClothingFit=api;})(globalThis,()=>{
  const ensure=(ok,message='衣服像素或底稿无效')=>{if(!ok)throw Error(message);};
  const blank=(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)});
  const outline=(im,i)=>im.data[i]===70&&im.data[i+1]===70&&im.data[i+2]===94;
  const skinShadow=(im,i)=>im.data[i+3]&&im.data[i]===224&&im.data[i+1]===197&&im.data[i+2]===180;
  function rows(im){const a=[];for(let y=0;y<im.height;y++){const xs=[];for(let x=0;x<im.width;x++){const i=(y*im.width+x)*4;if(im.data[i+3]&&!outline(im,i))xs.push(x);}if(xs.length)a.push({y,xs});}ensure(a.length>=3,'身体不足三行，无法适配');return a;}
  function bounds(im,edge=false){const xs=[],ys=[];for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const i=(y*im.width+x)*4;if(im.data[i+3]&&(!edge||outline(im,i))){xs.push(x);ys.push(y);}}ensure(xs.length,'底稿为空或没有描边');return {left:Math.min(...xs),bottom:Math.max(...ys)};}
  function copyRow(out,source,from,to){
    const min=from.xs[0],max=from.xs.at(-1),left=to.xs[0],right=to.xs.at(-1);
    for(const x of to.xs){let sx=Math.round(min+(x-left)*(max-min)/Math.max(1,right-left)),i=(from.y*source.width+sx)*4;
      if(!source.data[i+3]){const painted=from.xs.filter(px=>source.data[(from.y*source.width+px)*4+3]);if(!painted.length)continue;sx=painted.reduce((best,px)=>Math.abs(px-sx)<Math.abs(best-sx)?px:best);i=(from.y*source.width+sx)*4;}
      out.data.set(source.data.subarray(i,i+4),(to.y*out.width+x)*4);
    }
  }
  function warp(sourceBody,sourceClothes,targetBody){
    const a=rows(sourceBody),b=rows(targetBody),out=blank(targetBody.width,targetBody.height);
    for(let row=0;row<b.length;row++){
      const sr=row<2?row:Math.round(2+(row-2)*(a.length-3)/Math.max(1,b.length-3)),from=a[sr],to=b[row];
      if(sr>=2){copyRow(out,sourceClothes,from,to);continue;}
      for(const x of to.xs){const sx=Math.round(from.xs[0]+(x-to.xs[0])*(from.xs.at(-1)-from.xs[0])/Math.max(1,to.xs.at(-1)-to.xs[0])),i=(from.y*sourceBody.width+sx)*4;if(sourceClothes.data[i+3])out.data.set(sourceClothes.data.subarray(i,i+4),(to.y*out.width+x)*4);}
    }return out;
  }
  function fit(src,target,{shadeLegs=false,soleReference=null,soles=[],collar=null}={}){
    const out=warp(src.body,src.clothes,target),bottom=bounds(target).bottom;
    if(shadeLegs)for(let y=bottom-1;y<=bottom;y++)for(let x=0;x<out.width;x++){const i=(y*out.width+x)*4;if(out.data[i+3]&&skinShadow(target,i)&&out.data[i]===114&&out.data[i+1]===149&&out.data[i+2]===190)out.data.set([82,107,149,255],i);}
    if(collar){
      // Neck pixels also live in head layers; the outline defines the actual head edge.
      const sh=bounds(collar.sourceHead,true),th=bounds(collar.targetHead,true),sb=bounds(src.body),tb=bounds(target),dx=th.left-sh.left,dy=th.bottom-sh.bottom;
      const legTop=collar.legTop??Math.min(...soles.map(p=>p[1]))+tb.bottom-bounds(soleReference).bottom;ensure(Number.isFinite(legTop));
      for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){
        const i=(y*out.width+x)*4;out.data.fill(0,i,i+4);const upper=y<legTop,sx=upper?x-dx:x-tb.left+sb.left,sy=upper?y-dy:y-tb.bottom+sb.bottom;
        if(sx<0||sy<0||sx>=src.clothes.width||sy>=src.clothes.height||!target.data[i+3]||outline(target,i)||upper&&y<=th.bottom&&collar.targetHead.data[i+3])continue;
        const j=(sy*src.clothes.width+sx)*4;out.data.set(src.clothes.data.subarray(j,j+4),i);
      }
    }
    if(soles.length){ensure(soleReference);const a=bounds(soleReference),b=bounds(target);for(const [x,y]of soles){const tx=x+b.left-a.left,ty=y+b.bottom-a.bottom;ensure(tx>=0&&ty>=0&&tx<out.width&&ty<out.height);const i=(ty*out.width+tx)*4;ensure(target.data[i+3]&&!outline(target,i),'脚的位置与当前身体不符');out.data.fill(0,i,i+4);}}
    for(let i=0;i<out.data.length;i+=4)ensure(!(out.data[i+3]&&out.data[i]===255&&out.data[i+1]===0&&out.data[i+2]===0),'红色位置标记不能参与衣服同步');return out;
  }
  function feet(body){
    const bottom=bounds(body).bottom,seen=new Set(),blocks=[];
    for(let y=bottom-1;y<=bottom;y++)for(let x=0;x<body.width;x++){
      const at=y*body.width+x,i=at*4;if(seen.has(at)||!body.data[i+3]||outline(body,i))continue;const q=[at];seen.add(at);
      for(let j=0;j<q.length;j++){const a=q[j],px=a%body.width,py=Math.floor(a/body.width);for(const [nx,ny]of [[px-1,py],[px+1,py],[px,py-1],[px,py+1]]){const n=ny*body.width+nx;if(nx<0||nx>=body.width||ny<bottom-1||ny>bottom||seen.has(n)||!body.data[n*4+3]||outline(body,n*4))continue;seen.add(n);q.push(n);}}
      const points=q.map(a=>[a%body.width,Math.floor(a/body.width)]);if(points.length===4&&new Set(points.map(p=>p[0])).size===2&&new Set(points.map(p=>p[1])).size===2)blocks.push(points);
    }
    ensure(blocks.length===2,'当前坐姿无法唯一识别两只脚，请先校准，不猜测脚区');return blocks.flat();
  }
  const center=xs=>(xs[0]+xs.at(-1))/2;
  function runs(xs){const parts=[];for(const x of xs){if(parts.at(-1)?.at(-1)===x-1)parts.at(-1).push(x);else parts.push([x]);}return parts;}
  const sample=(xs,i,n)=>xs[Math.round(n===1?(xs.length-1)/2:i*(xs.length-1)/(n-1))];
  function fromIdle(src,target,{sit=false,targetHead}={}){
    // shortcut: native16 fitted garments; sleeves and loose hems need their own attachment guides.
    const cloth=src.clothes,out=blank(target.width,target.height);
    ensure(cloth.width===src.body.width&&cloth.height===src.body.height);
    for(let i=0;i<cloth.data.length;i+=4)if(cloth.data[i+3]){
      ensure(src.body.data[i+3]&&!outline(src.body,i),'衣服超出身体区域；当前算法仅支持贴身款');
      ensure(cloth.data[i]!==255||cloth.data[i+1]!==0||cloth.data[i+2]!==0,'红色位置标记不能参与衣服同步');
    }
    const sr=rows(src.body),tr=rows(target),sb=bounds(src.body).bottom,tb=bounds(target).bottom;
    const su=sr.filter(r=>r.y<sb-1),tu=tr.filter(r=>r.y<tb-1);
    ensure(su.length&&tu.length,'身体缺少躯干，无法同步衣服');
    const sx=center(su[0].xs),tx=center(tu[0].xs),dx=Math.round(tx-sx);
    const copy=(x,y,px,py,pair)=>{
      const i=(y*out.width+x)*4;
      if(px<0||px>=cloth.width||sit&&targetHead?.data[i+3])return;
      const j=(py*cloth.width+px)*4,c=cloth.data.subarray(j,j+4);
      out.data.set(pair&&skinShadow(target,i)&&pair[1].every((v,k)=>v===c[k])?pair[0]:c,i);
    };
    const visible=tu.filter(r=>!sit||r.xs.some(x=>!targetHead?.data[(r.y*out.width+x)*4+3]));
    for(const [i,r] of visible.entries()){
      const from=sit?su[visible.length===1?su.length-1:Math.round(i*(su.length-1)/(visible.length-1))]:su.find(s=>s.y-su[0].y===r.y-tu[0].y);
      if(from)for(const x of r.xs)copy(x,r.y,x-dx,from.y);
    }
    for(let offset=1;offset>=0;offset--){
      const from=sr.find(r=>r.y===sb-offset),to=tr.find(r=>r.y===tb-offset);if(!from||!to)continue;
      const source=runs(from.xs),dest=runs(to.xs);
      const colors=[...new Map(from.xs.map(x=>Array.from(cloth.data.slice((from.y*cloth.width+x)*4,(from.y*cloth.width+x)*4+4))).filter(c=>c[3]).map(c=>[c.join(),c])).values()];
      // Shade only within a row: a contrasting shoe or cuff on another row isn't a shadow.
      colors.sort((a,b)=>a[0]+a[1]+a[2]-b[0]-b[1]-b[2]);
      const delta=colors.length===2?colors[1].slice(0,3).map((v,i)=>v-colors[0][i]):[];
      const pair=delta.length&&Math.min(...delta)>=0&&Math.max(...delta)-Math.min(...delta)<=16?colors:null;
      const footRuns=sit?dest.slice(-2):dest,cut=footRuns.length===2?(footRuns[0].at(-1)+footRuns[1][0])/2:tx;
      const split=source.length===2?(source[0].at(-1)+source[1][0])/2:sx;
      const sides=source.length===2?source:[from.xs.filter(x=>x<split),from.xs.filter(x=>x>split)];
      for(const [k,run] of dest.entries()){
        if(dest.length>2&&k<dest.length-2){for(const x of run)copy(x,to.y,x-dx,from.y,pair);continue;}
        // A joined silhouette can still have a seam; a lone visible foot keeps its own side.
        for(const sign of [-1,1]){
          const xs=run.filter(x=>sign*(x-cut)>0),side=sides[sign===1?1:0];
          if(side.length)xs.forEach((x,i)=>copy(x,to.y,sample(side,i,xs.length),from.y,pair));
        }
        if(run.includes(cut)){
          const at=(to.y*out.width+cut)*4,shaded=skinShadow(target,at);
          const right=run.includes(cut+1)&&skinShadow(target,at+4)===shaded&&(!run.includes(cut-1)||skinShadow(target,at-4)!==shaded);
          const px=from.xs.includes(split)?split:right?sides[1][0]:sides[0].at(-1)??sides[1][0];
          if(px!==undefined)copy(cut,to.y,px,from.y,pair);
        }
      }
    }
    return out;
  }
  return {warp,fit,fromIdle,feet,bounds};
});
