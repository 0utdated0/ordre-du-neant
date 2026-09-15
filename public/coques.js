/* =========================================================
   Chargement des coques
   ---------------------------------------------------------
   Format .odnm, ecrit par l'outil de conversion : positions
   quantifiees sur 16 bits dans la boite englobante, indices
   16 ou 32 bits. Pas de bibliotheque a embarquer, Cloudflare
   se charge de la compression sur le fil.

     0  'ODNM'
     4  version  uint16   = 2
     6  drapeaux uint16   bit 0 : indices sur 16 bits
     8  nbSom    uint32
    12  nbInd    uint32
    16  minimum  float32 x3
    28  pas      float32 x3
    40  nbAretes uint32   (nombre d'indices, soit deux par arête)
    44  positions uint16 x3 x nbSom
    ..  indices des faces, alignés sur 4 octets
    ..  indices des arêtes vives

   Les arêtes vives sont calculées à la conversion. Les faire
   dériver ici avec EdgesGeometry coûtait une saccade par coque,
   pour un résultat qu'on ne pouvait pas doser.
   ========================================================= */
(function () {
  'use strict';
  window.ODN = window.ODN || {};

  var cache = {};

  function decoder(tampon) {
    var vue = new DataView(tampon);
    if (vue.getUint32(0, false) !== 0x4f444e4d) { throw new Error('coque illisible'); }
    var court  = (vue.getUint16(6, true) & 1) === 1;
    var nbSom  = vue.getUint32(8, true);
    var nbInd  = vue.getUint32(12, true);
    var mini = [vue.getFloat32(16, true), vue.getFloat32(20, true), vue.getFloat32(24, true)];
    var pas  = [vue.getFloat32(28, true), vue.getFloat32(32, true), vue.getFloat32(36, true)];

    var nbAr = vue.getUint32(40, true);

    var brut = new Uint16Array(tampon, 44, nbSom * 3);
    var pos = new Float32Array(nbSom * 3);
    for (var i = 0; i < nbSom; i++) {
      pos[i * 3]     = mini[0] + brut[i * 3]     * pas[0];
      pos[i * 3 + 1] = mini[1] + brut[i * 3 + 1] * pas[1];
      pos[i * 3 + 2] = mini[2] + brut[i * 3 + 2] * pas[2];
    }
    var octets = court ? 2 : 4;
    var debut = Math.ceil((44 + nbSom * 6) / 4) * 4;
    var idx = court ? new Uint16Array(tampon, debut, nbInd)
                    : new Uint32Array(tampon, debut, nbInd);
    var debutAr = debut + nbInd * octets;
    var iar = court ? new Uint16Array(tampon, debutAr, nbAr)
                    : new Uint32Array(tampon, debutAr, nbAr);

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx.slice(), 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    /* Les arêtes partagent les sommets de la coque, mais three
       veut sa propre géométrie indexée pour un LineSegments. */
    var gAr = new THREE.BufferGeometry();
    gAr.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    gAr.setIndex(new THREE.BufferAttribute(iar.slice(), 1));
    geo.userData.aretes = gAr;

    return geo;
  }

  /* Les points d'accroche relevés à la conversion : tuyères,
     postes de tir, proue, bras de travail. Les scènes en ont
     besoin pour savoir d'où part un trait ou un faisceau ; posés
     à la main, ils tombaient à côté de la coque. */
  var fiches = null;
  window.ODN.points = function (nom) {
    if (!fiches) {
      fiches = fetch('/coques/fiches.json').then(function (r) { return r.json(); })
        .then(function (liste) {
          var m = {};
          liste.forEach(function (f) { m[f.nom] = f; });
          return m;
        });
    }
    return fiches.then(function (m) {
      return m[nom] || { moteurs: [], tourelles: [], proue: [0, 0, 0], bras: [0, 0, 0] };
    });
  };

  /* Les silhouettes dessinées à la main n'ont pas d'arêtes toutes
     prêtes : on les calcule comme avant. Les coques réelles, si,
     et il ne faut surtout pas les recalculer ici. */
  window.ODN.aretesDe = function (geo, seuil) {
    return (geo.userData && geo.userData.aretes) ||
           new THREE.EdgesGeometry(geo, seuil === undefined ? 20 : seuil);
  };

  /* Une coque n'est chargee qu'une fois, meme si trois actes la
     demandent en meme temps : on memorise la promesse, pas le
     resultat. */
  window.ODN.coque = function (nom) {
    if (!cache[nom]) {
      cache[nom] = fetch('/coques/' + nom + '.odnm')
        .then(function (r) {
          if (!r.ok) { throw new Error('coque ' + nom + ' : ' + r.status); }
          return r.arrayBuffer();
        })
        .then(decoder);
    }
    return cache[nom];
  };
})();
