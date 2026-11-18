const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {fixture}=require('../../test/clothing-sync.cjs'),png=require('../../scripts/png.cjs');
const {createCanvas}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const write=(name,data)=>fs.writeFileSync(path.join(__dirname,name),data);
(async()=>{
  const {p,raw}=await fixture(),C=PE.ClothingSync,name='\u670d\u88c5 / \u9ec4\u8272';
  const original=p.layers.slice(),selected=original[raw.currentLayerIndex],source=p.layers.find(l=>l.name===name&&l.sheetIndex===1),sourceIndex=original.indexOf(source);
  assert(source&&p.layers.filter(l=>l.name===name).length===1);
  const originals=new Map(source.frameData);
  assert.deepEqual([...originals.keys()].sort(),['1_0_0','1_1_0','1_1_3','1_2_0']);
  C.setup(p,source);
  source.clothingSync.preserved.push('1_1_3');
  const result=C.plan(p,source);
  assert(result.sitPending);
  const counts=[0,0,0,0];
  for(const {key,image} of result.edits){
    const [si,ai,fi]=key.split('_').map(Number),frame=p.spriteSheets[si].actions[ai].frames[fi];
    assert(si!==3&&!originals.has(key));
    assert.deepEqual([image.width,image.height],[frame.width*2,frame.height*2]);
    assert(image.data.some((v,i)=>i%4===3&&v),key+' blank');
    counts[si]++;
  }
  assert.deepEqual(counts,[24,8,18,0]);
  C.apply(result); C.validate(p);
  for(const [k,v] of originals)assert.equal(source.getFrameData(k),v);
  const candidate=structuredClone(raw);
  candidate.currentLayerIndex=p.layers.indexOf(selected);
  candidate.layers=p.layers.map(l=>{
    const i=original.indexOf(l);
    const out=i<0?{name:l.name,sheetIndex:l.sheetIndex,depth:l.depth,locked:l.locked,opacity:l.opacity,visible:l.visible,frameData:{}}:structuredClone(raw.layers[i]);
    if(l.parent!=null||Object.hasOwn(out,'parent'))out.parent=l.parent;
    if(l.name===name){
      out.clothingSyncId=l.clothingSyncId;
      if(l===source)out.clothingSync=structuredClone(l.clothingSync);
      for(const [key,im] of l.frameData)if(!out.frameData[key])out.frameData[key]={width:im.width,height:im.height,placement:im.placement,dataURL:'data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64')};
    }
    if(i>=0&&i!==sourceIndex) {
      const check=structuredClone(out);
      if(l.parent!=null){assert.equal(p.layers[l.parent],original[raw.layers[i].parent]);check.parent=raw.layers[i].parent;}
      assert.deepEqual(check,raw.layers[i]);
    }
    return out;
  });
  assert.deepEqual(candidate.spriteSheets,raw.spriteSheets);
  const B=require('../../js/body-sync.cjs'),main=require('./main-before.json'),disk=require('../../data/projects/'+B.BASE_PROJECT_ID+'.json'),pre=structuredClone(candidate);
  assert.equal(B.push(pre,main,disk).mainChanged,0);
  B.pull(pre,main);assert.deepEqual(JSON.parse(JSON.stringify(pre)),candidate);
  const cv=createCanvas(1060,1025),g=cv.getContext('2d'); g.fillStyle='#f3efe6';g.fillRect(0,0,cv.width,cv.height);
  let y=0;
  for(const [si,label] of [[1,'IDLE'],[0,'WALK'],[2,'PICKUP']]){
    y+=28;g.font='bold 18px Arial';g.fillStyle='#403521';g.fillText(label,22,y);
    for(const [ai,a] of p.spriteSheets[si].actions.entries()){
      g.font='14px Arial';g.fillStyle='#534936';g.fillText(a.direction.toUpperCase(),22,y+59);
      for(const [fi,frame] of a.frames.entries()){
        const key=p.getFrameKey(si,ai,fi),x=125+fi*115;
        g.fillStyle='#e9e1d3';g.fillRect(x,y+8,106,90);
        for(const l of PE.getRenderLayers(p,si,ai))if(PE.isLayerVisible(p,l,si)&&l.opacity>0){
          const im=l.getFrameData(key);if(!im)continue;
          g.globalAlpha=l.opacity;PE.utils.drawImageData(g,im,x+(106-frame.width*4)/2,y+8+(90-frame.height*4)/2,4);
        }
        g.globalAlpha=1;g.font='11px Arial';g.fillStyle='#534936';g.fillText((fi+1)+(originals.has(key)?'  /  ORIGINAL':''),x+6,y+93);
      }
      y+=102;
    }
  }
  write('preview.png',cv.toBuffer('image/png'));
  write('candidate.json',JSON.stringify(candidate));
  console.log(JSON.stringify({generated:{walk:counts[0],idle:counts[1],pickup:counts[2]},preserved:[...originals.keys()],sitPending:result.sitPending,layersAdded:p.layers.length-original.length},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
