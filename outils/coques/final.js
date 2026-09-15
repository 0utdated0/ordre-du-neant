const fs=require('fs'), zlib=require('zlib');
const lire=require('./lire.js');
const {MeshoptSimplifier}=require('meshoptimizer');
const {aretesBudget,tuyeres}=require('./extra.js');

const SRC='/mnt/user-data/uploads/Documents/modeles-sc/';
const SRC_STATION='/home/claude/wtest/outils/station/';
const OUT=process.argv[2] || '/home/claude/wtest/public/coques/';

/* Longueur reelle en metres d'apres la fiche technique RSI, et
   budget de triangles. Les modeles du holoviewer font de 240 000 a
   995 000 triangles : inexploitables tels quels sur une page web. */
const FLOTTE = {
  'javelin':     {nom:'javelin',     longueur:345, cible:14000, aretes:9000},
  'idris-p':     {nom:'idris',       longueur:239, cible:12000, aretes:8000},
  'perseus':     {nom:'perseus',     longueur:180, cible:13000, aretes:9000},
  'ironclad':    {nom:'ironclad',    longueur:135, cible:12000, aretes:9000},
  'polaris':     {nom:'polaris',     longueur:155, cible:12000, aretes:8000},
  'orion':       {nom:'orion',       longueur:170, cible:13000, aretes:9000},
  'reclaimer':   {nom:'reclaimer',   longueur:155, cible:12000, aretes:8000},
  'caterpillar': {nom:'caterpillar', longueur:111, cible:11000, aretes:7500},
  /* Le Hammerhead a ete retire. Son maillage est fait de coques
     ouvertes et disjointes : l'effondrement d'aretes n'a aucune
     arete partagee a effondrer, il mange les surfaces, et la
     simplification approximative met le batiment en morceaux. En
     dessous de 100 000 triangles il n'en reste qu'un squelette.
     Si un modele se comporte ainsi, changer de vaisseau coute
     moins cher que de le rafistoler. */
  'gladius':     {nom:'gladius',     longueur: 20, cible: 7000, aretes:6000},
  /* La station n'est pas un vaisseau : elle vient de Blender, son
     axe est déjà le bon, et l'échelle se prend sur l'envergure et
     non sur la longueur. */
  'seuil':       {nom:'seuil',       longueur:268, cible:20000, aretes:14000,
                  ply:true, station:true},
  /* La tour de l'acte VI : deux pièces, parce que le palier est
     répété six fois et que chacun tourne pour son compte. Elles
     sont modelées aux unités de la scène, donc ni recentrées ni
     remises à l'échelle : « brut » veut dire qu'on n'y touche pas. */
  'ascension-fut':    {nom:'ascension-fut',    cible:15000, aretes:11000,
                       ply:true, station:true, brut:true},
  'ascension-palier': {nom:'ascension-palier', cible: 9000, aretes: 7000,
                       ply:true, station:true, brut:true}
};

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

function boite(pos){
  const mn=[1e30,1e30,1e30], mx=[-1e30,-1e30,-1e30];
  for(let i=0;i<pos.length;i+=3) for(let k=0;k<3;k++){
    if(pos[i+k]<mn[k])mn[k]=pos[i+k]; if(pos[i+k]>mx[k])mx[k]=pos[i+k];
  }
  return {mn,mx};
}

/* Sens de la proue. Les tuyeres elargissent l'arriere : on compare
   l'envergure moyenne des deux extremites sur 18 % de la longueur.
   Verifie ensuite a l'oeil sur une planche de rendus. */
function poupeEnZplus(pos){
  const {mn,mx}=boite(pos);
  const z0=mn[2], L=mx[2]-mn[2], marge=L*0.18;
  const cx=(mn[0]+mx[0])/2, cy=(mn[1]+mx[1])/2;
  let ea=0,na=0, eb=0,nb=0;
  for(let i=0;i<pos.length;i+=3){
    const z=pos[i+2], r=Math.hypot(pos[i]-cx, pos[i+1]-cy);
    if(z < z0+marge){ ea+=r; na++; } else if(z > z0+L-marge){ eb+=r; nb++; }
  }
  return (nb?eb/nb:0) > (na?ea/na:0);
}

(async()=>{
  await MeshoptSimplifier.ready;
  fs.mkdirSync(OUT,{recursive:true});
  const forcer = JSON.parse(process.env.RETOURNER || '{}');
  const fiches=[]; let tot=0, totBr=0;
  for(const [base,fi] of Object.entries(FLOTTE)){
    const m=lire(fi.ply ? SRC_STATION+base+'.ply' : SRC+base+'.ctm');
    let {mn,mx}=boite(m.sommets);
    const diag=Math.hypot(mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]);
    const s=souder(m.sommets,m.indices,diag*1e-5);

    let idx=MeshoptSimplifier.simplify(s.idx,s.pos,3,fi.cible*3,1.0,[])[0];
    if(!fi.sansApprox && idx.length/3 > fi.cible*1.35){
      /* Trop morcele pour que l'effondrement d'aretes descende plus
         bas : on termine en mode approximatif, qui ignore la
         topologie et ne garde que la silhouette. Pour une coque vue
         en fil de fer, c'est exactement ce qu'il faut. */
      idx=MeshoptSimplifier.simplifySloppy(idx,s.pos,3,null,fi.cible*3,1.0)[0];
    }

    const vu=new Int32Array(s.pos.length/3).fill(-1); const np=[]; let n=0;
    const ni=new Uint32Array(idx.length);
    for(let i=0;i<idx.length;i++){
      const a=idx[i];
      if(vu[a]<0){ vu[a]=n++; np.push(s.pos[a*3],s.pos[a*3+1],s.pos[a*3+2]); }
      ni[i]=vu[a];
    }
    const pos=new Float32Array(np), nSom=n;

    const retourner = fi.station ? false
      : ((fi.nom in forcer) ? forcer[fi.nom] : poupeEnZplus(pos));
    ({mn,mx}=boite(pos));
    const cx = fi.brut ? 0 : (mn[0]+mx[0])/2;
    const cy = fi.brut ? 0 : (mn[1]+mx[1])/2;
    const cz = fi.brut ? 0 : (mn[2]+mx[2])/2;
    const ech = fi.brut ? 1 : (fi.station
      ? fi.longueur/Math.max(mx[0]-mn[0], mx[1]-mn[1], mx[2]-mn[2])
      : fi.longueur/(mx[2]-mn[2]));
    for(let i=0;i<pos.length;i+=3){
      let x=(pos[i]-cx)*ech, y=(pos[i+1]-cy)*ech, z=(pos[i+2]-cz)*ech;
      if(retourner){ x=-x; z=-z; }   /* lacet de PI, proue ramenee en +Z */
      pos[i]=x; pos[i+1]=y; pos[i+2]=z;
    }

    /* Aretes vives et tuyeres calculees ici : le navigateur n'a
       plus qu'a tracer. EdgesGeometry au chargement coutait une
       saccade par coque, et il fallait ensuite deviner ou sont
       les moteurs. */
    const {aretes,seuil}=aretesBudget(pos,ni,fi.aretes);
    const moteurs=fi.station ? [] : tuyeres(pos,nSom,0.055);

    ({mn,mx}=boite(pos));
    const ext=[mx[0]-mn[0]||1, mx[1]-mn[1]||1, mx[2]-mn[2]||1];
    const qp=new Uint16Array(nSom*3);
    for(let i=0;i<nSom*3;i+=3) for(let k=0;k<3;k++)
      qp[i+k]=Math.max(0,Math.min(65535,Math.round((pos[i+k]-mn[k])/ext[k]*65535)));

    const court = nSom<=65535;
    const oi = court?2:4;
    const debutIdx = Math.ceil((44+nSom*6)/4)*4;
    const debutAr  = debutIdx + ni.length*oi;
    const buf=Buffer.alloc(debutAr + aretes.length*oi);
    buf.write('ODNM',0,'ascii');
    buf.writeUInt16LE(2,4); buf.writeUInt16LE(court?1:0,6);
    buf.writeUInt32LE(nSom,8); buf.writeUInt32LE(ni.length,12);
    for(let k=0;k<3;k++){ buf.writeFloatLE(mn[k],16+k*4); buf.writeFloatLE(ext[k]/65535,28+k*4); }
    buf.writeUInt32LE(aretes.length,40);
    Buffer.from(qp.buffer,qp.byteOffset,qp.byteLength).copy(buf,44);
    for(let i=0;i<ni.length;i++){
      if(court) buf.writeUInt16LE(ni[i], debutIdx+i*oi); else buf.writeUInt32LE(ni[i], debutIdx+i*oi);
    }
    for(let i=0;i<aretes.length;i++){
      if(court) buf.writeUInt16LE(aretes[i], debutAr+i*oi); else buf.writeUInt32LE(aretes[i], debutAr+i*oi);
    }
    fs.writeFileSync(OUT+fi.nom+'.odnm', buf);
    const br=zlib.brotliCompressSync(buf).length;
    tot+=buf.length; totBr+=br;
    fiches.push({nom:fi.nom, longueur:fi.longueur, tri:ni.length/3, som:nSom,
      aretes:aretes.length/2, moteurs:moteurs});
    console.log(fi.nom.padEnd(12), String(ni.length/3).padStart(6)+' tri',
      String(nSom).padStart(6)+' som', String(fi.longueur||0).padStart(4)+' m',
      (buf.length/1024).toFixed(0).padStart(4)+' Ko', ' brotli '+(br/1024).toFixed(0).padStart(3)+' Ko',
      String(aretes.length/2).padStart(5)+' ar '+seuil.toFixed(0)+'deg',
      ' '+moteurs.length+' tuyeres', retourner?' retourne':'');
  }
  console.log('TOTAL', (tot/1024).toFixed(0)+' Ko, brotli', (totBr/1024).toFixed(0)+' Ko');
  fs.writeFileSync(OUT+'fiches.json', JSON.stringify(fiches,null,1));
})();
