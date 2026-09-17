#!/usr/bin/env node
/* =========================================================
   Assemblage des pages
   ---------------------------------------------------------
   Le site n'a pas de moteur de gabarit et n'en mérite pas un.
   Cinq pages partagent un en-tête, un menu et un pied : plutôt
   que d'en maintenir cinq copies à la main, on les assemble ici
   à partir d'un gabarit et des sections découpées.

     node outils/pages/batir.js

   Sortie : les fichiers HTML de public/. Ne rien éditer là-bas,
   tout se passe dans outils/pages.
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');

const ICI = __dirname;
const RACINE = path.resolve(ICI, '..', '..');
const SORTIE = path.join(RACINE, 'public');

/* Empreinte d'un fichier de public/, ajoutée à son adresse. Une
   page reconstruite pointe ainsi vers une adresse neuve dès qu'un
   script ou la feuille de style change : aucun cache, ni celui du
   navigateur ni celui de Cloudflare, ne peut servir l'ancien code
   sous une page neuve. */
const crypto = require('crypto');
const empreinte = (fichier) => crypto.createHash('sha1')
  .update(fs.readFileSync(path.join(SORTIE, fichier))).digest('hex').slice(0, 10);

const lire = (p) => fs.readFileSync(path.join(ICI, p), 'utf8').replace(/\s+$/, '');
const section = (nom) => lire(path.join('sections', nom + '.html'));
const bloc = (nom) => lire(path.join('blocs', nom + '.html'));

/* Les pages. Chaque entrée décrit ce qu'elle contient, ce qu'elle
   met dans son rail, et surtout ce qu'elle charge : une page ne
   doit pas payer pour la 3D d'une autre. */
const PAGES = [
  {
    cle: 'accueil', fichier: 'index.html', url: '/',
    menu: 'Histoire',
    titre: "L'Ordre du Néant - organisation Star Citizen francophone",
    description: "Organisation Star Citizen francophone structurée : huit divisions, opérations planifiées, partage des gains écrit. Recrutement ouvert aux pilotes majeurs parlant français.",
    /* L'ordre suit un cycle de mission complet : on arrive, on se
       pose, on repart, on travaille, on ramène, on défend ce
       qu'on ramène, et on franchit. Le combat vient après le
       travail parce qu'on se bat pour ce qu'on a déjà. */
    sections: ['seuil', 'approche', 'appontage', 'vitesse', 'extraction',
               'recuperation', 'convoi', 'ligne', 'saut', 'plongee', ':appel'],
    rail: [['seuil', 'I', 'Seuil'], ['approche', 'II', 'Approche'],
           ['appontage', 'III', 'Appontage'], ['vitesse', 'IV', 'Départ'],
           ['extraction', 'V', 'Extraction'], ['recuperation', 'VI', 'Récupération'],
           ['convoi', 'VII', 'Convoi'], ['ligne', 'VIII', 'Ligne de feu'],
           ['saut', 'IX', 'Saut'], ['plongee', 'X', 'Passage'],
           ['appel', 'XI', 'Entrer']],
    scripts: ['trois', 'coques', 'vaisseaux', 'acte3d', 'travaux', 'scene',
              'approche', 'appontage', 'vitesse', 'extraction', 'recuperation',
              'convoi', 'ligne', 'saut', 'plongee', 'site']
  },
  {
    cle: 'ordre', fichier: 'ordre.html', url: '/ordre',
    menu: "L'Ordre",
    titre: "L'Ordre - divisions, hiérarchie et Règle | L'Ordre du Néant",
    description: "Huit divisions opérationnelles, six échelons d'ascension, et la Règle de l'Ordre : ce que nous demandons et ce que nous garantissons par écrit.",
    sections: ['manifeste', 'ordre-portes', 'ascension', ':appel'],
    rail: [['manifeste', 'I', 'Manifeste'], ['portes', 'II', 'Trois portes'],
           ['ascension', 'III', 'Ascension'], ['appel', 'IV', 'Entrer']],
    scripts: ['trois', 'coques', 'scene', 'ascension', 'site']
  },
  {
    cle: 'codex', fichier: 'codex.html', url: '/codex',
    menu: 'Codex', etiquette: 'Chapitre',
    appel: {
      devise: 'Le Codex continue',
      titre: 'Écrire la suite',
      texte: "Le Codex s'arrête là où commence ce que nous n'avons pas encore vécu. Les prochains chapitres s'écriront avec ceux qui entrent maintenant.",
      lien: '/rejoindre', libelle: 'Franchir le Seuil'
    },
    titre: "Le Codex - récit, échelons et usages | L'Ordre du Néant",
    description: "Le récit de l'Ordre du Néant : le convoi perdu, le Seuil, le sens des six échelons, des fonctions et du nom des appareils, et les usages de l'Ordre.",
    sections: ['codex-prologue', 'codex-neant', 'codex-convoi', 'codex-seuil',
               'codex-echelle', 'codex-fonctions', 'codex-noms', 'codex-usages',
               'codex-temps', ':appel'],
    rail: [['codex-neant', 'I', 'Le Néant'], ['codex-convoi', 'II', 'Le convoi perdu'],
           ['codex-seuil', 'III', 'Le Seuil'], ['codex-echelle', 'IV', "L'échelle"],
           ['codex-fonctions', 'V', 'Les fonctions'], ['codex-noms', 'VI', 'Les noms'],
           ['codex-usages', 'VII', 'Les usages'], ['codex-temps', 'VIII', 'Les quatre temps'],
           ['appel', 'IX', 'Entrer']],
    scripts: ['trois', 'scene', 'site']
  },
  {
    cle: 'regle', fichier: 'regle.html', url: '/regle',
    menu: 'La Règle',
    appel: {
      devise: 'Lue et comprise',
      titre: 'Elle vous convient ?',
      texte: "Si ces vingt-neuf articles vous ressemblent, le Seuil est ouvert. Sinon, rien ne vous retient : tout n'est que passage.",
      lien: '/rejoindre', libelle: 'Le parcours d\'entrée'
    },
    titre: "La Règle de l'Ordre - vingt-neuf articles | L'Ordre du Néant",
    description: "La Règle de l'Ordre du Néant en vingt-neuf articles : principes, admission, présence et échelons, opérations et partage des gains, conduite, commandement.",
    sections: ['regle-preambule', 'regle-principes', 'regle-admission', 'regle-presence',
               'regle-operations', 'regle-conduite', 'regle-commandement', ':appel'],
    rail: [['regle-principes', 'I', 'Principes'], ['regle-admission', 'II', 'Admission'],
           ['regle-presence', 'III', 'Présence'], ['regle-operations', 'IV', 'Opérations'],
           ['regle-conduite', 'V', 'Conduite'], ['regle-commandement', 'VI', 'Commandement'],
           ['appel', 'VII', 'Entrer']],
    scripts: ['trois', 'scene', 'site']
  },
  {
    cle: 'divisions', fichier: 'divisions.html', url: '/divisions',
    menu: 'Divisions', horsMenu: true,
    appel: {
      devise: 'Un métier, un équipage',
      titre: 'Choisir sa division',
      texte: "On en choisit une ou plusieurs en entrant, on en change quand on veut. Le premier mois, un référent vole avec vous.",
      lien: '/rejoindre', libelle: 'Comment entrer'
    },
    titre: "Divisions et instruction | L'Ordre du Néant",
    description: "Les huit divisions de l'Ordre du Néant en détail : missions, activités, appareils typiques, et l'instruction des nouveaux membres pendant leur premier mois.",
    sections: ['divisions-ouverture', 'divisions-liste', 'instruction', ':appel'],
    rail: [['divisions-liste', 'I', 'Divisions'], ['instruction', 'II', 'Instruction'],
           ['appel', 'III', 'Entrer']],
    scripts: ['trois', 'scene', 'site']
  },
  {
    cle: 'flotte', fichier: 'flotte.html', url: '/flotte',
    menu: 'La flotte',
    titre: "La flotte | L'Ordre du Néant",
    description: "Neuf appareils de la classification interne de l'Ordre, projetés en hologramme : porte-Néant, frégate, corvette, canonnière, cargo, plateformes d'extraction, chasseur et station d'attache.",
    sections: ['flotte', ':appel'],
    rail: [['flotte', 'I', 'Flotte'], ['appel', 'II', 'Entrer']],
    scripts: ['trois', 'coques', 'vaisseaux', 'scene', 'flotte', 'site']
  },
  {
    cle: 'vie', fichier: 'vie.html', url: '/vie',
    menu: 'La vie',
    titre: "La vie de l'Ordre - effectif, opérations, galerie | L'Ordre du Néant",
    description: "L'effectif en direct depuis le Discord, les opérations planifiées et la galerie des sorties de l'Ordre du Néant.",
    sections: ['vigie', 'radio', 'operations', 'galerie', ':appel'],
    rail: [['vigie', 'I', 'Vigie'], ['radio', 'II', 'Radio'], ['operations', 'III', 'Opérations'],
           ['galerie', 'IV', 'Galerie'], ['appel', 'V', 'Entrer']],
    scripts: ['trois', 'scene', 'site', 'vigie'],
    visionneuse: true
  },
  {
    cle: 'rejoindre', fichier: 'rejoindre.html', url: '/rejoindre',
    menu: 'Rejoindre',
    titre: "Rejoindre l'Ordre du Néant - recrutement Star Citizen francophone",
    description: "Comment entrer dans l'Ordre du Néant : conditions, sas d'admission, instruction du dossier. Recrutement ouvert aux pilotes majeurs parlant français.",
    sections: ['passage', 'entree', 'allies', 'faq'],
    rail: [['passage', 'I', 'Entrer'], ['entree', 'II', 'Parcours'],
           ['allies', 'III', 'Alliés'], ['faq', 'IV', 'Questions']],
    scripts: ['trois', 'scene', 'site']
  },
  {
    /* Page d'erreur : ni dans le menu, ni dans le plan, ni dans le
       plan du site. Le Worker la sert pour toute adresse inconnue. */
    cle: 'perdu', fichier: '404.html', url: '/404', cachee: true,
    menu: 'Hors carte',
    titre: "Hors carte | L'Ordre du Néant",
    description: "Cette adresse ne mène nulle part sur le site de l'Ordre du Néant.",
    sections: ['perdu'],
    rail: [],
    scripts: ['trois', 'scene', 'site']
  }
];

const FICHIERS = {
  trois: 'vendor/three.min.js', coques: 'coques.js', vaisseaux: 'vaisseaux.js',
  scene: 'scene.js', approche: 'approche.js', flotte: 'flotte.js', saut: 'saut.js',
  ascension: 'ascension.js', plongee: 'plongee.js', site: 'site.js', vigie: 'vigie.js',
  radio: 'radio.js', acte3d: 'acte3d.js', travaux: 'travaux.js', convoi: 'convoi.js',
  extraction: 'extraction.js', recuperation: 'recuperation.js', ligne: 'ligne.js',
  vitesse: 'vitesse.js', appontage: 'appontage.js'
};

/* Le menu du haut ne peut pas tout porter : au-delà de sept
   entrées il ne tient plus sur un écran de portable. Une page
   « horsMenu » reste dans le plan du site en pied de page, et on
   y arrive par les renvois des pages voisines. */
/* L'appel du bas de page. Il était identique partout : huit pages qui
   finissaient par le même bloc, mot pour mot. Chaque page peut
   maintenant le tourner vers ce qu'elle vient de raconter. */
const APPEL = {
  devise: "Tout n'est que passage",
  titre: "Entrer dans l'Ordre",
  texte: "Nous sommes une organisation jeune, encore réduite. Si vous préférez compter parmi les premiers plutôt que d'être le quatre-centième nom d'une liste, le moment est maintenant.",
  lien: '/rejoindre', libelle: 'Comment entrer'
};

function menuDe(courante, plan) {
  return PAGES.filter(function (p) { return !p.cachee && (plan || !p.horsMenu); }).map(function (p) {
    const actif = p.cle === courante.cle;
    return '    <a href="' + p.url + '"' + (actif ? ' aria-current="page"' : '') +
           '>' + p.menu + '</a>';
  }).join('\n');
}

function railDe(p) {
  if (!p.rail.length) { return ''; }
  return '<nav class="rail" id="rail" aria-label="Sections">\n' +
    p.rail.map(function (r) {
      return '  <a href="#' + r[0] + '" data-cible="' + r[0] + '">' +
             '<span>' + r[1] + '</span><em>' + r[2] + '</em></a>';
    }).join('\n') + '\n</nav>';
}

/* Les actes sont renumérotés page par page. Avant le découpage il
   y en avait onze à la file ; maintenant chaque page a sa propre
   suite, et c'est le rail qui en donne l'ordre. Une section dont
   la page ne numérote pas perd son étiquette. */
function corpsDe(p) {
  const numeros = {};
  p.rail.forEach(function (r) { numeros[r[0]] = r[1]; });

  const morceaux = p.sections.map(function (nom) {
    const cle = nom[0] === ':' ? nom.slice(1) : nom;
    let html = nom[0] === ':' ? bloc(cle) : section(cle);
    if (cle === 'appel') {
      const a = Object.assign({}, APPEL, p.appel || {});
      html = html.replace('{{APPEL_DEVISE}}', a.devise).replace('{{APPEL_TITRE}}', a.titre)
        .replace('{{APPEL_TEXTE}}', a.texte).replace('{{APPEL_LIEN}}', a.lien)
        .replace('{{APPEL_LIBELLE}}', a.libelle);
    }
    html = html.replace(/\{\{NUMERO\}\}/g, numeros[cle] || '');
    if (numeros[cle]) {
      html = html.replace(/\{\{ACTE\}\}/g, (p.etiquette || 'Acte') + ' ' + numeros[cle]);
    } else {
      html = html
        .replace(/\s*<p class="(?:acte__num|approche__num|ascension__num)[^"]*"[^>]*>\{\{ACTE\}\}<\/p>/g, '')
        .replace(/\{\{ACTE\}\}, /g, '');
    }
    if (html.indexOf('{{ACTE}}') >= 0) {
      throw new Error('étiquette d\'acte non résolue dans ' + cle);
    }
    return html;
  });
  let corps = morceaux.join('\n\n');
  /* Un seul titre principal par page, pour les moteurs de recherche et
     les lecteurs d'écran : le premier titre de la page passe en h1. Il
     garde son apparence, les règles des h2 visent aussi h1.titre-page. */
  if (corps.indexOf('<h1') < 0) {
    const debut = corps.indexOf('<h2');
    if (debut >= 0) {
      const fin = corps.indexOf('</h2>', debut);
      let ouvrant = corps.slice(debut, corps.indexOf('>', debut) + 1);
      ouvrant = /class="/.test(ouvrant)
        ? ouvrant.replace('<h2', '<h1').replace('class="', 'class="titre-page ')
        : ouvrant.replace('<h2', '<h1 class="titre-page"');
      corps = corps.slice(0, debut) + ouvrant + corps.slice(corps.indexOf('>', debut) + 1, fin) + '</h1>' + corps.slice(fin + 5);
    }
  }
  return '<main id="contenu">\n' + corps + '\n</main>';
}

/* Données structurées de chaque page : la page elle-même, rattachée au
   site et à l'organisation, et son fil d'Ariane depuis l'accueil. */
function donneesStructurees(p) {
  const racine = 'https://ordre-du-neant.fr';
  const url = racine + (p.url === '/' ? '/' : p.url);
  const graphe = [
    { '@type': 'WebSite', '@id': racine + '/#site', url: racine + '/', name: "L'Ordre du Néant",
      alternateName: ['Ordre du Néant', 'NEANT'], inLanguage: 'fr-FR',
      publisher: { '@id': racine + '/#organisation' } },
    { '@type': 'Organization', '@id': racine + '/#organisation', name: "L'Ordre du Néant", url: racine + '/',
      alternateName: 'NEANT', slogan: "Tout n'est que passage",
      description: 'Organisation Star Citizen francophone structurée en huit divisions opérationnelles.',
      logo: racine + '/assets/embleme-512.png', sameAs: ['https://robertsspaceindustries.com/en/orgs/NEANT'] },
    { '@type': 'WebPage', '@id': url + '#page', url: url, name: p.titre, description: p.description,
      inLanguage: 'fr-FR', isPartOf: { '@id': racine + '/#site' }, about: { '@id': racine + '/#organisation' } }
  ];
  if (p.cle !== 'accueil') {
    graphe.push({ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: racine + '/' },
      { '@type': 'ListItem', position: 2, name: p.menu || p.titre.split(' | ')[0], item: url }
    ] });
  }
  return '\n<script type="application/ld+json">\n' +
    JSON.stringify({ '@context': 'https://schema.org', '@graph': graphe }) + '\n</script>';
}

let n = 0;
for (const p of PAGES) {
  let html = lire('gabarit.html');
  html = html
    .replace(/\{\{TITRE\}\}/g, p.titre)
    .replace(/\{\{DESCRIPTION\}\}/g, p.description)
    .replace(/\{\{URL\}\}/g, p.url === '/' ? '/' : p.url)
    .replace('{{CLE}}', p.cle)
    .replace('{{TETE}}', donneesStructurees(p))
    .replace('{{BARRE}}', bloc('barre').replace('{{MENU}}', menuDe(p)))
    .replace('{{RAIL}}', railDe(p))
    .replace('{{CORPS}}', corpsDe(p))
    .replace('{{VISIONNEUSE}}', p.visionneuse ? bloc('visionneuse') : '')
    .replace('{{PIED}}', bloc('pied').replace('{{PLAN}}', menuDe(p, true)))
    /* La radio a son bouton dans la barre de toutes les pages. */
    .replace('{{SCRIPTS}}', p.scripts.concat(['radio']).map(function (s) {
      return '<script src="/' + FICHIERS[s] + '?v=' + empreinte(FICHIERS[s]) + '" defer></script>';
    }).join('\n'))
    .replace('href="/styles.css"', 'href="/styles.css?v=' + empreinte('styles.css') + '"');

  html = html.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(path.join(SORTIE, p.fichier), html);
  n++;
  console.log(p.fichier.padEnd(16), p.sections.length + ' sections,',
    p.scripts.length + ' scripts,', (html.length / 1024).toFixed(1) + ' Ko');
}

/* plan du site, tenu par la même liste */
const jour = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(SORTIE, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  PAGES.filter(function (p) { return !p.cachee; }).map(function (p) {
    return '  <url><loc>https://ordre-du-neant.fr' + p.url + '</loc>' +
           '<lastmod>' + jour + '</lastmod>' +
           '<priority>' + (p.url === '/' ? '1.0' : '0.8') + '</priority></url>';
  }).join('\n') + '\n</urlset>\n');

console.log(n + ' pages et le plan du site écrits dans public/');
