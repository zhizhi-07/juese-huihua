const {fixture}=require('../../test/clothing-sync.cjs');
(async()=>{const {p}=await fixture(),C=PE.ClothingSync;
for(const fi of [2,3])for(const n of ['body','head','hand','hand 2']){
 const im=C.base(p,3,0,fi,n);console.log(fi,n);
 for(let y=12;y<16;y++){
  const d=[];for(let x=4;x<14;x++){const i=(y*16+x)*4;d.push(im.data[i+3]?Buffer.from(im.data.subarray(i,i+3)).toString('hex'):'------');}
  console.log(y,d.join(' '));
 }
}
})()
