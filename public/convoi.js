/* =========================================================
   ACTE — LE CONVOI
   ---------------------------------------------------------
   Un cargo escorté file dans le vide. La caméra part de
   l'arrière, remonte le long du convoi, passe devant, puis se
   laisse distancer.

   Le convoi n'avance pas : c'est le décor qui défile et la
   caméra qui se déplace. Déplacer les vaisseaux aurait obligé à
   les ramener en arrière quand on remonte la page.
   ========================================================= */
(function () {
  'use strict';
  var T = window.ODN && window.ODN.travaux;
  if (!T || !window.ODN.acte) { return; }

  window.ODN.acte({
    id: 'convoi',
    champ: 52,
    brouillard: 0.0011,
    souplesse: 7,

    monter: function (c) {
      T.etoiles(c, c.petit ? 900 : 2200, 700, 2400, 3.4, 0.55);
      c.poussiere = T.poussiere(c, c.petit ? 900 : 2400, 26, 190, 1400, 2.2);

      c.convoi = new THREE.Group();
      c.scene.add(c.convoi);

      /* éclats de roche au loin : ils donnent un décor à traverser */
      var mat = new THREE.MeshBasicMaterial({ color: 0x13151a, transparent: true, opacity: 0.95, fog: true });
      var geo = new THREE.DodecahedronGeometry(1, 0);
      c.eclats = new THREE.Group();
      for (var e = 0; e < (c.petit ? 18 : 40); e++) {
        var m = new THREE.Mesh(geo, mat);
        var r = 150 + Math.random() * 320;
        var a = Math.random() * 6.2832;
        m.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.7, -700 + Math.random() * 1400);
        var s = 3 + Math.random() * 12;
        m.scale.set(s, s * (0.6 + Math.random()), s * (0.6 + Math.random()));
        m.rotation.set(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3);
        m.userData.v = (Math.random() - 0.5) * 0.004;
        c.eclats.add(m);
      }
      c.scene.add(c.eclats);
    },

    /* Les coques ne sont demandées qu'à l'approche de la section. */
    approcher: function (c) {
      /* Le Portefaix au centre, proue en +Z comme partout. */
      c.cargo = T.coque('caterpillar', 44, T.ARGENT, 0.42);
      c.cargo.position.set(0, 0, 0);
      c.convoi.add(c.cargo);
      c.feuxCargo = T.tuyeres(c, c.cargo, [[-5.2, 0.6, -21], [5.2, 0.6, -21],
                                           [-5.2, -3.4, -21], [5.2, -3.4, -21]], 2.6);

      /* Le Passeur, un peu au-dessus et en retrait : une escorte
         se place là où elle voit, pas là où elle gêne. */
      c.corvette = T.coque('polaris', 52, T.ARGENT, 0.38);
      c.corvette.position.set(-46, 15, -30);
      c.corvette.rotation.y = 0.06;
      c.convoi.add(c.corvette);
      c.feuxCorvette = T.tuyeres(c, c.corvette, [[-7, 2.4, -25], [7, 2.4, -25],
                                                 [-6.4, -2.6, -25], [6.4, -2.6, -25]], 2.4);

      /* Deux Sentinelles qui louvoient. */
      c.chasseurs = [];
      for (var i = 0; i < 2; i++) {
        var g = T.coque('gladius', 13, i ? T.ARGENT : T.BRAISE, 0.5);
        g.userData.base = new THREE.Vector3(i ? 34 : -26, i ? -12 : 19, i ? 34 : 52);
        g.userData.phase = i * 2.1;
        c.convoi.add(g);
        T.tuyeres(c, g, [[-1.8, 0.4, -6.4], [1.8, 0.4, -6.4]], 2.2);
        c.chasseurs.push(g);
      }
    },

    jouer: function (c, avance, dt, t) {
      var P = c.palier;

      /* Le décor défile : c'est lui qui porte la vitesse. */
      var course = P(avance, 0, 1) * 1900;
      c.eclats.position.z = course;
      c.eclats.children.forEach(function (m) { m.rotation.x += m.userData.v; });
      c.poussiere.position.z = (course * 1.35) % c.poussiere.userData.longueur;

      /* Les chasseurs louvoient autour du convoi. Leur cap suit
         leur déplacement, sinon ils volent en crabe. */
      if (c.chasseurs) {
        c.chasseurs.forEach(function (g, i) {
          var b = g.userData.base, ph = g.userData.phase;
          var x = b.x + Math.sin(t * 0.42 + ph) * 26;
          var y = b.y + Math.sin(t * 0.31 + ph * 1.7) * 11;
          var z = b.z + Math.cos(t * 0.37 + ph) * 34;
          var dx = Math.cos(t * 0.42 + ph) * 0.42 * 26;
          var dz = -Math.sin(t * 0.37 + ph) * 0.37 * 34;
          g.position.set(x, y, z);
          g.rotation.y = Math.atan2(dx, dz);
          g.rotation.z = -Math.sin(t * 0.42 + ph) * 0.5;
        });
      }

      /* La caméra : derrière, puis le long du flanc, puis devant,
         puis elle se laisse distancer. */
      var m1 = P(avance, 0.0, 0.42);
      var m2 = P(avance, 0.36, 0.74);
      var m3 = P(avance, 0.7, 1.0);

      /* Plus près : à cent cinquante d'un cargo de quarante-quatre,
         le convoi n'était qu'une poignée de traits. */
      var x = -14 - m1 * 40 + m2 * 26 + m3 * 34;
      var y = -9 + m1 * 16 + m2 * 8 - m3 * 20;
      var z = -92 + m1 * 58 + m2 * 116 - m3 * 92;
      c.camera.position.set(x, y, z);

      var visee = new THREE.Vector3(0, 0, 6 - m3 * 90);
      c.camera.lookAt(visee);
      c.camera.rotation.z = Math.sin(t * 0.2) * 0.02 + m2 * 0.06;

      var pousse = 0.55 + 0.45 * Math.abs(Math.sin(t * 3.4));
      if (c.feuxCargo) {
        c.feuxCargo.forEach(function (s) { s.material.opacity = 0.7 * pousse; });
      }
      if (c.feuxCorvette) {
        c.feuxCorvette.forEach(function (s) { s.material.opacity = 0.75 * pousse; });
      }
    }
  });
})();
