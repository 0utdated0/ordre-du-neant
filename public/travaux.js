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
    n.userData.coque = nom;
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
      /* Un dégradé vertical sur un rectangle donnait une bande
         plate à bords nets : de profil, ça se lisait comme un
         drapeau, pas comme une flamme. Le panache est peint
         point par point, avec une demi-largeur qui se referme
         vers la queue et un bord qui s'éteint en douceur. */
      var W = 48, H = 160;
      var t = document.createElement('canvas');
      t.width = W; t.height = H;
      var x = t.getContext('2d');
      var img = x.createImageData(W, H);
      for (var j = 0; j < H; j++) {
        var v = j / (H - 1);                       /* 0 tuyère, 1 queue */
        var demi = 0.07 + 0.41 * Math.pow(1 - v, 0.55);
        var force = Math.pow(1 - v, 1.35) * (1 - Math.pow(v, 6));
        var blanc = Math.pow(1 - Math.min(1, v / 0.22), 2);
        for (var i = 0; i < W; i++) {
          var u = (i + 0.5) / W - 0.5;
          var r = Math.abs(u) / demi;
          var t2 = r < 1 ? Math.pow(1 - r * r, 1.5) : 0;
          var a = force * t2;
          var k = (j * W + i) * 4;
          img.data[k]     = 255;
          img.data[k + 1] = Math.round(30 + 210 * blanc * t2);
          img.data[k + 2] = Math.round(38 + 202 * blanc * t2);
          img.data[k + 3] = Math.round(Math.min(1, a) * 255);
        }
      }
      x.putImageData(img, 0, 0);
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
      /* +PI/2 et non -PI/2 : avec -PI/2 le plan part vers +Z, donc
         vers l'avant. Les traînées sortaient par la proue. */
      q1.rotation.x = Math.PI / 2;
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
      e.coeur.scale.setScalar(e.rayon * (1.1 + f * 0.8));
      /* Le halo est une lueur, pas une boule. À 8,5 rayons il se
         lisait comme trois sphères rouges posées sous la coque du
         Portefaix, détachées d'elle. Ce qui doit porter la poussée,
         c'est le panache, pas le halo. */
      e.lueur.material.opacity = Math.min(0.40, f * 0.30);
      e.lueur.scale.setScalar(e.rayon * (1.8 + f * 1.2));
      for (var v = 0; v < e.voiles.length; v++) {
        e.voiles[v].material.opacity = Math.min(0.9, f * 0.85);
        /* Le panache s'ouvre à la tuyère et s'allonge avec la
           poussée ; sa largeur, elle, bouge peu. */
        e.voiles[v].scale.set(e.rayon * (2.6 + f * 0.6), e.rayon * (5 + f * 26), 1);
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

  /* Une explosion : un cœur blanc, une boule de feu, un anneau de
     souffle qui s'aplatit, et des éclats. Les quatre ensemble,
     sinon ça ne se lit pas comme une explosion : un simple halo
     qui grossit se lit comme une lampe qu'on allume.

     Tout est piloté par une seule valeur entre 0 et 1, pour que
     l'appelant puisse la brancher sur le défilement comme sur
     l'horloge. */
  /* L'onde de souffle. Un THREE.RingGeometry donnait un cercle au
     trait net, d'épaisseur constante quelle que soit sa taille :
     à l'écran, une mire tracée au compas. Une pastille peinte,
     avec une crête floue et deux bords qui s'éteignent, se lit
     comme un front de souffle. */
  var ONDE = null;
  function onde() {
    if (!ONDE) {
      var N = 256;
      var t = document.createElement('canvas');
      t.width = t.height = N;
      var x = t.getContext('2d');
      var img = x.createImageData(N, N);
      for (var j = 0; j < N; j++) {
        for (var i = 0; i < N; i++) {
          var dx = (i + 0.5) / N - 0.5, dy = (j + 0.5) / N - 0.5;
          var r = Math.sqrt(dx * dx + dy * dy) * 2;
          var a = r < 1 ? Math.pow(Math.max(0, 1 - Math.abs(r - 0.8) / 0.32), 2.6) : 0;
          var k = (j * N + i) * 4;
          img.data[k]     = 255;
          img.data[k + 1] = Math.round(140 + 100 * a);
          img.data[k + 2] = Math.round(112 + 90 * a);
          img.data[k + 3] = Math.round(a * 255);
        }
      }
      x.putImageData(img, 0, 0);
      ONDE = new THREE.CanvasTexture(t);
    }
    return ONDE;
  }

  function explosion(c, taille, devant) {
    /* rond() vit dans le moteur d'acte, pas ici : il faut passer
       par le contexte. */
    var rond = c.rond;
    var g = new THREE.Group();

    /* « devant » désactive le test de profondeur : une détonation
       posée au cœur d'un astéroïde était entièrement masquée par
       les blocs, et on voyait la roche s'ouvrir sans rien qui
       l'ouvre. Un éclat de cette puissance passe devant. */
    var coeur = new THREE.Sprite(new THREE.SpriteMaterial({
      map: halo(c), transparent: true, opacity: 0, color: 0xffffff,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      depthTest: !devant
    }));
    coeur.renderOrder = devant ? 30 : 0;
    g.add(coeur);

    var boule = new THREE.Sprite(new THREE.SpriteMaterial({
      map: halo(c), transparent: true, opacity: 0, color: 0xff6a4a,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      depthTest: !devant
    }));
    boule.renderOrder = devant ? 29 : 0;
    g.add(boule);

    /* L'anneau de souffle est ce qui dit « détonation » plutôt que
       « lumière » : il part vite, il s'aplatit, il s'éteint. */
    var anneau = new THREE.Sprite(new THREE.SpriteMaterial({
      map: onde(), transparent: true, opacity: 0, color: 0xffffff,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      depthTest: !devant
    }));
    anneau.renderOrder = devant ? 31 : 0;
    g.add(anneau);

    var n = 26;
    var pos = new Float32Array(n * 3);
    var dirs = [];
    for (var i = 0; i < n; i++) {
      var u = Math.random() * 2 - 1, a = Math.random() * 6.2832;
      var sq = Math.sqrt(1 - u * u);
      dirs.push([sq * Math.cos(a), u, sq * Math.sin(a), 0.4 + Math.random() * 1.5]);
    }
    var ge = new THREE.BufferGeometry();
    ge.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var eclats = new THREE.Points(ge, new THREE.PointsMaterial({
      color: 0xffc0a0, size: taille * 0.05, sizeAttenuation: true, map: rond(),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, depthTest: !devant
    }));
    eclats.renderOrder = devant ? 28 : 0;
    g.add(eclats);

    g.userData.jouer = function (v, camera) {
      g.visible = v > 0.001 && v < 0.999;
      if (!g.visible) { return; }
      /* montée brutale, retombée lente : une explosion n'est pas
         symétrique dans le temps */
      var eclat = Math.pow(Math.max(0, 1 - v * 2.6), 1.9);
      var feu = Math.pow(Math.max(0, 1 - v * 1.5), 1.4);
      var souffle = v;

      coeur.material.opacity = eclat;
      coeur.scale.setScalar(taille * (0.2 + eclat * 1.35));
      boule.material.opacity = feu * 0.95;
      boule.scale.setScalar(taille * (0.3 + souffle * 1.5));

      /* L'anneau part vite et s'éteint vite. Étalé sur trois fois
         la taille de la boule et éteint en puissance 2,8, il tenait
         l'écran assez longtemps pour se lire comme une mire tracée
         au compas : trois cercles gris en travers de la bordée.
         Moitié moins large, éteint cinq fois plus vite. */
      anneau.material.opacity = Math.pow(1 - souffle, 3.4) * Math.min(1, souffle * 12) * 0.8;
      var ra = taille * (0.3 + Math.pow(souffle, 0.45) * 2.2);
      anneau.scale.set(ra, ra, 1);
      void camera;

      var ep = ge.attributes.position.array;
      for (var k = 0; k < dirs.length; k++) {
        var d = dirs[k], r = taille * souffle * 2.6 * d[3];
        ep[k * 3] = d[0] * r; ep[k * 3 + 1] = d[1] * r; ep[k * 3 + 2] = d[2] * r;
      }
      ge.attributes.position.needsUpdate = true;
      eclats.material.opacity = Math.pow(1 - souffle, 1.6) * 0.9;
    };
    return g;
  }

  /* Un point d'accroche dans le repère du monde. Les coques sont
     inclinées dans leurs scènes : ajouter simplement la position
     du groupe ignore sa rotation, et le faisceau partait à côté. */
  function enMonde(n, nom) {
    var v = n.userData[nom];
    if (!v) { return new THREE.Vector3(); }
    n.updateMatrixWorld(true);
    return n.localToWorld(v.clone());
  }

  window.ODN.travaux = {
    ARGENT: ARGENT, ROUGE: ROUGE, BRAISE: BRAISE,
    peintre: peintre, coque: coque, tuyeres: tuyeres, halo: halo, enMonde: enMonde,
    explosion: explosion,
    pousser: pousser,
    etoiles: etoiles, poussiere: poussiere, faisceau: faisceau, tendre: tendre
  };
})();
