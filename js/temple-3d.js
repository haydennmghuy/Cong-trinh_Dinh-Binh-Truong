import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const Temple3D = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  hotspots: [],
  raycaster: new THREE.Raycaster(),
  mouse: new THREE.Vector2(),
  container: null,
  overlayContainer: null,
  animationId: null,
  isInitialized: false,

  // Colors from real photos
  COLORS: {
    wallYellow:    0xD4A830,
    wallYellowLight: 0xE8C840,
    roofBrown:     0x6B3030,
    roofRed:       0x8B4040,
    roofDark:      0x5A2828,
    columnRed:     0x8B2222,
    columnDarkRed: 0x6B1818,
    woodBrown:     0x6B4010,
    woodLight:     0x8B5A20,
    goldAccent:    0xC9A84C,
    goldDark:      0xA08530,
    groundPave:    0xB8A898,
    groundDark:    0x9E8E7E,
    fenceYellow:   0xD4A830,
    fenceBars:     0xC9A84C,
    greenTree:     0x4A6B30,
    greenDark:     0x3A5520,
    grassGreen:    0x6B8B45,
    stoneGray:     0xA0A090,
    white:         0xF5F0E8,
    skyBlue:       0x87CEEB,
  },

  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.overlayContainer = document.getElementById('hotspot-overlay');
    
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.008);

    // Camera - isometric-like angle matching the scan image
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
    this.camera.position.set(35, 30, 40);
    this.camera.lookAt(0, 2, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 80;
    this.controls.target.set(0, 2, 0);
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;

    // Lighting
    this.addLighting();

    // Build the temple
    this.buildTemple();

    // Create hotspot markers
    this.createHotspots();

    // Event listeners
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));

    // Control buttons
    document.getElementById('model-zoom-in')?.addEventListener('click', () => {
      this.camera.position.multiplyScalar(0.85);
      this.controls.update();
    });
    document.getElementById('model-zoom-out')?.addEventListener('click', () => {
      this.camera.position.multiplyScalar(1.15);
      this.controls.update();
    });
    document.getElementById('model-reset')?.addEventListener('click', () => {
      this.camera.position.set(35, 30, 40);
      this.controls.target.set(0, 2, 0);
      this.controls.update();
    });

    this.isInitialized = true;

    // Start animation
    this.animate();
  },

  addLighting() {
    // Ambient light - warm
    const ambient = new THREE.AmbientLight(0xFFF0D0, 0.5);
    this.scene.add(ambient);

    // Main directional light (sun)
    const sun = new THREE.DirectionalLight(0xFFF5E0, 1.2);
    sun.position.set(20, 30, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    this.scene.add(sun);

    // Fill light
    const fill = new THREE.DirectionalLight(0xB0D0FF, 0.3);
    fill.position.set(-10, 15, -10);
    this.scene.add(fill);

    // Rim light
    const rim = new THREE.DirectionalLight(0xFFE0A0, 0.4);
    rim.position.set(-15, 10, 20);
    this.scene.add(rim);

    // Hemisphere light
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x8B7B60, 0.3);
    this.scene.add(hemi);
  },

  // ============ MATERIAL HELPERS ============
  mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.7,
      metalness: opts.metalness ?? 0.1,
      ...opts
    });
  },

  // ============ GEOMETRY HELPERS ============
  createBox(w, h, d, color, x, y, z, opts = {}) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, this.mat(color, opts));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  },

  createCylinder(rTop, rBot, h, color, x, y, z, segments = 12) {
    const geo = new THREE.CylinderGeometry(rTop, rBot, h, segments);
    const mesh = new THREE.Mesh(geo, this.mat(color, { roughness: 0.5 }));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  },

  createRoof(width, depth, height, overhang, color, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Main roof - trapezoidal prism (two-sided sloped roof)
    const roofW = width + overhang * 2;
    const roofD = depth + overhang * 2;
    
    const shape = new THREE.Shape();
    shape.moveTo(-roofW / 2, 0);
    shape.lineTo(0, height);
    shape.lineTo(roofW / 2, 0);
    shape.lineTo(-roofW / 2, 0);

    const extrudeSettings = {
      depth: roofD,
      bevelEnabled: false,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mesh = new THREE.Mesh(geo, this.mat(color, { roughness: 0.8 }));
    mesh.rotation.y = Math.PI / 2;
    mesh.position.set(0, 0, -roofD / 2);
    mesh.rotation.set(0, Math.PI / 2, 0);
    mesh.position.set(roofD / 2, 0, 0);
    
    // Simpler approach: use a flattened box angled
    // Left slope
    const slopeGeo = new THREE.BoxGeometry(roofW / 2 + 0.3, 0.25, roofD);
    const leftSlope = new THREE.Mesh(slopeGeo, this.mat(color, { roughness: 0.8 }));
    leftSlope.position.set(-roofW / 4, height / 2, 0);
    leftSlope.rotation.z = Math.atan2(height, roofW / 2);
    leftSlope.castShadow = true;
    leftSlope.receiveShadow = true;
    group.add(leftSlope);

    // Right slope
    const rightSlope = new THREE.Mesh(slopeGeo, this.mat(color, { roughness: 0.8 }));
    rightSlope.position.set(roofW / 4, height / 2, 0);
    rightSlope.rotation.z = -Math.atan2(height, roofW / 2);
    rightSlope.castShadow = true;
    rightSlope.receiveShadow = true;
    group.add(rightSlope);

    // Ridge beam
    const ridgeGeo = new THREE.BoxGeometry(0.3, 0.3, roofD + 0.4);
    const ridge = new THREE.Mesh(ridgeGeo, this.mat(this.COLORS.goldAccent, { metalness: 0.4 }));
    ridge.position.set(0, height, 0);
    group.add(ridge);

    // Eave edges (curved tips at corners) 
    const eaveGeo = new THREE.BoxGeometry(0.15, 0.15, roofD + 0.6);
    [-1, 1].forEach(side => {
      const eave = new THREE.Mesh(eaveGeo, this.mat(this.COLORS.goldAccent, { metalness: 0.3 }));
      eave.position.set(side * roofW / 2, 0.1, 0);
      group.add(eave);
    });

    return group;
  },

  // ============ BUILD TEMPLE ============
  buildTemple() {
    const C = this.COLORS;

    // === GROUND ===
    // Main ground plane (large area around temple)
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = this.mat(C.groundDark, { roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Courtyard paving (within the compound)
    const courtGeo = new THREE.PlaneGeometry(28, 32);
    const courtMat = this.mat(C.groundPave, { roughness: 0.85 });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.01, 0);
    court.receiveShadow = true;
    this.scene.add(court);

    // === SURROUNDING WALL / FENCE ===
    this.buildFence();

    // === CỔNG TAM QUAN (Main Gate) ===
    this.buildGate();

    // === SÂN ĐÌNH (Courtyard features) ===
    this.buildCourtyard();

    // === TIỀN ĐIỆN (Front Hall) ===
    this.buildTienDien();

    // === CHÁNH ĐIỆN (Main Shrine Hall) ===
    this.buildChanhDien();

    // === HẬU ĐIỆN (Rear Hall) ===
    this.buildHauDien();

    // === NHÀ VÕ CA (Opera Stage) ===
    this.buildVoCa();

    // === CỘT KÈO GỖ area (structural woodwork display) ===
    this.buildCotKeo();

    // === ROOF DECORATIONS ===
    this.addRoofDecorations();

    // === Small trees (proportional, not too big) ===
    this.addTrees();

    // === Stone monument ===
    this.addMonuments();
  },

  buildFence() {
    const C = this.COLORS;
    const fenceH = 1.2;
    const pillarH = 1.6;
    const compound = { xMin: -15, xMax: 15, zMin: -16, zMax: 16 };
    
    // Fence walls (low yellow walls)
    const wallThick = 0.3;
    
    // Front wall (with gap for gate) - left portion
    this.scene.add(this.createBox(8, fenceH, wallThick, C.fenceYellow, -11, fenceH/2, 16));
    // Front wall - right portion
    this.scene.add(this.createBox(8, fenceH, wallThick, C.fenceYellow, 11, fenceH/2, 16));
    
    // Back wall
    this.scene.add(this.createBox(30, fenceH, wallThick, C.fenceYellow, 0, fenceH/2, -16));
    
    // Left wall
    this.scene.add(this.createBox(wallThick, fenceH, 32, C.fenceYellow, -15, fenceH/2, 0));
    
    // Right wall
    this.scene.add(this.createBox(wallThick, fenceH, 32, C.fenceYellow, 15, fenceH/2, 0));

    // Fence pillars at corners and intervals
    const pillarPositions = [
      // Front
      [-15, 16], [-11, 16], [-7, 16], [7, 16], [11, 16], [15, 16],
      // Back
      [-15, -16], [-10, -16], [-5, -16], [0, -16], [5, -16], [10, -16], [15, -16],
      // Left
      [-15, 12], [-15, 8], [-15, 4], [-15, 0], [-15, -4], [-15, -8], [-15, -12],
      // Right
      [15, 12], [15, 8], [15, 4], [15, 0], [15, -4], [15, -8], [15, -12],
    ];
    
    pillarPositions.forEach(([x, z]) => {
      const pillar = this.createBox(0.5, pillarH, 0.5, C.wallYellowLight, x, pillarH/2, z);
      this.scene.add(pillar);
      // Pillar cap
      const cap = this.createBox(0.6, 0.15, 0.6, C.goldAccent, x, pillarH + 0.075, z, { metalness: 0.3 });
      this.scene.add(cap);
    });

    // Metal fence bars between pillars (simplified as thin lines)
    // Front fence bars - left section
    for (let x = -14.5; x <= -7.5; x += 0.5) {
      const bar = this.createBox(0.05, 0.9, 0.05, C.fenceBars, x, 0.65, 16, { metalness: 0.5 });
      this.scene.add(bar);
    }
    // Front fence bars - right section
    for (let x = 7.5; x <= 14.5; x += 0.5) {
      const bar = this.createBox(0.05, 0.9, 0.05, C.fenceBars, x, 0.65, 16, { metalness: 0.5 });
      this.scene.add(bar);
    }
    // Horizontal rail
    this.scene.add(this.createBox(7, 0.08, 0.08, C.fenceBars, -11, 1.1, 16, { metalness: 0.5 }));
    this.scene.add(this.createBox(7, 0.08, 0.08, C.fenceBars, 11, 1.1, 16, { metalness: 0.5 }));
  },

  buildGate() {
    const C = this.COLORS;
    
    // Main gate structure
    const gateW = 10;
    const gateD = 2.5;
    const gateH = 4;
    const gateZ = 14;

    // Gate walls (yellow) - left pillar
    this.scene.add(this.createBox(2, gateH, gateD, C.wallYellow, -4, gateH/2, gateZ));
    // Gate walls - right pillar
    this.scene.add(this.createBox(2, gateH, gateD, C.wallYellow, 4, gateH/2, gateZ));
    // Gate walls - center left divider
    this.scene.add(this.createBox(0.8, gateH, gateD, C.wallYellow, -1.5, gateH/2, gateZ));
    // Gate walls - center right divider
    this.scene.add(this.createBox(0.8, gateH, gateD, C.wallYellow, 1.5, gateH/2, gateZ));

    // Upper wall connecting (above arches)
    this.scene.add(this.createBox(gateW + 1, 1.5, gateD, C.wallYellow, 0, gateH + 0.75, gateZ));

    // Arch tops (semi-circular openings) - simplified as dark openings
    // Center arch (larger)
    this.scene.add(this.createBox(2.2, 3.5, gateD + 0.1, C.woodBrown, 0, 1.75, gateZ, { roughness: 0.9 }));
    // Left arch
    this.scene.add(this.createBox(1.5, 3, gateD + 0.1, C.woodBrown, -3, 1.5, gateZ, { roughness: 0.9 }));
    // Right arch
    this.scene.add(this.createBox(1.5, 3, gateD + 0.1, C.woodBrown, 3, 1.5, gateZ, { roughness: 0.9 }));

    // Gate roof
    const gateRoof = this.createRoof(gateW + 2, gateD + 1, 2.5, 1.0, C.roofBrown, 0, gateH + 1.5, gateZ);
    this.scene.add(gateRoof);

    // Gate decorative top piece (stepped pagoda-like crown)
    this.scene.add(this.createBox(3, 0.8, 1.5, C.wallYellow, 0, gateH + 4.2, gateZ));
    const crownRoof = this.createRoof(3.5, 1.8, 1.2, 0.5, C.roofDark, 0, gateH + 5, gateZ);
    this.scene.add(crownRoof);

    // Gold ridge ornament on top
    this.scene.add(this.createBox(0.2, 0.8, 0.2, C.goldAccent, 0, gateH + 6.5, gateZ, { metalness: 0.5 }));

    // Chinese characters plaque (simplified as a gold rectangle)
    this.scene.add(this.createBox(4, 0.8, 0.1, C.goldAccent, 0, gateH + 0.4, gateZ + gateD/2 + 0.1, { metalness: 0.3 }));
  },

  buildCourtyard() {
    const C = this.COLORS;

    // Pathway from gate to front hall
    const pathGeo = new THREE.PlaneGeometry(3, 10);
    const pathMat = this.mat(0xC0A888, { roughness: 0.9 });
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.02, 8);
    this.scene.add(path);

    // Potted plants (small cylinders)
    [[-3, 10], [3, 10], [-5, 6], [5, 6]].forEach(([x, z]) => {
      // Pot
      const pot = this.createCylinder(0.3, 0.25, 0.5, 0xA06030, x, 0.25, z);
      this.scene.add(pot);
      // Plant
      const plant = this.createCylinder(0.4, 0.3, 0.6, C.greenTree, x, 0.8, z, 8);
      this.scene.add(plant);
    });

    // Stone lantern poles
    [[-6, 8], [6, 8]].forEach(([x, z]) => {
      const pole = this.createCylinder(0.08, 0.08, 2.5, C.stoneGray, x, 1.25, z);
      this.scene.add(pole);
      // Lantern globe
      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 12),
        this.mat(C.white, { roughness: 0.3, emissive: 0xFFFFCC, emissiveIntensity: 0.2 })
      );
      globe.position.set(x, 2.6, z);
      this.scene.add(globe);
    });
  },

  buildTienDien() {
    const C = this.COLORS;
    const x = 0, z = 3, w = 10, d = 5, h = 3.5;

    // Foundation/platform
    this.scene.add(this.createBox(w + 1, 0.4, d + 1, C.stoneGray, x, 0.2, z));

    // Walls
    // Back wall
    this.scene.add(this.createBox(w, h, 0.25, C.wallYellow, x, h/2 + 0.4, z - d/2));
    // Left wall
    this.scene.add(this.createBox(0.25, h, d, C.wallYellow, x - w/2, h/2 + 0.4, z));
    // Right wall
    this.scene.add(this.createBox(0.25, h, d, C.wallYellow, x + w/2, h/2 + 0.4, z));
    // Front wall (partial - with opening)
    this.scene.add(this.createBox(3, h, 0.25, C.wallYellow, x - 3.5, h/2 + 0.4, z + d/2));
    this.scene.add(this.createBox(3, h, 0.25, C.wallYellow, x + 3.5, h/2 + 0.4, z + d/2));

    // Red columns
    const colPositions = [
      [-4, z - 1.5], [-4, z + 1.5],
      [0, z - 1.5], [0, z + 1.5],
      [4, z - 1.5], [4, z + 1.5],
    ];
    colPositions.forEach(([cx, cz]) => {
      this.scene.add(this.createCylinder(0.2, 0.22, h, C.columnRed, cx, h/2 + 0.4, cz));
      // Column base
      this.scene.add(this.createBox(0.5, 0.15, 0.5, C.stoneGray, cx, 0.475, cz));
    });

    // Roof
    const roof = this.createRoof(w, d, 2.5, 1.2, C.roofRed, x, h + 0.4, z);
    this.scene.add(roof);
  },

  buildChanhDien() {
    const C = this.COLORS;
    const x = 0, z = -4, w = 12, d = 7, h = 5;

    // Foundation/platform (higher than others)
    this.scene.add(this.createBox(w + 1.5, 0.6, d + 1.5, C.stoneGray, x, 0.3, z));

    // Walls
    this.scene.add(this.createBox(w, h, 0.3, C.wallYellow, x, h/2 + 0.6, z - d/2));
    this.scene.add(this.createBox(0.3, h, d, C.wallYellow, x - w/2, h/2 + 0.6, z));
    this.scene.add(this.createBox(0.3, h, d, C.wallYellow, x + w/2, h/2 + 0.6, z));
    // Front wall with large opening
    this.scene.add(this.createBox(3, h, 0.3, C.wallYellow, x - 4.5, h/2 + 0.6, z + d/2));
    this.scene.add(this.createBox(3, h, 0.3, C.wallYellow, x + 4.5, h/2 + 0.6, z + d/2));
    // Upper front wall
    this.scene.add(this.createBox(6, 1.5, 0.3, C.wallYellow, x, h - 0.15, z + d/2));

    // Red columns (more columns for the main hall)
    const colPositions = [
      [-5, z - 2], [-5, z + 2],
      [-2.5, z - 2], [-2.5, z + 2],
      [0, z - 2], [0, z + 2],
      [2.5, z - 2], [2.5, z + 2],
      [5, z - 2], [5, z + 2],
    ];
    colPositions.forEach(([cx, cz]) => {
      this.scene.add(this.createCylinder(0.25, 0.27, h, C.columnRed, cx, h/2 + 0.6, cz));
      this.scene.add(this.createBox(0.6, 0.2, 0.6, C.stoneGray, cx, 0.7, cz));
    });

    // Main altar (visible through front opening)
    this.scene.add(this.createBox(4, 2, 1.5, C.woodBrown, x, 1.6, z - 1.5));
    // Gold altar top decoration
    this.scene.add(this.createBox(4.2, 0.15, 1.7, C.goldAccent, x, 2.7, z - 1.5, { metalness: 0.4 }));

    // Roof (larger, higher)
    const roof = this.createRoof(w, d, 3.5, 1.5, C.roofBrown, x, h + 0.6, z);
    this.scene.add(roof);
  },

  buildHauDien() {
    const C = this.COLORS;
    const x = 0, z = -11, w = 10, d = 4, h = 3;

    // Foundation
    this.scene.add(this.createBox(w + 0.8, 0.3, d + 0.8, C.stoneGray, x, 0.15, z));

    // Walls (enclosed)
    this.scene.add(this.createBox(w, h, 0.25, C.wallYellow, x, h/2 + 0.3, z - d/2));
    this.scene.add(this.createBox(w, h, 0.25, C.wallYellow, x, h/2 + 0.3, z + d/2));
    this.scene.add(this.createBox(0.25, h, d, C.wallYellow, x - w/2, h/2 + 0.3, z));
    this.scene.add(this.createBox(0.25, h, d, C.wallYellow, x + w/2, h/2 + 0.3, z));

    // Door opening in front wall
    this.scene.add(this.createBox(2, 2.5, 0.3, C.woodBrown, x, 1.25 + 0.3, z + d/2, { roughness: 0.9 }));

    // Columns
    [[-4, z], [4, z]].forEach(([cx, cz]) => {
      this.scene.add(this.createCylinder(0.18, 0.2, h, C.columnRed, cx, h/2 + 0.3, cz));
    });

    // Roof
    const roof = this.createRoof(w, d, 2, 1.0, C.roofRed, x, h + 0.3, z);
    this.scene.add(roof);
  },

  buildVoCa() {
    const C = this.COLORS;
    // Opera stage - on the left side, open structure
    const x = -10, z = -1, w = 6, d = 6, h = 3.5;

    // Foundation/stage platform
    this.scene.add(this.createBox(w + 0.5, 0.5, d + 0.5, C.stoneGray, x, 0.25, z));

    // Open structure - just columns and roof, partial back wall
    this.scene.add(this.createBox(w, h * 0.4, 0.2, C.wallYellow, x, h/2 + 0.5 + h * 0.3, z - d/2));

    // Red columns at corners and middle
    const colPositions = [
      [x - w/2 + 0.3, z - d/2 + 0.3],
      [x + w/2 - 0.3, z - d/2 + 0.3],
      [x - w/2 + 0.3, z + d/2 - 0.3],
      [x + w/2 - 0.3, z + d/2 - 0.3],
      [x, z - d/2 + 0.3],
      [x, z + d/2 - 0.3],
    ];
    colPositions.forEach(([cx, cz]) => {
      this.scene.add(this.createCylinder(0.18, 0.2, h, C.columnRed, cx, h/2 + 0.5, cz));
      this.scene.add(this.createBox(0.45, 0.15, 0.45, C.stoneGray, cx, 0.575, cz));
    });

    // Roof
    const roof = this.createRoof(w, d, 2.5, 1.2, C.roofBrown, x, h + 0.5, z);
    this.scene.add(roof);
  },

  buildCotKeo() {
    const C = this.COLORS;
    // Wooden column display area - on the right side
    const x = 10, z = -1, w = 6, d = 5, h = 3;

    // Foundation
    this.scene.add(this.createBox(w + 0.5, 0.3, d + 0.5, C.stoneGray, x, 0.15, z));

    // Partial walls
    this.scene.add(this.createBox(0.2, h, d, C.wallYellow, x - w/2, h/2 + 0.3, z));
    this.scene.add(this.createBox(w, h * 0.3, 0.2, C.wallYellow, x, h * 0.85 + 0.3, z - d/2));

    // Exposed wooden columns and beams (the highlight)
    const colPositions = [
      [x - 2, z - 1.5], [x - 2, z + 1.5],
      [x, z - 1.5], [x, z + 1.5],
      [x + 2, z - 1.5], [x + 2, z + 1.5],
    ];
    colPositions.forEach(([cx, cz]) => {
      this.scene.add(this.createCylinder(0.2, 0.22, h, C.woodBrown, cx, h/2 + 0.3, cz, 8));
      this.scene.add(this.createBox(0.5, 0.15, 0.5, C.stoneGray, cx, 0.375, cz));
    });

    // Horizontal beams connecting columns (kèo)
    for (let cz of [z - 1.5, z + 1.5]) {
      this.scene.add(this.createBox(4.5, 0.2, 0.15, C.woodLight, x, h + 0.1, cz));
    }
    // Cross beams
    for (let cx of [x - 2, x, x + 2]) {
      this.scene.add(this.createBox(0.15, 0.2, 3.5, C.woodLight, cx, h + 0.1, z));
    }

    // Roof
    const roof = this.createRoof(w, d, 2, 1.0, C.roofRed, x, h + 0.3, z);
    this.scene.add(roof);
  },

  addRoofDecorations() {
    const C = this.COLORS;

    // Dragon ornaments on main hall roof ridge
    // Left dragon
    const dragonGeo = new THREE.ConeGeometry(0.3, 1.2, 6);
    const dragonMat = this.mat(C.goldAccent, { metalness: 0.5 });
    
    [[-3, 9, -4], [3, 9, -4]].forEach(([x, y, z]) => {
      const dragon = new THREE.Mesh(dragonGeo, dragonMat);
      dragon.position.set(x, y, z);
      dragon.rotation.z = x < 0 ? 0.4 : -0.4;
      this.scene.add(dragon);
    });

    // Ridge decorative balls on gate
    const ballGeo = new THREE.SphereGeometry(0.2, 8, 8);
    [[0, 8.5, 14], [-2, 8, 14], [2, 8, 14]].forEach(([x, y, z]) => {
      const ball = new THREE.Mesh(ballGeo, dragonMat);
      ball.position.set(x, y, z);
      this.scene.add(ball);
    });
  },

  addTrees() {
    const C = this.COLORS;
    
    // Small trees - proportional to buildings, NOT covering architecture
    const treePositions = [
      { x: -12, z: 8, scale: 0.7 },    // Front left corner
      { x: 12, z: 8, scale: 0.6 },     // Front right corner
      { x: -12, z: -12, scale: 0.5 },   // Back left
      { x: 12, z: -12, scale: 0.5 },    // Back right
    ];

    treePositions.forEach(({ x, z, scale }) => {
      // Trunk
      const trunk = this.createCylinder(0.15 * scale, 0.2 * scale, 2.5 * scale, 0x5A4A2A, x, 1.25 * scale, z);
      this.scene.add(trunk);
      // Canopy (sphere, small and proportional)
      const canopyGeo = new THREE.SphereGeometry(1.5 * scale, 8, 8);
      const canopyMat = this.mat(C.greenTree, { roughness: 0.85 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(x, 2.5 * scale + 1, z);
      canopy.castShadow = true;
      this.scene.add(canopy);
    });
  },

  addMonuments() {
    const C = this.COLORS;
    
    // Stone stele/monument in courtyard
    this.scene.add(this.createBox(0.6, 1.8, 0.3, C.stoneGray, -4, 0.9, 8));
    this.scene.add(this.createBox(0.8, 0.15, 0.5, C.stoneGray, -4, 0.075, 8)); // base

    // Incense urn
    this.scene.add(this.createCylinder(0.4, 0.3, 0.8, 0x8B6940, 0, 0.4, 6, 8));
  },

  // ============ HOTSPOTS ============
  createHotspots() {
    if (typeof MAP_DATA === 'undefined') return;

    // 3D positions for each area hotspot
    const hotspotPositions = {
      'cong-tam-quan':   { x: 0, y: 6, z: 14 },
      'san-dinh':        { x: 0, y: 2, z: 8 },
      'tien-dien':       { x: 0, y: 5, z: 3 },
      'chanh-dien':      { x: 0, y: 7, z: -4 },
      'hau-dien':        { x: 0, y: 5, z: -11 },
      'nha-vo-ca':       { x: -10, y: 5, z: -1 },
      'cot-keo-go':      { x: 10, y: 5, z: -1 },
      'bo-noc-mai-ngoi': { x: 0, y: 10, z: -4 },
    };

    // Create 3D marker meshes for raycasting
    MAP_DATA.areas.forEach((area, idx) => {
      const pos = hotspotPositions[area.id];
      if (!pos) return;

      // Marker sphere (invisible, for raycasting)
      const markerGeo = new THREE.SphereGeometry(0.8, 12, 12);
      const markerMat = new THREE.MeshBasicMaterial({ 
        transparent: true, opacity: 0, depthTest: false 
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(pos.x, pos.y, pos.z);
      marker.userData = { areaId: area.id, areaIndex: idx, isHotspot: true };
      this.scene.add(marker);

      // Visible pin
      const pinGeo = new THREE.SphereGeometry(0.45, 16, 16);
      const pinMat = new THREE.MeshStandardMaterial({
        color: area.color,
        emissive: area.color,
        emissiveIntensity: 0.4,
        metalness: 0.3,
        roughness: 0.4,
      });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(pos.x, pos.y, pos.z);
      this.scene.add(pin);

      // Outer ring (pulsing glow)
      const ringGeo = new THREE.RingGeometry(0.5, 0.7, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: area.color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(pos.x, pos.y, pos.z);
      ring.lookAt(this.camera.position);
      this.scene.add(ring);

      // Connecting line from hotspot to building
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pos.x, 0.5, pos.z),
        new THREE.Vector3(pos.x, pos.y - 0.5, pos.z),
      ]);
      const lineMat = new THREE.LineBasicMaterial({ 
        color: area.color, transparent: true, opacity: 0.5, linewidth: 1 
      });
      const line = new THREE.Line(lineGeo, lineMat);
      this.scene.add(line);

      this.hotspots.push({ 
        marker, pin, ring, area, idx, 
        pos: new THREE.Vector3(pos.x, pos.y, pos.z) 
      });
    });
  },

  // ============ INTERACTION ============
  onClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const hotspotMeshes = this.hotspots.map(h => h.marker);
    const intersects = this.raycaster.intersectObjects(hotspotMeshes);
    
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const area = MAP_DATA.areas[hit.userData.areaIndex];
      if (area && typeof window.openHotspotModal === 'function') {
        window.openHotspotModal(area);
      } else if (area && typeof globalThis.openHotspotModal === 'function') {
        globalThis.openHotspotModal(area);
      }
    }
  },

  onMouseMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hotspotMeshes = this.hotspots.map(h => h.marker);
    const intersects = this.raycaster.intersectObjects(hotspotMeshes);
    
    this.renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'grab';
  },

  onResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  },

  // ============ ANIMATION ============
  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const time = Date.now() * 0.001;

    // Update hotspot rings to face camera & pulse
    this.hotspots.forEach((h, i) => {
      h.ring.lookAt(this.camera.position);
      const scale = 1 + 0.3 * Math.sin(time * 2 + i * 0.8);
      h.ring.scale.set(scale, scale, scale);
      h.ring.material.opacity = 0.2 + 0.2 * Math.sin(time * 2 + i * 0.8);
      
      // Pin gentle float
      h.pin.position.y = h.pos.y + 0.15 * Math.sin(time * 1.5 + i * 0.5);
    });

    // Update HTML overlay labels
    this.updateHotspotLabels();

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  },

  updateHotspotLabels() {
    if (!this.overlayContainer) return;
    
    // Only update labels every few frames for performance
    if (this._labelFrame === undefined) this._labelFrame = 0;
    this._labelFrame++;
    if (this._labelFrame % 3 !== 0) return;

    const lang = (typeof i18n !== 'undefined' && i18n?.current) || 'vi';

    // Create labels if not exist
    if (!this._labelsCreated) {
      this.overlayContainer.innerHTML = '';
      this.hotspots.forEach((h, i) => {
        const label = document.createElement('div');
        label.className = 'hotspot-label';
        label.innerHTML = `<span class="hotspot-num">${i + 1}</span>`;
        label.style.borderColor = h.area.color;
        label.addEventListener('click', () => {
          if (typeof window.openHotspotModal === 'function') {
            window.openHotspotModal(h.area);
          } else if (typeof globalThis.openHotspotModal === 'function') {
            globalThis.openHotspotModal(h.area);
          }
        });
        this.overlayContainer.appendChild(label);
      });
      this._labelsCreated = true;
    }

    // Project 3D positions to 2D
    const labels = this.overlayContainer.children;
    this.hotspots.forEach((h, i) => {
      if (!labels[i]) return;
      const screenPos = h.pos.clone().project(this.camera);
      const x = (screenPos.x * 0.5 + 0.5) * this.container.clientWidth;
      const y = (-screenPos.y * 0.5 + 0.5) * this.container.clientHeight;
      
      // Check if behind camera
      if (screenPos.z > 1) {
        labels[i].style.display = 'none';
      } else {
        labels[i].style.display = '';
        labels[i].style.left = x + 'px';
        labels[i].style.top = y + 'px';
      }
    });
  },

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer) {
      this.renderer.dispose();
      this.container?.removeChild(this.renderer.domElement);
    }
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
  }
};

// Expose globally for access from regular scripts
window.Temple3D = Temple3D;

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => Temple3D.init('temple-3d-container'), 100);
  });
} else {
  setTimeout(() => Temple3D.init('temple-3d-container'), 100);
}
