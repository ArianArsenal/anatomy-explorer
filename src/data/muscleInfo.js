import { displayName } from './structures.js';

/**
 * Attachments, action and nerve supply of the main skeletal muscles (standard anatomy references).
 * Each entry: [regex on the model part name, origin, insertion, action, nerve]. The first match wins,
 * so specific patterns come before general ones.
 */
const RAW = [
  // ---------------- Head and neck ----------------
  [/^temporalis/i, 'Temporal fossa and temporal fascia on the side of the skull.', 'Coronoid process and front of the ramus of the mandible.', 'Closes the jaw and pulls it back.', 'Deep temporal nerves (mandibular nerve, CN V3).'],
  [/masseter/i, 'Zygomatic arch and the zygomatic process of the maxilla.', 'Outer surface of the ramus and angle of the mandible.', 'Closes the jaw with great force; the superficial part helps push it forward.', 'Masseteric nerve (mandibular nerve, CN V3).'],
  [/^frontalis/i, 'Epicranial aponeurosis.', 'Skin of the eyebrows and forehead.', 'Raises the eyebrows and wrinkles the forehead.', 'Temporal branches of the facial nerve (CN VII).'],
  [/orbicularis oculi/i, 'Medial orbital margin, medial palpebral ligament and lacrimal bone.', 'Skin around the orbit and the lateral palpebral raphe.', 'Closes the eyelids, gently (blinking) or tightly (squinting).', 'Temporal and zygomatic branches of the facial nerve (CN VII).'],
  [/orbicularis oris/i, 'Maxilla and mandible near the midline, and the muscles that meet at the mouth.', 'Skin and mucous membrane of the lips.', 'Closes and purses the lips.', 'Buccal and marginal mandibular branches of the facial nerve (CN VII).'],
  [/^zygomaticus major/i, 'Zygomatic bone.', 'Corner of the mouth.', 'Pulls the corner of the mouth up and out, as in smiling.', 'Zygomatic and buccal branches of the facial nerve (CN VII).'],
  [/^bucinator/i, 'Alveolar processes of the maxilla and mandible beside the molars, and the pterygomandibular raphe.', 'Corner of the mouth, blending into orbicularis oris.', 'Presses the cheek against the teeth when chewing and blowing.', 'Buccal branch of the facial nerve (CN VII).'],
  [/^platysma/i, 'Fascia over the upper pectoralis major and deltoid.', 'Lower border of the mandible and the skin of the lower face.', 'Tenses the skin of the neck and pulls the corners of the mouth down.', 'Cervical branch of the facial nerve (CN VII).'],
  [/sternocleidomastoid/i, 'Manubrium of the sternum and the inner third of the clavicle.', 'Mastoid process of the temporal bone and the superior nuchal line.', 'One side tilts the head to the same side and turns the face to the other side; both together bend the neck forward.', 'Accessory nerve (CN XI), with sensory fibres from C2–C3.'],
  [/^scalenus anterior/i, 'Transverse processes of C3–C6.', 'Scalene tubercle of the first rib.', 'Raises the first rib when breathing hard; bends the neck forward and to the side.', 'Anterior rami of C4–C6.'],
  [/^scalenus medius/i, 'Transverse processes of C2–C7.', 'Upper surface of the first rib.', 'Raises the first rib; bends the neck to the side.', 'Anterior rami of C3–C8.'],
  [/^scalenus posterior/i, 'Transverse processes of C4–C6.', 'Outer surface of the second rib.', 'Raises the second rib; bends the neck to the side.', 'Anterior rami of C6–C8.'],
  [/^splenius capitis/i, 'Ligamentum nuchae and spinous processes of C7–T3.', 'Mastoid process and the lateral superior nuchal line.', 'Both sides extend the head; one side turns the head to the same side.', 'Posterior rami of the middle cervical nerves.'],
  [/^levator scapulae/i, 'Transverse processes of C1–C4.', 'Medial border of the scapula, from the superior angle to the spine.', 'Raises the scapula (shrugging) and tilts its socket downward.', 'Dorsal scapular nerve (C5) and cervical nerves C3–C4.'],
  [/^diaphragm/i, 'Xiphoid process, inner surfaces of the lower six ribs, and the bodies of L1–L3 (crura).', 'Central tendon of the diaphragm.', 'The main breathing muscle: it contracts and flattens to draw air into the lungs.', 'Phrenic nerve (C3–C5).'],

  // ---------------- Back and shoulder girdle ----------------
  [/descending part of trapezius/i, 'External occipital protuberance, superior nuchal line and ligamentum nuchae.', 'Outer third of the clavicle.', 'Raises the scapula (shrugging) and rotates it upward.', 'Accessory nerve (CN XI), with sensory fibres from C3–C4.'],
  [/transverse part of trapezius/i, 'Spinous processes of C7–T3.', 'Acromion and spine of the scapula.', 'Pulls the shoulder blades together.', 'Accessory nerve (CN XI), with sensory fibres from C3–C4.'],
  [/ascending part of trapezius/i, 'Spinous processes of T4–T12.', 'Inner end of the spine of the scapula.', 'Pulls the scapula down and helps rotate it upward.', 'Accessory nerve (CN XI), with sensory fibres from C3–C4.'],
  [/latissimus dorsi/i, 'Spinous processes of T7–L5, thoracolumbar fascia, iliac crest and the lower 3–4 ribs.', 'Floor of the intertubercular groove of the humerus.', 'Pulls the arm down and back and turns it inward, as in pull-ups and rowing.', 'Thoracodorsal nerve (C6–C8).'],
  [/^rhomboid major/i, 'Spinous processes of T2–T5.', 'Medial border of the scapula below its spine.', 'Pulls the shoulder blade toward the spine and tilts its socket downward.', 'Dorsal scapular nerve (C4–C5).'],
  [/^rhomboid minor/i, 'Ligamentum nuchae and spinous processes of C7–T1.', 'Medial border of the scapula at the root of its spine.', 'Pulls the shoulder blade toward the spine.', 'Dorsal scapular nerve (C4–C5).'],
  [/^serratus anterior/i, 'Outer surfaces of ribs 1–8.', 'Front of the medial border of the scapula.', 'Pushes the scapula forward (punching) and rotates it upward; holds it flat against the ribs.', 'Long thoracic nerve (C5–C7).'],
  [/^pectoralis minor/i, 'Ribs 3–5 near their cartilages.', 'Coracoid process of the scapula.', 'Pulls the scapula forward and down; lifts the ribs when breathing hard.', 'Medial pectoral nerve (C8–T1).'],
  [/pectoralis major/i, 'Clavicular head: inner half of the clavicle. Sternocostal head: sternum and costal cartilages 1–6. Abdominal part: external oblique aponeurosis.', 'Outer lip of the intertubercular groove of the humerus.', 'Brings the arm across the body and turns it inward. The clavicular head raises the arm forward; the sternocostal head pulls a raised arm down.', 'Lateral and medial pectoral nerves (C5–T1).'],
  [/^subclavius/i, 'First rib and its cartilage.', 'Underside of the middle third of the clavicle.', 'Anchors the clavicle and pulls it down.', 'Nerve to subclavius (C5–C6).'],

  // ---------------- Shoulder ----------------
  [/clavicular part of deltoid/i, 'Outer third of the clavicle.', 'Deltoid tuberosity of the humerus.', 'Raises the arm forward and turns it inward.', 'Axillary nerve (C5–C6).'],
  [/acromial part of deltoid/i, 'Acromion of the scapula.', 'Deltoid tuberosity of the humerus.', 'Raises the arm out to the side (after supraspinatus starts the movement).', 'Axillary nerve (C5–C6).'],
  [/spinal part of deltoid/i, 'Spine of the scapula.', 'Deltoid tuberosity of the humerus.', 'Pulls the arm back and turns it outward.', 'Axillary nerve (C5–C6).'],
  [/^supraspinatus/i, 'Supraspinous fossa of the scapula.', 'Top facet of the greater tubercle of the humerus.', 'Starts raising the arm to the side and holds the humeral head in its socket (rotator cuff).', 'Suprascapular nerve (C5–C6).'],
  [/^infraspinatus/i, 'Infraspinous fossa of the scapula.', 'Middle facet of the greater tubercle of the humerus.', 'Turns the arm outward and steadies the shoulder joint (rotator cuff).', 'Suprascapular nerve (C5–C6).'],
  [/^teres minor/i, 'Upper two-thirds of the lateral border of the scapula.', 'Lower facet of the greater tubercle of the humerus.', 'Turns the arm outward and steadies the shoulder joint (rotator cuff).', 'Axillary nerve (C5–C6).'],
  [/^teres major/i, 'Back of the inferior angle of the scapula.', 'Inner lip of the intertubercular groove of the humerus.', 'Pulls the arm down and back and turns it inward.', 'Lower subscapular nerve (C5–C7).'],
  [/^subscapularis/i, 'Subscapular fossa on the front of the scapula.', 'Lesser tubercle of the humerus.', 'Turns the arm inward and steadies the shoulder joint (rotator cuff).', 'Upper and lower subscapular nerves (C5–C7).'],

  // ---------------- Upper arm ----------------
  [/biceps brachii/i, 'Long head: supraglenoid tubercle of the scapula. Short head: coracoid process.', 'Radial tuberosity and, through the bicipital aponeurosis, the forearm fascia.', 'Bends the elbow and turns the palm up; helps raise the arm forward.', 'Musculocutaneous nerve (C5–C6).'],
  [/^brachialis/i, 'Lower half of the front of the humerus.', 'Coronoid process and tuberosity of the ulna.', 'Bends the elbow whatever the hand position; the main elbow flexor.', 'Musculocutaneous nerve (C5–C6), with a small branch from the radial nerve.'],
  [/^coracobrachialis/i, 'Coracoid process of the scapula.', 'Inner side of the middle of the humerus.', 'Raises the arm forward and draws it toward the body.', 'Musculocutaneous nerve (C5–C7).'],
  [/triceps brachii/i, 'Long head: infraglenoid tubercle of the scapula. Lateral head: back of the humerus above the radial groove. Medial head: back of the humerus below it.', 'Olecranon of the ulna.', 'Straightens the elbow; the long head also pulls the arm back and in.', 'Radial nerve (C6–C8).'],
  [/^anconeus/i, 'Lateral epicondyle of the humerus.', 'Side of the olecranon and the upper back of the ulna.', 'Helps straighten the elbow and steadies the joint.', 'Radial nerve (C7–C8).'],

  // ---------------- Forearm ----------------
  [/^brachioradialis/i, 'Lateral supracondylar ridge of the humerus.', 'Base of the styloid process of the radius.', 'Bends the elbow, most strongly with the thumb pointing up (hammer curl).', 'Radial nerve (C5–C6).'],
  [/pronator teres/i, 'Humeral head: medial epicondyle. Ulnar head: coronoid process of the ulna.', 'Middle of the outer surface of the radius.', 'Turns the palm down and helps bend the elbow.', 'Median nerve (C6–C7).'],
  [/^pronator quadratus/i, 'Lower quarter of the front of the ulna.', 'Lower quarter of the front of the radius.', 'The main muscle that turns the palm down.', 'Anterior interosseous nerve (median nerve, C7–C8).'],
  [/^supinator/i, 'Lateral epicondyle of the humerus and the supinator crest of the ulna.', 'Upper third of the radius.', 'Turns the palm up.', 'Deep branch of the radial nerve (C6–C7).'],
  [/^flexor carpi radialis/i, 'Medial epicondyle of the humerus (common flexor origin).', 'Bases of the 2nd and 3rd metacarpals.', 'Bends the wrist and tilts the hand toward the thumb.', 'Median nerve (C6–C7).'],
  [/^palmaris longus/i, 'Medial epicondyle of the humerus.', 'Flexor retinaculum and palmar aponeurosis.', 'Bends the wrist and tightens the palm. It is missing in about one person in seven.', 'Median nerve (C7–C8).'],
  [/flexor carpi ulnaris/i, 'Humeral head: medial epicondyle. Ulnar head: olecranon and back of the ulna.', 'Pisiform, hook of the hamate and base of the 5th metacarpal.', 'Bends the wrist and tilts the hand toward the little finger.', 'Ulnar nerve (C7–T1).'],
  [/flexor digitorum superficialis/i, 'Medial epicondyle, coronoid process of the ulna and the front of the radius.', 'Middle phalanges of the four fingers.', 'Bends the fingers at their middle joints, and helps bend the knuckles and wrist.', 'Median nerve (C8–T1).'],
  [/^flexor digitorum profundus/i, 'Front and inner side of the ulna and the interosseous membrane.', 'Distal phalanges of the four fingers.', 'The only muscle that bends the fingertips; it also bends the other finger joints and the wrist.', 'Index and middle fingers: anterior interosseous nerve (median). Ring and little fingers: ulnar nerve (C8–T1).'],
  [/^flexor pollicis longus/i, 'Front of the radius and the interosseous membrane.', 'Distal phalanx of the thumb.', 'Bends the thumb, including its tip.', 'Anterior interosseous nerve (median nerve, C7–C8).'],
  [/^extensor carpi radialis longus/i, 'Lateral supracondylar ridge of the humerus.', 'Base of the 2nd metacarpal.', 'Straightens the wrist and tilts the hand toward the thumb.', 'Radial nerve (C6–C7).'],
  [/^extensor carpi radialis brevis/i, 'Lateral epicondyle of the humerus (common extensor origin).', 'Base of the 3rd metacarpal.', 'Straightens the wrist and tilts the hand toward the thumb. Its tendon is the one usually affected in tennis elbow.', 'Deep branch of the radial nerve (C7–C8).'],
  [/extensor carpi ulnaris/i, 'Lateral epicondyle of the humerus and the back of the ulna.', 'Base of the 5th metacarpal.', 'Straightens the wrist and tilts the hand toward the little finger.', 'Posterior interosseous nerve (radial nerve, C7–C8).'],
  [/^extensor digitorum$/i, 'Lateral epicondyle of the humerus.', 'Extensor expansions of the four fingers.', 'Straightens the fingers and helps straighten the wrist.', 'Posterior interosseous nerve (radial nerve, C7–C8).'],

  // ---------------- Trunk ----------------
  [/rectus abdominis/i, 'Pubic crest and pubic symphysis.', 'Xiphoid process and the cartilages of ribs 5–7.', 'Curls the trunk forward (as in a crunch) and tightens the abdomen.', 'Thoracoabdominal nerves (T7–T11) and subcostal nerve (T12).'],
  [/external abdominal oblique/i, 'Outer surfaces of ribs 5–12.', 'Linea alba, pubic tubercle and front half of the iliac crest.', 'Bends the trunk forward and twists it to the opposite side; tightens the abdomen.', 'Thoracoabdominal nerves (T7–T11) and subcostal nerve (T12).'],
  [/internal abdominal oblique/i, 'Thoracolumbar fascia, front of the iliac crest and the outer inguinal ligament.', 'Lower 3–4 ribs, linea alba and, through the conjoint tendon, the pubis.', 'Bends the trunk forward and twists it to the same side; tightens the abdomen.', 'Thoracoabdominal nerves (T7–T11), subcostal nerve, and iliohypogastric and ilioinguinal nerves (L1).'],
  [/transversus abdominis/i, 'Cartilages of ribs 7–12, thoracolumbar fascia, iliac crest and inguinal ligament.', 'Linea alba and the pubic crest.', 'Pulls the abdominal wall in like a corset, steadying the trunk and raising abdominal pressure.', 'Thoracoabdominal nerves (T7–T11), subcostal nerve, and iliohypogastric and ilioinguinal nerves (L1).'],
  [/external intercostal/i, 'Lower border of each rib.', 'Upper border of the rib below.', 'Lift the ribs to help breathe in.', 'Intercostal nerves (T1–T11).'],
  [/internal intercostal/i, 'Upper border of each rib.', 'Lower border of the rib above.', 'Pull the ribs down to help breathe out forcefully.', 'Intercostal nerves (T1–T11).'],
  [/^quadratus lumborum/i, 'Iliac crest and iliolumbar ligament.', '12th rib and the transverse processes of L1–L4.', 'Bends the trunk to the side, helps arch the lower back and holds the 12th rib steady when breathing.', 'Anterior rami of T12–L4.'],
  [/^iliocostalis/i, 'Sacrum, iliac crest and the angles of the ribs.', 'Angles of the ribs above and the transverse processes of the lower cervical vertebrae.', 'Part of the erector spinae: straightens the spine and bends it to the side.', 'Posterior rami of the spinal nerves.'],
  [/^longissimus/i, 'Sacrum, iliac crest and the transverse processes of the lumbar and thoracic vertebrae.', 'Transverse processes higher up, the ribs and the mastoid process.', 'Part of the erector spinae: straightens the spine and the head and bends them to the side.', 'Posterior rami of the spinal nerves.'],
  [/^spinalis/i, 'Spinous processes of the upper lumbar and lower thoracic (or cervical) vertebrae.', 'Spinous processes several vertebrae higher.', 'Part of the erector spinae: straightens the spine.', 'Posterior rami of the spinal nerves.'],
  [/^multifidus/i, 'Sacrum, posterior iliac spine and the transverse and articular processes of the vertebrae.', 'Spinous processes 2–4 vertebrae higher.', 'Steadies individual vertebrae; straightens and twists the spine.', 'Posterior rami of the spinal nerves.'],
  [/^psoas major/i, 'Bodies, discs and transverse processes of T12–L5.', 'Lesser trochanter of the femur (with iliacus).', 'Lifts the thigh (hip flexion) and bends the lower spine forward.', 'Anterior rami of L1–L3.'],
  [/^iliacus/i, 'Iliac fossa of the hip bone.', 'Lesser trochanter of the femur (with psoas major).', 'Lifts the thigh (hip flexion).', 'Femoral nerve (L2–L3).'],

  // ---------------- Hip ----------------
  [/gluteus maximus/i, 'Back of the ilium, the sacrum and coccyx, and the sacrotuberous ligament.', 'Iliotibial tract and the gluteal tuberosity of the femur.', 'Extends the hip and turns the thigh outward: standing up, climbing stairs, sprinting.', 'Inferior gluteal nerve (L5–S2).'],
  [/gluteus medius/i, 'Outer surface of the ilium between the anterior and posterior gluteal lines.', 'Outer surface of the greater trochanter.', 'Moves the thigh out to the side and keeps the pelvis level when standing on one leg.', 'Superior gluteal nerve (L4–S1).'],
  [/gluteus minimus/i, 'Outer surface of the ilium between the anterior and inferior gluteal lines.', 'Front of the greater trochanter.', 'Moves the thigh out to the side, turns it inward and steadies the pelvis.', 'Superior gluteal nerve (L4–S1).'],
  [/tensor fasciae latae/i, 'Anterior superior iliac spine and the front of the iliac crest.', 'Iliotibial tract.', 'Lifts the thigh, moves it out and turns it inward; steadies the knee through the iliotibial tract.', 'Superior gluteal nerve (L4–S1).'],
  [/^piriformis/i, 'Front of the sacrum.', 'Top of the greater trochanter.', 'Turns the straight thigh outward and moves the bent thigh out to the side.', 'Nerve to piriformis (S1–S2).'],

  // ---------------- Thigh ----------------
  [/^sartorius/i, 'Anterior superior iliac spine.', 'Upper inner tibia (pes anserinus).', 'Bends the hip and knee and turns the thigh outward, as when sitting cross-legged. The longest muscle in the body.', 'Femoral nerve (L2–L3).'],
  [/rectus femoris/i, 'Anterior inferior iliac spine and the ilium just above the hip socket.', 'Patella, and through the patellar ligament the tibial tuberosity.', 'Straightens the knee and lifts the thigh: the only quadriceps muscle that crosses the hip.', 'Femoral nerve (L2–L4).'],
  [/vastus lateralis/i, 'Greater trochanter and the outer lip of the linea aspera.', 'Patella and tibial tuberosity (quadriceps tendon).', 'Straightens the knee.', 'Femoral nerve (L2–L4).'],
  [/vastus medialis/i, 'Intertrochanteric line and the inner lip of the linea aspera.', 'Patella and tibial tuberosity (quadriceps tendon).', 'Straightens the knee; its lowest fibres keep the kneecap on track.', 'Femoral nerve (L2–L4).'],
  [/vastus intermedius/i, 'Front and outer surface of the femoral shaft.', 'Patella and tibial tuberosity (quadriceps tendon).', 'Straightens the knee.', 'Femoral nerve (L2–L4).'],
  [/^adductor longus/i, 'Body of the pubis below the pubic crest.', 'Middle third of the linea aspera.', 'Draws the thigh inward and helps lift it.', 'Obturator nerve (L2–L4).'],
  [/^adductor brevis/i, 'Body and inferior ramus of the pubis.', 'Upper linea aspera and the pectineal line of the femur.', 'Draws the thigh inward.', 'Obturator nerve (L2–L4).'],
  [/^adductor magnus/i, 'Inferior pubic ramus, ischial ramus and ischial tuberosity.', 'Linea aspera and the adductor tubercle of the femur.', 'Draws the thigh inward; its front part lifts the thigh and its hamstring part extends the hip.', 'Obturator nerve (adductor part) and tibial part of the sciatic nerve (hamstring part), L2–L4.'],
  [/^gracilis/i, 'Body and inferior ramus of the pubis.', 'Upper inner tibia (pes anserinus).', 'Draws the thigh inward and bends the knee.', 'Obturator nerve (L2–L3).'],
  [/^pectineus/i, 'Pectineal line of the pubis.', 'Pectineal line of the femur.', 'Draws the thigh inward and lifts it.', 'Femoral nerve (L2–L3), sometimes also the obturator nerve.'],
  [/biceps femoris/i, 'Long head: ischial tuberosity. Short head: linea aspera of the femur.', 'Head of the fibula.', 'Bends the knee and turns the leg outward; the long head also extends the hip.', 'Long head: tibial part of the sciatic nerve. Short head: common fibular part (L5–S2).'],
  [/^semitendinosus/i, 'Ischial tuberosity.', 'Upper inner tibia (pes anserinus).', 'Bends the knee, extends the hip and turns the bent knee inward.', 'Tibial part of the sciatic nerve (L5–S2).'],
  [/^semimembranosus/i, 'Ischial tuberosity.', 'Back of the medial condyle of the tibia.', 'Bends the knee, extends the hip and turns the bent knee inward.', 'Tibial part of the sciatic nerve (L5–S2).'],

  // ---------------- Lower leg ----------------
  [/gastrocnemius/i, 'Lateral head: lateral condyle of the femur. Medial head: femur just above the medial condyle.', 'Calcaneus, through the calcaneal (Achilles) tendon.', 'Points the foot down (rising onto the toes) and helps bend the knee.', 'Tibial nerve (S1–S2).'],
  [/^soleus/i, 'Head and upper back of the fibula, and the soleal line of the tibia.', 'Calcaneus, through the calcaneal (Achilles) tendon.', 'Points the foot down; keeps you from tipping forward when standing and pumps blood back from the leg.', 'Tibial nerve (S1–S2).'],
  [/^plantaris/i, 'Lateral supracondylar line of the femur.', 'Calcaneus, next to the Achilles tendon.', 'Weakly helps the gastrocnemius.', 'Tibial nerve (S1–S2).'],
  [/^popliteus/i, 'Lateral condyle of the femur.', 'Back of the tibia above the soleal line.', 'Unlocks the straight knee so it can bend.', 'Tibial nerve (L4–S1).'],
  [/tibialis anterior/i, 'Lateral condyle and upper outer surface of the tibia, and the interosseous membrane.', 'Medial cuneiform and base of the 1st metatarsal.', 'Lifts the foot (dorsiflexion) and turns the sole inward.', 'Deep fibular nerve (L4–L5).'],
  [/tibialis posterior/i, 'Back of the tibia, fibula and interosseous membrane.', 'Navicular tuberosity, the cuneiforms and bases of metatarsals 2–4.', 'Points the foot down, turns the sole inward and supports the arch.', 'Tibial nerve (L4–L5).'],
  [/fibularis longus/i, 'Head and upper outer surface of the fibula.', 'Medial cuneiform and base of the 1st metatarsal.', 'Turns the sole outward, helps point the foot and supports the arch.', 'Superficial fibular nerve (L5–S1).'],
  [/fibularis brevis/i, 'Lower outer surface of the fibula.', 'Tuberosity of the 5th metatarsal.', 'Turns the sole outward.', 'Superficial fibular nerve (L5–S1).'],
  [/^extensor digitorum longus/i, 'Lateral condyle of the tibia and the upper front of the fibula.', 'Middle and distal phalanges of toes 2–5.', 'Straightens the four small toes and lifts the foot.', 'Deep fibular nerve (L5–S1).'],
  [/^extensor hallucis longus/i, 'Middle of the front of the fibula and the interosseous membrane.', 'Distal phalanx of the big toe.', 'Straightens the big toe and lifts the foot.', 'Deep fibular nerve (L5).'],
];

const ENTRIES = RAW.map(([match, origin, insertion, action, nerve]) => ({ match, origin, insertion, action, nerve }));
const cache = new Map();

/** Attachments, action and nerve of a muscle part, or null when it isn't one of the main muscles. */
export function muscleInfo(id) {
  if (!cache.has(id)) {
    const name = displayName(id, 0);
    cache.set(id, ENTRIES.find((e) => e.match.test(name)) ?? null);
  }
  return cache.get(id);
}
