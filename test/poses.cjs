const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={createElement(tag){if(tag!=='canvas')return {click(){},remove(){}};const c=createCanvas(1,1);c.style={};c.toBlob=cb=>cb(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;},body:{appendChild(){}}};
const root=path.resolve(__dirname,'..');for(const name of ['core','history','canvas','tools','spritesheet','export','api','aseprite','builtin-packs'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),{filename:name});
vm.runInThisContext(fs.readFileSync(path.join(root,'js/poses.js'),'utf8'));
(async()=>{
 const project=new PE.Project();project.layers=[];
 for(const pack of PE_BUILTIN_PACKS){const file=new Blob([Buffer.from(pack.base64,'base64')]);file.name=pack.name;await PE.importAseprite(file,project);}
 const hurt=project.spriteSheets.findIndex(s=>s.name==='hurt'),death=project.spriteSheets.findIndex(s=>s.name==='death');
 const original=project.spriteSheets[hurt].actions.map(a=>Buffer.from(a.frames[0].originalPixels.data));
 const source=project.spriteSheets[hurt].sourceBytes;const hands=project.layers.filter(l=>l.sheetIndex===hurt&&PE.isHandLayer(l)).map(l=>({layer:l,first:new Map([...l.frameData].filter(([k])=>k.endsWith('_0')).map(([k,v])=>[k,Buffer.from(v.data)]))}));
 PE.makeBreathingPose(project,hurt,'sit');
 const sit=project.spriteSheets[hurt];assert.equal(sit.actions.length,3);assert.equal(sit.getTotalFrames(),12);assert.equal(sit.sourceBytes,source);
 const cm=new PE.CanvasManager(document.createElement('canvas'),project);
 sit.actions.forEach((a,ai)=>a.frames.forEach((frame,fi)=>{
  assert.equal(frame.duration,450);assert.deepEqual(cm.getCompositeImageData(hurt,ai,fi).data,frame.originalPixels.data);
  if(fi<2){assert.deepEqual(frame.originalPixels.data,sit.actions[ai].frames[0].originalPixels.data);for(let k=3;k<original[ai].length;k+=4)assert.equal(frame.originalPixels.data[k],original[ai][k],'opening eyes preserves silhouette');}
  else {assert.notDeepEqual(Buffer.from(frame.originalPixels.data),original[ai]);const base=original[ai].subarray(39*79*4,40*79*4);assert.deepEqual(Buffer.from(frame.originalPixels.data).subarray(39*79*4,40*79*4),base,'feet stay planted');}
 }));
 const sleepSource=PE_BUILTIN_PACKS.find(p=>p.name==='death.aseprite'),file=new Blob([Buffer.from(sleepSource.base64,'base64')]);file.name=sleepSource.name;await PE.importAseprite(file,project);
 const si=project.spriteSheets.length-1;PE.makeBreathingPose(project,si,'sleep','down');const sleep=project.spriteSheets[si];assert.equal(sleep.actions.length,1);assert.equal(sleep.actions[0].direction,'down');assert.equal(sleep.getTotalFrames(),4);assert.equal(project.spriteSheets[death].getTotalFrames(),18);
 for(let fi=0;fi<4;fi++)assert.deepEqual(cm.getCompositeImageData(si,0,fi).data,sleep.actions[0].frames[fi].originalPixels.data);
 for(const l of project.layers.filter(l=>PE.isHandLayer(l))){assert(l.referenceOnly&&l.locked);}
 assert.equal(project.spriteSheets.length,7);for(const {layer,first} of hands)for(const [key,data] of layer.frameData)assert.deepEqual(Buffer.from(data.data),first.get(key.replace(/_\d+$/,'_0')),'independent hand pixels unchanged');
 console.log('PASS: seven actions, three-direction sitting and front sleeping; four 450ms frames keep feet planted and compress torso, layered composites match, hands protected, original death and source bytes unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1});




