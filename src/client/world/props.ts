// Prop mesh library. Cute pastel low-poly props assembled from three.js
// primitives, one builder per PropPlacement kind. Everything is a Group anchored
// at its base (y = 0 sits on the ground) so the overworld can drop it straight
// onto a tile. Solid parts cast shadows; emissive parts glow.

import * as THREE from "three";
import type { PropPlacement } from "../../shared/area";

export type PropKind = PropPlacement["kind"];

type MatOpts = { flat?: boolean; emissive?: number; opacity?: number };

function lam(color: THREE.ColorRepresentation, opts: MatOpts = {}): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color,
    flatShading: opts.flat ?? false,
    emissive: opts.emissive ?? 0x000000,
    transparent: opts.opacity !== undefined && opts.opacity < 1,
    opacity: opts.opacity ?? 1,
  });
}

function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  shadow = true,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (shadow) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  return m;
}

/** Body color for a prop: the placement tint if given, else the kind default. */
function bodyColor(tint: string | undefined, fallback: number): THREE.Color {
  return tint ? new THREE.Color(tint) : new THREE.Color(fallback);
}

export function buildProp(kind: PropKind, tint?: string): THREE.Object3D {
  const g = new THREE.Group();

  switch (kind) {
    case "tree": {
      const leaf = bodyColor(tint, 0x74c46a);
      g.add(mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.9, 7), lam(0x9c6b43), 0, 0.45, 0));
      g.add(mesh(new THREE.IcosahedronGeometry(0.75, 0), lam(leaf, { flat: true }), 0, 1.35, 0));
      g.add(mesh(new THREE.IcosahedronGeometry(0.52, 0), lam(leaf.clone().offsetHSL(0, 0, 0.06), { flat: true }), 0.18, 1.9, -0.1));
      break;
    }
    case "pine": {
      const needle = bodyColor(tint, 0x5aa85f);
      g.add(mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.7, 6), lam(0x8a5a3b), 0, 0.35, 0));
      g.add(mesh(new THREE.ConeGeometry(0.7, 0.9, 7), lam(needle, { flat: true }), 0, 1.0, 0));
      g.add(mesh(new THREE.ConeGeometry(0.55, 0.8, 7), lam(needle.clone().offsetHSL(0, 0, 0.04), { flat: true }), 0, 1.5, 0));
      g.add(mesh(new THREE.ConeGeometry(0.4, 0.7, 7), lam(needle.clone().offsetHSL(0, 0, 0.08), { flat: true }), 0, 1.95, 0));
      break;
    }
    case "rock": {
      const stone = bodyColor(tint, 0x9aa0a6);
      const a = mesh(new THREE.IcosahedronGeometry(0.55, 0), lam(stone, { flat: true }), 0, 0.34, 0);
      a.scale.set(1, 0.7, 1);
      const b = mesh(new THREE.IcosahedronGeometry(0.32, 0), lam(stone.clone().offsetHSL(0, 0, -0.05), { flat: true }), 0.42, 0.22, 0.18);
      b.scale.set(1, 0.7, 1);
      g.add(a, b);
      break;
    }
    case "house": {
      const wall = bodyColor(tint, 0xf3e2c4);
      g.add(mesh(new THREE.BoxGeometry(1.6, 1.3, 1.6), lam(wall), 0, 0.65, 0));
      const roof = mesh(new THREE.ConeGeometry(1.35, 1.0, 4), lam(0xe07a5f, { flat: true }), 0, 1.75, 0);
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      g.add(mesh(new THREE.BoxGeometry(0.5, 0.7, 0.06), lam(0x8a5a3b), 0, 0.35, 0.82));
      break;
    }
    case "lantern": {
      g.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.1, 6), lam(0x4a3b2e), 0, 0.55, 0));
      g.add(mesh(new THREE.BoxGeometry(0.3, 0.36, 0.3), lam(0xffd98a, { emissive: 0xffb347 }), 0, 1.25, 0, false));
      g.add(mesh(new THREE.ConeGeometry(0.24, 0.18, 4), lam(0x4a3b2e), 0, 1.52, 0));
      // Toned down ~25% — with bloom in the postFX chain, brighter lamps blew
      // the path tiles out to a solid glow slab (visual-judge finding).
      const light = new THREE.PointLight(0xffca7a, 4.4, 6.5, 1.6);
      light.position.set(0, 1.25, 0);
      g.add(light);
      break;
    }
    case "waystone": {
      const stone = bodyColor(tint, 0x8b8f96);
      const body = mesh(new THREE.BoxGeometry(0.7, 2.0, 0.36), lam(stone, { flat: true }), 0, 1.0, 0);
      body.scale.set(1, 1, 1);
      g.add(body);
      // Glowing carved rune ring near the top.
      const ring = mesh(new THREE.TorusGeometry(0.42, 0.07, 8, 22), lam(0x2a6f6a, { emissive: 0x66e0d8 }), 0, 1.45, 0.2, false);
      g.add(ring);
      break;
    }
    case "fence": {
      const wood = bodyColor(tint, 0x9c6b43);
      g.add(mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), lam(wood), -0.4, 0.35, 0));
      g.add(mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), lam(wood), 0.4, 0.35, 0));
      g.add(mesh(new THREE.BoxGeometry(1.0, 0.1, 0.08), lam(wood.clone().offsetHSL(0, 0, 0.04)), 0, 0.5, 0));
      g.add(mesh(new THREE.BoxGeometry(1.0, 0.1, 0.08), lam(wood.clone().offsetHSL(0, 0, 0.04)), 0, 0.26, 0));
      break;
    }
    case "crystal": {
      const gem = bodyColor(tint, 0xb98cf0);
      const emit = gem.clone().offsetHSL(0, 0, -0.15).getHex();
      g.add(mesh(new THREE.IcosahedronGeometry(0.4, 0), lam(gem, { flat: true, emissive: emit }), 0, 0.42, 0));
      const s1 = mesh(new THREE.IcosahedronGeometry(0.26, 0), lam(gem, { flat: true, emissive: emit }), 0.32, 0.3, 0.1);
      s1.rotation.set(0.4, 0.2, 0.3);
      const s2 = mesh(new THREE.IcosahedronGeometry(0.2, 0), lam(gem, { flat: true, emissive: emit }), -0.28, 0.24, 0.2);
      s2.rotation.set(-0.3, 0.5, -0.2);
      g.add(s1, s2);
      break;
    }
    case "stump": {
      const wood = bodyColor(tint, 0x9c6b43);
      g.add(mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.5, 10), lam(wood), 0, 0.25, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 10), lam(0xc79a6d), 0, 0.53, 0));
      break;
    }
    case "bush": {
      const leaf = bodyColor(tint, 0x74c46a);
      g.add(mesh(new THREE.IcosahedronGeometry(0.45, 0), lam(leaf, { flat: true }), 0, 0.4, 0));
      g.add(mesh(new THREE.IcosahedronGeometry(0.34, 0), lam(leaf.clone().offsetHSL(0, 0, 0.05), { flat: true }), 0.35, 0.5, 0.1));
      g.add(mesh(new THREE.IcosahedronGeometry(0.3, 0), lam(leaf.clone().offsetHSL(0, 0, -0.04), { flat: true }), -0.3, 0.44, -0.05));
      break;
    }
    case "arch": {
      const stone = bodyColor(tint, 0xb9b2a4);
      g.add(mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.4, 8), lam(stone), -0.7, 0.7, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.4, 8), lam(stone), 0.7, 0.7, 0));
      const top = mesh(new THREE.TorusGeometry(0.7, 0.18, 8, 16, Math.PI), lam(stone.clone().offsetHSL(0, 0, 0.03)), 0, 1.4, 0);
      g.add(top);
      break;
    }
  }

  return g;
}
