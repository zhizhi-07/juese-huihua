pal({k:'#464B4F',m:'#B5B2AC',w:'#D4D0CD',h:'#EBF0EE',b:'#99BAB5',s:'#839EA6',d:'#566178',B:'#6C8091',g:'#8AC290',q:'#BED4C8'});
scene('chair-side',{w:32,h:32},c=>{
c.rect(5,10,2,1,'k');c.rect(4,11,4,7,'k');c.rect(5,11,2,5,'b');c.rect(5,11,1,4,'q');c.rect(6,16,1,2,'s');
c.rect(7,17,7,1,'k');c.rect(6,18,9,3,'k');c.rect(7,18,7,2,'b');c.rect(8,18,5,1,'q');c.rect(7,20,7,1,'s');
c.rect(7,21,1,5,'B');c.rect(13,21,1,5,'B');c.rect(7,26,1,1,'k');c.rect(13,26,1,1,'k');
});
scene('counter-side',{w:32,h:32},c=>{
// Actual longitudinal extent: y2..29 = 28 pixels, matching the front's x2..29.
c.rect(20,2,9,1,'k');c.rect(18,3,13,1,'k');c.rect(17,4,15,21,'k');c.rect(18,25,13,4,'k');c.rect(20,29,9,1,'k');
c.rect(20,3,9,1,'h');c.rect(18,4,13,18,'m');c.rect(18,5,1,16,'h');c.rect(30,5,1,17,'s');
c.rect(19,21,11,1,'s');c.rect(19,22,11,1,'d');c.rect(19,23,11,5,'w');c.rect(19,23,1,4,'h');c.rect(29,23,1,4,'m');c.rect(20,28,9,1,'B');
});
scene('register-side',{w:32,h:32},c=>{
c.rect(22,5,4,1,'k');c.rect(21,6,6,2,'k');c.rect(22,6,4,1,'q');c.rect(22,7,1,1,'g');
c.rect(27,11,2,1,'k');c.rect(26,12,4,6,'k');c.rect(27,12,2,5,'B');c.rect(26,13,1,4,'b');c.rect(27,17,2,1,'s');
c.rect(21,17,5,1,'k');c.rect(20,18,8,3,'k');c.rect(21,18,6,2,'s');c.rect(21,18,1,2,'q');
});
scene('checkout-side',{w:32,h:32},stamp('chair-side',0,0),stamp('counter-side',0,0),stamp('register-side',0,0));
