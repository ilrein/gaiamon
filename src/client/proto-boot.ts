// Entry for proto-preview.html: picks the renderer.
//   default      → raymarched SDF reference (proto-preview.ts)
//   ?mode=baked  → marching-cubes baked mesh (what battles use)
const mode = new URLSearchParams(location.search).get("mode");
if (mode === "baked") {
  import("./proto-baked-preview");
} else {
  import("./proto-preview");
}
