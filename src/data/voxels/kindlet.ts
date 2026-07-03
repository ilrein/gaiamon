// Kindlet — soot-grey ferret kit with a flickering kindling-flame topknot.
// Chibi proportions: big round head, low perky ferret body, cream muzzle/belly,
// amber eyes, ember freckles, and a 3-part flame topknot (orange core, yellow
// tip) as the signature silhouette. Little tail with an ember tip.
import type { VoxelModel } from "../../shared/voxel";

export const kindlet: VoxelModel = {
  palette: [
    "#574c46", // 0 soot body
    "#6b5d54", // 1 soot light (head)
    "#f4ecd2", // 2 cream muzzle/belly
    "#2a211d", // 3 dark (pupil, mouth)
    "#e0a24a", // 4 amber eye
    "#ff7a2e", // 5 ember (freckles, nose, tail tip, inner ear)
    "#ff9d3c", // 6 flame core
    "#ffd24a", // 7 flame tip
    "#ffffff", // 8 eye shine
    "#453b36", // 9 dark soot (feet)
  ],
  parts: [
    // sitting haunches / rump
    { name: "haunches", shape: "round", from: [-5, 0, -4], to: [5, 8, 5], color: 0 },
    // chest leaning forward (perky chest-up pose)
    { name: "chest", shape: "round", from: [-4, 5, 1], to: [4, 11, 6], color: 0 },
    // cream belly patch
    { name: "belly", shape: "round", from: [-3, 1, 3], to: [3, 9, 6], color: 2 },
    // big chibi head
    { name: "head", shape: "round", from: [-6, 10, -4], to: [6, 19, 6], color: 1 },
    // cream muzzle (lower face, protrudes forward)
    { name: "muzzle", shape: "round", from: [-3, 11, 4], to: [3, 14, 8], color: 2 },
    // rounded ferret ears (mirrored)
    { name: "ear", shape: "round", from: [4, 17, -2], to: [6, 20, 1], color: 1, mirror: true },
    { name: "ear-inner", shape: "round", from: [4, 17, 0], to: [5, 19, 1], color: 5, mirror: true },
    // stubby front paws poking over the belly (soot with ember toe voxels)
    { name: "paw", shape: "round", from: [2, 4, 6], to: [4, 7, 8], color: 0, mirror: true },
    // little feet
    { name: "foot", shape: "round", from: [1, 0, 1], to: [4, 2, 4], color: 9, mirror: true },
    // tail curling back with an ember tip
    { name: "tail", shape: "round", from: [-2, 1, -8], to: [2, 6, -4], color: 0 },
    { name: "tail-tip", shape: "round", from: [-1, 4, -9], to: [1, 6, -7], color: 5 },
    // kindling-flame topknot: teardrop core with asymmetric flicking licks
    { name: "flame-base", shape: "round", from: [-2, 18, -1], to: [2, 21, 3], color: 6 },
    { name: "flame-core", shape: "round", from: [-2, 20, 0], to: [1, 23, 3], color: 6 },
    // main tall lick, rising upright and flicking forward (+z) like the reference
    { name: "flame-lick-main", shape: "round", from: [-1, 21, 1], to: [1, 24, 3], color: 7 },
    { name: "flame-lick-tip", shape: "round", from: [0, 23, 2], to: [1, 25, 3], color: 7 },
    { name: "flame-lick-point", shape: "box", from: [0, 25, 2], to: [0, 26, 3], color: 7 },
    // secondary tongue curling up the other side for flicker
    { name: "flame-lick-side", shape: "box", from: [-2, 20, 0], to: [-2, 23, 2], color: 7 },
  ],
  voxels: [
    // left amber eye (3x3) on the head front
    [-4, 15, 6, 4], [-3, 15, 6, 4], [-2, 15, 6, 4],
    [-4, 16, 6, 4], [-3, 16, 6, 4], [-2, 16, 6, 4],
    [-4, 17, 6, 4], [-3, 17, 6, 4], [-2, 17, 6, 4],
    [-3, 16, 6, 3], // pupil
    [-3, 17, 7, 8], // shine (pops forward)
    // right amber eye
    [2, 15, 6, 4], [3, 15, 6, 4], [4, 15, 6, 4],
    [2, 16, 6, 4], [3, 16, 6, 4], [4, 16, 6, 4],
    [2, 17, 6, 4], [3, 17, 6, 4], [4, 17, 6, 4],
    [3, 16, 6, 3], // pupil
    [3, 17, 7, 8], // shine
    // ember freckle dashes on the cheeks, just under/outside each eye (front)
    [-5, 14, 5, 5], [-4, 14, 6, 5], [-5, 13, 4, 5],
    [5, 14, 5, 5], [4, 14, 6, 5], [5, 13, 4, 5],
    // ember nose at the muzzle tip
    [0, 13, 8, 5], [0, 12, 8, 5],
    // dark open-mouth flash
    [0, 11, 7, 3],
    // glowing ember toes on the front paws
    [3, 4, 8, 5], [-3, 4, 8, 5],
    // yellow inner glow on the flame core (front)
    [0, 21, 3, 7], [-1, 20, 3, 7],
  ],
  carve: [
    // little open grin under the nose
    { from: [-1, 11, 8], to: [1, 11, 8] },
  ],
};
