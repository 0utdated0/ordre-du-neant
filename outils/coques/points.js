/* Relevé des points d'accroche sur une coque.

   Les tuyères, les tourelles, la tête de forage, le bras de
   découpe : tout ça était posé à la main dans les scènes, et
   ça se voyait. Un trait qui sort du vide à côté d'un vaisseau
   ne se lit pas comme un tir.

   Tout est relevé sur la géométrie, dans le repère final de la
   coque (proue en +Z, centrée, à l'échelle métrique). */

function boite(pos){
  const mn=[1e30,1e30,1e30], mx=[-1e30,-1e30,-1e30];
  for(let i=0;i<pos.length;i+=3) for(let k=0;k<3;k++){
    if(pos[i+k]<mn[k])mn[k]=pos[i+k]; if(pos[i+k]>mx[k])mx[k]=pos[i+k];
  }
  return {mn,mx};
}

/* Profil du corps : pour chaque tranche en Z, la hauteur que la
   coque atteint « normalement ». On s'en sert comme d'une ligne
   de flottaison : ce qui la dépasse nettement est une
   superstructure, donc un candidat tourelle. */
function profil(pos, nSom, tranches){
  const {mn,mx}=boite(pos);
  const z0=mn[2], L=mx[2]-mn[2];
  const hauts=[], bas=[];
  for(let t=0;t<tranches;t++){ hauts.push([]); bas.push([]); }
  for(let i=0;i<nSom;i++){
    const z=pos[i*3+2], y=pos[i*3+1];
    let t=Math.floor((z-z0)/L*tranches);
    if(t<0)t=0; if(t>=tranches)t=tranches-1;
    (y>=0?hauts:bas)[t].push(Math.abs(y));
  }
  const med=(a)=>{ if(!a.length) return 0; a.sort((x,y)=>x-y); return a[Math.floor(a.length*0.82)]; };
  return {z0, L, haut:hauts.map(med), bas:bas.map(med)};
}

/* Postes de tir.

   Premier essai : chercher les amas de sommets qui depassent le
   profil du corps. Il attrapait les nacelles moteur, qui sont ce
   qui depasse le plus sur un batiment de ligne.

   Deuxieme approche, celle qui tient : on ne cherche plus la
   tourelle, on cherche la PEAU. Pour une serie de stations le
   long de la coque, on releve le sommet le plus haut et le plus
   bas proches de l'axe. Un trait qui part de la ne sort jamais du
   vide, meme si la tourelle reelle est dix metres plus loin.

   La zone arriere est exclue : c'est le bloc moteur, on n'y tire
   pas. */
function postes(pos, nSom, nombre){
  const {mn,mx}=boite(pos);
  const L=mx[2]-mn[2];
  const cx=(mn[0]+mx[0])/2;
  const larg=Math.max(mx[0]-mn[0], 1);
  const zDe=mn[2]+L*0.30, zA=mx[2]-L*0.12;   /* ni le bloc moteur, ni la pointe */
  const n=Math.max(2, nombre||8);
  const paires=Math.ceil(n/2);
  const out=[];
  for(let k=0;k<paires;k++){
    const zc=zDe+(k+0.5)*(zA-zDe)/paires;
    const demi=L*0.035;
    let haut=null, bas=null;
    for(let i=0;i<nSom;i++){
      const z=pos[i*3+2];
      if(Math.abs(z-zc)>demi) continue;
      /* proche de l'axe : on veut la crete dorsale, pas un bout
         d'aile ou un radiateur lateral */
      if(Math.abs(pos[i*3]-cx) > larg*0.22) continue;
      const y=pos[i*3+1];
      if(!haut || y>haut[1]) haut=[pos[i*3],y,z];
      if(!bas  || y<bas[1])  bas=[pos[i*3],y,z];
    }
    /* Un poste sur deux passe en ventral : une bordee ne tire pas
       toute du meme cote. */
    const choisi = (k%2===0) ? haut : bas;
    const autre  = (k%2===0) ? bas  : haut;
    if(choisi) out.push([+choisi[0].toFixed(2), +choisi[1].toFixed(2), +choisi[2].toFixed(2)]);
    if(out.length<n && autre) out.push([+autre[0].toFixed(2), +autre[1].toFixed(2), +autre[2].toFixed(2)]);
  }
  return out.slice(0,n);
}

/* Proue : le sommet le plus avancé, moyenné sur la pointe pour
   ne pas tomber sur une antenne isolée. */
function proue(pos, nSom, part){
  const {mn,mx}=boite(pos);
  const seuil=mx[2]-(mx[2]-mn[2])*(part||0.03);
  let x=0,y=0,z=0,n=0;
  for(let i=0;i<nSom;i++){
    if(pos[i*3+2]>=seuil){ x+=pos[i*3]; y+=pos[i*3+1]; z+=pos[i*3+2]; n++; }
  }
  return n? [ +(x/n).toFixed(2), +(y/n).toFixed(2), +(z/n).toFixed(2) ] : [0,0,mx[2]];
}

/* Bras de travail : l'extrémité avant-basse. C'est là que se
   trouvent la tête de forage de l'Orion et la pince du
   Reclaimer, et c'est de là que doit partir le faisceau. */
function bras(pos, nSom){
  const {mn,mx}=boite(pos);
  const zs=mx[2]-(mx[2]-mn[2])*0.22;
  let best=null;
  for(let i=0;i<nSom;i++){
    const y=pos[i*3+1], z=pos[i*3+2];
    if(z<zs) continue;
    const score=z*0.6-y*1.4;
    if(!best||score>best[3]) best=[pos[i*3],y,z,score];
  }
  if(!best) return proue(pos,nSom);
  /* moyenne du voisinage, pour ne pas s'accrocher à un sommet isolé */
  let x=0,y=0,z=0,n=0;
  for(let i=0;i<nSom;i++){
    if(Math.hypot(pos[i*3]-best[0],pos[i*3+1]-best[1],pos[i*3+2]-best[2]) < (mx[2]-mn[2])*0.05){
      x+=pos[i*3]; y+=pos[i*3+1]; z+=pos[i*3+2]; n++;
    }
  }
  return [ +(x/n).toFixed(2), +(y/n).toFixed(2), +(z/n).toFixed(2) ];
}

module.exports={postes, proue, bras, boite};
