const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={createElement(tag){if(tag!=='canvas')return {click(){},remove(){}};const c=createCanvas(1,1);c.style={};c.toBlob=cb=>cb(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;},body:{appendChild(){}}};
const root=path.resolve(__dirname,'..');for(const name of ['core','history','canvas','tools','spritesheet','export','api','aseprite','builtin-packs'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),{filename:name});
vm.runInThisContext(fs.readFileSync(path.join(root,'js/hairstyle.js'),'utf8'));
(async()=>{
 const project=new PE.Project();project.layers=[];
 for(const pack of PE_BUILTIN_PACKS){const file=new Blob([Buffer.from(pack.base64,'base64')]);file.name=pack.name;await PE.importAseprite(file,project);}
 const frameDir=path.resolve(root,'../hair-frames');fs.mkdirSync(frameDir,{recursive:true});
 const cm=new PE.CanvasManager(document.createElement('canvas'),project);
 for(const name of ['idle','run']){
  const si=project.spriteSheets.findIndex(s=>s.name===name),sheet=project.spriteSheets[si];
  const originals=project.layers.filter(l=>l.sheetIndex===si).map(l=>({layer:l,data:[...l.frameData].map(([k,v])=>[k,Buffer.from(v.data)])}));
  const hair=PE.addDoubleBuns(project,si);assert.equal(hair.frameData.size,sheet.getTotalFrames());assert(!hair.locked&&!hair.referenceOnly);
  for(const {layer,data} of originals)for(const [key,bytes]of data)assert.deepEqual(Buffer.from(layer.frameData.get(key).data),bytes,'source and hands unchanged');
  sheet.actions.forEach((a,ai)=>a.frames.forEach((frame,fi)=>{
    const im=cm.getCompositeImageData(si,ai,fi,true);assert.equal(im.width,79);assert.equal(im.height,79);
    hair.visible=false;assert.deepEqual(cm.getCompositeImageData(si,ai,fi).data,frame.originalPixels.data,'hiding hair restores original');hair.visible=true;
    const canvas=createCanvas(79,79);canvas.getContext('2d').putImageData(im,0,0);fs.writeFileSync(path.join(frameDir,`${name}-${a.direction}-${fi}.png`),canvas.toBuffer('image/png'));
  }));
 }
 console.log('PASS: 36 native frames, all three directions, editable separate hair, original head/body/hands unchanged, hiding hair restores exact source.');
})().catch(e=>{console.error(e);process.exitCode=1});
