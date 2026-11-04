const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {createCanvas,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;vm.runInThisContext(fs.readFileSync('js/core.js','utf8'));
const out=__dirname,before=JSON.parse(fs.readFileSync(path.join(out,'before.json'))),p=structuredClone(before);
const hair=l=>l.sheetIndex===8&&/^头发 \/ (80009|80011)/.test(l.name),colors={O:119,s:178,B:209};
// Native-pixel traces: each row is hand placed; no resampling, dilation, or automatic outlining.
function trace(rows,mirror=false){let im=new ImageData(36,36);for(let [y,x,s]of rows)for(let j=0;j<s.length;j++){let v=colors[s[j]];if(v===undefined)continue;let xs=mirror?[x+j,35-x-j]:[x+j];for(let xx of xs)im.data.set([v,v,v,255],(y*36+xx)*4)}return im}
const frontDown=trace([
 [4,13,'OOOOO'],[5,11,'OOBBBBB'],[6,9,'OOBBBBBBB'],[7,8,'OsBBBBBBBB'],
 [8,8,'OsBBBBBBBB'],[9,7,'OsBBBBBBBBB'],[10,6,'OsBBBBsBBBBs'],
 [11,6,'OsBBBsBBBBss'],[12,6,'OsBBssBBBsOO'],[13,6,'OsBssOO.OOO'],
 [14,6,'OsBsO'],[15,6,'OsBO'],[16,6,'OsBO'],[17,6,'OsBO'],[18,6,'OsBO'],
 [19,7,'OsBO'],[20,7,'OsBO'],[21,8,'OsBO'],[22,8,'OsBO'],[23,9,'OOO']
],true);
const frontSide=trace([
 [4,15,'OOOOOOOOOO'],[5,13,'OOBBBBBBBBBsOO'],[6,12,'OBBBBBBBBBBBBBsO'],
 [7,11,'OsBBBBBBBBBBBBBBsBO'],[8,11,'OsBBBBBBBBBBBBBBsBsO'],
 [9,11,'OsBBBBBBBBBBBBBBsBsO'],[10,11,'OsBBBBBsBBBBBBsssBsO'],
 [11,11,'OsBBBBssBBBBBsssBBsO'],[12,11,'OsBBBsssBBsssOOOBBsO'],
 [13,11,'OsBBssO.OOOOO...OsO'],[14,11,'OsBBssO..........OsO'],
 [15,11,'OsBBsO...........OsO'],[16,11,'OsBBsO............OO'],
 [17,12,'OsBsO.............OO'],[18,12,'OsBsO............OsO'],
 [19,12,'OsBsO...........OsO'],[20,13,'OsBO...........OsO'],
 [21,14,'OsO..........OsBO'],[22,13,'OsBO.........OsBO'],[23,14,'OOO..........OOO']
]);
const rearUp=trace([
 [4,11,'OOOOOOO'],[5,10,'OsBBBBBB'],[6,9,'OsBBBBBBB'],[7,8,'OsBBBBBBBB'],
 [8,7,'OsBBBBBBBBB'],[9,6,'OsBBBBBBBBBB'],[10,6,'OsBBBBBBBBBB'],[11,6,'OssBBBBBBBBB'],
 [12,6,'OsssBBBBBBBB'],[13,6,'OsssssBBBBBB'],[14,6,'Osssssssssss'],
 [15,4,'OOOBBsssssssss'],[16,3,'OsBOOBsssssssss'],[17,3,'OsBBsOBssssssss'],
 [18,3,'OsBBssOssssssss'],[19,4,'OsBsOOssssssss'],[20,5,'OsBOsOsssssss'],
 [21,5,'OsBOsOsssssss'],[22,4,'OsBBsOOsssssss'],[23,3,'OsBsOO.OOOOOOOO'],
 [24,3,'OOOO'],[25,3,'OOO']
],true);
const rearDown=trace([
 [4,14,'OOOO'],[5,12,'OOBBBB'],[6,9,'OOBBBBBBB'],[7,8,'OsBBBBBBBB'],[8,8,'OsBBBBBBBB'],
 [9,7,'OsssO'],[10,7,'OssO'],[11,6,'OssO'],[12,6,'OsO'],[13,6,'OO'],
 [14,6,'OO'],[15,6,'OsO'],[16,5,'OssO'],[17,4,'OsOO'],
 [18,3,'OsBOO'],[19,3,'OsBBsO'],[20,3,'OsBBBO'],[21,4,'OsBBO'],
 [22,5,'OsBO'],[23,5,'OsBO'],[24,4,'OsBBO'],[25,3,'OsOO'],[26,3,'OOO']
],true);
const rearSide=trace([
 [4,13,'OOOOOOOOO'],[5,11,'OOBBBBBBBBBsO'],[6,9,'OOBBBBBBBBBBBBsO'],
 [7,9,'OsBBBBBBBBBBBBBsO'],[8,7,'OOsBBBBBBBBBBBBBBsO'],[9,7,'OsBBBBBBBBBBBBBBBBssO'],
 [10,7,'OsBBBBBBBBBBBBBssssssO'],[11,6,'OsBBBBBBBBBBBBsO'],[12,6,'OsBBBBBBBBBBssO'],
 [13,6,'OsBBBBBBBBssO'],[14,6,'OsBBBBBsssO'],[15,6,'OsBBBsssOO'],
 [16,6,'OsBBsO'],[17,6,'OsBO'],[18,4,'OOsOO'],[19,3,'OsBsOO'],
 [20,3,'OsBBsOO'],[21,3,'OsBBBsOO'],[22,4,'OsBBBsO'],[23,5,'OsBBsO'],
 [24,6,'OsBsO'],[25,6,'OsBsO'],[26,5,'OsBBsO'],[27,3,'OOsBsO'],[28,3,'OsOO'],[29,4,'OO'],
 [17,28,'OO'],[18,28,'OsBO'],[19,28,'OsBO'],[20,28,'OsBO'],
 [21,27,'OsBBO'],[22,26,'OsBsO'],[23,26,'OsBO'],[24,25,'OsBO'],
 [25,25,'OsBO'],[26,25,'OsBBBO'],[27,27,'OsOO'],[28,28,'OO']
]);
// Simple reference lighting: one light cap and connected lower shadows; no texture marks.
const bases={'前发':[frontSide,frontDown,new ImageData(36,36)],'底层后发':[new ImageData(36,36),rearDown,rearUp],'侧面后发':[rearSide,new ImageData(36,36),new ImageData(36,36)]};
function store(im){let c=createCanvas(36,36);c.getContext('2d').putImageData(im,0,0);return {width:36,height:36,dataURL:c.toDataURL()}}
let changes=[];
for(let l of p.layers.filter(l=>hair(l)&&!l.isGroup))for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
 let kind=l.name.split(' / ').at(-1),base=bases[kind][ai],im=new ImageData(36,36),breath=fi>=2;
 let cut=ai===2?21:18;
 for(let y=0;y<36;y++)for(let x=0;x<36;x++){
  let i=(y*36+x)*4;if(!base.data[i+3]||breath&&y===cut)continue;
  let ny=y+(breath?(y<cut?2:1):0),nx=x;
  // Curl tips lag one pixel; roots and bangs remain attached to the same head pose.
  if(kind!=='前发'&&y>=24){let phase=[0,0,1,0][fi];nx+=(x<17.5?1:-1)*phase}
  assert(nx>=0&&nx<36&&ny>=0&&ny<36);im.data.set(base.data.subarray(i,i+4),(ny*36+nx)*4);
 }
 let key=`8_${ai}_${fi}`;l.frameData[key]=store(im);changes.push({layer:l.name,key});
}
assert.deepEqual(p.layers.filter(l=>!hair(l)),before.layers.filter(l=>!hair(l)));assert.deepEqual(p.spriteSheets,before.spriteSheets);
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));fs.writeFileSync(path.join(out,'改动范围.json'),JSON.stringify(changes,null,2));
async function tile(project,ai,fi){let c=createCanvas(36,36),g=c.getContext('2d');for(let l of PE.getRenderLayers(project,8,ai)){if(l.sheetIndex!==8||l.isGroup||l.visible===false)continue;let par=l.parent,visible=true;while(par!=null){if(project.layers[par].visible===false)visible=false;par=project.layers[par].parent}if(visible&&l.frameData?.[`8_${ai}_${fi}`])g.drawImage(await loadImage(l.frameData[`8_${ai}_${fi}`].dataURL),0,0)}return c}
(async()=>{let c=createCanvas(864,648),g=c.getContext('2d');g.imageSmoothingEnabled=false;for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){let t=await tile(p,ai,fi);fs.writeFileSync(path.join(out,`帧-${ai}-${fi}.png`),t.toBuffer('image/png'));g.fillStyle=fi%2?'#35434b':'#d7dbd7';g.fillRect(fi*216,ai*216,216,216);g.drawImage(t,fi*216,ai*216,216,216)}fs.writeFileSync(path.join(out,'像素手修候选.png'),c.toBuffer('image/png'));let cmp=createCanvas(648,432),cg=cmp.getContext('2d');cg.imageSmoothingEnabled=false;for(let ai=0;ai<3;ai++)for(let a=0;a<2;a++){cg.fillStyle=a?'#35434b':'#d7dbd7';cg.fillRect(ai*216,a*216,216,216);cg.drawImage(await tile(a?p:before,ai,0),ai*216,a*216,216,216)}fs.writeFileSync(path.join(out,'上原稿下清理.png'),cmp.toBuffer('image/png'));console.log(out)})().catch(e=>{console.error(e);process.exitCode=1});

