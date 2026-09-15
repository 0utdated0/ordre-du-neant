"""Petite boîte à outils de modélisation dure pour Blender.

Ce n'est pas un assembleur de primitives : les volumes de départ
servent de matière première, et ce sont les opérations qui
suivent, chanfreins, panneautage, greebles, qui font la coque.
"""
import bmesh, math, random
from mathutils import Vector, Matrix


def matrice(pos=(0, 0, 0), rot=(0, 0, 0), ech=(1, 1, 1)):
    return (Matrix.Translation(Vector(pos))
            @ Matrix.Rotation(rot[2], 4, 'Z')
            @ Matrix.Rotation(rot[1], 4, 'Y')
            @ Matrix.Rotation(rot[0], 4, 'X')
            @ Matrix.Diagonal(Vector(ech).to_4d()))


def neuves(bm, avant):
    """Les faces apparues depuis le relevé « avant »."""
    return [f for f in bm.faces if f.index == -1 or f not in avant]


def cylindre(bm, r1, r2, h, seg=16, pos=(0, 0, 0), rot=(0, 0, 0), capuchons=True):
    avant = set(bm.faces)
    bmesh.ops.create_cone(bm, cap_ends=capuchons, cap_tris=False, segments=seg,
                          radius1=r1, radius2=r2, depth=h,
                          matrix=matrice(pos, rot))
    return [f for f in bm.faces if f not in avant]


def cube(bm, sx, sy, sz, pos=(0, 0, 0), rot=(0, 0, 0)):
    avant = set(bm.faces)
    bmesh.ops.create_cube(bm, size=1.0, matrix=matrice(pos, rot, (sx, sy, sz)))
    return [f for f in bm.faces if f not in avant]


def tore(bm, r, tube, maj=32, mino=10, pos=(0, 0, 0), rot=(0, 0, 0), arc=math.tau):
    """Révolution d'un profil circulaire : un vrai tore, pas un
    empilement de segments droits."""
    avantV = set(bm.verts)
    avantF = set(bm.faces)
    bmesh.ops.create_circle(bm, cap_ends=False, segments=mino, radius=tube,
                            matrix=matrice((r, 0, 0), (math.pi / 2, 0, 0)))
    profilV = [v for v in bm.verts if v not in avantV]
    profilE = list({e for v in profilV for e in v.link_edges})
    bmesh.ops.spin(bm, geom=profilE + profilV,
                   axis=(0, 0, 1), steps=maj, angle=arc, cent=(0, 0, 0),
                   use_merge=(arc >= math.tau - 1e-6))
    nouvelles = [f for f in bm.faces if f not in avantF]
    sommets = list({v for f in nouvelles for v in f.verts} | set(profilV))
    bmesh.ops.transform(bm, matrix=matrice(pos, rot), verts=sommets)
    return nouvelles


def sphere(bm, r, seg=20, anneaux=12, pos=(0, 0, 0), ech=(1, 1, 1)):
    avant = set(bm.faces)
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=anneaux, radius=r,
                              matrix=matrice(pos, (0, 0, 0), ech))
    return [f for f in bm.faces if f not in avant]


def panneauter(bm, faces, marge=0.06, creux=0.02, saut=0):
    """Rainure les faces : un liseré tout autour, le centre enfoncé.
    C'est ce qui distingue une tôle d'un plan lisse."""
    cibles = [f for f in faces if f.is_valid and f.calc_area() > 0.004]
    if saut:
        cibles = [f for i, f in enumerate(cibles) if i % (saut + 1) == 0]
    if not cibles:
        return []
    r = bmesh.ops.inset_individual(bm, faces=cibles, thickness=marge,
                                   depth=-creux, use_even_offset=True)
    return cibles + r.get('faces', [])


def greebler(bm, faces, quantite, taille=(0.25, 0.6), hauteur=(0.01, 0.06),
             etages=2, graine=1):
    """Sème des petits volumes sur les faces : trappes, coffrets,
    conduits. Une coque de vaisseau n'est pas lisse, et c'est cette
    granulométrie-là qui la fait lire comme telle."""
    rnd = random.Random(graine)
    pool = [f for f in faces if f.is_valid and f.calc_area() > 0.02]
    if not pool:
        return []
    rnd.shuffle(pool)
    sortie = []
    for f in pool[:quantite]:
        if not f.is_valid:
            continue
        courant = f
        for e in range(etages):
            if not courant.is_valid or courant.calc_area() < 0.006:
                break
            t = rnd.uniform(*taille) * (0.55 if e else 1.0)
            ins = bmesh.ops.inset_individual(bm, faces=[courant],
                                             thickness=t * math.sqrt(courant.calc_area()) * 0.5,
                                             depth=0.0, use_even_offset=True)
            dessus = ins['faces'][0] if ins['faces'] else None
            cible = dessus if dessus else courant
            ext = bmesh.ops.extrude_discrete_faces(bm, faces=[cible])
            nf = ext['faces'][0]
            d = rnd.uniform(*hauteur) * (1.0 if rnd.random() > 0.25 else -0.6)
            bmesh.ops.translate(bm, verts=nf.verts, vec=nf.normal * d)
            sortie.append(nf)
            courant = nf
    return sortie


def chanfreiner(bm, largeur=0.012, segments=2, angle=0.6):
    aretes = [e for e in bm.edges if e.is_manifold and e.calc_face_angle(0) > angle]
    if aretes:
        bmesh.ops.bevel(bm, geom=aretes, offset=largeur, segments=segments,
                        profile=0.5, affect='EDGES', clamp_overlap=True)


def ecrire_ply(bm, chemin):
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    for i, v in enumerate(bm.verts):
        v.index = i
    import struct
    entete = ("ply\nformat binary_little_endian 1.0\n"
              "element vertex %d\nproperty float x\nproperty float y\nproperty float z\n"
              "element face %d\nproperty list uchar uint vertex_indices\n"
              "end_header\n" % (len(bm.verts), len(bm.faces)))
    with open(chemin, 'wb') as fp:
        fp.write(entete.encode('ascii'))
        for v in bm.verts:
            fp.write(struct.pack('<3f', v.co.x, v.co.y, v.co.z))
        for f in bm.faces:
            fp.write(struct.pack('<B3I', 3, f.verts[0].index, f.verts[1].index, f.verts[2].index))
    return len(bm.verts), len(bm.faces)


def disque_grille(bm, rInt, rExt, ep, seg=32, anneaux=4, pos=(0, 0, 0), rot=(0, 0, 0)):
    """Un plateau construit en grille polaire, pas un cylindre à
    couvercle unique. Les quads qui en sortent sont ce qui permet
    ensuite de rainurer et de greebler le pont : un n-gone géant
    n'accepte ni l'un ni l'autre.

    Renvoie (faces_pont, faces_dessous)."""
    M = matrice(pos, rot)
    haut, bas = [], []
    grilles = {}
    for k in (0, 1):
        z = ep / 2 if k == 0 else -ep / 2
        lignes = []
        for j in range(anneaux + 1):
            r = rInt + (rExt - rInt) * j / anneaux
            ligne = []
            for i in range(seg):
                a = i / seg * math.tau
                v = bm.verts.new(M @ Vector((math.cos(a) * r, math.sin(a) * r, z)))
                ligne.append(v)
            lignes.append(ligne)
        grilles[k] = lignes
        for j in range(anneaux):
            for i in range(seg):
                i2 = (i + 1) % seg
                q = (lignes[j][i], lignes[j][i2], lignes[j + 1][i2], lignes[j + 1][i])
                f = bm.faces.new(q if k == 0 else tuple(reversed(q)))
                (haut if k == 0 else bas).append(f)
    # bords intérieur et extérieur
    for j, sens in ((0, True), (anneaux, False)):
        for i in range(seg):
            i2 = (i + 1) % seg
            q = (grilles[0][j][i], grilles[0][j][i2], grilles[1][j][i2], grilles[1][j][i])
            bm.faces.new(q if sens else tuple(reversed(q)))
    bm.normal_update()
    return haut, bas
