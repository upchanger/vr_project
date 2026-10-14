// Small helpers for building A-Frame entities from code, plus reusable stand-in props.
// Props use smooth shading and enough segments to look rounded, while staying light for Quest 2.

export const v = (x, y, z) => `${x} ${y} ${z}`;

// Material string. Pass `flat` for a faceted look on purpose (e.g. rocks, crystals).
export const M = (color, extra = '', { flat = false, rough = 0.75 } = {}) =>
  `color: ${color}; roughness: ${rough}; metalness: 0${flat ? '; flatShading: true' : ''}${extra ? '; ' + extra : ''}`;

export function el(parent, tag, attrs = {}) {
  const e = document.createElement(tag);
  for (const [k, val] of Object.entries(attrs)) e.setAttribute(k, val);
  parent.appendChild(e);
  return e;
}

export const group = (p, pos = '0 0 0', extra = {}) => el(p, 'a-entity', { position: pos, ...extra });

export const box = (p, pos, w, h, d, color, extra = {}) =>
  el(p, 'a-box', { position: pos, width: w, height: h, depth: d, material: M(color), ...extra });

export const cyl = (p, pos, r, h, color, seg = 16, extra = {}) =>
  el(p, 'a-cylinder', { position: pos, radius: r, height: h, 'segments-radial': seg, material: M(color), ...extra });

export const cone = (p, pos, rb, rt, h, color, seg = 16, extra = {}) =>
  el(p, 'a-cone', { position: pos, 'radius-bottom': rb, 'radius-top': rt, height: h, 'segments-radial': seg, material: M(color), ...extra });

export const ball = (p, pos, r, color, extra = {}) =>
  el(p, 'a-sphere', { position: pos, radius: r, 'segments-width': 20, 'segments-height': 14, material: M(color), ...extra });

// Rounded "blob" made from a subdivided icosahedron — good for foliage and clouds.
export const blob = (p, pos, r, color, extra = {}) =>
  el(p, 'a-icosahedron', { position: pos, radius: r, detail: 2, material: M(color, '', { rough: 0.9 }), ...extra });

export function text(p, value, pos, opts = {}) {
  const e = el(p, 'a-entity', { position: pos });
  e.setAttribute('text', {
    value, align: 'center', color: '#ffffff', width: 2, wrapCount: 28, anchor: 'center', baseline: 'center',
    ...opts
  });
  return e;
}

export function anim(e, name, props) {
  e.setAttribute(`animation__${name}`, { easing: 'easeOutQuad', ...props });
}

// Animate from a tiny scale up to `to` (default full size).
export function growIn(e, to = '1 1 1', dur = 900, delay = 0) {
  e.setAttribute('scale', '0.01 0.01 0.01');
  anim(e, 'grow', { property: 'scale', to, dur, delay, easing: 'easeOutElastic' });
}

// --- Stand-in props (replaced by Sketchfab models when provided) -------------

export function tree(p, x, z, s = 1, leaf = '#3f7d3a') {
  const g = group(p, v(x, 0, z), { scale: v(s, s, s), 'merge-static': '' });
  cone(g, '0 0.55 0', 0.1, 0.06, 1.1, '#6b4a2f', 12);
  cone(g, '0.12 0.85 0', 0.04, 0.015, 0.4, '#6b4a2f', 8, { rotation: '0 0 -40' });
  const dark = leaf;
  const light = '#5c9e45';
  blob(g, '0 1.35 0', 0.5, dark);
  blob(g, '0.32 1.2 0.12', 0.36, light);
  blob(g, '-0.3 1.22 -0.1', 0.38, light);
  blob(g, '0.05 1.68 0.05', 0.34, light);
  return g;
}

export function house(p, x, z, wall = '#f2e3c6', roof = '#a93226', s = 1, ry = 0) {
  const g = group(p, v(x, 0, z), { scale: v(s, s, s), rotation: v(0, ry, 0), 'merge-static': '' });
  const W = 1.1, D = 0.95, H = 0.8;
  box(g, v(0, 0.05, 0), W + 0.1, 0.1, D + 0.1, '#9e9e9e');
  box(g, v(0, H / 2 + 0.1, 0), W, H, D, wall, { material: M(wall, '', { rough: 0.9 }) });
  // Gable roof: two sloped slabs with an overhang, plus the triangular gable ends.
  const slope = 32, half = W / 2 + 0.12, len = half / Math.cos(THREE.MathUtils.degToRad(slope));
  const ridgeY = H + 0.1 + Math.tan(THREE.MathUtils.degToRad(slope)) * (W / 2);
  box(g, v(-half / 2 + 0.02, ridgeY - Math.tan(THREE.MathUtils.degToRad(slope)) * half / 2, 0), len, 0.06, D + 0.25, roof, { rotation: v(0, 0, slope) });
  box(g, v(half / 2 - 0.02, ridgeY - Math.tan(THREE.MathUtils.degToRad(slope)) * half / 2, 0), len, 0.06, D + 0.25, roof, { rotation: v(0, 0, -slope) });
  [D / 2, -D / 2].forEach((zz) => el(g, 'a-triangle', {
    position: v(0, H + 0.1, zz), 'vertex-a': v(0, ridgeY - H - 0.1, 0), 'vertex-b': v(-W / 2, 0, 0), 'vertex-c': v(W / 2, 0, 0),
    material: M(wall, 'side: double', { rough: 0.9 })
  }));
  box(g, v(0.3, ridgeY + 0.05, -0.15), 0.14, 0.4, 0.14, '#8d6e63');
  // Door, knob, step and two framed windows on the front.
  box(g, v(-0.2, 0.42, D / 2 + 0.01), 0.26, 0.5, 0.03, '#6d4c41');
  ball(g, v(-0.12, 0.42, D / 2 + 0.035), 0.018, '#f1c40f', { material: 'color: #f1c40f; metalness: 0.9; roughness: 0.3' });
  box(g, v(-0.2, 0.13, D / 2 + 0.08), 0.36, 0.06, 0.14, '#bdbdbd');
  [0.25].forEach((wx) => {
    box(g, v(wx, 0.55, D / 2 + 0.01), 0.3, 0.26, 0.03, '#ffffff');
    box(g, v(wx, 0.55, D / 2 + 0.025), 0.24, 0.2, 0.01, '#5d8aa8', { material: 'color: #5d8aa8; metalness: 0.6; roughness: 0.1' });
    box(g, v(wx, 0.55, D / 2 + 0.032), 0.02, 0.2, 0.01, '#ffffff');
  });
  return g;
}

export function person(p, x, z, shirt = '#e67e22', s = 1) {
  const g = group(p, v(x, 0, z), { scale: v(s, s, s), 'merge-static': '' });
  const skin = '#d9a066', pants = '#34495e';
  // Legs and shoes.
  [-0.06, 0.06].forEach((lx) => {
    cyl(g, v(lx, 0.22, 0), 0.05, 0.42, pants, 12);
    box(g, v(lx, 0.025, 0.03), 0.09, 0.05, 0.16, '#212121');
  });
  // Torso (the first cylinder is recoloured by some tasks) with rounded shoulders.
  cyl(g, '0 0.62 0', 0.13, 0.42, shirt, 16).classList.add('torso', 'no-merge');
  ball(g, '0 0.82 0', 0.13, shirt, { scale: '1 0.45 0.85' });
  // Arms with hands.
  [-0.17, 0.17].forEach((ax) => {
    cyl(g, v(ax, 0.62, 0), 0.04, 0.38, shirt, 10, { rotation: v(0, 0, ax > 0 ? 8 : -8) });
    ball(g, v(ax * 1.08, 0.42, 0), 0.04, skin);
  });
  // Neck, head and hair.
  cyl(g, '0 0.9 0', 0.04, 0.06, skin, 10);
  ball(g, '0 1.01 0', 0.11, skin);
  ball(g, '0 1.05 -0.015', 0.115, '#3e2723', { 'theta-length': 90 });
  return g;
}

export function seatedStudent(p, x, z, shirt = '#e67e22', s = 0.85, ry = 180) {
  const g = group(p, v(x, 0, z), { scale: v(s, s, s), rotation: v(0, ry, 0) });
  const skin = '#d9a066', pants = '#34495e';

  // Hips sitting on the chair seat (seat height ~0.44)
  box(g, '0 0.44 0', 0.26, 0.1, 0.22, pants);

  // Thighs (horizontal, extending forward +Z towards the desk)
  [-0.07, 0.07].forEach((lx) => {
    cyl(g, v(lx, 0.44, 0.13), 0.05, 0.24, pants, 12, { rotation: '90 0 0' });
    // Knees
    ball(g, v(lx, 0.44, 0.24), 0.055, pants);
    // Lower legs / calves (vertical, down to the floor)
    cyl(g, v(lx, 0.24, 0.24), 0.048, 0.36, pants, 12);
    // Shoes on the floor
    box(g, v(lx, 0.025, 0.27), 0.08, 0.05, 0.15, '#212121');
  });

  // Torso (upright on chair, slight 5-deg forward lean toward desk)
  const upper = group(g, '0 0.48 0', { rotation: '5 0 0' });
  cyl(upper, '0 0.16 0', 0.12, 0.34, shirt, 16).classList.add('torso', 'no-merge');
  ball(upper, '0 0.33 0', 0.125, shirt, { scale: '1.05 0.45 0.85' });

  // Arms: reaching forward onto the desk
  [-0.15, 0.15].forEach((ax) => {
    // Upper arm: angled down and forward
    cyl(upper, v(ax, 0.20, 0.08), 0.038, 0.22, shirt, 10, { rotation: '-50 0 ' + (ax > 0 ? '14' : '-14') });
    // Forearm: resting forward on desk
    cyl(upper, v(ax * 0.88, 0.10, 0.22), 0.035, 0.22, shirt, 10, { rotation: '-82 0 ' + (ax > 0 ? '6' : '-6') });
    // Hands
    ball(upper, v(ax * 0.78, 0.09, 0.32), 0.035, skin);
  });

  // Neck, head and hair looking slightly down at the book
  cyl(upper, '0 0.40 0.02', 0.038, 0.06, skin, 10);
  const head = group(upper, '0 0.49 0.04', { rotation: '12 0 0' });
  ball(head, '0 0 0', 0.105, skin);
  ball(head, '0 0.035 -0.015', 0.11, '#3e2723', { 'theta-length': 95 });

  return g;
}

export function cloud(p, x, y, z, s = 1) {
  const g = group(p, v(x, y, z), { scale: v(s, s, s), 'merge-static': '' });
  [[0, 0, 0, 0.6], [0.6, -0.1, 0, 0.45], [-0.6, -0.1, 0, 0.45], [0.25, 0.25, 0.1, 0.4]].forEach(([cx, cy, cz, r]) => blob(g, v(cx, cy, cz), r, '#ffffff'));
  anim(g, 'drift', { property: 'position', to: v(x + 1.5, y, z), dir: 'alternate', loop: true, dur: 9000, easing: 'easeInOutSine' });
  return g;
}

export function turbine(p, x, z, s = 1) {
  const g = group(p, v(x, 0, z), { scale: v(s, s, s), 'merge-static': '' });
  const white = 'color: #f4f6f7; roughness: 0.4; metalness: 0.1';
  cyl(g, '0 0.03 0', 0.16, 0.06, '#bdc3c7', 20);
  cone(g, '0 1.1 0', 0.07, 0.035, 2.2, '#f4f6f7', 20, { material: white });
  const head = group(g, '0 2.22 0');
  box(head, '0 0 -0.04', 0.12, 0.12, 0.3, '#f4f6f7', { material: white });
  const hub = group(head, '0 0 0.13');
  cone(hub, '0 0 0.04', 0.06, 0, 0.12, '#f4f6f7', 16, { rotation: '90 0 0', material: white });
  for (let i = 0; i < 3; i++) {
    const arm = group(hub, '0 0 0', { rotation: v(0, 0, i * 120) });
    // Tapered blade: wide at the root, thin at the tip, slightly pitched.
    cone(arm, '0 0.5 0', 0.045, 0.012, 0.95, '#ffffff', 8, { scale: '1 1 0.25', rotation: '0 12 0', material: white });
  }
  anim(hub, 'spin', { property: 'rotation', to: '0 0 360', loop: true, dur: 2500, easing: 'linear' });
  return g;
}

export function solarPanel(p, x, z, s = 1, ry = 0) {
  const g = group(p, v(x, 0, z), { scale: v(s, s, s), rotation: v(0, ry, 0), 'merge-static': '' });
  const steel = 'color: #95a5a6; metalness: 0.85; roughness: 0.35';
  cyl(g, '-0.35 0.3 0', 0.025, 0.6, '#95a5a6', 10, { material: steel });
  cyl(g, '0.35 0.3 0', 0.025, 0.6, '#95a5a6', 10, { material: steel });
  const panel = group(g, '0 0.65 0', { rotation: '32 0 0' });
  box(panel, '0 0 0', 1.05, 0.04, 0.66, '#b0b7bb', { material: steel });
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      box(panel, v(-0.375 + c * 0.25, 0.022, -0.15 + r * 0.3), 0.23, 0.01, 0.28, '#1a3d6d',
        { material: 'color: #1a3d6d; metalness: 0.5; roughness: 0.15' });
    }
  }
  return g;
}

export function fish(p, color = '#ff8c42', s = 1) {
  const g = group(p, '0 0 0', { scale: v(s, s, s), 'merge-static': '' });
  const skin = `color: ${color}; roughness: 0.35; metalness: 0.2`;
  ball(g, '0 0 0', 0.18, color, { scale: '1.7 1 0.55', material: skin });
  cone(g, '-0.36 0 0', 0.13, 0.01, 0.2, color, 12, { rotation: '0 0 90', scale: '1 1 0.3', material: skin });
  cone(g, '0 0.16 0', 0.08, 0.01, 0.12, color, 10, { scale: '1.6 1 0.2', material: skin });
  [0.06, -0.06].forEach((ez) => {
    ball(g, v(0.2, 0.04, ez), 0.03, '#ffffff', { material: 'color: #ffffff; roughness: 0.2' });
    ball(g, v(0.215, 0.045, ez * 1.12), 0.016, '#111111', { material: 'color: #111111; roughness: 0.1' });
  });
  return g;
}

export function createTeardropGeometry(radius = 0.16, height = 0.36, seg = 24) {
  const pts = [];
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = -radius + t * (radius + height);
    let r;
    if (y <= 0) {
      r = Math.sqrt(Math.max(0, radius * radius - y * y));
    } else {
      const u = 1 - y / height;
      r = radius * Math.pow(Math.max(0, u), 1.55);
    }
    pts.push(new THREE.Vector2(Math.max(0, r), y));
  }
  const geo = new THREE.LatheGeometry(pts, seg);
  geo.computeVertexNormals();
  return geo;
}

export function waterDrop(p, pos, color = '#7a5c2e', s = 1) {
  const g = group(p, pos, { scale: v(s, s, s) });
  const geom = createTeardropGeometry(0.18, 0.40, 24);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.06,
    metalness: 0.15,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  g.setObject3D('mesh', mesh);

  // Soft luminous inner core for liquid depth and refraction
  const coreMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.35
  });
  const core = new THREE.Mesh(createTeardropGeometry(0.12, 0.28, 16), coreMat);
  core.position.y = -0.01;
  g.setObject3D('core', core);

  // Glossy highlight reflection on shoulder
  el(g, 'a-sphere', {
    position: '0.06 0.08 0.08',
    radius: 0.035,
    material: 'color: #ffffff; shader: flat; opacity: 0.75; transparent: true'
  });

  g.setColor = (newColor) => {
    mat.color.set(newColor);
    mat.needsUpdate = true;
    coreMat.color.set(newColor);
    coreMat.needsUpdate = true;
  };

  return g;
}

export function waterFilterStation(p, x, z, s = 1) {
  const g = group(p, v(x, 0, z), { scale: v(s, s, s), 'merge-static': '' });
  const steel = 'color: #718096; metalness: 0.85; roughness: 0.25';
  const darkMetal = 'color: #2d3748; metalness: 0.9; roughness: 0.3';
  const tankMetal = 'color: #e2e8f0; metalness: 0.8; roughness: 0.2';
  const pipeMetal = 'color: #94a3b8; metalness: 0.85; roughness: 0.2';

  // Concrete foundation pad
  box(g, '0 0.05 0', 1.8, 0.1, 1.4, '#7f8c8d', { material: 'color: #7f8c8d; roughness: 0.9' });

  // 4 steel support legs with cross-bracing
  [[-0.65, -0.45], [-0.65, 0.45], [0.65, -0.45], [0.65, 0.45]].forEach(([lx, lz]) => {
    cyl(g, v(lx, 0.45, lz), 0.04, 0.8, '#4a5568', 10, { material: darkMetal });
  });
  // Cross braces
  box(g, '0 0.45 -0.45', 1.3, 0.03, 0.03, '#4a5568', { rotation: '0 0 25', material: darkMetal });
  box(g, '0 0.45 -0.45', 1.3, 0.03, 0.03, '#4a5568', { rotation: '0 0 -25', material: darkMetal });

  // Elevated steel platform
  box(g, '0 0.85 0', 1.6, 0.06, 1.2, '#4a5568', { material: steel });

  // Large main water tank (cylindrical reservoir)
  cyl(g, '-0.25 1.7 0', 0.45, 1.6, '#e2e8f0', 20, { material: tankMetal });
  // Reinforcing rings
  [1.1, 1.7, 2.3].forEach((ry) => {
    cyl(g, v(-0.25, ry, 0), 0.47, 0.04, '#a0aec0', 20, { material: steel });
  });
  // Domed top
  ball(g, '-0.25 2.5 0', 0.45, '#cbd5e1', { scale: '1 0.4 1', material: tankMetal });
  // Top vent / inspection hatch
  cyl(g, '-0.25 2.7 0', 0.12, 0.1, '#718096', 12, { material: steel });

  // Vertical water level sight gauge
  cyl(g, '-0.25 1.7 0.46', 0.02, 1.2, '#38bdf8', 8, { material: 'color: #38bdf8; opacity: 0.8; transparent: true; roughness: 0.1' });

  // Dual multi-stage filtration canisters (mounted on the right)
  // Stage 1: Sand/Sediment filter (deep industrial blue)
  cyl(g, '0.4 1.35 -0.22', 0.15, 0.9, '#1e40af', 16, { material: 'color: #1e40af; metalness: 0.5; roughness: 0.25' });
  cyl(g, '0.4 1.82 -0.22', 0.17, 0.08, '#94a3b8', 16, { material: steel });
  cyl(g, '0.4 0.88 -0.22', 0.17, 0.08, '#94a3b8', 16, { material: steel });

  // Stage 2: Activated Carbon/Purification filter (clean water cyan)
  cyl(g, '0.4 1.35 0.22', 0.15, 0.9, '#0284c7', 16, { material: 'color: #0284c7; metalness: 0.5; roughness: 0.25' });
  cyl(g, '0.4 1.82 0.22', 0.17, 0.08, '#94a3b8', 16, { material: steel });
  cyl(g, '0.4 0.88 0.22', 0.17, 0.08, '#94a3b8', 16, { material: steel });

  // Brass pressure gauges on top of filters
  [-0.22, 0.22].forEach((pz) => {
    cyl(g, v(0.4, 1.95, pz), 0.015, 0.12, '#d97706', 8, { material: 'color: #d97706; metalness: 0.8; roughness: 0.3' });
    cyl(g, v(0.4, 2.02, pz), 0.06, 0.03, '#ffffff', 14, { rotation: '90 0 0', material: 'color: #ffffff; roughness: 0.2' });
  });

  // Piping connecting tank and filters
  cyl(g, '0.1 1.7 0', 0.04, 0.6, '#94a3b8', 10, { rotation: '0 0 90', material: pipeMetal });
  cyl(g, '0.4 1.7 0', 0.035, 0.44, '#94a3b8', 10, { rotation: '90 0 0', material: pipeMetal });

  // Intake pipe running down towards the pond
  cyl(g, '-0.75 1.5 0', 0.04, 0.4, '#94a3b8', 10, { rotation: '0 0 90', material: pipeMetal });
  cyl(g, '-0.95 0.8 0', 0.04, 1.4, '#94a3b8', 10, { material: pipeMetal });

  // Outflow clean water tap with red control valve
  cyl(g, '0.4 0.7 0.45', 0.035, 0.35, '#d97706', 10, { rotation: '90 0 0', material: 'color: #d97706; metalness: 0.85; roughness: 0.25' });
  cyl(g, '0.4 0.55 0.6', 0.03, 0.2, '#d97706', 10, { material: 'color: #d97706; metalness: 0.85; roughness: 0.25' });
  // Red valve wheel
  cyl(g, '0.4 0.77 0.45', 0.08, 0.02, '#dc2626', 12, { rotation: '0 0 0', material: 'color: #dc2626; roughness: 0.4' });

  // Water dispensing stream from spout
  cyl(g, '0.4 0.35 0.6', 0.015, 0.3, '#38bdf8', 8, { material: 'color: #38bdf8; opacity: 0.75; transparent: true; roughness: 0.1' });

  return g;
}
