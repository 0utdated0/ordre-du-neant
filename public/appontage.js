/* =========================================================
   ACTE — L'APPONTAGE
   ---------------------------------------------------------
   Le Portefaix se pose sur un pont du Seuil. Train sorti,
   rétrofusées, poussière soulevée, feux de guidage.

   La descente est une fonction du défilement : on remonte, le
   vaisseau remonte. Seuls les feux de piste et le scintillement
   des fusées suivent l'horloge.
   ========================================================= */
(function () {
  'use strict';
  var T = window.ODN && window.ODN.travaux;
  if (!T || !window.ODN.acte) { return; }

  var SOL = 0;

  window.ODN.acte({
    id: 'appontage',
    champ: 48,
    souplesse: 7,

    monter: function (c) {
      T.etoiles(c, c.petit ? 700 : 1700, 900, 2800, 3.0, 0.45);

      /* ---- le pont ----
         Une plateforme d'appontage : tablier nervuré, garde-corps,
         marquage au sol, et la rangée de feux qui la borde. */
      c.pont = new THREE.Group();
      c.pont.position.y = SOL;
      c.scene.add(c.pont);

      var sombre = new THREE.MeshBasicMaterial({ color: 0x0b0c10, fog: true });
      var trait = new THREE.LineBasicMaterial({
        color: 0x868b95, transparent: true, opacity: 0.45,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: true
      });
      function bloc(geo, x, y, z, ry) {
        var g = new THREE.Group();
        g.add(new THREE.Mesh(geo, sombre));
        g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), trait));
        g.position.set(x, y, z); g.rotation.y = ry || 0;
        c.pont.add(g);
        return g;
      }

      bloc(new THREE.BoxGeometry(120, 4, 170), 0, -2, 0);
      for (var i = 0; i < 7; i++) {
        bloc(new THREE.BoxGeometry(112, 1.2, 2.4), 0, 0.4, -70 + i * 23);
      }
      /* cercle d'appontage */
      var anneau = new THREE.Mesh(
        new THREE.RingGeometry(26, 28, 64),
        new THREE.MeshBasicMaterial({
          color: 0xe01020, transparent: true, opacity: 0.55,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        })
      );
      anneau.rotation.x = -Math.PI / 2;
      anneau.position.y = 0.6;
      c.pont.add(anneau);
      c.anneau = anneau;

      /* mâts, cabines et bras de service en bordure */
      for (var s = -1; s <= 1; s += 2) {
        bloc(new THREE.BoxGeometry(9, 14, 22), s * 52, 5, -46);
        bloc(new THREE.BoxGeometry(5, 9, 12), s * 52, 15, -46);
        bloc(new THREE.BoxGeometry(3, 26, 3), s * 54, 11, 44);
        bloc(new THREE.BoxGeometry(16, 2.4, 2.4), s * 47, 23, 44);
        for (var j = 0; j < 4; j++) {
          bloc(new THREE.BoxGeometry(6, 5, 7), s * 50, 1.5, -10 + j * 21);
        }
      }

      /* ---- feux de piste ---- */
      var nb = 28;
      var fp = new Float32Array(nb * 3);
      c.phases = [];
      for (var k = 0; k < nb; k++) {
        var cote = k < nb / 2 ? -1 : 1;
        var u = (k % (nb / 2)) / (nb / 2 - 1);
        fp[k * 3] = cote * 56;
        fp[k * 3 + 1] = 1.2;
        fp[k * 3 + 2] = -78 + u * 156;
        c.phases.push(u);
      }
      var gf = new THREE.BufferGeometry();
      gf.setAttribute('position', new THREE.BufferAttribute(fp, 3));
      c.feux = new THREE.Points(gf, new THREE.PointsMaterial({
        color: 0xff4d4d, size: 6.5, sizeAttenuation: true, map: c.rond(),
        transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending
      }));
      c.pont.add(c.feux);

      /* ---- poussière soulevée ----
         Elle ne monte que quand les rétrofusées mordent le pont. */
      var np = c.petit ? 300 : 800;
      c.grains = [];
      var pp = new Float32Array(np * 3);
      for (var g2 = 0; g2 < np; g2++) {
        var a = Math.random() * 6.2832;
        c.grains.push([Math.cos(a), Math.sin(a), 0.2 + Math.random() * 1.6, Math.random()]);
      }
      var gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
      c.poudre = new THREE.Points(gg, new THREE.PointsMaterial({
        color: 0xcfa79a, size: 3.4, sizeAttenuation: true, map: c.rond(),
        transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
      }));
      c.pont.add(c.poudre);
    },

    approcher: function (c) {
      c.navire = T.coque('caterpillar', 62, T.ARGENT, 0.6);
      c.scene.add(c.navire);
      /* Les rétrofusées : quatre sprites sous la coque, orientés
         vers le pont. Ce sont elles qui posent le vaisseau. */
      c.retro = [];
      for (var i = 0; i < 4; i++) {
        var s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: T.halo(c), transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false
        }));
        s.position.set(i < 2 ? -9 : 9, -5, -18 + (i % 2) * 30);
        s.scale.setScalar(13);
        c.navire.add(s);
        c.retro.push(s);
      }
    },

    jouer: function (c, avance, dt, t) {
      var P = c.palier;
      var approche = P(avance, 0.0, 0.34);
      var descente = P(avance, 0.26, 0.74);
      var pose = P(avance, 0.66, 0.9);
      var repos = P(avance, 0.86, 1.0);

      if (c.navire) {
        /* De haut et de biais vers l'axe du pont, puis droit en bas. */
        /* Il se pose SUR le pont, pas dedans : le tablier est à
           zéro et la coque fait une douzaine d'unités de haut. */
        var h = 168 - descente * 148 - pose * 11;
        c.navire.position.set(
          (1 - descente) * 58,
          h,
          (1 - descente) * 96 - 4
        );
        c.navire.rotation.set(
          -0.16 * (1 - descente) + 0.02 * Math.sin(t * 0.7) * (1 - pose),
          -0.5 * (1 - descente),
          0.1 * (1 - descente) + 0.015 * Math.sin(t * 0.5) * (1 - pose)
        );
        /* Les moteurs principaux se coupent quand les rétrofusées
           prennent le relais : on ne se pose pas en poussant. */
        T.pousser(c.navire, Math.max(0, 0.85 - descente * 0.75) * (1 - repos), t);

        var freins = P(avance, 0.34, 0.6) * (1 - repos);
        c.retro.forEach(function (s, i) {
          var puls = 0.78 + 0.22 * Math.sin(t * 17 + i * 1.3);
          s.material.opacity = freins * puls;
          s.scale.setScalar(10 + freins * 16 * puls);
        });

        /* la poussière ne se lève que près du pont */
        var souffle = P(avance, 0.44, 0.78) * (1 - repos * 0.8);
        var gp = c.poudre.geometry.attributes.position.array;
        for (var i2 = 0; i2 < c.grains.length; i2++) {
          var g = c.grains[i2];
          var d = 8 + souffle * 74 * g[2];
          gp[i2 * 3] = g[0] * d;
          gp[i2 * 3 + 1] = 1 + souffle * 16 * g[3] * (1 - g[2] * 0.4);
          gp[i2 * 3 + 2] = g[1] * d;
        }
        c.poudre.geometry.attributes.position.needsUpdate = true;
        c.poudre.material.opacity = souffle * (1 - souffle * 0.55) * 1.4;
      }

      /* feux de piste : une onde qui court vers le cercle */
      var op = c.feux.geometry.attributes.position;
      c.feux.material.opacity = 0.55 + 0.45 * Math.abs(Math.sin(t * 2.2));
      void op;
      c.anneau.material.opacity = 0.3 + 0.4 * Math.abs(Math.sin(t * 1.6)) + pose * 0.3;
      c.anneau.scale.setScalar(1 + pose * 0.06);

      /* caméra : de loin et au-dessus, elle descend au niveau du
         pont à mesure que le vaisseau s'y pose */
      var m1 = P(avance, 0.0, 0.46);
      var m2 = P(avance, 0.4, 0.82);
      var m3 = P(avance, 0.78, 1.0);
      /* Beaucoup plus près : à deux cent dix d'un pont de cent
         vingt, le cargo n'était qu'un point au-dessus d'une
         maquette. La caméra suit la descente. */
      c.camera.position.set(
        -128 + m1 * 34 + m2 * 40 + m3 * 26,
        88 - m1 * 40 - m2 * 26 + m3 * 6,
        136 - m1 * 24 - m2 * 30 - m3 * 18
      );
      c.camera.lookAt(new THREE.Vector3(
        (1 - descente) * 26, 52 - descente * 44 - pose * 4, -4));
      c.camera.rotation.z += Math.sin(t * 0.27) * 0.014;
      void approche;
    }
  });
})();
