const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
function fixture(){
  const data={version:'1.0',name:'测试草稿',currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,currentLayerIndex:2,palette:[],layers:[],spriteSheets:[]};
  for(const [si,key]of ['idle','walk','sit','pickup'].entries()){
    const size=key==='idle'?36:key==='pickup'?40:32,actions=['down','side','up'].map(direction=>({name:direction,direction,frames:[0,1].map(fi=>({sheetIndex:si,width:size,height:size,sourceX:fi*size,sourceY:0,duration:120}))}));
    const canvas=createCanvas(size*2,size*3);canvas.getContext('2d').fillRect(0,0,2,2);
    data.spriteSheets.push({name:'original32_'+key,frameWidth:size,frameHeight:size,columns:2,rows:3,fps:8,sourceBytes:'UNSELECTED_SOURCE_BYTES',imageDataURL:canvas.toDataURL(),actions});
    for(const [name,color,x,y]of [['body','#7ea78f',-3,0],['head','#ebcc9f',-4,-8],['头发 / 01 完整头发 / 后发','#446f83',-6,-10],['头发 / 01 完整头发 / 前发','#28576a',-4,-11],['服装 / 01 完整衣服 / 上衣','#c77365',-4,-1],['服装 / 99 半成品 / 上衣','#ff00ff',-12,-2],['自画裙子','#665588',-4,4]]){
      const layer={name,sheetIndex:si,visible:!name.includes('半成品')&&name!=='自画裙子',opacity:1,parent:null,frameData:{}};
      actions.forEach((a,ai)=>a.frames.forEach((f,fi)=>{
        const c=createCanvas(size,size),ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(size/2+x,size/2+y+fi,8,name==='body'?9:5);
        layer.frameData[`${si}_${ai}_${fi}`]={width:size,height:size,dataURL:c.toDataURL()};
      }));data.layers.push(layer);
    }
  }
  const arbitrary=data.layers.filter(l=>l.name==='自画裙子'),combined={name:'自画裙子',visible:false,opacity:1,frameData:Object.assign({},...arbitrary.map(l=>l.frameData))};
  data.layers=data.layers.filter(l=>l.name!=='自画裙子');data.layers.push(combined);
  return data;
}
async function main(){
  global.window=global;global.ImageData=ImageData;global.Image=Image;
  global.document={addEventListener(){},createElement(){const c=createCanvas(1,1);c.toBlob=fn=>fn(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;}};
  global.FileReader=class{async readAsText(file){this.result=await file.text();this.onload();}};
  global.JSZip=require('../js/vendor/jszip.min.js');
  for(const file of ['core','export','visual-layers','wardrobe'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js',file+'.js'),'utf8'),{filename:file+'.js'});
  const W=PE.Wardrobe,raw=fixture(),before=JSON.stringify(raw),runtime=await W.decode(raw),choices=W.choices(runtime);
  assert(choices.some(c=>c.key==='自画裙子'),'layers without sheetIndex can be collected');
  assert(!choices.some(c=>['body','head'].includes(c.key)));
  const chosen=choices.filter(c=>c.category==='头发').map(c=>c.key),data=W.snapshot(raw,chosen,'成品头发','头发','draft-unit');
  assert.equal(JSON.stringify(raw),before,'snapshot never changes source');
  assert.equal(data.layers.length,8);assert.equal(data.spriteSheets.length,4);
  assert(data.layers.every(l=>l.name.startsWith('头发 /')&&l.parent===null&&l.visible));
  assert(!JSON.stringify(data).includes('UNSELECTED_SOURCE_BYTES'));assert(data.spriteSheets.every((s,i)=>s.imageDataURL!==raw.spriteSheets[i].imageDataURL));assert(!JSON.stringify(data).includes('半成品'));
  assert.equal(data.wardrobe.sourceProjectId,'draft-unit');
  const custom=W.snapshot(raw,['自画裙子'],'裙子','衣服','draft-unit');assert.equal(custom.layers.length,4);assert(custom.layers.every(l=>Object.keys(l.frameData).every(k=>k.startsWith(l.sheetIndex+'_'))));
  const single=W.snapshot(raw,['前发-完整头发'],'仅前发','头发','draft-unit');assert(single.layers.every(l=>l.name.endsWith('前发')));
  assert.throws(()=>W.snapshot(raw,[],'空','头发','draft-unit'),/勾选/);assert.throws(()=>W.snapshot(raw,chosen,'','头发','draft-unit'),/名称/);
  const p=await W.decode(data),entry={data,project:p};
  assert(p.spriteSheets.every(s=>s.imageData&&!W.hasPixels(s.imageData)),'original source sheet is replaced by a transparent canvas, not a branch composite');
  const standardExporter=new PE.ExportManager();standardExporter.init(p,null);assert((await standardExporter._renderSpriteSheetBlob(0)).size>0,'clean JSON remains compatible with the existing sprite-sheet exporter');
  assert.equal(W.locate(p,'walk','left').flip,true);assert.equal(W.locate(p,'walk','right').flip,false);assert.equal(W.locate(p,'sleep','down'),null);
  assert.equal(W.frameAt(p.spriteSheets[0],p.spriteSheets[0].actions[0],120),1);assert.equal(W.frameAt(p.spriteSheets[0],p.spriteSheets[0].actions[0],240),0);assert.equal(W.frameAt(p.spriteSheets[0],p.spriteSheets[0].actions[0],500,false),1);
  assert(W.rank(p.layers[0],'up')>W.rank({name:'head'},'up'));assert(W.rank(p.layers[0],'down')<W.rank({name:'body'},'down'));
  PE.ExportManager.prototype._downloadBlob=function(blob,name){assert.equal(name,'成品头发-成品.zip');};
  const blob=await W.exportItem(entry),zip=await JSZip.loadAsync(await blob.arrayBuffer());
  const manifest=JSON.parse(await zip.file('阵列说明.json').async('string'));assert.equal(manifest.files.length,4);assert.deepEqual(manifest.files[0].rows[0].durationsMs,[120,120]);
  assert.deepEqual(JSON.parse(await zip.file('成品.json').async('string')),JSON.parse(JSON.stringify(data)));
  const png=require('../scripts/png.cjs'),decoded=png.decode(await zip.file('original32_idle.png').async('nodebuffer'));
  assert.equal(decoded.width,72);assert.equal(decoded.height,108);assert.equal(decoded.data[3],0);assert(decoded.data.some((v,i)=>i%4===3&&v));
  const atlas=png.decode(await zip.file('全部动作.png').async('nodebuffer'));assert.equal(atlas.width,80);assert.equal(atlas.height,420);assert.equal(manifest.files[1].atlasRect.y,108);assert.equal(atlas.data[3],0);
  assert(!Object.keys(zip.files).some(n=>/草稿|半成品/.test(n)));
  console.log('PASS: independent selected-only snapshots, custom cross-sheet layers, no embedded branch/source/body, source unchanged, frame timing/mirroring, rear-hair ordering, transparent combined action arrays and complete JSON ZIP.');
}
module.exports={fixture};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
