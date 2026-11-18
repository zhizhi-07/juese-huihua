pal({k:'#464B4F',m:'#B5B2AC',w:'#D4D0CD',h:'#EBF0EE',b:'#99BAB5',s:'#839EA6',d:'#566178',B:'#6C8091',g:'#8AC290',r:'#C9ADAB',q:'#BED4C8'});
scene('chair-side',{w:32,h:32},c=>{
// Thin upholstered back seen edge-on; the seat points toward the counter.
c.rect(4,14,2,1,'k');c.rect(3,15,4,7,'k');c.rect(4,15,2,5,'b');c.rect(4,15,1,4,'q');c.rect(5,20,1,2,'s');
c.rect(5,21,7,1,'k');c.rect(4,22,9,2,'k');c.rect(5,22,7,1,'b');c.rect(6,22,5,1,'q');c.rect(5,23,7,1,'s');
c.rect(5,24,1,4,'B');c.rect(11,24,1,4,'B');c.rect(5,28,1,1,'k');c.rect(11,28,1,1,'k');
});
scene('counter-side',{w:32,h:32},c=>{
// One side panel only; no front drawers or front-facing handles.
c.rect(15,12,11,1,'k');c.rect(13,13,15,1,'k');c.rect(12,14,17,5,'k');
c.rect(13,19,15,9,'k');c.rect(15,28,11,1,'k');
c.rect(15,13,11,1,'h');c.rect(13,14,15,4,'m');c.rect(13,15,1,2,'h');c.rect(27,15,1,3,'s');
c.rect(14,18,13,1,'s');c.rect(14,19,13,1,'d');
c.rect(14,20,13,6,'w');c.rect(15,26,11,1,'w');c.rect(14,20,1,4,'h');c.rect(26,20,1,5,'m');
c.rect(15,27,11,1,'s');c.rect(15,28,2,1,'d');c.rect(24,28,2,1,'d');
});
scene('register-side',{w:32,h:32},c=>{
// The broad monitor becomes a slim, slightly leaning profile from this side.
c.rect(16,10,2,1,'k');c.rect(15,11,4,4,'k');c.rect(14,15,4,2,'k');
c.rect(16,11,2,3,'B');c.rect(15,12,1,3,'b');c.rect(15,15,2,1,'B');c.rect(16,16,1,1,'s');
c.rect(16,17,2,1,'d');c.rect(14,18,8,1,'k');c.rect(15,17,6,1,'s');c.rect(16,17,3,1,'q');
// Edge-on payment terminal: tiny display and its angled stand.
c.rect(24,14,2,1,'k');c.rect(23,15,4,2,'k');c.rect(24,15,2,1,'q');c.rect(24,16,1,1,'g');c.rect(25,17,1,1,'B');
});
scene('checkout-side',{w:32,h:32},stamp('chair-side',0,0),stamp('counter-side',0,0),stamp('register-side',0,0));
