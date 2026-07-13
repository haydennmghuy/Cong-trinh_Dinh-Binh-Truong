import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
  transitionTargetCam: null,
  transitionTargetLookAt: null,

  // Colors from real photos
  COLORS: {
    wallYellow:    0xDFCA88, // Soft pale yellow from the photo
    wallYellowLight: 0xEAD8A3, // Light cream-yellow
    roofBrown:     0x7E3D30, // Terracotta tile brown/red
    roofRed:       0x8A4B38, // Terracotta red
    roofDark:      0x5E2B20,
    columnRed:     0x8B2222,
    columnDarkRed: 0x6B1818,
    woodBrown:     0x6B4010,
    woodLight:     0x8B5A20,
    goldAccent:    0xC9A84C,
    goldDark:      0xA08530,
    groundPave:    0xB8A898,
    groundDark:    0x9E8E7E,
    fenceYellow:   0xDFCA88,
    fenceBars:     0x4E463F, // Dark bronze/iron bars from the photo
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

    // Camera - aligned front-to-back with a clean isometric-like tilt to match the user's drawing layout
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
    this.camera.position.set(0, 32, 28);
    this.camera.lookAt(0, 1, -8);

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
    this.controls.minDistance = 2;
    this.controls.maxDistance = 80;
    this.controls.target.set(0, 1, -8);
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.5;

    this.controls.addEventListener('start', () => {
      this.transitionTargetCam = null;
      this.transitionTargetLookAt = null;
    });

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
      this.camera.position.set(0, 32, 28);
      this.controls.target.set(0, 1, -8);
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

  loadGLBModel(path, x, y, z, rotY = 0, scale = 1, onLoaded = null) {
    const loader = new GLTFLoader();
    loader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(x, y, z);
        model.rotation.y = rotY;
        model.scale.set(scale, scale, scale);
        
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            
            // Hide fence attachments inside Cong_nho_ben_phai GLB
            if (modelName === 'Cong_nho_ben_phai') {
              const nameLower = node.name.toLowerCase();
              if (
                nameLower.includes('hang') || 
                nameLower.includes('rao') || 
                nameLower.includes('wall') || 
                nameLower.includes('fence') || 
                nameLower.includes('tuong')
              ) {
                node.visible = false;
              }
            }
          }
        });
        
        this.scene.add(model);
        
        // Expose to window for easy debugging/positioning
        if (!window.loadedModels) window.loadedModels = {};
        const modelName = path.split('/').pop().replace('.glb', '');
        window.loadedModels[modelName] = model;
        
        // Auto-scale and ground alignment based on geometry bounding box
        setTimeout(() => {
          const box = new THREE.Box3();
          let hasMesh = false;
          model.traverse((node) => {
            if (node.isMesh) {
              node.geometry.computeBoundingBox();
              const tempBox = node.geometry.boundingBox.clone();
              node.updateWorldMatrix(true, true);
              tempBox.applyMatrix4(node.matrixWorld);
              if (!hasMesh) {
                box.copy(tempBox);
                hasMesh = true;
              } else {
                box.union(tempBox);
              }
            }
          });
          
          if (hasMesh) {
            const size = new THREE.Vector3();
            box.getSize(size);
            
            // Target dimensions of the original procedural shapes
            const targets = {
              'Cong_Tam_Quan': { width: 7.2 },
              'Cong_nho_ben_phai': { width: 4.0 },
              'Ho_Thuy_Ta': { width: 6.5 },
              'San_khau': { width: 3.4 },
              'Bia_ghi_cong': { height: 3.2 },
              'Mieu_Ba_Ngu_Hanh': { width: 1.6 },
              'Ban_Than_Nong': { depth: 3.2 },
              'Mieu_Bach_Ma': { width: 1.6 },
              'Bia_ghi_nhan_di_tich': { height: 2.4 },
              'Cot_co_Viet_Nam': { height: 6.4 },
              'Toa_nha_bep_va_toa_WC': { width: 9.0 }
            };
            
            const target = targets[modelName];
            if (target) {
              let currentSize = 1;
              let targetSize = 1;
              if (target.width) {
                currentSize = size.x;
                targetSize = target.width;
              } else if (target.height) {
                currentSize = size.y;
                targetSize = target.height;
              } else if (target.depth) {
                currentSize = size.z;
                targetSize = target.depth;
              }
              
              if (currentSize > 0) {
                const S = (targetSize / currentSize) * scale;
                model.scale.set(S, S, S);
                
                // Recompute box after scaling to align bottom to y = 0
                const box2 = new THREE.Box3();
                let hasMesh2 = false;
                model.traverse((node) => {
                  if (node.isMesh) {
                    node.geometry.computeBoundingBox();
                    const tempBox = node.geometry.boundingBox.clone();
                    node.updateWorldMatrix(true, true);
                    tempBox.applyMatrix4(node.matrixWorld);
                    if (!hasMesh2) {
                      box2.copy(tempBox);
                      hasMesh2 = true;
                    } else {
                      box2.union(tempBox);
                    }
                  }
                });
                
                const bottomY = box2.min.y - model.position.y;
                model.position.y = -bottomY;
                
                console.log(`[AUTO-SCALE] Rescaled ${modelName} to scale ${S.toFixed(4)} and grounded at position.y = ${model.position.y.toFixed(4)}`);
              }
            }
          }
        }, 200);
        
        if (onLoaded) onLoaded(model);
      },
      undefined,
      (error) => {
        console.error('Error loading GLB model:', path, error);
      }
    );
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
    const courtGeo = new THREE.PlaneGeometry(60.0, 30.5);
    const courtMat = this.mat(C.groundPave, { roughness: 0.85 });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.01, -9.75);
    court.receiveShadow = true;
    this.scene.add(court);

    // === SURROUNDING WALL / FENCE ===
    this.buildFence();

    // === CỔNG TAM QUAN (Main Gate on front wall, bottom-left) ===
    this.buildGate();

    // === CỔNG NHỎ (Small Gate on front wall, bottom-right) ===
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

    // === Stone monument ===
    this.addMonuments();

    // === Small trees (proportional, not too big) ===
    this.addTrees();

    // === Flagpole, Uncle Ho Temple, Kitchen & WC ===
    this.buildFlagpole();
    this.buildNhaThoBacHo();
    this.buildNhaBepVaWC();
  },

  buildFence() {
    const C = this.COLORS;
    const fenceH = 1.2;
    const pillarH = 1.6;
    const wallThick = 0.3;
    
    // Front wall segments (with gaps for Cổng Tam Quan at x=-26.5..-21.5 and Cổng Nhỏ at x=12.5..15.5)
    // Note: Removed the extra bottom-left wall segment at x=-28.25 (xóa số 1)
    this.scene.add(this.createBox(34.0, fenceH, wallThick, C.fenceYellow, -4.5, fenceH/2, 5.5));
    this.scene.add(this.createBox(14.5, fenceH, wallThick, C.fenceYellow, 22.75, fenceH/2, 5.5));
    
    // Back wall segment left part: from x = -30 to x = 16.0
    this.scene.add(this.createBox(46.0, fenceH, wallThick, C.fenceYellow, -7.0, fenceH/2, -25.0));
    // Back wall segment right part: from x = 21.0 to x = 30
    this.scene.add(this.createBox(9.0, fenceH, wallThick, C.fenceYellow, 25.5, fenceH/2, -25.0));
    
    // Note: Removed protruding fence recess walls around Uncle Ho Temple (xóa hàng rào lồi ra bao quanh nhà Bác)
    
    // Right wall segment (solid, x = 30)
    this.scene.add(this.createBox(wallThick, fenceH, 30.5, C.fenceYellow, 30.0, fenceH/2, -9.75));
    
    // Left wall segment 1/5 bottom vertical: x = -26.5, from z = 5.5 to z = -0.5 (depth 6.0)
    this.scene.add(this.createBox(wallThick, fenceH, 6.0, C.fenceYellow, -26.5, fenceH/2, 2.5));

    // Left wall segment 1/5 bottom diagonal: connecting (x = -26.5, z = -0.5) to (x = -30.0, z = -6.5) (depth 6.0, width 3.5)
    const botDiagWall = this.createBox(wallThick, fenceH, 7.0, C.fenceYellow, -28.25, fenceH/2, -3.5);
    botDiagWall.rotation.y = Math.atan2(3.5, 6.0);
    this.scene.add(botDiagWall);

    // Left wall segment main vertical: x = -30.0, from z = -6.5 to z = -25.0 (depth 18.5) (no top-left diagonal cut)
    this.scene.add(this.createBox(wallThick, fenceH, 18.5, C.fenceYellow, -30.0, fenceH/2, -15.75));

    // Pillars at corners, joints, and gate edges
    const pillarPositions = [
      [30, 5.5],                                                                  // Front wall end
      [-26.5, -0.5], [-30, -6.5], [-30, -15], [-30, -25], [30, -25],              // Corner joints
      [30, -15], [30, -5], [30, 5],                                              // Right wall joints
      [-10, -25], [0, -25], [10, -25]                                             // Back wall joints
    ];

    pillarPositions.forEach(([x, z]) => {
      const pillar = this.createBox(0.5, pillarH, 0.5, C.wallYellowLight, x, pillarH/2, z);
      this.scene.add(pillar);
      // White pillar cap
      const cap = this.createBox(0.6, 0.15, 0.6, 0xF0EDE5, x, pillarH + 0.075, z);
      this.scene.add(cap);
    });

    // Horizontal top rail along front wall segments
    this.scene.add(this.createBox(34.0, 0.08, 0.12, C.fenceBars, -4.5, fenceH + 0.04, 5.5, { metalness: 0.5 }));
    this.scene.add(this.createBox(14.5, 0.08, 0.12, C.fenceBars, 22.75, fenceH + 0.04, 5.5, { metalness: 0.5 }));

    // Decorative metal fence bars along front walls
    for (let x = -21.0; x <= 12.0; x += 0.6) {
      this.scene.add(this.createBox(0.05, 0.9, 0.05, C.fenceBars, x, 0.65, 5.5, { metalness: 0.5 }));
    }
    for (let x = 16.0; x <= 29.0; x += 0.6) {
      this.scene.add(this.createBox(0.05, 0.9, 0.05, C.fenceBars, x, 0.65, 5.5, { metalness: 0.5 }));
    }

    // Fence bars along right wall (x = 30)
    for (let z = -24.5; z <= 5.0; z += 0.6) {
      this.scene.add(this.createBox(0.05, 0.9, 0.05, C.fenceBars, 30.0, 0.65, z, { metalness: 0.5 }));
    }

    // Fence bars along left wall (x = -30, on the main vertical segment z = -25.0 to z = -6.5)
    for (let z = -24.5; z <= -7.0; z += 0.6) {
      this.scene.add(this.createBox(0.05, 0.9, 0.05, C.fenceBars, -30.0, 0.65, z, { metalness: 0.5 }));
    }
  },

  buildGate() {
    this.loadGLBModel('models/Cong_Tam_Quan.glb', -24.0, 0, 5.5, 0, 1.0);
  },

  buildSmallGate() {
    this.loadGLBModel('models/Cong_nho_ben_phai.glb', 14.0, 0, 5.5, 0, 1.0);
  },

  buildCourtyard() {
    const C = this.COLORS;

    // 1. Hồ Thuỷ Tạ (Semi-circular pond on the left wall x=-30.0, curving to the right) - GLB
    this.loadGLBModel('models/Ho_Thuy_Ta.glb', -25.0, 0, -13.0, Math.PI / 2, 1.0);

    // 2. Sân Khấu Ngoài Trời (Outdoor Stage) - GLB
    this.loadGLBModel('models/San_khau.glb', -4.5, 0, -19.5, 0, 1.0);

    // 3. Bia Tưởng Niệm (Memorial Stele) - GLB
    this.loadGLBModel('models/Bia_ghi_cong.glb', -17.0, 0, -20.0, Math.PI / 2, 1.0);

    // 4. Miếu thờ Bà Ngũ Hành - GLB
    this.loadGLBModel('models/Mieu_Ba_Ngu_Hanh.glb', -17.0, 0, -15.0, Math.PI / 2, 1.0);

    // 5. Bàn thờ Thần Nông - GLB
    this.loadGLBModel('models/Ban_Than_Nong.glb', -17.0, 0, -10.0, Math.PI / 2, 1.0);

    // 6. Miếu thờ Bạch Mã - GLB
    this.loadGLBModel('models/Mieu_Bach_Ma.glb', -17.0, 0, -5.0, Math.PI / 2, 1.0);

    // 6B. Miếu thờ Thần Hổ - Column 1, Row 3 (behind Bàn thờ Thần Nông): x = -23.5, z = -10.0 (Procedural, keep as is)
    const mhx = -23.5, mhz = -10.0;
    this.scene.add(this.createBox(1.2, 0.2, 1.2, C.stoneGray, mhx, 0.1, mhz));
    this.scene.add(this.createBox(1.0, 1.3, 1.0, C.wallYellow, mhx, 0.75, mhz));
    // Red columns on front face (+x side)
    this.scene.add(this.createBox(0.1, 1.3, 0.15, C.columnRed, mhx + 0.51, 0.75, mhz - 0.35));
    this.scene.add(this.createBox(0.1, 1.3, 0.15, C.columnRed, mhx + 0.51, 0.75, mhz + 0.35));
    // White doorway outline
    this.scene.add(this.createBox(0.05, 0.9, 0.5, 0xFFFFFF, mhx + 0.51, 0.55, mhz));
    const mhRoof = this.createRoof(1.4, 1.4, 0.6, 0.1, C.roofRed, mhx, 1.4, mhz);
    this.scene.add(mhRoof);

    // 7. Bia Di Tích Kiến Trúc Nghệ Thuật - GLB
    this.loadGLBModel('models/Bia_ghi_nhan_di_tich.glb', -9.0, 0, -1.0, 0, 1.0);

    // Pathway from Cổng Tam Quan to the main temple courtyard (Keep as is)
    const pathGeo = new THREE.PlaneGeometry(4, 12);
    const pathMat = this.mat(0xC0A888, { roughness: 0.9 });
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(-24.0, 0.02, -0.5);
    this.scene.add(path);
  },

  buildVoCa() {
    const C = this.COLORS;
    // Opera stage - leftmost section of the horizontally connected block
    const x = -4.5, z = -10.0, w = 5.0, d = 5.0, h = 3.5;

    // Foundation
    this.scene.add(this.createBox(w + 0.4, 0.4, d + 0.4, C.stoneGray, x, 0.2, z));

    // Columns
    const colPositions = [
      [x - w/2 + 0.3, z - d/2 + 0.3],
      [x + w/2 - 0.3, z - d/2 + 0.3],
      [x - w/2 + 0.3, z + d/2 - 0.3],
      [x + w/2 - 0.3, z + d/2 - 0.3],
    ];
    colPositions.forEach(([cx, cz]) => {
      this.scene.add(this.createCylinder(0.18, 0.2, h, C.columnRed, cx, h/2 + 0.4, cz));
      this.scene.add(this.createBox(0.45, 0.15, 0.45, C.stoneGray, cx, 0.475, cz));
    });

    // Roof
    const roof = this.createRoof(w, d, 2.2, 0.8, C.roofBrown, x, h + 0.4, z);
    this.scene.add(roof);
  },

  buildTienDien() {
    const C = this.COLORS;
    // Second section (Võ Qui)
    const x = 0.5, z = -10.0, w = 5.0, d = 5.0, h = 3.5;

    // Foundation
    this.scene.add(this.createBox(w + 0.4, 0.4, d + 0.4, C.stoneGray, x, 0.2, z));

    // Walls
    this.scene.add(this.createBox(w, h, 0.2, C.wallYellow, x, h/2 + 0.4, z - d/2));
    this.scene.add(this.createBox(w, h, 0.2, C.wallYellow, x, h/2 + 0.4, z + d/2));

    // Columns
    const colPositions = [
      [x - w/2 + 0.3, z - d/2 + 0.3],
      [x + w/2 - 0.3, z - d/2 + 0.3],
      [x - w/2 + 0.3, z + d/2 - 0.3],
      [x + w/2 - 0.3, z + d/2 - 0.3],
    ];
    colPositions.forEach(([cx, cz]) => {
      this.scene.add(this.createCylinder(0.2, 0.22, h, C.columnRed, cx, h/2 + 0.4, cz));
      this.scene.add(this.createBox(0.5, 0.15, 0.5, C.stoneGray, cx, 0.475, cz));
    });

    // Roof
    const roof = this.createRoof(w, d, 2.5, 0.8, C.roofRed, x, h + 0.4, z);
    this.scene.add(roof);
  },

  buildChanhDien() {
    const C = this.COLORS;
    // Third section (Chánh Điện, taller and deeper)
    const x = 6.5, z = -10.0, w = 7.0, d = 5.0, h = 4.5;

    // Foundation
    this.scene.add(this.createBox(w + 0.6, 0.6, d + 0.6, C.stoneGray, x, 0.3, z));

    // Walls
    this.scene.add(this.createBox(w, h, 0.25, C.wallYellow, x, h/2 + 0.6, z - d/2));
    this.scene.add(this.createBox(w, h, 0.25, C.wallYellow, x, h/2 + 0.6, z + d/2));
    this.scene.add(this.createBox(0.25, h, d, C.wallYellow, x + w/2, h/2 + 0.6, z));

    // Red pillars
    const colPositions = [
      [x - w/2 + 0.4, z - d/2 + 0.5], [x - w/2 + 0.4, z + d/2 - 0.5],
      [x, z - d/2 + 0.5], [x, z + d/2 - 0.5],
      [x + w/2 - 0.4, z - d/2 + 0.5], [x + w/2 - 0.4, z + d/2 - 0.5],
    ];
    colPositions.forEach(([cx, cz]) => {
      this.scene.add(this.createCylinder(0.25, 0.27, h, C.columnRed, cx, h/2 + 0.6, cz));
      this.scene.add(this.createBox(0.6, 0.2, 0.6, C.stoneGray, cx, 0.7, cz));
    });

    // Altar
    this.scene.add(this.createBox(2.0, 1.8, 1.2, C.woodBrown, x, 1.4, z));
    this.scene.add(this.createBox(2.2, 0.15, 1.4, C.goldAccent, x, 2.3, z, { metalness: 0.4 }));

    // Roof
    const roof = this.createRoof(w, d, 2.5, 0.8, C.roofBrown, x, h + 0.6, z);
    this.scene.add(roof);
  },

  buildHauDien() {
    const C = this.COLORS;
    // Fourth section (Nhà Khách / Hậu Điện)
    const x = 13.0, z = -10.0, w = 6.0, d = 5.0, h = 3.5;

    // Foundation
    this.scene.add(this.createBox(w + 0.4, 0.4, d + 0.4, C.stoneGray, x, 0.2, z));

    // Walls
    this.scene.add(this.createBox(w, h, 0.2, C.wallYellow, x, h/2 + 0.4, z - d/2));
    this.scene.add(this.createBox(w, h, 0.2, C.wallYellow, x, h/2 + 0.4, z + d/2));
    this.scene.add(this.createBox(0.2, h, d, C.wallYellow, x + w/2, h/2 + 0.4, z));

    // Columns
    [[x - w/2 + 0.3, z], [x + w/2 - 0.3, z]].forEach(([cx, cz]) => {
      this.scene.add(this.createCylinder(0.18, 0.2, h, C.columnRed, cx, h/2 + 0.4, cz));
    });

    // Roof
    const roof = this.createRoof(w, d, 2.2, 0.6, C.roofRed, x, h + 0.4, z);
    this.scene.add(roof);
  },

  buildCotKeo() {
    const C = this.COLORS;
    const x = 6.5, z = -10.0;
    // Exposed wooden beam system inside Chánh Điện
    for (let cz of [z - 2.0, z + 2.0]) {
      this.scene.add(this.createBox(6.5, 0.25, 0.2, C.woodLight, x, 4.5, cz));
    }
    for (let cx of [x - 2.5, x, x + 2.5]) {
      this.scene.add(this.createBox(0.2, 0.25, 4.5, C.woodLight, cx, 4.5, z));
    }
  },

  addRoofDecorations() {
    const C = this.COLORS;

    // Dragon ornaments on main hall roof ridge ends (Chánh Điện is at x=2.0, z=-4.0, ridge height is 7.6)
    const dragonGeo = new THREE.ConeGeometry(0.3, 1.2, 6);
    const dragonMat = this.mat(C.goldAccent, { metalness: 0.5 });
    
    [[3.0, 7.6, -10.0], [10.0, 7.6, -10.0]].forEach(([x, y, z]) => {
      const dragon = new THREE.Mesh(dragonGeo, dragonMat);
      dragon.position.set(x, y, z);
      dragon.rotation.z = x > 2.0 ? -0.4 : 0.4;
      this.scene.add(dragon);
    });
  },

  addTrees() {
    const C = this.COLORS;
    
    // Proportional trees in remaining yard areas to make the yard look natural
    const treePositions = [
      { x: -26.0, z: -20.0, scale: 0.75 },
      { x: -26.0, z: 0.0,   scale: 0.7 },
      { x: 26.0,  z: 0.0,   scale: 0.65 },
      { x: -19.5, z: -10.0, scale: 0.65 } // Added tree to the right of Miếu thờ Thần Hổ
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
    // Note: Removed the incense urn next to Tiền Điện (xóa cái chậu cạnh tiền điện)
  },

  // ============ HOTSPOTS ============
  createHotspots() {
    if (typeof MAP_DATA === 'undefined') return;

    // 3D positions matching the user's drawing layout
    const hotspotPositions = {
      'cong-tam-quan':        { x: -24.0, y: 5.0,  z: 5.5 },
      'cong-nho':             { x: 14.0,  y: 3.5,  z: 5.5 },
      'nha-vo-ca':            { x: -4.5,  y: 4.5,  z: -10.0 },
      'vo-qui':               { x: 0.5,   y: 4.5,  z: -10.0 },
      'chanh-dien':           { x: 6.5,   y: 6.0,  z: -10.0 },
      'tien-dien':            { x: 13.0,  y: 4.5,  z: -10.0 },
      'ho-thuy-ta':           { x: -25.0, y: 1.5,  z: -13.0 },
      'san-khau-ngoai-troi':  { x: -4.5,  y: 3.5,  z: -19.5 },
      'bia-tuong-niem':       { x: -17.0, y: 2.2,  z: -20.0 },
      'bia-di-tich':          { x: -9.0,  y: 3.2,  z: -1.0 },
      'mieu-bach-ma':         { x: -17.0, y: 2.5,  z: -5.0 },
      'ban-than-nong':        { x: -17.0, y: 2.2,  z: -10.0 },
      'mieu-ho':              { x: -23.5, y: 2.5,  z: -10.0 },
      'mieu-ba-ngu-hanh':     { x: -17.0, y: 2.5,  z: -15.0 },
      'cot-co':               { x: -9.0,  y: 4.5,  z: -10.0 },
      'nha-tho-bac-ho':       { x: 18.5,  y: 3.8,  z: -27.5 },
      'nha-bep':              { x: 23.0,  y: 3.0,  z: -21.0 },
      'wc':                   { x: 28.0,  y: 3.0,  z: -21.0 },
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

    // Smooth camera transition if active
    if (this.transitionTargetCam && this.transitionTargetLookAt) {
      this.camera.position.lerp(this.transitionTargetCam, 0.05);
      this.controls.target.lerp(this.transitionTargetLookAt, 0.05);
      this.controls.update();

      if (this.camera.position.distanceTo(this.transitionTargetCam) < 0.05 &&
          this.controls.target.distanceTo(this.transitionTargetLookAt) < 0.05) {
        this.camera.position.copy(this.transitionTargetCam);
        this.controls.target.copy(this.transitionTargetLookAt);
        this.controls.update();
        this.transitionTargetCam = null;
        this.transitionTargetLookAt = null;
      }
    } else {
      this.controls.update();
    }
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

  buildFlagpole() {
    this.loadGLBModel('models/Cot_co_Viet_Nam.glb', -9.0, 0, -10.0, 0, 1.0);
  },

  buildNhaThoBacHo() {
    const C = this.COLORS;
    const x = 18.5, z = -27.5, w = 5.0, d = 5.0, h = 3.0; // Aligned flush to the kitchen left edge
    
    // Foundation
    this.scene.add(this.createBox(w + 0.4, 0.3, d + 0.4, C.stoneGray, x, 0.15, z));
    
    // Walls
    // Back wall (solid, at z - d/2)
    this.scene.add(this.createBox(w, h, 0.15, C.wallYellow, x, h/2 + 0.3, z - d/2));
    // Left wall (solid, at x - w/2)
    this.scene.add(this.createBox(0.15, h, d, C.wallYellow, x - w/2, h/2 + 0.3, z));
    // Right wall (solid, at x + w/2)
    this.scene.add(this.createBox(0.15, h, d, C.wallYellow, x + w/2, h/2 + 0.3, z));
    
    // Front wall facing courtyard (at z + d/2 = -25.0) - split for door
    this.scene.add(this.createBox(1.9, h, 0.15, C.wallYellow, x - 1.55, h/2 + 0.3, z + d/2));
    this.scene.add(this.createBox(1.9, h, 0.15, C.wallYellow, x + 1.55, h/2 + 0.3, z + d/2));
    this.scene.add(this.createBox(1.2, 1.0, 0.15, C.wallYellow, x, 2.5 + 0.3, z + d/2));
    
    // Doorway (facing the courtyard on the front +z side)
    this.scene.add(this.createBox(1.2, 2.0, 0.2, C.woodBrown, x, 1.0 + 0.3, z + d/2));
    
    // Roof
    const roof = this.createRoof(w, d, 1.5, 0.4, C.roofRed, x, h + 0.3, z);
    this.scene.add(roof);
  },

  buildNhaBepVaWC() {
    this.loadGLBModel('models/Toa_nha_bep_va_toa_WC.glb', 25.5, 0, -21.0, -Math.PI / 2, 1.0);
  },

  focusOnArea(areaId) {
    const focusPositions = {
      'cong-tam-quan':        { cam: { x: -24.0, y: 7.0,  z: 14.0 },  lookAt: { x: -24.0, y: 2.0,  z: 5.5 } },
      'cong-nho':             { cam: { x: 14.0,  y: 5.0,  z: 13.0 },  lookAt: { x: 14.0,  y: 1.5,  z: 5.5 } },
      'nha-vo-ca':            { cam: { x: -4.5,  y: 6.0,  z: -2.0 },   lookAt: { x: -4.5,  y: 2.0,  z: -10.0 } },
      'vo-qui':               { cam: { x: 0.5,   y: 6.0,  z: -2.0 },   lookAt: { x: 0.5,   y: 2.0,  z: -10.0 } },
      'chanh-dien':           { cam: { x: 6.5,   y: 7.5,  z: -2.0 },   lookAt: { x: 6.5,   y: 2.5,  z: -10.0 } },
      'tien-dien':            { cam: { x: 13.0,  y: 6.0,  z: -2.0 },   lookAt: { x: 13.0,  y: 2.0,  z: -10.0 } },
      'ho-thuy-ta':           { cam: { x: -18.5, y: 5.0,  z: -13.0 },  lookAt: { x: -25.0, y: 1.0,  z: -13.0 } },
      'san-khau-ngoai-troi':  { cam: { x: -4.5,  y: 5.0,  z: -13.0 },  lookAt: { x: -4.5,  y: 1.5,  z: -19.5 } },
      'bia-tuong-niem':       { cam: { x: -11.5, y: 4.5,  z: -20.0 },  lookAt: { x: -17.0, y: 1.5,  z: -20.0 } },
      'bia-di-tich':          { cam: { x: -9.0,  y: 4.5,  z: 5.0 },   lookAt: { x: -9.0,  y: 1.5,  z: -1.0 } },
      'mieu-bach-ma':         { cam: { x: -11.5, y: 5.0,  z: -5.0 },   lookAt: { x: -17.0, y: 1.5,  z: -5.0 } },
      'ban-than-nong':        { cam: { x: -11.5, y: 5.0,  z: -10.0 },  lookAt: { x: -17.0, y: 1.5,  z: -10.0 } },
      'mieu-ho':              { cam: { x: -18.0, y: 5.0,  z: -10.0 },  lookAt: { x: -23.5, y: 1.5,  z: -10.0 } },
      'mieu-ba-ngu-hanh':     { cam: { x: -11.5, y: 5.0,  z: -15.0 },  lookAt: { x: -17.0, y: 1.5,  z: -15.0 } },
      'cot-co':               { cam: { x: -9.0,  y: 6.0,  z: -3.0 },   lookAt: { x: -9.0,  y: 2.0,  z: -10.0 } },
      'nha-tho-bac-ho':       { cam: { x: 18.5,  y: 5.5,  z: -21.0 },  lookAt: { x: 18.5,  y: 1.5,  z: -27.5 } },
      'nha-bep':              { cam: { x: 17.0,  y: 5.0,  z: -21.0 },  lookAt: { x: 23.0,  y: 1.5,  z: -21.0 } },
      'wc':                   { cam: { x: 22.0,  y: 5.0,  z: -21.0 },  lookAt: { x: 28.0,  y: 1.5,  z: -21.0 } }
    };

    const cfg = focusPositions[areaId];
    if (cfg) {
      this.transitionTargetCam = new THREE.Vector3(cfg.cam.x, cfg.cam.y, cfg.cam.z);
      this.transitionTargetLookAt = new THREE.Vector3(cfg.lookAt.x, cfg.lookAt.y, cfg.lookAt.z);
    }
  },

  resetCamera() {
    this.transitionTargetLookAt = new THREE.Vector3(0, 1, -8);
    this.transitionTargetCam = new THREE.Vector3(0, 32, 28);
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
