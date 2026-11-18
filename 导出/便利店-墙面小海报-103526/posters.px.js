pal({k:"#464b4f",b:"#8a7b63",p:"#e8cd97",w:"#d6d0b0",r:"#9e7565",d:"#785a55",a:"#839ea6",B:"#6c8091",v:"#99bab5",g:"#6d8740",c:"#cc6764"});
sprite("_drink",{w:6,h:9},
 rect(0,0,6,9,"b"),rect(1,1,4,7,"p"),hline(1,1,4,"r"),
 rect(2,3,2,3,"r"),px(4,4,"r"),hline(1,7,4,"r"));
sprite("_landscape",{w:6,h:9},
 rect(0,0,6,9,"b"),rect(1,1,4,7,"w"),rect(1,1,4,4,"a"),
 px(4,1,"p"),poly([1,5,1,4,2,2,4,4,5,3,5,5],"B"),
 hline(1,6,4,"b"),px(1,7,"b"),hline(3,7,2,"b"));
sprite("_calendar",{w:8,h:7},
 rect(0,0,8,7,"k"),rect(1,1,6,5,"w"),hline(1,1,6,"g"),
 hline(4,1,2,"w"),
 (c)=>{for(let y of [3,5])for(let x of [1,3,5])c.px(x,y,x===1?"c":"b");});
scene("三张小海报",{w:32,h:16,layers:true},
 layer("饮品海报",stamp("_drink",2,3)),
 layer("风景海报",stamp("_landscape",12,3)),
 layer("日历海报",stamp("_calendar",22,3)));
