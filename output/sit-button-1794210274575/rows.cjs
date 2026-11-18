const {fixture}=require('../../test/clothing-sync.cjs');
(async()=>{const {p}=await fixture(),C=PE.ClothingSync;
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
 const key=p.getFrameKey(3,ai,fi),head=C.base(p,3,ai,fi,'head'),body=C.base(p,3,ai,fi,'body'),frame=p.spriteSheets[3].actions[ai].frames[fi],l=p.layers.find(l=>l.sheetIndex===3&&l.name.endsWith('\u9ec4\u8272')&&l.getFrameData(key)),im=l?.getFrameData(key),r=C.raster(im,frame,2);
 const rows=(m)=>Array.from({length:m.height},(_,y)=>m.data.subarray(y*m.width*4,(y+1)*m.width*4).filter((v,i)=>i%4===3&&v).length);
 console.log(key,JSON.stringify(rows(head)),JSON.stringify(rows(body)),JSON.stringify(rows(r).slice(22)),im?.placement);
}
})()
