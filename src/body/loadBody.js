import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { makeMaterial, depthPrepassMaterial } from './materials.js';
import { registerModelName, slugify } from '../data/structures.js';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/** Outermost layer first; `order` drives render order so translucent outer layers draw after inner ones. */
export const LAYERS = [
  { id: 'skin', name: 'Skin', swatch: '#c79377', order: 7 },
  { id: 'muscles', name: 'Muscles', swatch: '#962a29', order: 6 },
  { id: 'arteries', name: 'Arteries', swatch: '#b3262b', order: 5 },
  { id: 'veins', name: 'Veins', swatch: '#34478f', order: 4 },
  { id: 'nerves', name: 'Nervous system', swatch: '#ead8a0', order: 3 },
  { id: 'organs', name: 'Organs', swatch: '#c98377', order: 2 },
  { id: 'skeleton', name: 'Skeleton', swatch: '#e2d4b6', order: 1 },
];

export const partKey = (id, side) => (side > 0 ? `${id}:L` : side < 0 ? `${id}:R` : id);

/** "Femur.l" → { id: 'femur', side: 1, name: 'Femur' } (Z-Anatomy marks the body's left/right with .l/.r). */
function parseName(raw) {
  const m = raw.match(/^(.*)\.([lr])$/);
  const name = (m ? m[1] : raw).trim();
  return { id: slugify(name), side: m ? (m[2] === 'l' ? 1 : -1) : 0, name };
}

const MODEL_URL = `${import.meta.env.BASE_URL}models/`;

/**
 * Loads the scanned anatomy model (Z-Anatomy / BodyParts3D), one GLB per layer.
 * Resolves to { root, groups, parts, P: { H }, dispose } where parts maps a key ("femur:L")
 * to { key, id, side, layer, meshes }.
 */
export async function loadBody(onProgress = () => {}) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const root = new THREE.Group();
  root.name = 'body';
  const groups = {};
  for (const l of LAYERS) {
    const g = new THREE.Group();
    g.name = l.id;
    groups[l.id] = g;
    root.add(g);
  }
  const parts = new Map();
  const order = Object.fromEntries(LAYERS.map((l) => [l.id, l.order]));

  const progress = Object.fromEntries(LAYERS.map((l) => [l.id, { loaded: 0, total: 0 }]));
  const report = () => {
    let loaded = 0;
    let total = 0;
    for (const p of Object.values(progress)) {
      loaded += p.loaded;
      total += p.total;
    }
    onProgress(total ? loaded / total : 0);
  };

  const registerMesh = (mesh, layer, info) => {
    const key = partKey(info.id, info.side);
    mesh.userData = { id: info.id, side: info.side, layer, key };
    mesh.renderOrder = order[layer] * 2 + 1;
    mesh.castShadow = true;
    mesh.geometry.computeBoundingBox(); // loader bounds aren't reliable for quantized attributes
    mesh.geometry.computeBoundsTree();

    const pre = new THREE.Mesh(mesh.geometry, depthPrepassMaterial);
    pre.renderOrder = order[layer] * 2;
    pre.visible = false;
    pre.raycast = () => {};
    pre.userData.isPrepass = true;
    mesh.userData.prepass = pre;

    groups[layer].add(mesh, pre);
    if (!parts.has(key)) parts.set(key, { key, id: info.id, side: info.side, layer, meshes: [] });
    parts.get(key).meshes.push(mesh);
  };

  const loadLayer = async (layer) => {
    const gltf = await loader.loadAsync(`${MODEL_URL}${layer}.glb`, (e) => {
      progress[layer] = { loaded: e.loaded, total: e.total || e.loaded };
      report();
    });
    const json = gltf.parser.json;
    gltf.scene.updateMatrixWorld(true);
    for (const node of [...gltf.scene.children]) {
      // GLTFLoader sanitises node names (drops the ".l"/".r"), so read the original from the JSON.
      const ref = gltf.parser.associations.get(node);
      const raw = ref?.nodes !== undefined ? json.nodes[ref.nodes].name : node.name;
      const info = parseName(raw);
      registerModelName(info.id, info.name);
      const meshes = [];
      node.traverse((o) => o.isMesh && meshes.push(o));
      for (const mesh of meshes) {
        const kind = (mesh.material?.name ?? '').replace(/^k:/, '');
        mesh.material?.dispose();
        mesh.material = makeMaterial(kind, info.id);
        mesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
        mesh.removeFromParent();
        registerMesh(mesh, layer, info);
      }
    }
  };

  await Promise.all(LAYERS.map((l) => loadLayer(l.id)));

  // Stand the body on the floor, centred, about 1.75 m tall whatever the source units.
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const ref = parts.get('skin')?.meshes ?? [...parts.values()].flatMap((p) => p.meshes);
  for (const m of ref) box.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));
  const size = box.getSize(new THREE.Vector3());
  const scale = size.y > 1.2 && size.y < 2.3 ? 1 : 1.75 / size.y;
  root.scale.setScalar(scale);
  const c = box.getCenter(new THREE.Vector3());
  root.position.set(-c.x * scale, -box.min.y * scale, -c.z * scale);
  root.updateMatrixWorld(true);

  return {
    root,
    groups,
    parts,
    P: { H: size.y * scale },
    dispose() {
      root.traverse((o) => {
        if (o.isMesh && !o.userData.isPrepass) {
          o.geometry.disposeBoundsTree();
          o.geometry.dispose();
          o.material.dispose();
        }
      });
      root.removeFromParent();
    },
  };
}
