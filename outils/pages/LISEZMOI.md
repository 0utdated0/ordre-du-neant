# Les pages

Le site tenait sur une seule page de onze actes. Il en a maintenant
cinq, avec un menu, parce qu'un site d'organisation doit pouvoir
être envoyé par morceaux : « voilà nos règles », « voilà notre
flotte ». Une ancre dans une page unique ne fait pas ça.

| Page | Fichier | Ce qu'elle porte |
|---|---|---|
| `/` | `index.html` | L'histoire. Seulement de la 3D et l'appel au Discord en bas. |
| `/ordre` | `ordre.html` | Manifeste, divisions, ascension avec sa tour, la Règle. |
| `/flotte` | `flotte.html` | La table d'hologrammes. |
| `/vie` | `vie.html` | La Vigie en direct, les opérations, la galerie. |
| `/rejoindre` | `rejoindre.html` | Conditions, sas d'admission, parrainage. |

## Assemblage

Les cinq pages partagent un en-tête, un menu et un pied. Plutôt
que d'en maintenir cinq copies à la main, elles sont assemblées :

```
node outils/pages/batir.js
```

- `gabarit.html` : la coquille, avec ses marqueurs `{{...}}`
- `blocs/` : en-tête et menu, pied, appel de fin, visionneuse
- `sections/` : les actes, un fichier chacun
- `batir.js` : la liste des pages, ce que chacune contient, ce
  qu'elle met dans son rail et surtout **ce qu'elle charge**

**Ne jamais éditer les `.html` de `public/`** : ils sont écrasés au
prochain assemblage. Chacun porte un bandeau qui le rappelle.

Le résultat est versionné avec le reste : le déploiement Cloudflare
reste `npx wrangler deploy`, sans étape de construction à faire
échouer. L'assemblage est un outil de développement, pas une
dépendance de production.

## Ce que chaque page charge

Une page ne doit pas payer pour la 3D d'une autre. C'est le champ
`scripts` de `batir.js` qui le décide, et c'est la raison
principale du découpage avec les liens profonds.

- `/` : trois actes WebGL, une seule coque (le Javelin)
- `/flotte` : un acte, les coques à la demande onglet par onglet
- `/ordre` : un acte, la tour demandée à l'approche de la section
- `/vie`, `/rejoindre` : aucune scène lourde, juste le fond étoilé

## Les actes sont renumérotés

Il y avait onze actes à la file. Chaque page a maintenant sa propre
suite, donnée par son rail dans `batir.js`. Les sections portent un
marqueur `{{ACTE}}` que l'assemblage remplit, et l'assemblage
échoue si un marqueur reste non résolu.

## Les anciens liens

`site.js` renvoie les ancres de l'ancienne page unique vers leur
nouvelle adresse : `/#flotte` devient `/flotte#flotte`. À retirer
le jour où plus personne n'a ces liens.
