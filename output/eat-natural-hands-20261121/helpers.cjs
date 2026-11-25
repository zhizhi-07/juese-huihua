const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.FileReader=class{async readAsText(file){this.result=await file.text();this.onload();}};
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
for(const name of ['core','export','canvas'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../../js',name+'.js'),'utf8'),{filename:name});
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name)));
const load=async j=>{const {project}=await new PE.ExportManager().importProject(new Blob([JSON.stringify(j)]));return [project,new PE.CanvasManager(document.createElement("canvas"),project)]};
const pic=(ctx,im,x,y,z)=>{const small=createCanvas(im.width,im.height);small.getContext('2d').putImageData(im,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(small,x,y,im.width*z,im.height*z)};
const save=(name,data)=>fs.writeFileSync(path.join(__dirname,name),data);
module.exports={read,load,save,pic,createCanvas,assert};

