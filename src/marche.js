/* =========================================================
   L'ORDRE DU NÉANT - le marché
   ---------------------------------------------------------
   Prix des minerais et des marchandises, relevés par les
   joueurs et publiés par UEX Corp (uexcorp.space). On ne
   recopie pas leur site : on lit leur API, on garde Stanton,
   Pyro et Nyx, on écarte les relevés douteux, et on en tire
   deux choses :

     - pour l'Extraction : où vendre chaque minerai, brut ou
       raffiné, et si le raffinage vaut la peine ;
     - pour la Logistique : les routes d'achat et revente qui
       rapportent, avec le stock disponible.

   Le bot lit la même adresse que le site : les prix affichés
   sur Discord et sur le site sont les mêmes, calculés une
   seule fois et gardés en cache de périphérie.

   Les relevés viennent de joueurs : un prix peut être faux ou
   vieux. D'où les garde-fous plus bas, et la date de relevé
   affichée partout.
   ========================================================= */

const UEX = 'https://api.uexcorp.space/2.0';

export const MARCHE_CACHE_SECONDES = 900;

/* Les trois systèmes ouverts au jeu. L'API en connaît quatre-vingt-seize,
   dont la plupart n'existent pas encore. */
const SYSTEMES = { 68: 'Stanton', 64: 'Pyro', 55: 'Nyx' };

const JOUR = 86400;
/* Un relevé plus vieux que ça ne dit plus rien d'utile : les prix
   bougent à chaque correctif du jeu. */
const AGE_MAX = 21 * JOUR;
/* Sans stock, une route ne vaut rien : on ne remplit pas une soute
   avec quatre SCU. */
const STOCK_MIN = 50;

async function uex(chemin) {
  const r = await fetch(UEX + chemin, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'OrdreDuNeant (https://ordre-du-neant.fr, 1.0)',
    },
  });
  if (!r.ok) throw new Error('UEX ' + r.status + ' sur ' + chemin);
  const j = await r.json();
  if (j.status !== 'ok' || !Array.isArray(j.data)) {
    throw new Error('UEX réponse inattendue sur ' + chemin);
  }
  return j.data;
}

/* Nom court et lisible d'un comptoir : « Area 18 · TDD » plutôt que
   « TDD - Trade and Development Division - Area 18 ». */
function lieuDe(t) {
  return t.city_name || t.outpost_name || t.space_station_name ||
         t.moon_name || t.planet_name || t.orbit_name || t.star_system_name || '';
}

function nomComptoir(t) {
  const brut = t.nickname || t.name || '';
  const lieu = lieuDe(t);
  /* Le nom répète souvent le lieu : on ne le dit pas deux fois. */
  const court = brut.replace(/\s*[-–]\s*/g, ' - ').replace(new RegExp('\\s*-?\\s*' + lieu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i'), '').trim();
  return court || brut;
}

function comptoirPublic(t) {
  return {
    nom: nomComptoir(t),
    lieu: lieuDe(t),
    systeme: SYSTEMES[t.id_star_system] || t.star_system_name || '',
    joueur: !!t.is_player_owned,
    raffinerie: !!t.is_refinery,
  };
}

/* Un relevé est retenu s'il est récent et si son prix ne sort pas
   d'un rêve : quatre fois la moyenne, c'est une faute de frappe,
   pas une occasion. */
function fraisEtCredible(p, sens, maintenant) {
  const date = p.date_modified || p.date_added || 0;
  if (!date || maintenant - date > AGE_MAX) return false;
  const prix = sens === 'achat' ? p.price_buy : p.price_sell;
  const moyenne = sens === 'achat' ? p.price_buy_avg : p.price_sell_avg;
  if (!(prix > 0)) return false;
  if (moyenne > 0) {
    if (prix > moyenne * 2.5) return false;
    if (sens === 'achat' && prix < moyenne * 0.35) return false;
  }
  return true;
}

function offre(p, t, sens) {
  return {
    /* Les deux identifiants servent à la fiche de la page : ce sont
       eux qui vont chercher l'historique du prix à ce comptoir. */
    idMarchandise: p.id_commodity,
    idComptoir: t.id,
    prix: sens === 'achat' ? p.price_buy : p.price_sell,
    moyenne: Math.round(sens === 'achat' ? p.price_buy_avg : p.price_sell_avg) || null,
    scu: sens === 'achat' ? (p.scu_buy || 0) : (p.scu_sell || p.scu_sell_stock || 0),
    maj: (p.date_modified || p.date_added || 0) * 1000,
    comptoir: comptoirPublic(t),
  };
}

const parPrix = (sens) => (a, b) => (sens === 'achat' ? a.prix - b.prix : b.prix - a.prix);

export function construireMarche(brut) {
  const { marchandises, comptoirs, comptoirsBruts, prix, prixBruts } = brut;
  const maintenant = Math.floor(Date.now() / 1000);

  const T = new Map();
  [...comptoirs, ...comptoirsBruts].forEach((t) => {
    if (SYSTEMES[t.id_star_system]) T.set(t.id, t);
  });

  const M = new Map();
  marchandises.forEach((m) => M.set(m.id, m));

  /* ---- 1. Les offres, marchandise par marchandise ---- */
  const achats = new Map();
  const ventes = new Map();
  const ventesBrutes = new Map();

  const ranger = (carte, id, o) => {
    if (!carte.has(id)) carte.set(id, []);
    carte.get(id).push(o);
  };

  prix.forEach((p) => {
    const t = T.get(p.id_terminal);
    if (!t) return;
    if (p.status_buy > 0 && fraisEtCredible(p, 'achat', maintenant)) ranger(achats, p.id_commodity, offre(p, t, 'achat'));
    if (p.status_sell > 0 && fraisEtCredible(p, 'vente', maintenant)) ranger(ventes, p.id_commodity, offre(p, t, 'vente'));
  });

  prixBruts.forEach((p) => {
    const t = T.get(p.id_terminal);
    if (!t) return;
    if (fraisEtCredible(p, 'vente', maintenant)) ranger(ventesBrutes, p.id_commodity, offre(p, t, 'vente'));
  });

  [achats, ventes, ventesBrutes].forEach((carte, i) => {
    carte.forEach((liste) => liste.sort(parPrix(i === 0 ? 'achat' : 'vente')));
  });

  /* ---- 2. Extraction : chaque minerai, brut et raffiné ---- */
  const parNom = new Map();
  marchandises.forEach((m) => parNom.set(m.name.toLowerCase(), m));

  /* Ce que l'API range en « brut » ne sort pas tout d'un gisement :
     la glace de carburant, les gravats de chantier et les déchets
     n'intéressent pas l'Extraction. */
  const HORS_MINAGE = ['Ammonia', 'Quantum Fuel', 'Inert Materials', 'Decari Pod', 'Wuotan Seed'];
  const minable = (m) => m.is_raw && m.is_available &&
    !HORS_MINAGE.includes(m.name) && !/^construction /i.test(m.name) &&
    !['Scrap', 'Waste', 'Fuel'].includes(m.kind);

  const minerais = marchandises
    .filter(minable)
    .map((m) => {
      /* Deux écritures pour la même chose : « Beryl (Raw) » et
         « Gold (Ore) ». Les gemmes, elles, n'ont pas de suffixe et
         se vendent telles quelles. */
      const socle = m.name.replace(/\s*\((raw|ore)\)\s*$/i, '').trim();
      const raffine = socle.toLowerCase() === m.name.toLowerCase() ? null : (parNom.get(socle.toLowerCase()) || null);
      /* Une pierre brute se vend à la raffinerie, une gemme au
         comptoir : on regarde les deux listes. */
      const brutes = [...(ventesBrutes.get(m.id) || []), ...(ventes.get(m.id) || [])]
        .sort(parPrix('vente'))
        .slice(0, 5);
      const nettes = raffine ? (ventes.get(raffine.id) || []).slice(0, 5) : [];
      const gemme = !raffine;
      const gain = brutes[0] && nettes[0]
        ? Math.round(((nettes[0].prix - brutes[0].prix) / brutes[0].prix) * 100)
        : null;
      return {
        nom: socle,
        code: m.code,
        nature: m.kind,
        gemme,
        brut: brutes,
        raffine: nettes,
        gainRaffinage: gain,
      };
    })
    .filter((x) => x.brut.length || x.raffine.length)
    .sort((a, b) => (b.raffine[0]?.prix || b.brut[0]?.prix || 0) - (a.raffine[0]?.prix || a.brut[0]?.prix || 0));

  /* ---- 3. Logistique : acheter ici, revendre là ---- */
  const routes = [];
  achats.forEach((listeA, id) => {
    const m = M.get(id);
    const listeV = ventes.get(id);
    if (!m || !listeV || !listeV.length) return;

    /* Sans stock à l'achat, la route n'existe que sur le papier :
       deux SCU d'une denrée rare donnaient les « meilleures » routes
       du classement, et personne ne pouvait les faire. Pareil à la
       revente : un comptoir qui ne demande rien n'achètera rien. */
    const achat = listeA.find((o) => o.scu >= STOCK_MIN);
    if (!achat) return;
    const vente = listeV.find((o) => o.comptoir.nom !== achat.comptoir.nom && o.scu > 0);
    if (!vente) return;
    const gain = vente.prix - achat.prix;
    if (gain <= 0) return;

    routes.push({
      marchandise: m.name,
      code: m.code,
      nature: m.kind,
      illegal: !!m.is_illegal,
      scuParUnite: m.weight_scu || 1,
      achat,
      vente,
      gain,
      marge: Math.round((gain / achat.prix) * 100),
      interSysteme: achat.comptoir.systeme !== vente.comptoir.systeme,
    });
  });
  /* Le contrebande se négocie mal en convoi : elle reste dans les
     données, marquée, mais ne tient pas le haut du classement. */
  routes.sort((a, b) => (a.illegal - b.illegal) || (b.gain - a.gain));

  /* ---- 4. Le tableau complet, pour la page du site ---- */
  const tableau = marchandises
    .filter((m) => m.is_available && (achats.has(m.id) || ventes.has(m.id) || ventesBrutes.has(m.id)))
    .map((m) => ({
      nom: m.name,
      code: m.code,
      nature: m.kind,
      illegal: !!m.is_illegal,
      minerai: !!m.is_mineral,
      brute: !!m.is_raw,
      scu: m.weight_scu || 1,
      wiki: m.wiki || null,
      achats: (achats.get(m.id) || []).slice(0, 4),
      ventes: ((m.is_raw ? ventesBrutes.get(m.id) : ventes.get(m.id)) || []).slice(0, 6),
      id: m.id,
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  return {
    maj: new Date().toISOString(),
    source: { nom: 'UEX Corp', url: 'https://uexcorp.space' },
    systemes: Object.values(SYSTEMES),
    reglages: { ageMaxJours: AGE_MAX / JOUR, stockMin: STOCK_MIN },
    minerais,
    routes: routes.slice(0, 40),
    tableau,
  };
}

export async function servirMarche(request, env, ctx, reponse) {
  const cache = caches.default;
  const cle = new Request(new URL(request.url).origin + '/api/marche', { method: 'GET' });
  const garde = await cache.match(cle);
  if (garde) return garde;

  let corps;
  try {
    const [marchandises, comptoirs, comptoirsBruts, prix, prixBruts] = await Promise.all([
      uex('/commodities'),
      uex('/terminals?type=commodity'),
      uex('/terminals?type=commodity_raw'),
      uex('/commodities_prices_all'),
      uex('/commodities_raw_prices_all'),
    ]);
    corps = construireMarche({ marchandises, comptoirs, comptoirsBruts, prix, prixBruts });
  } catch (e) {
    /* UEX en panne : on le dit, le bot garde alors son dernier
       message et le site affiche la raison. */
    return reponse({ erreur: 'marche', message: String(e && e.message || e) }, 502, 60);
  }

  const sortie = reponse(corps, 200, MARCHE_CACHE_SECONDES);
  ctx.waitUntil(cache.put(cle, sortie.clone()));
  return sortie;
}

/* L'historique d'un prix, comptoir par comptoir : c'est ce qui trace
   les courbes de la page. UEX exige les deux identifiants. */
export async function servirMarcheHistorique(request, env, ctx, reponse) {
  const url = new URL(request.url);
  const c = parseInt(url.searchParams.get('marchandise'), 10);
  const t = parseInt(url.searchParams.get('comptoir'), 10);
  if (!c || !t) return reponse({ erreur: 'parametres', message: 'marchandise et comptoir sont requis' }, 400, 0);

  const cache = caches.default;
  const cle = new Request(url.origin + '/api/marche/historique?marchandise=' + c + '&comptoir=' + t, { method: 'GET' });
  const garde = await cache.match(cle);
  if (garde) return garde;

  let releves;
  try {
    releves = await uex('/commodities_prices_history?id_commodity=' + c + '&id_terminal=' + t);
  } catch (e) {
    return reponse({ erreur: 'historique', message: String(e && e.message || e) }, 502, 60);
  }

  const corps = {
    maj: new Date().toISOString(),
    marchandise: releves[0]?.commodity_name || null,
    comptoir: releves[0]?.terminal_name || null,
    releves: releves.map((r) => ({
      date: (r.date_added || 0) * 1000,
      achat: r.price_buy || 0,
      vente: r.price_sell || 0,
      stock: r.scu_sell_stock || 0,
      version: r.game_version || null,
    })).sort((a, b) => a.date - b.date),
  };

  const sortie = reponse(corps, 200, 3600);
  ctx.waitUntil(cache.put(cle, sortie.clone()));
  return sortie;
}
