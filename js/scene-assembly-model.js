/* Shared validation; array order is the back-to-front object order. */
(function(root){
  const validate=s=>{
    if(!s||s.version!==1||![s.width,s.height].every(n=>Number.isSafeInteger(n)&&n>=1&&n<=2048)||!Array.isArray(s.objects)||s.objects.length>2048)throw Error('拼装场景格式或尺寸无效');
    const ids=new Set();
    for(const o of s.objects){
      if(!o||typeof o.id!=='string'||ids.has(o.id)||typeof o.material!=='string'||!o.material||typeof o.variant!=='string'||![o.x,o.y].every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=65536)||typeof o.flip!=='boolean')throw Error('拼装物件数据无效');
      ids.add(o.id);
    }
    return s;
  };
  const api={validate};
  if(typeof module==='object')module.exports=api;else root.SceneAssemblyModel=api;
})(typeof window==='object'?window:globalThis);
