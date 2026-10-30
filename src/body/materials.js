import * as THREE from 'three';

/**
 * Tissue kinds written by tools/export_zanatomy.py (material names "k:<kind>").
 * Colours are taken from photographic anatomy references; wet tissues get a clearcoat.
 * `alpha` < 1 marks tissues that are see-through even at full layer opacity.
 */
const KINDS = {
  skin: { color: 0xc79377, roughness: 0.52, sheen: 0.35, sheenColor: 0xffc4ac, sheenRoughness: 0.5, clearcoat: 0.04 },
  nail: { color: 0xe6c3b6, roughness: 0.28, clearcoat: 0.4 },
  hair: { color: 0x2b1d16, roughness: 0.6 },
  bone: { color: 0xe2d4b6, roughness: 0.66, jitter: 0.04 },
  tooth: { color: 0xf2ece0, roughness: 0.22, clearcoat: 0.6 },
  tooth_root: { color: 0xe3cfa6, roughness: 0.5 },
  cartilage: { color: 0xc9d5d2, roughness: 0.3, clearcoat: 0.5 },
  tendon: { color: 0xe9e2d4, roughness: 0.34, sheen: 0.5, sheenColor: 0xffffff, sheenRoughness: 0.3, clearcoat: 0.3 },
  muscle: { color: 0x962a29, roughness: 0.46, clearcoat: 0.25, clearcoatRoughness: 0.45, jitter: 0.06 },
  artery: { color: 0xb3262b, roughness: 0.34, clearcoat: 0.45 },
  vein: { color: 0x34478f, roughness: 0.34, clearcoat: 0.45 },
  nerve: { color: 0xead8a0, roughness: 0.42, sheen: 0.4, sheenColor: 0xfff4d0, clearcoat: 0.2 },
  brain: { color: 0xd6a49c, roughness: 0.48, clearcoat: 0.3, jitter: 0.03 },
  brain_white: { color: 0xeee2d6, roughness: 0.5 },
  eye: { color: 0xf1eee8, roughness: 0.12, clearcoat: 1 },
  iris: { color: 0x5a3a22, roughness: 0.4, clearcoat: 0.6 },
  cornea: { color: 0xffffff, roughness: 0.05, clearcoat: 1, alpha: 0.18 },
  fat: { color: 0xe6c46a, roughness: 0.4, clearcoat: 0.3 },
  liver: { color: 0x6b2620, roughness: 0.32, clearcoat: 0.6 },
  gallbladder: { color: 0x4d6a2d, roughness: 0.3, clearcoat: 0.6 },
  kidney: { color: 0x7a3027, roughness: 0.34, clearcoat: 0.5 },
  spleen: { color: 0x5c2232, roughness: 0.34, clearcoat: 0.5 },
  stomach: { color: 0xc98377, roughness: 0.38, clearcoat: 0.5 },
  lung: { color: 0xd39b97, roughness: 0.6, sheen: 0.3, sheenColor: 0xffd8d0 },
  intestine: { color: 0xd39486, roughness: 0.36, clearcoat: 0.55 },
  tongue: { color: 0xbe5f68, roughness: 0.55, clearcoat: 0.3 },
  heart: { color: 0x8e2b2b, roughness: 0.38, clearcoat: 0.5 },
  valve: { color: 0xe6d7c6, roughness: 0.4, clearcoat: 0.3 },
  bladder: { color: 0xd8ad9c, roughness: 0.38, clearcoat: 0.4 },
  pancreas: { color: 0xdcb383, roughness: 0.5, clearcoat: 0.3 },
  gland: { color: 0xc78769, roughness: 0.45, clearcoat: 0.3 },
  genital: { color: 0xc48678, roughness: 0.42, clearcoat: 0.3 },
  airway: { color: 0xe3d0c4, roughness: 0.38, clearcoat: 0.3 },
  mucosa: { color: 0xd6888a, roughness: 0.32, clearcoat: 0.5 },
  duct: { color: 0xe6d9be, roughness: 0.4, clearcoat: 0.3 },
  organ: { color: 0xbf796a, roughness: 0.4, clearcoat: 0.3 },
};

/** Small deterministic colour shift so neighbouring muscles and bones don't read as one blob. */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

export function makeMaterial(kind, seed = '') {
  const k = KINDS[kind] ?? KINDS.organ;
  const color = new THREE.Color(k.color);
  if (k.jitter) color.offsetHSL(0, 0, (hash(seed) - 0.5) * 2 * k.jitter);
  const m = new THREE.MeshPhysicalMaterial({
    color,
    roughness: k.roughness,
    metalness: 0,
    clearcoat: k.clearcoat ?? 0,
    clearcoatRoughness: k.clearcoatRoughness ?? 0.3,
    sheen: k.sheen ?? 0,
    sheenColor: new THREE.Color(k.sheenColor ?? 0xffffff),
    sheenRoughness: k.sheenRoughness ?? 0.5,
    side: THREE.DoubleSide,
  });
  m.userData.alpha = k.alpha ?? 1;
  return m;
}

/** Depth-only material drawn just before a translucent layer so only its nearest surface is shaded. */
export const depthPrepassMaterial = new THREE.MeshBasicMaterial({
  colorWrite: false,
  depthWrite: true,
  transparent: true,
  side: THREE.DoubleSide,
});
