#!/usr/bin/env node
// Sprite optimization pass:
// 1. Trim transparent padding so every creature fills its frame consistently
//    (mismatched padding made same-scale sprites render at different visual
//    sizes and off-center).
// 2. Re-center horizontally; preserve a fraction of the original bottom
//    padding so floating creatures keep their float.
// 3. Encode as WebP (alpha, q82) — ~4-6x smaller than the source PNGs.
// Reads public/sprites/creatures/*.png, writes .webp siblings; the PNGs are
// then removed from public/ (regenerate any time with the art pipeline).
//
// Usage: bun scripts/optimize-sprites.mjs

import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);

const py = `
import glob, os
from PIL import Image

SIDE = 512
total_before = total_after = 0
for path in sorted(glob.glob("public/sprites/creatures/*.png")) + ["public/sprites/warden.png"]:
    if not os.path.exists(path):
        continue
    im = Image.open(path).convert("RGBA")
    a = im.getchannel("A")
    bbox = a.getbbox()
    if not bbox:
        continue
    l, t, r, b = bbox
    w, h = r - l, b - t
    orig_bottom_pad = im.height - b

    # margin around content
    m = round(max(w, h) * 0.04)
    content = im.crop((max(0, l - m), max(0, t - m), min(im.width, r + m), min(im.height, b + m)))

    side = max(content.width, content.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    x = (side - content.width) // 2
    # keep 60% of the original float (capped) so airborne creatures still hover
    bottom_pad = min(round(orig_bottom_pad / im.height * side * 0.6), round(side * 0.16))
    y = side - content.height - bottom_pad
    canvas.paste(content, (x, max(0, y)))

    if side > SIDE:
        canvas = canvas.resize((SIDE, SIDE), Image.LANCZOS)

    out = path[:-4] + ".webp"
    canvas.save(out, "WEBP", quality=82, method=6)
    total_before += os.path.getsize(path)
    total_after += os.path.getsize(out)
    os.remove(path)

print(f"before: {total_before//1024}KB  after: {total_after//1024}KB")
`;

const { stdout } = await run("python3", ["-c", py], { maxBuffer: 10 * 1024 * 1024 });
console.log(stdout.trim());
