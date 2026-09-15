const fs=require('fs'), vm=require('vm');
const ctx={module:{exports:{}}, console};
ctx.global=ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('lzma.js','utf8'),ctx);
const LZMA=ctx.module.exports; ctx.LZMA=LZMA; ctx.module={exports:{}};
vm.runInContext(fs.readFileSync('ctm.js','utf8'),ctx);
const CTM=ctx.module.exports;

module.exports = function lire(chemin){
  const buf=new Uint8Array(fs.readFileSync(chemin));
  const f=new CTM.File(new CTM.Stream(buf));
  return {
    sommets: f.body.vertices,
    indices: f.body.indices,
    normales: f.body.normals || null,
    nbSommets: f.header.vertexCount,
    nbTriangles: f.header.triangleCount,
    methode: f.header.compressionMethod,
    commentaire: f.header.comment
  };
};
if (require.main===module){
  for (const a of process.argv.slice(2)){
    const m=module.exports(a);
    const v=m.sommets; let mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9];
    for(let i=0;i<v.length;i+=3) for(let k=0;k<3;k++){ if(v[i+k]<mn[k])mn[k]=v[i+k]; if(v[i+k]>mx[k])mx[k]=v[i+k]; }
    console.log(a.split('/').pop().padEnd(18),
      String(m.nbTriangles).padStart(8)+' tri',
      String(m.nbSommets).padStart(8)+' som',
      ' bbox ['+mx.map((x,k)=>(x-mn[k]).toFixed(2)).join(' x ')+']',
      m.normales?'+normales':'sans normales');
  }
}
