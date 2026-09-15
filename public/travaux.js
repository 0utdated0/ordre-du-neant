/* =========================================================
   L'ORDRE DU NÉANT — les actes de travail
   ---------------------------------------------------------
   Quatre scènes qui racontent ce que l'Ordre fait réellement :
   le convoi, l'extraction, la récupération, la ligne de feu.
   Elles s'appuient toutes sur ODN.acte, qui porte la plomberie.

   Règle commune à tout le site : tout ce qui bouge doit être une
   fonction du défilement, pas de l'horloge. On remonte, la scène
   remonte. Seuls les scintillements et les trajectoires de tirs
   suivent le temps, parce qu'un tir qui recule à l'envers se
   remarque plus qu'un tir qui continue.
   ========================================================= */
(function () {
  'use strict';

  if (typeof THREE === 'undefined' || !window.ODN || !window.ODN.acte) { return; }

  var ARGENT = 0xeef0f4;
  var ROUGE = 0xe01020;
  var BRAISE = 0xff4d4d;

  /* ---------------------------------------------------------
     Outils communs
     --------------------------------------------------------- */

  /* Peinture des coques : corps sombre, arêtes additives. La même
     que l'Approche, pour que les vaisseaux se ressemblent d'un
     acte à l'autre. */
  function peintre(teinte, opaciteAretes) {
    return function (geo) {
      var g = new THREE.Group();
      g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 0x0a0b0e, transparent: true, opacity: 0.96, fog: true
      })));
      g.add(new THREE.LineSegments(
        window.ODN.aretesDe(geo, 20),
        new THREE.LineBasicMaterial({
          color: teinte, transparent: true, opacity: opaciteAretes,
          blending: THREE.AdditiveBlending, depthWrite: false, fog: true
        })
      ));
      return g;
    };
  }

  /* Une coque du catalogue, posée dans la scène et mise à
     l'échelle, avec ses réacteurs allumés et ses points
     d'accroche remis à la même échelle.

     Les points viennent du relevé fait à la conversion : tuyères,
     postes de tir, proue, bras de travail. Ils étaient écrits à la
     main dans chaque scène, et ça se voyait : les traits
     partaient du vide et les faisceaux du milieu de nulle part. */
  function coque(nom, longueur, teinte, opaciteAretes) {
    var n = new THREE.Group();
    n.userData.longueur = longueur;
    n.userData.moteurs = [];
    n.userData.tourelles = [];
    n.userData.proue = new THREE.Vector3(0, 0, longueur / 2);
    n.userData.bras = new THREE.Vector3(0, 0, longueur / 2);
    n.userData.reacteurs = [];
    if (!window.ODN.coque) { return n; }

    var k = 1;
    window.ODN.coque(nom).then(function (geo) {
      var g = peintre(teinte || ARGENT, opaciteAretes === undefined ? 0.4 : opaciteAretes)(geo);
      geo.computeBoundingBox();
      var b = geo.boundingBox;
      k = longueur / Math.max(b.max.z - b.min.z, 0.001);
      g.scale.setScalar(k);
      n.add(g);
      n.userData.echelle = k;
      n.userData.pret = true;
      return window.ODN.points(nom);
    }).then(function (f) {
      if (!f) { return; }
      var v = function (p) { return new THREE.Vector3(p[0] * k, p[1] * k, p[2] * k); };
      n.userData.moteurs = (f.moteurs || []).map(function (m) {
        return { p: v(m), r: m[3] * k };
      });
      n.userData.tourelles = (f.tourelles || []).map(v);
      n.userData.proue = v(f.proue || [0, 0, 0]);
      n.userData.bras = v(f.bras || [0, 0, 0]);
      n.userData.reacteurs = reacteurs(n);
      if (n.userData.quandPret) { n.userData.quandPret(n); }
    }).catch(function () {});
    return n;
  }

  /* Les réacteurs : un cœur clair, un halo, et une traînée. Les
     trois ensemble, sinon ça ne se lit pas comme une poussée.
     La traînée surtout : un point lumineux est une lampe, un
     cône étiré est un moteur. */
  var TRAINEE = null;
  function trainee(c) {
    if (!TRAINEE) {
      var t = document.createElement('canvas');
      t.width = 8; t.height = 128;
      var x = t.getContext('2d');
      var g = x.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, 'rgba(255,240,240,0.95)');
      g.addColorStop(0.18, 'rgba(255,120,110,0.55)');
      g.addColorStop(0.55, 'rgba(224,16,32,0.18)');
      g.addColorStop(1, 'rgba(224,16,32,0)');
      x.fillStyle = g; x.fillRect(0, 0, 8, 128);
      TRAINEE = new THREE.CanvasTexture(t);
    }
    void c;
    return TRAINEE;
  }

  function reacteurs(porteur) {
    var out = [];
    porteur.userData.moteurs.forEach(function (m) {
      var g = new THREE.Group();
      g.position.copy(m.p);

      var coeur = new THREE.Sprite(new THREE.SpriteMaterial({
        map: HALO, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      }));
      coeur.scale.setScalar(m.r * 2.1);
      g.add(coeur);

      var lueur = new THREE.Sprite(new THREE.SpriteMaterial({
        map: HALO, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      }));
      lueur.scale.setScalar(m.r * 6.5);
      g.add(lueur);

      /* La traînée part de la tuyère vers l'arrière, donc vers -Z,
         la proue étant en +Z sur toutes les coques du site. */
      var geo = new THREE.PlaneGeometry(1, 1);
      geo.translate(0, -0.5, 0);
      var q1 = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        map: trainee(), transparent: true, opacity: 0.8, color: 0xffffff,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
      }));
      q1.rotation.x = -Math.PI / 2;
      var q2 = q1.clone();
      q2.material = q1.material.clone();
      q2.rotation.z = Math.PI / 2;
      g.add(q1); g.add(q2);

      porteur.add(g);
      out.push({ groupe: g, coeur: coeur, lueur: lueur, voiles: [q1, q2], rayon: m.r });
    });
    return out;
  }

  /* Un seul réglage pour toute la poussée d'un vaisseau. */
  function pousser(n, force, t) {
    var r = n && n.userData && n.userData.reacteurs;
    if (!r || !r.length) { return; }
    for (var i = 0; i < r.length; i++) {
      var e = r[i];
      var puls = 0.86 + 0.14 * Math.sin(t * 9 + i * 1.7);
      var f = Math.max(0, force) * puls;
      e.coeur.material.opacity = Math.min(1, f * 1.15);
      e.coeur.scale.setScalar(e.rayon * (1.5 + f * 1.1));
      e.lueur.material.opacity = Math.min(0.8, f * 0.55);
      e.lueur.scale.setScalar(e.rayon * (4.5 + f * 4));
      for (var v = 0; v < e.voiles.length; v++) {
        e.voiles[v].material.opacity = Math.min(0.9, f * 0.85);
        e.voiles[v].scale.set(e.rayon * (1.8 + f * 0.8), e.rayon * (5 + f * 26), 1);
      }
    }
  }

  /* Halo de tuyère : un disque additif, pas une lumière. */
  var HALO = null;
  function halo(c) {
    if (!HALO) {
      HALO = c.pastille([[0, 'rgba(255,240,240,1)'], [0.22, 'rgba(255,90,90,0.75)'],
                         [0.6, 'rgba(224,16,32,0.22)'], [1, 'rgba(224,16,32,0)']]);
    }
    return HALO;
  }

  function tuyeres(c, porteur, liste, taille) {
    var out = [];
    liste.forEach(function (m) {
      var s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: halo(c), transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      }));
      s.position.set(m[0], m[1], m[2]);
      s.scale.setScalar(m[3] * (taille || 4.2));
      porteur.add(s);
      out.push(s);
    });
    return out;
  }

  /* Champ d'étoiles lointaines, commun à toutes les scènes. */
  function etoiles(c, nombre, rayonMin, rayonMax, taille, opacite) {
    var pos = new Float32Array(nombre * 3);
    for (var i = 0; i < nombre; i++) {
      var r = rayonMin + Math.random() * (rayonMax - rayonMin);
      var u = Math.random() * 2 - 1, a = Math.random() * 6.2832;
      var sq = Math.sqrt(1 - u * u);
      pos[i * 3] = sq * Math.cos(a) * r;
      pos[i * 3 + 1] = u * r;
      pos[i * 3 + 2] = sq * Math.sin(a) * r;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var p = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xcfd4dc, size: taille, sizeAttenuation: true, map: c.rond(),
      transparent: true, opacity: opacite, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false
    }));
    c.scene.add(p);
    return p;
  }

  /* Poussière proche : c'est elle qui donne la vitesse. Répartie
     dans un tube creux, parce qu'un grain qui frôle l'objectif
     remplit l'écran d'une tache. */
  function poussiere(c, nombre, rInt, rExt, longueur, taille) {
    var pos = new Float32Array(nombre * 3);
    for (var i = 0; i < nombre; i++) {
      var r = rInt + Math.pow(Math.random(), 0.6) * (rExt - rInt);
      var a = Math.random() * 6.2832;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r * 0.8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * longueur;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var p = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0x9aa0aa, size: taille, sizeAttenuation: true, map: c.rond(),
      transparent: true, opacity: 0.55, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: true
    }));
    p.userData.longueur = longueur;
    c.scene.add(p);
    return p;
  }

  /* Un faisceau : un cylindre additif orienté d'un point vers un
     autre, plus une lueur à chaque bout. */
  function faisceau(rayon, teinte, opacite) {
    var g = new THREE.Group();
    var geo = new THREE.CylinderGeometry(rayon, rayon, 1, 10, 1, true);
    geo.translate(0, 0.5, 0);
    geo.rotateX(Math.PI / 2);
    var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: teinte, transparent: true, opacity: opacite,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
    }));
    g.add(m);
    g.userData.tube = m;
    return g;
  }

  function tendre(g, de, vers) {
    g.position.copy(de);
    g.lookAt(vers);
    g.scale.set(1, 1, de.distanceTo(vers));
  }

  window.ODN.travaux = {
    ARGENT: ARGENT, ROUGE: ROUGE, BRAISE: BRAISE,
    peintre: peintre, coque: coque, tuyeres: tuyeres, halo: halo,
    pousser: pousser,
    etoiles: etoiles, poussiere: poussiere, faisceau: faisceau, tendre: tendre
  };
})();
