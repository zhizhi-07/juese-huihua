const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../..');
const edit=(file,pairs)=>{const f=path.join(root,file);let s=fs.readFileSync(f,'utf8');for(const [a,b] of pairs){if(s.split(a).length!==2)throw Error(file+' 找不到或不唯一: '+a.slice(0,60));s=s.replace(a,()=>b);}fs.writeFileSync(f,s);};
edit('js/clothing-fit.js',[
 [`function fromIdle(src,target,{sit=false,targetHead,shadeLegs=true}={}){`,`function fromIdle(src,target,{sit=false,targetHead,shadeLegs=true,mask=null}={}){`],
 [`if(px<0||px>=cloth.width||sit&&targetHead?.data[i+3])return;`,`// mask：目标帧的头部；低头时衣领不盖住脸。\n      if(px<0||px>=cloth.width||sit&&targetHead?.data[i+3]||mask?.data[i+3])return;`]
]);
edit('js/clothing-sync.js',[
 [`/* Three idle masters, native-body fitting, explicit preservation and undoable live sync. */`,`/* Three idle masters reach every character action; native-body fitting, explicit preservation and undoable live sync. */`],
 [`const supported=s=>/^original16_(idle|walk|pickup|sit)$/.test(s?.name||''),idle=s=>s?.name==='original16_idle';`,`// 全部人物动作（含浇水、工具、钓鱼等）都从待机三面首帧生成。\n  const supported=s=>PE.isCharacterSheet(s)&&PE.isEditorSheet(s)&&s.name.startsWith('original32_')===false,idle=s=>s?.name==='original16_idle';`],
 [`      if(g.idleShadows!==undefined){`,`      if(g.sitGenerated!==undefined&&(!Array.isArray(g.sitGenerated)||g.sitGenerated.length>3||g.sitGenerated.some(key=>typeof key!=='string'||!/^\\d+_\\d+_0$/.test(key)||!sit(p.spriteSheets[Number(key.split('_')[0])]))))throw Error('坐姿衣服自动首帧设置无效');\n      if(g.idleShadows!==undefined){`],
 [`    const sitSheet=p.spriteSheets.findIndex(sit),seated=new Map();
    if(sitSheet>=0)for(const [ai,a] of p.spriteSheets[sitSheet].actions.entries()){
      const key=p.getFrameKey(sitSheet,ai,0);if(a.direction!=='up'&&!usePaintedSit&&!g.sitMasters?.includes(key))continue;
      const im=target(p,source,sitSheet,ai).getFrameData(key);
      if(hasInk(im))seated.set(a.direction,im);
    }
    const sitPending=sitSheet>=0&&p.spriteSheets[sitSheet].actions.some(a=>a.direction!=='up'&&!seated.has(a.direction));`,`    // 坐姿首帧：已确认或手画的当源稿；空白或上次自动生成的，直接从待机生成，不需要另画。
    const sitSheet=p.spriteSheets.findIndex(sit),seated=new Map(),skipped=new Set(),auto=[];
    if(sitSheet>=0)for(const [ai,a] of p.spriteSheets[sitSheet].actions.entries()){
      const key=p.getFrameKey(sitSheet,ai,0),confirmed=!!g.sitMasters?.includes(key),im=target(p,source,sitSheet,ai).getFrameData(key);
      if(!hasInk(im)||!confirmed&&g.sitGenerated?.includes(key)){auto.push(key);continue;}
      if(confirmed||usePaintedSit||a.direction==='up')seated.set(a.direction,im);else skipped.add(a.direction);
    }
    const sitPending=skipped.size>0;`],
 [`      const a=p.spriteSheets[si].actions[ai],sitting=si===sitSheet;if(sitting&&sitPending)continue;`,`      const a=p.spriteSheets[si].actions[ai],sitting=si===sitSheet;if(sitting&&skipped.has(a.direction))continue;`],
 [`      const firstBody=sitting?base(p,si,ai,0,'body'):null,firstHead=sitting?base(p,si,ai,0,'head'):null;
      const generateBack=sitting&&a.direction==='up'&&!seated.has('up');
      const first=sitting?(seated.get(a.direction)||fitPattern(src,firstBody,{sit:true,shadeLegs:false,targetHead:firstHead})):null;
      for(let fi=0;fi<a.frames.length;fi++){const key=p.getFrameKey(si,ai,fi),frame=a.frames[fi];if(fi===0&&(si===source.sheetIndex||sitting&&!generateBack)||!includePreserved&&g.preserved.includes(key))continue;`,`      const first=sitting?seated.get(a.direction):null,firstBody=first?base(p,si,ai,0,'body'):null,firstHead=first?base(p,si,ai,0,'head'):null;
      for(let fi=0;fi<a.frames.length;fi++){const key=p.getFrameKey(si,ai,fi),frame=a.frames[fi];if(fi===0&&(si===source.sheetIndex||first)||!includePreserved&&g.preserved.includes(key))continue;`],
 [`        const image=sitting?(fi===0?first:compressSit(first,frame,base(p,si,ai,fi,'head'),firstHead,body,firstBody)):fitPattern(src,body,{shadeLegs:true});`,`        const image=first?compressSit(first,frame,base(p,si,ai,fi,'head'),firstHead,body,firstBody):fitPattern(src,body,{shadeLegs:true,mask:base(p,si,ai,fi,'head')});`],
 [`    }return {edits,preserved:g.preserved.length,sitPending,source,shadows,shadowsChanged:JSON.stringify(g.idleShadows||{})!==JSON.stringify(shadows)};`,`    }return {edits,preserved:g.preserved.length,sitPending,source,shadows,shadowsChanged:JSON.stringify(g.idleShadows||{})!==JSON.stringify(shadows),sitGenerated:auto,sitGeneratedChanged:JSON.stringify(g.sitGenerated||[])!==JSON.stringify(auto)};`],
 [`if(result.shadowsChanged)result.source.clothingSync.idleShadows=result.shadows;return result;}`,`if(result.shadowsChanged)result.source.clothingSync.idleShadows=result.shadows;if(result.sitGeneratedChanged)result.source.clothingSync.sitGenerated=result.sitGenerated.slice();return result;}`],
 [`return pending.filter(item=>item.result.edits.length||item.result.shadowsChanged);}`,`return pending.filter(item=>item.result.edits.length||item.result.shadowsChanged||item.result.sitGeneratedChanged);}`],
 [`      g.sitMasters=had?list.filter(k=>k!==key):[...list,key];return !had;`,`      g.sitMasters=had?list.filter(k=>k!==key):[...list,key];if(!had&&g.sitGenerated)g.sitGenerated=g.sitGenerated.filter(k=>k!==key);return !had;`],
 [`if(!note.textContent&&s)note.textContent='画好坐姿现有方向的首帧即可手动同步。';`,`if(!note.textContent)note.textContent='只画待机正、侧、背三面第 1 帧，点「同步衣服全部」即可生成全部动作；坐姿想自己画就画首帧后点确认。';`],
 [`const pending=(r,live=false)=>r.sitPending?(live?' 确认所需方向的首帧后才会实时同步坐姿。':' 坐姿已跳过，请先画所需方向的首帧。'):'';`,`const pending=(r,live=false)=>r.sitPending?(live?' 坐姿有手画但未确认的首帧，该方向暂不改动；点「确认坐姿首帧」后跟随。':' 坐姿有方向已跳过。'):'';`],
 [`say(sitting?'画好所需方向的坐姿首帧后点「同步衣服全部」。':'正在编辑本方向待机首帧。');`,`say(sitting?'坐姿默认从待机自动生成；想自己画就画本方向首帧后点「确认坐姿首帧」。':'正在编辑本方向待机首帧。');`]
]);
edit('index.html',[
 [`js/clothing-fit.js?v=idle-master-shadows-20261109`,`js/clothing-fit.js?v=all-actions-20261114`],
 [`js/clothing-sync.js?v=sit-directions-20261109`,`js/clothing-sync.js?v=all-actions-20261114`]
]);
console.log('patched');
