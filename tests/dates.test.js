import { test } from "node:test";
import assert from "node:assert/strict";
import { addPeriod, daysBetween, formatDate, nextDue, parseDate, status, dDayLabel } from "../js/dates.js";

const d = parseDate;
const f = formatDate;

test("월 단위 더하기는 말일을 넘기지 않는다", () => {
  assert.equal(f(addPeriod(d("2026-01-31"), 1, "month")), "2026-02-28");
  assert.equal(f(addPeriod(d("2028-01-31"), 1, "month")), "2028-02-29");
  assert.equal(f(addPeriod(d("2026-10-17"), 6, "month")), "2027-04-17");
  assert.equal(f(addPeriod(d("2024-02-29"), 1, "year")), "2025-02-28");
});

test("일·주 단위 더하기", () => {
  assert.equal(f(addPeriod(d("2026-12-30"), 3, "day")), "2027-01-02");
  assert.equal(f(addPeriod(d("2026-10-17"), 2, "week")), "2026-10-31");
});

test("일회성 항목은 시작일 + 기간", () => {
  const item = { start: "2026-10-01", amount: 3, unit: "month", repeat: false };
  assert.equal(f(nextDue(item, d("2027-05-01"))), "2027-01-01");
});

test("반복 항목은 오늘 이후 첫 회차", () => {
  const sub = { start: "2026-01-31", amount: 1, unit: "month", repeat: true };
  assert.equal(f(nextDue(sub, d("2026-03-01"))), "2026-03-31");
  assert.equal(f(nextDue(sub, d("2026-01-31"))), "2026-01-31");
  const trash = { start: "2026-10-13", amount: 1, unit: "week", repeat: true };
  assert.equal(f(nextDue(trash, d("2026-10-17"))), "2026-10-20");
  assert.equal(f(nextDue(trash, d("2026-10-01"))), "2026-10-13");
});

test("D-day와 상태", () => {
  assert.equal(daysBetween(d("2026-10-17"), d("2026-10-20")), 3);
  assert.equal(daysBetween(d("2026-03-01"), d("2026-04-01")), 31); // 서머타임과 무관
  assert.equal(status(-1, 7), "expired");
  assert.equal(status(7, 7), "soon");
  assert.equal(status(8, 7), "ok");
  assert.equal(dDayLabel(0), "D-DAY");
  assert.equal(dDayLabel(5), "D-5");
  assert.equal(dDayLabel(-2), "D+2");
});
