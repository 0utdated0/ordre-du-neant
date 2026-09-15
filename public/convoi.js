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

  /* Vitesse apparente du convoi dans son propre repère, pour le
     cap des Sentinelles : plus que leur louvoiement, pour qu'elles
     ne fassent jamais demi-tour. */
  var MARCHE = 24;

  window.ODN.acte({
    id: 'convoi',
    champ: 52,
    brouillard: 0.0011,
    souplesse: 7,

    monter: function (c) {
      T.etoiles(c, c.petit ? 900 : 2200, 700, 2400, 3.4, 0.55);
      c.poussiere = T.poussiere(c, c.petit ? 1400 : 3600, 30, 190, 1400, 1.25);

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

      /* Le Passeur, un peu au-dessus et en retrait : une escorte
         se place là où elle voit, pas là où elle gêne. */
      c.corvette = T.coque('polaris', 52, T.ARGENT, 0.38);
      c.corvette.position.set(-46, 15, -30);
      c.corvette.rotation.y = 0.06;
      c.convoi.add(c.corvette);

      /* Deux Sentinelles qui louvoient. */
      c.chasseurs = [];
      for (var i = 0; i < 2; i++) {
        /* Même raison que dans la ligne de feu : cent soixante-dix
           pixels au plus près, quatorze triangles par pixel. */
        var g = T.coque('gladius', 13, i ? T.ARGENT : T.BRAISE, 0.5, 'petit');
        g.userData.base = new THREE.Vector3(i ? 34 : -26, i ? -12 : 19, i ? 34 : 52);
        g.userData.phase = i * 2.1;
        c.convoi.add(g);
        c.chasseurs.push(g);
      }
    },

    jouer: function (c, avance, dt, t) {
      var P = c.palier;

      /* Le décor défile : c'est lui qui porte la vitesse. */
      /* Le convoi avance vers +Z, donc le décor défile vers -Z.
         Il partait dans l'autre sens : les vaisseaux reculaient. */
      var course = P(avance, 0, 1) * 1900;
      c.eclats.position.z = -course;
      c.eclats.children.forEach(function (m) { m.rotation.x += m.userData.v; });
      c.poussiere.position.z = -((course * 1.35) % c.poussiere.userData.longueur);

      /* Les chasseurs louvoient autour du convoi. Leur cap suit
         leur déplacement, sinon ils volent en crabe. */
      if (c.chasseurs) {
        c.chasseurs.forEach(function (g, i) {
          var b = g.userData.base, ph = g.userData.phase;
          var x = b.x + Math.sin(t * 0.42 + ph) * 18;
          var y = b.y + Math.sin(t * 0.31 + ph * 1.7) * 8;
          var z = b.z + Math.cos(t * 0.37 + ph) * 22;
          var dx = Math.cos(t * 0.42 + ph) * 0.42 * 18;
          var dy = Math.cos(t * 0.31 + ph * 1.7) * 0.31 * 8;
          /* Le cap suivait le seul louvoiement, dans le repère du
             convoi. Or le convoi avance : quand le louvoiement
             repartait vers l'arrière, la Sentinelle faisait
             demi-tour, et au point mort elle volait de travers,
             traînées perpendiculaires à la route. Mesuré : jusqu'à
             162 degrés entre la traînée et le déplacement. On
             ajoute la marche du convoi, qui l'emporte toujours. */
          var dz = -Math.sin(t * 0.37 + ph) * 0.37 * 22 + MARCHE;
          g.position.set(x, y, z);
          /* lacet, puis tangage autour de l'aile, puis roulis */
          g.rotation.order = 'YXZ';
          g.rotation.set(-Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)),
                         Math.atan2(dx, dz),
                         -Math.sin(t * 0.42 + ph) * 0.35);
        });
      }

      /* La caméra : derrière, puis le long du flanc, puis devant,
         puis elle se laisse distancer. */
      var m1 = P(avance, 0.0, 0.42);
      var m2 = P(avance, 0.36, 0.74);
      var m3 = P(avance, 0.7, 1.0);

      /* Le trajet passe par le flanc droit, le seul côté libre :
         le Passeur tient le flanc gauche à x = -46 et l'ancien
         trajet le frôlait à moins d'un mètre avant de finir dans
         le Portefaix. Mesuré coque par coque, pas estimé. */
      var x = 22 + m1 * 58 + m2 * 10 - m3 * 30;
      var y = -16 + m1 * 20 + m2 * 12 + m3 * 8;
      var z = -140 + m1 * 74 + m2 * 150 - m3 * 66;
      c.camera.position.set(x, y, z);

      var visee = new THREE.Vector3(-6, 4, -4 + m2 * 10 - m3 * 30);
      c.camera.lookAt(visee);
      c.camera.rotation.z = Math.sin(t * 0.2) * 0.02 + m2 * 0.06;

      /* Les tuyères sont celles relevées sur chaque coque, et la
         poussée les allume toutes d'un seul réglage. */
      T.pousser(c.cargo, 0.75, t);
      T.pousser(c.corvette, 0.8, t);
      if (c.chasseurs) {
        c.chasseurs.forEach(function (g, i) {
          T.pousser(g, 0.9 + 0.3 * Math.sin(t * 1.4 + i), t);
        });
      }
    }
  });
})();
