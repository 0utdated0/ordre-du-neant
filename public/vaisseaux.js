/* =========================================================
   L'ORDRE DU NÉANT — les appareils
   ---------------------------------------------------------
   Un seul endroit décrit les silhouettes de la flotte. La
   table d'hologrammes les projette en fil de fer, l'Approche
   les fait voler en coque pleine : même géométrie, deux
   peintures.

   Deux couches. En haut, les silhouettes dessinées à la main :
   elles servent de repli et pour la station, qui n'a pas
   d'équivalent. En bas, les coques réelles, chargées par le
   réseau. Ce site n'est pas officiel : Star Citizen, les noms
   de vaisseaux et ces modèles appartiennent à Cloud Imperium
   Rights LLC.

   Chaque constructeur reçoit une fonction « peindre » et
   renvoie un groupe dont userData.moteurs liste les tuyères,
   pour que l'appelant y pose ce qu'il veut : un halo, une
   traînée, ou rien.
   ========================================================= */
(function (global) {
  'use strict';

  if (typeof THREE === 'undefined') { return; }

  var ARGENT = 0xeef0f4;
  var ROUGE = 0xe01020;

  function poser(g, x, y, z, rx, ry, rz) {
    g.position.set(x || 0, y || 0, z || 0);
    g.rotation.set(rx || 0, ry || 0, rz || 0);
    return g;
  }

  /* --- Corvette d'escorte --------------------------------- */
  function corvette(peindre) {
    var n = new THREE.Group();
    var moteurs = [];

    n.add(poser(peindre(new THREE.CylinderGeometry(0.42, 0.62, 5.2, 8), ARGENT, 0.9),
      0, 0, 0, Math.PI / 2, 0, 0));
    n.add(poser(peindre(new THREE.ConeGeometry(0.42, 1.8, 8), ARGENT, 1.0),
      0, 0, 3.4, -Math.PI / 2, 0, 0));
    n.add(poser(peindre(new THREE.SphereGeometry(0.46, 14, 10), ROUGE, 1.1), 0, 0.42, 1.55));

    for (var c = -1; c <= 1; c += 2) {
      n.add(poser(peindre(new THREE.BoxGeometry(3.1, 0.12, 1.5), ARGENT, 0.75),
        c * 1.8, -0.1, -0.5, 0, c * 0.34, c * 0.16));
      n.add(poser(peindre(new THREE.CylinderGeometry(0.28, 0.34, 2.3, 8), ARGENT, 0.85),
        c * 2.5, -0.1, -1.1, Math.PI / 2, 0, 0));
      n.add(poser(peindre(new THREE.CylinderGeometry(0.36, 0.2, 0.5, 8), ROUGE, 1.4),
        c * 2.5, -0.1, -2.4, Math.PI / 2, 0, 0));
      n.add(poser(peindre(new THREE.BoxGeometry(1.15, 0.09, 0.6), ARGENT, 0.7),
        c * 0.95, 0.12, 2.1, 0, -c * 0.5, 0));
      moteurs.push([c * 2.5, -0.1, -2.7, 0.42]);
    }

    n.add(poser(peindre(new THREE.CylinderGeometry(0.5, 0.26, 0.7, 8), ROUGE, 1.5),
      0, 0, -3.0, Math.PI / 2, 0, 0));
    n.add(poser(peindre(new THREE.BoxGeometry(0.1, 1.25, 1.5), ARGENT, 0.7),
      0, 0.8, -1.7, 0.22, 0, 0));
    moteurs.push([0, 0, -3.4, 0.6]);

    n.userData.moteurs = moteurs;
    n.userData.longueur = 7.6;
    return n;
  }

  /* --- Cargo lourd ---------------------------------------- */
  function cargo(peindre) {
    var n = new THREE.Group();
    var moteurs = [];

    n.add(peindre(new THREE.BoxGeometry(0.8, 0.8, 7.4), ARGENT, 0.75));
    n.add(poser(peindre(new THREE.BoxGeometry(1.5, 0.95, 1.6), ARGENT, 0.95), 0, 0.5, 3.3));
    n.add(poser(peindre(new THREE.BoxGeometry(1.1, 0.4, 0.3), ROUGE, 1.2), 0, 0.62, 4.1));

    for (var i = 0; i < 4; i++) {
      for (var c = -1; c <= 1; c += 2) {
        n.add(poser(peindre(new THREE.BoxGeometry(1.15, 1.0, 1.2), ARGENT, 0.6, 0.65),
          c * 1.05, 0, 1.6 - i * 1.4));
      }
      n.add(poser(peindre(new THREE.BoxGeometry(2.6, 0.1, 0.1), ARGENT, 0.5, 0.4),
        0, 0.58, 1.6 - i * 1.4));
    }

    for (var m = -1; m <= 1; m += 2) {
      n.add(poser(peindre(new THREE.CylinderGeometry(0.44, 0.5, 1.5, 10), ARGENT, 0.85),
        m * 1.05, 0, -3.5, Math.PI / 2, 0, 0));
      n.add(poser(peindre(new THREE.CylinderGeometry(0.5, 0.28, 0.6, 10), ROUGE, 1.5),
        m * 1.05, 0, -4.4, Math.PI / 2, 0, 0));
      moteurs.push([m * 1.05, 0, -4.8, 0.62]);
    }

    n.add(poser(peindre(new THREE.BoxGeometry(0.08, 1.9, 2.2), ARGENT, 0.55), 0, 1.3, -1.4));

    n.userData.moteurs = moteurs;
    n.userData.longueur = 9.6;
    return n;
  }

  /* --- Foreuse -------------------------------------------- */
  function foreuse(peindre) {
    var n = new THREE.Group();
    var moteurs = [];

    var ventre = poser(peindre(new THREE.SphereGeometry(1.5, 16, 12), ARGENT, 0.8), 0, 0, -0.4);
    ventre.scale.set(1, 0.85, 1.55);
    n.add(ventre);

    n.add(poser(peindre(new THREE.CylinderGeometry(0.5, 0.75, 1.9, 10), ARGENT, 0.85),
      0, 0.1, 1.8, Math.PI / 2, 0, 0));
    n.add(poser(peindre(new THREE.ConeGeometry(0.85, 1.5, 12), ROUGE, 1.3),
      0, 0.1, 3.1, -Math.PI / 2, 0, 0));
    n.add(poser(peindre(new THREE.TorusGeometry(0.72, 0.09, 8, 20), ROUGE, 1.5), 0, 0.1, 2.6));

    for (var c = -1; c <= 1; c += 2) {
      n.add(poser(peindre(new THREE.BoxGeometry(1.7, 0.16, 0.16), ARGENT, 0.7),
        c * 1.6, 0.35, 1.5, 0, 0, c * 0.3));
      n.add(poser(peindre(new THREE.BoxGeometry(1.3, 0.14, 0.14), ARGENT, 0.7),
        c * 2.4, 0.05, 2.1, 0, c * 0.55, c * -0.2));
      n.add(poser(peindre(new THREE.CylinderGeometry(0.52, 0.52, 2.2, 10), ARGENT, 0.65),
        c * 1.85, -0.35, -0.9, Math.PI / 2, 0, 0));
      n.add(poser(peindre(new THREE.CylinderGeometry(0.34, 0.2, 0.55, 8), ROUGE, 1.4),
        c * 1.0, -0.15, -2.6, Math.PI / 2, 0, 0));
      moteurs.push([c * 1.0, -0.15, -2.9, 0.4]);
    }

    n.add(poser(peindre(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), ARGENT, 0.6), 0, 1.15, -0.8));

    n.userData.moteurs = moteurs;
    n.userData.longueur = 6.4;
    return n;
  }

  /* --- Station d'attache ----------------------------------
     Redessinée d'après les stations orbitales de Star Citizen
     (Everus Harbor, Port Tressler) : un fût incliné, un moyeu
     d'anneaux empilés, deux plateaux elliptiques, de longs bras
     d'amarrage terminés en croix, une grappe de réservoirs et de
     grands panneaux plats.

     Le niveau de détail compte autant que la forme : à côté de
     coques à onze mille triangles, une station faite de six
     volumes faisait tache. Celle-ci en aligne près de cent, pour
     que le fil de fer ait la même densité que le reste. */
  function station(peindre, force) {
    var n = new THREE.Group();
    var A = ARGENT, R = ROUGE;
    var i, c, a, b;

    /* La table d'hologrammes peint en additif : quatre-vingts
       volumes aux intensités écrites pour une coque pleine y
       saturent en blanc. L'appelant peut tout atténuer d'un coup
       plutôt que de doubler les réglages pièce par pièce. */
    if (force !== undefined) {
      var brut = peindre;
      peindre = function (geo, teinte, intensite, aretes) {
        return brut(geo, teinte,
          (intensite === undefined ? 0.6 : intensite) * force,
          (aretes === undefined ? 0.5 : aretes) * force);
      };
    }

    /* ---- fût central, en tronçons avec colliers ---- */
    for (i = 0; i < 8; i++) {
      n.add(poser(peindre(new THREE.CylinderGeometry(0.4, 0.4, 0.78, 12), A, 0.78),
        0, -3.1 + i * 0.86, 0));
      n.add(poser(peindre(new THREE.CylinderGeometry(0.49, 0.49, 0.1, 12), A, 0.62, 0.5),
        0, -2.7 + i * 0.86, 0));
    }
    /* coiffe et embase */
    n.add(poser(peindre(new THREE.ConeGeometry(0.4, 0.8, 12), A, 0.85), 0, 3.85, 0));
    n.add(poser(peindre(new THREE.CylinderGeometry(0.62, 0.4, 0.5, 12), A, 0.8), 0, -3.6, 0));

    /* ---- moyeu : trois anneaux empilés, comme sur Tressler ---- */
    [[1.05, 0.085, -0.5], [1.38, 0.1, -0.08], [1.0, 0.07, 0.34]].forEach(function (o) {
      n.add(poser(peindre(new THREE.TorusGeometry(o[0], o[1], 8, 26), A, 0.72),
        0, o[2], 0, Math.PI / 2, 0, 0));
    });
    /* contreforts du moyeu */
    for (i = 0; i < 8; i++) {
      a = (i / 8) * Math.PI * 2;
      n.add(poser(peindre(new THREE.BoxGeometry(0.11, 0.9, 0.11), A, 0.6, 0.45),
        Math.cos(a) * 1.2, -0.08, Math.sin(a) * 1.2, 0, -a, 0));
    }

    /* ---- deux plateaux elliptiques, légèrement décalés ---- */
    [[2.85, 0.13, 0.12, 0.0], [2.25, 0.11, -0.46, 0.4]].forEach(function (p, k) {
      var pl = poser(peindre(new THREE.CylinderGeometry(p[0], p[0] * 0.94, p[1], 22, 1), A, 0.66, 0.45),
        0, p[2], 0, 0, p[3], 0);
      n.add(pl);
      /* nervures radiales : ce sont elles qui donnent la lecture */
      for (i = 0; i < 12; i++) {
        a = (i / 12) * Math.PI * 2 + p[3];
        n.add(poser(peindre(new THREE.BoxGeometry(p[0] * 0.8, 0.055, 0.14), A, 0.5, 0.38),
          Math.cos(a) * p[0] * 0.5, p[2] + p[1] * 0.6, Math.sin(a) * p[0] * 0.5, 0, -a, 0));
      }
      /* jante */
      n.add(poser(peindre(new THREE.TorusGeometry(p[0] * 0.99, 0.045, 6, 34),
        k === 0 ? A : A, 0.55), 0, p[2], 0, Math.PI / 2, 0, 0));
    });

    /* ---- anneau d'habitation en rotation, avec ses modules ----
       Il est rassemblé dans son propre groupe et signalé dans
       userData : l'Approche le fait tourner, et elle ne doit pas
       avoir à deviner lequel des quatre-vingts volumes c'est. */
    var couronne = new THREE.Group();
    n.add(couronne);
    couronne.add(poser(peindre(new THREE.TorusGeometry(3.35, 0.16, 8, 44), A, 0.7),
      0, 0.95, 0, Math.PI / 2, 0, 0));
    for (i = 0; i < 14; i++) {
      a = (i / 14) * Math.PI * 2;
      couronne.add(poser(peindre(new THREE.BoxGeometry(0.42, 0.3, 0.26), A, 0.62),
        Math.cos(a) * 3.35, 0.95, Math.sin(a) * 3.35, 0, -a, 0));
      if (i % 2 === 0) {
        couronne.add(poser(peindre(new THREE.BoxGeometry(0.06, 0.06, 1.9), A, 0.42, 0.3),
          Math.cos(a) * 2.5, 0.6, Math.sin(a) * 2.5, 0, -a + Math.PI / 2, 0.42));
      }
    }

    /* ---- quatre bras d'amarrage, terminés en croix ---- */
    for (i = 0; i < 4; i++) {
      a = (i / 4) * Math.PI * 2 + Math.PI / 8;
      var dx = Math.cos(a), dz = Math.sin(a);
      var yb = i % 2 ? 0.3 : -0.55;
      /* poutre principale */
      n.add(poser(peindre(new THREE.BoxGeometry(0.15, 0.15, 3.4), A, 0.6),
        dx * 3.3, yb, dz * 3.3, 0, -a + Math.PI / 2, 0));
      /* entretoises */
      for (c = -1; c <= 1; c += 2) {
        n.add(poser(peindre(new THREE.BoxGeometry(0.055, 0.055, 1.7), A, 0.42, 0.32),
          dx * 2.9 + -dz * c * 0.18, yb + 0.1, dz * 2.9 + dx * c * 0.18,
          0, -a + Math.PI / 2, c * 0.1));
      }
      /* noeud d'amarrage : trois barres croisées */
      var bx = dx * 5.1, bz = dz * 5.1;
      n.add(poser(peindre(new THREE.BoxGeometry(0.22, 0.22, 0.75), A, 0.8),
        bx, yb, bz, 0, -a + Math.PI / 2, 0));
      n.add(poser(peindre(new THREE.BoxGeometry(1.25, 0.09, 0.14), A, 0.62),
        bx, yb, bz, 0, -a + Math.PI / 2, 0));
      n.add(poser(peindre(new THREE.BoxGeometry(0.14, 0.09, 1.25), A, 0.62),
        bx, yb, bz, 0, -a + Math.PI / 2, 0));
      n.add(poser(peindre(new THREE.BoxGeometry(0.1, 0.9, 0.1), A, 0.55, 0.4), bx, yb, bz));
      /* feu de position */
      n.add(poser(peindre(new THREE.SphereGeometry(0.075, 8, 6), R, 2.2, 0),
        dx * 5.55, yb, dz * 5.55));
    }

    /* ---- bloc d'habitation : la longue nacelle de Tressler ---- */
    var nacelle = new THREE.Group();
    /* Capsule fermée : elle empile ses deux faces à chaque pixel,
       donc elle se peint bas, sinon elle vire au bloc blanc. */
    nacelle.add(poser(peindre(new THREE.CylinderGeometry(0.34, 0.34, 2.9, 14), A, 0.3, 0.55),
      0, 0, 0, Math.PI / 2, 0, 0));
    for (c = -1; c <= 1; c += 2) {
      nacelle.add(poser(peindre(new THREE.SphereGeometry(0.34, 14, 8), A, 0.28, 0.5), 0, 0, c * 1.45));
    }
    for (i = 0; i < 5; i++) {
      nacelle.add(poser(peindre(new THREE.BoxGeometry(0.52, 0.07, 0.16), R, 1.3, 0.2),
        0, 0.3, -1.05 + i * 0.52));
      nacelle.add(poser(peindre(new THREE.TorusGeometry(0.36, 0.035, 6, 16), A, 0.55),
        0, 0, -1.05 + i * 0.52));
    }
    poser(nacelle, 1.35, 1.9, 0, 0, 0, -0.55);
    n.add(nacelle);
    n.add(poser(peindre(new THREE.BoxGeometry(0.12, 1.3, 0.12), A, 0.6), 0.72, 1.2, 0, 0, 0, -0.55));

    /* ---- grappe de réservoirs, sous le moyeu ---- */
    for (i = 0; i < 4; i++) {
      n.add(poser(peindre(new THREE.SphereGeometry(0.26, 12, 9), A, 0.72),
        -0.05, -1.5 - i * 0.52, 0.55));
      n.add(poser(peindre(new THREE.TorusGeometry(0.27, 0.03, 6, 14), A, 0.5),
        -0.05, -1.5 - i * 0.52, 0.55, Math.PI / 2, 0, 0));
    }
    n.add(poser(peindre(new THREE.BoxGeometry(0.08, 2.3, 0.08), A, 0.55), -0.05, -2.28, 0.55));

    /* ---- panneaux plats : radiateurs et capteurs ---- */
    for (c = -1; c <= 1; c += 2) {
      /* Une plaque plate vue de biais renvoie toute sa surface
         d'un coup : elle se peint bien plus bas que le reste. */
      n.add(poser(peindre(new THREE.BoxGeometry(2.6, 0.04, 1.0), A, 0.2, 0.42),
        c * 1.9, 2.5, c * 0.7, c * 0.3, 0, c * 0.22));
      for (i = 0; i < 4; i++) {
        n.add(poser(peindre(new THREE.BoxGeometry(2.6, 0.05, 0.05), A, 0.38, 0.3),
          c * 1.9, 2.52, c * 0.7 - 0.4 + i * 0.27, c * 0.3, 0, c * 0.22));
      }
      n.add(poser(peindre(new THREE.BoxGeometry(0.09, 0.09, 1.1), A, 0.55),
        c * 0.75, 2.35, c * 0.28, 0, -c * 1.2, 0));
    }

    /* ---- antennes et parabole ---- */
    n.add(poser(peindre(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 6), A, 0.6), 0.18, 4.6, 0.1));
    n.add(poser(peindre(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), A, 0.5), -0.2, 4.3, -0.14));
    n.add(poser(peindre(new THREE.SphereGeometry(0.1, 10, 7), R, 1.8, 0), 0.18, 5.45, 0.1));
    var dish = poser(peindre(new THREE.SphereGeometry(0.5, 16, 8, 0, 6.2832, 0, 1.0), A, 0.6),
      -1.15, -1.1, -0.65, 2.1, 0, 0.5);
    n.add(dish);
    n.add(poser(peindre(new THREE.BoxGeometry(0.07, 0.07, 0.8), A, 0.5), -0.75, -1.0, -0.4, 0, 0.9, 0.6));

    /* ---- feux de balisage le long du fût ---- */
    for (i = 0; i < 5; i++) {
      n.add(poser(peindre(new THREE.SphereGeometry(0.055, 8, 6), R, 2.0, 0),
        0.42, -2.6 + i * 1.3, 0.16));
    }

    /* Recentrée : le fût monte plus haut que la grappe ne descend,
       et sans ce rattrapage elle sort du cadre par le haut. */
    n.children.forEach(function (o) { o.position.y -= 1.05; });

    n.userData.anneau = couronne;
    n.userData.moteurs = [];
    n.userData.longueur = 8;
    return n;
  }


  /* --- Porte-Néant : le bâtiment de ligne ----------------- */
  /* Trois fois la longueur du cargo. Ce qui fait lire « gros »,
     ce n'est pas l'échelle, c'est le nombre de détails alignés
     le long de la coque : on compare, donc on mesure. */
  function porteNeant(peindre) {
    var n = new THREE.Group();
    var moteurs = [];

    /* coque principale, en trois tronçons */
    n.add(poser(peindre(new THREE.BoxGeometry(5.4, 2.7, 11), ARGENT, 0.8), 0, 0, -1));
    n.add(poser(peindre(new THREE.BoxGeometry(4.2, 2.2, 5.5), ARGENT, 0.85), 0, 0, 6.6));
    n.add(poser(peindre(new THREE.CylinderGeometry(1.5, 2.6, 4, 8), ARGENT, 0.95),
      0, 0, 11, -Math.PI / 2, 0, 0));

    /* étrave */
    n.add(poser(peindre(new THREE.ConeGeometry(1.5, 3.4, 8), ARGENT, 1.0),
      0, 0, 14.6, -Math.PI / 2, 0, 0));

    /* château arrière et passerelle */
    n.add(poser(peindre(new THREE.BoxGeometry(3, 1.6, 3.4), ARGENT, 0.85), 0, 2.1, -3.4));
    n.add(poser(peindre(new THREE.BoxGeometry(2.2, 1, 2.2), ARGENT, 0.9), 0, 3.3, -2.9));
    n.add(poser(peindre(new THREE.BoxGeometry(1.7, 0.42, 0.28), ROUGE, 1.4), 0, 3.45, -1.75));

    /* hangars latéraux, ouverts et éclairés */
    for (var c = -1; c <= 1; c += 2) {
      n.add(poser(peindre(new THREE.BoxGeometry(0.5, 1.5, 4.4), ROUGE, 1.1), c * 2.75, -0.2, 2.2));
      n.add(poser(peindre(new THREE.BoxGeometry(0.3, 2.1, 5.2), ARGENT, 0.7), c * 2.95, -0.2, 2.2));

      /* pylônes et coques secondaires */
      n.add(poser(peindre(new THREE.BoxGeometry(2.6, 0.5, 0.9), ARGENT, 0.65), c * 4, -0.9, -1.6));
      n.add(poser(peindre(new THREE.CylinderGeometry(0.85, 1, 7, 8), ARGENT, 0.75),
        c * 5.5, -1.1, -1.6, Math.PI / 2, 0, 0));
      n.add(poser(peindre(new THREE.ConeGeometry(0.85, 2, 8), ARGENT, 0.85),
        c * 5.5, -1.1, 2.4, -Math.PI / 2, 0, 0));

      /* tourelles alignées : elles donnent l'échelle */
      for (var k = 0; k < 5; k++) {
        n.add(poser(peindre(new THREE.CylinderGeometry(0.3, 0.38, 0.4, 8), ARGENT, 0.8),
          c * 1.9, 1.5, 7.2 - k * 2.5));
      }

      /* radiateurs */
      n.add(poser(peindre(new THREE.BoxGeometry(0.1, 3.2, 3.6), ARGENT, 0.5),
        c * 2, 2.1, -6.2, 0.2, 0, c * 0.25));

      /* tuyères secondaires */
      n.add(poser(peindre(new THREE.CylinderGeometry(0.62, 0.42, 1.2, 10), ROUGE, 1.5),
        c * 5.5, -1.1, -5.6, Math.PI / 2, 0, 0));
      moteurs.push([c * 5.5, -1.1, -6.3, 0.8]);
    }

    /* bloc propulsif principal, quatre tuyères */
    n.add(poser(peindre(new THREE.BoxGeometry(5, 2.6, 2.6), ARGENT, 0.8), 0, 0, -7.4));
    for (var a = -1; a <= 1; a += 2) {
      for (var b = -1; b <= 1; b += 2) {
        n.add(poser(peindre(new THREE.CylinderGeometry(1, 0.62, 1.6, 12), ROUGE, 1.6),
          a * 1.5, b * 0.85, -9, Math.PI / 2, 0, 0));
        moteurs.push([a * 1.5, b * 0.85, -9.9, 1.15]);
      }
    }

    /* mâts */
    n.add(poser(peindre(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), ARGENT, 0.6), 0, 4.6, -2.9));

    n.userData.moteurs = moteurs;
    n.userData.longueur = 28;
    return n;
  }


  /* =========================================================
     LES COQUES RÉELLES
     ---------------------------------------------------------
     Les silhouettes ci-dessus restent la solution de repli : si
     une coque ne se charge pas, l'acte tourne quand même.

     Les coques ci-dessous sont les maillages du holoviewer de
     Roberts Space Industries, décimés et remis à l'échelle. Ce
     site n'est pas officiel et n'est affilié à personne. Star
     Citizen, les noms de vaisseaux et ces modèles appartiennent
     à Cloud Imperium Rights LLC.

     Chaque entrée ne porte que ce dont les actes ont besoin tout
     de suite : la longueur réelle en mètres et la position des
     tuyères, relevée sur le maillage. La géométrie, elle, arrive
     par le réseau.
     ========================================================= */
  var COQUES = {
    javelin: { longueur: 345, moteurs: [
      [-31.862, 13.165, -164.471, 7.734],
      [-33.623, -12.056, -164.523, 7.537],
      [-20.553, -21.355, -164.143, 6.886],
      [-20.455, 20.798, -164.354, 7.042],
      [20.842, 21.455, -164.219, 6.385],
      [28.288, -15.096, -164.312, 7.389]
    ] },
    idris: { longueur: 239, moteurs: [
      [-0.478, -2.026, -112.295, 4.291],
      [0.625, -3.052, -109.765, 2.868],
      [9.151, 4.308, -111.249, 3.679],
      [-8.035, 6.043, -111.35, 2.868],
      [-12.264, 2.952, -109.662, 2.868],
      [8.595, 0.582, -111.808, 2.868]
    ] },
    perseus: { longueur: 180, moteurs: [
      [29.389, 3.697, -82.774, 4.705],
      [-29.25, 3.743, -82.823, 4.102],
      [-25.882, -9.369, -84.652, 3.632],
      [26.13, -9.331, -84.623, 3.499],
      [19.925, 4.582, -81.771, 3.402],
      [-19.995, 4.672, -81.812, 3.402]
    ] },
    orion: { longueur: 170, moteurs: [
      [15.161, 7.803, -80.005, 3.511],
      [15.32, -7.773, -80.153, 3.303],
      [-15.724, 7.879, -79.594, 3.413],
      [-13.184, -6.8, -80.128, 3.315],
      [-17.266, -8.23, -80.311, 2.947],
      [-11.612, 5.994, -80.298, 2.04]
    ] },
    polaris: { longueur: 155, moteurs: [
      [25.428, 11.879, -72.321, 5.411],
      [-24.274, 11.47, -72.611, 5.451],
      [-23.903, -11.092, -72.508, 5.59],
      [25.262, -10.65, -72.702, 5.916],
      [25.988, 0.923, -70.132, 4.91]
    ] },
    reclaimer: { longueur: 155, moteurs: [
      [0.111, 17.799, -76.184, 2.904],
      [-0.05, -1.626, -71.108, 2.879],
      [0.689, 9.269, -75.913, 3.384],
      [-6.921, -0.589, -71.019, 2.303],
      [6.766, -0.793, -71.13, 2.574],
      [-8.121, 7.558, -71.818, 1.911]
    ] },
    caterpillar: { longueur: 111, moteurs: [
      [7.537, 2.123, -52.414, 2.178],
      [-0.965, 2.194, -52.29, 2.175],
      [-2.832, 3.992, -51.945, 2.175],
      [5.907, 4.244, -52.364, 2.122],
      [7.959, 4.994, -52.544, 2.016],
      [-0.727, 5.123, -52.92, 1.966]
    ] },
    hammerhead: { longueur: 110, moteurs: [
      [-29.121, -3.146, -48.961, 2.674],
      [-22.571, -3.113, -48.962, 2.674],
      [29.13, -3.221, -48.962, 2.674],
      [22.564, -3.155, -48.964, 2.674],
      [2.447, -1.095, -52.426, 4.234],
      [-5.534, -2.638, -52.193, 4.4]
    ] },
    gladius: { longueur: 20, moteurs: [
      [-2.014, -0.241, -9.506, 0.478],
      [-1.198, 0.074, -9.6, 0.381],
      [2.083, -0.173, -9.667, 0.31],
      [1.164, 0.098, -9.728, 0.336],
      [-1.085, -0.294, -9.22, 0.264],
      [2.77, -0.513, -9.683, 0.264]
    ] }
  };

  /* Construit une coque réelle. Le groupe est rendu tout de suite,
     avec ses tuyères et sa longueur : les actes peuvent poser
     leurs halos et calculer leurs cadrages sans attendre. La
     géométrie s'y ajoute quand elle arrive, et userData.quandPret
     permet à l'appelant de faire ce qu'il doit refaire ensuite. */
  function coqueReelle(nomCoque, peindre, longueurVoulue, teinte, intensite, opaciteAretes) {
    var d = COQUES[nomCoque];
    var n = new THREE.Group();
    var k = longueurVoulue / d.longueur;

    n.userData.longueur = longueurVoulue;
    n.userData.coque = nomCoque;
    n.userData.moteurs = d.moteurs.map(function (m) {
      return [m[0] * k, m[1] * k, m[2] * k, m[3] * k];
    });

    var charger = (global.ODN && global.ODN.coque)
      ? global.ODN.coque(nomCoque)
      : Promise.reject(new Error('chargeur de coques absent'));

    n.userData.quandPret = charger.then(function (geo) {
      /* Les silhouettes dessinées à la main avaient deux cents
         arêtes, ces coques en ont dix mille. À la même opacité,
         le fil de fer s'empile en tache blanche : il faut peindre
         beaucoup plus discrètement. */
      var g = peindre(geo, teinte === undefined ? ARGENT : teinte,
                      intensite === undefined ? 0.55 : intensite,
                      opaciteAretes === undefined ? 0.26 : opaciteAretes);
      g.scale.setScalar(k);
      n.add(g);
      /* On rend le groupe peint, pas le porteur : l'appelant veut
         relever les matières de la coque seule, sans ramasser les
         halos qu'il a posés entre-temps. */
      return g;
    });
    /* Une promesse rejetée sans preneur remonte dans la console du
       visiteur. L'acte, lui, se contente d'un groupe vide. */
    n.userData.quandPret.catch(function () { return null; });

    return n;
  }

  function fabrique(nomCoque, longueur, reglages) {
    var r = reglages || {};
    return function (peindre, teinte, intensite, opaciteAretes) {
      return coqueReelle(nomCoque, peindre, longueur, teinte,
        intensite === undefined ? r.intensite : intensite,
        opaciteAretes === undefined ? r.aretes : opaciteAretes);
    };
  }

  /* Sur la table d'hologrammes, chaque appareil doit remplir le
     socle : à l'échelle réelle, la Sentinelle serait un point à
     côté du Silence. On garde l'ordre des tailles sans en garder
     le rapport, et la fiche donne la longueur exacte. */
  /* L'hologramme peint un volume additif double face. Sur les
     silhouettes primitives d'origine, une vingtaine de pièces
     s'additionnaient ; ici ce sont onze mille triangles, et à la
     même force la projection vire au blanc plein. */
  function pourLaTable(nomCoque) {
    var L = COQUES[nomCoque].longueur;
    return fabrique(nomCoque, 9.2 * Math.pow(L / 345, 0.22),
      { intensite: 0.028, aretes: 0.075 });
  }

  /* Les noms d'appel restent ceux des actes : ils décrivent un
     rôle dans le récit, pas un modèle. */
  var corvetteReelle   = fabrique('polaris',     7.6);
  var canonniereReelle = fabrique('perseus',     8.2);
  var foreuseLourde    = fabrique('orion',       9.0);
  var cargoReel        = fabrique('caterpillar', 9.6);
  var foreuseReelle    = fabrique('reclaimer',   6.4);
  var porteNeantReel   = fabrique('javelin',    28.0);
  var chasseurReel     = fabrique('gladius',     2.4);
  var fregateReelle    = fabrique('idris',      18.0);

  /* --- Fiches, pour la table d'hologrammes ---------------- */
  var FICHES = [
    {
      cle: 'porteNeant', nom: 'Le Silence', classe: 'Porte-Néant',
      division: 'Commandement', construire: pourLaTable('javelin'), echelle: 1,
      fiche: [
        ['Modèle', 'Aegis Javelin'],
        ['Rôle', 'Bâtiment de ligne, franchissement'],
        ['Équipage', '80 et plus'],
        ['Longueur', '345 m']
      ],
      texte: "Le bâtiment amiral. On ne le sort pas pour une escorte : on le sort quand il faut franchir un point de saut et que personne ne doit revenir en arrière."
    },
    {
      cle: 'fregate', nom: "L'Écueil", classe: 'Frégate',
      division: 'Combat et Sécurité', construire: pourLaTable('idris'), echelle: 1,
      fiche: [
        ['Modèle', 'Aegis Idris-P'],
        ['Rôle', 'Patrouille lourde, appui'],
        ['Équipage', '10 à 16'],
        ['Longueur', '239 m']
      ],
      texte: "Le poing de l'Ordre. Un pont de commandement, un hangar, assez d'artillerie pour tenir un secteur seule le temps que le reste arrive."
    },
    {
      cle: 'corvette', nom: 'Le Passeur', classe: "Corvette d'escorte",
      division: 'Combat et Sécurité', construire: pourLaTable('polaris'), echelle: 1,
      fiche: [
        ['Modèle', 'RSI Polaris'],
        ['Rôle', 'Escorte, interception'],
        ['Équipage', '6 à 10'],
        ['Longueur', '155 m']
      ],
      texte: "Rapide pour sa masse, conçu pour tenir la distance autour d'un convoi plutôt que pour engager seul. Il escorte, il dissuade, il rentre."
    },
    {
      cle: 'canonniere', nom: 'Le Rempart', classe: 'Canonnière',
      division: 'Combat et Sécurité', construire: pourLaTable('perseus'), echelle: 1,
      fiche: [
        ['Modèle', 'RSI Perseus'],
        ['Rôle', 'Défense de convoi, chasse aux gros'],
        ['Équipage', '4 à 6'],
        ['Longueur', '180 m']
      ],
      texte: "Quatre tourelles de gros calibre et rien d'autre. Elle ne poursuit personne : elle se place entre le convoi et ce qui arrive, et elle attend."
    },
    {
      cle: 'cargo', nom: 'Le Portefaix', classe: 'Cargo modulaire',
      division: 'Logistique et Industrie', construire: pourLaTable('caterpillar'), echelle: 1,
      fiche: [
        ['Modèle', 'Drake Caterpillar'],
        ['Rôle', 'Fret, ravitaillement'],
        ['Équipage', '3 à 6'],
        ['Longueur', '111 m']
      ],
      texte: "L'épine dorsale des opérations de l'Ordre. Lent, vulnérable, indispensable. Rien ne se construit sans ce qu'il transporte."
    },
    {
      cle: 'foreuse', nom: 'La Carrière', classe: 'Plateforme de récupération',
      division: 'Extraction', construire: pourLaTable('reclaimer'), echelle: 1,
      fiche: [
        ['Modèle', 'Aegis Reclaimer'],
        ['Rôle', 'Récupération, découpe'],
        ['Équipage', '4 à 6'],
        ['Longueur', '155 m']
      ],
      texte: "Bras de découpe, salle de traitement, deux soutes. Elle passe des heures accrochée à une épave, et c'est ce qui paie les autres."
    },
    {
      cle: 'foreuse-lourde', nom: 'Le Gisement', classe: 'Plateforme de forage',
      division: 'Extraction', construire: pourLaTable('orion'), echelle: 1,
      fiche: [
        ['Modèle', 'RSI Orion'],
        ['Rôle', 'Forage, raffinage embarqué'],
        ['Équipage', '5 à 7'],
        ['Longueur', '170 m']
      ],
      texte: "Tête de forage à l'avant, raffinerie au milieu, soutes derrière. Elle entre dans une ceinture d'astéroïdes et n'en ressort qu'une fois pleine."
    },
    {
      cle: 'chasseur', nom: 'La Sentinelle', classe: 'Chasseur léger',
      division: 'Combat et Sécurité', construire: pourLaTable('gladius'), echelle: 1,
      fiche: [
        ['Modèle', 'Aegis Gladius'],
        ['Rôle', 'Interception, reconnaissance'],
        ['Équipage', '1'],
        ['Longueur', '20 m']
      ],
      texte: "Un pilote, deux canons, rien à perdre. C'est le premier appareil qu'un Adepte pilote pour l'Ordre, et souvent celui qu'il regrette."
    },
    {
      cle: 'station', nom: 'Le Seuil', classe: "Station d'attache",
      division: 'Commandement', construire: function (p) { return station(p, 0.12); }, echelle: 0.5,
      fiche: [
        ['Modèle', "Conception propre à l'Ordre"],
        ['Rôle', 'Amarrage, réunion, dépôt'],
        ['Équipage', 'Variable'],
        ['Envergure', '268 m']
      ],
      texte: "Le point de ralliement. Fût incliné, moyeu d'anneaux empilés, anneau d'habitation en rotation, quatre bras d'amarrage. On y entre, on y repart : tout n'est que passage."
    }
  ];

  global.ODN = global.ODN || {};
  global.ODN.vaisseaux = {
    ARGENT: ARGENT,
    ROUGE: ROUGE,
    /* coques réelles, celles que les actes utilisent */
    corvette: corvetteReelle,
    cargo: cargoReel,
    foreuse: foreuseReelle,
    porteNeant: porteNeantReel,
    canonniere: canonniereReelle,
    foreuseLourde: foreuseLourde,
    chasseur: chasseurReel,
    fregate: fregateReelle,
    station: station,
    /* silhouettes de repli, dessinées à la main */
    repli: {
      corvette: corvette,
      cargo: cargo,
      foreuse: foreuse,
      porteNeant: porteNeant,
      station: station
    },
    FICHES: FICHES
  };
})(window);
