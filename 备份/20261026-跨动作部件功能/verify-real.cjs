const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=process.cwd(),png=require(process.cwd()+'/scripts/png.cjs');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={addEventListener(){},createElement(){const c=createCanvas(1,1);c.style={};return c;}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
global.JSZip=require(process.cwd()+'/js/vendor/jszip.min.js');
for(const n of ['core','export','visual-layers'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const image=(w=32,h=32,color=[119,119,119,255])=>{let d=new ImageData(w,h);d.data.set(color,(2*w+4)*4);return d;};
const sheets=['original32_idle','original32_sit','original32_pickup','idle'].map((name,si)=>({name,fps:10,useFrameDurations:si!==1,frameWidth:si===2?40:32,frameHeight:si===2?40:32,actions:['side','down','up'].map(direction=>({direction,name:direction,frames:[0,1].map(()=>({width:si===2?40:32,height:si===2?40:32,duration:180}))}))}));
const layer=(name,si,visible=true)=>{let frameData=new Map();sheets[si].actions.forEach((a,ai)=>a.frames.forEach((f,fi)=>frameData.set(`${si}_${ai}_${fi}`,ai===2?new ImageData(f.width,f.height):image(f.width,f.height))));return {name,sheetIndex:si,visible,opacity:1,frameData,getFrameData(k){return this.frameData.get(k);}};};
async function main(){
 const layers=[layer('头发 / 02 齐刘海 / 前发',0),layer('头发 / 02 齐刘海 / 前发',1,false),layer('头发 / 02 齐刘海 / 前发',2),layer('头发 / 02 齐刘海 / 前发',3),layer('头发 / 01 斜刘海 / 前发',0,false)];
 const p={name:'测试角色',layers,spriteSheets:sheets,getFrameKey:(si,ai,fi)=>`${si}_${ai}_${fi}`};
 const ex=new PE.ExportManager();ex.project=p;let downloads=[];ex._downloadBlob=(blob,name)=>downloads.push(name);
 const before=layers.map(l=>({visible:l.visible,pixels:[...l.frameData].map(([k,d])=>[k,Buffer.from(d.data)])}));
 const blob=await ex.exportPartsAsZip(0),zip=await JSZip.loadAsync(await blob.arrayBuffer());
 for(const name of ['前发-齐刘海-待机.png','前发-齐刘海-坐.png','前发-齐刘海-拾取.png'])assert(zip.file(name),name);
 assert.equal(Object.keys(zip.files).length,5);assert.equal(downloads[0],'前发-齐刘海-全动作部件.zip');
 const manifest=JSON.parse(await zip.file('部件说明.json').async('string'));
 assert.equal(manifest.files[1].rows[0].durationsMs[0],100);assert.equal(manifest.files[0].rows[0].durationsMs[0],180);
 const decoded=png.decode(await zip.file('前发-齐刘海-拾取.png').async('nodebuffer'));
 assert.equal(decoded.width,80);assert.equal(decoded.height,120);
 assert.equal(decoded.data[(2*80+4)*4+3],255);assert.equal(decoded.data[((80+2)*80+4)*4+3],0,'back view stays transparent');
 assert.equal(manifest.order.find(o=>o.sheetIndex===0&&o.direction==='up').backToFront.length,0);
 const visibleZip=await JSZip.loadAsync(await (await ex.exportPartsAsZip()).arrayBuffer());assert(!visibleZip.file('前发-齐刘海-坐.png'));assert(!visibleZip.file('前发-斜刘海-待机.png'));
 assert.deepEqual(layers.map(l=>({visible:l.visible,pixels:[...l.frameData].map(([k,d])=>[k,Buffer.from(d.data)])})),before);
 const archive=ex.exportProject(false),loaded=await ex.importProject(archive);assert.deepEqual(loaded.project.layers.map(l=>l.visible),layers.map(l=>l.visible),'saved switch states reload');ex.project=p;
 layers.forEach(l=>l.visible=false);await assert.rejects(ex.exportPartsAsZip(),/没有非透明/);
 await assert.rejects(ex.exportPartsAsZip(99),/请选择/);
 console.log('PASS: named all-action ZIPs, hidden selected family, visible-only bundle, transparent back rows, 40px alignment, frame timing, visibility persistence, no pixel mutation, empty/error handling.');
 // Exercise the actual saved character without changing it.
 const raw=JSON.parse(fs.readFileSync(path.join(root,'data/shared-project.json'),'utf8'));
 for(const l of raw.layers){l.frameData=new Map(Object.entries(l.frameData).map(([k,f])=>{let d=png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));return [k,new ImageData(new Uint8ClampedArray(d.data),d.width,d.height)];}));l.getFrameData=k=>l.frameData.get(k);}
 raw.getFrameKey=(si,ai,fi)=>`${si}_${ai}_${fi}`;ex.project=raw;
 const idx=raw.layers.findIndex(l=>l.name==='头发 / 02 齐刘海 / 前发');
 const real=await ex.exportPartsAsZip(idx),rz=await JSZip.loadAsync(await real.arrayBuffer());
 assert.equal(Object.keys(rz.files).filter(n=>n.endsWith('.png')).length,5);
 const out=path.join(root,'备份/20261026-跨动作部件功能');fs.writeFileSync(path.join(out,'齐刘海-全动作部件.zip'),Buffer.from(await real.arrayBuffer()));
 for(const f of Object.keys(rz.files).filter(n=>n.endsWith('.png')))fs.writeFileSync(path.join(out,f),await rz.file(f).async('nodebuffer'));
 const all=await ex.exportPartsAsZip();fs.writeFileSync(path.join(out,'当前可见部件-全动作.zip'),Buffer.from(await all.arrayBuffer()));
 console.log('PASS: real character exports five named hairstyle sheets and current visible parts; project data unchanged.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
