import { test } from "node:test";
import assert from "node:assert/strict";
import { buildICS, googleCalendarUrl, icsFileName } from "../js/calendar.js";
import { CATEGORIES } from "../js/categories.js";
import { formatDate, nextDue } from "../js/dates.js";

const serum = { id: "abc", category: "cosmetic", name: "세럼, 비타민C", start: "2099-01-15", amount: 6, unit: "month", repeat: false, notice: 14 };
const netflix = { id: "n1", category: "subscription", name: "넷플릭스", start: "2099-01-31", amount: 1, unit: "month", repeat: true, notice: 1 };

test("일회성 일정: 하루 종일, 만료일, 알림 2개", () => {
  const ics = buildICS(serum, CATEGORIES.cosmetic, new Date("2026-10-17T00:00:00Z"));
  assert.match(ics, /DTSTART;VALUE=DATE:20990715\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20990716\r\n/);
  assert.match(ics, /SUMMARY:🧴 세럼\\, 비타민C 사용기한/);
  assert.match(ics, /TRIGGER:-P13DT15H/); // 14일 전 오전 9시
  assert.match(ics, /TRIGGER:PT9H/);      // 당일 오전 9시
  assert.match(ics, /UID:abc@weniverse-expiry/);
  assert.doesNotMatch(ics, /RRULE/);
  assert.ok(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75));
});

test("반복 일정: RRULE과 하루 전 알림", () => {
  const ics = buildICS(netflix, CATEGORIES.subscription);
  assert.match(ics, /RRULE:FREQ=MONTHLY;INTERVAL=1/);
  assert.match(ics, /TRIGGER:-PT15H/);
  assert.match(ics, /SUMMARY:💳 넷플릭스\r\n/);
});

test("구글 캘린더 링크", () => {
  const url = new URL(googleCalendarUrl(netflix, CATEGORIES.subscription));
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
  const due = formatDate(nextDue(netflix)).replaceAll("-", "");
  assert.equal(url.searchParams.get("dates"), `${due}/20990201`);
  assert.equal(url.searchParams.get("recur"), "RRULE:FREQ=MONTHLY;INTERVAL=1");
});

test("파일 이름은 영문 분류 + 날짜", () => {
  assert.equal(icsFileName(serum), "cosmetic-20990715.ics");
});
