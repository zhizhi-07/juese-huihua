pal({k:'#464B4F',m:'#B5B2AC',w:'#D4D0CD',h:'#EBF0EE',b:'#99BAB5',s:'#839EA6',d:'#566178',B:'#6C8091',g:'#8AC290',q:'#BED4C8'});
scene('chair-side',{w:32,h:48},c=>{
// The chair sits behind the long counter; its back is seen edge-on.
c.rect(5,15,2,1,'k');c.rect(4,16,4,8,'k');c.rect(5,16,2,6,'b');c.rect(5,16,1,5,'q');c.rect(6,22,1,2,'s');
c.rect(7,23,7,1,'k');c.rect(6,24,9,3,'k');c.rect(7,24,7,2,'b');c.rect(8,24,5,1,'q');c.rect(7,26,7,1,'s');
c.rect(6,27,2,1,'k');c.rect(7,28,1,4,'B');c.rect(13,27,1,5,'B');c.rect(7,32,1,1,'k');c.rect(13,32,1,1,'k');
});
scene('counter-side',{w:32,h:48},c=>{
// RPG side view: the counter's long axis runs up the canvas, not across it.
c.rect(20,3,9,1,'k');c.rect(18,4,13,1,'k');c.rect(17,5,15,33,'k');c.rect(18,38,13,4,'k');c.rect(20,42,9,1,'k');
c.rect(20,4,9,1,'h');c.rect(18,5,13,29,'m');c.rect(18,6,1,27,'h');c.rect(30,6,1,28,'s');
c.rect(19,33,11,1,'s');c.rect(19,34,11,1,'d');
// Only the narrow end fascia is visible below the long top plane.
c.rect(19,35,11,5,'w');c.rect(19,35,1,4,'h');c.rect(29,35,1,4,'m');c.rect(20,40,9,1,'w');c.rect(20,41,9,1,'B');
});
scene('register-side',{w:32,h:48},c=>{
// Small payment terminal at the far end of the worktop.
c.rect(22,8,4,1,'k');c.rect(21,9,6,2,'k');c.rect(22,9,4,1,'q');c.rect(22,10,1,1,'g');c.rect(25,11,1,1,'B');
// A narrow side/back monitor, with its support and cash-box body below it.
c.rect(27,16,2,1,'k');c.rect(26,17,4,8,'k');c.rect(27,17,2,7,'B');c.rect(26,18,1,5,'b');c.rect(27,24,2,1,'s');
c.rect(27,25,1,2,'d');
c.rect(21,24,5,1,'k');c.rect(20,25,8,4,'k');c.rect(21,25,6,2,'s');c.rect(21,25,1,2,'q');c.rect(22,28,5,1,'B');
});
scene('checkout-side',{w:32,h:48},stamp('chair-side',0,0),stamp('counter-side',0,0),stamp('register-side',0,0));
