const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {createCanvas,loadImage,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const file=n=>path.join(__dirname,n),p=JSON.parse(fs.readFileSync(file('candidate.json'))),C={O:119,s:178,B:209};
const si=p.spriteSheets.findIndex(s=>s.name==='original32_sit');assert.equal(si,10);assert(!p.layers.some(l=>l.sheetIndex===si&&l.name.startsWith('头发')));
async function read(f){let c=createCanvas(f.width,f.height),g=c.getContext('2d');g.drawImage(await loadImage(f.dataURL),0,0);return g.getImageData(0,0,f.width,f.height)}
function save(im){let c=createCanvas(32,32);c.getContext('2d').putImageData(im,0,0);return {width:32,height:32,dataURL:c.toDataURL()}}
function paint(im,rows,dy=0,front=false){for(let [y,x,s]of rows){if(front&&dy&&y===19)continue;let yy=y+dy-(front&&dy&&y>19?1:0);for(let j=0;j<s.length;j++)if(C[s[j]]!==undefined){let v=C[s[j]];im.data.set([v,v,v,255],(yy*32+x+j)*4)}}}
const frontRows=[
 [4,15,'OOOOOOO'],[5,13,'BBBBBBBBsO'],[6,12,'BBBBBBBBBBsO'],[7,11,'BBBBBBBBBBBBsO'],
 [8,10,'BBBBBBBBBBBBBBsO'],[9,10,'BBBBBBBBBBBBBBsO'],[10,10,'sBBBBBBBBBBsssO'],
 [11,10,'ssBBBBBBBBssssO'],[12,10,'ssBBssBBssssssO'],[13,10,'sssssOO.OOOOOO'],
 [14,10,'OsBBsO'],[15,10,'OsBBsO'],[16,10,'OsBsO'],[17,10,'OsBsO'],
 [18,11,'OsBO'],[19,11,'OsBO'],[20,12,'OsO'],[21,12,'OsBO'],[22,13,'OsO'],[23,13,'OOO']
];
const rearRows=[
 [4,10,'OOOOOOOOOO'],[5,9,'OsBBBBBBBsO'],[6,8,'OsBBBBBBBBBBsO'],[7,7,'OsBBBBBBBBBBBsO'],
 [8,6,'OsBBBBBBBBBBBBsO'],[9,6,'OsBBBBBBBBBBBsO'],[10,6,'OsBBBBBBBBBssO'],
 [11,6,'OsBBBBBBBssO'],[12,6,'OsBBBBBsssO'],[13,6,'OsBBBBsssO'],[14,6,'OsBBBsssO'],
 [15,6,'OsBBsssO'],[16,6,'OsBssO'],[17,6,'OsBO']
];
(async()=>{
let idleRear=p.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('/ 底层后发')),idleSide=p.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('/ 侧面后发')),idleFront=p.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('/ 前发'));
let group={sheetIndex:si,isGroup:true,parent:null,depth:0,name:'头发 / 80009 / 后发',visible:true,locked:false,opacity:1,frameData:{}},rear={...structuredClone(idleRear),sheetIndex:si,parent:2,frameData:{}},side={...structuredClone(idleSide),sheetIndex:si,parent:2,frameData:{}},front={...structuredClone(idleFront),sheetIndex:si,parent:null,frameData:{}},measure=[];
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
 let key=`${si}_${ai}_${fi}`,dy=fi>=2?1:0;
 for(let [target,source]of [[rear,idleRear],[side,idleSide],[front,idleFront]]){
  let im=new ImageData(32,32);
  if(ai===0){
   if(target===front)paint(im,frontRows,dy,true);
   if(target===side){paint(im,rearRows,dy);let base=await read(source.frameData[`8_0_${fi}`]);for(let y=18+(fi>=2?2:0);y<36;y++)for(let x=0;x<20;x++){let i=(y*36+x)*4;if(!base.data[i+3])continue;let yy=y-(fi>=2?1:0);assert(yy<32);im.data.set(base.data.subarray(i,i+4),(yy*32+x)*4)}}
  }else{
   let base=await read(source.frameData[`8_${ai}_${fi}`]);for(let y=0;y<36;y++)for(let x=0;x<36;x++){let i=(y*36+x)*4;if(!base.data[i+3])continue;let xx=x-2,yy=y-(fi>=2?1:0);assert(xx>=0&&xx<32&&yy>=0&&yy<32,'Sit crop');im.data.set(base.data.subarray(i,i+4),(yy*32+xx)*4)}
  }
  target.frameData[key]=save(im);
 }
 measure.push({key,headOffset:dy,profileDrawnFromRightTV:ai===0,backFrontTransparent:ai!==2||!((await read(front.frameData[key])).data.some((v,i)=>i%4===3&&v))});
}
// Insert the behind-body rear slot; preserve every existing parent relation and selected layer.
for(let l of p.layers)if(l.parent!=null&&l.parent>=2)l.parent+=2;
p.layers.splice(2,0,group,rear);p.layers.push(side,front);if(p.currentLayerIndex>=2)p.currentLayerIndex+=2;
fs.writeFileSync(file('candidate.json'),JSON.stringify(p));fs.writeFileSync(file('坐姿对齐.json'),JSON.stringify(measure,null,2));console.log('PASS: added only sitting hair slots; side profile traced separately, 12 poses; original body/head/hand cels retained');
})().catch(e=>{console.error(e);process.exitCode=1});

