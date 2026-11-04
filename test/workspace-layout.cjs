const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

class Element {
  constructor(tag = 'div', className = '', id = '') {
    Object.assign(this, {tag, tagName:tag.toUpperCase(), className, id, children: [], events: {}, open: false, attrs:{}, textContent:''});
    this.classList = {contains: name => this.className.split(' ').includes(name)};
  }
  append(...nodes) {
    for (const node of nodes) {
      if (node.parentElement) node.parentElement.children.splice(node.parentElement.children.indexOf(node), 1);
      this.children.push(node); node.parentElement = this;
    }
  }
  after(node) { this.parentElement.append(node); }
  addEventListener(event, callback) { this.events[event] = callback; }
  hasAttribute(name) { return name in this.attrs; }
  matches(selector) { return selector.split(', ').some(name => name.startsWith('[') ? this.hasAttribute(name.slice(1,-1)) : this.classList.contains(name.slice(1))); }
  querySelector(selector) {
    for (const node of this.children) {
      if (selector === node.tag || (selector[0] === '.' && node.classList.contains(selector.slice(1)))) return node;
      const nested = node.querySelector(selector);
      if (nested) return nested;
    }
  }
  closest(selector) { return this.tag === selector ? this : this.parentElement?.closest(selector); }
  contains(node) { return this === node || this.children.some(child => child.contains(node)); }
  focus() { this.focused = true; }
}
const actions = new Element(), zoom = new Element('div', 'zoom-control');
const grid = new Element('button'), reset = new Element('button');
const auxiliary = ['aux-toggle','perfect-toggle','plus-selection-toggle','plus-outline-toggle'].map(name => new Element('button', name));
let gridClicks = 0; grid.onclick = () => gridClicks++;
actions.append(grid, zoom, ...auxiliary, reset);
const layers = new Element('section'), header = new Element('div','section-header');
const layerActions = new Element('div','layer-header-actions');
const add = new Element('button','','add-layer-btn'), move = new Element('button','layer-move');
const mirror = new Element('button','','mirror-layer-btn'), liveMirror = new Element('button','','mirror-live-btn'), remove = new Element('button','','delete-layer-btn');
let mirrorClicks = 0; mirror.onclick = () => mirrorClicks++;
layerActions.append(add, move, mirror, liveMirror, remove); header.append(layerActions);
const list = new Element('div'); layers.append(header, list);
const timing = new Element('div','timeline-timing'), timeline = new Element(); timeline.append(timing);
const hands = new Element('label'), checkbox = new Element('input'), options = new Element(), caption = new Element(), canvasHeader = new Element(); hands.append(checkbox); canvasHeader.append(hands);
const imageTools = new Element(), imageTitle = new Element('strong'), imageCreate = new Element('button'), imageFlip = new Element('button'), imageKey = new Element('button'), tolerance = new Element('label'), imageStatus = new Element('span');
imageCreate.textContent='新建高清画布'; imageFlip.attrs['data-edit-flip-x']=''; imageStatus.attrs['data-edit-status']='';
let keyClicks=0; imageKey.onclick=()=>keyClicks++;
imageTools.append(imageTitle,imageCreate,imageFlip,tolerance,imageKey,imageStatus);
const frameTools=new Element(), copyCel=new Element('button','','copy-cel-btn'), copyNext=new Element('button','','copy-next-cel-btn'), duplicate=new Element('button','','duplicate-frame-btn'), frameStatus=new Element('span');
frameTools.append(copyCel,copyNext,duplicate,frameStatus);
const lookup = {'.canvas-viewbar .view-actions':actions, '#layer-list':list, '.timeline-timing':timing, '.timeline-header':timeline, '#show-hands':checkbox, '.canvas-options':options, '.section-caption':caption, '.image-edit-toolbar':imageTools, '.frame-edit-toolbar':frameTools};
const events = {};
const document = {querySelector: key => lookup[key], createElement: tag => new Element(tag), addEventListener:(event,callback) => {events[event]=callback;}};
vm.runInNewContext(fs.readFileSync(path.join(root,'js/workspace-layout.js'),'utf8'), {document});
events.DOMContentLoaded();
const menus = actions.children.filter(node => node.tag === 'details');
assert.equal(menus.length,1);
assert.equal(actions.children.at(-1),zoom);
const viewContent = menus[0].children[1];
assert.deepEqual(viewContent.children,[grid,reset]);
assert(auxiliary.every(control => control.parentElement === actions),'all auxiliary controls stay directly visible');
grid.onclick(); assert.equal(gridClicks,1,'moving a control retains its original listener');
assert.equal(layerActions.parentElement,layers);
assert.deepEqual(layerActions.children.slice(0,4),[add,move,mirror,liveMirror], 'both mirror controls stay visible, outside More');
assert.deepEqual(layerActions.children[4].children[1].children,[remove]);
mirror.onclick(); assert.equal(mirrorClicks,1,'the visible mirror control keeps its listener');
assert.equal(timing.parentElement,timeline,'frame timing controls stay directly visible');
assert.equal(hands.parentElement,canvasHeader,'show arms stays in the canvas header, not Settings'); assert.equal(caption.hidden,true);
assert.deepEqual(imageTools.children.slice(0,4),[imageTitle,imageCreate,imageFlip,imageStatus]);
assert.deepEqual(imageTools.children[4].children[1].children,[tolerance,imageKey]);
imageKey.onclick(); assert.equal(keyClicks,1,'image controls retain their original listener');
assert.deepEqual(frameTools.children.slice(0,3),[copyCel,copyNext,frameStatus]);
assert.deepEqual(frameTools.children[3].children[1].children,[duplicate]);
const layerMenu = layerActions.children[4];
menus[0].open=true; layerMenu.open=true; layerMenu.events.toggle(); assert.equal(menus[0].open,false);
events.keydown({key:'Escape'}); assert.equal(layerMenu.open,false); assert(layerMenu.children[0].focused);
menus[0].open=true; events.click({target:new Element()}); assert.equal(menus[0].open,false);
menus[0].open=true; viewContent.events.click({target:grid}); assert.equal(menus[0].open,false);

const dockSource = fs.readFileSync(path.join(root,'js/panel-dock.js'),'utf8');
const resetSource = dockSource.match(/PE\.resetPanelLayout = \(\) => \{([\s\S]*?)\n    \};/)[1];
const sidebar = {insertBefore:(...args)=>anchors.push(args)}, guide = {parentElement:sidebar};
const defaults = [{section:'actions',sidebar,next:guide},{section:'layers',sidebar:'right'}], calls=[], anchors=[];
let saves=0;
vm.runInNewContext(`(() => {${resetSource}})()`, {defaults,dockInto:(...args)=>calls.push(args),save:()=>saves++});
assert.deepEqual(calls, [['layers','right',Infinity],['actions',sidebar,Infinity]]);
assert.deepEqual(anchors,[['actions',guide]],'reset also preserves non-panel guide positions');
assert.equal(saves,1);
assert(!resetSource.includes('reload'),'reset must not reload or discard an unsaved drawing');
const drawKitSource = fs.readFileSync(path.join(root,'js/draw-kit.js'),'utf8');
const auxSource = drawKitSource.match(/function buildAuxToggle\(\) \{([\s\S]*?)\n  \}\n/)[1];
const classes=new Set(), body={classList:{toggle(name){if(classes.has(name)){classes.delete(name);return false;}classes.add(name);return true;}}};
const auxActions=new Element();
const auxDocument={...document,body,querySelector:()=>auxActions,createElement:tag=>{const e=new Element(tag);e.setAttribute=(key,value)=>e[key]=value;e.classList.add=()=>{};e.classList.toggle=()=>{};return e;}};
vm.runInNewContext(`(() => {${auxSource}})()`,{document:auxDocument,PE:{}});
assert.equal(classes.has('hide-aux-bars'),false,'image and copy toolbars are visible on startup');
assert.equal(auxActions.children[0]['aria-pressed'],'true');
auxActions.children[0].onclick(); assert(classes.has('hide-aux-bars'),'only the user can collapse the toolbars');
auxActions.children[0].onclick(); assert.equal(classes.has('hide-aux-bars'),false);
console.log('PASS: arms switch, auxiliary/copy/timing controls directly visible; original listeners retained; only user can collapse auxiliary bars; reset without reload.');
