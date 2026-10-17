// 날짜 계산 — 모든 날짜는 "YYYY-MM-DD" 문자열로 저장하고 로컬 자정 기준으로 계산한다.

export function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// 1월 31일 + 1개월 = 2월 28일(29일)처럼 말일을 넘기지 않는다.
export function addPeriod(date, amount, unit) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (unit === "day") return new Date(d.getFullYear(), d.getMonth(), d.getDate() + amount);
  if (unit === "week") return new Date(d.getFullYear(), d.getMonth(), d.getDate() + amount * 7);
  const months = unit === "year" ? amount * 12 : amount;
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return target;
}

export function daysBetween(from, to) {
  return Math.round((to - from) / 86400000);
}

// 반복 항목: 시작일 + k*주기 중 오늘 이후 첫 날짜 (k ≥ 0)
// 일회성 항목: 시작일 + 주기 (예: 개봉일 + 6개월)
export function nextDue(item, now = today()) {
  const start = parseDate(item.start);
  if (!item.repeat) return addPeriod(start, item.amount, item.unit);
  let k = 0;
  let due = start;
  while (due < now && k < 10000) {
    k += 1;
    due = addPeriod(start, item.amount * k, item.unit);
  }
  return due;
}

export function status(daysLeft, noticeDays) {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= noticeDays) return "soon";
  return "ok";
}

export function dDayLabel(daysLeft) {
  if (daysLeft === 0) return "D-DAY";
  return daysLeft > 0 ? `D-${daysLeft}` : `D+${-daysLeft}`;
}
