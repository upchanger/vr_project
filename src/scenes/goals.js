// One builder per SDG. Each builds a small world in `ctx.root`, registers a gaze task with
// `ctx.task(total)` and calls the returned `step()` every time the viewer completes part of it.
//
// Realism comes from: HDRI skies + image-based lighting (ctx.env), Poly Haven PBR ground textures,
// Poly Haven CC0 scanned props (model), and optional Sketchfab GLBs (externalOr) for people,
// houses, turbines, fish, etc. When a Sketchfab model is missing, a code-built stand-in is used.
import {
  v, M, el, group, box, cyl, cone, ball, text, anim, growIn,
  tree, house, person, seatedStudent, turbine, solarPanel, fish,
  waterDrop, waterFilterStation
} from '../lib/build.js';
import { model, texturedGround, texturedMaterial, placeOnTop, externalOr } from '../lib/assets.js';
import { target } from '../lib/gaze.js';

// --- Helpers ------------------------------------------------------------------

// Evenly spread `n` points on an arc in front of the viewer.
function arc(n, radius, spanDeg = 90, centerDeg = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = THREE.MathUtils.degToRad(centerDeg - spanDeg / 2 + (spanDeg * i) / Math.max(1, n - 1));
    pts.push([Math.sin(a) * radius, -Math.cos(a) * radius]);
  }
  return pts;
}

// Yaw (degrees) that makes an object at (x, z) face the viewer at the origin.
const faceViewer = (x, z) => THREE.MathUtils.radToDeg(Math.atan2(-x, -z));

// Sketchfab-or-fallback props.
const P = {
  person: (p, x, z, color = '#e67e22', s = 1) =>
    externalOr(p, 'person', v(x, 0, z), { scale: s, rot: v(0, faceViewer(x, z), 0) }, () => person(p, x, z, color, s)),
  house: (p, x, z, wall, roof, s = 1, ry = 0) =>
    externalOr(p, 'house', v(x, 0, z), { scale: s, rot: v(0, ry, 0) }, () => house(p, x, z, wall, roof, s, ry)),
  tree: (p, x, z, s = 1) =>
    externalOr(p, 'tree', v(x, 0, z), { scale: s }, () => tree(p, x, z, s, '#3f7d3a')),
  turbine: (p, x, z, s = 1) =>
    externalOr(p, 'wind_turbine', v(x, 0, z), { scale: s }, () => turbine(p, x, z, s)),
  solar: (p, x, z, s = 1) =>
    externalOr(p, 'solar_panel', v(x, 0, z), { scale: s, rot: v(0, faceViewer(x, z), 0) }, () => solarPanel(p, x, z, s, faceViewer(x, z))),
  fish: (p, color, s = 1) =>
    externalOr(p, 'fish', '0 0 0', { scale: s }, () => fish(p, color, s)),
  factory: (p, pos, fallback) => externalOr(p, 'factory', pos, {}, fallback),
  building: (p, pos, s, fallback) => externalOr(p, 'city_building', pos, { scale: s }, fallback)
};

// Natural backdrop: a few scanned shrubs and rocks around the scene (kept small for Quest 2).
function backdrop(root, { shrubs = 3, rocks = 2, radius = 9 } = {}) {
  const items = [];
  for (let i = 0; i < shrubs; i++) items.push('shrub');
  for (let i = 0; i < rocks; i++) items.push('rock');
  items.forEach((kind, i) => {
    const a = THREE.MathUtils.degToRad(-150 + (300 * i) / Math.max(1, items.length - 1) + 180);
    const x = Math.sin(a) * radius, z = Math.cos(a) * radius;
    if (kind === 'shrub') model(root, 'shrub_03', v(x, 0, z), { scale: 1.6, rot: v(0, i * 70, 0) });
    else model(root, 'rock_07', v(x, 0, z), { scale: 1.4, rot: v(0, i * 50, 0) });
  });
}

const sparkle = (p, pos, color = '#ffffff') => {
  const [x, y, z] = pos.split(' ').map(Number);
  const s = ball(p, pos, 0.08, color, { material: M(color, `emissive: ${color}; emissiveIntensity: 1`) });
  anim(s, 'up', { property: 'position', to: v(x, y + 1.2, z), dur: 1400 });
  anim(s, 'fade', { property: 'scale', to: '0.01 0.01 0.01', dur: 1400, delay: 400 });
  setTimeout(() => s.parentNode && s.parentNode.removeChild(s), 1900);
};

// Grow an entity in from nothing back to whatever scale it was created with.
const growKeep = (e, dur = 900) => { const s = e.object3D.scale; growIn(e, v(s.x, s.y, s.z), dur); };

// Glossy water material.
const WATER = (color) => `color: ${color}; roughness: 0.08; metalness: 0.2; opacity: 0.88; transparent: true`;

// --- Scenes -------------------------------------------------------------------

export const BUILDERS = {
  // 1 — No Poverty: rebuild tin shacks into safe homes.
  1(ctx) {
    const { root } = ctx;
    ctx.env('day');
    texturedGround(root, 'dry_ground_01');
    backdrop(root, { shrubs: 2, rocks: 3 });
    const step = ctx.task(5);
    const colors = ['#f6d7a7', '#a7d8f6', '#f6a7c1', '#b8f6a7', '#f6eda7'];
    arc(5, 4.4, 84, 0).forEach(([x, z], i) => {
      const ry = faceViewer(x, z);
      const shack = group(root, v(x, 0, z), { rotation: v(0, ry, 0) });
      box(shack, '0 0.38 0', 1, 0.76, 0.9, '#8a8f93', { material: 'color: #8a8f93; metalness: 0.6; roughness: 0.55' });
      box(shack, '0 0.8 0', 1.2, 0.04, 1.05, '#7b6f62', { rotation: '0 0 7', material: 'color: #7b6f62; metalness: 0.7; roughness: 0.6' });
      box(shack, '0.2 0.3 0.46', 0.35, 0.6, 0.02, '#5b4636');
      model(root, i % 2 ? 'old_tyre' : 'cardboard_box_01', v(x + 0.75, 0, z + 0.2), { rot: v(0, i * 40, 0) });
      target(shack, () => {
        root.removeChild(shack);
        growKeep(P.house(root, x, z, colors[i], '#a93226', 1.1, ry));
        growKeep(P.person(root, x + 0.8, z + 0.5, '#2e86de', 0.9));
        step();
      });
    });
  },

  // 2 — Zero Hunger: grow crops on empty farm plots, then harvest fills the baskets.
  2(ctx) {
    const { root } = ctx;
    ctx.env('farm');
    texturedGround(root, 'leafy_grass');
    backdrop(root, { shrubs: 3, rocks: 1 });
    P.house(root, -4.5, -6.5, '#b03a2e', '#5d4037', 1.8, 20);
    const baskets = [model(root, 'wicker_basket_01', '2.6 0 -2.6'), model(root, 'wicker_basket_01', '-2.6 0 -2.6')];
    const step = ctx.task(6);
    let grown = 0;
    const plots = [[-1.3, -3.4], [0, -3.4], [1.3, -3.4], [-1.3, -4.8], [0, -4.8], [1.3, -4.8]];
    plots.forEach(([x, z], i) => {
      const plot = box(root, v(x, 0.05, z), 1.15, 0.1, 1.15, '#6d4c2f', { material: texturedMaterial('farm_soil', 1) });
      target(plot, () => {
        const crop = group(root, v(x, 0.1, z));
        const isCorn = i % 2 === 0;
        for (let a = -1; a <= 1; a++) {
          for (let b = -1; b <= 1; b++) {
            const c = group(crop, v(a * 0.33, 0, b * 0.33), { rotation: v(0, (a + b) * 30, 0) });
            cyl(c, '0 0.25 0', 0.025, 0.5, '#5a8f29', 5);
            cone(c, '0.06 0.3 0', 0.07, 0, 0.22, '#6aa84f', 3, { rotation: '0 0 -50' });
            cone(c, isCorn ? '0 0.55 0' : '0 0.6 0', isCorn ? 0.06 : 0.09, 0.02, 0.22, isCorn ? '#f1c232' : '#e69138', 6);
          }
        }
        growIn(crop, '1 1 1', 1100);
        grown++;
        if (grown % 3 === 0) {
          const bk = baskets[grown / 3 - 1];
          for (let k = 0; k < 3; k++) {
            const apple = model(root, 'food_apple_01', '0 0 0', { scale: 1.2 });
            apple.setAttribute('position', v(bk.object3D.position.x + (k - 1) * 0.08, 0.28, bk.object3D.position.z));
          }
        }
        step();
      });
    });
  },

  // 3 — Good Health: vaccinate people next to the clinic.
  3(ctx) {
    const { root } = ctx;
    ctx.env('clear');
    texturedGround(root, 'leafy_grass');
    backdrop(root);
    const clinic = group(root, '1 0 -7.5', { 'merge-static': '' });
    box(clinic, '0 1.2 0', 4.4, 2.4, 2.2, '#f4f6f6', { material: 'color: #f4f6f6; roughness: 0.7' });
    box(clinic, '0 2.45 0', 4.6, 0.12, 2.4, '#4C9F38');
    box(clinic, '0 1.55 1.12', 0.8, 0.22, 0.02, '#e74c3c');
    box(clinic, '0 1.55 1.12', 0.22, 0.8, 0.02, '#e74c3c');
    box(clinic, '0 0.5 1.11', 0.8, 1, 0.02, '#85c1e9', { material: 'color: #85c1e9; metalness: 0.4; roughness: 0.15' });
    model(root, 'wheelchair_01', '-1.6 0 -6', { rot: '0 30 0' });
    box(root, '2.3 0.4 -3', 0.9, 0.05, 0.6, '#d5d8dc');
    box(root, '2.3 0.2 -3', 0.05, 0.4, 0.5, '#aab7b8');
    model(root, 'medical_box', '2.3 0.43 -3', { rot: '0 -30 0' });
    const step = ctx.task(5);
    arc(5, 3.6, 90, -5).forEach(([x, z]) => {
      const p = P.person(root, x, z, '#95a5a6');
      target(p, () => {
        const body = p.querySelector('.torso');
        if (body) body.setAttribute('material', M('#4C9F38'));
        const heart = ball(root, v(x, 1.4, z), 0.1, '#e74c3c', { material: M('#e74c3c', 'emissive: #e74c3c; emissiveIntensity: 0.6') });
        anim(heart, 'beat', { property: 'scale', to: '1.4 1.4 1.4', dir: 'alternate', loop: true, dur: 450 });
        step();
      });
    });
  },

  // 4 — Quality Education: real school desks; open the books to light up ideas.
  4(ctx) {
    const { root } = ctx;
    ctx.env('clear');
    texturedGround(root, 'gravel_concrete', { repeat: 8 });
    backdrop(root, { shrubs: 3, rocks: 0, radius: 10 });
    model(root, 'standing_chalkboard_01', '0 0 -5.2', { scale: 1.3 });
    const chalk = text(root, 'EDUCATION\nFOR ALL\n\nA B C  1 2 3', '0 1.2 -4.93', { width: 0.85, wrapCount: 11, color: '#f4f6f6' });
    chalk.setAttribute('rotation', '-14 0 0');
    const step = ctx.task(5);
    [[-1.7, -3], [0, -3], [1.7, -3], [-0.85, -4.2], [0.85, -4.2]].forEach(([x, z], i) => {
      const desk = model(root, 'SchoolDesk_01', v(x, 0, z), { rot: '0 180 0' });
      model(root, 'SchoolChair_01', v(x, 0, z + 0.55), { rot: '0 180 0' });
      const book = box(root, v(x, 0.8, z), 0.26, 0.05, 0.2, '#C5192D', { material: 'color: #C5192D; roughness: 0.6' });
      placeOnTop(desk, book, 0.03);
      target(book, () => {
        book.setAttribute('width', 0.48);
        book.setAttribute('height', 0.02);
        book.setAttribute('material', 'color: #fdfefe; roughness: 0.9');
        const bulb = model(root, 'lightbulb_led', v(x, 1.7, z + 0.4), { scale: 3, shadow: false });
        const glow = ball(root, v(x, 1.78, z + 0.4), 0.09, '#f9e79f', { material: M('#f9e79f', 'emissive: #f7dc6f; emissiveIntensity: 1.2; opacity: 0.6; transparent: true') });
        growIn(bulb, '3 3 3');
        growIn(glow);
        const student = seatedStudent(root, x, z + 0.52, ['#e67e22', '#8e44ad', '#2e86de', '#16a085', '#c0392b'][i], 0.85, 180);
        growIn(student, '0.85 0.85 0.85');
        step();
      });
    });
  },

  // 5 — Gender Equality: add opportunity blocks until the seesaw balances.
  5(ctx) {
    const { root } = ctx;
    ctx.env('day');
    texturedGround(root, 'leafy_grass');
    backdrop(root);
    model(root, 'painted_wooden_bench', '-3 0 -4', { rot: '0 50 0' });
    model(root, 'painted_wooden_bench', '3 0 -4', { rot: '0 -50 0' });
    const base = group(root, '0 0 -4');
    cyl(base, '0 0.4 0', 0.12, 0.8, '#7f8c8d', 8, { material: 'color: #7f8c8d; metalness: 0.8; roughness: 0.3' });
    const plank = group(base, '0 0.82 0', { rotation: '0 0 -14' });
    box(plank, '0 0 0', 4, 0.1, 0.5, '#FF3A21', { material: 'color: #FF3A21; roughness: 0.5' });
    externalOr(plank, 'person', '-1.6 0.05 0', { scale: 0.8 }, () => person(plank, -1.6, 0, '#8e44ad', 0.9));
    externalOr(plank, 'person', '1.6 0.05 0', { scale: 0.8 }, () => person(plank, 1.6, 0, '#2e86de', 0.9));
    const step = ctx.task(4);
    let placed = 0;
    [[-2.6, 1.8, -3.2], [-1.6, 2.4, -3.0], [1.6, 2.4, -3.0], [2.6, 1.8, -3.2]].forEach(([x, y, z]) => {
      const blk = model(root, 'cardboard_box_01', v(x, y, z), { scale: 0.8 });
      anim(blk, 'bob', { property: 'position', to: v(x, y + 0.15, z), dir: 'alternate', loop: true, dur: 1200, easing: 'easeInOutSine' });
      text(blk, 'OPPORTUNITY', '0 0.5 0', { width: 1.2, wrapCount: 14, color: '#ffffff' });
      target(blk, () => {
        root.removeChild(blk);
        const nb = model(plank, 'cardboard_box_01', v(-1.05 - (placed % 2) * 0.35, 0.05 + Math.floor(placed / 2) * 0.3, 0), { scale: 0.55 });
        growIn(nb, '0.55 0.55 0.55');
        placed++;
        anim(plank, 'tilt', { property: 'rotation', to: v(0, 0, -14 + placed * 3.5), dur: 900 });
        step();
      });
    });
  },

  // 6 — Clean Water: filter the dirty pond.
  6(ctx) {
    const { root } = ctx;
    ctx.env('clear');
    texturedGround(root, 'leafy_grass');
    backdrop(root, { shrubs: 3, rocks: 3 });

    // Pond rim and embankment: soil bed + water surface
    cyl(root, '0 0.02 -4.6', 2.5, 0.04, '#6b5a43', 24, { material: texturedMaterial('farm_soil', 2) });
    const pond = cyl(root, '0 0.06 -4.6', 2.3, 0.04, '#7a5c2e', 32, { material: WATER('#7a5c2e') });

    // Decorative river stones bordering the pond rim
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rx = Math.sin(a) * 2.38;
      const rz = -4.6 + Math.cos(a) * 2.38;
      const stoneColor = i % 3 === 0 ? '#64748b' : i % 3 === 1 ? '#475569' : '#78716c';
      ball(root, v(rx, 0.06, rz), 0.12 + (i % 4) * 0.02, stoneColor, {
        scale: `1.2 0.5 ${0.9 + (i % 2) * 0.3}`,
        material: `color: ${stoneColor}; roughness: 0.9`
      });
    }
    model(root, 'rock_07', '-2.6 0 -4.6', { scale: 0.9, rot: '0 30 0' });
    model(root, 'rock_07', '2.2 0 -5.8', { scale: 0.75, rot: '0 110 0' });

    // Multi-stage Water Filtration & Purification Station model
    waterFilterStation(root, 3.2, -5.2, 1.15);

    // Clean water containers around the station
    model(root, 'plastic_bottle_gallon', '3.65 0 -4.5', { scale: 1.1, rot: '0 -25 0' });
    model(root, 'wooden_bucket_01', '2.8 0 -3.6');
    model(root, 'plastic_jerrycan', '-2.9 0 -3.6', { rot: '0 40 0' });
    model(root, 'plastic_crate_02', '4.3 0 -4.7', { scale: 0.95, rot: '0 20 0' });

    const colors = ['#6f6a3a', '#5d8a6a', '#4aa7b8', '#26BDE2'];
    const step = ctx.task(4);
    let done = 0;

    // 4 floating organic teardrop water droplets
    [[-1.6, 1.5, -3.2], [-0.5, 1.9, -3.0], [0.6, 1.9, -3.0], [1.6, 1.5, -3.2]].forEach(([x, y, z]) => {
      const drop = waterDrop(root, v(x, y, z), '#7a5c2e', 1.1);
      anim(drop, 'bob', { property: 'position', to: v(x, y + 0.12, z), dir: 'alternate', loop: true, dur: 1100, easing: 'easeInOutSine' });
      anim(drop, 'pulse', { property: 'scale', to: '1.04 1.16 1.04', dir: 'alternate', loop: true, dur: 1400, easing: 'easeInOutSine' });

      target(drop, () => {
        drop.setColor('#26BDE2');
        anim(drop, 'pop', { property: 'scale', to: '1.3 0.9 1.3', dur: 220, easing: 'easeOutBack' });
        setTimeout(() => {
          anim(drop, 'restore', { property: 'scale', to: '1.1 1.1 1.1', dur: 300, easing: 'easeOutSine' });
        }, 220);
        pond.setAttribute('material', WATER(colors[done]));
        done++;
        if (done === 4) {
          // Multi-jet bubbling fountain with rising splash droplets
          const center = '0 0.3 -4.6';
          const fountain = cyl(root, center, 0.08, 0.9, '#d6f4fb', 16, { material: WATER('#d6f4fb') });
          anim(fountain, 'spray', { property: 'scale', to: '1.2 3.2 1.2', dir: 'alternate', loop: true, dur: 650 });
          for (let s = 0; s < 6; s++) {
            const sa = (s / 6) * Math.PI * 2;
            const jet = ball(root, v(Math.sin(sa) * 0.25, 0.15, -4.6 + Math.cos(sa) * 0.25), 0.06, '#e0f7fa', { material: WATER('#e0f7fa') });
            anim(jet, 'bob', { property: 'position', to: v(Math.sin(sa) * 0.35, 0.55, -4.6 + Math.cos(sa) * 0.35), dir: 'alternate', loop: true, dur: 500 + s * 80 });
          }
        }
        step();
      });
    });
  },

  // 7 — Clean Energy: install solar panels and wind turbines to light the village at dusk.
  7(ctx) {
    const { root } = ctx;
    ctx.env('dusk');
    texturedGround(root, 'leafy_grass');
    backdrop(root, { shrubs: 2, rocks: 2, radius: 11 });
    // Lamps "switch on" with glowing bulbs + a soft halo instead of real point lights, which
    // would make every surface more expensive to draw on Quest and force shader recompiles.
    const lamps = [];
    [[-3.2, -8], [-1.1, -8.6], [1.1, -8.6], [3.2, -8], [5, -6.8]].forEach(([x, z]) => {
      P.house(root, x, z, '#d5c4a1', '#7b241c', 1.3, faceViewer(x, z));
      lamps.push(model(root, 'street_lamp_01', v(x - 0.9, 0, z + 0.9), { scale: 0.8 }));
    });
    const lightUp = (lamp) => {
      const b = new THREE.Box3().setFromObject(lamp.object3D);
      const pos = v((b.min.x + b.max.x) / 2, b.max.y - 0.38, (b.min.z + b.max.z) / 2);
      ball(root, pos, 0.1, '#ffe8a3', { material: 'color: #ffe8a3; emissive: #ffd27f; emissiveIntensity: 2' });
      const halo = ball(root, pos, 0.42, '#ffd27f', { material: 'color: #ffd27f; emissive: #ffd27f; emissiveIntensity: 1; opacity: 0.18; transparent: true; depthWrite: false' });
      growIn(halo);
    };
    model(root, 'portable_generator', '-2.6 0 -2.8', { rot: '0 40 0' });
    const step = ctx.task(5);
    let lit = 0;
    arc(5, 3.8, 100, 10).forEach(([x, z], i) => {
      const pad = cyl(root, v(x, 0.03, z), 0.5, 0.06, '#7f8c8d', 16, { material: texturedMaterial('gravel_concrete', 1) });
      target(pad, () => {
        const g = i % 2 === 0 ? P.solar(root, x, z, 1.2) : P.turbine(root, x, z, 1);
        growKeep(g);
        lightUp(lamps[lit]);
        lit++;
        if (lit === 5) ctx.env('day');
        step();
      });
    });
  },

  // 8 — Decent Work: start the factory gears and give workers safety gear.
  8(ctx) {
    const { root } = ctx;
    ctx.env('overcast');
    texturedGround(root, 'gravel_concrete', { repeat: 10 });
    P.factory(root, '0 0 -8', () => {
      const f = group(root, '0 0 -8', { 'merge-static': '' });
      box(f, '0 1.3 0', 5.5, 2.6, 2.2, '#A21942', { material: 'color: #8e3b46; roughness: 0.8' });
      box(f, '0 2.65 0', 5.7, 0.1, 2.4, '#5d6d7e', { material: 'color: #5d6d7e; metalness: 0.7; roughness: 0.4' });
      cyl(f, '-1.6 3.3 0', 0.25, 1.4, '#7f8c8d', 12, { material: 'color: #7f8c8d; metalness: 0.6; roughness: 0.5' });
      cyl(f, '1.6 3.3 0', 0.25, 1.4, '#7f8c8d', 12, { material: 'color: #7f8c8d; metalness: 0.6; roughness: 0.5' });
      return f;
    });
    model(root, 'metal_toolbox', '-2.8 0 -3.4', { rot: '0 30 0' });
    model(root, 'concrete_road_barrier_02', '3.4 0 -4', { rot: '0 -60 0' });
    model(root, 'plastic_crate_02', '2.6 0 -2.8', { rot: '0 20 0' });
    const workers = [];
    [[-2, -4.5], [-0.7, -4.9], [0.7, -4.9], [2, -4.5]].forEach(([x, z]) => workers.push(P.person(root, x, z, '#5d6d7e')));
    const step = ctx.task(4);
    [[-1.8, 1.7, -3], [-0.6, 2.1, -3], [0.6, 2.1, -3], [1.8, 1.7, -3]].forEach(([x, y, z], i) => {
      const gear = group(root, v(x, y, z), { rotation: '90 0 0' });
      const metal = 'color: #95a5a6; metalness: 0.9; roughness: 0.3';
      // Gear: a wheel plus four crossed bars that read as eight teeth (5 parts instead of 9).
      cyl(gear, '0 0 0', 0.3, 0.1, '#95a5a6', 24, { material: metal });
      cyl(gear, '0 0 0', 0.08, 0.14, '#7f8c8d', 16, { material: metal });
      for (let k = 0; k < 4; k++) box(gear, '0 0 0', 0.12, 0.1, 0.78, '#95a5a6', { rotation: v(0, k * 45, 0), material: metal });
      target(gear, () => {
        anim(gear, 'spin', { property: 'rotation', to: '90 360 0', loop: true, dur: 2000, easing: 'linear' });
        gear.querySelectorAll('a-cylinder, a-box').forEach((g) => g.setAttribute('material', 'color: #d4ac0d; metalness: 0.9; roughness: 0.25'));
        const w = workers[i];
        const body = w.querySelector('.torso');
        if (body) {
          body.setAttribute('material', M('#e67e22'));
          growIn(ball(w, '0 1.07 0', 0.125, '#f1c40f', { 'theta-length': 90, material: 'color: #f1c40f; roughness: 0.35' }));
        }
        sparkle(root, v(x, y, z), '#f4d03f');
        step();
      });
    });
  },

  // 9 — Industry, Innovation, Infrastructure: build a bridge across the river.
  9(ctx) {
    const { root } = ctx;
    ctx.env('day');
    texturedGround(root, 'leafy_grass');
    backdrop(root, { shrubs: 2, rocks: 3, radius: 10 });
    box(root, '0 0.02 -5', 90, 0.05, 3, '#2e86c1', { material: WATER('#2e6f8e') });
    box(root, '0 0.15 -3.1', 6, 0.3, 0.8, '#95a5a6', { material: texturedMaterial('gravel_concrete', 2) });
    box(root, '0 0.15 -6.9', 6, 0.3, 0.8, '#95a5a6', { material: texturedMaterial('gravel_concrete', 2) });
    model(root, 'concrete_road_barrier_02', '-2.8 0.3 -3.1');
    model(root, 'concrete_road_barrier_02', '2.8 0.3 -3.1');
    model(root, 'rock_07', '-4.5 0 -5', { scale: 0.8 });
    const tower = group(root, '4.5 0 -9');
    cyl(tower, '0 2 0', 0.08, 4, '#7f8c8d', 8, { material: 'color: #7f8c8d; metalness: 0.8; roughness: 0.3' });
    const step = ctx.task(5);
    let built = 0;
    [-2, -1, 0, 1, 2].forEach((x) => {
      const ghost = box(root, v(x, 0.4, -5), 0.95, 0.15, 3.4, '#ffffff', { material: 'color: #ffd2b8; opacity: 0.55; transparent: true' });
      target(ghost, () => {
        ghost.setAttribute('material', texturedMaterial('asphalt_02', 1));
        growIn(ghost);
        built++;
        if (built === 5) {
          const sig = el(tower, 'a-torus', { position: '0 4 0', radius: 0.4, 'radius-tubular': 0.03, rotation: '90 0 0', material: M('#FD6925', 'emissive: #FD6925') });
          anim(sig, 'pulse', { property: 'scale', to: '3 3 3', loop: true, dur: 1500 });
          const car = box(root, '-2.2 0.62 -5', 0.35, 0.25, 0.6, '#2e86de', { material: 'color: #2e86de; metalness: 0.6; roughness: 0.25' });
          anim(car, 'drive', { property: 'position', to: '2.2 0.62 -5', dir: 'alternate', loop: true, dur: 4000, easing: 'easeInOutSine' });
        }
        step();
      });
    });
  },

  // 10 — Reduced Inequalities: even out the columns.
  10(ctx) {
    const { root } = ctx;
    ctx.env('clear');
    texturedGround(root, 'gravel_concrete', { repeat: 10 });
    backdrop(root);
    const heights = [0.4, 2.4, 0.7, 1.8, 0.5];
    const avg = heights.reduce((a, b) => a + b, 0) / heights.length;
    const step = ctx.task(5);
    arc(5, 4, 80, 0).forEach(([x, z], i) => {
      const col = box(root, v(x, heights[i] / 2, z), 0.6, heights[i], 0.6, '#DD1367', { material: 'color: #DD1367; roughness: 0.35; metalness: 0.1' });
      P.person(root, x, z + 0.7, '#ffffff', 0.8);
      target(col, () => {
        anim(col, 'h', { property: 'geometry.height', to: avg, dur: 900 });
        anim(col, 'p', { property: 'position', to: v(x, avg / 2, z), dur: 900 });
        col.setAttribute('material', 'color: #f06292; roughness: 0.35; metalness: 0.1');
        step();
      });
    });
  },

  // 11 — Sustainable Cities: green the rooftops of a real street.
  11(ctx) {
    const { root } = ctx;
    ctx.env('day');
    texturedGround(root, 'gravel_concrete', { repeat: 10 });
    box(root, '0 0.01 -3', 16, 0.02, 1.6, '#34495e', { material: texturedMaterial('asphalt_02', 4) });
    [-4.6, 4.6].forEach((x) => model(root, 'street_lamp_01', v(x, 0, -4.1), { scale: 0.8 }));
    model(root, 'painted_wooden_bench', '-4.4 0 -2', { rot: '0 70 0' });
    model(root, 'planter_box_01', '4.4 0 -2');
    const bus = group(root, '-7 0 -3');
    box(bus, '0 0.55 0', 2, 0.8, 0.7, '#27ae60', { material: 'color: #27ae60; metalness: 0.5; roughness: 0.3' });
    box(bus, '0 0.75 0.36', 1.7, 0.3, 0.01, '#1b2631', { material: 'color: #1b2631; metalness: 0.6; roughness: 0.1' });
    anim(bus, 'drive', { property: 'position', to: '7 0 -3', dir: 'alternate', loop: true, dur: 9000, easing: 'easeInOutSine' });
    const step = ctx.task(5);
    // Kept below eye height so every rooftop is visible from where the viewer stands.
    [[-2.8, -5, 1.1], [-1.3, -5.4, 1.4], [0.2, -5, 0.8], [1.7, -5.4, 1.3], [3.2, -5, 1.0]].forEach(([x, z, h]) => {
      P.building(root, v(x, 0, z), 1, () => {
        const b = box(root, v(x, h / 2, z), 1.2, h, 1.2, '#b2babb', { material: 'color: #c9c6bd; roughness: 0.85' });
        for (let r = 0.35; r < h - 0.2; r += 0.4) box(b, v(0, r - h / 2, 0.61), 0.8, 0.15, 0.02, '#5dade2', { material: 'color: #5d8aa8; metalness: 0.6; roughness: 0.1' });
        return b;
      });
      const roof = box(root, v(x, h + 0.04, z), 1.2, 0.08, 1.2, '#7b7d7d');
      target(roof, () => {
        roof.setAttribute('material', texturedMaterial('leafy_grass', 1));
        const s = model(root, 'shrub_03', v(x, h + 0.08, z), { scale: 0.6 });
        growIn(s, '0.6 0.6 0.6');
        step();
      });
    });
  },

  // 12 — Responsible Consumption: sort real waste into the right bins.
  12(ctx) {
    const { root } = ctx;
    ctx.env('farm');
    texturedGround(root, 'leafy_grass');
    backdrop(root);
    const bins = { paper: [-1.5, '#2e86de'], glass: [0, '#27ae60'], plastic: [1.5, '#f1c40f'] };
    for (const [name, [x, color]] of Object.entries(bins)) {
      cyl(root, v(x, 0.45, -5), 0.4, 0.9, color, 20, { material: `color: ${color}; roughness: 0.45` });
      text(root, name.toUpperCase(), v(x, 1.15, -5), { width: 2, color: '#1b2631' });
    }
    const glass = (pos, c) => cyl(root, pos, 0.07, 0.36, c, 16, { material: `color: ${c}; roughness: 0.05; metalness: 0.1; opacity: 0.75; transparent: true` });
    const items = [
      ['paper', () => model(root, 'cardboard_box_01', '-2.5 0 -3', { scale: 0.6 })],
      ['glass', () => glass('-1.4 0.18 -2.6', '#58d68d')],
      ['plastic', () => model(root, 'plastic_bottle_gallon', '-0.4 0 -2.8')],
      ['plastic', () => model(root, 'trashbag', '0.7 0 -2.7', { scale: 0.8 })],
      ['glass', () => glass('1.6 0.18 -2.8', '#1e8449')],
      ['plastic', () => model(root, 'plastic_crate_02', '2.6 0 -3', { scale: 0.6 })]
    ];
    const step = ctx.task(items.length);
    items.forEach(([kind, make]) => {
      const it = make();
      target(it, () => {
        anim(it, 'toss', { property: 'position', to: v(bins[kind][0], 1.0, -5), dur: 700 });
        anim(it, 'shrink', { property: 'scale', to: '0.01 0.01 0.01', dur: 400, delay: 650 });
        setTimeout(() => sparkle(root, v(bins[kind][0], 1, -5), '#7dcea0'), 700);
        step();
      });
    });
  },

  // 13 — Climate Action: swap smokestacks for clean power; the sea falls back.
  13(ctx) {
    const { root } = ctx;
    ctx.env('overcast');
    texturedGround(root, 'dry_ground_01');
    model(root, 'rock_07', '-5 0 -4', { scale: 1.3 });
    model(root, 'quiver_tree_02', '5 0 -5.5', { scale: 0.9 });
    const sea = box(root, '0 0.55 -9.5', 90, 1.1, 6, '#2471a3', { material: WATER('#2b5d7d') });
    [[-3, -6.4], [-1.5, -6.6], [0, -6.4], [1.5, -6.6], [3, -6.4]].forEach(([x, z]) => P.house(root, x, z, '#f0e6d2', '#a04000', 0.9));
    const thermo = group(root, '4.2 0 -3');
    cyl(thermo, '0 1 0', 0.08, 1.6, '#ecf0f1', 12, { material: 'color: #ecf0f1; roughness: 0.1; opacity: 0.6; transparent: true' });
    const mercury = cyl(thermo, '0 0.7 0', 0.05, 1, '#e74c3c', 12);
    ball(thermo, '0 0.2 0', 0.14, '#e74c3c');
    const step = ctx.task(4);
    let fixed = 0;
    [[-2.8, -3.8], [-1, -3.4], [1, -3.4], [2.8, -3.8]].forEach(([x, z]) => {
      const stack = group(root, v(x, 0, z));
      const brick = texturedMaterial('gravel_concrete', 1);
      const chimney = cyl(stack, '0 0.5 0', 0.2, 1, '#5d6d7e', 16, { material: brick });
      for (let k = 0; k < 3; k++) {
        const smoke = el(stack, 'a-sphere', { position: v(0, 1.2 + k * 0.3, 0), radius: 0.18 + k * 0.06, 'segments-width': 10, 'segments-height': 8, material: 'color: #4d5656; opacity: 0.55; transparent: true; roughness: 1' });
        anim(smoke, 'rise', { property: 'position', to: v(0.2 * k, 1.9 + k * 0.4, 0), dir: 'alternate', loop: true, dur: 1600 + k * 300, easing: 'easeInOutSine' });
      }
      target(chimney, () => {
        root.removeChild(stack);
        growKeep(P.turbine(root, x, z, 0.9));
        fixed++;
        const k = fixed / 4;
        anim(sea, 'fall', { property: 'position', to: v(0, 0.55 - k * 0.5, -9.5), dur: 1200 });
        anim(mercury, 'cool', { property: 'scale', to: v(1, 1 - k * 0.6, 1), dur: 1200 });
        if (fixed === 4) ctx.env('clear');
        step();
      });
    });
  },

  // 14 — Life Below Water: remove real plastic waste from the sea floor.
  14(ctx) {
    const { root } = ctx;
    ctx.env(null, '#0b4f7a');
    ctx.fog('#0b4f7a', 3, 20);
    texturedGround(root, 'coast_sand_01', { color: '#c9d9e0' });
    model(root, 'rock_07', '-3 0 -5', { scale: 1.2 });
    model(root, 'rock_07', '3.5 0 -6', { scale: 0.9, rot: '0 120 0' });
    model(root, 'lambis_shell', '0.8 0 -2.4', { scale: 2 });
    model(root, 'lambis_shell', '-1.4 0 -3', { scale: 1.6, rot: '0 90 0' });
    model(root, 'ocean_buoy', '2 4.5 -6');
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, r = 3.5 + (i % 4) * 1.5;
      const weed = cone(root, v(Math.sin(a) * r, 0.7, -Math.cos(a) * r), 0.1, 0, 1.4, i % 2 ? '#1e8449' : '#a93226', 8);
      anim(weed, 'sway', { property: 'rotation', to: '0 0 10', dir: 'alternate', loop: true, dur: 1800 + i * 90, easing: 'easeInOutSine' });
    }
    const school = group(root, '0 1.8 -5', { orbit: 'speed: 18' });
    const addFish = (r, y, color) => {
      const holder = group(school, v(r, y, 0), { rotation: '0 180 0' });
      growKeep(P.fish(holder, color, 1));
    };
    addFish(2.5, 0, '#ff8c42');
    const step = ctx.task(6);
    const colors = ['#f4d03f', '#5dade2', '#af7ac5', '#ff6f61', '#48c9b0', '#f5b041'];
    const trash = [
      ['plastic_bottle_gallon', [-2, 1.4, -3], 1],
      ['trashbag', [-1, 2.2, -3.5], 0.7],
      ['plastic_jerrycan', [0, 1.2, -2.8], 0.8],
      ['plastic_crate_02', [1, 2.4, -3.4], 0.5],
      ['plastic_bottle_gallon', [2, 1.5, -3], 1],
      ['old_tyre', [0.3, 3, -4], 0.8]
    ];
    trash.forEach(([id, [x, y, z], s], i) => {
      const it = model(root, id, v(x, y, z), { scale: s, rot: v(i * 35, i * 50, 25) });
      anim(it, 'float', { property: 'position', to: v(x, y + 0.2, z), dir: 'alternate', loop: true, dur: 1600, easing: 'easeInOutSine' });
      target(it, () => {
        root.removeChild(it);
        addFish(1.5 + (i % 3) * 0.7, (i % 2) * 0.6 - 0.3, colors[i]);
        step();
      });
    });
  },

  // 15 — Life on Land: plant trees on bare, logged land.
  15(ctx) {
    const { root } = ctx;
    ctx.env('clear');
    const land = texturedGround(root, 'dry_ground_01');
    [[-4, -7], [-1.5, -8], [1.5, -7.5], [4, -8]].forEach(([x, z], i) => model(root, 'tree_stump_01', v(x, 0, z), { rot: v(0, i * 80, 0) }));
    model(root, 'rock_07', '-5 0 -3', { scale: 1.1 });
    const step = ctx.task(6);
    let planted = 0;
    [[-2.4, -3], [-1, -3.6], [0.6, -3.2], [2, -3.6], [-1.6, -5], [1.4, -5.2]].forEach(([x, z], i) => {
      const soil = cyl(root, v(x, 0.03, z), 0.45, 0.06, '#5d4037', 16, { material: texturedMaterial('farm_soil', 1) });
      target(soil, () => {
        const t = externalOr(root, 'tree', v(x, 0, z), { scale: 1 }, () => tree(root, x, z, 1.25 + (i % 3) * 0.15, i % 2 ? '#3f7d3a' : '#2f6b34'));
        growKeep(t, 1400);
        planted++;
        if (planted === 3) land.setAttribute('material', 'color', '#cfe0a8');
        if (planted === 6) {
          root.removeChild(land);
          texturedGround(root, 'leafy_grass');
          growIn(model(root, 'quiver_tree_02', '0 0 -7.5', { scale: 1.2 }), '1.2 1.2 1.2', 1800);
          const birds = group(root, '0 3.5 -4', { orbit: 'speed: 40' });
          [0, 1, 2].forEach((b) => growIn(cone(birds, v(1.5 + b * 0.4, b * 0.2, 0), 0.1, 0, 0.3, '#34495e', 3, { rotation: '0 0 -90' })));
        }
        step();
      });
    });
  },

  // 16 — Peace, Justice and Strong Institutions: set the doves free.
  16(ctx) {
    const { root } = ctx;
    ctx.env('clear');
    texturedGround(root, 'gravel_concrete', { repeat: 10 });
    backdrop(root, { shrubs: 3, rocks: 0 });
    const court = group(root, '0 0 -8', { 'merge-static': '' });
    const marble = 'color: #f2f3f4; roughness: 0.3; metalness: 0';
    box(court, '0 0.15 0', 6, 0.3, 2.5, '#ecf0f1', { material: marble });
    for (let i = -2; i <= 2; i++) cyl(court, v(i * 1.2, 1.4, 1), 0.18, 2.2, '#fdfefe', 16, { material: marble });
    box(court, '0 2.6 0.6', 6.2, 0.2, 1.4, '#ecf0f1', { material: marble });
    el(court, 'a-triangle', { position: '0 2.7 1.31', 'vertex-a': '0 0.9 0', 'vertex-b': '-3.1 0 0', 'vertex-c': '3.1 0 0', material: 'color: #00689D; side: double; roughness: 0.4' });
    [[-2.4, -5.5], [2.4, -5.5]].forEach(([x, z]) => {
      box(root, v(x, 0.5, z), 0.5, 1, 0.5, '#e5e7e9', { material: marble });
      model(root, 'marble_bust_01', v(x, 1, z), { scale: 1.2, rot: v(0, faceViewer(x, z), 0) });
    });
    const step = ctx.task(5);
    arc(5, 3.4, 90, 0).forEach(([x, z], i) => {
      const dove = externalOr(root, 'dove', v(x, 0.25, z), { rot: v(0, faceViewer(x, z), 0) }, () => {
        const d = group(root, v(x, 0.25, z), { 'merge-static': '' });
        const feather = 'color: #ffffff; roughness: 0.9';
        el(d, 'a-sphere', { radius: 0.18, scale: '1.4 0.9 0.9', 'segments-width': 12, 'segments-height': 8, material: feather });
        el(d, 'a-sphere', { position: '0.24 0.1 0', radius: 0.1, 'segments-width': 10, 'segments-height': 8, material: feather });
        cone(d, '0.36 0.1 0', 0.03, 0, 0.08, '#f39c12', 6, { rotation: '0 0 -90' });
        box(d, '0 0.08 0.18', 0.25, 0.02, 0.25, '#f4f6f7', { rotation: '30 0 0', material: feather });
        box(d, '0 0.08 -0.18', 0.25, 0.02, 0.25, '#f4f6f7', { rotation: '-30 0 0', material: feather });
        return d;
      });
      target(dove, () => {
        anim(dove, 'fly', { property: 'position', to: v(x * 2, 7 + i, z * 2 - 4), dur: 3500, easing: 'easeInQuad' });
        setTimeout(() => dove.parentNode && dove.parentNode.removeChild(dove), 3600);
        step();
      });
    });
  },

  // 17 — Partnerships: connect partners to the globe.
  17(ctx) {
    const { root } = ctx;
    ctx.env(null, '#0d2a40');
    texturedGround(root, 'gravel_concrete', { repeat: 10, color: '#8899aa' });
    const center = [0, 1.8, -5];
    const globe = el(root, 'a-sphere', { position: v(...center), radius: 0.9, 'segments-width': 32, 'segments-height': 24, material: 'color: #2e86de; roughness: 0.35; metalness: 0.1' });
    ball(globe, '0.4 0.4 0.6', 0.4, '#58d68d');
    ball(globe, '-0.5 -0.2 0.55', 0.35, '#58d68d');
    anim(globe, 'spin', { property: 'rotation', to: '0 360 0', loop: true, dur: 20000, easing: 'linear' });
    const partners = ['Governments', 'Business', 'Science', 'Communities', 'Youth', 'NGOs'];
    const step = ctx.task(partners.length);
    let joined = 0;
    partners.forEach((name, i) => {
      const a = (i / partners.length) * Math.PI * 2;
      const pos = [center[0] + Math.cos(a) * 2.6, center[1] + Math.sin(a) * 1.3, center[2] + 0.6];
      const node = el(root, 'a-octahedron', { position: v(...pos), radius: 0.25, material: 'color: #5d6d7e; metalness: 0.8; roughness: 0.25' });
      text(root, name, v(pos[0], pos[1] - 0.42, pos[2]), { width: 2 });
      target(node, () => {
        node.setAttribute('material', 'color: #f4d03f; emissive: #f4d03f; emissiveIntensity: 0.6; metalness: 0.8; roughness: 0.25');
        el(root, 'a-entity', { [`line__${i}`]: `start: ${v(...pos)}; end: ${v(...center)}; color: #f4d03f` });
        joined++;
        if (joined === partners.length) {
          const ring = group(root, v(...center), { orbit: 'speed: 25' });
          for (let k = 0; k < 17; k++) {
            const b = (k / 17) * Math.PI * 2;
            const c = ctx.allColors[k];
            growIn(ball(ring, v(Math.cos(b) * 1.5, 0, Math.sin(b) * 1.5), 0.12, c, { material: M(c, `emissive: ${c}; emissiveIntensity: 0.5`) }));
          }
        }
        step();
      });
    });
  }
};
