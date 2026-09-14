/* =========================================================
   L'ORDRE DU NÉANT - scène WebGL persistante
   Champ d'étoiles, Néant, anneau de poussière, débris,
   poussière attirée par le curseur. Caméra pilotée par le
   défilement.
   ========================================================= */
(function () {
  'use strict';

  var toile = document.getElementById('neant');
  if (!toile || typeof THREE === 'undefined') { return; }

  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var petit = window.innerWidth < 860;

  var moteur;
  try {
    moteur = new THREE.WebGLRenderer({
      canvas: toile, antialias: !petit, alpha: true, powerPreference: 'high-performance'
    });
  } catch (e) { return; }

  moteur.setPixelRatio(Math.min(window.devicePixelRatio || 1, petit ? 1.25 : 1.6));
  moteur.setSize(window.innerWidth, window.innerHeight);
  moteur.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.00055);

  var camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 2600);
  camera.position.set(0, 0, 210);

  /* pastille ronde : sans elle les points sont des carrés */
  var PASTILLE = (function () {
    var t = document.createElement('canvas');
    t.width = t.height = 64;
    var x = t.getContext('2d');
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.28, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.65, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 32, 0, 6.2832); x.fill();
    return new THREE.CanvasTexture(t);
  })();

  var ROUGE = new THREE.Color(0xe01020);
  var BRAISE = new THREE.Color(0xff4d4d);
  var ARGENT = new THREE.Color(0xeef0f4);
  var CENDRE = new THREE.Color(0x868b95);

  /* ---------------------------------------------------------
     Champ d'étoiles : deux coquilles
     --------------------------------------------------------- */
  function coquille(nombre, rayonMin, rayonMax, taille, opacite) {
    var pos = new Float32Array(nombre * 3);
    var col = new Float32Array(nombre * 3);
    var c = new THREE.Color();
    for (var i = 0; i < nombre; i++) {
      var r = rayonMin + Math.random() * (rayonMax - rayonMin);
      var t = Math.random() * Math.PI * 2;
      var p = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      pos[i * 3 + 2] = r * Math.cos(p);

      var d = Math.random();
      if (d > 0.965)      { c.copy(BRAISE); }
      else if (d > 0.9)   { c.copy(ROUGE).lerp(ARGENT, 0.45); }
      else if (d > 0.55)  { c.copy(ARGENT); }
      else                { c.copy(CENDRE); }
      var g = 0.35 + Math.random() * 0.65;
      col[i * 3] = c.r * g; col[i * 3 + 1] = c.g * g; col[i * 3 + 2] = c.b * g;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({
      size: taille, sizeAttenuation: true, vertexColors: true,
      map: PASTILLE, alphaTest: 0.01, fog: false,
      transparent: true, opacity: opacite, depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    return new THREE.Points(geo, mat);
  }

  var etoilesProches = coquille(petit ? 3200 : 8000, 220, 900, 2.6, 0.9);
  var etoilesLoin    = coquille(petit ? 2400 : 6000, 900, 1900, 4.6, 0.5);
  scene.add(etoilesProches, etoilesLoin);

  /* ---------------------------------------------------------
     Nébuleuse : nappes sombres rouge et cendre
     --------------------------------------------------------- */
  function nappe(couleur, taille, opacite) {
    var t = document.createElement('canvas');
    t.width = t.height = 256;
    var x = t.getContext('2d');
    var g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(' + couleur + ',0.5)');
    g.addColorStop(0.35, 'rgba(' + couleur + ',0.2)');
    g.addColorStop(1, 'rgba(' + couleur + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    var tex = new THREE.CanvasTexture(t);
    var mat = new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: opacite,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var s = new THREE.Sprite(mat);
    s.scale.set(taille, taille, 1);
    return s;
  }

  var nappes = [];
  var recettes = [
    ['160,12,24', 620, 0.4, -420, 140, -520],
    ['110,8,18', 780, 0.32, 480, -180, -760],
    ['70,74,84', 700, 0.22, 120, 320, -980],
    ['150,14,26', 520, 0.28, -260, -300, -300]
  ];
  for (var n = 0; n < recettes.length; n++) {
    var r = recettes[n];
    var s = nappe(r[0], r[1], r[2]);
    s.position.set(r[3], r[4], r[5]);
    nappes.push(s); scene.add(s);
  }

  /* ---------------------------------------------------------
     Le Néant : sphère noire à liseré de Fresnel
     --------------------------------------------------------- */
  var neantGroupe = new THREE.Group();
  neantGroupe.position.set(-540, -280, -1180);
  neantGroupe.scale.setScalar(2.3);
  scene.add(neantGroupe);

  var corps = new THREE.Mesh(
    new THREE.SphereGeometry(30, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })
  );
  neantGroupe.add(corps);

  var lisereMat = new THREE.ShaderMaterial({
    uniforms: {
      teinteA: { value: new THREE.Color(0xe01020) },
      teinteB: { value: new THREE.Color(0xeef0f4) },
      temps:   { value: 0 }
    },
    vertexShader:
      'varying vec3 vN; varying vec3 vP;' +
      'void main(){ vN = normalize(normalMatrix * normal);' +
      ' vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz;' +
      ' gl_Position = projectionMatrix * mv; }',
    fragmentShader:
      'uniform vec3 teinteA; uniform vec3 teinteB; uniform float temps;' +
      'varying vec3 vN; varying vec3 vP;' +
      'void main(){' +
      ' vec3 v = normalize(-vP);' +
      ' vec3 n = normalize(vN);' +
      /* liseré très fin : le corps reste noir */
      ' float f = pow(1.0 - max(dot(v, n), 0.0), 7.0);' +
      /* éclipse : un côté embrasé, l\'autre éteint */
      ' float cote = smoothstep(-0.35, 0.95, dot(n, normalize(vec3(0.72, 0.5, 0.45))));' +
      ' float bat = 0.86 + 0.14 * sin(temps * 0.9);' +
      ' float i = f * (0.16 + cote * 0.84) * bat;' +
      ' vec3 c = mix(teinteA, teinteB, pow(cote, 2.6) * 0.62);' +
      ' gl_FragColor = vec4(c, i); }',
    transparent: true, blending: THREE.AdditiveBlending,
    side: THREE.BackSide, depthWrite: false, fog: false
  });
  var lisere = new THREE.Mesh(new THREE.SphereGeometry(31.2, 64, 64), lisereMat);
  neantGroupe.add(lisere);

  /* halo diffus : donne du volume a l'astre eteint */
  var halo = nappe('180,16,30', 200, 0.5);
  halo.position.set(9, 6, -14);
  neantGroupe.add(halo);

  /* ---------------------------------------------------------
     Anneau de poussière en rotation différentielle
     --------------------------------------------------------- */
  var nbAnneau = petit ? 1400 : 3600;
  var anneauPos = new Float32Array(nbAnneau * 3);
  var anneauCol = new Float32Array(nbAnneau * 3);
  var anneauRayon = new Float32Array(nbAnneau);
  var anneauAngle = new Float32Array(nbAnneau);
  var cA = new THREE.Color();
  for (var a = 0; a < nbAnneau; a++) {
    var ra = 42 + Math.pow(Math.random(), 1.6) * 62;
    var an = Math.random() * Math.PI * 2;
    anneauRayon[a] = ra; anneauAngle[a] = an;
    anneauPos[a * 3] = Math.cos(an) * ra;
    anneauPos[a * 3 + 1] = (Math.random() - 0.5) * 5 * (ra / 60);
    anneauPos[a * 3 + 2] = Math.sin(an) * ra;
    cA.copy(Math.random() > 0.72 ? ROUGE : CENDRE);
    var lum = 0.3 + Math.random() * 0.7;
    anneauCol[a * 3] = cA.r * lum; anneauCol[a * 3 + 1] = cA.g * lum; anneauCol[a * 3 + 2] = cA.b * lum;
  }
  var anneauGeo = new THREE.BufferGeometry();
  anneauGeo.setAttribute('position', new THREE.BufferAttribute(anneauPos, 3));
  anneauGeo.setAttribute('color', new THREE.BufferAttribute(anneauCol, 3));
  var anneau = new THREE.Points(anneauGeo, new THREE.PointsMaterial({
    size: 2.4, sizeAttenuation: true, vertexColors: true,
    map: PASTILLE, alphaTest: 0.01, fog: false,
    transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  anneau.rotation.x = 1.14;
  anneau.rotation.z = 0.24;
  neantGroupe.add(anneau);

  /* ---------------------------------------------------------
     Débris en dérive
     --------------------------------------------------------- */
  var debris = new THREE.Group();
  var nbDebris = petit ? 55 : 150;
  var debrisMat = new THREE.MeshBasicMaterial({ color: 0x0b0c0f, transparent: true, opacity: 0.9, fog: false });
  var debrisGeo = new THREE.TetrahedronGeometry(1, 0);
  for (var d = 0; d < nbDebris; d++) {
    var m = new THREE.Mesh(debrisGeo, debrisMat);

    /* Direction isotrope, rayon en racine cubique : les débris
       remplissent un volume au lieu de se poser sur une surface.
       Une coquille ou un cylindre se verrait par la tranche comme
       une ligne droite, ce qui trahit immédiatement la mécanique. */
    var u = Math.random() * 2 - 1;
    var ph = Math.random() * Math.PI * 2;
    var sq = Math.sqrt(1 - u * u);
    var rr = 190 + Math.pow(Math.random(), 0.62) * 720;
    var cz = -110 - Math.random() * 460;

    var bx = sq * Math.cos(ph) * rr;
    var by = u * rr * 0.88;
    var bz = sq * Math.sin(ph) * rr + cz;
    m.position.set(bx, by, bz);

    var e = 1.3 + Math.random() * 4.2;
    m.scale.set(e, e * (0.5 + Math.random()), e * (0.5 + Math.random()));
    m.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    m.userData.v = {
      x: (Math.random() - 0.5) * 0.0055,
      y: (Math.random() - 0.5) * 0.0055,
      z: (Math.random() - 0.5) * 0.0055
    };
    /* base + dérive bornée : la position ne s'accumule jamais */
    m.userData.b = { x: bx, y: by, z: bz };
    m.userData.p = Math.random() * 6.28;
    m.userData.a = 3 + Math.random() * 7;
    debris.add(m);
  }
  scene.add(debris);

  /* ---------------------------------------------------------
     Poussière attirée par le curseur
     --------------------------------------------------------- */
  var nbPous = petit ? 240 : 700;
  var pousPos = new Float32Array(nbPous * 3);
  var pousBase = new Float32Array(nbPous * 3);
  for (var p = 0; p < nbPous; p++) {
    var px = (Math.random() - 0.5) * 460;
    var py = (Math.random() - 0.5) * 300;
    var pz = 40 + Math.random() * 120;
    pousPos[p * 3] = pousBase[p * 3] = px;
    pousPos[p * 3 + 1] = pousBase[p * 3 + 1] = py;
    pousPos[p * 3 + 2] = pousBase[p * 3 + 2] = pz;
  }
  var pousGeo = new THREE.BufferGeometry();
  pousGeo.setAttribute('position', new THREE.BufferAttribute(pousPos, 3));
  var poussiere = new THREE.Points(pousGeo, new THREE.PointsMaterial({
    color: 0xc8ccd4, size: 1.5, sizeAttenuation: true,
    map: PASTILLE, alphaTest: 0.01, fog: false,
    transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(poussiere);

  /* ---------------------------------------------------------
     Entrées : souris, défilement
     --------------------------------------------------------- */
  var souris = { x: 0, y: 0 }, sourisLisse = { x: 0, y: 0 };
  /* hors champ tant que le pointeur n'a pas bougé : sinon toute la
     poussière se masse au centre de l'écran */
  var monde = { x: 1e5, y: 1e5 };

  window.addEventListener('pointermove', function (e) {
    souris.x = (e.clientX / window.innerWidth) * 2 - 1;
    souris.y = -((e.clientY / window.innerHeight) * 2 - 1);
    monde.x = souris.x * 210;
    monde.y = souris.y * 130;
  }, { passive: true });

  var avance = 0, avanceCible = 0;
  function mesureDefilement() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    avanceCible = h > 0 ? Math.min(Math.max(window.scrollY / h, 0), 1) : 0;
  }
  window.addEventListener('scroll', mesureDefilement, { passive: true });
  mesureDefilement();

  /* ---------------------------------------------------------
     Redimensionnement
     --------------------------------------------------------- */
  var minuteur;
  window.addEventListener('resize', function () {
    clearTimeout(minuteur);
    minuteur = setTimeout(function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      moteur.setSize(window.innerWidth, window.innerHeight);
    }, 140);
  }, { passive: true });

  var visible = true;
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
  });

  /* ---------------------------------------------------------
     Boucle
     --------------------------------------------------------- */
  var horloge = new THREE.Clock();

  function boucle() {
    requestAnimationFrame(boucle);
    if (!visible) { return; }

    var dt = Math.min(horloge.getDelta(), 0.05);
    var t = horloge.getElapsedTime();

    avance += (avanceCible - avance) * 0.06;
    sourisLisse.x += (souris.x - sourisLisse.x) * 0.045;
    sourisLisse.y += (souris.y - sourisLisse.y) * 0.045;

    /* caméra : traversée du champ selon six stations */
    var z = 210 - avance * 560;
    camera.position.z += (z - camera.position.z) * 0.08;
    camera.position.x += ((sourisLisse.x * 26) - camera.position.x) * 0.05;
    camera.position.y += ((sourisLisse.y * 16 + avance * 40) - camera.position.y) * 0.05;
    camera.lookAt(0, avance * 18, -160);

    /* étoiles */
    etoilesProches.rotation.y += dt * 0.009;
    etoilesProches.rotation.x = sourisLisse.y * 0.035;
    etoilesLoin.rotation.y -= dt * 0.0035;

    /* nébuleuse */
    for (var i = 0; i < nappes.length; i++) {
      nappes[i].material.opacity = recettes[i][2] * (0.72 + 0.28 * Math.sin(t * 0.22 + i));
    }

    /* Néant */
    lisereMat.uniforms.temps.value = t;
    neantGroupe.rotation.y += dt * 0.035;
    neantGroupe.position.y = Math.sin(t * 0.35) * 3.2;

    /* anneau en rotation différentielle */
    var ap = anneauGeo.attributes.position.array;
    for (var k = 0; k < nbAnneau; k++) {
      var rk = anneauRayon[k];
      anneauAngle[k] += dt * (2.6 / rk) * 1.6;
      ap[k * 3] = Math.cos(anneauAngle[k]) * rk;
      ap[k * 3 + 2] = Math.sin(anneauAngle[k]) * rk;
    }
    anneauGeo.attributes.position.needsUpdate = true;

    /* débris */
    for (var b = 0; b < debris.children.length; b++) {
      var o = debris.children[b];
      o.rotation.x += o.userData.v.x;
      o.rotation.y += o.userData.v.y;
      o.rotation.z += o.userData.v.z;
      var ba = o.userData.b, ph2 = o.userData.p, am = o.userData.a;
      o.position.x = ba.x + Math.sin(t * 0.07 + ph2) * am;
      o.position.y = ba.y + Math.cos(t * 0.055 + ph2 * 1.7) * am;
      o.position.z = ba.z + Math.sin(t * 0.045 + ph2 * 0.6) * am;
    }

    /* poussière attirée par le curseur */
    var pp = pousGeo.attributes.position.array;
    for (var q = 0; q < nbPous; q++) {
      var ix = q * 3, iy = ix + 1, iz = ix + 2;
      var dx = monde.x - pp[ix];
      var dy = monde.y - pp[iy];
      var dist2 = dx * dx + dy * dy + 900;
      var force = 240 / dist2;
      pp[ix] += dx * force + (pousBase[ix] - pp[ix]) * 0.012;
      pp[iy] += dy * force + (pousBase[iy] - pp[iy]) * 0.012;
      pp[iz] += (pousBase[iz] - pp[iz]) * 0.012 + Math.sin(t * 0.6 + q) * 0.008;
    }
    pousGeo.attributes.position.needsUpdate = true;

    moteur.render(scene, camera);
  }

  if (doux) {
    moteur.render(scene, camera);
  } else {
    boucle();
  }
})();
