// A procedural SDF creature: a GLSL chunk compiled into the proto-preview
// shell shader. The chunk must define:
//   vec2 speciesMap(vec3 p)  — signed distance + material id, in the
//     creature's local space (feet at y=0, facing +z, ~1.3 units tall).
//     Idle animation (breathe, sway, twitch) lives here, driven by uTime.
//   vec3 speciesAlbedo(vec3 p, float m, out float gloss, out float emissive)
//     — surface colour + painted face masks; gloss marks wet/eye highlights,
//     emissive marks self-lit surfaces (flames, embers).
// The shell provides noise/fbm, smin, sdEllipsoid, sdCapsule, rot, easing,
// uTime, and the action-verb system. See design/PROCEDURAL-CREATURES.md.
export interface ProtoSpecies {
  name: string;
  glsl: string;
}
