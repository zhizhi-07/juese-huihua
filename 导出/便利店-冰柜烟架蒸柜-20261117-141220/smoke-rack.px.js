pal({k:"#464b4f",b:"#9e7565",B:"#785a55",h:"#d1ae8a",w:"#d6d0b0",p:"#ebf0ee",s:"#bdb395",r:"#cc6764",g:"#68a88e",a:"#839ea6",y:"#e0ac6c"});
sprite("壁挂烟架",{w:24,h:16},
 rect(1,0,22,16,"k"),rect(0,1,24,14,"k"),
 rect(1,1,22,14,"B"),rect(2,2,20,12,"s"),
 hline(2,1,20,"h"),hline(2,3,20,"b"),
 (c)=>{
  const marks=["r","g","a","y","g"];
  for(let row=0;row<2;row++){
   for(let col=0;col<5;col++){
    const x=2+col*4,y=4+row*5;
    c.rect(x,y,3,4,"p");c.rect(x,y,3,1,marks[(col+row)%5]);c.px(x+1,y+2,"s");
   }
   c.hline(2,8+row*5,20,"b");
   c.hline(2,7+row*5,20,"h");
  }
 },
 hline(2,14,20,"b"));
