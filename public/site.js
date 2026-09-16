/* =========================================================
   L'ORDRE DU NÉANT - interactions de page
   Parallaxe des fonds, révélations, rail d'actes,
   barre haute, inclinaison 3D des cartes.
   ========================================================= */
(function () {
  'use strict';

  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tactile = window.matchMedia('(hover: none)').matches;

  /* ---------------------------------------------------------
     Titre du seuil, lettre à lettre
     ---------------------------------------------------------
     Chaque caractère devient un span animé avec son propre
     retard. Le texte lisible reste dans aria-label : un
     lecteur d'écran n'a pas à épeler.
     --------------------------------------------------------- */
  document.querySelectorAll('[data-lettres]').forEach(function (n) {
    var texte = n.textContent;
    n.setAttribute('aria-label', texte);
    if (doux) { return; }
    var retard = parseInt(n.dataset.retard || '0', 10);
    n.textContent = '';
    for (var i = 0; i < texte.length; i++) {
      var c = texte[i];
      var s = document.createElement('span');
      s.className = 'l' + (c === ' ' ? ' l--espace' : '');
      s.setAttribute('aria-hidden', 'true');
      s.textContent = c === ' ' ? '\u00a0' : c;
      s.style.animationDelay = (retard + i * 55) + 'ms';
      n.appendChild(s);
    }
  });

  /* ---------------------------------------------------------
     Révélations
     --------------------------------------------------------- */
  var aReveler = document.querySelectorAll('.revele');
  if ('IntersectionObserver' in window && !doux) {
    var guetteur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) {
          var d = e.target.dataset.retard || 0;
          setTimeout(function () { e.target.classList.add('vu'); }, d);
          guetteur.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    aReveler.forEach(function (n) { guetteur.observe(n); });
  } else {
    aReveler.forEach(function (n) { n.classList.add('vu'); });
  }

  /* cascade sur les cartes de division */
  var cartes = document.querySelectorAll('.grille .carte');
  cartes.forEach(function (c, i) { c.dataset.retard = String(i * 70); });

  /* ---------------------------------------------------------
     Rail d'actes + barre haute
     --------------------------------------------------------- */
  var rail = document.getElementById('rail');
  var barre = document.getElementById('barre');

  /* Seul l'accueil a un héros plein écran devant lequel la barre
     doit s'effacer. Ailleurs, le menu doit être là dès le premier
     pixel : c'est le seul moyen de naviguer. */
  var surAccueil = document.body.classList.contains('page-accueil');
  var liens = rail ? rail.querySelectorAll('a') : [];
  var actes = Array.prototype.map.call(liens, function (a) {
    return document.getElementById(a.dataset.cible);
  });

  function hautAbsolu(n) {
    return n.getBoundingClientRect().top + window.scrollY;
  }

  function situer() {
    var milieu = window.scrollY + window.innerHeight * 0.42;
    var courant = 0;
    for (var i = 0; i < actes.length; i++) {
      if (!actes[i]) { continue; }
      /* Un acte collant qui chevauche le précédent d'un écran (voir
         styles.css) est collé dès que son haut touche le haut de la
         vue, au creux du fondu : c'est là qu'il devient l'acte
         courant. Au seuil habituel, le rail passait au suivant
         alors que le précédent jouait encore ses derniers 18 %. */
      var chevauche = parseFloat(getComputedStyle(actes[i]).marginTop) < 0;
      var seuil = chevauche ? window.scrollY + 1 : milieu;
      if (hautAbsolu(actes[i]) <= seuil) { courant = i; }
    }
    for (var j = 0; j < liens.length; j++) {
      liens[j].classList.toggle('actif', j === courant);
    }
    var passe = surAccueil ? window.scrollY > window.innerHeight * 0.75 : true;
    if (barre) {
      barre.classList.toggle('visible', passe);
      /* Au repos la barre est presque transparente ; dès qu'on défile,
         le verre se densifie pour rester lisible sur le texte. */
      barre.classList.toggle('defile', window.scrollY > 24);
    }
    if (rail) {
      rail.classList.toggle('visible',
        surAccueil ? passe : window.scrollY > window.innerHeight * 0.25);
    }
  }

  /* ---------------------------------------------------------
     Parallaxe des fonds
     --------------------------------------------------------- */
  var fonds = Array.prototype.slice.call(document.querySelectorAll('.fond'));

  function parallaxer() {
    if (doux) { return; }
    var mi = window.innerHeight / 2;
    for (var i = 0; i < fonds.length; i++) {
      var f = fonds[i];
      var r = f.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) { continue; }
      var centre = r.top + r.height / 2;
      var ecart = (centre - mi) / window.innerHeight;
      var v = parseFloat(f.dataset.vitesse || '0.2');
      f.style.transform = 'translate3d(0,' + (-ecart * v * 100).toFixed(2) + 'px,0)';
    }
  }

  /* ---------------------------------------------------------
     Ascension : la ligne rouge se remplit au défilement
     --------------------------------------------------------- */
  var echelle = document.querySelector('.echelle');

  function remplirEchelle() {
    if (!echelle || doux) { return; }
    var r = echelle.getBoundingClientRect();
    var repere = window.innerHeight * 0.62;
    var part = (repere - r.top) / r.height;
    part = Math.min(Math.max(part, 0), 1);
    echelle.style.setProperty('--progres', (part * 100).toFixed(1) + '%');
  }

  /* ---------------------------------------------------------
     Boucle de défilement
     --------------------------------------------------------- */
  var enAttente = false;
  function auDefilement() {
    if (enAttente) { return; }
    enAttente = true;
    requestAnimationFrame(function () {
      situer();
      parallaxer();
      remplirEchelle();
      enAttente = false;
    });
  }
  window.addEventListener('scroll', auDefilement, { passive: true });
  window.addEventListener('resize', auDefilement, { passive: true });
  auDefilement();

  /* ---------------------------------------------------------
     Inclinaison 3D des cartes
     --------------------------------------------------------- */
  if (!tactile && !doux) {
    cartes.forEach(function (carte) {
      carte.addEventListener('pointermove', function (e) {
        var r = carte.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        carte.style.transform =
          'perspective(900px) rotateY(' + (x * 9).toFixed(2) + 'deg) rotateX(' +
          (-y * 9).toFixed(2) + 'deg) translateZ(16px)';
      });
      carte.addEventListener('pointerleave', function () {
        carte.style.transform = '';
      });
    });
  }

  /* ---------------------------------------------------------
     Défilement doux vers les ancres
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     Les anciennes ancres
     ---------------------------------------------------------
     Le site a longtemps tenu sur une seule page : les liens
     partagés pointent vers /#flotte, /#regle et les autres. Ils
     arriveraient maintenant sur une page qui n'a pas cette
     section. On les renvoie là où le contenu a déménagé.
     --------------------------------------------------------- */
  (function () {
    var OU = {
      manifeste: '/ordre', ascension: '/ordre',
      divisions: '/divisions', regle: '/regle',
      flotte: '/flotte',
      vigie: '/vie', operations: '/vie', galerie: '/vie',
      passage: '/rejoindre'
    };
    var ancre = window.location.hash.slice(1);
    if (!ancre || document.getElementById(ancre) || !OU[ancre]) { return; }
    /* Déjà sur la bonne page : l'ancre n'y existe plus, on reste. Sans
       cette garde, /regle#regle se rechargeait indéfiniment. */
    if (window.location.pathname.replace(/\.html$/, '') === OU[ancre]) { return; }
    window.location.replace(OU[ancre] + '#' + ancre);
  })();

  /* ---------------------------------------------------------
     Le menu replié, sur écran étroit
     --------------------------------------------------------- */
  (function () {
    var bouton = document.getElementById('menu-bouton');
    var menu = document.getElementById('menu');
    if (!bouton || !menu) { return; }

    function fermer() {
      menu.classList.remove('ouvert');
      bouton.setAttribute('aria-expanded', 'false');
      bouton.setAttribute('aria-label', 'Ouvrir le menu');
    }
    bouton.addEventListener('click', function () {
      var ouvert = menu.classList.toggle('ouvert');
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
      bouton.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
    });
    /* Un menu qui reste ouvert derrière la page qu'on vient
       d'ouvrir donne l'impression que le clic n'a rien fait. */
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { fermer(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { fermer(); }
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && !bouton.contains(e.target)) { fermer(); }
    });
  })();

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var cible = document.querySelector(a.getAttribute('href'));
      if (!cible) { return; }
      ev.preventDefault();
      cible.scrollIntoView({ behavior: doux ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ---------------------------------------------------------
     Divisions : l'effectif de chaque division, en direct
     ---------------------------------------------------------
     Le même relevé que la Vigie (/api/ordre, mis en cache cinq
     minutes). Sans réponse, les compteurs restent masqués : une
     fiche sans chiffre vaut mieux qu'un zéro faux. */
  (function () {
    var fiches = document.querySelectorAll('.division[data-division]');
    if (!fiches.length || !window.fetch) { return; }
    fetch('/api/ordre', { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
      .then(function (d) {
        var par = d && d.effectif && d.effectif.parDivision;
        if (!par) { return; }
        fiches.forEach(function (f) {
          var n = par[f.getAttribute('data-division')];
          if (typeof n !== 'number') { return; }
          var e = f.querySelector('.division__effectif');
          e.querySelector('strong').textContent = n;
          e.lastChild.textContent = n > 1 ? ' membres' : ' membre';
          e.hidden = false;
        });
      })
      .catch(function () {});
  })();
})();
