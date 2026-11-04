const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const deps='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas,ImageData,Image}=require(path.join(deps,'@napi-rs/canvas'));
const root=path.resolve(__dirname,'..');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
for(const name of ['core','history','canvas','tools','export','api','frame-tools','visual-layers','hair-animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),{filename:name});
(async()=>{
 const dir=fs.readFileSync(path.join(root,'output/latest-native16-logic-backup.txt'),'utf8'),original=JSON.parse(fs.readFileSync(path.join(dir,'main-before.json'))),raw=structuredClone(original);
 for(const l of raw.layers)if(l.sheetIndex===3&&PE.isHandLayer(l)){l.referenceOnly=false;l.locked=false;}
 const {project:p}=await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]));
 assert(PE.isCharacterSheet(p.spriteSheets[1]),'native16 character sheet must enable character UI');
 const hand=p.layers.find(l=>l.sheetIndex===3&&l.name==='hand');assert(PE.isHandLayer(hand));assert(!PE.isProtectedHandLayer(hand));
 const index=p.layers.indexOf(hand),key=[...hand.frameData.keys()][0],before=PE.utils.cloneImageData(hand.frameData.get(key));
 assert(hand.setPixel(key,0,0,12,34,56,255),'main sitting arm can be painted');assert.deepEqual([...hand.getFrameData(key).data.slice(0,4)],[12,34,56,255]);hand.frameData.set(key,before);
 const cm=new PE.CanvasManager(document.createElement('canvas'),p),history=new PE.HistoryManager(),tools=new PE.ToolManager();tools.init(p,cm,history);
 p.currentSheetIndex=3;p.currentActionIndex=Number(key.split('_')[1]);p.currentFrameIndex=0;p.currentLayerIndex=index;
 const app={project:p,history,toolManager:tools,canvasManager:cm,animationPlayer:{pause(){},_renderPreviewFrame(){}},updateAll(){},updateLayerList(){},updatePalette(){},updateStatusBar(){},updateFrameList(){},persistence:{markDirty(){}}};
 PE.app=app;PE.project=p;assert(pixelAPI.setLayerLocked(index,false).success,'arm unlock API works');assert(pixelAPI.setPixels(index,3,p.currentActionIndex,0,[{x:0,y:0,r:12,g:34,b:56,a:255}]).success,'pixel API accepts editable arm');hand.frameData.set(key,before);
 const legacy=new PE.Layer('hand');legacy.referenceOnly=true;assert(PE.isProtectedHandLayer(legacy),'legacy reference still protected');assert(!legacy.setPixel(key,0,0,1,2,3,255));
 const bodyData=p.layers.map(l=>({l,frames:new Map([...l.frameData].map(([k,d])=>[k,Buffer.from(d.data)]))}));
 const idleSI=1,hair=new PE.Layer('头发 / 原生16测试 / 后发');hair.sheetIndex=idleSI;p.layers.push(hair);
 for(const [ai,a]of p.spriteSheets[idleSI].actions.entries()){const im=new ImageData(16,16);for(let y=0;y<7;y++)im.data.set([90,60,40,255],(y*16+4)*4);hair.frameData.set(`${idleSI}_${ai}_0`,im);}
 const H=PE.HairAnimation;H.setup(p,hair);assert.equal(hair.hairAnimation.params.ampH,1,'native16 default amplitude is one native pixel');H.validate(p);
 const plan=H.plan(p,hair);assert.equal(plan.edits.length,63);assert(plan.edits.some(e=>e.key.startsWith('3_')),'current sitting participates');H.applyPlan(plan);
 for(const item of bodyData)for(const [k,d]of item.l.frameData)assert.deepEqual(Buffer.from(d.data),item.frames.get(k),'hair never changes current body or sitting pixels');
 assert(PE.VisualLayers.family(p,hair).length===4,'visual layer family connects all native16 actions');
 const sample=hair.frameData.get('1_0_0'),moved=H.deform(sample,{width:16,height:16},{x:0,y:0},Math.PI/2,{...H.params(p.spriteSheets[1]),lag:0},null,true).image;assert(moved.data[(6*moved.width+5)*4+3],'hair tip moves by one actual source pixel');assert(!moved.data[(6*moved.width+6)*4+3],'no legacy doubled-pixel shift');
 const branch=structuredClone(raw);require('../js/character-base.js')(branch);require('../js/character-sync.js')(branch,raw);
 for(const l of branch.layers.filter(l=>!l.isGroup)){assert(l.inheritedBase&&l.locked,'new character base follows current main');if(PE.isHandLayer(l))assert.equal(l.referenceOnly,true,'branch arms remain protected');const old=raw.layers.find(x=>x.sheetIndex===l.sheetIndex&&x.name===l.name&&Object.keys(x.frameData||{}).some(k=>Object.hasOwn(l.frameData,k)));assert(old);for(const [k,fd]of Object.entries(l.frameData)){const decode=url=>require('../scripts/png.cjs').decode(Buffer.from(url.split(',')[1],'base64'));assert.deepEqual(decode(fd.dataURL),decode(old.frameData[k].dataURL),'new branch uses freshly drawn current sitting/body pixels');}}
 assert.equal(PE.VisualLayers.category(hand),'身体');PE.VisualLayers.choose(app,index);assert.equal(p.currentLayerIndex,index,'editable arm selectable from visual cards');
 const result={status:'PASS',checks:['native16 visual family','main sitting arm editable in layer and pixel API','legacy/branch hand protection retained','native16 one-pixel hair movement','63 target hair frames calibrated from actual heads','current body and sitting pixels unchanged','new branch uses current body and sitting']};fs.writeFileSync(path.join(dir,'native16-model-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;});
