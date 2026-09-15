"""LA TOUR DE L'ASCENSION — acte VI.

Deux maillages, pas un. Le fût est fixe, le palier est répété six
fois et chacun tourne et s'allume à son rythme : les fondre en une
seule pièce aurait coûté l'animation.

Modelé sous Blender et traité comme les coques : panneautage,
greebles, chanfreins. Les volumes de départ ne sont que de la
matière.

Les unités sont celles de la scène : le fût monte de -40 à 300, le
palier fait 21 de rayon. La conversion les garde telles quelles.
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh                                   # noqa: E402
from mathutils import Matrix                        # noqa: E402
import commun as C                                  # noqa: E402

TAU = math.tau
ICI = os.path.dirname(os.path.abspath(__file__))


def finir(bm, nom, greebles, seuilPan, seuilGre, chanfrein):
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.004)
    grandes = [f for f in bm.faces if f.calc_area() > seuilPan]
    C.panneauter(bm, grandes, marge=0.55, creux=0.3)
    cand = [f for f in bm.faces if seuilGre[0] < f.calc_area() < seuilGre[1]]
    C.greebler(bm, cand, greebles, taille=(0.3, 0.76), hauteur=(0.18, 1.0),
               etages=2, graine=31)
    C.chanfreiner(bm, largeur=chanfrein, segments=1, angle=0.7)
    bmesh.ops.transform(bm, matrix=Matrix.Rotation(-math.pi / 2, 4, 'X'), verts=bm.verts[:])
    nv, nf = C.ecrire_ply(bm, os.path.join(ICI, nom + '.ply'))
    print('%s : %d sommets, %d triangles' % (nom, nv, nf), file=sys.stderr)


# =========================================================
# LE FÛT
# =========================================================
bm = bmesh.new()
BAS, HAUT = -40.0, 302.0

# âme centrale, par tronçons de rayon variable
z = BAS
i = 0
while z < HAUT:
    h = 22 + (i % 3) * 6
    r0 = 6.1 + ((i * 3) % 5) * 0.35
    r1 = 6.1 + (((i + 1) * 3) % 5) * 0.35
    C.cylindre(bm, r0, r1, h, 16, pos=(0, 0, z + h / 2), capuchons=False)
    C.cylindre(bm, r1 * 1.24, r1 * 1.24, 2.2, 16, pos=(0, 0, z + h))
    C.tore(bm, r1 * 1.36, 0.55, 28, 6, pos=(0, 0, z + h))
    z += h
    i += 1

# rails longitudinaux : ils donnent la verticalité
for k in range(4):
    a = k / 4 * TAU + 0.25
    C.cube(bm, 2.4, 1.5, HAUT - BAS, pos=(math.cos(a) * 7.6, math.sin(a) * 7.6, (BAS + HAUT) / 2),
           rot=(0, 0, -a))
    C.cube(bm, 0.9, 0.9, HAUT - BAS, pos=(math.cos(a) * 9.0, math.sin(a) * 9.0, (BAS + HAUT) / 2),
           rot=(0, 0, -a))

# conduits et gaines, plus fins, décalés
for k in range(3):
    a = k / 3 * TAU + 0.9
    C.cylindre(bm, 1.15, 1.15, HAUT - BAS - 20, 10,
               pos=(math.cos(a) * 8.3, math.sin(a) * 8.3, (BAS + HAUT) / 2), capuchons=False)
    for j in range(22):
        zz = BAS + 8 + j * (HAUT - BAS - 16) / 21
        C.tore(bm, 1.35, 0.32, 12, 6, pos=(math.cos(a) * 8.3, math.sin(a) * 8.3, zz))

# échelle de service, sur toute la hauteur
for j in range(int((HAUT - BAS) / 3.4)):
    zz = BAS + 3 + j * 3.4
    C.cube(bm, 3.4, 0.5, 0.5, pos=(9.6, 0, zz))
for s in (-1, 1):
    C.cube(bm, 0.55, 0.55, HAUT - BAS - 6, pos=(9.6, s * 1.7, (BAS + HAUT) / 2))

# plateformes de service intercalaires
for j in range(9):
    zz = BAS + 26 + j * 36
    a = j * 1.1
    C.cube(bm, 9, 5.5, 1.1, pos=(math.cos(a) * 9.5, math.sin(a) * 9.5, zz), rot=(0, 0, -a))
    C.cube(bm, 3.2, 2.6, 3.4, pos=(math.cos(a) * 10.5, math.sin(a) * 10.5, zz + 2.2), rot=(0, 0, -a))
    for s in (-1, 1):
        C.cube(bm, 9, 0.45, 2.2, pos=(math.cos(a) * 9.5 - math.sin(a) * s * 2.6,
                                      math.sin(a) * 9.5 + math.cos(a) * s * 2.6, zz + 1.6), rot=(0, 0, -a))

# embase : contreforts au sol
for k in range(6):
    a = k / 6 * TAU
    C.cube(bm, 13, 2.2, 2.2, pos=(math.cos(a) * 11, math.sin(a) * 11, BAS + 5),
           rot=(0, 0.52, -a))
C.cylindre(bm, 15, 11, 9, 20, pos=(0, 0, BAS + 3))
C.tore(bm, 15.4, 1.1, 32, 8, pos=(0, 0, BAS + 6))

# sommet : mât d'antennes plates, pas de cône
C.cylindre(bm, 4.6, 3.2, 8, 14, pos=(0, 0, HAUT + 3))
for k, (rr, dz) in enumerate(((3.4, 12), (2.6, 20), (1.9, 27))):
    C.sphere(bm, rr, 14, 8, pos=(math.cos(k * 2.2) * 2.4, math.sin(k * 2.2) * 2.4, HAUT + dz),
             ech=(1, 1, 0.3))
    C.cube(bm, 0.4, 0.4, rr * 1.2, pos=(math.cos(k * 2.2) * 2.4, math.sin(k * 2.2) * 2.4, HAUT + dz))
C.cylindre(bm, 0.8, 0.35, 34, 8, pos=(0, 0, HAUT + 22))
C.cube(bm, 7, 0.6, 0.6, pos=(0, 0, HAUT + 32))
C.cube(bm, 0.6, 7, 0.6, pos=(0, 0, HAUT + 28))

print('fut brut : %d faces' % len(bm.faces), file=sys.stderr)
finir(bm, 'ascension-fut', 620, seuilPan=10, seuilGre=(1.2, 130), chanfrein=0.14)


# =========================================================
# UN PALIER
# =========================================================
bm = bmesh.new()
RI, RE = 9.5, 21.0

pont, dessous = C.disque_grille(bm, RI, RE, 1.9, 30, 4)
C.tore(bm, RE * 1.01, 1.15, 56, 8)
C.tore(bm, RI * 0.99, 0.8, 40, 6)

# garde-corps
for k in range(30):
    a = k / 30 * TAU
    C.cube(bm, 0.55, 0.55, 3.2, pos=(math.cos(a) * (RE - 0.9), math.sin(a) * (RE - 0.9), 2.5),
           rot=(0, 0, -a))
C.tore(bm, RE - 0.9, 0.35, 56, 6, pos=(0, 0, 4.0))
C.tore(bm, RE - 0.9, 0.25, 56, 6, pos=(0, 0, 2.6))

# quatre passerelles rayonnantes, en ferme
for k in range(4):
    a = k / 4 * TAU + 0.4
    dx, dy = math.cos(a), math.sin(a)
    lg = 9.0
    mil = RE + lg / 2
    for s in (-1, 1):
        C.cube(bm, lg, 0.7, 0.7, pos=(dx * mil - dy * s * 1.7, dy * mil + dx * s * 1.7, 0.4),
               rot=(0, 0, -a))
        C.cube(bm, lg, 0.55, 0.55, pos=(dx * mil - dy * s * 1.7, dy * mil + dx * s * 1.7, -1.8),
               rot=(0, 0, -a))
    for j in range(5):
        t = RE + 0.9 + j * (lg - 1.8) / 4
        C.cube(bm, 0.5, 3.8, 0.5, pos=(dx * t, dy * t, 0.4), rot=(0, 0, -a))
        C.cube(bm, 0.45, 0.45, 2.4, pos=(dx * t, dy * t, -0.7), rot=(0, 0, -a))
    # mâchoire d'amarrage au bout
    bx, by = dx * (RE + lg + 1.4), dy * (RE + lg + 1.4)
    C.cube(bm, 3.4, 5.2, 2.4, pos=(bx, by, 0.4), rot=(0, 0, -a))
    for s in (-1, 1):
        C.cube(bm, 2.6, 0.9, 0.9, pos=(bx + dx * 1.6 - dy * s * 2.0, by + dy * 1.6 + dx * s * 2.0, 0.4),
               rot=(0, 0, -a + s * 0.35))
    C.cylindre(bm, 0.9, 0.55, 2.2, 10, pos=(bx, by, 2.0))

# ouvrages de pont : cabines, treuils, mâts
for k in range(6):
    a = (k + 0.5) / 6 * TAU
    d = RI + (RE - RI) * (0.32 + 0.4 * ((k * 3) % 5) / 5)
    x, y = math.cos(a) * d, math.sin(a) * d
    h = 3.0 + (k % 3) * 2.2
    C.cube(bm, 4.6, 3.4, h, pos=(x, y, 0.95 + h / 2), rot=(0, 0, -a))
    C.cube(bm, 2.2, 1.6, 1.0, pos=(x, y, 0.95 + h + 0.5), rot=(0, 0, -a))
    if k % 2 == 0:
        C.cylindre(bm, 0.45, 0.3, 5.5, 8, pos=(x, y, 0.95 + h + 3.2))
        C.cube(bm, 2.4, 0.4, 0.4, pos=(x, y, 0.95 + h + 5.6), rot=(0, 0, -a))

# collerette qui ceinture le fût
C.cylindre(bm, RI + 1.1, RI + 0.6, 4.4, 20, pos=(0, 0, 1.6), capuchons=False)
for k in range(10):
    a = k / 10 * TAU
    C.cube(bm, 2.6, 0.8, 0.8, pos=(math.cos(a) * (RI + 1.3), math.sin(a) * (RI + 1.3), 3.4),
           rot=(0, 0, -a))

print('palier brut : %d faces' % len(bm.faces), file=sys.stderr)
C.panneauter(bm, [f for f in pont if f.is_valid], marge=0.32, creux=0.16)
C.greebler(bm, [f for f in pont if f.is_valid], 90, taille=(0.3, 0.72),
           hauteur=(0.15, 0.8), etages=2, graine=5)
C.greebler(bm, [f for f in dessous if f.is_valid], 45, taille=(0.3, 0.8),
           hauteur=(-0.1, 0.5), etages=1, graine=6)
finir(bm, 'ascension-palier', 260, seuilPan=6, seuilGre=(0.6, 60), chanfrein=0.09)
