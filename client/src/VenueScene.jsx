import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { runway, seatPosition, sectionColors, sections, stage } from './venue-layout';

function createArena(host, onSelect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f6f0fd');

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.04, 180);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  const draw = () => renderer.render(scene, camera);
  controls.addEventListener('change', draw);
  renderer.setAnimationLoop(() => controls.update());
  scene.add(new THREE.HemisphereLight('#ffffff', '#b49ac5', 1.6));
  const keyLight = new THREE.DirectionalLight('#fff6ff', 1.8);
  keyLight.position.set(-15, 28, -7);
  scene.add(keyLight);

  const boxGeometry = new THREE.BoxGeometry();
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
  const deckMaterial = material('#322046');
  const trimMaterial = new THREE.MeshBasicMaterial({ color: '#bf8dff' });

  function box(parent, x, y, z, width, height, depth, surface) {
    const mesh = new THREE.Mesh(boxGeometry, surface);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    parent.add(mesh);
    return mesh;
  }

  box(scene, 0, -0.82, 1, 53, 1.05, 51, material('#ded0ed'));
  box(scene, 0, -0.24, 1, 51.5, 0.13, 49.5, material('#eee5f6'));

  for (const platform of [stage, runway]) {
    box(scene, platform.x, platform.height / 2, platform.z, platform.width, platform.height, platform.depth, deckMaterial);
    box(scene, platform.x, platform.height + 0.025, platform.z + platform.depth / 2 - 0.06, platform.width, 0.05, 0.12, trimMaterial);
  }

  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 1024;
  screenCanvas.height = 320;
  const context = screenCanvas.getContext('2d');
  const screenGradient = context.createLinearGradient(0, 0, 1024, 320);
  screenGradient.addColorStop(0, '#39206c');
  screenGradient.addColorStop(0.55, '#7548b5');
  screenGradient.addColorStop(1, '#d289cb');
  context.fillStyle = screenGradient;
  context.fillRect(0, 0, 1024, 320);
  context.strokeStyle = '#ffffff46';
  context.lineWidth = 2;
  for (const radius of [84, 125, 168, 212]) {
    context.beginPath();
    context.arc(815, 150, radius, 0, Math.PI * 2);
    context.stroke();
  }
  context.fillStyle = '#fff';
  context.font = '700 76px system-ui';
  context.fillText('NEXSTAGE', 71, 165);
  context.font = '600 25px system-ui';
  context.fillText('LIVE FROM THE MAIN STAGE', 76, 215);
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  box(scene, 0, 5.25, -20.1, 20.7, 6.2, 0.32, deckMaterial);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(20.2, 5.75),
    new THREE.MeshBasicMaterial({ map: screenTexture }),
  );
  screen.position.set(0, 5.25, -19.92);
  scene.add(screen);
  for (const x of [-12.4, 12.4]) {
    box(scene, x, 5.55, -19.5, 0.33, 7.5, 0.33, deckMaterial);
    box(scene, x, 5.35, -19.16, 1.5, 4.9, 0.75, deckMaterial);
    box(scene, x, 8.75, -19.5, 1.85, 0.13, 0.45, trimMaterial);
  }
  box(scene, 0, 9.15, -19.5, 25.1, 0.28, 0.48, deckMaterial);
  for (let x = -10; x <= 10; x += 2.5) {
    box(scene, x, 8.83, -19.28, 0.45, 0.30, 0.38, trimMaterial);
  }

  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#e3a4ef' });
  const performer = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 1.0, 4, 8), markerMaterial);
  performer.position.set(0, stage.height + 0.74, -14.8);
  scene.add(performer);

  const seats = [];
  const tierMaterials = {
    Floor: material('#d7c3ee'), Lower: material('#b8a0d4'), Upper: material('#d9cbea'),
  };
  for (const section of sections) {
    const block = new THREE.Group();
    block.position.set(section.x, 0, section.z);
    block.rotation.y = THREE.MathUtils.degToRad(section.yaw);
    scene.add(block);
    const rowDepth = section.depth / section.rows;
    for (let row = 1; row <= section.rows; row++) {
      const z = (row - 0.5) * rowDepth - section.depth / 2;
      const y = section.base + (row - 1) * section.rise;
      box(block, 0, (y - 0.12) / 2, z, section.width, y + 0.12, rowDepth, tierMaterials[section.level]);
      for (let seat = 1; seat <= section.seats; seat++) seats.push({ section, row, seat });
    }
  }

  const seatMaterial = material('#ffffff');
  const cushions = new THREE.InstancedMesh(boxGeometry, seatMaterial, seats.length);
  const backs = new THREE.InstancedMesh(boxGeometry, seatMaterial, seats.length);
  const transform = new THREE.Object3D();
  seats.forEach(({ section, row, seat }, index) => {
    const { x, y, z } = seatPosition(section, row, seat);
    const angle = THREE.MathUtils.degToRad(section.yaw);
    transform.rotation.set(0, angle, 0);
    transform.position.set(x, y + 0.32, z);
    transform.scale.set(0.57, 0.24, 0.48);
    transform.updateMatrix();
    cushions.setMatrixAt(index, transform.matrix);
    transform.position.set(x + Math.sin(angle) * 0.22, y + 0.57, z + Math.cos(angle) * 0.22);
    transform.scale.set(0.57, 0.46, 0.11);
    transform.updateMatrix();
    backs.setMatrixAt(index, transform.matrix);
  });
  scene.add(cushions, backs);
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), new THREE.MeshBasicMaterial({ color: '#6a26b6' }));
  scene.add(pin);
  const selectedColor = new THREE.Color('#f6b9ff');
  const normalColors = Object.fromEntries(Object.entries(sectionColors).map(([level, color]) => [level, new THREE.Color(color)]));

  const raycaster = new THREE.Raycaster();
  let pointerStart;
  let currentView = 'overview';
  function startPointer(event) {
    if (event.isPrimary && event.button === 0) pointerStart = { x: event.clientX, y: event.clientY };
  }
  function pickSeat(event) {
    if (!event.isPrimary || !pointerStart) return;
    const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    if (distance > 6 || currentView !== 'overview') return;
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(
      2 * (event.clientX - rect.left) / rect.width - 1,
      1 - 2 * (event.clientY - rect.top) / rect.height,
    ), camera);
    const [hit] = raycaster.intersectObjects([cushions, backs], false);
    if (hit) onSelect(seats[hit.instanceId]);
  }
  function zoomSeat(event) {
    if (currentView !== 'seat') return;
    event.preventDefault();
    camera.fov = THREE.MathUtils.clamp(camera.fov + Math.sign(event.deltaY) * 2.5, 23, 63);
    camera.updateProjectionMatrix();
    draw();
  }
  renderer.domElement.addEventListener('pointerdown', startPointer);
  renderer.domElement.addEventListener('pointerup', pickSeat);
  renderer.domElement.addEventListener('wheel', zoomSeat, { passive: false });

  function resize() {
    const { clientWidth, clientHeight } = host;
    if (!clientWidth || !clientHeight) return;
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight);
    draw();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  return {
    select({ section, row, seat }) {
      seats.forEach((item, index) => {
        const isSelected = item.section.id === section.id && item.row === row && item.seat === seat;
        const color = isSelected ? selectedColor : normalColors[item.section.level];
        cushions.setColorAt(index, color);
        backs.setColorAt(index, color);
      });
      cushions.instanceColor.needsUpdate = true;
      backs.instanceColor.needsUpdate = true;
      const position = seatPosition(section, row, seat);
      pin.position.set(position.x, position.y + 1.05, position.z);
      draw();
    },
    setView(view, { section, row, seat }) {
      currentView = view;
      controls.reset();
      const isSeat = view === 'seat';
      pin.visible = !isSeat;
      controls.enableZoom = !isSeat;
      controls.minDistance = isSeat ? 0.10 : 26;
      controls.maxDistance = isSeat ? 0.32 : 160;
      controls.maxPolarAngle = isSeat ? Math.PI - 0.12 : Math.PI / 2.05;
      camera.fov = isSeat ? 49 : 40;
      if (isSeat) {
        const { x, y, z } = seatPosition(section, row, seat);
        camera.position.set(x, y + 1.26, z);
        const direction = new THREE.Vector3(0, 3.35, -16.7).sub(camera.position).normalize();
        controls.target.copy(camera.position).addScaledVector(direction, 0.22);
      } else {
        controls.target.set(0, 1.0, 0.5);
        const aspect = host.clientWidth / host.clientHeight || 1;
        camera.position.set(20, 49, 56).multiplyScalar(Math.max(1.06, 1.15 / aspect));
      }
      camera.updateProjectionMatrix();
      controls.update();
      resize();
    },
    dispose() {
      observer.disconnect();
      controls.removeEventListener('change', draw);
      controls.dispose();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener('pointerdown', startPointer);
      renderer.domElement.removeEventListener('pointerup', pickSeat);
      renderer.domElement.removeEventListener('wheel', zoomSeat);
      const geometries = new Set();
      const materials = new Set();
      scene.traverse(object => {
        if (object.isInstancedMesh) object.dispose();
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) materials.add(object.material);
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(surface => surface.dispose());
      screenTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export default function VenueScene({ selection, view, reset, onSelect, onUnavailable }) {
  const host = useRef(null);
  const scene = useRef(null);
  const activeView = useRef(null);

  useEffect(() => {
    try {
      scene.current = createArena(host.current, onSelect);
    } catch {
      onUnavailable(true);
    }
    return () => {
      scene.current?.dispose();
      scene.current = null;
      activeView.current = null;
    };
  }, [onSelect, onUnavailable]);

  useEffect(() => {
    const arena = scene.current;
    if (!arena) return;
    arena.select(selection);
    if (view === 'seat' || activeView.current?.view !== view || activeView.current?.reset !== reset) {
      arena.setView(view, selection);
      activeView.current = { view, reset };
    }
  }, [selection, view, reset]);

  return <div className="venue-canvas" ref={host} role="img" aria-label={view === 'seat' ? '3D view from the selected seat' : '3D arena overview'} />;
}
