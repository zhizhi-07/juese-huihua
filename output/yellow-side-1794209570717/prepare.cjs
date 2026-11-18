const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {fixture}=require('../../test/clothing-sync.cjs'),png=require('../../scripts/png.cjs');
const {createCanvas}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const write=(n,b)=>fs.writeFileSync(path.join(__dirname,n),b);
(async()=>{
  const {p,raw}=await fixture(),C=PE.ClothingSync,previous=require('../yellow-sit-1794209285375/readback.json'),candidate=structuredClone(raw);
  const a=p.spriteSheets[3].actions[0];assert.equal(a.direction,'side');
  const layer=p.layers.find(l=>l.sheetIndex===3&&l.name==='\u670d\u88c5 / \u9ec4\u8272'&&l.getFrameData('3_0_0')),idx=p.layers.indexOf(layer);
  assert(layer&&!layer.locked);const out=candidate.layers[idx],src=C.raster(layer.getFrameData('3_0_0'),a.frames[0],2);
  const cv=createCanvas(440,432),g=cv.getContext('2d');g.fillStyle='#f3efe6';g.fillRect(0,0,cv.width,cv.height);
  g.fillStyle='#41382d';g.font='bold 17px Arial';g.fillText('YELLOW / SIDE SIT',15,22);
  const changes={};
  for(const fi of [2,3]){
    const f=a.frames[fi],key=p.getFrameKey(3,0,fi),old=layer.getFrameData(key),next=PE.utils.cloneImageData(old);
    assert(!f.locked&&!f.lockedRegions?.length);assert.deepEqual(raw.layers[idx].frameData[key],previous.layers[idx].frameData[key]);
    assert.deepEqual([old.width,old.height,old.placement],[32,32,{x:0,y:0,w:16,h:16}]);
    const stride=32*4;
    // Keep the upper half of the chin row, then tuck one native row of collar and shirt above the pants.
    for(const [sy,dy] of [[25,27],[26,28]])for(let x=12;x<22;x++){
      const i=sy*stride+x*4,j=dy*stride+x*4,pixel=src.data.subarray(i,i+4);
      assert(pixel[3]&&(pixel[0]===255));
      next.data.set(pixel,j);
    }
    changes[key]=0;
    for(let i=0;i<next.data.length;i+=4)if(next.data.subarray(i,i+4).some((v,j)=>old.data[i+j]!==v)){
      assert([27,28].includes(Math.floor(i/stride)));changes[key]++;
    }
    assert.equal(changes[key],19);
    assert.deepEqual(next.data.subarray(29*stride),old.data.subarray(29*stride));
    out.frameData[key]={...out.frameData[key],dataURL:'data:image/png;base64,'+png.encode(32,32,next.data).toString('base64')};
    const x=72+(fi-2)*178;
    for(const [j,im] of [old,next].entries()){
      const y=52+j*180;
      g.fillStyle='#e9e1d3';g.fillRect(x,y,160,160);g.save();g.beginPath();g.rect(x,y,160,160);g.clip();
      for(const l of PE.getRenderLayers(p,3,0))if(PE.isLayerVisible(p,l,3)&&l.opacity>0){
        const d=l===layer?im:l.getFrameData(key);if(!d)continue;
        g.globalAlpha=l.opacity;PE.utils.drawImageData(g,d,x,y,10);
      }
      g.restore();
      g.fillStyle='#41382d';g.font='13px Arial';g.fillText(j?'After':'Before',15,y+94);if(!j)g.fillText('FRAME '+(fi+1),x,y-7);
    }
  }
  const reversed=structuredClone(candidate);
  for(const key of Object.keys(changes))reversed.layers[idx].frameData[key]=raw.layers[idx].frameData[key];
  assert.deepEqual(reversed,raw);
  const B=require('../../js/body-sync.cjs'),main=require('./main-before.json'),disk=require('../../data/projects/'+B.BASE_PROJECT_ID+'.json'),pre=structuredClone(candidate);
  assert.equal(B.push(pre,main,disk).mainChanged,0);
  B.pull(pre,main);assert.deepEqual(JSON.parse(JSON.stringify(pre)),candidate);
  write('preview.png',cv.toBuffer('image/png'));write('candidate.json',JSON.stringify(candidate));
  console.log('Only these 2 side sitting cels changed (2x pixels):',changes);
})().catch(e=>{console.error(e);process.exitCode=1});

