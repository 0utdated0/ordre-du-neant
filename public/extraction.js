/* =========================================================
   ACTE — L'EXTRACTION
   ---------------------------------------------------------
   Le Gisement pointe sa tête de forage sur un astéroïde, le
   faisceau mord, la roche chauffe et cède, et ce qui en tombe
   est aspiré vers les soutes.

   La rupture est une fonction du défilement, pas une animation
   qui se joue une fois : on remonte, l'astéroïde se recompose.
   Les morceaux sont là depuis le début, serrés les uns contre
   les autres, et ils s'écartent.
   ========================================================= */
(function () {
  'use strict';
  var T = window.ODN && window.ODN.travaux;
  if (!T || !window.ODN.acte) { return; }

  var RAYON = 34;

  window.ODN.acte({
    id: 'extraction',
    champ: 50,
    souplesse: 7,

    monter: function (c) {
      T.etoiles(c, c.petit ? 800 : 2000, 800, 2600, 3.2, 0.5);

      /* ---- l'astéroïde, déjà en morceaux ----
         Une vingtaine de blocs répartis sur la sphère. Serrés,
         ils lisent comme un rocher ; écartés, comme sa ruine. */
      c.roche = new THREE.Group();
      c.roche.position.set(0, 0, -150);
      c.scene.add(c.roche);

      var matiere = new THREE.MeshLambertMaterial({
        color: 0x1b1d22, flatShading: true
      });
      c.matiereRoche = matiere;
      c.blocs = [];
      var n = c.petit ? 22 : 38;
      for (var i = 0; i < n; i++) {
        /* Répartition de Fibonacci : pas de pôle, pas de couture. */
        var u = 1 - 2 * (i + 0.5) / n;
        var r = Math.sqrt(1 - u * u);
        var a = i * 2.39996;
        var dir = new THREE.Vector3(r * Math.cos(a), u, r * Math.sin(a));
        var prof = 0.42 + ((i * 7) % 5) / 9;

        var b = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), matiere);
        var s = RAYON * (0.34 + ((i * 3) % 4) / 12);
        b.scale.set(s, s * (0.72 + ((i * 5) % 3) / 7), s * (0.8 + ((i * 2) % 4) / 9));
        b.userData.dir = dir;
        b.userData.depart = dir.clone().multiplyScalar(RAYON * prof);
        b.userData.tour = new THREE.Vector3(
          (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
        b.userData.etal = 0.6 + Math.random() * 1.5;
        b.position.copy(b.userData.depart);
        b.rotation.set(i * 1.1, i * 0.7, i * 0.4);
        c.roche.add(b);
        c.blocs.push(b);
      }

      c.scene.add(new THREE.AmbientLight(0x20242c, 1.0));
      /* La charte est noir, argent, rouge : la roche chauffée doit
         virer au rouge, pas à l'orange. */
      var l1 = new THREE.DirectionalLight(0xffc6c6, 1.4); l1.position.set(1, 0.4, 0.6);
      var l2 = new THREE.DirectionalLight(0x8090b0, 0.5); l2.position.set(-1, -0.3, 0.2);
      c.scene.add(l1); c.scene.add(l2);
      c.lampe = l1;

      /* point d'impact : la roche rougit là où le faisceau mord */
      c.braise = new THREE.Sprite(new THREE.SpriteMaterial({
        map: T.halo(c), transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      c.braise.scale.setScalar(RAYON * 1.6);
      c.roche.add(c.braise);

      /* ---- le faisceau ---- */
      c.rai = T.faisceau(1.5, 0xffb0b0, 0.55);
      c.rai.visible = false;
      c.scene.add(c.rai);
      c.raiCoeur = T.faisceau(0.5, 0xffffff, 0.9);
      c.raiCoeur.visible = false;
      c.scene.add(c.raiCoeur);

      /* ---- les fines : ce que le forage arrache ---- */
      var nf = c.petit ? 500 : 1400;
      c.finesDir = [];
      var pos = new Float32Array(nf * 3);
      var col = new Float32Array(nf * 3);
      var teinte = new THREE.Color();
      for (var f = 0; f < nf; f++) {
        var uu = Math.random() * 2 - 1, aa = Math.random() * 6.2832;
        var sq = Math.sqrt(1 - uu * uu);
        c.finesDir.push([sq * Math.cos(aa), uu * 0.7, sq * Math.sin(aa),
                         0.4 + Math.random() * 1.6, Math.random()]);
        teinte.set(Math.random() > 0.6 ? 0xff8060 : 0x9aa0aa);
        var g = 0.3 + Math.random() * 0.7;
        col[f * 3] = teinte.r * g; col[f * 3 + 1] = teinte.g * g; col[f * 3 + 2] = teinte.b * g;
      }
      var gf = new THREE.BufferGeometry();
      gf.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      gf.setAttribute('color', new THREE.BufferAttribute(col, 3));
      c.fines = new THREE.Points(gf, new THREE.PointsMaterial({
        size: 2.4, sizeAttenuation: true, vertexColors: true, map: c.rond(),
        transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
      }));
      c.roche.add(c.fines);
    },

    approcher: function (c) {
      c.foreuse = T.coque('orion', 120, T.ARGENT, 0.42);
      c.foreuse.position.set(6, -6, 96);
      c.scene.add(c.foreuse);
      /* La tête de forage est relevée sur le maillage, pas posée
         à l'estime : c'est l'extrémité avant-basse de la coque. */
      c.foreuse.userData.quandPret = function (n) {
        c.tete = n.userData.bras.clone().add(n.position);
      };
    },

    jouer: function (c, avance, dt, t) {
      var P = c.palier;
      var vise = P(avance, 0.08, 0.3);
      var morsure = P(avance, 0.26, 0.5);
      var rupture = P(avance, 0.46, 0.82);
      var emport = P(avance, 0.66, 1.0);

      /* le faisceau */
      if (c.tete) {
        var cible = new THREE.Vector3(0, 0, -150 + RAYON * 0.4);
        var de = c.tete.clone();
        de.x += Math.sin(t * 0.7) * 0.6;
        de.y += Math.cos(t * 0.9) * 0.6;
        T.tendre(c.rai, de, cible);
        T.tendre(c.raiCoeur, de, cible);
        var puis = morsure * (0.78 + 0.22 * Math.sin(t * 22));
        c.rai.visible = puis > 0.01;
        c.raiCoeur.visible = puis > 0.01;
        c.rai.userData.tube.material.opacity = 0.5 * puis;
        c.raiCoeur.userData.tube.material.opacity = 0.95 * puis;
        c.rai.scale.x = c.rai.scale.y = 1 + vise * 0.6 + Math.sin(t * 17) * 0.06;
      }

      /* la roche chauffe puis cède */
      c.braise.material.opacity = morsure * (0.55 + 0.45 * Math.sin(t * 14)) * (1 - rupture * 0.5);
      c.braise.position.set(0, 0, RAYON * 0.55);
      c.braise.scale.setScalar(RAYON * (0.7 + morsure * 1.5));
      c.matiereRoche.color.setRGB(0.105 + morsure * 0.26, 0.113 + morsure * 0.03, 0.133 + morsure * 0.03);

      var ecart = rupture * 1.0 + emport * 0.9;
      c.blocs.forEach(function (b, i) {
        var d = b.userData.dir, e = b.userData.etal;
        var k = 1 + ecart * 2.6 * e;
        b.position.set(b.userData.depart.x * k, b.userData.depart.y * k, b.userData.depart.z * k);
        /* Ce qui part vers le vaisseau est aspiré, le reste dérive. */
        if (d.z > 0.1) {
          var asp = emport * 0.55 * (0.4 + d.z);
          b.position.z += asp * 120;
          b.position.x *= 1 - asp * 0.5;
          b.position.y *= 1 - asp * 0.5;
        }
        var tr = b.userData.tour;
        b.rotation.x += tr.x * dt * (0.4 + ecart * 3);
        b.rotation.y += tr.y * dt * (0.4 + ecart * 3);
        b.rotation.z += tr.z * dt * (0.4 + ecart * 3);
        b.scale.multiplyScalar(1);
        b.visible = true;
        void i;
      });

      /* les fines */
      var souffle = P(avance, 0.44, 0.95);
      var fp = c.fines.geometry.attributes.position.array;
      for (var i2 = 0; i2 < c.finesDir.length; i2++) {
        var f = c.finesDir[i2];
        var dd = RAYON * (0.9 + souffle * 3.4 * f[3]);
        fp[i2 * 3] = f[0] * dd;
        fp[i2 * 3 + 1] = f[1] * dd;
        fp[i2 * 3 + 2] = f[2] * dd + emport * 90 * f[4] * (f[2] > 0 ? 1 : 0.2);
      }
      c.fines.geometry.attributes.position.needsUpdate = true;
      c.fines.material.opacity = Math.min(1, souffle * 5) * Math.pow(1 - souffle * 0.7, 1.4) * 0.8;

      c.lampe.intensity = 1.0 + morsure * 0.85;

      /* Une plateforme de forage tient sa position : la poussée
         reste basse, elle ne file pas. */
      T.pousser(c.foreuse, 0.3 + morsure * 0.25, t);

      /* caméra : de loin, puis elle longe le faisceau, puis elle
         se glisse dans la poussière de roche */
      var m1 = P(avance, 0.0, 0.42);
      var m2 = P(avance, 0.38, 0.78);
      var m3 = P(avance, 0.72, 1.0);
      /* À la fin elle reprend du champ au lieu de s'enfoncer dans
         les gravats : le dernier plan doit montrer la plateforme
         qui encaisse, pas un écran de cailloux. */
      c.camera.position.set(
        -210 + m1 * 92 + m2 * 40 + m3 * 96,
        66 - m1 * 40 + m2 * 10 + m3 * 34,
        170 - m1 * 96 - m2 * 76 + m3 * 190
      );
      c.camera.lookAt(new THREE.Vector3(
        m3 * 8, m3 * -4, -150 + m2 * 40 + m3 * 150));
      c.camera.rotation.z += Math.sin(t * 0.3) * 0.015 + morsure * Math.sin(t * 31) * 0.004;
    }
  });
})();
