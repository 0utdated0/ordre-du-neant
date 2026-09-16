/* =========================================================
   L'ORDRE DU NÉANT — Worker Cloudflare
   ---------------------------------------------------------
   Sert /api/ordre, la passerelle Discord. Tout le reste part
   vers les fichiers du dossier public/.

   Le jeton du bot ne quitte jamais le serveur : le navigateur
   n'appelle que cette adresse, qui renvoie des données déjà
   filtrées. Aucun identifiant Discord, aucune adresse, aucun
   avatar privé ne sort d'ici.

   Variables à déclarer dans Cloudflare Pages :
     DISCORD_TOKEN   jeton du bot, en variable chiffrée
     GUILD_ID        identifiant du serveur

   Réglages facultatifs :
     EFFECTIF_NOMS   "non" pour ne publier que les compteurs,
                     sans la liste nominative
   ========================================================= */

const API = 'https://discord.com/api/v10';
const CACHE_SECONDES = 300;

/* Échelons, du plus haut au plus bas. L'ordre fait foi pour
   l'affichage et pour ne retenir qu'un échelon par membre. */
const ECHELONS = [
  { nom: 'Séraphin',   rang: 5, voie: 'conféré'  },
  { nom: 'Archange',   rang: 4, voie: 'conféré'  },
  { nom: 'Ange',       rang: 3, voie: 'présence' },
  { nom: 'Sentinelle', rang: 2, voie: 'présence' },
  { nom: 'Paladin',    rang: 1, voie: 'présence' },
  { nom: 'Adepte',     rang: 0, voie: 'présence' },
];

const FONCTIONS = ['Ancien', 'Gardien', 'Missionnaire', 'Évangile'];

const DIVISIONS = [
  'Div. Logistique', 'Div. Extraction', 'Div. Combat', 'Div. Sécurité',
  'Div. Exploration', 'Div. Médicale', 'Div. Ingénierie', 'Div. Industrie',
];

/* Rôles de passage : comptés à part, hors de l'échelle. */
const PASSAGES = ['Initié', 'Postulant', 'Allié'];

/* L'Ordre Noir est une branche secrète : il ne sort jamais d'ici. */
const JAMAIS_PUBLIER = ['Ordre Noir', 'Système'];

async function discord(chemin, jeton) {
  const r = await fetch(API + chemin, {
    headers: {
      Authorization: 'Bot ' + jeton,
      'User-Agent': 'OrdreDuNeant (https://ordre-du-neant.fr, 1.0)',
    },
  });
  if (!r.ok) {
    throw new Error('Discord ' + r.status + ' sur ' + chemin);
  }
  return r.json();
}

/* --------------------------------------------------------
   Effectif : membres et rôles
   -------------------------------------------------------- */
async function lireEffectif(jeton, guilde, avecNoms) {
  const roles = await discord('/guilds/' + guilde + '/roles', jeton);
  const parId = new Map(roles.map((r) => [r.id, r.name]));

  /* La liste des membres se pagine par 1000. Un serveur d'org
     dépasse rarement quelques centaines, on plafonne à 5000
     pour ne jamais boucler indéfiniment. */
  const membres = [];
  let apres = '0';
  for (let page = 0; page < 5; page++) {
    const lot = await discord(
      '/guilds/' + guilde + '/members?limit=1000&after=' + apres, jeton);
    if (!lot.length) break;
    membres.push(...lot);
    apres = lot[lot.length - 1].user.id;
    if (lot.length < 1000) break;
  }

  const parEchelon = {};
  const parDivision = {};
  const parPassage = {};
  ECHELONS.forEach((e) => { parEchelon[e.nom] = 0; });
  DIVISIONS.forEach((d) => { parDivision[d] = 0; });
  PASSAGES.forEach((p) => { parPassage[p] = 0; });

  const liste = [];
  let recus = 0;
  /* Bienfaiteurs : membres qui boostent le serveur (premium_since). */
  let bienfaiteurs = 0;

  for (const m of membres) {
    if (m.user && m.user.bot) continue;
    if (m.premium_since) bienfaiteurs++;

    const noms = (m.roles || []).map((id) => parId.get(id)).filter(Boolean);
    if (noms.some((n) => JAMAIS_PUBLIER.indexOf(n) !== -1)) {
      /* Le membre reste compté, mais son appartenance clandestine
         n'apparaît pas : on retire simplement ces rôles. */
    }
    const visibles = noms.filter((n) => JAMAIS_PUBLIER.indexOf(n) === -1);

    const echelon = ECHELONS.find((e) => visibles.indexOf(e.nom) !== -1) || null;
    const fonctions = FONCTIONS.filter((f) => visibles.indexOf(f) !== -1);
    const divisions = DIVISIONS.filter((d) => visibles.indexOf(d) !== -1);
    const passage = PASSAGES.find((p) => visibles.indexOf(p) !== -1) || null;

    if (echelon) {
      recus++;
      parEchelon[echelon.nom]++;
      divisions.forEach((d) => { parDivision[d]++; });
    } else if (passage) {
      parPassage[passage]++;
    }

    if (avecNoms && echelon) {
      liste.push({
        nom: m.nick || (m.user && m.user.global_name) || (m.user && m.user.username) || '?',
        echelon: echelon.nom,
        rang: echelon.rang,
        voie: echelon.voie,
        fonctions: fonctions,
        divisions: divisions.map((d) => d.replace('Div. ', '')),
        depuis: m.joined_at || null,
        bienfaiteur: !!m.premium_since,
      });
    }
  }

  /* Tri : fonctions d'abord, puis échelon, puis ancienneté. */
  liste.sort((a, b) => {
    const fa = a.fonctions.length ? 1 : 0;
    const fb = b.fonctions.length ? 1 : 0;
    if (fa !== fb) return fb - fa;
    if (a.rang !== b.rang) return b.rang - a.rang;
    return String(a.depuis).localeCompare(String(b.depuis));
  });

  /* Identifiants gardés pour la présence, retirés avant publication
     (voir servirOrdre) : ils ne sortent jamais du Worker. */
  const interne = {
    humains: membres.filter((m) => m.user && !m.user.bot).map((m) => m.user.id),
    bots: membres.filter((m) => m.user && m.user.bot).map((m) => m.user.id),
    /* Le widget ne donne ni identifiant ni drapeau « bot », seulement
       un nom affiché : on garde tous les noms possibles des bots pour
       les reconnaître dans ses salons vocaux. */
    nomsBots: [].concat(...membres.filter((m) => m.user && m.user.bot).map((m) =>
      [m.nick, m.user.global_name, m.user.username].filter(Boolean))),
  };

  return {
    interne: interne,
    total: membres.filter((m) => !(m.user && m.user.bot)).length,
    recus: recus,
    bienfaiteurs: bienfaiteurs,
    parEchelon: parEchelon,
    parDivision: parDivision,
    parPassage: parPassage,
    membres: liste,
  };
}

/* --------------------------------------------------------
   Opérations : événements planifiés du serveur
   -------------------------------------------------------- */
async function lireOperations(jeton, guilde) {
  const bruts = await discord(
    '/guilds/' + guilde + '/scheduled-events?with_user_count=true', jeton);

  const TYPES = { 1: 'Vocal', 2: 'Scène', 3: 'Extérieur' };

  return bruts
    .filter((e) => e.status === 1 || e.status === 2)
    .sort((a, b) => String(a.scheduled_start_time).localeCompare(String(b.scheduled_start_time)))
    .slice(0, 8)
    .map((e) => ({
      nom: e.name,
      resume: (e.description || '').slice(0, 220),
      debut: e.scheduled_start_time,
      fin: e.scheduled_end_time || null,
      lieu: (e.entity_metadata && e.entity_metadata.location) || TYPES[e.entity_type] || null,
      inscrits: typeof e.user_count === 'number' ? e.user_count : null,
      encours: e.status === 2,
    }));
}

/* --------------------------------------------------------
   Opérations passées : relevées dans #calendrier-opérations
   --------------------------------------------------------
   Discord oublie un événement dès qu'il est terminé. Le bot, lui,
   poste chaque opération dans le salon du calendrier : ce salon
   sert d'archive. On y relit ses fiches « OPÉRATION : » et
   « ÉVÉNEMENT : » dont l'heure de fin est passée.
   -------------------------------------------------------- */
const ARCHIVES_MAX = 12;

function sansAccents(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

/* Les fiches plus anciennes ont un titre tout en capitales. */
function casse(t) {
  if (/[a-zà-ÿ]/.test(t)) return t;
  const bas = t.toLowerCase();
  return bas.charAt(0).toUpperCase() + bas.slice(1);
}

function lireFiche(m, maintenant) {
  if (!m.author || !m.author.bot || !m.embeds || !m.embeds.length) return null;
  const e = m.embeds[0];
  const t = String(e.title || '').match(/^(OP[ÉE]RATION|[ÉE]V[ÉE]NEMENT)\s*:\s*(.+)$/i);
  if (!t) return null;
  const champ = (nom) => (e.fields || []).find((f) => sansAccents(f.name) === sansAccents(nom));
  const quand = champ('Quand');
  const unix = quand && String(quand.value).match(/<t:(\d+)/);
  if (!unix) return null;
  const debut = Number(unix[1]) * 1000;
  const d = champ('Durée');
  const heures = d ? parseFloat(String(d.value).replace(',', '.')) : 2;
  const fin = debut + (isFinite(heures) ? heures : 2) * 3600e3;
  if (fin > maintenant) return null;
  const lien = String(e.url || '').match(/\/events\/\d+\/(\d+)/);
  const div = champ('Divisions') || champ('Pôle');
  const lieu = champ('Lieu');
  return {
    id: lien ? lien[1] : m.id,
    nom: casse(t[2].trim()).slice(0, 120),
    resume: String(e.description || '').slice(0, 220),
    debut: new Date(debut).toISOString(),
    fin: new Date(fin).toISOString(),
    lieu: lieu ? String(lieu.value).slice(0, 80) : null,
    divisions: div ? (String(div.value).split(',').length >= 8 ? 'Toutes les divisions' : String(div.value).slice(0, 120)) : null,
  };
}

async function lireArchives(jeton, guilde) {
  const salons = await discord('/guilds/' + guilde + '/channels', jeton);
  const salon = salons.find((c) => c.type === 0 && sansAccents(c.name) === 'calendrier operations');
  if (!salon) return [];
  const messages = await discord('/channels/' + salon.id + '/messages?limit=100', jeton);
  const maintenant = Date.now();
  const vus = new Set();
  return messages
    .map((m) => lireFiche(m, maintenant))
    .filter((f) => f && !vus.has(f.id) && vus.add(f.id))
    .sort((a, b) => b.debut.localeCompare(a.debut))
    .slice(0, ARCHIVES_MAX);
}

/* --------------------------------------------------------
   Présence : widget public du serveur
   Le widget doit être activé dans les paramètres du serveur.
   S'il ne l'est pas, on le dit au lieu d'échouer.
   -------------------------------------------------------- */
async function lirePresence(guilde, jeton, interne) {
  /* Mesuré en ligne : « 7 en ligne » pour 6 membres réellement
     connectés, et « en vocal » vide. Deux causes.

     1. approximate_presence_count compte tous les comptes en ligne,
        bots compris. Notre propre bot ne se connecte jamais (le Worker
        ne parle à Discord qu'en HTTP), mais les autres bots du serveur
        restent connectés en permanence. On les retire du compte.
     2. Le widget public, seule source du vocal, est refusé depuis
        Cloudflare. Le vocal se relève maintenant avec le jeton du bot,
        membre par membre (GET /guilds/:id/voice-states/:membre : 404
        quand il n'est pas en vocal). Ni noms ni salons : seulement le
        nombre, qui ne révèle rien d'un salon fermé. */
  const [rw, rc, rmoi] = await Promise.allSettled([
    fetch(API + '/guilds/' + guilde + '/widget.json', {
      headers: { 'User-Agent': 'OrdreDuNeant (https://ordre-du-neant.fr, 1.0)' },
    }),
    discord('/guilds/' + guilde + '?with_counts=true', jeton),
    discord('/users/@me', jeton),
  ]);

  const humains = (interne && interne.humains) || [];
  const bots = (interne && interne.bots) || [];
  const moi = rmoi.status === 'fulfilled' ? rmoi.value.id : null;
  /* Tous les bots sont retirés, le nôtre compris : GrilareX le voit
     connecté sur le serveur, il est donc compté par Discord comme
     n'importe quel autre compte en ligne. « En ligne » désigne les
     joueurs. */
  const autresBots = bots.length;
  void moi;

  let enLigne = null;
  if (rc.status === 'fulfilled' && typeof rc.value.approximate_presence_count === 'number') {
    enLigne = Math.max(0, rc.value.approximate_presence_count - autresBots);
  }

  /* Le vocal, relevé par le bot. Plafonné pour rester sous la limite
     de sous-requêtes d'un Worker ; au-delà, on s'en remet au widget. */
  let enVocal = null;
  if (humains.length && humains.length <= 40) {
    const etats = await Promise.all(humains.map((id) =>
      fetch(API + '/guilds/' + guilde + '/voice-states/' + id, {
        headers: {
          Authorization: 'Bot ' + jeton,
          'User-Agent': 'OrdreDuNeant (https://ordre-du-neant.fr, 1.0)',
        },
      }).then((r) => r.status === 200 ? r.json().then((v) => (v && v.channel_id ? 1 : 0))
        : (r.status === 404 ? 0 : null))
        .catch(() => null)));
    /* Un seul relevé en échec (limite de débit) et le chiffre serait
       faux : on préfère alors ne rien afficher. */
    if (etats.every((e) => e !== null)) {
      enVocal = etats.reduce((x, y) => x + y, 0);
    }
  }

  const widget = rw.status === 'fulfilled' ? rw.value : null;
  let salons = [];
  let statuts = null;
  let statutWidget = widget ? widget.status : 0;
  if (widget && widget.ok) {
    const w = await widget.json();
    const liste = (w.channels || []).map((c) => ({ id: c.id, nom: c.name, occupants: [] }));
    const parId = new Map(liste.map((x) => [x.id, x]));
    const reserve = { id: null, nom: 'Salon réservé', occupants: [] };
    /* Relevé en ligne : le seul occupant vocal affiché était « Vigie
       ODN », le bot lui-même, sous « Salon réservé ». Les bots sortent
       du détail des salons comme ils sortent des compteurs. */
    const nomsBots = new Set(((interne && interne.nomsBots) || []).map((x) => x.toLowerCase()));
    for (const m of w.members || []) {
      if (!m.channel_id) continue;
      if (nomsBots.has(String(m.username || '').toLowerCase())) continue;
      if (parId.has(m.channel_id)) parId.get(m.channel_id).occupants.push(m.username);
      else reserve.occupants.push(m.username);
    }
    /* En ligne, recompté sur la liste du widget. Relevé du 16 : Discord
       annonçait 5 connectés (approximate_presence_count), bot compris,
       pour 3 joueurs et le bot réellement en ligne. Ce compte est
       « approximatif » par définition et mis en cache chez Discord. La
       liste du widget donne chaque membre connecté avec son statut :
       on la compte, bots exclus, et on publie la répartition par statut
       pour pouvoir vérifier au lieu de supposer. */
    const presents = (w.members || []).filter((m) =>
      !nomsBots.has(String(m.username || '').toLowerCase()));
    if (presents.length < 99) {
      enLigne = presents.length;
      statuts = presents.reduce((acc, m) => {
        acc[m.status] = (acc[m.status] || 0) + 1; return acc;
      }, {});
    }
    salons = liste.filter((x) => x.occupants.length);
    if (reserve.occupants.length) salons.push(reserve);
    salons = salons.slice(0, 6);
    if (enVocal === null) {
      enVocal = (w.members || []).filter((m) => m.channel_id &&
        !nomsBots.has(String(m.username || '').toLowerCase())).length;
    }
    if (enLigne === null && typeof w.presence_count === 'number') {
      enLigne = Math.max(0, w.presence_count - autresBots);
    }
  }

  if (enLigne === null && enVocal === null) {
    return {
      disponible: false,
      raison: statutWidget === 403 ? 'widget-desactive' : 'indisponible',
      statutWidget: statutWidget,
    };
  }
  return {
    disponible: true,
    partiel: enVocal === null,
    raison: statutWidget === 403 ? 'widget-desactive' : (widget && widget.ok ? null : 'widget-indisponible'),
    statutWidget: statutWidget,
    enLigne: enLigne,
    enVocal: enVocal,
    salons: salons,
    statuts: statuts,
    source: statuts ? 'widget' : 'compte-approximatif',
    botsRetires: autresBots,
  };
}

/* --------------------------------------------------------
   Point d'entrée
   -------------------------------------------------------- */
/* Ressources dont la page de chantier a besoin pour s'afficher.
   Tout le reste est masqué tant que le chantier est levé. */
const LAISSEZ_PASSER = [
  '/assets/embleme.webp',
  '/assets/embleme-512.png',
  '/assets/banniere-monde.webp',
];

function instantOuverture(env) {
  const t = Date.parse(String(env.OUVERTURE || ''));
  return Number.isFinite(t) ? t : null;
}

function enChantier(env) {
  if (String(env.CHANTIER || 'non').toLowerCase() !== 'oui') return false;
  const ouverture = instantOuverture(env);
  return ouverture === null || Date.now() < ouverture;
}

function passeChantier(request, env) {
  const cle = env.CLE_CHANTIER;
  if (!cle) return false;
  const url = new URL(request.url);
  if (url.searchParams.get('passe') === cle) return 'a-poser';
  const biscuits = request.headers.get('Cookie') || '';
  return biscuits.split(';').some((c) => c.trim() === 'passage=' + cle);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (enChantier(env)) {
      const laisser = passeChantier(request, env);

      if (laisser === 'a-poser') {
        /* Le sésame arrive par l'adresse : on le dépose en cookie et on
           renvoie sur la page nue, pour qu'il ne traîne pas dans la barre
           d'adresse ni dans l'historique partagé. */
        return new Response(null, {
          status: 302,
          headers: {
            Location: url.pathname,
            'Set-Cookie': 'passage=' + env.CLE_CHANTIER +
              '; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax',
          },
        });
      }

      if (!laisser) {
        const chemin = url.pathname;
        const autorise = LAISSEZ_PASSER.indexOf(chemin) !== -1 ||
          chemin.startsWith('/polices/');

        /* Un robot qui demande robots.txt doit lire un refus, pas la
           page de chantier servie en HTML. */
        if (chemin === '/robots.txt') {
          return new Response('User-agent: *\nDisallow: /\n', {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-store',
            },
          });
        }

        if (!autorise) {
          const page = await env.ASSETS.fetch(new URL('/chantier.html', url.origin));
          /* L'heure d'ouverture et l'heure du serveur sont glissées dans
             la page : le compte à rebours ne dépend pas de l'horloge,
             parfois fausse, de l'appareil du visiteur. */
          const texte = (await page.text())
            .replace('{{OUVERTURE}}', String(instantOuverture(env) || ''))
            .replace('{{MAINTENANT}}', String(Date.now()));
          return new Response(texte, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store',
              'X-Robots-Tag': 'noindex, nofollow',
            },
          });
        }
      }
    }

    if (url.pathname === '/api/ordre') {
      return servirOrdre(request, env, ctx);
    }
    if (url.pathname === '/api/radio') {
      return servirRadio(request, env, ctx);
    }
    if (url.pathname === '/api/radio/flux') {
      return relayerFlux(request, env, ctx);
    }

    /* Les fichiers de public/ sont normalement servis avant même
       d'atteindre le Worker. Ce renvoi couvre le reste, et produit
       le 404 des assets pour une adresse inconnue. */
    let reponse = await env.ASSETS.fetch(request);

    /* Adresse inconnue : la page 404 de l'Ordre, avec son vrai statut,
       plutôt que la réponse vide de Cloudflare. Seulement pour une
       page demandée par un navigateur ; un fichier manquant (image,
       script) garde un 404 nu. */
    if (reponse.status === 404 && request.method === 'GET' &&
        (request.headers.get('Accept') || '').includes('text/html')) {
      const page = await env.ASSETS.fetch(new URL('/404.html', url.origin));
      if (page.ok) {
        return new Response(page.body, {
          status: 404,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
            'X-Robots-Tag': 'noindex',
          },
        });
      }
    }

    /* Pages, scripts et feuille de style : toujours revalidés. Sans
       consigne explicite, un navigateur ou une règle de cache de la
       zone pouvait resservir l'ancien code après un déploiement, et
       rien ne changeait à l'écran. La revalidation coûte un 304 quand
       rien n'a bougé. Les coques, polices, images et bibliothèques
       gardent leur cache long (voir _headers). */
    if (aRevalider(url.pathname)) {
      const entetes = new Headers(reponse.headers);
      entetes.set('Cache-Control', 'no-cache');
      return new Response(reponse.body, {
        status: reponse.status, statusText: reponse.statusText, headers: entetes,
      });
    }
    return reponse;
  },
};

function aRevalider(chemin) {
  if (/^\/(coques|polices|assets|vendor|galerie)\//.test(chemin)) return false;
  return !/\.[a-z0-9]+$/i.test(chemin) || /\.(html|js|css|json|xml)$/i.test(chemin);
}

async function servirOrdre(request, env, ctx) {
  const jeton = env.DISCORD_TOKEN;
  const guilde = env.GUILD_ID;
  const avecNoms = String(env.EFFECTIF_NOMS || 'oui').toLowerCase() !== 'non';

  if (!jeton || !guilde) {
    return reponse({
      erreur: 'configuration',
      message: "DISCORD_TOKEN ou GUILD_ID n'est pas déclaré dans les réglages du Worker.",
    }, 500, 0);
  }

  /* Le cache de périphérie évite de solliciter Discord à chaque
     visite : une réponse est réutilisée pendant cinq minutes. */
  const cache = caches.default;
  const cle = new Request(new URL(request.url).origin + '/api/ordre', { method: 'GET' });
  const garde = await cache.match(cle);
  if (garde) return garde;

  /* L'effectif d'abord : la présence a besoin de la liste des
     membres pour relever le vocal et retirer les bots. */
  const [eff, ope, arc] = await Promise.allSettled([
    lireEffectif(jeton, guilde, avecNoms),
    lireOperations(jeton, guilde),
    lireArchives(jeton, guilde),
  ]);
  const interne = eff.status === 'fulfilled' ? eff.value.interne : null;
  if (eff.status === 'fulfilled') delete eff.value.interne;
  const [pre] = await Promise.allSettled([lirePresence(guilde, jeton, interne)]);

  const corps = {
    maj: new Date().toISOString(),
    effectif: eff.status === 'fulfilled' ? eff.value : { erreur: String((eff.reason && eff.reason.message) || eff.reason) },
    operations: ope.status === 'fulfilled' ? ope.value : { erreur: String((ope.reason && ope.reason.message) || ope.reason) },
    archives: arc.status === 'fulfilled' ? arc.value : { erreur: String((arc.reason && arc.reason.message) || arc.reason) },
    presence: pre.status === 'fulfilled' ? pre.value : { disponible: false, raison: 'indisponible' },
  };

  const sortie = reponse(corps, 200, CACHE_SECONDES);
  ctx.waitUntil(cache.put(cle, sortie.clone()));
  return sortie;
}

function reponse(corps, statut, secondes) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=' + secondes + ', s-maxage=' + secondes,
      'Access-Control-Allow-Origin': 'https://ordre-du-neant.fr',
    },
  });
}


/* --------------------------------------------------------
   Radio de l'Ordre
   --------------------------------------------------------
   Vigie ODN joue une webradio dans le salon « Radio de l'Ordre » et
   tient à jour, dans la discussion de ce salon, une fiche titrée
   RADIO DE L'ORDRE dont le lien est l'adresse du flux (voir
   publierStation dans le code du bot). On relit cette fiche pour
   savoir quelle station tourne, puis on lit le titre en cours dans
   les métadonnées ICY du flux lui-même.

   Seize stations ne diffusent qu'en http : un navigateur refuse de
   les jouer depuis une page https. Pour celles-là, le son passe par
   /api/radio/flux, qui ne relaie QUE la station en cours : ce n'est
   pas un proxy ouvert.
   -------------------------------------------------------- */
const TITRE_FICHE_RADIO = "RADIO DE L'ORDRE";
const RADIO_CACHE_SECONDES = 20;

function normaliserNom(n) {
  return String(n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();
}

async function lireStation(env) {
  const jeton = env.DISCORD_TOKEN, guilde = env.GUILD_ID;
  if (!jeton || !guilde) throw new Error('configuration');
  const [salons, moi] = await Promise.all([
    discord('/guilds/' + guilde + '/channels', jeton),
    discord('/users/@me', jeton),
  ]);
  const salon = salons.find((c) => c.type === 2 && normaliserNom(c.name) === normaliserNom("Radio de l'Ordre"));
  if (!salon) return null;
  const messages = await discord('/channels/' + salon.id + '/messages?limit=30', jeton);
  const fiche = messages.find((m) => m.author && m.author.id === moi.id &&
    m.embeds && m.embeds[0] && m.embeds[0].title === TITRE_FICHE_RADIO && m.embeds[0].url);
  if (!fiche) return null;
  const e = fiche.embeds[0];
  const champ = (nom) => ((e.fields || []).find((f) => f.name === nom) || {}).value || null;
  const desc = String(e.description || '').split('\n')[1] || '';
  return {
    nom: champ('Station'),
    genre: champ('Genre'),
    description: desc.replace(/^\*|\*$/g, ''),
    flux: e.url,
    depuis: fiche.edited_timestamp || fiche.timestamp,
  };
}

/* Lit le titre en cours dans le flux : on demande les métadonnées ICY,
   on lit jusqu'au premier bloc (icy-metaint octets de son, un octet de
   longueur, puis le texte), et on coupe. Quelques dizaines de Ko. */
async function lireTitre(flux) {
  const ctrl = new AbortController();
  const minuterie = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(flux, {
      headers: { 'Icy-MetaData': '1', 'User-Agent': 'OrdreDuNeant (https://ordre-du-neant.fr, 1.0)' },
      signal: ctrl.signal,
    });
    const intervalle = parseInt(r.headers.get('icy-metaint') || '', 10);
    const nomFlux = r.headers.get('icy-name');
    if (!r.ok || !r.body || !intervalle || intervalle > 200000) {
      ctrl.abort();
      return { titre: null, nomFlux: nomFlux };
    }
    const lecteur = r.body.getReader();
    const morceaux = [];
    let recu = 0, attendu = intervalle + 1, texte = null;
    while (true) {
      const { value, done } = await lecteur.read();
      if (done) break;
      morceaux.push(value); recu += value.length;
      if (recu >= attendu) {
        const tout = new Uint8Array(recu);
        let o = 0; for (const m of morceaux) { tout.set(m, o); o += m.length; }
        const longueur = tout[intervalle] * 16;
        if (longueur === 0) { texte = ''; break; }
        attendu = intervalle + 1 + longueur;
        if (recu >= attendu) {
          texte = new TextDecoder('utf-8').decode(tout.slice(intervalle + 1, attendu));
          break;
        }
      }
    }
    lecteur.cancel().catch(() => {});
    ctrl.abort();
    const m = /StreamTitle='(.*?)';/.exec(texte || '');
    return { titre: m && m[1] ? m[1].trim() : null, nomFlux: nomFlux };
  } catch (e) {
    return { titre: null, nomFlux: null };
  } finally {
    clearTimeout(minuterie);
  }
}

async function servirRadio(request, env, ctx) {
  const cache = caches.default;
  const cle = new Request(new URL(request.url).origin + '/api/radio', { method: 'GET' });
  const garde = await cache.match(cle);
  if (garde) return garde;

  let corps;
  try {
    const station = await lireStation(env);
    if (!station) {
      corps = { disponible: false, raison: 'aucune-fiche' };
    } else {
      const lu = await lireTitre(station.flux);
      let artiste = null, titre = lu.titre;
      if (titre && titre.indexOf(' - ') > 0) {
        artiste = titre.slice(0, titre.indexOf(' - ')).trim();
        titre = titre.slice(titre.indexOf(' - ') + 3).trim();
      }
      corps = {
        disponible: true,
        maj: new Date().toISOString(),
        station: { nom: station.nom, genre: station.genre, description: station.description },
        artiste: artiste,
        titre: titre,
        /* https : lu directement par le navigateur ; http : relayé. */
        ecoute: /^https:/i.test(station.flux) ? station.flux : '/api/radio/flux',
        cle: station.flux,
      };
    }
  } catch (e) {
    corps = { disponible: false, raison: 'indisponible' };
  }
  const sortie = new Response(JSON.stringify(corps), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=' + RADIO_CACHE_SECONDES + ', s-maxage=' + RADIO_CACHE_SECONDES,
    },
  });
  ctx.waitUntil(cache.put(cle, sortie.clone()));
  return sortie;
}

async function relayerFlux(request, env, ctx) {
  /* La station vient d'abord du relevé en cache de /api/radio, pour ne
     pas interroger Discord à chaque auditeur qui appuie sur lecture. */
  let station = null;
  const garde = await caches.default.match(new Request(new URL(request.url).origin + '/api/radio'));
  if (garde) {
    const d = await garde.json().catch(() => null);
    if (d && d.cle) station = { flux: d.cle };
  }
  if (!station) {
    try { station = await lireStation(env); } catch (e) { station = null; }
  }
  if (!station || !/^http:/i.test(station.flux)) {
    return new Response('Aucun flux à relayer.', { status: 404 });
  }
  const amont = await fetch(station.flux, {
    headers: { 'User-Agent': 'OrdreDuNeant (https://ordre-du-neant.fr, 1.0)' },
  });
  if (!amont.ok || !amont.body) {
    return new Response('Flux indisponible.', { status: 502 });
  }
  return new Response(amont.body, {
    headers: {
      'Content-Type': amont.headers.get('Content-Type') || 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  });
}
