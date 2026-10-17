// 분류별 기본값과 빠른 등록 프리셋.
// notice: 만료 며칠 전부터 "임박"으로 표시할지
export const CATEGORIES = {
  cosmetic: {
    label: "화장품",
    emoji: "🧴",
    startLabel: "개봉일",
    repeat: false,
    notice: 14,
    hint: "용기의 개봉 후 사용기한(예: 12M) 표기가 있으면 그 기간을 우선하세요.",
    presets: [
      { name: "마스카라", amount: 3, unit: "month" },
      { name: "아이라이너", amount: 6, unit: "month" },
      { name: "쿠션·파운데이션", amount: 6, unit: "month" },
      { name: "세럼·에센스", amount: 6, unit: "month" },
      { name: "크림", amount: 12, unit: "month" },
      { name: "선크림", amount: 12, unit: "month" },
      { name: "스킨·토너", amount: 12, unit: "month" },
      { name: "립스틱", amount: 18, unit: "month" },
    ],
  },
  trash: {
    label: "생활",
    emoji: "🗑️",
    startLabel: "다음 배출일",
    repeat: true,
    notice: 1,
    hint: "다음 배출일을 넣으면 매주 같은 요일로 계속 알려드려요.",
    presets: [
      { name: "일반쓰레기", amount: 1, unit: "week" },
      { name: "재활용", amount: 1, unit: "week" },
      { name: "음식물쓰레기", amount: 1, unit: "week" },
      { name: "정수기 필터", amount: 6, unit: "month" },
      { name: "칫솔 교체", amount: 3, unit: "month" },
    ],
  },
  contract: {
    label: "계약·서류",
    emoji: "📄",
    startLabel: "발급·계약일",
    repeat: false,
    notice: 30,
    hint: "만료일을 정확히 알면 기간 대신 시작일을 조정해 맞춰 주세요.",
    presets: [
      { name: "전세·월세 계약", amount: 2, unit: "year" },
      { name: "휴대폰 약정", amount: 2, unit: "year" },
      { name: "자동차보험", amount: 1, unit: "year" },
      { name: "운전면허 갱신", amount: 10, unit: "year" },
      { name: "여권", amount: 10, unit: "year" },
    ],
  },
  subscription: {
    label: "구독·결제",
    emoji: "💳",
    startLabel: "결제일",
    repeat: true,
    notice: 3,
    hint: "최근 결제일을 넣으면 다음 결제일을 계속 계산해요.",
    presets: [
      { name: "OTT 구독", amount: 1, unit: "month" },
      { name: "음악 스트리밍", amount: 1, unit: "month" },
      { name: "쇼핑 멤버십", amount: 1, unit: "month" },
      { name: "연간 구독", amount: 1, unit: "year" },
    ],
  },
};

export const UNIT_LABELS = { day: "일", week: "주", month: "개월", year: "년" };
