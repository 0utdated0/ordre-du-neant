/* =========================================================
   L'ORDRE DU NÉANT - la page du marché
   ---------------------------------------------------------
   Trois tableaux nourris par /api/marche : les minerais, les
   routes de commerce, et tout le reste. Le Worker a déjà trié
   et écarté les relevés douteux ; ici on affiche, on filtre et
   on ouvre une fiche par marchandise.

   Aucune bibliothèque : les courbes sont du SVG écrit à la
   main, et les tableaux sont de vrais tableaux, lisibles au
   clavier comme au lecteur d'écran.
   ========================================================= */
(function () {
  'use strict';

  var etat = document.getElementById('marche-etat');
  if (!etat) { return; }

  var DONNEES = null;
  var SYSTEMES = [];

  /* ---------- petits outils ---------- */

  function aUEC(n) {
    return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
  }

  /* Les prix de comptoir ont quelques jours, les tarifs de raffinerie
     parfois deux ans : il faut que l'écart se voie d'un coup d'oeil. */
  function age(ms) {
    if (!ms) { return 'date inconnue'; }
    var j = Math.floor((Date.now() - ms) / 86400000);
    if (j <= 0) { return "aujourd'hui"; }
    if (j === 1) { return 'hier'; }
    if (j < 60) { return 'il y a ' + j + ' jours'; }
    var mois = Math.round(j / 30.4);
    if (mois < 24) { return 'il y a ' + mois + ' mois'; }
    return 'il y a ' + (Math.round(j / 365 * 10) / 10).toString().replace('.', ',') + ' ans';
  }

  function sansAccent(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function td(contenu, classe) {
    var c = document.createElement('td');
    if (classe) { c.className = classe; }
    if (contenu instanceof Node) { c.appendChild(contenu); } else { c.textContent = contenu; }
    return c;
  }

  /* Un prix sans le lieu ne sert à rien, et une case vide ne dit pas
     pourquoi elle est vide. Quand il n'y a pas d'offre, les deux
     colonnes portent donc la raison et, quand il y en a une, la marche
     à suivre : à raffiner, se vend brute, ne s'achète pas. */
  function paireVide(ligne, raisonPrix, raisonLieu) {
    ligne.appendChild(td(raisonPrix, 'nombre marche__absent'));
    ligne.appendChild(td(raisonLieu, 'marche__absent'));
  }

  function cellLieu(o, prix) {
    if (!o) { return td('pas de relevé', 'marche__absent'); }
    var c = document.createElement('td');
    if (prix) {
      var p = document.createElement('span');
      p.className = 'marche__prix';
      p.textContent = aUEC(o.prix) + ' aUEC';
      c.appendChild(p);
    }
    var nom = document.createElement('span');
    nom.className = 'marche__lieu';
    nom.textContent = o.comptoir.nom;
    var det = document.createElement('span');
    det.className = 'marche__detail';
    det.textContent = [o.comptoir.lieu, o.comptoir.systeme].filter(Boolean).join(' · ') + ' · ' + age(o.maj);
    c.appendChild(nom);
    c.appendChild(det);
    return c;
  }

  function vide(corps, texte, colonnes) {
    corps.innerHTML = '';
    var tr = document.createElement('tr');
    tr.className = 'marche__vide';
    var c = document.createElement('td');
    c.colSpan = colonnes;
    c.textContent = texte;
    tr.appendChild(c);
    corps.appendChild(tr);
  }

  /* Boutons de filtre : un par système, plus « Tous ». */
  function filtres(hote, valeurs, auChangement) {
    var courant = '';
    hote.innerHTML = '';
    [''].concat(valeurs).forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'marche__filtre' + (v === '' ? ' marche__filtre--actif' : '');
      b.textContent = v || 'Tous';
      b.setAttribute('aria-pressed', v === '' ? 'true' : 'false');
      b.addEventListener('click', function () {
        courant = v;
        Array.prototype.forEach.call(hote.children, function (x) {
          var actif = x === b;
          x.classList.toggle('marche__filtre--actif', actif);
          x.setAttribute('aria-pressed', actif ? 'true' : 'false');
        });
        auChangement(courant);
      });
      hote.appendChild(b);
    });
  }

  /* ---------- la fiche d'une marchandise ---------- */

  var fiche = document.getElementById('fiche-marche');
  var ficheSur = document.getElementById('fiche-sur');
  var ficheTitre = document.getElementById('fiche-titre');
  var ficheCorps = document.getElementById('fiche-corps');
  var rendeur = null;

  function fermerFiche() {
    if (!fiche) { return; }
    fiche.hidden = true;
    fiche.setAttribute('aria-hidden', 'true');
    if (rendeur && rendeur.focus) { rendeur.focus(); }
  }

  if (fiche) {
    fiche.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-fermer')) { fermerFiche(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !fiche.hidden) { fermerFiche(); }
    });
  }

  function listeOffres(titre, offres, sens) {
    var bloc = document.createElement('div');
    bloc.className = 'fiche-marche__bloc';
    var h = document.createElement('h4');
    h.textContent = titre;
    bloc.appendChild(h);
    if (!offres || !offres.length) {
      var p = document.createElement('p');
      p.className = 'fiche-marche__rien';
      p.textContent = 'Aucun relevé récent.';
      bloc.appendChild(p);
      return bloc;
    }
    var ul = document.createElement('ul');
    ul.className = 'fiche-marche__offres';
    offres.forEach(function (o) {
      var li = document.createElement('li');
      var prix = document.createElement('strong');
      prix.textContent = aUEC(o.prix) + ' aUEC';
      li.appendChild(prix);
      var det = document.createElement('span');
      det.textContent = ' ' + o.comptoir.nom +
        (o.comptoir.lieu && o.comptoir.lieu !== o.comptoir.nom ? ' · ' + o.comptoir.lieu : '') +
        ' (' + o.comptoir.systeme + ')' +
        (o.scu ? ' · ' + aUEC(o.scu) + ' SCU' : '') +
        ' · ' + age(o.maj) +
        (o.moyenne ? ' · moyenne ' + aUEC(o.moyenne) : '');
      li.appendChild(det);
      ul.appendChild(li);
    });
    bloc.appendChild(ul);
    return bloc;
  }

  /* Courbe des derniers relevés. UEX en garde cinq par comptoir :
     c'est court, mais ça suffit à voir si un prix monte ou s'effondre. */
  function courbe(releves) {
    var pts = releves.filter(function (r) { return r.vente > 0; });
    if (pts.length < 2) { return null; }
    var l = 520, h = 120, m = 18;
    var vals = pts.map(function (r) { return r.vente; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max === min) { max = min + 1; }
    var x = function (i) { return m + (i * (l - 2 * m)) / (pts.length - 1); };
    var y = function (v) { return h - m - ((v - min) / (max - min)) * (h - 2 * m); };
    var d = pts.map(function (r, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(r.vente).toFixed(1); }).join(' ');

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + l + ' ' + h);
    svg.setAttribute('class', 'fiche-marche__courbe');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Derniers relevés : de ' + aUEC(vals[0]) + ' à ' + aUEC(vals[vals.length - 1]) + ' aUEC');

    var trace = document.createElementNS(svg.namespaceURI, 'path');
    trace.setAttribute('d', d);
    trace.setAttribute('fill', 'none');
    trace.setAttribute('stroke', '#e01020');
    trace.setAttribute('stroke-width', '2');
    svg.appendChild(trace);

    pts.forEach(function (r, i) {
      var c = document.createElementNS(svg.namespaceURI, 'circle');
      c.setAttribute('cx', x(i).toFixed(1));
      c.setAttribute('cy', y(r.vente).toFixed(1));
      c.setAttribute('r', '3');
      c.setAttribute('fill', '#eef0f4');
      var t = document.createElementNS(svg.namespaceURI, 'title');
      t.textContent = new Date(r.date).toLocaleDateString('fr-FR') + ' : ' + aUEC(r.vente) + ' aUEC';
      c.appendChild(t);
      svg.appendChild(c);
    });
    return svg;
  }

  function ouvrirFiche(titre, sur, construire, source) {
    if (!fiche) { return; }
    rendeur = document.activeElement;
    ficheSur.textContent = sur;
    ficheTitre.textContent = titre;
    ficheCorps.innerHTML = '';
    construire(ficheCorps);
    fiche.hidden = false;
    fiche.setAttribute('aria-hidden', 'false');
    fiche.querySelector('.fiche-marche__panneau').focus();

    if (source) {
      var attente = document.createElement('p');
      attente.className = 'fiche-marche__rien';
      attente.textContent = 'Lecture des derniers relevés...';
      ficheCorps.appendChild(attente);
      fetch('/api/marche/historique?marchandise=' + source.marchandise + '&comptoir=' + source.comptoir)
        .then(function (r) { return r.json(); })
        .then(function (d) {
          attente.remove();
          var c = d.releves && courbe(d.releves);
          if (!c) { return; }
          var bloc = document.createElement('div');
          bloc.className = 'fiche-marche__bloc';
          var h = document.createElement('h4');
          h.textContent = 'Derniers relevés · ' + (d.comptoir || '');
          bloc.appendChild(h);
          bloc.appendChild(c);
          ficheCorps.appendChild(bloc);
        })
        .catch(function () { attente.remove(); });
    }
  }

  /* ---------- tableau 1 : les minerais ---------- */

  function rendreMinerais(recherche, systeme) {
    var corps = document.querySelector('#table-minerais tbody');
    var liste = DONNEES.minerais.filter(function (m) {
      var cible = sansAccent(m.nom);
      if (recherche && cible.indexOf(recherche) === -1) { return false; }
      if (!systeme) { return true; }
      return [].concat(m.brut, m.raffine).some(function (o) { return o.comptoir.systeme === systeme; });
    });
    if (!liste.length) { return vide(corps, 'Aucun minerai ne correspond.', 6); }

    corps.innerHTML = '';
    liste.forEach(function (m) {
      var b = m.brut[0], r = m.raffine[0];
      var tr = document.createElement('tr');
      tr.tabIndex = 0;
      tr.className = 'marche__ligne';

      var nom = document.createElement('td');
      var fort = document.createElement('strong');
      fort.textContent = m.nom;
      nom.appendChild(fort);
      if (m.gemme) {
        var marque = document.createElement('span');
        marque.className = 'marche__marque';
        marque.textContent = 'gemme';
        nom.appendChild(marque);
      }
      tr.appendChild(nom);

      if (b) {
        tr.appendChild(td(aUEC(b.prix), 'nombre'));
        tr.appendChild(cellLieu(b));
      } else {
        paireVide(tr, 'à raffiner', 'aucune raffinerie ne l\'achète brut');
      }

      if (r) {
        tr.appendChild(td(aUEC(r.prix), 'nombre'));
        tr.appendChild(cellLieu(r));
      } else if (m.gemme) {
        paireVide(tr, 'se vend brute', 'sans passer par la raffinerie');
      } else {
        paireVide(tr, 'pas de relevé', 'aucun comptoir relevé');
      }
      tr.appendChild(m.gainRaffinage === null
        ? td(m.gemme ? 'sans objet' : 'inconnu', 'nombre marche__absent')
        : td('+' + m.gainRaffinage + ' %', 'nombre marche__gain'));

      var ouvrir = function () {
        var meilleur = r || b;
        ouvrirFiche(m.nom, m.gemme ? 'Gemme' : 'Minerai', function (hote) {
          if (m.gainRaffinage !== null) {
            var p = document.createElement('p');
            p.className = 'fiche-marche__resume';
            p.textContent = 'Raffiner rapporte ' + m.gainRaffinage + ' % de plus que vendre brut, au mieux de chaque relevé.';
            hote.appendChild(p);
          }
          hote.appendChild(listeOffres(m.gemme ? 'Où la vendre' : 'Brut, à la raffinerie', m.brut));
          if (!m.gemme) { hote.appendChild(listeOffres('Raffiné, au comptoir', m.raffine)); }
        }, meilleur ? { marchandise: meilleur.idMarchandise, comptoir: meilleur.idComptoir } : null);
      };
      tr.addEventListener('click', ouvrir);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } });
      corps.appendChild(tr);
    });
  }

  /* ---------- tableau 2 : les routes ---------- */

  function rendreRoutes(recherche, systeme, illegal, soute) {
    var corps = document.querySelector('#table-routes tbody');
    var liste = DONNEES.routes.filter(function (r) {
      if (!illegal && r.illegal) { return false; }
      if (recherche && sansAccent(r.marchandise).indexOf(recherche) === -1) { return false; }
      if (systeme && (r.achat.comptoir.systeme !== systeme || r.vente.comptoir.systeme !== systeme)) { return false; }
      return true;
    });
    if (!liste.length) { return vide(corps, 'Aucune route ne correspond.', 6); }

    corps.innerHTML = '';
    liste.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.className = 'marche__ligne';

      var nom = document.createElement('td');
      var fort = document.createElement('strong');
      fort.textContent = r.marchandise;
      nom.appendChild(fort);
      if (r.illegal) {
        var marque = document.createElement('span');
        marque.className = 'marche__marque marche__marque--rouge';
        marque.textContent = 'illégale';
        nom.appendChild(marque);
      }
      if (r.interSysteme) {
        var saut = document.createElement('span');
        saut.className = 'marche__marque';
        saut.textContent = 'saut';
        nom.appendChild(saut);
      }
      tr.appendChild(nom);

      tr.appendChild(cellLieu(r.achat, true));
      tr.appendChild(cellLieu(r.vente, true));

      tr.appendChild(td('+' + aUEC(r.gain), 'nombre marche__gain'));
      tr.appendChild(td(r.marge + ' %', 'nombre'));
      tr.appendChild(td(aUEC(r.gain * soute), 'nombre'));
      corps.appendChild(tr);
    });
  }

  /* ---------- tableau 3 : tout le marché ---------- */

  function rendreTout(recherche, famille) {
    var corps = document.querySelector('#table-tout tbody');
    var liste = DONNEES.tableau.filter(function (m) {
      if (famille && m.nature !== famille) { return false; }
      if (!recherche) { return true; }
      var cible = sansAccent(m.nom + ' ' + m.nature + ' ' +
        [].concat(m.achats, m.ventes).map(function (o) { return o.comptoir.nom + ' ' + o.comptoir.lieu; }).join(' '));
      return cible.indexOf(recherche) !== -1;
    });
    if (!liste.length) { return vide(corps, 'Aucune marchandise ne correspond.', 6); }

    corps.innerHTML = '';
    liste.forEach(function (m) {
      var a = m.achats[0], v = m.ventes[0];
      var tr = document.createElement('tr');
      tr.tabIndex = 0;
      tr.className = 'marche__ligne';

      var nom = document.createElement('td');
      var fort = document.createElement('strong');
      fort.textContent = m.nom;
      nom.appendChild(fort);
      if (m.illegal) {
        var marque = document.createElement('span');
        marque.className = 'marche__marque marche__marque--rouge';
        marque.textContent = 'illégale';
        nom.appendChild(marque);
      }
      tr.appendChild(nom);
      tr.appendChild(td(m.nature || '-'));
      if (a) {
        tr.appendChild(td(aUEC(a.prix), 'nombre'));
        tr.appendChild(cellLieu(a));
      } else {
        paireVide(tr, 'ne s\'achète pas', m.brute ? 'elle se ramasse, elle ne s\'achète pas' : 'aucun comptoir ne la vend');
      }

      if (v) {
        tr.appendChild(td(aUEC(v.prix), 'nombre'));
        tr.appendChild(cellLieu(v));
      } else {
        paireVide(tr, 'pas de relevé', 'aucun comptoir ne la reprend');
      }

      var ouvrir = function () {
        var meilleur = v || a;
        ouvrirFiche(m.nom, m.nature || 'Marchandise', function (hote) {
          var p = document.createElement('p');
          p.className = 'fiche-marche__resume';
          p.textContent = (m.scu ? 'Un SCU pèse ' + m.scu + ' unité de soute. ' : '') +
            (m.illegal ? 'Marchandise illégale : la revente attire les patrouilles.' : '');
          if (p.textContent.trim()) { hote.appendChild(p); }
          hote.appendChild(listeOffres('Acheter', m.achats));
          hote.appendChild(listeOffres('Revendre', m.ventes));
          if (m.wiki) {
            var lien = document.createElement('a');
            lien.className = 'fiche-marche__lien';
            lien.href = m.wiki;
            lien.target = '_blank';
            lien.rel = 'noopener';
            lien.textContent = 'Fiche détaillée sur le wiki';
            hote.appendChild(lien);
          }
        }, meilleur ? { marchandise: m.id, comptoir: meilleur.idComptoir } : null);
      };
      tr.addEventListener('click', ouvrir);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } });
      corps.appendChild(tr);
    });
  }

  /* ---------- branchements ---------- */

  function brancher() {
    var mRech = '', mSys = '';
    var rRech = '', rSys = '', rIll = false, rSoute = 96;
    var tRech = '', tFam = '';

    var champMin = document.getElementById('minerais-recherche');
    champMin.addEventListener('input', function () { mRech = sansAccent(champMin.value); rendreMinerais(mRech, mSys); });
    filtres(document.getElementById('minerais-systemes'), SYSTEMES, function (s) { mSys = s; rendreMinerais(mRech, mSys); });

    var champRou = document.getElementById('routes-recherche');
    var caseIll = document.getElementById('routes-illegal');
    var champSoute = document.getElementById('routes-soute');
    var majRoutes = function () { rendreRoutes(rRech, rSys, rIll, rSoute); };
    champRou.addEventListener('input', function () { rRech = sansAccent(champRou.value); majRoutes(); });
    caseIll.addEventListener('change', function () { rIll = caseIll.checked; majRoutes(); });
    champSoute.addEventListener('input', function () {
      var v = parseInt(champSoute.value, 10);
      rSoute = isNaN(v) || v < 1 ? 1 : Math.min(v, 4000);
      majRoutes();
    });
    filtres(document.getElementById('routes-systemes'), SYSTEMES, function (s) { rSys = s; majRoutes(); });

    var champTout = document.getElementById('tableau-recherche');
    var majTout = function () { rendreTout(tRech, tFam); };
    champTout.addEventListener('input', function () { tRech = sansAccent(champTout.value); majTout(); });

    var familles = [];
    DONNEES.tableau.forEach(function (m) {
      if (m.nature && familles.indexOf(m.nature) === -1) { familles.push(m.nature); }
    });
    familles.sort(function (a, b) { return a.localeCompare(b, 'fr'); });
    filtres(document.getElementById('tableau-familles'), familles.slice(0, 12), function (f) { tFam = f; majTout(); });

    rendreMinerais('', '');
    majRoutes();
    majTout();
  }

  /* ---------- lecture ---------- */

  fetch('/api/marche')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.erreur) { throw new Error(d.message || d.erreur); }
      DONNEES = d;
      SYSTEMES = d.systemes || [];
      var quand = new Date(d.maj);
      etat.textContent = 'Relevés mis à jour ' + age(quand.getTime()) + ', à ' +
        quand.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) +
        '. Les prix sont rafraîchis toutes les quinze minutes.';
      var source = document.getElementById('marche-source');
      if (source) {
        source.innerHTML = 'Relevés des joueurs rassemblés par <a href="' + d.source.url +
          '" target="_blank" rel="noopener">' + d.source.nom + '</a>. ' +
          'Un prix de comptoir de plus de ' + d.reglages.ageMaxJours + ' jours est écarté. ' +
          'Les tarifs de raffinerie, eux, ne bougent presque jamais : ils sont gardés jusqu\'à ' +
          Math.round(d.reglages.ageMaxBrutJours / 30.4) + ' mois, avec leur date. ' +
          'Les routes demandent au moins ' + d.reglages.stockMin + ' SCU en rayon. ' +
          'Site non officiel, fait par la communauté.';
      }
      brancher();
    })
    .catch(function (e) {
      etat.textContent = "Les relevés ne répondent pas pour le moment (" + e.message + "). Réessayez dans quelques minutes.";
      ['#table-minerais tbody', '#table-routes tbody', '#table-tout tbody'].forEach(function (s) {
        var corps = document.querySelector(s);
        if (corps) { vide(corps, 'Indisponible.', 6); }
      });
    });
})();
