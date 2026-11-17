import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default function NexAIMascot() {
  const hostRef = useRef(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch { host.classList.add('nex-ai-no-webgl'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
    camera.position.set(0, 0.05, 5.6);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9889a2, 2.7));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(-3, 5, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xdab9ff, 1.7);
    rim.position.set(3, 3, -4);
    scene.add(rim);
    const dancer = new THREE.Group();
    scene.add(dancer);
    const danceBeat = { value: 0 };
    let disposed = false;
    new GLTFLoader().load('/models/nexai-hedgehog.glb', gltf => {
      if (disposed) return;
      gltf.scene.traverse(object => {
        if (!object.isMesh) return;
        object.material = object.material.clone();
        object.material.onBeforeCompile = shader => {
          shader.uniforms.danceBeat = danceBeat;
          shader.vertexShader = shader.vertexShader.replace('void main() {', 'uniform float danceBeat;\nvoid main() {');
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
            #include <begin_vertex>
            // The model faces -Z; keep the spines on its +Z back still.
            float arm = smoothstep(0.20, 0.29, abs(position.x))
              * smoothstep(0.06, 0.16, -position.z)
              * smoothstep(-0.35, -0.25, position.y)
              * (1.0 - smoothstep(0.08, 0.18, position.y));
            float side = sign(position.x);
            float pump = sin(danceBeat + side * 1.57);
            transformed.y += arm * 0.05 * pump;
            transformed.x += arm * side * 0.025 * pump;
          `);
        };
      });
      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      const size = bounds.getSize(new THREE.Vector3());
      if (!size.y) return;
      gltf.scene.position.sub(bounds.getCenter(new THREE.Vector3()));
      const normalized = new THREE.Group();
      normalized.add(gltf.scene);
      normalized.scale.setScalar(2.65 / size.y);
      normalized.rotation.y = Math.PI;
      dancer.add(normalized);
    }, undefined, () => host.classList.add('nex-ai-no-webgl'));

    const resize = () => {
      const width = host.clientWidth || 110, height = host.clientHeight || 110;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host); resize();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clock = new THREE.Clock();
    let frame;
    const draw = () => {
      if (!reduced.matches) {
        const time = clock.getElapsedTime();
        const beat = time * 7.2;
        danceBeat.value = beat;
        const step = Math.sin(beat * 0.5);
        const bounce = Math.pow(Math.max(0, Math.sin(beat)), 2);
        dancer.position.x = step * 0.19;
        dancer.position.y = bounce * 0.17;
        dancer.rotation.z = step * 0.18 + Math.sin(beat * 2) * 0.035;
        dancer.rotation.x = Math.sin(beat) * 0.07;
        dancer.rotation.y = time * 0.3 + step * 0.14;
        dancer.scale.set(1 + bounce * 0.035, 1 - bounce * 0.045, 1);
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame); observer.disconnect();
      scene.traverse(object => {
        object.geometry?.dispose();
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => material.dispose());
      });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div className="nex-ai-mascot" ref={hostRef} role="img" aria-label="Dancing NexAI hedgehog pet. Drag to move it."><span className="nex-ai-mascot-fallback" aria-hidden="true">✦</span></div>;
}
