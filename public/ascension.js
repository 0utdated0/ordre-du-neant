/* =========================================================
   L'ORDRE DU NÉANT — l'Ascension
   ---------------------------------------------------------
   Deuxième séquence pilotée par le défilement, mais dans
   l'autre sens : ici on monte.

   La mécanique dit la même chose que le texte. Six échelons,
   six paliers, et la caméra s'élève le long du fût. On ne
   saute pas un palier : on passe devant.
   ========================================================= */
(function () {
  'use strict';

  var section = document.getElementById('ascension');
  var hote = document.getElementById('ascension-scene');
  if (!section || !hote || typeof THREE === 'undefined') { return; }

  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var petit = window.innerWidth < 860;

  var cartes = Array.prototype.slice.call(section.querySelectorAll('.echelon'));
  var crans = Array.prototype.slice.call(section.querySelectorAll('.echelle-verticale .cran'));

  var moteur;
  try {
    moteur = new THREE.WebGLRenderer({ antialias: !petit, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }

  moteur.setPixelRatio(Math.min(window.devicePixelRatio || 1, petit ? 1.25 : 1.6));
  moteur.setClearColor(0x000000, 0);
  moteur.domElement.setAttribute('aria-hidden', 'true');
  hote.appendChild(moteur.domElement);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.0022);
  var camera = new THREE.PerspectiveCamera(56, 1, 0.5, 2000);

  var ROUGE = 0xe01020;
  var ARGENT = 0xeef0f4;

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
     Le fût et ses six paliers
     --------------------------------------------------------- */
  var NIVEAUX = [0, 46, 92, 138, 184, 230];
  var CONFERES = [false, false, false, false, true, true];

  function contour(geo, couleur, opacite) {
    return new THREE.LineSegments(
      new THREE.EdgesGeometry(geo, 18),
      new THREE.LineBasicMaterial({
        color: couleur, transparent: true, opacity: opacite,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: true
      })
    );
  }
  function plein(geo) {
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x08090c, transparent: true, opacity: 0.95, fog: true
    }));
  }

  var tour = new THREE.Group();
  scene.add(tour);

  var futG = new THREE.CylinderGeometry(7, 7, 300, 12, 1, true);
  var fut = plein(futG);
  fut.position.y = 115;
  tour.add(fut);
  var futL = contour(futG, ARGENT, 0.22);
  futL.position.y = 115;
  tour.add(futL);

  var paliers = [];
  NIVEAUX.forEach(function (y, i) {
    var g = new THREE.Group();
    g.position.y = y;

    var couleur = CONFERES[i] ? ROUGE : ARGENT;

    var plateauG = new THREE.TorusGeometry(21, 1.1, 8, 40);
    var plateau = contour(plateauG, couleur, CONFERES[i] ? 0.85 : 0.5);
    plateau.rotation.x = Math.PI / 2;
    g.add(plateau);

    var anneauG = new THREE.TorusGeometry(15, 0.5, 6, 32);
    var anneau = contour(anneauG, couleur, 0.35);
    anneau.rotation.x = Math.PI / 2;
    g.add(anneau);

    /* traverses : elles donnent l'échelle et marquent le passage */
    for (var b = 0; b < 4; b++) {
      var a = (b / 4) * Math.PI * 2 + (i % 2 ? 0.4 : 0);
      var brasG = new THREE.BoxGeometry(14, 0.7, 0.7);
      var bras = contour(brasG, couleur, 0.4);
      bras.position.set(Math.cos(a) * 14, 0, Math.sin(a) * 14);
      bras.rotation.y = -a;
      g.add(bras);
    }

    /* feu du palier */
    var feuG = new THREE.BufferGeometry();
    feuG.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
    var feu = new THREE.Points(feuG, new THREE.PointsMaterial({
      color: CONFERES[i] ? 0xff4d4d : 0xeef0f4,
      size: 16, sizeAttenuation: true, map: PASTILLE,
      transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    g.add(feu);

    g.userData.feu = feu;
    g.userData.plateau = plateau;
    tour.add(g);
    paliers.push(g);
  });

  /* ---------------------------------------------------------
     Braises qui montent
     ---------------------------------------------------------
     Elles vont dans le même sens que le regard. Une poussière
     qui tombe pendant qu'on monte annulerait la sensation.
     --------------------------------------------------------- */
  var nbBraises = petit ? 300 : 700;
  var braisePos = new Float32Array(nbBraises * 3);
  var braiseV = new Float32Array(nbBraises);
  for (var b2 = 0; b2 < nbBraises; b2++) {
    var r = 12 + Math.pow(Math.random(), 0.7) * 120;
    var a2 = Math.random() * Math.PI * 2;
    braisePos[b2 * 3] = Math.cos(a2) * r;
    braisePos[b2 * 3 + 1] = -60 + Math.random() * 380;
    braisePos[b2 * 3 + 2] = Math.sin(a2) * r;
    braiseV[b2] = 3 + Math.random() * 11;
  }
  var braiseG = new THREE.BufferGeometry();
  braiseG.setAttribute('position', new THREE.BufferAttribute(braisePos, 3));
  var braises = new THREE.Points(braiseG, new THREE.PointsMaterial({
    color: 0xff5a5a, size: 1.6, sizeAttenuation: true, map: PASTILLE,
    transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(braises);

  var nbPous = petit ? 240 : 560;
  var pousPos = new Float32Array(nbPous * 3);
  var pousV = new Float32Array(nbPous);
  for (var p = 0; p < nbPous; p++) {
    var rp = 20 + Math.random() * 240;
    var ap = Math.random() * Math.PI * 2;
    pousPos[p * 3] = Math.cos(ap) * rp;
    pousPos[p * 3 + 1] = -80 + Math.random() * 420;
    pousPos[p * 3 + 2] = Math.sin(ap) * rp;
    pousV[p] = 1 + Math.random() * 4;
  }
  var pousG = new THREE.BufferGeometry();
  pousG.setAttribute('position', new THREE.BufferAttribute(pousPos, 3));
  scene.add(new THREE.Points(pousG, new THREE.PointsMaterial({
    color: 0xbfc4cc, size: 1.1, sizeAttenuation: true, map: PASTILLE,
    transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending
  })));

  /* ---------------------------------------------------------
     Défilement
     --------------------------------------------------------- */
  var avance = 0, cible = 0;

  function mesurer() {
    var r = section.getBoundingClientRect();
    var course = r.height - window.innerHeight;
    cible = course <= 0 ? 0 : Math.min(Math.max(-r.top / course, 0), 1);
  }

  function marquer() {
    var n = cartes.length;
    if (!n) { return; }
    var actif = Math.min(n - 1, Math.floor(avance * n));
    for (var i = 0; i < n; i++) {
      cartes[i].classList.toggle('echelon--vu', i === actif);
      if (crans[i]) {
        crans[i].classList.toggle('cran--actif', i === actif);
        crans[i].classList.toggle('cran--franchi', i < actif);
      }
    }
  }

  var enAttente = false;
  window.addEventListener('scroll', function () {
    if (enAttente) { return; }
    enAttente = true;
    requestAnimationFrame(function () { mesurer(); enAttente = false; });
  }, { passive: true });
  window.addEventListener('resize', mesurer, { passive: true });

  function dimensionner() {
    var l = hote.clientWidth, h = hote.clientHeight;
    if (!l || !h) { return; }
    camera.aspect = l / h;
    camera.updateProjectionMatrix();

    /* Décaler la tour en visant à côté d'elle la ferait sortir du
       cadre en haut de course, où la caméra est près de l'axe. On
       décale donc la fenêtre de rendu, pas le regard : la tour
       glisse dans la moitié gauche et la fiche garde un fond noir. */
    if (camera.aspect > 1.15) {
      camera.setViewOffset(l, h, Math.round(l * 0.15), 0, l, h);
    } else {
      camera.clearViewOffset();
    }
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

  var horloge = new THREE.Clock();

  function boucle() {
    requestAnimationFrame(boucle);
    if (!aLecran || !visible) { return; }

    var dt = Math.min(horloge.getDelta(), 0.05);
    var t = horloge.getElapsedTime();

    avance += (cible - avance) * (1 - Math.exp(-dt * 9));

    /* la caméra monte, en tournant lentement autour du fût */
    var hauteur = -46 + avance * 322;
    var angle = -0.5 + avance * 1.5;
    var rayon = 72 - avance * 14;
    camera.position.set(
      Math.sin(angle) * rayon,
      hauteur,
      Math.cos(angle) * rayon
    );
    camera.lookAt(0, hauteur + 14, 0);

    /* le palier atteint s'allume */
    for (var i = 0; i < paliers.length; i++) {
      var proche = 1 - Math.min(1, Math.abs(NIVEAUX[i] - hauteur) / 60);
      paliers[i].userData.feu.material.opacity = 0.25 + proche * 0.75 * (0.7 + 0.3 * Math.sin(t * 2.4 + i));
      paliers[i].userData.plateau.material.opacity =
        (CONFERES[i] ? 0.45 : 0.3) + proche * 0.55;
      paliers[i].rotation.y += dt * (CONFERES[i] ? 0.09 : 0.05);
    }

    /* braises et poussière : elles montent, toujours */
    var bp = braiseG.attributes.position.array;
    for (var k = 0; k < nbBraises; k++) {
      bp[k * 3 + 1] += braiseV[k] * dt * 3;
      if (bp[k * 3 + 1] > 340) { bp[k * 3 + 1] = -70; }
    }
    braiseG.attributes.position.needsUpdate = true;

    var pp = pousG.attributes.position.array;
    for (var q = 0; q < nbPous; q++) {
      pp[q * 3 + 1] += pousV[q] * dt * 3;
      if (pp[q * 3 + 1] > 360) { pp[q * 3 + 1] = -90; }
    }
    pousG.attributes.position.needsUpdate = true;

    marquer();
    moteur.render(scene, camera);
  }

  dimensionner();
  mesurer();
  avance = cible;
  marquer();

  if (doux) {
    cartes.forEach(function (c) { c.classList.add('echelon--vu'); });
    moteur.render(scene, camera);
  } else {
    boucle();
  }

  window.addEventListener('load', dimensionner);
  setTimeout(dimensionner, 300);
})();
