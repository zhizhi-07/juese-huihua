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
  function fromIdle(src,target,{sit=false,direction,sourceHead,targetHead}={}){
    // shortcut: tight, sleeveless native16 garments; reject painted sleeves or loose skirts.
    for(let i=0;i<src.clothes.data.length;i+=4)if(src.clothes.data[i+3])ensure(src.body.data[i+3]&&!outline(src.body,i),'衣服超出身体区域；当前算法仅支持贴身款');
    const sr=rows(src.body),tr=rows(target),soles=sit&&direction!=='up'?feet(target):[],legTop=bounds(target).bottom-1;
    const out=fit(src,target,sit?{soleReference:target,soles,collar:{sourceHead,targetHead,legTop}}:{});
    if(!sit)for(let row=0;row<2;row++){const to=tr[tr.length-2+row];for(const x of to.xs)out.data.fill(0,(to.y*out.width+x)*4,(to.y*out.width+x)*4+4);copyRow(out,src.clothes,sr[sr.length-2+row],to);}
    const colors=new Map();for(const r of sr.slice(-2))for(const x of r.xs){const i=(r.y*src.clothes.width+x)*4;if(src.clothes.data[i+3]){const c=Array.from(src.clothes.data.slice(i,i+4)),key=c.join(',');colors.set(key,{c,n:(colors.get(key)?.n||0)+1});}}
    const pair=[...colors.values()].sort((a,b)=>b.n-a.n).slice(0,2).map(v=>v.c).sort((a,b)=>a[0]+a[1]+a[2]-b[0]-b[1]-b[2]);
    // Body shading may darken cloth, but must never erase the artist's painted shadow.
    if(pair.length===2)for(let y=legTop;y<out.height;y++)for(let x=0;x<out.width;x++){const i=(y*out.width+x)*4;if(out.data[i+3]&&skinShadow(target,i)&&pair[1].every((v,k)=>v===out.data[i+k]))out.data.set(pair[0],i);}
    return out;
  }
  return {warp,fit,fromIdle,feet,bounds};
});
