const fs=require('fs'),f=__dirname+'/build-base.cjs';let s=fs.readFileSync(f,'utf8');
const rep=(a,b)=>{if(!s.includes(a))throw Error('missing '+a.slice(0,50));s=s.replace(a,b);};
rep(`function artImage(rows,ox,oy,w,h,key){
  const cv=createCanvas(w,h),cx=cv.getContext('2d'),im=cx.createImageData(w,h);
  rows.forEach((r,y)=>[...r].forEach((c,x)=>{if(c==='.')return;const X=x+ox,Y=y+oy;assert(X>=0&&Y>=0&&X<w&&Y<h,\`像素越界 \${key} \${X},\${Y} in \${w}x\${h}\`);im.data.set([...rgb(COLORS[c]),255],(Y*w+X)*4);}));
  cx.putImageData(im,0,0);return {width:w,height:h,dataURL:'data:image/png;base64,'+cv.toBuffer('image/png').toString('base64')};
}`,`const clippedFrames=[];
// 与编辑器同步算法一致：超出画布的像素不裁掉，改为扩大图像并记录 placement。
function artImage(rows,ox,oy,w,h,key){
  const pts=[];rows.forEach((r,y)=>[...r].forEach((c,x)=>{if(c!=='.')pts.push([x+ox,y+oy,c]);}));
  const L=Math.min(0,...pts.map(p=>p[0])),T=Math.min(0,...pts.map(p=>p[1])),R=Math.max(w-1,...pts.map(p=>p[0])),B=Math.max(h-1,...pts.map(p=>p[1])),cw=R-L+1,ch=B-T+1;
  const cv=createCanvas(cw,ch),cx=cv.getContext('2d'),im=cx.createImageData(cw,ch);
  for(const [X,Y,c] of pts)im.data.set([...rgb(COLORS[c]),255],((Y-T)*cw+X-L)*4);
  cx.putImageData(im,0,0);const cel={width:cw,height:ch,dataURL:'data:image/png;base64,'+cv.toBuffer('image/png').toString('base64')};
  if(L||T||cw!==w||ch!==h){cel.placement={x:L,y:T,w:cw,h:ch};clippedFrames.push(key+' 超出 '+pts.filter(p=>p[0]<0||p[1]<0||p[0]>=w||p[1]>=h).length+'px');}
  return cel;
}`);
rep(`console.log('预览',stamp,`,`console.log('超出画布的帧',clippedFrames.length,clippedFrames);\n  console.log('预览',stamp,`);
rep(`assert.equal(c.width,f.width);assert.equal(c.height,f.height);
      const im=await pixels(c,f.width,f.height);`,`if(!c.placement){assert.equal(c.width,f.width);assert.equal(c.height,f.height);}else assert.deepEqual([c.placement.w,c.placement.h],[c.width,c.height]);
      const im=await pixels({width:c.width,height:c.height,dataURL:c.dataURL},c.width,c.height);`);
fs.writeFileSync(f,s);
