pal({k:'#46465E',n:'#35466D',b:'#50638D',h:'#7182AA',w:'#FAFCFF',s:'#CAD5E4',r:'#B95065',R:'#853D55',t:'#303145'});
for(const dir of ['down','side','up'])sprite(dir,{w:30,h:34},
  rect(8,22,14,8,'k'),
  rect(10,22,10,4,'w'),
  rect(10,25,10,1,'s'),
  rect(8,26,14,4,'n'),
  rect(7,28,16,2,'k'),rect(8,28,14,1,'n'),
  vline(10,26,3,'b'),vline(14,26,3,'b'),vline(18,26,3,'b'),
  rect(10,30,4,1,'w'),rect(16,30,4,1,'s'),
  rect(10,31,4,1,'t'),rect(16,31,4,1,'t'),
  ...(dir==='down' ? [grid(10,22,'nnwwwwwwnn\nwnnwwwwnnw\nwwwrrrrwww\nwwwwRRwwww')] :
  dir==='side' ? [rect(10,22,7,1,'n'),rect(10,23,5,1,'b'),rect(18,24,2,1,'r'),rect(18,25,1,1,'R')] :
  [rect(10,22,10,2,'n'),rect(11,23,8,1,'h'),rect(11,24,8,1,'w')])
);

