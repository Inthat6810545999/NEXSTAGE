import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function NexAIMascot() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      host.classList.add('nex-ai-no-webgl');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
    camera.position.set(0, 0.1, 5.65);
    camera.lookAt(0, 0.06, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x967b7a, 2.5));
    const key = new THREE.DirectionalLight(0xffffff, 3.1);
    key.position.set(-2, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb89bd1, 1.5);
    rim.position.set(3, 2, -4);
    scene.add(rim);

    const surface = (color, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness });
    const cream = surface('#e7d7c9', 0.93);
    const pale = surface('#f5e9db', 0.92);
    const muzzle = surface('#aa8b80', 0.88);
    const earInside = surface('#9c766b', 0.9);
    const quillBase = surface('#7b6455', 0.96);
    const quillLight = surface('#a48a75', 0.94);
    const dark = surface('#262024', 0.25);
    const lens = surface('#211b1e', 0.35);
    const slipper = surface('#fffdf9', 0.75);
    const glint = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const sphere = new THREE.SphereGeometry(1, 32, 24);
    const root = new THREE.Group();
    scene.add(root);

    const add = (geometry, material, parent, x, y, z, scale) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      if (scale) mesh.scale.set(...scale);
      parent.add(mesh);
      return mesh;
    };
    const oval = (material, parent, x, y, z, scale) => add(sphere, material, parent, x, y, z, scale);
    const stroke = (parent, points, radius = 0.012) => add(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 12, radius, 5, false),
      lens, parent, 0, 0, 0,
    );

    // The rounded cream body sits in front of a full brown quill coat.
    oval(quillBase, root, 0, 0.13, -0.35, [0.89, 1.13, 0.61]);
    oval(cream, root, 0, -0.25, 0.14, [0.91, 1.08, 0.74]);
    oval(pale, root, 0, -0.5, 0.6, [0.65, 0.62, 0.27]);
    oval(quillBase, root, 0, -0.98, -0.88, [0.17, 0.14, 0.23]);

    // Instancing keeps hundreds of individual quills inexpensive to render.
    const quillGeometry = new THREE.ConeGeometry(0.065, 0.36, 5);
    const quills = new THREE.InstancedMesh(quillGeometry, quillLight, 16 * 25);
    const instance = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    let index = 0;
    for (let row = 0; row < 16; row++) {
      const theta = 0.12 + row * 0.166;
      for (let column = 0; column < 25; column++) {
        const phi = -1.48 + (column + (row % 2) * 0.5) * (2.96 / 24);
        const wave = Math.sin(row * 5.1 + column * 2.3) * 0.014;
        const x = (0.87 + wave) * Math.sin(theta) * Math.sin(phi);
        const y = 0.13 + 1.1 * Math.cos(theta);
        const z = -0.35 - 0.58 * Math.sin(theta) * Math.cos(phi);
        const normal = new THREE.Vector3(x / 0.75, (y - 0.13) / 1.12, (z + 0.35) / 0.35).normalize();
        normal.add(new THREE.Vector3(0, -0.1, -0.15)).normalize();
        instance.position.set(x, y, z);
        instance.quaternion.setFromUnitVectors(up, normal);
        const size = 0.7 + (Math.sin(row * 3.4 + column * 7.1) + 1) * 0.18;
        instance.scale.set(size, size, size);
        instance.updateMatrix();
        quills.setMatrixAt(index++, instance.matrix);
      }
    }
    quills.instanceMatrix.needsUpdate = true;
    root.add(quills);

    const face = new THREE.Group();
    face.position.set(0, 0.72, 0.18);
    root.add(face);
    oval(cream, face, 0, 0, 0, [0.75, 0.64, 0.62]);
    oval(pale, face, 0, -0.15, 0.49, [0.52, 0.32, 0.25]);
    for (const side of [-1, 1]) {
      const ear = oval(cream, face, side * 0.71, 0.35, 0, [0.29, 0.33, 0.14]);
      ear.rotation.z = -side * 0.25;
      oval(earInside, face, side * 0.72, 0.35, 0.12, [0.22, 0.26, 0.045]);
    }
    // Rows of short fringe quills across the forehead.
    oval(quillBase, face, 0, 0.49, -0.12, [0.7, 0.23, 0.51]);
    for (let i = -7; i <= 7; i++) {
      const x = i * 0.088;
      const tuft = oval(i % 2 ? quillBase : quillLight, face, x, 0.5 - Math.abs(i) * 0.012, 0.47 - Math.abs(i) * 0.01, [0.055, 0.19, 0.075]);
      tuft.rotation.z = -x * 0.15;
    }

    const eyes = [];
    for (const side of [-1, 1]) {
      const eye = oval(dark, face, side * 0.32, 0.07, 0.59, [0.145, 0.18, 0.11]);
      eyes.push(eye);
      oval(glint, face, side * 0.32 - 0.04, 0.14, 0.68, [0.035, 0.044, 0.014]);
      const frame = add(new THREE.TorusGeometry(0.235, 0.013, 6, 32), lens, face, side * 0.32, 0.14, 0.67);
      frame.scale.y = 0.82;
      for (const dy of [-0.12, 0, 0.12]) {
        stroke(face, [[side * 0.22, -0.21 + dy, 0.72], [side * 0.51, -0.22 + dy, 0.67], [side * 0.75, -0.2 + dy, 0.45]], 0.009);
      }
    }
    stroke(face, [[-0.09, 0.15, 0.7], [0, 0.16, 0.71], [0.09, 0.15, 0.7]], 0.014);
    oval(muzzle, face, 0, -0.15, 0.66, [0.33, 0.21, 0.17]);
    oval(dark, face, 0, -0.08, 0.82, [0.15, 0.12, 0.1]);
    stroke(face, [[-0.13, -0.32, 0.73], [0, -0.36, 0.75], [0.13, -0.32, 0.73]], 0.01);

    const arms = [], feet = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.76, -0.14, 0.15);
      root.add(arm);
      const limb = oval(cream, arm, side * 0.19, -0.33, 0.03, [0.2, 0.44, 0.21]);
      limb.rotation.z = side * 0.2;
      oval(cream, arm, side * 0.27, -0.67, 0.09, [0.16, 0.16, 0.16]);
      arms.push(arm);
      oval(muzzle, root, side * 0.4, -1.27, 0.18, [0.17, 0.3, 0.2]);
      feet.push(oval(slipper, root, side * 0.42, -1.49, 0.42, [0.33, 0.13, 0.43]));
    }

    const resize = () => {
      const width = host.clientWidth || 110;
      const height = host.clientHeight || 110;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clock = new THREE.Clock();
    let frame;
    const draw = () => {
      const t = clock.getElapsedTime();
      if (!reduceMotion.matches) {
        const beat = t * 5.2;
        root.position.x = Math.sin(beat * 0.5) * 0.12;
        root.position.y = Math.abs(Math.sin(beat)) * 0.16;
        root.rotation.z = Math.sin(beat * 0.5) * 0.09;
        face.rotation.z = -Math.sin(beat * 0.5) * 0.11;
        arms[0].rotation.z = -0.15 - Math.sin(beat) * 0.6;
        arms[1].rotation.z = 0.15 - Math.sin(beat) * 0.6;
        feet[0].position.y = -1.49 + Math.max(0, Math.sin(beat)) * 0.12;
        feet[1].position.y = -1.49 + Math.max(0, -Math.sin(beat)) * 0.12;
        const blink = Math.sin(t * 1.8) > 0.995 ? 0.12 : 1;
        eyes.forEach(eye => { eye.scale.y = 0.18 * blink; });
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse(object => {
        object.geometry?.dispose();
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => material.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="nex-ai-mascot" ref={hostRef} role="img" aria-label="Dancing cream hedgehog NexAI pet with glasses, brown quills, and white shoes. Drag to move it."><span className="nex-ai-mascot-fallback" aria-hidden="true">✦</span></div>;
}
