/* =========================================================
   L'ORDRE DU NÉANT — les appareils
   ---------------------------------------------------------
   Un seul endroit décrit les silhouettes de la flotte. La
   table d'hologrammes les projette en fil de fer, l'Approche
   les fait voler en coque pleine : même géométrie, deux
   peintures.

   Les conceptions sont propres à l'Ordre. Ce ne sont pas des
   vaisseaux existants du jeu : ces modèles appartiennent à
   leur éditeur et n'ont pas à être recopiés ici.

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

  /* --- Station -------------------------------------------- */
  function station(peindre) {
    var n = new THREE.Group();

    n.add(poser(peindre(new THREE.TorusGeometry(3.1, 0.34, 10, 48), ARGENT, 0.8),
      0, 0, 0, Math.PI / 2, 0, 0));
    n.add(poser(peindre(new THREE.TorusGeometry(2.1, 0.13, 8, 36), ARGENT, 0.6),
      0, 0, 0, Math.PI / 2, 0, 0));
    n.add(peindre(new THREE.CylinderGeometry(0.55, 0.55, 5.2, 12), ARGENT, 0.85));
    n.add(peindre(new THREE.SphereGeometry(0.95, 16, 12), ROUGE, 1.0));

    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2;
      var r = peindre(new THREE.BoxGeometry(0.16, 0.16, 2.2), ARGENT, 0.6, 0.45);
      r.position.set(Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55);
      r.rotation.y = -a;
      n.add(r);

      if (i % 2 === 0) {
        var mo = peindre(new THREE.BoxGeometry(0.75, 0.75, 1.1), ARGENT, 0.7);
        mo.position.set(Math.cos(a) * 3.1, 0, Math.sin(a) * 3.1);
        mo.rotation.y = -a;
        n.add(mo);

        var fe = peindre(new THREE.SphereGeometry(0.11, 8, 6), ROUGE, 2.0, 0);
        fe.position.set(Math.cos(a) * 3.55, 0, Math.sin(a) * 3.55);
        n.add(fe);
      }
    }

    for (var c = -1; c <= 1; c += 2) {
      n.add(poser(peindre(new THREE.ConeGeometry(0.55, 1.1, 12), ARGENT, 0.8),
        0, c * 3.0, 0, c > 0 ? 0 : Math.PI, 0, 0));
      n.add(poser(peindre(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), ARGENT, 0.7),
        0, c * 4.1, 0));
    }

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

  /* --- Fiches, pour la table d'hologrammes ---------------- */
  var FICHES = [
    {
      cle: 'corvette', nom: 'Le Passeur', classe: "Corvette d'escorte",
      division: 'Combat et Sécurité', construire: corvette, echelle: 1,
      fiche: [
        ['Rôle', 'Escorte, interception'],
        ['Équipage', '2 à 4'],
        ['Longueur', '38 m'],
        ['Armement', 'Tourelles jumelées, contre-mesures']
      ],
      texte: "Rapide, peu armé pour sa taille, conçu pour tenir la distance autour d'un convoi plutôt que pour engager seul. Il escorte, il dissuade, il rentre."
    },
    {
      cle: 'cargo', nom: 'Le Portefaix', classe: 'Cargo lourd',
      division: 'Logistique et Industrie', construire: cargo, echelle: 0.98,
      fiche: [
        ['Rôle', 'Fret, ravitaillement'],
        ['Équipage', '3 à 6'],
        ['Longueur', '74 m'],
        ['Soute', '8 conteneurs modulaires']
      ],
      texte: "L'épine dorsale des opérations de l'Ordre. Lent, vulnérable, indispensable. Rien ne se construit sans ce qu'il transporte."
    },
    {
      cle: 'foreuse', nom: 'La Carrière', classe: 'Foreuse de prospection',
      division: 'Extraction', construire: foreuse, echelle: 1.05,
      fiche: [
        ['Rôle', 'Minage, prospection'],
        ['Équipage', '2 à 3'],
        ['Longueur', '31 m'],
        ['Soutes', 'Deux cuves à minerai']
      ],
      texte: "Tête de forage à couronne, deux bras de relevé, deux cuves. Elle passe des heures immobile contre un astéroïde, et c'est ce qui paie les autres."
    },
    {
      cle: 'station', nom: 'Le Seuil', classe: "Station d'attache",
      division: 'Commandement', construire: station, echelle: 0.92,
      fiche: [
        ['Rôle', 'Amarrage, réunion, dépôt'],
        ['Équipage', 'Variable'],
        ['Envergure', '210 m'],
        ['Postes', "Trois bras d'amarrage"]
      ],
      texte: "Le point de ralliement. Anneau d'habitation en rotation, fût central, trois bras d'amarrage. On y entre, on y repart : tout n'est que passage."
    }
  ];

  global.ODN = global.ODN || {};
  global.ODN.vaisseaux = {
    ARGENT: ARGENT,
    ROUGE: ROUGE,
    corvette: corvette,
    cargo: cargo,
    foreuse: foreuse,
    station: station,
    porteNeant: porteNeant,
    FICHES: FICHES
  };
})(window);
