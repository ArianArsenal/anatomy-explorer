/**
 * Links the free-exercise-db muscle groups to body-part categories and to parts of the 3D model.
 * `match` is tested against muscle-layer part ids with underscores read as spaces.
 * `cover` names superficial muscles that hide a deep group; they are hidden when it is the primary target.
 */
export const MUSCLE_GROUPS = {
  chest: { region: 'Chest', back: false, match: /pectoralis (major|minor)/ },
  lats: { region: 'Back', back: true, match: /latissimus dorsi|teres major/ },
  'middle back': {
    region: 'Back', back: true,
    match: /rhomboid|transverse part of trapezius|ascending part of trapezius|infraspinatus|teres minor/,
    cover: /descending part of trapezius/,
  },
  'lower back': {
    region: 'Back', back: true,
    match: /iliocostalis|longissimus|spinalis|multifidus|quadratus lumborum/,
    cover: /latissimus dorsi|trapezius|serratus posterior|rhomboid|splenius/,
  },
  traps: { region: 'Back', back: true, match: /descending part of trapezius|levator scapulae/ },
  shoulders: { region: 'Shoulders', back: false, match: /deltoid|supraspinatus/ },
  biceps: { region: 'Arms', back: false, match: /biceps brachii|brachialis|coracobrachialis/ },
  triceps: { region: 'Arms', back: true, match: /triceps brachii|anconeus/ },
  forearms: {
    region: 'Arms',
    back: false,
    match: /brachioradialis|flexor carpi|extensor carpi|flexor digitorum (superficialis|profundus)|^extensor digitorum$|extensor digiti minimi|extensor indicis|palmaris longus|pronator|supinator|flexor pollicis longus|extensor pollicis|abductor pollicis longus/,
  },
  abdominals: { region: 'Core', back: false, match: /rectus abdominis|abdominal oblique|transversus abdominis|pyramidalis/ },
  glutes: { region: 'Legs', back: true, match: /gluteus/ },
  quadriceps: { region: 'Legs', back: false, match: /rectus femoris|vastus/ },
  hamstrings: { region: 'Legs', back: true, match: /biceps femoris|semitendinosus|semimembranosus/ },
  calves: { region: 'Legs', back: true, match: /gastrocnemius|soleus|plantaris|calcaneal tendon/ },
  adductors: { region: 'Legs', back: false, match: /adductor (longus|brevis|magnus|minimus)|gracilis|pectineus/ },
  abductors: { region: 'Legs', back: false, match: /gluteus (medius|minimus)|tensor fasciae latae/, cover: /gluteus maximus/ },
  neck: { region: 'Neck', back: false, match: /sternocleidomastoid|scalenus|splenius/ },
};

export const REGIONS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs', 'Neck'];

export const regionOf = (exercise) => MUSCLE_GROUPS[exercise.primaryMuscles[0]]?.region ?? 'Other';

const cache = new WeakMap();

function musclesMatching(re, body, cacheKey) {
  if (!cache.has(body)) cache.set(body, new Map());
  const memo = cache.get(body);
  if (!memo.has(cacheKey)) {
    const keys = [];
    if (re) {
      for (const p of body.parts.values()) {
        if (p.layer === 'muscles' && re.test(p.id.replace(/_/g, ' '))) keys.push(p.key);
      }
    }
    memo.set(cacheKey, keys);
  }
  return memo.get(cacheKey);
}

/** Part keys of the muscle layer that belong to a muscle group (cached per loaded body). */
export const partsForMuscle = (group, body) => musclesMatching(MUSCLE_GROUPS[group]?.match, body, group);

/** Muscle-layer parts that hide a deep group from view (none for superficial groups). */
export const coverForMuscle = (group, body) => musclesMatching(MUSCLE_GROUPS[group]?.cover, body, `cover:${group}`);

const inverse = new WeakMap();

/** Muscle groups a part belongs to, e.g. ['biceps'] for the left biceps brachii. */
export function groupsForPart(key, body) {
  if (!inverse.has(body)) {
    const map = new Map();
    for (const g of Object.keys(MUSCLE_GROUPS)) {
      for (const k of partsForMuscle(g, body)) {
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(g);
      }
    }
    inverse.set(body, map);
  }
  return inverse.get(body).get(key) ?? [];
}
