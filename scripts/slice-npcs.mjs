#!/usr/bin/env node
// Slices the Screen Smith Openmon walk-cycle sheets (CC0) into per-character
// sprite sheets the client consumes: 3 walk frames x 4 directions
// (rows: down, left, right, up), 18x26 px frames -> 54x104 per character.
// Output: public/sprites/npcs/walker-<n>.png
//
// Usage: bun scripts/slice-npcs.mjs

import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);

const py = `
from PIL import Image
import os

FRAME_W, FRAME_H = 18, 26
CHAR_W, CHAR_H = FRAME_W * 3, FRAME_H * 4
os.makedirs("public/sprites/npcs", exist_ok=True)

n = 0
for sheet_path in ["assets/screensmith/openmon-npc-set-1/walk-1.png",
                   "assets/screensmith/openmon-npc-set-1/walk-2.png"]:
    im = Image.open(sheet_path).convert("RGBA")
    cols = im.width // CHAR_W
    rows = im.height // CHAR_H
    for r in range(rows):
        for c in range(cols):
            box = (c * CHAR_W, r * CHAR_H, (c + 1) * CHAR_W, (r + 1) * CHAR_H)
            char = im.crop(box)
            alpha = char.getchannel("A")
            if alpha.getextrema()[1] < 20:
                continue  # empty slot
            char.save(f"public/sprites/npcs/walker-{n}.png")
            n += 1
print(f"sliced {n} characters")
`;

const { stdout } = await run("python3", ["-c", py]);
console.log(stdout.trim());
