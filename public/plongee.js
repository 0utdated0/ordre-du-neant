/* =========================================================
   L'ORDRE DU NÉANT — la Plongée
   ---------------------------------------------------------
   Troisième séquence pilotée, et la dernière. Ni traversée
   ni montée : une chute vers l'astre noir, qui grandit
   jusqu'à ne plus rien laisser voir.

   Le site se referme sur le geste de sa devise. Ce qui suit
   l'obscurité, c'est l'appel à rejoindre.
   ========================================================= */
(function () {
  'use strict';

  var section = document.getElementById('plongee');
  var hote = document.getElementById('plongee-scene');
  if (!section || !hote || typeof THREE === 'undefined') { return; }

  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var petit = window.innerWidth < 860;

  var fragments = Array.prototype.slice.call(section.querySelectorAll('.fragment'));

  var moteur;
  try {
    moteur = new THREE.WebGLRenderer({ antialias: !petit, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }

  moteur.setPixelRatio(Math.min(window.devicePixelRatio || 1, petit ? 1.25 : 1.6));
  moteur.setClearColor(0x000000, 0);
  moteur.domElement.setAttribute('aria-hidden', 'true');
  hote.appendChild(moteur.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, 1, 0.5, 4000);

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
     L'astre
     --------------------------------------------------------- */
  var astre = new THREE.Group();
  astre.position.set(0, 0, -900);
  scene.add(astre);

  astre.add(new THREE.Mesh(
    new THREE.SphereGeometry(120, 64, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  ));

  var lisereMat = new THREE.ShaderMaterial({
    uniforms: {
      teinteA: { value: new THREE.Color(0xe01020) },
      teinteB: { value: new THREE.Color(0xeef0f4) },
      temps:   { value: 0 },
      force:   { value: 1 }
    },
    vertexShader:
      'varying vec3 vN; varying vec3 vP;' +
      'void main(){ vN = normalize(normalMatrix * normal);' +
      ' vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz;' +
      ' gl_Position = projectionMatrix * mv; }',
    fragmentShader:
      'uniform vec3 teinteA; uniform vec3 teinteB; uniform float temps; uniform float force;' +
      'varying vec3 vN; varying vec3 vP;' +
      'void main(){' +
      ' vec3 v = normalize(-vP);' +
      ' vec3 n = normalize(vN);' +
      ' float f = pow(1.0 - max(dot(v, n), 0.0), 5.0);' +
      ' float cote = smoothstep(-0.4, 0.95, dot(n, normalize(vec3(0.7, 0.45, 0.5))));' +
      ' float bat = 0.85 + 0.15 * sin(temps * 1.1);' +
      ' float i = f * (0.2 + cote * 0.8) * bat * force;' +
      ' vec3 c = mix(teinteA, teinteB, pow(cote, 2.4) * 0.6);' +
      ' gl_FragColor = vec4(c, i); }',
    transparent: true, blending: THREE.AdditiveBlending,
    side: THREE.BackSide, depthWrite: false
  });
  astre.add(new THREE.Mesh(new THREE.SphereGeometry(125, 64, 48), lisereMat));

  /* la faille verticale, celle de l'emblème */
  var failleTex = (function () {
    var t = document.createElement('canvas');
    t.width = 32; t.height = 512;
    var x = t.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, 'rgba(224,16,32,0)');
    g.addColorStop(0.3, 'rgba(224,16,32,0.7)');
    g.addColorStop(0.5, 'rgba(255,190,190,1)');
    g.addColorStop(0.7, 'rgba(224,16,32,0.7)');
    g.addColorStop(1, 'rgba(224,16,32,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 512);
    var h = x.createLinearGradient(0, 0, 32, 0);
    h.addColorStop(0, 'rgba(0,0,0,1)');
    h.addColorStop(0.5, 'rgba(0,0,0,0)');
    h.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = h; x.fillRect(0, 0, 32, 512);
    return new THREE.CanvasTexture(t);
  })();

  var faille = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 520),
    new THREE.MeshBasicMaterial({
      map: failleTex, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  faille.position.z = 132;
  astre.add(faille);

  /* anneau de poussière incliné */
  var nbAnneau = petit ? 1600 : 4200;
  var anPos = new Float32Array(nbAnneau * 3);
  var anCol = new Float32Array(nbAnneau * 3);
  var anR = new Float32Array(nbAnneau);
  var anA = new Float32Array(nbAnneau);
  var c = new THREE.Color();
  for (var i = 0; i < nbAnneau; i++) {
    var r = 165 + Math.pow(Math.random(), 1.5) * 230;
    var a = Math.random() * Math.PI * 2;
    anR[i] = r; anA[i] = a;
    anPos[i * 3] = Math.cos(a) * r;
    anPos[i * 3 + 1] = (Math.random() - 0.5) * 16 * (r / 250);
    anPos[i * 3 + 2] = Math.sin(a) * r;
    c.set(Math.random() > 0.7 ? 0xe01020 : 0x9aa0aa);
    var l = 0.3 + Math.random() * 0.7;
    anCol[i * 3] = c.r * l; anCol[i * 3 + 1] = c.g * l; anCol[i * 3 + 2] = c.b * l;
  }
  var anGeo = new THREE.BufferGeometry();
  anGeo.setAttribute('position', new THREE.BufferAttribute(anPos, 3));
  anGeo.setAttribute('color', new THREE.BufferAttribute(anCol, 3));
  var anneau = new THREE.Points(anGeo, new THREE.PointsMaterial({
    size: 3.2, sizeAttenuation: true, vertexColors: true, map: PASTILLE,
    transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  anneau.rotation.x = 1.1;
  anneau.rotation.z = 0.22;
  astre.add(anneau);

  /* traînées qui filent vers l'astre : c'est elles qui donnent
     la vitesse, la sphère seule grandirait sans qu'on la sente */
  var nbFilets = petit ? 700 : 1800;
  var fiPos = new Float32Array(nbFilets * 3);
  for (var f = 0; f < nbFilets; f++) {
    var rf = 60 + Math.pow(Math.random(), 0.5) * 520;
    var af = Math.random() * Math.PI * 2;
    fiPos[f * 3] = Math.cos(af) * rf;
    fiPos[f * 3 + 1] = Math.sin(af) * rf * 0.8;
    fiPos[f * 3 + 2] = -1000 + Math.random() * 1400;
  }
  var fiGeo = new THREE.BufferGeometry();
  fiGeo.setAttribute('position', new THREE.BufferAttribute(fiPos, 3));
  scene.add(new THREE.Points(fiGeo, new THREE.PointsMaterial({
    color: 0xd6dae2, size: 2.2, sizeAttenuation: true, map: PASTILLE,
    transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending
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
    var n = fragments.length;
    if (!n) { return; }
    /* Les fragments s'arrêtent avant la fin : les derniers
       instants appartiennent au noir, pas au texte. */
    var part = Math.min(1, avance / 0.82);
    var actif = Math.min(n - 1, Math.floor(part * n));
    for (var i = 0; i < n; i++) {
      fragments[i].classList.toggle('fragment--vu', i === actif && avance < 0.84);
    }
    section.style.setProperty('--noir', Math.max(0, (avance - 0.72) / 0.28).toFixed(3));
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

  var horloge = new THREE.Clock();

  function boucle() {
    requestAnimationFrame(boucle);
    if (!aLecran || !visible) { return; }

    var dt = Math.min(horloge.getDelta(), 0.05);
    var t = horloge.getElapsedTime();

    avance += (cible - avance) * (1 - Math.exp(-dt * 9));

    /* accélération en fin de course : on tombe, on ne descend pas */
    var course = Math.pow(avance, 1.55);
    camera.position.set(
      Math.sin(avance * 1.6) * 34,
      Math.cos(avance * 1.2) * 22,
      420 - course * 1240
    );
    camera.lookAt(0, 0, astre.position.z);
    camera.rotation.z = avance * 0.42;

    lisereMat.uniforms.temps.value = t;
    lisereMat.uniforms.force.value = 1 + course * 1.4;
    astre.rotation.y += dt * 0.05;
    faille.material.opacity = 0.55 + 0.35 * Math.sin(t * 1.5);

    var ap = anGeo.attributes.position.array;
    for (var k = 0; k < nbAnneau; k++) {
      var rk = anR[k];
      anA[k] += dt * (14 / rk) * 1.4;
      ap[k * 3] = Math.cos(anA[k]) * rk;
      ap[k * 3 + 2] = Math.sin(anA[k]) * rk;
    }
    anGeo.attributes.position.needsUpdate = true;

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
