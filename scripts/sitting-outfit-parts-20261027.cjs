/* Sitting has a true profile: its face, hanging hair and lap are drawn separately. */
module.exports=function sittingPart({kind,ai,fi,frame,sourceImage,original,reference,decode}){
 const w=frame.width,h=frame.height,data=new Uint8Array(w*h*4),phase=fi>=2?1:0;
 const C={O:[119,119,119,255],G:[209,209,209,255],S:[178,178,178,255],W:[247,245,241,255],D:[210,211,222,255],F:[179,181,197,255],K:[43,49,52,255],P:[232,166,182,255]};
 const put=(x,y,c)=>{if(x>=0&&x<w&&y>=0&&y<h)data.set(typeof c==='string'?C[c]:c,(y*w+x)*4);};
 const range=(y,l,r,c)=>{for(let x=l;x<=r;x++)put(x,y,c);};
 const sample=(im,x,y)=>im.data.slice((y*im.width+x)*4,(y*im.width+x)*4+4);
 if(ai===0&&['front','rear'].includes(kind)){
  const rows=kind==='front'?{
   0:[[8,17]],1:[[6,19]],2:[[5,20]],3:[[4,21]],4:[[3,21]],5:[[2,22]],6:[[2,22]],7:[[2,22]],8:[[2,16],[18,22]],9:[[2,15],[19,21]],10:[[2,15]],11:[[2,14]],12:[[2,14]],13:[[2,13]],14:[[2,13]],15:[[2,13]],16:[[3,13]],17:[[3,12]],18:[[3,11]],19:[[4,10]],20:[[4,9]],21:[[4,8]],22:[[5,8]],23:[[6,7]]
  }:{0:[[8,17]],1:[[6,19]],2:[[5,20]],3:[[4,21]],4:[[3,21]],5:[[2,22]],6:[[2,22]],7:[[2,22]],8:[[1,22]],9:[[1,21]],10:[[1,20]],11:[[1,19]],12:[[1,17]],13:[[1,16]],14:[[1,15]],15:[[1,14]],16:[[1,13]],17:[[1,13]],18:[[1,12]],19:[[1,12]],20:[[1,11]],21:[[1,11]],22:[[2,10]],23:[[3,9]],24:[[4,8]]};
  const mask=Array.from({length:32},()=>Array(32).fill(false));
  for(const [sy,runs]of Object.entries(rows)){const y=Number(sy)+(Number(sy)<17?phase:0);for(const [l,r]of runs)for(let x=l;x<=r;x++)mask[y][x]=true;}
  const on=(x,y)=>!!mask[y]?.[x];for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(on(x,y)){let c='G';if((x>=10&&x<=13&&y>=10&&y<=17)||(x===4&&y>=14)||(y>=21&&x>=6))c='S';if((y===7+phase&&x===16)||(y===8+phase&&(x===15||x===16)))c='S';if(!on(x-1,y)||!on(x+1,y)||!on(x,y-1)||!on(x,y+1))c='O';put(x,y,c);}
  return {width:w,height:h,data};
 }
 if(kind==='eyes'){
  if(ai===2)return {width:w,height:h,data};
  const old=reference.layers.find(l=>l.sheetIndex===10&&l.name==='眼睛 / 02 青蓝·粉下缘'),ref=decode(old.frameData[`10_${ai}_${fi}`]);
  let eyeY=32;for(let y=0;y<32;y++)for(let x=0;x<32;x++){const c=sample(ref,x,y);if(c[3]&&c[0]<100&&c[1]<150)eyeY=Math.min(eyeY,y);}
  if(ai===2)return {width:w,height:h,data};
  if(ai===0){for(let y=0;y<5;y++)for(let x=0;x<5;x++){const c=sample(sourceImage,12+x,14+y);if(c[3])put(16+x,eyeY+y,c);}}
  else {for(let y=0;y<5;y++)for(let x=0;x<32;x++){const c=sample(sourceImage,x,13+y);if(c[3])put(x,eyeY+y,c);}}
  return {width:w,height:h,data};
 }
 if(kind==='mouth'){
  if(ai===1){put(16,17+phase,'P');put(17,17+phase,'P');}
  return {width:w,height:h,data};
 }
 if(kind==='accessory'&&ai===0){
  for(let y=0;y<5;y++)for(let x=0;x<5;x++){const c=sample(sourceImage,4+x,8+y);if(c[3])put(6+x,7+phase+y,c);}return {width:w,height:h,data};
 }
 if(kind==='outfit'){
  const top=(ai===0?20:20)+(ai===2&&fi>=2?2:phase),waist=top+3,hem=28;
  for(let y=top;y<=hem;y++){
   let l=ai===0?6:10,r=ai===0?19:23;
   if(y>waist){l=ai===0?7:9;r=ai===0?22:24;}
   if(y===hem){l=ai===0?9:10;r=ai===0?21:23;}
   for(let x=l;x<=r;x++){if(y===top&&x>=(ai===0?12:14)&&x<=(ai===0?16:19))continue;let c='W';if(x===l||x===r||y===hem)c='O';else if(y===waist||(ai===0&&x===9)||(ai!==0&&y>waist&&(x===13||x===20)))c='D';else if(ai===0&&y>waist&&x>=19)c='F';put(x,y,c);}
  }
  // The white skirt drapes across the seated lap, leaving knees/feet readable.
  if(ai===1){range(28,10,13,'O');range(28,20,23,'O');range(28,14,19,'W');range(29,14,19,'O');}
  const body=original.layers.find(l=>l.sheetIndex===10&&l.name==='body'&&l.frameData[`10_${ai}_${fi}`]),bd=decode(body.frameData[`10_${ai}_${fi}`]);
  for(let x=0;x<32;x++){const c=sample(bd,x,30);if(c[3]&&c[0]>150&&c[1]>100)put(x,31,'K');}
  return {width:w,height:h,data};
 }
 return null;
};
