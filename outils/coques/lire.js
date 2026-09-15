const fs=require('fs'), vm=require('vm');
const ctx={module:{exports:{}}, console};
ctx.global=ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('lzma.js','utf8'),ctx);
const LZMA=ctx.module.exports; ctx.LZMA=LZMA; ctx.module={exports:{}};
vm.runInContext(fs.readFileSync('ctm.js','utf8'),ctx);
const CTM=ctx.module.exports;

/* PLY binaire, tel que l'écrit l'outil de modélisation Blender :
   positions en float32, faces triangulées. Rien d'autre à lire,
   la chaîne recalcule normales et arêtes elle-même. */
function lirePly(chemin){
  const buf=fs.readFileSync(chemin);
  const tete=buf.slice(0, Math.min(buf.length, 4096)).toString('ascii');
  const fin=tete.indexOf('end_header\n');
  if(fin<0) throw new Error('PLY sans en-tete lisible');
  const debut=fin+'end_header\n'.length;
  const nv=Number(/element vertex (\d+)/.exec(tete)[1]);
  const nf=Number(/element face (\d+)/.exec(tete)[1]);
  const som=new Float32Array(nv*3);
  let o=debut;
  for(let i=0;i<nv*3;i++){ som[i]=buf.readFloatLE(o); o+=4; }
  const idx=new Uint32Array(nf*3);
  for(let f=0;f<nf;f++){
    const n=buf.readUInt8(o); o+=1;
    if(n!==3) throw new Error('PLY non triangule');
    for(let k=0;k<3;k++){ idx[f*3+k]=buf.readUInt32LE(o); o+=4; }
  }
  return {sommets:som, indices:idx, normales:null, nbSommets:nv,
          nbTriangles:nf, methode:'ply', commentaire:''};
}

module.exports = function lire(chemin){
  if(chemin.endsWith('.ply')) return lirePly(chemin);
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
