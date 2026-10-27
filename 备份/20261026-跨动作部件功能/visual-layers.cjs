const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {createCanvas,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={};this.attrs={};this.className='';this.classList={add:(c)=>{this.className+=' '+c},toggle:(c,on)=>{const a=this.className.split(/\s+/).filter(x=>x&&x!==c);if(on)a.push(c);this.className=a.join(' ')}};}
 setAttribute(k,v){this.attrs[k]=v;}
 append(...items){for(const item of items){if(item.parentNode){item.parentNode.children=item.parentNode.children.filter(x=>x!==item);}item.parentNode=this;this.children.push(item);}}
 replaceChildren(...items){for(const c of this.children)c.parentNode=null;this.children=[];this.append(...items);}
 querySelectorAll(sel){const all=[];for(const c of this.children){const cls=String(c.className||'').split(/\s+/);const name=sel.match(/^\.([\w-]+)/)?.[1];const ok=name?cls.includes(name)&&(!sel.includes('[data-layer-index]')||c.dataset?.layerIndex!==undefined):c.tagName===sel.toUpperCase();if(ok)all.push(c);if(c.querySelectorAll)all.push(...c.querySelectorAll(sel));}return all;}
 querySelector(sel){return this.querySelectorAll(sel)[0]||null;}
}
global.window=global;const list=new Element('div');let initialize;
global.document={addEventListener(name,fn){if(name==='DOMContentLoaded')initialize=fn;},getElementById(){return list;},createElement(tag){if(tag==='canvas'){const c=createCanvas(1,1);c.setAttribute=()=>{};return c;}return new Element(tag);}};
const data=new ImageData(32,32);data.data.set([209,207,226,255],(4*32+8)*4);
const layer=(name,si=8,visible=false)=>({name,sheetIndex:si,visible,locked:false,frameData:new Map([['8_1_0',data]])});
const layers=[layer('头发 / 01 披发 / 前发',8,true),layer('头发 / 02 双马尾 / 前发'),layer('头发 / 01 披发 / 后发',8,true),layer('发饰 / 02 双马尾 / 饰品'),layer('眼睛 / 02 青蓝'),layer('嘴巴 / 下垂嘴'),layer('头发 / 02 双马尾 / 前发',7,true)];
const p={layers,currentLayerIndex:0,currentSheetIndex:8,currentActionIndex:1,getFrameKey:()=> '8_1_0',getCurrentSheet:()=>({name:'original32_idle'})};let dirty=0;
const app={project:p,animationPlayer:{pause(){},_renderPreviewFrame(){}},history:{undoStack:[],redoStack:[],_notifyChange(){}},canvasManager:{render(){}},persistence:{markDirty(){dirty++}},updateLayerList(){list.replaceChildren();layers.forEach((l,i)=>{if(l.sheetIndex!==8)return;const row=new Element('div');row.className='layer-item';row.dataset.layerIndex=i;for(const cls of ['layer-icon-btn','layer-icon-btn','layer-name','layer-mini']){const e=new Element(cls==='layer-name'?'span':'button');e.className=cls;row.append(e);}row.append(new Element('input'));list.append(row);});}};
global.PE={app,isHandLayer:()=>false};vm.runInThisContext(fs.readFileSync(path.resolve(__dirname,'../js/visual-layers.js'),'utf8'));
const V=PE.VisualLayers;initialize();assert.equal(list.querySelectorAll('.part-tab').length,5);assert.equal(list.querySelectorAll('.visual-layer-card').length,4);assert.deepEqual(list.querySelectorAll('.part-slot-title').map(e=>e.textContent),['前发','后发','饰品']);assert.equal(list.querySelectorAll('.layer-name')[0].textContent,'披发');
V.choose(app,1);assert(!layers[0].visible&&layers[1].visible);assert(layers[2].visible&&layers[6].visible);app.history.undoStack[0].undo();assert(layers[0].visible&&!layers[1].visible);app.history.undoStack[0].redo();assert(layers[1].visible&&!layers[0].visible);assert.equal(dirty,1);
const tabs=list.querySelectorAll('.part-tab');tabs.find(e=>e.textContent==='五官').onclick({stopPropagation(){}});assert.equal(list.querySelectorAll('.visual-layer-card').length,2);assert.deepEqual(list.querySelectorAll('.part-slot-title').map(e=>e.textContent),['眼睛','嘴巴']);assert.equal(dirty,1);
const other=layer('x');other.frameData=new Map([['8_0_0',data]]);assert.equal(V.thumbnail(other,p),null);assert.equal(V.slot(layers[2]),'后发');
console.log('PASS: component-card DOM renders; 5 category tabs; 3 hair slots; thumbnails draw; face tab; same-slot replacement and undo/redo; other sheets/back hair preserved; wrong-direction thumbnail excluded; no automatic save.');
