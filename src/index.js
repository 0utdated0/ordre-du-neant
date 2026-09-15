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

  for (const m of membres) {
    if (m.user && m.user.bot) continue;

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
  };

  return {
    interne: interne,
    total: membres.filter((m) => !(m.user && m.user.bot)).length,
    recus: recus,
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
  const autresBots = bots.filter((id) => id !== moi).length;

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
  let statutWidget = widget ? widget.status : 0;
  if (widget && widget.ok) {
    const w = await widget.json();
    const liste = (w.channels || []).map((c) => ({ id: c.id, nom: c.name, occupants: [] }));
    const parId = new Map(liste.map((x) => [x.id, x]));
    const reserve = { id: null, nom: 'Salon réservé', occupants: [] };
    for (const m of w.members || []) {
      if (!m.channel_id) continue;
      if (parId.has(m.channel_id)) parId.get(m.channel_id).occupants.push(m.username);
      else reserve.occupants.push(m.username);
    }
    salons = liste.filter((x) => x.occupants.length);
    if (reserve.occupants.length) salons.push(reserve);
    salons = salons.slice(0, 6);
    if (enVocal === null) enVocal = (w.members || []).filter((m) => m.channel_id).length;
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

function enChantier(env) {
  return String(env.CHANTIER || 'non').toLowerCase() === 'oui';
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
          return new Response(page.body, {
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

    /* Les fichiers de public/ sont normalement servis avant même
       d'atteindre le Worker. Ce renvoi couvre le reste, et produit
       le 404 des assets pour une adresse inconnue. */
    const reponse = await env.ASSETS.fetch(request);

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
  const [eff, ope] = await Promise.allSettled([
    lireEffectif(jeton, guilde, avecNoms),
    lireOperations(jeton, guilde),
  ]);
  const interne = eff.status === 'fulfilled' ? eff.value.interne : null;
  if (eff.status === 'fulfilled') delete eff.value.interne;
  const [pre] = await Promise.allSettled([lirePresence(guilde, jeton, interne)]);

  const corps = {
    maj: new Date().toISOString(),
    effectif: eff.status === 'fulfilled' ? eff.value : { erreur: String((eff.reason && eff.reason.message) || eff.reason) },
    operations: ope.status === 'fulfilled' ? ope.value : { erreur: String((ope.reason && ope.reason.message) || ope.reason) },
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
