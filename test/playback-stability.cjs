const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),observe=process.argv.includes('--observe');
const source=name=>fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
let now=0,nextTimer;
const context={window:{PE:{}},performance:{now:()=>now},setTimeout:(fn,delay)=>{nextTimer={fn,delay};return 1;},clearTimeout(){},console};
vm.runInNewContext(source('animation'),context);
const player=new context.window.PE.AnimationPlayer();
player.project={spriteSheets:[{actions:[{frames:[{duration:100},{duration:100}]}]}]};
player._renderPreviewFrame=()=>{now+=40;};
player.play();const firstWait=nextTimer.delay;now=100;nextTimer.fn();const nextWait=nextTimer.delay;
player.pause();assert.equal(player.playing,false);

let composites=0,draws=0;
const pixels={width:32,height:32,data:new Uint8ClampedArray(32*32*4)};pixels.data[(10*32+10)*4+3]=255;
const action={frames:Array.from({length:4},()=>({width:32,height:32}))};
const project={spriteSheets:[{actions:[action]}]};
const fakeCanvas=()=>({width:144,height:144,getContext:()=>({putImageData(){},clearRect(){},drawImage(){draws++;}})});
const app={project,canvasManager:{hideHands:false,getCompositeImageData(){composites++;return pixels;}}};
const preview={canvas:fakeCanvas(),sheetIndex:0,actionIndex:0,currentFrame:0};app.animationPlayer=preview;
const studio=source('studio');
const bounds=studio.match(/  function bounds\(image\) \{[^\n]+\}/)[0];
const render=studio.slice(studio.indexOf('  app.animationPlayer._renderPreviewFrame=function'),studio.indexOf('  const originalSetTool='));
vm.runInNewContext(bounds+'\n'+render,{app,PE:{utils:{imageScale:()=>1}},document:{createElement:fakeCanvas},console});
preview._renderPreviewFrame();
for(let i=0;i<4;i++){preview.currentFrame=i;preview._renderPreviewFrame(true);}
const playbackComposites=composites;
preview._renderPreviewFrame();const afterEdit=composites;
app.canvasManager.hideHands=true;preview._renderPreviewFrame(true);const afterHands=composites;

const imageSource=source('pixel-import');
const details=imageSource.slice(imageSource.indexOf('  function imageDetails(){'),imageSource.indexOf('  resizeMode.onchange='));
const element=()=>({style:{},value:'',disabled:false});
const ui=Object.fromEntries(['imageSize','placedWidth','imageInfo','resizeMode','freePlacement','positionFields','positionX','positionY'].map(k=>[k,element()]));
let data;
const imageApp={project:{getCurrentLayer:()=>({getFrameData:()=>data}),getFrameKey:()=>''},toolManager:{getLayerPlacement:()=>data?.placement||null,isDrawing:false}};
const imageContext={app:imageApp,...ui,document:{activeElement:null}};vm.createContext(imageContext);vm.runInContext(details,imageContext);
const states=[];
for(const frame of [{width:34,height:36,placement:{x:4,y:0,w:34,h:36}},{width:36,height:36},null]){
  data=frame;vm.runInContext('imageDetails()',imageContext);
  states.push({widthDisplay:ui.imageSize.style.display,positionDisplay:ui.positionFields.style.display,positionDisabled:ui.positionX.disabled});
}
console.log(JSON.stringify({firstWait,nextWait,playbackComposites,afterEdit,afterHands,toolbarStates:states}));
if(observe)process.exit(0);
assert.equal(firstWait,100);assert.equal(nextWait,60,'40ms render cost must not be added to every 100ms frame');
assert.equal(playbackComposites,4,'four preview frames compose once, not again on every tick');
assert.equal(afterEdit,8,'explicit edit refresh rebuilds the preview');
assert.equal(afterHands,12,'hand visibility change invalidates the preview');
assert(states.every(s=>s.widthDisplay==='flex'&&s.positionDisplay==='flex'),'image/position fields keep their space across HD, raster and empty frames');
assert.equal(states[2].positionDisabled,true,'empty frame coordinates cannot be edited');
const calls={palette:0,status:0,properties:0,render:0};
const playingApp={project:{currentFrameIndex:0},animationPlayer:{playing:true,pause(){this.playing=false;}},updatePalette(){calls.palette++;},updateFrameProperties(){calls.properties++;},updateStatusBar(){calls.status++;},canvasManager:{render(){calls.render++;}}};
const workbench=source('workbench'),start=workbench.indexOf('  const pausePlayback=');
vm.runInNewContext(workbench.slice(start,workbench.indexOf('  const selectAction=',start)),{app:playingApp,$:()=>({children:[]})});
for(let i=0;i<4;i++)playingApp.animationPlayer.onFrameChange(i);
assert.equal(calls.palette,0,'playback does not rebuild the palette each frame');
assert.equal(calls.render,4,'main canvas still renders each played frame');
playingApp.animationPlayer.pause();assert.equal(calls.palette,1,'pausing refreshes the current frame palette');
console.log('PASS: compensated frame timing, cached action previews, edit/hand invalidation, stable toolbar across mixed frames.');
