// 캘린더 연동 — 서버 없이 .ics 파일과 구글 캘린더 링크를 만든다.
import { addPeriod, formatDate, nextDue } from "./dates.js";

const FREQ = { day: "DAILY", week: "WEEKLY", month: "MONTHLY", year: "YEARLY" };
const APP_URL = "https://weniverse-studio.github.io/expiry-app/";

function compact(date) {
  return formatDate(date).replaceAll("-", "");
}

function rrule(item) {
  return `FREQ=${FREQ[item.unit]};INTERVAL=${item.amount}`;
}

export function eventTitle(item, category) {
  const suffix = item.repeat ? "" : item.category === "cosmetic" ? " 사용기한" : " 만료";
  return `${category.emoji} ${item.name}${suffix}`;
}

export function eventDetails(item, category) {
  return `${category.label} · 만료일 비서에서 등록\n${APP_URL}`;
}

// RFC 5545 텍스트 이스케이프
function escapeText(text) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// 한 줄은 75바이트를 넘지 않게 접는다 (한글은 3바이트라 글자 단위로 센다)
function fold(line) {
  const encoder = new TextEncoder();
  const parts = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // 이어지는 줄은 앞 공백 1바이트
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

// 하루 종일 일정 + 알림 2개 (임박 기준일 오전 9시, 당일 오전 9시)
export function buildICS(item, category, now = new Date()) {
  const due = nextDue(item);
  const end = addPeriod(due, 1, "day");
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const notice = Math.max(1, item.notice);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WENIVERSE STUDIO//Expiry App//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${item.id}@weniverse-expiry`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(due)}`,
    `DTEND;VALUE=DATE:${compact(end)}`,
    `SUMMARY:${escapeText(eventTitle(item, category))}`,
    `DESCRIPTION:${escapeText(eventDetails(item, category))}`,
    ...(item.repeat ? [`RRULE:${rrule(item)}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(`${notice}일 남았어요: ${item.name}`)}`,
    `TRIGGER:-P${notice - 1 > 0 ? `${notice - 1}D` : ""}T15H`,
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(`오늘이에요: ${item.name}`)}`,
    "TRIGGER:PT9H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(item, category) {
  const due = nextDue(item);
  const end = addPeriod(due, 1, "day");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: eventTitle(item, category),
    dates: `${compact(due)}/${compact(end)}`,
    details: eventDetails(item, category),
  });
  if (item.repeat) params.set("recur", `RRULE:${rrule(item)}`);
  return `https://calendar.google.com/calendar/render?${params}`;
}

// 일부 브라우저가 한글 파일 이름을 버리고 확장자 없는 "download"로 저장하므로 영문으로 만든다
export function icsFileName(item) {
  return `${item.category}-${compact(nextDue(item))}.ics`;
}
