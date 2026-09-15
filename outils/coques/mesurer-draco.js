/* Combien pese chaque coque en Draco, a pleine geometrie ?
   On mesure avant de decider, plutot que de deviner. */
const fs=require('fs'), zlib=require('zlib'), path=require('path');
const lire=require('./lire.js');
const draco3d=require('draco3d');

const SRC='/mnt/user-data/uploads/Documents/modeles-sc/';
const MODELES=['caterpillar','gladius','idris-p','ironclad','javelin','orion','perseus','polaris','reclaimer'];

function souder(pos, idx, eps){
  const cle=new Map(), remap=new Int32Array(pos.length/3);
  const np=[]; let n=0; const q=1/eps;
  for(let i=0;i<pos.length/3;i++){
    const k=Math.round(pos[i*3]*q)+'_'+Math.round(pos[i*3+1]*q)+'_'+Math.round(pos[i*3+2]*q);
    let j=cle.get(k);
    if(j===undefined){ j=n++; cle.set(k,j); np.push(pos[i*3],pos[i*3+1],pos[i*3+2]); }
    remap[i]=j;
  }
  const ni=new Uint32Array(idx.length); let m=0;
  for(let t=0;t<idx.length;t+=3){
    const a=remap[idx[t]],b=remap[idx[t+1]],c=remap[idx[t+2]];
    if(a!==b&&b!==c&&a!==c){ ni[m++]=a; ni[m++]=b; ni[m++]=c; }
  }
  return {pos:new Float32Array(np), idx:ni.slice(0,m)};
}

(async()=>{
  const enc=await draco3d.createEncoderModule({});
  console.log('modele        brut tri   soude tri   som    '+[10,11,12,13,14].map(b=>('q'+b).padStart(9)).join(''));
  for(const nom of MODELES){
    const m=lire(SRC+nom+'.ctm');
    const brutTri=m.indices.length/3;
    /* diagonale pour l'epsilon de soudure */
    let mn=[1e30,1e30,1e30],mx=[-1e30,-1e30,-1e30];
    for(let i=0;i<m.sommets.length;i+=3) for(let k=0;k<3;k++){
      if(m.sommets[i+k]<mn[k])mn[k]=m.sommets[i+k];
      if(m.sommets[i+k]>mx[k])mx[k]=m.sommets[i+k];
    }
    const diag=Math.hypot(mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]);
    const s=souder(m.sommets,m.indices,diag*1e-5);
    const nSom=s.pos.length/3, nTri=s.idx.length/3;
    const tailles=[];
    for(const bits of [10,11,12,13,14]){
      const mesh=new enc.Mesh();
      const builder=new enc.MeshBuilder();
      builder.AddFacesToMesh(mesh, nTri, s.idx);
      builder.AddFloatAttributeToMesh(mesh, enc.POSITION, nSom, 3, s.pos);
      const e=new enc.Encoder();
      e.SetSpeedOptions(3,3);
      e.SetAttributeQuantization(enc.POSITION, bits);
      e.SetEncodingMethod(enc.MESH_EDGEBREAKER_ENCODING);
      const out=new enc.DracoInt8Array();
      const len=e.EncodeMeshToDracoBuffer(mesh, out);
      tailles.push(len);
      enc.destroy(out); enc.destroy(e); enc.destroy(builder); enc.destroy(mesh);
    }
    console.log(nom.padEnd(13),
      String(brutTri).padStart(8),
      String(nTri).padStart(11),
      String(nSom).padStart(7),
      tailles.map(t=>(t/1048576).toFixed(2)+' Mo').map(x=>x.padStart(9)).join(''));
  }
})();
