/* Aretes vives et tuyeres, calculees a la conversion : le
   navigateur n'a plus qu'a tracer. EdgesGeometry au chargement
   coutait une saccade par coque. */

function aretesVives(pos, idx, seuilDeg){
  var cos = Math.cos(seuilDeg*Math.PI/180);
  var nf = idx.length/3;
  var nx=new Float32Array(nf), ny=new Float32Array(nf), nz=new Float32Array(nf);
  for(var f=0;f<nf;f++){
    var a=idx[f*3]*3,b=idx[f*3+1]*3,c=idx[f*3+2]*3;
    var ux=pos[b]-pos[a],uy=pos[b+1]-pos[a+1],uz=pos[b+2]-pos[a+2];
    var vx=pos[c]-pos[a],vy=pos[c+1]-pos[a+1],vz=pos[c+2]-pos[a+2];
    var x=uy*vz-uz*vy, y=uz*vx-ux*vz, z=ux*vy-uy*vx;
    var l=Math.hypot(x,y,z)||1; nx[f]=x/l; ny[f]=y/l; nz[f]=z/l;
  }
  var m=new Map();
  for(var f2=0;f2<nf;f2++) for(var e=0;e<3;e++){
    var p=idx[f2*3+e], q=idx[f2*3+(e+1)%3];
    var k = p<q ? p*4294967296+q : q*4294967296+p;
    var v=m.get(k);
    if(v===undefined) m.set(k,[p,q,f2,-1]); else if(v[3]<0) v[3]=f2;
  }
  var out=[];
  m.forEach(function(v){
    if(v[3]<0){ out.push(v[0],v[1]); return; }            /* bord franc */
    var d=nx[v[2]]*nx[v[3]]+ny[v[2]]*ny[v[3]]+nz[v[2]]*nz[v[3]];
    if(d < cos) out.push(v[0],v[1]);
  });
  return out;
}

/* Seuil ajuste pour tenir un budget d'aretes : trop d'aretes et
   la coque devient une bouillie blanche, trop peu et elle
   disparait. */
function aretesBudget(pos, idx, budget){
  var lo=10, hi=178, best=null, bs=hi;
  for(var i=0;i<9;i++){
    var s=(lo+hi)/2, a=aretesVives(pos,idx,s);
    if(a.length/2 > budget){ lo=s; } else { hi=s; best=a; bs=s; }
  }
  if(!best){ best=aretesVives(pos,idx,hi); bs=hi; }
  /* Certaines coques sont faites de coques ouvertes : presque
     toutes leurs aretes sont des bords francs, que le seuil
     d'angle ne peut pas ecarter. On garde alors les plus longues,
     celles qui dessinent la silhouette, et on laisse tomber le
     grenu qui ne fait que blanchir l'image. */
  if(best.length/2 > budget*1.15){
    var pairs=[];
    for(var j=0;j<best.length;j+=2){
      var a=best[j]*3,b2=best[j+1]*3;
      pairs.push([best[j],best[j+1],
        Math.hypot(pos[a]-pos[b2],pos[a+1]-pos[b2+1],pos[a+2]-pos[b2+2])]);
    }
    pairs.sort(function(u,v){return v[2]-u[2];});
    pairs.length=budget;
    best=[]; for(var q2=0;q2<pairs.length;q2++) best.push(pairs[q2][0],pairs[q2][1]);
  }
  return {aretes:best, seuil:bs};
}

/* Tuyeres : on prend les sommets de l'extreme arriere et on les
   regroupe par proximite dans le plan XY. Chaque amas devient un
   halo de poussee. */
function tuyeres(pos, nSom, marge){
  var mnz=1e30,mxz=-1e30;
  for(var i=0;i<nSom;i++){ var z=pos[i*3+2]; if(z<mnz)mnz=z; if(z>mxz)mxz=z; }
  var L=mxz-mnz, seuil=mnz+L*marge;
  var pts=[];
  for(var j=0;j<nSom;j++) if(pos[j*3+2]<seuil) pts.push([pos[j*3],pos[j*3+1],pos[j*3+2]]);
  if(!pts.length) return [];
  var env=0;
  for(var k=0;k<pts.length;k++) env=Math.max(env, Math.hypot(pts[k][0],pts[k][1]));
  var rayonAmas = Math.max(env*0.18, L*0.02);
  var amas=[];
  for(var p=0;p<pts.length;p++){
    var t=pts[p], trouve=false;
    for(var q=0;q<amas.length;q++){
      if(Math.hypot(t[0]-amas[q].x/amas[q].n, t[1]-amas[q].y/amas[q].n) < rayonAmas){
        amas[q].x+=t[0]; amas[q].y+=t[1]; amas[q].z+=t[2]; amas[q].n++;
        amas[q].r=Math.max(amas[q].r, Math.hypot(t[0]-amas[q].x/amas[q].n, t[1]-amas[q].y/amas[q].n));
        trouve=true; break;
      }
    }
    if(!trouve) amas.push({x:t[0],y:t[1],z:t[2],n:1,r:rayonAmas*0.5});
  }
  return amas.filter(function(a){return a.n>=Math.max(4, pts.length*0.02);})
    .sort(function(a,b){return b.n-a.n;}).slice(0,6)
    .map(function(a){return [ +(a.x/a.n).toFixed(3), +(a.y/a.n).toFixed(3),
                              +(a.z/a.n).toFixed(3), +Math.max(a.r, L*0.012).toFixed(3) ];});
}
/* Aretes vives sur un maillage a pleine resolution.

   aretesVives() construit une Map dont chaque valeur est un petit
   tableau : sur un million de triangles ca fait trois millions de
   tableaux, et aretesBudget l'appelle neuf fois pour sa dichotomie.
   Injouable. Ici la table des demi-aretes est construite une seule
   fois, en tableaux types, et le seuil se lit dans un histogramme
   au lieu de se chercher par dichotomie. */
function aretesRapides(pos, idx, budget){
  var nf=idx.length/3, nh=nf*3;
  var nx=new Float32Array(nf), ny=new Float32Array(nf), nz=new Float32Array(nf);
  for(var f=0;f<nf;f++){
    var a=idx[f*3]*3,b=idx[f*3+1]*3,c=idx[f*3+2]*3;
    var ux=pos[b]-pos[a],uy=pos[b+1]-pos[a+1],uz=pos[b+2]-pos[a+2];
    var vx=pos[c]-pos[a],vy=pos[c+1]-pos[a+1],vz=pos[c+2]-pos[a+2];
    var x=uy*vz-uz*vy, y=uz*vx-ux*vz, z=ux*vy-uy*vx;
    var l=Math.hypot(x,y,z)||1; nx[f]=x/l; ny[f]=y/l; nz[f]=z/l;
  }

  /* Appariement. La cle tient sur un flottant : deux indices de
     moins de deux millions, l'un decale de 2^32, restent exacts
     dans la mantisse de 53 bits. */
  var jumeau=new Int32Array(nh).fill(-1);
  var table=new Map();
  for(var f2=0;f2<nf;f2++){
    for(var e=0;e<3;e++){
      var h=f2*3+e;
      var p=idx[h], q=idx[f2*3+(e+1)%3];
      var lo=p<q?p:q, hi=p<q?q:p;
      var k=lo*4294967296+hi;
      var v=table.get(k);
      if(v===undefined){ table.set(k,h); }
      else if(jumeau[v]<0){ jumeau[v]=h; jumeau[h]=v; }
    }
  }
  table.clear();

  /* Candidats : bords francs (angle porte a 180) et plis. */
  var ca=new Uint32Array(nh), cb=new Uint32Array(nh);
  var ang=new Float32Array(nh), lon=new Float32Array(nh);
  var n=0;
  for(var h2=0;h2<nh;h2++){
    var j=jumeau[h2];
    if(j>=0 && j<h2) continue;              /* deja vue par sa jumelle */
    var fa=(h2/3)|0, ea=h2%3;
    var pa=idx[h2], pb=idx[fa*3+(ea+1)%3];
    var d;
    if(j<0){ d=180; }
    else {
      var fb=(j/3)|0;
      var pt=nx[fa]*nx[fb]+ny[fa]*ny[fb]+nz[fa]*nz[fb];
      if(pt>1)pt=1; if(pt<-1)pt=-1;
      d=Math.acos(pt)*180/Math.PI;
    }
    if(d<8) continue;                        /* surface lisse */
    var i1=pa*3, i2=pb*3;
    ca[n]=pa; cb[n]=pb; ang[n]=d;
    lon[n]=Math.hypot(pos[i1]-pos[i2], pos[i1+1]-pos[i2+1], pos[i1+2]-pos[i2+2]);
    n++;
  }

  /* Seuil d'angle par histogramme : on descend depuis 180 jusqu'a
     tenir environ trois fois le budget, puis on garde les plus
     longues. Ce sont elles qui dessinent la structure ; le grenu
     court ne fait que blanchir l'image. */
  var bac=new Uint32Array(181);
  for(var i3=0;i3<n;i3++) bac[Math.min(180, ang[i3]|0)]++;
  var vise=Math.min(n, budget*3), cum=0, seuil=180;
  for(var s=180;s>=8;s--){ cum+=bac[s]; if(cum>=vise){ seuil=s; break; } seuil=s; }

  var garde=[];
  for(var i4=0;i4<n;i4++) if(ang[i4]>=seuil) garde.push(i4);
  garde.sort(function(u,v){ return lon[v]-lon[u]; });
  if(garde.length>budget) garde.length=budget;

  var out=new Uint32Array(garde.length*2);
  for(var i5=0;i5<garde.length;i5++){ out[i5*2]=ca[garde[i5]]; out[i5*2+1]=cb[garde[i5]]; }
  return {aretes:out, seuil:seuil, candidats:n};
}

module.exports={aretesVives,aretesBudget,aretesRapides,tuyeres};
