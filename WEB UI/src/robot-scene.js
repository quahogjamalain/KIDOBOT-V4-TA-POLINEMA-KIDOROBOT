import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DIRECTIONS } from "./simulator.js";

const CAMERA_HOME = new THREE.Vector3(7.2, 7.4, -9.2);

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function tween(duration, onUpdate) {
  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      onUpdate(easeInOutCubic(progress));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

function createTextSprite(text, colour = "#b7cdf2") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "800 42px Nunito, Arial, sans-serif";
  context.shadowColor = "rgba(0, 0, 0, 0.65)";
  context.shadowBlur = 10;
  context.fillStyle = colour;
  context.fillText(text, 128, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.95, 0.48, 1);
  sprite.renderOrder = 20;
  return sprite;
}

export class RobotScene {
  constructor(container, { cols = 8, rows = 8, cellSize = 1, onFps } = {}) {
    this.container = container;
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.onFps = onFps;
    this.isRunning = false;
    this.eyeMaterial = null;
    this.antennaMaterial = null;
    this._frameCount = 0;
    this._fpsStartedAt = performance.now();
    this._clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x07162b, 0.026);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.copy(CAMERA_HOME);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = false;
    this.controls.minDistance = 5.2;
    this.controls.maxDistance = 18;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.set(0, 0.25, 0);
    this.controls.update();

    this._addLights();
    this._createArena();
    this._createRobot();
    this._createDust();

    this._resizeObserver = new ResizeObserver(() => this.resize());
    this._resizeObserver.observe(this.container);
    this._onWindowResize = () => this.resize();
    window.addEventListener("resize", this._onWindowResize);

    this.resize();
    this._animate = this._animate.bind(this);
    this._animationFrame = requestAnimationFrame(this._animate);
  }

  _addLights() {
    const hemisphere = new THREE.HemisphereLight(0xbedbff, 0x071021, 2.15);
    this.scene.add(hemisphere);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    keyLight.position.set(5.5, 9.5, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1536, 1536);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 24;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    const rimOrange = new THREE.PointLight(0xff8a3d, 24, 14, 2);
    rimOrange.position.set(-4.5, 3.4, -4.2);
    this.scene.add(rimOrange);

    const rimTeal = new THREE.PointLight(0x22d3c5, 18, 13, 2);
    rimTeal.position.set(4.8, 2.5, 4.2);
    this.scene.add(rimTeal);

    const fill = new THREE.PointLight(0x5b8cff, 12, 14, 2);
    fill.position.set(0, 4.5, -5.5);
    this.scene.add(fill);
  }

  _createArena() {
    this.arena = new THREE.Group();
    this.scene.add(this.arena);

    const boardSize = this.cols * this.cellSize;
    const baseGeometry = new RoundedBoxGeometry(boardSize + 0.46, 0.34, boardSize + 0.46, 4, 0.12);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x122747,
      roughness: 0.72,
      metalness: 0.28,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -0.18;
    base.receiveShadow = true;
    this.arena.add(base);

    const rim = new THREE.Mesh(
      new RoundedBoxGeometry(boardSize + 0.54, 0.08, boardSize + 0.54, 3, 0.05),
      new THREE.MeshStandardMaterial({
        color: 0x1c3b68,
        roughness: 0.42,
        metalness: 0.55,
        emissive: 0x0d2444,
        emissiveIntensity: 0.5,
      }),
    );
    rim.position.y = -0.08;
    rim.receiveShadow = true;
    this.arena.add(rim);

    const tileGeometry = new THREE.PlaneGeometry(this.cellSize * 0.94, this.cellSize * 0.94);
    const tileMaterialA = new THREE.MeshStandardMaterial({
      color: 0x152c51,
      roughness: 0.92,
      metalness: 0.08,
    });
    const tileMaterialB = new THREE.MeshStandardMaterial({
      color: 0x102440,
      roughness: 0.92,
      metalness: 0.08,
    });

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const tile = new THREE.Mesh(
          tileGeometry,
          (row + col) % 2 === 0 ? tileMaterialA : tileMaterialB,
        );
        const world = this.cellToWorld({ x: col, y: row });
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(world.x, 0.012, world.z);
        tile.receiveShadow = true;
        this.arena.add(tile);
      }
    }

    const grid = new THREE.GridHelper(
      boardSize,
      this.cols,
      new THREE.Color(0x557dbb),
      new THREE.Color(0x2c4f82),
    );
    grid.position.y = 0.022;
    grid.material.transparent = true;
    grid.material.opacity = 0.52;
    this.arena.add(grid);

    const half = boardSize / 2;
    const labelOffset = 0.5;
    const labels = [
      ["UTARA", 0, -half - labelOffset, "#ffb06b"],
      ["TIMUR", half + labelOffset, 0, "#8fb7ff"],
      ["SELATAN", 0, half + labelOffset, "#a8bce2"],
      ["BARAT", -half - labelOffset, 0, "#b8a9ff"],
    ];
    for (const [text, x, z, colour] of labels) {
      const label = createTextSprite(text, colour);
      label.position.set(x, 0.36, z);
      this.arena.add(label);
    }

    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3c5,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.cellHighlight = new THREE.Mesh(
      new THREE.PlaneGeometry(this.cellSize * 0.86, this.cellSize * 0.86),
      highlightMaterial,
    );
    this.cellHighlight.rotation.x = -Math.PI / 2;
    this.cellHighlight.position.y = 0.035;
    this.arena.add(this.cellHighlight);

    this.cellHighlightOutline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(this.cellSize * 0.85, this.cellSize * 0.85)),
      new THREE.LineBasicMaterial({
        color: 0x36e5d7,
        transparent: true,
        opacity: 0.52,
      }),
    );
    this.cellHighlightOutline.rotation.x = -Math.PI / 2;
    this.cellHighlightOutline.position.y = 0.046;
    this.arena.add(this.cellHighlightOutline);
  }

  _createRobot() {
    this.robot = new THREE.Group();
    this.robot.position.y = 0.04;
    this.scene.add(this.robot);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.54, 40),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.026;
    this.robot.add(shadow);

    const arrowShape = new THREE.BufferGeometry();
    arrowShape.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [0, 0, -0.45, -0.1, 0, -0.25, 0.1, 0, -0.25],
        3,
      ),
    );
    arrowShape.computeVertexNormals();
    const directionArrow = new THREE.Mesh(
      arrowShape,
      new THREE.MeshBasicMaterial({
        color: 0xffcf5c,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    directionArrow.position.y = 0.048;
    this.robot.add(directionArrow);

    this.robotVisual = new THREE.Group();
    this.robot.add(this.robotVisual);
    this._buildPlaceholderRobot(this.robotVisual);
  }

  _buildPlaceholderRobot(group) {
    const orange = new THREE.MeshStandardMaterial({
      color: 0xff8a3d,
      roughness: 0.36,
      metalness: 0.24,
    });
    const orangeDark = new THREE.MeshStandardMaterial({
      color: 0xc54f12,
      roughness: 0.46,
      metalness: 0.2,
    });
    const cream = new THREE.MeshStandardMaterial({
      color: 0xf2eee2,
      roughness: 0.58,
      metalness: 0.05,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x17253b,
      roughness: 0.5,
      metalness: 0.46,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x08111f,
      roughness: 0.95,
      metalness: 0.05,
    });
    this.eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x22d3c5,
      emissive: 0x22d3c5,
      emissiveIntensity: 2.4,
      roughness: 0.25,
      metalness: 0.1,
      toneMapped: false,
    });
    this.antennaMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcf5c,
      emissive: 0xff8a3d,
      emissiveIntensity: 2,
      roughness: 0.35,
      toneMapped: false,
    });

    const addMesh = (geometry, material, x, y, z, parent = group) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    addMesh(new RoundedBoxGeometry(0.88, 0.14, 0.7, 4, 0.07), orangeDark, 0, 0.22, 0);
    addMesh(new RoundedBoxGeometry(0.74, 0.44, 0.6, 5, 0.1), orange, 0, 0.49, 0.01);
    addMesh(new RoundedBoxGeometry(0.6, 0.16, 0.5, 4, 0.06), cream, 0, 0.73, -0.01);

    const wheelGeometry = new THREE.CylinderGeometry(0.125, 0.125, 0.1, 18);
    for (const x of [-0.47, 0.47]) {
      for (const z of [-0.22, 0.22]) {
        const wheel = addMesh(wheelGeometry, rubber, x, 0.145, z);
        wheel.rotation.z = Math.PI / 2;
      }
    }

    addMesh(new RoundedBoxGeometry(0.58, 0.36, 0.48, 5, 0.1), cream, 0, 0.98, -0.03);
    addMesh(new RoundedBoxGeometry(0.46, 0.17, 0.06, 3, 0.035), dark, 0, 1.01, -0.29);
    addMesh(new THREE.SphereGeometry(0.038, 16, 16), this.eyeMaterial, -0.115, 1.015, -0.326);
    addMesh(new THREE.SphereGeometry(0.038, 16, 16), this.eyeMaterial, 0.115, 1.015, -0.326);

    const earGeometry = new THREE.CylinderGeometry(0.065, 0.065, 0.09, 16);
    for (const x of [-0.34, 0.34]) {
      const ear = addMesh(earGeometry, orangeDark, x, 0.98, -0.02);
      ear.rotation.z = Math.PI / 2;
    }

    addMesh(new THREE.CylinderGeometry(0.018, 0.024, 0.23, 10), dark, 0, 1.25, 0.06);
    addMesh(new THREE.SphereGeometry(0.055, 16, 16), this.antennaMaterial, 0, 1.38, 0.06);

    const chestLight = addMesh(
      new THREE.SphereGeometry(0.032, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x72fff1, toneMapped: false }),
      0,
      0.51,
      -0.303,
    );
    chestLight.castShadow = false;
  }

  _createDust() {
    const count = 90;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 13;
      positions[index * 3 + 1] = 0.3 + Math.random() * 5.5;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 13;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x7fa9ff,
      size: 0.025,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.dust = new THREE.Points(geometry, material);
    this.scene.add(this.dust);
  }

  cellToWorld(position) {
    return new THREE.Vector3(
      (position.x - (this.cols - 1) / 2) * this.cellSize,
      0,
      (position.y - (this.rows - 1) / 2) * this.cellSize,
    );
  }

  setPose(position, heading, { instant = false } = {}) {
    const target = this.cellToWorld(position);
    const yaw = DIRECTIONS[heading]?.yaw ?? 0;
    this.cellHighlight.position.x = target.x;
    this.cellHighlight.position.z = target.z;
    this.cellHighlightOutline.position.x = target.x;
    this.cellHighlightOutline.position.z = target.z;

    if (instant) {
      this.robot.position.x = target.x;
      this.robot.position.z = target.z;
      this.robot.rotation.y = yaw;
      return;
    }

    this.robot.position.x = target.x;
    this.robot.position.z = target.z;
    this.robot.rotation.y = yaw;
  }

  async moveTo(position, heading, duration = 430) {
    const target = this.cellToWorld(position);
    const yaw = DIRECTIONS[heading]?.yaw ?? this.robot.rotation.y;
    const start = this.robot.position.clone();
    const startYaw = this.robot.rotation.y;
    const yawDelta = Math.atan2(Math.sin(yaw - startYaw), Math.cos(yaw - startYaw));

    this.cellHighlight.position.x = target.x;
    this.cellHighlight.position.z = target.z;
    this.cellHighlightOutline.position.x = target.x;
    this.cellHighlightOutline.position.z = target.z;

    await tween(duration, (progress) => {
      this.robot.position.x = THREE.MathUtils.lerp(start.x, target.x, progress);
      this.robot.position.z = THREE.MathUtils.lerp(start.z, target.z, progress);
      this.robot.rotation.y = startYaw + yawDelta * progress;
    });

    this.robot.position.x = target.x;
    this.robot.position.z = target.z;
    this.robot.rotation.y = yaw;
  }

  async turnTo(heading, duration = 330) {
    const targetYaw = DIRECTIONS[heading]?.yaw ?? this.robot.rotation.y;
    const startYaw = this.robot.rotation.y;
    const delta = Math.atan2(Math.sin(targetYaw - startYaw), Math.cos(targetYaw - startYaw));
    await tween(duration, (progress) => {
      this.robot.rotation.y = startYaw + delta * progress;
    });
    this.robot.rotation.y = targetYaw;
  }

  setLed(colour) {
    if (!this.eyeMaterial) return;
    this.eyeMaterial.color.set(colour);
    this.eyeMaterial.emissive.set(colour);
  }

  setRunning(running) {
    this.isRunning = running;
    if (this.eyeMaterial) this.eyeMaterial.emissiveIntensity = running ? 4 : 2.4;
  }

  bump() {
    const baseX = this.robot.position.x;
    const baseZ = this.robot.position.z;
    const start = performance.now();
    const duration = 380;
    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const strength = Math.sin(progress * Math.PI * 9) * (1 - progress) * 0.075;
      this.robot.position.x = baseX + strength;
      this.robot.position.z = baseZ + strength * 0.4;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        this.robot.position.x = baseX;
        this.robot.position.z = baseZ;
      }
    };
    requestAnimationFrame(step);
  }

  resetCamera() {
    this.camera.position.copy(CAMERA_HOME);
    this.controls.target.set(0, 0.25, 0);
    this.controls.update();
  }

  async loadRobotModel(url, { scale = 1, rotation = 0, position = { x: 0, y: 0, z: 0 } } = {}) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    const model = gltf.scene;
    model.scale.setScalar(scale);
    model.rotation.y = rotation;
    model.position.set(position.x, position.y, position.z);
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.robotVisual.clear();
    this.robotVisual.add(model);
    this.eyeMaterial = null;
    this.antennaMaterial = null;
    return gltf;
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  _animate() {
    this._animationFrame = requestAnimationFrame(this._animate);
    const elapsed = this._clock.getElapsedTime();
    const bobSpeed = this.isRunning ? 7 : 2.2;
    const bobAmount = this.isRunning ? 0.022 : 0.009;
    this.robotVisual.position.y = Math.sin(elapsed * bobSpeed) * bobAmount + 0.004;

    if (this.antennaMaterial) {
      const pulse = 1.5 + Math.sin(elapsed * (this.isRunning ? 8 : 3)) * 0.75;
      this.antennaMaterial.emissiveIntensity = pulse;
      this.antennaMaterial.emissive.setHex(this.isRunning ? 0x22d3c5 : 0xff8a3d);
    }

    if (this.dust) {
      this.dust.rotation.y = elapsed * 0.008;
      this.dust.position.y = Math.sin(elapsed * 0.35) * 0.08;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    this._frameCount += 1;
    const now = performance.now();
    if (now - this._fpsStartedAt > 800) {
      const fps = Math.round((this._frameCount * 1000) / (now - this._fpsStartedAt));
      this.onFps?.(fps);
      this._frameCount = 0;
      this._fpsStartedAt = now;
    }
  }
}
