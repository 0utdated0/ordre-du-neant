# Conversion des coques

Transforme un maillage `.ctm` du holoviewer de Roberts Space
Industries en fichier `.odnm`, le format que lit
`public/coques.js`.

Deux chaînes cohabitent, parce que deux besoins cohabitent.

| outil       | pour quoi                  | sortie         |
|-------------|----------------------------|----------------|
| `draco.js`  | les vaisseaux              | `.odnm` v3     |
| `final.js`  | les stations, sorties de Blender | `.odnm` v2 |

## Pourquoi deux

La première version du site décimait tout : les `.ctm` font de
240 000 à 1 105 000 triangles, et ils descendaient à 7 000 -
16 000 par effondrement d'arêtes. À ce taux-là, la simplification
ne simplifie plus, elle détruit. Les panneaux fondent, les
tourelles se décrochent, et le Hammerhead, fait de coques ouvertes
et disjointes, partait carrément en morceaux : il a fallu le
retirer de la flotte.

Mesure faite ensuite, avant d'écrire la moindre ligne : à pleine
géométrie, compressée par Draco à 14 bits de quantification, la
plus lourde des neuf coques pèse **1,8 Mo**, et les neuf ensemble
**8,5 Mo**. Le décodeur ajoute 69 Ko une fois pour toutes. Il n'y
avait donc jamais eu de raison de décimer : le problème n'était
pas le poids, c'était le format.

Les stations, elles, sortent de Blender aux polygones comptés.
Elles n'ont rien à gagner à un décodeur et restent en v2.

## Regarder une coque

`apercu.html` affiche une coque seule, en grand. Le copier dans
`public/` le temps d'un coup d'oeil, puis ouvrir
`/apercu.html?c=orion&m=fil`. Le paramètre `m` vaut `fil`,
`plein`, `aretes` ou `ombre` : comparer `aretes` et `plein` dit
en deux images ce que le corps cache.

## Ce que fait `draco.js`

1. `lire.js` décode le `.ctm` (lecteur OpenCTM de three.js r100,
   vendu ici avec son LZMA, ni l'un ni l'autre n'étant sur npm).
2. Soudure des sommets, orientation proue en +Z, recentrage,
   mise à l'échelle sur la longueur réelle.
3. Encodage Draco, puis **décodage** immédiat. Ce n'est pas une
   vérification : Draco renumérote les sommets, et des indices
   d'arêtes calculés avant l'encodage ne montreraient plus les
   mêmes arêtes. On relève donc sur ce qui sortira réellement du
   navigateur.
4. `extra.js` relève les arêtes vives sur le maillage décodé, et
   `points.js` les points d'accroche : tuyères, postes de tir,
   proue, bras de travail.
5. Écriture de deux niveaux : `nom.odnm` à pleine géométrie et
   `nom-p.odnm` décimé à un dixième, pour les écrans de moins de
   860 px. Un téléphone ne peut ni télécharger huit mégaoctets et
   demi ni tracer un million de triangles par coque ; à un
   dixième des triangles la silhouette tient encore, ce qui
   n'était pas le cas à un centième.

## Ajouter un vaisseau

1. Télécharger son `.ctm` dans `~/Documents/modeles-sc/`.
2. Ajouter une entrée dans la table `FLOTTE` de `draco.js` :
   nom de sortie, longueur réelle en mètres d'après la fiche RSI,
   budget d'arêtes, cible de triangles pour le niveau téléphone,
   nombre de tourelles.
3. Ajouter le nom dans `VAISSEAUX`, en tête de
   `public/coques.js` : c'est cette liste qui décide qui a droit
   à une variante `-p`.
4. `npm i meshoptimizer draco3d` puis
   `node draco.js ../../public/coques/`.
5. Reporter la longueur et les tuyères de `fiches.json` dans la
   table `COQUES` de `public/vaisseaux.js`, puis ajouter la fiche
   dans `FICHES`.
6. Regarder le résultat. L'orientation est devinée par une
   heuristique : elle se trompera un jour.

## Réglages qui ont demandé plusieurs essais

- **Ne jamais classer les arêtes par longueur.** C'était le
  premier tri : au-delà du budget, garder les plus longues. Sur
  un maillage décimé ça marchait, chaque panneau étant un grand
  triangle aux bords longs. Sur le maillage réel c'est l'inverse :
  une ligne de panneau y est découpée en vingt segments courts,
  donc elle perd systématiquement contre les grandes arêtes des
  parties grossières. Les zones détaillées passaient à la trappe.
  On descend maintenant le seuil d'angle jusqu'à remplir le
  budget, et dans le dernier cran on prend un échantillon à pas
  régulier : l'ordre des faces après décodage suit le parcours du
  maillage, donc un pas régulier répartit le reste sur toute la
  coque.
- **Le corps ne peut plus être un noir plat.** C'est le vrai
  piège de cette conversion, et il a coûté une passe entière.
  Avant, le corps ne servait qu'à masquer l'arrière : le fil de
  fer couvrait toute la surface. Sur la géométrie réelle, les
  grandes tôles sont lisses et n'ont d'arêtes vives que sur leur
  pourtour, si bien que le noir plat avalait tout le reste : les
  vaisseaux se lisaient comme des découpes de papier noir, avec
  du détail par plaques. Peindre la même coque en arêtes seules
  le montre d'un coup, tout y est. Le corps a donc maintenant une
  lumière rasante, greffée dans le nuanceur du
  `MeshBasicMaterial` par `onBeforeCompile` (voir `matiereCoque`
  dans `travaux.js`) plutôt qu'un `ShaderMaterial`, parce que les
  actes font disparaître les vaisseaux en baissant l'opacité des
  matières transparentes. Et plus de budget d'arêtes n'y change
  rien : essayé à quatre fois le budget, le résultat est le même.
- **Le budget d'arêtes ne sert plus qu'aux lignes de panneau.**
  Les bords francs seuls (82 000 à 168 000 selon la coque)
  dépassent déjà le budget : aucun pli intérieur n'est tracé, et
  ce n'est pas grave, c'est le corps qui porte les plis.
- **Pas de normales.** Toutes les coques sont peintes avec un
  `MeshBasicMaterial`, qui ne les regarde jamais ; les calculer
  coûtait deux cents millisecondes et sept mégaoctets par coque.
  Le seul nuanceur qui en voulait, celui de la table
  d'hologrammes, reprend désormais la normale de la dérivée
  écran. Elle est plate, ce qui est exactement ce qu'on veut sur
  une coque à panneaux.
- **Le module emscripten est une promesse.** Un module Draco
  porte une méthode `then` : une promesse résolue avec lui le
  prend pour une promesse et le redemande indéfiniment. Le worker
  restait muet, sans la moindre erreur. Il faut l'envelopper.
- **Le cargo n'a presque que des bords francs**, que le seuil
  d'angle ne peut pas écarter. Au-delà du budget, on ne garde que
  les arêtes les plus longues.
- **Sur la table d'hologrammes, la peinture additive sature.**
  Voir `pourLaTable` dans `vaisseaux.js`.

Ces modèles appartiennent à Cloud Imperium Rights LLC. Site non
officiel, sans but lucratif.
