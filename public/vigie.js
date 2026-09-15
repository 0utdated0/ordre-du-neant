/* =========================================================
   L'ORDRE DU NÉANT — données en direct
   ---------------------------------------------------------
   Effectif, opérations et présence viennent de /api/ordre,
   une fonction Cloudflare qui interroge Discord avec le jeton
   du bot. Le navigateur ne voit jamais ce jeton.

   Si l'adresse ne répond pas (site pas encore relié, ou
   aperçu statique), on bascule sur un jeu d'exemple et on le
   dit clairement à l'écran. Jamais de fausse donnée muette.
   ========================================================= */
(function () {
  'use strict';

  var SOURCE = '/api/ordre';
  var EXEMPLE = 'exemple/ordre.json';

  var jourMois = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', timeZone: 'Europe/Paris'
  });
  var heure = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'
  });
  var jourSemaine = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', timeZone: 'Europe/Paris'
  });

  function $(id) { return document.getElementById(id); }

  function avis(id, texte, ton) {
    var n = $(id);
    if (!n) { return; }
    if (!texte) { n.hidden = true; return; }
    n.textContent = texte;
    n.className = 'avis' + (ton ? ' avis--' + ton : '');
    n.hidden = false;
  }

  /* ---------------------------------------------------------
     Récupération
     --------------------------------------------------------- */
  function charger() {
    return fetch(SOURCE, { headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) { throw new Error('http ' + r.status); }
        return r.json();
      })
      .then(function (d) {
        if (d && d.erreur) { throw new Error(d.erreur); }
        return { donnees: d, exemple: false };
      })
      .catch(function () {
        return fetch(EXEMPLE)
          .then(function (r) { return r.json(); })
          .then(function (d) { return { donnees: d, exemple: true }; });
      });
  }

  /* ---------------------------------------------------------
     Compteurs et présence
     --------------------------------------------------------- */
  function poserChiffre(cle, valeur) {
    var n = document.querySelector('[data-chiffre="' + cle + '"]');
    if (n) { n.textContent = valeur === null || valeur === undefined ? '·' : valeur; }
  }

  function rendreVigie(d, exemple) {
    var eff = d.effectif || {};
    var pre = d.presence || {};

    poserChiffre('recus', typeof eff.recus === 'number' ? eff.recus : null);
    poserChiffre('enLigne', pre.disponible ? pre.enLigne : null);
    poserChiffre('enVocal', pre.disponible ? pre.enVocal : null);

    var pourvues = null;
    if (eff.parDivision) {
      pourvues = Object.keys(eff.parDivision).filter(function (k) {
        return eff.parDivision[k] > 0;
      }).length;
    }
    poserChiffre('divisions', pourvues);

    /* salons vocaux occupés */
    var bloc = $('vocaux');
    if (bloc) {
      var liste = bloc.querySelector('.vocaux__liste');
      liste.innerHTML = '';
      var salons = (pre.disponible && pre.salons) || [];
      if (salons.length) {
        salons.forEach(function (s) {
          var li = document.createElement('li');
          li.className = 'vocal';
          var t = document.createElement('span');
          t.className = 'vocal__nom';
          t.textContent = s.nom;
          var g = document.createElement('span');
          g.className = 'vocal__gens';
          g.textContent = s.occupants.join(', ');
          li.appendChild(t);
          li.appendChild(g);
          liste.appendChild(li);
        });
        bloc.hidden = false;
      } else {
        bloc.hidden = true;
      }
    }

    /* avis */
    if (exemple) {
      avis('avis-vigie',
        "Données d'exemple. Le site n'est pas encore relié au Discord de l'Ordre.",
        'exemple');
    } else if (!pre.disponible && pre.raison === 'widget-desactive') {
      avis('avis-vigie',
        "L'effectif est à jour. La présence en direct demande d'activer le widget dans les paramètres du serveur Discord.",
        'tiede');
    } else if (pre.perime && pre.releve) {
      /* Discord limite la fréquence des appels au widget. Plutôt que
         d'effacer les chiffres, on les garde en datant le relevé. */
      avis('avis-vigie',
        'Effectif à jour. Présence relevée à ' + heure.format(new Date(pre.releve)) + '.',
        'discret');
    } else if (!pre.disponible) {
      avis('avis-vigie',
        "L'effectif est à jour. La présence en direct est momentanément indisponible.",
        'discret');
    } else if (d.maj) {
      avis('avis-vigie', 'Relevé du ' + jourMois.format(new Date(d.maj)) +
        ' à ' + heure.format(new Date(d.maj)) + '.', 'discret');
    }

    rendreRegistre(eff);
  }

  /* ---------------------------------------------------------
     Registre
     --------------------------------------------------------- */
  var tousMembres = [];
  var filtreActif = 'tous';

  function rendreRegistre(eff) {
    var boite = $('registre');
    if (!boite) { return; }
    tousMembres = (eff && eff.membres) || [];

    if (!tousMembres.length) {
      boite.hidden = true;
      return;
    }
    boite.hidden = false;

    /* filtres : « tous » plus chaque division réellement pourvue */
    var divisions = [];
    tousMembres.forEach(function (m) {
      (m.divisions || []).forEach(function (d) {
        if (divisions.indexOf(d) === -1) { divisions.push(d); }
      });
    });
    divisions.sort();

    var zone = $('filtres');
    zone.innerHTML = '';
    ['tous'].concat(divisions).forEach(function (d) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'filtre' + (d === filtreActif ? ' filtre--actif' : '');
      b.textContent = d === 'tous' ? 'Tous' : d;
      b.setAttribute('aria-pressed', d === filtreActif ? 'true' : 'false');
      b.addEventListener('click', function () {
        filtreActif = d;
        rendreRegistre({ membres: tousMembres });
      });
      zone.appendChild(b);
    });

    var retenus = filtreActif === 'tous'
      ? tousMembres
      : tousMembres.filter(function (m) {
          return (m.divisions || []).indexOf(filtreActif) !== -1;
        });

    var liste = boite.querySelector('.registre__liste');
    liste.innerHTML = '';

    retenus.forEach(function (m) {
      var li = document.createElement('li');
      li.className = 'ligne' + (m.fonctions && m.fonctions.length ? ' ligne--charge' : '');

      var nom = document.createElement('span');
      nom.className = 'ligne__nom';
      nom.textContent = m.nom;

      var ech = document.createElement('span');
      ech.className = 'ligne__echelon' + (m.voie === 'conféré' ? ' ligne__echelon--confere' : '');
      ech.textContent = m.echelon;

      var fon = document.createElement('span');
      fon.className = 'ligne__fonctions';
      fon.textContent = (m.fonctions || []).join(' · ');

      var div = document.createElement('span');
      div.className = 'ligne__divisions';
      (m.divisions || []).forEach(function (d) {
        var e = document.createElement('em');
        e.textContent = d;
        div.appendChild(e);
      });

      var dep = document.createElement('span');
      dep.className = 'ligne__depuis';
      dep.textContent = m.depuis ? jourMois.format(new Date(m.depuis)) : '';

      li.appendChild(nom);
      li.appendChild(ech);
      li.appendChild(fon);
      li.appendChild(div);
      li.appendChild(dep);
      liste.appendChild(li);
    });

    $('registre-pied').textContent = retenus.length +
      (retenus.length > 1 ? ' membres' : ' membre') +
      (filtreActif === 'tous' ? '' : ' en ' + filtreActif);
  }

  /* ---------------------------------------------------------
     Opérations
     --------------------------------------------------------- */
  function rendreOperations(d, exemple) {
    var liste = $('operations-liste');
    if (!liste) { return; }
    var ops = d.operations;

    if (!ops || ops.erreur || !ops.length) {
      liste.innerHTML = '';
      avis('avis-operations',
        exemple
          ? "Données d'exemple. Le site n'est pas encore relié au Discord de l'Ordre."
          : "Aucune opération n'est inscrite au tableau pour l'instant. Elles s'annoncent sur le Discord.",
        exemple ? 'exemple' : 'discret');
      return;
    }

    if (exemple) {
      avis('avis-operations',
        "Données d'exemple. Le site n'est pas encore relié au Discord de l'Ordre.", 'exemple');
    } else {
      avis('avis-operations', '');
    }

    liste.innerHTML = '';
    ops.forEach(function (o) {
      var debut = new Date(o.debut);
      var li = document.createElement('li');
      li.className = 'operation' + (o.encours ? ' operation--encours' : '');

      var date = document.createElement('div');
      date.className = 'operation__date';
      var j = document.createElement('strong');
      j.textContent = jourMois.format(debut);
      var h = document.createElement('span');
      h.textContent = heure.format(debut);
      var sem = document.createElement('em');
      sem.textContent = jourSemaine.format(debut);
      date.appendChild(sem);
      date.appendChild(j);
      date.appendChild(h);

      var corps = document.createElement('div');
      corps.className = 'operation__corps';
      var titre = document.createElement('h3');
      titre.textContent = o.nom;
      corps.appendChild(titre);
      if (o.resume) {
        var p = document.createElement('p');
        p.textContent = o.resume;
        corps.appendChild(p);
      }

      var meta = document.createElement('div');
      meta.className = 'operation__meta';
      if (o.encours) { meta.appendChild(etiquette('En cours', 'vive')); }
      if (o.lieu) { meta.appendChild(etiquette(o.lieu)); }
      if (o.fin) { meta.appendChild(etiquette(duree(o.debut, o.fin))); }
      if (typeof o.inscrits === 'number' && o.inscrits > 0) {
        meta.appendChild(etiquette(o.inscrits + (o.inscrits > 1 ? ' inscrits' : ' inscrit')));
      }
      corps.appendChild(meta);

      li.appendChild(date);
      li.appendChild(corps);
      liste.appendChild(li);
    });
  }

  function etiquette(texte, ton) {
    var s = document.createElement('span');
    s.className = 'etiquette' + (ton ? ' etiquette--' + ton : '');
    s.textContent = texte;
    return s;
  }

  function duree(a, b) {
    var m = Math.round((new Date(b) - new Date(a)) / 60000);
    if (m < 60) { return m + ' min'; }
    var h = Math.floor(m / 60), r = m % 60;
    return r ? h + ' h ' + r : h + ' h';
  }

  /* ---------------------------------------------------------
     Galerie
     --------------------------------------------------------- */
  function chargerGalerie() {
    var grille = $('galerie-grille');
    if (!grille) { return; }

    fetch('galerie/manifeste.json')
      .then(function (r) {
        if (!r.ok) { throw new Error('absent'); }
        return r.json();
      })
      .then(function (images) {
        if (!Array.isArray(images) || !images.length) { throw new Error('vide'); }
        images.forEach(function (im) {
          var fig = document.createElement('figure');
          fig.className = 'cliche revele';
          var img = document.createElement('img');
          img.src = 'galerie/' + im.fichier;
          img.alt = im.legende || '';
          img.loading = 'lazy';
          img.decoding = 'async';
          fig.appendChild(img);
          if (im.legende) {
            var c = document.createElement('figcaption');
            c.textContent = im.legende;
            fig.appendChild(c);
          }
          fig.addEventListener('click', function () { ouvrir(img.src, im.legende || ''); });
          fig.tabIndex = 0;
          fig.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              ouvrir(img.src, im.legende || '');
            }
          });
          grille.appendChild(fig);
        });
        reveler(grille);
      })
      .catch(function () {
        /* Galerie vide. Il y avait trois cases « emplacement libre »
           et, dessous, la consigne technique pour les remplir : un
           visiteur lisait le mode d'emploi du site. Il voit
           maintenant un viseur en attente et une phrase. */
        var acte = document.getElementById('galerie');
        if (acte) { acte.classList.add('acte--vide'); }
        var vide = document.createElement('figure');
        vide.className = 'galerie__vide revele';
        vide.innerHTML =
          '<svg viewBox="0 0 96 64" aria-hidden="true" focusable="false">' +
          '<path class="viseur" d="M2 16V2h14M80 2h14v14M94 48v14H80M16 62H2V48"/>' +
          '<path class="viseur-rouge" d="M42 32h12M48 26v12"/>' +
          '<circle class="point" cx="86" cy="10" r="2.4"/></svg>' +
          '<p>Les premières captures arrivent avec les premières opérations.</p>' +
          '<small>Enregistrement en attente</small>';
        grille.appendChild(vide);
        reveler(grille);
      });
  }

  /* ---------------------------------------------------------
     Visionneuse
     --------------------------------------------------------- */
  var vue = $('visionneuse');

  function ouvrir(src, legende) {
    if (!vue) { return; }
    vue.querySelector('img').src = src;
    vue.querySelector('img').alt = legende;
    vue.querySelector('figcaption').textContent = legende;
    vue.hidden = false;
    document.body.style.overflow = 'hidden';
    vue.querySelector('.visionneuse__fermer').focus();
  }

  function fermer() {
    if (!vue) { return; }
    vue.hidden = true;
    vue.querySelector('img').src = '';
    document.body.style.overflow = '';
  }

  if (vue) {
    vue.addEventListener('click', function (e) {
      if (e.target === vue || e.target.closest('.visionneuse__fermer')) { fermer(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !vue.hidden) { fermer(); }
    });
  }

  /* les éléments ajoutés après coup doivent aussi apparaître */
  function reveler(racine) {
    var cibles = racine.querySelectorAll('.revele:not(.vu)');
    if (!('IntersectionObserver' in window)) {
      cibles.forEach(function (n) { n.classList.add('vu'); });
      return;
    }
    var o = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('vu'); o.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    cibles.forEach(function (n) { o.observe(n); });
  }

  /* ---------------------------------------------------------
     Départ
     --------------------------------------------------------- */
  charger().then(function (r) {
    rendreVigie(r.donnees, r.exemple);
    rendreOperations(r.donnees, r.exemple);
  }).catch(function () {
    avis('avis-vigie', "Le registre est momentanément indisponible.", 'discret');
    avis('avis-operations', "Le tableau des opérations est momentanément indisponible.", 'discret');
  });

  chargerGalerie();
})();
