/* =========================================================
   L'ORDRE DU NÉANT — table d'hologrammes
   ---------------------------------------------------------
   Vaisseaux et station projetés en hologramme, construits
   en volumes primitifs directement dans le code.

   Les silhouettes sont propres à l'Ordre. Ce ne sont pas
   des vaisseaux existants du jeu : ces modèles appartiennent
   à leur éditeur et n'ont pas à être recopiés ici.
   ========================================================= */
(function () {
  'use strict';

  var hote = document.getElementById('flotte-scene');
  if (!hote || typeof THREE === 'undefined') { return; }

  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var petit = window.innerWidth < 860;

  var ARGENT = 0xeef0f4;
  var ROUGE = 0xe01020;

  /* ---------------------------------------------------------
     Nuancier holographique
     ---------------------------------------------------------
     Pas de lumière ni d'ombre : un hologramme ne reçoit pas
     de lumière, il en émet. Le volume vient du liseré de
     Fresnel, les lignes de balayage viennent de la hauteur,
     et le scintillement d'un bruit lent.
     --------------------------------------------------------- */
  function matiereHolo(teinte, intensite) {
    return new THREE.ShaderMaterial({
      uniforms: {
        teinte:  { value: new THREE.Color(teinte) },
        temps:   { value: 0 },
        balayage:{ value: 0 },
        force:   { value: intensite }
      },
      vertexShader: [
        'varying vec3 vN;',
        'varying vec3 vP;',
        'varying vec3 vM;',
        'void main(){',
        '  vN = normalize(normalMatrix * normal);',
        '  vM = (modelMatrix * vec4(position,1.0)).xyz;',
        '  vec4 mv = modelViewMatrix * vec4(position,1.0);',
        '  vP = mv.xyz;',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 teinte;',
        'uniform float temps;',
        'uniform float balayage;',
        'uniform float force;',
        'varying vec3 vN;',
        'varying vec3 vP;',
        'varying vec3 vM;',
        'void main(){',
        '  vec3 v = normalize(-vP);',
        '  float f = pow(1.0 - abs(dot(v, normalize(vN))), 2.2);',
        /* lignes de balayage horizontales, fines */
        '  float lignes = 0.55 + 0.45 * sin(vM.y * 26.0 - temps * 1.6);',
        /* bande claire qui remonte le long du modèle */
        '  float bande = smoothstep(0.16, 0.0, abs(vM.y - balayage));',
        /* scintillement lent, jamais franc : un hologramme vacille */
        '  float vacille = 0.9 + 0.1 * sin(temps * 7.3) * sin(temps * 2.1);',
        '  float i = (0.1 + f * 0.85) * lignes * vacille * force + bande * 0.5;',
        '  gl_FragColor = vec4(teinte * (1.0 + bande * 1.6), i);',
        '}'
      ].join('\n'),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }

  var matieres = [];
  function holo(teinte, intensite) {
    var m = matiereHolo(teinte, intensite);
    matieres.push(m);
    return m;
  }

  /* arêtes : c'est elles qui donnent la lecture technique */
  function aretes(geo, teinte, opacite) {
    var l = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo, 22),
      new THREE.LineBasicMaterial({
        color: teinte, transparent: true, opacity: opacite,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    return l;
  }

  function piece(geo, teinte, intensite, opaciteAretes) {
    var g = new THREE.Group();
    g.add(new THREE.Mesh(geo, holo(teinte, intensite)));
    g.add(aretes(geo, teinte, opaciteAretes === undefined ? 0.5 : opaciteAretes));
    return g;
  }

  function poser(g, x, y, z, rx, ry, rz) {
    g.position.set(x || 0, y || 0, z || 0);
    g.rotation.set(rx || 0, ry || 0, rz || 0);
    return g;
  }

  /* =========================================================
     LES MODÈLES
     ========================================================= */

  /* --- Corvette d'escorte --------------------------------- */
  function corvette() {
    var n = new THREE.Group();

    var coque = new THREE.CylinderGeometry(0.42, 0.62, 5.2, 8);
    n.add(poser(piece(coque, ARGENT, 0.9), 0, 0, 0, Math.PI / 2, 0, 0));

    var proue = new THREE.ConeGeometry(0.42, 1.8, 8);
    n.add(poser(piece(proue, ARGENT, 1.0), 0, 0, 3.4, -Math.PI / 2, 0, 0));

    var passerelle = new THREE.SphereGeometry(0.46, 14, 10);
    n.add(poser(piece(passerelle, ROUGE, 1.1), 0, 0.42, 1.55));

    /* ailes en flèche */
    for (var c = -1; c <= 1; c += 2) {
      var aile = new THREE.BoxGeometry(3.1, 0.12, 1.5);
      n.add(poser(piece(aile, ARGENT, 0.75), c * 1.8, -0.1, -0.5, 0, c * 0.34, c * 0.16));

      var nacelle = new THREE.CylinderGeometry(0.28, 0.34, 2.3, 8);
      n.add(poser(piece(nacelle, ARGENT, 0.85), c * 2.5, -0.1, -1.1, Math.PI / 2, 0, 0));

      var tuyere = new THREE.CylinderGeometry(0.36, 0.2, 0.5, 8);
      n.add(poser(piece(tuyere, ROUGE, 1.4), c * 2.5, -0.1, -2.4, Math.PI / 2, 0, 0));

      var canard = new THREE.BoxGeometry(1.15, 0.09, 0.6);
      n.add(poser(piece(canard, ARGENT, 0.7), c * 0.95, 0.12, 2.1, 0, -c * 0.5, 0));
    }

    var tuyereC = new THREE.CylinderGeometry(0.5, 0.26, 0.7, 8);
    n.add(poser(piece(tuyereC, ROUGE, 1.5), 0, 0, -3.0, Math.PI / 2, 0, 0));

    var derive = new THREE.BoxGeometry(0.1, 1.25, 1.5);
    n.add(poser(piece(derive, ARGENT, 0.7), 0, 0.8, -1.7, 0.22, 0, 0));

    return n;
  }

  /* --- Cargo lourd ---------------------------------------- */
  function cargo() {
    var n = new THREE.Group();

    var epine = new THREE.BoxGeometry(0.8, 0.8, 7.4);
    n.add(piece(epine, ARGENT, 0.75));

    var pont = new THREE.BoxGeometry(1.5, 0.95, 1.6);
    n.add(poser(piece(pont, ARGENT, 0.95), 0, 0.5, 3.3));
    var verriere = new THREE.BoxGeometry(1.1, 0.4, 0.3);
    n.add(poser(piece(verriere, ROUGE, 1.2), 0, 0.62, 4.1));

    /* conteneurs : la répétition fait la lecture de « cargo » */
    for (var i = 0; i < 4; i++) {
      for (var c = -1; c <= 1; c += 2) {
        var boite = new THREE.BoxGeometry(1.15, 1.0, 1.2);
        n.add(poser(piece(boite, ARGENT, 0.6, 0.65),
          c * 1.05, 0, 1.6 - i * 1.4));
      }
      var traverse = new THREE.BoxGeometry(2.6, 0.1, 0.1);
      n.add(poser(piece(traverse, ARGENT, 0.5, 0.4), 0, 0.58, 1.6 - i * 1.4));
    }

    for (var m = -1; m <= 1; m += 2) {
      var moteur = new THREE.CylinderGeometry(0.44, 0.5, 1.5, 10);
      n.add(poser(piece(moteur, ARGENT, 0.85), m * 1.05, 0, -3.5, Math.PI / 2, 0, 0));
      var feu = new THREE.CylinderGeometry(0.5, 0.28, 0.6, 10);
      n.add(poser(piece(feu, ROUGE, 1.5), m * 1.05, 0, -4.4, Math.PI / 2, 0, 0));
    }

    var radiateur = new THREE.BoxGeometry(0.08, 1.9, 2.2);
    n.add(poser(piece(radiateur, ARGENT, 0.55), 0, 1.3, -1.4, 0, 0, 0));

    return n;
  }

  /* --- Foreuse ------------------------------------------- */
  function foreuse() {
    var n = new THREE.Group();

    var ventre = new THREE.SphereGeometry(1.5, 16, 12);
    var mv = poser(piece(ventre, ARGENT, 0.8), 0, 0, -0.4);
    mv.scale.set(1, 0.85, 1.55);
    n.add(mv);

    var col = new THREE.CylinderGeometry(0.5, 0.75, 1.9, 10);
    n.add(poser(piece(col, ARGENT, 0.85), 0, 0.1, 1.8, Math.PI / 2, 0, 0));

    var tete = new THREE.ConeGeometry(0.85, 1.5, 12);
    n.add(poser(piece(tete, ROUGE, 1.3), 0, 0.1, 3.1, -Math.PI / 2, 0, 0));

    var couronne = new THREE.TorusGeometry(0.72, 0.09, 8, 20);
    n.add(poser(piece(couronne, ROUGE, 1.5), 0, 0.1, 2.6));

    /* bras articulés et soutes à minerai */
    for (var c = -1; c <= 1; c += 2) {
      var bras1 = new THREE.BoxGeometry(1.7, 0.16, 0.16);
      n.add(poser(piece(bras1, ARGENT, 0.7), c * 1.6, 0.35, 1.5, 0, 0, c * 0.3));
      var bras2 = new THREE.BoxGeometry(1.3, 0.14, 0.14);
      n.add(poser(piece(bras2, ARGENT, 0.7), c * 2.4, 0.05, 2.1, 0, c * 0.55, c * -0.2));

      var soute = new THREE.CylinderGeometry(0.52, 0.52, 2.2, 10);
      n.add(poser(piece(soute, ARGENT, 0.65), c * 1.85, -0.35, -0.9, Math.PI / 2, 0, 0));

      var propulseur = new THREE.CylinderGeometry(0.34, 0.2, 0.55, 8);
      n.add(poser(piece(propulseur, ROUGE, 1.4), c * 1.0, -0.15, -2.6, Math.PI / 2, 0, 0));
    }

    var mat = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6);
    n.add(poser(piece(mat, ARGENT, 0.6), 0, 1.15, -0.8));

    return n;
  }

  /* --- Station ------------------------------------------- */
  function station() {
    var n = new THREE.Group();

    var anneau = new THREE.TorusGeometry(3.1, 0.34, 10, 48);
    n.add(poser(piece(anneau, ARGENT, 0.8), 0, 0, 0, Math.PI / 2, 0, 0));

    var anneau2 = new THREE.TorusGeometry(2.1, 0.13, 8, 36);
    n.add(poser(piece(anneau2, ARGENT, 0.6), 0, 0, 0, Math.PI / 2, 0, 0));

    var fut = new THREE.CylinderGeometry(0.55, 0.55, 5.2, 12);
    n.add(piece(fut, ARGENT, 0.85));

    var moyeu = new THREE.SphereGeometry(0.95, 16, 12);
    n.add(piece(moyeu, ROUGE, 1.0));

    /* rayons et modules d'amarrage */
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2;
      var rayon = new THREE.BoxGeometry(0.16, 0.16, 2.2);
      var r = piece(rayon, ARGENT, 0.6, 0.45);
      r.position.set(Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55);
      r.rotation.y = -a;
      n.add(r);

      if (i % 2 === 0) {
        var module = new THREE.BoxGeometry(0.75, 0.75, 1.1);
        var mo = piece(module, ARGENT, 0.7);
        mo.position.set(Math.cos(a) * 3.1, 0, Math.sin(a) * 3.1);
        mo.rotation.y = -a;
        n.add(mo);

        var feu2 = new THREE.SphereGeometry(0.11, 8, 6);
        var fe = piece(feu2, ROUGE, 2.0, 0);
        fe.position.set(Math.cos(a) * 3.55, 0, Math.sin(a) * 3.55);
        n.add(fe);
      }
    }

    for (var c = -1; c <= 1; c += 2) {
      var coiffe = new THREE.ConeGeometry(0.55, 1.1, 12);
      n.add(poser(piece(coiffe, ARGENT, 0.8), 0, c * 3.0, 0, c > 0 ? 0 : Math.PI, 0, 0));
      var antenne = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6);
      n.add(poser(piece(antenne, ARGENT, 0.7), 0, c * 4.1, 0));
    }

    return n;
  }

  /* ---------------------------------------------------------
     Fiches
     ---------------------------------------------------------
     Désignations propres à l'Ordre : classification interne,
     pas des modèles du commerce.
     --------------------------------------------------------- */
  var FLOTTE = [
    {
      cle: 'corvette', nom: 'Le Passeur', classe: 'Corvette d\'escorte',
      division: 'Combat et Sécurité', construire: corvette,
      echelle: 1, fiche: [
        ['Rôle', 'Escorte, interception'],
        ['Équipage', '2 à 4'],
        ['Longueur', '38 m'],
        ['Armement', 'Tourelles jumelées, contre-mesures']
      ],
      texte: "Rapide, peu armé pour sa taille, conçu pour tenir la distance autour d'un convoi plutôt que pour engager seul. Il escorte, il dissuade, il rentre."
    },
    {
      cle: 'cargo', nom: 'Le Portefaix', classe: 'Cargo lourd',
      division: 'Logistique et Industrie', construire: cargo,
      echelle: 0.98, fiche: [
        ['Rôle', 'Fret, ravitaillement'],
        ['Équipage', '3 à 6'],
        ['Longueur', '74 m'],
        ['Soute', '8 conteneurs modulaires']
      ],
      texte: "L'épine dorsale des opérations de l'Ordre. Lent, vulnérable, indispensable. Rien ne se construit sans ce qu'il transporte."
    },
    {
      cle: 'foreuse', nom: 'La Carrière', classe: 'Foreuse de prospection',
      division: 'Extraction', construire: foreuse,
      echelle: 1.05, fiche: [
        ['Rôle', 'Minage, prospection'],
        ['Équipage', '2 à 3'],
        ['Longueur', '31 m'],
        ['Soutes', 'Deux cuves à minerai']
      ],
      texte: "Tête de forage à couronne, deux bras de relevé, deux cuves. Elle passe des heures immobile contre un astéroïde, et c'est ce qui paie les autres."
    },
    {
      cle: 'station', nom: 'Le Seuil', classe: 'Station d\'attache',
      division: 'Commandement', construire: station,
      echelle: 0.92, fiche: [
        ['Rôle', 'Amarrage, réunion, dépôt'],
        ['Équipage', 'Variable'],
        ['Envergure', '210 m'],
        ['Postes', 'Trois bras d\'amarrage']
      ],
      texte: "Le point de ralliement. Anneau d'habitation en rotation, fût central, trois bras d'amarrage. On y entre, on y repart : tout n'est que passage."
    }
  ];

  /* ---------------------------------------------------------
     Montage de la scène
     --------------------------------------------------------- */
  var moteur;
  try {
    moteur = new THREE.WebGLRenderer({ antialias: !petit, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }

  moteur.setPixelRatio(Math.min(window.devicePixelRatio || 1, petit ? 1.25 : 1.8));
  moteur.setClearColor(0x000000, 0);
  moteur.domElement.setAttribute('aria-hidden', 'true');
  hote.appendChild(moteur.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 1.75, 7.8);
  camera.lookAt(0, 0.1, 0);

  var socle = new THREE.Group();
  socle.position.y = -2.6;
  scene.add(socle);

  /* disque de projection : trois anneaux concentriques */
  [3.9, 3.0, 2.0].forEach(function (r, i) {
    var t = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.012, r, 96),
      new THREE.MeshBasicMaterial({
        color: i === 0 ? ROUGE : ARGENT,
        transparent: true, opacity: i === 0 ? 0.5 : 0.22,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      })
    );
    t.rotation.x = -Math.PI / 2;
    socle.add(t);
  });

  /* cône de lumière : ce qui dit « projection » plutôt que « maquette » */
  var cone = new THREE.Mesh(
    new THREE.CylinderGeometry(2.9, 1.3, 6.2, 40, 1, true),
    new THREE.ShaderMaterial({
      uniforms: { temps: { value: 0 } },
      vertexShader: 'varying vec2 vU; varying vec3 vM;' +
        'void main(){ vU = uv; vM = (modelMatrix*vec4(position,1.0)).xyz;' +
        ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float temps; varying vec2 vU; varying vec3 vM;' +
        'void main(){' +
        ' float h = 1.0 - vU.y;' +
        ' float a = pow(h, 2.9) * 0.075;' +
        ' a *= 0.75 + 0.25 * sin(vM.y * 9.0 - temps * 2.0);' +
        ' gl_FragColor = vec4(0.88, 0.92, 0.96, a); }',
      transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide
    })
  );
  cone.position.y = 3.1;
  socle.add(cone);

  /* grille au sol */
  var grille = new THREE.GridHelper(9, 18, ROUGE, 0x30343c);
  grille.material.transparent = true;
  grille.material.opacity = 0.14;
  grille.material.depthWrite = false;
  socle.add(grille);

  /* ---------------------------------------------------------
     Bascule entre modèles
     --------------------------------------------------------- */
  var porteur = new THREE.Group();
  porteur.position.y = 0.2;
  scene.add(porteur);

  var courant = null, indexCourant = -1;
  var transition = 0;

  function montrer(i) {
    if (i === indexCourant) { return; }
    indexCourant = i;
    var f = FLOTTE[i];

    while (porteur.children.length) { porteur.remove(porteur.children[0]); }
    matieres.length = 0;

    courant = f.construire();
    courant.scale.setScalar(f.echelle);
    porteur.add(courant);
    transition = 0;

    ecrireFiche(f);
    marquerOnglet(i);
  }

  function ecrireFiche(f) {
    var titre = document.getElementById('flotte-nom');
    var classe = document.getElementById('flotte-classe');
    var texte = document.getElementById('flotte-texte');
    var liste = document.getElementById('flotte-fiche');
    if (titre) { titre.textContent = f.nom; }
    if (classe) { classe.textContent = f.classe + ' — ' + f.division; }
    if (texte) { texte.textContent = f.texte; }
    if (liste) {
      liste.innerHTML = '';
      f.fiche.forEach(function (ligne) {
        var dt = document.createElement('dt'); dt.textContent = ligne[0];
        var dd = document.createElement('dd'); dd.textContent = ligne[1];
        liste.appendChild(dt); liste.appendChild(dd);
      });
    }
  }

  var onglets = [];
  function marquerOnglet(i) {
    onglets.forEach(function (b, j) {
      b.classList.toggle('onglet--actif', j === i);
      b.setAttribute('aria-selected', j === i ? 'true' : 'false');
      b.tabIndex = j === i ? 0 : -1;
    });
  }

  var zoneOnglets = document.getElementById('flotte-onglets');
  if (zoneOnglets) {
    FLOTTE.forEach(function (f, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'onglet';
      b.setAttribute('role', 'tab');
      b.innerHTML = '<span class="onglet__num">' + String(i + 1).padStart(2, '0') +
        '</span><span class="onglet__nom">' + f.nom + '</span>';
      b.addEventListener('click', function () { montrer(i); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var d = e.key === 'ArrowRight' ? 1 : -1;
          var n = (i + d + FLOTTE.length) % FLOTTE.length;
          montrer(n);
          onglets[n].focus();
        }
      });
      zoneOnglets.appendChild(b);
      onglets.push(b);
    });
  }

  /* ---------------------------------------------------------
     Dimensions, souris, mise en veille
     --------------------------------------------------------- */
  function dimensionner() {
    var l = hote.clientWidth;
    var h = hote.clientHeight;
    if (!l || !h) { return; }
    camera.aspect = l / h;

    /* Sur un cadre étroit, la hauteur visible ne suffit plus :
       la caméra recule pour que l'appareil tienne entier, au lieu
       de sortir du cadre par les ailes. */
    var recul = 7.8 * Math.max(1, 1.62 / camera.aspect);
    camera.position.set(0, 1.75 * (recul / 7.8), recul);
    camera.lookAt(0, 0.1, 0);

    camera.updateProjectionMatrix();
    moteur.setSize(l, h, false);
    moteur.domElement.style.width = '100%';
    moteur.domElement.style.height = '100%';
  }

  var minuteur;
  window.addEventListener('resize', function () {
    clearTimeout(minuteur);
    minuteur = setTimeout(dimensionner, 140);
  }, { passive: true });

  var sourisX = 0, sourisY = 0, lisseX = 0, lisseY = 0;
  hote.addEventListener('pointermove', function (e) {
    var r = hote.getBoundingClientRect();
    sourisX = ((e.clientX - r.left) / r.width) * 2 - 1;
    sourisY = ((e.clientY - r.top) / r.height) * 2 - 1;
  }, { passive: true });
  hote.addEventListener('pointerleave', function () { sourisX = 0; sourisY = 0; });

  /* On ne calcule rien tant que la section n'est pas à l'écran :
     trois scènes 3D qui tournent en même temps, c'est une
     batterie de portable qui se vide pour rien. */
  var aLecran = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { aLecran = e.isIntersecting; });
    }, { rootMargin: '150px' }).observe(hote);
  } else {
    aLecran = true;
  }

  var visible = true;
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; });

  /* ---------------------------------------------------------
     Boucle
     --------------------------------------------------------- */
  var horloge = new THREE.Clock();

  function boucle() {
    requestAnimationFrame(boucle);
    if (!aLecran || !visible) { return; }

    var dt = Math.min(horloge.getDelta(), 0.05);
    var t = horloge.getElapsedTime();

    lisseX += (sourisX - lisseX) * 0.05;
    lisseY += (sourisY - lisseY) * 0.05;

    if (courant) {
      courant.rotation.y += dt * 0.28;
      courant.rotation.x = -0.12 + lisseY * 0.2;
      porteur.rotation.y = lisseX * 0.28;
      porteur.position.y = 0.2 + Math.sin(t * 0.7) * 0.09;

      /* apparition : le modèle se dessine du bas vers le haut */
      transition = Math.min(1, transition + dt * 1.1);
      courant.scale.setScalar(FLOTTE[indexCourant].echelle * (0.86 + transition * 0.14));
    }

    var monte = ((t * 0.7) % 2.6) - 0.7;
    for (var i = 0; i < matieres.length; i++) {
      matieres[i].uniforms.temps.value = t;
      matieres[i].uniforms.balayage.value = monte;
    }
    cone.material.uniforms.temps.value = t;
    grille.rotation.y += dt * 0.04;

    moteur.render(scene, camera);
  }

  dimensionner();
  montrer(0);
  if (doux) { moteur.render(scene, camera); } else { boucle(); }

  /* la taille réelle n'est connue qu'après la mise en page */
  window.addEventListener('load', dimensionner);
  setTimeout(dimensionner, 300);
})();
