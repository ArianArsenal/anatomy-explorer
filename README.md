# Anatomy Explorer

An interactive 3D human anatomy viewer that runs in the browser. It is built on a realistic, scan-derived
model of the human body: 2,500+ named structures across skin, muscles, arteries, veins, nerves, organs and
the skeleton. You can peel back layers, slice the body open, pull it apart, search for any structure, read
about it, and quiz yourself. A library of 870+ gym exercises shows exactly which muscles each movement works,
and a workout builder shows which muscles a whole session trains and which it misses.

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
  and **Isolate** (hide everything else). For about 80 main muscles it also lists the **action**, plus
  **origin, insertion and nerve** on demand, and links to the exercises that train that muscle.
- **Search.** Instant search across all structures, with keyboard navigation.
- **Exercise library.** 876 exercises with photos, equipment and step-by-step instructions. Search by tag
  ("dumbbell chest", "bar squat") or filter by body part and equipment. Selecting one highlights its primary
  and secondary muscles on the body. Star favourites, and see recently opened exercises.
- **Workout builder.** Save workouts with sets per exercise. A heatmap colours every muscle group by how much
  the workout trains it and lists the groups it misses.
- **Cross-sections.** Cut the body along the coronal, sagittal or axial plane and slide the cut through it.
- **Exploded view.** A slider pulls every part away from the body's centre, with outer layers moving furthest.
- **Quiz mode.** "Find the ___" questions over all visible layers or a single layer, or "Which muscle does
  this exercise mainly work?", with hints, skips, score and streaks.
- **Shareable links.** The address bar always describes the current view (camera, layers, selection, slice,
  explode, exercise or workout), so copying the link reopens exactly what you see.
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
| **Muscle facts: action, origin, insertion, nerve** | **Exercise quiz: "Which muscle does this work?"** |
| ![Muscle info card](docs/screenshots/muscle-info.png) | ![Exercise quiz](docs/screenshots/exercise-quiz.png) |

### Cross-sections and exploded view

Use **Cross-section** in the sidebar's View section to cut the body, then drag the slider to move the cut and
**⇄ Flip** to keep the other half. The camera turns to face the cut, and cut tissue is drawn solid.
**Exploded view** pulls the parts apart; picking, focus and the quiz all follow the moved parts.

| Sagittal (left / right) | Axial (top / bottom) |
| :---: | :---: |
| ![Sagittal section](docs/screenshots/slice-sagittal.png) | ![Axial section](docs/screenshots/slice-axial.png) |
| **Coronal (front / back), muscles and skeleton** | **Exploded view** |
| ![Coronal section](docs/screenshots/slice-coronal.png) | ![Exploded view](docs/screenshots/exploded.png) |

## Exercise library

Open the **🏋 Exercises** panel on the right (it starts open on wide screens).

- **Search with any mix of tags:** exercise name, equipment (`dumbbell`, `barbell`, `bar`, `cable`,
  `kettlebell`…), muscle (`chest`, `hamstrings`…), level (`beginner`) or movement (`push`, `pull`).
  All words must match, and exercises with those words in their name come first.
- **Filter** by body part (Chest, Back, Shoulders, Arms, Core, Legs, Neck) and by equipment.
- **Select an exercise** to see:
  - its start and end photos, which alternate like a short animation;
  - level and type tags;
  - its primary and secondary muscles;
  - numbered instructions.
- **On the body:**
  - Primary muscles glow **red-orange**, secondary muscles **yellow**, and the rest turn neutral grey.
  - The camera turns to the front or back, whichever side the target muscles are on.
  - Click a muscle chip to zoom to that muscle.
  - When the target lies under other muscles (for example the erector spinae under the lats in a deadlift),
    the covering muscles are hidden while it is selected.
- **⚙ Settings:** hide the photos, animation, tags, muscle list, instructions or list thumbnails to keep the
  panel uncluttered. Your choices are saved in the browser.
- **From the body to exercises:** click a muscle, then **Exercises for biceps →** in the info card. The library
  is filtered to that muscle group, with exercises that mainly target it listed first.
- **Favourites and recents:** star exercises with ☆ to keep them in the **Favourites** tab. The last 12
  exercises you opened appear at the top of the library.

### Workouts

Add exercises with **+** (in the list or the detail view), then open the **Workout** tab.

- Change the number of sets, drag rows to reorder them, and keep several named workouts (new, duplicate,
  delete). Workouts are saved in the browser.
- **🔥 Show heatmap on the body** colours each muscle group from yellow (light) to deep red (heavy). Groups the
  workout doesn't train turn blue. A primary muscle counts each set fully, a secondary muscle counts half.
- Below the list, every trained group is ranked by sets. Click **Not trained** groups to find exercises for
  them.

Exercise data and photos come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public
domain). The exercise list ships with the app, and the photos load from GitHub when you view them.

| Browse by body part | Search by tags |
| :---: | :---: |
| ![Exercise list](docs/screenshots/exercises-list.png) | ![Search "dumbbell chest"](docs/screenshots/exercises-search.png) |
| **Bench press: chest primary, shoulders and triceps secondary** | **Deadlift: covering muscles hidden to show the erector spinae** |
| ![Bench press](docs/screenshots/exercise-bench-press.png) | ![Deadlift](docs/screenshots/exercise-deadlift.png) |
| **Customisable detail view** | **Click a muscle to find exercises for it** |
| ![Exercise settings](docs/screenshots/exercise-settings.png) | ![Muscle to exercises](docs/screenshots/muscle-to-exercises.png) |
| **Workout heatmap (front)** | **Workout heatmap (back)** |
| ![Workout heatmap](docs/screenshots/workout-heatmap.png) | ![Workout heatmap, back](docs/screenshots/workout-heatmap-back.png) |

## Controls

| Action | How |
| --- | --- |
| Rotate | Left-drag |
| Zoom | Scroll wheel (eased smoothly) |
| Pan | Right-drag |
| Identify a part | Hover over it |
| Select a part | Click it |
| Focus the selected part | Double-click, **F**, or the **Focus** button |
| Leave isolation / clear selection | **Esc** |
| Show only one layer | Double-click the layer name |
| Camera presets | **Front**, **Back**, **Left**, **Right**, **Reset** |
| Exercise library | **🏋 Exercises** button (top right) |
| Cross-section / explode | **Cross-section** buttons and **Exploded view** slider under View |
| Share the current view | **🔗 Copy link to this view**, or copy the address bar |

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
| `npm run exercises` | Re-downloads the exercise list from free-exercise-db into `public/data/` |

## Project structure

```
├── index.html               App shell (sidebar, quiz bar, info panel, exercise panel)
├── public/
│   ├── models/              One compressed GLB per layer (~15 MB total)
│   ├── data/exercises.json  876 exercises (free-exercise-db)
│   └── env/                 Studio HDR environment map
├── src/
│   ├── main.js              Entry point: wires UI modules and loads the model
│   ├── app.js               Central state: layers, selection, isolation, highlights, slice, explode
│   ├── scene.js             Renderer, camera, lighting, on-demand render loop
│   ├── body/
│   │   ├── loadBody.js      Loads the layer GLBs and packs ~2,500 parts into ~40 BatchedMeshes
│   │   └── materials.js     Tissue materials (bone, muscle, skin, liver, …) and the slice plane
│   ├── data/
│   │   ├── structures.js    Curated descriptions and name aliases
│   │   ├── muscleInfo.js    Origin, insertion, action and nerve of ~80 main muscles
│   │   ├── exercises.js     Loads the exercise library (shared by the panel, quiz and links)
│   │   └── exerciseMuscles.js  Exercise muscle groups ↔ body regions and model parts
│   └── ui/                  Layers, picking, search, info panel, quiz, exercise panel,
│                            view tools (slice / explode) and share links
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
- **Exercises:** [free-exercise-db](https://github.com/yuhonas/free-exercise-db) by yuhonas, released into the
  public domain ([Unlicense](https://unlicense.org/)). This covers the exercise data and photos.
- **Studio lighting:** [studio_small_09](https://polyhaven.com/a/studio_small_09) from Poly Haven, CC0.

See [`CREDITS.md`](CREDITS.md) for details.
