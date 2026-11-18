const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

function sheetCanvas(width,height,blocks){
  const canvas=createCanvas(width,height),ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  for(const [x,y,w,h,color]of blocks){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  return canvas.toDataURL();
}
function frame(sheetIndex,width,height){return {sheetIndex,sourceX:0,sourceY:0,width,height};}
function sceneFixture({width=160,height=96,ground=[],furniture=[],decor=[],materials=[]}={}){
  const blank=sheetCanvas(width,height,[]);
  const data={version:'1.0',name:'场景测试',currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,currentLayerIndex:0,palette:[],
    spriteSheets:[{name:'场景画布',frameWidth:width,frameHeight:height,columns:1,rows:1,imageDataURL:blank,actions:[{name:'场景',direction:'none',frames:[frame(0,width,height)]}]}],
    layers:[]};
  const addLayer=(name,url,si=0,w=width,h=height)=>data.layers.push({name,sheetIndex:si,visible:true,locked:false,opacity:1,frameData:{[`${si}_0_0`]:{width:w,height:h,dataURL:url}}});
  addLayer('地面',sheetCanvas(width,height,ground));
  addLayer('家具与设施',sheetCanvas(width,height,furniture));
  addLayer('装饰',sheetCanvas(width,height,decor));
  for(const [name,w,h,blocks]of materials){
    const si=data.spriteSheets.length;
    data.spriteSheets.push({name,frameWidth:w,frameHeight:h,columns:1,rows:1,imageDataURL:sheetCanvas(w,h,blocks),actions:[{name:'画面',direction:'none',frames:[frame(si,w,h)]}]});
    addLayer(name,sheetCanvas(w,h,blocks),si,w,h);
  }
  return data;
}
const W='#8b6b4a',G='#c7b27f';
const base={width:160,height:96,ground:[[0,72,160,24,G]],furniture:[[30,60,12,14,W],[80,70,20,10,W]],decor:[[140,20,6,6,'#6e8c71']]};

async function main(){
  global.window=global;global.ImageData=ImageData;global.Image=Image;
  global.document={createElement:()=>createCanvas(1,1)};
  vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js/wardrobe-furniture.js'),'utf8'),{filename:'wardrobe-furniture.js'});
  PE.isCharacterSheet=sheet=>/^original(?:16|32)_/.test(sheet?.name||'');
  const F=PE.WardrobeFurniture;

  assert.deepEqual(F.layout,[]);
  assert.equal(F.room,null);
  assert.equal(F.isScene({spriteSheets:[{name:'场景画布'},{name:'original16_idle'}]}),false,'character projects are never used as a room');
  const room=sceneFixture(base);
  assert.equal(F.isScene(room),true);

  await F.fromScene(room);
  assert.equal(F.room.width,160);
  assert.equal(F.room.height,96);
  assert.equal(F.layout.length,2,'each disconnected furniture island is one piece');
  const [chair,bench]=F.layout;
  assert.equal(chair.art.width,12,'furniture keeps its drawn native pixel size');
  assert.equal(chair.art.height,14);
  assert.equal(chair.x,36,'anchor is the drawn footprint centre');
  assert.equal(chair.y,74,'anchor sits on the drawn footprint bottom');
  assert.equal(bench.art.width,20);
  assert.equal(bench.y,80);
  assert.equal(F.room.canvas.getContext('2d').getImageData(30,60,1,1).data[3],0,'furniture pixels are not baked into the room image');
  assert.equal(F.room.canvas.getContext('2d').getImageData(2,74,1,1).data[3],255,'the drawn ground becomes the room');
  assert.deepEqual(F.bounds(chair),{left:30,right:42,top:60,bottom:74});
  assert.equal(F.blocked(36,70),true);
  assert.equal(F.blocked(20,70),false);
  assert.equal(F.nearest({x:36,y:80}),chair);
  assert.equal(F.nearest({x:150,y:20}),null);

  await F.fromScene(sceneFixture({width:160,height:96,ground:[],furniture:[[30,60,1,1,W]]}));
  assert.equal(F.layout.length,0,'a single stray pixel is not furniture');
  assert.equal(F.room,null);
  assert(F.hint.includes('家具与设施'),'an empty furniture layer explains where to draw');

  await F.fromScene(sceneFixture({width:160,height:96,ground:[[0,72,160,24,G]],furniture:[],decor:[],materials:[['木椅',10,12,[[2,2,6,8,W]]],['长凳',16,8,[[0,1,16,6,W]]]]}));
  assert.equal(F.room.width,160);
  assert.equal(F.layout.length,2,'separate furniture materials are placed on their own');
  assert.equal(F.layout[0].art.width,6,'material art is trimmed to the drawn pixels, 1:1');
  assert.equal(F.layout[0].art.height,8);
  assert.equal(F.layout[0].x,6,'auto placement starts inside the drawn room floor');
  assert.equal(F.layout[0].y,94,'auto placement stands on the room floor line');
  assert.equal(F.layout[1].art.width,16);
  assert.equal(F.layout[1].x,21,'gap between pieces stays small and predictable');
  assert.equal(F.layout[1].y,94);

  await F.fromScene(sceneFixture({width:256,height:224,ground:[],furniture:[],decor:[],materials:[['床',40,26,[[0,0,40,26,W]]]]}));
  assert.equal(F.room,null,'a scene without drawn ground falls back to the built-in empty room');
  assert.equal(F.layout.length,1);
  assert.equal(F.layout[0].y,208);
  assert.equal(F.layout[0].art.width,40);

  F.clear();
  assert.deepEqual([F.layout,F.room,F.source],[[],null,null]);
  assert.equal(typeof F.draw,'function');
  assert.equal(typeof F.projects,'function');
  assert.equal(typeof F.load,'function');
  console.log('PASS: wardrobe furniture comes only from the saved scene project, one piece per drawn island, native pixel size, drawn positions/anchors, ground-only room, stray pixels ignored, separate materials auto-placed on the floor, nothing built in, ready for 16×16 bodies.');
}
module.exports={sceneFixture,sheetCanvas};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
