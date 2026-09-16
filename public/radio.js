/* =========================================================
   L'ORDRE DU NÉANT — Radio de l'Ordre
   ---------------------------------------------------------
   Joue la station que Vigie ODN diffuse sur Discord. /api/radio
   dit laquelle (relevée dans la fiche que le bot tient à jour
   dans le salon) et le morceau en cours (métadonnées du flux).

   Un seul élément audio pour toute la page : le bouton de la barre
   et le poste de la page La vie commandent le même son. Le relevé
   est refait toutes les vingt secondes, et seulement quand l'onglet
   est visible. Si la station change sur Discord pendant l'écoute, le
   son bascule sur la nouvelle.
   ========================================================= */
(function () {
  'use strict';

  var boutons = Array.prototype.slice.call(document.querySelectorAll('[data-radio-bouton]'));
  if (!boutons.length || !window.fetch || typeof Audio === 'undefined') { return; }

  var audio = new Audio();
  audio.preload = 'none';
  var etat = null;      /* dernier relevé */
  var enLecture = false;
  var minuteur = null;

  var volume = 0.7;
  try {
    var v = parseFloat(localStorage.getItem('odn-radio-volume'));
    if (!isNaN(v)) { volume = Math.min(1, Math.max(0, v)); }
  } catch (e) {}
  audio.volume = volume;

  function champs(nom) { return document.querySelectorAll('[data-radio="' + nom + '"]'); }
  function poser(nom, texte) {
    champs(nom).forEach(function (n) { n.textContent = texte || ''; n.hidden = !texte && nom !== 'titre'; });
  }
  function avis(texte) {
    champs('avis').forEach(function (n) { n.textContent = texte || ''; n.hidden = !texte; });
  }

  function marquer() {
    document.documentElement.classList.toggle('radio-active', enLecture);
    boutons.forEach(function (b) {
      b.setAttribute('aria-pressed', enLecture ? 'true' : 'false');
      b.setAttribute('aria-label', enLecture ? 'Couper la Radio de l\'Ordre' : 'Écouter la Radio de l\'Ordre');
      var a = b.querySelector('.poste__action');
      if (a) { a.textContent = enLecture ? 'Couper' : 'Écouter'; }
    });
  }

  function afficher(d) {
    etat = d;
    boutons.forEach(function (b) { b.hidden = false; });
    if (!d.disponible) {
      poser('station', "Radio de l'Ordre");
      poser('genre', ''); poser('description', ''); poser('artiste', '');
      poser('titre', 'Station inconnue pour le moment');
      poser('resume', "Radio de l'Ordre");
      avis("La radio ne répond pas pour l'instant. Elle reprendra dès que Vigie ODN publiera sa station.");
      boutons.forEach(function (b) { b.disabled = true; });
      return;
    }
    boutons.forEach(function (b) { b.disabled = false; });
    avis('');
    poser('station', d.station.nom);
    poser('genre', d.station.genre);
    poser('description', d.station.description);
    poser('titre', d.titre || 'Titre non communiqué par la station');
    poser('artiste', d.artiste);
    poser('resume', d.titre ? ((d.artiste ? d.artiste + ' · ' : '') + d.titre) : d.station.nom);

    if ('mediaSession' in navigator && window.MediaMetadata) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: d.titre || d.station.nom,
        artist: d.artiste || d.station.nom,
        album: "Radio de l'Ordre · L'Ordre du Néant",
        artwork: [{ src: '/assets/embleme-512.png', sizes: '512x512', type: 'image/png' }]
      });
    }

    /* La station a changé sur Discord pendant l'écoute : on suit. */
    if (enLecture && audio.dataset.cle !== d.cle) { jouer(); }
  }

  function relever() {
    return fetch('/api/radio', { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
      .then(afficher)
      .catch(function () { if (!etat) { afficher({ disponible: false }); } });
  }

  function planifier() {
    clearTimeout(minuteur);
    if (document.hidden) { return; }
    minuteur = setTimeout(function () { relever().then(planifier); }, 20000);
  }

  function jouer() {
    if (!etat || !etat.disponible) { return; }
    /* Un paramètre qui change force le navigateur à rouvrir le flux au
       lieu de reprendre un tampon vieux de plusieurs minutes. */
    var src = etat.ecoute + (etat.ecoute.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
    audio.src = src;
    audio.dataset.cle = etat.cle;
    enLecture = true; marquer();
    var p = audio.play();
    if (p && p.catch) {
      p.catch(function () {
        enLecture = false; marquer();
        avis("Le navigateur a refusé la lecture. Réessayez d'un clic.");
      });
    }
  }

  function couper() {
    enLecture = false; marquer();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }

  boutons.forEach(function (b) {
    b.addEventListener('click', function () { if (enLecture) { couper(); } else { jouer(); } });
  });

  document.querySelectorAll('[data-radio-volume]').forEach(function (r) {
    r.value = Math.round(volume * 100);
    r.addEventListener('input', function () {
      volume = r.value / 100;
      audio.volume = volume;
      try { localStorage.setItem('odn-radio-volume', String(volume)); } catch (e) {}
    });
  });

  audio.addEventListener('error', function () {
    if (!enLecture) { return; }
    enLecture = false; marquer();
    avis('Le flux de la station est coupé. Nouvel essai possible dans un instant.');
  });

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', jouer);
      navigator.mediaSession.setActionHandler('pause', couper);
      navigator.mediaSession.setActionHandler('stop', couper);
    } catch (e) {}
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { relever().then(planifier); } else { clearTimeout(minuteur); }
  });

  relever().then(planifier);
})();
