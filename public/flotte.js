/* =========================================================
   L'ORDRE DU NÉANT — table d'hologrammes
   ---------------------------------------------------------
   Vaisseaux et station projetés en hologramme. Les coques
   viennent de vaisseaux.js et arrivent par le réseau : la
   peinture doit donc survivre à un changement d'onglet en
   cours de chargement.

   Site non officiel. Ces modèles appartiennent à Cloud
   Imperium Rights LLC.
   ========================================================= */
(function () {
  'use strict';

  var hote = document.getElementById('flotte-scene');
  if (!hote || typeof THREE === 'undefined') { return; }

  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var petit = window.innerWidth < 860;

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
      /* Pas d'attribut « normal » : les coques du catalogue n'en
         portent plus. Elles sont peintes partout ailleurs avec un
         MeshBasicMaterial, qui ne les regarde jamais, et les
         calculer coûtait deux cents millisecondes et sept
         mégaoctets par coque à pleine géométrie. La normale est
         donc reprise ici de la dérivée écran : elle est plate, ce
         qui est exactement ce qu'on veut sur une coque à
         panneaux. */
      extensions: { derivatives: true },
      vertexShader: [
        'varying vec3 vP;',
        'varying vec3 vM;',
        'void main(){',
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
        'varying vec3 vP;',
        'varying vec3 vM;',
        'void main(){',
        '  vec3 v = normalize(-vP);',
        '  vec3 n = normalize(cross(dFdx(vP), dFdy(vP)));',
        '  float f = pow(1.0 - abs(dot(v, n)), 2.2);',
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
      /* Face avant seulement. En double face, chaque paroi
         interieure de la coque reelle ajoute sa lueur a celles
         qui sont devant elle : au milieu du Silence, la ou les
         ponts s'empilent, la projection virait a la tache
         blanche. Les silhouettes primitives d'origine n'avaient
         pas d'interieur, d'ou le reglage d'alors. */
      side: THREE.FrontSide
    });
  }

  /* Les coques arrivent par le réseau : une peinture peut se
     terminer après que le visiteur a changé d'onglet. Chaque
     montage a donc ses propres listes, et l'animation ne lit que
     celles du modèle affiché. Une peinture en retard remplit des
     listes que plus personne ne regarde. */
  var matieres = [];
  var traits = [];

  function holo(teinte, intensite, liste) {
    var m = matiereHolo(teinte, intensite);
    m.userData.base = intensite;
    liste.push(m);
    return m;
  }

  /* arêtes : c'est elles qui donnent la lecture technique */
  function aretes(geo, teinte, opacite) {
    var l = new THREE.LineSegments(
      window.ODN.aretesDe(geo, 22),
      new THREE.LineBasicMaterial({
        color: teinte, transparent: true, opacity: opacite,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    return l;
  }

  /* Peinture holographique : un volume additif sans lumière,
     plus ses arêtes. C'est la fonction que les constructeurs
     de vaisseaux.js appellent pour chaque pièce. */
  function peintre(mesMatieres, mesTraits) {
    return function (geo, teinte, intensite, opaciteAretes) {
      var g = new THREE.Group();
      g.add(new THREE.Mesh(geo, holo(teinte, intensite, mesMatieres)));
      var l = aretes(geo, teinte, opaciteAretes === undefined ? 0.5 : opaciteAretes);
      l.material.userData.base = l.material.opacity;
      mesTraits.push(l.material);
      g.add(l);
      return g;
    };
  }

  /* =========================================================
     LES MODÈLES
     ---------------------------------------------------------
     Décrits une seule fois dans vaisseaux.js, et peints ici
     en hologramme. L'Approche les peint en coque pleine.
     ========================================================= */

  var CATALOGUE = (window.ODN && window.ODN.vaisseaux) || null;
  if (!CATALOGUE) { return; }

  var FLOTTE = CATALOGUE.FICHES;

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
  /* La scène reste accessible : c'est ce qui permet de régler la
     saturation de la projection à la mesure, en balayant les
     valeurs sur une seule page, plutôt qu'au jugé. */
  window.ODN = window.ODN || {};
  window.ODN.table = { scene: scene };
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
        color: i === 0 ? ROUGE : CATALOGUE.ARGENT,
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
    var mesMatieres = [];
    var mesTraits = [];
    matieres = mesMatieres;
    traits = mesTraits;

    courant = f.construire(peintre(mesMatieres, mesTraits));
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
    /* La projection se lève au lieu d'apparaître d'un bloc quand on
       change d'appareil. */
    var leve = transition;
    for (var i = 0; i < matieres.length; i++) {
      matieres[i].uniforms.temps.value = t;
      matieres[i].uniforms.balayage.value = monte;
      matieres[i].uniforms.force.value = matieres[i].userData.base * leve;
    }
    for (var j = 0; j < traits.length; j++) {
      traits[j].opacity = traits[j].userData.base * leve;
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
