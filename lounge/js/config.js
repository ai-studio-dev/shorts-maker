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

// 결제 단계는 iframe 안에서 막히는 브라우저가 있어 새 창으로 엽니다.
export const OPEN_IN_NEW_TAB = new Set([LINKS.tarot3, LINKS.tarot5]);
