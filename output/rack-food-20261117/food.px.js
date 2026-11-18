pal({y:'#e8cd97', l:'#fff3d5', o:'#d48d57', O:'#9e7565', r:'#cc6764', R:'#80575b', b:'#6c8091', B:'#566178', g:'#8aa355', G:'#6d8740', p:'#997482', P:'#614257'});
sprite('_黄袋', `.yyy.\nyllyo\nyooyo\n.OOO.`);
sprite('_红袋', `.rrr.\nrllrR\n.RRR.`);
sprite('_蓝袋', `.bbb.\nblybB\nboybB\n.BBB.`);
sprite('_杯面', `.yyy.\nyllly\n.rrr.\n.RRR.`);
sprite('_红长条', `or\nyr\nrl\nOR`);
sprite('食品', {w:16,h:32},
 stamp('_黄袋',1,5),stamp('_红袋',1,9),stamp('_蓝袋',1,12),
 vline(1,16,3,'o'),vline(2,16,3,'y'),vline(3,15,4,'o'),px(3,18,'O'),vline(4,16,3,'r'),px(4,18,'R'),
 vline(9,5,3,'g'),vline(10,5,3,'G'),vline(12,5,3,'g'),vline(13,6,2,'G'),px(12,5,'y'),
 stamp('_杯面',9,8),stamp('_杯面',9,12),
 stamp('_红长条',9,15),stamp('_红长条',12,15),
 hline(1,22,5,'g'),px(1,23,'G'),px(2,23,'y'),px(3,23,'G'),px(4,23,'y'),px(5,23,'G'),
 hline(9,22,5,'y'),hline(9,23,2,'r'),hline(12,23,2,'r'),
 hline(1,27,5,'r'),px(1,28,'R'),px(2,28,'y'),px(3,28,'R'),px(4,28,'o'),px(5,28,'R'),
 hline(9,27,2,'p'),hline(12,27,2,'p'),px(9,27,'y'),px(12,27,'y'),hline(9,28,2,'P'),hline(12,28,2,'P')
);
