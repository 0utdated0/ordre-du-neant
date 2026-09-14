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
        nom: m.nick || (m.user && m.user.global_name) || (m.user && m.user.username) || '—',
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

  return {
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
async function lireIdentiteBot(jeton, guilde) {
  /* Le widget ne distingue pas les bots des humains. La Vigie reste
     en permanence dans un salon vocal pour la radio : sans ce filtre,
     le site annoncerait éternellement « 1 en vocal » alors que
     personne n'est là. On relève donc les noms sous lesquels le bot
     peut apparaître, et on les écarte. */
  const noms = new Set();
  try {
    const moi = await discord('/users/@me', jeton);
    [moi.username, moi.global_name].forEach((n) => { if (n) noms.add(n); });
    try {
      const membre = await discord('/guilds/' + guilde + '/members/' + moi.id, jeton);
      if (membre.nick) noms.add(membre.nick);
    } catch (e) { /* le bot peut ne pas être listable, ce n'est pas bloquant */ }
  } catch (e) { /* sans identité, on n'exclut rien plutôt que d'échouer */ }
  return noms;
}

async function lirePresence(guilde, nomsBot, jeton, cache, origine) {
  const clePresence = new Request(origine + '/interne/derniere-presence', { method: 'GET' });

  let w = null;
  let echec = null;

  /* Deux tentatives, dans cet ordre.
     Authentifiée d'abord : Discord compte alors par jeton de bot.
     Sans jeton, il compte par adresse IP, et les Workers sortent par
     des IP partagées avec d'autres clients Cloudflare : on hérite de
     leur quota et on se fait refuser en 429 sans rien avoir demandé. */
  for (const authentifie of [true, false]) {
    try {
      const entetes = {
        Accept: 'application/json',
        'User-Agent': 'OrdreDuNeant (https://ordre-du-neant.fr, 1.0)',
      };
      if (authentifie) entetes.Authorization = 'Bot ' + jeton;

      const r = await fetch(API + '/guilds/' + guilde + '/widget.json', {
        headers: entetes,
        cf: { cacheTtl: 30, cacheEverything: false },
      });

      if (r.status === 403) {
        return { disponible: false, raison: 'widget-desactive' };
      }
      if (!r.ok) {
        echec = { raison: 'refus', statut: r.status };
        continue;
      }
      w = await r.json();
      break;
    } catch (e) {
      echec = { raison: 'reseau', detail: String((e && e.message) || e) };
    }
  }

  /* Rien obtenu : plutôt qu'un bloc vide, on ressert le dernier relevé
     connu en le signalant comme tel. Une présence d'il y a dix minutes
     vaut mieux qu'un écran muet. */
  if (!w) {
    const vieux = await cache.match(clePresence);
    if (vieux) {
      const p = await vieux.json();
      p.perime = true;
      return p;
    }
    return Object.assign({ disponible: false }, echec || { raison: 'indisponible' });
  }

  const salons = (w.channels || []).map((c) => ({ id: c.id, nom: c.name, occupants: [] }));
  const parId = new Map(salons.map((s) => [s.id, s]));

  /* Les salons vocaux de l'Ordre sont réservés aux Adeptes : le widget
     ne les nomme donc pas, il signale seulement qu'un membre s'y trouve.
     On regroupe ces occupants sous une entrée sans nom plutôt que de
     les perdre, et sans révéler l'intitulé d'un salon fermé. */
  const reserve = { id: null, nom: 'Salon réservé', occupants: [] };

  const tous = w.members || [];
  const humains = tous.filter((m) => !nomsBot.has(m.username));
  const nbBots = tous.length - humains.length;

  for (const m of humains) {
    if (!m.channel_id) continue;
    if (parId.has(m.channel_id)) {
      parId.get(m.channel_id).occupants.push(m.username);
    } else {
      reserve.occupants.push(m.username);
    }
  }

  const occupes = salons.filter((s) => s.occupants.length);
  if (reserve.occupants.length) occupes.push(reserve);

  /* presence_count compte les bots : on retire ceux qu'on a écartés. */
  const enLigne = typeof w.presence_count === 'number'
    ? Math.max(0, w.presence_count - nbBots)
    : humains.length;

  const presence = {
    disponible: true,
    releve: new Date().toISOString(),
    enLigne: enLigne,
    enVocal: humains.filter((m) => m.channel_id).length,
    salons: occupes.slice(0, 6),
  };

  /* Gardé une demi-heure, uniquement comme filet en cas de refus. */
  await cache.put(clePresence, new Response(JSON.stringify(presence), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  }));

  return presence;
}

/* --------------------------------------------------------
   Point d'entrée
   -------------------------------------------------------- */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/ordre') {
      return servirOrdre(request, env, ctx);
    }

    /* Les fichiers de public/ sont normalement servis avant même
       d'atteindre le Worker. Ce renvoi couvre le reste, et produit
       le 404 des assets pour une adresse inconnue. */
    return env.ASSETS.fetch(request);
  },
};

async function servirOrdre(request, env, ctx) {
  const jeton = env.DISCORD_TOKEN;
  const guilde = env.GUILD_ID;
  const avecNoms = String(env.EFFECTIF_NOMS || 'oui').toLowerCase() !== 'non';

  if (!jeton || !guilde) {
    /* Nommer la variable absente plutôt que de dire « l'une des deux » :
       sans ça, diagnostiquer demande d'ouvrir le tableau de bord. */
    const manquantes = [];
    if (!jeton) manquantes.push('DISCORD_TOKEN');
    if (!guilde) manquantes.push('GUILD_ID');
    return reponse({
      erreur: 'configuration',
      manquantes: manquantes,
      message: 'Absent des réglages du Worker, section Runtime variables and secrets : ' +
        manquantes.join(' et ') + '.',
    }, 500, 0);
  }

  /* Le cache de périphérie évite de solliciter Discord à chaque
     visite : une réponse est réutilisée pendant cinq minutes. */
  const cache = caches.default;
  const cle = new Request(new URL(request.url).origin + '/api/ordre', { method: 'GET' });
  const garde = await cache.match(cle);
  if (garde) return garde;

  const nomsBot = await lireIdentiteBot(jeton, guilde);

  const resultats = await Promise.allSettled([
    lireEffectif(jeton, guilde, avecNoms),
    lireOperations(jeton, guilde),
    lirePresence(guilde, nomsBot, jeton, cache, new URL(request.url).origin),
  ]);

  const [eff, ope, pre] = resultats;

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
