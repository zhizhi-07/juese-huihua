pal({k:'#464B4F',o:'#4D8A7E',d:'#68A88E',g:'#8AC290',h:'#BED4C8',w:'#EBF0EE',v:'#99BAB5',s:'#839EA6',t:'#BA9273',T:'#CFB07C',b:'#9E7565',r:'#C9ADAB',p:'#BDB395',a:'#AC846C'});
scene('cabinet',{w:32,h:48},c=>{
// Two-pixel stepped corners, with only a single contour around the silhouette.
c.rect(7,4,18,1,'k');c.rect(5,5,22,1,'k');c.rect(4,6,24,32,'k');c.rect(5,38,22,2,'k');c.rect(7,40,18,1,'o');
c.rect(6,5,20,1,'h');c.rect(5,6,22,31,'g');c.rect(6,37,20,2,'g');c.rect(7,39,18,1,'d');
c.rect(26,7,1,30,'d');c.rect(25,37,1,1,'d');c.rect(5,8,1,26,'h');
// A shallow cap and a soft wood trim, rather than a dark metal billboard.
c.rect(7,6,16,1,'h');c.rect(6,7,1,4,'h');c.rect(7,11,18,1,'d');c.rect(6,12,20,1,'t');c.rect(6,12,3,1,'T');c.rect(6,13,20,1,'a');
// Pale glass interior; small darker strips sit only under the top and at the right.
c.rect(6,15,20,20,'v');c.rect(7,14,18,1,'d');c.rect(6,15,1,19,'d');c.rect(25,15,1,19,'d');
for(const y of [22,29,35]){c.rect(7,y,18,1,'h');}
c.rect(7,36,18,1,'g');c.rect(8,37,16,1,'d');c.rect(9,38,14,1,'g');
c.rect(7,40,3,1,'b');c.rect(22,40,3,1,'b');
});
scene('products',{w:32,h:48},c=>{
// Rounded shoulders, small off-centre labels, and no black product outlines.
c.rect(9,16,1,1,'h');c.rect(9,17,1,1,'d');c.rect(8,18,3,3,'g');c.rect(9,21,1,1,'d');c.rect(8,19,2,1,'h');
c.rect(12,19,3,2,'r');c.rect(13,18,1,1,'r');c.rect(12,19,2,1,'w');c.rect(13,21,1,1,'p');
c.rect(18,18,3,4,'h');c.rect(19,17,1,1,'w');c.rect(18,19,2,2,'w');c.rect(20,19,1,2,'v');
c.rect(22,19,2,3,'g');c.rect(22,18,2,1,'h');c.rect(22,20,1,1,'w');
// Soft paper bags: inset top/bottom pixels and unequal heights.
c.rect(8,25,4,3,'T');c.rect(9,24,2,1,'T');c.rect(9,28,2,1,'t');c.rect(9,26,2,1,'h');
c.rect(13,26,2,2,'r');c.rect(13,25,1,1,'h');c.rect(13,28,1,1,'p');
c.rect(18,25,3,3,'r');c.rect(19,24,1,1,'r');c.rect(19,28,1,1,'a');c.rect(18,26,2,1,'h');
c.rect(22,27,3,2,'p');c.rect(23,26,1,1,'h');c.rect(23,28,1,1,'T');
// Two low jars and an oval-ended bread parcel at the bottom.
c.rect(8,32,3,2,'g');c.rect(9,31,1,1,'t');c.rect(9,34,1,1,'d');c.rect(8,32,2,1,'h');
c.rect(12,33,3,1,'p');c.rect(13,32,1,1,'h');c.rect(13,34,1,1,'p');
c.rect(19,32,4,3,'t');c.rect(18,33,6,1,'t');c.rect(19,32,3,1,'T');c.rect(21,33,1,2,'h');
});
scene('glass',{w:32,h:48},c=>{
// Fine softly coloured rims, not continuous white or black cages.
c.rect(7,15,1,20,'h');c.rect(8,14,6,1,'h');c.rect(17,14,7,1,'h');
c.rect(15,15,1,20,'d');c.rect(16,15,1,20,'g');
c.rect(24,15,1,20,'g');c.rect(8,35,7,1,'d');c.rect(17,35,7,1,'d');
// Two small warm handles, with softened end pixels.
c.rect(14,24,1,3,'T');c.rect(14,23,1,1,'h');c.rect(14,27,1,1,'t');
c.rect(17,24,1,3,'T');c.rect(17,23,1,1,'h');c.rect(17,27,1,1,'t');
c.rect(8,16,1,1,'h');c.rect(23,30,1,1,'h');
});
scene('cabinet-complete',{w:32,h:48},stamp('cabinet',0,0),stamp('products',0,0),stamp('glass',0,0));
