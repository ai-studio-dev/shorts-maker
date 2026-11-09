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

// 유림거사 뒤 진열장의 분야별 소품.
// 사주 위젯에는 아직 분야별 바로가기 주소가 없어서 모두 첫 화면(LINKS.saju)으로 연결하고,
// 서비스 창 상단에 "어느 메뉴를 누르면 되는지" 안내(pick)를 띄웁니다.
// 나중에 사주 위젯이 예: ?report=wealth 를 지원하게 되면 각 url 만 바꾸면 됩니다.
export const SAJU_TOPICS = [
  { id: 'wealth', icon: '💰', name: '재물운', prop: '금두꺼비', pick: '재물운',
    desc: '돈이 들어오는 길과 새는 구멍을 사주로 짚어보는 <b>돈의 흐름 진단서</b>일세.', url: LINKS.saju },
  { id: 'health', icon: '🌿', name: '건강운', prop: '약초 항아리', pick: '건강운',
    desc: '타고난 체질과 올해 조심할 때를 살피는 <b>몸과 마음의 리듬 리포트</b>라네.', url: LINKS.saju },
  { id: 'career', icon: '📜', name: '직업·사업운', prop: '주판과 장부', pick: '직업·사업운',
    desc: '어떤 일에서 힘이 나고 언제 넓혀야 하는지, <b>일과 확장의 방향 리포트</b>일세.', url: LINKS.saju },
  { id: 'love', icon: '💞', name: '애정·가족운', prop: '원앙 한 쌍', pick: '애정·가족운',
    desc: '가까운 사람과의 <b>관계의 온도와 거리</b>를 사주로 읽어보세.', url: LINKS.saju },
  { id: 'match', icon: '🤝', name: '궁합', prop: '붉은 실 매듭', pick: '궁합 보기',
    desc: '연애·결혼은 물론 <b>부모자녀·동업</b> 궁합까지 두 사람의 사주를 함께 보네.', url: LINKS.saju },
  { id: 'pet', icon: '🐾', name: '반려동물', prop: '강아지 방석', pick: '반려동물 코너 보기',
    desc: '우리 집 아이와 나의 궁합, <b>무료 품종 특성</b>부터 가볍게 확인해 보시게.', url: LINKS.saju },
];

// 결제 단계는 iframe 안에서 막히는 브라우저가 있어 새 창으로 엽니다.
export const OPEN_IN_NEW_TAB = new Set([LINKS.tarot3, LINKS.tarot5]);
