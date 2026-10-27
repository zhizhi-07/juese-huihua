const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/套装分支清理-20261027'),url='http://127.0.0.1:8765/api/project?id=character-green-flower-idle-20261027';
(async()=>{
 const r=await fetch(url);assert(r.ok);const text=await r.text(),etag=r.headers.get('etag'),source=JSON.parse(text),p=JSON.parse(text);
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'before.json'),text);fs.writeFileSync(path.join(out,'etag.txt'),etag);
 const keep=l=>l.isGroup||/^(head|body|hand(?: 2)?|vfx)$/.test(l.name)||l.name==='坐姿 / 手部'||(l.sheetIndex===8&&l.name.startsWith('头发 / 04 '));
 const mapping=new Map();source.layers.forEach((l,i)=>{if(keep(l))mapping.set(i,mapping.size);});
 p.layers=p.layers.filter(keep);
 let n=0;for(const [oldIndex,newIndex]of mapping){const l=p.layers[newIndex],old=source.layers[oldIndex];if(l.parent!=null){assert(mapping.has(l.parent));l.parent=mapping.get(l.parent);}assert.deepEqual(l.frameData,old.frameData);n++;}
 p.currentLayerIndex=mapping.get(source.currentLayerIndex)??p.layers.findIndex(l=>l.name.endsWith('前发'));
 const hair=p.layers.find(l=>l.sheetIndex===8&&l.name.startsWith('头发 / 04 ')&&l.name.endsWith('后发'));hair.name='头发 / 04 长披发 / 后发';
 assert.equal(p.layers.filter(l=>l.name.startsWith('头发 /')).length,2);
 assert(!p.layers.some(l=>/眼睛|嘴巴|服装|发饰|衣服与发型|研究|绘画图层/.test(l.name)));
 assert.deepEqual(p.spriteSheets,source.spriteSheets);assert(n>0);
 const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};
 global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
 for(const name of ['core','history','canvas','tools','spritesheet','export'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'));
 const exporter=new PE.ExportManager(),{project}=await exporter.importProject(new File([JSON.stringify(p)],'branch.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project),sheet=createCanvas(384,128),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(let ai=0;ai<3;ai++){const im=cm.getCompositeImageData(8,ai,0);assert(im.data.some(v=>v));const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);ctx.fillStyle='#ddd5ed';ctx.fillRect(ai*128,0,128,128);ctx.drawImage(tile,ai*128,0,128,128);}
 fs.writeFileSync(path.join(out,'preview.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,'Save failed '+saved.status);assert.deepEqual(await(await fetch(url)).json(),p);
 console.log(JSON.stringify({removed:source.layers.length-p.layers.length,kept:p.layers.length,backup:path.join(out,'before.json'),saved:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
