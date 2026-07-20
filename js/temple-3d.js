import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

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
  isPaused: false,
  interactableObjects: [],
  transitionTargetCam: null,
  transitionTargetLookAt: null,
  _scratchVec3: new THREE.Vector3(),
  _lastMouseMove: 0,
  // Loading progress tracking
  totalModels: 15,
  loadedModels_count: 0,
  _gltfLoader: null,
  targetDistance: null,

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
    this.scene.background = new THREE.Color(0xBCE3F7); // Soft light sky blue background
    this.scene.fog = new THREE.FogExp2(0xBCE3F7, isMobile ? 0.006 : 0.003);

    // Camera - aligned front-to-back, responsive default zoom (zoomed out on mobile/desktop to fit entire compound)
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
    this.camera.position.set(-30, isMobile ? 80 : 55, -12.5);
    this.camera.lookAt(0, 0.5, -9.75);

    // Renderer — cap DPR on mobile to avoid rendering 9x pixels on 3x screens
    const mobileDPR = Math.min(window.devicePixelRatio, 1.5);
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isMobile, // Disable AA on mobile for performance
      alpha: true,
      powerPreference: 'high-performance',
      precision: isMobile ? 'mediump' : 'highp' // Lower precision on mobile to save GPU memory
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(isMobile ? mobileDPR : window.devicePixelRatio);
    this.renderer.shadowMap.enabled = !isMobile; // Disable shadows entirely on mobile
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    // Setup shared GLTFLoader with Draco decoder
    this._gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    dracoLoader.preload();
    this._gltfLoader.setDRACOLoader(dracoLoader);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enableZoom = false; // Disable default instant zoom to allow custom smooth manual zoom control
    this.controls.enableRotate = true;
    this.controls.enablePan = false; // Prevent panning to keep rotation perfectly centered on the temple courtyard
    this.controls.zoomToCursor = true; // Zoom to pointer location
    this.controls.target.set(0, 0.5, -9.75); // Centered in the middle of the fenced compound
    this.controls.update();

    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI / 2.15;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 150;
    this.controls.zoomSpeed = 0.85;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.5;

    // Enable controls immediately on all devices
    this.controls.enabled = true;

    this.controls.domElement.style.touchAction = 'none';

    this.lastInteractionTime = Date.now();

    const resetIdleTimer = () => {
      this.lastInteractionTime = Date.now();
      if (this.controls.autoRotate) {
        this.controls.autoRotate = false;
      }
    };

    this.unlockControls = () => {};

    this.controls.addEventListener('start', () => {
      this.transitionTargetCam = null;
      this.transitionTargetLookAt = null;
      resetIdleTimer();
    });
    this.controls.addEventListener('change', resetIdleTimer);

    // Mouse, touch and wheel interaction listeners on the container to reset idle timer
    this.container.addEventListener('mousedown', resetIdleTimer);
    this.container.addEventListener('mousemove', resetIdleTimer, { passive: true });
    this.container.addEventListener('touchstart', resetIdleTimer, { passive: true });
    this.container.addEventListener('touchmove', resetIdleTimer, { passive: true });
    this.container.addEventListener('wheel', resetIdleTimer, { passive: true });

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

    // Track pinch gesture distance on mobile
    this._lastTouchDist = null;

    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this._lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: true });

    this.container.addEventListener('touchend', () => {
      this._lastTouchDist = null;
    }, { passive: true });

    // Prevent page scroll and execute custom smooth mouse wheel zoom
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const dir = this._scratchVec3.copy(this.camera.position).sub(this.controls.target);
      const dist = dir.length();
      if (this.targetDistance === null) this.targetDistance = dist;
      
      // Calculate new target distance (increment/decrement by 10%)
      const zoomFactor = 1.12;
      if (e.deltaY > 0) {
        // Zoom out
        this.targetDistance = Math.min(this.controls.maxDistance - 0.1, this.targetDistance * zoomFactor);
      } else {
        // Zoom in
        this.targetDistance = Math.max(this.controls.minDistance + 0.1, this.targetDistance / zoomFactor);
      }
      
      // Raycast to find the point under the mouse to shift the orbit target towards it
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.interactableObjects, true);
      const valid = intersects.find(i => i.object.isMesh && i.object.name !== 'sky' && i.object.name !== 'grid');
      if (valid) {
        // Nudge target towards the intersection point by 6% per wheel tick
        this.controls.target.lerp(valid.point, 0.06);
      }
    }, { passive: false });

    // Custom smooth touch pinch-zoom for mobile
    this.container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        
        // Calculate pinch center
        const clientX = (t1.clientX + t2.clientX) / 2;
        const clientY = (t1.clientY + t2.clientY) / 2;
        
        // Calculate current touch distance
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const touchDist = Math.sqrt(dx * dx + dy * dy);
        
        if (this._lastTouchDist) {
          const ratio = touchDist / this._lastTouchDist;
          if (ratio !== 1 && Math.abs(ratio - 1) > 0.01) {
            const dir = this._scratchVec3.copy(this.camera.position).sub(this.controls.target);
            const dist = dir.length();
            if (this.targetDistance === null) this.targetDistance = dist;
            
            // Adjust target distance based on touch pinch ratio
            this.targetDistance = Math.max(this.controls.minDistance + 0.1, Math.min(this.controls.maxDistance - 0.1, this.targetDistance / ratio));
          }
        }
        this._lastTouchDist = touchDist;

        // Shift orbit target towards touch center point
        const rect = this.renderer.domElement.getBoundingClientRect();
        const touchX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const touchY = -((clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(new THREE.Vector2(touchX, touchY), this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactableObjects, true);
        const valid = intersects.find(i => i.object.isMesh && i.object.name !== 'sky' && i.object.name !== 'grid');
        if (valid) {
          // Nudge target towards the pinch center by 4%
          this.controls.target.lerp(valid.point, 0.04);
        }
      }
    }, { passive: true });

    // Control buttons — dolly toward/away from the controls target safely and gradually
    document.getElementById('model-zoom-in')?.addEventListener('click', () => {
      const dir = this._scratchVec3.copy(this.camera.position).sub(this.controls.target);
      const dist = dir.length();
      if (dist < 0.1) return;
      
      if (this.targetDistance === null) this.targetDistance = dist;
      this.targetDistance = Math.max(this.controls.minDistance + 0.1, this.targetDistance * 0.80);
    });
    document.getElementById('model-zoom-out')?.addEventListener('click', () => {
      const dir = this._scratchVec3.copy(this.camera.position).sub(this.controls.target);
      const dist = dir.length();
      if (dist < 0.1) return;
      
      if (this.targetDistance === null) this.targetDistance = dist;
      this.targetDistance = Math.min(this.controls.maxDistance - 0.1, this.targetDistance * 1.20);
    });
    document.getElementById('model-reset')?.addEventListener('click', () => {
      this.targetDistance = null; // Clear animate zoom
      const isMob = window.innerWidth < 768;
      this.camera.position.set(-30, isMob ? 80 : 55, -12.5);
      this.controls.target.set(0, 0.5, -9.75);
      this.controls.update();
    });

    this.isInitialized = true;

    // Start animation
    this.animate();
  },

  addLighting() {
    // Ambient light - warm (stronger on mobile to compensate for no shadows)
    const ambient = new THREE.AmbientLight(0xFFF0D0, isMobile ? 0.8 : 0.5);
    this.scene.add(ambient);

    // Main directional light (sun)
    const sun = new THREE.DirectionalLight(0xFFF5E0, 1.2);
    sun.position.set(20, 30, 15);
    sun.castShadow = !isMobile; // No shadow casting on mobile
    if (!isMobile) {
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      sun.shadow.camera.left = -30;
      sun.shadow.camera.right = 30;
      sun.shadow.camera.top = 30;
      sun.shadow.camera.bottom = -30;
    }
    this.scene.add(sun);

    // Fill light (skip on mobile to reduce draw calls)
    if (!isMobile) {
      const fill = new THREE.DirectionalLight(0xB0D0FF, 0.3);
      fill.position.set(-10, 15, -10);
      this.scene.add(fill);

      // Rim light
      const rim = new THREE.DirectionalLight(0xFFE0A0, 0.4);
      rim.position.set(-15, 10, 20);
      this.scene.add(rim);
    }

    // Hemisphere light
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x8B7B60, isMobile ? 0.5 : 0.3);
    this.scene.add(hemi);
  },

  updateLoadingProgress() {
    this.loadedModels_count++;
    
    const bar = document.getElementById('temple-loading-bar');
    const percent = document.getElementById('temple-loading-percent');
    if (bar || percent) {
      const pct = Math.min(100, Math.round((this.loadedModels_count / this.totalModels) * 100));
      if (bar) bar.style.width = pct + '%';
      if (percent) percent.textContent = pct;
    }

    if (this.loadedModels_count >= this.totalModels) {
      const overlay = document.getElementById('temple-loading-overlay');
      if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.classList.add('hidden');
        }, 500);
      }
    }
  },

  loadGLBModel(path, x, y, z, rotY = 0, scale = 1, onLoaded = null) {
    const loader = this._gltfLoader || new GLTFLoader();
    loader.load(
      `${path}?v=3.47.17`,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(x, y, z);
        model.rotation.y = rotY;
        model.scale.set(scale, scale, scale);
        
        const modelName = path.split('/').pop().replace('.glb', '');
        
        // Max anisotropy for sharp textures at oblique angles
        const maxAniso = this.renderer ? this.renderer.capabilities.getMaxAnisotropy() : 4;

        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = !isMobile; // Skip shadow casting on mobile
            node.receiveShadow = !isMobile;
            
            // Texture processing (anisotropy on desktop, downscale VRAM on mobile)
            if (node.material) {
              const mats = Array.isArray(node.material) ? node.material : [node.material];
              mats.forEach(mat => {
                if (!isMobile) {
                  if (mat.map) { mat.map.anisotropy = maxAniso; mat.map.needsUpdate = true; }
                  if (mat.normalMap) { mat.normalMap.anisotropy = maxAniso; mat.normalMap.needsUpdate = true; }
                  if (mat.roughnessMap) { mat.roughnessMap.anisotropy = maxAniso; }
                  if (mat.metalnessMap) { mat.metalnessMap.anisotropy = maxAniso; }
                } else {
                  // Downscale textures on mobile to save VRAM and prevent iOS WebKit crash
                  const maps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];
                  maps.forEach(mapKey => {
                    if (mat[mapKey] && mat[mapKey].image) {
                      this.downscaleTexture(mat[mapKey], 512);
                    }
                  });
                }
              });
            }
            
            // Hide fence attachments inside Cong_nho_ben_phai GLB
            if (modelName === 'Cong_nho_ben_phai') {
              if (node.name && typeof node.name === 'string') {
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

            // Hide excess ground/foundation attachments inside Toa_nha_bep_va_toa_WC GLB
            if (modelName === 'Toa_nha_bep_va_toa_WC') {
              if (node.name && typeof node.name === 'string') {
                const nameLower = node.name.toLowerCase();
                if (
                  nameLower.includes('ground') || 
                  nameLower.includes('floor') || 
                  nameLower.includes('pave') || 
                  nameLower.includes('dat') || 
                  nameLower.includes('nen') || 
                  nameLower.includes('base') || 
                  nameLower.includes('plane') || 
                  nameLower.includes('san') || 
                  nameLower.includes('foundation') ||
                  nameLower.includes('slab')
                ) {
                  node.visible = false;
                }
              }
            }
          }
        });
        
        this.scene.add(model);
        this.interactableObjects.push(model);
        
        // Expose to window for easy debugging/positioning
        if (!window.loadedModels) window.loadedModels = {};
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
              'Mieu_tho_Than_Ho': { width: 1.6 },
              'Bia_ghi_nhan_di_tich': { height: 2.4 },
              'Cot_co_Viet_Nam': { height: 6.4 },
              'Toa_nha_bep_va_toa_WC': { width: 9.0 },
              'Nha_tho_Bac_Ho': { width: 7.5 },
              'Vo_Ca_Vo_Qui_Chanh_Dien': { width: 17.0 },
              'Tien_Dien': { height: 6.5 }
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
        this.updateLoadingProgress();
      },
      undefined,
      (error) => {
        console.error('Error loading GLB model:', path, error);
        if (onLoaded) onLoaded(null);
        this.updateLoadingProgress(); // Still count failed loads for progress
      }
    );
  },

  downscaleTexture(texture, maxSize) {
    try {
      const image = texture.image;
      if (!image || !image.width || !image.height) return;
      if (image.width <= maxSize && image.height <= maxSize) return;

      let w = image.width;
      let h = image.height;
      if (w > h) {
        if (w > maxSize) {
          h = Math.round(h * maxSize / w);
          w = maxSize;
        }
      } else {
        if (h > maxSize) {
          w = Math.round(w * maxSize / h);
          h = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, w, h);

      texture.image = canvas;
      texture.needsUpdate = true;
    } catch (e) {
      console.warn("Failed to downscale texture:", e);
    }
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
    mesh.castShadow = !isMobile;
    mesh.receiveShadow = !isMobile;
    return mesh;
  },

  createCylinder(rTop, rBot, h, color, x, y, z, segments = 12) {
    const geo = new THREE.CylinderGeometry(rTop, rBot, h, isMobile ? 6 : segments);
    const mesh = new THREE.Mesh(geo, this.mat(color, { roughness: 0.5 }));
    mesh.position.set(x, y, z);
    mesh.castShadow = !isMobile;
    mesh.receiveShadow = !isMobile;
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
    this.interactableObjects = [];

    // === GROUND ===
    // Courtyard paving (within the compound, tailored to fit the non-rectangular left fence wall and the Uncle Ho Temple recess)
    const courtShape = new THREE.Shape();
    courtShape.moveTo(30.0, -5.5);
    courtShape.lineTo(30.0, 25.0);
    courtShape.lineTo(21.0, 25.0);
    courtShape.lineTo(21.0, 30.0);
    courtShape.lineTo(16.0, 30.0);
    courtShape.lineTo(16.0, 25.0);
    courtShape.lineTo(-30.0, 25.0);
    courtShape.lineTo(-30.0, 6.5);
    courtShape.lineTo(-26.5, 0.5);
    courtShape.lineTo(-26.5, -5.5);
    courtShape.closePath();

    // Extrude the shape downward to make a solid 3D base (plinth) representing only the temple courtyard area
    const extrudeSettings = {
      depth: 0.25,
      bevelEnabled: false
    };
    const courtGeo = new THREE.ExtrudeGeometry(courtShape, extrudeSettings);
    const courtMat = this.mat(C.groundPave, { roughness: 0.85 });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.01, 0); // Flush top surface at y=0.01
    court.receiveShadow = true;
    court.castShadow = true;
    this.scene.add(court);
    this.interactableObjects.push(court);

    // === SURROUNDING WALL / FENCE (procedural - instant) ===
    this.buildFence();

    // === Procedural elements (instant) ===
    this.buildCourtyard();
    this.addMonuments();
    this.addTrees();

    // Sort models by size & importance to load central structural components first
    const allModels = [
      ['models/Vo_Ca_Vo_Qui_Chanh_Dien.glb', 1.5, 0, -10.0, Math.PI, 1.0],        // 740KB - Central/Main temple
      ['models/Cot_co_Viet_Nam.glb', -9.0, 0, -10.0, 0, 1.0],                       // 560KB - Flag pole
      ['models/Nha_tho_Bac_Ho.glb', 18.5, 0, -27.5, -Math.PI / 2, 1.0],             // 620KB - Ho Chi Minh shrine
      ['models/Cong_Tam_Quan.glb', -24.0, 0, 5.5, 0, 1.0],                          // 2.6MB - Front gate
      ['models/Tien_Dien.glb', 11.5, 0, -10.0, 0, 1.0],                             // 5.3MB - Front hall
      ['models/Bia_ghi_nhan_di_tich.glb', -9.0, 0, -1.0, 0, 1.0],                   // 2.1MB - Monument tablet
      ['models/Ban_Than_Nong.glb', -15.0, 0, -10.0, Math.PI / 2, 1.0],              // 3.1MB - Than Nong altar
      ['models/Mieu_Ba_Ngu_Hanh.glb', -15.0, 0, -15.0, Math.PI / 2, 1.0],           // 3.1MB - Ba Ngu Hanh temple
      ['models/Mieu_tho_Than_Ho.glb', -21.5, 0, -10.0, -Math.PI / 2, 1.0],          // 3.2MB - Tiger temple
      ['models/Mieu_Bach_Ma.glb', -15.0, 0, -5.0, Math.PI / 2, 1.0],               // 3.2MB - White Horse temple
      ['models/Bia_ghi_cong.glb', -15.0, 0, -20.0, Math.PI / 2, 1.0],              // 3.3MB - Memorial stele
      ['models/Ho_Thuy_Ta.glb', -26.5, 0, -13.0, Math.PI / 2, 1.0],                 // 2MB - Pond house (secondary)
      ['models/San_khau.glb', -4.5, 0, -19.5, 0, 1.0],                              // 1.3MB - Stage (secondary)
      ['models/Cong_nho_ben_phai.glb', 14.0, 0, 5.5, 0, 1.0],                       // 1.5MB - Side gate (secondary)
      ['models/Toa_nha_bep_va_toa_WC.glb', 24.5, 0, -19.5, -Math.PI / 2, 1.0],     // 2.1MB - Kitchen & WC (secondary)
    ];

    // Store models array on instance
    this.allModels = allModels;

    // Detect if inside in-app browser (Zalo, Messenger, Facebook, Instagram webviews)
    const isInAppBrowser = /Zalo|FBAN|FBAV|Messenger|Instagram/i.test(navigator.userAgent);

    let modelsToLoad = [];
    if (isMobile) {
      // Mobile (Safari, Chrome, and Zalo/Messenger WebView):
      // Load all models EXCEPT the 5 models requested to be hidden to prevent OOM.
      modelsToLoad = allModels.filter(m => {
        const path = m[0];
        return !path.includes('Ho_Thuy_Ta') &&
               !path.includes('San_khau') &&
               !path.includes('Toa_nha_bep_va_toa_WC') &&
               !path.includes('Cong_nho_ben_phai') &&
               !path.includes('Cot_co_Viet_Nam');
      });
    } else {
      modelsToLoad = allModels;
    }

    this.totalModels = modelsToLoad.length;
    this.loadedModels_count = 0;

    // Reset overlay elements if they exist
    const bar = document.getElementById('temple-loading-bar');
    const percent = document.getElementById('temple-loading-percent');
    const overlay = document.getElementById('temple-loading-overlay');
    if (bar) bar.style.width = '0%';
    if (percent) percent.textContent = '0';
    if (overlay) {
      overlay.style.opacity = '1';
      overlay.classList.remove('hidden');
    }

    // Queue loader (concurrency-limited)
    // Mobile WebViews are very fragile, so load 1 at a time; Desktop can handle 3 in parallel
    const concurrency = isMobile ? 1 : 3;
    let running = 0;
    let idx = 0;

    const loadNext = () => {
      if (idx >= modelsToLoad.length && running === 0) {
        return;
      }
      while (running < concurrency && idx < modelsToLoad.length) {
        const m = modelsToLoad[idx++];
        running++;
        this.loadGLBModel(m[0], m[1], m[2], m[3], m[4], m[5], () => {
          running--;
          loadNext();
        });
      }
    };
    loadNext();

    // Show/Hide webview escape button
    const btn = document.getElementById('btn-escape-webview');
    if (btn) {
      if (isMobile && isInAppBrowser) {
        btn.classList.remove('hidden');
        btn.addEventListener('click', () => {
          const url = window.location.href;
          const isAndroid = /Android/i.test(navigator.userAgent);
          
          if (isAndroid) {
            window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
          } else {
            this.showEscapeOverlay();
          }
        });
      } else {
        btn.classList.add('hidden');
      }
    }
  },

  showEscapeOverlay() {
    // Prevent duplicate overlays
    if (document.getElementById('escape-guide-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'escape-guide-overlay';
    overlay.className = 'escape-overlay';
    
    const isZalo = /Zalo/i.test(navigator.userAgent);
    const instructionText = isZalo 
      ? 'Vui lòng nhấn biểu tượng <b>ba dấu chấm (...)</b> ở góc trên cùng bên phải màn hình, chọn <b>"Mở bằng trình duyệt Safari/Chrome"</b> để hiển thị đầy đủ bản đồ 3D.'
      : 'Vui lòng nhấn biểu tượng <b>ba dấu chấm (...)</b> hoặc <b>biểu tượng chia sẻ</b>, chọn <b>"Mở bằng trình duyệt"</b> (Open in Browser) để hiển thị đầy đủ bản đồ 3D.';

    overlay.innerHTML = `
      <div class="escape-overlay-inner">
        <div class="escape-arrow">↑</div>
        <div class="escape-title">MỞ BẰNG TRÌNH DUYỆT NGOÀI</div>
        <div class="escape-step">${instructionText}</div>
        <button class="escape-close-btn">Đóng hướng dẫn</button>
      </div>
    `;

    overlay.querySelector('.escape-close-btn').addEventListener('click', () => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    });

    document.body.appendChild(overlay);
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
    // Small segment between Uncle Ho Temple recess and kitchen: from x = 21.0 to x = 24.0
    this.scene.add(this.createBox(3.0, fenceH, wallThick, C.fenceYellow, 22.5, fenceH/2, -25.0));
    // Back wall segment right part: from x = 24.0 to x = 30 (shortened to prevent protruding next to kitchen)
    this.scene.add(this.createBox(6.0, fenceH, wallThick, C.fenceYellow, 27.0, fenceH/2, -25.0));
    
    // Uncle Ho Temple area - no fence per user request
    
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

    // Decorative metal fence bars along front walls (using InstancedMesh to merge draw calls)
    const barGeo = new THREE.BoxGeometry(0.05, 0.9, 0.05);
    const barMat = this.mat(C.fenceBars, { metalness: 0.5 });
    
    // Count total bars
    let barCount = 0;
    const barStep = isMobile ? 1.2 : 0.6;
    for (let x = -21.0; x <= 12.0; x += barStep) barCount++;
    for (let x = 16.0; x <= 29.0; x += barStep) barCount++;
    for (let z = -24.5; z <= 5.0; z += barStep) barCount++;
    for (let z = -24.5; z <= -7.0; z += barStep) barCount++;
    
    const instancedBars = new THREE.InstancedMesh(barGeo, barMat, barCount);
    instancedBars.castShadow = !isMobile;
    instancedBars.receiveShadow = !isMobile;
    
    const dummy = new THREE.Object3D();
    let barIdx = 0;
    
    for (let x = -21.0; x <= 12.0; x += barStep) {
      dummy.position.set(x, 0.65, 5.5);
      dummy.updateMatrix();
      instancedBars.setMatrixAt(barIdx++, dummy.matrix);
    }
    for (let x = 16.0; x <= 29.0; x += barStep) {
      dummy.position.set(x, 0.65, 5.5);
      dummy.updateMatrix();
      instancedBars.setMatrixAt(barIdx++, dummy.matrix);
    }
    for (let z = -24.5; z <= 5.0; z += barStep) {
      dummy.position.set(30.0, 0.65, z);
      dummy.updateMatrix();
      instancedBars.setMatrixAt(barIdx++, dummy.matrix);
    }
    for (let z = -24.5; z <= -7.0; z += barStep) {
      dummy.position.set(-30.0, 0.65, z);
      dummy.updateMatrix();
      instancedBars.setMatrixAt(barIdx++, dummy.matrix);
    }
    
    this.scene.add(instancedBars);
  },

  buildCourtyard() {
    // Pathway from Cổng Tam Quan to the main temple courtyard (procedural - instant)
    const pathGeo = new THREE.PlaneGeometry(4, 12);
    const pathMat = this.mat(0xC0A888, { roughness: 0.9 });
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(-24.0, 0.02, -0.5);
    this.scene.add(path);
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

    // 3D positions for the 13 highlighted areas
    const hotspotPositions = {
      'cong-tam-quan':        { x: -24.0, y: 5.0,  z: 5.5 },
      'mieu-bach-ma':         { x: -15.0, y: 2.5,  z: -5.0 },
      'ban-than-nong':        { x: -15.0, y: 2.2,  z: -10.0 },
      'mieu-ho':              { x: -21.5, y: 2.5,  z: -10.0 },
      'mieu-ba-ngu-hanh':     { x: -15.0, y: 2.5,  z: -15.0 },
      'bia-tuong-niem':       { x: -15.0, y: 2.2,  z: -20.0 },
      'bia-di-tich':          { x: -9.0,  y: 3.2,  z: -1.0 },
      'nha-vo-ca':            { x: -4.5,  y: 4.5,  z: -10.0 },
      'vo-qui':               { x: 0.5,   y: 4.5,  z: -10.0 },
      'chanh-dien':           { x: 6.5,   y: 6.0,  z: -10.0 },
      'tien-dien':            { x: 13.0,  y: 4.5,  z: -10.0 },
      'nha-tho-bac-ho':       { x: 18.5,  y: 3.8,  z: -27.5 },
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
      const pinGeo = new THREE.SphereGeometry(isMobile ? 0.22 : 0.45, 16, 16);
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
      const ringGeo = new THREE.RingGeometry(isMobile ? 0.25 : 0.5, isMobile ? 0.38 : 0.7, 24);
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
    const now = Date.now();
    if (this._lastMouseMove && (now - this._lastMouseMove) < 32) return;
    this._lastMouseMove = now;

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
    this.renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio);
    this.renderer.setSize(w, h);
  },

  animate() {
    if (this.isPaused) return;
    this.animationId = requestAnimationFrame(() => this.animate());

    // Throttle to ~30fps on mobile to reduce GPU load
    if (isMobile) {
      const now = performance.now();
      if (this._lastFrameTime && (now - this._lastFrameTime) < 30) return; // ~33ms = 30fps
      this._lastFrameTime = now;
    }
    
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
      // Smooth zoom distance transitions (buttons)
      if (this.targetDistance !== null) {
        const dir = this.camera.position.clone().sub(this.controls.target);
        const dist = dir.length();
        const newDist = THREE.MathUtils.lerp(dist, this.targetDistance, 0.12);
        
        if (Math.abs(newDist - this.targetDistance) < 0.05) {
          dir.setLength(this.targetDistance);
          this.targetDistance = null;
        } else {
          dir.setLength(newDist);
        }
        this.camera.position.copy(this.controls.target).add(dir);
      }

      if (Date.now() - this.lastInteractionTime > 10000) {
        this.controls.autoRotate = true;
      }
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
      labels[i].title = h.area[lang]?.name || '';
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


  focusOnArea(areaId) {
    const focusPositions = {
      'cong-tam-quan':        { cam: { x: -24.0, y: 7.0,  z: 14.0 },  lookAt: { x: -24.0, y: 2.0,  z: 5.5 } },
      'cong-nho':             { cam: { x: 14.0,  y: 5.0,  z: 13.0 },  lookAt: { x: 14.0,  y: 1.5,  z: 5.5 } },
      'nha-vo-ca':            { cam: { x: -4.5,  y: 6.0,  z: -2.0 },   lookAt: { x: -4.5,  y: 2.0,  z: -10.0 } },
      'vo-qui':               { cam: { x: 0.5,   y: 6.0,  z: -2.0 },   lookAt: { x: 0.5,   y: 2.0,  z: -10.0 } },
      'chanh-dien':           { cam: { x: 6.5,   y: 7.5,  z: -2.0 },   lookAt: { x: 6.5,   y: 2.5,  z: -10.0 } },
      'tien-dien':            { cam: { x: 13.0,  y: 6.0,  z: -2.0 },   lookAt: { x: 13.0,  y: 2.0,  z: -10.0 } },
      'ho-thuy-ta':           { cam: { x: -20.0, y: 5.0,  z: -13.0 },  lookAt: { x: -26.5, y: 1.0,  z: -13.0 } },
      'bia-tuong-niem':       { cam: { x: -9.5,  y: 4.5,  z: -20.0 },  lookAt: { x: -15.0, y: 1.5,  z: -20.0 } },
      'bia-di-tich':          { cam: { x: -9.0,  y: 4.5,  z: 5.0 },   lookAt: { x: -9.0,  y: 1.5,  z: -1.0 } },
      'mieu-bach-ma':         { cam: { x: -9.5,  y: 5.0,  z: -5.0 },   lookAt: { x: -15.0, y: 1.5,  z: -5.0 } },
      'ban-than-nong':        { cam: { x: -9.5,  y: 5.0,  z: -10.0 },  lookAt: { x: -15.0, y: 1.5,  z: -10.0 } },
      'mieu-ho':              { cam: { x: -16.0, y: 5.0,  z: -10.0 },  lookAt: { x: -21.5, y: 1.5,  z: -10.0 } },
      'mieu-ba-ngu-hanh':     { cam: { x: -9.5,  y: 5.0,  z: -15.0 },  lookAt: { x: -15.0, y: 1.5,  z: -15.0 } },
      'cot-co':               { cam: { x: -9.0,  y: 6.0,  z: -3.0 },   lookAt: { x: -9.0,  y: 2.0,  z: -10.0 } },
      'nha-tho-bac-ho':       { cam: { x: 18.5,  y: 5.5,  z: -21.0 },  lookAt: { x: 18.5,  y: 1.5,  z: -27.5 } },
      'nha-bep':              { cam: { x: 16.0,  y: 5.0,  z: -19.5 },  lookAt: { x: 22.0,  y: 1.5,  z: -19.5 } },
      'wc':                   { cam: { x: 21.0,  y: 5.0,  z: -19.5 },  lookAt: { x: 27.0,  y: 1.5,  z: -19.5 } }
    };

    if (typeof this.unlockControls === 'function') {
      this.unlockControls();
    }
    const cfg = focusPositions[areaId];
    if (cfg) {
      this.transitionTargetCam = new THREE.Vector3(cfg.cam.x, cfg.cam.y, cfg.cam.z);
      this.transitionTargetLookAt = new THREE.Vector3(cfg.lookAt.x, cfg.lookAt.y, cfg.lookAt.z);
    }
  },

  resetCamera() {
    const isMob = window.innerWidth < 768;
    this.transitionTargetLookAt = new THREE.Vector3(0, 0.5, -9.75);
    this.transitionTargetCam = new THREE.Vector3(-30, isMob ? 80 : 55, -12.5);
  },

  pause() {
    this.isPaused = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  },

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    if (!this.animationId) {
      this.animate();
    }
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

// Lazy-initialize 3D scene and play/pause animation loop using IntersectionObserver —
// only loads Three.js scene + all GLB models when the user scrolls near the 3D section,
// and pauses rendering when the user scrolls away to save CPU/GPU resource.
(function() {
  function initWhenReady() {
    var container = document.getElementById('temple-3d-container');
    if (!container) return;
    var section = container.closest('section') || container;
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          if (!Temple3D.isInitialized) {
            Temple3D.init('temple-3d-container');
          } else {
            Temple3D.resume();
          }
        } else {
          if (Temple3D.isInitialized) {
            Temple3D.pause();
          }
        }
      });
    }, { rootMargin: '150px' }); // Start loading/playing 150px before entering viewport
    observer.observe(section);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady);
  } else {
    initWhenReady();
  }
})();
