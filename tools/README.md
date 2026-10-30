# Rebuilding the 3D model

The app loads `public/models/<layer>.glb` (skin, muscles, arteries, veins, nerves, organs, skeleton).
They are generated from the Z-Anatomy Blender file. Run these steps only to change what gets exported.

1. Download the source model (about 90 MB):
   `git clone --depth 1 https://github.com/Z-Anatomy/Models-of-human-anatomy` and unzip
   `Z-Anatomy.zip`. You need `Z-Anatomy/Startup.blend` (about 290 MB).
2. Get Blender 4.2 LTS (the portable zip is fine). On Windows, put it on a **short path**,
   such as `%TEMP%\zbl\b42`. Deep paths go over the 260-character limit, and the glTF add-on fails to import.
3. Export the raw layers (takes about 2 minutes):
   ```
   blender -b --factory-startup path/to/Startup.blend --python tools/export_zanatomy.py -- path/to/raw
   ```
   The log ends with `EXPORT STATS` (parts and triangles per layer) and `SKIPPED`. Fascia, bursae, joint
   capsules, lymph nodes, pleura and omentum are left out on purpose, because they hide the structures underneath.
4. Simplify and compress into the app:
   ```
   npm run models -- path/to/raw
   ```
   The `BUDGET` table in `tools/optimize.mjs` sets triangle counts per layer.

`tools/inspect_blend.py` dumps the .blend's collections, objects and materials. It is useful when changing the
classification in `export_zanatomy.py`.
