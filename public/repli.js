/* =========================================================
   L'ORDRE DU NÉANT - repli sans 3D
   ---------------------------------------------------------
   Quand le navigateur refuse WebGL (accélération matérielle
   coupée, carte graphique bloquée après un plantage), chaque
   scène rendait un grand vide noir, et les textes des actes ne
   s'affichaient plus : c'était la boucle de rendu qui les
   allumait. Mesuré sur Opera, « Error creating WebGL context ».

   Le gabarit pose html.sans-3d avant le premier affichage. Ici :
   - les textes des actes suivent le défilement comme avant, et
     chaque acte garde son fondu d'entrée et de sortie, sans quoi
     les actes collants se superposent ;
   - les images fixes sont posées en CSS (styles.css) ;
   - un encart explique comment réactiver WebGL, selon le
     navigateur.

   Pour voir ce mode sans rien désactiver : ajouter ?sans-3d à
   l'adresse d'une page.
   ========================================================= */
(function () {
  'use strict';

  var racine = document.documentElement;
  if (!racine.classList.contains('sans-3d')) { return; }

  var doux = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     Les actes : textes au défilement, fondu aux bords
     --------------------------------------------------------- */
  function palier(x, a, b) {
    var t = (x - a) / (b - a);
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    return t * t * (3 - 2 * t);
  }
  /* Les mêmes 8 % que acte3d.js, pour que les actes se relaient
     exactement comme en 3D. */
  function fondu(avance) {
    return palier(avance, 0, 0.08) * (1 - palier(avance, 0.92, 1));
  }

  var actes = [];
  Array.prototype.forEach.call(document.querySelectorAll('[id$="-scene"]'), function (hote) {
    if (hote.id === 'flotte-scene') { return; }
    var section = document.getElementById(hote.id.replace(/-scene$/, ''));
    if (!section) { return; }
    actes.push({
      section: section,
      collant: hote.parentElement,
      fragments: Array.prototype.slice.call(section.querySelectorAll('.fragment')),
      cartes: Array.prototype.slice.call(section.querySelectorAll('.echelon')),
      crans: Array.prototype.slice.call(section.querySelectorAll('.echelle-verticale .cran')),
      jauge: section.querySelector('[id$="-jauge"]'),
      charge: document.getElementById('saut-charge'),
      actif: -1
    });
  });

  if (doux) {
    /* Sans animation, tout reste lisible d'emblée, comme en 3D. */
    actes.forEach(function (a) {
      a.fragments.forEach(function (f) { f.classList.add('fragment--vu'); });
      a.cartes.forEach(function (c) { c.classList.add('echelon--vu'); });
    });
  } else if (actes.length) {
    var enAttente = false;
    var suivre = function () {
      enAttente = false;
      var haut = window.innerHeight;
      actes.forEach(function (a) {
        var r = a.section.getBoundingClientRect();
        if (r.bottom < -haut || r.top > haut * 2) { return; }
        var course = r.height - haut;
        var avance = course <= 0 ? 0 : Math.min(Math.max(-r.top / course, 0), 1);

        a.collant.style.opacity = String(Math.round(fondu(avance) * 100) / 100);

        var liste = a.fragments.length ? a.fragments : a.cartes;
        var n = liste.length;
        if (n) {
          var actif = Math.min(n - 1, Math.floor(avance * n));
          if (actif !== a.actif) {
            a.actif = actif;
            a.fragments.forEach(function (f, i) { f.classList.toggle('fragment--vu', i === actif); });
            a.cartes.forEach(function (c, i) {
              c.classList.toggle('echelon--vu', i === actif);
              if (a.crans[i]) {
                a.crans[i].classList.toggle('cran--actif', i === actif);
                a.crans[i].classList.toggle('cran--franchi', i < actif);
              }
            });
          }
        }
        if (a.jauge) {
          var pc = Math.round(avance * 100);
          a.jauge.style.setProperty('--avance', pc + '%');
          a.jauge.style.setProperty('--charge', pc + '%');
          if (a.charge) { a.charge.textContent = String(pc).padStart(3, '0') + ' %'; }
        }
      });
    };
    var demander = function () {
      if (enAttente) { return; }
      enAttente = true;
      requestAnimationFrame(suivre);
    };
    window.addEventListener('scroll', demander, { passive: true });
    window.addEventListener('resize', demander, { passive: true });
    window.addEventListener('load', demander);
    suivre();
  }

  /* ---------------------------------------------------------
     L'encart : comment réactiver WebGL
     --------------------------------------------------------- */
  var CLE = 'odn-sans-3d-vu';
  var SEMAINE = 7 * 24 * 3600 * 1000;
  try {
    var vu = +localStorage.getItem(CLE);
    if (vu && Date.now() - vu < SEMAINE) { return; }
  } catch (e) {}

  var CONSEILS = {
    opera: ['Opera', "Réglages → Système : activez « Utiliser l'accélération matérielle si disponible », puis relancez Opera. Si rien ne change, ouvrez opera://flags, cliquez sur « Reset all » et relancez. Pensez aussi à couper l'économiseur de batterie."],
    edge: ['Edge', "Paramètres → Système et performances : activez « Utiliser l'accélération graphique si disponible », puis redémarrez Edge."],
    brave: ['Brave', "Réglages → Système : activez « Utiliser l'accélération graphique si disponible », puis relancez Brave. Si rien ne change, ouvrez brave://flags, cliquez sur « Reset all » et relancez."],
    chrome: ['Chrome', "Paramètres → Système : activez « Utiliser l'accélération graphique si disponible », puis relancez Chrome. Si rien ne change, ouvrez chrome://flags, cliquez sur « Reset all » et relancez."],
    firefox: ['Firefox', "Ouvrez about:config, cherchez webgl.disabled et passez-le à false. Puis Paramètres → Général → Performances : décochez « Utiliser les paramètres de performance recommandés » et cochez « Utiliser l'accélération graphique si disponible ». Relancez Firefox."],
    safari: ['Safari', "Quittez complètement Safari (Cmd + Q) et relancez-le. Si la 3D ne revient pas, redémarrez le Mac et vérifiez que macOS est à jour."],
    ios: ['iPhone et iPad', "Fermez complètement le navigateur depuis le sélecteur d'apps et rouvrez-le. Désactivez le mode Économie d'énergie, et mettez iOS à jour si besoin."]
  };
  var ORDRE = ['chrome', 'opera', 'edge', 'brave', 'firefox', 'safari', 'ios'];

  function quelNavigateur() {
    var ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) { return 'ios'; }
    if (/OPR\/|Opera/.test(ua)) { return 'opera'; }
    if (/Edg\//.test(ua)) { return 'edge'; }
    if (navigator.brave) { return 'brave'; }
    if (/Firefox\//.test(ua)) { return 'firefox'; }
    if (/Chrome\//.test(ua)) { return 'chrome'; }
    if (/Safari\//.test(ua)) { return 'safari'; }
    return null;
  }

  function el(balise, classe, texte) {
    var e = document.createElement(balise);
    if (classe) { e.className = classe; }
    if (texte) { e.textContent = texte; }
    return e;
  }

  var nav = quelNavigateur();
  var encart = el('aside', 'sans3d');
  encart.setAttribute('role', 'note');
  encart.setAttribute('aria-label', 'La 3D est désactivée');

  encart.appendChild(el('p', 'sans3d__sur', 'Affichage réduit'));
  encart.appendChild(el('p', 'sans3d__titre', 'La 3D est désactivée'));
  encart.appendChild(el('p', 'sans3d__texte',
    "Votre navigateur n'affiche pas WebGL : les scènes et la flotte sont remplacées par des images fixes. " +
    "Pour profiter de l'expérience du site au maximum, activez WebGL."));

  if (nav) {
    var ici = el('p', 'sans3d__conseil');
    ici.appendChild(el('strong', '', CONSEILS[nav][0] + ' : '));
    ici.appendChild(document.createTextNode(CONSEILS[nav][1]));
    encart.appendChild(ici);
  }

  var autres = el('details', 'sans3d__autres');
  autres.appendChild(el('summary', '', nav ? 'Autres navigateurs' : 'Marche à suivre selon le navigateur'));
  var liste = el('dl');
  ORDRE.forEach(function (k) {
    if (k === nav) { return; }
    liste.appendChild(el('dt', '', CONSEILS[k][0]));
    liste.appendChild(el('dd', '', CONSEILS[k][1]));
  });
  autres.appendChild(liste);
  encart.appendChild(autres);

  var pied = el('p', 'sans3d__pied');
  pied.appendChild(document.createTextNode('Pour vérifier : '));
  var lien = el('a', '', 'get.webgl.org');
  lien.href = 'https://get.webgl.org/';
  lien.target = '_blank';
  lien.rel = 'noopener';
  pied.appendChild(lien);
  encart.appendChild(pied);

  var fermer = el('button', 'sans3d__fermer', 'Compris');
  fermer.type = 'button';
  fermer.addEventListener('click', function () {
    try { localStorage.setItem(CLE, String(Date.now())); } catch (e) {}
    encart.classList.add('sans3d--parti');
    setTimeout(function () { if (encart.parentNode) { encart.parentNode.removeChild(encart); } }, 400);
  });
  encart.appendChild(fermer);

  document.body.appendChild(encart);
})();
