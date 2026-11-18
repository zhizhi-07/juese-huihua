pal({k:'#464B4F',w:'#BED4C8',W:'#EBF0EE',b:'#99BAB5',B:'#839EA6',g:'#8AC290',r:'#C9ADAB',y:'#E3D176',Y:'#E6DFA1',s:'#6C8091'});
scene('register',{w:32,h:32},c=>{
// A small yellow customer display on a short stalk, not a computer monitor.
c.rect(9,6,5,1,'s');c.rect(8,7,7,5,'s');c.rect(9,12,5,1,'B');
c.rect(9,7,5,5,'y');c.rect(9,7,1,3,'Y');c.rect(10,7,1,3,'B');c.rect(12,7,1,3,'B');
c.rect(11,12,1,1,'s');
// Plain low cash box with a slightly raised keypad and one drawer slot.
c.rect(6,13,12,1,'k');c.rect(5,14,14,3,'k');c.rect(6,17,12,1,'s');
c.rect(6,14,12,1,'w');c.rect(6,15,12,2,'B');c.rect(7,15,10,1,'w');
c.rect(7,14,4,1,'B');c.rect(8,14,1,1,'W');c.rect(10,14,1,1,'W');
c.rect(13,14,3,1,'s');c.rect(14,14,1,1,'W');
c.rect(8,16,7,1,'s');c.rect(10,16,3,1,'w');
// Existing payment terminal, unchanged.
c.rect(21,14,3,1,'k');c.rect(20,15,5,2,'k');c.rect(21,17,3,1,'B');c.rect(21,15,3,1,'w');c.rect(21,16,1,1,'g');c.rect(23,16,1,1,'r');
});
scene('layout',{w:64,h:48});

