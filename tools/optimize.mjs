// Shrinks the raw Blender export (tools/export_zanatomy.py) for the web:
// weld → simplify (error-bounded) → quantize → meshopt compress, one GLB per layer.
// Usage: node tools/optimize.mjs <rawDir> [outDir=public/models]
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, quantize, simplify, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const [rawDir, outDir = 'public/models'] = process.argv.slice(2);
if (!rawDir) {
  console.error('usage: node tools/optimize.mjs <rawDir> [outDir]');
  process.exit(1);
}

// Target share of triangles kept per layer; `error` caps how far the surface may move
// (fraction of each mesh's size), so small structures keep their shape.
const BUDGET = {
  skin: { ratio: 0.6, error: 0.0008 },
  muscles: { ratio: 0.18, error: 0.003 },
  arteries: { ratio: 0.2, error: 0.006 },
  veins: { ratio: 0.2, error: 0.006 },
  nerves: { ratio: 0.15, error: 0.006 },
  organs: { ratio: 0.4, error: 0.003 },
  skeleton: { ratio: 0.25, error: 0.002 },
};

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

fs.mkdirSync(outDir, { recursive: true });

const tris = (doc) => doc.getRoot().listMeshes().reduce(
  (n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0);

let total = 0;
for (const [layer, opts] of Object.entries(BUDGET)) {
  const src = path.join(rawDir, `${layer}.glb`);
  if (!fs.existsSync(src)) continue;
  const doc = await io.read(src);
  const before = tris(doc);
  await doc.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: opts.ratio, error: opts.error }),
    // Keep materials out: the placeholders differ only by name ("k:<tissue kind>").
    dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH] }),
    prune(),
    quantize({ quantizePosition: 14, quantizeNormal: 10 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  const dst = path.join(outDir, `${layer}.glb`);
  await io.write(dst, doc);
  const size = fs.statSync(dst).size;
  total += size;
  console.log(`${layer.padEnd(9)} ${Math.round(before / 1000)}k → ${Math.round(tris(doc) / 1000)}k tris  ${(size / 1e6).toFixed(1)} MB`);
}
console.log(`total ${(total / 1e6).toFixed(1)} MB`);
