#!/usr/bin/env node
/**
 * Generates seed_3_months.sql: ~3 months (2026-04-24 .. 2026-07-24 inclusive) of realistic
 * RMS operational history, written as plain SQL Server INSERT statements.
 *
 * This does NOT call any Java service code -- it ports the exact formulas from
 * AttendanceCalculator.java and SalaryCalculator.java into JS so the numbers it writes are
 * consistent with what the real backend would compute for the same inputs. Business codes
 * (order/invoice sequences, cashbook/payroll MAX+1 codes) continue from the live values in
 * rms_db verified on 2026-07-24 -- re-verify the COUNTERS block below before re-running this
 * script against a database that has since seen more real usage.
 *
 * Usage: node generate_seed.js
 * Writes seed_3_months.sql next to this file. Review it, then apply with sqlcmd. Requires
 * `sqlcmd` on PATH and reachable at localhost with the credentials below (used only for
 * read-only SELECTs of reference master data -- menu items, tables).
 *
 * (Originally written in Python; ported to Node.js because no Python interpreter was
 * available on the dev machine that generated this -- see the plan/session notes.)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

// ---------------------------------------------------------------------------------------
// Seeded RNG (mulberry32) so re-running reproduces the same data
// ---------------------------------------------------------------------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260724);
const randFloat = () => rand();
const randInt = (a, b) => a + Math.floor(rand() * (b - a + 1)); // inclusive
const choice = (arr) => arr[Math.floor(rand() * arr.length)];
function sample(arr, n) {
  const copy = arr.slice();
  const out = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
}
function weightedChoice(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r < 0) return items[i]; }
  return items[items.length - 1];
}
const newId = () => crypto.randomUUID();

// ---------------------------------------------------------------------------------------
// Date helpers (plain local-time Date objects; never use toISOString/UTC methods)
// ---------------------------------------------------------------------------------------
const pad2 = (n) => String(n).padStart(2, '0');
const mkDate = (y, m, d, hh = 0, mi = 0, ss = 0) => new Date(y, m - 1, d, hh, mi, ss);
const addDays = (dt, n) => { const d = new Date(dt); d.setDate(d.getDate() + n); return d; };
const addMinutes = (dt, n) => new Date(dt.getTime() + n * 60000);
const dateOnly = (dt) => mkDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
const dateKey = (dt) => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
const pyWeekday = (dt) => (dt.getDay() + 6) % 7; // Mon=0..Sun=6
const diffMinutes = (a, b) => Math.floor((b.getTime() - a.getTime()) / 60000);
const fmtDate = (dt) => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
const fmtDateTime = (dt) => dt ? `${fmtDate(dt)} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}` : null;
const fmtIsoDateTime = (dt) => dt ? `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}` : null;
const fmtTime = (hh, mm) => `${pad2(hh)}:${pad2(mm)}:00`;
function daterange(a, b) { const out = []; let d = dateOnly(a); const end = dateOnly(b); while (d <= end) { out.push(d); d = addDays(d, 1); } return out; }

// ---------------------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------------------
const START_DATE = mkDate(2026, 4, 24);
const END_DATE = mkDate(2026, 7, 24); // inclusive
const ALL_DATES = daterange(START_DATE, END_DATE);

const SQLCMD_ARGS_BASE = ['-S', 'localhost', '-U', 'sa', '-P', '123', '-d', 'rms_db'];
const OUT_PATH = path.join(__dirname, 'seed_3_months.sql');

// MAX(code)/sequence values verified live against rms_db on 2026-07-24.
const COUNTERS = {
  order_seq: 9, invoice_seq: 10, NV: 3, PT: 0, PC: 4, TT: 8, BL: 2, PL: 5,
};
function nextCode(prefix, width = 6) { COUNTERS[prefix] += 1; return `${prefix}${String(COUNTERS[prefix]).padStart(width, '0')}`; }
function nextOrderCode() { COUNTERS.order_seq += 1; return `DH${String(COUNTERS.order_seq).padStart(6, '0')}`; }
function nextInvoiceCode() { COUNTERS.invoice_seq += 1; return `HD${String(COUNTERS.invoice_seq).padStart(6, '0')}`; }

// ---------------------------------------------------------------------------------------
// Live reference data (read-only SELECTs against rms_db)
// ---------------------------------------------------------------------------------------
function sqlcmdQuery(sql) {
  const args = [...SQLCMD_ARGS_BASE, '-h', '-1', '-s', '|', '-W', '-Q', `SET NOCOUNT ON; ${sql}`];
  const out = execFileSync('sqlcmd', args, { encoding: 'utf8' });
  return out.split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l && !/^-+$/.test(l.trim()))
    .map((l) => l.split('|').map((p) => p.trim()));
}

const MENU_ITEMS = sqlcmdQuery('SELECT id, name, price FROM menu_items WHERE available = 1')
  .map(([id, name, price]) => [id, name, parseInt(price, 10)]);
const TABLE_IDS = sqlcmdQuery('SELECT id FROM restaurant_tables WHERE active = 1').map((r) => r[0]);
if (!MENU_ITEMS.length) throw new Error('No available menu_items found -- is rms_db reachable and seeded?');
if (!TABLE_IDS.length) throw new Error('No active restaurant_tables found.');

// Cashbook categories (verified live 2026-07-24; kept, not re-inserted).
const CAT_SALARY_PAYMENT = 'c0000000-0000-0000-0000-000000000001'; // PAYMENT, income=1
const CAT_SALES_RECEIPT = 'c0000000-0000-0000-0000-000000000002'; // RECEIPT, income=1
const CAT_OTHER_RECEIPT = 'c0000000-0000-0000-0000-000000000003'; // RECEIPT, income=0
const CAT_INGREDIENTS = 'c0000000-0000-0000-0000-000000000004'; // PAYMENT, income=1
const CAT_UTILITIES = 'c0000000-0000-0000-0000-000000000005'; // PAYMENT, income=1
const CAT_CSVC = '449f9dcf-ab85-4d95-8f0d-041da9ad9fc2'; // PAYMENT, income=1

// Active promotions usable for discounted invoices (verified live 2026-07-24).
const PROMO_PERCENT10 = { id: '9d235c2b-3288-4383-a6e7-b1d1640b966a', percent: 10, amount: null };
const PROMO_FLAT50K = { id: '66937284-293f-47d2-8604-ad3a7002f40e', percent: null, amount: 50000 };
const PROMOTIONS = [PROMO_PERCENT10, PROMO_FLAT50K];
const PROMO_USAGE = {};

// Existing users (verified live 2026-07-24; kept, not re-inserted).
const USER_MANAGER01 = '0cd90d8a-b3c4-47f7-aea7-b49f6eae4752';
const USER_CASHIER01 = '652d7d4b-5cf9-4988-aa97-059b3597140a';
const USER_WAITER01 = '65bcb92e-63a1-4659-8510-efb5864ab590';
const CASHIER01_PASSWORD_HASH = '$2a$12$laA5nJYNLEjnwIPvjeReju0IkZ5LzYF3IO.ZucZWBHIKVlbk7v2CW';

// ---------------------------------------------------------------------------------------
// SQL emission helpers
// ---------------------------------------------------------------------------------------
const OUT = ['SET QUOTED_IDENTIFIER ON;', 'GO'];
function sqlval(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}
function emitInsert(table, columns, rows, batch = 200) {
  if (!rows.length) return;
  const colList = columns.join(', ');
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const valuesSql = chunk.map((row) => '(' + row.map(sqlval).join(', ') + ')').join(',\n');
    OUT.push(`INSERT INTO ${table} (${colList}) VALUES\n${valuesSql};`);
    OUT.push('GO');
  }
}
function emitRaw(sql) { OUT.push(sql); OUT.push('GO'); }

// ---------------------------------------------------------------------------------------
// Roster: employees, salary settings, work shift templates, new user logins
// ---------------------------------------------------------------------------------------
const RATES_SHIFT_JSON = JSON.stringify({
  sat: { amount: '120', unit: 'percent' }, sun: { amount: '130', unit: 'percent' },
  off: null, holiday: { amount: '200', unit: 'percent' },
});
const OT_RATES_SHIFT_JSON = JSON.stringify({
  normal: { amount: '150', unit: 'percent' }, sat: { amount: '150', unit: 'percent' },
  sun: { amount: '150', unit: 'percent' }, holiday: { amount: '300', unit: 'percent' },
});
const DAY_RATE = { sat: 120, sun: 130, normal: null, holiday: 200 };
const OT_RATE = { sat: 150, sun: 150, normal: 150, holiday: 300 };

const ROSTER = [
  { id: 'e122e9ca-5ae6-4736-911d-c9e836f2f58c', code: 'NV000001', name: 'Nguyen Van A', pos: 'CASHIER',
    existing: true, needsSalary: false, salaryType: 'SHIFT', wage: 250000, overtime: true, userId: USER_CASHIER01 },
  { id: '55b187d6-1680-4720-a6d8-427680cb39d0', code: 'NV000002', name: 'Nguyen Van B', pos: 'WAITER',
    existing: true, needsSalary: false, salaryType: 'SHIFT', wage: 200000, overtime: true, userId: null },
  { id: '65b4b552-04d2-4fc7-b7e3-2e5fec31a6c5', code: 'NV000003', name: 'Nguyen Van Test', pos: 'WAITER',
    existing: true, needsSalary: true, salaryType: 'SHIFT', wage: 180000, overtime: true, userId: null },
];

// 6-person roster total: NV1(existing cashier) + NV2/NV3(existing waiters) + these 3 new
// (1 manager, 1 cashier, 1 waiter) = 2 cashiers, 3 waiters, 1 manager.
const NEW_EMP_SPECS = [
  ['Tran Thi Huong', 'MANAGER', 'FIXED', 12000000, false, USER_MANAGER01],
  ['Le Van Hung', 'CASHIER', 'SHIFT', 230000, true, 'NEW_CASHIER'],
  ['Vo Van Nam', 'WAITER', 'SHIFT', 190000, true, USER_WAITER01],
];

const NEW_USER_ROWS = [];
let phoneSeq = 4;
for (const [name, pos, salaryType, wage, overtime, userIdSpec] of NEW_EMP_SPECS) {
  const code = nextCode('NV');
  const empId = newId();
  let userId = userIdSpec;
  let username = null;
  if (userIdSpec === 'NEW_CASHIER') {
    userId = newId();
    username = `cashier${String(phoneSeq - 2).padStart(2, '0')}`; // cashier02, cashier03
    NEW_USER_ROWS.push([userId, username, CASHIER01_PASSWORD_HASH, name, null, null, 'CASHIER', 'ACTIVE',
      0, null, fmtDateTime(mkDate(2026, 4, 20, 9, 0, 0)), fmtDateTime(mkDate(2026, 4, 20, 9, 0, 0)), 0]);
  }
  ROSTER.push({
    id: empId, code, name, pos, existing: false, needsSalary: true, salaryType, wage, overtime,
    userId, username, phone: `090000${String(phoneSeq).padStart(4, '0')}`,
  });
  phoneSeq += 1;
}
// username is only meaningful for the 3 CASHIER employees (used as invoices/vouchers
// created_by, a plain username string per this codebase's convention -- NOT a user id).
ROSTER[0].username = 'cashier01'; // NV000001, existing

const CASHIERS = ROSTER.filter((e) => e.pos === 'CASHIER');
const WAITERS = ROSTER.filter((e) => e.pos === 'WAITER');
const MANAGER = ROSTER.find((e) => e.pos === 'MANAGER');

// Work shift templates: "Ca Chieu" already exists in the DB; add two more.
const SHIFT_CA_CHIEU = 'db9033cc-f631-4f42-98ed-7daad729d49b';
const SHIFT_CA_SANG = newId();
const SHIFT_CA_TOI = newId();
const SHIFT_TIMES = {
  [SHIFT_CA_SANG]: [6, 0, 14, 0],
  [SHIFT_CA_CHIEU]: [14, 30, 18, 30],
  [SHIFT_CA_TOI]: [18, 0, 22, 0],
};
const SHIFT_NAMES = { [SHIFT_CA_SANG]: 'Ca Sang', [SHIFT_CA_CHIEU]: 'Ca Chieu', [SHIFT_CA_TOI]: 'Ca Toi' };
const SHIFT_IDS = Object.keys(SHIFT_TIMES);

const cashierShiftCycle = [SHIFT_CA_SANG, SHIFT_CA_CHIEU, SHIFT_CA_TOI];
CASHIERS.forEach((e, i) => { e.primaryShift = cashierShiftCycle[i % 3]; e.offDay = 6; }); // Sunday
const waiterShiftCycle = [SHIFT_CA_SANG, SHIFT_CA_CHIEU, SHIFT_CA_TOI];
WAITERS.forEach((e, i) => { e.primaryShift = waiterShiftCycle[i % 3]; e.offDay = i % 7; });
MANAGER.primaryShift = SHIFT_CA_SANG;
MANAGER.offDay = 6;

// Violation types: reuse the existing one, add two more with plain-ASCII names.
const VT_LATE = 'edf1b111-0333-4e00-8999-3c590d4df968'; // existing "Di muon 1h", penalty 50000
const VT_LATE_PENALTY = 50000;
const VT_NOSHOW = newId();
const VT_UNIFORM = newId();

// ---------------------------------------------------------------------------------------
// Attendance calculator (ported from AttendanceCalculator.java; settings verified live)
// ---------------------------------------------------------------------------------------
const LATE_GRACE = 15, EARLY_GRACE = 30, OT_BEFORE_MIN = 0, OT_AFTER_MIN = 0;

function scheduledWindow(workDate, shiftId) {
  const [sh, sm, eh, em] = SHIFT_TIMES[shiftId];
  const start = mkDate(workDate.getFullYear(), workDate.getMonth() + 1, workDate.getDate(), sh, sm, 0);
  const overnight = eh * 60 + em <= sh * 60 + sm;
  const endBase = overnight ? addDays(workDate, 1) : workDate;
  const end = mkDate(endBase.getFullYear(), endBase.getMonth() + 1, endBase.getDate(), eh, em, 0);
  return [start, end];
}

function computeAttendance(workDate, shiftId, actualIn, actualOut) {
  if (!actualIn || !actualOut) return { worked: 0, late: 0, early: 0, ot: 0, credit: 0 };
  const [schedStart, schedEnd] = scheduledWindow(workDate, shiftId);
  const worked = Math.max(0, diffMinutes(actualIn, actualOut));
  const lateRaw = Math.max(0, diffMinutes(schedStart, actualIn));
  const late = lateRaw > LATE_GRACE ? lateRaw - LATE_GRACE : 0;
  const earlyRaw = Math.max(0, diffMinutes(actualOut, schedEnd));
  const early = earlyRaw > EARLY_GRACE ? earlyRaw - EARLY_GRACE : 0;
  const otBeforeRaw = Math.max(0, diffMinutes(actualIn, schedStart));
  const otBefore = otBeforeRaw > OT_BEFORE_MIN ? otBeforeRaw : 0;
  const otAfterRaw = Math.max(0, diffMinutes(schedEnd, actualOut));
  const otAfter = otAfterRaw > OT_AFTER_MIN ? otAfterRaw : 0;
  const ot = otBefore + otAfter;
  let credit = worked > 0 ? Math.round((worked / 480) * 100) / 100 : 0;
  credit = Math.min(credit, 1.0);
  return { worked, late, early, ot, credit };
}

function syntheticWindow(emp, d) { return scheduledWindow(d, emp.primaryShift); }

// ---------------------------------------------------------------------------------------
// Precompute every employee's schedule + attendance across the whole window
// ---------------------------------------------------------------------------------------
const SCHEDULE_INDEX = new Map(); // `${employeeId}|${dateKey}` -> info
const VIOLATIONS_BY_EMP = {}; // employeeId -> [[date, penalty], ...]

for (const emp of ROSTER) {
  VIOLATIONS_BY_EMP[emp.id] = [];
  for (const d of ALL_DATES) {
    if (pyWeekday(d) === emp.offDay) continue;
    let shiftId = emp.primaryShift;
    if (randFloat() < 0.08) shiftId = choice(SHIFT_IDS);
    const roll = randFloat();
    let atype, actualIn, actualOut;
    if (roll < 0.03) { atype = 'LEAVE_UNAPPROVED'; actualIn = null; actualOut = null; }
    else if (roll < 0.06) { atype = 'LEAVE_APPROVED'; actualIn = null; actualOut = null; }
    else {
      atype = 'PRESENT';
      const [baseIn, baseOut] = scheduledWindow(d, shiftId);
      let jitterIn = randInt(-5, 5);
      let jitterOut = randInt(-5, 10);
      const r2 = randFloat();
      if (r2 < 0.08) jitterIn += randInt(20, 90);
      else if (r2 < 0.14) jitterOut += randInt(30, 120);
      actualIn = addMinutes(baseIn, jitterIn);
      actualOut = addMinutes(baseOut, jitterOut);
    }
    const metrics = atype === 'PRESENT' ? computeAttendance(d, shiftId, actualIn, actualOut)
      : { worked: 0, late: 0, early: 0, ot: 0, credit: 0 };
    SCHEDULE_INDEX.set(`${emp.id}|${dateKey(d)}`, {
      shiftId, type: atype, actualIn, actualOut, scheduleId: newId(), recordId: newId(), ...metrics,
    });
  }
}

// Emit work_schedules / attendance_records / violations rows.
const wsRows = [], arRows = [], vioRows = [];
for (const emp of ROSTER) {
  for (const d of ALL_DATES) {
    const key = `${emp.id}|${dateKey(d)}`;
    const info = SCHEDULE_INDEX.get(key);
    if (!info) continue;
    const postedAt = fmtDateTime(mkDate(d.getFullYear(), d.getMonth() + 1, d.getDate(), 7, 0, 0));
    wsRows.push([info.scheduleId, emp.id, info.shiftId, fmtDate(d), null, null, postedAt, postedAt]);
    arRows.push([info.recordId, info.scheduleId, info.type, fmtDateTime(info.actualIn), fmtDateTime(info.actualOut),
      info.worked, info.late, info.early, info.ot, info.credit, false, null, 'seed-script', postedAt, postedAt]);
    if (info.type === 'LEAVE_UNAPPROVED') {
      vioRows.push([newId(), info.recordId, VT_NOSHOW, 1, 200000, postedAt, postedAt]);
      VIOLATIONS_BY_EMP[emp.id].push([d, 200000]);
    } else if (info.type === 'PRESENT' && info.late > 0 && randFloat() < 0.5) {
      vioRows.push([newId(), info.recordId, VT_LATE, 1, VT_LATE_PENALTY, postedAt, postedAt]);
      VIOLATIONS_BY_EMP[emp.id].push([d, VT_LATE_PENALTY]);
    } else if (info.type === 'PRESENT' && randFloat() < 0.01) {
      vioRows.push([newId(), info.recordId, VT_UNIFORM, 1, 30000, postedAt, postedAt]);
      VIOLATIONS_BY_EMP[emp.id].push([d, 30000]);
    }
  }
}
// ---------------------------------------------------------------------------------------
// Cashier POS shifts, orders, invoices, payments, cashbook vouchers, reservations
// ---------------------------------------------------------------------------------------
function cashierWindow(c, d) {
  const info = SCHEDULE_INDEX.get(`${c.id}|${dateKey(d)}`);
  if (info && info.type === 'PRESENT') return [info.actualIn, info.actualOut];
  return syntheticWindow(c, d);
}

function randomOrderTime(d) {
  const r = randFloat();
  let minute;
  if (r < 0.45) minute = randInt(11 * 60, 13 * 60 + 30);
  else if (r < 0.90) minute = randInt(18 * 60, 21 * 60);
  else minute = randInt(9 * 60, 22 * 60 + 30);
  return addMinutes(mkDate(d.getFullYear(), d.getMonth() + 1, d.getDate(), 0, 0, 0), minute);
}

const PAYMENT_METHODS = ['CASH', 'QR', 'VNPAY', 'CARD'];
const PAYMENT_METHOD_WEIGHTS = [0.65, 0.15, 0.12, 0.08];
const randomPaymentMethod = () => weightedChoice(PAYMENT_METHODS, PAYMENT_METHOD_WEIGHTS);
const cashflowMethodFor = (pm) => ({ CASH: 'CASH', QR: 'EWALLET', E_WALLET: 'EWALLET', CARD: 'BANK', VNPAY: 'BANK' }[pm]);

const GUEST_NAME_POOL = [
  'Nguyen Thi Mai', 'Tran Van Duc', 'Le Thi Huong', 'Pham Van Long', 'Hoang Thi Yen',
  'Vu Van Son', 'Dang Thi Linh', 'Bui Van Tuan', 'Do Thi Trang', 'Ngo Van Hai',
  'Duong Thi Ngoc', 'Ly Van Khoi', 'Truong Thi Anh', 'Phan Van Thanh', 'Ha Thi Kim',
];

const empRows = [], salaryRows = [];
const reservationRows = [];
const orderRows = [], orderItemRows = [];
const invoiceRows = [], allocationRows = [];
const paymentRows = [], voucherRows = [];
const shiftRows = [];

const prevHandover = {};
for (const c of CASHIERS) prevHandover[c.id] = 500000;

for (const d of ALL_DATES) {
  const presentCashiers = CASHIERS.filter((c) => {
    const info = SCHEDULE_INDEX.get(`${c.id}|${dateKey(d)}`);
    return info && info.type === 'PRESENT';
  });
  const workingCashiers = presentCashiers.length ? presentCashiers : [CASHIERS[0]];

  const shiftsToday = workingCashiers.map((c) => {
    const [actualIn, actualOut] = cashierWindow(c, d);
    return {
      id: newId(), cashierId: c.id, userId: c.userId, username: c.username,
      openedAt: actualIn, closedAt: actualOut, openingCash: prevHandover[c.id],
      cashTotal: 0, revenueTotal: 0,
    };
  });

  function pickShift(orderTime) {
    const cands = shiftsToday.filter((s) => s.openedAt <= orderTime && orderTime <= s.closedAt);
    return cands.length ? choice(cands) : choice(shiftsToday);
  }

  const dow = pyWeekday(d);
  // Kept deliberately modest: GET /api/invoices batch-loads ALL order_items referenced
  // by the (unbounded) invoice query in one `id IN (...)` -- not scoped by page size --
  // and SQL Server hard-caps a single query at 2100 params. 950 orders (~2800
  // order_items) still tripped it; ~600 orders (~1.7k order_items) stays comfortably
  // under that ceiling while still reading as a believable volume. See
  // rms-seed-3months-data memory for the full story (this is a pre-existing backend
  // bug, not something a seed script should paper over indefinitely).
  let nOrders = randInt(3, 6);
  if (dow === 4 || dow === 5 || dow === 6) nOrders = Math.floor(nOrders * 1.2);

  for (let oi = 0; oi < nOrders; oi++) {
    const orderTime = randomOrderTime(d);
    const shift = pickShift(orderTime);
    const isGuest = randFloat() < 0.15;
    const orderCashierUserId = isGuest ? null : shift.userId;

    const nItems = choice([1, 2, 2, 3, 3, 3, 4, 5]);
    const items = [];
    for (let k = 0; k < nItems; k++) {
      const [mid, mname, price] = choice(MENU_ITEMS);
      const qty = choice([1, 1, 1, 2, 2, 3]);
      items.push({ id: newId(), menuItemId: mid, name: mname, qty, price, isQr: isGuest });
    }

    const orderId = newId();
    const orderCode = nextOrderCode();
    orderRows.push([orderId, orderCode, choice(TABLE_IDS), orderCashierUserId, 'CLOSED', null, null, null, null,
      fmtDateTime(orderTime), fmtDateTime(orderTime)]);
    for (const it of items) {
      orderItemRows.push([it.id, orderId, it.menuItemId, it.name, it.qty, it.price, null, 'SERVED', null, it.isQr]);
    }

    const special = randFloat();
    const isSplit = items.length >= 2 && special < 0.015;
    const isMerge = !isSplit && items.length >= 2 && special > 0.985;

    if (isSplit) {
      const childItem = items[0];
      const sourceItems = items.slice(1);
      const sourceId = newId(), sourceCode = nextInvoiceCode();
      const childId = newId(), childCode = nextInvoiceCode();
      const sourceSubtotal = sourceItems.reduce((a, i) => a + i.qty * i.price, 0);
      const childSubtotal = childItem.qty * childItem.price;
      invoiceRows.push([sourceId, sourceCode, orderId, sourceSubtotal, 0, sourceSubtotal, null, true, 'ACTIVE',
        null, null, shift.username, fmtDateTime(orderTime)]);
      invoiceRows.push([childId, childCode, orderId, childSubtotal, 0, childSubtotal, null, true, 'ACTIVE',
        null, sourceId, shift.username, fmtDateTime(orderTime)]);
      for (const i of sourceItems) allocationRows.push([newId(), sourceId, i.id, i.qty, i.price, true, fmtDateTime(orderTime)]);
      allocationRows.push([newId(), childId, childItem.id, childItem.qty, childItem.price, true, fmtDateTime(orderTime)]);

      for (const [invId, amount] of [[sourceId, sourceSubtotal], [childId, childSubtotal]]) {
        const pm = randomPaymentMethod();
        const paidAt = addMinutes(orderTime, randInt(2, 20));
        const received = pm !== 'CASH' ? amount : (Math.floor(amount / 50000) + 1) * 50000;
        paymentRows.push([newId(), invId, shift.id, shift.userId, pm, amount, null, 'PAID',
          pm === 'CASH' ? received : null, pm === 'CASH' ? received - amount : null, null,
          fmtDateTime(paidAt), fmtDateTime(paidAt)]);
        const cfm = cashflowMethodFor(pm);
        voucherRows.push([newId(), nextCode('TT'), 'RECEIPT', fmtDateTime(paidAt), CAT_SALES_RECEIPT, cfm,
          'CUSTOMER', null, 'Khach le', amount, null, true, 'INVOICE_PAYMENT', invId, shift.username, false,
          fmtDateTime(paidAt)]);
        if (pm === 'CASH') shift.cashTotal += amount;
        shift.revenueTotal += amount;
      }
    } else if (isMerge) {
      const midSplit = Math.max(1, Math.floor(items.length / 2));
      const groupA = items.slice(0, midSplit), groupB = items.slice(midSplit);
      const aId = newId(), bId = newId();
      const targetId = newId(), targetCode = nextInvoiceCode();
      const aSubtotal = groupA.reduce((a, i) => a + i.qty * i.price, 0);
      const bSubtotal = groupB.reduce((a, i) => a + i.qty * i.price, 0);
      const targetSubtotal = aSubtotal + bSubtotal;
      invoiceRows.push([aId, nextInvoiceCode(), orderId, aSubtotal, 0, aSubtotal, null, false, 'MERGED',
        targetId, null, shift.username, fmtDateTime(orderTime)]);
      invoiceRows.push([bId, nextInvoiceCode(), orderId, bSubtotal, 0, bSubtotal, null, false, 'MERGED',
        targetId, null, shift.username, fmtDateTime(orderTime)]);
      invoiceRows.push([targetId, targetCode, orderId, targetSubtotal, 0, targetSubtotal, null, true, 'ACTIVE',
        null, null, shift.username, fmtDateTime(orderTime)]);
      for (const i of groupA) allocationRows.push([newId(), aId, i.id, i.qty, i.price, false, fmtDateTime(orderTime)]);
      for (const i of groupB) allocationRows.push([newId(), bId, i.id, i.qty, i.price, false, fmtDateTime(orderTime)]);
      for (const i of items) allocationRows.push([newId(), targetId, i.id, i.qty, i.price, true, fmtDateTime(orderTime)]);

      const pm = randomPaymentMethod();
      const paidAt = addMinutes(orderTime, randInt(2, 20));
      const received = pm !== 'CASH' ? targetSubtotal : (Math.floor(targetSubtotal / 50000) + 1) * 50000;
      paymentRows.push([newId(), targetId, shift.id, shift.userId, pm, targetSubtotal, null, 'PAID',
        pm === 'CASH' ? received : null, pm === 'CASH' ? received - targetSubtotal : null, null,
        fmtDateTime(paidAt), fmtDateTime(paidAt)]);
      const cfm = cashflowMethodFor(pm);
      voucherRows.push([newId(), nextCode('TT'), 'RECEIPT', fmtDateTime(paidAt), CAT_SALES_RECEIPT, cfm,
        'CUSTOMER', null, 'Khach le', targetSubtotal, null, true, 'INVOICE_PAYMENT', targetId, shift.username,
        false, fmtDateTime(paidAt)]);
      if (pm === 'CASH') shift.cashTotal += targetSubtotal;
      shift.revenueTotal += targetSubtotal;
    } else {
      const subtotal = items.reduce((a, i) => a + i.qty * i.price, 0);
      let discount = 0, promoId = null;
      if (randFloat() < 0.06 && subtotal > 100000) {
        const promo = choice(PROMOTIONS);
        promoId = promo.id;
        discount = promo.amount ? promo.amount : Math.round((subtotal * promo.percent) / 100);
        discount = Math.min(discount, subtotal);
        PROMO_USAGE[promoId] = (PROMO_USAGE[promoId] || 0) + 1;
      }
      const total = subtotal - discount;
      const invId = newId(), invCode = nextInvoiceCode();
      invoiceRows.push([invId, invCode, orderId, subtotal, discount, total, promoId, true, 'ACTIVE', null, null,
        shift.username, fmtDateTime(orderTime)]);
      for (const i of items) allocationRows.push([newId(), invId, i.id, i.qty, i.price, true, fmtDateTime(orderTime)]);

      const pm = randomPaymentMethod();
      const paidAt = addMinutes(orderTime, randInt(2, 20));
      const received = pm !== 'CASH' ? total : (Math.floor(total / 50000) + 1) * 50000;
      paymentRows.push([newId(), invId, shift.id, shift.userId, pm, total, null, 'PAID',
        pm === 'CASH' ? received : null, pm === 'CASH' ? received - total : null, null,
        fmtDateTime(paidAt), fmtDateTime(paidAt)]);
      const cfm = cashflowMethodFor(pm);
      voucherRows.push([newId(), nextCode('TT'), 'RECEIPT', fmtDateTime(paidAt), CAT_SALES_RECEIPT, cfm,
        'CUSTOMER', null, 'Khach le', total, null, true, 'INVOICE_PAYMENT', invId, shift.username, false,
        fmtDateTime(paidAt)]);
      if (pm === 'CASH') shift.cashTotal += total;
      shift.revenueTotal += total;
    }
  }

  // Finalize each cashier POS shift for the day now that its payments are known.
  for (const s of shiftsToday) {
    const closingCash = s.openingCash + s.cashTotal;
    shiftRows.push([s.id, s.userId, fmtDate(d), fmtDateTime(s.openedAt), fmtDateTime(s.closedAt), s.openingCash,
      closingCash, s.revenueTotal, 'CLOSED', 'NORMAL', s.userId, closingCash, null, null]);
    prevHandover[s.cashierId] = closingCash;
  }

  // Reservations.
  const nRes = choice([0, 0, 1, 1, 2]);
  const nearEnd = Math.round((END_DATE - d) / 86400000) <= 2;
  for (let ri = 0; ri < nRes; ri++) {
    const status = nearEnd
      ? weightedChoice(['CONFIRMED', 'PENDING', 'CHECKED_IN'], [0.5, 0.3, 0.2])
      : weightedChoice(['COMPLETED', 'NO_SHOW', 'CANCELLED', 'CHECKED_IN'], [0.65, 0.12, 0.13, 0.10]);
    const rTime = addMinutes(mkDate(d.getFullYear(), d.getMonth() + 1, d.getDate(), 0, 0, 0), randInt(10 * 60, 21 * 60));
    reservationRows.push([newId(), randFloat() > 0.2 ? choice(TABLE_IDS) : null, choice(GUEST_NAME_POOL),
      `09${randInt(10000000, 99999999)}`, randInt(2, 8), fmtDateTime(rTime), null, status, null, false,
      USER_MANAGER01, null, null, null, fmtDateTime(rTime), fmtDateTime(rTime)]);
  }

  // Monthly-ish manual cashbook vouchers (first Monday seen each month = ingredients+
  // utilities+CSVC; occasional other income) -- was every Monday, cut to ~1/month to
  // keep sổ quỹ volume down alongside the smaller roster/order count.
  if (dow === 0 && d.getDate() <= 7) {
    const wkTime = fmtDateTime(mkDate(d.getFullYear(), d.getMonth() + 1, d.getDate(), 9, 0, 0));
    voucherRows.push([newId(), nextCode('PC'), 'PAYMENT', wkTime, CAT_INGREDIENTS, 'BANK', 'OTHER', null,
      'Nha cung cap thuc pham', randInt(3000000, 8000000), 'Nhap nguyen lieu hang tuan', true, 'MANUAL', null,
      'manager01', false, wkTime]);
    voucherRows.push([newId(), nextCode('PC'), 'PAYMENT', wkTime, CAT_UTILITIES, 'BANK', 'OTHER', null,
      'Cong ty dien luc / cap nuoc', randInt(1500000, 4000000), 'Chi phi dien nuoc', true, 'MANUAL', null,
      'manager01', false, wkTime]);
    if (randFloat() < 0.3) {
      voucherRows.push([newId(), nextCode('PC'), 'PAYMENT', wkTime, CAT_CSVC, 'CASH', 'OTHER', null,
        'Sua chua thiet bi', randInt(500000, 2500000), 'Bao tri co so vat chat', true, 'MANUAL', null,
        'manager01', false, wkTime]);
    }
    if (randFloat() < 0.2) {
      voucherRows.push([newId(), nextCode('PT'), 'RECEIPT', wkTime, CAT_OTHER_RECEIPT, 'CASH', 'OTHER', null,
        'Thu khac', randInt(200000, 1000000), 'Ban phe lieu / thu khac', false, 'MANUAL', null, 'manager01',
        false, wkTime]);
    }
  }
}

// A handful of voided vouchers for realism (pick some already-generated manual ones).
const manualVoucherIndices = [];
voucherRows.forEach((v, i) => { if (v[12] === 'MANUAL') manualVoucherIndices.push(i); });
for (const idx of sample(manualVoucherIndices, Math.min(6, manualVoucherIndices.length))) {
  voucherRows[idx][15] = true; // voided
}

// ---------------------------------------------------------------------------------------
// Payroll: May + June (MONTHLY, FINALIZED) and July (MONTHLY, DRAFT, partial data)
// ---------------------------------------------------------------------------------------
const HOLIDAY_DATES = new Set([dateKey(mkDate(2026, 4, 30)), dateKey(mkDate(2026, 5, 1))]);
function dayTypeFor(d) {
  if (HOLIDAY_DATES.has(dateKey(d))) return 'holiday';
  const wd = pyWeekday(d);
  if (wd === 5) return 'sat';
  if (wd === 6) return 'sun';
  return 'normal';
}
function applyRate(base, pct) { return pct == null ? base : (base * pct) / 100; }
function round0(x) { return Math.round(x); }
function scheduledMinutes(shiftId) {
  const [start, end] = scheduledWindow(mkDate(2026, 1, 1), shiftId);
  return diffMinutes(start, end);
}

function computePayslip(emp, periodStart, periodEnd) {
  const records = [];
  for (const d of ALL_DATES) {
    if (d < periodStart || d > periodEnd) continue;
    const info = SCHEDULE_INDEX.get(`${emp.id}|${dateKey(d)}`);
    if (info) records.push([d, info]);
  }
  const snapshot = [];
  if (emp.salaryType === 'FIXED') {
    const main = emp.wage, overtime = 0;
    let shiftCount = 0, workedMinutes = 0;
    for (const [d, info] of records) {
      if (info.type === 'PRESENT') shiftCount += 1;
      workedMinutes += info.worked;
      snapshot.push({ date: fmtDate(d), shiftName: SHIFT_NAMES[info.shiftId], status: info.type,
        checkInAt: fmtIsoDateTime(info.actualIn), checkOutAt: fmtIsoDateTime(info.actualOut),
        workedMinutes: info.worked, otMinutes: 0, dayType: dayTypeFor(d), rateApplied: null, amount: 0,
        note: 'Luong co dinh - khong tinh theo cong' });
    }
    return { main, overtime, shiftCount, workedMinutes, otMinutes: 0, snapshot };
  }

  let mainTotal = 0, otTotal = 0, otMinutesTotal = 0, shiftCount = 0, workedMinutesTotal = 0;
  for (const [d, info] of records) {
    workedMinutesTotal += info.worked;
    const dt = dayTypeFor(d);
    const pct = DAY_RATE[dt];
    const shiftWage = applyRate(emp.wage, pct);
    const isPaid = info.type === 'PRESENT' && info.actualOut !== null;
    const amount = isPaid ? round0(shiftWage) : 0;
    if (isPaid) shiftCount += 1;
    const otMin = emp.overtime ? info.ot : 0;
    let otAmount = 0;
    if (otMin > 0) {
      const scheduled = scheduledMinutes(info.shiftId);
      if (scheduled > 0) {
        const hourlyBase = (emp.wage * 60) / scheduled;
        const otPct = OT_RATE[dt] != null ? OT_RATE[dt] : OT_RATE.normal;
        const perHour = applyRate(hourlyBase, otPct);
        otAmount = round0((perHour * otMin) / 60);
      }
    }
    mainTotal += amount; otTotal += otAmount; otMinutesTotal += otMin;
    snapshot.push({ date: fmtDate(d), shiftName: SHIFT_NAMES[info.shiftId], status: info.type,
      checkInAt: fmtIsoDateTime(info.actualIn), checkOutAt: fmtIsoDateTime(info.actualOut),
      workedMinutes: info.worked, otMinutes: otMin, dayType: dt, rateApplied: pct ? `${pct}%` : null,
      amount: amount + otAmount, note: null });
  }
  return { main: mainTotal, overtime: otTotal, shiftCount, workedMinutes: workedMinutesTotal, otMinutes: otMinutesTotal, snapshot };
}

const payrollSheetRows = [], payslipRows = [], payslipPaymentRows = [];
const PERIODS = [
  { start: mkDate(2026, 5, 1), end: mkDate(2026, 5, 31), name: 'Bang luong thang 5/2026',
    status: 'FINALIZED', finalizeOffset: 3, partialFor: new Set() },
  { start: mkDate(2026, 6, 1), end: mkDate(2026, 6, 30), name: 'Bang luong thang 6/2026',
    status: 'FINALIZED', finalizeOffset: 3, partialFor: new Set([WAITERS[0].id, WAITERS[1].id]) },
  { start: mkDate(2026, 7, 1), end: mkDate(2026, 7, 31), name: 'Bang luong thang 7/2026',
    status: 'DRAFT', finalizeOffset: null, partialFor: new Set() },
];

for (const period of PERIODS) {
  const sheetId = newId();
  const sheetCode = nextCode('BL');
  const createdAt = fmtDateTime(mkDate(period.start.getFullYear(), period.start.getMonth() + 1, period.start.getDate(), 8, 0, 0));
  let finalizedAt = null, finalizedBy = null, paymentStatus = 'UNPAID';
  let finalizedAtDate = null;
  if (period.status === 'FINALIZED') {
    finalizedAtDate = mkDate(period.end.getFullYear(), period.end.getMonth() + 1, period.end.getDate() + period.finalizeOffset, 10, 0, 0);
    finalizedAt = fmtDateTime(finalizedAtDate);
    finalizedBy = 'manager01';
    paymentStatus = period.partialFor.size ? 'PARTIAL' : 'PAID';
  }

  for (const emp of ROSTER) {
    const periodEndClamped = period.end < END_DATE ? period.end : END_DATE;
    const { main, overtime, shiftCount, workedMinutes, otMinutes, snapshot } = computePayslip(emp, period.start, periodEndClamped);
    const deduction = VIOLATIONS_BY_EMP[emp.id]
      .filter(([dd]) => dd >= period.start && dd <= period.end)
      .reduce((a, [, p]) => a + p, 0);
    const payslipId = newId();
    const payslipCode = nextCode('PL');
    let paidAmount = 0, payStatus = 'UNPAID';
    if (period.status === 'FINALIZED') {
      const total = main + overtime - deduction;
      if (period.partialFor.has(emp.id)) { paidAmount = Math.round(total * 0.6); payStatus = 'PARTIAL'; }
      else { paidAmount = total; payStatus = 'PAID'; }
      const voucherCode = nextCode('PC');
      const payTime = fmtDateTime(addMinutes(finalizedAtDate, 120));
      payslipPaymentRows.push([newId(), payslipId, voucherCode, paidAmount, 'CASH', payTime, null, 'manager01', payTime]);
      voucherRows.push([newId(), voucherCode, 'PAYMENT', payTime, CAT_SALARY_PAYMENT, 'CASH', 'EMPLOYEE', emp.id,
        emp.name, paidAmount, `Chi luong ${period.name}`, true, 'PAYROLL', payslipId, 'manager01', false, payTime]);
    }
    payslipRows.push([payslipId, payslipCode, sheetId, emp.id, emp.code, emp.name, emp.salaryType, main, overtime,
      deduction, false, false, false, paidAmount, payStatus, 'ACTIVE', shiftCount, workedMinutes, otMinutes,
      JSON.stringify(snapshot), createdAt, createdAt]);
  }

  payrollSheetRows.push([sheetId, sheetCode, period.name, 'MONTHLY', fmtDate(period.start), fmtDate(period.end),
    'ALL', period.status, paymentStatus, null, 'manager01', finalizedBy, finalizedAt, createdAt, createdAt, createdAt]);
}

// ---------------------------------------------------------------------------------------
// Employees / salary settings rows to emit
// ---------------------------------------------------------------------------------------
for (const emp of ROSTER) {
  if (!emp.existing) {
    const createdAt = fmtDateTime(mkDate(2026, 4, 20, 9, 0, 0));
    empRows.push([emp.id, emp.code, emp.name, emp.phone, 'ACTIVE', null, fmtDate(mkDate(2026, 4, 20)), null, null,
      null, null, null, null, emp.userId, createdAt, createdAt]);
  }
  if (emp.needsSalary) {
    const rates = emp.salaryType === 'FIXED' ? null : RATES_SHIFT_JSON;
    const otRates = emp.overtime ? OT_RATES_SHIFT_JSON : null;
    const createdAt = fmtDateTime(mkDate(2026, 4, 20, 9, 0, 0));
    salaryRows.push([newId(), emp.id, emp.salaryType, emp.wage, rates, emp.overtime, otRates, null, createdAt, createdAt]);
  }
}

const newWsCreated = fmtDateTime(mkDate(2026, 4, 20, 9, 0, 0));
const newWsRowsOut = [
  [SHIFT_CA_SANG, 'Ca Sang', fmtTime(6, 0), fmtTime(14, 0), null, null, null, 'ACTIVE', newWsCreated, newWsCreated],
  [SHIFT_CA_TOI, 'Ca Toi', fmtTime(18, 0), fmtTime(22, 0), null, null, null, 'ACTIVE', newWsCreated, newWsCreated],
];

const holidayRows = [
  [newId(), 'Ngay Thong Nhat', fmtDate(mkDate(2026, 4, 30)), newWsCreated, newWsCreated],
  [newId(), 'Quoc Te Lao Dong', fmtDate(mkDate(2026, 5, 1)), newWsCreated, newWsCreated],
];

const salaryTemplateRows = [
  [newId(), 'Mau nhan vien phuc vu', 'SHIFT', 190000, RATES_SHIFT_JSON, true, OT_RATES_SHIFT_JSON, newWsCreated, newWsCreated],
];

const violationTypeRows = [
  [VT_NOSHOW, 'Nghi khong phep', 200000, false, newWsCreated, newWsCreated],
  [VT_UNIFORM, 'Vi pham dong phuc', 30000, false, newWsCreated, newWsCreated],
];

// ---------------------------------------------------------------------------------------
// Emit everything in FK-safe order
// ---------------------------------------------------------------------------------------
emitInsert('users', ['id', 'username', 'password_hash', 'full_name', 'email', 'phone', 'role', 'status',
  'failed_login_attempts', 'locked_at', 'created_at', 'updated_at', 'token_version'], NEW_USER_ROWS);

emitInsert('employees', ['id', 'code', 'name', 'phone', 'status', 'avatar_url', 'start_date', 'timekeep_code',
  'note', 'id_number', 'birthday', 'gender', 'address', 'user_id', 'created_at', 'updated_at'], empRows);

emitInsert('salary_settings', ['id', 'employee_id', 'main_salary_type', 'main_base_wage', 'main_advanced_rates',
  'overtime_enabled', 'overtime_rates', 'salary_template', 'created_at', 'updated_at'], salaryRows);

emitInsert('work_shifts', ['id', 'name', 'start_time', 'end_time', 'check_in_window_start', 'check_in_window_end',
  'apply_scope', 'status', 'created_at', 'updated_at'], newWsRowsOut);

emitInsert('payroll_holidays', ['id', 'name', 'holiday_date', 'created_at', 'updated_at'], holidayRows);

emitInsert('salary_templates', ['id', 'name', 'main_salary_type', 'main_base_wage', 'main_advanced_rates',
  'overtime_enabled', 'overtime_rates', 'created_at', 'updated_at'], salaryTemplateRows);

emitInsert('violation_types', ['id', 'name', 'penalty_amount', 'deleted', 'created_at', 'updated_at'], violationTypeRows);

emitInsert('work_schedules', ['id', 'employee_id', 'shift_id', 'work_date', 'rule_id', 'substitute_employee_id',
  'created_at', 'updated_at'], wsRows);

emitInsert('attendance_records', ['id', 'schedule_id', 'type', 'actual_check_in', 'actual_check_out',
  'worked_minutes', 'late_minutes', 'early_leave_minutes', 'ot_minutes', 'work_credit', 'auto_filled', 'note',
  'created_by', 'created_at', 'updated_at'], arRows);

emitInsert('violations', ['id', 'attendance_record_id', 'violation_type_id', 'count', 'applied_penalty',
  'created_at', 'updated_at'], vioRows);

emitInsert('orders', ['id', 'code', 'table_id', 'cashier_id', 'status', 'note', 'customer_name', 'customer_phone',
  'customer_email', 'created_at', 'updated_at'], orderRows);

emitInsert('order_items', ['id', 'order_id', 'menu_item_id', 'menu_item_name', 'quantity', 'unit_price', 'note',
  'cooking_status', 'rejection_note', 'is_qr_order'], orderItemRows);

// MERGED rows carry a self-referencing FK (merged_into_invoice_id -> another row in this
// same table); a 200-row batch boundary can otherwise land between a MERGED row and its
// target, inserted in a later batch. Stable-sort so every target (merged_into_invoice_id
// IS NULL) is emitted before any row that references it.
invoiceRows.sort((a, b) => (a[9] === null ? 0 : 1) - (b[9] === null ? 0 : 1));

emitInsert('invoices', ['id', 'code', 'order_id', 'subtotal', 'discount_amount', 'total_amount', 'promotion_id',
  'is_paid', 'status', 'merged_into_invoice_id', 'split_from_invoice_id', 'created_by', 'created_at'], invoiceRows);

emitInsert('invoice_item_allocations', ['id', 'invoice_id', 'order_item_id', 'allocated_quantity',
  'unit_price_snapshot', 'active', 'created_at'], allocationRows);

emitInsert('shifts', ['id', 'cashier_id', 'business_date', 'opened_at', 'closed_at', 'opening_cash', 'closing_cash',
  'total_revenue', 'status', 'shift_type', 'closed_by', 'handover_amount', 'card_batch_total', 'closing_note'], shiftRows);

emitInsert('payments', ['id', 'invoice_id', 'shift_id', 'cashier_id', 'method', 'amount', 'gateway_ref', 'status',
  'received_amount', 'change_amount', 'expires_at', 'paid_at', 'created_at'], paymentRows);

emitInsert('cashbook_vouchers', ['id', 'code', 'type', 'occurred_at', 'category_id', 'method', 'partner_group',
  'partner_id', 'partner_name', 'amount', 'note', 'accounting_to_income', 'source_type', 'source_reference_id',
  'created_by', 'voided', 'created_at'], voucherRows);

emitInsert('reservations', ['id', 'table_id', 'guest_name', 'phone', 'party_size', 'datetime', 'note', 'status',
  'guest_email', 'reminder_sent', 'created_by', 'cancel_token', 'cancel_otp', 'cancel_otp_expires', 'created_at',
  'updated_at'], reservationRows);

emitInsert('payroll_sheets', ['id', 'code', 'name', 'pay_term', 'period_start', 'period_end', 'scope', 'status',
  'payment_status', 'note', 'created_by', 'finalized_by', 'finalized_at', 'data_refreshed_at', 'created_at',
  'updated_at'], payrollSheetRows);

emitInsert('payslips', ['id', 'code', 'payroll_sheet_id', 'employee_id', 'employee_code', 'employee_name',
  'salary_type', 'main_salary', 'overtime_salary', 'deduction', 'main_overridden', 'overtime_overridden',
  'deduction_overridden', 'paid_amount', 'payment_status', 'status', 'shift_count', 'worked_minutes', 'ot_minutes',
  'attendance_snapshot', 'created_at', 'updated_at'], payslipRows);

emitInsert('payslip_payments', ['id', 'payslip_id', 'voucher_code', 'amount', 'method', 'paid_at', 'note',
  'created_by', 'created_at'], payslipPaymentRows);

for (const [promoId, count] of Object.entries(PROMO_USAGE)) {
  emitRaw(`UPDATE promotions SET used_count = used_count + ${count} WHERE id = '${promoId}';`);
}

emitRaw("UPDATE cashbook_opening_balances SET amount = 5000000, updated_by = 'manager01', " +
  "updated_at = SYSUTCDATETIME() WHERE method = 'CASH';");
emitRaw("UPDATE cashbook_opening_balances SET amount = 20000000, updated_by = 'manager01', " +
  "updated_at = SYSUTCDATETIME() WHERE method = 'BANK';");

emitRaw(`ALTER SEQUENCE dbo.order_code_seq RESTART WITH ${COUNTERS.order_seq + 1};`);
emitRaw(`ALTER SEQUENCE dbo.invoice_code_seq RESTART WITH ${COUNTERS.invoice_seq + 1};`);

fs.writeFileSync(OUT_PATH, OUT.join('\n'), 'utf8');
console.log(`Wrote ${OUT_PATH} (${OUT.length} statements)`);
console.log(`orders=${orderRows.length} invoices=${invoiceRows.length} payments=${paymentRows.length} ` +
  `vouchers=${voucherRows.length} schedules=${wsRows.length} attendance=${arRows.length} ` +
  `violations=${vioRows.length} reservations=${reservationRows.length} shifts=${shiftRows.length} ` +
  `payslips=${payslipRows.length}`);
