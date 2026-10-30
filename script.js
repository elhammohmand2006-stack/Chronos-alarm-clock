/* =========================================================
   Chronos Alarm Clock
   Concepts used: DOM selection, Date object, setInterval,
   loops, functions, arrays, objects, events, Audio,
   localStorage, template literals, conditionals
   ========================================================= */

// ===== 1. Select DOM elements =====
const digitalEl = document.querySelector("#digital");
const dateEl = document.querySelector("#date");
const nextAlarmEl = document.querySelector("#nextAlarm");
const analogEl = document.querySelector("#analog");
const hourHand = document.querySelector("#hourHand");
const minuteHand = document.querySelector("#minuteHand");
const secondHand = document.querySelector("#secondHand");

const alarmForm = document.querySelector("#alarmForm");
const hourSelect = document.querySelector("#hourSelect");
const minuteSelect = document.querySelector("#minuteSelect");
const periodSelect = document.querySelector("#periodSelect");
const labelInput = document.querySelector("#labelInput");
const alarmList = document.querySelector("#alarmList");

const ringingScreen = document.querySelector("#ringing");
const ringingTime = document.querySelector("#ringingTime");
const ringingLabel = document.querySelector("#ringingLabel");
const stopBtn = document.querySelector("#stopBtn");
const snoozeBtn = document.querySelector("#snoozeBtn");

// ===== 2. App state =====
// Tip: download this file into your project folder and use "ringtone.mp3" for more reliability
const RINGTONE_URL = "https://next1code.ir/wp-content/uploads/2022/08/ringtone.mp3";
const ringtone = new Audio(RINGTONE_URL);
ringtone.loop = true; // keep ringing until the user stops it

let alarms = loadAlarms(); // array of alarm objects
let ringingAlarm = null;   // the alarm that is ringing right now
let lastMinute = "";       // stops us from checking alarms more than once per minute

// ===== 3. Helper functions =====

// Add a leading zero: 5 -> "05"
function pad(number) {
  return String(number).padStart(2, "0");
}

// Fill a <select> with options using a loop
function fillSelect(select, from, to) {
  for (let i = from; i <= to; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = pad(i);
    select.appendChild(option);
  }
}

// Convert 24-hour time to a friendly 12-hour string: (15, 5) -> "03:05 PM"
function formatTime(hour24, minute) {
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12; // 0 becomes 12
  return `${pad(hour12)}:${pad(minute)} ${period}`;
}

// ===== 4. Build the page controls =====
function buildControls() {
  fillSelect(hourSelect, 1, 12);
  fillSelect(minuteSelect, 0, 59);

  // Create the 60 tick marks around the analog clock
  for (let i = 0; i < 12; i++) {
    const tick = document.createElement("div");
    tick.className = "tick big";
    tick.style.transform = `rotate(${i * 30}deg)`;
    analogEl.prepend(tick);
  }
}

// ===== 5. The live clock (runs every second) =====
function updateClock() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();

  // Digital display
  digitalEl.textContent = `${pad(h % 12 || 12)}:${pad(m)}:${pad(s)} ${h >= 12 ? "PM" : "AM"}`;
  dateEl.textContent = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Analog hands: 360 degrees / 60 = 6 degrees per second or minute
  secondHand.style.transform = `translateX(-50%) rotate(${s * 6}deg)`;
  minuteHand.style.transform = `translateX(-50%) rotate(${m * 6 + s * 0.1}deg)`;
  hourHand.style.transform = `translateX(-50%) rotate(${(h % 12) * 30 + m * 0.5}deg)`;

  // Day / night theme
  document.body.dataset.theme = h >= 6 && h < 18 ? "day" : "night";

  // Check alarms once per minute
  const currentMinute = `${h}:${m}`;
  if (currentMinute !== lastMinute) {
    lastMinute = currentMinute;
    checkAlarms(h, m);
    showNextAlarm(h, m);
  }
}

// ===== 6. Alarm logic =====
function checkAlarms(hour, minute) {
  if (ringingAlarm) return; // already ringing

  const match = alarms.find(
    (alarm) => alarm.active && alarm.hour === hour && alarm.minute === minute
  );
  if (match) ring(match);
}

function ring(alarm) {
  ringingAlarm = alarm;
  ringingTime.textContent = formatTime(alarm.hour, alarm.minute);
  ringingLabel.textContent = alarm.label;
  ringingScreen.hidden = false;
  ringtone.play().catch(() => {
    // Browsers may block sound until the user clicks the page once
    console.log("Click on the page once to allow sound.");
  });
}

function stopRinging() {
  ringtone.pause();
  ringtone.currentTime = 0;
  ringingScreen.hidden = true;

  // One-time alarm: turn it off after it rings
  ringingAlarm.active = false;
  ringingAlarm = null;
  saveAlarms();
  renderAlarms();
}

function snooze() {
  const label = ringingAlarm.label;
  stopRinging();

  // Create a new alarm 5 minutes from now
  const later = new Date(Date.now() + 5 * 60 * 1000);
  addAlarm(later.getHours(), later.getMinutes(), `${label} (snoozed)`);
}

function addAlarm(hour, minute, label) {
  alarms.push({
    id: Date.now(),
    hour: hour,
    minute: minute,
    label: label || "Alarm",
    active: true,
  });
  saveAlarms();
  renderAlarms();
  showNextAlarm(new Date().getHours(), new Date().getMinutes());
}

// Show how long until the next active alarm
function showNextAlarm(hour, minute) {
  const activeAlarms = alarms.filter((alarm) => alarm.active);
  if (activeAlarms.length === 0) {
    nextAlarmEl.textContent = "No alarms set";
    return;
  }

  // Minutes from now until each alarm (wraps around midnight)
  const nowMinutes = hour * 60 + minute;
  const waits = activeAlarms.map((alarm) => {
    const diff = (alarm.hour * 60 + alarm.minute - nowMinutes + 1440) % 1440;
    return diff === 0 ? 1440 : diff;
  });
  const shortest = Math.min(...waits);

  nextAlarmEl.textContent = `Next alarm in ${Math.floor(shortest / 60)}h ${shortest % 60}m`;
}

// ===== 7. Show alarms on the page =====
function renderAlarms() {
  alarmList.innerHTML = "";

  if (alarms.length === 0) {
    alarmList.innerHTML = `<li class="empty">No alarms yet. Pick a time above and add one.</li>`;
    return;
  }

  alarms.forEach((alarm) => {
    const item = document.createElement("li");
    item.className = alarm.active ? "alarm-item" : "alarm-item off";
    item.dataset.id = alarm.id;
    item.innerHTML = `
      <div class="alarm-info">
        <div class="alarm-time">${formatTime(alarm.hour, alarm.minute)}</div>
        <div class="alarm-label">${alarm.label}</div>
      </div>
      <input type="checkbox" class="switch" aria-label="Turn alarm on or off" ${alarm.active ? "checked" : ""}>
      <button class="delete-btn" aria-label="Delete alarm">&times;</button>
    `;
    alarmList.appendChild(item);
  });
}

// ===== 8. Save and load (localStorage) =====
function saveAlarms() {
  localStorage.setItem("chronosAlarms", JSON.stringify(alarms));
}

function loadAlarms() {
  const saved = localStorage.getItem("chronosAlarms");
  return saved ? JSON.parse(saved) : [];
}

// ===== 9. Events =====

// Add a new alarm from the form
alarmForm.addEventListener("submit", (event) => {
  event.preventDefault();

  let hour = Number(hourSelect.value);
  const minute = Number(minuteSelect.value);

  // Convert 12-hour input to 24-hour time
  if (periodSelect.value === "PM" && hour !== 12) hour += 12;
  if (periodSelect.value === "AM" && hour === 12) hour = 0;

  // Escape "<" so labels cannot inject HTML
  const label = labelInput.value.trim().replace(/</g, "&lt;");
  addAlarm(hour, minute, label);
  labelInput.value = "";
});

// One listener for the whole list (event delegation)
alarmList.addEventListener("click", (event) => {
  if (!event.target.classList.contains("delete-btn")) return;
  const id = Number(event.target.closest(".alarm-item").dataset.id);
  alarms = alarms.filter((alarm) => alarm.id !== id);
  saveAlarms();
  renderAlarms();
  showNextAlarm(new Date().getHours(), new Date().getMinutes());
});

alarmList.addEventListener("change", (event) => {
  if (!event.target.classList.contains("switch")) return;
  const id = Number(event.target.closest(".alarm-item").dataset.id);
  const alarm = alarms.find((a) => a.id === id);
  alarm.active = event.target.checked;
  saveAlarms();
  renderAlarms();
  showNextAlarm(new Date().getHours(), new Date().getMinutes());
});

stopBtn.addEventListener("click", stopRinging);
snoozeBtn.addEventListener("click", snooze);

// ===== 10. Start the app =====
buildControls();
renderAlarms();
updateClock();
setInterval(updateClock, 1000);
