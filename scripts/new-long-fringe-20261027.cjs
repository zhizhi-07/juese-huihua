const {decode}=require('./png.cjs');
const C={outline:[119,119,119,255],base:[209,209,209,255],shade:[178,178,178,255]};
module.exports=function drawHair(source,key,rear){
 const [,a,f]=key.split('_').map(Number),side=a===0,back=a===2;
 const head=source.layers.find(l=>l.sheetIndex===8&&l.name==='head'&&l.frameData[key]);
 const hd=decode(Buffer.from(head.frameData[key].dataURL.split(',')[1],'base64'));
 let headTop=32;for(let y=0;y<24;y++)for(let x=0;x<32;x++)if(hd.data[(y*32+x)*4+3])headTop=Math.min(headTop,y);
 const dy=headTop-2,data=new Uint8Array(4096),mask=Array.from({length:32},()=>Array(32).fill(false));
 const span=(y,l,r)=>{if(y<0||y>=32)return;for(let x=l;x<=r;x++)if(x>=0&&x<32)mask[y][x]=true;};
 const cap=[[12,21],[10,23],[8,25],[7,26],[6,27],[5,28],[4,29],[4,29],[4,29],[4,29],[4,29]];
 if(!rear&&back)return {width:32,height:32,data};
 for(let y=0;y<cap.length;y++)span(y+dy,...cap[y]);
 if(rear){
  for(let y=11;y<=25;y++){
   const l=y>=22?4:y>=19?5:4,r=33-l;
   span(y+dy,l,r);
  }
  span(26+dy,5,9);span(26+dy,11,22);span(26+dy,24,28);
  span(27+dy,6,8);span(27+dy,12,21);span(27+dy,25,27);
 }else{
  const rows=side?{
   11:[[4,13],[16,21],[24,29]],12:[[4,12],[16,21],[25,29]],13:[[4,11],[17,20],[26,29]],
   14:[[4,10],[26,29]],15:[[4,10],[26,29]],16:[[4,10],[26,29]],17:[[4,10],[26,29]],18:[[4,10],[26,29]],
   19:[[4,9],[26,29]],20:[[5,9],[26,28]],21:[[5,8],[26,28]],22:[[6,8],[27,28]],23:[[7,8]]
  }:{
   11:[[4,11],[14,19],[22,29]],12:[[4,10],[14,19],[23,29]],13:[[4,9],[15,18],[24,29]],
   14:[[4,8],[25,29]],15:[[4,8],[25,29]],16:[[4,8],[25,29]],17:[[4,8],[25,29]],18:[[4,8],[25,29]],
   19:[[4,8],[25,29]],20:[[4,8],[25,29]],21:[[5,8],[25,28]],22:[[5,7],[26,28]],23:[[6,7],[26,27]]
  };
  for(const [y,runs]of Object.entries(rows))for(const [l,r]of runs)span(Number(y)+dy,l,r);
 }
 const on=(x,y)=>!!mask[y]?.[x];
 for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(on(x,y)){
  const yy=y-dy,edge=!on(x-1,y)||!on(x+1,y)||!on(x,y-1)||!on(x,y+1);
  let c=C.base;
  if(rear){
   const xl=yy<19?6:yy<23?7:8,xr=33-xl;
   if(yy>=14&&yy<=22&&(x===xl||x===xr))c=C.shade;
   if(yy>=23&&((x>=7&&x<=9)||(x>=24&&x<=26)))c=C.shade;
   if(back&&((yy>=7&&yy<=11&&(x===12||x===21))||(yy>=12&&yy<=17&&(x===11||x===22))||(yy>=23&&yy<=25&&(x===14||x===19))))c=C.shade;
  }else{
   // Short connected wedges sit above the two openings; the side locks shade inward.
   if((yy===8&&(x===12||x===21))||(yy===9&&((x>=11&&x<=12)||(x>=21&&x<=22)))||(yy===10&&((x>=10&&x<=12)||(x>=21&&x<=23))))c=C.shade;
   if(yy>=14&&yy<=20&&((x===7)||(x===26)))c=C.shade;
   if(yy>=20&&((x>=6&&x<=8)||(x>=25&&x<=27)))c=C.shade;
   if(side&&yy>=11&&yy<=19&&x===9)c=C.shade;
  }
  if(edge)c=C.outline;
  data.set(c,(y*32+x)*4);
 }
 // Match established breathing: roots descend 2px, tips descend 1px.
 if(dy===2){const join=18+dy;for(let y=join;y<31;y++)data.copyWithin(y*128,(y+1)*128,(y+2)*128);data.fill(0,31*128);}
 // Tips open before the head sinks and settle after it; roots and bangs do not sway.
 if(f===1||f===2){
  const original=data.slice(),start=(rear?23:20)+dy-(dy===2?1:0);
  for(let y=start;y<32;y++)for(let x=0;x<32;x++){
   const sx=x<=10?x+1:x>=23?x-1:x;
   data.set(original.subarray((y*32+sx)*4,(y*32+sx)*4+4),(y*32+x)*4);
  }
 }
 return {width:32,height:32,data};
};
