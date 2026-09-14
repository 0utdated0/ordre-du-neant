/* =========================================================
   L'ORDRE DU NÉANT — ciel persistant
   ---------------------------------------------------------
   Un seul canevas fixe derrière toute la page : champ
   d'étoiles sur trois profondeurs, nappes de nébuleuse,
   poussière qui réagit au curseur, et étoiles filantes.

   Aucun maillage ici : uniquement des points et des traits.
   Un solide isolé se voit et se compte ; un point ne se
   remarque que par la masse. C'est ce qui évite qu'une
   structure apparaisse là où on ne veut voir qu'un fond.
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
  var camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 3000);
  camera.position.set(0, 0, 210);

  var ROUGE = new THREE.Color(0xe01020);
  var BRAISE = new THREE.Color(0xff4d4d);
  var ARGENT = new THREE.Color(0xeef0f4);
  var CENDRE = new THREE.Color(0x868b95);

  /* pastille ronde : sans elle les points sont des carrés */
  var PASTILLE = (function () {
    var t = document.createElement('canvas');
    t.width = t.height = 64;
    var x = t.getContext('2d');
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.26, 'rgba(255,255,255,0.88)');
    g.addColorStop(0.62, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 32, 0, 6.2832); x.fill();
    return new THREE.CanvasTexture(t);
  })();

  /* ---------------------------------------------------------
     Champ d'étoiles : trois coquilles pour la profondeur
     --------------------------------------------------------- */
  function coquille(nombre, rMin, rMax, taille, opacite) {
    var pos = new Float32Array(nombre * 3);
    var col = new Float32Array(nombre * 3);
    var c = new THREE.Color();
    for (var i = 0; i < nombre; i++) {
      var r = rMin + Math.random() * (rMax - rMin);
      var u = Math.random() * 2 - 1;
      var ph = Math.random() * Math.PI * 2;
      var sq = Math.sqrt(1 - u * u);
      pos[i * 3]     = sq * Math.cos(ph) * r;
      pos[i * 3 + 1] = u * r;
      pos[i * 3 + 2] = sq * Math.sin(ph) * r;

      var d = Math.random();
      if (d > 0.972)      { c.copy(BRAISE); }
      else if (d > 0.93)  { c.copy(ROUGE).lerp(ARGENT, 0.5); }
      else if (d > 0.5)   { c.copy(ARGENT); }
      else                { c.copy(CENDRE); }
      var g = 0.32 + Math.random() * 0.68;
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

  var proche = coquille(petit ? 2600 : 6000, 260, 800, 2.5, 0.95);
  var moyen  = coquille(petit ? 2200 : 5200, 800, 1500, 4.2, 0.62);
  var loin   = coquille(petit ? 1800 : 4200, 1500, 2400, 6.5, 0.4);
  scene.add(proche, moyen, loin);

  /* ---------------------------------------------------------
     Nébuleuse : nappes en dégradé
     --------------------------------------------------------- */
  function nappe(couleur, taille, opacite) {
    var t = document.createElement('canvas');
    t.width = t.height = 256;
    var x = t.getContext('2d');
    var g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(' + couleur + ',0.55)');
    g.addColorStop(0.3, 'rgba(' + couleur + ',0.22)');
    g.addColorStop(0.62, 'rgba(' + couleur + ',0.07)');
    g.addColorStop(1, 'rgba(' + couleur + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    var tex = new THREE.CanvasTexture(t);
    var s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: opacite,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    s.scale.set(taille, taille, 1);
    return s;
  }

  var recettes = [
    ['170,14,26', 760, 0.42, -520, 200, -640],
    ['120,10,20', 940, 0.34, 600, -240, -960],
    ['118,124,136', 820, 0.2, 180, 400, -1280],
    ['160,16,28', 620, 0.3, -320, -380, -420],
    ['96,102,112', 700, 0.16, 520, 260, -760]
  ];
  var nappes = recettes.map(function (r) {
    var s = nappe(r[0], r[1], r[2]);
    s.position.set(r[3], r[4], r[5]);
    scene.add(s);
    return s;
  });

  /* ---------------------------------------------------------
     Le Néant : astre éclipsé, loin en bas à gauche
     --------------------------------------------------------- */
  var neantGroupe = new THREE.Group();
  neantGroupe.position.set(-540, -280, -1180);
  neantGroupe.scale.setScalar(2.3);
  scene.add(neantGroupe);

  neantGroupe.add(new THREE.Mesh(
    new THREE.SphereGeometry(30, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })
  ));

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
      ' float f = pow(1.0 - max(dot(v, n), 0.0), 7.0);' +
      ' float cote = smoothstep(-0.35, 0.95, dot(n, normalize(vec3(0.72, 0.5, 0.45))));' +
      ' float bat = 0.86 + 0.14 * sin(temps * 0.9);' +
      ' float i = f * (0.16 + cote * 0.84) * bat;' +
      ' vec3 c = mix(teinteA, teinteB, pow(cote, 2.6) * 0.62);' +
      ' gl_FragColor = vec4(c, i); }',
    transparent: true, blending: THREE.AdditiveBlending,
    side: THREE.BackSide, depthWrite: false, fog: false
  });
  neantGroupe.add(new THREE.Mesh(new THREE.SphereGeometry(31.2, 48, 48), lisereMat));

  var halo = nappe('180,16,30', 200, 0.5);
  halo.position.set(9, 6, -14);
  neantGroupe.add(halo);

  /* anneau de poussière en rotation différentielle */
  var nbAnneau = petit ? 1200 : 3000;
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
     Étoiles filantes
     ---------------------------------------------------------
     Un trait dégradé qui traverse le champ, puis se rhabille
     ailleurs. Rares et brèves : c'est ce qui les rend belles.
     --------------------------------------------------------- */
  var TRAINEE = (function () {
    var t = document.createElement('canvas');
    t.width = 128; t.height = 8;
    var x = t.getContext('2d');
    var g = x.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(238,240,244,0.55)');
    g.addColorStop(0.88, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 8);
    var v = x.createLinearGradient(0, 0, 0, 8);
    v.addColorStop(0, 'rgba(0,0,0,1)');
    v.addColorStop(0.5, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = v; x.fillRect(0, 0, 128, 8);
    return new THREE.CanvasTexture(t);
  })();

  function Filante(rougeoyante) {
    var mat = new THREE.MeshBasicMaterial({
      map: TRAINEE, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
      color: rougeoyante ? 0xff6a6a : 0xffffff, fog: false
    });
    this.maille = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    this.maille.visible = false;
    this.vie = 0;
    this.duree = 0;
    this.attente = 1 + Math.random() * 7;
    scene.add(this.maille);
  }

  Filante.prototype.lancer = function () {
    /* Toujours devant la caméra, jamais derrière : une filante
       qu'on ne voit pas est du calcul perdu. */
    var z = camera.position.z - (260 + Math.random() * 520);
    var etendue = 520 + Math.random() * 380;
    this.depart = new THREE.Vector3(
      (Math.random() - 0.5) * 900,
      160 + Math.random() * 300,
      z
    );
    var angle = -0.5 - Math.random() * 0.9;
    this.direction = new THREE.Vector3(
      Math.cos(angle) * (Math.random() > 0.5 ? 1 : -1),
      Math.sin(angle),
      0
    ).normalize();
    this.longueur = 90 + Math.random() * 190;
    this.portee = etendue;
    this.duree = 0.7 + Math.random() * 0.7;
    this.vie = 0;
    this.maille.visible = true;
    this.maille.scale.set(this.longueur, 3.2 + Math.random() * 3, 1);
    this.maille.rotation.z = Math.atan2(this.direction.y, this.direction.x);
  };

  Filante.prototype.avancer = function (dt) {
    if (!this.maille.visible) {
      this.attente -= dt;
      if (this.attente <= 0) {
        this.attente = 3 + Math.random() * 11;
        this.lancer();
      }
      return;
    }
    this.vie += dt;
    var t = this.vie / this.duree;
    if (t >= 1) { this.maille.visible = false; this.maille.material.opacity = 0; return; }
    var d = t * this.portee;
    this.maille.position.set(
      this.depart.x + this.direction.x * d,
      this.depart.y + this.direction.y * d,
      this.depart.z
    );
    /* montée vive, extinction longue : une traînée, pas un clignotant */
    this.maille.material.opacity = t < 0.14
      ? (t / 0.14) * 0.95
      : Math.pow(1 - (t - 0.14) / 0.86, 1.8) * 0.95;
  };

  var filantes = [];
  var nbFilantes = petit ? 2 : 4;
  for (var f = 0; f < nbFilantes; f++) { filantes.push(new Filante(f === 0)); }

  /* ---------------------------------------------------------
     Poussière attirée par le curseur
     --------------------------------------------------------- */
  var nbPous = petit ? 260 : 760;
  var pousPos = new Float32Array(nbPous * 3);
  var pousBase = new Float32Array(nbPous * 3);

  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  for (var p = 0; p < nbPous; p++) {
    var px = gauss() * 190, py = gauss() * 125, pz = gauss() * 70;
    pousPos[p * 3] = pousBase[p * 3] = px;
    pousPos[p * 3 + 1] = pousBase[p * 3 + 1] = py;
    pousPos[p * 3 + 2] = pousBase[p * 3 + 2] = pz;
  }
  var pousGeo = new THREE.BufferGeometry();
  pousGeo.setAttribute('position', new THREE.BufferAttribute(pousPos, 3));
  var poussiere = new THREE.Points(pousGeo, new THREE.PointsMaterial({
    color: 0xc8ccd4, size: 1.15, sizeAttenuation: true,
    map: PASTILLE, alphaTest: 0.01, fog: false,
    transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(poussiere);

  /* ---------------------------------------------------------
     Entrées
     --------------------------------------------------------- */
  var souris = { x: 0, y: 0 }, lisse = { x: 0, y: 0 };
  var monde = { x: 1e5, y: 1e5 };

  window.addEventListener('pointermove', function (e) {
    souris.x = (e.clientX / window.innerWidth) * 2 - 1;
    souris.y = -((e.clientY / window.innerHeight) * 2 - 1);
    monde.x = souris.x * 210;
    monde.y = souris.y * 130;
  }, { passive: true });

  var avance = 0, avanceCible = 0;
  function mesurer() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    avanceCible = h > 0 ? Math.min(Math.max(window.scrollY / h, 0), 1) : 0;
  }
  window.addEventListener('scroll', mesurer, { passive: true });
  mesurer();

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
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; });

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
    lisse.x += (souris.x - lisse.x) * 0.045;
    lisse.y += (souris.y - lisse.y) * 0.045;

    var z = 210 - avance * 620;
    camera.position.z += (z - camera.position.z) * 0.08;
    camera.position.x += ((lisse.x * 26) - camera.position.x) * 0.05;
    camera.position.y += ((lisse.y * 16 + avance * 44) - camera.position.y) * 0.05;
    camera.lookAt(0, avance * 18, -160);

    proche.rotation.y += dt * 0.009;
    proche.rotation.x = lisse.y * 0.035;
    moyen.rotation.y -= dt * 0.004;
    loin.rotation.y += dt * 0.0016;

    for (var i = 0; i < nappes.length; i++) {
      nappes[i].material.opacity = recettes[i][2] * (0.7 + 0.3 * Math.sin(t * 0.2 + i * 1.7));
    }

    lisereMat.uniforms.temps.value = t;
    neantGroupe.rotation.y += dt * 0.035;
    neantGroupe.position.y = -280 + Math.sin(t * 0.35) * 3.2;

    var ap = anneauGeo.attributes.position.array;
    for (var k = 0; k < nbAnneau; k++) {
      var rk = anneauRayon[k];
      anneauAngle[k] += dt * (2.6 / rk) * 1.6;
      ap[k * 3] = Math.cos(anneauAngle[k]) * rk;
      ap[k * 3 + 2] = Math.sin(anneauAngle[k]) * rk;
    }
    anneauGeo.attributes.position.needsUpdate = true;

    for (var s = 0; s < filantes.length; s++) { filantes[s].avancer(dt); }

    poussiere.position.z = camera.position.z - 250;
    var pp = pousGeo.attributes.position.array;
    for (var q = 0; q < nbPous; q++) {
      var ix = q * 3, iy = ix + 1, iz = ix + 2;
      var dx = monde.x - pp[ix], dy = monde.y - pp[iy];
      var dist2 = dx * dx + dy * dy + 5200;
      var force = 420 / dist2;
      pp[ix] += dx * force + (pousBase[ix] - pp[ix]) * 0.012;
      pp[iy] += dy * force + (pousBase[iy] - pp[iy]) * 0.012;
      pp[iz] += (pousBase[iz] - pp[iz]) * 0.012 + Math.sin(t * 0.6 + q) * 0.008;
    }
    pousGeo.attributes.position.needsUpdate = true;

    moteur.render(scene, camera);
  }

  if (doux) { moteur.render(scene, camera); } else { boucle(); }
})();
