const fs=require('node:fs');const p='output/便利店逐件/02收银台/checkout.px.js';let s=fs.readFileSync(p,'utf8');const a=s.indexOf('// Small modern monitor'),b=s.indexOf('// Compact card reader');s=s.slice(0,a)+`// Cream casing, a small inset display and a short, gently tilted support.
c.rect(8,5,6,1,'B');c.rect(7,6,8,5,'k');c.rect(8,11,6,1,'B');
c.rect(7,6,1,4,'w');c.rect(8,6,6,1,'w');c.rect(8,7,5,3,'b');c.rect(13,7,1,3,'B');
c.rect(8,7,4,1,'g');c.rect(9,9,2,1,'w');c.rect(8,10,5,1,'w');
c.rect(10,12,2,1,'B');c.rect(9,13,4,1,'b');
// A sloping keypad above a deeper cash drawer.
c.rect(6,14,11,1,'w');c.rect(5,15,13,2,'b');c.rect(6,17,11,1,'B');c.rect(7,18,9,1,'k');
c.rect(6,15,1,2,'w');c.rect(7,15,4,1,'B');c.rect(8,15,1,1,'w');c.rect(10,15,1,1,'w');
c.rect(13,14,3,1,'B');c.rect(13,15,1,1,'w');c.rect(15,15,1,1,'g');
c.rect(8,17,7,1,'k');c.rect(10,17,3,1,'w');
// Small receipt printer with an exposed paper tongue.
c.rect(17,11,2,1,'B');c.rect(16,12,4,3,'B');c.rect(17,10,2,3,'W');c.rect(17,11,1,1,'w');
c.rect(16,13,4,1,'k');c.rect(17,14,2,1,'b');
`+s.slice(b);fs.writeFileSync('output/便利店逐件/02收银台/重画收银机/checkout-v2.px.js',s);
