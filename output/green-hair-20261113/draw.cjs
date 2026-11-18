const fs=require('fs'),assert=require('assert/strict');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const dir=__dirname,original=JSON.parse(fs.readFileSync(dir+'/original.json')),j=structuredClone(original);
const palette={o:'#46465E',d:'#536A36',s:'#718C40',g:'#8DA64F',l:'#AAC46D',h:'#C4D990'};
const patterns=[
[
'.....ooooooo.....',
'....ogggllggo....',
'...ogllggggggo...',
'..osglgggsggggo..',
'..osggsggssgggo..',
'.osggssgsssggo...',
'.osgsssgsoggo....',
'.osgssgo..oo.....',
'..osgso..........',
'..osgso.....go...',
'...osso....odo...',
'....oo......o....',
],
[
'.....ooooooo.....',
'....ogggllggo....',
'...ogllggglggo...',
'..ogggggggggggo..',
'..ogglggglggggo..',
'.osggsglgsgggsgo.',
'.osgsoogoogosgso.',
'..oso.......oso..',
'.osgo.......ogso.',
'.osso.......osso.',
'..oso.......oso..',
'...o.........o...',
],
[
'.....ooooooo.....',
'....ogggllggo....',
'...ogggggggggo...',
'..ogglgggglgggo..',
'..ogggggggggggo..',
'.osggggggggggsgo.',
'.osgglggggglgsgo.',
'osgggsgggsggggsgo',
'.osgssgsgsgssgso.',
'.osssgssgssgssso.',
'..osssossossso...',
'...ooo.oo.ooo....',
]];
const layer={name:'头发 / 苔绿色蓬松短发 / 三向首帧',sheetIndex:1,parent:null,depth:0,visible:true,locked:false,opacity:1,frameData:{}};
for(let a=0;a<3;a++){let c=createCanvas(17,17),ctx=c.getContext('2d');patterns[a].forEach((row,y)=>{assert.equal(row.length,17);[...row].forEach((p,x)=>{if(p!=='.'){ctx.fillStyle=palette[p];ctx.fillRect(x,y,1,1)}})});layer.frameData['1_'+a+'_0']={width:17,height:17,dataURL:c.toDataURL('image/png')};}
j.layers.push(layer);
async function render(project,file){let c=createCanvas(612,204),ctx=c.getContext('2d');ctx.fillStyle=project.bgColor;ctx.fillRect(0,0,612,204);ctx.imageSmoothingEnabled=false;for(let a=0;a<3;a++){let key='1_'+a+'_0',s=createCanvas(17,17),sc=s.getContext('2d');for(let l of project.layers){let v=l.frameData?.[key];if(l.sheetIndex===1&&l.visible&&!l.isGroup&&v){sc.globalAlpha=l.opacity??1;sc.drawImage(await loadImage(v.dataURL),0,0)}}ctx.drawImage(s,a*204,0,204,204)}fs.writeFileSync(dir+'/'+file,c.toBuffer('image/png'));}
(async()=>{assert.deepEqual(j.layers.slice(0,-1),original.layers);assert.deepEqual(j.spriteSheets,original.spriteSheets);await render(original,'before.png');await render(j,'preview.png');fs.writeFileSync(dir+'/candidate.json',JSON.stringify(j));fs.writeFileSync(dir+'/hair.px.js',"pal("+JSON.stringify(palette)+")\n"+patterns.map((p,a)=>'sprite("hair_'+a+'", { w:17,h:17 }, '+JSON.stringify(p.join('\n'))+')').join('\n'));if(process.argv.includes('--save')){let meta=JSON.parse(fs.readFileSync(dir+'/source.json'));let r=await fetch('http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561',{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(j)});assert(r.ok,'Save '+r.status+' '+await r.text());let rr=await fetch('http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561');assert.deepEqual(await rr.json(),j);fs.writeFileSync(dir+'/verification.txt','PASS: ETag save and exact API readback; all original layers and all frame metadata unchanged; only one added hair layer, keys 1_0_0,1_1_0,1_2_0.\nOriginal SHA256: '+meta.sha256);console.log('Saved and verified');}})().catch(e=>{console.error(e);process.exitCode=1});
