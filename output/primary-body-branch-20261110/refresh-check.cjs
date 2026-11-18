const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,ImageData,Image}=require('@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const n of ['core','canvas','export','hair-animation','clothing-sync'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
(async()=>{const d='output/primary-body-branch-20261110/live/',raw=fs.readFileSync(d+'verified.json','utf8'),p=(await new PE.ExportManager().importProject(new Blob([raw]))).project,prev=new Map(p.layers.map(l=>[l,new Map(l.frameData)]));
const updates=PE.HairAnimation.refresh(p);let differs=0;
for(const u of updates)for(const e of u.result.edits){
 const old=prev.get(e.layer).get(e.key);
 if(!old||old.width!==e.image.width||old.height!==e.image.height||JSON.stringify(old.placement)!==JSON.stringify(e.image.placement)||!Buffer.from(old.data).equals(Buffer.from(e.image.data)))differs++;
}
const outfit=PE.ClothingSync.refresh(p);console.log({liveHairGroups:updates.length,changedHairFrames:differs,liveOutfitGroups:outfit.length,lockedAssets:p.layers.filter(l=>!l.inheritedBase&&!l.isGroup&&l.locked).length});})();
