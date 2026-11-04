/* Compare the reported saved hair against its source ordering without touching live projects. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;
global.document={addEventListener(){},createElement(){return createCanvas(1,1);}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const name of ['core','export','visual-layers','wardrobe'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8'),{filename:name+'.js'});
async function main(){
  const folder=process.argv[2];if(!folder)throw new Error('Pass the read-only target snapshot folder');
  const tag=process.argv[3]||'after',W=PE.Wardrobe,source=await W.decode(JSON.parse(fs.readFileSync(path.join(folder,'source.json'),'utf8')));
  const rear=await W.decode(JSON.parse(fs.readFileSync(path.join(folder,'rear.json'),'utf8'))),front=await W.decode(JSON.parse(fs.readFileSync(path.join(folder,'front.json'),'utf8')));
  const actions=['idle','walk','sit','pickup','sleep'],directions=['down','right','left','up'],atlas=createCanvas(1024,740),ac=atlas.getContext('2d');ac.imageSmoothingEnabled=false;ac.fillStyle='#e4eae0';ac.fillRect(0,0,atlas.width,atlas.height);
  let checked=0,failed=0;const failures=[];
  for(const [row,action]of actions.entries())for(const [column,direction]of directions.entries()){
    const sourceLoc=W.locate(source,action,direction);if(!sourceLoc)continue;
    const order=PE.getRenderLayers(source,sourceLoc.si,sourceLoc.ai);
    for(const equipOrder of [[front,rear],[rear,front]])for(let fi=0;fi<sourceLoc.action.frames.length;fi++){
      const commands=[],key=source.getFrameKey(sourceLoc.si,sourceLoc.ai,fi);
      for(const project of [source,...equipOrder]){
        const loc=W.locate(project,action,direction);if(!loc?.action.frames[fi])continue;
        for(const layer of PE.getRenderLayers(project,loc.si,loc.ai)){
          if(!PE.isLayerVisible(project,layer,loc.si)||layer.opacity<=0||(project===source&&!W.isBase(layer)&&PE.VisualLayers.category(layer)!=='五官')||!layer.getFrameData(project.getFrameKey(loc.si,loc.ai,fi)))continue;
          const original=project===source?layer:order.find(l=>l.name===layer.name&&l.sheetIndex===sourceLoc.si&&l.getFrameData(key));
          assert(original,'Source layer not found: '+layer.name+' '+action+' '+direction+' '+fi);
          commands.push({project,loc,layer,sourceOrder:order.indexOf(original),rank:W.rank(layer,loc.action.direction,project,project.getFrameKey(loc.si,loc.ai,fi))});
        }
      }
      const render=field=>{const c=createCanvas(64,64),ctx=c.getContext('2d');for(const command of [...commands].sort((a,b)=>a[field]-b[field]))W.drawFrame(ctx,command.project,command.loc,fi,32,32,l=>l===command.layer);return c;};
      const expected=render('sourceOrder'),actual=render('rank'),ed=expected.getContext('2d').getImageData(0,0,64,64).data,ad=actual.getContext('2d').getImageData(0,0,64,64).data;
      let different=0;for(let i=0;i<ed.length;i+=4)if(ed[i]!==ad[i]||ed[i+1]!==ad[i+1]||ed[i+2]!==ad[i+2]||ed[i+3]!==ad[i+3])different++;
      checked++;if(different){failed++;failures.push({action,direction,fi,equipOrder:equipOrder[0]===front?'front-first':'rear-first',different});}
      if(fi===0&&equipOrder[0]===front){
        for(const [i,c]of [expected,actual].entries()){const x=column*256+i*128,y=row*148;ac.fillStyle='#314b39';ac.font='11px sans-serif';ac.fillText((i?'TEST ':'REF ')+action+'/'+direction,x+4,y+14);ac.drawImage(c,x,y+18,128,128);}
      }
    }
  }
  const out=path.join(__dirname,'output');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'wardrobe-rear-'+tag+'.png'),atlas.toBuffer('image/png'));
  fs.writeFileSync(path.join(out,'wardrobe-rear-'+tag+'.json'),JSON.stringify({checked,failed,failures},null,2));
  console.log(JSON.stringify({checked,failed,firstFailures:failures.slice(0,8),image:path.join(out,'wardrobe-rear-'+tag+'.png')},null,2));
  assert.equal(failed,0,'Wardrobe pixels must match the source layer order for both equip orders');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
