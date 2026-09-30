/* =========================================
   3D SCENE (Three.js) + 3D CARD TILT
========================================= */

(function () {

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = matchMedia("(hover:hover)").matches;

  /* ---------- 3D tilt on project videos ---------- */

  if (canHover && !reduce) {
    document.querySelectorAll(".project-media").forEach(el => {
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) scale(1.015)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- WebGL scene ---------- */

  const canvas = document.getElementById("gl");
  if (!canvas || typeof THREE === "undefined") return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    canvas.style.display = "none";
    return;
  }

  const smallScreen = innerWidth < 700;
  renderer.setPixelRatio(Math.min(devicePixelRatio, smallScreen ? 1.5 : 2));

  const ACCENT = 0xd8ff3e;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 9;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 4, 5);
  scene.add(key);
  const glow = new THREE.PointLight(ACCENT, 2.4, 16);
  glow.position.set(0, 0, 3.5);
  scene.add(glow);

  const rig = new THREE.Group();      // follows scroll
  const reel = new THREE.Group();     // follows mouse
  scene.add(rig);
  rig.add(reel);

  /* film reel: disc with 6 holes + hub */
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 1.6, 0, Math.PI * 2, false);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const hole = new THREE.Path();
    hole.absarc(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.36, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const hub = new THREE.Path();
  hub.absarc(0, 0, 0.22, 0, Math.PI * 2, true);
  shape.holes.push(hub);

  const metal = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, metalness: 0.75, roughness: 0.32 });
  const disc = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.32, curveSegments: 48, bevelEnabled: true,
      bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3
    }),
    metal
  );
  disc.position.z = -0.16;
  reel.add(disc);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(disc.geometry, 30),
    new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.55 })
  );
  edges.position.copy(disc.position);
  reel.add(edges);

  /* play button in the middle */
  const tri = new THREE.Shape();
  tri.moveTo(-0.28, -0.4);
  tri.lineTo(0.42, 0);
  tri.lineTo(-0.28, 0.4);
  tri.closePath();
  const play = new THREE.Mesh(
    new THREE.ExtrudeGeometry(tri, {
      depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2
    }),
    new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.55, roughness: 0.4 })
  );
  play.position.z = 0.4;
  reel.add(play);

  /* orbiting timeline frames */
  const ring = new THREE.Group();
  ring.rotation.x = 1.15;
  rig.add(ring);

  const frameGeo = new THREE.BoxGeometry(0.9, 0.52, 0.04);
  const frameEdge = new THREE.EdgesGeometry(frameGeo);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.4 });
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });
  const frames = [];

  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(frameGeo, frameMat));
    g.add(new THREE.LineSegments(frameEdge, lineMat));
    const a = (i / 10) * Math.PI * 2;
    g.position.set(Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0);
    g.rotation.z = a + Math.PI / 2;
    ring.add(g);
    frames.push(g);
  }

  /* star field */
  const N = smallScreen ? 400 : 900;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
    pos[i * 3 + 2] = -Math.random() * 20;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0x8a8a8a, size: 0.05, transparent: true, opacity: 0.8 })
  );
  scene.add(stars);

  /* ---------- layout: where the rig sits in each section ---------- */

  const PRESETS = [
    ["#top", 0.5, 0.02, 1],
    ["#work", 0.9, 0.5, 0.45],
    ["#services", 0.6, 0.25, 0.75],
    ["#about", 0.62, -0.05, 0.9],
    ["#contact", 0.55, -0.1, 1.05]
  ];

  let halfW = 1, halfH = 1, mobile = false, anchors = [];

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    halfW = halfH * camera.aspect;
    mobile = camera.aspect < 1;
    anchors = PRESETS.map(p => {
      const el = document.querySelector(p[0]);
      const top = el ? el.getBoundingClientRect().top + scrollY : 0;
      return { y: p[0] === "#top" ? 0 : top - innerHeight * 0.5, x: p[1], yy: p[2], s: p[3] };
    });
    if (reduce) draw();
  }

  const lerp = (a, b, t) => a + (b - a) * t;

  function targetPose() {
    const y = scrollY;
    let a = anchors[0], b = anchors[0];
    for (let i = 0; i < anchors.length; i++) {
      if (y >= anchors[i].y) { a = anchors[i]; b = anchors[Math.min(i + 1, anchors.length - 1)]; }
    }
    const t = b.y > a.y ? Math.min(1, (y - a.y) / (b.y - a.y)) : 0;
    const e = t * t * (3 - 2 * t);
    const k = mobile ? 0.3 : 1;
    return {
      x: lerp(a.x, b.x, e) * halfW * k,
      y: (lerp(a.yy, b.yy, e) - (mobile ? 0.35 : 0)) * halfH,
      s: lerp(a.s, b.s, e) * (mobile ? 0.7 : 1)
    };
  }

  /* ---------- interaction ---------- */

  const mouse = { x: 0, y: 0 };
  const smooth = { x: 0, y: 0 };
  let spin = 0, spinV = 0, pulse = 0;

  const ray = new THREE.Raycaster();
  const vec = new THREE.Vector2();

  function overReel(e) {
    if (e.target.closest && e.target.closest("a, button, video, .project, .service")) return false;
    vec.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(vec, camera);
    return ray.intersectObject(disc, false).length > 0;
  }

  addEventListener("pointermove", e => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -((e.clientY / innerHeight) * 2 - 1);
    if (canHover) document.body.style.cursor = overReel(e) ? "pointer" : "";
  });

  addEventListener("click", e => {
    if (overReel(e)) { spinV += 0.32; pulse = 1; }
  });

  /* ---------- render loop ---------- */

  function draw() {
    renderer.render(scene, camera);
  }

  let last = performance.now();

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    const tp = targetPose();
    rig.position.x = lerp(rig.position.x, tp.x, 0.06);
    rig.position.y = lerp(rig.position.y, tp.y, 0.06);
    const s = lerp(rig.scale.x, tp.s, 0.06);
    rig.scale.setScalar(s);

    smooth.x = lerp(smooth.x, mouse.x, 0.06);
    smooth.y = lerp(smooth.y, mouse.y, 0.06);

    spin += spinV;
    spinV *= 0.94;
    pulse *= 0.93;

    reel.rotation.y = smooth.x * 0.55 + spin + scrollY * 0.0016;
    reel.rotation.x = -smooth.y * 0.35;
    play.rotation.y = Math.sin(now * 0.0012) * 0.5;

    ring.rotation.z += dt * 0.25;
    frames.forEach((f, i) => { f.position.z = Math.sin(now * 0.0012 + i) * 0.18; });

    glow.position.set(mouse.x * halfW * 0.8, mouse.y * halfH * 0.8, 3.5);
    glow.intensity = 2.4 + pulse * 5;

    stars.rotation.y = smooth.x * 0.06;
    stars.position.y = scrollY * 0.002;

    draw();
    requestAnimationFrame(frame);
  }

  resize();
  addEventListener("resize", resize);
  addEventListener("load", resize);

  const start = targetPose();
  rig.position.set(start.x, start.y, 0);
  rig.scale.setScalar(start.s);

  canvas.classList.add("on");

  if (reduce) {
    draw();
    addEventListener("scroll", () => { const t = targetPose(); rig.position.set(t.x, t.y, 0); rig.scale.setScalar(t.s); draw(); }, { passive: true });
  } else {
    requestAnimationFrame(frame);
  }

})();
