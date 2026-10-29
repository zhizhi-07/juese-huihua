const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
async function check(projectId,mode='character',failSource=false,invalid=false){
 const buttons=[],writes=[],opened=[],alerts=[];
 const layers=[
  {name:'头发',sheetIndex:0,frameData:{hair:'old'}},
  {name:'down',isGroup:true,parent:null,frameData:{}},
  {name:'body',sheetIndex:0,parent:1,frameData:{body:'current pixels'}},
  {name:'head',sheetIndex:0,parent:1,frameData:{head:'current pixels'}},
  {name:'hand',sheetIndex:0,parent:1,frameData:{hand:'old'}},
  {name:'眼睛',sheetIndex:0,frameData:{eyes:'old'}},
  {name:'衣服',sheetIndex:0,frameData:{dress:'old'}},
  {name:'饰品',sheetIndex:0,frameData:{clip:'old'}},
  {name:'杂稿分组',isGroup:true,parent:null,frameData:{}},
 ];
 const current={name:'当前草稿',currentSheetIndex:0,currentLayerIndex:6,layers:structuredClone(layers),spriteSheets:[{actions:[{frames:[{width:32,height:32,duration:100}]}]}]};
 const main=structuredClone(current);main.name='人物主工程';main.layers[2].frameData.body='main pixels';
 if(invalid)main.layers=main.layers.filter(l=>!['body','head'].includes(l.name));
 const before=JSON.stringify(current),p={ready:true,projectId,base:'',headers:{'X-Pixel-Editor':'1'},show(){}};
 const element=()=>({style:{},setAttribute(){},after(){},prepend(){},append(){},insertBefore(){},addEventListener(){},replaceChildren(){},click(){opened.push(this.href);}});
 const context={PE:{app:{persistence:p,project:current,exportManager:{exportProject:()=>new Blob([JSON.stringify(current)])}}},document:{addEventListener:(_,fn)=>fn(),createElement:tag=>{const e=element();if(tag==='button')buttons.push(e);return e;},getElementById:()=>element()},location:{href:'http://localhost/?project='+projectId},URL,Blob,crypto:{randomUUID:()=> 'unique-id'},Option:function(){},localStorage:{getItem(){return null;}},prompt:()=> 'AI1-上衣',alert:m=>alerts.push(m),console,fetch:async(url,options)=>{if(options.method==='PUT'){writes.push({url,options});return {ok:true};}if(url.includes('id=main'))return {ok:!failSource,status:404,json:async()=>structuredClone(main)};return {ok:true,json:async()=>[]};}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/character-base.js'),'utf8'),context);
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/projects.js'),'utf8'),context);
 if(mode==='api'){try{await context.PE.createProjectBranch();}catch(e){alerts.push(e.message);}}
 else await buttons.find(b=>b.textContent===(mode==='current'?'分出当前工程独立稿':'新建人物／衣服分支')).onclick();
 if(failSource||invalid){assert.equal(writes.length,0);assert.equal(opened.length,0);assert(alerts.length);return;}
 assert.equal(writes.length,1);assert.equal(writes[0].options.headers['If-Match'],'none');
 const saved=JSON.parse(writes[0].options.body),source=mode==='character'&&projectId!=='main'?main:current;
 assert.deepEqual(saved.layers.map(l=>l.name),['down','body','head','hand']);
 assert.equal(saved.layers[1].parent,0);assert.equal(saved.layers[2].parent,0);assert.equal(saved.layers[3].parent,0);assert.deepEqual(saved.layers[3].frameData,source.layers[4].frameData);assert.equal(saved.currentLayerIndex,1);
 assert.deepEqual(saved.layers[1].frameData,source.layers[2].frameData);assert.deepEqual(saved.layers[2].frameData,source.layers[3].frameData);assert.deepEqual(saved.spriteSheets,source.spriteSheets);
 assert.equal(JSON.stringify(current),before,'Do not mutate current project or unsaved pixels');assert.equal(saved.name,'AI1-上衣');assert.equal(opened.length,1);
}
(async()=>{await check('main');await check('scene-kitchen');await check('character-outfit');await check('main','current');await check('character-outfit','api');await check('scene-kitchen','character',true);await check('scene-kitchen','character',false,true);console.log('PASS: all character branch entry points copy body/head/hands and their groups, preserve pixels/frames, remap parents/selection, retain current draft, and stop on invalid source.');})().catch(e=>{console.error(e);process.exitCode=1;});
