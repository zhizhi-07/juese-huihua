const {fixture}=require('../../test/clothing-sync.cjs');
(async()=>{
  const {p}=await fixture(),C=PE.ClothingSync,name='\u670d\u88c5 / \u9ec4\u8272';
  for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
    const key=p.getFrameKey(3,ai,fi),f=p.spriteSheets[3].actions[ai].frames[fi],body=C.base(p,3,ai,fi,'body'),head=C.base(p,3,ai,fi,'head');
    const im=p.layers.find(l=>l.name===name&&l.sheetIndex===3&&l.getFrameData(key))?.getFrameData(key),cl=C.raster(im,f,2);
    console.log(key,p.spriteSheets[3].actions[ai].direction,im?[im.width,im.height,im.placement]:null,cl.data.filter((v,i)=>i%4===3&&v).length,'locks',f.locked,f.lockedRegions?.length);
    for(let y=9;y<16;y++){
      let b='',h='',c='';
      for(let x=0;x<16;x++){
        const i=(y*16+x)*4;
        b+=body.data[i+3]?(body.data[i]===254?'B':body.data[i]===224?'S':'s'):'.';
        h+=head.data[i+3]?'h':'.';
        c+=[0,1,2,3].some(k=>cl.data[((y*2+(k>>1))*cl.width+x*2+k%2)*4+3])?'X':'.';
      }
      console.log(y,b,h,c);
    }
  }
})().catch(e=>{console.error(e);process.exitCode=1});
