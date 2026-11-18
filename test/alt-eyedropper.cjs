const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const before=process.argv.includes('--before'),root=before?'output/alt-eyedropper-20261113/':'js/';
const PE={utils:{getPixelFromImageData(image,x,y){if(x<0||y<0||x>=image.width||y>=image.height)return null;return image.color;}}};
const events={},canvasEvents={};const context={PE,window:{PE,addEventListener:(k,f)=>events[k]=f},document:{addEventListener(){}}};
vm.createContext(context);for(const name of ['tools','app'])vm.runInContext(fs.readFileSync(root+name+(before?'.before.js':'.js'),'utf8'),context);
const t=new PE.ToolManager(),color={r:115,g:140,b:168,a:255},image={width:4,height:4,color},layer={getFrameData:()=>image,locked:true};
const project={getCurrentLayer:()=>layer,getFrameKey:()=> '0_0_0'};let coordinates,draws=0,picked=0,renders=0;
const cm={screenToPixel:(x,y,snap)=>{coordinates={x,y,snap};return{x,y}},getCompositeWithOriginal:()=>image,render:()=>renders++};
t.init(project,cm,null);t.onColorPick=()=>picked++;t.onMouseDown=()=>draws++;t.onMouseMove=()=>{};t.onMouseUp=()=>{};
const app={project,toolManager:t,canvasManager:cm,animationPlayer:{pause(){}},updateLayerList(){},updateCursorStatus(){}};
const canvas={style:{},addEventListener:(k,f)=>canvasEvents[k]=f,getBoundingClientRect:()=>({left:0,top:0,right:4,bottom:4})};
PE.App.prototype.bindCanvasEvents.call(app,canvas);
const down=(extra={})=>canvasEvents.mousedown({clientX:1,clientY:1,button:0,altKey:true,preventDefault(){},...extra});
for(const tool of ['pencil','eraser','fill','select','move','eyedropper']){t.currentTool=tool;down();assert.equal(draws,0,'Alt click must not paint or move');assert.equal(t.currentTool,tool);assert.deepEqual({...t.primaryColor},color);assert.equal(t.isDrawing,false);assert.equal(coordinates.snap,false);}
assert.equal(picked,6);down({altKey:false});assert.equal(draws,1,'normal clicks still reach drawing');down({button:2});assert.equal(draws,2,'right click unchanged');app.isSpacePressed=true;down();assert.equal(app.isPanning,true);assert.equal(picked,6);app.isSpacePressed=false;app.isPanning=false;
t.isDrawing=true;down();assert.equal(draws,3,'Alt during existing stroke does not interrupt it');t.isDrawing=false;
image.placement={x:10,y:20,w:2,h:2};t.pickColor(10.75,20.75);assert.deepEqual({...t.primaryColor},color);const native={r:200,g:90,b:40,a:255};image.color=native;t.pickColor(10.75,20.75);assert.deepEqual({...t.primaryColor},native,'placed image uses native coordinates');image.color=color;const previous={...t.primaryColor};t.pickColor(-10,-10);assert.deepEqual({...t.primaryColor},previous,'out of bounds leaves color alone');
assert.equal(fs.readFileSync('js/scene-reference.js','utf8').includes('event.altKey || app.isSpacePressed'),true);assert.equal(fs.readFileSync('js/layer-mirror.js','utf8').includes('event.altKey || app.isSpacePressed || event.target !== canvas'),true);
console.log('PASS: Alt click picks without drawing or switching tools; locked layer, placed image, bounds, callbacks, normal/right click and space pan checked.');
