import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default function NexAIMascot({ pose = 'dance', flipToken = 0 }) {
  const hostRef = useRef(null);
  const poseRef = useRef(pose);
  const flipRef = useRef(flipToken);
  poseRef.current = pose;
  flipRef.current = flipToken;
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
    let disposed = false;
    new GLTFLoader().load('/models/nexai-hedgehog.glb', gltf => {
      if (disposed) return;
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
    let seenFlipToken = flipRef.current;
    let flipStartedAt = -Infinity;
    const draw = () => {
      const time = clock.getElapsedTime();
      if (flipRef.current !== seenFlipToken) {
        seenFlipToken = flipRef.current;
        flipStartedAt = time;
      }
      if (poseRef.current === 'point') {
        dancer.position.set(0, 0, 0);
        dancer.rotation.set(0, 0, 0);
        dancer.scale.set(1, 1, 1);
      } else if (!reduced.matches) {
        const beat = time * 7.2;
        const step = Math.sin(beat * 0.5);
        const bounce = Math.pow(Math.max(0, Math.sin(beat)), 2);
        dancer.position.x = step * 0.19;
        dancer.position.y = bounce * 0.17;
        dancer.rotation.z = step * 0.18 + Math.sin(beat * 2) * 0.035;
        dancer.rotation.x = Math.sin(beat) * 0.07;
        dancer.scale.set(1 + bounce * 0.035, 1 - bounce * 0.045, 1);
      }
      if (!reduced.matches && time - flipStartedAt < 0.9) {
        const progress = Math.max(0, (time - flipStartedAt) / 0.9);
        const eased = progress * progress * (3 - 2 * progress);
        dancer.rotation.x += Math.PI * 2 * eased;
        dancer.position.y += Math.sin(Math.PI * progress) * 0.38;
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
  return <div className="nex-ai-mascot" ref={hostRef} role="img" aria-label={pose === 'point' ? 'NexAI hedgehog pointing at the answer. Drag to make it dance.' : 'Dancing NexAI hedgehog pet. Drag to move it.'}><span className="nex-ai-mascot-fallback" aria-hidden="true">✦</span></div>;
}
