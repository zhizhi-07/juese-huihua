pal({k:"#464b4f",d:"#5c4644",s:"#785a55",b:"#9e7565",h:"#ba9273",H:"#d1ae8a",p:"#d6d0b0",w:"#ebf0ee",q:"#bdb395",r:"#b04a58",g:"#4d8a7e",a:"#566178",y:"#9e7a36"});
sprite("壁挂烟架",{w:22,h:24},
 rect(0,1,22,22,"k"),rect(1,0,20,24,"k"),
 rect(2,2,18,20,"s"),
 rect(3,3,16,1,"d"),rect(3,10,16,1,"d"),rect(3,17,16,1,"d"),
 rect(1,1,20,2,"h"),hline(2,1,18,"H"),hline(2,3,18,"d"),
 // Inset packets stand behind the projecting shelf lip, not on a flat colored grid.
 (c)=>{
  const marks=[["r","a","g","y"],["g","r","a","r"]];
  for(let row=0;row<2;row++){
   const y=4+row*7;
   for(let col=0;col<4;col++){
    const x=3+col*4;
    c.rect(x,y,3,4,"q");c.rect(x,y,2,4,"p");c.hline(x,y,3,marks[row][col]);c.hline(x,y+2,2,"w");
   }
  }
 },
 rect(3,18,3,4,"q"),rect(3,18,2,4,"p"),hline(3,18,3,"r"),hline(3,20,2,"w"),
 rect(7,18,3,4,"q"),rect(7,18,2,4,"p"),hline(7,18,3,"a"),hline(7,20,2,"w"),
 rect(12,18,6,2,"p"),hline(12,18,6,"g"),rect(11,20,7,2,"q"),hline(11,20,7,"p"),
 (c)=>{for(let y of [8,15,22]){c.hline(2,y,18,"H");c.hline(2,y+1,18,"b");}},
 rect(1,3,2,20,"b"),vline(1,3,19,"h"),
 rect(19,3,2,20,"s"),vline(19,3,19,"h"));
