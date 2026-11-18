const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {fixture}=require('../../../test/clothing-sync.cjs'),png=require('../../../scripts/png.cjs');
const {createCanvas}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
(async()=>{
  const {p,raw,app}=await fixture(),C=PE.ClothingSync,F=PE.ClothingFit;
  p.currentLayerIndex=raw.currentLayerIndex;const layer=p.getCurrentLayer(),im=layer.getFrameData('1_1_0'),r=im.placement;
  assert.equal(layer.name,'高清 · 衣服');assert.equal(im.width,r.w*2);assert.equal(im.height,r.h*2);
  let builtin;try{C.sync(app);builtin='ok';}catch(e){builtin=e.message;}
  const blank=(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),alphaCount=im=>im.data.filter((a,i)=>i%4===3&&a).length;
  const counters={},skipped=[],details=[];
  for(let dir=0;dir<3;dir++){
  const im=layer.getFrameData(`1_${dir}_0`),r=im.placement,srcBody=C.base(p,1,dir,0,'body');
  assert.equal(im.width,r.w*2);assert.equal(im.height,r.h*2);
  const masters=[0,1,2,3].map(k=>{
    const c=blank(srcBody.width,srcBody.height);
    for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++){
      const i=((y*2+(k>>1))*im.width+x*2+(k&1))*4,j=((y+r.y)*c.width+x+r.x)*4;
      assert(!im.data[i+3]||srcBody.data[j+3],'HD ink outside native body');
      c.data.set(im.data.subarray(i,i+4),j);
    }return c;
  });
  const cv=createCanvas(8*128,4*160),g=cv.getContext('2d');g.fillStyle='#e9e3dc';g.fillRect(0,0,cv.width,cv.height);
  const direction=p.spriteSheets[1].actions[dir].direction;
  for(let si=0;si<p.spriteSheets.length;si++){
    const sheet=p.spriteSheets[si],a=sheet.actions[dir];assert.equal(a.direction,direction);
    for(let fi=0;fi<a.frames.length;fi++){
      const key=p.getFrameKey(si,dir,fi),body=C.base(p,si,dir,fi,'body'),head=C.base(p,si,dir,fi,'head'),bottom=F.bounds(body).bottom;
      const ox=fi*128+10,oy=si*160+26;
      g.font='13px Arial';g.fillStyle='#302a24';g.fillText(['Walk','Idle','Pickup','Sit'][si]+' '+(fi+1)+(si===1&&fi===0?' / source':''),ox,oy-8);
      if(bottom<F.bounds(head).bottom){
        skipped.push(key);g.fillStyle='#953918';g.fillText('Body offset',ox,oy+52);g.fillText('not fitted',ox,oy+70);continue;
      }
      const hd=blank(body.width*2,body.height*2),source=si===1&&fi===0,opts={sit:si===3,targetHead:si===3?head:null};
      for(const [k,cloth]of masters.entries()){
        const out=source?cloth:F.fromIdle({body:srcBody,clothes:cloth},body,opts);
        for(let y=0;y<body.height;y++)for(let x=0;x<body.width;x++){
          const j=(y*body.width+x)*4;if(!out.data[j+3])continue;
          assert(body.data[j+3]&&(!opts.sit||!head.data[j+3]),key+' garment escaped the intended body');
          const i=((y*2+(k>>1))*hd.width+x*2+(k&1))*4;
          hd.data.set(out.data.subarray(j,j+4),i);
        }
      }
      assert(alphaCount(hd)>0,key);if(source)assert.equal(alphaCount(hd),alphaCount(im));
      const box=F.bounds(body),left=Math.max(0,box.left-5),draw=(img,step,unit)=>{
        for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){
          const [r,gc,b,a]=img.data.subarray((y*img.width+x)*4,(y*img.width+x)*4+4);if(!a)continue;
          g.fillStyle='rgba('+[r,gc,b,a/255].join()+')';g.fillRect(ox+(x-left*unit)*step,oy+y*step,step,step);
        }
      };
      const hand=n=>C.base(p,si,dir,fi,n);
      draw(hand('hand 2'),6,1);draw(body,6,1);draw(head,6,1);draw(hd,3,2);draw(hand('hand'),6,1);
      if(!source){counters[sheet.name]=(counters[sheet.name]||0)+1;details.push({key,hd:[hd.width,hd.height],painted:alphaCount(hd)});}
      if(source||[0,2,3].includes(si)&&fi===2)fs.writeFileSync(path.join(__dirname,key+'-hd.png'),png.encode(hd.width,hd.height,hd.data));
    }
  }

  fs.writeFileSync(path.join(__dirname,direction+'-alignment.png'),cv.toBuffer('image/png'));
  }
  assert.deepEqual(skipped,['3_1_0']);assert.equal(details.length,62);
  console.log(JSON.stringify({layer:layer.name,builtin,counters,skipped,details},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});

