/* =========================================================
   L'ORDRE DU NÉANT — le Saut
   ---------------------------------------------------------
   Un bâtiment de ligne se présente à un point de saut. Le
   moteur quantique se charge, la déchirure s'ouvre, le
   vaisseau s'y engage, et tout se referme derrière lui.

   Chaque phase est une fonction du défilement, jamais du
   temps : si on remonte, le trou de ver se referme dans
   l'ordre inverse. Seuls le scintillement et la rotation
   dépendent de l'horloge.
   ========================================================= */
(function () {
  'use strict';

  var section = document.getElementById('saut');
  var hote = document.getElementById('saut-scene');
  if (!section || !hote || typeof THREE === 'undefined') { return; }

  var CATALOGUE = (window.ODN && window.ODN.vaisseaux) || null;

  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var petit = window.innerWidth < 860;

  var fragments = Array.prototype.slice.call(section.querySelectorAll('.fragment'));
  var jauge = document.getElementById('saut-jauge');
  var chiffre = document.getElementById('saut-charge');

  var moteur;
  try {
    moteur = new THREE.WebGLRenderer({ antialias: !petit, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }

  moteur.setPixelRatio(Math.min(window.devicePixelRatio || 1, petit ? 1.25 : 1.6));
  moteur.setClearColor(0x000000, 0);
  moteur.domElement.setAttribute('aria-hidden', 'true');
  hote.appendChild(moteur.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(52, 1, 0.5, 6000);

  var ROUGE = 0xe01020;

  /* atan2(dx, dz) de la trajectoire du bâtiment */
  var CAP = Math.atan2(0 - 212, -142 - 188);

  function pastille(couleurs) {
    var t = document.createElement('canvas');
    t.width = t.height = 128;
    var x = t.getContext('2d');
    var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    couleurs.forEach(function (c) { g.addColorStop(c[0], c[1]); });
    x.fillStyle = g; x.beginPath(); x.arc(64, 64, 64, 0, 6.2832); x.fill();
    return new THREE.CanvasTexture(t);
  }

  var POINT = pastille([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]);
  var BRAISE = pastille([
    [0, 'rgba(255,245,245,1)'], [0.18, 'rgba(255,90,90,0.9)'],
    [0.5, 'rgba(224,16,32,0.35)'], [1, 'rgba(224,16,32,0)']
  ]);

  /* ---------------------------------------------------------
     Champ d'étoiles local
     --------------------------------------------------------- */
  (function () {
    var nb = petit ? 1400 : 3200;
    var pos = new Float32Array(nb * 3);
    for (var i = 0; i < nb; i++) {
      var r = 700 + Math.random() * 2200;
      var u = Math.random() * 2 - 1, ph = Math.random() * 6.2832;
      var sq = Math.sqrt(1 - u * u);
      pos[i * 3] = sq * Math.cos(ph) * r;
      pos[i * 3 + 1] = u * r;
      pos[i * 3 + 2] = sq * Math.sin(ph) * r;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xcfd4dc, size: 4.2, sizeAttenuation: true, map: POINT,
      transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending
    })));
  })();

  /* =========================================================
     LE POINT DE SAUT
     ========================================================= */
  var trou = new THREE.Group();
  trou.position.set(0, 0, -150);
  scene.add(trou);

  var RAYON = 106;

  /* Occultation : un cône noir de la même forme que la gorge.
     Un disque plat posé à l'entrée se coupait avec le cône et
     laissait un quartier net en travers de l'ouverture. Ici la
     paroi masque les étoiles sur toute la profondeur. */
  var fondGeo = new THREE.CylinderGeometry(RAYON * 0.955, RAYON * 0.08, 520, 64, 1, true);
  var fond = new THREE.Mesh(fondGeo, new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false
  }));
  fond.rotation.x = Math.PI / 2;
  fond.position.z = -260;
  fond.renderOrder = 1;
  trou.add(fond);

  /* la gorge : un cône ouvert, vu de l'intérieur */
  var gorgeMat = new THREE.ShaderMaterial({
    uniforms: { temps: { value: 0 }, ouverture: { value: 0 } },
    vertexShader:
      'varying vec2 vUv; void main(){ vUv = uv;' +
      ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'uniform float temps; uniform float ouverture; varying vec2 vUv;',
      'void main(){',
      '  float d = vUv.y;',
      /* stries en spirale : elles tournent vers le fond */
      '  float s = sin(vUv.x * 46.0 + d * 26.0 - temps * 3.2);',
      '  float s2 = sin(vUv.x * 19.0 - d * 12.0 + temps * 1.7);',
      '  float stries = smoothstep(0.1, 1.0, s * 0.6 + s2 * 0.4);',
      '  vec3 chaud = vec3(1.0, 0.86, 0.86);',
      '  vec3 sang  = vec3(0.88, 0.06, 0.13);',
      '  vec3 c = mix(sang, chaud, pow(d, 2.6));',
      '  float a = (0.08 + stries * 0.42) * (0.2 + d * 1.1) * ouverture;',
      '  gl_FragColor = vec4(c, a);',
      '}'
    ].join('\n'),
    transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.BackSide
  });
  var gorge = new THREE.Mesh(
    new THREE.CylinderGeometry(RAYON * 0.96, RAYON * 0.1, 520, 72, 1, true),
    gorgeMat
  );
  gorge.rotation.x = Math.PI / 2;
  gorge.position.z = -260;
  gorge.renderOrder = 2;
  trou.add(gorge);

  /* l'anneau de déchirure */
  var anneauMat = new THREE.ShaderMaterial({
    uniforms: { temps: { value: 0 }, ouverture: { value: 0 } },
    vertexShader:
      'varying vec2 vUv; void main(){ vUv = uv;' +
      ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'uniform float temps; uniform float ouverture; varying vec2 vUv;',
      'void main(){',
      '  float b = sin(vUv.x * 78.0 - temps * 5.0) * 0.5 + 0.5;',
      '  float b2 = sin(vUv.x * 23.0 + temps * 2.2) * 0.5 + 0.5;',
      '  float bord = sin(vUv.y * 3.1416);',
      '  vec3 c = mix(vec3(1.0,0.09,0.15), vec3(1.0,0.97,0.95), pow(b * b2, 0.7));',
      '  float a = ouverture * bord * (0.45 + b * 0.55);',
      '  gl_FragColor = vec4(c, a);',
      '}'
    ].join('\n'),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  var anneau = new THREE.Mesh(new THREE.TorusGeometry(RAYON, 3.4, 12, 128), anneauMat);
  anneau.renderOrder = 3;
  trou.add(anneau);

  /* halo général */
  var halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: BRAISE, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  halo.scale.setScalar(RAYON * 5.5);
  trou.add(halo);

  /* ondes de choc : trois anneaux qui partent à l'ouverture */
  var ondes = [];
  for (var o = 0; o < 3; o++) {
    var on = new THREE.Mesh(
      new THREE.RingGeometry(RAYON * 0.98, RAYON, 96),
      new THREE.MeshBasicMaterial({
        color: 0xffd0d0, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      })
    );
    trou.add(on);
    ondes.push(on);
  }

  /* la matière aspirée : une spirale qui converge */
  var nbSpire = petit ? 1200 : 3400;
  var spPos = new Float32Array(nbSpire * 3);
  var spCol = new Float32Array(nbSpire * 3);
  var spR = new Float32Array(nbSpire);
  var spA = new Float32Array(nbSpire);
  var spZ = new Float32Array(nbSpire);
  var teinte = new THREE.Color();
  for (var i2 = 0; i2 < nbSpire; i2++) {
    spR[i2] = RAYON * (1.1 + Math.pow(Math.random(), 0.6) * 4.2);
    spA[i2] = Math.random() * 6.2832;
    spZ[i2] = (Math.random() - 0.2) * 300;
    teinte.set(Math.random() > 0.55 ? 0xe01020 : 0xd8dce4);
    var l = 0.35 + Math.random() * 0.65;
    spCol[i2 * 3] = teinte.r * l; spCol[i2 * 3 + 1] = teinte.g * l; spCol[i2 * 3 + 2] = teinte.b * l;
  }
  var spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  spGeo.setAttribute('color', new THREE.BufferAttribute(spCol, 3));
  var spirale = new THREE.Points(spGeo, new THREE.PointsMaterial({
    size: 3.4, sizeAttenuation: true, vertexColors: true, map: POINT,
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  trou.add(spirale);

  /* arcs électriques au bord de la déchirure */
  var arcs = [];
  for (var e2 = 0; e2 < 7; e2++) {
    var pts = new Float32Array(14 * 3);
    var g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    var li = new THREE.Line(g2, new THREE.LineBasicMaterial({
      color: 0xffe0e0, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    trou.add(li);
    arcs.push({ ligne: li, geo: g2, prochain: 0 });
  }

  function redessinerArc(arc, force) {
    var p = arc.geo.attributes.position.array;
    var a0 = Math.random() * 6.2832;
    var etendue = 0.25 + Math.random() * 0.7;
    for (var k = 0; k < 14; k++) {
      var f = k / 13;
      var a = a0 + etendue * f;
      var r = RAYON * (1 + (Math.random() - 0.5) * 0.16);
      p[k * 3] = Math.cos(a) * r;
      p[k * 3 + 1] = Math.sin(a) * r;
      p[k * 3 + 2] = (Math.random() - 0.5) * 26 * force;
    }
    arc.geo.attributes.position.needsUpdate = true;
  }

  /* =========================================================
     LE BÂTIMENT
     ========================================================= */
  var tuyeres = [];

  function peindreCoque(geo, teinteC, opacite, opaciteAretes) {
    var g = new THREE.Group();
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x0a0b0e, transparent: true, opacity: 0.97
    })));
    g.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(geo, 20),
      new THREE.LineBasicMaterial({
        color: teinteC, transparent: true,
        opacity: Math.min(0.9, (opaciteAretes === undefined ? 0.6 : opaciteAretes) * 1.15),
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    ));
    return g;
  }

  /* Relevé des matières, pour une disparition en fondu plutôt
     qu'un escamotage d'une image à l'autre. */
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

  var coques = [];
  var navire = null;
  if (CATALOGUE && CATALOGUE.porteNeant) {
    navire = CATALOGUE.porteNeant(peindreCoque);
    navire.scale.setScalar(4.2);
    scene.add(navire);
    coques = recolter(navire);

    (navire.userData.moteurs || []).forEach(function (m) {
      var h = new THREE.Sprite(new THREE.SpriteMaterial({
        map: BRAISE, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      h.position.set(m[0], m[1], m[2]);
      h.scale.setScalar(m[3] * 5.5);
      navire.add(h);
      tuyeres.push({ halo: h, base: m[3] });
    });
  }

  /* ---------------------------------------------------------
     Défilement
     --------------------------------------------------------- */
  var avance = 0, cible = 0;

  function mesurer() {
    var r = section.getBoundingClientRect();
    var course = r.height - window.innerHeight;
    cible = course <= 0 ? 0 : Math.min(Math.max(-r.top / course, 0), 1);
  }

  function palier(x, a, b) {
    var t = (x - a) / (b - a);
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    return t * t * (3 - 2 * t);
  }

  function marquer() {
    var n = fragments.length;
    if (n) {
      var actif = Math.min(n - 1, Math.floor(avance * n));
      for (var i = 0; i < n; i++) {
        fragments[i].classList.toggle('fragment--vu', i === actif);
      }
    }
    var charge = Math.round(palier(avance, 0.04, 0.58) * 100);
    if (chiffre) { chiffre.textContent = String(charge).padStart(3, '0') + ' %'; }
    if (jauge) { jauge.style.setProperty('--charge', charge + '%'); }
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
  var visee = new THREE.Vector3();
  var ancre = new THREE.Vector3();

  function boucle() {
    requestAnimationFrame(boucle);
    if (!aLecran || !visible) { return; }

    var dt = Math.min(horloge.getDelta(), 0.05);
    var t = horloge.getElapsedTime();

    avance += (cible - avance) * (1 - Math.exp(-dt * 8));

    var charge    = palier(avance, 0.04, 0.42);
    var ouverture = palier(avance, 0.34, 0.60);
    var entree    = palier(avance, 0.58, 0.90);
    var fermeture = palier(avance, 0.88, 1.0);

    /* --- le trou de ver --- */
    var ampleur = (0.06 + ouverture * 0.94) * (1 - fermeture * 0.98);
    trou.scale.setScalar(ampleur);
    anneauMat.uniforms.temps.value = t;
    anneauMat.uniforms.ouverture.value = Math.max(charge * 0.35, ouverture) * (1 - fermeture);
    gorgeMat.uniforms.temps.value = t;
    gorgeMat.uniforms.ouverture.value = ouverture * (1 - fermeture);
    fond.material.opacity = ouverture * (1 - fermeture);
    halo.material.opacity = (0.15 * charge + 0.55 * ouverture) * (1 - fermeture * 0.7);
    halo.scale.setScalar(RAYON * (4 + ouverture * 2.4));
    trou.rotation.z += dt * 0.12;

    /* ondes de choc, réglées sur l'ouverture et non sur l'horloge */
    for (var w = 0; w < ondes.length; w++) {
      var depart = 0.36 + w * 0.07;
      var pr = palier(avance, depart, depart + 0.22);
      /* Une onde qui grandit sans fin finit par barrer l'écran
         d'un cercle parfait : on la borne et on l'éteint tôt. */
      ondes[w].scale.setScalar(1 + pr * 1.9);
      ondes[w].material.opacity = pr < 0.02 ? 0 : Math.pow(1 - pr, 2.2) * 0.6;
    }

    /* spirale aspirée */
    var sp = spGeo.attributes.position.array;
    spirale.material.opacity = Math.min(1, charge * 0.9 + ouverture * 0.4) * (1 - fermeture);
    for (var k2 = 0; k2 < nbSpire; k2++) {
      spA[k2] += dt * (2.4 + charge * 5) / (spR[k2] / RAYON);
      var r2 = spR[k2] * (1 - charge * 0.72);
      sp[k2 * 3] = Math.cos(spA[k2]) * r2;
      sp[k2 * 3 + 1] = Math.sin(spA[k2]) * r2;
      sp[k2 * 3 + 2] = spZ[k2] * (1 - charge * 0.55) + charge * 30;
    }
    spGeo.attributes.position.needsUpdate = true;

    /* arcs : ils claquent quand la déchirure travaille */
    var intensite = Math.min(1, charge * 0.6 + ouverture * (1 - ouverture) * 3.4);
    for (var a2 = 0; a2 < arcs.length; a2++) {
      var arc = arcs[a2];
      arc.prochain -= dt;
      if (arc.prochain <= 0) {
        arc.prochain = 0.05 + Math.random() * 0.22;
        redessinerArc(arc, 0.4 + intensite);
        arc.ligne.material.opacity = intensite * (0.3 + Math.random() * 0.7);
      }
    }

    /* --- le bâtiment --- */
    if (navire) {
      /* Il vient de la droite, là où le tableau de bord ne gêne
         pas, et pique vers la déchirure. */
      navire.position.set(
        212 - entree * 212 + Math.sin(t * 0.3) * 2,
        16 - entree * 16 + Math.cos(t * 0.24) * 1.5,
        188 - entree * 330
      );
      /* Cap déduit de la trajectoire, qui est une droite : de
         (212, 16, 188) vers (0, 0, -142). La proue des modèles
         est en +Z, et les valeurs écrites à la main le faisaient
         voler à reculons, tuyères en avant. */
      navire.rotation.set(
        0.05 - entree * 0.05 + Math.sin(t * 0.21) * 0.012,
        CAP,
        0.08 - entree * 0.08 + Math.sin(t * 0.17) * 0.012
      );
      /* il s'étire en franchissant le seuil */
      navire.scale.set(4.2, 4.2, 4.2 * (1 + entree * entree * 2.6));

      /* Il ne s'éteint pas : il est avalé. Le fondu commence quand
         la proue franchit l'anneau et s'achève quand la poupe a
         disparu dans la gorge. */
      var voile = 1 - palier(entree, 0.74, 0.99);
      for (var v2 = 0; v2 < coques.length; v2++) {
        coques[v2].m.opacity = coques[v2].base * voile;
      }
      navire.visible = voile > 0.005;

      var pousse = 0.5 + charge * 0.6 + entree * 1.8;
      for (var y = 0; y < tuyeres.length; y++) {
        var ty = tuyeres[y];
        var puls = 0.82 + 0.18 * Math.sin(t * 8 + y * 1.3);
        ty.halo.material.opacity = Math.min(1, 0.55 * pousse * puls) * voile;
        ty.halo.scale.setScalar(ty.base * 5.5 * (0.8 + pousse * 0.5));
      }
    }

    /* --- la caméra : plan large, puis on s'engage derrière lui --- */
    /* La caméra ne vise pas un point fixe : elle vise entre le
       vaisseau et la déchirure, et glisse vers la déchirure à
       mesure qu'il s'y engage. Des coordonnées écrites en dur
       cadraient juste à un moment du trajet et rataient tous
       les autres. */
    ancre.copy(navire ? navire.position : trou.position);
    var vers = 0.5 + entree * 0.5;
    visee.set(
      ancre.x + (trou.position.x - ancre.x) * vers,
      ancre.y + (trou.position.y - ancre.y) * vers,
      ancre.z + (trou.position.z - ancre.z) * vers
    );

    var app = palier(avance, 0, 0.62);
    camera.position.set(
      visee.x + 150 - app * 60 - entree * 30,
      visee.y + 48 - app * 20 - entree * 14,
      visee.z + 400 - app * 130 - entree * 120
    );
    camera.lookAt(visee);
    camera.rotation.z += entree * 0.12 * Math.sin(t * 0.4);

    marquer();
    moteur.render(scene, camera);
  }

  dimensionner();
  mesurer();
  avance = cible;
  marquer();

  if (doux) {
    fragments.forEach(function (x) { x.classList.add('fragment--vu'); });
    moteur.render(scene, camera);
  } else {
    boucle();
  }

  window.addEventListener('load', dimensionner);
  setTimeout(dimensionner, 300);
})();
