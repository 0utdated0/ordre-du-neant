/* =========================================================
   Décodage des coques, à côté du fil principal
   ---------------------------------------------------------
   Une coque à pleine géométrie fait de 700 000 à 1 100 000
   triangles. Draco la décode en quelques centaines de
   millisecondes : sur le fil principal, ça se voit, l'acte se
   fige à l'instant précis où il entre à l'écran. Ici le travail
   se fait à côté et l'animation ne bronche pas.

   Le fil principal envoie le fichier .odnm entier ; il revient
   des tableaux typés qu'il n'y a plus qu'à poser dans une
   BufferGeometry.
   ========================================================= */
'use strict';

var pret = null;

function demarrer() {
  if (pret) { return pret; }
  /* Le wasm est chargé à part et passé au module : c'est le seul
     moyen d'éviter que le glu ne le redemande à une URL qu'il
     devine, et qu'il devine mal depuis un worker. */
  pret = fetch('/vendor/draco_decoder.wasm')
    .then(function (r) { return r.arrayBuffer(); })
    .then(function (binaire) {
      importScripts('/vendor/draco_wasm_wrapper.js');
      return new Promise(function (resoudre) {
        DracoDecoderModule({
          wasmBinary: binaire,
          /* Le module est enveloppe, et ce n'est pas une coquetterie :
             un module emscripten porte une methode « then », donc une
             promesse resolue avec lui le prend pour une promesse et le
             redemande indefiniment. Le worker restait muet, sans la
             moindre erreur. */
          onModuleLoaded: function (module) { resoudre({ draco: module }); }
        });
      });
    });
  return pret;
}

/* Les tableaux sortent par le tas du module, en un bloc. Passer
   par GetFaceFromMesh, une face à la fois, coûte un million
   d'allers-retours entre le JavaScript et le wasm. */
function decoder(draco, octets, debut, longueur) {
  var d = new draco.Decoder();
  var tampon = new draco.DecoderBuffer();
  tampon.Init(new Int8Array(octets, debut, longueur), longueur);
  var maillage = new draco.Mesh();
  var etat = d.DecodeBufferToMesh(tampon, maillage);
  if (!etat.ok()) {
    draco.destroy(maillage); draco.destroy(tampon); draco.destroy(d);
    throw new Error('Draco : ' + etat.error_msg());
  }
  var nSom = maillage.num_points(), nFace = maillage.num_faces();

  var octetsI = nFace * 12;
  var ptrI = draco._malloc(octetsI);
  d.GetTrianglesUInt32Array(maillage, octetsI, ptrI);
  var idx = new Uint32Array(draco.HEAPU32.buffer, ptrI, nFace * 3).slice();
  draco._free(ptrI);

  var att = d.GetAttribute(maillage, d.GetAttributeId(maillage, draco.POSITION));
  var octetsP = nSom * 12;
  var ptrP = draco._malloc(octetsP);
  d.GetAttributeDataArrayForAllPoints(maillage, att, draco.DT_FLOAT32, octetsP, ptrP);
  var pos = new Float32Array(draco.HEAPF32.buffer, ptrP, nSom * 3).slice();
  draco._free(ptrP);

  draco.destroy(maillage); draco.destroy(tampon); draco.destroy(d);
  return { pos: pos, idx: idx };
}

self.onmessage = function (e) {
  var id = e.data.id, octets = e.data.tampon;
  demarrer().then(function (enveloppe) {
    var draco = enveloppe.draco;
    var vue = new DataView(octets);
    if (vue.getUint32(0, false) !== 0x4f444e4d) { throw new Error('coque illisible'); }
    if (vue.getUint16(4, true) !== 3) { throw new Error('version inattendue'); }
    var court = (vue.getUint16(6, true) & 1) === 1;
    var nbAr = vue.getUint32(12, true);
    var nDrc = vue.getUint32(16, true);
    var oi = court ? 2 : 4;
    var debutDrc = Math.ceil((24 + nbAr * oi) / 4) * 4;

    /* Copie : le tampon d'origine n'est pas renvoyé, et une vue
       dessus mourrait avec lui. */
    var ar = (court ? new Uint16Array(octets, 24, nbAr)
                    : new Uint32Array(octets, 24, nbAr)).slice();

    var m = decoder(draco, octets, debutDrc, nDrc);
    self.postMessage({ id: id, pos: m.pos, idx: m.idx, aretes: ar },
      [m.pos.buffer, m.idx.buffer, ar.buffer]);
  }).catch(function (err) {
    self.postMessage({ id: id, erreur: String(err && err.message || err) });
  });
};
