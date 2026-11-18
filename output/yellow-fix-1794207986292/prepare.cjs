const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {fixture}=require('../../test/clothing-sync.cjs'),png=require('../../scripts/png.cjs');
const {createCanvas}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const write=(name,data)=>fs.writeFileSync(path.join(__dirname,name),data);
(async()=>{
  const {p,raw}=await fixture(),C=PE.ClothingSync,name='\u670d\u88c5 / \u9ec4\u8272';
  const source=p.layers.find(l=>l.name===name&&l.sheetIndex===1),index=p.layers.indexOf(source),before=new Map(source.frameData);
  assert(source?.clothingSync&&!source.clothingSync.idleShadows);
  const r=C.plan(p,source),candidate=structuredClone(raw),out=candidate.layers[index];
  assert(r.sitPending);assert.deepEqual(r.edits.filter(e=>e.layer===source&&e.key.endsWith('_0')).map(e=>e.key),['1_0_0','1_1_0','1_2_0']);
  const changes={};
  for(const {layer,key,image} of r.edits){
    const old=layer.getFrameData(key);
    if(layer!==source||!key.endsWith('_0')){
      assert.deepEqual(old.data,image.data,key+' other frame would change');
      assert.deepEqual(old.placement,image.placement);continue;
    }
    assert.deepEqual([old.width,old.height,old.placement],[image.width,image.height,image.placement]);
    const ai=Number(key.split('_')[1]),body=C.base(p,1,ai,0,'body'),bottom=PE.ClothingFit.bounds(body).bottom;
    changes[key]=0;
    for(let i=0;i<image.data.length;i+=4){
      const a=old.data.subarray(i,i+4),b=image.data.subarray(i,i+4);
      assert.equal(a[3],b[3]);
      if(a.every((v,j)=>v===b[j]))continue;
      const x=Math.floor(old.placement.x+(i/4%old.width)/2),y=Math.floor(old.placement.y+Math.floor(i/4/old.width)/2),at=(y*body.width+x)*4;
      assert(y>=bottom-1&&y<=bottom);
      assert.deepEqual([...body.data.subarray(at,at+4)],[224,197,180,255]);
      changes[key]++;
    }
    out.frameData[key]={...out.frameData[key],dataURL:'data:image/png;base64,'+png.encode(image.width,image.height,image.data).toString('base64')};
  }
  C.apply(r);C.validate(p);out.clothingSync=structuredClone(source.clothingSync);
  assert.equal(source.getFrameData('1_1_3'),before.get('1_1_3'));
  const repeat=C.plan(p,source);assert(!repeat.shadowsChanged);assert(!repeat.edits.some(e=>e.layer===source&&e.key.endsWith('_0')));
  for(const e of repeat.edits)assert.deepEqual(e.layer.getFrameData(e.key).data,e.image.data,e.key+' repeated fit differs');
  const B=require('../../js/body-sync.cjs'),main=require('./main-before.json'),disk=require('../../data/projects/'+B.BASE_PROJECT_ID+'.json'),pre=structuredClone(candidate);
  assert.equal(B.push(pre,main,disk).mainChanged,0);
  B.pull(pre,main);assert.deepEqual(JSON.parse(JSON.stringify(pre)),candidate);
  const cv=createCanvas(660,438),g=cv.getContext('2d');
  g.fillStyle='#f3efe6';g.fillRect(0,0,cv.width,cv.height);
  g.fillStyle='#41382d';g.font='bold 19px Arial';g.fillText('IDLE / FRAME 1',18,28);
  g.font='15px Arial';g.fillText('Before',18,137);g.fillText('After',18,329);
  for(const [ai,a] of p.spriteSheets[1].actions.entries()){
    const key=p.getFrameKey(1,ai,0),x=99+ai*183;
    g.fillStyle='#41382d';g.fillText(a.direction.toUpperCase(),x,52);
    for(const [j,y] of [62,254].entries()){
      g.fillStyle='#e9e1d3';g.fillRect(x,y,160,160);
      for(const l of PE.getRenderLayers(p,1,ai))if(PE.isLayerVisible(p,l,1)&&l.opacity>0){
        const im=l===source&&j===0?before.get(key):l.getFrameData(key);if(!im)continue;
        g.globalAlpha=l.opacity;PE.utils.drawImageData(g,im,x,y,10);
      }
      g.globalAlpha=1;
    }
  }
  write('preview.png',cv.toBuffer('image/png'));
  write('candidate.json',JSON.stringify(candidate));
  console.log(JSON.stringify({pixelsChanged:changes,onlyIdleFirst:true,sitInkUnchanged:true,repeatStable:true},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
