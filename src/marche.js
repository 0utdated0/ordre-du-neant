/* =========================================================
   L'ORDRE DU NÉANT - le marché
   ---------------------------------------------------------
   Ce fichier ne sert plus : son contenu est passé dans
   src/index.js.

   /api/marche répondait « Worker threw exception » en trente
   millisecondes, avant le moindre appel réseau, et ni le filet
   ni la sonde posés ensuite n'ont changé la réponse. Le seul
   soupçon qui tenait encore était l'import entre deux fichiers
   du Worker. Le Worker est donc redevenu un seul fichier, comme
   il l'a toujours été jusqu'ici.
   ========================================================= */
