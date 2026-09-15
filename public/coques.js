/* =========================================================
   Chargement des coques
   ---------------------------------------------------------
   Deux formats cohabitent dans le même conteneur .odnm.

   Version 2, les stations. Positions quantifiées sur 16 bits
   dans la boîte englobante, indices de faces, arêtes vives.
   Elles viennent de Blender, elles sont déjà légères, et elles
   n'ont aucune raison de passer par un décodeur.

     0  'ODNM'
     4  version  uint16 = 2
     6  drapeaux uint16   bit 0 : indices sur 16 bits
     8  nbSom    uint32
    12  nbInd    uint32
    16  minimum  float32 x3
    28  pas      float32 x3
    40  nbAretes uint32
    44  positions uint16 x3 x nbSom
    ..  indices des faces, alignés sur 4 octets
    ..  indices des arêtes vives

   Version 3, les vaisseaux à pleine géométrie. La première
   version du site les ramenait de 240 000 - 1 100 000 triangles
   à 7 000 - 16 000 par effondrement d'arêtes : à ce taux-là, la
   simplification ne simplifie plus, elle détruit. On garde donc
   la géométrie telle quelle et on la compresse avec Draco. La
   plus lourde des neuf coques pèse 1,7 Mo, le décodeur 69 Ko une
   fois pour toutes.

     0  'ODNM'
     4  version  uint16 = 3
     6  drapeaux uint16   bit 0 : indices d'arêtes sur 16 bits
     8  nbSom    uint32
    12  nbAretes uint32
    16  octetsDraco uint32
    20  réservé  uint32
    24  indices des arêtes vives
    ..  charge utile Draco, alignée sur 4 octets

   Le décodage part dans un worker : quelques centaines de
   millisecondes sur le fil principal, c'est l'acte qui se fige
   au moment où il entre à l'écran.
   ========================================================= */
(function () {
  'use strict';
  window.ODN = window.ODN || {};

  var cache = {};

  /* Les vaisseaux ont une variante décimée pour les petits
     écrans : ni le réseau ni le processeur graphique d'un
     téléphone ne suivent un million de triangles par coque. Les
     stations, elles, n'existent qu'en un exemplaire. */
  var VAISSEAUX = {
    javelin: 1, idris: 1, perseus: 1, ironclad: 1, polaris: 1,
    orion: 1, reclaimer: 1, caterpillar: 1, gladius: 1
  };
  var PETIT = window.innerWidth < 860;

  /* Numéro d'édition des coques.

     Une coque régénérée garde le même nom de fichier, et
     /coques/* est servi avec un cache d'une semaine (voir
     _headers). Sans marqueur dans l'adresse, un navigateur qui a
     déjà vu le site continue de servir l'ancienne géométrie sous
     un code à jour : on voit alors un maillage décimé peint par
     le nuanceur neuf, ce qui ne ressemble à rien de connu et ne
     se diagnostique pas depuis le serveur.

     À incrémenter à chaque passage de outils/coques/draco.js. */
  var EDITION = 3;

  /* Ce qui a réellement été chargé, coque par coque. Deux tours
     ont été perdus à se demander si le visiteur voyait bien les
     fichiers déposés : maintenant il suffit de taper
     ODN.coques dans la console. */
  window.ODN.coques = {};

  /* ---------------------------------------------------------
     Version 2 : tout se lit sur place
     --------------------------------------------------------- */
  function decoderV2(tampon) {
    var vue = new DataView(tampon);
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
    return batir(pos, idx.slice(), iar.slice());
  }

  /* ---------------------------------------------------------
     Version 3 : le worker fait le gros du travail
     --------------------------------------------------------- */
  var ouvriere = null, attentes = {}, numero = 0;

  function equipe() {
    if (ouvriere === undefined) { return null; }
    if (!ouvriere) {
      try {
        ouvriere = new Worker('/coque-ouvriere.js');
      } catch (e) {
        /* Pas de worker : les vaisseaux ne se chargeront pas, mais
           le reste de la scène (étoiles, traits, poussière) tient
           debout tout seul. Mieux vaut une scène amputée qu'une
           page figée trois secondes par coque. */
        ouvriere = undefined;
        return null;
      }
      ouvriere.onmessage = function (e) {
        var a = attentes[e.data.id];
        if (!a) { return; }
        delete attentes[e.data.id];
        if (e.data.erreur) { a.rater(new Error(e.data.erreur)); return; }
        a.tenir(batir(e.data.pos, e.data.idx, e.data.aretes));
      };
      ouvriere.onerror = function () {
        Object.keys(attentes).forEach(function (k) {
          attentes[k].rater(new Error('ouvrière perdue'));
          delete attentes[k];
        });
      };
    }
    return ouvriere;
  }

  function decoderV3(tampon) {
    var o = equipe();
    if (!o) { return Promise.reject(new Error('worker indisponible')); }
    var id = ++numero;
    return new Promise(function (tenir, rater) {
      attentes[id] = { tenir: tenir, rater: rater };
      o.postMessage({ id: id, tampon: tampon }, [tampon]);
    });
  }

  /* ---------------------------------------------------------
     Montage commun
     --------------------------------------------------------- */
  function batir(pos, idx, iar) {
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    /* Pas de normales : toutes les coques du site sont peintes
       avec un MeshBasicMaterial, qui ne les regarde jamais. Les
       calculer coûtait deux cents millisecondes par coque pour
       rien. */
    geo.computeBoundingSphere();

    /* Les arêtes partagent les sommets de la coque, mais three
       veut sa propre géométrie indexée pour un LineSegments. */
    var gAr = new THREE.BufferGeometry();
    gAr.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    gAr.setIndex(new THREE.BufferAttribute(iar, 1));
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
      fiches = fetch('/coques/fiches.json?e=' + EDITION).then(function (r) { return r.json(); })
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
     prêtes : on les calcule comme avant. Les coques du catalogue,
     si, et il ne faut surtout pas les recalculer ici. */
  window.ODN.aretesDe = function (geo, seuil) {
    return (geo.userData && geo.userData.aretes) ||
           new THREE.EdgesGeometry(geo, seuil === undefined ? 20 : seuil);
  };

  /* Une coque n'est chargée qu'une fois, même si trois actes la
     demandent en même temps : on mémorise la promesse, pas le
     résultat. */
  /* « menu » force le niveau de détail. Sans lui, c'est la largeur
     de l'écran qui décide, ce qui est faux pour un appareil qu'on
     voit de loin : dans la ligne de feu, une Sentinelle occupe cent
     pixels de haut et coûtait 416 000 triangles, soit quarante
     triangles par pixel. Mesuré acte par acte. */
  window.ODN.coque = function (nom, menu) {
    var petit = menu === 'petit' || (menu !== 'plein' && PETIT);
    var suffixe = (petit && VAISSEAUX[nom]) ? '-p' : '';
    /* La clé est le nom du fichier : une station n'a pas de
       variante, sa clé ne doit pas prétendre le contraire. */
    var cle = nom + suffixe;
    if (!cache[cle]) {
      var fichier = '/coques/' + nom + suffixe + '.odnm';
      cache[cle] = fetch(fichier + '?e=' + EDITION)
        .then(function (r) {
          if (!r.ok) { throw new Error('coque ' + nom + ' : ' + r.status); }
          return r.arrayBuffer();
        })
        .then(function (tampon) {
          var vue = new DataView(tampon);
          if (vue.getUint32(0, false) !== 0x4f444e4d) { throw new Error('coque illisible'); }
          var version = vue.getUint16(4, true);
          var octets = tampon.byteLength;
          /* decoderV2 rend une géométrie, decoderV3 une promesse :
             on aligne les deux avant d'enchaîner. */
          var suite = Promise.resolve(
            version === 3 ? decoderV3(tampon) : decoderV2(tampon));
          return suite.then(function (geo) {
            window.ODN.coques[cle] = {
              fichier: fichier, version: version, octets: octets,
              sommets: geo.attributes.position.count,
              triangles: geo.index.count / 3,
              aretes: geo.userData.aretes ? geo.userData.aretes.index.count / 2 : 0
            };
            return geo;
          });
        });
    }
    return cache[cle];
  };
})();
