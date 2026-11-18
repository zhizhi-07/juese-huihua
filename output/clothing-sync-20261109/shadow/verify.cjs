const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {fixture}=require('../../../test/clothing-sync.cjs'),oldFit=require('./clothing-fit.before.js');
const {createCanvas}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
(async()=>{
  const {p,app}=await fixture(),C=PE.ClothingSync,s=p.getCurrentLayer(),original=p.layers.map(l=>[l,new Map(l.frameData),l.visible]);
  const originalFrames=original.find(([l])=>l===s)[1],priorConfig=structuredClone(s.clothingSync);
  const result=C.sync(app,{live:true}),byKey=new Map(result.edits.map(e=>[e.key,e.image])),preserved=[...s.clothingSync.preserved];
  assert.equal(result.edits.length+preserved.length,63);
  for(let ai=0;ai<3;ai++)assert.equal(s.getFrameData('1_'+ai+'_0'),originalFrames.get('1_'+ai+'_0'));
  for(const [l,frames,visible] of original)if(PE.classifyPart(l.name)?.category!=='衣服'){assert.deepEqual([...l.frameData],[...frames]);assert.equal(l.visible,visible);}
  for(const key of preserved){
    const [l,frames]=original.find(([l,frames])=>l.clothingSyncId===s.clothingSync.id&&frames.has(key));
    assert.equal(l.getFrameData(key),frames.get(key));
  }
  app.history.undo(p);assert.deepEqual(s.clothingSync,priorConfig);app.history.redo(p);
  const cv=createCanvas(896,12*172),ctx=cv.getContext('2d');ctx.fillStyle='#e9e4dc';ctx.fillRect(0,0,cv.width,cv.height);ctx.imageSmoothingEnabled=false;
  const counts={},failures=[],legGaps=[];let beforeOK=0,changed=0,shadowPixels=0,shirtPixels=0,legPixels=0;
  for(let si=0;si<4;si++)for(let ai=0;ai<3;ai++){
    const a=p.spriteSheets[si].actions[ai],sa=p.spriteSheets[1].actions.findIndex(v=>v.direction===a.direction),sf=p.spriteSheets[1].actions[sa].frames[0],sit=si===3;
    const src={body:C.base(p,1,sa,0,'body'),head:C.base(p,1,sa,0,'head'),clothes:C.raster(s.getFrameData('1_'+sa+'_0'),sf)};
    const palette=new Set();for(let i=0;i<src.clothes.data.length;i+=4)if(src.clothes.data[i+3])palette.add(src.clothes.data.slice(i,i+4).join());
    const row=(si*3+ai)*172;ctx.fillStyle='#302a24';ctx.font='15px Arial';ctx.fillText(['Walk','Idle','Pickup','Sit'][si]+' / '+a.direction+'   ·   top: old    bottom: new',12,row+18);
    for(let fi=0;fi<a.frames.length;fi++){
      const key=p.getFrameKey(si,ai,fi),body=C.base(p,si,ai,fi,'body'),head=C.base(p,si,ai,fi,'head'),after=byKey.get(key)||(preserved.includes(key)?C.raster(p.layers.find(l=>l.clothingSyncId===s.clothingSync.id&&l.getFrameData(key)).getFrameData(key),a.frames[fi]):src.clothes);
      let before;
      try{before=si===1&&fi===0?src.clothes:oldFit.fromIdle(src,body,{sit,direction:a.direction,sourceHead:src.head,targetHead:head});beforeOK++;}catch(e){failures.push([key,e.message]);}
            if(before&&!preserved.includes(key)){
        const bottom=PE.ClothingFit.bounds(body).bottom;let changedFrame=false;
        for(let i=0;i<after.data.length;i+=4){
          assert.equal(after.data[i+3],before.data[i+3],key+' geometry changed');
          if(after.data.slice(i,i+3).every((v,k)=>v===before.data[i+k]))continue;
          assert.equal(body.data.slice(i,i+3).join(),'224,197,180',key+' changed a bright pixel');
          assert(after.data.slice(i,i+3).every((v,k)=>v<=before.data[i+k]),key+' shadow made fabric lighter');
          changedFrame=true;shadowPixels++;if(Math.floor(i/4/body.width)<bottom-1)shirtPixels++;else legPixels++;
        }
        if(changedFrame)changed++;
      }
      assert.equal(after.width,body.width);assert.equal(after.height,body.height);
      assert(after.data.some((v,i)=>i%4===3&&v),key+' has no garment');
      assert(![body,head].some(im=>im.data.some((v,i)=>i%4===0&&v===70&&im.data.slice(i,i+4).join()==='70,70,94,255')),key+' outline in fill raster');
      for(let i=0;i<after.data.length;i+=4)if(!preserved.includes(key)&&after.data[i+3]){
        assert(body.data[i+3]&&body.data.slice(i,i+3).join()!=='70,70,94',key+' outside body fill');
        assert(!sit||!head.data[i+3],key+' covers face');
        assert(palette.has(after.data.slice(i,i+4).join())||body.data.slice(i,i+3).join()==='224,197,180',key+' altered a bright color');
      }
      const bottom=PE.ClothingFit.bounds(body).bottom;
      for(let y=bottom-1;y<=bottom;y++)for(let x=0;x<body.width;x++){
        const i=(y*body.width+x)*4;if(body.data[i+3]&&body.data.slice(i,i+3).join()!=='70,70,94'&&!after.data[i+3]&&!(sit&&head.data[i+3]))legGaps.push([key,x,y]);
      }
      counts[p.spriteSheets[si].name]=(counts[p.spriteSheets[si].name]||0)+1;
      for(const [n,im] of [before,after].entries()){
        if(!im)continue;
        const left=Math.floor((body.width-16)/2),top=Math.max(0,PE.ClothingFit.bounds(body).bottom-15);
        for(const part of [body,head,im])for(let y=0;y<16;y++)for(let x=0;x<16;x++){
          const at=((top+y)*body.width+left+x)*4,rgba=part.data.subarray(at,at+4);
          if(!rgba[3])continue;
          ctx.fillStyle='rgba('+[...rgba.slice(0,3),rgba[3]/255].join(',')+')';
          ctx.fillRect(12+fi*110+x*4,row+22+n*73+y*4,4,4);
        }
      }
    }
  }
  fs.writeFileSync(path.join(__dirname,'comparison.png'),cv.toBuffer('image/png'));
  console.log(JSON.stringify({counts,newGenerated:result.edits.length,preserved,sourceFramesUnchanged:3,beforeOK,beforeErrors:failures,legGaps,changed,shadowPixels,shirtPixels,legPixels,manualFramesModified:0,baseLayersModified:0,geometryPaletteAndFaceChecks:66-preserved.length},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});





