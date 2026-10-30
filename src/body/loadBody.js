import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { acceleratedRaycast, computeBatchedBoundsTree, disposeBatchedBoundsTree } from 'three-mesh-bvh';
import { makeMaterial, kindColor, kindAlpha, depthPrepassMaterial } from './materials.js';
import { registerModelName, slugify } from '../data/structures.js';

THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;
THREE.BatchedMesh.prototype.disposeBoundsTree = disposeBatchedBoundsTree;
THREE.BatchedMesh.prototype.raycast = acceleratedRaycast;
THREE.Mesh.prototype.raycast = acceleratedRaycast; // the batched raycast tests each instance through a Mesh

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

let insideOutCount = 0;

/**
 * Groups a mesh's triangles into connected pieces (triangles that share a vertex).
 * Returns, for each triangle, the id of its piece.
 */
function trianglePieces(index, vertexCount) {
  const parent = new Int32Array(vertexCount).map((_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) x = parent[x] = parent[parent[x]];
    return x;
  };
  for (let i = 0; i < index.length; i += 3) {
    const a = find(index[i]);
    parent[find(index[i + 1])] = a;
    parent[find(index[i + 2])] = a;
  }
  const piece = new Int32Array(index.length / 3);
  for (let t = 0; t < piece.length; t++) piece[t] = find(index[t * 3]);
  return piece;
}

/**
 * Turns inside-out pieces of a mesh right side out. Many parts on the body's left side were mirrored
 * in the source model and face inward (triangles and normals both); some, like the skin, were then
 * merged with correct right-side halves. Both sides are drawn, so that's invisible, but the slicer
 * shades back faces as cut tissue. A piece is inside-out when its signed volume, measured from its own
 * centre, is negative. Returns how many pieces were flipped.
 */
function fixInsideOut(pos, nor, index) {
  const piece = trianglePieces(index, pos.length / 3);
  const centre = new Map(); // piece -> [sx, sy, sz, n]
  for (let t = 0; t < piece.length; t++) {
    const c = centre.get(piece[t]) ?? [0, 0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const v = index[t * 3 + k] * 3;
      c[0] += pos[v];
      c[1] += pos[v + 1];
      c[2] += pos[v + 2];
    }
    c[3] += 3;
    centre.set(piece[t], c);
  }
  const volume = new Map();
  for (let t = 0; t < piece.length; t++) {
    const [sx, sy, sz, n] = centre.get(piece[t]);
    const cx = sx / n, cy = sy / n, cz = sz / n;
    const a = index[t * 3] * 3, b = index[t * 3 + 1] * 3, d = index[t * 3 + 2] * 3;
    const ax = pos[a] - cx, ay = pos[a + 1] - cy, az = pos[a + 2] - cz;
    const bx = pos[b] - cx, by = pos[b + 1] - cy, bz = pos[b + 2] - cz;
    const dx = pos[d] - cx, dy = pos[d + 1] - cy, dz = pos[d + 2] - cz;
    const v = ax * (by * dz - bz * dy) - ay * (bx * dz - bz * dx) + az * (bx * dy - by * dx);
    volume.set(piece[t], (volume.get(piece[t]) ?? 0) + v);
  }
  const flip = new Set([...volume].filter(([, v]) => v < 0).map(([p]) => p));
  if (!flip.size) return 0;
  const flipped = new Uint8Array(pos.length / 3);
  for (let t = 0; t < piece.length; t++) {
    if (!flip.has(piece[t])) continue;
    const i = t * 3;
    [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
    for (let k = 0; k < 3; k++) flipped[index[i + k]] = 1;
  }
  for (let v = 0; v < flipped.length; v++) {
    if (flipped[v]) for (let k = 0; k < 3; k++) nor[v * 3 + k] = -nor[v * 3 + k];
  }
  return flip.size;
}

/**
 * Copy of a loaded primitive in plain float32 world space. The GLBs store quantized vertices
 * that rely on their node transform; BatchedMesh needs identical attribute layouts and no transforms.
 */
function bakeGeometry(mesh) {
  const src = mesh.geometry;
  const n = src.attributes.position.count;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const sp = src.attributes.position;
  const sn = src.attributes.normal;
  for (let i = 0; i < n; i++) {
    pos[i * 3] = sp.getX(i);
    pos[i * 3 + 1] = sp.getY(i);
    pos[i * 3 + 2] = sp.getZ(i);
    if (sn) {
      nor[i * 3] = sn.getX(i);
      nor[i * 3 + 1] = sn.getY(i);
      nor[i * 3 + 2] = sn.getZ(i);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  const index = src.index ? Array.from(src.index.array) : [...Array(n).keys()];
  geo.setIndex(index);
  geo.applyMatrix4(mesh.matrixWorld);
  if (sn) {
    insideOutCount += fixInsideOut(geo.attributes.position.array, geo.attributes.normal.array, index);
    geo.setIndex(index);
  }
  if (!sn) geo.computeVertexNormals();
  return geo;
}

const MODEL_URL = `${import.meta.env.BASE_URL}models/`;

/**
 * Loads the scanned anatomy model (Z-Anatomy / BodyParts3D), one GLB per layer, and packs it into
 * one BatchedMesh per (layer, tissue kind): a few dozen draw calls for ~2,500 parts.
 *
 * Resolves to { root, groups, batches, parts, P: { H }, dispose } where parts maps a key ("femur:L")
 * to { key, id, side, layer, items: [{ batch, instanceId }], box }.
 */
export async function loadBody(onProgress = () => {}) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
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

  // 1. Load every layer into flat entries: { layer, kind, info, geo }.
  const loadLayer = async (layer) => {
    const gltf = await loader.loadAsync(`${MODEL_URL}${layer}.glb`, (e) => {
      progress[layer] = { loaded: e.loaded, total: e.total || e.loaded };
      report();
    });
    const json = gltf.parser.json;
    gltf.scene.updateMatrixWorld(true);
    const entries = [];
    for (const node of gltf.scene.children) {
      // GLTFLoader sanitises node names (drops the ".l"/".r"), so read the original from the JSON.
      const ref = gltf.parser.associations.get(node);
      const raw = ref?.nodes !== undefined ? json.nodes[ref.nodes].name : node.name;
      const info = parseName(raw);
      registerModelName(info.id, info.name);
      node.traverse((o) => {
        if (!o.isMesh) return;
        entries.push({ layer, kind: (o.material?.name ?? '').replace(/^k:/, ''), info, geo: bakeGeometry(o) });
        o.geometry.dispose();
        o.material?.dispose();
      });
    }
    return entries;
  };
  insideOutCount = 0;
  const entries = (await Promise.all(LAYERS.map((l) => loadLayer(l.id)))).flat();
  console.debug(`${insideOutCount} inside-out pieces turned right side out`);

  // 2. Stand the body on the floor, centred, about 1.75 m tall whatever the source units.
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  const ref = entries.some((e) => e.layer === 'skin') ? entries.filter((e) => e.layer === 'skin') : entries;
  for (const e of ref) {
    e.geo.computeBoundingBox();
    box.union(e.geo.boundingBox);
  }
  const size = box.getSize(new THREE.Vector3());
  const scale = size.y > 1.2 && size.y < 2.3 ? 1 : 1.75 / size.y;
  const c = box.getCenter(new THREE.Vector3());
  const toFloor = new THREE.Matrix4().makeScale(scale, scale, scale)
    .premultiply(new THREE.Matrix4().makeTranslation(-c.x * scale, -box.min.y * scale, -c.z * scale));

  // 3. One BatchedMesh per (layer, kind).
  const root = new THREE.Group();
  root.name = 'body';
  const groups = {};
  for (const l of LAYERS) {
    groups[l.id] = new THREE.Group();
    groups[l.id].name = l.id;
    root.add(groups[l.id]);
  }
  const order = Object.fromEntries(LAYERS.map((l) => [l.id, l.order]));
  const buckets = new Map();
  for (const e of entries) {
    const k = `${e.layer}/${e.kind}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(e);
  }

  const parts = new Map();
  const batches = [];
  const color = new THREE.Color();
  for (const list of buckets.values()) {
    const { layer, kind } = list[0];
    let verts = 0;
    let indices = 0;
    for (const e of list) {
      e.geo.applyMatrix4(toFloor);
      verts += e.geo.attributes.position.count;
      indices += e.geo.index.count;
    }
    const batch = new THREE.BatchedMesh(list.length, verts, indices, makeMaterial(kind));
    batch.name = `${layer}/${kind}`;
    batch.renderOrder = order[layer] * 2 + 1;
    // Only the outer silhouettes reach the floor shadow; inner layers would just make it costlier.
    batch.castShadow = layer === 'skin' || layer === 'muscles' || layer === 'skeleton';
    batch.userData = { layer, kind, alpha: kindAlpha(kind), keys: [], baseColors: [] };

    for (const e of list) {
      const instanceId = batch.addInstance(batch.addGeometry(e.geo));
      const key = partKey(e.info.id, e.info.side);
      kindColor(kind, e.info.id, color);
      batch.setColorAt(instanceId, color);
      batch.userData.keys[instanceId] = key;
      batch.userData.baseColors[instanceId] = color.clone();

      if (!parts.has(key)) {
        parts.set(key, { key, id: e.info.id, side: e.info.side, layer, items: [], box: new THREE.Box3() });
      }
      const part = parts.get(key);
      part.items.push({ batch, instanceId });
      e.geo.computeBoundingBox();
      part.box.union(e.geo.boundingBox);
      e.geo.dispose();
    }
    batch.computeBoundsTree();

    // Depth-only copy drawn just before the batch when its layer is translucent, so only the nearest
    // surface gets shaded. It shares the batch's buffers, which already hold world-space vertices.
    const prepass = new THREE.Mesh(batch.geometry, depthPrepassMaterial);
    prepass.renderOrder = order[layer] * 2;
    prepass.visible = false;
    prepass.raycast = () => {};
    prepass.frustumCulled = false;
    batch.userData.prepass = prepass;

    groups[layer].add(batch, prepass);
    batches.push(batch);
  }

  return {
    root,
    groups,
    batches,
    parts,
    P: { H: size.y * scale },
    dispose() {
      for (const b of batches) {
        b.disposeBoundsTree();
        b.material.dispose();
        b.dispose();
      }
      root.removeFromParent();
    },
  };
}
