pal({k:'#464650',t:'#af927d',T:'#c5ac92',b:'#806e65',B:'#938071',g:'#81b398',G:'#5d8c7d',w:'#ddd3af',r:'#bb8f91',R:'#936e7c',p:'#a898b3',y:'#c9b77e'});
scene('wood',{w:18,h:32},c=>{
c.rect(1,1,16,29,'k');c.rect(2,2,14,27,'b');c.rect(2,2,14,2,'T');c.rect(3,4,12,24,'B');
c.rect(1,1,2,29,'k');c.rect(2,2,1,27,'T');c.rect(15,1,2,29,'k');c.rect(15,2,1,27,'t');
for(const y of [10,19,28]){c.rect(3,y,12,1,'T');c.rect(3,y+1,12,1,'t');if(y<28)c.rect(3,y+2,12,1,'b');}
c.rect(1,30,3,1,'k');c.rect(14,30,3,1,'k');
});
scene('goods',{w:18,h:32},c=>{
// Two bottles, a tall carton and a small packet.
c.rect(4,5,1,1,'w');c.rect(3,6,3,4,'G');c.rect(4,6,1,3,'g');c.rect(3,8,3,1,'w');
c.rect(8,6,1,1,'w');c.rect(7,7,3,3,'g');c.rect(7,8,3,1,'w');
c.rect(11,5,3,5,'r');c.rect(11,5,3,1,'w');c.rect(12,7,2,1,'R');
// Paper snack bags with folded tops and tiny labels.
c.rect(3,14,4,5,'y');c.rect(4,13,2,1,'T');c.rect(4,15,2,2,'w');c.rect(3,18,4,1,'t');
c.rect(8,15,3,4,'p');c.rect(8,14,3,1,'w');c.rect(9,16,1,1,'w');
c.rect(12,14,3,5,'r');c.rect(12,14,3,1,'w');c.rect(13,16,1,2,'w');
// Unequal grocery boxes and a little jar.
c.rect(3,23,4,5,'g');c.rect(3,23,4,1,'w');c.rect(4,25,2,1,'G');
c.rect(8,24,3,4,'w');c.rect(8,24,3,1,'t');c.rect(9,26,1,1,'r');
c.rect(12,25,3,3,'p');c.rect(12,24,3,1,'b');c.rect(13,26,1,1,'w');
});
scene('shelf',{w:18,h:32},stamp('wood',0,0),stamp('goods',0,0));
