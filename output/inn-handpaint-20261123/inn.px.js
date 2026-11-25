// 从空白画布绘制。只含手写坐标、色卡和绘图命令；不加载任何图片。
// 66x78；屋顶、木梁墙体、阳台、四窗、招牌、门、告示壁灯、四盆植物独立。
pal({
 k:'#2f3b3d',v:'#464b4f',s:'#5c6163',q:'#7b7d77',m:'#999991',l:'#b5b2ac',h:'#d4d0cd',w:'#ebf0ee',
 D:'#57483b',d:'#6e5f4d',t:'#8a7b63',T:'#a3987a',
 r:'#80575b',R:'#9e7565',b:'#ba9273',B:'#d1ae8a',
 n:'#566178',a:'#6c8091',A:'#839ea6',c:'#99bab5',C:'#bed4c8',
 o:'#ba9745',O:'#e0ac6c',y:'#e8cd97',Y:'#e6dfa1',
 g:'#4b6c2e',G:'#6d8740',f:'#8aa355',F:'#aabd68',
 u:'#336c7a',U:'#438c91'
});
const size={w:66,h:78};
// 墙体、承重木梁。上部沿斜屋檐，不画屋顶覆盖部分。
scene('wall',size,c=>{
 c.poly([18,29,63,19,65,19,65,72,1,72,1,48,18,48],'k');
 c.rect(2,49,17,22,'R');c.rect(3,50,2,19,'b');c.rect(5,50,14,21,'q');
 c.rect(6,51,13,19,'m');c.rect(7,52,12,17,'l');
 c.vline(5,51,19,'s');c.hline(7,51,11,'q');
 // 右侧全高木柱与上层灰墙。
 c.rect(61,20,3,51,'R');c.vline(63,21,49,'r');c.vline(61,22,47,'b');
 c.poly([21,30,60,21,61,21,61,44,21,44],'q');
 c.poly([22,30,60,22,60,43,22,43],'l');
 c.poly([22,29,59,21,60,22,23,31],'m');
 c.rect(22,42,38,1,'h');c.rect(22,43,38,1,'q');
 c.rect(19,30,3,16,'R');c.vline(20,30,15,'b');
 // 层间横梁。
 c.rect(20,44,41,5,'k');c.rect(21,45,39,3,'R');c.hline(21,45,39,'T');c.hline(21,47,39,'r');
 // 下层灰墙、底座，门窗另外绘制。
 c.rect(21,49,40,22,'q');c.rect(22,50,38,20,'l');c.hline(22,50,38,'m');
 c.rect(22,70,39,2,'r');c.hline(22,70,38,'t');
 // 原图有缘由的少量旧灰墙斑迹，不撒随机噪点。
 c.px(36,27,'m');c.px(45,25,'m');c.px(53,24,'m');c.px(31,30,'m');
 c.rect(55,51,1,2,'m');c.px(58,61,'m');c.px(24,64,'m');
 c.rect(3,66,2,1,'B');c.rect(62,65,1,2,'b');
});
// 左侧窄阳台：镂空的上栏杆、实体花台、竖排下栏杆。
scene('balcony',size,c=>{
 c.rect(1,24,13,1,'t');c.vline(1,24,9,'t');
 c.vline(2,25,8,'d');c.vline(6,26,5,'r');c.vline(10,26,5,'r');
 c.rect(0,30,19,19,'k');c.rect(1,31,17,9,'t');c.hline(1,31,17,'R');
 c.rect(2,32,3,6,'T');c.rect(6,32,3,6,'b');c.rect(10,32,3,6,'T');c.rect(14,32,3,6,'b');
 for(const x of [1,5,9,13,17])c.vline(x,31,8,'d');
 c.hline(1,38,17,'b');c.hline(1,39,17,'k');
 c.rect(1,40,17,6,'d');
 for(const x of [2,5,8,11,14,17]){c.vline(x,41,4,'T');c.vline(x+1,41,4,'k');}
 c.hline(1,45,17,'k');c.rect(1,46,18,2,'R');c.hline(1,46,18,'t');
 c.vline(18,30,17,'r');
});
// 四扇同高窄窗，逐层嵌入框、木衬、黄色玻璃。
scene('windows',size,c=>{
 for(const x of [23,32,41,50]){
  c.rect(x,31,8,11,'q');c.rect(x+1,32,6,9,'k');
  c.rect(x+2,33,4,7,'t');c.hline(x+2,33,4,'r');
  c.rect(x+2,35,4,5,'O');c.rect(x+2,36,4,3,'y');c.rect(x+3,36,2,3,'Y');
  c.hline(x+1,41,6,'h');c.vline(x,32,9,'m');
 }
});
// 招牌上的字符是像素笔画，不调用字体、不替换成大幅排版。
scene('sign',size,c=>{
 c.rect(20,43,22,11,'k');c.rect(21,44,20,9,'m');c.rect(21,45,20,7,'h');
 c.hline(21,44,20,'l');c.hline(21,52,20,'l');
 c.vline(22,47,4,'s');
 c.vline(25,47,4,'s');c.vline(28,47,4,'s');c.hline(25,48,4,'s');
 c.vline(30,47,4,'s');c.vline(33,47,4,'s');c.hline(30,48,4,'s');
 // 小床符号。
 c.vline(35,47,4,'s');c.hline(35,50,6,'s');c.hline(37,48,3,'s');c.hline(36,49,5,'s');c.vline(40,49,2,'s');
 c.rect(19,54,24,4,'k');c.rect(20,54,22,3,'G');
 for(let x=20;x<42;x+=5){c.rect(x,55,3,2,'C');c.hline(x,55,3,'Y');}
 c.hline(20,54,22,'m');c.hline(20,57,22,'g');c.px(19,55,'s');c.px(42,55,'s');
});
scene('door',size,c=>{
 c.rect(21,58,21,14,'k');c.rect(22,58,19,13,'r');
 c.vline(22,58,13,'t');c.vline(40,58,13,'t');
 c.rect(23,59,7,11,'O');c.rect(24,60,6,10,'y');c.rect(24,64,6,6,'Y');
 c.rect(32,59,7,11,'O');c.rect(32,60,6,10,'y');c.rect(32,64,6,6,'Y');
 c.rect(30,58,2,13,'d');c.vline(31,59,11,'r');
 c.hline(22,71,19,'t');c.hline(23,72,17,'q');
});
scene('fixtures',size,c=>{
 // 左告示牌。
 c.rect(8,54,9,9,'s');c.rect(9,55,7,7,'A');c.rect(10,56,6,5,'h');
 c.vline(11,57,2,'r');c.hline(13,58,2,'r');c.hline(11,60,4,'t');c.hline(10,62,6,'m');
 // 右壁灯挂件、灯帽、暖光玻璃及下框。
 c.rect(47,53,3,2,'k');c.rect(48,53,1,2,'s');c.rect(46,55,5,1,'k');
 c.rect(46,56,5,1,'s');c.rect(47,57,4,5,'k');c.rect(48,57,2,4,'O');
 c.rect(48,58,2,3,'Y');c.vline(47,58,3,'t');c.hline(48,62,2,'t');
});
// 叶片全部是手写小网格与色块，不采样任何照片/截图，不撒点。
function leaves(c,x,y,kind){
 const grids=[
 ['...kk...','..kgGk..','.kfGGgk.','kkGgfgkk','kGfggGgk','.kgfGgk.','..kggk..','...kk...'],
 ['...kk...','..kGfk..','.kgGGgk.','.kGfGgk.','kggGfgGk','.kGgggk.','..kggk..','...kk...'],
 ['..kk....','.kGfk...','kkfGgk..','kGgGfgkk','.kgGggGk','..kGfgk.','...kgk..','...kk...'],
 ['....kk..','...kGfk.','..kggGk.','.kGfGggk','kggGfgGk','.kGgGgk.','..kggk..','...kk...']
 ];
 grids[kind].forEach((row,yy)=>[...row].forEach((col,xx)=>{if(col!=='.')c.px(x+xx,y+yy,col)}));
}
function pot(c,x,y,blue){
 c.poly([x,y,x+8,y,x+8,y+3,x+7,y+3,x+7,y+5,x+2,y+5,x+2,y+4,x+1,y+4,x+1,y+2,x,y+2],'k');
 c.rect(x+1,y+1,6,2,blue?'A':'R');c.hline(x+1,y+1,6,blue?'c':'b');
 c.rect(x+2,y+3,4,1,blue?'u':'r');c.hline(x+2,y+4,4,'v');
}
scene('plants',size,c=>{
 pot(c,6,70,false);leaves(c,6,64,0);
 pot(c,14,72,false);leaves(c,14,65,1);
 pot(c,43,72,false);leaves(c,43,65,2);
 pot(c,54,71,true);leaves(c,54,63,3);
});
// 独立的斜坡瓦顶，按列画阶梯边；每条瓦缝手定行距及错缝。
scene('roof',size,c=>{
 for(let x=14;x<=65;x++){
  const top=Math.floor((65-x)/5),bottom=top+19;
  c.vline(x,top,bottom-top+1,'k');
  if(x<65){c.vline(x,top+1,17,'a');c.px(x,top,'A');c.px(x,bottom-3,'A');c.vline(x,bottom-2,2,'n');}
 }
 c.vline(65,0,20,'A');c.vline(64,1,17,'a');
 const rows=[
  [[16,5],[26,6],[37,6],[48,6],[58,5]],
  [[14,3],[21,6],[32,6],[43,6],[54,6]],
  [[16,6],[27,6],[38,6],[49,6],[60,3]],
  [[14,4],[23,6],[34,6],[45,6],[56,6]],
  [[17,5],[27,6],[38,6],[49,6],[60,3]]
 ];
 rows.forEach((segments,row)=>{for(const [start,len]of segments){for(let x=start;x<start+len;x++){const y=Math.floor((65-x)/5)+2+row*3;if(y<Math.floor((65-x)/5)+16)c.px(x,y,'n');}}});
});
scene('inn',size,
 stamp('wall',0,0),stamp('balcony',0,0),stamp('windows',0,0),
 stamp('sign',0,0),stamp('door',0,0),stamp('fixtures',0,0),stamp('plants',0,0),stamp('roof',0,0));

