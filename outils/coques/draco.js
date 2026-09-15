/* =========================================================
   Conversion des coques de vaisseaux, pleine geometrie
   ---------------------------------------------------------
   Les modeles du holoviewer font de 240 000 a 1 100 000
   triangles. La premiere version du site les ramenait a 7 000 -
   16 000 par effondrement d'aretes : a ce taux-la, la
   simplification ne simplifie plus, elle detruit. Les panneaux
   fondent, les tourelles se decrochent, et le Hammerhead, fait de
   coques ouvertes et disjointes, partait carrement en morceaux.

   Ici on ne simplifie pas. On garde la geometrie telle qu'elle
   est et on la compresse avec Draco. Mesure faite avant d'ecrire
   la moindre ligne : a 14 bits de quantification, la plus lourde
   des neuf coques (l'Orion, 1 105 483 triangles) pese 1,79 Mo, et
   les neuf ensemble 8,5 Mo. Le decodeur ajoute 69 Ko une fois pour
   toutes.

   Deux niveaux sont produits :
     nom.odnm    pleine geometrie, 14 bits
     nom-p.odnm  pour les petits ecrans, decime et 12 bits

   Le telephone ne peut ni telecharger huit megaoctets et demi ni
   tracer un million de triangles par coque ; a un dixieme des
   triangles la silhouette tient encore, ce qui n'etait pas le cas
   a un centieme.

   ---------------------------------------------------------
   Format .odnm version 3

     0  'ODNM'
     4  version   uint16 = 3
     6  drapeaux  uint16   bit 0 : indices d'aretes sur 16 bits
     8  nbSom     uint32   (informatif)
    12  nbAretes  uint32   (nombre d'indices, soit deux par arete)
    16  octetsDraco uint32
    20  reserve   uint32
    24  indices des aretes vives
    ..  charge utile Draco, alignee sur 4 octets

   Les aretes sont relevees APRES un aller-retour par le codeur :
   Draco renumerote les sommets, et des indices calcules avant
   l'encodage ne montreraient plus les memes aretes. On encode, on
   decode, et on releve sur ce qui sortira du navigateur.
   ========================================================= */
const fs=require('fs'), zlib=require('zlib');
const lire=require('./lire.js');
const {MeshoptSimplifier}=require('meshoptimizer');
const draco3d=require('draco3d');
const {aretesRapides,tuyeres}=require('./extra.js');
const {postes,proue,bras}=require('./points.js');

const SRC='/mnt/user-data/uploads/Documents/modeles-sc/';
const OUT=process.argv[2] || '/home/claude/wtest/public/coques/';

/* Longueur reelle en metres d'apres la fiche technique RSI,
   budget d'aretes vives, et cible de triangles pour le niveau
   telephone. Les budgets sont le triple de ceux de la premiere
   version : sur un maillage decime, chaque grand triangle portait
   ses trois bords et le fil de fer couvrait toute la coque ; sur
   le maillage reel, les aretes vives se concentrent la ou il y a
   du detail et laissent les panneaux lisses vides. Il en faut
   donc davantage pour retrouver la meme lecture. Le nombre de tourelles vient de la fiche du
   batiment. */
const FLOTTE = {
  'javelin':     {nom:'javelin',     longueur:345, aretes:46000, petit:140000, tourelles:8},
  'idris-p':     {nom:'idris',       longueur:239, aretes:40000, petit:120000, tourelles:8},
  'perseus':     {nom:'perseus',     longueur:180, aretes:38000, petit:110000, tourelles:6},
  'ironclad':    {nom:'ironclad',    longueur:135, aretes:38000, petit:110000, tourelles:6},
  'polaris':     {nom:'polaris',     longueur:155, aretes:38000, petit:120000, tourelles:8},
  'orion':       {nom:'orion',       longueur:170, aretes:40000, petit:130000, tourelles:4},
  'reclaimer':   {nom:'reclaimer',   longueur:155, aretes:40000, petit:120000, tourelles:4},
  'caterpillar': {nom:'caterpillar', longueur:111, aretes:32000, petit:100000, tourelles:4},
  'gladius':     {nom:'gladius',     longueur: 20, aretes:20000, petit: 45000, tourelles:2}
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
   l'envergure moyenne des deux extremites sur 18 % de la longueur. */
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

function encoder(enc, pos, idx, bits){
  const mesh=new enc.Mesh(), builder=new enc.MeshBuilder();
  builder.AddFacesToMesh(mesh, idx.length/3, idx);
  builder.AddFloatAttributeToMesh(mesh, enc.POSITION, pos.length/3, 3, pos);
  const e=new enc.Encoder();
  e.SetSpeedOptions(1,1);                       /* lent a l'encodage, petit a l'arrivee */
  e.SetAttributeQuantization(enc.POSITION, bits);
  e.SetEncodingMethod(enc.MESH_EDGEBREAKER_ENCODING);
  const out=new enc.DracoInt8Array();
  const n=e.EncodeMeshToDracoBuffer(mesh, out);
  const buf=Buffer.alloc(n);
  for(let i=0;i<n;i++) buf[i]=out.GetValue(i) & 255;
  enc.destroy(out); enc.destroy(e); enc.destroy(builder); enc.destroy(mesh);
  return buf;
}

function decoder(dec, buf){
  const tampon=new dec.DecoderBuffer();
  tampon.Init(new Int8Array(buf.buffer, buf.byteOffset, buf.length), buf.length);
  const d=new dec.Decoder();
  const mesh=new dec.Mesh();
  const etat=d.DecodeBufferToMesh(tampon, mesh);
  if(!etat.ok()) throw new Error('Draco : '+etat.error_msg());
  const nSom=mesh.num_points(), nFace=mesh.num_faces();

  /* Par blocs, dans le tas du module. GetFaceFromMesh appele un
     million de fois coute une minute par coque ; ici c'est une
     copie memoire. */
  const octetsI=nFace*3*4;
  const ptrI=dec._malloc(octetsI);
  d.GetTrianglesUInt32Array(mesh, octetsI, ptrI);
  const idx=new Uint32Array(dec.HEAPU32.buffer, ptrI, nFace*3).slice();
  dec._free(ptrI);

  const att=d.GetAttribute(mesh, d.GetAttributeId(mesh, dec.POSITION));
  const octetsP=nSom*3*4;
  const ptrP=dec._malloc(octetsP);
  d.GetAttributeDataArrayForAllPoints(mesh, att, dec.DT_FLOAT32, octetsP, ptrP);
  const pos=new Float32Array(dec.HEAPF32.buffer, ptrP, nSom*3).slice();
  dec._free(ptrP);

  dec.destroy(mesh); dec.destroy(d); dec.destroy(tampon);
  return {pos, idx, nSom, nFace};
}

function ecrire(chemin, nSom, aretes, drc){
  const court = nSom<=65535;
  const oi = court?2:4;
  const debutDraco = Math.ceil((24 + aretes.length*oi)/4)*4;
  const buf=Buffer.alloc(debutDraco + drc.length);
  buf.write('ODNM',0,'ascii');
  buf.writeUInt16LE(3,4);
  buf.writeUInt16LE(court?1:0,6);
  buf.writeUInt32LE(nSom,8);
  buf.writeUInt32LE(aretes.length,12);
  buf.writeUInt32LE(drc.length,16);
  buf.writeUInt32LE(0,20);
  for(let i=0;i<aretes.length;i++){
    if(court) buf.writeUInt16LE(aretes[i], 24+i*oi);
    else buf.writeUInt32LE(aretes[i], 24+i*oi);
  }
  drc.copy(buf, debutDraco);
  fs.writeFileSync(chemin, buf);
  return buf;
}

(async()=>{
  await MeshoptSimplifier.ready;
  const enc=await draco3d.createEncoderModule({});
  const dec=await draco3d.createDecoderModule({});
  fs.mkdirSync(OUT,{recursive:true});

  /* On reprend les fiches deja ecrites pour ne pas perdre celles
     des stations, qui ne passent pas par ici. */
  let fiches=[];
  try { fiches=JSON.parse(fs.readFileSync(OUT+'fiches.json','utf8')); } catch(e){}
  const parNom={}; fiches.forEach(f=>{ parNom[f.nom]=f; });

  let tot=0, totP=0;
  for(const [base,fi] of Object.entries(FLOTTE)){
    const m=lire(SRC+base+'.ctm');
    let {mn,mx}=boite(m.sommets);
    const diag=Math.hypot(mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]);
    const s=souder(m.sommets,m.indices,diag*1e-5);

    /* Repere final : proue en +Z, centree, a l'echelle metrique. */
    const retourner=poupeEnZplus(s.pos);
    ({mn,mx}=boite(s.pos));
    const cx=(mn[0]+mx[0])/2, cy=(mn[1]+mx[1])/2, cz=(mn[2]+mx[2])/2;
    const ech=fi.longueur/(mx[2]-mn[2]);
    for(let i=0;i<s.pos.length;i+=3){
      let x=(s.pos[i]-cx)*ech, y=(s.pos[i+1]-cy)*ech, z=(s.pos[i+2]-cz)*ech;
      if(retourner){ x=-x; z=-z; }
      s.pos[i]=x; s.pos[i+1]=y; s.pos[i+2]=z;
    }

    const lignes=[];
    for(const niveau of ['plein','petit']){
      let pos=s.pos, idx=s.idx;
      if(niveau==='petit'){
        idx=MeshoptSimplifier.simplify(s.idx, s.pos, 3, fi.petit*3, 0.05, [])[0];
        const vu=new Int32Array(s.pos.length/3).fill(-1); const np=[]; let n=0;
        const ni=new Uint32Array(idx.length);
        for(let i=0;i<idx.length;i++){
          const a=idx[i];
          if(vu[a]<0){ vu[a]=n++; np.push(s.pos[a*3],s.pos[a*3+1],s.pos[a*3+2]); }
          ni[i]=vu[a];
        }
        pos=new Float32Array(np); idx=ni;
      }
      const bits = niveau==='plein' ? 14 : 12;
      const drc = encoder(enc, pos, idx, bits);
      const d = decoder(dec, drc);
      const {aretes,seuil} = aretesRapides(d.pos, d.idx,
        niveau==='plein' ? fi.aretes : Math.round(fi.aretes*0.6));
      const nomFichier = fi.nom + (niveau==='petit'?'-p':'') + '.odnm';
      const buf = ecrire(OUT+nomFichier, d.nSom, aretes, drc);
      const br = zlib.brotliCompressSync(buf).length;
      if(niveau==='plein') tot+=buf.length; else totP+=buf.length;

      if(niveau==='plein'){
        parNom[fi.nom] = {
          nom: fi.nom, longueur: fi.longueur, tri: d.nFace, som: d.nSom,
          aretes: aretes.length/2,
          moteurs: tuyeres(d.pos, d.nSom, 0.055),
          tourelles: postes(d.pos, d.nSom, fi.tourelles),
          proue: proue(d.pos, d.nSom),
          bras: bras(d.pos, d.nSom)
        };
      }
      lignes.push(niveau.padEnd(6)+' '+String(d.nFace).padStart(8)+' tri '+
        String(d.nSom).padStart(7)+' som '+
        (buf.length/1048576).toFixed(2).padStart(5)+' Mo (brotli '+
        (br/1048576).toFixed(2)+') '+String(aretes.length/2).padStart(6)+' ar '+seuil+'deg');
    }
    console.log(fi.nom.padEnd(12)+(retourner?' retourne':'         '));
    lignes.forEach(l=>console.log('   '+l));
  }
  console.log('TOTAL plein '+(tot/1048576).toFixed(2)+' Mo, petit '+(totP/1048576).toFixed(2)+' Mo');
  const liste=Object.values(parNom).sort((a,b)=>a.nom<b.nom?-1:1);
  fs.writeFileSync(OUT+'fiches.json', JSON.stringify(liste,null,1));
})();
