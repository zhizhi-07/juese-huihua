pal({k:'#2F3B3D',o:'#464B4F',d:'#4D8A7E',s:'#68A88E',m:'#9E7565',l:'#8AC290',h:'#BED4C8',w:'#EBF0EE',a:'#BA9273',v:'#464B4F',V:'#99BAB5',g:'#8AC290',G:'#68A88E',q:'#BED4C8',y:'#CFB07C',Y:'#BF9360',r:'#C9ADAB',R:'#9E7565',b:'#99BAB5',B:'#839EA6',t:'#BA9273',p:'#BDB395'});
scene('cabinet',{w:32,h:48},c=>{
// Recessed top panel and three stepped edge planes.
c.rect(4,4,24,37,'k');c.rect(3,5,1,33,'o');c.rect(28,5,1,35,'k');
c.rect(5,5,22,5,'l');c.rect(5,5,22,1,'l');c.rect(5,5,2,1,'m');c.rect(8,5,1,1,'h');c.rect(4,6,1,4,'m');c.rect(27,5,1,6,'s');c.rect(5,10,22,1,'m');
c.rect(4,11,24,1,'k');c.rect(4,12,24,1,'a');c.rect(5,12,2,1,'w');c.rect(25,12,2,1,'h');
c.rect(4,13,23,24,'s');c.rect(4,13,1,24,'a');c.rect(5,14,21,22,'k');
c.rect(6,15,19,19,'v');c.rect(6,15,19,1,'d');c.rect(6,16,1,18,'s');
// Shelves have a light top and a darker front lip.
for(const y of [22,29,35]){c.rect(6,y,19,1,'h');c.rect(6,y+1,19,1,'s');}
c.rect(27,13,1,24,'o');c.rect(26,14,1,22,'d');
c.rect(4,37,24,1,'m');c.rect(5,38,22,1,'a');c.rect(4,39,24,1,'d');c.rect(5,40,22,1,'o');
c.rect(5,41,3,1,'k');c.rect(24,41,3,1,'k');
// Ventilation grille, not a solid black base.
c.rect(9,39,14,1,'k');for(let x=10;x<23;x+=3)c.rect(x,39,1,1,'s');
});
scene('products',{w:32,h:48},c=>{
// First level: shaped bottles, a squat milk carton, and stacked juice boxes.
c.rect(8,16,2,1,'h');c.rect(8,17,2,1,'G');c.rect(7,18,4,4,'g');c.rect(8,18,1,1,'G');c.rect(8,21,1,1,'q');c.rect(7,20,4,1,'a');c.rect(9,21,2,1,'G');
c.rect(13,17,2,1,'y');c.rect(12,18,4,4,'b');c.rect(12,18,3,1,'w');c.rect(13,19,1,2,'w');c.rect(15,19,1,3,'B');
c.rect(18,17,3,5,'t');c.rect(18,17,3,1,'w');c.rect(19,19,2,1,'r');c.rect(21,18,3,4,'g');c.rect(21,18,3,1,'q');c.rect(22,20,2,1,'G');
// Second level: folded snack bags with distinct outline and labels.
c.rect(7,25,4,4,'Y');c.rect(8,24,3,1,'y');c.rect(7,25,4,1,'y');c.rect(8,26,2,2,'w');c.rect(7,28,4,1,'Y');
c.rect(12,25,4,4,'R');c.rect(13,24,2,1,'r');c.rect(12,25,4,1,'r');c.rect(13,26,2,1,'a');c.rect(14,27,1,1,'y');
c.rect(18,25,6,4,'b');c.rect(18,25,6,1,'w');c.rect(18,26,1,3,'B');c.rect(20,26,2,2,'y');c.rect(23,26,1,3,'B');
// Third level: tins and uneven low packages.
c.rect(7,32,3,3,'p');c.rect(7,31,3,1,'a');c.rect(8,33,2,1,'w');
c.rect(11,32,3,3,'g');c.rect(11,31,3,1,'h');c.rect(11,33,2,1,'q');
c.rect(17,32,4,3,'t');c.rect(17,32,4,1,'w');c.rect(18,33,2,1,'r');
c.rect(22,31,3,4,'y');c.rect(22,31,3,1,'w');c.rect(23,33,2,1,'Y');
});
scene('glass',{w:32,h:48},c=>{
// Thin silver door rims: separate highlights from the dark inner seal.
c.rect(5,14,1,22,'w');c.rect(6,14,9,1,'h');c.rect(15,14,1,22,'m');c.rect(6,35,9,1,'a');
c.rect(16,14,1,22,'a');c.rect(17,14,9,1,'w');c.rect(25,15,1,20,'m');c.rect(17,35,9,1,'h');
// Small dark handles mounted on the frame, one-pixel lit edge.
c.rect(13,23,2,5,'k');c.rect(13,23,1,4,'h');c.rect(17,23,2,5,'k');c.rect(17,23,1,4,'h');
// A few restrained pane reflections, never across the product labels.
c.rect(6,16,1,3,'h');c.rect(6,19,1,2,'l');c.rect(24,30,1,2,'l');c.rect(23,31,1,1,'l');
});
scene('cabinet-complete',{w:32,h:48},stamp('cabinet',0,0),stamp('products',0,0),stamp('glass',0,0));


