// 일주(日柱) · 일진(日辰) 계산 — 60갑자 기준.
// 기준일: 1900-01-01 = 갑술(甲戌)일 (60갑자 인덱스 10).
// 자시(23시) 경계와 절기 보정은 하지 않는 간단 버전입니다(라운지 연출용).

export const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
export const STEMS_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
export const BRANCHES_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

export const ELEMENTS = ['목', '화', '토', '금', '수'];
export const ELEMENT_HANJA = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
// 천간 → 오행
const STEM_ELEMENT = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];

// 아바타·카드 색 (오행별)
export const ELEMENT_COLORS = {
  목: { robe: '#3f7a52', trim: '#cfe3c4', glow: '#7fc28f' },
  화: { robe: '#a8402f', trim: '#f2d0b8', glow: '#ff8a5c' },
  토: { robe: '#a9843f', trim: '#f0e0b8', glow: '#e8c06a' },
  금: { robe: '#b9b8b0', trim: '#5b5a55', glow: '#f4f1e6' },
  수: { robe: '#2b4a74', trim: '#c8d6ea', glow: '#79a8e8' },
};

export const ELEMENT_NATURE = {
  목: '곧게 뻗어 자라는 나무의 기운 — 성장과 시작에 강합니다.',
  화: '밝게 타오르는 불의 기운 — 표현과 열정이 돋보입니다.',
  토: '넓게 품는 흙의 기운 — 믿음직하고 중심을 잡아줍니다.',
  금: '단단하게 벼린 쇠의 기운 — 결단과 원칙이 분명합니다.',
  수: '깊이 흐르는 물의 기운 — 지혜롭고 유연하게 스며듭니다.',
};

const DAY_MS = 86400000;
const BASE_UTC = Date.UTC(1900, 0, 1);
const BASE_INDEX = 10; // 甲戌

function mod(n, m) { return ((n % m) + m) % m; }

/** y, m(1-12), d → 60갑자 인덱스 */
export function dayIndex(y, m, d) {
  const days = Math.round((Date.UTC(y, m - 1, d) - BASE_UTC) / DAY_MS);
  return mod(BASE_INDEX + days, 60);
}

export function pillar(index) {
  const s = index % 10;
  const b = index % 12;
  return {
    index,
    stem: STEMS[s],
    branch: BRANCHES[b],
    hanja: STEMS_HANJA[s] + BRANCHES_HANJA[b],
    label: STEMS[s] + BRANCHES[b],
    element: STEM_ELEMENT[s],
    animal: ANIMALS[b],
  };
}

/** 'YYYY-MM-DD' → 일주 정보 (형식이 틀리면 null) */
export function iljuFromBirth(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return pillar(dayIndex(y, mo, d));
}

export function todayPillar(now = new Date()) {
  return pillar(dayIndex(now.getFullYear(), now.getMonth() + 1, now.getDate()));
}

// 상생: 목→화→토→금→수→목 / 상극: 목→토→수→화→금→목
const GEN = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
const CTRL = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };

/** 내 일간 오행(me)과 오늘 일진 오행(day)의 관계 해석 */
export function dayRelation(me, day) {
  if (me === day) return {
    key: '비화', title: '같은 기운이 들어오는 날',
    text: '내 페이스대로 밀고 나가기 좋은 날입니다. 다만 고집이 세지기 쉬우니 한 번은 남의 말을 끝까지 들어보세요.',
  };
  if (GEN[day] === me) return {
    key: '인성', title: '도움과 배움이 들어오는 날',
    text: '누군가의 조언이나 정보가 힘이 되는 날입니다. 혼자 붙잡고 있던 일을 물어보면 의외로 쉽게 풀립니다.',
  };
  if (GEN[me] === day) return {
    key: '식상', title: '표현하고 내보내는 날',
    text: '말과 글, 손끝의 재주가 살아나는 날입니다. 미뤄둔 연락이나 제안을 먼저 꺼내보세요.',
  };
  if (CTRL[me] === day) return {
    key: '재성', title: '실속을 챙기는 날',
    text: '눈앞의 결과와 돈의 흐름을 정리하기 좋은 날입니다. 큰 욕심보다 작은 실속부터 확실히 챙기세요.',
  };
  return {
    key: '관성', title: '책임과 규칙이 다가오는 날',
    text: '해야 할 일과 약속이 무겁게 느껴질 수 있는 날입니다. 순서를 정해 하나씩 처리하면 오히려 평가가 오릅니다.',
  };
}
