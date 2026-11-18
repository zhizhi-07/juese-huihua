pal({k:'#464B4F',t:'#BA9273',T:'#D1AE8A',d:'#9E7565',g:'#8AC290',G:'#68A88E',h:'#BED4C8',s:'#4D8A7E'});
scene('chair',{w:32,h:32},c=>{
// Rounded wooden back with a mint cushion, sized for the 16px character.
c.rect(23,2,5,1,'k');c.rect(22,3,7,1,'k');c.rect(21,4,9,4,'k');c.rect(22,8,7,1,'d');
c.rect(23,3,5,1,'T');c.rect(22,4,7,3,'t');c.rect(23,4,5,2,'g');c.rect(23,4,4,1,'h');c.rect(23,6,5,1,'G');
// A softly rounded seat, with a small wood lip and short legs.
c.rect(22,8,7,1,'k');c.rect(21,9,9,3,'k');c.rect(22,12,7,1,'k');
c.rect(22,9,7,2,'g');c.rect(23,9,5,1,'h');c.rect(22,11,7,1,'G');c.rect(23,12,5,1,'t');
c.rect(22,13,1,2,'d');c.rect(28,13,1,2,'d');c.rect(22,15,1,1,'k');c.rect(28,15,1,1,'k');
});
