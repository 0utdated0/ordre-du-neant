# Modélisation de la station

`seuil.py` construit la station Le Seuil sous Blender et écrit
`seuil.ply`, repris ensuite par `outils/coques/final.js` comme
n'importe quelle coque de vaisseau.

Ce n'est pas un assemblage de primitives : les volumes de départ
ne sont que de la matière. Ce sont les trois passes qui suivent
qui font la coque.

1. **Panneautage.** Chaque grande face reçoit un liseré et un
   creux (`inset_individual` avec profondeur). C'est ce qui
   distingue une tôle d'un plan lisse.
2. **Greebles.** Neuf cents petits volumes semés sur les surfaces
   franches, en deux étages, tailles et hauteurs tirées au sort à
   graine fixe. Trappes, coffrets, conduits. C'est cette
   granulométrie-là qui manquait pour tenir à côté de coques de
   vaisseaux à onze mille triangles.
3. **Chanfreins.** Toutes les arêtes vives sont biseautées. Une
   arête franche ne renvoie rien, une arête chanfreinée accroche
   la lumière et se lit en fil de fer.

Les ponts sont construits en grille polaire (`disque_grille`) et
non en cylindre à couvercle unique : un n-gone géant n'accepte ni
rainure ni greeble.

Sortie brute : environ 205 000 triangles, ramenés à 19 000 par la
chaîne de conversion.

## Refaire la station

```
pip install --break-system-packages bpy==4.5.13
python3 outils/station/seuil.py          # ecrit seuil.ply
cd outils/coques && node final.js ../../public/coques/
```

Compter une minute pour Blender, quelques secondes pour la
conversion. La graine aléatoire est fixée : le résultat est
reproductible à l'identique.

Inspirée des stations orbitales de Star Citizen (Everus Harbor,
Port Tressler) sans en recopier aucune. Site non officiel.
