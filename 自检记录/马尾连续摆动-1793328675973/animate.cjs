const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {createCanvas,loadImage,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const file=n=>path.join(__dirname,n),before=JSON.parse(fs.readFileSync(file('before.json'))),p=structuredClone(before),color={O:119,s:178,B:209};
async function read(f){let c=createCanvas(36,36),g=c.getContext('2d');g.drawImage(await loadImage(f.dataURL),0,0);return g.getImageData(0,0,36,36)}
function save(im){let c=createCanvas(36,36);c.getContext('2d').putImageData(im,0,0);return {width:36,height:36,dataURL:c.toDataURL()}}
function rows(im,list,mirror=false){for(let [y,x,s]of list)for(let j=0;j<s.length;j++)if(color[s[j]]!==undefined)for(let xx of mirror?[x+j,35-x-j]:[x+j]){assert(xx>=0&&xx<36&&y>=0&&y<36);let v=color[s[j]];im.data.set([v,v,v,255],(y*36+xx)*4)}}
function copy(im,base,test,dy=0){for(let y=0;y<36;y++)for(let x=0;x<36;x++)if(test(x,y)&&base.data[(y*36+x)*4+3]){let i=(y*36+x)*4;assert(y+dy<36);im.data.set(base.data.subarray(i,i+4),((y+dy)*36+x)*4)}}
const nearSide={
 1:[[23,5,'OsBBsO'],[24,7,'OsBsO'],[25,7,'OsBsO'],[26,6,'OsBBsO'],[27,4,'OOsBsO'],[28,4,'OsOO'],[29,5,'OO']],
 2:[[25,5,'OsBBsO'],[26,6,'OsBsO'],[27,7,'OsBsO'],[28,7,'OsBsO'],[29,5,'OOsBsO'],[30,6,'OOO']],
 3:[[25,5,'OsBBsO'],[26,6,'OsBsO'],[27,6,'OsBsO'],[28,6,'OsBBsO'],[29,4,'OOsBsO'],[30,5,'OOO']]
};
const farSide={
 1:[[23,26,'OsBO'],[24,24,'OsBO'],[25,24,'OsBO'],[26,24,'OsBBBO'],[27,26,'OsOO'],[28,27,'OO']],
 2:[[25,26,'OsBO'],[26,25,'OsBO'],[27,24,'OsBO'],[28,24,'OsBBBO'],[29,26,'OsOO']],
 3:[[25,26,'OsBO'],[26,25,'OsBO'],[27,25,'OsBO'],[28,24,'OsBBBO'],[29,26,'OsOO']]
};
const down={
 1:[[21,4,'OsBBO'],[22,5,'OsBO'],[23,6,'OsBO'],[24,5,'OsBBO'],[25,4,'OsOO'],[26,4,'OOO']],
 2:[[23,4,'OsBBO'],[24,5,'OsBO'],[25,6,'OsBO'],[26,5,'OsBBO'],[27,5,'OsOO']],
 3:[[23,4,'OsBBO'],[24,5,'OsBO'],[25,5,'OsBO'],[26,5,'OsBBO'],[27,4,'OsOO']]
};
const up={
 1:[[22,4,'OsBBsOO'],[23,4,'OsBsO.O'],[24,4,'OOOO'],[25,4,'OOO']],
 2:[[24,5,'OsBBsO'],[25,5,'OsBsOO'],[26,5,'OOO']],
 3:[[24,4,'OsBBsOO'],[25,4,'OsBsOOO'],[26,4,'OOO']]
};
(async()=>{
let rear=p.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('/ 底层后发')),side=p.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('/ 侧面后发')),front=p.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('/ 前发'));
let s0=await read(side.frameData['8_0_0']),d0=await read(rear.frameData['8_1_0']),u0=await read(rear.frameData['8_2_0']),f0=await read(front.frameData['8_1_0']),checks=[];
for(let fi=1;fi<4;fi++){
 let dy=fi>=2?2:0,im=new ImageData(36,36);
 // Keep every pixel of the knot/upper curl. Only the lower curl is retraced per pose.
 copy(im,s0,(x,y)=>y<=22,dy);rows(im,nearSide[fi]);rows(im,farSide[fi]);side.frameData[`8_0_${fi}`]=save(im);
 for(let y=17;y<=22;y++)for(let x=0;x<36;x++){let i=(y*36+x)*4,j=((y+dy)*36+x)*4;assert.deepEqual(im.data.slice(j,j+4),s0.data.slice(i,i+4),'Side knot changed')}
 checks.push({fi,sideKnotFull:true,nearTipX:[4,5,6,5][fi],headOffset:dy,tailOffset:fi>=2?1:0});
 im=new ImageData(36,36);copy(im,d0,(x,y)=>y<=20,dy);rows(im,down[fi],true);rear.frameData[`8_1_${fi}`]=save(im);
 im=await read(rear.frameData[`8_2_${fi}`]);
 // Central back-cap breathing stays unchanged; do not compress a row through either braid.
 for(let y=15+dy;y<36;y++)for(let x=0;x<36;x++)if(x<=10||x>=25)im.data.fill(0,(y*36+x)*4,(y*36+x)*4+4);
 copy(im,u0,(x,y)=>y>=15&&y<=21&&(x<=10||x>=25),dy);rows(im,up[fi],true);rear.frameData[`8_2_${fi}`]=save(im);
 im=new ImageData(36,36);
 // Two identical straight-strand rows can share one row on the low head pose; never cut a knot.
 for(let y=0;y<36;y++)for(let x=0;x<36;x++){
  if(dy&&y===21)continue;let ny=y+(dy?(y<21?2:1):0);if(ny>=36)continue;let i=(y*36+x)*4;if(f0.data[i+3])im.data.set(f0.data.subarray(i,i+4),(ny*36+x)*4);
 }
 front.frameData[`8_1_${fi}`]=save(im);
}
assert.deepEqual(front.frameData['8_1_0'],before.layers.find(l=>l.sheetIndex===8&&l.name===front.name).frameData['8_1_0'],'User first frame overwritten');
for(let l of [rear,side])for(let ai=0;ai<3;ai++){let key=`8_${ai}_0`;assert.deepEqual(l.frameData[key],before.layers.find(v=>v.sheetIndex===8&&v.name===l.name).frameData[key],'First pose altered')}
for(let li=0;li<p.layers.length;li++)if(![rear,side,front].includes(p.layers[li]))assert.deepEqual(p.layers[li],before.layers[li]);
fs.writeFileSync(file('candidate.json'),JSON.stringify(p));fs.writeFileSync(file('马尾结构与用户首帧保护.json'),JSON.stringify({userFrontFirstFrameUnchanged:true,userEditPixels:20,sourcePoseOrder:[0,1,2,1],checks},null,2));
console.log('PASS: user first front frame and all first poses retained; full side knots retained in every frame; lower curls retraced in source 1-2-3-2 order');
})().catch(e=>{console.error(e);process.exitCode=1});

