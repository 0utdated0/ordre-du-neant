/* =========================================================
   L'ORDRE DU NÉANT — moteur des actes à défilement
   ---------------------------------------------------------
   Quatre actes existaient déjà, chacun avec sa copie de la même
   plomberie : contexte WebGL, redimensionnement, mise en veille
   hors écran, progression du défilement, fragments de texte. En
   ajouter quatre de plus aurait fait huit copies.

   Une scène décrit maintenant ce qu'elle montre, et rien d'autre :

     ODN.acte({
       id: 'convoi',
       monter: function (c) { ... },            // une fois
       jouer:  function (c, avance, dt, t) { }  // à chaque image
     });

   Le contexte « c » porte la scène, la caméra, le moteur de rendu,
   la largeur utile, et deux outils dont toutes les scènes se
   servent : palier() pour découper la course en temps forts, et
   lisser() pour amortir sans dépendre de la fréquence d'images.
   ========================================================= */
(function (global) {
  'use strict';

  if (typeof THREE === 'undefined') { return; }

  /* Rampe douce entre deux bornes de la course. C'est avec ça
     qu'on écrit « ceci commence à 30 % et finit à 60 % ». */
  function palier(x, a, b) {
    var t = (x - a) / (b - a);
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    return t * t * (3 - 2 * t);
  }

  /* Amortissement indépendant de la fréquence d'images : un
     écran à 144 Hz ne doit pas converger plus vite qu'un écran
     à 60. */
  function lisser(de, vers, vitesse, dt) {
    return de + (vers - de) * (1 - Math.exp(-dt * vitesse));
  }

  function pastille(etapes) {
    var t = document.createElement('canvas');
    t.width = t.height = 64;
    var x = t.getContext('2d');
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    etapes.forEach(function (e) { g.addColorStop(e[0], e[1]); });
    x.fillStyle = g;
    x.beginPath(); x.arc(32, 32, 32, 0, 6.2832); x.fill();
    return new THREE.CanvasTexture(t);
  }

  /* Fondu d'un acte à l'autre.

     Première version : seul le canevas s'éteignait. Ça ne
     suffisait pas, et l'utilisateur l'a vu tout de suite : entre
     deux actes, le bloc collant (voile noir, fiche, numéro, texte)
     continuait de glisser vers le haut pendant une hauteur d'écran
     entière. On voyait défiler la page, pas un fondu.

     Maintenant c'est le bloc collant entier qui s'éteint, sur les
     8 % du début et de la fin de sa course. Et dans styles.css,
     chaque acte collant remonte d'un écran sur le précédent : au
     moment où l'un se décolle, éteint, le suivant est déjà collé,
     éteint lui aussi. Ce qui glisse ne se voit plus, il ne reste
     que le ciel fixe de la page entre les deux. La course de
     chaque acte, elle, ne change pas d'un pixel.

     On suit la cible brute du défilement, pas la valeur lissée :
     lissée, elle traîne derrière, et le bloc serait encore visible
     au moment où il commence à glisser. */
  var FONDU = 0.08;
  function fondu(avance) {
    return palier(avance, 0, FONDU) * (1 - palier(avance, 1 - FONDU, 1));
  }

  /* Pose l'opacité sur l'élément, et dit s'il vaut la peine de
     rendre l'image : une scène éteinte ne se peint pas. Sous un
     pour cent, on la tient pour éteinte. */
  function fondre(element, avance) {
    var o = Math.round(fondu(avance) * 100) / 100;
    if (element.__fondu !== o) { element.__fondu = o; element.style.opacity = String(o); }
    return o > 0;
  }

  /* Lance « lancer » quand la section arrive à un écran et demi
     de la vue. Une fois, puis on ne regarde plus. */
  function differer(section, lancer) {
    if (!('IntersectionObserver' in window)) { lancer(); return; }
    var o = new IntersectionObserver(function (es) {
      for (var i = 0; i < es.length; i++) {
        if (es[i].isIntersecting) { o.disconnect(); lancer(); return; }
      }
    }, { rootMargin: '150% 0px' });
    o.observe(section);
  }

  var ROND = null;
  function rond() {
    if (!ROND) {
      ROND = pastille([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.75)'],
                       [1, 'rgba(255,255,255,0)']]);
    }
    return ROND;
  }

  function acte(def) {
    var section = document.getElementById(def.id);
    var hote = document.getElementById(def.id + '-scene');
    if (!section || !hote) { return null; }

    /* Le contexte WebGL n'est créé qu'à l'approche de la section.
       Il y en avait dix au chargement, un par acte, y compris pour
       ceux qu'un visiteur ne verra jamais. */
    differer(section, function () {

      var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var petit = window.innerWidth < 860;

      var moteur;
      try {
        moteur = new THREE.WebGLRenderer({
          antialias: !petit, alpha: true, powerPreference: 'high-performance'
        });
      } catch (e) { return null; }

      moteur.setPixelRatio(Math.min(window.devicePixelRatio || 1, petit ? 1.25 : 1.6));
      moteur.setClearColor(0x000000, 0);
      moteur.domElement.setAttribute('aria-hidden', 'true');
      hote.appendChild(moteur.domElement);

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(def.champ || 55, 1, 0.5, 6000);

      var c = {
        section: section, hote: hote, scene: scene, camera: camera, moteur: moteur,
        petit: petit, doux: doux,
        palier: palier, lisser: lisser, rond: rond, pastille: pastille,
        fragments: Array.prototype.slice.call(section.querySelectorAll('.fragment')),
        avance: 0
      };

      if (def.brouillard) {
        scene.fog = new THREE.FogExp2(0x000000, def.brouillard);
      }

      if (def.monter) { def.monter(c); }

      /* ---- défilement ---- */
      var avance = 0, cible = 0;

      function mesurer() {
        var r = section.getBoundingClientRect();
        var course = r.height - window.innerHeight;
        cible = course <= 0 ? 0 : Math.min(Math.max(-r.top / course, 0), 1);
      }

      var actifCourant = -1;
      function marquer() {
        var n = c.fragments.length;
        if (!n) { return; }
        /* Un fragment par tranche égale de la course. Le texte
           appartient à un moment du trajet, il ne flotte pas
           au-dessus d'une boucle. */
        var brut = avance * n;
        var actif = Math.min(n - 1, Math.floor(brut));
        /* Hystérésis. Sans elle, un défilement arrêté pile sur une
           frontière fait basculer l'indice à chaque image, parce que
           « avance » n'atteint jamais tout à fait sa cible : les deux
           fragments restaient alors figés à mi-fondu, l'un par-dessus
           l'autre. Vu sur l'appontage et la récupération. */
        if (actifCourant >= 0 && actif !== actifCourant) {
          var ecart = brut - actifCourant;
          if (ecart > -0.12 && ecart < 1.12) { actif = actifCourant; }
        }
        if (actif !== actifCourant) {
          actifCourant = actif;
          for (var i = 0; i < n; i++) {
            c.fragments[i].classList.toggle('fragment--vu', i === actif);
          }
        }
        if (def.marquer) { def.marquer(c, avance); }
      }

      var enAttente = false;
      window.addEventListener('scroll', function () {
        if (enAttente) { return; }
        enAttente = true;
        requestAnimationFrame(function () { mesurer(); enAttente = false; });
      }, { passive: true });
      window.addEventListener('resize', mesurer, { passive: true });


      /* Le fondu suit le défilement lui-même, pas la boucle : la
         boucle s'arrête quand l'acte sort de la vue, et un bloc qui y
         revient gardait l'opacité de sa dernière image le temps que
         l'observateur se réveille. Relevé en mesure : 0,25 sur un
         bloc encore en train de glisser. */
      function suivreFondu() {
        if (doux) { return; }
        mesurer();
        fondre(hote.parentElement, cible);
      }
      window.addEventListener('scroll', suivreFondu, { passive: true });
      window.addEventListener('resize', suivreFondu, { passive: true });
      function dimensionner() {
        var l = hote.clientWidth, h = hote.clientHeight;
        if (!l || !h) { return; }
        camera.aspect = l / h;
        camera.updateProjectionMatrix();
        moteur.setSize(l, h, false);
        moteur.domElement.style.width = '100%';
        moteur.domElement.style.height = '100%';
        if (def.cadrer) { def.cadrer(c, l, h); }
      }
      var minuteur;
      window.addEventListener('resize', function () {
        clearTimeout(minuteur);
        minuteur = setTimeout(dimensionner, 140);
      }, { passive: true });

      /* ---- veille ---- */
      var aLecran = false;
      var vu = false;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (x) {
            aLecran = x.isIntersecting;
            /* Les coques pèsent : on ne les demande qu'à l'approche
               de la section, jamais au chargement de la page. */
            if (aLecran && !vu) { vu = true; if (def.approcher) { def.approcher(c); } }
          });
        }, { rootMargin: def.marge || '700px' }).observe(section);
      } else { aLecran = true; if (def.approcher) { def.approcher(c); } }

      var visible = true;
      document.addEventListener('visibilitychange', function () {
        visible = !document.hidden;
      });

      /* ---- boucle ---- */
      var horloge = new THREE.Clock();

      function boucle() {
        requestAnimationFrame(boucle);
        if (!aLecran || !visible) { return; }
        var dt = Math.min(horloge.getDelta(), 0.05);
        var t = horloge.getElapsedTime();
        avance = lisser(avance, cible, def.souplesse || 8, dt);
        c.avance = avance;
        if (def.jouer) { def.jouer(c, avance, dt, t); }
        marquer();
        if (fondre(hote.parentElement, cible)) { moteur.render(scene, camera); }
      }

      dimensionner();
      mesurer();
      avance = cible;
      suivreFondu();
      c.avance = avance;

      if (doux) {
        /* Sans animation, la scène est rendue une fois et tous les
           fragments restent lisibles. */
        c.fragments.forEach(function (f) { f.classList.add('fragment--vu'); });
        if (def.approcher) { def.approcher(c); }
        if (def.jouer) { def.jouer(c, avance, 0.016, 0); }
        moteur.render(scene, camera);
      } else {
        boucle();
      }

      window.addEventListener('load', dimensionner);
      setTimeout(dimensionner, 300);

      /* Le contexte reste accessible : c'est ce qui permet de
         mesurer, depuis l'extérieur, qu'aucune caméra ne traverse
         une coque, plutôt que de l'espérer. */
      global.ODN.actes = global.ODN.actes || {};
      global.ODN.actes[def.id] = c;
    });

    return section;
  }

  global.ODN = global.ODN || {};
  global.ODN.acte = acte;
  global.ODN.palier = palier;
  global.ODN.lisser = lisser;
  global.ODN.fondu = fondu;
  global.ODN.fondre = fondre;
  global.ODN.differer = differer;
})(window);
