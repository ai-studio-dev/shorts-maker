import * as THREE from '../vendor/three.module.min.js';

// 저폴리 인물 — 도포(robe) + 머리 + 머리장식. 플레이어와 NPC가 같은 빌더를 씁니다.
// opts: { robe, trim, skin, hair, head: 'gat'|'topknot'|'hood'|'bun', beard, scale }

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

export function buildPerson(opts = {}) {
  const o = {
    robe: '#2b4a74', trim: '#e8e2d0', skin: '#f0cfae', hair: '#1d1a18',
    head: 'topknot', beard: false, scale: 1, ...opts,
  };
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);

  // 도포
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.44, 1.0, 10), mat(o.robe));
  robe.position.y = 0.55;
  body.add(robe);
  // 깃(동정)
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 12), mat(o.trim));
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.03;
  body.add(collar);
  // 세조대(허리끈)
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.335, 0.345, 0.07, 10), mat(o.trim));
  belt.position.y = 0.72;
  body.add(belt);

  // 팔(소매)
  const arms = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.3 * side, 0.98, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.55, 8), mat(o.robe));
    sleeve.position.y = -0.27;
    pivot.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), mat(o.skin));
    hand.position.y = -0.56;
    pivot.add(hand);
    pivot.rotation.z = 0.18 * side;
    body.add(pivot);
    arms.push(pivot);
  }

  // 머리
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 12), mat(o.skin));
  head.position.y = 1.27;
  body.add(head);
  // 눈
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), mat('#1a1a1a'));
    eye.position.set(0.075 * side, 1.29, 0.19);
    body.add(eye);
  }
  // 머리카락(뒤통수)
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.222, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(o.hair));
  hairCap.position.y = 1.29;
  hairCap.rotation.x = -0.35;
  body.add(hairCap);

  if (o.head === 'gat' || o.head === 'topknot') {
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), mat(o.hair));
    knot.position.set(0, 1.5, -0.03);
    body.add(knot);
  }
  if (o.head === 'gat') {
    const gatMat = mat('#141414', { transparent: true, opacity: 0.88, roughness: 0.4 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.015, 24), gatMat);
    brim.position.y = 1.43;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.24, 16), gatMat);
    crown.position.y = 1.56;
    body.add(brim, crown);
  }
  if (o.head === 'hood') {
    const hood = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.55, 12, 1, true), mat(o.robe, { side: THREE.DoubleSide }));
    hood.position.set(0, 1.42, -0.04);
    body.add(hood);
  }
  if (o.head === 'bun') {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(o.hair));
    bun.position.set(0, 1.3, -0.2);
    body.add(bun);
  }
  if (o.beard) {
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 8), mat('#9a9690'));
    beard.rotation.x = Math.PI;
    beard.position.set(0, 1.08, 0.15);
    body.add(beard);
  }

  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  g.scale.setScalar(o.scale);
  g.userData = { body, arms, robeMesh: robe, phase: Math.random() * 10 };
  return g;
}

/** 걷기/숨쉬기 애니메이션. moving: 0~1 */
export function animatePerson(p, t, moving) {
  const { body, arms, phase } = p.userData;
  const k = t * 9 + phase;
  body.position.y = moving * Math.abs(Math.sin(k)) * 0.07 + Math.sin(t * 1.6 + phase) * 0.008;
  body.rotation.z = moving * Math.sin(k) * 0.05;
  arms[0].rotation.x = moving * Math.sin(k) * 0.6;
  arms[1].rotation.x = -moving * Math.sin(k) * 0.6;
}

/** 플레이어 아바타 색을 바꿉니다(일간 오행 색). */
export function recolorPerson(p, robe, trim) {
  p.traverse((m) => {
    if (!m.isMesh || !m.material) return;
    if (m.material.userData.role === 'robe') m.material.color.set(robe);
    if (m.material.userData.role === 'trim') m.material.color.set(trim);
  });
}

/** recolor 가능한 플레이어를 만듭니다. */
export function buildPlayer(robe, trim) {
  const p = buildPerson({ robe, trim, head: 'topknot' });
  const robeC = new THREE.Color(robe).getHex();
  const trimC = new THREE.Color(trim).getHex();
  p.traverse((m) => {
    if (!m.isMesh) return;
    const c = m.material.color.getHex();
    if (c === robeC) { m.material = m.material.clone(); m.material.userData.role = 'robe'; }
    else if (c === trimC) { m.material = m.material.clone(); m.material.userData.role = 'trim'; }
  });
  // 발밑 오행 오라
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.55, 32),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  ring.material.userData.role = 'aura';
  p.add(ring);
  p.userData.aura = ring;
  return p;
}
