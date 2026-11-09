import * as THREE from '../vendor/three.module.min.js';
import { buildPerson } from './avatar.js';
import { SAJU_TOPICS } from './config.js';

// ────────────────────────────────────────────────
// 「유림거사 서재」 월드
//   골목(남, z+) → 마당 → 한옥 서재(북, z-)
//   서재 안: 왼쪽 유림거사(사주) · 오른쪽 타로 선생 · 뒷벽 일진 족자
// ────────────────────────────────────────────────

const PLATFORM_H = 0.45;

// 걸을 수 있는 영역(사각형)과 장애물(AABB) — [x1, z1, x2, z2]
export const WALK_RECTS = [
  [-2.7, 3.6, 2.7, 21.5],    // 골목
  [-8.7, -4.3, 8.7, 3.9],    // 마당
  [-7.5, -13.3, 7.5, -4.0],  // 서재 마루
];
export const OBSTACLES = [
  [-4.3, -11.0, -1.7, -8.6], // 유림거사 서안 + 자리
  [-7.3, -13.4, -0.6, -12.95], // 분야별 진열장(뒷벽)
  [2.45, -11.2, 4.55, -8.3], // 타로 테이블
  [-7.6, -11.8, -6.3, -8.2], // 책장
  [-4.3, -4.5, -3.7, -3.9],  // 앞 기둥
  [3.7, -4.5, 4.3, -3.9],
  [-7.6, -5.6, -6.6, -4.6],  // 실내 등
  [6.6, -5.6, 7.6, -4.6],
  [2.2, 2.4, 3.1, 3.4],      // 동자
  [-8.2, 1.8, -6.8, 3.2],    // 소나무
  [6.8, 1.8, 8.2, 3.2],
];

export function heightAt(x, z) {
  if (z < -3.9 && Math.abs(x) < 8.2) return PLATFORM_H;
  if (z < -3.3 && Math.abs(x) < 2.1) return 0.24; // 디딤돌
  return 0;
}

const R = 0.28; // 캐릭터 반경
export function walkable(x, z) {
  let inside = false;
  for (const [x1, z1, x2, z2] of WALK_RECTS) {
    if (x >= x1 && x <= x2 && z >= z1 && z <= z2) { inside = true; break; }
  }
  if (!inside) return false;
  for (const [x1, z1, x2, z2] of OBSTACLES) {
    if (x > x1 - R && x < x2 + R && z > z1 - R && z < z2 + R) return false;
  }
  return true;
}
export const inAlley = (z) => z > 3.95;

// ── 재질 · 텍스처 도우미 ─────────────────────────
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

function rand(seed) { // 결정적 난수(매번 같은 돌바닥)
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const flagstoneTex = () => canvasTex(512, 512, (g, w, h) => {
  const r = rand(7);
  g.fillStyle = '#26272b'; g.fillRect(0, 0, w, h);
  const rows = 6;
  for (let y = 0; y < rows; y++) {
    let x = -r() * 60;
    while (x < w) {
      const sw = 70 + r() * 90;
      const v = 58 + Math.floor(r() * 26);
      g.fillStyle = `rgb(${v},${v - 2},${v - 6})`;
      g.fillRect(x + 3, y * (h / rows) + 3, sw - 6, h / rows - 6);
      x += sw;
    }
  }
}, [2, 6]);

const earthTex = () => canvasTex(256, 256, (g, w, h) => {
  const r = rand(3);
  g.fillStyle = '#4a4338'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1600; i++) {
    const v = 60 + Math.floor(r() * 40);
    g.fillStyle = `rgba(${v + 10},${v + 4},${v - 8},0.55)`;
    g.fillRect(r() * w, r() * h, 2, 2);
  }
}, [6, 3]);

const maruTex = () => canvasTex(512, 512, (g, w, h) => {
  const r = rand(11);
  for (let i = 0; i < 16; i++) {
    const v = 92 + Math.floor(r() * 26);
    g.fillStyle = `rgb(${v + 26},${v - 6},${v - 40})`;
    g.fillRect(i * 32, 0, 32, h);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(i * 32, 0, 2, h);
    g.fillRect(i * 32, r() * h, 32, 2);
  }
}, [4, 3]);

const latticeTex = () => canvasTex(256, 192, (g, w, h) => {
  g.fillStyle = '#ffd99a'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#5a3520'; g.lineWidth = 5;
  for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.lineWidth = 12; g.strokeRect(0, 0, w, h);
});

function textTex(lines, { w = 1024, h = 256, bg = '#1c140e', fg = '#e7c98f', font = 'serif', size = 110, vertical = false, border = '#b48a4a' } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = border; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (vertical) {
      const chars = [...lines[0]];
      g.font = `700 ${size}px ${font}`;
      chars.forEach((ch, i) => g.fillText(ch, w / 2, h * 0.16 + i * size * 1.08));
      if (lines[1]) { g.font = `600 ${size * 0.42}px ${font}`; g.fillStyle = '#9a3a2e'; g.fillText(lines[1], w / 2, h * 0.9); }
    } else {
      lines.forEach((ln, i) => {
        g.font = `700 ${i === 0 ? size : size * 0.45}px ${font}`;
        g.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 0.85);
      });
    }
  });
}

// ── 소품 ─────────────────────────────────────────
function box(w, h, d, color, x, y, z, extra) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? std(color, extra) : color);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function lantern(x, y, z, color = '#ff9f55') {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 12),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 1 }));
  const capMat = std('#2b1d14');
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.08, 12), capMat);
  top.position.y = 0.25;
  const bot = top.clone(); bot.position.y = -0.25; bot.rotation.x = Math.PI;
  g.add(paper, top, bot);
  g.position.set(x, y, z);
  g.userData.paper = paper;
  return g;
}

function pine(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 1.6, 7), std('#4a3022'));
  trunk.position.y = 0.8; trunk.rotation.z = 0.12;
  g.add(trunk);
  [[0.95, 1.3, 1.6], [0.75, 1.1, 2.3], [0.5, 0.9, 2.9]].forEach(([r, h, y]) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), std('#1f3b2c'));
    c.position.set(0.12, y, 0); c.castShadow = true;
    g.add(c);
  });
  g.position.set(x, 0, z);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

function wallSegment(len, alongX, x, z) {
  const g = new THREE.Group();
  const [w, d] = alongX ? [len, 0.55] : [0.55, len];
  g.add(box(w, 1.0, d, '#4d4740', 0, 0.5, 0));               // 돌 기단
  g.add(box(w, 1.2, d, '#bdb29d', 0, 1.6, 0));               // 회벽
  g.add(box(w + (alongX ? 0 : 0.35), 0.18, d + (alongX ? 0.35 : 0), '#262a31', 0, 2.29, 0)); // 기와 갓
  g.position.set(x, 0, z);
  return g;
}

// ── 월드 생성 ─────────────────────────────────────
export function buildWorld(scene, today) {
  const anim = [];      // 매 프레임 갱신할 것들
  const fadeables = []; // 서재 안에 들어가면 투명해질 지붕/현판
  const gateFade = [];  // 대문 밑을 지날 때 투명해질 대문

  scene.background = new THREE.Color('#0a1222');
  scene.fog = new THREE.Fog('#0a1222', 22, 62);

  // 조명
  scene.add(new THREE.HemisphereLight('#6a7fb0', '#2a2018', 1.1));
  const moonLight = new THREE.DirectionalLight('#c4d0ff', 1.3);
  moonLight.position.set(-14, 22, 10);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1024, 1024);
  Object.assign(moonLight.shadow.camera, { left: -16, right: 16, top: 22, bottom: -22, near: 1, far: 70 });
  moonLight.shadow.bias = -0.0008;
  scene.add(moonLight);

  // 달 · 별
  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 16), new THREE.MeshBasicMaterial({ color: '#f7e9bf', fog: false }));
  moon.position.set(-20, 24, -52);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(4.2, 24, 16),
    new THREE.MeshBasicMaterial({ color: '#f7e9bf', transparent: true, opacity: 0.12, fog: false }));
  halo.position.copy(moon.position);
  scene.add(moon, halo);
  {
    const r = rand(21), pts = [];
    for (let i = 0; i < 500; i++) {
      const th = r() * Math.PI * 2, ph = r() * Math.PI * 0.42;
      pts.push(Math.cos(th) * Math.sin(ph) * 80, Math.cos(ph) * 80 + 4, Math.sin(th) * Math.sin(ph) * 80 - 10);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: '#dfe6ff', size: 0.35, fog: false, transparent: true, opacity: 0.8 })));
  }

  // 바닥
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), std('#151820'));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  ground.name = 'floor';
  scene.add(ground);

  const alley = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 19), std('#ffffff', { map: flagstoneTex() }));
  alley.rotation.x = -Math.PI / 2; alley.position.set(0, 0.01, 13.2); alley.receiveShadow = true;
  alley.name = 'floor';
  scene.add(alley);

  const yard = new THREE.Mesh(new THREE.PlaneGeometry(18.6, 8.8), std('#ffffff', { map: earthTex() }));
  yard.rotation.x = -Math.PI / 2; yard.position.set(0, 0.01, -0.1); yard.receiveShadow = true;
  yard.name = 'floor';
  scene.add(yard);

  // 골목 담장
  scene.add(wallSegment(18.4, false, -3.3, 13.2), wallSegment(18.4, false, 3.3, 13.2));
  // 마당 담장
  scene.add(wallSegment(6.3, true, -6.3, 4.3), wallSegment(6.3, true, 6.3, 4.3));
  scene.add(wallSegment(8.6, false, -9.3, 0), wallSegment(8.6, false, 9.3, 0));

  // 골목 등롱
  [8, 14, 20].forEach((z, i) => {
    for (const s of [-1, 1]) {
      const l = lantern(2.85 * s, 2.25, z, i % 2 ? '#ff8f4a' : '#ffb36b');
      scene.add(l); anim.push((t) => { l.userData.paper.material.emissiveIntensity = 0.8 + Math.sin(t * 3 + z + s) * 0.15; });
    }
  });
  const alleyLight = new THREE.PointLight('#ffa05a', 10, 18, 1.4);
  alleyLight.position.set(0, 2.6, 11);
  scene.add(alleyLight);

  // 마당 입구 문(솟을대문 느낌)
  {
    const gate = new THREE.Group();
    gate.add(box(0.32, 3.0, 0.32, '#5b3421', -3.0, 1.5, 4.3));
    gate.add(box(0.32, 3.0, 0.32, '#5b3421', 3.0, 1.5, 4.3));
    gate.add(box(6.6, 0.3, 0.4, '#5b3421', 0, 2.95, 4.3));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 0.9, 4), std('#262a31'));
    roof.rotation.y = Math.PI / 4; roof.scale.set(7.6 / Math.SQRT2, 1, 1.9 / Math.SQRT2);
    roof.position.set(0, 3.55, 4.3); roof.castShadow = true;
    gate.add(roof);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.55),
      new THREE.MeshStandardMaterial({ map: textTex(['柳林門'], { size: 150 }), emissive: '#3a2a18', emissiveIntensity: 0.4 }));
    plate.position.set(0, 2.55, 4.52);
    gate.add(plate);
    const l1 = lantern(-2.55, 2.3, 4.6), l2 = lantern(2.55, 2.3, 4.6);
    gate.add(l1, l2);
    // 대문 아래를 지날 때 카메라를 가리지 않도록 반투명 처리 대상으로 등록
    gate.traverse((m) => {
      if (!m.isMesh) return;
      m.material = m.material.clone();
      m.material.transparent = true;
      gateFade.push(m.material);
    });
    scene.add(gate);
  }

  scene.add(pine(-7.5, 2.5), pine(7.5, 2.5));

  // ── 한옥 서재 ──
  const hall = new THREE.Group();
  hall.add(box(16.6, PLATFORM_H, 10.4, '#5f5850', 0, PLATFORM_H / 2, -9.0)); // 기단
  const maru = new THREE.Mesh(new THREE.PlaneGeometry(16.2, 10.0), std('#ffffff', { map: maruTex() }));
  maru.rotation.x = -Math.PI / 2; maru.position.set(0, PLATFORM_H + 0.005, -9.0); maru.receiveShadow = true;
  maru.name = 'floor';
  hall.add(maru);
  hall.add(box(4.0, 0.24, 0.6, '#6b645b', 0, 0.12, -3.6)); // 디딤돌

  const pillarMat = std('#6a3b22');
  for (const [x, z] of [[-8, -4.2], [-4, -4.2], [4, -4.2], [8, -4.2], [-8, -13.8], [8, -13.8]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 3.2, 10), pillarMat);
    p.position.set(x, PLATFORM_H + 1.6, z); p.castShadow = true;
    hall.add(p);
  }
  // 뒷벽 · 옆벽
  hall.add(box(16.2, 3.2, 0.25, '#d6c9ae', 0, PLATFORM_H + 1.6, -13.95));
  hall.add(box(0.25, 3.2, 9.6, '#cdbfa2', -8.05, PLATFORM_H + 1.6, -9.0));
  hall.add(box(0.25, 3.2, 9.6, '#cdbfa2', 8.05, PLATFORM_H + 1.6, -9.0));
  // 창호(불 켜진 창살)
  const lattice = latticeTex();
  for (const x of [-5.6, 5.6]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6),
      new THREE.MeshStandardMaterial({ map: lattice, emissive: '#ffb860', emissiveIntensity: 0.55, emissiveMap: lattice }));
    win.position.set(x, PLATFORM_H + 1.9, -13.8);
    hall.add(win);
  }
  // 바깥에서 보이는 옆벽 창
  for (const s of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4),
      new THREE.MeshStandardMaterial({ map: lattice, emissive: '#ffb860', emissiveIntensity: 0.7, emissiveMap: lattice }));
    win.position.set(8.2 * s, PLATFORM_H + 1.8, -8.5);
    win.rotation.y = s * Math.PI / 2;
    hall.add(win);
  }

  // 지붕(실내에 들어가면 반투명)
  const roofGroup = new THREE.Group();
  const fadeMat = (c) => { const m = std(c, { transparent: true, opacity: 1 }); fadeables.push(m); return m; };
  const eave = new THREE.Mesh(new THREE.BoxGeometry(19.4, 0.22, 13.4), fadeMat('#3a281c'));
  eave.position.set(0, PLATFORM_H + 3.3, -9.0);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 2.6, 4), fadeMat('#252a33'));
  roof.rotation.y = Math.PI / 4; roof.scale.set(19.8 / Math.SQRT2, 1, 13.8 / Math.SQRT2);
  roof.position.set(0, PLATFORM_H + 3.3 + 1.3 + 0.1, -9.0);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.34, 0.34), fadeMat('#5b3421'));
  beam.position.set(0, PLATFORM_H + 3.05, -4.2);
  const signMat = new THREE.MeshStandardMaterial({
    map: textTex(['柳 · 유림거사 운세상담소'], { size: 92 }), emissive: '#3a2a18', emissiveIntensity: 0.5,
    transparent: true, opacity: 1,
  });
  fadeables.push(signMat);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), signMat);
  sign.position.set(0, PLATFORM_H + 2.55, -4.0);
  for (const m of [eave, roof, beam]) { m.castShadow = true; }
  roofGroup.add(eave, roof, beam, sign);
  hall.add(roofGroup);

  // 실내 조명
  const warm = new THREE.PointLight('#ffb871', 14, 16, 1.5);
  warm.position.set(0, PLATFORM_H + 2.7, -8.5);
  hall.add(warm);
  for (const x of [-7.1, 7.1]) {
    const post = box(0.12, 1.2, 0.12, '#2b1d14', x, PLATFORM_H + 0.6, -5.1);
    const l = lantern(x, PLATFORM_H + 1.35, -5.1, '#ffc27a');
    hall.add(post, l);
  }

  // 유림거사 자리: 서안 + 서책
  {
    const sx = -3.0;
    hall.add(box(2.2, 0.08, 1.0, '#4a2c1c', sx, PLATFORM_H + 0.42, -9.3)); // 상판
    for (const dx of [-0.95, 0.95]) for (const dz of [-0.38, 0.38]) hall.add(box(0.1, 0.38, 0.1, '#3a2216', sx + dx, PLATFORM_H + 0.19, -9.3 + dz));
    hall.add(box(0.7, 0.05, 0.5, '#efe6d0', sx - 0.2, PLATFORM_H + 0.49, -9.25)); // 서책
    hall.add(box(0.28, 0.05, 0.4, '#1a1a1a', sx + 0.6, PLATFORM_H + 0.49, -9.35)); // 벼루
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.08, 10), std('#dfe6e0'));
    cup.position.set(sx + 0.75, PLATFORM_H + 0.5, -9.0); hall.add(cup);
    const cushion = box(0.9, 0.12, 0.9, '#7b2f2a', sx, PLATFORM_H + 0.06, -10.4);
    hall.add(cushion);
  }
  // 책장
  {
    const bx = -7.0, bz = -10.0;
    hall.add(box(0.6, 2.4, 3.2, '#4a2c1c', bx, PLATFORM_H + 1.2, bz));
    const r = rand(9);
    const colors = ['#7b2f2a', '#2b4a74', '#3f6a4a', '#b08a4a', '#e2d6b8', '#5b3f6b'];
    for (let row = 0; row < 4; row++) {
      let z = bz - 1.45;
      while (z < bz + 1.4) {
        const w = 0.08 + r() * 0.1, h = 0.3 + r() * 0.18;
        hall.add(box(0.4, h, w, colors[Math.floor(r() * colors.length)], bx + 0.12, PLATFORM_H + 0.18 + row * 0.56 + h / 2, z + w / 2));
        z += w + 0.015;
      }
    }
  }
  // 타로 자리: 보라 천 원탁 + 수정구 + 카드 3장 + 촛불
  let crystal, candleLight;
  {
    const tx = 3.5, tz = -9.3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.62, 10), std('#2b1d14'));
    leg.position.set(tx, PLATFORM_H + 0.31, tz); hall.add(leg);
    const cloth = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.98, 0.3, 24), std('#43285e'));
    cloth.position.set(tx, PLATFORM_H + 0.62, tz); cloth.castShadow = true; hall.add(cloth);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.02, 6, 32), std('#d8b56a', { metalness: 0.6, roughness: 0.4 }));
    trim.rotation.x = Math.PI / 2; trim.position.set(tx, PLATFORM_H + 0.48, tz); hall.add(trim);
    crystal = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14),
      new THREE.MeshStandardMaterial({ color: '#a9c7ff', emissive: '#5d7dff', emissiveIntensity: 0.9, transparent: true, opacity: 0.85, roughness: 0.1 }));
    crystal.position.set(tx, PLATFORM_H + 0.97, tz - 0.25); hall.add(crystal);
    for (let i = 0; i < 3; i++) {
      const card = box(0.22, 0.012, 0.36, '#1d1530', tx - 0.4 + i * 0.4, PLATFORM_H + 0.78, tz + 0.35);
      card.material = std('#1d1530', { emissive: '#d8b56a', emissiveIntensity: 0.12 });
      card.rotation.y = (i - 1) * 0.15;
      hall.add(card);
    }
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), std('#efe6d0'));
    candle.position.set(tx + 0.6, PLATFORM_H + 0.87, tz - 0.2); hall.add(candle);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffcf70' }));
    flame.position.set(tx + 0.6, PLATFORM_H + 1.0, tz - 0.2); flame.scale.y = 1.6; hall.add(flame);
    candleLight = new THREE.PointLight('#a98bff', 3, 5, 1.8);
    candleLight.position.set(tx, PLATFORM_H + 1.4, tz);
    hall.add(candleLight);
    hall.add(box(0.9, 0.12, 0.9, '#3a2a55', tx, PLATFORM_H + 0.06, -10.5)); // 방석
  }
  // 분야별 진열장(사방탁자) — 유림거사 뒤 뒷벽
  const topicProps = {};
  {
    const cx = -3.95, cz = -13.18, W = 6.6, H = 1.0;
    const wood = '#4a2c1c';
    hall.add(box(W, 0.07, 0.48, wood, cx, PLATFORM_H + H, cz));          // 상판
    hall.add(box(W, 0.06, 0.44, wood, cx, PLATFORM_H + H * 0.5, cz));    // 중판
    hall.add(box(W, 0.06, 0.44, wood, cx, PLATFORM_H + 0.06, cz));       // 하판
    for (let i = 0; i <= 6; i++) hall.add(box(0.07, H, 0.48, '#3a2216', cx - W / 2 + i * (W / 6), PLATFORM_H + H / 2, cz));
    SAJU_TOPICS.forEach((t, i) => {
      const x = cx - W / 2 + (i + 0.5) * (W / 6);
      const prop = buildProp(t.id);
      prop.position.set(x, PLATFORM_H + H + 0.035, cz + 0.02);
      hall.add(prop);
      // 아래 칸에 장식용 서책
      hall.add(box(0.5, 0.08, 0.3, ['#7b2f2a', '#2b4a74', '#3f6a4a'][i % 3], x, PLATFORM_H + 0.13, cz));
      topicProps[t.id] = prop;
    });
  }

  // 일진 족자(뒷벽 가운데)
  const scrollMat = new THREE.MeshStandardMaterial({
    map: textTex([today.hanja + '日', '오늘의 일진'], { w: 256, h: 640, bg: '#efe4c8', fg: '#2a1d14', size: 150, vertical: true, border: '#8a6a3a' }),
    emissive: '#3a2a18', emissiveIntensity: 0.25,
  });
  const scroll = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.2), scrollMat);
  scroll.position.set(0, PLATFORM_H + 1.75, -13.8);
  hall.add(scroll);
  hall.add(box(1.1, 0.07, 0.07, '#3a2216', 0, PLATFORM_H + 2.88, -13.78), box(1.1, 0.07, 0.07, '#3a2216', 0, PLATFORM_H + 0.62, -13.78));

  hall.traverse((m) => { if (m.isMesh && m.castShadow === false) m.receiveShadow = true; });
  scene.add(hall);

  // ── NPC ──
  const npcs = {};
  const yurim = buildPerson({ robe: '#26375a', trim: '#e9e1cc', head: 'gat', beard: true, skin: '#e9c6a2', scale: 1.08 });
  yurim.position.set(-3.0, PLATFORM_H, -10.4);
  scene.add(yurim);
  npcs.saju = { kind: 'person', obj: yurim, spot: new THREE.Vector3(-3.0, 0, -7.75), labelY: 2.2 };

  const tarot = buildPerson({ robe: '#4b2d6b', trim: '#d8b56a', head: 'hood', skin: '#f0d0b4' });
  tarot.position.set(3.5, PLATFORM_H, -10.5);
  scene.add(tarot);
  npcs.tarot = { kind: 'person', obj: tarot, spot: new THREE.Vector3(3.5, 0, -7.75), labelY: 2.2 };

  const dongja = buildPerson({ robe: '#3d6e8f', trim: '#f2ead6', head: 'topknot', scale: 0.78 });
  dongja.position.set(2.65, 0, 2.9);
  dongja.rotation.y = -0.6;
  scene.add(dongja);
  npcs.guide = { kind: 'person', obj: dongja, spot: new THREE.Vector3(1.6, 0, 3.0), labelY: 1.75 };

  const scrollAnchor = new THREE.Object3D();
  scrollAnchor.position.set(0, PLATFORM_H + 0.2, -13.8);
  scene.add(scrollAnchor);
  npcs.ilju = { obj: scrollAnchor, spot: new THREE.Vector3(0, 0, -12.2), labelY: 2.95, kind: 'object' };
  for (const t of SAJU_TOPICS) {
    const p = topicProps[t.id];
    npcs['topic:' + t.id] = {
      kind: 'item', topic: t, obj: p, labelY: 0.75,
      spot: new THREE.Vector3(p.position.x, 0, -12.4),
    };
  }

  anim.push((t) => {
    crystal.material.emissiveIntensity = 0.7 + Math.sin(t * 2.2) * 0.35;
    candleLight.intensity = 2.6 + Math.sin(t * 13) * 0.3 + Math.sin(t * 7.3) * 0.25;
    halo.scale.setScalar(1 + Math.sin(t * 0.8) * 0.03);
    Object.values(topicProps).forEach((p, i) => { p.rotation.y = Math.sin(t * 0.7 + i) * 0.35; });
  });

  return { anim, fadeables, gateFade, npcs, clickTargets: [ground, alley, yard, maru] };
}

// ── 분야별 소품 ───────────────────────────────────
function buildProp(id) {
  const g = new THREE.Group();
  const add = (geo, color, x, y, z, extra) => {
    const m = new THREE.Mesh(geo, std(color, extra));
    m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
  };
  const gold = { metalness: 0.75, roughness: 0.3, emissive: '#5a3d0a', emissiveIntensity: 0.35 };
  // 받침
  add(new THREE.CylinderGeometry(0.3, 0.33, 0.06, 20), '#2b1d14', 0, 0.03, 0);
  if (id === 'wealth') { // 금두꺼비 + 엽전
    const body = add(new THREE.SphereGeometry(0.2, 18, 12), '#d4a640', 0, 0.2, 0, gold); body.scale.set(1.15, 0.75, 1);
    const head = add(new THREE.SphereGeometry(0.12, 14, 10), '#d4a640', 0, 0.3, 0.12, gold); head.scale.set(1.3, 0.8, 1);
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.035, 8, 6), '#1a1a1a', 0.07 * s, 0.38, 0.15);
    const coin = add(new THREE.TorusGeometry(0.07, 0.022, 6, 16), '#e8c45a', 0, 0.27, 0.25, gold);
    coin.rotation.x = 0.2;
  } else if (id === 'health') { // 청자 약초 항아리 + 약초
    const jar = add(new THREE.SphereGeometry(0.19, 18, 14), '#7fae9e', 0, 0.24, 0, { roughness: 0.35 }); jar.scale.set(1, 1.15, 1);
    add(new THREE.CylinderGeometry(0.09, 0.12, 0.12, 16), '#7fae9e', 0, 0.48, 0, { roughness: 0.35 });
    for (let i = 0; i < 5; i++) {
      const leaf = add(new THREE.ConeGeometry(0.035, 0.24, 6), '#4f8a3f', Math.cos(i * 1.3) * 0.05, 0.62, Math.sin(i * 1.3) * 0.05);
      leaf.rotation.z = Math.cos(i * 1.3) * 0.5; leaf.rotation.x = Math.sin(i * 1.3) * 0.5;
    }
  } else if (id === 'career') { // 주판 + 장부
    add(new THREE.BoxGeometry(0.42, 0.06, 0.3), '#efe6d0', 0, 0.09, 0.02);           // 장부
    add(new THREE.BoxGeometry(0.42, 0.012, 0.3), '#7b2f2a', 0, 0.126, 0.02);
    const frame = new THREE.Group(); frame.position.set(0, 0.3, -0.04); frame.rotation.x = -0.35; g.add(frame);
    const fm = std('#5b3421');
    for (const [w, h, x, y] of [[0.5, 0.035, 0, 0.14], [0.5, 0.035, 0, -0.14], [0.035, 0.31, -0.24, 0], [0.035, 0.31, 0.24, 0], [0.5, 0.02, 0, 0.06]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), fm); b.position.set(x, y, 0); frame.add(b);
    }
    const bm = std('#2a1a12', { roughness: 0.4 });
    for (let c = 0; c < 6; c++) for (let r = 0; r < 4; r++) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), bm);
      bead.scale.set(1, 0.7, 1);
      bead.position.set(-0.18 + c * 0.072, (r === 0 ? 0.1 : -0.02 - r * 0.035), 0);
      frame.add(bead);
    }
  } else if (id === 'love') { // 원앙 한 쌍
    for (const [s, body, headC] of [[-1, '#c96a2e', '#2f6e6a'], [1, '#8a7a66', '#6b5a4a']]) {
      const b = add(new THREE.SphereGeometry(0.11, 14, 10), body, 0.1 * s, 0.17, 0); b.scale.set(0.85, 0.8, 1.3);
      add(new THREE.SphereGeometry(0.065, 12, 8), headC, 0.1 * s, 0.3, 0.1);
      const beak = add(new THREE.ConeGeometry(0.02, 0.07, 6), '#d84a30', 0.1 * s, 0.29, 0.18); beak.rotation.x = Math.PI / 2;
      const tail = add(new THREE.ConeGeometry(0.05, 0.12, 6), body, 0.1 * s, 0.22, -0.15); tail.rotation.x = -Math.PI / 2.6;
    }
  } else if (id === 'match') { // 붉은 실 매듭
    const knot = add(new THREE.TorusKnotGeometry(0.11, 0.028, 80, 8, 2, 3), '#c0392b',
      0, 0.3, 0, { roughness: 0.6, emissive: '#5a0d08', emissiveIntensity: 0.4 });
    knot.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) { const tassel = add(new THREE.ConeGeometry(0.03, 0.14, 6), '#c0392b', 0.05 * s, 0.11, 0.1); tassel.rotation.z = 0.2 * s; }
  } else if (id === 'pet') { // 방석 위 강아지
    const cushion = add(new THREE.CylinderGeometry(0.27, 0.27, 0.07, 20), '#7b2f2a', 0, 0.095, 0); cushion.scale.z = 0.85;
    const fur = '#e3c79c';
    const body = add(new THREE.SphereGeometry(0.11, 14, 10), fur, 0, 0.21, -0.02); body.scale.set(1, 1.05, 1.25);
    add(new THREE.SphereGeometry(0.085, 14, 10), fur, 0, 0.35, 0.07);
    const snout = add(new THREE.SphereGeometry(0.04, 10, 8), '#f2e2c6', 0, 0.33, 0.15); snout.scale.z = 1.2;
    add(new THREE.SphereGeometry(0.015, 6, 4), '#1a1a1a', 0, 0.345, 0.195);
    for (const s of [-1, 1]) {
      const ear = add(new THREE.SphereGeometry(0.04, 8, 6), '#b88a5a', 0.075 * s, 0.38, 0.05); ear.scale.set(0.6, 1.3, 0.8);
      add(new THREE.SphereGeometry(0.013, 6, 4), '#1a1a1a', 0.035 * s, 0.37, 0.145);
    }
  }
  return g;
}
