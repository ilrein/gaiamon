// Pottle — a bashful terracotta clay creature wearing an upside-down flowerpot
// as a hat: plump round body, stubby clay arms/feet, a flared pot brim ring
// over the head, soil at the drainage hole, and a two-leaf sprout on top.
import type { VoxelModel } from "../../shared/voxel";

export const pottle: VoxelModel = {
  palette: [
    "#d4763f", // 0 terracotta body (warm, brighter)
    "#b25f31", // 1 pot (deeper, weathered terracotta)
    "#e0925c", // 2 pot lip / rim highlight
    "#5fa83e", // 3 sprout leaf
    "#3f7d2a", // 4 sprout stem (dark green)
    "#2b211c", // 5 dark (eyes, mouth)
    "#ffffff", // 6 eye shine
    "#4a3526", // 7 soil
  ],
  parts: [
    // plump round clay body
    { name: "body", shape: "round", from: [-5, 1, -5], to: [5, 10, 5], color: 0 },
    // stubby feet
    { name: "foot", shape: "round", from: [1, 0, 1], to: [4, 2, 5], color: 0, mirror: true },
    // stubby arms at the sides
    { name: "arm", shape: "round", from: [4, 4, 0], to: [6, 7, 3], color: 0, mirror: true },

    // upside-down flowerpot hat: a truncated-pyramid frustum with smooth walls.
    // flared brim ring at the bottom — widest, overhangs the wall like a rim
    { name: "brim", shape: "box", from: [-7, 10, -7], to: [7, 12, 7], color: 1 },
    { name: "brim-lip", shape: "box", from: [-7, 10, -7], to: [7, 10, 7], color: 2 },
    // pot wall: two boxes tapering gently upward (smooth flat faces)
    { name: "wall-lower", shape: "box", from: [-6, 12, -6], to: [6, 16, 6], color: 1 },
    { name: "wall-upper", shape: "box", from: [-5, 16, -5], to: [5, 20, 5], color: 1 },
    // lighter rim band on the taper ledge (terracotta two-ring character)
    { name: "rim-band", shape: "box", from: [-6, 16, -6], to: [6, 16, 6], color: 2 },
    // pot base rim at the top (lighter lip around the drainage opening)
    { name: "top-lip", shape: "box", from: [-5, 20, -5], to: [5, 20, 5], color: 2 },

    // sprout: short green stem + two leaves splayed up-and-out
    { name: "stem", shape: "box", from: [0, 21, 0], to: [0, 22, 0], color: 4 },
    { name: "leaf-inner", shape: "round", from: [1, 22, -1], to: [2, 24, 1], color: 3, mirror: true },
    { name: "leaf-outer", shape: "round", from: [2, 23, -1], to: [5, 25, 2], color: 3, mirror: true },
  ],
  voxels: [
    // big happy eyes (2x2) with a symmetric shine, on the body front
    [-3, 6, 5, 5],
    [-2, 6, 5, 5],
    [-3, 5, 5, 5],
    [-2, 5, 5, 5],
    [3, 6, 5, 5],
    [2, 6, 5, 5],
    [3, 5, 5, 5],
    [2, 5, 5, 5],
    // eye shine (top-outer sparkle, symmetric)
    [-3, 6, 5, 6],
    [3, 6, 5, 6],
    // tiny smile (corners up)
    [-1, 4, 5, 5],
    [1, 4, 5, 5],
    [0, 3, 5, 5],
    // soil in the drainage hole at the pot top
    [0, 21, 0, 7],
    [1, 21, 0, 7],
    [-1, 21, 0, 7],
    [0, 21, 1, 7],
    [0, 21, -1, 7],
    // a couple soil crumbs where the pot brim meets the head
    [-4, 10, 3, 7],
    [4, 10, 3, 7],
  ],
};
