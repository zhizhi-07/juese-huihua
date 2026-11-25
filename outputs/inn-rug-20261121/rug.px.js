pal({k:'#5e4452', r:'#80575b', b:'#8f3648'})
sprite('inn-rug', {w:32,h:16}, c => {
  c.rect(0,0,32,16,'k')
  c.rect(1,1,30,14,'r')
  c.rect(2,2,28,12,'b')
  c.rect(3,3,26,10,'r')
  c.rect(4,4,24,8,'b')
  const corner = [
    '...rrrr......',
    '..rr..rrr.rr.',
    '.rr.r...rr...',
    '.r.r.........',
  ]
  for (let y=0;y<4;y++) for (let x=0;x<13;x++) if(corner[y][x]==='r') {
    for(const i of [4+x,27-x]) for(const j of [4+y,11-y]) c.rect(i,j,1,1,'r')
  }
})

