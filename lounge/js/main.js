import * as THREE from '../vendor/three.module.min.js';
import { buildWorld, walkable, heightAt, inAlley } from './world.js?v=10';
import { buildPlayer, animatePerson, recolorPerson } from './avatar.js?v=10';
import {
  iljuFromBirth, todayPillar, dayRelation,
  ELEMENT_COLORS, ELEMENT_HANJA, ELEMENT_NATURE,
} from './saju.js?v=10';
import { LINKS, OPEN_IN_NEW_TAB, SAJU_TOPICS, TOPIC_GROUPS } from './config.js?v=10';

const $ = (s) => document.querySelector(s);

// ── 프로필(브라우저에만 저장) ─────────────────────
const STORE_KEY = 'yurim-lounge-profile';
// 이름·생년월일은 저장하지 않습니다(같은 기기를 다른 사람이 써도 보이지 않게).
// 예전 버전이 남겨 둔 값이 있으면 지웁니다. 입력값은 이 화면을 연 동안에만 메모리에 둡니다.
function loadProfile() {
  try { localStorage.removeItem(STORE_KEY); } catch { /* 사생활 보호 모드 등 */ }
  return null;
}
function saveProfile() { /* 저장하지 않음 */ }
let profile = loadProfile() || { name: '', birth: '' };
const today = todayPillar();
const ilju = () => iljuFromBirth(profile.birth);
const displayName = () => profile.name?.trim() || '손님';
const honor = () => (profile.name?.trim() ? `${profile.name.trim()}님` : '손님');

// ── 렌더러 · 씬 · 카메라 ─────────────────────────
const canvas = $('#scene');
const dialog = $('#dialog');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
const world = buildWorld(scene, today);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // 세로 화면에서는 조금 더 멀리서 봅니다
  camera.userData.dist = w < h ? 1.35 : 1;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ── 플레이어 ─────────────────────────────────────
function colorsFor() {
  const i = ilju();
  return i ? ELEMENT_COLORS[i.element] : { robe: '#6b6f78', trim: '#e8e2d0', glow: '#e2c48d' };
}
const startColors = colorsFor();
const player = buildPlayer(startColors.robe, startColors.trim);
player.position.set(0, 0, 19.5);
player.rotation.y = Math.PI;
scene.add(player);
function applyLook() {
  const c = colorsFor();
  recolorPerson(player, c.robe, c.trim);
  player.userData.aura.material.color.set(c.glow);
  nameTag.textContent = ilju() ? `${displayName()} · ${ilju().label}일주` : displayName();
}

// 클릭 지점 표시
const marker = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.3, 24),
  new THREE.MeshBasicMaterial({ color: '#e2c48d', transparent: true, opacity: 0, side: THREE.DoubleSide }));
marker.rotation.x = -Math.PI / 2;
scene.add(marker);

// ── 이동 ─────────────────────────────────────────
const SPEED = 4.2;
let path = [];          // 남은 경유지 (Vector3)
let onArrive = null;    // 도착 시 실행할 행동
let stuckTime = 0;
const keys = new Set();

function goTo(target, arrive = null) {
  const from = player.position;
  const t = target.clone();
  path = [];
  const V = (x, z) => new THREE.Vector3(x, 0, z);
  const inHall = (v) => v.z < -3.9;
  const door = (x) => THREE.MathUtils.clamp(x, -3, 3); // 앞 기둥(x=±4) 사이로 드나듦
  // 마당 무료 좌판 앞은 탁자 오른쪽 옆으로 드나듭니다
  const atStall = (v) => v.z > -0.4 && v.z < 2.6 && v.x < -2.0 && v.x > -5.4;
  const STALL_SIDE = V(-1.5, 1.7);
  // 일진 족자 앞(서안과 타로 테이블 사이 통로)은 서안 오른쪽 끝으로 드나듭니다
  const inBack = (v) => v.z < -8.2;
  const BACK_DOOR = V(1.0, -7.9);
  if (inBack(from) && !inBack(t)) path.push(BACK_DOOR.clone());
  if (atStall(from) && !atStall(t)) path.push(STALL_SIDE.clone());
  // 서재 → 밖
  if (inHall(from) && !inHall(t)) path.push(V(door(from.x), -5.0), V(door(from.x), -3.0));
  // 골목 ↔ 마당 사이는 대문 한가운데를 거쳐 갑니다
  if (inAlley(from.z) !== inAlley(t.z)) {
    path.push(V(THREE.MathUtils.clamp(from.x, -1, 1), inAlley(from.z) ? 4.6 : 3.2));
    path.push(V(0, inAlley(from.z) ? 3.0 : 4.8));
  }
  // 밖 → 서재
  if (!inHall(from) && inHall(t)) path.push(V(door(t.x), -3.0), V(door(t.x), -5.0));
  if (inBack(t) && !inBack(from)) path.push(BACK_DOOR.clone());
  if (atStall(t) && !atStall(from)) path.push(STALL_SIDE.clone());
  path.push(t);
  onArrive = arrive;
  stuckTime = 0;
  marker.position.set(t.x, heightAt(t.x, t.z) + 0.03, t.z);
  marker.material.opacity = arrive ? 0 : 0.9;
}

function tryStep(dx, dz) {
  const p = player.position;
  if (walkable(p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; return true; }
  if (Math.abs(dx) > 1e-4 && walkable(p.x + dx, p.z)) { p.x += dx; return true; }
  if (Math.abs(dz) > 1e-4 && walkable(p.x, p.z + dz)) { p.z += dz; return true; }
  return false;
}

function updateMovement(dt) {
  let moving = 0;
  const p = player.position;
  // 키보드(WASD/방향키)
  let kx = 0, kz = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) kx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) kx += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) kz -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) kz += 1;
  if (kx || kz) {
    path = []; onArrive = null;
    const len = Math.hypot(kx, kz);
    const dx = (kx / len) * SPEED * dt, dz = (kz / len) * SPEED * dt;
    tryStep(dx, dz);
    player.rotation.y = Math.atan2(dx, dz);
    moving = 1;
  } else if (path.length) {
    const target = path[0];
    const dx = target.x - p.x, dz = target.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.12) {
      path.shift();
      if (!path.length) arrived();
    } else {
      const step = Math.min(dist, SPEED * dt);
      const ok = tryStep((dx / dist) * step, (dz / dist) * step);
      player.rotation.y = lerpAngle(player.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 12));
      moving = 1;
      stuckTime = ok ? 0 : stuckTime + dt;
      if (stuckTime > 0.35) { // 막혔으면 그 자리에서 멈춤(근처면 행동은 실행)
        const last = path[path.length - 1];
        const near = Math.hypot(last.x - p.x, last.z - p.z) < 2.2;
        path = [];
        if (near) arrived(); else onArrive = null;
      }
    }
  }
  const gy = heightAt(p.x, p.z);
  p.y += (gy - p.y) * Math.min(1, dt * 14);
  return moving;
}

function arrived() {
  const fn = onArrive;
  onArrive = null;
  if (fn) fn();
}

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return;
  if (e.code.startsWith('Arrow') || ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
    keys.add(e.code); e.preventDefault();
  }
  if (e.code === 'Escape') { closeDialog(); closeService(); }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

// 바닥 · NPC 클릭
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downAt = null;
canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 10) return;
  downAt = null;
  if (!started) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  // NPC를 직접 눌렀는지
  for (const [id, n] of Object.entries(world.npcs)) {
    if (n.kind === 'object') continue;
    if (ray.intersectObject(n.obj, true).length) { approach(id); return; }
  }
  const hit = ray.intersectObjects(world.clickTargets, false)[0];
  if (hit) { closeDialog(); goTo(new THREE.Vector3(hit.point.x, 0, hit.point.z)); }
});

// ── 카메라 ───────────────────────────────────────
const camOffset = new THREE.Vector3(0, 5.4, 9.2);
const camLook = new THREE.Vector3();
let introT = 0; // 입장 연출 0→1
let viewShift = 0;
function updateCamera(dt) {
  const k = camera.userData.dist || 1;
  const p = player.position;
  const indoor = p.z < -3.6;
  const off = camOffset.clone().multiplyScalar(k * (indoor ? 0.92 : 1));
  // 입장 연출: 하늘에서 골목으로 내려옴
  const e = 1 - Math.pow(1 - Math.min(introT, 1), 3);
  off.y += (1 - e) * 16; off.z += (1 - e) * 10;
  // 마당에서는 카메라가 옆으로도 따라가 골목 담장에 가리지 않게
  const follow = p.z > -3.6 && p.z < 4 ? 1 : 0.55;
  const want = new THREE.Vector3(p.x * follow, p.y, p.z).add(off);
  camera.position.lerp(want, Math.min(1, dt * 3.5));
  camLook.lerp(new THREE.Vector3(p.x * 0.75, p.y + 1.1, p.z - (indoor ? 2.2 : k > 1 ? 2.0 : 4.5)), Math.min(1, dt * 5));
  camera.lookAt(camLook);
  // 대화창이 열려 있으면 그 높이의 절반만큼 화면을 위로 올려 NPC가 가리지 않게
  const wantShift = dialog.hidden ? 0 : dialog.offsetHeight * 0.55;
  viewShift += (wantShift - viewShift) * Math.min(1, dt * 6);
  if (Math.abs(viewShift) > 0.5) camera.setViewOffset(window.innerWidth, window.innerHeight, 0, viewShift, window.innerWidth, window.innerHeight);
  else camera.clearViewOffset();
  // 서재 앞마당부터는 지붕·현판을, 대문 근처에서는 대문을 투명하게
  fade(world.fadeables, indoor ? 0 : p.z < 0.5 ? 0.3 : 1, dt);
  fade(world.gateFade, p.z > -4.5 && p.z < 4.4 ? 0.15 : 1, dt);
}
function fade(mats, target, dt) {
  for (const m of mats) {
    m.opacity += (target - m.opacity) * Math.min(1, dt * 6);
    m.depthWrite = m.opacity > 0.9;
    m.visible = m.opacity > 0.03;
  }
}

// ── 말풍선 · 이름표 (HTML 오버레이) ───────────────
const labelLayer = $('#labels');
const LABELS = {
  saju: '🧧 유림거사 · 사주',
  tarot: '🔮 타로 선생',
  guide: '🙇 안내 동자',
  ilju: `📜 오늘의 일진 · ${today.label}일`,
};
for (const t of SAJU_TOPICS) LABELS['topic:' + t.id] = `${t.icon} ${t.name}`;
const labelEls = {};
for (const id of Object.keys(world.npcs)) {
  const b = document.createElement('button');
  b.className = 'bubble' + (id === 'saju' || id === 'tarot' ? ' bubble--main' : '') + (world.npcs[id].kind === 'item' ? ' bubble--item' : '');
  b.type = 'button';
  b.textContent = LABELS[id];
  b.title = LABELS[id];
  b.addEventListener('click', () => approach(id));
  labelLayer.appendChild(b);
  labelEls[id] = b;
}
const nameTag = document.createElement('div');
nameTag.className = 'nametag';
labelLayer.appendChild(nameTag);

const tmp = new THREE.Vector3();
function place(el, obj, y) {
  obj.getWorldPosition(tmp);
  tmp.y += y;
  tmp.project(camera);
  const sy = (-tmp.y * 0.5 + 0.5) * window.innerHeight;
  const visible = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && sy > 84 && sy < window.innerHeight + 40;
  el.style.display = visible ? '' : 'none';
  if (visible) {
    el.style.transform = `translate(-50%, -100%) translate(${(tmp.x * 0.5 + 0.5) * window.innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * window.innerHeight}px)`;
  }
}
function updateLabels() {
  const indoor = player.position.z < -3.6;
  for (const [id, n] of Object.entries(world.npcs)) {
    // 분야별 소품 말풍선은 서재 안에 들어왔을 때만
    if (n.kind === 'item') {
      // 서재 안 소품은 서재 안에서만, 마당 무료 좌판은 서재 밖에서만 말풍선을 보여줍니다
      const show = n.topic.group === 'free' ? !indoor && player.position.z < 14 : indoor;
      if (!show) { labelEls[id].style.display = 'none'; continue; }
      // 평소엔 아이콘만, 바로 앞에 선 소품만 이름까지
      const dx = n.spot.x - player.position.x, dz = n.spot.z - player.position.z;
      const full = Math.hypot(dx, dz) < 0.6;
      const want = full ? LABELS[id] : n.topic.icon;
      if (labelEls[id].textContent !== want) labelEls[id].textContent = want;
    }
    place(labelEls[id], n.obj, n.labelY);
    const d = player.position.distanceTo(tmp.set(n.spot.x, player.position.y, n.spot.z));
    labelEls[id].classList.toggle('is-near', d < 1.6);
  }
  place(nameTag, player, 1.95);
}

// ── 대화 ─────────────────────────────────────────
function approach(id) {
  const n = world.npcs[id];
  closeDialog();
  goTo(n.spot, () => {
    // NPC 쪽 바라보기
    const o = n.obj.getWorldPosition(new THREE.Vector3());
    player.rotation.y = Math.atan2(o.x - player.position.x, o.z - player.position.z);
    talk(id);
  });
}

function talk(id) {
  const name = displayName();
  const i = ilju();
  if (id === 'ilju') { openIlju(); return; }
  if (id.startsWith('topic:')) { talkTopic(world.npcs[id].topic); return; }
  if (id === 'saju') {
    const intro = i
      ? `${greetOnce()}어서 오시게, ${name}. ${i.label}일주(${i.hanja})로구먼. 일간이 ${i.element}(${ELEMENT_HANJA[i.element]})이니 ${ELEMENT_NATURE[i.element]}`
      : `${greetOnce()}어서 오시게, ${name}. 생년월일을 알려주면 타고난 기운부터 짚어줄 수 있다네.`;
    showDialog('유림거사', `${intro}<br>삶의 큰 흐름이 궁금하다면 사주로 차근차근 풀어보세.`, [
      { label: '사주풀이 펼치기 (무료 운세부터)', primary: true, act: () => openService('유림거사 사주풀이', LINKS.saju) },
      { label: '🎁 무료 운세 먼저 볼게요', act: () => topicMenu('free') },
      { label: '분야별로 골라볼게요', act: () => topicMenu('counter') },
      { label: '종합·기간 운세 볼게요', act: () => topicMenu('time') },
      ...(i ? [] : [{ label: '생년월일 알려드릴게요', act: openProfile }]),
      { label: '조금 더 둘러볼게요', act: closeDialog },
    ]);
  }
  if (id === 'tarot') {
    showDialog('타로 선생',
      `${honor()}, 마음속에 또렷한 질문이 하나 있지요?<br>카드를 한 장 뽑아 지금의 핵심부터 살펴볼까요?`, [
        { label: '무료 1장 타로', primary: true, act: () => openService('무료 1장 타로', LINKS.tarotFree) },
        { label: '3장 심화 리딩 · 5,000원', act: () => openService('3장 심화 리딩', LINKS.tarot3) },
        { label: '5장 선택의 지도 · 9,000원', act: () => openService('5장 선택의 지도', LINKS.tarot5) },
        { label: '다음에 볼게요', act: closeDialog },
      ]);
  }
  if (id === 'guide') {
    showDialog('안내 동자',
      `어서 오세요, ${honor()}! 유림거사님은 안쪽 서재에 계세요.<br>왼쪽은 <b>사주</b>, 오른쪽은 <b>타로</b> 자리랍니다.<br>바로 옆 <b>무료 운세 좌판</b>에서 오늘운세·띠별운세를 먼저 보고 가셔도 돼요.`, [
        { label: '유림거사님께 데려다줘', primary: true, act: () => approach('saju') },
        { label: '무료 운세 좌판 볼래', act: () => approach('topic:today') },
        { label: '타로 자리로 갈래', act: () => approach('tarot') },
        { label: '혼자 둘러볼게', act: closeDialog },
      ]);
  }
}

function topicMenu(group) {
  const g = TOPIC_GROUPS[group];
  showDialog(`유림거사 · ${g.title}`, g.intro, [
    ...SAJU_TOPICS.filter((t) => t.group === group).map((t) => ({ label: `${t.icon} ${t.name}`, act: () => approach('topic:' + t.id) })),
    { label: '다른 갈래 볼게요', act: () => talk('saju') },
  ]);
}

function talkTopic(t) {
  showDialog(`${t.icon} ${t.name} · ${t.prop}`, t.desc, [
    { label: `${t.name} 보러 가기${t.free ? ' (무료)' : ''}`, primary: true, act: () => openService(`${t.name} · 유림거사 사주풀이`, t.url, t.url === LINKS.saju ? `첫 화면에서 「${t.pick}」 메뉴를 눌러주세요` : '') },
    { label: '다른 것도 볼게요', act: () => topicMenu(t.group) },
    { label: '조금 더 둘러볼게요', act: closeDialog },
  ]);
}

function showDialog(who, html, options) {
  dialog.querySelector('.dialog__who').textContent = who;
  dialog.querySelector('.dialog__text').innerHTML = html;
  const box = dialog.querySelector('.dialog__options');
  box.replaceChildren(...options.map((o) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (o.primary ? ' btn--primary' : '');
    b.textContent = o.label;
    b.addEventListener('click', o.act);
    return b;
  }));
  dialog.hidden = false;
}
function closeDialog() { dialog.hidden = true; }

// ── 서비스 창(iframe) ─────────────────────────────
const service = $('#service');
const frame = $('#service-frame');
function openService(title, url, hint = '') {
  closeDialog();
  if (OPEN_IN_NEW_TAB.has(url)) { window.open(url, '_blank', 'noopener'); return; }
  service.querySelector('.service__title').textContent = title;
  const h = $('#service-hint');
  h.textContent = hint ? `👉 ${hint}` : '';
  h.hidden = !hint;
  $('#service-newtab').href = url;
  frame.src = url;
  service.hidden = false;
}
function closeService() {
  if (service.hidden) return;
  service.hidden = true;
  frame.src = 'about:blank';
}
$('#service-close').addEventListener('click', closeService);

// ── 오늘의 일진 카드 ─────────────────────────────
const iljuCard = $('#ilju');
function openIlju() {
  closeDialog();
  const i = ilju();
  $('#ilju-today').textContent = today.hanja;
  $('#ilju-today-label').textContent =
    `${new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} · ${today.label}일 (${today.element}${ELEMENT_HANJA[today.element]})`;
  const body = $('#ilju-body');
  if (i) {
    const rel = dayRelation(i.element, today.element);
    body.innerHTML = `<p class="ilju__mine">${honor()}은 <b>${i.label}일주</b> · ${i.element}(${ELEMENT_HANJA[i.element]}) 기운</p>
      <h3>${rel.title}</h3><p>${rel.text}</p>`;
  } else {
    body.innerHTML = '<p>생년월일을 알려주시면 오늘 일진이 <b>나에게</b> 어떤 날인지 풀어드려요.</p>';
  }
  $('#ilju-birth').hidden = !!i;
  iljuCard.hidden = false;
}
$('#ilju-close').addEventListener('click', () => { iljuCard.hidden = true; });
$('#ilju-birth').addEventListener('click', () => { iljuCard.hidden = true; openProfile(); });
$('#ilju-saju').addEventListener('click', () => { iljuCard.hidden = true; openService('유림거사 사주풀이', LINKS.saju); });

// ── 입장 / 내 정보 ───────────────────────────────
const intro = $('#intro');
const form = $('#intro-form');
// 휴대폰에서 입력칸을 누르면 키보드에 가리지 않게 그 칸을 화면 위쪽으로 올립니다
// (앱 안 브라우저는 키보드가 떠도 화면 높이를 줄이지 않아 직접 올려야 함)
const isTouch = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;
function liftField(el) {
  if (!isTouch) return;
  intro.classList.add('is-typing');
  const target = el.closest('.birth') || el;
  setTimeout(() => {
    const vv = window.visualViewport;
    const viewTop = vv ? vv.offsetTop : 0;
    const top = target.getBoundingClientRect().top - viewTop;
    const want = Math.min(110, window.innerHeight * 0.15);
    if (Math.abs(top - want) > 8) intro.scrollBy({ top: top - want, behavior: 'smooth' });
  }, 280);
}
intro.addEventListener('focusin', (e) => { if (e.target.matches('input')) liftField(e.target); });
let started = false;
function openProfile() {
  closeDialog();
  form.name.value = profile.name || '';
  fillBirth(profile.birth);
  birthError('');
  intro.classList.toggle('is-edit', started);
  intro.hidden = false;
}
function enter(withProfile) {
  if (withProfile) {
    const birth = readBirth();
    form.birth.value = birth;
    // 생년월일을 비운 채 처음 누르면 한 번 안내하고, 한 번 더 누르면 그대로 들여보냄
    if (!birth && !skipBirthAsked) {
      skipBirthAsked = true;
      birthMsg.innerHTML = '생년월일을 넣으면 내 <b>일주</b>에 맞는 옷을 입고 들어가요.<br>그냥 들어가시려면 버튼을 한 번 더 눌러주세요.';
      birthMsg.hidden = false;
      birthMsg.classList.add('is-info');
      form.by.focus();
      return;
    }
    if (birth) {
      const [y, mo, d] = birthBoxes.map((b) => b.value.trim());
      if (y.length !== 4) return birthError('태어난 해를 4자리로 넣어주세요. 예: 1987', form.by);
      if (!mo || +mo < 1 || +mo > 12) return birthError('월은 01~12 사이로 넣어주세요.', form.bm);
      if (!d || +d < 1 || +d > 31) return birthError('일은 01~31 사이로 넣어주세요.', form.bd);
      if (!isRealDate(birth)) return birthError('달력에 없는 날짜예요. 다시 확인해 주세요.', null);
    }
    profile = { name: form.name.value.replace(/[<>&"']/g, '').trim().slice(0, 12), birth };
    saveProfile(profile);
  }
  applyLook();
  intro.hidden = true;
  intro.classList.remove('is-typing');
  intro.scrollTop = 0;
  if (!started) {
    started = true;
    document.body.classList.add('is-started');
    setTimeout(() => { if (!path.length) talkHint(); }, 2600);
  }
}
// 생년월일: 연도 4칸 · 월 2칸 · 일 2칸 (휴대폰 달력에서 연도를 거슬러 올라가지 않아도 되게)
const birthBoxes = [form.by, form.bm, form.bd];
const birthMsg = $('#birth-msg');
let skipBirthAsked = false;
const pad2 = (s) => (s.length === 1 ? '0' + s : s);
function readBirth() {
  const [y, mo, d] = birthBoxes.map((b) => b.value.trim());
  if (!y && !mo && !d) return '';
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}
function fillBirth(s) {
  const [y = '', mo = '', d = ''] = (s || '').split('-');
  form.by.value = y; form.bm.value = mo; form.bd.value = d;
}
function isRealDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !iljuFromBirth(s)) return false;
  const [y, mo, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d && dt <= new Date();
}
function birthError(text, box) {
  birthMsg.classList.remove('is-info');
  birthMsg.textContent = text;
  birthMsg.hidden = !text;
  birthBoxes.forEach((b) => b.classList.toggle('is-bad', !!text && (!box || b === box)));
  if (box) box.focus();
}
birthBoxes.forEach((box, i) => {
  box.addEventListener('input', () => {
    birthError('');
    const max = [4, 2, 2][i];
    let digits = box.value.replace(/\D/g, '');
    // 연도 칸에 8자리를 한 번에 붙여넣으면 세 칸으로 나눠 넣기
    if (i === 0 && digits.length > 4) {
      const all = digits.slice(0, 8);
      form.by.value = all.slice(0, 4); form.bm.value = all.slice(4, 6); form.bd.value = all.slice(6, 8);
      (all.length >= 8 ? form.bd : all.length > 6 ? form.bd : form.bm).focus();
      return;
    }
    if (digits.length > max) digits = digits.slice(0, max);
    if (box.value !== digits) box.value = digits;
    // 칸이 다 차면 다음 칸으로
    if (digits.length === max && birthBoxes[i + 1]) {
      birthBoxes[i + 1].focus();
      birthBoxes[i + 1].select();
    }
  });
  box.addEventListener('keydown', (e) => {
    // 빈 칸에서 지우기를 누르면 앞 칸으로
    if (e.key === 'Backspace' && !box.value && birthBoxes[i - 1]) {
      e.preventDefault();
      const prev = birthBoxes[i - 1];
      prev.focus();
      prev.value = prev.value.slice(0, -1);
    }
    // 점·빗금·띄어쓰기를 치면 다음 칸으로 (예: 1987.4.21)
    if (['.', '/', ' ', '-'].includes(e.key) && box.value && birthBoxes[i + 1]) {
      e.preventDefault();
      if (i > 0) box.value = pad2(box.value);
      birthBoxes[i + 1].focus();
    }
  });
  // 월·일은 칸을 벗어날 때 한 자리면 0을 붙임 (4 → 04)
  if (i > 0) box.addEventListener('blur', () => { if (box.value.length === 1) box.value = pad2(box.value); });
});
form.addEventListener('submit', (e) => { e.preventDefault(); enter(true); });
$('#intro-skip').addEventListener('click', () => enter(false));
$('#hud-ilju').addEventListener('click', () => (started ? approach('ilju') : null));
$('#hud-me').addEventListener('click', openProfile);
$('#hud-home').href = LINKS.home;

// 등불을 따라 처음 서재에 닿았을 때의 인사(유림거사 첫 대화에 한 번만)
let greeted = false;
function greetOnce() {
  if (greeted || !world.isHallLit()) return '';
  greeted = true;
  return '허허, 등불을 따라 잘 찾아오셨구먼. ';
}
// 화면 위쪽에 잠깐 떴다 사라지는 알림
const toast = document.createElement('div');
toast.className = 'toast';
toast.setAttribute('role', 'status');
document.body.appendChild(toast);
let toastTimer;
function showToast(html) {
  toast.innerHTML = html;
  toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3200);
}
world.onHallLit(() => showToast('🏮 서재에 불이 밝혀졌습니다 · <b>유림거사</b>가 고개를 듭니다'));

function talkHint() {
  showDialog('안내 동자', `${honor()}, 유림거사 서재에 오신 걸 환영해요!<br>골목은 아직 어둡지만, <b>걸음마다 등불이 켜져요</b>. 불빛을 따라 대문 안으로 들어오세요.`, [
    { label: '안내해줘', primary: true, act: () => approach('guide') },
    { label: '알아서 갈게', act: closeDialog },
  ]);
}

applyLook();
if (new URLSearchParams(location.search).has('debug')) window.__lounge = { player, approach, get path() { return path; } };
// 시작 화면은 항상 빈칸으로 시작합니다.

// ── 루프 ─────────────────────────────────────────
const clock = new THREE.Clock();
let fpsCheck = { t: 0, frames: 0, done: false };
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (started) introT += dt / 2.2;
  const moving = started ? updateMovement(dt) : 0;
  animatePerson(player, t, moving);
  for (const n of Object.values(world.npcs)) if (n.kind === 'person') animatePerson(n.obj, t, 0);
  for (const f of world.anim) f(t);
  world.updateLights(player.position.z, t, dt);
  marker.material.opacity *= 0.97;
  player.userData.aura.rotation.z = t * 0.6;
  updateCamera(dt);
  updateLabels();
  renderer.render(scene, camera);

  // 느린 기기면 그림자·해상도를 낮춥니다
  if (!fpsCheck.done && started) {
    fpsCheck.t += dt; fpsCheck.frames++;
    if (fpsCheck.t > 3) {
      fpsCheck.done = true;
      if (fpsCheck.frames / fpsCheck.t < 32) {
        renderer.shadowMap.enabled = false;
        renderer.setPixelRatio(1);
        scene.traverse((m) => { if (m.material) m.material.needsUpdate = true; });
      }
    }
  }
  requestAnimationFrame(loop);
}
// 첫 프레임 카메라 위치
camera.position.set(0, 24, 40);
camLook.set(0, 1, 16);
loop();
