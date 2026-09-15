/* =========================================================
   ACTE — LA RÉCUPÉRATION
   ---------------------------------------------------------
   La Carrière tient une épave sous son bras de découpe,
   l'Ironclad se range à côté pour emporter, et la coque rend
   ce qu'elle a : la tôle part en plaques, les plaques partent
   en poussière.

   Le dépeçage est une fonction du défilement. Les plaques sont
   toutes là dès le début, plaquées sur la coque ; elles se
   décollent, montent, et rentrent.
   ========================================================= */
(function () {
  'use strict';
  var T = window.ODN && window.ODN.travaux;
  if (!T || !window.ODN.acte) { return; }

  window.ODN.acte({
    id: 'recuperation',
    champ: 50,
    souplesse: 7,

    monter: function (c) {
      T.etoiles(c, c.petit ? 800 : 2000, 800, 2600, 3.2, 0.5);

      /* ---- la tôle arrachée ----
         Des plaques réparties le long de l'épave, plaquées sur sa
         coque au départ. Elles ne sont pas créées à la volée : on
         doit pouvoir remonter la page et les voir se reposer. */
      c.plaques = [];
      var groupe = new THREE.Group();
      c.scene.add(groupe);
      c.tole = groupe;
      var mat = new THREE.MeshBasicMaterial({
        color: 0x191c22, transparent: true, opacity: 0.95,
        side: THREE.DoubleSide, fog: true
      });
      var arete = new THREE.LineBasicMaterial({
        color: 0x868b95, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      var n = c.petit ? 26 : 54;
      for (var i = 0; i < n; i++) {
        var l = 3 + Math.random() * 7, h = 2 + Math.random() * 5;
        var geo = new THREE.PlaneGeometry(l, h);
        var p = new THREE.Group();
        p.add(new THREE.Mesh(geo, mat));
        p.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), arete));
        var le = -52 + (i / n) * 104;
        var a = (i * 2.39996) % 6.2832;
        p.userData.depart = new THREE.Vector3(Math.cos(a) * 11, Math.sin(a) * 8 + 2, le);
        p.userData.dir = new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.8, 0).normalize();
        p.userData.seuil = 0.18 + (i / n) * 0.52;
        p.userData.tour = (Math.random() - 0.5) * 1.6;
        p.position.copy(p.userData.depart);
        p.rotation.set(Math.random() * 3, a, Math.random() * 3);
        groupe.add(p);
        c.plaques.push(p);
      }

      /* ---- la poussière de découpe ---- */
      var nf = c.petit ? 400 : 1100;
      c.grainDir = [];
      var pos = new Float32Array(nf * 3);
      for (var f = 0; f < nf; f++) {
        var u = Math.random() * 2 - 1, aa = Math.random() * 6.2832;
        var sq = Math.sqrt(1 - u * u);
        c.grainDir.push([sq * Math.cos(aa), u, sq * Math.sin(aa),
                         0.3 + Math.random() * 1.4, -52 + Math.random() * 104]);
      }
      var gf = new THREE.BufferGeometry();
      gf.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      c.grain = new THREE.Points(gf, new THREE.PointsMaterial({
        color: 0xffb098, size: 1.9, sizeAttenuation: true, map: c.rond(),
        transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
      }));
      c.scene.add(c.grain);

      /* ---- le faisceau de découpe, large et plat ---- */
      c.lame = T.faisceau(1.3, 0xffc0a0, 0.3);
      c.lame.visible = false;
      c.scene.add(c.lame);
      c.lameCoeur = T.faisceau(0.38, 0xfff0e0, 0.9);
      c.lameCoeur.visible = false;
      c.scene.add(c.lameCoeur);

      c.impact = new THREE.Sprite(new THREE.SpriteMaterial({
        map: T.halo(c), transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      c.impact.scale.setScalar(20);
      c.scene.add(c.impact);
    },

    approcher: function (c) {
      /* L'épave : un Portefaix qui ne repartira pas. Couché,
         éteint, et c'est ce qui le désigne comme épave. */
      c.epave = T.coque('caterpillar', 104, 0x6d727c, 0.3);
      c.epave.position.set(0, 0, 0);
      c.epave.rotation.set(0.22, 0.4, -0.5);
      c.scene.add(c.epave);

      /* La Carrière au-dessus, bras en bas. */
      c.recuperateur = T.coque('reclaimer', 120, T.ARGENT, 0.44);
      c.recuperateur.position.set(-14, 62, -16);
      c.recuperateur.rotation.set(-0.16, 0.34, 0.06);
      c.scene.add(c.recuperateur);
      c.feuxR = T.tuyeres(c, c.recuperateur, [[-13, 6, -54], [13, 6, -54],
                                              [-13, -6, -54], [13, -6, -54]], 2.8);

      /* L'Ironclad rangé à côté : c'est lui qui emporte. */
      c.porteur = T.coque('ironclad', 110, T.ARGENT, 0.36);
      c.porteur.position.set(96, -26, 34);
      c.porteur.rotation.set(0.05, -0.62, -0.04);
      c.scene.add(c.porteur);
      c.feuxP = T.tuyeres(c, c.porteur, [[-12, 3, -52], [12, 3, -52],
                                         [-12, -5, -52], [12, -5, -52]], 2.6);

      c.bras = new THREE.Vector3(-14, 62 - 26, -16 + 30);
    },

    jouer: function (c, avance, dt, t) {
      var P = c.palier;
      var approche = P(avance, 0.0, 0.26);
      var coupe = P(avance, 0.22, 0.52);
      var depece = P(avance, 0.34, 0.86);
      var emport = P(avance, 0.62, 1.0);

      /* Le bras balaie l'épave dans sa longueur : c'est ce
         mouvement-là qui dit « découpe » et pas « laser ». */
      if (c.bras) {
        var le = -46 + depece * 92;
        var cible = new THREE.Vector3(
          Math.cos(le * 0.06) * 6, Math.sin(le * 0.05) * 5 + 2, le);
        cible.applyEuler(c.epave ? c.epave.rotation : new THREE.Euler());
        var de = c.bras.clone();
        de.x += Math.sin(t * 0.8) * 0.8;
        var puis = coupe * (0.72 + 0.28 * Math.sin(t * 19));
        T.tendre(c.lame, de, cible);
        T.tendre(c.lameCoeur, de, cible);
        c.lame.visible = puis > 0.01;
        c.lameCoeur.visible = puis > 0.01;
        c.lame.userData.tube.material.opacity = 0.3 * puis;
        c.lameCoeur.userData.tube.material.opacity = 0.9 * puis;
        c.impact.position.copy(cible);
        c.impact.material.opacity = puis * (0.6 + 0.4 * Math.sin(t * 13));
        c.impact.scale.setScalar(14 + puis * 12);
      }

      /* la tôle se décolle, monte, et rentre */
      if (c.epave) { c.tole.rotation.copy(c.epave.rotation); }
      c.plaques.forEach(function (p) {
        var s = p.userData.seuil;
        var ouvre = P(depece, s, s + 0.22);
        var monte = P(emport, s * 0.6, s * 0.6 + 0.4);
        var d = p.userData.dir;
        p.position.set(
          p.userData.depart.x + d.x * ouvre * 26,
          p.userData.depart.y + d.y * ouvre * 20 + monte * 52,
          p.userData.depart.z + ouvre * 4
        );
        p.rotation.x += p.userData.tour * dt * ouvre * 1.6;
        p.rotation.z += p.userData.tour * dt * ouvre * 1.1;
        p.children[0].material.opacity = 0.95;
        p.visible = monte < 0.97;
      });

      /* la poussière */
      var gp = c.grain.geometry.attributes.position.array;
      for (var i = 0; i < c.grainDir.length; i++) {
        var g = c.grainDir[i];
        var s2 = (g[4] + 52) / 104;
        var ouv = P(depece, s2 * 0.8, s2 * 0.8 + 0.3);
        var dd = 9 + ouv * 30 * g[3];
        gp[i * 3] = g[0] * dd;
        gp[i * 3 + 1] = g[1] * dd * 0.8 + emport * 46 * g[3];
        gp[i * 3 + 2] = g[4] + g[2] * dd * 0.3;
      }
      c.grain.geometry.attributes.position.needsUpdate = true;
      c.grain.material.opacity = coupe * Math.pow(1 - emport * 0.75, 1.5) * 0.75;

      var puls = 0.4 + 0.2 * Math.sin(t * 2.2);
      if (c.feuxR) { c.feuxR.forEach(function (s) { s.material.opacity = puls; }); }
      if (c.feuxP) { c.feuxP.forEach(function (s) { s.material.opacity = puls * 0.8; }); }

      /* caméra : elle arrive par le travers, descend le long de
         l'épave pendant la découpe, puis recule sur les deux
         bâtiments */
      var m1 = P(avance, 0.0, 0.4);
      var m2 = P(avance, 0.32, 0.76);
      var m3 = P(avance, 0.72, 1.0);
      /* Elle reste à distance des deux bâtiments : la Carrière
         est à 62 au-dessus, l'Ironclad à 96 sur le côté, et ce
         sont eux qui donnent l'échelle de l'épave. */
      c.camera.position.set(
        -190 + m1 * 56 + m2 * 74 + m3 * 96,
        46 - m1 * 18 + m2 * 30 + m3 * 34,
        190 - m1 * 46 - m2 * 30 + m3 * 110
      );
      c.camera.lookAt(new THREE.Vector3(
        8 + m2 * 12 + m3 * 42, 12 + m2 * 14 + m3 * 14, -6 + m2 * 10));
      c.camera.rotation.z += Math.sin(t * 0.26) * 0.016 + coupe * Math.sin(t * 27) * 0.003;
      void approche;
    }
  });
})();
