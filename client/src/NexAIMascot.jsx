import { useEffect, useRef } from 'react';
import * as THREE from 'three';

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
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
    camera.position.set(0, 0.05, 5.4);
    camera.lookAt(0, 0.05, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x856780, 2.5));
    const lamp = new THREE.DirectionalLight(0xffffff, 3);
    lamp.position.set(-2, 4, 5);
    scene.add(lamp);
    const rim = new THREE.DirectionalLight(0xd8b9ff, 2);
    rim.position.set(3, 2, -3);
    scene.add(rim);
    const mat = (color, roughness = .7) => new THREE.MeshStandardMaterial({ color, roughness });
    const fur = mat('#e5cdb7'), muzzle = mat('#f2dfcc'), earPink = mat('#bb9488');
    const hair = mat('#6c4d3d'), hairTip = mat('#8b6855');
    const suit = mat('#242027'), lapel = mat('#38313b'), shirt = mat('#fff9f1');
    const black = mat('#1a151a', .23), wire = mat('#2b2227', .32);
    const white = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const ball = new THREE.SphereGeometry(1, 32, 24);
    const root = new THREE.Group(); scene.add(root);
    function add(geometry, surface, parent, x, y, z, scale) {
      const item = new THREE.Mesh(geometry, surface);
      item.position.set(x, y, z);
      if (scale) item.scale.set(...scale);
      parent.add(item);
      return item;
    }
    const oval = (surface, parent, x, y, z, scale) => add(ball, surface, parent, x, y, z, scale);
    function curve(parent, points, radius = .012) {
      return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 12, radius, 5, false), wire, parent, 0, 0, 0);
    }
    // Black suit and neat white shirt.
    oval(suit, root, 0, -.64, 0, [.84, .82, .62]);
    oval(shirt, root, 0, -.37, .55, [.39, .47, .1]);
    for (const side of [-1, 1]) {
      const collar = oval(shirt, root, side * .18, -.22, .66, [.18, .14, .07]);
      collar.rotation.z = side * .48;
      const jacket = oval(lapel, root, side * .39, -.46, .53, [.27, .4, .11]);
      jacket.rotation.z = side * .43;
    }
    oval(black, root, 0, -.33, .7, [.12, .12, .05]);
    const tie = add(new THREE.ConeGeometry(.15, .49, 4), black, root, 0, -.63, .7);
    tie.rotation.set(0, Math.PI / 4, Math.PI);
    // Hedgehog face, ears, fringe, and quills.
    const head = new THREE.Group(); head.position.y = .52; root.add(head);
    oval(fur, head, 0, 0, 0, [.91, .77, .71]);
    for (const side of [-1, 1]) {
      const ear = oval(fur, head, side * .78, .33, .04, [.3, .35, .17]);
      ear.rotation.z = -side * .2;
      oval(earPink, head, side * .79, .34, .19, [.2, .25, .045]);
    }
    oval(muzzle, head, 0, -.23, .57, [.62, .37, .27]);
    oval(hair, head, 0, .58, -.03, [.84, .31, .65]);
    for (let i = -5; i <= 5; i++) {
      const x = i * .13;
      oval(i % 2 ? hair : hairTip, head, x, .56 - Math.abs(i) * .015, .56 - Math.abs(i) * .014, [.075, .22, .1]);
      const quill = add(new THREE.ConeGeometry(.1, .35, 7), i % 2 ? hair : hairTip, head, x, .77 - Math.abs(i) * .02, -.32);
      quill.rotation.z = -i * .11;
    }
    const eyes = [];
    for (const side of [-1, 1]) {
      eyes.push(oval(black, head, side * .34, .13, .72, [.135, .16, .09]));
      oval(white, head, side * .34 - .035, .19, .8, [.036, .04, .015]);
      const lens = add(new THREE.TorusGeometry(.24, .014, 6, 32), wire, head, side * .34, .15, .8);
      lens.scale.y = .84;
      for (const offset of [-.13, 0, .13]) {
        curve(head, [[side * .25, -.22 + offset, .88], [side * .5, -.22 + offset, .8], [side * .74, -.25 + offset, .61]], .008);
      }
    }
    curve(head, [[-.1, .17, .85], [0, .18, .86], [.1, .17, .85]], .014);
    oval(black, head, 0, -.21, .88, [.15, .11, .1]);
    curve(head, [[-.12, -.43, .82], [0, -.46, .85], [.12, -.43, .82]], .01);
    // Sleeves and little shoes move independently to the beat.
    const arms = [], shoes = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * .68, -.32, 0); root.add(arm);
      const sleeve = oval(suit, arm, side * .2, -.32, .02, [.28, .52, .3]);
      sleeve.rotation.z = side * .25;
      oval(fur, arm, side * .35, -.68, .13, [.2, .19, .19]);
      arms.push(arm);
      shoes.push(oval(black, root, side * .38, -1.36, .25, [.3, .15, .39]));
    }
    const resize = () => {
      const width = host.clientWidth || 110, height = host.clientHeight || 110;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host); resize();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clock = new THREE.Clock();
    let frame;
    const draw = () => {
      const t = clock.getElapsedTime();
      if (!reduceMotion.matches) {
        const beat = t * 5.2;
        root.position.x = Math.sin(beat * .5) * .12;
        root.position.y = Math.abs(Math.sin(beat)) * .17;
        root.rotation.z = Math.sin(beat * .5) * .1;
        head.rotation.z = -Math.sin(beat * .5) * .12;
        head.position.y = .52 + Math.sin(beat) * .04;
        arms[0].rotation.z = -.2 - Math.sin(beat) * .65;
        arms[1].rotation.z = .2 - Math.sin(beat) * .65;
        shoes[0].position.y = -1.36 + Math.max(0, Math.sin(beat)) * .12;
        shoes[1].position.y = -1.36 + Math.max(0, -Math.sin(beat)) * .12;
        const blink = Math.sin(t * 1.8) > .995 ? .12 : 1;
        eyes.forEach(eye => { eye.scale.y = .16 * blink; });
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      scene.traverse(object => {
        object.geometry?.dispose();
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(surface => surface.dispose());
      });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div className="nex-ai-mascot" ref={hostRef} role="img" aria-label="Dancing hedgehog NexAI pet in a black suit. Drag to move it."><span className="nex-ai-mascot-fallback" aria-hidden="true">✦</span></div>;
}
