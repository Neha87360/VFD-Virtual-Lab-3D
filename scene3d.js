/**
 * scene3d.js
 * Interactive Three.js 3D Virtual Sphere Gap Transformer Oil Testing Apparatus.
 *
 * Includes:
 * - Two polished metallic spherical electrodes with adjustable micrometer gap
 * - Transparent oil testing chamber with corner frames and level markings
 * - Dynamic insulating oil volume (color, clarity, suspended impurity particles)
 * - HV step-up transformer console, porcelain bushing, HV lead & ground strap
 * - 3D HV status beacon & live CanvasTexture digital kV display
 * - Multi-branch 3D electric breakdown spark animation & rising oil gas bubbles
 * - OrbitControls with smooth camera preset transitions
 */

(function (global) {
  'use strict';

  const CAMERA_PRESETS = {
    overview: { pos: [4.8, 3.3, 6.2], target: [0.3, 1.35, 0] },
    electrodes: { pos: [-0.7, 1.75, 2.75], target: [-0.8, 1.48, 0] },
    top: { pos: [-0.8, 5.2, 0.9], target: [-0.8, 1.45, 0] },
    console: { pos: [3.2, 2.1, 3.9], target: [2.15, 1.3, 0.1] }
  };

  class VirtualSphereGapScene {
    constructor(containerEl) {
      this.container = containerEl;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.rafId = null;

      // Apparatus state
      this.gapMm = 2.5;
      this.appliedKv = 0;
      this.breakdownKv = null;
      this.stressRatio = 0;
      this.isEnergized = false;
      this.isBreakdown = false;
      this.oilProfile = null;

      // Spark & bubble animation state
      this.sparkTimer = 0;
      this.sparkDuration = 2.0; // seconds of active spark arc
      this.sparkGroup = null;
      this.sparkLight = null;
      this.arcLines = [];
      this.bubbles = [];
      this.particlesPoints = null;
      this.particlePositions = null;

      // Dynamic 3D mesh references
      this.leftSphere = null;
      this.rightSphere = null;
      this.leftRod = null;
      this.rightRod = null;
      this.rightCollar = null;
      this.hvWireMesh = null;
      this.oilVolumeMesh = null;
      this.oilSurfaceMesh = null;
      this.beaconMesh = null;
      this.beaconLight = null;
      this.coronaLeft = null;
      this.coronaRight = null;

      // 3D digital display canvas
      this.displayCanvas = null;
      this.displayCtx = null;
      this.displayTexture = null;

      // Camera smooth transition state
      this.camAnim = null;

      // Geometry constants
      this.cellCenterX = -0.85;
      this.electrodeY = 1.52;
      this.sphereRadius = 0.36;

      this._init();
    }

    _init() {
      const width = this.container.clientWidth || 720;
      const height = this.container.clientHeight || 480;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x091120);
      this.scene.fog = new THREE.FogExp2(0x091120, 0.032);

      this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
      this.camera.position.set(...CAMERA_PRESETS.overview.pos);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputEncoding = THREE.sRGBEncoding;

      this.container.innerHTML = '';
      this.container.appendChild(this.renderer.domElement);

      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.07;
      this.controls.minDistance = 1.6;
      this.controls.maxDistance = 13.0;
      this.controls.maxPolarAngle = Math.PI * 0.49;
      this.controls.target.set(...CAMERA_PRESETS.overview.target);
      this.controls.update();

      this._buildLighting();
      this._buildLabBench();
      this._buildTestChamber();
      this._buildOilAndParticles();
      this._buildElectrodes();
      this._buildHVConsole();
      this._buildSparkSystem();
      this._buildBubbles();

      this._updateElectrodePositions();
      this._updateDisplayTexture();

      this._bindResize();
      this._animate();
    }

    _buildLighting() {
      const hemi = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.72);
      this.scene.add(hemi);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
      keyLight.position.set(5, 8, 6);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 22;
      keyLight.shadow.camera.left = -5;
      keyLight.shadow.camera.right = 5;
      keyLight.shadow.camera.top = 5;
      keyLight.shadow.camera.bottom = -5;
      this.scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
      rimLight.position.set(-6, 4, -5);
      this.scene.add(rimLight);

      const underFill = new THREE.PointLight(0x1d4ed8, 0.35, 10);
      underFill.position.set(-1, 2.6, 2.5);
      this.scene.add(underFill);
    }

    _buildLabBench() {
      // Main laboratory bench
      const benchGeo = new THREE.BoxGeometry(9.6, 0.28, 4.8);
      const benchMat = new THREE.MeshStandardMaterial({
        color: 0x162033,
        roughness: 0.55,
        metalness: 0.25
      });
      const bench = new THREE.Mesh(benchGeo, benchMat);
      bench.position.set(0.55, -0.14, 0);
      bench.receiveShadow = true;
      this.scene.add(bench);

      // Subtle engineering grid on the bench
      const grid = new THREE.GridHelper(9.4, 24, 0x1e3a5f, 0x132642);
      grid.position.set(0.55, 0.005, 0);
      this.scene.add(grid);

      // Dielectric rubber mat under test chamber
      const matGeo = new THREE.BoxGeometry(3.7, 0.05, 2.5);
      const matMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.88,
        metalness: 0.05
      });
      const rubberMat = new THREE.Mesh(matGeo, matMat);
      rubberMat.position.set(this.cellCenterX, 0.025, 0);
      rubberMat.receiveShadow = true;
      this.scene.add(rubberMat);

      // Stainless chamber mounting baseplate
      const plateGeo = new THREE.BoxGeometry(3.2, 0.12, 2.0);
      const plateMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.35,
        metalness: 0.72
      });
      const basePlate = new THREE.Mesh(plateGeo, plateMat);
      basePlate.position.set(this.cellCenterX, 0.11, 0);
      basePlate.castShadow = true;
      basePlate.receiveShadow = true;
      this.scene.add(basePlate);
    }

    _buildTestChamber() {
      const cx = this.cellCenterX;
      const cellW = 2.8;
      const cellH = 2.15;
      const cellD = 1.65;
      const baseTop = 0.17;

      // Transparent acrylic/borosilicate container walls
      const glassGeo = new THREE.BoxGeometry(cellW, cellH, cellD);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.16,
        roughness: 0.08,
        metalness: 0.05,
        reflectivity: 0.85,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const glassBox = new THREE.Mesh(glassGeo, glassMat);
      glassBox.position.set(cx, baseTop + cellH / 2, 0);
      this.scene.add(glassBox);

      // Crisp edge frame lines around glass vessel
      const edges = new THREE.EdgesGeometry(glassGeo);
      const edgeLine = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.55 })
      );
      edgeLine.position.copy(glassBox.position);
      this.scene.add(edgeLine);

      // Four metallic corner clamping pillars + top/bottom collar rails
      const pillarGeo = new THREE.CylinderGeometry(0.035, 0.035, cellH + 0.06, 12);
      const metalMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.25,
        metalness: 0.85
      });
      const offsets = [
        [-cellW / 2, -cellD / 2],
        [cellW / 2, -cellD / 2],
        [-cellW / 2, cellD / 2],
        [cellW / 2, cellD / 2]
      ];
      offsets.forEach(([ox, oz]) => {
        const pillar = new THREE.Mesh(pillarGeo, metalMat);
        pillar.position.set(cx + ox, baseTop + cellH / 2, oz);
        pillar.castShadow = true;
        this.scene.add(pillar);
      });

      // Top rim frame
      const rimGeo = new THREE.BoxGeometry(cellW + 0.12, 0.06, cellD + 0.12);
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        metalness: 0.6,
        transparent: true,
        opacity: 0.82
      });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.set(cx, baseTop + cellH + 0.02, 0);
      this.scene.add(rim);

      // Left & Right insulated feedthrough bushings on chamber walls
      const bushingGeo = new THREE.CylinderGeometry(0.14, 0.17, 0.24, 20);
      bushingGeo.rotateZ(Math.PI / 2);
      const bushingMat = new THREE.MeshStandardMaterial({
        color: 0x7c2d12, // Phenolic insulator brown
        roughness: 0.35,
        metalness: 0.15
      });

      const leftBushing = new THREE.Mesh(bushingGeo, bushingMat);
      leftBushing.position.set(cx - cellW / 2, this.electrodeY, 0);
      this.scene.add(leftBushing);

      const rightBushing = new THREE.Mesh(bushingGeo, bushingMat);
      rightBushing.position.set(cx + cellW / 2, this.electrodeY, 0);
      this.scene.add(rightBushing);

      // Graduated oil level markers on front glass
      const tickMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.65 });
      for (let i = 1; i <= 4; i++) {
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 0.01), tickMat);
        tick.position.set(cx - cellW / 2 + 0.22, baseTop + i * 0.42, cellD / 2 + 0.005);
        this.scene.add(tick);
      }
    }

    _buildOilAndParticles() {
      const cx = this.cellCenterX;
      const oilW = 2.72;
      const oilH = 1.72;
      const oilD = 1.57;
      const oilCenterY = 0.18 + oilH / 2;

      const oilGeo = new THREE.BoxGeometry(oilW, oilH, oilD);
      const oilMat = new THREE.MeshPhysicalMaterial({
        color: 0xf7cf6b,
        transparent: true,
        opacity: 0.34,
        roughness: 0.15,
        metalness: 0.02,
        depthWrite: false
      });
      this.oilVolumeMesh = new THREE.Mesh(oilGeo, oilMat);
      this.oilVolumeMesh.position.set(cx, oilCenterY, 0);
      this.scene.add(this.oilVolumeMesh);

      // Meniscus surface highlight
      const surfaceGeo = new THREE.PlaneGeometry(oilW, oilD);
      surfaceGeo.rotateX(-Math.PI / 2);
      const surfaceMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.25,
        roughness: 0.08,
        metalness: 0.2,
        side: THREE.DoubleSide
      });
      this.oilSurfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
      this.oilSurfaceMesh.position.set(cx, 0.18 + oilH + 0.002, 0);
      this.scene.add(this.oilSurfaceMesh);

      // Suspended impurity particles inside oil
      const maxParticles = 160;
      const positions = new Float32Array(maxParticles * 3);
      for (let i = 0; i < maxParticles; i++) {
        positions[i * 3] = cx + (Math.random() - 0.5) * (oilW - 0.2);
        positions[i * 3 + 1] = 0.24 + Math.random() * (oilH - 0.12);
        positions[i * 3 + 2] = (Math.random() - 0.5) * (oilD - 0.2);
      }
      this.particlePositions = positions;

      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      pGeo.setDrawRange(0, 15);

      const pMat = new THREE.PointsMaterial({
        color: 0xfff3c4,
        size: 0.032,
        transparent: true,
        opacity: 0.72
      });
      this.particlesPoints = new THREE.Points(pGeo, pMat);
      this.scene.add(this.particlesPoints);
    }

    _buildElectrodes() {
      const cx = this.cellCenterX;

      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.12,
        metalness: 0.96
      });

      const brassMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.28,
        metalness: 0.85
      });

      const sphereGeo = new THREE.SphereGeometry(this.sphereRadius, 36, 28);
      this.leftSphere = new THREE.Mesh(sphereGeo, sphereMat);
      this.leftSphere.castShadow = true;
      this.scene.add(this.leftSphere);

      this.rightSphere = new THREE.Mesh(sphereGeo, sphereMat);
      this.rightSphere.castShadow = true;
      this.scene.add(this.rightSphere);

      // Electrode mounting shafts (horizontal rods)
      const rodGeo = new THREE.CylinderGeometry(0.065, 0.065, 1.45, 20);
      rodGeo.rotateZ(Math.PI / 2);

      this.leftRod = new THREE.Mesh(rodGeo, brassMat);
      this.leftRod.position.set(cx - 1.05, this.electrodeY, 0);
      this.scene.add(this.leftRod);

      this.rightRod = new THREE.Mesh(rodGeo, brassMat);
      this.rightRod.position.set(cx + 1.05, this.electrodeY, 0);
      this.scene.add(this.rightRod);

      // External knurled micrometer adjustment collar on right shaft
      const collarGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.22, 24);
      collarGeo.rotateZ(Math.PI / 2);
      this.rightCollar = new THREE.Mesh(
        collarGeo,
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35, metalness: 0.7 })
      );
      this.rightCollar.position.set(cx + 1.62, this.electrodeY, 0);
      this.scene.add(this.rightCollar);

      // External ground clamp post on left side
      const gndPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.16, 16),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4, metalness: 0.5 })
      );
      gndPost.position.set(cx - 1.65, this.electrodeY - 0.18, 0);
      this.scene.add(gndPost);

      // Ground wire from left rod down to bench ground terminal
      const gndCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(cx - 1.65, this.electrodeY, 0),
        new THREE.Vector3(cx - 1.85, 0.9, 0.25),
        new THREE.Vector3(cx - 1.72, 0.16, 0.55)
      ]);
      const gndWire = new THREE.Mesh(
        new THREE.TubeGeometry(gndCurve, 24, 0.024, 8, false),
        new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 })
      );
      this.scene.add(gndWire);

      // Subtle pre-breakdown electric field corona glow caps
      const coronaGeo = new THREE.SphereGeometry(this.sphereRadius * 1.09, 24, 18);
      const coronaMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.coronaLeft = new THREE.Mesh(coronaGeo, coronaMat);
      this.coronaRight = new THREE.Mesh(coronaGeo, coronaMat.clone());
      this.scene.add(this.coronaLeft);
      this.scene.add(this.coronaRight);
    }

    _buildHVConsole() {
      const consoleX = 2.25;
      const bodyGeo = new THREE.BoxGeometry(2.1, 1.85, 1.55);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.42,
        metalness: 0.55
      });
      const hvUnit = new THREE.Mesh(bodyGeo, bodyMat);
      hvUnit.position.set(consoleX, 0.925, 0);
      hvUnit.castShadow = true;
      hvUnit.receiveShadow = true;
      this.scene.add(hvUnit);

      // Top blue bezel accent
      const bezel = new THREE.Mesh(
        new THREE.BoxGeometry(2.16, 0.1, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.5 })
      );
      bezel.position.set(consoleX, 1.86, 0);
      this.scene.add(bezel);

      // Cooling fins on right side of HV transformer console
      const finMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 });
      for (let i = -3; i <= 3; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.06), finMat);
        fin.position.set(consoleX + 1.09, 0.9, i * 0.18);
        this.scene.add(fin);
      }

      // Porcelain HV turret insulator on top left of console
      const porcMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.25, metalness: 0.1 });
      for (let i = 0; i < 4; i++) {
        const shed = new THREE.Mesh(new THREE.CylinderGeometry(0.18 - i * 0.015, 0.21 - i * 0.015, 0.09, 20), porcMat);
        shed.position.set(consoleX - 0.62, 1.95 + i * 0.11, 0);
        this.scene.add(shed);
      }

      // HV supply indicator beacon dome
      const beaconGeo = new THREE.SphereGeometry(0.13, 20, 16);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x16a34a,
        emissiveIntensity: 0.65,
        roughness: 0.2
      });
      this.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      this.beaconMesh.position.set(consoleX + 0.68, 1.98, 0.35);
      this.scene.add(this.beaconMesh);

      this.beaconLight = new THREE.PointLight(0x22c55e, 0.4, 3.0);
      this.beaconLight.position.set(consoleX + 0.68, 2.2, 0.35);
      this.scene.add(this.beaconLight);

      // 3D Live Voltage Measurement Display CanvasTexture
      this.displayCanvas = document.createElement('canvas');
      this.displayCanvas.width = 512;
      this.displayCanvas.height = 320;
      this.displayCtx = this.displayCanvas.getContext('2d');
      this.displayTexture = new THREE.CanvasTexture(this.displayCanvas);
      this.displayTexture.encoding = THREE.sRGBEncoding;

      const screenGeo = new THREE.PlaneGeometry(1.55, 0.96);
      const screenMat = new THREE.MeshBasicMaterial({ map: this.displayTexture });
      const screenMesh = new THREE.Mesh(screenGeo, screenMat);
      screenMesh.position.set(consoleX, 1.15, 0.785);
      this.scene.add(screenMesh);

      // High-Voltage Cable from HV turret to Right Electrode shaft
      const hvCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(consoleX - 0.62, 2.34, 0),
        new THREE.Vector3(1.15, 2.52, 0.12),
        new THREE.Vector3(0.75, 2.02, 0.05),
        new THREE.Vector3(this.cellCenterX + 1.56, this.electrodeY + 0.06, 0)
      ]);
      this.hvWireMesh = new THREE.Mesh(
        new THREE.TubeGeometry(hvCurve, 32, 0.032, 10, false),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.42, metalness: 0.15 })
      );
      this.scene.add(this.hvWireMesh);
    }

    _buildSparkSystem() {
      this.sparkGroup = new THREE.Group();
      this.sparkGroup.visible = false;
      this.scene.add(this.sparkGroup);

      // Main bright core arc + 2 secondary jagged plasma filaments
      const colors = [0xffffff, 0x38bdf8, 0xa5f3fc];
      for (let i = 0; i < 3; i++) {
        const geo = new THREE.BufferGeometry();
        const pts = new Float32Array(18 * 3);
        geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
        const mat = new THREE.LineBasicMaterial({
          color: colors[i],
          transparent: true,
          opacity: i === 0 ? 1.0 : 0.78,
          blending: THREE.AdditiveBlending
        });
        const line = new THREE.Line(geo, mat);
        this.arcLines.push(line);
        this.sparkGroup.add(line);
      }

      // Dynamic flash light at gap center
      this.sparkLight = new THREE.PointLight(0x7dd3fc, 0, 6.5);
      this.sparkLight.position.set(this.cellCenterX, this.electrodeY, 0);
      this.scene.add(this.sparkLight);
    }

    _buildBubbles() {
      const bubbleGeo = new THREE.SphereGeometry(0.025, 10, 8);
      const bubbleMat = new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.65,
        roughness: 0.1
      });
      for (let i = 0; i < 18; i++) {
        const mesh = new THREE.Mesh(bubbleGeo, bubbleMat);
        mesh.visible = false;
        this.scene.add(mesh);
        this.bubbles.push({
          mesh,
          active: false,
          vy: 0.4 + Math.random() * 0.45,
          vx: (Math.random() - 0.5) * 0.18,
          vz: (Math.random() - 0.5) * 0.18,
          life: 0
        });
      }
    }

    /**
     * Positions spheres & rods based on gapMm (1.0 mm to 5.0 mm).
     */
    _updateElectrodePositions() {
      const cx = this.cellCenterX;
      // Map 1.0 - 5.0 mm visibly to 0.14 - 0.68 scene units gap between sphere inner faces
      const visualGap = 0.14 + ((this.gapMm - 1.0) / 4.0) * 0.54;
      const halfSpan = visualGap / 2 + this.sphereRadius;

      this.leftSphere.position.set(cx - halfSpan, this.electrodeY, 0);
      this.rightSphere.position.set(cx + halfSpan, this.electrodeY, 0);

      // Update shafts so they seat cleanly inside each sphere
      this.leftRod.position.x = cx - halfSpan - 0.72;
      this.rightRod.position.x = cx + halfSpan + 0.72;
      this.rightCollar.position.x = cx + halfSpan + 1.24;

      this.coronaLeft.position.copy(this.leftSphere.position);
      this.coronaRight.position.copy(this.rightSphere.position);
    }

    /**
     * Updates the 3D CanvasTexture OLED meter on the HV console.
     */
    _updateDisplayTexture() {
      const ctx = this.displayCtx;
      if (!ctx) return;

      const w = this.displayCanvas.width;
      const h = this.displayCanvas.height;

      // Dark instrument screen background
      ctx.fillStyle = '#07101f';
      ctx.fillRect(0, 0, w, h);

      // Border frame
      ctx.strokeStyle = this.isBreakdown ? '#ef4444' : this.isEnergized ? '#38bdf8' : '#1e3a5f';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);

      // Header bar
      ctx.fillStyle = '#0f213d';
      ctx.fillRect(14, 14, w - 28, 48);
      ctx.fillStyle = '#93c5fd';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('VIRTUAL HV OIL TEST SET', 28, 45);

      // Status badge
      let statusText = 'STANDBY';
      let statusColor = '#22c55e';
      if (this.isBreakdown) {
        statusText = 'BREAKDOWN!';
        statusColor = '#ef4444';
      } else if (this.isEnergized) {
        statusText = 'HV ACTIVE';
        statusColor = '#f59e0b';
      }
      ctx.fillStyle = statusColor;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(statusText, w - 28, 46);
      ctx.textAlign = 'left';

      // Main Voltage readout
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('APPLIED TEST VOLTAGE', 28, 102);

      ctx.fillStyle = this.isBreakdown ? '#fca5a5' : '#38bdf8';
      ctx.font = 'bold 78px monospace';
      ctx.fillText(`${this.appliedKv.toFixed(1)} kV`, 28, 182);

      // Bottom parameters
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(24, 212);
      ctx.lineTo(w - 24, 212);
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '21px monospace';
      ctx.fillText(`GAP: ${this.gapMm.toFixed(1)} mm`, 28, 250);
      const oilLabel = this.oilProfile ? this.oilProfile.name.toUpperCase() : 'FRESH OIL';
      ctx.fillText(`OIL: ${oilLabel}`, 28, 286);

      if (this.breakdownKv !== null) {
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'right';
        ctx.fillText(`Vb: ${this.breakdownKv.toFixed(1)} kV`, w - 28, 250);
        ctx.textAlign = 'left';
      }

      this.displayTexture.needsUpdate = true;
    }

    /**
     * Updates 3D oil color, opacity, and suspended particles based on oil condition.
     * @param {object} profile
     */
    setOilCondition(profile) {
      this.oilProfile = profile;
      if (!profile || !this.oilVolumeMesh) return;

      const vis = profile.visual;
      this.oilVolumeMesh.material.color.setHex(vis.oilColor);
      this.oilVolumeMesh.material.opacity = vis.oilOpacity;
      this.oilSurfaceMesh.material.color.setHex(vis.oilColor);

      this.particlesPoints.material.color.setHex(vis.particleColor);
      this.particlesPoints.geometry.setDrawRange(0, vis.particleCount);

      this._updateDisplayTexture();
    }

    /**
     * Sets electrode gap distance in mm and moves spheres accordingly.
     * @param {number} gapMm
     */
    setGapMm(gapMm) {
      this.gapMm = Math.min(5.0, Math.max(1.0, Number(gapMm) || 2.5));
      this._updateElectrodePositions();
      this._updateDisplayTexture();
    }

    /**
     * Updates live electrical test state (voltage, energized, stress ratio).
     */
    setElectricalState({ appliedKv, isEnergized, isBreakdown, breakdownKv, stressRatio }) {
      this.appliedKv = appliedKv;
      this.isEnergized = isEnergized;
      this.isBreakdown = isBreakdown;
      this.breakdownKv = breakdownKv;
      this.stressRatio = stressRatio || 0;

      // Update beacon indicator color
      if (this.beaconMesh && this.beaconLight) {
        if (this.isBreakdown) {
          this.beaconMesh.material.color.setHex(0xef4444);
          this.beaconMesh.material.emissive.setHex(0xdc2626);
          this.beaconMesh.material.emissiveIntensity = 1.6;
          this.beaconLight.color.setHex(0xef4444);
          this.beaconLight.intensity = 1.2;
        } else if (this.isEnergized) {
          this.beaconMesh.material.color.setHex(0xf59e0b);
          this.beaconMesh.material.emissive.setHex(0xd97706);
          this.beaconMesh.material.emissiveIntensity = 1.1;
          this.beaconLight.color.setHex(0xf59e0b);
          this.beaconLight.intensity = 0.85;
        } else {
          this.beaconMesh.material.color.setHex(0x22c55e);
          this.beaconMesh.material.emissive.setHex(0x16a34a);
          this.beaconMesh.material.emissiveIntensity = 0.6;
          this.beaconLight.color.setHex(0x22c55e);
          this.beaconLight.intensity = 0.35;
        }
      }

      // Corona glow intensity near high stress
      const coronaOp = this.isEnergized && this.stressRatio > 0.65
        ? Math.min(0.45, (this.stressRatio - 0.65) * 1.1)
        : 0;
      if (this.coronaLeft && this.coronaRight) {
        this.coronaLeft.material.opacity = coronaOp;
        this.coronaRight.material.opacity = coronaOp;
      }

      this._updateDisplayTexture();
    }

    /**
     * Triggers visible 3D electric spark animation + gas bubbles across the sphere gap.
     */
    triggerBreakdownSpark() {
      this.sparkTimer = this.sparkDuration;
      this.sparkGroup.visible = true;
      this._regenerateArcPoints();

      // Spawn rising gas bubbles from the breakdown gap
      this.bubbles.forEach((b, idx) => {
        b.active = true;
        b.life = 0;
        b.mesh.visible = true;
        b.mesh.position.set(
          this.cellCenterX + (Math.random() - 0.5) * 0.14,
          this.electrodeY + (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.12
        );
        const s = 0.6 + (idx % 4) * 0.25;
        b.mesh.scale.setScalar(s);
      });
    }

    clearSpark() {
      this.sparkTimer = 0;
      this.sparkGroup.visible = false;
      this.sparkLight.intensity = 0;
    }

    /**
     * Builds randomized jagged spark segments bridging the inner sphere faces.
     */
    _regenerateArcPoints() {
      const startX = this.leftSphere.position.x + this.sphereRadius * 0.96;
      const endX = this.rightSphere.position.x - this.sphereRadius * 0.96;
      const span = endX - startX;

      this.arcLines.forEach((line, branchIdx) => {
        const attr = line.geometry.getAttribute('position');
        const count = attr.count;
        const spread = branchIdx === 0 ? 0.075 : 0.14;

        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          const x = startX + span * t;
          const envelope = Math.sin(t * Math.PI);
          const y = this.electrodeY + (Math.random() - 0.5) * spread * envelope * 2;
          const z = (Math.random() - 0.5) * spread * envelope * 2;
          attr.setXYZ(i, x, y, z);
        }
        attr.needsUpdate = true;
      });
    }

    /**
     * Smoothly moves camera to a named preset view.
     * @param {'overview'|'electrodes'|'top'|'console'} presetName
     */
    setCameraPreset(presetName) {
      const preset = CAMERA_PRESETS[presetName] || CAMERA_PRESETS.overview;
      this.camAnim = {
        startPos: this.camera.position.clone(),
        endPos: new THREE.Vector3(...preset.pos),
        startTarget: this.controls.target.clone(),
        endTarget: new THREE.Vector3(...preset.target),
        progress: 0
      };
    }

    _bindResize() {
      const onResize = () => {
        if (!this.container || !this.renderer || !this.camera) return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        if (w <= 0 || h <= 0) return;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      };

      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(onResize);
        ro.observe(this.container);
      }
      window.addEventListener('resize', onResize);
    }

    _animate() {
      let lastTime = performance.now();

      const loop = (now) => {
        this.rafId = requestAnimationFrame(loop);
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        // Smooth camera preset interpolation
        if (this.camAnim) {
          this.camAnim.progress += dt * 2.8;
          const t = Math.min(1, this.camAnim.progress);
          const ease = 1 - Math.pow(1 - t, 3);
          this.camera.position.lerpVectors(this.camAnim.startPos, this.camAnim.endPos, ease);
          this.controls.target.lerpVectors(this.camAnim.startTarget, this.camAnim.endTarget, ease);
          if (t >= 1) this.camAnim = null;
        }

        // Gentle drift of suspended oil particles
        if (this.particlesPoints && this.particlePositions) {
          const count = this.particlesPoints.geometry.drawRange.count;
          for (let i = 0; i < count; i++) {
            const idx = i * 3;
            this.particlePositions[idx] += Math.sin(now * 0.001 + i) * 0.0004;
            this.particlePositions[idx + 1] += Math.cos(now * 0.0013 + i * 0.7) * 0.00035;
          }
          this.particlesPoints.geometry.attributes.position.needsUpdate = true;
        }

        // Spark animation flicker
        if (this.sparkTimer > 0) {
          this.sparkTimer -= dt;
          if (this.sparkTimer <= 0) {
            this.clearSpark();
          } else {
            this._regenerateArcPoints();
            const fade = Math.min(1, this.sparkTimer / 0.5);
            this.sparkLight.intensity = (3.5 + Math.random() * 3.5) * fade;
            this.arcLines.forEach((l, idx) => {
              l.material.opacity = (idx === 0 ? 1.0 : 0.75) * fade * (0.65 + Math.random() * 0.35);
            });
          }
        }

        // Rising thermal breakdown bubbles in oil
        this.bubbles.forEach((b) => {
          if (!b.active) return;
          b.life += dt;
          b.mesh.position.y += b.vy * dt;
          b.mesh.position.x += b.vx * dt;
          b.mesh.position.z += b.vz * dt;
          if (b.mesh.position.y > 1.88 || b.life > 2.6) {
            b.active = false;
            b.mesh.visible = false;
          }
        });

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
      };

      this.rafId = requestAnimationFrame(loop);
    }
  }

  global.VirtualSphereGapScene = VirtualSphereGapScene;
})(window);
