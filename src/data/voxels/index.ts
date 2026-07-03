// Voxel creature registry. Species with a model here render as true voxel
// creatures; everything else falls back to its 2D sprite while the voxel
// roster grows. One file per creature — a creature PR is a data PR.

import type { VoxelModel } from "../../shared/voxel";
import { fernby } from "./fernby";
import { kindlet } from "./kindlet";
import { puddlop } from "./puddlop";
import { pottle } from "./pottle";

export const VOXELS: Record<string, VoxelModel> = {
  fernby,
  kindlet,
  puddlop,
  pottle,
};
