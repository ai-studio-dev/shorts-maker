// 라운지에서 여는 기존 서비스 주소 — 도메인이 바뀌면 여기만 고치면 됩니다.
// (두 앱 모두 iframe 차단 헤더가 없어 라운지 안에서 바로 열립니다. 2026-11 확인)

export const LINKS = {
  home: 'https://yurimfortune.com',
  saju: 'https://saju-widget.vercel.app/',
  tarotHome: 'https://yurim-tarot.vercel.app/',
  tarotFree: 'https://yurim-tarot.vercel.app/free',
  tarot3: 'https://yurim-tarot.vercel.app/payment/checkout?product=tarot_3card',
  tarot5: 'https://yurim-tarot.vercel.app/payment/checkout?product=tarot_5card',
};

// 사주 위젯 상품을 서재 곳곳의 소품으로 보여줍니다. group 이 놓이는 자리입니다.
//   counter: 유림거사 앞 서안 위(분야별 리포트) · time: 서재 왼쪽 앞 진열대(종합·기간 운세)
//   free   : 마당 무료 좌판(무료 운세)
// 사주 위젯에는 아직 분야별 바로가기 주소가 없어서 모두 첫 화면(LINKS.saju)으로 연결하고,
// 서비스 창 상단에 "어느 메뉴를 누르면 되는지" 안내(pick)를 띄웁니다.
// 나중에 사주 위젯이 예: ?report=wealth 를 지원하게 되면 각 url 만 바꾸면 됩니다.
export const SAJU_TOPICS = [
  // ── 무료 ──
  { id: 'today', group: 'free', icon: '☀️', name: '무료 오늘운세', prop: '해시계', pick: '무료 오늘운세', free: true,
    desc: '하루의 흐름을 가볍게 살펴보는 <b>무료 리포트</b>예요. 결제 없이 바로 볼 수 있어요.', url: LINKS.saju },
  { id: 'zodiac', group: 'free', icon: '🐉', name: '무료 띠별운세', prop: '십이지 원판', pick: '무료 띠별운세', free: true,
    desc: '태어난 해의 <b>띠</b>를 기준으로 보는 오늘의 흐름이에요. 이것도 무료예요.', url: LINKS.saju },
  // ── 분야별 리포트 (서안 위) ──
  { id: 'wealth', group: 'counter', icon: '💰', name: '재물운', prop: '금두꺼비', pick: '재물운',
    desc: '돈이 들어오는 길과 새는 구멍을 사주로 짚어보는 <b>돈의 흐름 진단서</b>일세.', url: LINKS.saju },
  { id: 'health', group: 'counter', icon: '🌿', name: '건강운', prop: '약초 항아리', pick: '건강운',
    desc: '타고난 체질과 올해 조심할 때를 살피는 <b>몸과 마음의 리듬 리포트</b>라네.', url: LINKS.saju },
  { id: 'career', group: 'counter', icon: '📜', name: '직업·사업운', prop: '주판과 장부', pick: '직업·사업운',
    desc: '어떤 일에서 힘이 나고 언제 넓혀야 하는지, <b>일과 확장의 방향 리포트</b>일세.', url: LINKS.saju },
  { id: 'love', group: 'counter', icon: '💞', name: '애정·가족운', prop: '원앙 한 쌍', pick: '애정·가족운',
    desc: '가까운 사람과의 <b>관계의 온도와 거리</b>를 사주로 읽어보세.', url: LINKS.saju },
  { id: 'match', group: 'counter', icon: '🤝', name: '궁합', prop: '붉은 실 매듭', pick: '궁합 보기',
    desc: '연애·결혼은 물론 <b>부모자녀·동업</b> 궁합까지 두 사람의 사주를 함께 보네.', url: LINKS.saju },
  { id: 'pet', group: 'counter', icon: '🐾', name: '반려동물', prop: '강아지 방석', pick: '반려동물 코너 보기',
    desc: '우리 집 아이와 나의 궁합, <b>무료 품종 특성</b>부터 가볍게 확인해 보시게.', url: LINKS.saju },
  // ── 종합·기간 운세 (왼쪽 진열대) ──
  { id: 'total', group: 'time', icon: '📖', name: '종합 리포트', prop: '명리 원전', pick: '종합 리포트',
    desc: '사주 구조·오행·대운·세운에 <b>실전 조언</b>까지 한 권에 담은 대표 리포트일세.', url: LINKS.saju },
  { id: 'weekly', group: 'time', icon: '🗓️', name: '주간운세', prop: '이레 달력', pick: '시간형 리포트',
    desc: '이번 한 주, 날마다 <b>힘을 줄 때와 쉬어갈 때</b>를 짚어보세.', url: LINKS.saju },
  { id: 'yearly', group: 'time', icon: '🐐', name: '올해·2027 신년운세', prop: '붉은 양', pick: '시간형 리포트',
    desc: '2027년은 붉은 양의 해, <b>정미년(丁未年)</b>일세. 올해 남은 흐름과 새해 운을 미리 살펴보시게.', url: LINKS.saju },
];

export const TOPIC_GROUPS = {
  free: { title: '무료 운세', intro: '마당 좌판의 무료 운세부터 가볍게 보고 가시게. 결제 없이 바로 볼 수 있다네.' },
  counter: { title: '분야별 리포트', intro: '내 앞 서안의 소품마다 풀이가 하나씩 깃들어 있다네.<br>어떤 운이 궁금한가?' },
  time: { title: '종합·기간 운세', intro: '왼쪽 진열대에는 삶 전체를 보는 종합 리포트와 한 주·한 해의 흐름을 보는 운세가 있다네.' },
};

// 결제 단계는 iframe 안에서 막히는 브라우저가 있어 새 창으로 엽니다.
export const OPEN_IN_NEW_TAB = new Set([LINKS.tarot3, LINKS.tarot5]);
