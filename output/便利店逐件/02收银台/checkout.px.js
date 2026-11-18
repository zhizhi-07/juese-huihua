pal({k:'#464B4F',d:'#9E7565',t:'#BA9273',h:'#CFB07C',a:'#AC846C',g:'#8AC290',G:'#68A88E',s:'#4D8A7E',w:'#BED4C8',W:'#EBF0EE',b:'#99BAB5',B:'#839EA6',r:'#C9ADAB',p:'#BDB395'});
scene('counter',{w:32,h:32},c=>{
// Low counter with a visible top plane and stepped, softly rounded ends.
c.rect(5,12,22,1,'k');c.rect(3,13,26,1,'k');c.rect(2,14,28,9,'k');c.rect(3,23,26,5,'k');c.rect(5,28,22,1,'k');
c.rect(5,13,22,1,'h');c.rect(3,14,26,6,'t');c.rect(3,15,1,4,'h');c.rect(28,15,1,5,'a');c.rect(4,20,24,1,'a');c.rect(5,21,22,1,'d');
// Mint front; top and bottom shading is shallow, never a black grid.
c.rect(4,22,24,4,'g');c.rect(5,26,22,1,'g');c.rect(6,27,20,1,'G');c.rect(4,22,1,3,'w');c.rect(27,22,1,3,'G');
c.rect(18,22,1,4,'G');c.rect(20,23,1,1,'s');c.rect(24,23,1,1,'s');
c.rect(5,28,3,1,'d');c.rect(24,28,3,1,'d');
});
scene('register',{w:32,h:32},c=>{
// Small modern monitor: one-pixel rim, pale glass and a short stand.
c.rect(7,5,8,1,'k');c.rect(6,6,10,5,'k');c.rect(7,11,8,1,'k');
c.rect(7,6,8,4,'B');c.rect(7,6,7,3,'b');c.rect(8,6,6,1,'w');c.rect(8,8,3,1,'g');c.rect(12,8,1,1,'W');c.rect(8,10,5,1,'w');
c.rect(10,12,2,2,'k');c.rect(9,13,4,1,'B');
// Cash drawer top and a short keypad, rather than a second black rectangle.
c.rect(6,14,10,1,'w');c.rect(5,15,12,2,'b');c.rect(6,17,10,1,'k');c.rect(6,16,10,1,'B');c.rect(9,16,3,1,'w');
c.rect(13,14,3,1,'k');c.rect(14,14,1,1,'w');
// Compact card reader on the right, tilted by a one-pixel step.
c.rect(21,14,3,1,'k');c.rect(20,15,5,2,'k');c.rect(21,17,3,1,'B');c.rect(21,15,3,1,'w');c.rect(21,16,1,1,'g');c.rect(23,16,1,1,'r');
});
scene('bag',{w:32,h:32},c=>{
// Rounded paper-bag corners and a small loop handle.
c.rect(25,9,2,1,'d');c.rect(24,10,1,2,'d');c.rect(27,10,1,2,'d');
c.rect(23,12,6,4,'a');c.rect(24,11,4,5,'t');c.rect(24,12,3,3,'h');c.rect(24,16,4,1,'d');c.rect(26,13,1,1,'t');
});
scene('checkout',{w:32,h:32},stamp('counter',0,0),stamp('register',0,0),stamp('bag',0,0));
