#!/usr/bin/env bash
# ============================================================
#  MISE À JOUR DU SITE DE L'ORDRE
# ------------------------------------------------------------
#  Une seule commande, toujours la même :
#
#      ~/Documents/ordre-du-neant-site/maj.sh
#
#  Le script se débrouille avec le reste : il trouve l'archive
#  la plus récente dans les Téléchargements, remplace le site,
#  et publie si un dépôt Git est configuré.
# ============================================================

set -uo pipefail

SITE="$HOME/Documents/ordre-du-neant-site"
TELECHARGEMENTS="$HOME/Downloads"

vert()  { printf '\033[32m%s\033[0m\n' "$*"; }
rouge() { printf '\033[31m%s\033[0m\n' "$*"; }
gris()  { printf '\033[90m%s\033[0m\n' "$*"; }

echo ""
echo "  MISE À JOUR DU SITE"
echo "  ─────────────────────────────────────────"

# ------------------------------------------------------------
# 1. Trouver l'archive
#    On cherche le zip le plus récent qui contient bien un
#    index.html : ça évite de confondre avec un autre
#    téléchargement qui traînerait.
# ------------------------------------------------------------

ARCHIVE=""
while IFS= read -r candidat; do
  if unzip -l "$candidat" 2>/dev/null | grep -q "index.html"; then
    ARCHIVE="$candidat"
    break
  fi
done < <(ls -t "$TELECHARGEMENTS"/*.zip 2>/dev/null)

if [ -z "$ARCHIVE" ]; then
  rouge "  Aucune archive du site trouvée dans $TELECHARGEMENTS"
  echo "  Télécharge l'archive depuis la conversation, puis relance."
  exit 1
fi

gris "  Archive  : $(basename "$ARCHIVE")"
gris "  Reçue le : $(date -r "$ARCHIVE" '+%d/%m à %H:%M')"

# ------------------------------------------------------------
# 2. Remplacer le contenu
#    On efface tout sauf le dossier .git et ce script, pour que
#    les fichiers supprimés d'une version à l'autre disparaissent
#    réellement au lieu de s'accumuler.
# ------------------------------------------------------------

mkdir -p "$SITE"
cd "$SITE" || exit 1

find . -mindepth 1 -maxdepth 1 \
     ! -name '.git' \
     ! -name 'maj.sh' \
     -exec rm -rf {} + 2>/dev/null

unzip -oq "$ARCHIVE" -d "$SITE"

# Le script livré dans l'archive remplace l'ancien s'il a changé.
if [ -f "$SITE/maj.sh" ]; then chmod +x "$SITE/maj.sh"; fi

FICHIERS=$(find . -type f ! -path './.git/*' | wc -l | tr -d ' ')
vert "  Site remplacé ($FICHIERS fichiers)"

# ------------------------------------------------------------
# 3. Publier
# ------------------------------------------------------------

if [ ! -d .git ]; then
  echo ""
  gris "  Pas encore de dépôt Git ici."
  gris "  Le site est à jour en local. Pour publier automatiquement"
  gris "  à l'avenir, crée un dépôt sur github.com puis lance :"
  echo ""
  echo "      cd $SITE"
  echo "      git init && git add . && git commit -m 'Site'"
  echo "      git branch -M main"
  echo "      git remote add origin https://github.com/TON_PSEUDO/ordre-du-neant.git"
  echo "      git push -u origin main"
  echo ""
  exit 0
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  rouge "  Dépôt Git présent mais aucun serveur distant configuré."
  echo "      git remote add origin https://github.com/TON_PSEUDO/ordre-du-neant.git"
  exit 1
fi

git add -A

if git diff --cached --quiet; then
  gris "  Rien de nouveau à publier."
  exit 0
fi

MESSAGE="${1:-Mise à jour du site}"
git commit -qm "$MESSAGE"

if git push -q origin HEAD 2>/dev/null; then
  vert "  Publié sur GitHub"
  gris "  Cloudflare déploie automatiquement, compte une minute."
else
  rouge "  L'envoi a échoué."
  gris "  Lance 'git push' à la main pour voir l'erreur."
  exit 1
fi

echo ""
