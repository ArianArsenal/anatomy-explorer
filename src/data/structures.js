/**
 * Curated descriptions: id → [display name, system, short description].
 * The 3D model has ~2,500 named parts; those whose name slug matches an id here, or that
 * match an entry in ALIASES, get this description. "Left"/"Right" is prefixed at display time.
 */
const RAW = {
  // ---------------- Skeleton ----------------
  skull: ['Skull', 'Skeletal', 'Protects the brain and houses the eyes, inner ears and nasal cavity. The adult skull is made of 22 bones, most of them fused together at sutures.'],
  mandible: ['Mandible', 'Skeletal', 'The lower jaw. It is the only movable bone of the skull and holds the lower teeth. It is used for chewing and speech.'],
  teeth: ['Teeth', 'Skeletal', 'An adult has 32 teeth: incisors, canines, premolars and molars. They are covered in enamel, the hardest substance in the body.'],
  cervical_vertebrae: ['Cervical vertebrae (C1–C7)', 'Skeletal', 'The seven neck vertebrae. C1 (atlas) and C2 (axis) let the head nod and rotate.'],
  thoracic_vertebrae: ['Thoracic vertebrae (T1–T12)', 'Skeletal', 'Twelve vertebrae of the upper back. Each one forms joints with a pair of ribs.'],
  lumbar_vertebrae: ['Lumbar vertebrae (L1–L5)', 'Skeletal', 'The five largest vertebrae. They carry most of the upper body’s weight.'],
  intervertebral_discs: ['Intervertebral discs', 'Skeletal', 'Fibrocartilage cushions between the vertebrae. Each has a gel-like core that absorbs shock.'],
  sacrum: ['Sacrum', 'Skeletal', 'A triangular bone of five fused vertebrae. It joins the spine to the pelvis at the sacroiliac joints.'],
  coccyx: ['Coccyx', 'Skeletal', 'The tailbone: three to five small fused vertebrae at the bottom of the spine.'],
  true_ribs: ['True ribs (1–7)', 'Skeletal', 'Ribs that attach directly to the sternum through their own costal cartilage.'],
  false_ribs: ['False ribs (8–10)', 'Skeletal', 'Ribs whose cartilages join the cartilage above them instead of the sternum.'],
  floating_ribs: ['Floating ribs (11–12)', 'Skeletal', 'Short ribs with no front attachment. They help protect the kidneys.'],
  costal_cartilage: ['Costal cartilage', 'Skeletal', 'Hyaline cartilage connecting the ribs to the sternum. It lets the ribcage flex when you breathe.'],
  sternum: ['Sternum', 'Skeletal', 'The breastbone, made of the manubrium, body and xiphoid process. It protects the heart.'],
  clavicle: ['Clavicle', 'Skeletal', 'The collarbone. It acts as a strut between the sternum and scapula and keeps the arm away from the trunk.'],
  scapula: ['Scapula', 'Skeletal', 'The shoulder blade. Its glenoid cavity forms the socket of the shoulder joint, and 17 muscles attach to it.'],
  hip_bone: ['Hip bone (os coxae)', 'Skeletal', 'Formed by the fused ilium, ischium and pubis. The female pelvis is typically wider with a rounder inlet, adapted for childbirth.'],
  humerus: ['Humerus', 'Skeletal', 'The upper arm bone. It runs from the shoulder socket to the elbow.'],
  ulna: ['Ulna', 'Skeletal', 'The forearm bone on the little-finger side. Its olecranon forms the point of the elbow.'],
  radius: ['Radius', 'Skeletal', 'The forearm bone on the thumb side. It rotates around the ulna to turn the palm up and down.'],
  carpals: ['Carpals', 'Skeletal', 'Eight small wrist bones in two rows, including the scaphoid and lunate.'],
  metacarpals: ['Metacarpals', 'Skeletal', 'The five long bones of the palm. Each one connects the wrist to a finger.'],
  phalanges_hand: ['Phalanges (hand)', 'Skeletal', 'The 14 finger bones. The thumb has two and every other finger has three.'],
  femur: ['Femur', 'Skeletal', 'The thigh bone, the longest and strongest bone in the body. Its ball-shaped head fits into the hip socket.'],
  patella: ['Patella', 'Skeletal', 'The kneecap, a sesamoid bone inside the quadriceps tendon. It increases the leverage of the thigh muscles.'],
  tibia: ['Tibia', 'Skeletal', 'The shinbone. It carries most of the body’s weight in the lower leg.'],
  fibula: ['Fibula', 'Skeletal', 'The slender outer bone of the lower leg. It stabilises the ankle and anchors muscles.'],
  talus: ['Talus', 'Skeletal', 'The ankle bone that forms a joint with the tibia and fibula. It passes the body’s weight to the foot.'],
  calcaneus: ['Calcaneus', 'Skeletal', 'The heel bone, the largest bone in the foot. The Achilles tendon attaches to it.'],
  tarsals: ['Tarsals (midfoot)', 'Skeletal', 'The navicular, cuboid and three cuneiform bones. Together they form the arches of the foot.'],
  metatarsals: ['Metatarsals', 'Skeletal', 'Five long bones between the midfoot and the toes.'],
  phalanges_foot: ['Phalanges (foot)', 'Skeletal', 'The 14 toe bones. The big toe has two and the other toes have three each.'],

  // ---------------- Muscles ----------------
  temporalis: ['Temporalis', 'Muscular', 'A fan-shaped muscle on the side of the skull that closes the jaw.'],
  masseter: ['Masseter', 'Muscular', 'The main chewing muscle. For its size it is one of the strongest muscles in the body.'],
  sternocleidomastoid: ['Sternocleidomastoid', 'Muscular', 'Runs from behind the ear to the sternum and clavicle. It turns and flexes the head.'],
  trapezius: ['Trapezius', 'Muscular', 'A large diamond-shaped back muscle that raises, retracts and rotates the scapula.'],
  erector_spinae: ['Erector spinae', 'Muscular', 'Muscle columns alongside the spine that straighten the back and keep posture.'],
  latissimus_dorsi: ['Latissimus dorsi', 'Muscular', 'The broadest back muscle. It pulls the arm down and back, as in a pull-up.'],
  pectoralis_major: ['Pectoralis major', 'Muscular', 'A thick chest muscle that brings the arm across the body and rotates it inward.'],
  serratus_anterior: ['Serratus anterior', 'Muscular', 'Saw-toothed slips on the ribs that hold the scapula against the chest and help with punching.'],
  external_oblique: ['External oblique', 'Muscular', 'The outer flank muscle of the abdomen. It twists the trunk and compresses the abdomen.'],
  rectus_abdominis: ['Rectus abdominis', 'Muscular', 'The "six-pack". Its tendinous bands divide it into segments, and it flexes the spine forward.'],
  gluteus_maximus: ['Gluteus maximus', 'Muscular', 'The largest muscle in the body. It extends the hip for standing up, climbing and running.'],
  gluteus_medius: ['Gluteus medius', 'Muscular', 'Moves the hip outward and keeps the pelvis level when you walk.'],
  deltoid: ['Deltoid', 'Muscular', 'The rounded shoulder muscle. Its three parts raise the arm forward, sideways and backward.'],
  biceps_brachii: ['Biceps brachii', 'Muscular', 'A two-headed muscle that bends the elbow and turns the palm up.'],
  triceps_brachii: ['Triceps brachii', 'Muscular', 'A three-headed muscle on the back of the arm. It is the main extensor of the elbow.'],
  brachioradialis: ['Brachioradialis', 'Muscular', 'A forearm muscle that bends the elbow, most strongly with the thumb pointing up.'],
  forearm_flexors: ['Forearm flexors', 'Muscular', 'A group on the palm side of the forearm that bends the wrist and fingers.'],
  forearm_extensors: ['Forearm extensors', 'Muscular', 'A group on the back of the forearm that straightens the wrist and fingers.'],
  rectus_femoris: ['Rectus femoris', 'Muscular', 'The middle quadriceps muscle. It crosses both the hip and the knee.'],
  vastus_lateralis: ['Vastus lateralis', 'Muscular', 'The largest quadriceps muscle, on the outer thigh. It straightens the knee.'],
  vastus_medialis: ['Vastus medialis', 'Muscular', 'The teardrop-shaped quadriceps muscle above the inner knee. It helps keep the kneecap on track.'],
  sartorius: ['Sartorius', 'Muscular', 'The longest muscle in the body. It crosses the thigh diagonally and flexes the hip and knee.'],
  adductors: ['Adductor group', 'Muscular', 'Inner-thigh muscles that pull the legs together.'],
  biceps_femoris: ['Biceps femoris', 'Muscular', 'The outer hamstring. It bends the knee and extends the hip.'],
  semitendinosus: ['Semitendinosus / semimembranosus', 'Muscular', 'The inner hamstrings. They bend the knee and extend the hip.'],
  gastrocnemius: ['Gastrocnemius', 'Muscular', 'The two-headed calf muscle that points the foot and helps bend the knee.'],
  soleus: ['Soleus', 'Muscular', 'A broad, flat calf muscle beneath the gastrocnemius. It is essential for standing and walking.'],
  achilles_tendon: ['Achilles tendon', 'Muscular', 'The thickest and strongest tendon in the body. It connects the calf muscles to the heel.'],
  tibialis_anterior: ['Tibialis anterior', 'Muscular', 'A shin muscle that lifts the foot (dorsiflexion) and turns the sole inward.'],
  fibularis_longus: ['Fibularis (peroneus) longus', 'Muscular', 'A muscle on the outer leg that points the foot and turns the sole outward.'],
  patellar_tendon: ['Patellar ligament', 'Muscular', 'Connects the kneecap to the tibia. It is tapped in the knee-jerk reflex test.'],
  diaphragm: ['Diaphragm', 'Muscular', 'A dome-shaped muscle under the lungs. When it contracts it flattens and draws air in. It is the main muscle of breathing.'],

  // ---------------- Arteries ----------------
  aorta: ['Aorta', 'Circulatory', 'The largest artery. It carries oxygenated blood from the left ventricle and arches over the heart before descending along the spine.'],
  brachiocephalic_trunk: ['Brachiocephalic trunk', 'Circulatory', 'The first branch of the aortic arch. It divides into the right subclavian and right common carotid arteries.'],
  common_carotid_artery: ['Common carotid artery', 'Circulatory', 'The main blood supply to the head and brain. This is where you feel the pulse in your neck.'],
  superficial_temporal_artery: ['Superficial temporal artery', 'Circulatory', 'A branch of the external carotid that supplies the scalp. You can feel its pulse in front of the ear.'],
  facial_artery: ['Facial artery', 'Circulatory', 'Winds over the jaw to supply the face, lips and nose.'],
  subclavian_artery: ['Subclavian artery', 'Circulatory', 'Runs beneath the clavicle and supplies the arm. It continues as the axillary artery.'],
  brachial_artery: ['Brachial artery', 'Circulatory', 'The main artery of the upper arm. Blood pressure is usually measured over it.'],
  radial_artery: ['Radial artery', 'Circulatory', 'Runs along the thumb side of the forearm. It is the usual place to feel the wrist pulse.'],
  ulnar_artery: ['Ulnar artery', 'Circulatory', 'Runs along the little-finger side of the forearm to supply the hand.'],
  palmar_arch: ['Palmar arch', 'Circulatory', 'A loop of arteries in the palm, formed by the radial and ulnar arteries, that feeds the fingers.'],
  common_iliac_artery: ['Common iliac artery', 'Circulatory', 'One of the two terminal branches of the aorta. Each one supplies the pelvis and a leg.'],
  external_iliac_artery: ['External iliac artery', 'Circulatory', 'Continues from the common iliac and becomes the femoral artery under the inguinal ligament.'],
  femoral_artery: ['Femoral artery', 'Circulatory', 'The main artery of the thigh. Its pulse can be felt in the groin.'],
  popliteal_artery: ['Popliteal artery', 'Circulatory', 'Runs behind the knee and divides into the tibial arteries.'],
  posterior_tibial_artery: ['Posterior tibial artery', 'Circulatory', 'Supplies the back of the leg and the sole. Its pulse can be felt behind the inner ankle.'],
  anterior_tibial_artery: ['Anterior tibial artery', 'Circulatory', 'Supplies the front of the leg and continues as the dorsalis pedis artery on top of the foot.'],
  renal_artery: ['Renal artery', 'Circulatory', 'Carries about 20% of the heart’s output to each kidney for filtering.'],
  celiac_trunk: ['Celiac trunk', 'Circulatory', 'A short aortic branch that supplies the liver, stomach and spleen.'],
  superior_mesenteric_artery: ['Superior mesenteric artery', 'Circulatory', 'Supplies the small intestine and the first half of the large intestine.'],

  // ---------------- Veins ----------------
  superior_vena_cava: ['Superior vena cava', 'Circulatory', 'Returns deoxygenated blood from the head, neck and arms to the right atrium.'],
  brachiocephalic_vein: ['Brachiocephalic vein', 'Circulatory', 'Formed by the internal jugular and subclavian veins. The two brachiocephalic veins join to form the superior vena cava.'],
  inferior_vena_cava: ['Inferior vena cava', 'Circulatory', 'The largest vein. It returns blood from the legs and abdomen to the heart.'],
  internal_jugular_vein: ['Internal jugular vein', 'Circulatory', 'Drains the brain and face. It runs next to the carotid artery.'],
  external_jugular_vein: ['External jugular vein', 'Circulatory', 'A superficial neck vein that drains the scalp and face. It is often visible when you strain.'],
  subclavian_vein: ['Subclavian vein', 'Circulatory', 'Drains the arm. It is a common site for central venous catheters.'],
  cephalic_vein: ['Cephalic vein', 'Circulatory', 'A superficial vein along the thumb side of the arm.'],
  basilic_vein: ['Basilic vein', 'Circulatory', 'A superficial vein along the little-finger side of the arm. It drains into the deep veins.'],
  median_cubital_vein: ['Median cubital vein', 'Circulatory', 'Crosses the front of the elbow. It is the usual site for drawing blood.'],
  common_iliac_vein: ['Common iliac vein', 'Circulatory', 'Drains the pelvis and a leg. The two common iliac veins join to form the inferior vena cava.'],
  external_iliac_vein: ['External iliac vein', 'Circulatory', 'The continuation of the femoral vein in the pelvis.'],
  femoral_vein: ['Femoral vein', 'Circulatory', 'The main deep vein of the thigh, running next to the femoral artery.'],
  popliteal_vein: ['Popliteal vein', 'Circulatory', 'A deep vein behind the knee and a common site for deep vein thrombosis (DVT).'],
  great_saphenous_vein: ['Great saphenous vein', 'Circulatory', 'The longest vein in the body. It runs from the foot up the inner leg and is often used for heart bypass grafts.'],
  small_saphenous_vein: ['Small saphenous vein', 'Circulatory', 'A superficial vein running up the back of the calf to the popliteal vein.'],
  renal_vein: ['Renal vein', 'Circulatory', 'Returns filtered blood from each kidney to the inferior vena cava.'],
  hepatic_portal_vein: ['Hepatic portal vein', 'Circulatory', 'Carries nutrient-rich blood from the intestines to the liver for processing.'],

  // ---------------- Nervous ----------------
  cerebrum: ['Cerebrum (hemisphere)', 'Nervous', 'The largest part of the brain. Its folded cortex handles thought, language, movement and the senses.'],
  cerebellum: ['Cerebellum', 'Nervous', 'Coordinates movement, balance and motor learning. It holds more than half of the brain’s neurons.'],
  brainstem: ['Brainstem', 'Nervous', 'Made of the midbrain, pons and medulla. It controls breathing, heart rate and consciousness.'],
  spinal_cord: ['Spinal cord', 'Nervous', 'Carries signals between the brain and body and coordinates reflexes. It ends around L1–L2.'],
  cauda_equina: ['Cauda equina', 'Nervous', 'The bundle of nerve roots below the end of the spinal cord. The name means "horse’s tail".'],
  optic_nerve: ['Optic nerve', 'Nervous', 'Cranial nerve II. It carries visual information from the retina. The two optic nerves cross partially at the optic chiasm.'],
  vagus_nerve: ['Vagus nerve', 'Nervous', 'Cranial nerve X. It wanders from the brainstem to the abdomen and is the main parasympathetic nerve for the heart, lungs and gut.'],
  sympathetic_trunk: ['Sympathetic trunk', 'Nervous', 'A chain of ganglia along the spine that drives the "fight or flight" response.'],
  intercostal_nerves: ['Intercostal nerves', 'Nervous', 'Run beneath each rib and supply the chest wall muscles and skin.'],
  brachial_plexus: ['Brachial plexus', 'Nervous', 'A network formed by nerve roots C5–T1. It gives rise to all the nerves of the arm.'],
  median_nerve: ['Median nerve', 'Nervous', 'Supplies most forearm flexors and the thumb side of the hand. It is compressed in carpal tunnel syndrome.'],
  ulnar_nerve: ['Ulnar nerve', 'Nervous', 'Passes behind the elbow (the "funny bone") and supplies the little finger and most small hand muscles.'],
  radial_nerve: ['Radial nerve', 'Nervous', 'Spirals around the humerus and supplies the arm and wrist extensors.'],
  femoral_nerve: ['Femoral nerve', 'Nervous', 'From the lumbar plexus. It supplies the quadriceps and the skin of the front of the thigh.'],
  sciatic_nerve: ['Sciatic nerve', 'Nervous', 'The thickest and longest nerve in the body. It runs down the back of the thigh.'],
  tibial_nerve: ['Tibial nerve', 'Nervous', 'A branch of the sciatic nerve that supplies the calf muscles and the sole of the foot.'],
  common_fibular_nerve: ['Common fibular nerve', 'Nervous', 'Wraps around the neck of the fibula. Injury here causes foot drop.'],

  // ---------------- Organs ----------------
  eye: ['Eye', 'Sensory', 'Focuses light onto the retina, which turns it into nerve signals that travel along the optic nerve.'],
  thyroid_gland: ['Thyroid gland', 'Endocrine', 'A butterfly-shaped gland that makes hormones controlling metabolism.'],
  larynx: ['Larynx', 'Respiratory', 'The voice box. It contains the vocal folds and protects the airway when you swallow.'],
  trachea: ['Trachea', 'Respiratory', 'The windpipe, held open by C-shaped cartilage rings. It carries air to the bronchi.'],
  bronchi: ['Main bronchus', 'Respiratory', 'One of the two branches of the trachea that lead into the lungs. The right bronchus is wider and more vertical.'],
  lung: ['Lung', 'Respiratory', 'Exchanges oxygen and CO₂ through about 300 million alveoli. The right lung has 3 lobes and the left has 2, leaving room for the heart.'],
  heart: ['Heart', 'Circulatory', 'A four-chambered muscular pump, about the size of a fist. It beats around 100,000 times a day.'],
  esophagus: ['Esophagus', 'Digestive', 'A muscular tube about 25 cm long that moves food from the throat to the stomach by peristalsis.'],
  liver: ['Liver', 'Digestive', 'The largest internal organ. It makes bile, stores glycogen, detoxifies blood and makes plasma proteins.'],
  gallbladder: ['Gallbladder', 'Digestive', 'Stores and concentrates bile from the liver and releases it to help digest fat.'],
  stomach: ['Stomach', 'Digestive', 'A J-shaped muscular sac that churns food with acid and enzymes into chyme.'],
  spleen: ['Spleen', 'Lymphatic', 'Filters the blood, recycles old red blood cells and helps fight infection.'],
  thymus: ['Thymus', 'Lymphatic', 'Behind the sternum. T cells mature here during childhood; after puberty it slowly turns to fat.'],
  pancreas: ['Pancreas', 'Digestive / Endocrine', 'Makes digestive enzymes and the hormones insulin and glucagon.'],
  kidney: ['Kidney', 'Urinary', 'Filters about 180 L of blood plasma a day, keeps fluids and electrolytes in balance and produces urine.'],
  adrenal_gland: ['Adrenal gland', 'Endocrine', 'Sits on top of each kidney and makes adrenaline, cortisol and aldosterone.'],
  ureter: ['Ureter', 'Urinary', 'A muscular tube that carries urine from the kidney to the bladder.'],
  urinary_bladder: ['Urinary bladder', 'Urinary', 'A stretchy muscular sac that stores urine. It typically holds 400–600 mL.'],
  small_intestine: ['Small intestine', 'Digestive', 'About 6 m long (duodenum, jejunum, ileum). Most digestion and nutrient absorption happens here.'],
  large_intestine: ['Large intestine', 'Digestive', 'The cecum, colon and rectum. It absorbs water and electrolytes and forms stool.'],
  appendix: ['Appendix', 'Digestive', 'A narrow pouch attached to the cecum that contains lymphoid tissue.'],
  prostate: ['Prostate', 'Reproductive', 'A walnut-sized gland below the bladder that makes part of the seminal fluid.'],
  seminal_vesicle: ['Seminal vesicle', 'Reproductive', 'A gland behind the bladder that makes most of the volume of seminal fluid.'],

  // ---------------- Skin ----------------
  skin: ['Skin', 'Integumentary', 'Skin is the body’s largest organ, about 2 m² in total. It has three layers: epidermis, dermis and subcutaneous fat.'],
};

export const STRUCTURES = Object.fromEntries(
  Object.entries(RAW).map(([id, [name, system, description]]) => [id, { id, name, system, description }]),
);

/** Model part names (regex on the Z-Anatomy name) that share a curated description. */
const ALIASES = [
  [/^(vertebra c\d|atlas|axis)\b/i, 'cervical_vertebrae'],
  [/^vertebra t\d/i, 'thoracic_vertebrae'],
  [/^vertebra l\d/i, 'lumbar_vertebrae'],
  [/^(intervertebral disc|nucleus pulposus)/i, 'intervertebral_discs'],
  [/^(costal cartilage)/i, 'costal_cartilage'],
  [/^(first|second|third|fourth|fifth|sixth|seventh) rib/i, 'true_ribs'],
  [/^(eighth|ninth|tenth) rib/i, 'false_ribs'],
  [/^(eleventh|twelfth) rib/i, 'floating_ribs'],
  [/sternum|manubrium|xiphoid/i, 'sternum'],
  [/^(scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate) bone/i, 'carpals'],
  [/metacarpal bone/i, 'metacarpals'],
  [/phalanx of .*hand/i, 'phalanges_hand'],
  [/phalanx of .*foot/i, 'phalanges_foot'],
  [/^(navicular|cuboid|(medial|intermediate|lateral) cuneiform) bone/i, 'tarsals'],
  [/metatarsal bone/i, 'metatarsals'],
  [/incisor|canine tooth|premolar|molar tooth/i, 'teeth'],
  [/^(frontal|parietal|occipital|temporal|sphenoid|ethmoid|nasal|lacrimal|zygomatic|palatine) bone|^maxilla|^vomer/i, 'skull'],
  [/^temporalis muscle/i, 'temporalis'],
  [/masseter/i, 'masseter'],
  [/sternocleidomastoid/i, 'sternocleidomastoid'],
  [/trapezius muscle/i, 'trapezius'],
  [/^(iliocostalis|longissimus|spinalis)/i, 'erector_spinae'],
  [/latissimus dorsi/i, 'latissimus_dorsi'],
  [/pectoralis major/i, 'pectoralis_major'],
  [/serratus anterior/i, 'serratus_anterior'],
  [/external abdominal oblique/i, 'external_oblique'],
  [/rectus abdominis/i, 'rectus_abdominis'],
  [/gluteus maximus/i, 'gluteus_maximus'],
  [/gluteus medius/i, 'gluteus_medius'],
  [/part of deltoid muscle|^deltoid muscle/i, 'deltoid'],
  [/biceps brachii/i, 'biceps_brachii'],
  [/triceps brachii/i, 'triceps_brachii'],
  [/brachioradialis/i, 'brachioradialis'],
  [/flexor carpi|flexor digitorum (superficialis|profundus)|flexor pollicis longus|palmaris longus|pronator teres/i, 'forearm_flexors'],
  [/extensor carpi|^extensor digitorum$|extensor digiti minimi|extensor indicis|extensor pollicis|abductor pollicis longus/i, 'forearm_extensors'],
  [/rectus femoris/i, 'rectus_femoris'],
  [/vastus lateralis/i, 'vastus_lateralis'],
  [/vastus medialis/i, 'vastus_medialis'],
  [/^sartorius/i, 'sartorius'],
  [/^\(?adductor (longus|brevis|magnus|minimus)|^gracilis/i, 'adductors'],
  [/biceps femoris/i, 'biceps_femoris'],
  [/semitendinosus|semimembranosus/i, 'semitendinosus'],
  [/gastrocnemius/i, 'gastrocnemius'],
  [/^soleus/i, 'soleus'],
  [/calcaneal tendon/i, 'achilles_tendon'],
  [/tibialis anterior/i, 'tibialis_anterior'],
  [/fibularis longus/i, 'fibularis_longus'],
  [/patellar ligament/i, 'patellar_tendon'],
  [/aortic arch|(ascending|thoracic|abdominal) aorta/i, 'aorta'],
  [/common carotid artery/i, 'common_carotid_artery'],
  [/subclavian artery/i, 'subclavian_artery'],
  [/palmar arch/i, 'palmar_arch'],
  [/renal artery/i, 'renal_artery'],
  [/co?eliac trunk/i, 'celiac_trunk'],
  [/brachiocephalic vein/i, 'brachiocephalic_vein'],
  [/inferior vena cava/i, 'inferior_vena_cava'],
  [/subclavian vein/i, 'subclavian_vein'],
  [/renal vein/i, 'renal_vein'],
  [/cerebell|vermis|flocculus|biventral|quadrangular lobule|semilunar lobule/i, 'cerebellum'],
  [/ lobe$|gyrus|sulcus|lobule|insula|cuneus|precuneus|operculum/i, 'cerebrum'],
  [/^pons|medulla oblongata|midbrain|peduncle|tegmentum/i, 'brainstem'],
  [/spinal cord|tract$|fasciculus/i, 'spinal_cord'],
  [/^optic nerve/i, 'optic_nerve'],
  [/^vagus nerve/i, 'vagus_nerve'],
  [/brachial plexus/i, 'brachial_plexus'],
  [/eyeball|^sclera|^cornea|^iris|^lens|^retina|vitreous body/i, 'eye'],
  [/thyroid cartilage|cricoid cartilage|arytenoid|epiglottis|laryngopharynx/i, 'larynx'],
  [/main bronchus/i, 'bronchi'],
  [/lobe of (left|right) lung/i, 'lung'],
  [/atrium|ventricle$/i, 'heart'],
  [/^oesophagus/i, 'esophagus'],
  [/suprarenal gland/i, 'adrenal_gland'],
  [/jejunum|ileum|duodenum/i, 'small_intestine'],
  [/colon$|caecum|rectum/i, 'large_intestine'],
  [/vermiform appendix/i, 'appendix'],
  [/seminal gland/i, 'seminal_vesicle'],
  [/^thymus|lobe of thymus/i, 'thymus'],
];

/** Display names of model parts, keyed by part id (filled in by the model loader). */
const MODEL_NAMES = new Map();

export const slugify = (name) =>
  name.replace(/[()*]/g, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export function registerModelName(id, name) {
  MODEL_NAMES.set(id, name.replace(/[()*]/g, '').replace(/\s+/g, ' ').trim());
}

const infoCache = new Map();

/** Curated entry for a part id: direct match, else the first alias that matches its model name. */
export function describe(id) {
  if (infoCache.has(id)) return infoCache.get(id);
  let s = STRUCTURES[id] ?? null;
  if (!s) {
    const name = MODEL_NAMES.get(id) ?? '';
    const hit = ALIASES.find(([re]) => re.test(name));
    s = hit ? STRUCTURES[hit[1]] ?? null : null;
  }
  infoCache.set(id, s);
  return s;
}

export function displayName(id, side) {
  const name = MODEL_NAMES.get(id) ?? STRUCTURES[id]?.name ?? id;
  if (!side) return name;
  return `${side > 0 ? 'Left' : 'Right'} ${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}
