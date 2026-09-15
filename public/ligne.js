/* =========================================================
   ACTE — LA LIGNE DE FEU
   ---------------------------------------------------------
   Le Silence par le travers, ses tourelles en action, les
   Sentinelles qui louvoient autour. C'est le seul acte du site
   où l'Ordre tire, et il vient après le convoi, l'extraction et
   la récupération : on se bat pour ce qu'on a déjà.

   Les traits partent des tourelles et suivent l'horloge, pas le
   défilement. Un tir qui reculerait à l'envers quand on remonte
   la page se remarquerait bien plus qu'un tir qui continue.
   ========================================================= */
(function () {
  'use strict';
  var T = window.ODN && window.ODN.travaux;
  if (!T || !window.ODN.acte) { return; }

  var PORTEE = 620;

  window.ODN.acte({
    id: 'ligne',
    champ: 54,
    souplesse: 7,

    monter: function (c) {
      T.etoiles(c, c.petit ? 900 : 2200, 900, 2800, 3.2, 0.5);

      /* ---- les traits ----
         Un trait est un fuseau étiré qui parcourt sa portée en
         boucle. Chacun part d'une tourelle, dans sa direction,
         avec sa propre cadence et son propre décalage. */
      var nb = c.petit ? 26 : 54;
      c.traits = [];
      /* Un trait de 0,4 d'épaisseur vu à trois cents unités fait
         moins d'un pixel : il ne se voyait pas du tout. Sur un
         bâtiment de 300, une batterie se lit à 1,7. */
      var geo = new THREE.CylinderGeometry(0.85, 0.85, 1, 6, 1, true);
      geo.rotateX(Math.PI / 2);
      for (var i = 0; i < nb; i++) {
        var ami = i < nb * 0.62;
        var m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
          /* Le tir adverse était bleu : hors charte. Un argent
             froid le distingue tout aussi bien du rouge de l'Ordre. */
          color: ami ? 0xff6a5a : 0xcfd6e2, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false
        }));
        m.userData = {
          ami: ami, phase: Math.random(),
          vitesse: 0.28 + Math.random() * 0.22,
          /* Des fuseaux de soixante se lisaient comme des barres
             tombant en travers du cadre, pas comme des coups. */
          longueur: 15 + Math.random() * 17,
          poste: (i * 7) % 8
        };
        c.scene.add(m);
        c.traits.push(m);
      }

      /* départs de coup : une lueur brève à la bouche */
      c.bouches = [];
      for (var b = 0; b < 8; b++) {
        var s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: T.halo(c), transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false
        }));
        s.scale.setScalar(12);
        c.scene.add(s);
        c.bouches.push(s);
      }

      /* Impacts sur la coque. C'étaient de simples halos qui
         grossissaient : ça se lisait comme une lampe, pas comme
         un coup au but. Ce sont maintenant de vraies explosions,
         avec cœur, boule de feu, anneau de souffle et éclats. */
      c.impacts = [];
      for (var k = 0; k < 4; k++) {
        /* Sur une coque de trois cents, un impact de treize ne se
           voit pas : il fallait le lire, pas le deviner. */
        var ex = T.explosion(c, 24);
        ex.userData.phase = Math.random() * 6.2832;
        ex.userData.rythme = 0.34 + Math.random() * 0.2;
        c.scene.add(ex);
        c.impacts.push(ex);
      }
    },

    approcher: function (c) {
      c.amiral = T.coque('javelin', 300, T.ARGENT, 0.4);
      c.amiral.position.set(0, 0, 0);
      c.amiral.rotation.y = 0.1;
      c.scene.add(c.amiral);

      /* Les postes de tir sont relevés sur la peau de la coque, en
         crête dorsale et ventrale, répartis sur sa longueur. Posés
         à la main ils tombaient à côté du bâtiment, et un trait qui
         part du vide ne se lit pas comme un tir. */
      c.amiral.userData.quandPret = function (n) {
        c.postesLocaux = n.userData.tourelles.map(function (v) { return v.clone(); });
        c.postes = c.postesLocaux.map(function (v) { return v.clone(); });
        c.caps = c.postesLocaux.map(function (p, i) {
          /* Chaque poste tire vers l'extérieur, du côté où il est,
             et vers le haut ou le bas selon sa position sur la
             coque : une bordée n'est pas un peigne parallèle. */
          return new THREE.Vector3(
            (i % 2 ? 1 : -1) * (0.7 + ((i * 3) % 4) / 10),
            (p.y > 0 ? 0.32 : -0.32) + ((i * 5) % 5) / 18 - 0.11,
            0.42 - ((i * 7) % 8) / 9
          ).normalize();
        });
      };

      /* ---- le plan d'échelle ----
         Aucun plan ne disait qu'un Javelin fait trois cent
         quarante-cinq mètres. Les Sentinelles qui louvoient au
         large ne le disent pas non plus : sans rien à côté d'elles,
         un chasseur lointain et un bâtiment lointain ont la même
         taille. Celle-ci rase la quille, du côté de l'objectif, de
         la poupe à la proue, pendant que la caméra remonte en sens
         inverse. C'est la coque qui sert de règle. */
      c.rase = T.coque('gladius', 20, T.BRAISE, 0.55, 'petit');
      c.rase.visible = false;
      c.scene.add(c.rase);
      var quandAmiral = c.amiral.userData.quandPret;
      c.amiral.userData.quandPret = function (n) {
        quandAmiral(n);
        var corps = n.children[0] && n.children[0].children[0];
        if (!corps) { return; }
        if (!corps.geometry.boundingBox) { corps.geometry.computeBoundingBox(); }
        c.gabarit = corps.geometry.boundingBox.clone();
        var k = n.userData.echelle || 1;
        c.gabarit.min.multiplyScalar(k);
        c.gabarit.max.multiplyScalar(k);
      };

      c.perte = T.explosion(c, 48);
      c.scene.add(c.perte);

      c.chasseurs = [];
      for (var i = 0; i < (c.petit ? 3 : 5); i++) {
        /* Niveau de détail choisi sur la taille apparente, pas sur
           celle de l'écran : au plus près, une Sentinelle fait cent
           deux pixels de haut ici. À pleine géométrie, cinq d'entre
           elles pesaient deux millions de triangles pour trois pour
           cent de l'image, soit quarante triangles par pixel. */
        var g = T.coque('gladius', 20, i % 2 ? T.ARGENT : T.BRAISE, 0.5, 'petit');
        g.userData.base = new THREE.Vector3(
          -120 + i * 62, -40 + ((i * 37) % 90), 120 - i * 58);
        g.userData.phase = i * 1.37;
        c.scene.add(g);
        c.chasseurs.push(g);
      }
    },

    jouer: function (c, avance, dt, t) {
      var P = c.palier;
      var veille = P(avance, 0.0, 0.22);
      var engage = P(avance, 0.2, 0.46);
      var plein = P(avance, 0.4, 0.72);
      var retrait = P(avance, 0.78, 1.0);
      var feu = Math.max(0, engage * (1 - retrait * 0.85));
      var intensite = (0.35 + plein * 0.65) * feu;

      if (c.postes && c.postes.length) {
        /* Les postes sont relus en repère monde : le bâtiment a un
           lacet, et une position locale posée telle quelle plaçait
           les départs de coup à côté de la coque. */
        c.amiral.updateMatrixWorld(true);
        for (var q = 0; q < c.postes.length; q++) {
          c.postes[q].copy(c.postesLocaux[q]);
          c.amiral.localToWorld(c.postes[q]);
        }
        /* les traits */
        c.traits.forEach(function (m) {
          var u = m.userData;
          var poste = c.postes[u.poste];
          var cap = c.caps[u.poste];
          var ami = u.ami;
          var av = ((t * u.vitesse + u.phase) % 1);
          var d = av * PORTEE;
          var base = ami ? poste : poste.clone().addScaledVector(cap, PORTEE);
          var sens = ami ? cap : cap.clone().negate();
          m.position.copy(base).addScaledVector(sens, d);
          m.lookAt(m.position.clone().add(sens));
          m.scale.set(1, 1, u.longueur);
          /* Un trait s'éteint en fin de course plutôt que de
             disparaître net au bord de la portée. */
          var voile = Math.min(1, av * 14) * Math.min(1, (1 - av) * 5);
          /* Un trait qui frôle l'objectif devient une barre qui
             barre l'écran : on l'efface quand il passe trop près. */
          var pres = m.position.distanceTo(c.camera.position);
          if (pres < 170) { voile *= Math.max(0, (pres - 40) / 130); }
          m.material.opacity = voile * intensite * (ami ? 0.95 : 0.7);
          m.visible = m.material.opacity > 0.02;
        });

        /* départs de coup, calés sur le passage des traits */
        /* Le départ de coup est ce qui rattache le trait à la
           coque : sans lui, on voit des traits passer, pas un
           bâtiment qui tire. */
        c.bouches.forEach(function (s, i) {
          if (i >= c.postes.length) { s.material.opacity = 0; return; }
          s.position.copy(c.postes[i]);
          var bat = Math.pow(Math.max(0, Math.sin(t * (5 + i * 0.7))), 6);
          s.material.opacity = Math.min(1, bat * intensite * 1.6);
          s.scale.setScalar(16 + bat * 26);
        });

        /* Ce qui arrive touche, et ça se voit : chaque impact
           joue un cycle d'explosion complet à son propre rythme. */
        c.impacts.forEach(function (ex, i) {
          var p2 = c.postes[i % c.postes.length];
          ex.position.set(p2.x * 1.15, p2.y * 1.2, p2.z - 30 + ((i * 53) % 120));
          /* Un impact n'est pas un métronome : il occupe un tiers
             du cycle et le reste du temps il n'y a rien. Sans ce
             temps mort, six explosions permanentes se lisaient
             comme un motif décoratif. */
          var cy = ((t * ex.userData.rythme + ex.userData.phase) % 1);
          var v = cy < 0.32 ? cy / 0.32 : 1;
          ex.userData.jouer(intensite > 0.06 ? v : 1, c.camera);
          ex.scale.setScalar(0.6 + intensite * 0.8);
        });
      }

      /* Une Sentinelle adverse qui ne repart pas : c'est ce qui
         donne son poids à la scène. Une seule, au plus fort. */
      if (c.perte) {
        var mort = P(avance, 0.52, 0.70);
        c.perte.position.set(148, 38, -40);
        c.perte.userData.jouer(mort, c.camera);
      }

      /* les chasseurs louvoient, cap tangent à leur course */
      if (c.chasseurs) {
        c.chasseurs.forEach(function (g) {
          var b = g.userData.base, ph = g.userData.phase;
          var w1 = t * 0.5 + ph, w2 = t * 0.36 + ph * 1.4;
          g.position.set(
            b.x + Math.sin(w1) * 46,
            b.y + Math.sin(w2) * 20,
            b.z + Math.cos(w1) * 58
          );
          g.rotation.y = Math.atan2(Math.cos(w1) * 0.5 * 46, -Math.sin(w1) * 0.5 * 58);
          g.rotation.z = -Math.sin(w1) * 0.8;
          g.rotation.x = Math.sin(w2) * 0.12;
        });
      }

      /* le plan d'échelle : tout est fonction du défilement */
      if (c.rase && c.gabarit && c.rase.userData.pret) {
        var g0 = c.gabarit;
        var passe = (avance - 0.2) / 0.42;
        var dansFenetre = passe > 0 && passe < 1;
        c.rase.visible = dansFenetre;
        if (dansFenetre) {
          /* Entrée et sortie loin des extrémités, en fondu : un
             chasseur qui surgit d'un coup au milieu du vide se
             remarque plus que la coque. */
          var voileR = P(passe, 0, 0.12) * (1 - P(passe, 0.88, 1));
          /* de 170 derrière la poupe à 170 devant la proue, un peu
             plus lent au milieu, là où la coque sert de règle */
          var zR = (g0.min.z - 170) + (g0.max.z - g0.min.z + 340) *
                   (passe * 1.35 - P(passe, 0, 1) * 0.35);
          /* Sous la quille, côté objectif. Posée devant le flanc,
             elle se perdait dans le détail des tôles : il lui faut
             le noir derrière elle et la coque juste au-dessus. */
          var local = new THREE.Vector3(
            g0.min.x * 0.45 - Math.sin(passe * Math.PI) * 6,
            g0.min.y - 9 + Math.sin(passe * 5.1) * 2,
            zR
          );
          c.amiral.updateMatrixWorld(true);
          c.rase.position.copy(c.amiral.localToWorld(local));
          c.rase.rotation.set(0, c.amiral.rotation.y, Math.sin(passe * 4.3) * 0.35);
          if (!c.rase.userData.bases) {
            c.rase.userData.bases = [];
            c.rase.traverse(function (o) {
              if (o.material && o.material.transparent) {
                c.rase.userData.bases.push([o.material, o.material.opacity]);
              }
            });
          }
          c.rase.userData.bases.forEach(function (b) { b[0].opacity = b[1] * voileR; });
          T.pousser(c.rase, 1.25 * voileR, t);
        }
      }

      T.pousser(c.amiral, 0.45 + plein * 0.4, t);
      if (c.chasseurs) {
        c.chasseurs.forEach(function (g, i) {
          T.pousser(g, 1.0 + 0.35 * Math.sin(t * 1.9 + i), t);
        });
      }

      /* caméra : elle remonte le flanc du bâtiment, passe sous la
         quille au plus fort, puis prend du champ */
      var m1 = P(avance, 0.0, 0.44);
      var m2 = P(avance, 0.38, 0.78);
      var m3 = P(avance, 0.74, 1.0);
      /* Elle longe le flanc sans jamais y entrer : le bâtiment
         fait 300 de long et 40 de large, on reste au large. */
      /* Assez loin pour voir le bâtiment entier ET les traits qui
         en partent. Trop près, on ne voyait que ceux qui frôlaient
         l'objectif, et un bâtiment de trois cents unités remplit
         vite le cadre. */
      c.camera.position.set(
        -430 + m1 * 110 - m2 * 40 + m3 * 220,
        -90 + m1 * 60 - m2 * 40 + m3 * 240,
        400 - m1 * 150 - m2 * 220 + m3 * 360
      );
      c.camera.lookAt(new THREE.Vector3(0, m2 * 14, 20 - m1 * 40 - m2 * 60));
      /* secousse : elle vient des batteries, donc elle suit le feu */
      var choc = intensite * 0.006;
      c.camera.rotation.x += Math.sin(t * 43) * choc;
      c.camera.rotation.z += Math.sin(t * 37 + 1.1) * choc + Math.sin(t * 0.24) * 0.014;
      void veille;
    }
  });
})();
