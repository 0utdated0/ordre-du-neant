# Conversion des coques

Transforme un maillage `.ctm` du holoviewer de Roberts Space
Industries en fichier `.odnm`, le format compact que lit
`public/coques.js`.

Les `.ctm` d'origine font de 240 000 à 995 000 triangles. Tels
quels ils sont inutilisables sur une page web : il faut les
décimer, les recentrer, les remettre à l'échelle de leur longueur
réelle et les orienter proue en +Z, comme tout le reste du site.

## Ce que fait la chaîne

1. `lire.js` décode le `.ctm` (lecteur OpenCTM de three.js r100,
   vendu ici avec son LZMA, ni l'un ni l'autre n'étant sur npm).
2. `final.js` soude les sommets, simplifie avec meshoptimizer,
   recentre, met à l'échelle, oriente et quantifie les positions
   sur 16 bits.
3. `extra.js` calcule les arêtes vives et repère les tuyères en
   regroupant les sommets de l'extrême arrière. Les deux sont
   écrits dans le fichier : le navigateur n'a plus qu'à tracer.

## Ajouter un vaisseau

1. Télécharger son `.ctm` dans `~/Documents/modeles-sc/`.
2. Ajouter une entrée dans la table `FLOTTE` de `final.js` :
   nom de sortie, longueur réelle en mètres d'après la fiche RSI,
   budget de triangles, budget d'arêtes.
3. `npm i meshoptimizer` puis
   `node final.js ../../public/coques/`.
4. Reporter la longueur et les tuyères de `fiches.json` dans la
   table `COQUES` de `public/vaisseaux.js`, puis ajouter la fiche
   dans `FICHES`.
5. Regarder le résultat. L'orientation est devinée par une
   heuristique : elle se trompera un jour.

## Réglages qui ont demandé plusieurs essais

- La canonnière se disloque si on la passe en simplification
  approximative : ses tourelles sont des coques séparées. Elle
  garde donc un budget de triangles plus large.
- Le cargo n'a presque que des bords francs, que le seuil d'angle
  ne peut pas écarter. Au-delà du budget, on ne garde que les
  arêtes les plus longues.
- Sur la table d'hologrammes, la peinture additive sature : dix
  mille triangles ne se peignent pas comme les vingt volumes
  primitifs d'origine. Voir `pourLaTable` dans `vaisseaux.js`.

Ces modèles appartiennent à Cloud Imperium Rights LLC. Site non
officiel, sans but lucratif.
