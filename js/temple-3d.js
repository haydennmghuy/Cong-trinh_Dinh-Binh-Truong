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
    const groundGeo = new THREE.PlaneGeometry(120, 120);
    const groundMat = this.mat(C.groundDark, { roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Courtyard paving (within the compound)
    const courtGeo = new THREE.PlaneGeometry(30, 32);
    const courtMat = this.mat(C.groundPave, { roughness: 0.85 });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.01, 0);
    court.receiveShadow = true;
    this.scene.add(court);

    // === SURROUNDING WALL / FENCE ===
    this.buildFence();

    // === CỔNG TAM QUAN (Main Gate on left wall) ===
    this.buildGate();

    // === CỔNG NHỎ (Small Gate on left wall) ===
    this.buildSmallGate();

    // === SÂN ĐÌNH (Courtyard features) ===
    this.buildCourtyard();

    // === TIỀN ĐIỆN (Front Hall) ===
    this.buildTienDien();

    // === CHÁNH ĐIỆN (Main Shrine Hall) ===
    this.buildChanhDien();

    // === HẬU ĐIỆN (Rear Hall / Nhà khách) ===
    this.buildHauDien();

    // === NHÀ VÕ CA (Opera Stage) ===
    this.buildVoCa();

    // === CỘT KÈO GỖ (Exposed structural woodwork display inside Chánh Điện) ===
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
    
    // Fence walls (low yellow walls)
    const wallThick = 0.3;
    
    // Front wall (solid, with pond and shrines in front)
    this.scene.add(this.createBox(30, fenceH, wallThick, C.fenceYellow, 0, fenceH/2, 16));
    
    // Back wall
    this.scene.add(this.createBox(30, fenceH, wallThick, C.fenceYellow, 0, fenceH/2, -16));
    
    // Right wall (solid, behind the main halls)
    this.scene.add(this.createBox(wallThick, fenceH, 32, C.fenceYellow, 15, fenceH/2, 0));
    
    // Left wall (has Cổng Tam Quan at z=9.5..14.5 and Cổng Nhỏ at z=-11.5..-8.5)
    // Wall 1: Front corner to Cổng Tam Quan
    this.scene.add(this.createBox(wallThick, fenceH, 1.5, C.fenceYellow, -15, fenceH/2, 15.25));
    // Wall 2: Between Cổng Tam Quan and Cổng Nhỏ
    this.scene.add(this.createBox(wallThick, fenceH, 18, C.fenceYellow, -15, fenceH/2, 0.5));
    // Wall 3: Between Cổng Nhỏ and Back corner
    this.scene.add(this.createBox(wallThick, fenceH, 4.5, C.fenceYellow, -15, fenceH/2, -13.75));

    // Fence pillars at corners and intervals
    const pillarPositions = [
      // Front
      [-15, 16], [-7.5, 16], [0, 16], [7.5, 16], [15, 16],
      // Back
      [-15, -16], [-7.5, -16], [0, -16], [7.5, -16], [15, -16],
      // Left wall pillars near gates
      [-15, 14.5], [-15, 9.5], [-15, -8.5], [-15, -11.5],
      // Right
      [15, 8], [15, 0], [15, -8]
    ];
    
    pillarPositions.forEach(([x, z]) => {
      const pillar = this.createBox(0.5, pillarH, 0.5, C.wallYellowLight, x, pillarH/2, z);
      this.scene.add(pillar);
      // Pillar cap
      const cap = this.createBox(0.6, 0.15, 0.6, C.goldAccent, x, pillarH + 0.075, z, { metalness: 0.3 });
      this.scene.add(cap);
    });

    // Decorative metal fence bars (simplified as thin lines)
    // Between pillars along the walls
    // Front wall left section
    for (let x = -14; x <= -8; x += 0.6) {
      this.scene.add(this.createBox(0.05, 0.9, 0.05, C.fenceBars, x, 0.65, 16, { metalness: 0.5 }));
    }
    // Front wall right section
    for (let x = 8; x <= 14; x += 0.6) {
      this.scene.add(this.createBox(0.05, 0.9, 0.05, C.fenceBars, x, 0.65, 16, { metalness: 0.5 }));
    }
  },

  buildGate() {
    const C = this.COLORS;
    const group = new THREE.Group();
    group.position.set(-14.5, 0, 12);
    group.rotation.y = Math.PI / 2; // Rotate 90 deg to face courtyard (+X)
    
    // Main gate structure
    const gateW = 5;
    const gateD = 1.8;
    const gateH = 3.5;

    // Gate walls (yellow) - left pillar
    group.add(this.createBox(1.5, gateH, gateD, C.wallYellow, -2, gateH/2, 0));
    // Gate walls - right pillar
    group.add(this.createBox(1.5, gateH, gateD, C.wallYellow, 2, gateH/2, 0));
    // Gate walls - center left divider
    group.add(this.createBox(0.6, gateH, gateD, C.wallYellow, -0.7, gateH/2, 0));
    // Gate walls - center right divider
    group.add(this.createBox(0.6, gateH, gateD, C.wallYellow, 0.7, gateH/2, 0));

    // Upper wall connecting (above arches)
    group.add(this.createBox(gateW + 0.6, 1.2, gateD, C.wallYellow, 0, gateH + 0.6, 0));

    // Arch tops (semi-circular openings)
    // Center arch (larger)
    group.add(this.createBox(1.4, 3, gateD + 0.1, C.woodBrown, 0, 1.5, 0, { roughness: 0.9 }));
    // Left arch
    group.add(this.createBox(1.0, 2.5, gateD + 0.1, C.woodBrown, -1.35, 1.25, 0, { roughness: 0.9 }));
    // Right arch
    group.add(this.createBox(1.0, 2.5, gateD + 0.1, C.woodBrown, 1.35, 1.25, 0, { roughness: 0.9 }));

    // Gate roof
    const gateRoof = this.createRoof(gateW + 1.2, gateD + 0.8, 1.8, 0.6, C.roofBrown, 0, gateH + 0.8, 0);
    group.add(gateRoof);

    // Gate decorative top piece (stepped pagoda-like crown)
    group.add(this.createBox(2.2, 0.6, 1.2, C.wallYellow, 0, gateH + 2.4, 0));
    const crownRoof = this.createRoof(2.6, 1.4, 1.0, 0.4, C.roofDark, 0, gateH + 2.8, 0);
    group.add(crownRoof);

    // Gold ridge ornament on top
    group.add(this.createBox(0.15, 0.6, 0.15, C.goldAccent, 0, gateH + 4.0, 0, { metalness: 0.5 }));

    // Plaque above main arch
    group.add(this.createBox(2.0, 0.5, 0.1, C.goldAccent, 0, gateH + 0.3, gateD/2 + 0.05, { metalness: 0.3 }));

    this.scene.add(group);
  },

  buildSmallGate() {
    const C = this.COLORS;
    const group = new THREE.Group();
    group.position.set(-14.5, 0, -10);
    group.rotation.y = Math.PI / 2; // Rotate 90 deg to face courtyard (+X)

    const gateH = 2.8;
    const gateW = 2.4;
    const gateD = 1.2;

    // Two side pillars
    group.add(this.createBox(0.6, gateH, gateD, C.wallYellow, -0.9, gateH/2, 0));
    group.add(this.createBox(0.6, gateH, gateD, C.wallYellow, 0.9, gateH/2, 0));
    
    // Arch opening/door
    group.add(this.createBox(1.2, 2.2, gateD - 0.2, C.woodBrown, 0, 1.1, 0, { roughness: 0.9 }));
    
    // Header wall
    group.add(this.createBox(gateW, 0.6, gateD, C.wallYellow, 0, gateH - 0.3, 0));
    
    // Small roof
    const roof = this.createRoof(gateW + 0.6, gateD + 0.4, 0.8, 0.3, C.roofRed, 0, gateH - 0.1, 0);
    group.add(roof);

    this.scene.add(group);
  },

  buildCourtyard() {
    const C = this.COLORS;

    // 1. Hồ Thuỷ Tạ (Semi-circular pond at the front wall)
    const pondShape = new THREE.Shape();
    pondShape.absarc(0, 0, 3.5, 0, Math.PI, false);
    const pondGeo = new THREE.ShapeGeometry(pondShape);
    const pond = new THREE.Mesh(pondGeo, this.mat(0x33A0FF, { roughness: 0.1, metalness: 0.8 }));
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(0, 0.03, 16);
    this.scene.add(pond);

    // Pond stone border
    const borderShape = new THREE.Shape();
    borderShape.absarc(0, 0, 3.7, 0, Math.PI, false);
    const borderExtrude = new THREE.ExtrudeGeometry(borderShape, { depth: 0.25, bevelEnabled: false });
    const border = new THREE.Mesh(borderExtrude, this.mat(C.stoneGray));
    border.rotation.x = -Math.PI / 2;
    border.position.set(0, 0.03, 16);
    this.scene.add(border);

    // 2. Bình Phong (Screen wall facing Cổng Tam Quan)
    this.scene.add(this.createBox(3, 1.8, 0.25, C.wallYellow, -4, 0.9, 12));
    this.scene.add(this.createBox(3.4, 0.15, 0.5, C.stoneGray, -4, 0.075, 12)); // base
    const bpRoof = this.createRoof(3.2, 0.4, 0.4, 0.1, C.roofRed, -4, 1.8, 12);
    this.scene.add(bpRoof);

    // 3. Miếu Thờ 1 & 2 along the front wall
    [[-8, 14], [-1, 14]].forEach(([mx, mz]) => {
      // Base
      this.scene.add(this.createBox(1.0, 0.2, 1.0, C.stoneGray, mx, 0.1, mz));
      // Shrine
      this.scene.add(this.createBox(0.8, 1.2, 0.8, C.wallYellow, mx, 0.7, mz));
      // Roof
      const sRoof = this.createRoof(1.0, 1.0, 0.5, 0.1, C.roofRed, mx, 1.3, mz);
      this.scene.add(sRoof);
    });

    // 4. Bia Tưởng Niệm (Memorial Stele)
    this.scene.add(this.createBox(1.0, 0.2, 0.8, C.stoneGray, 2, 0.1, 14));
    this.scene.add(this.createBox(0.6, 1.4, 0.2, C.stoneGray, 2, 0.8, 14));
    this.scene.add(this.createBox(0.4, 0.8, 0.22, C.goldAccent, 2, 0.8, 14, { metalness: 0.3 }));

    // 5. Giếng Nước (Water Well)
    const wellRing = this.createCylinder(0.8, 0.8, 0.8, C.stoneGray, 9, 0.4, 14, 12);
    this.scene.add(wellRing);
    const wellWater = this.createCylinder(0.7, 0.7, 0.7, 0x103040, 9, 0.35, 14, 12);
    this.scene.add(wellWater);
    this.scene.add(this.createBox(0.08, 1.6, 0.08, C.woodBrown, 8.3, 0.8, 14));
    this.scene.add(this.createBox(0.08, 1.6, 0.08, C.woodBrown, 9.7, 0.8, 14));
    const wellRoof = this.createRoof(1.6, 0.8, 0.4, 0.1, C.roofRed, 9, 1.6, 14);
    this.scene.add(wellRoof);

    // 6. Bia Di Tích Kiến Trúc Nghệ Thuật (Historic Stele in the yard)
    const base = this.createCylinder(1.3, 1.3, 0.2, C.stoneGray, -6, 0.1, 2, 16);
    this.scene.add(base);
    const stele = this.createBox(0.8, 1.8, 0.3, C.stoneGray, -6, 1.0, 2);
    this.scene.add(stele);
    const steleRoof = this.createRoof(1.2, 0.6, 0.4, 0.1, C.roofBrown, -6, 1.9, 2);
    this.scene.add(steleRoof);

    // Pathway from main gate area towards main temple
    const pathGeo = new THREE.PlaneGeometry(20, 4);
    const pathMat = this.mat(0xC0A888, { roughness: 0.9 });
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(-2, 0.02, 3);
    this.scene.add(path);

    // Stone lanterns in front of the main temple entrance
    [[-1, 6], [-1, 1]].forEach(([x, z]) => {
      const pole = this.createCylinder(0.08, 0.08, 2.0, C.stoneGray, x, 1.0, z);
      this.scene.add(pole);
      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 12, 12),
        this.mat(C.white, { roughness: 0.3, emissive: 0xFFFFCC, emissiveIntensity: 0.2 })
      );
      globe.position.set(x, 2.1, z);
      this.scene.add(globe);
    });
  },

  buildVoCa() {
    const C = this.COLORS;
    // Opera stage - at the front of the right connected block
    const x = 6, z = 9, w = 8, d = 6, h = 3.5;

    // Foundation
    this.scene.add(this.createBox(w + 0.5, 0.4, d + 0.5, C.stoneGray, x, 0.2, z));

    // Open structure (partially open on 3 sides)
    this.scene.add(this.createBox(w, h * 0.4, 0.2, C.wallYellow, x, h/2 + 0.4 + h * 0.3, z - d/2));

    // Red columns
    const colPositions = [
      [x - w/2 + 0.3, z - d/2 + 0.3],
      [x + w/2 - 0.3, z - d/2 + 0.3],
      [x - w/2 + 0.3, z + d/2 - 0.3],
      [x + w/2 - 0.3, z + d/2 - 0.3],
      [x - w/2 + 0.3, z],
      [x + w/2 - 0.3, z]
    ];
    colPositions.forEach(([cx, cz]) => {
      this.scene.add(this.createCylinder(0.18, 0.2, h, C.columnRed, cx, h/2 + 0.4, cz));
      this.scene.add(this.createBox(0.45, 0.15, 0.45, C.stoneGray, cx, 0.475, cz));
    });

    // Roof
    const roof = this.createRoof(w, d, 2.2, 1.0, C.roofBrown, x, h + 0.4, z);
    this.scene.add(roof);
  },

  buildTienDien() {
    const C = this.COLORS;
    // Second hall section
    const x = 6, z = 3.5, w = 10, d = 5, h = 3.5;

    // Foundation
    this.scene.add(this.createBox(w + 0.8, 0.4, d + 0.8, C.stoneGray, x, 0.2, z));

    // Walls
    this.scene.add(this.createBox(w, h, 0.25, C.wallYellow, x, h/2 + 0.4, z - d/2));
    this.scene.add(this.createBox(0.25, h, d, C.wallYellow, x - w/2, h/2 + 0.4, z));
    this.scene.add(this.createBox(0.25, h, d, C.wallYellow, x + w/2, h/2 + 0.4, z));
    // Front wall (facing Võ Ca) - has opening in the middle
    this.scene.add(this.createBox(3, h, 0.25, C.wallYellow, x - 3.5, h/2 + 0.4, z + d/2));
    this.scene.add(this.createBox(3, h, 0.25, C.wallYellow, x + 3.5, h/2 + 0.4, z + d/2));

    // Red Columns
    const colPositions = [
      [x - 3.5, z - 1.5], [x - 3.5, z + 1.5],
      [x, z - 1.5], [x, z + 1.5],
      [x + 3.5, z - 1.5], [x + 3.5, z + 1.5],
    ];
    colPositions.forEach(([cx, cz]) => {
      this.scene.add(this.createCylinder(0.2, 0.22, h, C.columnRed, cx, h/2 + 0.4, cz));
      this.scene.add(this.createBox(0.5, 0.15, 0.5, C.stoneGray, cx, 0.475, cz));
    });

    // Roof
    const roof = this.createRoof(w, d, 2.5, 1.2, C.roofRed, x, h + 0.4, z);
    this.scene.add(roof);
  },

  buildChanhDien() {
    const C = this.COLORS;
    // Third hall section (Main sanctuary, slightly wider and taller)
    const x = 6, z = -2.5, w = 12, d = 7, h = 5;

    // Foundation
    this.scene.add(this.createBox(w + 1.2, 0.6, d + 1.2, C.stoneGray, x, 0.3, z));

    // Walls
    this.scene.add(this.createBox(w, h, 0.3, C.wallYellow, x, h/2 + 0.6, z - d/2));
    this.scene.add(this.createBox(0.3, h, d, C.wallYellow, x - w/2, h/2 + 0.6, z));
    this.scene.add(this.createBox(0.3, h, d, C.wallYellow, x + w/2, h/2 + 0.6, z));
    this.scene.add(this.createBox(3, h, 0.3, C.wallYellow, x - 4.5, h/2 + 0.6, z + d/2));
    this.scene.add(this.createBox(3, h, 0.3, C.wallYellow, x + 4.5, h/2 + 0.6, z + d/2));
    this.scene.add(this.createBox(6, 1.5, 0.3, C.wallYellow, x, h - 0.15, z + d/2));

    // Red pillars inside Chánh Điện
    const colPositions = [
      [x - 4.5, z - 2], [x - 4.5, z + 2],
      [x - 2.25, z - 2], [x - 2.25, z + 2],
      [x, z - 2], [x, z + 2],
      [x + 2.25, z - 2], [x + 2.25, z + 2],
      [x + 4.5, z - 2], [x + 4.5, z + 2]
    ];
    colPositions.forEach(([cx, cz]) => {
      this.scene.add(this.createCylinder(0.25, 0.27, h, C.columnRed, cx, h/2 + 0.6, cz));
      this.scene.add(this.createBox(0.6, 0.2, 0.6, C.stoneGray, cx, 0.7, cz));
    });

    // Altar
    this.scene.add(this.createBox(4, 2, 1.5, C.woodBrown, x, 1.6, z - 1.5));
    this.scene.add(this.createBox(4.2, 0.15, 1.7, C.goldAccent, x, 2.7, z - 1.5, { metalness: 0.4 }));

    // Roof
    const roof = this.createRoof(w, d, 3.5, 1.5, C.roofBrown, x, h + 0.6, z);
    this.scene.add(roof);
  },

  buildHauDien() {
    const C = this.COLORS;
    // Fourth hall section (Nhà Khách at the bottom of the connected halls)
    const x = 6, z = -8.5, w = 10, d = 5, h = 3.5;

    // Foundation
    this.scene.add(this.createBox(w + 0.8, 0.4, d + 0.8, C.stoneGray, x, 0.2, z));

    // Walls
    this.scene.add(this.createBox(w, h, 0.25, C.wallYellow, x, h/2 + 0.4, z - d/2));
    this.scene.add(this.createBox(w, h, 0.25, C.wallYellow, x, h/2 + 0.4, z + d/2));
    this.scene.add(this.createBox(0.25, h, d, C.wallYellow, x - w/2, h/2 + 0.4, z));
    this.scene.add(this.createBox(0.25, h, d, C.wallYellow, x + w/2, h/2 + 0.4, z));

    // Doorway
    this.scene.add(this.createBox(2, 2.5, 0.3, C.woodBrown, x, 1.25 + 0.4, z + d/2, { roughness: 0.9 }));

    // Columns
    [[x - 3.5, z], [x + 3.5, z]].forEach(([cx, cz]) => {
      this.scene.add(this.createCylinder(0.18, 0.2, h, C.columnRed, cx, h/2 + 0.4, cz));
    });

    // Roof
    const roof = this.createRoof(w, d, 2.2, 1.0, C.roofRed, x, h + 0.4, z);
    this.scene.add(roof);
  },

  buildCotKeo() {
    const C = this.COLORS;
    // Exposd wooden beam system built inside Chánh Điện to show structural details
    const x = 6, z = -2.5;
    
    // Horizontal beams connecting columns (kèo)
    for (let cz of [z - 2, z + 2]) {
      this.scene.add(this.createBox(11.5, 0.25, 0.2, C.woodLight, x, 5.0, cz));
    }
    // Cross beams
    for (let cx of [x - 4.5, x - 2.25, x, x + 2.25, x + 4.5]) {
      this.scene.add(this.createBox(0.2, 0.25, 4.0, C.woodLight, cx, 5.0, z));
    }
  },

  addRoofDecorations() {
    const C = this.COLORS;

    // Dragon ornaments on main hall roof ridge (Chánh Điện is at x=6, z=-2.5, height is 5 + 0.6 = 5.6, ridge is 3.5 higher = 9.1)
    const dragonGeo = new THREE.ConeGeometry(0.3, 1.2, 6);
    const dragonMat = this.mat(C.goldAccent, { metalness: 0.5 });
    
    [[3, 9.1, -2.5], [9, 9.1, -2.5]].forEach(([x, y, z]) => {
      const dragon = new THREE.Mesh(dragonGeo, dragonMat);
      dragon.position.set(x, y, z);
      dragon.rotation.z = x < 6 ? 0.4 : -0.4;
      this.scene.add(dragon);
    });
  },

  addTrees() {
    const C = this.COLORS;
    
    // Proportional trees in remaining yard areas to make the yard look natural
    const treePositions = [
      { x: -12, z: 6, scale: 0.7 },
      { x: -12, z: -4, scale: 0.6 },
      { x: -12, z: -14, scale: 0.55 },
      { x: 0, z: -14, scale: 0.65 },
      { x: 12, z: -14, scale: 0.6 }
    ];

    treePositions.forEach(({ x, z, scale }) => {
      // Trunk
      const trunk = this.createCylinder(0.15 * scale, 0.2 * scale, 2.5 * scale, 0x5A4A2A, x, 1.25 * scale, z);
      this.scene.add(trunk);
      // Canopy
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
    // Incense urn in front of Tiền Điện entrance
    this.scene.add(this.createCylinder(0.4, 0.3, 0.8, 0x8B6940, 2.0, 0.4, 5.5, 8));
  },

  // ============ HOTSPOTS ============
  createHotspots() {
    if (typeof MAP_DATA === 'undefined') return;

    // 3D positions updated to match new layout positions
    const hotspotPositions = {
      'cong-tam-quan':   { x: -12.5, y: 5.0, z: 12.0 },
      'san-dinh':        { x: -3.0, y: 1.5, z: 2.0 },
      'tien-dien':       { x: 6.0, y: 4.5, z: 3.5 },
      'chanh-dien':      { x: 6.0, y: 5.5, z: -2.5 },
      'hau-dien':        { x: 6.0, y: 4.5, z: -8.5 },
      'nha-vo-ca':       { x: 6.0, y: 4.5, z: 9.0 },
      'cot-keo-go':      { x: 7.5, y: 4.5, z: 0.5 },
      'bo-noc-mai-ngoi': { x: 6.0, y: 8.5, z: -2.5 },
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
