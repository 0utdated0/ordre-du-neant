"""LE SEUIL — station d'attache de l'Ordre du Néant.

Modélisée sous Blender, pas assemblée à partir de primitives dans
le navigateur. Les volumes de départ ne sont que de la matière :
ce sont les chanfreins, le panneautage et les greebles qui font la
coque, et c'est cette granulométrie-là qui manquait pour tenir à
côté de coques de vaisseaux à onze mille triangles.

Inspirée des stations orbitales de Star Citizen (Everus Harbor,
Port Tressler) sans en recopier aucune : fût incliné, moyeu
d'anneaux empilés, plateaux elliptiques, longs bras d'amarrage
terminés en croix, nacelle d'habitation, grappe de réservoirs.

Sortie : seuil.ply, repris par la chaîne de conversion des coques.
"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh                                   # noqa: E402
from mathutils import Vector, Matrix                # noqa: E402
import commun as C                                  # noqa: E402

TAU = math.tau
rnd = random.Random(20260915)
bm = bmesh.new()

# =========================================================
# 1. LE FÛT
# =========================================================
# Profil variable : une station n'est pas un tuyau. On empile des
# tronçons de rayons différents et on les panneaute.
TRONCONS = [
    (-95, 5.2, 5.8, 10), (-85, 5.8, 4.6, 14), (-71, 4.6, 4.8, 18),
    (-53, 4.8, 4.4, 16), (-37, 4.4, 5.6, 14), (-23, 5.6, 6.2, 20),
    (-3, 6.2, 5.4, 16), (13, 5.4, 4.2, 20), (33, 4.2, 4.4, 18),
    (51, 4.4, 3.6, 16), (67, 3.6, 3.8, 14), (81, 3.8, 2.6, 12),
]
peauFut = []
for z0, r0, r1, h in TRONCONS:
    peauFut += C.cylindre(bm, r0, r1, h, 18, pos=(0, 0, z0 + h / 2), capuchons=False)
    # collier : un anneau plus large à chaque jointure
    C.cylindre(bm, r1 * 1.22, r1 * 1.22, 1.6, 18, pos=(0, 0, z0 + h))

# nervures longitudinales
for i in range(6):
    a = i / 6 * TAU
    C.cube(bm, 1.1, 0.9, 168, pos=(math.cos(a) * 5.6, math.sin(a) * 5.6, -8), rot=(0, 0, -a))

# embase et tête plate : pas de cône, une plateforme technique
C.cylindre(bm, 8.2, 6.4, 7, 20, pos=(0, 0, -98))
C.cylindre(bm, 9.4, 9.4, 2.2, 20, pos=(0, 0, -102))
tete = C.cylindre(bm, 4.0, 5.4, 5, 16, pos=(0, 0, 96))
tete += C.cylindre(bm, 6.6, 6.6, 1.8, 16, pos=(0, 0, 99.4))

# =========================================================
# 2. LE MOYEU : trois anneaux empilés
# =========================================================
for r, tube, z, maj in ((17.5, 2.0, -9, 40), (23.5, 2.8, -1, 48), (15.5, 1.7, 7.5, 36)):
    C.tore(bm, r, tube, maj, 10, pos=(0, 0, z))

# contreforts du moyeu
for i in range(10):
    a = i / 10 * TAU
    C.cube(bm, 1.6, 1.6, 21, pos=(math.cos(a) * 19, math.sin(a) * 19, -1), rot=(0, 0, -a))
    C.cube(bm, 12.5, 1.2, 1.2, pos=(math.cos(a) * 12.5, math.sin(a) * 12.5, -9), rot=(0, 0, -a))

# =========================================================
# 3. LES PLATEAUX
# =========================================================
# Les plateaux sont des ponts, pas des galettes : grille polaire,
# rainurée et greeblée, avec des ouvrages dessus.
ponts = []
for rayon, ep, z, biais, seg, ann in ((43, 3.4, 3, 0.0, 34, 5), (33, 2.8, -13, 0.22, 30, 4)):
    haut, bas = C.disque_grille(bm, 8.5, rayon, ep, seg, ann, pos=(0, 0, z), rot=(0, 0, biais))
    ponts.append((haut, bas, rayon, z, ep, biais))
    # jante creuse
    C.tore(bm, rayon * 1.005, ep * 0.5, seg * 2, 8, pos=(0, 0, z))
    # nervures rayonnantes en relief
    for i in range(seg // 2):
        a = i / (seg // 2) * TAU + biais
        C.cube(bm, rayon * 0.76, 1.4, 1.0,
               pos=(math.cos(a) * rayon * 0.55, math.sin(a) * rayon * 0.55, z + ep * 0.62),
               rot=(0, 0, -a))
    # ouvrages de pont : hangars, tours de contrôle, mâts
    for i in range(7):
        a = (i + 0.35) / 7 * TAU + biais
        d = rayon * (0.52 + 0.3 * ((i * 5) % 7) / 7)
        x, y = math.cos(a) * d, math.sin(a) * d
        hh = 4.5 + (i % 3) * 3.5
        C.cube(bm, 9.5, 6.5, hh, pos=(x, y, z + ep / 2 + hh / 2), rot=(0, 0, -a))
        C.cube(bm, 4.5, 3.0, 2.4, pos=(x, y, z + ep / 2 + hh + 1.2), rot=(0, 0, -a))
        if i % 2 == 0:
            C.cylindre(bm, 1.0, 0.6, 11, 8, pos=(x, y, z + ep / 2 + hh + 6.5))
    # anneau de feux d'amerrissage
    for i in range(seg // 2):
        a = (i + 0.5) / (seg // 2) * TAU + biais
        C.cube(bm, 2.0, 1.4, 0.9,
               pos=(math.cos(a) * rayon * 0.93, math.sin(a) * rayon * 0.93, z + ep * 0.62),
               rot=(0, 0, -a))

# =========================================================
# 4. L'ANNEAU D'HABITATION
# =========================================================
RANN = 62
C.tore(bm, RANN, 2.6, 56, 10, pos=(0, 0, 17))
C.tore(bm, RANN, 1.0, 56, 6, pos=(0, 0, 22.5))
for i in range(16):
    a = i / 16 * TAU
    x, y = math.cos(a) * RANN, math.sin(a) * RANN
    C.cube(bm, 7.4, 5.2, 4.6, pos=(x, y, 17), rot=(0, 0, -a))
    C.cube(bm, 2.2, 2.2, 5.4, pos=(x, y, 21), rot=(0, 0, -a))
    if i % 2 == 0:
        # hauban vers le moyeu
        lg = RANN - 24
        C.cube(bm, lg, 0.9, 0.9,
               pos=(math.cos(a) * (24 + lg / 2), math.sin(a) * (24 + lg / 2), 10),
               rot=(0, math.atan2(7, lg), -a))

# =========================================================
# 5. LES BRAS D'AMARRAGE
# =========================================================
def bras(angle, z):
    """Une vraie ferme : trois longerons et des traverses, pas une
    poutre pleine. Terminée par un noeud d'amarrage en croix."""
    dx, dy = math.cos(angle), math.sin(angle)
    depart, fin = 26, 128
    lg = fin - depart
    mil = depart + lg / 2
    for k in range(3):
        b = k / 3 * TAU
        ox, oy, oz = -dy * math.cos(b) * 2.6, dx * math.cos(b) * 2.6, math.sin(b) * 2.6
        C.cube(bm, lg, 1.15, 1.15, pos=(dx * mil + ox, dy * mil + oy, z + oz), rot=(0, 0, -angle))
    n = 13
    for i in range(n):
        t = depart + (i + 0.5) * lg / n
        C.tore(bm, 2.7, 0.55, 12, 6,
               pos=(dx * t, dy * t, z), rot=(0, math.pi / 2, -angle))
        s = 1 if i % 2 else -1
        C.cube(bm, lg / n * 1.35, 0.7, 0.7,
               pos=(dx * t, dy * t, z + s * 1.4), rot=(0, s * 0.42, -angle))
    # noeud d'amarrage
    nx, ny = dx * (fin + 6), dy * (fin + 6)
    C.cube(bm, 12, 6.2, 6.2, pos=(nx, ny, z), rot=(0, 0, -angle))
    C.cube(bm, 4.4, 30, 3.4, pos=(nx, ny, z), rot=(0, 0, -angle))
    C.cube(bm, 4.4, 3.4, 26, pos=(nx, ny, z), rot=(0, 0, -angle))
    for s in (-1, 1):
        for axe in (0, 1):
            px = nx + (-dy * 13 * s if axe == 0 else 0)
            py = ny + (dx * 13 * s if axe == 0 else 0)
            pz = z + (0 if axe == 0 else 12 * s)
            C.cube(bm, 5.2, 5.2, 4.2, pos=(px, py, pz), rot=(0, 0, -angle))
            C.cylindre(bm, 1.5, 1.1, 3.4, 10, pos=(px, py, pz), rot=(0, math.pi / 2, -angle))
    C.cylindre(bm, 3.4, 2.2, 9, 14, pos=(nx + dx * 8, ny + dy * 8, z), rot=(0, math.pi / 2, -angle))


for i in range(4):
    bras(i / 4 * TAU + math.pi / 8, 12 if i % 2 else -18)

# =========================================================
# 6. LA NACELLE D'HABITATION
# =========================================================
def nacelle(pos, angle):
    L, R = 58, 7.4
    C.cylindre(bm, R, R, L, 20, pos=pos, rot=(0, math.pi / 2, angle), capuchons=False)
    for s in (-1, 1):
        p = (pos[0] + math.cos(angle) * s * L / 2, pos[1] + math.sin(angle) * s * L / 2, pos[2])
        C.sphere(bm, R, 20, 10, pos=p, ech=(0.62, 0.62, 1))
        C.cylindre(bm, R * 0.55, R * 0.4, 3, 16, pos=p, rot=(0, math.pi / 2, angle))
    for i in range(9):
        t = -L / 2 + 4 + i * (L - 8) / 8
        p = (pos[0] + math.cos(angle) * t, pos[1] + math.sin(angle) * t, pos[2])
        C.tore(bm, R * 1.03, 0.55, 20, 6, pos=p, rot=(0, math.pi / 2, angle))
        if i % 2 == 0:
            C.cube(bm, 4.6, 1.2, 2.6, pos=(p[0], p[1], p[2] + R * 0.92), rot=(0, 0, angle))
    C.cube(bm, 3.2, 3.2, 26, pos=(pos[0] * 0.5, pos[1] * 0.5, pos[2] - 13), rot=(0, 0, angle))


nacelle((30, 8, 44), 0.35)

# =========================================================
# 7. RÉSERVOIRS, RADIATEURS, ANTENNES
# =========================================================
for i in range(4):
    z = -30 - i * 12
    C.sphere(bm, 6.2, 18, 10, pos=(13, -6, z))
    C.tore(bm, 6.3, 0.7, 22, 6, pos=(13, -6, z))
    C.cylindre(bm, 1.2, 1.2, 12, 10, pos=(13, -6, z - 6))
C.cube(bm, 1.8, 1.8, 54, pos=(13, -6, -48))
C.cube(bm, 13.5, 1.6, 1.6, pos=(6.5, -3, -30))

for s in (-1, 1):
    C.cube(bm, 58, 22, 0.9, pos=(s * 42, s * 14, 62), rot=(s * 0.3, 0, s * 0.2))
    for i in range(7):
        C.cube(bm, 58, 1.1, 1.6,
               pos=(s * 42, s * 14 - 9 + i * 3, 62.9), rot=(s * 0.3, 0, s * 0.2))
    C.cube(bm, 2.2, 2.2, 22, pos=(s * 17, s * 6, 62), rot=(0, -s * 1.2, 0))

# grappe d'antennes au sommet : des plats et des paraboles, pas un cône
for i, (r, tilt, off) in enumerate(((7.5, 0.8, 8), (5.4, -0.6, -7), (4.2, 2.0, 0))):
    p = (math.cos(i * 2.1) * off, math.sin(i * 2.1) * off, 106 + i * 5)
    C.sphere(bm, r, 18, 8, pos=p, ech=(1, 1, 0.34))
    C.cylindre(bm, 0.7, 0.7, 9, 8, pos=(p[0], p[1], p[2] - 5))
    C.cube(bm, 0.5, 0.5, r * 1.1, pos=p, rot=(tilt, 0, 0))
C.cylindre(bm, 1.1, 0.5, 26, 8, pos=(2, 1, 116))
C.cube(bm, 9, 0.8, 0.8, pos=(2, 1, 124))
C.cube(bm, 0.8, 9, 0.8, pos=(2, 1, 120))

print('volumes bruts : %d faces' % len(bm.faces), file=sys.stderr)

# =========================================================
# 8. TRAITEMENT DE SURFACE
# =========================================================
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.002)

# Les ponts d'abord : ce sont eux qu'on regarde, ils reçoivent le
# traitement le plus fin.
for haut, bas, rayon, z, ep, biais in ponts:
    C.panneauter(bm, [f for f in haut if f.is_valid], marge=0.75, creux=0.45)
    C.panneauter(bm, [f for f in bas if f.is_valid], marge=0.9, creux=0.3, saut=1)
    C.greebler(bm, [f for f in haut if f.is_valid], 150,
               taille=(0.28, 0.72), hauteur=(0.4, 2.2), etages=2, graine=int(rayon))
    C.greebler(bm, [f for f in bas if f.is_valid], 70,
               taille=(0.3, 0.8), hauteur=(-0.2, 1.1), etages=1, graine=int(rayon) + 3)
print('apres les ponts : %d faces' % len(bm.faces), file=sys.stderr)

# puis tout le reste : liseré sur les grandes faces, granulométrie
# partout ailleurs
grandes = [f for f in bm.faces if f.calc_area() > 11]
C.panneauter(bm, grandes, marge=0.85, creux=0.35)
print('apres panneautage : %d faces' % len(bm.faces), file=sys.stderr)

candidats = [f for f in bm.faces if 1.6 < f.calc_area() < 200]
C.greebler(bm, candidats, 900, taille=(0.3, 0.78), hauteur=(0.3, 1.9),
           etages=2, graine=11)
print('apres greebles : %d faces' % len(bm.faces), file=sys.stderr)

# chanfreins : c'est ce qui fait qu'une arête accroche la lumière
C.chanfreiner(bm, largeur=0.22, segments=1, angle=0.7)
print('apres chanfreins : %d faces' % len(bm.faces), file=sys.stderr)

# Blender travaille en Z vertical, le site en Y vertical.
bmesh.ops.transform(bm, matrix=Matrix.Rotation(-math.pi / 2, 4, 'X'), verts=bm.verts[:])

sortie = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'seuil.ply')
nv, nf = C.ecrire_ply(bm, sortie)
print('seuil.ply : %d sommets, %d triangles' % (nv, nf), file=sys.stderr)
