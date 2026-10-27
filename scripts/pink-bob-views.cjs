module.exports=function(ImageData,ai,kind){
const im=new ImageData(32,32),P={O:[118,88,93,255],B:[243,169,192,255],S:[220,135,159,255]},set=(x,y,c)=>{if(x>=0&&x<32&&y>=0&&y<32)im.data.set(P[c],(y*32+x)*4);},row=(y,a,b,c)=>{for(let x=a;x<=b;x++)set(x,y,c);};
const cap=[[1,13,20],[2,11,22],[3,9,24],[4,8,25],[5,7,26],[6,6,27],[7,6,27],[8,5,28],[9,5,28],[10,5,28],[11,5,28],[12,5,28],[13,5,28],[14,5,28],[15,6,27],[16,6,27],[17,7,26],[18,8,25],[19,10,23]];
if(ai===2&&kind==='front')return im;
if(ai===2){for(const [y,a,b]of cap)row(y,a,b,'O');for(let j=1;j<cap.length-1;j++){const [y,a,b]=cap[j],prev=cap[j-1];row(y,Math.max(a+1,prev[1]),Math.min(b-1,prev[2]),'B');}for(const [y,a,b]of [[8,7,8],[9,7,8],[10,7,8],[14,8,9],[15,8,10],[16,9,11],[17,10,12],[18,12,15]]){row(y,a,b,'S');row(y,33-b,33-a,'S');}}
else if(kind==='front'){
for(const [y,a,b]of cap.slice(0,10))row(y,a-1,b-2,'O');for(let j=1;j<10;j++){const [y,a,b]=cap[j],prev=cap[j-1];row(y,Math.max(a,prev[1]-1),Math.min(b-3,prev[2]-2),'B');}
for(const [y,a,b]of [[10,6,13],[11,6,12],[12,6,11],[13,6,10],[14,6,9],[15,6,9],[16,7,9],[17,8,9],[10,17,24],[11,18,24],[12,19,24],[13,20,24],[14,21,24],[15,22,24],[16,23,24]]){row(y,a,b,'O');if(b-a>1)row(y,a+1,b-1,'B');}
for(const [x,y]of [[9,9],[9,10],[8,11],[8,12],[8,13],[8,14],[20,10],[21,11],[22,12]])set(x,y,'S');
}
if(kind==='rear'){
if(ai===0){for(const [y,a,b]of cap.slice(2)){row(y,a+1,Math.min(28,b),'O');if(b-a>2)row(y,a+2,Math.min(27,b-1),'B');}for(let y=11;y<=17;y++)row(y,9,10,'S');}
const pat=['..OOO..','.OBBBO.','OBBBBBO','OBBBBBO','OBBSSBO','.OSSBO.','..OOO..'];for(const [ox,oy]of ai===2?[[1,13],[26,13]]:[[3,13],[25,13]])for(let y=0;y<7;y++)for(let x=0;x<7;x++)if(pat[y][x]!=='.')set(ox+x,oy+y,pat[y][x]);
}return im;
};
