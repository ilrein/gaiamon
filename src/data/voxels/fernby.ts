// Fernby — the moss-chinchilla with a coiled fern fiddlehead tail.
// Hand-authored reference model for the voxel kit: round body via ellipsoid
// parts, mirrored leaf ears/paws, detail voxels for the face, and the
// signature spiral tail — a ring of chunky segments with a hollow centre that
// reads as a fiddlehead coil from the side.
import type { VoxelModel } from "../../shared/voxel";

export const fernby: VoxelModel = {
  palette: [
    "#7fae52", // 0 moss body
    "#9bcc6a", // 1 moss light (highlights, inner ear, tail tip)
    "#f4ecd2", // 2 cream belly/muzzle
    "#2f2723", // 3 dark (eyes, nose)
    "#5d8340", // 4 moss dark (tail stem, feet, shading)
    "#f4a9a0", // 5 blush
    "#ffffff", // 6 eye shine
  ],
  parts: [
    // --- body: one plump moss egg (head + body share the moss colour so
    //     there is no seam; the "head" is just the upper dome). ---
    { name: "body", shape: "round", from: [-6, 0, -5], to: [6, 12, 5], color: 0 },
    { name: "head", shape: "round", from: [-5, 9, -5], to: [5, 18, 4], color: 0 },
    // cream belly bulge (protrudes to z=6)
    { name: "belly", shape: "round", from: [-4, 1, 2], to: [4, 10, 6], color: 2 },
    // cream muzzle patch on the face (tall enough to host nose + smile)
    { name: "muzzle", shape: "round", from: [-2, 9, 3], to: [2, 13, 6], color: 2 },

    // --- leaf ears (mirrored): small rounded leaves tilting outward, so they
    //     read as ears (not tall prongs) and don't compete with the tail. ---
    { name: "ear-base", shape: "round", from: [3, 16, -2], to: [5, 19, 1], color: 0, mirror: true },
    { name: "ear-tip", shape: "round", from: [4, 18, -1], to: [6, 20, 1], color: 0, mirror: true },
    { name: "ear-inner", shape: "round", from: [4, 17, 0], to: [5, 19, 1], color: 1, mirror: true },

    // --- little front paws on the belly + feet ---
    { name: "paw", shape: "round", from: [3, 3, 4], to: [5, 6, 6], color: 0, mirror: true },
    { name: "foot", shape: "round", from: [1, 0, 3], to: [4, 2, 6], color: 4, mirror: true },

    // --- fern fiddlehead tail: a ring of chunky segments coiling around a
    //     hollow centre (z ~ -10, y ~ 15), sitting clearly BEHIND the body
    //     (z <= -6) so it reads as a distinct spiral, not a lump on the back.
    //     Thin in x (width 3) so the coil reads cleanly from the side; kept
    //     lower (top y~22) so it doesn't tower over the head like a prong. ---
    { name: "tail-stem", shape: "round", from: [-1, 3, -8], to: [1, 11, -4], color: 4 },
    { name: "coil-front", shape: "round", from: [-1, 13, -8], to: [1, 17, -4], color: 0 }, // a=0
    { name: "coil-fr-top", shape: "round", from: [-1, 16, -9], to: [1, 20, -5], color: 0 }, // a=45
    { name: "coil-top", shape: "round", from: [-1, 18, -12], to: [1, 22, -8], color: 0 }, // a=90
    { name: "coil-bk-top", shape: "round", from: [-1, 16, -15], to: [1, 20, -11], color: 0 }, // a=135
    { name: "coil-back", shape: "round", from: [-1, 13, -16], to: [1, 17, -12], color: 4 }, // a=180 (shaded)
    { name: "coil-bk-bot", shape: "round", from: [-1, 10, -15], to: [1, 14, -11], color: 0 }, // a=225
    { name: "coil-bot", shape: "round", from: [-1, 8, -12], to: [1, 12, -8], color: 0 }, // a=270
    // inner tip curling into the centre of the coil (the fiddlehead's eye)
    { name: "coil-tip", shape: "round", from: [-1, 11, -11], to: [1, 14, -8], color: 1 },

    // --- little fern fronds trailing down the outer back edge like a spine ---
    { name: "frond-1", shape: "round", from: [-1, 9, -16], to: [1, 11, -14], color: 1 },
    { name: "frond-2", shape: "round", from: [-1, 5, -17], to: [1, 8, -15], color: 1 },
    { name: "frond-3", shape: "round", from: [-1, 2, -18], to: [1, 4, -16], color: 1 },
  ],
  voxels: [
    // eyes: big glossy 2-wide x 3-tall blocks on the front head surface (z=5)
    [-3, 15, 5, 3],
    [-2, 15, 5, 3],
    [-3, 14, 5, 3],
    [-2, 14, 5, 3],
    [-3, 13, 5, 3],
    [-2, 13, 5, 3],
    [2, 15, 5, 3],
    [3, 15, 5, 3],
    [2, 14, 5, 3],
    [3, 14, 5, 3],
    [2, 13, 5, 3],
    [3, 13, 5, 3],
    // eye shine (protrudes 1 voxel, top-outer corner of each eye)
    [-3, 15, 6, 6],
    [3, 15, 6, 6],
    // nose (single voxel, top of the muzzle between the eyes)
    [0, 12, 6, 3],
    // shy smile below the nose: flat bottom with raised outer corners (‿)
    [-2, 10, 6, 3],
    [-1, 9, 6, 3],
    [0, 9, 6, 3],
    [1, 9, 6, 3],
    [2, 10, 6, 3],
    // blush cheeks
    [-4, 11, 5, 5],
    [4, 11, 5, 5],
  ],
};
