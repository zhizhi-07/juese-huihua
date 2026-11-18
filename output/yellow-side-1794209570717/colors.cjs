const {fixture}=require('../../test/clothing-sync.cjs');
(async()=>{const {p}=await fixture(),C=PE.ClothingSync,l=p.layers.find(l=>l.sheetIndex===3&&l.clothingSyncId&&l.name.endsWith('\u9ec4\u8272')&&l.getFrameData('3_0_0'));
for(let fi=0;fi<4;fi++){let im=C.raster(l.getFrameData('3_0_'+fi),p.spriteSheets[3].actions[0].frames[fi],2); console.log(fi); for(let y=23;y<32;y++){const d=[];for(let x=11;x<26;x++){const i=(y*32+x)*4;d.push(im.data[i+3]?Buffer.from(im.data.subarray(i,i+3)).toString('hex'):'------');}console.log(y,d.join(' '));}}
})()
