# Anatomy Explorer

An interactive 3D human anatomy viewer that runs in the browser. It is built on a realistic, scan-derived
model of the human body: 2,500+ named structures across skin, muscles, arteries, veins, nerves, organs and
the skeleton. You can peel back layers, search for any structure, read about it, and quiz yourself.

![All layers](docs/screenshots/all-layers.png)

## Features

- **Realistic anatomy.** It uses the [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy) model,
  which comes from the [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/) scan dataset. The shapes
  are real anatomy, not hand-made approximations.
- **7 layers.** Skin, muscles, arteries, veins, nervous system, organs and skeleton. Each layer can be shown,
  hidden or faded with its own opacity slider.
- **Presets.** One click gives you *All layers*, *Skin*, *Muscles*, *Skeleton*, *Circulation*, *Nervous*,
  *Organs* or *X-ray*.
- **2,500+ named parts.** Hover to see a name, and click to select a part. Left and right sides are told apart
  (for example *Left short head of biceps brachii*).
- **Info panel.** Shows each part's body system and a short description, with **Focus** (fly the camera to it)
  and **Isolate** (hide everything else).
- **Search.** Instant search across all structures, with keyboard navigation.
- **Quiz mode.** "Find the ___" questions over all visible layers or a single layer, with hints, skips, score
  and streaks.
- **Studio rendering.** Physically based tissue materials (wet muscle, glossy cartilage, matte bone), lighting
  from a photographic HDR environment, and soft contact shadows.

## Screenshots

### Layers

| Skin | Muscles |
| :---: | :---: |
| ![Skin](docs/screenshots/skin.png) | ![Muscles](docs/screenshots/muscles.png) |
| **Skeleton** | **Circulation** |
| ![Skeleton](docs/screenshots/skeleton.png) | ![Circulation](docs/screenshots/circulation.png) |
| **Nervous system** | **X-ray** |
| ![Nervous system](docs/screenshots/nervous.png) | ![X-ray](docs/screenshots/x-ray.png) |

### Close-ups

| Organs | Muscles |
| :---: | :---: |
| ![Organs](docs/screenshots/organs.png) | ![Muscle close-up](docs/screenshots/muscles-closeup.png) |
| **Brain & cranial nerves** | **Face** |
| ![Brain](docs/screenshots/brain.png) | ![Face](docs/screenshots/face.png) |

### Interaction

| Hover to identify | Search & info panel |
| :---: | :---: |
| ![Hover tooltip](docs/screenshots/hover.png) | ![Search and info panel](docs/screenshots/search-info.png) |
| **Isolate a structure** | **Quiz with hint** |
| ![Isolate](docs/screenshots/isolate.png) | ![Quiz](docs/screenshots/quiz.png) |

## Controls

| Action | How |
| --- | --- |
| Rotate | Left-drag |
| Zoom | Scroll wheel |
| Pan | Right-drag |
| Identify a part | Hover over it |
| Select a part | Click it |
| Focus the selected part | Double-click, **F**, or the **Focus** button |
| Leave isolation / clear selection | **Esc** |
| Show only one layer | Double-click the layer name |
| Camera presets | **Front**, **Back**, **Left**, **Right**, **Reset** |

## Getting started

You need [Node.js](https://nodejs.org/) 20.19 or newer.

```bash
git clone https://github.com/ArianArsenal/anatomy-explorer.git
cd anatomy-explorer
npm install
npm run dev
```

Then open the URL that Vite prints (usually http://localhost:5173).

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server with hot reload |
| `npm run build` | Makes a production build in `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run models -- <rawDir>` | Re-optimizes the 3D model from a raw Blender export (see below) |

## Project structure

```
├── index.html               App shell (sidebar, quiz bar, info panel)
├── public/
│   ├── models/              One compressed GLB per layer (~15 MB total)
│   └── env/                 Studio HDR environment map
├── src/
│   ├── main.js              Entry point: wires UI modules and loads the model
│   ├── app.js               Central state: layers, selection, isolation, highlights
│   ├── scene.js             Renderer, camera, lighting, on-demand render loop
│   ├── body/
│   │   ├── loadBody.js      Loads the layer GLBs and packs ~2,500 parts into ~40 BatchedMeshes
│   │   └── materials.js     Tissue materials (bone, muscle, skin, liver, …)
│   ├── data/structures.js   Curated descriptions and name aliases
│   └── ui/                  Layers, picking, search, info panel, quiz
├── tools/                   Model conversion pipeline (Blender + gltf-transform)
└── docs/screenshots/        Images used in this README
```

## How the 3D model is built

The model files in `public/models/` are generated from the Z-Anatomy Blender file in two steps:

1. **`tools/export_zanatomy.py`** runs inside Blender.
   - It sorts every object into one of the 7 layers and gives each one a tissue type (bone, muscle, artery, …).
   - It turns vessel and nerve curves into meshes and merges the skin patches into one smooth surface.
   - It leaves out sheets that would hide the anatomy underneath (fascia, joint capsules, pleura).
2. **`tools/optimize.mjs`** simplifies and compresses each layer with
   [glTF-Transform](https://gltf-transform.dev/) and [meshoptimizer](https://github.com/zeux/meshoptimizer).
   This takes about 7M triangles and 128 MB down to about 1.8M triangles and 15 MB.

Step-by-step instructions are in [`tools/README.md`](tools/README.md).

## Tech stack

- [three.js](https://threejs.org/): WebGL rendering, glTF loading, orbit controls
- [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh): fast mouse picking inside the batched meshes
- [Vite](https://vite.dev/): dev server and bundler
- [Blender](https://www.blender.org/) + [glTF-Transform](https://gltf-transform.dev/): offline model conversion

## Credits & license

- **3D anatomy model:** [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy) by Gauthier Kervyn and
  Marcin Zielinski, licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). It is derived from
  **BodyParts3D**, © The Database Center for Life Science, licensed
  [CC BY-SA 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/). The converted model files in this
  repository are shared under the same CC BY-SA 4.0 license.
- **Studio lighting:** [studio_small_09](https://polyhaven.com/a/studio_small_09) from Poly Haven, CC0.

See [`CREDITS.md`](CREDITS.md) for details.
