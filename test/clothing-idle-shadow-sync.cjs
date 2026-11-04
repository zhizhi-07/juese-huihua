const fs=require('node:fs'),assert=require('node:assert/strict');
const {fixture}=require('./clothing-sync.cjs');
async function main(){
  const first=await fixture(),C=PE.ClothingSync;
  const source=first.p.getCurrentLayer();C.sync(first.app,{live:true});
  assert(!source.clothingSync.preserved.some(k=>k.startsWith(source.sheetIndex+'_')),'setup must not silently freeze idle animation');
  const response=await fetch('http://127.0.0.1:8765/api/project?id=main');assert(response.ok);
  const raw=await response.text(),p=(await new PE.ExportManager().importProject(new Blob([raw]))).project;
  const s=p.layers.find(l=>l.clothingSync);assert(s);
  // Exercise migration on a copy, never write test pixels to the project.
  s.clothingSync.preserved=s.clothingSync.preserved.filter(k=>!k.startsWith(s.sheetIndex+'_'));
  const before=p.layers.map(l=>new Map(l.frameData)),checks=[];
  for(const ai of [1,2]){
    const key=`${s.sheetIndex}_${ai}_0`,im=s.getFrameData(key);let count=0;
    for(let i=0;i<im.data.length;i+=4)if(im.data[i+3]&&im.data[i]===105&&im.data[i+1]===105&&im.data[i+2]===105){im.data.set([91,92,93,255],i);count++;}
    assert.equal(count,4,'real first-frame pants shadow fixture');
  }
  C.refresh(p);
  for(const ai of [1,2])for(let fi=1;fi<=3;fi++){
    const key=`${s.sheetIndex}_${ai}_${fi}`,im=s.getFrameData(key);let count=0;
    for(let i=0;i<im.data.length;i+=4)if(im.data[i+3]&&im.data[i]===91&&im.data[i+1]===92&&im.data[i+2]===93)count++;
    assert.equal(count,4,'live source-shadow edit must reach '+key);checks.push({key,shadowPixels:count});
  }
  for(let li=0;li<p.layers.length;li++)if(!p.layers[li].clothingSyncId)assert.deepEqual(p.layers[li].frameData,before[li],'non-clothing changed');
  const keep=`${s.sheetIndex}_2_1`,held=s.getFrameData(keep);s.clothingSync.preserved.push(keep);
  const im=s.getFrameData(`${s.sheetIndex}_2_0`);for(let i=0;i<im.data.length;i+=4)if(im.data[i]===91&&im.data[i+1]===92)im.data[i]=90;
  C.refresh(p);assert.equal(s.getFrameData(keep),held,'explicit keep must still protect a manual frame');
  console.log('PASS: setup no longer auto-preserves idle; actual main first-frame shadow color edit reaches all six frames via refresh; explicit keep and non-clothing preserved.');
  console.log(JSON.stringify(checks));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
