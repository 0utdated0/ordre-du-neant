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
    sections: ['manifeste', 'divisions', 'ascension', 'regle', ':appel'],
    rail: [['manifeste', 'I', 'Manifeste'], ['divisions', 'II', 'Divisions'],
           ['ascension', 'III', 'Ascension'], ['regle', 'IV', 'Règle'],
           ['appel', 'V', 'Entrer']],
    scripts: ['trois', 'coques', 'scene', 'ascension', 'site']
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
    menu: 'La vie de l’Ordre',
    titre: "La vie de l'Ordre - effectif, opérations, galerie | L'Ordre du Néant",
    description: "L'effectif en direct depuis le Discord, les opérations planifiées et la galerie des sorties de l'Ordre du Néant.",
    sections: ['vigie', 'operations', 'galerie', ':appel'],
    rail: [['vigie', 'I', 'Vigie'], ['operations', 'II', 'Opérations'],
           ['galerie', 'III', 'Galerie'], ['appel', 'IV', 'Entrer']],
    scripts: ['trois', 'scene', 'site', 'vigie'],
    visionneuse: true
  },
  {
    cle: 'rejoindre', fichier: 'rejoindre.html', url: '/rejoindre',
    menu: 'Rejoindre',
    titre: "Rejoindre l'Ordre du Néant - recrutement Star Citizen francophone",
    description: "Comment entrer dans l'Ordre du Néant : conditions, sas d'admission, instruction du dossier. Recrutement ouvert aux pilotes majeurs parlant français.",
    sections: ['passage'],
    rail: [],
    scripts: ['trois', 'scene', 'site']
  }
];

const FICHIERS = {
  trois: 'vendor/three.min.js', coques: 'coques.js', vaisseaux: 'vaisseaux.js',
  scene: 'scene.js', approche: 'approche.js', flotte: 'flotte.js', saut: 'saut.js',
  ascension: 'ascension.js', plongee: 'plongee.js', site: 'site.js', vigie: 'vigie.js',
  acte3d: 'acte3d.js', travaux: 'travaux.js', convoi: 'convoi.js',
  extraction: 'extraction.js', recuperation: 'recuperation.js', ligne: 'ligne.js',
  vitesse: 'vitesse.js', appontage: 'appontage.js'
};

function menuDe(courante) {
  return PAGES.map(function (p) {
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
    if (numeros[cle]) {
      html = html.replace(/\{\{ACTE\}\}/g, 'Acte ' + numeros[cle]);
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
  return '<main id="contenu">\n' + morceaux.join('\n\n') + '\n</main>';
}

let n = 0;
for (const p of PAGES) {
  let html = lire('gabarit.html');
  html = html
    .replace(/\{\{TITRE\}\}/g, p.titre)
    .replace(/\{\{DESCRIPTION\}\}/g, p.description)
    .replace(/\{\{URL\}\}/g, p.url === '/' ? '/' : p.url)
    .replace('{{CLE}}', p.cle)
    .replace('{{TETE}}', p.cle === 'accueil' ? lire('blocs/schema.html') : '')
    .replace('{{BARRE}}', bloc('barre').replace('{{MENU}}', menuDe(p)))
    .replace('{{RAIL}}', railDe(p))
    .replace('{{CORPS}}', corpsDe(p))
    .replace('{{VISIONNEUSE}}', p.visionneuse ? bloc('visionneuse') : '')
    .replace('{{PIED}}', bloc('pied').replace('{{PLAN}}', menuDe(p)))
    .replace('{{SCRIPTS}}', p.scripts.map(function (s) {
      return '<script src="/' + FICHIERS[s] + '" defer></script>';
    }).join('\n'));

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
  PAGES.map(function (p) {
    return '  <url><loc>https://ordre-du-neant.fr' + p.url + '</loc>' +
           '<lastmod>' + jour + '</lastmod>' +
           '<priority>' + (p.url === '/' ? '1.0' : '0.8') + '</priority></url>';
  }).join('\n') + '\n</urlset>\n');

console.log(n + ' pages et le plan du site écrits dans public/');
