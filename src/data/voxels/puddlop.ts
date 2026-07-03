// Puddlop — the dewy blue-lavender octo-blob that balances a puddle on its head.
// One big squishy round body, droopy water-drop ear-fins, four stubby tentacle
// feet, big pearly eyes, and a hollow golden puddle-ring hovering above the head.
import type { VoxelModel } from "../../shared/voxel";

export const puddlop: VoxelModel = {
  palette: [
    "#8ea6d4", // 0 body blue-lavender
    "#a8bce0", // 1 body light (highlights, fins)
    "#c6d6ef", // 2 belly / lighter front
    "#2e2823", // 3 dark eyes
    "#ecdfc4", // 4 cream eye-rim
    "#c9836a", // 5 coral mouth
    "#ffffff", // 6 eye shine
    "#cbb07e", // 7 halo gold
    "#f2e6c4", // 8 halo light (puddle water)
  ],
  parts: [
    // body: one big plump blob
    { name: "body", shape: "round", from: [-8, 1, -6], to: [8, 16, 6], color: 0 },
    // rounded crown cap to smooth the top of the head
    { name: "head-cap", shape: "dome", from: [-6, 12, -5], to: [6, 18, 4], color: 0 },
    // lighter belly patch on the front
    { name: "belly", shape: "round", from: [-5, 2, 3], to: [5, 10, 7], color: 2 },
    // droopy water-drop ear-fins: rounded top tapering to a low point
    { name: "ear", shape: "round", from: [7, 9, -2], to: [10, 14, 2], color: 1, mirror: true },
    { name: "ear-tip", shape: "round", from: [8, 6, -1], to: [10, 10, 1], color: 1, mirror: true },
    // stubby tentacle feet (front + back pair)
    { name: "foot-front", shape: "round", from: [3, 0, 3], to: [6, 2, 5], color: 1, mirror: true },
    { name: "foot-back", shape: "round", from: [3, 0, -5], to: [6, 2, -3], color: 1, mirror: true },
    // eye rims (cream, rounded)
    { name: "eye-rim", shape: "round", from: [3, 8, 4], to: [6, 13, 7], color: 4, mirror: true },
    // eye darks
    { name: "eye", shape: "round", from: [3, 9, 5], to: [5, 12, 7], color: 3, mirror: true },
    // halo puddle-ring hovering above the head (octagonal box segments)
    { name: "halo-front", shape: "box", from: [-3, 20, 5], to: [3, 21, 6], color: 7 },
    { name: "halo-back", shape: "box", from: [-3, 20, -6], to: [3, 21, -5], color: 7 },
    { name: "halo-side", shape: "box", from: [5, 20, -3], to: [6, 21, 3], color: 7, mirror: true },
    { name: "halo-corner-f", shape: "box", from: [3, 20, 4], to: [5, 21, 5], color: 8, mirror: true },
    { name: "halo-corner-b", shape: "box", from: [3, 20, -5], to: [5, 21, -4], color: 8, mirror: true },
  ],
  voxels: [
    // eye shine (bold 2x2 pearly glint on each eye's upper-inner surface)
    [4, 11, 7, 6],
    [3, 11, 7, 6],
    [4, 10, 7, 6],
    [3, 10, 7, 6],
    [-4, 11, 7, 6],
    [-3, 11, 7, 6],
    [-4, 10, 7, 6],
    [-3, 10, 7, 6],
    // coral mouth (small open smile: corners lift up)
    [0, 5, 7, 5],
    [1, 5, 7, 5],
    [-1, 5, 7, 5],
    [2, 6, 7, 5],
    [-2, 6, 7, 5],
  ],
};
