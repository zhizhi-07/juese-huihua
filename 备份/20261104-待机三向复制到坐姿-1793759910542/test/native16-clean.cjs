const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,ImageData,Image,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),backup=path.join(root,'备份/20261104-16x16干净重启');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.FileReader=class{async readAsText(file){this.result=await file.text();this.onload();}};
global.document={addEventListener(){},createElement(tag){assert.equal(tag,'canvas');const c=createCanvas(1,1);c.style={};return c;}};
for(const file of ['core','canvas','export','visual-layers','wardrobe'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'),{filename:file});
async function canvas(url){const im=await loadImage(url),c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);return c;}
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
(async()=>{
 const raw=JSON.parse(fs.readFileSync(path.join(root,'assets/builtin/native16-clean.json'))),source=JSON.parse(fs.readFileSync(path.join(backup,'main-api-before.json')));
 assert.deepEqual(raw.spriteSheets.map(s=>s.name),['original16_walk','original16_idle','original16_pickup','original16_sit']);
 assert.equal(raw.spriteSheets.flatMap(s=>s.actions.flatMap(a=>a.frames)).length,66);
 assert(!raw.layers.some(l=>/头发|衣服|服装|hair/i.test(l.name)));
 const original=source.spriteSheets[10],sit=raw.spriteSheets[3];
 assert.equal(sit.frameWidth,original.frameWidth/2);assert.equal(sit.frameHeight,original.frameHeight/2);
 let sitLayers=0;
 for(const [ai,a]of sit.actions.entries())for(const [fi,f]of a.frames.entries()){
   const of=original.actions[ai].frames[fi];for(const key of ['width','height','sourceX','sourceY'])assert.equal(f[key],of[key]/2,key+' must be exactly 50%');assert.equal(f.duration,of.duration);
   for(const l of raw.layers.filter(l=>l.sheetIndex===3&&!l.isGroup)){
     const fd=l.frameData[`3_${ai}_${fi}`];if(!fd)continue;
     const from=source.layers.find(x=>x.sheetIndex===10&&x.name===l.name&&x.frameData[`10_${ai}_${fi}`]);assert(from,'matching original sitting layer');
     const c=await canvas(from.frameData[`10_${ai}_${fi}`].dataURL),expected=createCanvas(c.width/2,c.height/2),ctx=expected.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(c,0,0,c.width/2,c.height/2);
     const actual=await canvas(fd.dataURL);assert.equal(actual.width,c.width/2);assert.equal(actual.height,c.height/2);assert.deepEqual(pixels(actual),pixels(expected),'sitting must have no added, moved or redrawn pixels');sitLayers++;
   }
 }
 const ex=new PE.ExportManager(),{project}=await ex.importProject(new Blob([JSON.stringify(raw)])),cm=new PE.CanvasManager(document.createElement('canvas'),project);ex.init(project,cm);
 let checked=0;
 for(const [si,s]of raw.spriteSheets.entries()){
   const atlas=await canvas(s.imageDataURL);
   for(const [ai,a]of s.actions.entries())for(const [fi,f]of a.frames.entries()){
     const expected=atlas.getContext('2d').getImageData(f.sourceX,f.sourceY,f.width,f.height),actual=cm.getCompositeImageData(si,ai,fi,true);
     assert.deepEqual(Buffer.from(actual.data),Buffer.from(expected.data),`${s.name}/${ai}/${fi} matches saved atlas`);
     for(let i=0;i<actual.data.length;i+=4)if(actual.data[i+3])assert(!['ebf0ee','d4d0cd','2f3b3d'].includes(Buffer.from(actual.data.slice(i,i+3)).toString('hex')),'old skin/outline removed');
     checked++;
   }
 }
 const exported=JSON.parse(await ex.exportProject(false).text());assert.deepEqual(exported.spriteSheets.map(s=>s.name),raw.spriteSheets.map(s=>s.name));assert.equal(exported.layers.length,raw.layers.length);
 const branch=structuredClone(raw);require('../js/character-base.js')(branch);require('../js/character-sync.js')(branch,raw);assert(branch.layers.some(l=>l.inheritedBase));
 const A=require('../js/ai-edits.js');assert(A.isIdle(project,1,0),'native16 idle recognized by AI controls');
 const wardrobe=structuredClone(raw),layer=wardrobe.layers.find(l=>l.name==='绘画图层');layer.name='服装 / 测试 / 衣服';layer.frameData={'0_0_0':raw.layers.find(l=>l.sheetIndex===0&&l.name==='body'&&l.frameData['0_0_0']).frameData['0_0_0']};
 assert(PE.Wardrobe.snapshot(wardrobe,[PE.Wardrobe.family(layer)],'测试','衣服','main').spriteSheets.length,'native16 wardrobe snapshot supported');
 const result={status:'PASS',compositeFrames:checked,sittingLayerFramesExactHalfScale:sitLayers,sittingDimensions:sit.actions.map(a=>({direction:a.direction,width:a.frames[0].width,height:a.frames[0].height})),checks:['four actions only','no old wardrobe pixels','current skin colors','exact half-scale sitting, no redraw or translation','import/export round trip','branch sync','AI idle recognition','native16 wardrobe snapshot']};
 fs.writeFileSync(path.join(backup,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;});


