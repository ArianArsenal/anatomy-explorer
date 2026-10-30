"""Export the Z-Anatomy model (CC BY-SA 4.0, derived from BodyParts3D) to one GLB per app layer.

Usage:
  blender -b --factory-startup Startup.blend --python tools/export_zanatomy.py -- <outdir>

Writes <outdir>/<layer>.glb and <outdir>/manifest.json. Every material is replaced by a
placeholder named "k:<tissue kind>"; the app swaps in realistic shaders by kind.
"""
import json
import os
import re
import sys

import bmesh
import bpy

OUT = sys.argv[sys.argv.index('--') + 1]
os.makedirs(OUT, exist_ok=True)

# Top-level Z-Anatomy collections → default app layer (None = skip).
SYSTEMS = {
    '1: Skeletal system': 'skeleton',
    '2: Muscular insertions': None,
    '3: Joints': 'skeleton',
    '4: Muscular system': 'muscles',
    '5: Cardiovascular system': 'arteries',  # refined per material below
    '6: Lymphoid organs': 'organs',
    '7: Nervous system & Sense organs': 'nerves',
    '8: Visceral systems': 'organs',
    '9: Regions of human body': 'skin',
}

# Material names (Z-Anatomy) that mark geometry we leave out: sheets that would hide the
# anatomy underneath (fascia, joint capsules, pleura), lymph nodes, CSF and label text.
SKIP_MATERIALS = re.compile(r'^(Fascia|Bursa|Articular capsule|Lymph-\d|LCR|Text|Directions|Movement|Planes|Lines)$')
SKIP_NAMES = re.compile(
    r'(segment of liver|^Pleura|omentum|^Mesocolon|^Meso-appendix|taenia|^Peritoneum|^Falx|^Tentorium)', re.I)

# Muscle materials in Z-Anatomy are colour-coded by function; all of them are just "muscle".
MUSCLE_MATS = re.compile(
    r'^(Abductor|Adductor|Extension|Flexion|External rotation|Internal rotat\w*|Levator|Depressor|'
    r'Orbicularis/Constrictor|Extensor extremities|Extension hand/foot|Flexion hand/foot|Flexion fingers|'
    r'Biarticular|Ingestion|Phonation|Superficial|Trapezius|Masticator|Diaphragm)$')

ORGAN_BY_NAME = [
    (r'liver', 'liver'), (r'gallbladder', 'gallbladder'), (r'kidney|renal pelvis', 'kidney'),
    (r'spleen', 'spleen'), (r'stomach', 'stomach'), (r'lung', 'lung'),
    (r'colon|duodenum|jejunum|ileum|intestin|caecum|cecum|appendix|rectum', 'intestine'),
    (r'tongue', 'tongue'), (r'atrium|ventricle|papillary', 'heart'), (r'leaflet|valve', 'valve'),
    (r'urinary bladder', 'bladder'), (r'pancreas', 'pancreas'), (r'thyroid|parathyroid|suprarenal', 'gland'),
    (r'testis|epididymis|penis|glans', 'genital'), (r'trachea|bronch|larynx|epiglottis', 'airway'),
]


def kind_for(mat_name, obj_name, system):
    """Map one Z-Anatomy material slot to a tissue kind ('' = drop this geometry)."""
    m = mat_name or ''
    low = obj_name.lower()
    if SKIP_MATERIALS.match(m):
        return ''
    if m.startswith('Skin'):
        return 'skin'
    if m == 'Nail':
        return 'nail'
    if m == 'Black':
        return 'hair'
    if m.startswith('Bone') or m.startswith('Suture'):
        return 'bone'
    if m in ('Teeth',):
        return 'tooth'
    if m in ('Teeth-roots', 'Dentine'):
        return 'tooth_root'
    if m == 'Artery':
        return 'artery'
    if m == 'Vein':
        return 'vein'
    if m == 'Pulmonary artery':
        return 'vein'  # carries deoxygenated blood; drawn blue as in atlases
    if m == 'Pulmonary vein':
        return 'artery'
    if m.startswith('Nerve'):
        return 'nerve'
    if m in ('White matter', 'Nucleus', 'Nucleus (efferent fibers)', 'Nucleus (afferent fibers)'):
        return 'brain_white'
    if m in ('Brain', 'Brain-Inner', 'Cerebellum', 'Insula', 'Interlobar sulci') or m.endswith(' lobe'):
        return 'brain'
    if m == 'Eye':
        return 'eye'
    if m == 'Iris':
        return 'iris'
    if m == 'Cornea':
        return 'cornea'
    if m == 'Fat':
        return 'fat'
    for pat, k in ORGAN_BY_NAME:
        if system in ('5: Cardiovascular system', '8: Visceral systems', '6: Lymphoid organs') and re.search(pat, low):
            return k
    if m in ('Tendon', 'Ligament'):
        return 'tendon'
    if m == 'Cartilage':
        return 'cartilage'
    if MUSCLE_MATS.match(m):
        return 'muscle'
    if m.startswith('Lung'):
        return 'lung'
    if m.startswith('Bronchi'):
        return 'airway'
    if m == 'Intestine':
        return 'intestine'
    if m == 'Gallbladder':
        return 'gallbladder'
    if m in ('Gland',):
        return 'gland'
    if m in ('Mucosa',):
        return 'mucosa'
    if m == 'Ductus':
        return 'duct'
    if m.startswith('Organ'):
        return 'organ'
    return 'organ'


def layer_for(system, kinds, obj_name):
    base = SYSTEMS[system]
    if system == '5: Cardiovascular system':
        if 'vein' in kinds and 'artery' not in kinds:
            return 'veins'
        if 'artery' in kinds:
            return 'arteries'
        return 'organs'  # heart chambers and valves
    if system == '7: Nervous system & Sense organs':
        if kinds & {'eye', 'iris', 'cornea', 'mucosa', 'cartilage', 'bone', 'tendon', 'muscle', 'gland'}:
            return 'organs' if kinds & {'eye', 'iris', 'cornea'} else None
    return base


def is_helper(name):
    # Label anchors and group empties: "Acromion.i", "Acromion.j", "Aorta.g", "Foo.t", "Foo.s"
    return bool(re.search(r'\.(i|j|t|s|g|ol|el|o\d*l|e\d*l|o\d*r|e\d*r|or|er)$', name))


def walk(col):
    seen = set()
    stack = [col]
    while stack:
        c = stack.pop()
        for o in c.objects:
            if o.name not in seen:
                seen.add(o.name)
                yield o
        stack.extend(c.children)


# --- collect candidates ---------------------------------------------------------------
scene = bpy.context.scene
candidates = []  # (obj, system)
for top in scene.collection.children:
    if top.name not in SYSTEMS or SYSTEMS[top.name] is None:
        continue
    for o in walk(top):
        if o.type not in ('MESH', 'CURVE') or is_helper(o.name) or SKIP_NAMES.search(o.name):
            continue
        if o.type == 'CURVE' and o.data.bevel_depth <= 0 and not o.data.bevel_object and o.data.extrude <= 0:
            continue
        candidates.append((o, top.name))

# Make everything evaluable, keep subdivision modest and drop solidify (we render double-sided).
for o, _ in candidates:
    o.hide_set(False)
    o.hide_viewport = False
    for m in o.modifiers:
        if m.type == 'SUBSURF':
            base_tris = sum(len(p.vertices) - 2 for p in o.data.polygons) if o.type == 'MESH' else 0
            m.levels = 0 if base_tris > 4000 else min(m.levels, 1)
        elif m.type == 'SOLIDIFY':
            m.show_viewport = False
    if o.type == 'CURVE':
        o.data.resolution_u = min(o.data.resolution_u, 6)
        o.data.bevel_resolution = min(o.data.bevel_resolution, 2)
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()

# --- build export copies ----------------------------------------------------------------
LAYERS = ['skin', 'muscles', 'arteries', 'veins', 'nerves', 'organs', 'skeleton']
out_cols = {}
for l in LAYERS:
    c = bpy.data.collections.new(f'export_{l}')
    scene.collection.children.link(c)
    out_cols[l] = c

kind_mats = {}


def kind_mat(kind):
    if kind not in kind_mats:
        kind_mats[kind] = bpy.data.materials.new(f'k:{kind}')
    return kind_mats[kind]


manifest = {}
stats = {l: [0, 0] for l in LAYERS}
skipped = []
skin_parts = []

for o, system in candidates:
    ev = o.evaluated_get(depsgraph)
    try:
        me = bpy.data.meshes.new_from_object(ev, depsgraph=depsgraph)
    except RuntimeError:
        continue
    if not me or len(me.polygons) == 0:
        if me:
            bpy.data.meshes.remove(me)
        continue
    me.transform(o.matrix_world)

    slot_kinds = [kind_for(m.name if m else '', o.name, system) for m in me.materials] or [kind_for('', o.name, system)]
    kinds = {k for k in slot_kinds if k}
    layer = layer_for(system, kinds, o.name) if kinds else None
    if not layer:
        skipped.append(o.name)
        bpy.data.meshes.remove(me)
        continue

    # Drop faces whose slot maps to '' and swap materials for kind placeholders.
    bm = bmesh.new()
    bm.from_mesh(me)
    drop = [f for f in bm.faces if f.material_index < len(slot_kinds) and not slot_kinds[f.material_index]]
    if drop:
        bmesh.ops.delete(bm, geom=drop, context='FACES')
    bm.to_mesh(me)
    bm.free()
    if len(me.polygons) == 0:
        bpy.data.meshes.remove(me)
        continue
    me.materials.clear()
    uniq = sorted(kinds)
    for k in uniq:
        me.materials.append(kind_mat(k))
    remap = [uniq.index(k) if k else 0 for k in slot_kinds]
    for p in me.polygons:
        p.material_index = remap[p.material_index] if p.material_index < len(remap) else 0
        p.use_smooth = True

    name = o.name
    o.name = name + '~src'  # free the name so the export copy keeps it exactly
    new = bpy.data.objects.new(name, me)
    if layer == 'skin':
        skin_parts.append(new)
        scene.collection.objects.link(new)
        continue
    out_cols[layer].objects.link(new)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    stats[layer][0] += 1
    stats[layer][1] += tris
    manifest[new.name] = layer

# --- skin: weld the region patches into one smooth surface ------------------------------
if skin_parts:
    bpy.ops.object.select_all(action='DESELECT')
    for s in skin_parts:
        s.select_set(True)
    bpy.context.view_layer.objects.active = skin_parts[0]
    bpy.ops.object.join()
    skin = bpy.context.view_layer.objects.active
    skin.name = 'Skin'
    bm = bmesh.new()
    bm.from_mesh(skin.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
    bm.to_mesh(skin.data)
    bm.free()
    sub = skin.modifiers.new('sub', 'SUBSURF')
    sub.levels = 1
    bpy.ops.object.modifier_apply(modifier='sub')
    for p in skin.data.polygons:
        p.use_smooth = True
    scene.collection.objects.unlink(skin)
    out_cols['skin'].objects.link(skin)
    stats['skin'] = [1, sum(len(p.vertices) - 2 for p in skin.data.polygons)]
    manifest['Skin'] = 'skin'

# --- export -----------------------------------------------------------------------------
for l in LAYERS:
    bpy.ops.object.select_all(action='DESELECT')
    objs = list(out_cols[l].objects)
    for o in objs:
        o.select_set(True)
    if not objs:
        continue
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, f'{l}.glb'),
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_texcoords=False,
        export_normals=True,
        export_materials='EXPORT',
        export_extras=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
    )

with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=0, sort_keys=True)
print('EXPORT STATS', json.dumps(stats))
print('SKIPPED', len(skipped), skipped[:80])
