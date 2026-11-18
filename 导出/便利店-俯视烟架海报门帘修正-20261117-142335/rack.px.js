pal({k:"#464b4f",d:"#5c4644",b:"#9e7565",h:"#ba9273",H:"#d1ae8a",s:"#785a55",p:"#d6d0b0",q:"#bdb395",w:"#ebf0ee",r:"#b04a58",g:"#4d8a7e",a:"#566178",y:"#9e7a36"});
sprite("壁挂烟架",{w:22,h:24},
 rect(0,0,22,24,"k"),rect(1,1,20,22,"s"),
 // Deep continuous top board: back rim, lit horizontal plane, dark front lip.
 rect(1,1,20,4,"h"),hline(2,1,18,"H"),hline(1,5,20,"b"),hline(1,6,20,"d"),
 rect(3,7,16,5,"d"),rect(3,15,16,5,"d"),
 (c)=>{
  const marks=[["r","a","g","y"],["a","g","r","g"]];
  for(let row=0;row<2;row++){
   const y=8+row*8;
   for(let col=0;col<4;col++){
    const x=3+col*4;
    c.rect(x,y,3,4,"q");c.rect(x,y,2,4,"p");
    c.hline(x,y,3,marks[row][col]);c.hline(x,y+2,2,"w");
   }
   // Horizontal shelf deck extends two pixels towards the viewer in front of the packs.
   c.rect(2,12+row*8,18,2,"h");
   c.hline(2,12+row*8,18,"H");c.hline(2,14+row*8,18,"b");
  }
 },
 rect(1,7,2,16,"b"),vline(1,7,16,"h"),
 rect(19,7,2,16,"s"),vline(19,7,16,"h"),
 hline(1,23,20,"d"));
