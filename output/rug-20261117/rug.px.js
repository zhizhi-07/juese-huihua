pal({ k:'#464b4f', s:'#80575b', r:'#cc6764', R:'#b04a58', l:'#e38674', c:'#d6d0b0', C:'#bdb395', w:'#e8cd97', g:'#68a88e', G:'#4d8a7e', h:'#bed4c8' });
// Same single-pixel scale as the shelf; the rug's short axis is foreshortened.
sprite('地毯', {w:32,h:24},
  layer('流苏', (c)=>{for(let y of [6,9,14,17]){c.hline(0,y,3,'C');c.hline(29,y,3,'C');c.px(0,y,'w');c.px(31,y,'w');}}),
  layer('毯身与包边',
    rect(3,4,26,16,'k'),rect(2,5,28,14,'k'),
    rect(3,5,26,13,'c'),hline(4,5,24,'w'),
    hline(3,18,26,'s'),hline(4,17,24,'C'),
    rect(5,7,22,9,'R'),rect(5,7,22,8,'r'),hline(6,7,20,'l'),
    hline(5,6,22,'s'),vline(4,7,9,'s'),vline(27,7,9,'s'),hline(5,16,22,'s')),
  layer('菱形织纹',
    poly([15,8,16,8,21,11,16,14,15,14,10,11],'w'),
    poly([15,9,16,9,19,11,16,13,15,13,12,11],'G'),
    poly([15,10,16,10,18,11,16,12,15,12,13,11],'g'),hline(15,10,2,'h'),
    hline(7,10,2,'w'),px(8,11,'w'),hline(23,10,2,'w'),px(23,11,'w'),
    hline(7,14,2,'l'),hline(23,14,2,'l'))
);

