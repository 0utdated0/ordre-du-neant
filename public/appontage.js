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

  /* Trajectoire d'appontage (voir jouer). Le point de contrôle est
     aux trois quarts du trajet vu de dessus, et haut : départ en
     pente douce, arrivée à la verticale. */
  var DEPART = new THREE.Vector3(-64, 168, -108);
  var ARRIVEE = new THREE.Vector3(0, 9, -2);
  var CONTROLE = new THREE.Vector3(-16, 128, -28.5);
  var CAP = Math.atan2(ARRIVEE.x - DEPART.x, ARRIVEE.z - DEPART.z);

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
        color: 0xff4d4d, size: 3.4, sizeAttenuation: true, map: c.rond(),
        transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending
      }));
      c.pont.add(c.feux);

      /* ---- poussière soulevée ----
         Elle ne monte que quand les rétrofusées mordent le pont. */
      var np = c.petit ? 600 : 1700;
      c.grains = [];
      var pp = new Float32Array(np * 3);
      for (var g2 = 0; g2 < np; g2++) {
        var a = Math.random() * 6.2832;
        c.grains.push([Math.cos(a), Math.sin(a), 0.2 + Math.random() * 1.6, Math.random()]);
      }
      var gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
      c.poudre = new THREE.Points(gg, new THREE.PointsMaterial({
        color: 0xcfa79a, size: 1.5, sizeAttenuation: true, map: c.rond(),
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
      var descente = P(avance, 0.02, 0.74);
      var pose = P(avance, 0.66, 0.9);
      var repos = P(avance, 0.86, 1.0);

      if (c.navire) {
        /* De haut et de biais vers l'axe du pont, puis droit en bas. */
        /* Il se pose SUR le pont, pas dedans : le tablier est à
           zéro et la coque fait une douzaine d'unités de haut. */
        /* Il arrive de l'arrière-gauche et descend vers le cercle.
           Sa proue est en +Z : son cap doit suivre son déplacement,
           sinon il aborde le pont en marche arrière. */
        /* La trajectoire était une droite à cinquante degrés sous
           l'horizon, coque à plat : le cargo tombait presque à la
           verticale en crachant ses traînées vers l'arrière, en
           travers de sa route. C'est maintenant une courbe : il
           arrive en vol, presque à plat, et finit à la verticale
           au-dessus du cercle. Le cap horizontal ne change pas en
           route (le point de contrôle est sur la même droite vue
           de dessus), et la poussée principale suit l'alignement
           entre la proue et la route : elle s'éteint quand le
           cargo descend, les rétrofusées prennent le relais. */
        var s = descente;
        var courbe = function (u, cible) {
          var a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, d = u * u;
          return cible.set(
            a * DEPART.x + b * CONTROLE.x + d * ARRIVEE.x,
            a * DEPART.y + b * CONTROLE.y + d * ARRIVEE.y,
            a * DEPART.z + b * CONTROLE.z + d * ARRIVEE.z);
        };
        courbe(s, c.navire.position);
        c.navire.position.y -= pose * 1.5;
        var route = courbe(Math.min(1, s + 0.01), new THREE.Vector3())
          .sub(courbe(Math.max(0, s - 0.01), new THREE.Vector3()));
        var plat = Math.sqrt(route.x * route.x + route.z * route.z);
        var pente = Math.atan2(-route.y, plat);
        /* nez vers le bas, un peu, tant qu'il vole ; à plat pour se
           poser */
        var tangage = Math.min(pente * 0.4, 0.3) * (1 - pose);
        c.navire.rotation.set(
          tangage + 0.02 * Math.sin(t * 0.7) * (1 - pose),
          CAP * (1 - pose),
          -0.09 * (1 - s) + 0.015 * Math.sin(t * 0.5) * (1 - pose)
        );
        c.navire.updateMatrixWorld(true);
        var proue = new THREE.Vector3(0, 0, 1).transformDirection(c.navire.matrixWorld);
        var alignement = route.lengthSq() > 1e-6 ? Math.max(0, proue.dot(route.normalize())) : 1;
        c.alignement = alignement;
        T.pousser(c.navire, Math.max(0, 0.85 - s * 0.35) * Math.pow(alignement, 3) * (1 - repos), t);

        var freins = P(avance, 0.34, 0.6) * (1 - repos);
        c.retro.forEach(function (s, i) {
          var puls = 0.78 + 0.22 * Math.sin(t * 17 + i * 1.3);
          /* Des lueurs de vingt-six unités sous une coque de
             soixante-deux : on voyait quatre boules rouges, pas des
             rétrofusées. Plus petites, et plus vives au cœur. */
          s.material.opacity = freins * puls * 0.9;
          s.scale.setScalar(5 + freins * 7 * puls);
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
      /* La visée tirait vers le pont dès le début : le cargo, qui
         arrive de haut, restait hors du cadre pendant toute la
         première moitié de l'acte (mesuré : bord haut de l'image
         franchi à 45 % seulement). Elle suit maintenant le cargo,
         puis revient sur le pont quand il se pose. */
      var visee = new THREE.Vector3(
        (1 - descente) * -18, 52 - descente * 44 - pose * 4, -4);
      if (c.navire) { visee.lerp(c.navire.position, 0.5 * (1 - pose)); }
      c.camera.lookAt(visee);
      c.camera.rotation.z += Math.sin(t * 0.27) * 0.014;
      void approche;
    }
  });
})();
