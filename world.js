import * as THREE from "three";

export function createWorld(canvas, onFallback) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch (error) {
    onFallback(error);
    return {
      dispose() {},
      setReducedMotion() {},
      enterPortal() {},
      resetPortal() {},
      setTheme() {},
      interact() {},
      collectTreasure() {},
      resetTreasures() {},
      onProximity() {},
      triggerCelebration() {},
      setPrincessOutfit() {},
      setPrincessCrown() {},
      setPrincessTrail() {},
      setKariStyle() {},
      collectQuestStar() {},
      lightDiya() {},
      placeMarigold() {},
      teleportTo() {},
    };
  }

  const scene = new THREE.Scene();
  const fairySkyColor = new THREE.Color("#6bb8f6");
  const fairyFogColor = new THREE.Color("#d8efff");
  scene.background = fairySkyColor.clone();
  scene.fog = new THREE.FogExp2(fairyFogColor.clone(), 0.0035);

  const fairyWorld = new THREE.Group();
  const dashainWorld = new THREE.Group();
  scene.add(fairyWorld, dashainWorld);
  dashainWorld.visible = false;

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 240);
  camera.position.set(0, 9, 38);
  camera.lookAt(0, 5, 0);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.2 : 1.7));
  renderer.shadowMap.enabled = window.innerWidth >= 700;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const skyLight = new THREE.HemisphereLight("#ffffff", "#95cf76", 2.6);
  scene.add(skyLight);

  const sunLight = new THREE.DirectionalLight("#fff8e7", 3.4);
  sunLight.position.set(-14, 28, 18);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 80;
  sunLight.shadow.camera.left = -25;
  sunLight.shadow.camera.right = 25;
  sunLight.shadow.camera.top = 25;
  sunLight.shadow.camera.bottom = -15;
  scene.add(sunLight);

  const festiveLight = new THREE.PointLight("#ffb347", 0, 36, 1.8);
  festiveLight.position.set(0, 8, -6);
  scene.add(festiveLight);

  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.65, ...extra });
  const groundMat = material("#92d373", { roughness: 0.95 });
  const pathMat = material("#fdf3e5", { roughness: 0.85 });
  const lakeMat = material("#48cae4", { roughness: 0.15, metalness: 0.12, transparent: true, opacity: 0.85 });
  const bridgeMat = material("#fff9ee", { roughness: 0.7 });

  const castleIvory = material("#fffaf2", { roughness: 0.6 });
  const castlePink = material("#f7bdd3", { roughness: 0.65 });
  const castleAccentPink = material("#f09ab9", { roughness: 0.55 });
  const roofBlue = material("#2b6cb0", { roughness: 0.45, metalness: 0.15 });
  const roofDarkBlue = material("#1e4f8a", { roughness: 0.45, metalness: 0.18 });
  const goldMat = material("#f6d37b", { metalness: 0.4, roughness: 0.32, emissive: "#7d5e18", emissiveIntensity: 0.18 });
  const darkWood = material("#5a3422", { roughness: 0.75 });
  const castleDoorWood = new THREE.MeshStandardMaterial({
    color: "#4a2818",
    roughness: 0.72,
    metalness: 0.05,
    transparent: false,
    depthWrite: true,
  });
  const castleDoorTrim = new THREE.MeshStandardMaterial({
    color: "#6b3b24",
    roughness: 0.68,
    metalness: 0.08,
    transparent: false,
    depthWrite: true,
  });
  const castleDoorGold = new THREE.MeshStandardMaterial({
    color: "#ffd166",
    metalness: 0.55,
    roughness: 0.28,
    emissive: "#805b10",
    emissiveIntensity: 0.18,
    transparent: false,
    depthWrite: true,
  });
  const windowGlow = material("#fff4b8", { emissive: "#ffdb6d", emissiveIntensity: 0.75, roughness: 0.3 });
  const foliagePink = material("#fbcfe8", { roughness: 0.8 });
  const foliageDeepPink = material("#f472b6", { roughness: 0.8 });
  const foliageGreen = material("#52b788", { roughness: 0.8 });
  const foliageDarkGreen = material("#2d6a4f", { roughness: 0.85 });

  const addMesh = (geometry, mat, parent = fairyWorld, position = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const cylinder = (radiusTop, radiusBottom, height, mat, position, segments = 16, parent = fairyWorld) =>
    addMesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), mat, parent, position);

  // 1. MAIN ISLAND & MEADOW
  const island = addMesh(new THREE.CylinderGeometry(20, 24, 3, 64), groundMat, fairyWorld, [0, -1.4, 0]);
  island.scale.z = 0.82;
  const innerGarden = addMesh(new THREE.CylinderGeometry(17, 19, 0.5, 64), material("#a3e687"), fairyWorld, [0, 0.12, -2]);
  innerGarden.scale.z = 0.85;

  // 2. SUN & DRIFTING WHITE CLOUDS
  const sunGroup = new THREE.Group();
  sunGroup.position.set(-18, 24, -36);
  fairyWorld.add(sunGroup);
  addMesh(new THREE.SphereGeometry(2.8, 32, 32), material("#fff7c2", { emissive: "#ffeaa7", emissiveIntensity: 1 }), sunGroup, [0, 0, 0]);
  const sunGlow = addMesh(new THREE.SphereGeometry(4.2, 32, 32), new THREE.MeshBasicMaterial({ color: "#fff5ba", transparent: true, opacity: 0.18 }), sunGroup, [0, 0, 0]);
  sunGlow.scale.set(1.2, 1.2, 0.2);

  const clouds = [];
  const createPuffyCloud = (x, y, z, scale = 1) => {
    const cloud = new THREE.Group();
    cloud.position.set(x, y, z);
    const cloudPuffMat = material("#ffffff", { roughness: 1, transparent: true, opacity: 0.88 });
    const p1 = addMesh(new THREE.SphereGeometry(1.6 * scale, 16, 14), cloudPuffMat, cloud, [0, 0, 0]);
    p1.scale.set(1.6, 0.75, 0.9);
    addMesh(new THREE.SphereGeometry(1.2 * scale, 14, 12), cloudPuffMat, cloud, [-1.3 * scale, 0.25 * scale, 0]);
    addMesh(new THREE.SphereGeometry(1.3 * scale, 14, 12), cloudPuffMat, cloud, [1.2 * scale, 0.15 * scale, 0]);
    addMesh(new THREE.SphereGeometry(1.0 * scale, 12, 10), cloudPuffMat, cloud, [0.3 * scale, 0.7 * scale, 0.2 * scale]);
    fairyWorld.add(cloud);
    clouds.push({ group: cloud, baseX: x, speed: 0.4 + Math.random() * 0.3 });
  };
  createPuffyCloud(-22, 17, -26, 1.4);
  createPuffyCloud(18, 20, -32, 1.6);
  createPuffyCloud(-6, 19, -20, 1.2);
  createPuffyCloud(8, 15, -16, 1.0);
  createPuffyCloud(-28, 14, -14, 1.1);

  // 3. MOUNTAINS & GREEN HILLS
  const mountainMat = material("#a3c4dc", { roughness: 0.95 });
  const snowMat = material("#fff9f6", { roughness: 0.9 });
  for (let i = 0; i < 16; i += 1) {
    const x = -42 + i * 5.6;
    const height = 11 + (i % 5) * 2.4;
    const z = -40 - (i % 3) * 3;
    addMesh(new THREE.ConeGeometry(5.5 + (i % 3), height, 6), mountainMat, fairyWorld, [x, height / 2 - 2, z]);
    addMesh(new THREE.ConeGeometry(2.6, height * 0.32, 6), snowMat, fairyWorld, [x, height * 0.84 - 2, z]);
  }
  for (let i = 0; i < 10; i += 1) {
    const x = -30 + i * 6.5;
    const hill = addMesh(new THREE.SphereGeometry(5.5, 16, 14), material("#82cb68"), fairyWorld, [x, -1.8, -26 + (i % 2) * 4]);
    hill.scale.set(1.4, 0.65, 1);
  }

  // 4. MOONLIGHT LAKE & LILIES
  const lakeGroup = new THREE.Group();
  lakeGroup.position.set(-7, 0.22, 7.5);
  fairyWorld.add(lakeGroup);
  const lake = addMesh(new THREE.CylinderGeometry(5.2, 5.6, 0.25, 48), lakeMat, lakeGroup, [0, 0, 0]);
  lake.scale.set(1.5, 1, 0.7);
  for (let a = 0; a < Math.PI * 2; a += 0.35) {
    const rx = Math.cos(a) * 7.4 + (Math.sin(a * 4) * 0.4);
    const rz = Math.sin(a) * 3.6 + (Math.cos(a * 3) * 0.3);
    const stone = addMesh(new THREE.SphereGeometry(0.35 + (Math.sin(a * 7) * 0.15), 8, 8), material("#e5dac7"), lakeGroup, [rx, 0.05, rz]);
    stone.scale.set(1.2, 0.6, 1);
  }
  const lilies = [];
  for (let i = 0; i < 6; i += 1) {
    const pad = addMesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 12), material("#2d6a4f"), lakeGroup, [-3.5 + i * 1.3, 0.14, -1 + (i % 3) * 0.9]);
    const flower = addMesh(new THREE.SphereGeometry(0.14, 8, 8), material(i % 2 ? "#ffaec9" : "#fff0f5"), lakeGroup, [-3.5 + i * 1.3, 0.24, -1 + (i % 3) * 0.9]);
    lilies.push({ pad, flower });
  }

  // 5. CRYSTAL BRIDGE
  const bridge = new THREE.Group();
  bridge.position.set(-1.5, 0.2, 5.5);
  fairyWorld.add(bridge);
  const bridgeDeck = addMesh(new THREE.BoxGeometry(3.6, 0.32, 6.5), bridgeMat, bridge, [0, 0.4, 0]);
  bridgeDeck.rotation.x = 0.04;
  for (const x of [-1.7, 1.7]) {
    addMesh(new THREE.BoxGeometry(0.24, 0.65, 6.5), bridgeMat, bridge, [x, 0.8, 0]);
    for (let z = -2.6; z <= 2.6; z += 1.3) {
      addMesh(new THREE.BoxGeometry(0.34, 0.85, 0.34), bridgeMat, bridge, [x, 0.9, z]);
      addMesh(new THREE.SphereGeometry(0.14, 8, 8), goldMat, bridge, [x, 1.38, z]);
    }
  }

  // 6. PATHWAYS
  addMesh(new THREE.BoxGeometry(3.2, 0.06, 12), pathMat, fairyWorld, [0, 0.26, -1]).receiveShadow = true;
  addMesh(new THREE.BoxGeometry(16, 0.05, 2.6), pathMat, fairyWorld, [0, 0.25, 1.5]).receiveShadow = true;

  // 7. GRAND FAIRY-TALE CASTLE
  const castle = new THREE.Group();
  castle.position.set(0, 0.25, -10.5);
  fairyWorld.add(castle);

  addMesh(new THREE.BoxGeometry(18, 2.4, 10), castleIvory, castle, [0, 1.2, 0]);
  for (const [x, z] of [[-8.8, 0], [8.8, 0], [0, 4.8]]) {
    const isFront = z > 0;
    const w = isFront ? 18 : 10;
    const rot = isFront ? 0 : Math.PI / 2;
    const balustrade = addMesh(new THREE.BoxGeometry(w, 0.5, 0.25), goldMat, castle, [x, 2.6, z]);
    balustrade.rotation.y = rot;
  }

  // Grand Entrance Stairs
  for (let s = 0; s < 6; s += 1) {
    const stepDepth = 0.55;
    const stepHeight = 0.32;
    addMesh(new THREE.BoxGeometry(5.2 - s * 0.2, stepHeight, stepDepth), castleIvory, castle, [0, s * stepHeight + 0.16, 5.2 + (5 - s) * stepDepth]).receiveShadow = true;
  }
  for (const sx of [-2.8, 2.8]) {
    addMesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), castleIvory, castle, [sx, 0.7, 8.2]);
    addMesh(new THREE.SphereGeometry(0.22, 12, 10), goldMat, castle, [sx, 1.55, 8.2]);
  }

  // Main Central Palace Keep
  const centralKeep = new THREE.Group();
  centralKeep.position.set(0, 2.4, 0);
  castle.add(centralKeep);
  addMesh(new THREE.BoxGeometry(11, 7.2, 6.8), castleIvory, centralKeep, [0, 3.6, 0]);
  addMesh(new THREE.BoxGeometry(9.6, 6.2, 0.2), castlePink, centralKeep, [0, 3.6, 3.42]);
  addMesh(new THREE.BoxGeometry(9.6, 6.2, 0.2), castlePink, centralKeep, [0, 3.6, -3.42]);
  addMesh(new THREE.BoxGeometry(11.4, 0.45, 7.2), goldMat, centralKeep, [0, 7.3, 0]);

  // Grand Entrance Portal & Solid Wooden Castle Door (Stationary, Non-Overlapping, Zero Z-Fighting)
  const entranceGroup = new THREE.Group();
  entranceGroup.position.set(0, 0, 3.52);
  centralKeep.add(entranceGroup);

  // 1. Dark interior alcove backing (z = 0.04)
  addMesh(new THREE.BoxGeometry(2.9, 4.1, 0.08), castleDoorWood, entranceGroup, [0, 2.05, 0.04]);

  // 2. Doorway Stone Pillars & Lintel Frame (z = 0.30, depth 0.50 -> front face at z = 0.55)
  // Left pillar
  addMesh(new THREE.BoxGeometry(0.55, 4.3, 0.5), castleIvory, entranceGroup, [-1.55, 2.15, 0.30]);
  // Right pillar
  addMesh(new THREE.BoxGeometry(0.55, 4.3, 0.5), castleIvory, entranceGroup, [1.55, 2.15, 0.30]);
  // Top lintel
  addMesh(new THREE.BoxGeometry(3.65, 0.65, 0.5), castleIvory, entranceGroup, [0, 4.3, 0.30]);
  // Grand entrance threshold step
  addMesh(new THREE.BoxGeometry(3.4, 0.22, 0.55), castleIvory, entranceGroup, [0, 0.11, 0.33]);

  // 3. Solid Wooden Double Doors (Recessed at z = 0.18, thickness 0.14 -> front face at z = 0.25)
  // Leaves are recessed well behind the pillars (z = 0.25 vs z = 0.55) -> 0.30 units clearance!
  // Leaves have a 0.04 center seam gap: left is x=[-1.23, -0.02], right is x=[0.02, 1.23] -> Zero overlap!
  addMesh(new THREE.BoxGeometry(1.21, 3.7, 0.14), castleDoorWood, entranceGroup, [-0.625, 1.85, 0.18]);
  addMesh(new THREE.BoxGeometry(1.21, 3.7, 0.14), castleDoorWood, entranceGroup, [0.625, 1.85, 0.18]);

  // 4. Inset Wood Molding Panels (z = 0.27, thickness 0.03 -> front face at z = 0.285)
  // Left door panels
  addMesh(new THREE.BoxGeometry(0.96, 1.35, 0.03), castleDoorTrim, entranceGroup, [-0.625, 2.75, 0.27]);
  addMesh(new THREE.BoxGeometry(0.96, 1.35, 0.03), castleDoorTrim, entranceGroup, [-0.625, 1.05, 0.27]);
  // Right door panels
  addMesh(new THREE.BoxGeometry(0.96, 1.35, 0.03), castleDoorTrim, entranceGroup, [0.625, 2.75, 0.27]);
  addMesh(new THREE.BoxGeometry(0.96, 1.35, 0.03), castleDoorTrim, entranceGroup, [0.625, 1.05, 0.27]);

  // 5. Classic Golden Door Handles & Plates (z = 0.30, 0.35)
  addMesh(new THREE.BoxGeometry(0.08, 0.42, 0.02), castleDoorGold, entranceGroup, [-0.14, 1.7, 0.30]);
  addMesh(new THREE.BoxGeometry(0.08, 0.42, 0.02), castleDoorGold, entranceGroup, [0.14, 1.7, 0.30]);
  addMesh(new THREE.SphereGeometry(0.07, 10, 8), castleDoorGold, entranceGroup, [-0.14, 1.7, 0.35]);
  addMesh(new THREE.SphereGeometry(0.07, 10, 8), castleDoorGold, entranceGroup, [0.14, 1.7, 0.35]);

  // 6. Golden Arch Molding & Pilaster Trims (Proudly forward at z = 0.58)
  addMesh(new THREE.BoxGeometry(0.14, 4.3, 0.08), goldMat, entranceGroup, [-1.30, 2.15, 0.58]);
  addMesh(new THREE.BoxGeometry(0.14, 4.3, 0.08), goldMat, entranceGroup, [1.30, 2.15, 0.58]);
  addMesh(new THREE.TorusGeometry(1.36, 0.12, 10, 28, Math.PI), goldMat, entranceGroup, [0, 3.65, 0.58]);
  const crest = addMesh(new THREE.SphereGeometry(0.2, 10, 8), goldMat, entranceGroup, [0, 4.75, 0.60]);
  crest.scale.set(1, 1.25, 0.5);

  // Royal Balcony & Windows
  const balcony = new THREE.Group();
  balcony.position.set(0, 4.6, 3.6);
  centralKeep.add(balcony);
  addMesh(new THREE.BoxGeometry(4.4, 0.35, 1.2), castleIvory, balcony, [0, 0, 0.5]);
  addMesh(new THREE.BoxGeometry(4.4, 0.65, 0.1), goldMat, balcony, [0, 0.45, 1.05]);
  addMesh(new THREE.BoxGeometry(1.8, 2.6, 0.15), windowGlow, centralKeep, [0, 6.0, 3.48]);
  for (const wx of [-3.4, 3.4]) {
    addMesh(new THREE.BoxGeometry(1.1, 1.8, 0.15), windowGlow, centralKeep, [wx, 2.2, 3.48]);
    addMesh(new THREE.BoxGeometry(1.1, 1.8, 0.15), windowGlow, centralKeep, [wx, 5.2, 3.48]);
  }

  // Towers with blue pointed roofs
  [
    { x: -6.4, z: 3.8, h: 12 },
    { x: 6.4, z: 3.8, h: 12 },
  ].forEach(({ x, z, h }) => {
    cylinder(1.5, 1.7, h, castleIvory, [x, h / 2, z], 20, castle);
    cylinder(1.55, 1.55, 0.45, castlePink, [x, 4.2, z], 20, castle);
    cylinder(1.85, 1.5, 0.75, castleIvory, [x, h + 0.35, z], 20, castle);
    addMesh(new THREE.ConeGeometry(2.1, 4.8, 20), roofBlue, castle, [x, h + 3.1, z]);
    addMesh(new THREE.CylinderGeometry(0.08, 0.12, 1.8, 8), goldMat, castle, [x, h + 5.8, z]);
    addMesh(new THREE.SphereGeometry(0.24, 12, 10), goldMat, castle, [x, h + 6.8, z]);
  });

  [
    { x: -5.8, z: -4.2, h: 16 },
    { x: 5.8, z: -4.2, h: 16 },
  ].forEach(({ x, z, h }) => {
    cylinder(1.35, 1.55, h, castleIvory, [x, h / 2, z], 18, castle);
    addMesh(new THREE.ConeGeometry(1.85, 5.6, 18), roofDarkBlue, castle, [x, h + 3.5, z]);
    addMesh(new THREE.SphereGeometry(0.22, 10, 8), goldMat, castle, [x, h + 7.8, z]);
  });

  // Grand Central Spire
  const centralSpire = new THREE.Group();
  centralSpire.position.set(0, 9.6, 0);
  centralKeep.add(centralSpire);
  cylinder(1.8, 2.0, 5.5, castleIvory, [0, 2.75, 0], 8, centralSpire);
  cylinder(2.2, 1.8, 0.65, goldMat, [0, 5.8, 0], 8, centralSpire);
  addMesh(new THREE.ConeGeometry(2.4, 7.5, 24), roofBlue, centralSpire, [0, 9.6, 0]);
  addMesh(new THREE.CylinderGeometry(0.09, 0.14, 3.0, 8), goldMat, centralSpire, [0, 14.8, 0]);
  addMesh(new THREE.SphereGeometry(0.38, 14, 12), goldMat, centralSpire, [0, 16.4, 0]);

  // Terraces flowers
  for (let f = 0; f < 32; f += 1) {
    const fx = -7 + (f % 11) * 1.4;
    const bloom = addMesh(new THREE.SphereGeometry(0.18 + (f % 3) * 0.05, 8, 6), f % 2 ? foliagePink : foliageDeepPink, castle, [fx, 2.4, 4.8]);
    bloom.scale.set(1.1, 0.8, 1.1);
  }

  // 8. MAGICAL DRESSING ROOM MIRROR IN CASTLE (Castle Forecourt at x: 3.5, z: -3.5)
  const mirrorGroup = new THREE.Group();
  mirrorGroup.position.set(3.5, 0.4, -3.5);
  fairyWorld.add(mirrorGroup);
  addMesh(new THREE.BoxGeometry(1.2, 0.25, 0.6), castleIvory, mirrorGroup, [0, 0.12, 0]);
  addMesh(new THREE.BoxGeometry(1.0, 2.4, 0.12), goldMat, mirrorGroup, [0, 1.35, 0]);
  const mirrorGlass = addMesh(new THREE.BoxGeometry(0.78, 2.1, 0.08), material("#dbeafe", { metalness: 0.9, roughness: 0.1 }), mirrorGroup, [0, 1.35, 0.04]);
  addMesh(new THREE.SphereGeometry(0.18, 10, 8), goldMat, mirrorGroup, [0, 2.65, 0]);

  // 9. HIDDEN ROSE DOORWAY ON LEFT CASTLE WALL (x: -6.5, z: -8.5)
  const secretDoorGroup = new THREE.Group();
  secretDoorGroup.position.set(-6.5, 0.4, -8.5);
  fairyWorld.add(secretDoorGroup);
  // Pink marble door frame
  addMesh(new THREE.BoxGeometry(2.4, 4.2, 0.35), castlePink, secretDoorGroup, [0, 2.1, 0]);
  // Golden carved hearts
  const heartLeft = addMesh(new THREE.SphereGeometry(0.2, 8, 8), goldMat, secretDoorGroup, [-0.25, 2.2, 0.2]);
  const heartRight = addMesh(new THREE.SphereGeometry(0.2, 8, 8), goldMat, secretDoorGroup, [0.25, 2.2, 0.2]);
  heartLeft.scale.set(1, 1.3, 0.6);
  heartRight.scale.set(1, 1.3, 0.6);
  // Surrounding Rose Vines
  for (let r = 0; r < 14; r += 1) {
    const ry = 0.5 + r * 0.28;
    const rx = (r % 2 === 0 ? -1.0 : 1.0) * (0.8 + Math.sin(r) * 0.25);
    addMesh(new THREE.SphereGeometry(0.14, 8, 8), r % 2 ? foliagePink : foliageDeepPink, secretDoorGroup, [rx, ry, 0.22]);
  }

  // 10. TREES & VEGETATION
  const treesGroup = new THREE.Group();
  fairyWorld.add(treesGroup);
  [
    { x: -9.5, z: -1, type: "cherry", scale: 1.3 },
    { x: -8.5, z: 4.5, type: "cherry", scale: 1.1 },
    { x: 9.5, z: -1, type: "cherry", scale: 1.3 },
    { x: 8.5, z: 4.5, type: "cherry", scale: 1.1 },
    { x: -13, z: -6, type: "cherry", scale: 1.4 },
    { x: 13, z: -6, type: "cherry", scale: 1.4 },
    { x: -14, z: 2, type: "green", scale: 1.2 },
    { x: 14, z: 2, type: "green", scale: 1.2 },
  ].forEach(({ x, z, type, scale }) => {
    cylinder(0.24 * scale, 0.44 * scale, 2.6 * scale, darkWood, [x, 1.3 * scale, z], 8, treesGroup);
    if (type === "cherry") {
      const c1 = addMesh(new THREE.SphereGeometry(1.6 * scale, 14, 12), foliagePink, treesGroup, [x, 3.2 * scale, z]);
      c1.scale.set(1.3, 0.9, 1.2);
      addMesh(new THREE.SphereGeometry(1.2 * scale, 12, 10), foliageDeepPink, treesGroup, [x + 0.6 * scale, 3.6 * scale, z + 0.3 * scale]);
    } else {
      addMesh(new THREE.ConeGeometry(1.4 * scale, 3.8 * scale, 10), foliageGreen, treesGroup, [x, 3.4 * scale, z]);
    }
  });

  // 11. THREE QUEST STARS IN THE 3D WORLD
  const questStars = {};
  [
    { id: "star_1", x: -1.5, y: 1.3, z: 5.5, label: "Star by Crystal Bridge" },
    { id: "star_2", x: -8.0, y: 1.3, z: -1.0, label: "Star in Enchanted Garden" },
    { id: "star_3", x: 2.5, y: 1.5, z: -3.0, label: "Star by Castle Balcony" },
  ].forEach(({ id, x, y, z }) => {
    const starGroup = new THREE.Group();
    starGroup.position.set(x, y, z);
    fairyWorld.add(starGroup);
    // Glowing 3D Star
    const starCore = addMesh(new THREE.OctahedronGeometry(0.35, 0), windowGlow, starGroup);
    starCore.scale.set(1, 1.6, 1);
    const starHalo = addMesh(new THREE.SphereGeometry(0.7, 12, 10), new THREE.MeshBasicMaterial({ color: "#fef08a", transparent: true, opacity: 0.3 }), starGroup);
    questStars[id] = { group: starGroup, core: starCore, halo: starHalo, collected: false, x, z };
  });

  // 12. FLOATING PETALS & PARTICLES
  const petals = [];
  const petalMat = material("#f9a8d4", { roughness: 0.6, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 28; i += 1) {
    const pMesh = addMesh(new THREE.SphereGeometry(0.12, 6, 6), petalMat, fairyWorld);
    pMesh.scale.set(1, 0.2, 1.4);
    petals.push({
      mesh: pMesh,
      x: (Math.random() - 0.5) * 24,
      y: 1 + Math.random() * 8,
      z: (Math.random() - 0.5) * 20,
      speedY: 0.4 + Math.random() * 0.4,
      driftX: (Math.random() - 0.5) * 0.6,
      rotSpeed: 1 + Math.random() * 2,
    });
  }

  const sparkleCount = 200;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  for (let i = 0; i < sparkleCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const rad = 2 + Math.random() * 18;
    sparklePositions[i * 3] = Math.cos(angle) * rad;
    sparklePositions[i * 3 + 1] = 0.5 + Math.random() * 9;
    sparklePositions[i * 3 + 2] = Math.sin(angle) * rad * 0.75;
  }
  const sparkleGeo = new THREE.BufferGeometry();
  sparkleGeo.setAttribute("position", new THREE.BufferAttribute(sparklePositions, 3));
  const sparkles = new THREE.Points(sparkleGeo, new THREE.PointsMaterial({ color: "#fff0bd", size: 0.22, transparent: true, opacity: 0.85 }));
  fairyWorld.add(sparkles);

  // =========================================================================
  // DASHAIN WORLD & 5 DIYAS & 3 MARIGOLD DECORATION ANCHORS
  // =========================================================================
  const dashainGroundMat = material("#d48b48", { roughness: 0.92 });
  const courtyardStoneMat = material("#fce7c8", { roughness: 0.85 });
  const vermilionMat = material("#b32822", { roughness: 0.55 });
  const woodMat = material("#64321c", { roughness: 0.75 });
  const marigoldOrange = material("#ff7b00", { roughness: 0.5 });
  const marigoldYellow = material("#ffc300", { roughness: 0.5 });
  const jamaraGreenMat = material("#489e3b", { roughness: 0.65 });
  const flameMat = material("#fff5c0", { emissive: "#ff9015", emissiveIntensity: 2.2, roughness: 0.3 });

  const dCourtyard = addMesh(new THREE.CylinderGeometry(18, 22, 2.8, 64), dashainGroundMat, dashainWorld, [0, -1.3, 0]);
  dCourtyard.scale.z = 0.78;
  addMesh(new THREE.CylinderGeometry(15, 17, 0.5, 64), courtyardStoneMat, dashainWorld, [0, 0.1, 0]);

  // Dashain Pavilion
  const dPavilion = new THREE.Group();
  dPavilion.position.set(0, 0, -8);
  dashainWorld.add(dPavilion);
  for (const px of [-6, -2, 2, 6]) {
    cylinder(0.3, 0.36, 6.5, woodMat, [px, 3.25, 0], 12, dPavilion);
  }
  addMesh(new THREE.BoxGeometry(14.5, 0.65, 0.8), vermilionMat, dPavilion, [0, 6.7, 0]);
  addMesh(new THREE.ConeGeometry(9.5, 3.5, 4), material("#8f2d24"), dPavilion, [0, 8.8, 0]).rotation.y = Math.PI / 4;

  // 5 INDIVIDUALLY IDENTIFIABLE DIYAS IN DASHAIN COURTYARD
  const diyas = {};
  const diyaCoords = [
    { id: "diya_1", x: -6.0, z: 2.5 },
    { id: "diya_2", x: -3.0, z: 2.5 },
    { id: "diya_3", x: 0.0, z: 2.5 },
    { id: "diya_4", x: 3.0, z: 2.5 },
    { id: "diya_5", x: 6.0, z: 2.5 },
  ];
  diyaCoords.forEach(({ id, x, z }) => {
    const dGroup = new THREE.Group();
    dGroup.position.set(x, 0.38, z);
    dashainWorld.add(dGroup);
    // Diya clay cup
    addMesh(new THREE.CylinderGeometry(0.24, 0.46, 0.26, 16), material("#964b28"), dGroup, [0, 0.13, 0]);
    // Flame (hidden initially)
    const flame = addMesh(new THREE.ConeGeometry(0.18, 0.58, 12), flameMat, dGroup, [0, 0.48, 0]);
    flame.visible = false;
    // Diya point light
    const light = new THREE.PointLight("#ff9d24", 0, 6, 2);
    light.position.set(x, 1.2, z);
    dashainWorld.add(light);
    diyas[id] = { group: dGroup, flame, light, lit: false, x, z };
  });

  // 3 MARIGOLD DECORATION ANCHORS
  const marigoldDecorations = {};
  [
    { id: "marigold_1", x: -4.0, y: 3.5, z: -6.0 },
    { id: "marigold_2", x: 0.0, y: 4.5, z: -6.0 },
    { id: "marigold_3", x: 4.0, y: 3.5, z: -6.0 },
  ].forEach(({ id, x, y, z }) => {
    const mGroup = new THREE.Group();
    mGroup.position.set(x, y, z);
    dashainWorld.add(mGroup);
    // Garland strand
    const garland = addMesh(new THREE.TorusGeometry(0.6, 0.18, 8, 20), marigoldOrange, mGroup);
    garland.scale.set(1, 1.4, 0.5);
    garland.visible = false;
    marigoldDecorations[id] = { group: mGroup, garland, placed: false, x, z };
  });

  // 3 Dashain Treasures (Marigold, Jamara, Tika plate)
  const treasureObjects = {};
  // Marigold Planter
  const marigoldGroup = new THREE.Group();
  marigoldGroup.position.set(5.2, 0.5, 1.8);
  dashainWorld.add(marigoldGroup);
  addMesh(new THREE.CylinderGeometry(0.65, 0.5, 0.45, 16), material("#82492f"), marigoldGroup, [0, 0.22, 0]);
  const marigoldHead = new THREE.Group();
  marigoldHead.position.set(0, 1.25, 0);
  marigoldGroup.add(marigoldHead);
  addMesh(new THREE.SphereGeometry(0.24, 12, 10), marigoldOrange, marigoldHead);
  const marigoldAura = addMesh(new THREE.SphereGeometry(0.9, 16, 16), new THREE.MeshBasicMaterial({ color: "#ffe66d", transparent: true, opacity: 0.35 }), marigoldHead);
  treasureObjects.marigold = { group: marigoldGroup, head: marigoldHead, aura: marigoldAura, collected: false, x: 5.2, z: 1.8 };

  // Jamara Pot
  const jamaraGroup = new THREE.Group();
  jamaraGroup.position.set(-5.2, 0.45, 1.8);
  dashainWorld.add(jamaraGroup);
  addMesh(new THREE.SphereGeometry(0.65, 18, 14), material("#964b28"), jamaraGroup, [0, 0.6, 0]);
  const jamaraShoots = new THREE.Group();
  jamaraShoots.position.set(0, 1.2, 0);
  jamaraGroup.add(jamaraShoots);
  for (let s = 0; s < 18; s += 1) {
    const a = (s / 18) * Math.PI * 2;
    addMesh(new THREE.ConeGeometry(0.08, 1.2, 4), jamaraGreenMat, jamaraShoots, [Math.cos(a) * 0.2, 0.6, Math.sin(a) * 0.2]);
  }
  const jamaraAura = addMesh(new THREE.SphereGeometry(0.9, 16, 16), new THREE.MeshBasicMaterial({ color: "#80ed99", transparent: true, opacity: 0.35 }), jamaraShoots, [0, 0.6, 0]);
  treasureObjects.jamara = { group: jamaraGroup, head: jamaraShoots, aura: jamaraAura, collected: false, x: -5.2, z: 1.8 };

  // Tika Plate
  const tikaGroup = new THREE.Group();
  tikaGroup.position.set(0, 0.5, 4.2);
  dashainWorld.add(tikaGroup);
  addMesh(new THREE.CylinderGeometry(1.6, 1.5, 0.45, 24), woodMat, tikaGroup, [0, 0.22, 0]);
  const thali = new THREE.Group();
  thali.position.set(0, 0.54, 0);
  tikaGroup.add(thali);
  addMesh(new THREE.CylinderGeometry(1.15, 1.0, 0.14, 36), goldMat, thali, [0, 0.07, 0]);
  addMesh(new THREE.SphereGeometry(0.32, 16, 12), vermilionMat, thali, [0, 0.26, 0]);
  const tikaAura = addMesh(new THREE.SphereGeometry(1.1, 16, 16), new THREE.MeshBasicMaterial({ color: "#ffd166", transparent: true, opacity: 0.35 }), thali, [0, 0.2, 0]);
  treasureObjects.tika = { group: tikaGroup, head: thali, aura: tikaAura, collected: false, x: 0, z: 4.2 };

  // =========================================================================
  // PRINCESS YUNISHA CHARACTER & CUSTOMIZABLE WARDROBE
  // =========================================================================
  const princess = new THREE.Group();
  princess.position.set(0, 0.38, 2.5);
  scene.add(princess);

  const skinMat = material("#f7cfb8", { roughness: 0.6 });
  const hairMat = material("#42281d", { roughness: 0.75 });

  // Customizable Gown Mesh & Materials
  const outfitMaterials = {
    royal: material("#fef3c7", { roughness: 0.55, emissive: "#fcd34d", emissiveIntensity: 0.12 }),
    blossom: material("#f472b6", { roughness: 0.55, emissive: "#fbcfe8", emissiveIntensity: 0.12 }),
    ice: material("#38bdf8", { roughness: 0.55, emissive: "#bae6fd", emissiveIntensity: 0.12 }),
    dream: material("#a855f7", { roughness: 0.55, emissive: "#e9d5ff", emissiveIntensity: 0.12 }),
    sunset: material("#fb923c", { roughness: 0.55, emissive: "#fed7aa", emissiveIntensity: 0.12 }),
  };

  const gown = addMesh(new THREE.ConeGeometry(0.95, 1.6, 16), outfitMaterials.royal, princess, [0, 0.85, 0]);
  gown.scale.z = 0.78;
  const waistSash = addMesh(new THREE.TorusGeometry(0.48, 0.08, 8, 20), goldMat, princess, [0, 1.55, 0]);
  waistSash.rotation.x = Math.PI / 2;

  // Head and Face
  addMesh(new THREE.SphereGeometry(0.42, 20, 16), skinMat, princess, [0, 1.95, 0]);
  addMesh(new THREE.SphereGeometry(0.44, 18, 14), hairMat, princess, [0, 2.1, -0.12]).scale.set(1, 1.1, 0.8);
  addMesh(new THREE.SphereGeometry(0.2, 14, 12), hairMat, princess, [-0.36, 1.8, -0.02]);
  addMesh(new THREE.SphereGeometry(0.2, 14, 12), hairMat, princess, [0.36, 1.8, -0.02]);
  const princessEyes = [-0.13, 0.13].map((x) => addMesh(new THREE.SphereGeometry(0.04, 8, 8), material("#3b2219"), princess, [x, 1.98, 0.38]));
  addMesh(new THREE.SphereGeometry(0.05, 8, 8), material("#e07a70"), princess, [0, 1.86, 0.4]);

  // Interchangeable Crowns
  const crownSlots = new THREE.Group();
  crownSlots.position.set(0, 2.38, 0);
  princess.add(crownSlots);

  const crowns = {
    royal: new THREE.Group(),
    blossom: new THREE.Group(),
    starry: new THREE.Group(),
    crystal: new THREE.Group(),
    dashain: new THREE.Group(),
  };

  Object.values(crowns).forEach((c) => crownSlots.add(c));

  // 1. Royal Crown
  addMesh(new THREE.TorusGeometry(0.26, 0.05, 8, 24), goldMat, crowns.royal).rotation.x = Math.PI / 2;
  [-0.18, 0, 0.18].forEach((x) => {
    addMesh(new THREE.ConeGeometry(0.1, 0.28, 8), goldMat, crowns.royal, [x, 0.16 + (x === 0 ? 0.09 : 0), 0]);
  });

  // 2. Blossom Crown
  for (let b = 0; b < 10; b += 1) {
    const a = (b / 10) * Math.PI * 2;
    addMesh(new THREE.SphereGeometry(0.08, 8, 8), b % 2 ? foliagePink : foliageDeepPink, crowns.blossom, [Math.cos(a) * 0.28, 0.05, Math.sin(a) * 0.28]);
  }

  // 3. Starry Tiara
  addMesh(new THREE.TorusGeometry(0.26, 0.04, 8, 20), goldMat, crowns.starry).rotation.x = Math.PI / 2;
  const starTiaraJewel = addMesh(new THREE.OctahedronGeometry(0.14, 0), windowGlow, crowns.starry, [0, 0.2, 0.1]);

  // 4. Crystal Crown
  addMesh(new THREE.TorusGeometry(0.26, 0.04, 8, 20), material("#bae6fd"), crowns.crystal).rotation.x = Math.PI / 2;
  [-0.16, 0, 0.16].forEach((x) => {
    addMesh(new THREE.ConeGeometry(0.08, 0.24, 6), material("#38bdf8", { roughness: 0.1 }), crowns.crystal, [x, 0.14 + (x === 0 ? 0.08 : 0), 0]);
  });

  // 5. Dashain Flower Crown
  for (let b = 0; b < 8; b += 1) {
    const a = (b / 8) * Math.PI * 2;
    addMesh(new THREE.SphereGeometry(0.09, 8, 8), b % 2 ? marigoldOrange : jamaraGreenMat, crowns.dashain, [Math.cos(a) * 0.28, 0.05, Math.sin(a) * 0.28]);
  }

  // Active Crown helper
  const showCrown = (id) => {
    Object.keys(crowns).forEach((k) => { crowns[k].visible = k === id; });
  };
  showCrown("royal");

  // Articulated Arms & Legs
  const armPivots = [];
  const legPivots = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.42, 1.75, 0);
    princess.add(arm);
    addMesh(new THREE.CylinderGeometry(0.09, 0.11, 0.72, 10), skinMat, arm, [0, -0.34, 0]);
    addMesh(new THREE.SphereGeometry(0.13, 10, 8), skinMat, arm, [0, -0.72, 0]);
    armPivots.push(arm);

    const leg = new THREE.Group();
    leg.position.set(side * 0.25, 0.22, 0);
    princess.add(leg);
    addMesh(new THREE.CylinderGeometry(0.09, 0.1, 0.48, 8), skinMat, leg, [0, -0.18, 0]);
    addMesh(new THREE.SphereGeometry(0.13, 10, 8), material("#e8998d"), leg, [0, -0.38, 0.08]);
    legPivots.push(leg);
  }
  addMesh(new THREE.CylinderGeometry(0.025, 0.035, 0.88, 8), goldMat, armPivots[1], [0, -0.75, 0]);
  addMesh(new THREE.SphereGeometry(0.12, 10, 8), windowGlow, armPivots[1], [0, -1.2, 0]);

  // Movement Trail Particles
  let activeTrailType = "sparkle"; // "sparkle", "petals", "starlight", "none"
  const trailParticles = [];
  for (let i = 0; i < 20; i += 1) {
    const p = addMesh(new THREE.SphereGeometry(0.1, 6, 6), goldMat, fairyWorld);
    p.visible = false;
    trailParticles.push({ mesh: p, life: 0 });
  }

  // =========================================================================
  // KARI THE GOLDEN BUTTERFLY COMPANION MODEL & STYLES
  // =========================================================================
  const kari = new THREE.Group();
  kari.position.set(1.4, 2.2, 1.0);
  scene.add(kari);

  const kariWingMaterials = {
    golden: material("#ffd166", { emissive: "#fcd34d", emissiveIntensity: 0.6 }),
    blossom: material("#f472b6", { emissive: "#fbcfe8", emissiveIntensity: 0.6 }),
    lavender: material("#c084fc", { emissive: "#e9d5ff", emissiveIntensity: 0.6 }),
    rainbow: material("#38bdf8", { emissive: "#a7f3d0", emissiveIntensity: 0.7 }),
  };

  let activeKariMat = kariWingMaterials.golden;
  // Kari body & glowing head
  addMesh(new THREE.CylinderGeometry(0.04, 0.05, 0.32, 8), material("#422006"), kari);
  addMesh(new THREE.SphereGeometry(0.07, 10, 8), windowGlow, kari, [0, 0.18, 0]);

  // Left & right wings
  const kariLeftWing = addMesh(new THREE.BoxGeometry(0.38, 0.02, 0.28), activeKariMat, kari, [-0.2, 0.05, 0]);
  const kariRightWing = addMesh(new THREE.BoxGeometry(0.38, 0.02, 0.28), activeKariMat, kari, [0.2, 0.05, 0]);

  // Light halo
  const kariGlow = addMesh(new THREE.SphereGeometry(0.5, 12, 10), new THREE.MeshBasicMaterial({ color: "#fef08a", transparent: true, opacity: 0.25 }), kari);

  // =========================================================================
  // ANIMATION & PROXIMITY CONTROLS
  // =========================================================================
  const character = { group: princess, arms: armPivots, legs: legPivots, jumping: 0, phase: 0 };
  let pointerDown = false;
  let previousX = 0;
  let targetRotation = 0;
  let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let portalStartedAt = null;
  let portalStartPosition = null;
  let theme = "FAIRY_WORLD";
  let themeTransition = null;
  let themeOpacity = new WeakMap();
  let frameId = null;
  const keysDown = new Set();
  let previousFrameTime = performance.now();
  let proximityCallback = null;
  let lastProximityCheck = 0;

  const rememberOpacity = (group, opacity) => {
    group.traverse((object) => {
      if (!object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((item) => {
        if (!themeOpacity.has(item)) {
          themeOpacity.set(item, {
            opacity: item.opacity,
            transparent: item.transparent,
            depthWrite: item.depthWrite,
          });
        }
        const base = themeOpacity.get(item);
        item.opacity = base.opacity * opacity;
        item.transparent = base.transparent || opacity < 0.999;
        item.depthWrite = opacity >= 0.999 ? base.depthWrite : false;
      });
      object.castShadow = opacity >= 0.999;
    });
  };

  const dashainBackground = new THREE.Color("#f6be7b");
  const dashainFogColor = new THREE.Color("#fad8a5");
  const fairySkyLight = new THREE.Color("#ffffff");
  const dashainSkyLight = new THREE.Color("#ffe0a0");
  const fairyGroundLight = new THREE.Color("#95cf76");
  const dashainGroundLight = new THREE.Color("#b56e3f");
  const fairySunLight = new THREE.Color("#fff8e7");
  const dashainSunLight = new THREE.Color("#ffb852");

  const effectState = { diya: 0, gesture: 0, petalBurst: 0, kariGreeting: 0 };
  rememberOpacity(dashainWorld, 0);
  const start = performance.now();

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.2 : 1.7));
    renderer.shadowMap.enabled = width >= 700;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 700 ? 56 : 46;
    camera.updateProjectionMatrix();
  };

  const down = (event) => {
    pointerDown = true;
    previousX = event.clientX;
    canvas.setPointerCapture?.(event.pointerId);
  };

  const move = (event) => {
    if (!pointerDown) return;
    targetRotation = THREE.MathUtils.clamp(targetRotation + (event.clientX - previousX) * 0.002, -0.32, 0.32);
    previousX = event.clientX;
  };

  const up = () => { pointerDown = false; };

  const movementKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"]);
  const keyDown = (event) => {
    if (document.getElementById("modal-root")?.firstElementChild || document.getElementById("kingdom")?.classList.contains("hidden")) return;
    if (event.target instanceof HTMLElement && event.target.closest("button, input, textarea, select, a")) return;
    if (movementKeys.has(event.key)) {
      event.preventDefault();
      keysDown.add(event.key.toLowerCase());
    }
    if (event.code === "Space" && character.jumping <= 0) {
      event.preventDefault();
      character.jumping = 1;
    }
  };

  const keyUp = (event) => { keysDown.delete(event.key.toLowerCase()); };
  const clearKeys = () => keysDown.clear();

  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", clearKeys);
  window.addEventListener("resize", resize);
  resize();

  document.getElementById("world-loading").classList.add("is-ready");

  // Proximity Detection Check
  const checkProximity = () => {
    if (document.getElementById("modal-root")?.firstElementChild || !proximityCallback) return;
    const px = princess.position.x;
    const pz = princess.position.z;

    if (theme === "DASHAIN_WORLD") {
      // 1. Dashain Courtyard Diyas
      for (const [id, d] of Object.entries(diyas)) {
        if (!d.lit && Math.hypot(px - d.x, pz - d.z) < 2.2) {
          proximityCallback({ type: "diya", id, title: "Light this Sacred Diya 🪔" });
          return;
        }
      }
      // 2. Marigold Decoration points
      for (const [id, m] of Object.entries(marigoldDecorations)) {
        if (!m.placed && Math.hypot(px - m.x, pz - m.z) < 2.5) {
          proximityCallback({ type: "marigold_point", id, title: "Hang Marigold Garland 🌼" });
          return;
        }
      }
      // 3. Treasures
      if (!treasureObjects.marigold.collected && Math.hypot(px - treasureObjects.marigold.x, pz - treasureObjects.marigold.z) < 2.5) {
        proximityCallback({ type: "treasure", id: "marigold", title: "Golden Marigold 🌼" });
        return;
      }
      if (!treasureObjects.jamara.collected && Math.hypot(px - treasureObjects.jamara.x, pz - treasureObjects.jamara.z) < 2.5) {
        proximityCallback({ type: "treasure", id: "jamara", title: "Sacred Jamara 🌿" });
        return;
      }
      if (!treasureObjects.tika.collected && Math.hypot(px - treasureObjects.tika.x, pz - treasureObjects.tika.z) < 2.5) {
        proximityCallback({ type: "treasure", id: "tika", title: "Dashain Tika Plate 🔴" });
        return;
      }
      proximityCallback(null);
    } else {
      // Fairy World: Quest Stars
      for (const [id, s] of Object.entries(questStars)) {
        if (!s.collected && Math.hypot(px - s.x, pz - s.z) < 2.2) {
          proximityCallback({ type: "star", id, title: "Collect Quest Star ⭐" });
          return;
        }
      }
      // Dressing Room Mirror
      if (Math.hypot(px - 3.5, pz - (-3.5)) < 2.4) {
        proximityCallback({ type: "mirror", id: "wardrobe", title: "Magical Mirror / Royal Wardrobe 👗" });
        return;
      }
      // Secret Doorway
      if (Math.hypot(px - (-6.5), pz - (-8.5)) < 2.8) {
        proximityCallback({ type: "secret_door", id: "secret", title: "Secret Rose Doorway 🗝️" });
        return;
      }
      // Landmarks
      if (Math.hypot(px - 0, pz - (-4.0)) < 4.2) {
        proximityCallback({ type: "landmark", id: "princess", title: "Princess Castle 👑" });
      } else if (Math.hypot(px - (-8), pz - 2.0) < 3.2) {
        proximityCallback({ type: "landmark", id: "simulations", title: "Enchanted Garden ❀" });
      } else if (Math.hypot(px - 6, pz - 2.0) < 3.2) {
        proximityCallback({ type: "landmark", id: "gifts", title: "Hall of Gifts 🎁" });
      } else if (Math.hypot(px - (-7), pz - 7.5) < 3.5) {
        proximityCallback({ type: "landmark", id: "gallery", title: "Moonlight Lake & Gallery ♡" });
      } else if (Math.hypot(px - 8, pz - 4.0) < 3.5) {
        proximityCallback({ type: "landmark", id: "observatory", title: "Star Observatory ☾" });
      } else {
        proximityCallback(null);
      }
    }
  };

  const animate = (now) => {
    const time = (now - start) / 1000;
    const delta = Math.min((now - previousFrameTime) / 1000, 0.05);
    previousFrameTime = now;

    if (themeTransition) {
      const progress = reducedMotion ? 1 : Math.min((now - themeTransition.startedAt) / themeTransition.duration, 1);
      const eased = progress * progress * (3 - 2 * progress);
      const enteringDashain = themeTransition.to === "DASHAIN_WORLD";
      const fairyOpacity = enteringDashain ? 1 - eased : eased;
      const dashainOpacity = enteringDashain ? eased : 1 - eased;
      rememberOpacity(fairyWorld, fairyOpacity);
      rememberOpacity(dashainWorld, dashainOpacity);

      scene.background.copy(fairySkyColor).lerp(dashainBackground, enteringDashain ? eased : 1 - eased);
      scene.fog.color.copy(fairyFogColor).lerp(dashainFogColor, enteringDashain ? eased : 1 - eased);
      skyLight.color.copy(fairySkyLight).lerp(dashainSkyLight, enteringDashain ? eased : 1 - eased);
      skyLight.groundColor.copy(fairyGroundLight).lerp(dashainGroundLight, enteringDashain ? eased : 1 - eased);
      sunLight.color.copy(fairySunLight).lerp(dashainSunLight, enteringDashain ? eased : 1 - eased);
      festiveLight.intensity = 15 * dashainOpacity;

      const cameraEnd = enteringDashain ? new THREE.Vector3(0, 8, 30) : new THREE.Vector3(0, 9, 38);
      const targetEnd = enteringDashain ? new THREE.Vector3(0, 4.5, -2) : new THREE.Vector3(0, 5, 0);
      camera.position.lerpVectors(themeTransition.cameraStart, cameraEnd, eased);
      camera.lookAt(targetEnd);

      if (progress >= 1) {
        theme = themeTransition.to;
        fairyWorld.visible = !enteringDashain;
        dashainWorld.visible = enteringDashain;
        themeTransition = null;
      }
    } else if (portalStartedAt !== null && !reducedMotion) {
      const progress = Math.min((now - portalStartedAt) / 1500, 1);
      const eased = progress * progress * (3 - 2 * progress);
      camera.position.lerpVectors(portalStartPosition, new THREE.Vector3(0, 8.5, 27), eased);
      camera.lookAt(0, 5, -1);
      sparkles.rotation.y = time * 0.4;
      if (progress >= 1) portalStartedAt = null;
    } else if (!reducedMotion) {
      camera.position.x += (Math.sin(time * 0.12) * 1.1 + targetRotation * 9 - camera.position.x) * 0.012;
      camera.position.y = 8.5 + Math.sin(time * 0.22) * 0.22;

      clouds.forEach((cloud) => {
        cloud.group.position.x = cloud.baseX + Math.sin(time * 0.08 * cloud.speed) * 4;
      });

      // Rotating Quest Stars
      Object.values(questStars).forEach((st, i) => {
        if (!st.collected) {
          st.core.rotation.y = time * 1.5 + i;
          st.core.rotation.z = Math.sin(time * 2 + i) * 0.2;
          st.group.position.y = 1.3 + Math.sin(time * 2.5 + i) * 0.18;
        }
      });

      // Floating Petals
      petals.forEach((p) => {
        p.mesh.position.y -= p.speedY * delta;
        p.mesh.position.x += p.driftX * delta + Math.sin(time * 2 + p.x) * 0.01;
        if (p.mesh.position.y < 0.2) {
          p.mesh.position.y = 7 + Math.random() * 3;
          p.mesh.position.x = (Math.random() - 0.5) * 22;
          p.mesh.position.z = (Math.random() - 0.5) * 18;
        }
      });

      sparkles.rotation.y = time * 0.025;
    }

    // Character Movement & Controller
    const right = Number(keysDown.has("d") || keysDown.has("arrowright")) - Number(keysDown.has("a") || keysDown.has("arrowleft"));
    const forward = Number(keysDown.has("s") || keysDown.has("arrowdown")) - Number(keysDown.has("w") || keysDown.has("arrowup"));
    const moving = right !== 0 || forward !== 0;
    const run = keysDown.has("shift");

    if (moving && !document.getElementById("modal-root")?.firstElementChild) {
      const length = Math.hypot(right, forward) || 1;
      const speed = run ? 6.5 : 3.6;
      princess.position.x = THREE.MathUtils.clamp(princess.position.x + (right / length) * speed * delta, -13, 13);
      princess.position.z = THREE.MathUtils.clamp(princess.position.z + (forward / length) * speed * delta, -9, 9);
      princess.rotation.y = Math.atan2(right, forward);
      character.phase += delta * speed * 4;

      // Spawn movement trails if equipped
      if (activeTrailType !== "none" && Math.random() < 0.35) {
        const unused = trailParticles.find((tp) => tp.life <= 0);
        if (unused) {
          unused.mesh.position.set(princess.position.x + (Math.random() - 0.5) * 0.4, 0.45 + Math.random() * 0.4, princess.position.z + (Math.random() - 0.5) * 0.4);
          unused.mesh.visible = true;
          unused.life = 0.8;
        }
      }
    }

    // Update trail particles
    trailParticles.forEach((tp) => {
      if (tp.life > 0) {
        tp.life -= delta;
        tp.mesh.position.y += delta * 0.3;
        tp.mesh.scale.setScalar(tp.life / 0.8);
        if (tp.life <= 0) tp.mesh.visible = false;
      }
    });

    const stride = moving ? Math.sin(character.phase) * (run ? 0.68 : 0.45) : Math.sin(time * 1.2) * 0.045;
    character.legs.forEach((leg, index) => { leg.rotation.x = moving ? stride * (index ? -1 : 1) : 0; });
    character.arms.forEach((arm, index) => {
      const idleWave = index === 1 ? Math.sin(time * 1.4) * 0.1 : 0;
      arm.rotation.z = moving ? stride * (index ? -0.55 : 0.55) : idleWave;
    });

    character.jumping = Math.max(0, character.jumping - delta * 1.5);
    princess.position.y = 0.38 + (character.jumping > 0 ? Math.sin((1 - character.jumping) * Math.PI) * 1.6 : 0);

    // Blinking
    if (princessEyes.length && Math.sin(time * 1.8) > 0.994) {
      princessEyes.forEach((eye) => { eye.scale.y = 0.15; });
    } else {
      princessEyes.forEach((eye) => { eye.scale.y = 1; });
    }

    // KARI THE BUTTERFLY COMPANION FLIGHT & WING FLAP
    const isKariGreeting = effectState.kariGreeting > 0;
    if (isKariGreeting) {
      effectState.kariGreeting = Math.max(0, effectState.kariGreeting - delta);
    }

    const kariBobY = isKariGreeting ? Math.sin(time * 6) * 0.42 : Math.cos(time * 2.8) * 0.22;
    const targetKariX = princess.position.x + (isKariGreeting ? 0.9 + Math.sin(time * 3.5) * 0.5 : 1.2 + Math.sin(time * 1.8) * 0.45);
    const targetKariY = princess.position.y + 1.85 + kariBobY;
    const targetKariZ = princess.position.z + (isKariGreeting ? 1.0 + Math.cos(time * 3.2) * 0.45 : 0.6 + Math.cos(time * 1.6) * 0.35);
    kari.position.x += (targetKariX - kari.position.x) * (isKariGreeting ? 0.12 : 0.08);
    kari.position.y += (targetKariY - kari.position.y) * (isKariGreeting ? 0.12 : 0.08);
    kari.position.z += (targetKariZ - kari.position.z) * (isKariGreeting ? 0.12 : 0.08);
    kari.rotation.y = time * (isKariGreeting ? 2.4 : 0.8);

    const flapSpeed = isKariGreeting ? 46 : 26;
    const flap = Math.sin(time * flapSpeed) * 0.85;
    kariLeftWing.rotation.z = flap;
    kariRightWing.rotation.z = -flap;

    // Proximity check
    if (now - lastProximityCheck > 180) {
      lastProximityCheck = now;
      checkProximity();
    }

    if (!themeTransition) camera.lookAt(targetRotation * 2.5, 4.8, -1);
    renderer.render(scene, camera);

    if (!document.hidden) frameId = requestAnimationFrame(animate);
  };

  frameId = requestAnimationFrame(animate);

  const onVisibilityChange = () => {
    if (document.hidden) {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    } else if (frameId === null) {
      frameId = requestAnimationFrame(animate);
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  return {
    setReducedMotion(value) { reducedMotion = value; },
    setTheme(nextTheme) {
      if (nextTheme === theme && !themeTransition) return;
      const toDashain = nextTheme === "DASHAIN_WORLD";
      if (toDashain) dashainWorld.visible = true;
      else fairyWorld.visible = true;
      themeTransition = {
        to: nextTheme,
        startedAt: performance.now(),
        duration: reducedMotion ? 1 : 1900,
        cameraStart: camera.position.clone(),
      };
    },
    interact(name) {
      effectState.gesture = 1.4;
      if (name === "celebration") {
        effectState.petalBurst = 2.6;
      }
      if (name === "kari_greet" || name === "greet") {
        effectState.kariGreeting = 2.5;
      }
    },
    // Princess Customizer
    setPrincessOutfit(id) {
      const mat = outfitMaterials[id] ?? outfitMaterials.royal;
      gown.material = mat;
    },
    setPrincessCrown(id) {
      showCrown(id);
    },
    setPrincessTrail(id) {
      activeTrailType = id;
    },
    setKariStyle(id) {
      activeKariMat = kariWingMaterials[id] ?? kariWingMaterials.golden;
      kariLeftWing.material = activeKariMat;
      kariRightWing.material = activeKariMat;
    },
    // Stars
    collectQuestStar(id) {
      const st = questStars[id];
      if (!st || st.collected) return;
      st.collected = true;
      st.group.visible = false;
    },
    // Dashain Courtyard Objects
    lightDiya(id) {
      const d = diyas[id];
      if (!d || d.lit) return;
      d.lit = true;
      d.flame.visible = true;
      d.light.intensity = 1.6;
    },
    placeMarigold(id) {
      const m = marigoldDecorations[id];
      if (!m || m.placed) return;
      m.placed = true;
      m.garland.visible = true;
    },
    collectTreasure(id) {
      const tr = treasureObjects[id];
      if (!tr || tr.collected) return;
      tr.collected = true;
      tr.group.visible = false;
    },
    resetTreasures() {
      Object.values(treasureObjects).forEach((tr) => {
        tr.collected = false;
        tr.group.visible = true;
      });
    },
    teleportTo(x, z) {
      princess.position.set(x, 0.38, z);
      camera.position.set(x, 8.5, z + 26);
      camera.lookAt(x, 4.8, z - 2);
    },
    onProximity(callback) {
      proximityCallback = callback;
    },
    triggerCelebration() {
      this.interact("celebration");
    },
    enterPortal() {
      portalStartPosition = camera.position.clone();
      portalStartedAt = performance.now();
      targetRotation = 0;
    },
    resetPortal() {
      camera.position.set(0, 9, 38);
      targetRotation = 0;
      portalStartedAt = null;
      camera.lookAt(0, 5, 0);
    },
    dispose() {
      if (frameId !== null) cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", clearKeys);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((item) => item.dispose());
        }
      });
      renderer.dispose();
    },
  };
}
