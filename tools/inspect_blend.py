"""Dump the Z-Anatomy .blend: collection tree (top two levels) and every renderable object per top-level system.
Usage: blender -b Startup.blend --python tools/inspect_blend.py -- out.txt"""
import sys
import bpy

out = open(sys.argv[sys.argv.index('--') + 1], 'w', encoding='utf-8')


def all_objects(col):
    seen = set()
    stack = [col]
    while stack:
        c = stack.pop()
        for o in c.objects:
            if o.name not in seen:
                seen.add(o.name)
                yield o
        stack.extend(c.children)


def tri_count(o):
    if o.type != 'MESH':
        return 0
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


for top in bpy.context.scene.collection.children:
    if top.name.startswith('Bonus'):
        continue
    out.write(f'\n===== {top.name} =====\n')
    for c in top.children:
        out.write(f'  [sub] {c.name}\n')
    for o in sorted(all_objects(top), key=lambda o: o.name):
        if o.type not in ('MESH', 'CURVE'):
            continue
        extra = ''
        if o.type == 'CURVE':
            extra = f' bevel={o.data.bevel_depth:.4f} bevobj={bool(o.data.bevel_object)} ext={o.data.extrude:.4f}'
        mats = [m.name for m in o.data.materials if m] if hasattr(o.data, 'materials') else []
        out.write(f'  {o.type[0]} {o.name!r} tris={tri_count(o)} hid={o.hide_get()}/{o.hide_render}/{o.hide_viewport} '
                  f'par={o.parent.name if o.parent else None} mods={[m.type for m in o.modifiers]} mats={mats[:2]}{extra}\n')
out.write(f"\nunit scale {bpy.context.scene.unit_settings.scale_length}\n")
out.close()
