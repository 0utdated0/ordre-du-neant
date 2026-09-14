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
      if (actes[i] && hautAbsolu(actes[i]) <= milieu) { courant = i; }
    }
    for (var j = 0; j < liens.length; j++) {
      liens[j].classList.toggle('actif', j === courant);
    }
    var passe = window.scrollY > window.innerHeight * 0.75;
    if (barre) { barre.classList.toggle('visible', passe); }
    if (rail) { rail.classList.toggle('visible', passe); }
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
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var cible = document.querySelector(a.getAttribute('href'));
      if (!cible) { return; }
      ev.preventDefault();
      cible.scrollIntoView({ behavior: doux ? 'auto' : 'smooth', block: 'start' });
    });
  });
})();
