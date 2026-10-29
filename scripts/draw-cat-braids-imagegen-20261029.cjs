const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,ImageData,Image,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.join(root,'发型素材/07-猫耳栗棕双辫-生图试稿'),id='character-cat-braids-imagegen-20261029',api='http://127.0.0.1:8765/api/project?id=';
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={addEventListener(){},createElement(){return Object.assign(createCanvas(1,1),{style:{}});}};global.FileReader=class{async readAsText(b){this.result=await b.text();this.onload();}};
for(const n of ['core','history','canvas','export'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const C={O:[75,37,36,255],D:[108,53,34,255],B:[154,98,61,255],H:[202,147,99,255],W:[255,248,239,255],V:[234,222,212,255],R:[233,59,63,255],S:[162,36,46,255],N:[240,205,104,255]};
const put=(d,x,y,c)=>{if(x<0||x>=32||y<0||y>=32)return;d.data.set(typeof c==='string'?C[c]:c,(y*32+x)*4);};
function save(d,name,scale=1,bg){const tile=createCanvas(d.width,d.height);tile.getContext('2d').putImageData(d,0,0);const c=createCanvas(d.width*scale,d.height*scale),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);}ctx.drawImage(tile,0,0,c.width,c.height);fs.writeFileSync(path.join(out,name),c.toBuffer('image/png'));return c;}
function bounds(d){let x=32,y=32,r=-1,b=-1;for(let py=0;py<32;py++)for(let px=0;px<32;px++)if(d.data[(py*32+px)*4+3]){x=Math.min(x,px);y=Math.min(y,py);r=Math.max(r,px);b=Math.max(b,py);}return{x,y,w:r-x+1,h:b-y+1};}
async function load(file){const img=await loadImage(path.join(out,file)),c=createCanvas(img.width,img.height);c.getContext('2d').drawImage(img,0,0);return c.getContext('2d').getImageData(0,0,c.width,c.height);}
async function main(){
 const raw=fs.readFileSync(path.join(out,'source-main.json'),'utf8'),base=require('../js/character-base')(JSON.parse(raw));base.name='猫耳栗棕双辫·生图正面试稿';base.currentSheetIndex=8;base.currentActionIndex=1;base.currentFrameIndex=0;
 const ex=new PE.ExportManager(),p=(await ex.importProject(new Blob([JSON.stringify(base)]))).project,cm=new PE.CanvasManager(document.createElement('canvas'),p);ex.init(p,cm);const key='8_1_0',head=p.layers.find(l=>l.name==='head'&&l.frameData.has(key)).frameData.get(key),generated=await load('pixel-hair-hat.png'),eyeSource=await load('pixel-eyes.png');
 const code=(x,y)=>{if(x<0||x>=32||y<0||y>=32)return null;const i=(y*32+x)*4,[r,g,b,a]=generated.data.slice(i,i+4);if(!a)return null;return r>225&&g>205?'W':r>180&&g<110?'R':r>185?'H':r>130?'B':r>85?'D':'O';};
 const rear=new ImageData(32,32),front=new ImageData(32,32),hat=new ImageData(32,32),eyes=new ImageData(32,32),shadow=new ImageData(32,32);
 // Complete independent brown caps from the actual head contour, never copy skin pixels.
 for(let y=2;y<=22;y++)for(let x=0;x<32;x++)if(head.data[(y*32+x)*4+3]){const edge=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>x+dx<0||x+dx>=32||!head.data[((y+dy)*32+x+dx)*4+3]);put(rear,x,y,edge?'O':x<9?'D':'B');if(y<=8)put(front,x,y,edge?'O':x<9?'D':'B');}
 // Resample the generated pigtails and bangs into the current doll's proportions.
 for(const side of [0,1])for(let y=0;y<19;y++)for(let x=0;x<6;x++){const sx=side?21+Math.floor(x*10/6):1+Math.floor(x*10/6),sy=12+Math.floor(y*18/19),v=code(sx,sy);if(v&&!['W','R'].includes(v))put(rear,(side?25:1)+x,10+y,v);}
 for(let y=0;y<6;y++)for(let x=0;x<20;x++){const v=code(10+Math.floor(x*12/20),11+y);if(v&&!['W','R'].includes(v))put(front,6+x,7+y,v);}
 for(const side of [0,1])for(let y=0;y<12;y++)for(let x=0;x<3;x++){const v=code((side?23:5)+x,13+Math.floor(y*10/12));if(v&&!['W','R'].includes(v))put(front,(side?26:3)+x,9+y,v);}
 // Remove doubled generated outlines in the fringe and give the ends small connected steps.
 for(let y=7;y<=10;y++)for(let x=8;x<=24;x++)if(front.data[(y*32+x)*4+3])put(front,x,y,x===16&&y<10?'D':'B');
 for(const x of [13,14,20,21]){front.data.fill(0,(12*32+x)*4,(12*32+x)*4+4);put(front,x,11,'O');}
 // Small manual edge repair: retain one-pixel temples and remove isolated fragments.
 for(let y=9;y<=20;y++){put(front,3,y,'O');put(front,28,y,'O');}
 for(let y=0;y<9;y++)for(let x=1;x<31;x++){const sy=2+Math.floor(y*14/9),v=code(x,sy);if(v==='W'||v==='R'){put(hat,x,y,v==='W'&&y>=7?'V':v);}else if(v==='O'&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>['W','R'].includes(code(x+dx,sy+dy))))put(hat,x,y,'O');}
 // Restore readable cat marks and bow shading lost by reducing the generated asset.
 put(hat,10,4,'O');put(hat,21,4,'O');put(hat,16,5,'N');put(hat,17,5,'N');
 for(let y=2;y<=4;y++)for(let x=22;x<=24;x++)if(hat.data[(y*32+x)*4+3]&&hat.data[(y*32+x)*4]===233)put(hat,x,y,'S');
 // Use the generated eyes' clusters; put makeup on a different layer from the eye whites/iris.
 const ep=[[56,37,44,255],[107,61,63,255],[166,91,104,255],[211,151,163,255],[255,248,238,255]];
 const closest=rgba=>ep.reduce((best,c)=>c.slice(0,3).reduce((n,v,i)=>n+(v-rgba[i])**2,0)<best.dist?{c,dist:c.slice(0,3).reduce((n,v,i)=>n+(v-rgba[i])**2,0)}:best,{c:ep[0],dist:Infinity}).c;
 for(const side of [0,1])for(let y=0;y<5;y++)for(let x=0;x<6;x++){const sx=(side?18:6)+Math.floor((x+.5)*8/6),sy=4+y,i=(sy*32+sx)*4;if(eyeSource.data[i+3])put(eyes,(side?18:8)+x,14+y,closest(eyeSource.data.slice(i,i+4)));}
 for(const start of [8,18]){put(eyes,start+2,15,[255,255,255,255]);put(eyes,start+2,16,[255,248,238,255]);put(eyes,start+3,16,ep[1]);put(eyes,start+3,17,ep[2]);put(eyes,start+2,18,ep[3]);}
 for(const start of [8,18]){for(let x=1;x<5;x++)put(shadow,start+x,13,ep[3]);put(shadow,start,14,[231,183,190,255]);}
 // The source braids became dark sticks behind the wide base head; re-cluster their native pixels.
 const braid=['..OBO.','.OBHDO','OBBBD.','.ODBO.','..OBBO','.OBHDO','OBBBD.','.ODBO.','..OBBO','.OBHDO','OBBBD.','.ODBO.','..OBBO','.OBBD.','..OO..'];
 for(let y=10;y<30;y++)for(let x=0;x<8;x++)for(const xx of [x,31-x])if(!head.data[(y*32+xx)*4+3])rear.data.fill(0,(y*32+xx)*4,(y*32+xx)*4+4);
 for(let y=0;y<braid.length;y++)for(let x=0;x<6;x++)if(braid[y][x]!=='.'){put(rear,x,14+y,braid[y][x]);put(rear,31-x,14+y,braid[y][x]);}
 // No other direction or animation frame is synthesized before the first frame is accepted.
 const layers=[['头发 / 07 栗棕双辫 / 后发',rear],['眼睛 / 07 莓棕生图眼',eyes],['妆容 / 07 玫瑰妆',shadow],['头发 / 07 柔分齐刘海 / 前发',front],['发饰 / 07 猫耳红结帽',hat]];
 // The rear hair must stay below the shared head/body/hands in every compositor.
 const rearLayer=new PE.Layer(layers[0][0]);rearLayer.sheetIndex=8;rearLayer.frameData.set(key,rear);p.layers.unshift(rearLayer);for(const l of p.layers)if(l!==rearLayer&&l.parent!=null)l.parent++;
 for(const [name,d]of layers.slice(1)){const l=p.addLayer(name);l.sheetIndex=8;l.frameData.set(key,d);}
 p.currentLayerIndex=p.layers.findIndex(l=>l.name===layers[3][0]);p.currentSheetIndex=8;p.currentActionIndex=1;p.currentFrameIndex=0;
 const composite=cm.getCompositeImageData(8,1,0,true);save(composite,'composite-front-32.png');save(composite,'composite-front-light.png',16,'#f4e9e9');save(composite,'composite-front-dark.png',16,'#2e3038');
 for(const [i,[name,d]]of layers.entries()){assert(d.data.some((v,j)=>j%4===3&&v===255),name+' is empty');assert([...d.data].every((v,j)=>j%4!==3||v===0||v===255),'no semi-transparent pixels');save(d,['rear-hair','eyes','eyeshadow','front-hair','cat-hat'][i]+'-32.png');console.log(name,bounds(d));}
 const artwork=p.layers.filter(l=>layers.some(([name])=>name===l.name));for(const l of artwork)for(const k of l.frameData.keys())assert.equal(k,key,'only front idle first frame');
 const testHat=p.layers.at(-1);testHat.visible=false;save(cm.getCompositeImageData(8,1,0,true),'composite-without-hat.png',16,'#f4e9e9');testHat.visible=true;
 fs.writeFileSync(path.join(out,'candidate-project.json'),await ex.exportProject(false).text());fs.writeFileSync(path.join(out,'prompt-and-notes.md'),'内置 imagegen 生成棕色双辫与猫耳帽、莓棕眼妆素材。原图保持在本目录 generated-*.png。使用工作台同款最近邻缩小与有限色量化，随后按当前32×32素体压缩帽子、分离前后发与帽子、去除半透明柔边，并把眼睛与眼影独立对齐到 y=14 和 y=13。只制作待机正面第一帧，其他动作与方向保持原素体。');console.log('LOCAL CANDIDATE READY',out,id);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
