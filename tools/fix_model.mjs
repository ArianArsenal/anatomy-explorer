// Corrects the optimized model in place (run after tools/optimize.mjs; safe to run again):
//  1. Removes the pubic hair from the skin layer (hair pieces below the head).
//  2. Turns inside-out pieces right side out. Many parts on the body's left side were mirrored in the
//     source model and face inward, triangles and normals both. Double-sided rendering hides that, but
//     the cross-section slicer shades back faces as cut tissue.
//     A piece is inside-out when rays shot from its surface along its normals cross the rest of its
//     mesh an odd number of times (they point into the solid instead of out of it) and rays shot the
//     other way an even number.
// Usage: node tools/fix_model.mjs [modelsDir=public/models]
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const dir = process.argv[2] ?? 'public/models';
const LAYERS = ['skin', 'muscles', 'arteries', 'veins', 'nerves', 'organs', 'skeleton'];
const SAMPLES = 9; // rays per piece; the majority decides

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

/** For each triangle, the id of the connected piece (triangles sharing a vertex) it belongs to. */
function pieces(index, vertexCount) {
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
  const out = new Int32Array(index.length / 3);
  for (let t = 0; t < out.length; t++) out[t] = find(index[t * 3]);
  return out;
}

/** Give a primitive its own copy of an accessor before editing it, if other primitives share it. */
function own(prim, accessor, set) {
  if (accessor.listParents().filter((p) => p.propertyType === 'Primitive').length > 1) {
    const copy = accessor.clone();
    set(copy);
    return copy;
  }
  return accessor;
}

function worldPositions(node, prim) {
  const pos = prim.getAttribute('POSITION');
  const m = new THREE.Matrix4().fromArray(node.getWorldMatrix());
  const out = new Float32Array(pos.getCount() * 3);
  const v = new THREE.Vector3();
  const el = [];
  for (let i = 0; i < pos.getCount(); i++) {
    pos.getElement(i, el);
    v.set(el[0], el[1], el[2]).applyMatrix4(m).toArray(out, i * 3);
  }
  return out;
}

/** Drop the hair pieces that lie below the head (the pubic hair). Returns triangles removed. */
function removeBodyHair(node, prim) {
  const index = prim.getIndices().getArray();
  const pos = worldPositions(node, prim);
  const piece = pieces(index, pos.length / 3);
  let ymax = -Infinity;
  for (let i = 1; i < pos.length; i += 3) ymax = Math.max(ymax, pos[i]);
  const top = new Map(); // piece -> highest point
  for (let t = 0; t < piece.length; t++) {
    for (let k = 0; k < 3; k++) top.set(piece[t], Math.max(top.get(piece[t]) ?? -Infinity, pos[index[t * 3 + k] * 3 + 1]));
  }
  const keep = [];
  for (let t = 0; t < piece.length; t++) {
    if (top.get(piece[t]) > ymax * 0.75) keep.push(index[t * 3], index[t * 3 + 1], index[t * 3 + 2]);
  }
  const removed = piece.length - keep.length / 3;
  if (removed) {
    const acc = own(prim, prim.getIndices(), (a) => prim.setIndices(a));
    acc.setArray(new index.constructor(keep));
  }
  return removed;
}

/** Flip the pieces of a primitive that face inward. Returns [pieces flipped, pieces total]. */
function fixWinding(node, prim) {
  if (!prim.getIndices() || !prim.getAttribute('NORMAL')) return [0, 0];
  const index = prim.getIndices().getArray();
  const pos = worldPositions(node, prim);
  const piece = pieces(index, pos.length / 3);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(index), 1));
  const bvh = new MeshBVH(geo);

  const byPiece = new Map();
  for (let t = 0; t < piece.length; t++) {
    if (!byPiece.has(piece[t])) byPiece.set(piece[t], []);
    byPiece.get(piece[t]).push(t);
  }
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const ray = new THREE.Ray();
  const flip = new Set();
  for (const [id, tris] of byPiece) {
    // A sample counts only when the rays both ways agree: odd crossings along the normal and even
    // against it means inward, the reverse means outward. Open sheets give no clear answer.
    let inward = 0;
    let outward = 0;
    let votes = 0;
    const step = Math.max(1, Math.floor(tris.length / SAMPLES));
    for (let s = 0; s < tris.length && votes < SAMPLES; s += step) {
      const t = tris[s];
      a.fromArray(pos, index[t * 3] * 3);
      b.fromArray(pos, index[t * 3 + 1] * 3);
      c.fromArray(pos, index[t * 3 + 2] * 3);
      n.subVectors(c, b).cross(a.clone().sub(b)); // (c-b)x(a-b) = (b-a)x(c-a): the winding's normal
      if (n.lengthSq() < 1e-20) continue;
      n.normalize();
      const centre = a.clone().add(b).add(c).divideScalar(3);
      const crossings = (dir) => {
        ray.origin.copy(centre).addScaledVector(dir, 1e-5);
        ray.direction.copy(dir);
        return bvh.raycast(ray, THREE.DoubleSide).filter((h) => h.distance > 1e-5).length % 2;
      };
      const along = crossings(n);
      const against = crossings(n.clone().negate());
      votes++;
      if (along === 1 && against === 0) inward++;
      else if (along === 0 && against === 1) outward++;
    }
    if (inward > outward && inward * 2 >= votes) flip.add(id);
  }
  if (!flip.size) return [0, byPiece.size];

  const idxAcc = own(prim, prim.getIndices(), (x) => prim.setIndices(x));
  const norAcc = own(prim, prim.getAttribute('NORMAL'), (x) => prim.setAttribute('NORMAL', x));
  const idx = idxAcc.getArray().slice();
  const nor = norAcc.getArray().slice();
  const touched = new Uint8Array(pos.length / 3);
  for (let t = 0; t < piece.length; t++) {
    if (!flip.has(piece[t])) continue;
    [idx[t * 3 + 1], idx[t * 3 + 2]] = [idx[t * 3 + 2], idx[t * 3 + 1]];
    for (let k = 0; k < 3; k++) touched[idx[t * 3 + k]] = 1;
  }
  for (let v = 0; v < touched.length; v++) {
    if (touched[v]) for (let k = 0; k < 3; k++) nor[v * 3 + k] = -nor[v * 3 + k];
  }
  idxAcc.setArray(idx);
  norAcc.setArray(nor);
  return [flip.size, byPiece.size];
}

for (const layer of LAYERS) {
  const file = path.join(dir, `${layer}.glb`);
  if (!fs.existsSync(file)) continue;
  const doc = await io.read(file);
  let flipped = 0;
  let total = 0;
  let hair = 0;
  for (const node of doc.getRoot().listNodes()) {
    for (const prim of node.getMesh()?.listPrimitives() ?? []) {
      if (layer === 'skin' && prim.getMaterial()?.getName() === 'k:hair') hair += removeBodyHair(node, prim);
      const [f, t] = fixWinding(node, prim);
      flipped += f;
      total += t;
    }
  }
  await io.write(file, doc);
  console.log(`${layer.padEnd(9)} ${flipped}/${total} pieces turned right side out${hair ? `, ${hair} body-hair triangles removed` : ''}  ${(fs.statSync(file).size / 1e6).toFixed(2)} MB`);
}
