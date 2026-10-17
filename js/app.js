import { CATEGORIES, UNIT_LABELS } from "./categories.js";
import { daysBetween, dDayLabel, formatDate, nextDue, status, today } from "./dates.js";
import { buildICS, eventTitle, googleCalendarUrl, icsFileName } from "./calendar.js";

const STORAGE_KEY = "expiry-app/items";
const NOTIFIED_KEY = "expiry-app/notified-on";
const CALENDAR_PREF_KEY = "expiry-app/add-to-calendar";

const $ = (sel) => document.querySelector(sel);
const list = $("#list");
const dialog = $("#dialog");
const form = $("#form");

let items = load();
let filter = "all";
let editingId = null;
let formCategory = "cosmetic";

// ----- 저장소 -----
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ----- 계산 -----
function withDue(item) {
  const due = nextDue(item);
  const daysLeft = daysBetween(today(), due);
  return { ...item, due, daysLeft, state: status(daysLeft, item.notice) };
}

// ----- 렌더링 -----
function renderFilters() {
  const nav = $("#filters");
  const entries = [["all", "전체"], ...Object.entries(CATEGORIES).map(([k, c]) => [k, `${c.emoji} ${c.label}`])];
  nav.replaceChildren(
    ...entries.map(([key, label]) => {
      const b = document.createElement("button");
      b.className = "chip" + (filter === key ? " is-active" : "");
      b.textContent = label;
      b.addEventListener("click", () => {
        filter = key;
        render();
      });
      return b;
    })
  );
}

function render() {
  const computed = items.map(withDue).sort((a, b) => a.daysLeft - b.daysLeft);
  $("#count-expired").textContent = computed.filter((i) => i.state === "expired").length;
  $("#count-soon").textContent = computed.filter((i) => i.state === "soon").length;
  $("#count-all").textContent = computed.length;

  const visible = filter === "all" ? computed : computed.filter((i) => i.category === filter);
  $("#empty").hidden = visible.length > 0;
  list.replaceChildren(...visible.map(renderItem));
  renderFilters();
}

function renderItem(item) {
  const cat = CATEGORIES[item.category];
  const li = document.createElement("li");
  li.className = `item item--${item.state}`;

  const emoji = document.createElement("span");
  emoji.className = "item__emoji";
  emoji.textContent = cat.emoji;

  const body = document.createElement("div");
  const name = document.createElement("p");
  name.className = "item__name";
  name.textContent = item.name;
  const meta = document.createElement("p");
  meta.className = "item__meta";
  const period = `${item.amount}${UNIT_LABELS[item.unit]}`;
  meta.textContent = `${formatDate(item.due)} · ${item.repeat ? `${period}마다` : `${cat.startLabel} + ${period}`}`;
  body.append(name, meta);

  const side = document.createElement("div");
  side.className = "item__side";
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = dDayLabel(item.daysLeft);
  const actions = document.createElement("div");
  actions.className = "item__actions";
  if (!item.repeat) actions.append(miniButton("새로 시작", () => renew(item.id)));
  actions.append(
    miniButton("📅", () => openCalendarDialog(item.id), "캘린더에 추가"),
    miniButton("수정", () => openDialog(item.id)),
    miniButton("삭제", () => remove(item.id))
  );
  side.append(badge, actions);

  li.append(emoji, body, side);
  return li;
}

function miniButton(label, onClick, ariaLabel) {
  const b = document.createElement("button");
  b.className = "mini";
  b.textContent = label;
  if (ariaLabel) b.setAttribute("aria-label", ariaLabel);
  b.addEventListener("click", onClick);
  return b;
}

// ----- 동작 -----
function renew(id) {
  // 새 제품을 개봉했거나 계약을 갱신했을 때: 시작일을 오늘로
  items = items.map((i) => (i.id === id ? { ...i, start: formatDate(today()) } : i));
  save();
  render();
  if (calendarPreferred()) openCalendarDialog(id, "날짜가 바뀌었어요. 캘린더 일정도 새 날짜로 추가해 주세요.");
}

function remove(id) {
  const item = items.find((i) => i.id === id);
  if (!confirm(`'${item.name}'을(를) 삭제할까요?`)) return;
  items = items.filter((i) => i.id !== id);
  save();
  render();
}

// ----- 등록/수정 폼 -----
function setFormCategory(key, { applyDefaults }) {
  formCategory = key;
  const cat = CATEGORIES[key];
  $("#start-label").textContent = cat.startLabel;
  $("#hint").textContent = cat.hint;
  if (applyDefaults) form.repeat.checked = cat.repeat;

  $("#form-cats").replaceChildren(
    ...Object.entries(CATEGORIES).map(([k, c]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (k === key ? " is-active" : "");
      b.textContent = `${c.emoji} ${c.label}`;
      b.addEventListener("click", () => setFormCategory(k, { applyDefaults: true }));
      return b;
    })
  );

  $("#presets").replaceChildren(
    ...cat.presets.map((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = `${p.name} ${p.amount}${UNIT_LABELS[p.unit]}`;
      b.addEventListener("click", () => {
        form.name.value = p.name;
        form.amount.value = p.amount;
        form.unit.value = p.unit;
        updatePreview();
      });
      return b;
    })
  );
  updatePreview();
}

function readForm() {
  return {
    category: formCategory,
    name: form.name.value.trim(),
    start: form.start.value,
    amount: Number(form.amount.value),
    unit: form.unit.value,
    repeat: form.repeat.checked,
    notice: CATEGORIES[formCategory].notice,
  };
}

function updatePreview() {
  const draft = readForm();
  const preview = $("#preview");
  if (!draft.start || !(draft.amount >= 1)) {
    preview.textContent = "날짜와 기간을 넣으면 만료일을 계산해 드려요.";
    return;
  }
  const { due, daysLeft } = withDue(draft);
  const label = draft.repeat ? "다음 알림일" : "만료일";
  preview.textContent = `${label}: ${formatDate(due)} (${dDayLabel(daysLeft)})`;
}

function openDialog(id = null) {
  editingId = id;
  const item = items.find((i) => i.id === id);
  $("#dialog-title").textContent = item ? "항목 수정" : "새 항목";
  form.reset();
  if (item) {
    form.name.value = item.name;
    form.start.value = item.start;
    form.amount.value = item.amount;
    form.unit.value = item.unit;
    form.repeat.checked = item.repeat;
    form.calendar.checked = false;
    setFormCategory(item.category, { applyDefaults: false });
  } else {
    form.start.value = formatDate(today());
    form.calendar.checked = calendarPreferred();
    setFormCategory(filter !== "all" ? filter : "cosmetic", { applyDefaults: true });
  }
  dialog.showModal();
}

form.addEventListener("input", updatePreview);
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = readForm();
  const wasEditing = Boolean(editingId);
  let id = editingId;
  if (wasEditing) {
    items = items.map((i) => (i.id === editingId ? { ...i, ...data } : i));
  } else {
    id = crypto.randomUUID();
    items.push({ id, createdAt: new Date().toISOString(), ...data });
    setCalendarPreferred(form.calendar.checked);
  }
  save();
  dialog.close();
  render();
  if (form.calendar.checked) {
    openCalendarDialog(id, wasEditing ? "수정한 내용으로 캘린더에 다시 추가해 주세요." : "저장했어요. 이제 캘린더에도 넣어둘게요.");
  }
});
$("#cancel-btn").addEventListener("click", () => dialog.close());
$("#add-btn").addEventListener("click", () => openDialog());

// ----- 캘린더 연동 -----
const calDialog = $("#cal-dialog");
let calendarItemId = null;

function calendarPreferred() {
  return localStorage.getItem(CALENDAR_PREF_KEY) === "on";
}
function setCalendarPreferred(on) {
  localStorage.setItem(CALENDAR_PREF_KEY, on ? "on" : "off");
}

function openCalendarDialog(id, message = "캘린더 앱이 앱 대신 미리 알려드려요.") {
  const item = withDue(items.find((i) => i.id === id));
  const cat = CATEGORIES[item.category];
  calendarItemId = id;
  $("#cal-desc").textContent = message;
  $("#cal-event").textContent = `${eventTitle(item, cat)} · ${formatDate(item.due)}${item.repeat ? " (반복)" : ""}`;
  $("#cal-note").textContent = `알림: ${item.notice}일 전 오전 9시, 당일 오전 9시` +
    " · 구글 캘린더 링크는 캘린더 기본 알림이 적용돼요. 같은 항목을 다시 추가하면 일정이 겹칠 수 있으니 예전 일정은 지워 주세요.";
  calDialog.showModal();
}

$("#cal-ics").addEventListener("click", () => {
  const item = items.find((i) => i.id === calendarItemId);
  const blob = new Blob([buildICS(item, CATEGORIES[item.category])], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = icsFileName(item);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  calDialog.close();
});

$("#cal-google").addEventListener("click", () => {
  const item = items.find((i) => i.id === calendarItemId);
  window.open(googleCalendarUrl(item, CATEGORIES[item.category]), "_blank", "noopener");
  calDialog.close();
});

$("#cal-close").addEventListener("click", () => calDialog.close());

// ----- 알림 -----
// 지금 단계에서는 앱을 열 때 하루 한 번 요약 알림을 띄운다.
// 앱을 열지 않아도 오는 알림은 푸시 서버가 필요하다 (README 참고).
const notifyBtn = $("#notify-btn");
function syncNotifyButton() {
  const on = "Notification" in window && Notification.permission === "granted";
  notifyBtn.classList.toggle("is-on", on);
  notifyBtn.title = on ? "알림 켜짐" : "알림 켜기";
}
notifyBtn.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert("이 브라우저는 알림을 지원하지 않아요. 홈 화면에 앱을 추가한 뒤 다시 시도해 주세요.");
    return;
  }
  await Notification.requestPermission();
  syncNotifyButton();
  notifyDueItems({ force: true });
});

async function notifyDueItems({ force = false } = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const todayKey = formatDate(today());
  if (!force && localStorage.getItem(NOTIFIED_KEY) === todayKey) return;

  const urgent = items.map(withDue).filter((i) => i.state !== "ok").sort((a, b) => a.daysLeft - b.daysLeft);
  if (urgent.length === 0) return;

  const body = urgent.slice(0, 4).map((i) => `${CATEGORIES[i.category].emoji} ${i.name} ${dDayLabel(i.daysLeft)}`).join("\n");
  const title = `챙길 항목 ${urgent.length}개`;
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) reg.showNotification(title, { body, icon: "icons/icon-192.png", tag: "daily-summary" });
  else new Notification(title, { body });
  localStorage.setItem(NOTIFIED_KEY, todayKey);
}

// ----- 시작 -----
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
syncNotifyButton();
render();
notifyDueItems();
