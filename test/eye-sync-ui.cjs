const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {fixture}=require('./eye-sync.cjs'),{createCanvas}=require('@napi-rs/canvas');
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.map={};this.style={};this.attrs={};this.classList={toggle(){}};}
 setAttribute(k,v){this.attrs[k]=v;}
 append(...items){for(const item of items){this.children.push(item);if(typeof item==='object')item.parentNode=this;}}
 after(item){this.parentNode?.append(item);}
 replaceChildren(...items){this.children=[];this.append(...items);}
 get firstElementChild(){return this.children.find(c=>typeof c==='object');}
 set innerHTML(html){this.children=[];this.map={};for(const [,tag,attrs]of html.matchAll(/<([a-z][\w-]*)([^>]*)>/g)){const e=new Element(tag);const id=attrs.match(/\bid="([^"]+)"/)?.[1];if(id){e.id=id;this.map['#'+id]=e;}for(const [,key]of attrs.matchAll(/\b(data-[\w-]+)/g))this.map['['+key+']']=e;for(const cls of (attrs.match(/class="([^"]+)"/)?.[1]||'').split(' '))if(cls)this.map['.'+cls]=e;if(!this.map[tag])this.map[tag]=e;this.append(e);}}
 querySelector(selector){return this.map[selector]||null;}
 showModal(){this.open=true;}
 close(){this.open=false;this.onclose?.();}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this);}
}
const body=new Element('body'),host=new Element('button');body.append(host);let initialize;
global.document={body,addEventListener(name,fn){if(name==='DOMContentLoaded')initialize=fn;},getElementById(){return host;},createElement(tag){return tag==='canvas'?Object.assign(createCanvas(1,1),{style:{}}):new Element(tag);}};
vm.runInThisContext(fs.readFileSync(__dirname+'/../js/hair-animation.js','utf8'));
const {p,eyes,hair,app}=fixture();PE.HairAnimation.setup(p,eyes);eyes.hairAnimation.preserved=['original32_idle/down/1','original32_walk/down/1'];PE.app=app;initialize();app.canvasManager.render();
const bar=body.children.find(c=>c.className==='hair-animation-tools'),status=body.children.find(c=>c.className==='hair-animation-status');
assert.equal(bar.querySelector('[data-sync-part]').textContent,'眼睛实时同步');assert(bar.querySelector('#hair-sway').hidden);
bar.querySelector('#hair-sync-all').onclick();assert.equal(eyes.hairAnimation.part,'eyes');assert.match(status.textContent,/保留 2 帧/);
const before=JSON.stringify(eyes.hairAnimation);bar.querySelector('#hair-offsets').onclick();let dialog=body.children.at(-1),list=dialog.querySelector('.hair-offset-table');
assert.equal(list.children.length,48);assert(!list.children.some(c=>c.textContent.includes('睡觉')));
let checked=list.children.flatMap(row=>row.children).filter(c=>c instanceof Element&&c.tagName==='LABEL').map(label=>label.children[0]).filter(c=>c.checked);
assert.equal(checked.length,2);checked[0].checked=false;checked[0].onchange();dialog.querySelector('[data-cancel]').onclick();assert.equal(JSON.stringify(eyes.hairAnimation),before,'cancel does not change recipe');
bar.querySelector('#hair-offsets').onclick();dialog=body.children.at(-1);list=dialog.querySelector('.hair-offset-table');checked=list.children.flatMap(row=>row.children).filter(c=>c instanceof Element&&c.tagName==='LABEL').map(label=>label.children[0]).filter(c=>c.checked);checked[0].checked=false;checked[0].onchange();dialog.querySelector('[data-apply]').onclick();assert.equal(eyes.hairAnimation.preserved.length,1);
p.currentLayerIndex=p.layers.indexOf(hair);app.canvasManager.render();assert.equal(bar.querySelector('[data-sync-part]').textContent,'头发实时同步');assert(!bar.querySelector('#hair-sway').hidden);
// Exercise the actual studio list function with local nodes, not a user's page.
const studio=fs.readFileSync(__dirname+'/../js/studio.js','utf8'),begin=studio.indexOf('app.updateSheetList=function()'),end=studio.indexOf('  app.updateActionList=',begin),sheetList=new Element('div'),note=new Element('p');
window.PE_BUILTIN_PACKS=[];
const commonActions=[['original32_walk','行走'],['original32_idle','待机'],['original32_pickup','拾取'],['original32_sit','坐姿']],names=new Map(commonActions);
const node=(tag,cls,text)=>Object.assign(new Element(tag),{className:cls,textContent:text}),button=(text,onclick,cls)=>Object.assign(node('button',cls,text),{onclick});
new Function('app','$','node','button','commonActions','names','libraryNote',studio.slice(begin,end))(app,()=>sheetList,node,button,commonActions,names,note);
const sheetsBefore=JSON.stringify(p.spriteSheets),layersBefore=p.layers.slice();app.updateSheetList();assert.equal(sheetList.children.length,4);assert.equal(JSON.stringify(p.spriteSheets),sheetsBefore);assert.deepEqual(p.layers,layersBefore);
const appCode=fs.readFileSync(__dirname+'/../js/app.js','utf8'),start=appCode.indexOf('    updateAll() {')+'    updateAll() {'.length,stop=appCode.indexOf('      if (this.animationPlayer)',start);p.currentSheetIndex=4;
new Function(appCode.slice(start,stop)).call(app);assert.equal(p.currentSheetIndex,0,'retired selection switches before animation preview');assert.equal(JSON.stringify(p.spriteSheets),sheetsBefore);
console.log('PASS UI DOM: shared eye/hair controls, no eye sway, preserved-frame cancel/apply, hidden sleep list without data deletion, and safe initial selection before preview. No live browser or project data used.');
