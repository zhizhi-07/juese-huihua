const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),observe=process.argv.includes('--observe');
let selectionStrokes=0,sourceGrids=0,pixelDraws=0,normalGrids=0;
function context2d(){return {save(){},restore(){},clearRect(){},fillRect(){},drawImage(){},setLineDash(){},strokeRect(){if(this.strokeStyle==='#00e5ff')selectionStrokes++;}};}
const canvas=()=>({width:320,height:320,style:{},getContext:()=>context2d()});
const PE={utils:{imageScale:()=>1,drawImageData:()=>pixelDraws++},getRenderLayers:p=>p.layers,isLayerVisible:()=>true,isHandLayer:()=>false};
const environment={window:{PE},PE,document:{createElement:canvas},setTimeout:()=>1,clearTimeout(){},performance:{now:()=>0},console};
for(const file of ['canvas','animation'])vm.runInNewContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'),environment);
const frames=[{width:32,height:32},{width:32,height:32}],data={width:8,height:8,data:new Uint8ClampedArray(256),placement:{x:4,y:4,w:8,h:8}};
const layer={opacity:1,getFrameData:key=>key==='0_0_0'?data:{width:32,height:32,data:new Uint8ClampedArray(4096)}};
const project={currentSheetIndex:0,currentActionIndex:0,currentFrameIndex:0,layers:[layer],spriteSheets:[{fps:10,actions:[{frames}]}],getCurrentFrame(){return frames[this.currentFrameIndex];},getCurrentLayer:()=>layer,getFrameKey(){return '0_0_'+this.currentFrameIndex;}};
const cm=new PE.CanvasManager(canvas(),project),selection={x:4,y:4,w:8,h:8};
cm.selection=selection;cm.toolManager={selection,currentTool:'move'};PE.toolManager={selection};
cm._drawCheckerboard=()=>{};cm._drawGrid=()=>normalGrids++;cm._drawSourceGrid=()=>sourceGrids++;
const player=new PE.AnimationPlayer();player.project=project;player.canvasManager=cm;
player.onFrameChange=i=>{project.currentFrameIndex=i;cm.render();};
function snapshot(){selectionStrokes=0;sourceGrids=0;pixelDraws=0;normalGrids=0;cm.render();return {selectionStrokes,sourceGrids,pixelDraws,normalGrids};}
const before=snapshot();player.play();const playing=snapshot();player._tick();const next=snapshot();player.pause();const paused=snapshot();
console.log(JSON.stringify({before,playing,next,paused,selectionPreserved:cm.selection===selection&&cm.toolManager.selection===selection}));
if(observe)process.exit(0);
assert.equal(before.selectionStrokes,2);assert.equal(before.sourceGrids,1);
assert.equal(playing.selectionStrokes,0,'playback must not draw a stale selection');assert.equal(playing.sourceGrids,0,'source-image grid must not flash between HD and raster frames');
assert.equal(next.selectionStrokes,0);assert.equal(paused.selectionStrokes,2,'pause restores the original selection outline and resize handle');
assert.equal(cm.selection,selection);assert.equal(cm.toolManager.selection,selection);assert.equal(data.placement.x,4);
assert.equal(playing.pixelDraws,1);assert.equal(playing.normalGrids,1,'the user grid toggle is not changed');
project.currentFrameIndex=0;assert.equal(snapshot().sourceGrids,1,'source grid is restored when paused on an HD frame');
cm.selection=null;cm.toolManager.selection=null;player.play();assert.equal(snapshot().selectionStrokes,0,'global selection fallback is also suppressed');player.stop();assert.equal(cm.playbackActive,false);
cm.selection=selection;cm.toolManager.selection=selection;player.loop=false;player.currentFrame=1;player.play();player._tick();assert.equal(cm.playbackActive,false,'non-loop ending restores editing overlays');
console.log('PASS: playback hides selection/resize handles and per-image source grid only; pause/stop/end restore overlays; selections, pixels and normal grid preserved.');
