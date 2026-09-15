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

  /* Le bâtiment descend l'axe du point de saut, donc sa proue
     regarde droit vers -Z. Une approche en biais donnait
     l'impression qu'il rentrait de travers dans la déchirure. */
  var CAP = Math.PI;

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

  /* ---------------------------------------------------------
     Lentille gravitationnelle
     ---------------------------------------------------------
     Trois coquilles très fines juste au-delà du bord, qui
     tournent à des vitesses différentes. Ce n'est pas de la
     vraie déviation de la lumière, mais c'est ce qui donne
     l'impression que l'espace est tordu autour du trou.
     --------------------------------------------------------- */
  var coquilles = [];
  [1.14, 1.33, 1.58].forEach(function (k, i) {
    var c = new THREE.Mesh(
      new THREE.TorusGeometry(RAYON * k, 0.7 + i * 0.35, 6, 128),
      new THREE.MeshBasicMaterial({
        color: i === 1 ? 0xffb8b8 : 0xe01020, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    c.rotation.x = (i - 1) * 0.16;
    c.rotation.y = (i - 1) * 0.1;
    c.userData.vitesse = (i % 2 ? 1 : -1) * (0.22 + i * 0.1);
    trou.add(c);
    coquilles.push(c);
  });

  /* ---------------------------------------------------------
     Gerbe de lumière
     ---------------------------------------------------------
     Une étoile à branches, toujours face à la caméra. C'est
     l'effet qui fait dire « ça s'ouvre » plutôt que « ça
     grandit ».
     --------------------------------------------------------- */
  var GERBE = (function () {
    var t = document.createElement('canvas');
    t.width = t.height = 512;
    var x = t.getContext('2d');
    x.translate(256, 256);
    x.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 46; i++) {
      var a = (i / 46) * Math.PI * 2;
      var l = 60 + (i % 3 === 0 ? 190 : (i % 2 ? 90 : 130)) * (0.6 + Math.random() * 0.4);
      var g = x.createLinearGradient(0, 0, Math.cos(a) * l, Math.sin(a) * l);
      g.addColorStop(0, 'rgba(255,240,240,0.85)');
      g.addColorStop(0.35, 'rgba(255,90,90,0.28)');
      g.addColorStop(1, 'rgba(224,16,32,0)');
      x.strokeStyle = g;
      x.lineWidth = i % 3 === 0 ? 3.5 : 1.6;
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(Math.cos(a) * l, Math.sin(a) * l);
      x.stroke();
    }
    var noyau = x.createRadialGradient(0, 0, 0, 0, 0, 70);
    noyau.addColorStop(0, 'rgba(255,255,255,0.95)');
    noyau.addColorStop(0.4, 'rgba(255,120,120,0.35)');
    noyau.addColorStop(1, 'rgba(224,16,32,0)');
    x.fillStyle = noyau;
    x.beginPath(); x.arc(0, 0, 70, 0, 6.2832); x.fill();
    return new THREE.CanvasTexture(t);
  })();

  var gerbe = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GERBE, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  gerbe.scale.setScalar(RAYON * 6);
  trou.add(gerbe);

  /* ---------------------------------------------------------
     Braises éjectées à l'ouverture
     ---------------------------------------------------------
     Leur distance ne dépend que du défilement : si on remonte,
     elles rentrent. Une animation libre aurait cassé la
     réversibilité de toute la séquence.
     --------------------------------------------------------- */
  var nbBraises = petit ? 300 : 900;
  var brPos = new Float32Array(nbBraises * 3);
  var brCol = new Float32Array(nbBraises * 3);
  var brDir = [];
  var cb = new THREE.Color();
  for (var ib = 0; ib < nbBraises; ib++) {
    var ab = Math.random() * 6.2832;
    var etal = 0.55 + Math.random() * 0.9;
    brDir.push([Math.cos(ab), Math.sin(ab), (Math.random() - 0.35) * 0.8, etal]);
    cb.set(Math.random() > 0.4 ? 0xff5a4a : 0xffd8d8);
    var lb = 0.4 + Math.random() * 0.6;
    brCol[ib * 3] = cb.r * lb; brCol[ib * 3 + 1] = cb.g * lb; brCol[ib * 3 + 2] = cb.b * lb;
  }
  var brGeo = new THREE.BufferGeometry();
  brGeo.setAttribute('position', new THREE.BufferAttribute(brPos, 3));
  brGeo.setAttribute('color', new THREE.BufferAttribute(brCol, 3));
  var braises = new THREE.Points(brGeo, new THREE.PointsMaterial({
    size: 4.6, sizeAttenuation: true, vertexColors: true, map: BRAISE,
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  trou.add(braises);

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
      window.ODN.aretesDe(geo, 20),
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
        /* On sépare le corps sombre des arêtes lumineuses : au
           fondu, les arêtes doivent mourir les premières, sinon
           le bâtiment finit en spectre blanc au lieu de
           s'enfoncer dans le noir de la gorge. */
        if (m.transparent) {
          liste.push({ m: m, base: m.opacity, vif: m.blending === THREE.AdditiveBlending });
        }
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
    /* La coque réelle arrive par le réseau. Le relevé fait ici ne
       voit qu'un groupe vide : sans ce rattrapage, le bâtiment ne
       s'effacerait jamais en franchissant le seuil. */
    if (navire.userData.quandPret) {
      navire.userData.quandPret.then(function (c) {
        if (c) { coques = coques.concat(recolter(c)); }
      }, function () {});
    }

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

    /* Tout ce qui est un voile additif large doit s'effacer avant
       que la caméra ne le traverse : vue de l'intérieur, une telle
       nappe n'est plus un halo, c'est un écran blanc posé devant
       le sujet. */
    var retrait = 1 - palier(avance, 0.72, 0.88);

    /* --- le trou de ver --- */
    var ampleur = (0.06 + ouverture * 0.94) * (1 - fermeture * 0.98);
    trou.scale.setScalar(ampleur);
    anneauMat.uniforms.temps.value = t;
    anneauMat.uniforms.ouverture.value = Math.max(charge * 0.35, ouverture) * (1 - fermeture);
    gorgeMat.uniforms.temps.value = t;
    gorgeMat.uniforms.ouverture.value = ouverture * (1 - fermeture);
    fond.material.opacity = ouverture * (1 - fermeture);
    halo.material.opacity = (0.15 * charge + 0.55 * ouverture) * (1 - fermeture * 0.7) * retrait;
    halo.scale.setScalar(RAYON * (4 + ouverture * 2.4));
    trou.rotation.z += dt * 0.12;

    /* coquilles de lentille : elles tournent chacune à son rythme */
    for (var q = 0; q < coquilles.length; q++) {
      var co = coquilles[q];
      co.rotation.z += dt * co.userData.vitesse;
      co.material.opacity = (0.06 * charge + 0.3 * ouverture) * (1 - fermeture) * retrait;
      co.scale.setScalar(1 + ouverture * 0.12 + Math.sin(t * 1.3 + q) * 0.01);
    }

    /* gerbe : elle culmine à l'instant où la déchirure cède,
       puis se retire. C'est le pic de l'acte. */
    var pic = 4 * ouverture * (1 - ouverture);
    gerbe.material.opacity = Math.min(1, (0.12 * charge + pic * 0.9 + ouverture * 0.22)) * (1 - fermeture) * retrait;
    gerbe.scale.setScalar(RAYON * (4.4 + pic * 3.4 + ouverture * 1.6));
    gerbe.material.rotation = t * 0.06;

    /* braises éjectées */
    var souffle = palier(avance, 0.42, 0.86);
    var bp = brGeo.attributes.position.array;
    for (var ib2 = 0; ib2 < nbBraises; ib2++) {
      var d0 = brDir[ib2];
      var dist = RAYON * (1.02 + souffle * 4.2 * d0[3]);
      bp[ib2 * 3] = d0[0] * dist;
      bp[ib2 * 3 + 1] = d0[1] * dist;
      bp[ib2 * 3 + 2] = d0[2] * dist * 0.45;
    }
    brGeo.attributes.position.needsUpdate = true;
    braises.material.opacity = Math.pow(1 - souffle, 1.6) * Math.min(1, souffle * 6) * 0.85;

    /* ondes de choc, réglées sur l'ouverture et non sur l'horloge */
    for (var w = 0; w < ondes.length; w++) {
      var depart = 0.36 + w * 0.07;
      var pr = palier(avance, depart, depart + 0.22);
      /* Une onde qui grandit sans fin finit par barrer l'écran
         d'un cercle parfait : on la borne et on l'éteint tôt. */
      ondes[w].scale.setScalar(1 + pr * 1.9);
      ondes[w].material.opacity = pr < 0.02 ? 0 : Math.pow(1 - pr, 2.2) * 0.6 * retrait;
    }

    /* spirale aspirée */
    var sp = spGeo.attributes.position.array;
    /* Même raison pour la spirale : vue de trop près, un point de
       3 px devient une tache de 200 px. */
    spirale.material.opacity = Math.min(1, charge * 0.9 + ouverture * 0.4) * (1 - fermeture) * retrait;
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
      /* Aligné sur l'axe du trou, il ne fait qu'avancer. Le
         volume vient de l'angle de la caméra, pas d'une
         trajectoire de travers. */
      /* Il ne s'arrête pas au plan de la déchirure : il continue
         de s'enfoncer jusqu'au bout de l'acte. C'est la distance,
         autant que le fondu, qui le fait disparaître. */
      var plongeon = palier(avance, 0.58, 1.0);
      navire.position.set(
        Math.sin(t * 0.3) * 2.2,
        Math.cos(t * 0.24) * 1.8,
        300 - plongeon * 640
      );
      /* La proue des modèles est en +Z : pour descendre vers -Z
         il faut un lacet de PI. Les valeurs écrites à la main le
         faisaient voler à reculons, tuyères en avant. */
      navire.rotation.set(
        0.05 - entree * 0.05 + Math.sin(t * 0.21) * 0.012,
        CAP,
        0.08 - entree * 0.08 + Math.sin(t * 0.17) * 0.012
      );
      /* il s'étire en franchissant le seuil */
      navire.scale.set(4.2, 4.2, 4.2 * (1 + plongeon * plongeon * 2.2));

      /* Il ne s'éteint pas : il est avalé. Le fondu court sur
         toute la fin de l'acte, et les arêtes lumineuses partent
         avant le corps : le bâtiment s'assombrit en s'enfonçant
         au lieu de blanchir puis de sauter d'un coup. */
      var voile = 1 - palier(plongeon, 0.52, 1.0);
      var voileVif = Math.pow(voile, 3.2);
      for (var v2 = 0; v2 < coques.length; v2++) {
        var cq = coques[v2];
        cq.m.opacity = cq.base * (cq.vif ? voileVif : voile);
      }
      navire.visible = voile > 0.002;

      var pousse = 0.5 + charge * 0.6 + plongeon * 1.8;
      for (var y = 0; y < tuyeres.length; y++) {
        var ty = tuyeres[y];
        var puls = 0.82 + 0.18 * Math.sin(t * 8 + y * 1.3);
        /* Les tuyères s'éteignent avant la coque : un halo additif
           qui survit au fondu se lit comme une tache blanche. */
        ty.halo.material.opacity = Math.min(1, 0.55 * pousse * puls) * voileVif;
        /* Bridé : à pleine poussée les halos additifs grossissaient
           au point de recouvrir la coque d'un voile blanc. */
        ty.halo.scale.setScalar(ty.base * 5.5 * (0.8 + Math.min(pousse, 1.5) * 0.34));
      }
    }

    /* --- la caméra : plan large, puis on s'engage derrière lui --- */
    /* La caméra ne vise pas un point fixe : elle vise entre le
       vaisseau et la déchirure, et glisse vers la déchirure à
       mesure qu'il s'y engage. Des coordonnées écrites en dur
       cadraient juste à un moment du trajet et rataient tous
       les autres. */
    /* La caméra se tient en retrait du bâtiment, côté bâbord, et
       glisse vers la déchirure à mesure qu'il s'y engage. Elle est
       à gauche de l'axe pour que le sujet se présente à droite,
       là où le tableau de bord ne le recouvre pas. */
    ancre.copy(navire ? navire.position : trou.position);
    ancre.lerp(trou.position, entree);

    visee.copy(navire ? navire.position : trou.position);
    visee.lerp(trou.position, 0.55 + entree * 0.45);

    /* Puis elle se retire pour assister au scellement : rester
       le nez dans la gorge ne donnait qu'un voile rouge uniforme,
       alors que le plan de fin doit montrer la déchirure se
       refermer sur le vide. */
    /* Sur un écran étroit le champ horizontal est bien plus
       serré : le même décalage bâbord sortait la déchirure du
       cadre. On se place plus dans l'axe et plus en retrait. */
    var ecart = petit ? 56 : 132;
    var recul = petit ? 430 : 310;
    camera.position.set(
      ancre.x - ecart + entree * ecart * 0.6 - fermeture * 46,
      ancre.y + 48 - entree * 30 + fermeture * 34,
      ancre.z + recul - entree * recul * 0.51 + fermeture * 250
    );
    camera.lookAt(visee);
    camera.rotation.z += entree * 0.12 * Math.sin(t * 0.4);

    /* Secousse : maximale au moment où la déchirure cède, nulle
       avant et après. Elle passe par la rotation et non par la
       position, pour ne pas décadrer le sujet. */
    var choc = pic * 0.012;
    camera.rotation.x += Math.sin(t * 41) * choc;
    camera.rotation.y += Math.sin(t * 37 + 1.7) * choc;
    camera.rotation.z += Math.sin(t * 53 + 0.4) * choc * 0.6;

    /* l'éclat, lui, est peint par-dessus la page */
    section.style.setProperty('--eclat', (pic * 0.5 * (1 - fermeture)).toFixed(3));

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
