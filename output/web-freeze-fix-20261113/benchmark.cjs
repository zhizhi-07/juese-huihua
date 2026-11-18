const fs=require('fs'),vm=require('vm');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(b){this.result=await b.text();this.onload();}};
for(const n of ['core','history','canvas','tools','export','api','frame-tools','hair-animation'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
(async()=>{let raw=fs.readFileSync('output/green-hair-20261113/freeze-recovery.json','utf8'),{project:p}=await new PE.ExportManager().importProject(new Blob([raw]));let start=performance.now(),changes=0;for(let i=0;i<20;i++)changes+=PE.HairAnimation.refresh(p).length;console.log(JSON.stringify({iterations:20,ms:performance.now()-start,changes,layers:p.layers.length,hiddenLiveMasters:p.layers.filter(l=>l.hairAnimation?.live&&l.visible===false).length}));})().catch(e=>{console.error(e);process.exitCode=1});
