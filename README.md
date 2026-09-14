# Site de L'Ordre du Néant

Page unique en neuf actes. Aucune dépendance externe : ni CDN, ni Google
Fonts. Tout est servi depuis le domaine.

## Fichiers

    index.html              la page, neuf actes
    styles.css              charte noir / argent / rouge + @font-face
    scene.js                scène WebGL persistante (Three.js)
    site.js                 parallaxe, révélations, rail, cartes 3D
    vigie.js                données en direct, galerie, visionneuse
    functions/api/ordre.js  passerelle Discord (Cloudflare Pages)
    exemple/ordre.json      jeu de données de repli, affiché comme tel
    galerie/               captures + manifeste.json
    assets/                 emblème, bannières et recadrages de scène
    polices/                Michroma et Saira en woff2
    vendor/three.min.js     Three.js r128 figé
    _headers                en-têtes Cloudflare Pages
    robots.txt, sitemap.xml
    maj.sh                  script de mise à jour depuis une archive

## Les neuf actes

| Acte | Section | Traitement |
|---|---|---|
| I | Le Seuil | emblème, scène WebGL, deux portes |
| II | Le Manifeste | fond plein écran en parallaxe, texte à gauche |
| III | Les Divisions | huit cartes qui s'inclinent sous la souris |
| IV | L'Ascension | six échelons, ligne rouge qui se remplit |
| V | La Vigie | effectif, présence et registre, en direct |
| VI | Les Opérations | événements planifiés du Discord |
| VII | La Galerie | captures, ouverture plein écran |
| VIII | La Règle | écran partagé image / texte |
| IX | Le Passage | appel à rejoindre, parcours d'entrée, parrainage |

## Les données en direct

Le bot est la source de vérité. Le site ne tient aucune base : il interroge
Discord et affiche ce qu'il trouve.

`functions/api/ordre.js` est une fonction Cloudflare Pages servie sur
`/api/ordre`. Elle renvoie trois blocs :

- **effectif** — membres et rôles du serveur, convertis en échelons,
  fonctions et divisions. Les rôles `Ordre Noir` et `Système` ne sortent
  jamais de la fonction.
- **operations** — événements planifiés à venir, avec durée, lieu et
  nombre d'inscrits.
- **presence** — widget public du serveur : qui est en ligne, quels
  salons vocaux sont occupés.

Le jeton du bot reste côté serveur. Le navigateur n'appelle que
`/api/ordre`. Les réponses sont gardées cinq minutes en cache de
périphérie, donc Discord n'est sollicité qu'une fois par tranche de cinq
minutes quel que soit le nombre de visiteurs.

Si `/api/ordre` ne répond pas, le site bascule sur `exemple/ordre.json` et
l'affiche clairement comme un jeu d'exemple. Jamais de fausse donnée muette.

### Variables à déclarer dans Cloudflare Pages

| Nom | Valeur | Type |
|---|---|---|
| `DISCORD_TOKEN` | le jeton du bot | chiffrée |
| `GUILD_ID` | l'identifiant du serveur | texte |
| `EFFECTIF_NOMS` | `non` pour publier les compteurs sans la liste nominative | facultatif |

## Mise en service

1. **Activer le widget Discord.** Paramètres du serveur, section Widget,
   interrupteur sur activé. Sans ça, l'effectif et les opérations
   fonctionnent, mais la présence en direct reste vide.
2. **Créer le dépôt GitHub** et y pousser ce dossier.
3. **Créer le projet Cloudflare Pages**, le relier au dépôt. Aucune
   commande de compilation, dossier de sortie à la racine.
4. **Déclarer les variables** ci-dessus dans les réglages du projet, puis
   relancer un déploiement pour qu'elles soient prises en compte.
5. **Rattacher le domaine** `ordre-du-neant.fr` dans Custom domains.

## La galerie

Dépose les images dans `galerie/`, liste-les dans `galerie/manifeste.json` :

```json
[
  { "fichier": "convoi-hurston.webp", "legende": "Convoi vers Lorville" }
]
```

Tant que le manifeste est vide, la section affiche des emplacements libres
au lieu d'un écran nu.

## Principes tenus

- Noir, argent, rouge. Aucun bleu, aucun or.
- Michroma pour les titres, Saira pour le texte.
- Rien n'apparaît sans fond : chaque acte a son image ou sa scène 3D.
- `prefers-reduced-motion` coupe animations, grain et parallaxe.
- Pas de débordement horizontal, testé jusqu'à 390 px de large.

## Scène WebGL

Un canevas fixe derrière toute la page : 14 000 étoiles sur deux coquilles,
quatre nappes de nébuleuse, le Néant en astre éclipsé avec son anneau de
poussière en rotation différentielle, 150 débris répartis en volume et 760
particules attirées par le curseur. La caméra avance à mesure qu'on descend.

La scène se met en pause quand l'onglet passe en arrière-plan et réduit ses
effectifs sous 860 px de large.
