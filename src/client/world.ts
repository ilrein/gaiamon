import * as THREE from "three";

// Procedural placeholder world: pastel boxes on a checkered meadow.
// Real zones will come from a map format + generated pixel textures, but the
// scale/camera/lighting established here is the look we iterate on.

function checkerTexture(a: string, b: string, tiles = 16): THREE.Texture {
  const size = tiles * 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? a : b;
      ctx.fillRect(x * tiles, y * tiles, tiles, tiles);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(tiles, tiles);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeHouse(bodyColor: number, roofColor: number): THREE.Group {
  const house = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3, 2.4, 3),
    new THREE.MeshLambertMaterial({ color: bodyColor }),
  );
  body.position.y = 1.2;
  body.castShadow = true;
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.6, 1.6, 4),
    new THREE.MeshLambertMaterial({ color: roofColor }),
  );
  roof.position.y = 3.2;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  house.add(body, roof);
  return house;
}

function makeTree(): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 1),
    new THREE.MeshLambertMaterial({ color: 0x8a5a3b }),
  );
  trunk.position.y = 0.5;
  const leaves = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.9, 0),
    new THREE.MeshLambertMaterial({ color: 0x63b25b, flatShading: true }),
  );
  leaves.position.y = 1.6;
  leaves.castShadow = true;
  tree.add(trunk, leaves);
  return tree;
}

export const WORLD_BOUNDS = 13;

export function buildWorld(scene: THREE.Scene): void {
  scene.background = new THREE.Color(0x87c9e8);
  scene.fog = new THREE.Fog(0x87c9e8, 24, 46);

  const sun = new THREE.DirectionalLight(0xfff2d9, 2.2);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x7aa95c, 1.1));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshLambertMaterial({ map: checkerTexture("#8fce6a", "#83c25f", 30) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const houseSpots: Array<[number, number, number, number]> = [
    [-7, -6, 0xf6e3c5, 0xe07a5f],
    [7, -7, 0xcfe6f5, 0x6a8caf],
    [8, 5, 0xf9d5e5, 0xb56576],
    [-8, 6, 0xe8f0d8, 0x7a9e63],
  ];
  for (const [x, z, body, roof] of houseSpots) {
    const h = makeHouse(body, roof);
    h.position.set(x, 0, z);
    h.rotation.y = Math.atan2(-x, -z); // face the center
    scene.add(h);
  }

  const treeSpots: Array<[number, number]> = [
    [-11, -10], [-3, -10], [4, -11], [11, -11], [12, -2],
    [11, 10], [3, 11], [-4, 10], [-11, 11], [-12, 1],
  ];
  for (const [x, z] of treeSpots) {
    const t = makeTree();
    t.position.set(x, 0, z);
    t.scale.setScalar(0.85 + ((x * 13 + z * 7) % 10) / 25);
    scene.add(t);
  }
}
