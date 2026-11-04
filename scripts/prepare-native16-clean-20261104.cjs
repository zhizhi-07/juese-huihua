const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'备份/20261104-16x16干净重启');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const palette={'ebf0ee':'feede1','d4d0cd':'e0c5b4','2f3b3d':'46465e'};
const base=l=>!l.isGroup&&/^(head|body|hand(?: |$))/.test(l.name);
async function image(fd){const im=await loadImage(fd.dataURL),c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);return c;}
function recolor(c){const ctx=c.getContext('2d'),d=ctx.getImageData(0,0,c.width,c.height);for(let i=0;i<d.data.length;i+=4){if(!d.data[i+3])continue;const hex=Buffer.from(d.data.slice(i,i+3)).toString('hex'),to=palette[hex];if(to)d.data.set(Buffer.from(to,'hex'),i);}ctx.putImageData(d,0,0);return c;}
(async()=>{
  const response=await fetch('http://127.0.0.1:8765/api/project?id=main');assert.equal(response.status,200);
  const raw=Buffer.from(await response.arrayBuffer());fs.writeFileSync(path.join(out,'main-api-before.json'),raw);
  const source=JSON.parse(raw),project={version:'1.0',name:'16×16 · 干净素体',bgColor:source.bgColor,gridColor:source.gridColor,currentSheetIndex:1,currentActionIndex:1,currentFrameIndex:0,currentLayerIndex:0,palette:[...['46465e','feede1','e0c5b4','dcc0ad'].map(hex=>{const [r,g,b]=Buffer.from(hex,'hex');return {r,g,b,a:255};}),...source.palette.filter(c=>c.name)],spriteSheets:[],layers:[]};
  const previews=[];let frames=0;
  for(const [oldSI,kind]of [[6,'walk'],[1,'idle'],[5,'pickup'],[10,'sit']]){
    const si=project.spriteSheets.length,s=source.spriteSheets[oldSI],size=kind==='pickup'?20:16,sheet={name:'original16_'+kind,frameWidth:kind==='sit'?s.frameWidth/2:size,frameHeight:kind==='sit'?s.frameHeight/2:size,columns:s.columns,rows:s.actions.length,fps:s.fps,useFrameDurations:s.useFrameDurations,actions:[]};
    const layers=source.layers.map((l,i)=>({l,i})).filter(({l})=>l.sheetIndex===oldSI&&(base(l)||kind==='sit'&&l.visible&&l.name==='眼睛 / 原版豆豆眼·定位'));
    const needed=new Set(layers.map(({i})=>i));for(const {l}of layers){if(l.parent!=null)needed.add(l.parent);}
    const mapping=new Map();
    for(const oldI of [...needed].sort((a,b)=>a-b)){const old=source.layers[oldI],l={...old,sheetIndex:si,frameData:{}};delete l.hairAnimation;delete l.inheritedBase;mapping.set(oldI,project.layers.length);project.layers.push(l);}
    for(const oldI of needed){const l=project.layers[mapping.get(oldI)],old=source.layers[oldI];l.parent=old.parent==null?null:mapping.get(old.parent);if(/^hand(?: |$)/.test(l.name)){l.referenceOnly=true;l.locked=true;}}
    if(kind==='sit'&&s.canvasLayout)sheet.canvasLayout={...s.canvasLayout,margin:s.canvasLayout.margin/2,actions:s.canvasLayout.actions.map(a=>({...a,x:a.x/2,y:a.y/2,width:a.width/2,height:a.height/2}))};
    const atlas=createCanvas(sheet.frameWidth*s.columns,sheet.frameHeight*s.actions.length);
    for(const [ai,a]of s.actions.entries()){
      const action={name:a.name,direction:a.direction,frames:[]};sheet.actions.push(action);
      for(const [fi,f]of a.frames.entries()){
        const width=kind==='sit'?f.width/2:size,height=kind==='sit'?f.height/2:size;
        assert(Number.isInteger(width)&&Number.isInteger(height));
        action.frames.push({...f,sheetIndex:si,sourceX:kind==='sit'?f.sourceX/2:fi*size,sourceY:kind==='sit'?f.sourceY/2:ai*size,width,height,locked:false,lockedRegions:[],notes:''});frames++;
        const composite=createCanvas(width,height),ctx=composite.getContext('2d');
        for(const {l,i}of layers){
          const fd=l.frameData[`${oldSI}_${ai}_${fi}`];if(!fd)continue;
          const original=await image(fd),c=createCanvas(width,height),cc=c.getContext('2d');cc.imageSmoothingEnabled=false;
          if(kind==='sit'){
            assert.equal(original.width,f.width);assert.equal(original.height,f.height);
            cc.drawImage(original,0,0,original.width/2,original.height/2);
          }else{
            const x=kind==='pickup'?29:31,y=kind==='pickup'?23:24;
            const d=original.getContext('2d').getImageData(0,0,original.width,original.height).data;
            for(let yy=0;yy<original.height;yy++)for(let xx=0;xx<original.width;xx++)if(d[(yy*original.width+xx)*4+3])assert(xx>=x&&xx<x+size&&yy>=y&&yy<y+size,'crop must not lose painted pixels');
            cc.drawImage(original,-x,-y);recolor(c);
          }
          const target=project.layers[mapping.get(i)];target.frameData[`${si}_${ai}_${fi}`]={width,height,dataURL:c.toDataURL('image/png')};
          if(l.visible!==false)ctx.drawImage(c,0,0);
        }
        atlas.getContext('2d').drawImage(composite,fi*sheet.frameWidth,ai*sheet.frameHeight);previews.push({si,ai,fi,c:composite});
      }
    }
    sheet.imageDataURL=atlas.toDataURL('image/png');project.spriteSheets.push(sheet);
    project.layers.push({name:'绘画图层',sheetIndex:si,parent:null,depth:0,visible:true,locked:false,opacity:1,frameData:{}});
  }
  project.currentLayerIndex=project.layers.findIndex(l=>l.sheetIndex===1&&l.name==='绘画图层');
  assert.deepEqual(project.spriteSheets.map(s=>s.name),['original16_walk','original16_idle','original16_pickup','original16_sit']);assert.equal(frames,66);
  assert(!project.layers.some(l=>/头发|服装|衣服/.test(l.name)));
  const contact=createCanvas(8*168,12*164),cc=contact.getContext('2d');cc.fillStyle='#d8e1dd';cc.fillRect(0,0,contact.width,contact.height);cc.imageSmoothingEnabled=false;
  for(const {si,ai,fi,c}of previews){const x=fi*168,y=(si*3+ai)*164;cc.fillStyle='#26322f';cc.font='12px sans-serif';cc.fillText(`${project.spriteSheets[si].name.replace('original16_','')} ${project.spriteSheets[si].actions[ai].direction} ${fi+1}`,x+4,y+15);cc.drawImage(c,x+4,y+24,c.width*6,c.height*6);}
  fs.writeFileSync(path.join(out,'native16-contact.png'),contact.toBuffer('image/png'));
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(project));
  fs.writeFileSync(path.join(out,'prepare-report.json'),JSON.stringify({sourceSHA256:hash(raw),sourceETag:response.headers.get('etag'),candidateSHA256:hash(JSON.stringify(project)),frames,oldNativeSources:[6,1,5],sitSource:10,sitScale:0.5,sitMethod:"nearest-neighbour; exact half canvas, frame dimensions, coordinates and layers; no crop, translation or redraw",skin:palette,pickupCanvas:'20×20; native resolution retained without clipping hands'},null,2));
  console.log(JSON.stringify({frames,layers:project.layers.length,candidate:path.join(out,'candidate.json'),preview:path.join(out,'native16-contact.png')}));
})().catch(e=>{console.error(e);process.exitCode=1;});
