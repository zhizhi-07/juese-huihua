const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {fixture}=require('../../test/clothing-sync.cjs'),png=require('../../scripts/png.cjs');
const {createCanvas}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const write=(n,data)=>fs.writeFileSync(path.join(__dirname,n),data);
const ink=im=>im?.data.some((v,i)=>i%4===3&&v);
(async()=>{
  const {p,raw}=await fixture(),C=PE.ClothingSync,name='\u670d\u88c5 / \u9ec4\u8272',candidate=structuredClone(raw),edited=[],occluded=[];
  const cv=createCanvas(704,502),g=cv.getContext('2d');g.fillStyle='#f3efe6';g.fillRect(0,0,cv.width,cv.height);
  g.fillStyle='#41382d';g.font='bold 18px Arial';g.fillText('YELLOW / SITTING',18,26);
  for(const [ai,a] of p.spriteSheets[3].actions.entries()){
    const key0=p.getFrameKey(3,ai,0),layers=p.layers.filter(l=>l.name===name&&l.sheetIndex===3&&PE.isLayerInAction(p,l,3,ai));
    assert.equal(layers.length,1);
    const layer=layers[0],out=candidate.layers[p.layers.indexOf(layer)],original=layer.getFrameData(key0),body0=C.base(p,3,ai,0,'body');
    assert(ink(original));assert(original.placement&&original.width===original.placement.w*2&&original.height===original.placement.h*2);
    const raster=C.raster(original,a.frames[0],2),{width,height}=raster,bottom=PE.ClothingFit.bounds(body0).bottom,leg=bottom-1;
    const top=Array.from({length:height},(_,y)=>y).find(y=>raster.data.subarray(y*width*4,(y+1)*width*4).some((v,i)=>i%4===3&&v));
    assert.equal(Math.floor(top/2),12);
    g.fillStyle='#41382d';g.font='14px Arial';g.fillText(a.direction.toUpperCase(),18,110+ai*150);
    for(const [fi,frame] of a.frames.entries()){
      const key=p.getFrameKey(3,ai,fi),body=C.base(p,3,ai,fi,'body'),head=C.base(p,3,ai,fi,'head');
      const prior=layer.getFrameData(key);let label='original';
      assert.deepEqual([frame.width,frame.height],[16,16]);assert(!frame.locked&&!frame.lockedRegions?.length&&!layer.locked);
      if(fi&& !ink(prior)){
        let im;
        if(fi===1){
          assert.deepEqual(body.data,body0.data);
          out.frameData[key]=structuredClone(out.frameData[key0]);im=original;label='copied';
        }else if(a.direction==='side'&&fi===3){
          // The visible feet in this frame are on the head layer; they match frame 3's body feet.
          const feet=leg*body.width*4,previous=C.base(p,3,ai,2,'body');
          assert.deepEqual(head.data.subarray(feet),previous.data.subarray(feet));
          const key2=p.getFrameKey(3,ai,2);
          out.frameData[key]=structuredClone(out.frameData[key2]);im=layer.getFrameData(key2);label='legs copied';
        }else{
          const dstBottom=PE.ClothingFit.bounds(body).bottom;assert.equal(dstBottom,bottom);
          const data=new ImageData(width,height);data.placement={x:0,y:0,w:frame.width,h:frame.height};
          const exposed=(x,y)=>{const i=(y*body.width+x)*4;return body.data[i+3]&&!head.data[i+3];};
          let hasTorso=false;
          for(let x=0;x<body.width;x++)if(exposed(x,leg-1))hasTorso=true;
          for(let y=top;y<height;y++)for(let x=0;x<width;x++){
            const row=Math.floor(y/2),col=Math.floor(x/2);
            if(!exposed(col,row)||row<leg-1||row===leg-1&&!hasTorso)continue;
            // Drop one torso row, keep the neckline and leave the bottom two rows anchored.
            const sy=row===leg-1?y-2:y,from=(sy*width+x)*4,to=(y*width+x)*4;
            data.data.set(raster.data.subarray(from,from+4),to);
          }
          im=data;
          if(ink(im))label=hasTorso?'compressed 1 row':'legs only';
          else{label='fully hidden';occluded.push(key);}
          out.frameData[key]={width,height,placement:im.placement,dataURL:'data:image/png;base64,'+png.encode(width,height,im.data).toString('base64')};
        }
        layer.frameData.set(key,im);
        edited.push({key,label,pixels:im.data.filter((v,i)=>i%4===3&&v).length});
      }
      const x=95+fi*148,y=45+ai*150;
      g.fillStyle='#e9e1d3';g.fillRect(x,y,128,128);g.save();g.beginPath();g.rect(x,y,128,128);g.clip();
      for(const l of PE.getRenderLayers(p,3,ai))if(PE.isLayerVisible(p,l,3)&&l.opacity>0){
        const im=l.getFrameData(key);if(!im)continue;
        g.globalAlpha=l.opacity;PE.utils.drawImageData(g,im,x,y,8);
      }
      g.restore();g.fillStyle='#41382d';g.font='12px Arial';g.fillText((fi+1)+' / '+label,x,y+142);
    }
  }
  assert.equal(edited.length,9);assert.deepEqual(occluded,[]);
  const reversed=structuredClone(candidate);
  for(const {key} of edited){
    const i=candidate.layers.findIndex(l=>l.sheetIndex===3&&l.name===name&&l.frameData[key]);
    assert(i>=0);
    if(raw.layers[i].frameData[key])reversed.layers[i].frameData[key]=raw.layers[i].frameData[key];
    else delete reversed.layers[i].frameData[key];
  }
  assert.deepEqual(reversed,raw);
  const B=require('../../js/body-sync.cjs'),main=require('./main-before.json'),disk=require('../../data/projects/'+B.BASE_PROJECT_ID+'.json'),pre=structuredClone(candidate);
  assert.equal(B.push(pre,main,disk).mainChanged,0);
  B.pull(pre,main);assert.deepEqual(JSON.parse(JSON.stringify(pre)),candidate);
  write('candidate.json',JSON.stringify(candidate));write('preview.png',cv.toBuffer('image/png'));
  console.log(JSON.stringify({edited,originalsPreserved:3,onlyYellowSitting:true},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});

