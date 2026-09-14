/* =========================================================
   L'ORDRE DU NÉANT — passerelle Discord
   ---------------------------------------------------------
   Fonction Cloudflare Pages servie sur /api/ordre.

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
async function lirePresence(guilde) {
  const r = await fetch(API + '/guilds/' + guilde + '/widget.json');
  if (!r.ok) {
    return { disponible: false, raison: r.status === 403 ? 'widget-desactive' : 'indisponible' };
  }
  const w = await r.json();

  const salons = (w.channels || []).map((c) => ({ id: c.id, nom: c.name, occupants: [] }));
  const parId = new Map(salons.map((s) => [s.id, s]));

  for (const m of w.members || []) {
    if (m.channel_id && parId.has(m.channel_id)) {
      parId.get(m.channel_id).occupants.push(m.username);
    }
  }

  return {
    disponible: true,
    enLigne: typeof w.presence_count === 'number' ? w.presence_count : (w.members || []).length,
    enVocal: (w.members || []).filter((m) => m.channel_id).length,
    salons: salons.filter((s) => s.occupants.length).slice(0, 6),
  };
}

/* --------------------------------------------------------
   Point d'entrée
   -------------------------------------------------------- */
export async function onRequestGet(context) {
  const env = context.env || {};
  const jeton = env.DISCORD_TOKEN;
  const guilde = env.GUILD_ID;
  const avecNoms = String(env.EFFECTIF_NOMS || 'oui').toLowerCase() !== 'non';

  if (!jeton || !guilde) {
    return reponse({
      erreur: 'configuration',
      message: "DISCORD_TOKEN ou GUILD_ID n'est pas déclaré dans Cloudflare Pages.",
    }, 500, 0);
  }

  /* Le cache de périphérie évite de solliciter Discord à chaque
     visite : une réponse est réutilisée pendant cinq minutes. */
  const cache = caches.default;
  const cle = new Request(new URL(context.request.url).origin + '/api/ordre', { method: 'GET' });
  const garde = await cache.match(cle);
  if (garde) return garde;

  const resultats = await Promise.allSettled([
    lireEffectif(jeton, guilde, avecNoms),
    lireOperations(jeton, guilde),
    lirePresence(guilde),
  ]);

  const [eff, ope, pre] = resultats;

  const corps = {
    maj: new Date().toISOString(),
    effectif: eff.status === 'fulfilled' ? eff.value : { erreur: String(eff.reason && eff.reason.message || eff.reason) },
    operations: ope.status === 'fulfilled' ? ope.value : { erreur: String(ope.reason && ope.reason.message || ope.reason) },
    presence: pre.status === 'fulfilled' ? pre.value : { disponible: false, raison: 'indisponible' },
  };

  const sortie = reponse(corps, 200, CACHE_SECONDES);
  context.waitUntil(cache.put(cle, sortie.clone()));
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
