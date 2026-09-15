/* =========================================================
   L'ORDRE DU NÉANT — l'Approche
   ---------------------------------------------------------
   Section à défilement piloté. Le bloc mesure plusieurs
   hauteurs d'écran ; à l'intérieur, une scène collante
   occupe l'écran entier et c'est le défilement, pas le
   temps, qui avance la caméra.

   Le texte n'est pas posé par-dessus une animation qui
   tourne en boucle : chaque fragment appartient à un moment
   précis du trajet. On avance, la phrase arrive.
   ========================================================= */
(function () {
  'use strict';

  var section = document.getElementById('approche');
  var hote = document.getElementById('approche-scene');
  if (!section || !hote || typeof THREE === 'undefined') { return; }

  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var petit = window.innerWidth < 860;

  var fragments = Array.prototype.slice.call(section.querySelectorAll('.fragment'));
  var jauge = document.getElementById('approche-jauge');

  var moteur;
  try {
    moteur = new THREE.WebGLRenderer({ antialias: !petit, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }

  moteur.setPixelRatio(Math.min(window.devicePixelRatio || 1, petit ? 1.25 : 1.6));
  moteur.setClearColor(0x000000, 0);
  moteur.domElement.setAttribute('aria-hidden', 'true');
  hote.appendChild(moteur.domElement);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.0009);

  var camera = new THREE.PerspectiveCamera(62, 1, 0.5, 4000);

  var ROUGE = new THREE.Color(0xe01020);
  var ARGENT = new THREE.Color(0xeef0f4);
  var CENDRE = new THREE.Color(0x868b95);

  var PASTILLE = (function () {
    var t = document.createElement('canvas');
    t.width = t.height = 64;
    var x = t.getContext('2d');
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 32, 0, 6.2832); x.fill();
    return new THREE.CanvasTexture(t);
  })();

  /* ---------------------------------------------------------
     Le couloir : poussière et éclats sur toute la traversée
     ---------------------------------------------------------
     Répartis dans un tube creux autour de l'axe du trajet.
     Creux, parce qu'un éclat qui frôle l'objectif remplit
     l'écran d'une tache et casse l'illusion de vitesse.
     --------------------------------------------------------- */
  function couloir(nombre, rMin, rMax, zDe, zA, taille, opacite) {
    var pos = new Float32Array(nombre * 3);
    var col = new Float32Array(nombre * 3);
    var c = new THREE.Color();
    for (var i = 0; i < nombre; i++) {
      var r = rMin + Math.pow(Math.random(), 0.6) * (rMax - rMin);
      var a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r * 0.75;
      pos[i * 3 + 2] = zDe + Math.random() * (zA - zDe);

      var d = Math.random();
      if (d > 0.9) { c.copy(ROUGE); }
      else if (d > 0.55) { c.copy(ARGENT); }
      else { c.copy(CENDRE); }
      var g = 0.25 + Math.random() * 0.75;
      col[i * 3] = c.r * g; col[i * 3 + 1] = c.g * g; col[i * 3 + 2] = c.b * g;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      size: taille, sizeAttenuation: true, vertexColors: true,
      map: PASTILLE, alphaTest: 0.01, fog: true,
      transparent: true, opacity: opacite, depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
  }

  scene.add(couloir(petit ? 2200 : 5200, 55, 340, -1500, 320, 2.6, 0.9));
  scene.add(couloir(petit ? 1400 : 3200, 300, 900, -2200, 320, 5.5, 0.45));

  /* quelques éclats de roche, assez loin de l'axe */
  var eclats = new THREE.Group();
  var matEclat = new THREE.MeshBasicMaterial({ color: 0x14161b, transparent: true, opacity: 0.95, fog: true });
  var geoEclat = new THREE.DodecahedronGeometry(1, 0);
  var nbEclats = petit ? 26 : 60;
  for (var e = 0; e < nbEclats; e++) {
    var m = new THREE.Mesh(geoEclat, matEclat);
    var r = 80 + Math.random() * 260;
    var a = Math.random() * Math.PI * 2;
    m.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.8, -1400 + Math.random() * 1600);
    var s = 2 + Math.random() * 9;
    m.scale.set(s, s * (0.5 + Math.random()), s * (0.5 + Math.random()));
    m.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    m.userData.v = (Math.random() - 0.5) * 0.004;
    eclats.add(m);
  }
  scene.add(eclats);

  /* ---------------------------------------------------------
     La station, au bout du couloir
     --------------------------------------------------------- */
  var CATALOGUE = (window.ODN && window.ODN.vaisseaux) || null;

  var station = new THREE.Group();
  /* décalée en haut à droite : le bas de l'écran reste libre
     pour le texte, qui n'a pas à lutter contre la silhouette */
  station.position.set(120, 78, -1150);
  station.rotation.x = -0.34;
  station.rotation.z = 0.12;
  scene.add(station);

  function ligne(geo, couleur, opacite) {
    return new THREE.LineSegments(
      window.ODN.aretesDe(geo, 20),
      new THREE.LineBasicMaterial({
        color: couleur, transparent: true, opacity: opacite,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: true
      })
    );
  }
  function sombre(geo) {
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x090a0d, transparent: true, opacity: 0.94, fog: true
    }));
  }
  function bloc(geo, couleur, opacite) {
    var g = new THREE.Group();
    g.add(sombre(geo));
    g.add(ligne(geo, couleur, opacite));
    return g;
  }

  /* La même station que la table d'hologrammes de l'acte IV,
     peinte en coque pleine. Elle y était faite d'un tore, d'un
     fût et de six rayons : à côté de coques à onze mille
     triangles, ça se voyait. */
  function peindreStation(geo, teinte, intensite, opaciteAretes) {
    var g = new THREE.Group();
    g.add(sombre(geo));
    g.add(ligne(geo, teinte, Math.min(0.7, (opaciteAretes === undefined ? 0.5 : opaciteAretes) * 1.05)));
    return g;
  }

  var anneau = null;
  if (CATALOGUE && CATALOGUE.station) {
    var corps = CATALOGUE.station(peindreStation);
    corps.scale.setScalar(24);
    station.add(corps);
    /* L'anneau d'habitation tourne : c'est lui, et pas le reste,
       qui dit que la station est habitée. Il est le seul enfant
       du groupe à porter ce rôle, on le retient par son rang. */
    anneau = corps.userData.anneau || null;
  } else {
    var anneauG = new THREE.TorusGeometry(120, 11, 10, 64);
    anneau = bloc(anneauG, 0xeef0f4, 0.55);
    anneau.rotation.x = Math.PI / 2;
    station.add(anneau);
    station.add(bloc(new THREE.CylinderGeometry(22, 22, 210, 16), 0xeef0f4, 0.5));
  }

  /* feux de position : c'est ce qui fait qu'une silhouette
     lointaine se lit comme habitée */
  var feuxPos = [];
  for (var fp = 0; fp < 18; fp++) {
    var af = (fp / 18) * Math.PI * 2;
    feuxPos.push(Math.cos(af) * 80.4, 22.8 + (fp % 2 ? 3 : -3), Math.sin(af) * 80.4);
  }
  var geoFeux = new THREE.BufferGeometry();
  geoFeux.setAttribute('position', new THREE.BufferAttribute(new Float32Array(feuxPos), 3));
  var feux = new THREE.Points(geoFeux, new THREE.PointsMaterial({
    color: 0xff4d4d, size: 9, sizeAttenuation: true, map: PASTILLE,
    transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  station.add(feux);

  /* halo derrière la station */
  var halo = (function () {
    var t = document.createElement('canvas');
    t.width = t.height = 256;
    var x = t.getContext('2d');
    var g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(224,16,32,0.5)');
    g.addColorStop(0.35, 'rgba(160,12,24,0.2)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    var s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(t), transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    s.scale.set(900, 900, 1);
    s.position.z = -140;
    return s;
  })();
  station.add(halo);

  /* ---------------------------------------------------------
     Le trafic
     ---------------------------------------------------------
     Un convoi escorté remonte le couloir vers la station, et
     deux corvettes patrouillent autour d'elle. Ce sont les
     mêmes silhouettes que la table d'hologrammes de l'acte IV,
     peintes en coque pleine au lieu du fil de fer.

     Ils avancent avec le temps, pas avec le défilement : un
     vaisseau qui s'arrête quand on arrête de lire cesse d'être
     un vaisseau.
     --------------------------------------------------------- */


  /* halo de tuyère : un disque additif, pas une lumière */
  var HALO = (function () {
    var t = document.createElement('canvas');
    t.width = t.height = 128;
    var x = t.getContext('2d');
    var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,240,240,1)');
    g.addColorStop(0.18, 'rgba(255,90,90,0.9)');
    g.addColorStop(0.5, 'rgba(224,16,32,0.35)');
    g.addColorStop(1, 'rgba(224,16,32,0)');
    x.fillStyle = g; x.beginPath(); x.arc(64, 64, 64, 0, 6.2832); x.fill();
    return new THREE.CanvasTexture(t);
  })();

  /* traînée : un plan étiré derrière la tuyère */
  var SILLAGE = (function () {
    var t = document.createElement('canvas');
    t.width = 128; t.height = 16;
    var x = t.getContext('2d');
    var g = x.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(224,16,32,0)');
    g.addColorStop(0.6, 'rgba(224,20,36,0.35)');
    g.addColorStop(0.92, 'rgba(255,80,80,0.85)');
    g.addColorStop(1, 'rgba(255,170,170,0.95)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 16);
    var v = x.createLinearGradient(0, 0, 0, 16);
    v.addColorStop(0, 'rgba(0,0,0,1)');
    v.addColorStop(0.5, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = v; x.fillRect(0, 0, 128, 16);
    return new THREE.CanvasTexture(t);
  })();

  function peindreCoque(geo, teinte, opacite, opaciteAretes) {
    var g = new THREE.Group();
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x0a0b0e, transparent: true, opacity: 0.96, fog: true
    })));
    g.add(new THREE.LineSegments(
      window.ODN.aretesDe(geo, 20),
      new THREE.LineBasicMaterial({
        color: teinte, transparent: true,
        opacity: Math.min(0.85, (opaciteAretes === undefined ? 0.6 : opaciteAretes) * 1.1),
        blending: THREE.AdditiveBlending, depthWrite: false, fog: true
      })
    ));
    return g;
  }

  var tuyeres = [];

  /* Relève les matières d'un appareil pour pouvoir le faire
     apparaître et disparaître en fondu. Sans ça, un vaisseau qui
     sort du couloir se volatilise d'une image à l'autre. */
  function recolter(groupe) {
    var liste = [];
    groupe.traverse(function (n) {
      if (!n.material) { return; }
      var mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach(function (m) {
        if (m.transparent) { liste.push({ m: m, base: m.opacity }); }
      });
    });
    return liste;
  }

  function voiler(fiche, facteur) {
    for (var i = 0; i < fiche.mats.length; i++) {
      fiche.mats[i].m.opacity = fiche.mats[i].base * facteur;
    }
    fiche.groupe.visible = facteur > 0.005;
  }

  /* interpolation douce, qui accepte a > b */
  function douceur(x, a, b) {
    var t = (x - a) / (b - a);
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    return t * t * (3 - 2 * t);
  }

  function armer(appareil, echelle) {
    appareil.scale.setScalar(echelle);
    /* relevé avant d'ajouter les halos : ceux-ci sont pilotés à
       part, on ne veut pas que deux règles se disputent la même
       opacité */
    var fiche = { groupe: appareil, mats: recolter(appareil), tuyeres: [] };
    /* La coque réelle arrive par le réseau : le relevé fait à
       l'instant ne voit qu'un groupe vide. On le refait quand la
       géométrie est là, sinon l'appareil ne s'estompe jamais. */
    if (appareil.userData.quandPret) {
      appareil.userData.quandPret.then(function (coque) {
        if (coque) { fiche.mats = fiche.mats.concat(recolter(coque)); }
      }, function () {});
    }
    (appareil.userData.moteurs || []).forEach(function (m) {
      var halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: HALO, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      halo.position.set(m[0], m[1], m[2]);
      halo.scale.setScalar(m[3] * 4.6);
      appareil.add(halo);

      var sillage = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: SILLAGE, transparent: true, opacity: 0.55,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        })
      );
      /* la traînée part de la tuyère vers l'arrière */
      sillage.position.set(m[0], m[1], m[2] - m[3] * 6);
      sillage.scale.set(m[3] * 12, m[3] * 1.5, 1);
      sillage.rotation.y = Math.PI / 2;
      appareil.add(sillage);

      var ty = { halo: halo, sillage: sillage, base: m[3], fiche: fiche };
      fiche.tuyeres.push(ty);
      tuyeres.push(ty);
    });
    appareil.userData.fiche = fiche;
    return appareil;
  }

  var convoi = null, patrouille = [], voileConvoi = 1;

  if (CATALOGUE) {
    /* --- le convoi : un cargo, deux escortes en quinconce --- */
    convoi = new THREE.Group();
    convoi.position.set(-235, 46, 0);
    /* La proue des modèles est en +Z. Le convoi descend le couloir
       vers -Z : sans ce demi-tour, il le remontait en marche arrière,
       tuyères devant. */
    convoi.rotation.y = Math.PI;
    scene.add(convoi);

    var porteur = armer(CATALOGUE.cargo(peindreCoque), 8.4);
    convoi.add(porteur);

    var e1 = armer(CATALOGUE.corvette(peindreCoque), 5.4);
    e1.position.set(-46, 9, -58);
    e1.rotation.set(0.04, 0.16, -0.08);
    convoi.add(e1);

    var e2 = armer(CATALOGUE.corvette(peindreCoque), 5.4);
    e2.position.set(52, -12, -76);
    e2.rotation.set(-0.03, -0.2, 0.1);
    convoi.add(e2);

    /* --- la patrouille, autour de la station --- */
    for (var v = 0; v < 2; v++) {
      var pat = armer(CATALOGUE.corvette(peindreCoque), 4.6);
      pat.userData.angle = v * Math.PI;
      pat.userData.rayon = 205 + v * 46;
      pat.userData.hauteur = v ? 34 : -28;
      pat.userData.sens = v ? 0.17 : -0.22;
      station.add(pat);
      patrouille.push(pat);
    }
  }

  /* ---------------------------------------------------------
     Mesure du défilement
     --------------------------------------------------------- */
  var avance = 0, cible = 0;

  function mesurer() {
    var r = section.getBoundingClientRect();
    var course = r.height - window.innerHeight;
    if (course <= 0) { cible = 0; return; }
    cible = Math.min(Math.max(-r.top / course, 0), 1);
  }

  function marquerFragments() {
    var n = fragments.length;
    if (!n) { return; }
    /* Chaque fragment occupe une tranche du trajet, avec un
       recouvrement court pour que rien ne clignote au passage. */
    /* Un seul fragment à la fois. Deux textes superposés, même
       une demi-seconde, se lisent comme un défaut. */
    var actif = Math.min(n - 1, Math.floor(avance * n));
    for (var i = 0; i < n; i++) {
      fragments[i].classList.toggle('fragment--vu', i === actif);
    }
    if (jauge) { jauge.style.setProperty('--avance', (avance * 100).toFixed(1) + '%'); }
  }

  var enAttente = false;
  function auDefilement() {
    if (enAttente) { return; }
    enAttente = true;
    requestAnimationFrame(function () {
      mesurer();
      enAttente = false;
    });
  }
  window.addEventListener('scroll', auDefilement, { passive: true });
  window.addEventListener('resize', auDefilement, { passive: true });

  function dimensionner() {
    var l = hote.clientWidth, h = hote.clientHeight;
    if (!l || !h) { return; }
    camera.aspect = l / h;

    /* Sur un écran en hauteur, le décalage qui dégage le bas de
       l'image sur un moniteur sortirait la station du cadre. */
    var large = camera.aspect > 1.15;
    station.position.x = large ? 120 : 26;
    station.position.y = large ? 78 : 130;

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

  var aLecran = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (x) { aLecran = x.isIntersecting; });
    }, { rootMargin: '200px' }).observe(section);
  } else { aLecran = true; }

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

    /* Lissage exponentiel calé sur le temps, pas sur le nombre
       d'images : sur une machine lente, un facteur fixe par image
       ferait traîner la caméra très loin derrière le défilement. */
    avance += (cible - avance) * (1 - Math.exp(-dt * 9));

    camera.position.z = 260 - avance * 1180;
    camera.position.x = Math.sin(avance * 3.1) * 26 + Math.sin(t * 0.3) * 3;
    camera.position.y = Math.cos(avance * 2.3) * 18 + Math.cos(t * 0.25) * 2;
    camera.lookAt(0, 0, station.position.z);
    camera.rotation.z = Math.sin(avance * 2.6) * 0.08;

    if (anneau) { anneau.rotation.z += dt * 0.11; }
    feux.material.opacity = 0.55 + 0.45 * Math.abs(Math.sin(t * 1.4));
    halo.material.opacity = 0.5 + 0.3 * Math.sin(t * 0.6);

    for (var i = 0; i < eclats.children.length; i++) {
      var o = eclats.children[i];
      o.rotation.x += o.userData.v;
      o.rotation.y += o.userData.v * 0.7;
    }

    /* le convoi remonte le couloir et repart de l'arrière :
       il y a toujours du trafic, où qu'on en soit du trajet */
    if (convoi) {
      convoi.position.z -= dt * 46;
      if (convoi.position.z < -1360) { convoi.position.z = 460; }
      convoi.position.y = 46 + Math.sin(t * 0.22) * 7;
      convoi.rotation.z = Math.sin(t * 0.17) * 0.035;

      /* Il naît au loin et s'éteint au loin. Une réapparition
         franche, même hors du regard, se voit du coin de l'œil. */
      var z = convoi.position.z;
      voileConvoi = Math.min(douceur(z, 460, 300), douceur(z, -1360, -1120));
      for (var c3 = 0; c3 < convoi.children.length; c3++) {
        var f3 = convoi.children[c3].userData.fiche;
        if (f3) { voiler(f3, voileConvoi); }
      }
    }

    for (var w = 0; w < patrouille.length; w++) {
      var pa = patrouille[w];
      var sens = pa.userData.sens;
      pa.userData.angle += dt * sens;
      var an = pa.userData.angle, ra = pa.userData.rayon;
      pa.position.set(Math.cos(an) * ra, pa.userData.hauteur, Math.sin(an) * ra);
      /* Cap tangent à l'orbite, déduit du sens de rotation. Les
         valeurs écrites à la main étaient fausses d'un quart de
         tour : elles patrouillaient en crabe. */
      pa.rotation.y = -an + (sens > 0 ? 0 : Math.PI);
      pa.rotation.z = (sens > 0 ? -1 : 1) * 0.3;
    }

    /* battement des tuyères : une poussée n'est jamais parfaitement
       régulière, et c'est ce frémissement qui la rend vivante */
    for (var y = 0; y < tuyeres.length; y++) {
      var ty = tuyeres[y];
      var puls = 0.78 + 0.22 * Math.sin(t * 9 + y * 1.7) * Math.sin(t * 3.1 + y);
      var vo = ty.fiche && ty.fiche.groupe.parent === convoi ? voileConvoi : 1;
      ty.halo.material.opacity = 0.75 * puls * vo;
      ty.halo.scale.setScalar(ty.base * 4.6 * (0.9 + puls * 0.15));
      ty.sillage.material.opacity = 0.38 * puls * vo;
    }

    marquerFragments();
    moteur.render(scene, camera);
  }

  dimensionner();
  mesurer();
  avance = cible;
  marquerFragments();

  if (doux) {
    fragments.forEach(function (f) { f.classList.add('fragment--vu'); });
    moteur.render(scene, camera);
  } else {
    boucle();
  }

  window.addEventListener('load', dimensionner);
  setTimeout(dimensionner, 300);
})();
