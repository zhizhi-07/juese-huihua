pal({k:'#464650',w:'#ded9bf',W:'#f1e8cf',d:'#bcb69e',t:'#b3957e',T:'#d0b698',b:'#876f63',B:'#6b615d',g:'#80b59a',G:'#588575',h:'#b5d4b5',s:'#8ba7a0',S:'#657e7b',r:'#bc8e8e',y:'#cec08d',p:'#a69ab6'});
scene('floor',{w:160,h:144},c=>{
c.rect(3,4,154,136,'k');c.rect(4,5,152,134,'w');c.rect(5,6,150,24,'T');c.rect(5,7,150,2,'W');c.rect(5,26,150,3,'b');
c.rect(5,30,150,108,'w');
for(let y=30;y<138;y+=16)for(let x=5;x<155;x+=16){c.rect(x,y,Math.min(16,155-x),1,'d');c.rect(x,y,1,Math.min(16,138-y),'d');}
c.rect(6,137,148,2,'b');c.rect(65,136,30,4,'k');c.rect(66,135,28,3,'G');c.rect(69,136,22,1,'g');
});
sprite('_shelf',{w:26,h:33},c=>{
c.rect(0,0,26,31,'k');c.rect(1,1,24,28,'t');c.rect(2,2,22,27,'b');
for(let y=8;y<28;y+=9){c.rect(2,y,22,2,'T');c.rect(2,y+2,22,1,'k');c.rect(3,y+1,20,1,'t');for(let j=0;j<4;j++){let x=3+j*5;let col=['g','r','y','p'][(j+y)%4];c.rect(x,y-5,4,5,col);c.rect(x,y-5,3,1,'W');c.rect(x+1,y-3,2,1,'w');}}
c.rect(1,1,1,29,'T');c.rect(24,1,1,29,'B');c.rect(2,31,3,2,'k');c.rect(21,31,3,2,'k');
});
sprite('_fridge',{w:22,h:34},c=>{
c.rect(0,0,22,33,'k');c.rect(1,1,20,30,'g');c.rect(2,2,18,4,'h');c.rect(3,3,16,1,'W');c.rect(2,7,18,22,'k');c.rect(3,8,16,20,'S');
for(let y=12;y<28;y+=7){for(let x=4;x<19;x+=5){c.rect(x,y-2,3,4,'h');c.rect(x+1,y-3,1,1,'W');c.rect(x,y,3,1,'g');}c.rect(3,y+3,16,1,'s');}
c.rect(10,7,1,22,'k');c.rect(8,17,1,4,'w');c.rect(12,17,1,4,'w');c.rect(3,30,16,1,'G');c.rect(2,33,3,1,'k');c.rect(17,33,3,1,'k');
});
scene('fixtures',{w:160,h:144},
stamp('_fridge',11,13),stamp('_fridge',34,13),stamp('_fridge',57,13),stamp('_shelf',87,15),stamp('_shelf',119,15),
stamp('_shelf',58,63),stamp('_shelf',58,99),stamp('_shelf',98,63),stamp('_shelf',98,99),c=>{
// Wood checkout: visible top plane and mint front.
c.rect(10,62,32,49,'k');c.rect(11,63,30,17,'T');c.rect(12,64,28,1,'W');c.rect(11,81,30,28,'g');c.rect(12,82,28,2,'h');c.rect(13,87,25,1,'G');c.rect(13,106,25,2,'G');c.rect(39,81,2,28,'G');
c.rect(15,69,11,7,'k');c.rect(16,70,9,5,'s');c.rect(17,70,7,1,'h');c.rect(19,76,3,2,'k');c.rect(16,78,10,1,'b');c.rect(29,75,7,4,'k');c.rect(30,76,5,1,'W');
// Small bag stand and coffee machine.
c.rect(12,44,28,14,'k');c.rect(13,45,26,5,'T');c.rect(13,51,26,6,'g');c.rect(15,39,9,10,'k');c.rect(16,40,7,4,'S');c.rect(18,45,3,3,'w');c.rect(26,43,4,6,'W');c.rect(31,43,4,6,'W');c.rect(27,42,2,1,'b');c.rect(32,42,2,1,'b');
// Right-hand freezer with glass top.
c.rect(132,67,16,33,'k');c.rect(133,68,14,16,'h');c.rect(134,69,12,13,'s');c.rect(135,71,4,4,'r');c.rect(141,75,4,5,'y');c.rect(135,77,4,4,'W');c.rect(139,69,1,13,'k');c.rect(133,84,14,14,'g');c.rect(134,85,12,1,'h');c.rect(143,89,2,5,'G');
// Basket stack.
c.rect(16,120,15,10,'k');c.rect(17,121,13,7,'g');c.rect(18,123,11,1,'G');c.rect(18,126,11,1,'G');c.rect(18,118,11,1,'k');c.rect(17,119,1,3,'k');c.rect(29,119,1,3,'k');
// Plant beside entrance.
c.rect(137,124,8,8,'k');c.rect(138,125,6,6,'t');c.rect(137,123,8,2,'T');c.rect(140,113,1,10,'G');c.rect(136,115,4,3,'g');c.rect(142,117,4,3,'g');c.rect(138,110,3,5,'h');c.rect(143,112,2,4,'G');
// Wall clock.
c.rect(80,8,5,6,'k');c.rect(81,9,3,4,'W');c.rect(82,10,1,2,'b');
});
scene('convenience-store',{w:160,h:144},stamp('floor',0,0),stamp('fixtures',0,0));

