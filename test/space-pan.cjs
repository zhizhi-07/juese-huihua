const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const before=process.argv.includes('--before'),listeners={},canvasListeners={},canvas={style:{},addEventListener:(k,f)=>canvasListeners[k]=f,getBoundingClientRect:()=>({left:0,top:0,right:100,bottom:100})};
let focused={tagName:'INPUT',type:'range'},dialog=null,draws=0,pans=[];
const PE={},document={get activeElement(){return focused},getElementById:()=>canvas,querySelector:()=>dialog,addEventListener(){}},window={PE,addEventListener(k,f,capture){(listeners[k]??=[]).push({f,capture})}};
vm.runInNewContext(fs.readFileSync(before?'output/space-pan-20261113/app.before.js':'js/app.js','utf8'),{PE,document,window});
const app={isSpacePressed:false,isPanning:false,project:{getCurrentLayer:()=>null},toolManager:{currentTool:'pencil',isDrawing:false,onMouseDown(){draws++},onMouseMove(){},onMouseUp(){}},canvasManager:{screenToPixel:(x,y)=>({x,y}),pan:(x,y)=>pans.push([x,y]),render(){}},updateCursorStatus(){}};
PE.App.prototype.bindKeyboardShortcuts.call(app);PE.App.prototype.bindCanvasEvents.call(app,canvas);
function fire(name,more={}){let prevented=false,e={code:'Space',key:' ',clientX:10,clientY:10,button:0,preventDefault(){prevented=true},...more};for(const {f} of [...(listeners[name]||[])].sort((a,b)=>Number(!!b.capture)-Number(!!a.capture)))f(e);return prevented}
assert.equal(fire('keydown'),true,'Space must work with brush slider focused');assert.equal(app.isSpacePressed,true);assert.equal(canvas.style.cursor,'grab');assert.equal(fire('keydown',{repeat:true}),true,'repeats must not activate focused control');
canvasListeners.mousedown({button:0,clientX:10,clientY:10});assert.equal(app.isPanning,true);assert.equal(draws,0);fire('mousemove',{clientX:16,clientY:14});assert.deepEqual(pans,[[6,4]]);assert.equal(canvas.style.cursor,'grabbing');fire('keyup');assert.equal(app.isSpacePressed,false);assert.equal(canvas.style.cursor,'grabbing');fire('mouseup');assert.equal(app.isPanning,false);
for(const type of ['color','checkbox','radio','button']){focused={tagName:'INPUT',type};assert.equal(fire('keydown'),true);fire('keyup')}
for(const target of [{tagName:'INPUT',type:'text'},{tagName:'INPUT',type:'number'},{tagName:'TEXTAREA'},{tagName:'SELECT'},{tagName:'DIV',isContentEditable:true}]){focused=target;assert.equal(fire('keydown'),false);assert.equal(app.isSpacePressed,false)}
focused={tagName:'BUTTON'};dialog={};assert.equal(fire('keydown'),false);dialog=null;fire('keydown');fire('blur');assert.equal(app.isSpacePressed,false);assert.equal(app.isPanning,false);
app.toolManager.currentTool='move';fire('keydown');fire('mousemove');assert.equal(canvas.style.cursor,'grab','space cursor beats move cursor');fire('keyup');assert.equal(canvas.style.cursor,'move');
app.toolManager.currentTool='pencil';canvasListeners.mousedown({button:0,clientX:10,clientY:10});assert.equal(draws,1,'normal pencil unaffected');
console.log('PASS: range/color/control focus, repeat, space drag without drawing, keyup, blur, move cursor, text editing and dialogs.');
