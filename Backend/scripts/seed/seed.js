#!/usr/bin/env node
/**
 * Seeds the ENTIRE rms_db dataset directly, with no dependency on DataSeeder.java (deleted --
 * this script is now the only source of seed data, so it must be able to bootstrap a truly
 * empty, freshly-migrated database on its own): baseline/master data (test-account users,
 * table areas + tables, promotions, and the full menu catalog imported from the repo-root
 * menu-export.csv) is created once and never deleted by cleanup; on top of that it generates
 * ~3 rolling months (today - 3mo .. today) of realistic operational history (attendance,
 * orders/invoices/payments, cashier shifts, payroll, cashbook, reservations), resolving every
 * reference id LIVE against the current database instead of hardcoding snapshot values.
 *
 * This does NOT call any Java service code -- it ports the exact formulas from
 * AttendanceCalculator.java and SalaryCalculator.java into JS so the numbers it writes are
 * consistent with what the real backend would compute for the same inputs.
 *
 * Usage: node seed.js  (or run_seed.bat, which just calls this)
 * Requires `sqlcmd` on PATH and the DB schema already migrated (run the backend once via
 * Flyway if starting from a completely empty database); DB credentials read from Backend/env
 * (DB_USERNAME/DB_PASSWORD), falling back to sa/123 if that file is missing.
 *
 * Safe to re-run any number of times: baseline/master data is insert-only-if-missing (matched
 * by natural key: username, table name, promotion code, menu item code, ...), and
 * 00_cleanup.sql removes exactly the transactional/historical data this script owns before
 * regenerating it, so nothing accumulates or collides between runs.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

// ---------------------------------------------------------------------------------------
// Env / sqlcmd plumbing
// ---------------------------------------------------------------------------------------
function loadEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const ENV = loadEnvFile(path.join(__dirname, '..', '..', 'env'));
const DB_USERNAME = ENV.DB_USERNAME || 'sa';
const DB_PASSWORD = ENV.DB_PASSWORD || '123';
// -b: abort with a non-zero exit code on the first error, instead of sqlcmd's default of
// printing the error and continuing -- we want a broken run to fail loudly, not silently.
// -I: sets QUOTED_IDENTIFIER ON at the connection level. Without it, inserts into tables with
// a filtered index/computed column (invoice_item_allocations, cashbook_vouchers, payroll_sheets,
// payslips, payslip_payments, payments, reservations, shifts) fail with Msg 1934 even though the
// script's own "SET QUOTED_IDENTIFIER ON;" is present -- that in-script SET was not enough to
// prevent every one of those tables ending up silently empty after a real run.
const SQLCMD_ARGS_BASE = ['-S', 'localhost', '-U', DB_USERNAME, '-P', DB_PASSWORD, '-d', 'rms_db', '-b', '-I'];
const CLEANUP_PATH = path.join(__dirname, '00_cleanup.sql');
const OUT_PATH = path.join(__dirname, 'seed_3_months.sql');
const BASELINE_PATH = path.join(__dirname, 'baseline_bootstrap.sql');
const MENU_CSV_PATH = path.join(__dirname, '..', '..', '..', 'menu-export.csv');

function sqlcmdQuery(sql) {
  const args = [...SQLCMD_ARGS_BASE, '-h', '-1', '-s', '|', '-W', '-Q', `SET NOCOUNT ON; ${sql}`];
  const out = execFileSync('sqlcmd', args, { encoding: 'utf8' });
  return out.split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l && !/^-+$/.test(l.trim()))
    .map((l) => l.split('|').map((p) => p.trim()));
}
function sqlcmdRunFile(file) {
  execFileSync('sqlcmd', [...SQLCMD_ARGS_BASE, '-i', file], { stdio: 'inherit' });
}
function countOf(table) {
  return parseInt(sqlcmdQuery(`SELECT COUNT(*) FROM ${table}`)[0][0], 10);
}

// ---------------------------------------------------------------------------------------
// Seeded RNG (mulberry32) so re-running reproduces the same relative pattern of data
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
const addMonths = (dt, n) => { const d = new Date(dt); d.setMonth(d.getMonth() + n); return d; };
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
function startOfMonth(y, m) { return mkDate(y, m, 1); }
function endOfMonth(y, m) { return mkDate(y, m, new Date(y, m, 0).getDate()); }
function shiftMonth(y, m, delta) { const total = y * 12 + (m - 1) + delta; return { y: Math.floor(total / 12), m: (total % 12) + 1 }; }

// ---------------------------------------------------------------------------------------
// SQL emission helpers (target array is explicit so both the baseline-bootstrap file and the
// main 3-month file can reuse the same batching/escaping logic)
// ---------------------------------------------------------------------------------------
function sqlval(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}
function emitInsert(target, table, columns, rows, batch = 200) {
  if (!rows.length) return;
  const colList = columns.join(', ');
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const valuesSql = chunk.map((row) => '(' + row.map(sqlval).join(', ') + ')').join(',\n');
    target.push(`INSERT INTO ${table} (${colList}) VALUES\n${valuesSql};`);
    target.push('GO');
  }
}
function emitRaw(target, sql) { target.push(sql); target.push('GO'); }

// ---------------------------------------------------------------------------------------
// Config: rolling 3-month window ending today
// ---------------------------------------------------------------------------------------
const END_DATE = dateOnly(new Date());
const START_DATE = dateOnly(addMonths(END_DATE, -3));
const ALL_DATES = daterange(START_DATE, END_DATE);
const NOW_STAMP = fmtDateTime(new Date());
const CURRENT_YEAR = END_DATE.getFullYear();

// =========================================================================================
// Step 1: Ensure baseline/master data exists (users, table areas + tables, promotions, menu
// catalog). Everything here is insert-only-if-missing (matched by natural key), and none of
// it is touched by 00_cleanup.sql -- so this whole block is a no-op after the first run.
// =========================================================================================
console.log('[1/5] Ensuring baseline data (users, tables, promotions, menu)...');
const BASELINE_OUT = ['SET QUOTED_IDENTIFIER ON;', 'GO'];

// Core test-account users. Passwords must be bcrypt hashes (BCryptPasswordEncoder(12) in
// SecurityConfig) -- Node has no bcrypt in its standard library and this script intentionally
// has zero npm dependencies, so these are fixed hashes captured once from a real
// BCryptPasswordEncoder run (each still logs in with the plaintext password on the right).
const BASELINE_USERS = [
  // username, password_hash, full_name, email, phone, role                    | plaintext password
  ['admin', '$2a$12$ZY8v9wB2v1ZtYP4cqEI7gusqMIEJTu6bnPneC5VgsPIyRA6tflQJ2', 'System Administrator', 'admin@rms.local', '0900000001', 'ADMIN'],     // Admin@123456
  ['manager01', '$2a$12$QbCA/ZO5s0mSeLib/Mi6qutRNd.0oqPGxY9PNtpISxHHCQKrWpCLq', 'Manager One', 'manager01@rms.local', '0900000002', 'MANAGER'],   // Manager@123456
  ['cashier01', '$2a$12$erGwdfhbaTBb85STSISJIOjdi1262cQpM4QUlwLOO7cy/5JHkdbeu', 'Cashier One', 'cashier01@rms.local', '0900000003', 'CASHIER'],    // Cashier@123456
  ['waiter01', '$2a$12$wEHtCx.m1wtd.t6Djdkq1.XMIvPUYiLFz6KTyj7wJuqA/Eq4agFly', 'Waiter One', 'waiter01@rms.local', '0900000004', 'WAITER'],        // Waiter@123456
];
const existingUsernames = new Set(sqlcmdQuery(
  `SELECT username FROM users WHERE username IN (${BASELINE_USERS.map((u) => `'${u[0]}'`).join(',')})`
).map((r) => r[0]));
const newBaselineUserRows = BASELINE_USERS
  .filter(([username]) => !existingUsernames.has(username))
  .map(([username, hash, fullName, email, phone, role]) =>
    [newId(), username, hash, fullName, email, phone, role, 'ACTIVE', 0, null, NOW_STAMP, NOW_STAMP, 0]);
emitInsert(BASELINE_OUT, 'users', ['id', 'username', 'password_hash', 'full_name', 'email', 'phone', 'role',
  'status', 'failed_login_attempts', 'locked_at', 'created_at', 'updated_at', 'token_version'], newBaselineUserRows);

// Table areas + restaurant tables (26 tables across 3 areas). ASCII names throughout --
// sqlcmd on this box was confirmed (empirically, round-tripping a test insert) to mangle
// Vietnamese diacritics written through a generated SQL file, matching the same class of
// encoding risk already documented below for -Q command-line arguments.
if (countOf('table_areas') === 0) {
  emitInsert(BASELINE_OUT, 'table_areas', ['id', 'name', 'note', 'display_order'], [
    [newId(), 'Tang 1', null, 0],
    [newId(), 'Tang 2', null, 1],
    [newId(), 'Phong VIP', null, 2],
  ]);
}
if (countOf('restaurant_tables') === 0) {
  const TABLE_DEFS = [
    ['T1-01', 2, 'Tang 1'], ['T1-02', 2, 'Tang 1'], ['T1-03', 2, 'Tang 1'], ['T1-04', 2, 'Tang 1'],
    ['T1-05', 4, 'Tang 1'], ['T1-06', 4, 'Tang 1'], ['T1-07', 4, 'Tang 1'], ['T1-08', 4, 'Tang 1'], ['T1-09', 4, 'Tang 1'],
    ['T1-10', 6, 'Tang 1'], ['T1-11', 6, 'Tang 1'], ['T1-12', 6, 'Tang 1'],
    ['T2-01', 4, 'Tang 2'], ['T2-02', 4, 'Tang 2'], ['T2-03', 4, 'Tang 2'], ['T2-04', 4, 'Tang 2'],
    ['T2-05', 6, 'Tang 2'], ['T2-06', 6, 'Tang 2'], ['T2-07', 6, 'Tang 2'], ['T2-08', 6, 'Tang 2'],
    ['T2-09', 8, 'Tang 2'], ['T2-10', 8, 'Tang 2'],
    ['VIP-01', 8, 'Phong VIP'], ['VIP-02', 10, 'Phong VIP'], ['VIP-03', 12, 'Phong VIP'], ['VIP-04', 20, 'Phong VIP'],
  ];
  emitInsert(BASELINE_OUT, 'restaurant_tables', ['id', 'name', 'capacity', 'area', 'note', 'display_order',
    'active', 'status', 'qr_token', 'occupied_since', 'updated_at'],
    TABLE_DEFS.map(([name, capacity, area]) => [newId(), name, capacity, area, null, 0, true, 'AVAILABLE', `QR-${name}`, null, null]));
}

// Promotions (2 always-on, 2 inactive test fixtures for deactivated/expired scenarios).
if (countOf('promotions') === 0) {
  emitInsert(BASELINE_OUT, 'promotions', ['id', 'code', 'description', 'discount_percent', 'discount_amount',
    'valid_from', 'valid_to', 'active', 'usage_limit', 'used_count'], [
    [newId(), 'PERCENT10', 'Giam 10% tong hoa don', 10.00, null, `${CURRENT_YEAR}-01-01`, `${CURRENT_YEAR}-12-31`, true, null, 0],
    [newId(), 'FLAT50K', 'Giam 50.000d cho moi don hang', null, 50000, `${CURRENT_YEAR}-01-01`, `${CURRENT_YEAR}-12-31`, true, null, 0],
    [newId(), 'WELCOME20', 'Khuyen mai chao mung khach hang moi - Giam 20%', 20.00, null, `${CURRENT_YEAR}-06-01`, `${CURRENT_YEAR}-06-30`, false, null, 0],
    [newId(), 'SUMMER30', 'Khuyen mai he 2025 - Giam 30%', 30.00, null, `${CURRENT_YEAR - 1}-06-01`, `${CURRENT_YEAR - 1}-08-31`, false, null, 0],
  ]);
}

// Menu catalog imported from the repo-root menu-export.csv (the real ~97-item sushi-restaurant
// catalog exported via the app's own GET /menu/export-csv), replacing DataSeeder's old 10
// hardcoded generic items. Categories are find-or-created by name; items are inserted only if
// their `code` isn't already present, so a partially-imported catalog can be topped up safely.
if (!fs.existsSync(MENU_CSV_PATH)) throw new Error(`menu-export.csv not found at ${MENU_CSV_PATH}`);
let csvText = fs.readFileSync(MENU_CSV_PATH, 'utf8');
if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1); // strip UTF-8 BOM
const csvLines = csvText.split(/\r?\n/).filter((l) => l.length > 0);
const csvHeader = csvLines[0].split(',');
const csvRows = csvLines.slice(1).map((line) => {
  const cells = line.split(',');
  const row = {};
  csvHeader.forEach((h, i) => { row[h] = (cells[i] !== undefined ? cells[i] : '').trim(); });
  return row;
});

const existingCatRows = sqlcmdQuery('SELECT id, name, display_order FROM menu_categories');
const catIdByName = {};
let maxCatOrder = -1;
for (const [id, name, order] of existingCatRows) {
  catIdByName[name] = id;
  maxCatOrder = Math.max(maxCatOrder, parseInt(order, 10) || 0);
}
const newCatRows = [];
for (const row of csvRows) {
  if (!row.category || catIdByName[row.category]) continue;
  const id = newId();
  catIdByName[row.category] = id;
  maxCatOrder += 1;
  newCatRows.push([id, row.category, maxCatOrder, null]);
}
emitInsert(BASELINE_OUT, 'menu_categories', ['id', 'name', 'display_order', 'icon'], newCatRows);

const existingItemCodes = new Set(sqlcmdQuery('SELECT code FROM menu_items WHERE code IS NOT NULL').map((r) => r[0]));
const newMenuItemRows = [];
for (const row of csvRows) {
  if (!row.code || existingItemCodes.has(row.code)) continue;
  const catId = catIdByName[row.category];
  if (!catId) continue; // category was just created above in this same run
  newMenuItemRows.push([
    newId(), row.code, catId, row.name, parseInt(row.price, 10) || 0,
    row.costPrice ? parseInt(row.costPrice, 10) : null,
    row.description || null, row.imageUrl || null,
    row.menuType || null, row.itemType || null, row.tag || null,
    row.trackStock === 'true', row.status === 'Available', null,
  ]);
}
emitInsert(BASELINE_OUT, 'menu_items', ['id', 'code', 'category_id', 'name', 'price', 'cost_price', 'description',
  'image_url', 'menu_type', 'item_type', 'tag', 'track_stock', 'available', 'updated_at'], newMenuItemRows);

if (BASELINE_OUT.length > 2) {
  fs.writeFileSync(BASELINE_PATH, BASELINE_OUT.join('\n'), 'utf8');
  sqlcmdRunFile(BASELINE_PATH);
  console.log(`  -> inserted missing baseline rows (${newBaselineUserRows.length} user(s), ${newCatRows.length} categor${newCatRows.length === 1 ? 'y' : 'ies'}, ${newMenuItemRows.length} menu item(s), plus tables/promotions if missing).`);
} else {
  console.log('  -> baseline data already present, nothing to do.');
}

// ---------------------------------------------------------------------------------------
console.log('[2/5] Cleaning up previous seed run (00_cleanup.sql)...');
sqlcmdRunFile(CLEANUP_PATH);

// ---------------------------------------------------------------------------------------
// Live reference data (read-only lookups against rms_db, run AFTER cleanup so MAX()/sequence
// values reflect only real pre-existing data, never this script's own previous run)
// ---------------------------------------------------------------------------------------
console.log('[3/5] Resolving live reference data...');

const MENU_ITEMS = sqlcmdQuery('SELECT id, name, price, cost_price FROM menu_items WHERE available = 1')
  .map(([id, name, price, costPrice]) => [id, name, parseInt(price, 10), costPrice ? parseInt(costPrice, 10) : 0]);
const TABLE_IDS = sqlcmdQuery('SELECT id FROM restaurant_tables WHERE active = 1').map((r) => r[0]);
if (!MENU_ITEMS.length) throw new Error('No available menu_items found -- is rms_db reachable and seeded?');
if (!TABLE_IDS.length) throw new Error('No active restaurant_tables found.');

// Core test-account users (created by the baseline step above on a fresh DB, resolved live by
// username rather than hardcoded id so a DB reset never breaks this).
const userRows = sqlcmdQuery("SELECT id, username FROM users WHERE username IN ('manager01','cashier01','waiter01')");
const userIdByUsername = {};
for (const [id, username] of userRows) userIdByUsername[username] = id;
for (const u of ['manager01', 'cashier01', 'waiter01']) {
  if (!userIdByUsername[u]) throw new Error(`Required user '${u}' not found live -- is rms_db seeded with base test accounts?`);
}
const USER_MANAGER01 = userIdByUsername.manager01;
const USER_CASHIER01 = userIdByUsername.cashier01;
const USER_WAITER01 = userIdByUsername.waiter01;
// Fixed bcrypt hash reused for every synthetic account this script creates (cashier02,
// waiter02, ...) -- same rationale as BASELINE_USERS above: no bcrypt in Node's stdlib.
const SEED_ACCOUNT_PASSWORD_HASH = '$2a$12$laA5nJYNLEjnwIPvjeReju0IkZ5LzYF3IO.ZucZWBHIKVlbk7v2CW';

// Cashbook categories are fixed, migration-seeded rows (V42__create_cashbook.sql) that are never
// recreated per environment, so their IDs are hardcoded here rather than resolved by name --
// sqlcmd echoes query results using the Windows console codepage, not UTF-8, so any live text
// with Vietnamese diacritics (e.g. "Thu khác") comes back mangled and never matches a JS string
// literal. Matching by code (ASCII, unaffected by that mangling) covers the 2 named-code rows;
// the ID existence check below covers the other 4, which the migration never assigns a code to.
const CAT_SALARY_PAYMENT = 'c0000000-0000-0000-0000-000000000001';
const CAT_SALES_RECEIPT = 'c0000000-0000-0000-0000-000000000002';
const CAT_OTHER_RECEIPT = 'c0000000-0000-0000-0000-000000000003';
const CAT_INGREDIENTS = 'c0000000-0000-0000-0000-000000000004';
const CAT_UTILITIES = 'c0000000-0000-0000-0000-000000000005';
const CAT_CSVC = 'c0000000-0000-0000-0000-000000000006';
const catIds = [CAT_SALARY_PAYMENT, CAT_SALES_RECEIPT, CAT_OTHER_RECEIPT, CAT_INGREDIENTS, CAT_UTILITIES, CAT_CSVC];
const catFoundCount = parseInt(sqlcmdQuery(
  `SELECT COUNT(*) FROM cashbook_categories WHERE id IN (${catIds.map((id) => `'${id}'`).join(',')})`,
)[0][0], 10);
if (catFoundCount !== catIds.length) throw new Error('Fixed cashbook categories from V42 migration not found live.');

// Active promotions usable for discounted invoices.
const promoRows = sqlcmdQuery("SELECT id, code FROM promotions WHERE code IN ('PERCENT10','FLAT50K')");
const promoIdByCode = {};
for (const [id, code] of promoRows) promoIdByCode[code] = id;
if (!promoIdByCode.PERCENT10 || !promoIdByCode.FLAT50K) throw new Error('Required promotions PERCENT10/FLAT50K not found live.');
const PROMOTIONS = [
  { id: promoIdByCode.PERCENT10, percent: 10, amount: null },
  { id: promoIdByCode.FLAT50K, percent: null, amount: 50000 },
];
const PROMO_USAGE = {};

// Work-shift templates: find-or-create by name, uniformly (no more "assumed pre-existing").
const SHIFT_DEFS = [
  { key: 'CA_SANG', name: 'Ca Sang', start: [6, 0], end: [10, 0] },
  { key: 'CA_CHIEU', name: 'Ca Chieu', start: [14, 30], end: [18, 30] },
  { key: 'CA_TOI', name: 'Ca Toi', start: [18, 0], end: [22, 0] },
];
const newWsRowsOut = [];
const shiftIdByKey = {};
for (const def of SHIFT_DEFS) {
  const found = sqlcmdQuery(`SELECT id FROM work_shifts WHERE name = '${def.name}'`);
  if (found.length) {
    shiftIdByKey[def.key] = found[0][0];
  } else {
    const id = newId();
    shiftIdByKey[def.key] = id;
    newWsRowsOut.push([id, def.name, fmtTime(...def.start), fmtTime(...def.end), null, null, null, 'ACTIVE', NOW_STAMP, NOW_STAMP]);
  }
}
const SHIFT_CA_SANG = shiftIdByKey.CA_SANG, SHIFT_CA_CHIEU = shiftIdByKey.CA_CHIEU, SHIFT_CA_TOI = shiftIdByKey.CA_TOI;
const SHIFT_TIMES = {
  [SHIFT_CA_SANG]: [6, 0, 10, 0],
  [SHIFT_CA_CHIEU]: [14, 30, 18, 30],
  [SHIFT_CA_TOI]: [18, 0, 22, 0],
};
const SHIFT_NAMES = { [SHIFT_CA_SANG]: 'Ca Sang', [SHIFT_CA_CHIEU]: 'Ca Chieu', [SHIFT_CA_TOI]: 'Ca Toi' };
const SHIFT_IDS = Object.keys(SHIFT_TIMES);

// Violation types: find-or-create by name, uniformly.
const VT_DEFS = [
  { key: 'LATE', name: 'Di muon', penalty: 50000 },
  { key: 'NOSHOW', name: 'Nghi khong phep', penalty: 200000 },
  { key: 'UNIFORM', name: 'Vi pham dong phuc', penalty: 30000 },
];
const violationTypeRows = [];
const vtIdByKey = {};
for (const def of VT_DEFS) {
  const found = sqlcmdQuery(`SELECT id FROM violation_types WHERE name = '${def.name}'`);
  if (found.length) {
    vtIdByKey[def.key] = found[0][0];
  } else {
    const id = newId();
    vtIdByKey[def.key] = id;
    violationTypeRows.push([id, def.name, def.penalty, false, NOW_STAMP, NOW_STAMP]);
  }
}
const VT_LATE = vtIdByKey.LATE, VT_NOSHOW = vtIdByKey.NOSHOW, VT_UNIFORM = vtIdByKey.UNIFORM;
const VT_LATE_PENALTY = 50000;

// Attendance settings (singleton row) -- read live instead of hardcoding grace/threshold values.
const asRows = sqlcmdQuery("SELECT half_day_enabled, half_day_min_minutes, half_day_max_minutes, " +
  "late_enabled, late_grace_minutes, early_leave_enabled, early_leave_grace_minutes, " +
  "late_penalty_enabled, late_penalty_rounding_minutes, overtime_enabled, ot_rounding_minutes " +
  "FROM attendance_settings WHERE id = 'a0000000-0000-0000-0000-000000000001'");
if (!asRows.length) throw new Error('attendance_settings singleton row not found live.');
const [hdEn, hdMin, hdMax, lateEn, lateGrace, earlyEn, earlyGrace, latePenEn, latePenRoundMin, otEn, otRoundMin] = asRows[0];
const ATTENDANCE_SETTINGS = {
  halfDayEnabled: hdEn === '1', halfDayMinMinutes: parseInt(hdMin, 10), halfDayMaxMinutes: parseInt(hdMax, 10),
  lateEnabled: lateEn === '1', lateGraceMinutes: parseInt(lateGrace, 10),
  earlyLeaveEnabled: earlyEn === '1', earlyLeaveGraceMinutes: parseInt(earlyGrace, 10),
  latePenaltyEnabled: latePenEn === '1', latePenaltyRoundingMinutes: parseInt(latePenRoundMin, 10),
  overtimeEnabled: otEn === '1', otRoundingMinutes: parseInt(otRoundMin, 10),
};

// Code counters -- live sequence current_value / MAX(code) suffix instead of a stale snapshot.
function liveSeqValue(name) {
  const rows = sqlcmdQuery(`SELECT current_value FROM sys.sequences WHERE name = '${name}'`);
  if (!rows.length) throw new Error(`Sequence ${name} not found live.`);
  return parseInt(rows[0][0], 10);
}
function liveMaxSuffix(table, prefix) {
  const rows = sqlcmdQuery(`SELECT MAX(code) FROM ${table} WHERE code LIKE '${prefix}%'`);
  const val = rows.length ? rows[0][0] : null;
  if (!val || val === 'NULL') return 0;
  const n = parseInt(val.slice(prefix.length), 10);
  return Number.isNaN(n) ? 0 : n;
}
const COUNTERS = {
  order_seq: liveSeqValue('order_code_seq'),
  invoice_seq: liveSeqValue('invoice_code_seq'),
  NV: liveMaxSuffix('employees', 'NV'),
  PT: liveMaxSuffix('cashbook_vouchers', 'PT'),
  PC: liveMaxSuffix('cashbook_vouchers', 'PC'),
  TT: liveMaxSuffix('cashbook_vouchers', 'TT'),
  BL: liveMaxSuffix('payroll_sheets', 'BL'),
  PL: liveMaxSuffix('payslips', 'PL'),
};
function nextCode(prefix, width = 6) { COUNTERS[prefix] += 1; return `${prefix}${String(COUNTERS[prefix]).padStart(width, '0')}`; }
function nextOrderCode() { COUNTERS.order_seq += 1; return `DH${String(COUNTERS.order_seq).padStart(6, '0')}`; }
function nextInvoiceCode() { COUNTERS.invoice_seq += 1; return `HD${String(COUNTERS.invoice_seq).padStart(6, '0')}`; }

console.log('[4/5] Generating 3 months of data...');
const OUT = ['SET QUOTED_IDENTIFIER ON;', 'GO'];

// ---------------------------------------------------------------------------------------
// Roster: 5 employees, always inserted fresh (no more "existing: true" assumption)
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

// Roster: 5 employees (Nguyen Van A-E) -- 1 manager, 2 cashiers, 2 waiters. Every employee is
// linked to a login account: manager01/cashier01/waiter01 already exist as baseline test
// accounts; cashier02/waiter02 are created fresh here. Every employee is account-linked,
// consistent with EmployeeServiceImpl.create() requiring one for new employees.
const NEW_USER_ROWS = [];
function newAccountUser(username, name, role) {
  const userId = newId();
  NEW_USER_ROWS.push([userId, username, SEED_ACCOUNT_PASSWORD_HASH, name, null, null, role, 'ACTIVE',
    0, null, NOW_STAMP, NOW_STAMP, 0]);
  return userId;
}
const ROSTER_SPECS = [
  { name: 'Nguyen Van A', pos: 'MANAGER', salaryType: 'FIXED', wage: 12000000, overtime: false, userId: USER_MANAGER01, username: 'manager01' },
  { name: 'Nguyen Van B', pos: 'CASHIER', salaryType: 'SHIFT', wage: 250000, overtime: true, userId: USER_CASHIER01, username: 'cashier01' },
  { name: 'Nguyen Van C', pos: 'CASHIER', salaryType: 'SHIFT', wage: 230000, overtime: true, userId: null, username: 'cashier02' },
  // D: SHIFT with overtime disabled -- exercises the "employee opted out of OT pay" path
  // (SalaryCalculator.computeShift's setting.isOvertimeEnabled() gate).
  { name: 'Nguyen Van D', pos: 'WAITER', salaryType: 'SHIFT', wage: 200000, overtime: false, userId: USER_WAITER01, username: 'waiter01' },
  // E: HOURLY -- the only non-SHIFT/FIXED salary type in the roster, so the "Lương"/"Lương dự
  // kiến" hourly-rate path (and payroll's computeHourly-equivalent below) gets real data too.
  { name: 'Nguyen Van E', pos: 'WAITER', salaryType: 'HOURLY', wage: 25000, overtime: false, userId: null, username: 'waiter02' },
];
let phoneSeq = 1;
const ROSTER = ROSTER_SPECS.map((spec) => {
  const code = nextCode('NV');
  const userId = spec.userId !== null ? spec.userId : newAccountUser(spec.username, spec.name, spec.pos);
  const phone = `090000${String(phoneSeq).padStart(4, '0')}`;
  phoneSeq += 1;
  return { id: newId(), code, name: spec.name, pos: spec.pos, needsSalary: true, salaryType: spec.salaryType,
    wage: spec.wage, overtime: spec.overtime, userId, username: spec.username, phone };
});

const CASHIERS = ROSTER.filter((e) => e.pos === 'CASHIER');
const WAITERS = ROSTER.filter((e) => e.pos === 'WAITER');
const MANAGER = ROSTER.find((e) => e.pos === 'MANAGER');

const cashierShiftCycle = [SHIFT_CA_SANG, SHIFT_CA_CHIEU, SHIFT_CA_TOI];
CASHIERS.forEach((e, i) => { e.primaryShift = cashierShiftCycle[i % 3]; e.offDay = 6; }); // Sunday
const waiterShiftCycle = [SHIFT_CA_SANG, SHIFT_CA_CHIEU, SHIFT_CA_TOI];
WAITERS.forEach((e, i) => { e.primaryShift = waiterShiftCycle[i % 3]; e.offDay = i % 7; });
MANAGER.primaryShift = SHIFT_CA_SANG;
MANAGER.offDay = 6;

// ---------------------------------------------------------------------------------------
// Attendance calculator (ported from AttendanceCalculator.java; settings read live above)
// ---------------------------------------------------------------------------------------
function scheduledWindow(workDate, shiftId) {
  const [sh, sm, eh, em] = SHIFT_TIMES[shiftId];
  const start = mkDate(workDate.getFullYear(), workDate.getMonth() + 1, workDate.getDate(), sh, sm, 0);
  const overnight = eh * 60 + em <= sh * 60 + sm;
  const endBase = overnight ? addDays(workDate, 1) : workDate;
  const end = mkDate(endBase.getFullYear(), endBase.getMonth() + 1, endBase.getDate(), eh, em, 0);
  return [start, end];
}
function beyondGrace(enabled, raw, grace) { return enabled && raw > grace ? raw - grace : 0; }

function computeAttendance(workDate, shiftId, actualIn, actualOut) {
  if (!actualIn || !actualOut) return { worked: 0, late: 0, early: 0, ot: 0, credit: 0 };
  const s = ATTENDANCE_SETTINGS;
  const [schedStart, schedEnd] = scheduledWindow(workDate, shiftId);
  const worked = Math.max(0, diffMinutes(actualIn, actualOut));
  const lateRaw = Math.max(0, diffMinutes(schedStart, actualIn));
  const earlyRaw = Math.max(0, diffMinutes(actualOut, schedEnd));
  const otBeforeRaw = Math.max(0, diffMinutes(actualIn, schedStart));
  const otAfterRaw = Math.max(0, diffMinutes(schedEnd, actualOut));
  let late = beyondGrace(s.lateEnabled, lateRaw, s.lateGraceMinutes);
  let early = beyondGrace(s.earlyLeaveEnabled, earlyRaw, s.earlyLeaveGraceMinutes);
  // BR-AT-10: no minimum threshold -- any time outside the shift window counts as OT when
  // enabled, expressed in decimal hours (otMinutes / 60.0) by the payroll OT formula.
  const otBefore = s.overtimeEnabled ? otBeforeRaw : 0;
  const otAfter = s.overtimeEnabled ? otAfterRaw : 0;
  const ot = otBefore + otAfter;
  if (s.halfDayEnabled && worked >= s.halfDayMinMinutes && worked < s.halfDayMaxMinutes) {
    late = 0; early = 0; // half-day zeroes late/early, never OT
  }
  let credit = worked > 0 ? Math.round((worked / 480) * 100) / 100 : 0;
  credit = Math.min(credit, 1.0);
  return { worked, late, early, ot, credit };
}
function syntheticWindow(emp, d) { return scheduledWindow(d, emp.primaryShift); }

// ---------------------------------------------------------------------------------------
// Precompute every employee's schedule + attendance across the whole window
// ---------------------------------------------------------------------------------------
// SCHEDULE_INDEX maps `${employeeId}|${dateKey}` -> an ARRAY of shift infos (usually length 1;
// occasionally 2 -- see the "second shift" roll below -- so the Timesheet UI's history popups
// have real multi-shift-same-day data to group/stack, matching the reference mockups).
const SCHEDULE_INDEX = new Map();
const VIOLATIONS_BY_EMP = {}; // employeeId -> [[date, penalty], ...]

/** One worked shift's actual in/out + computed metrics, with realistic jitter: usually close
 * to on-time, occasionally late arrival (8%), late departure/extra OT (6%), or early leave (6%). */
function generateShiftAttendance(d, shiftId) {
  const [baseIn, baseOut] = scheduledWindow(d, shiftId);
  let jitterIn = randInt(-5, 5);
  let jitterOut = randInt(-5, 10);
  const r2 = randFloat();
  if (r2 < 0.08) jitterIn += randInt(20, 90);
  else if (r2 < 0.14) jitterOut += randInt(30, 120);
  else if (r2 < 0.20) jitterOut -= randInt(15, 90);
  const actualIn = addMinutes(baseIn, jitterIn);
  const actualOut = addMinutes(baseOut, jitterOut);
  return { shiftId, type: 'PRESENT', actualIn, actualOut, scheduleId: newId(), recordId: newId(),
    ...computeAttendance(d, shiftId, actualIn, actualOut) };
}
function leaveAttendance(shiftId, type) {
  return { shiftId, type, actualIn: null, actualOut: null, scheduleId: newId(), recordId: newId(),
    worked: 0, late: 0, early: 0, ot: 0, credit: 0 };
}

for (const emp of ROSTER) {
  VIOLATIONS_BY_EMP[emp.id] = [];
  for (const d of ALL_DATES) {
    if (pyWeekday(d) === emp.offDay) continue;
    let shiftId = emp.primaryShift;
    if (randFloat() < 0.08) shiftId = choice(SHIFT_IDS);
    const roll = randFloat();
    let infos;
    if (roll < 0.03) infos = [leaveAttendance(shiftId, 'LEAVE_UNAPPROVED')];
    else if (roll < 0.06) infos = [leaveAttendance(shiftId, 'LEAVE_APPROVED')];
    else {
      infos = [generateShiftAttendance(d, shiftId)];
      // Occasionally work a second shift the same day -- a separate schedule/record from a
      // merged punch (BR-AT-11), just two ordinary shifts stacked under one date.
      if (randFloat() < 0.04) {
        const otherShiftId = choice(SHIFT_IDS.filter((id) => id !== shiftId));
        infos.push(generateShiftAttendance(d, otherShiftId));
      }
    }
    SCHEDULE_INDEX.set(`${emp.id}|${dateKey(d)}`, infos);
  }
}

// Emit work_schedules / attendance_records / violations rows.
const wsRows = [], arRows = [], vioRows = [];
for (const emp of ROSTER) {
  for (const d of ALL_DATES) {
    const key = `${emp.id}|${dateKey(d)}`;
    const infos = SCHEDULE_INDEX.get(key);
    if (!infos) continue;
    const postedAt = fmtDateTime(mkDate(d.getFullYear(), d.getMonth() + 1, d.getDate(), 7, 0, 0));
    for (const info of infos) {
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
}

// ---------------------------------------------------------------------------------------
// Cashier POS shifts, orders, invoices, payments, cashbook vouchers, reservations
// ---------------------------------------------------------------------------------------
function cashierWindow(c, d) {
  // Only the primary (first) shift of the day drives the POS register window -- an extra
  // second shift that day (see SCHEDULE_INDEX above) is an attendance/payroll fact only, not
  // a second cash register shift.
  const info = SCHEDULE_INDEX.get(`${c.id}|${dateKey(d)}`)?.[0];
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
    const info = SCHEDULE_INDEX.get(`${c.id}|${dateKey(d)}`)?.[0];
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
  // and SQL Server hard-caps a single query at 2100 params. ~600 orders (~1.7k order_items)
  // stays comfortably under that ceiling while still reading as a believable volume. See
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
      const [mid, mname, price, costPrice] = choice(MENU_ITEMS);
      const qty = choice([1, 1, 1, 2, 2, 3]);
      items.push({ id: newId(), menuItemId: mid, name: mname, qty, price, costPrice, isQr: isGuest });
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
      for (const i of sourceItems) allocationRows.push([newId(), sourceId, i.id, i.qty, i.price, true, fmtDateTime(orderTime), i.costPrice]);
      allocationRows.push([newId(), childId, childItem.id, childItem.qty, childItem.price, true, fmtDateTime(orderTime), childItem.costPrice]);

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
      for (const i of groupA) allocationRows.push([newId(), aId, i.id, i.qty, i.price, false, fmtDateTime(orderTime), i.costPrice]);
      for (const i of groupB) allocationRows.push([newId(), bId, i.id, i.qty, i.price, false, fmtDateTime(orderTime), i.costPrice]);
      for (const i of items) allocationRows.push([newId(), targetId, i.id, i.qty, i.price, true, fmtDateTime(orderTime), i.costPrice]);

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
      for (const i of items) allocationRows.push([newId(), invId, i.id, i.qty, i.price, true, fmtDateTime(orderTime), i.costPrice]);

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
    // Unlike every other created_by column in this script (plain NVARCHAR username, added in
    // later migrations), reservations.created_by is a genuine FK to users(id) from the
    // original V2 migration -- must be the live-resolved user id, not a username string.
    reservationRows.push([newId(), randFloat() > 0.2 ? choice(TABLE_IDS) : null, choice(GUEST_NAME_POOL),
      `09${randInt(10000000, 99999999)}`, randInt(2, 8), fmtDateTime(rTime), null, status, null, false,
      USER_MANAGER01, null, null, null, fmtDateTime(rTime), fmtDateTime(rTime)]);
  }

  // Monthly-ish manual cashbook vouchers (first Monday seen each month = ingredients+
  // utilities+CSVC; occasional other income).
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
// Payroll: 2 finalized months + current (partial, DRAFT) month, relative to END_DATE
// ---------------------------------------------------------------------------------------
const HOLIDAY_YEAR = CURRENT_YEAR;
const HOLIDAY_DATES = new Set([dateKey(mkDate(HOLIDAY_YEAR, 4, 30)), dateKey(mkDate(HOLIDAY_YEAR, 5, 1))]);
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
// Automatic late/early wage deduction (opt-in, SHIFT-type only, mirrors SalaryCalculator's
// lateEarlyPenalty()): rounds UP to the nearest multiple of roundingMin, always at least one
// block even on an exact multiple. E.g. roundingMin=15: 1 actual minute -> 0.25h; 16 min -> 0.5h.
function lateEarlyPenaltyAmount(wage, scheduledMin, minutes, roundingMin) {
  if (minutes <= 0 || roundingMin <= 0 || scheduledMin <= 0) return 0;
  const hourlyBase = (wage * 60) / scheduledMin;
  const blocks = Math.floor(minutes / roundingMin) + 1;
  const hours = (blocks * roundingMin) / 60;
  return round0(hourlyBase * hours);
}

function computePayslip(emp, periodStart, periodEnd) {
  const records = [];
  for (const d of ALL_DATES) {
    if (d < periodStart || d > periodEnd) continue;
    const infos = SCHEDULE_INDEX.get(`${emp.id}|${dateKey(d)}`);
    if (infos) for (const info of infos) records.push([d, info]);
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
    return { main, overtime, shiftCount, workedMinutes, otMinutes: 0, snapshot, lateEarlyDeduction: 0 };
  }
  if (emp.salaryType === 'HOURLY') {
    // Mirrors SalaryCalculator.computeHourly(): paid strictly by workedMinutes, day-type
    // adjusted rate, no OT (BR-PAY-05) and no late/early deduction (already paid less for the
    // minutes actually missed).
    let mainTotal = 0, shiftCount = 0, workedMinutesTotal = 0;
    for (const [d, info] of records) {
      workedMinutesTotal += info.worked;
      const dt = dayTypeFor(d);
      const pct = DAY_RATE[dt];
      const hourlyRate = applyRate(emp.wage, pct);
      const isPaid = info.type === 'PRESENT' && info.actualOut !== null && info.worked > 0;
      const amount = isPaid ? round0((hourlyRate * info.worked) / 60) : 0;
      if (isPaid) shiftCount += 1;
      mainTotal += amount;
      snapshot.push({ date: fmtDate(d), shiftName: SHIFT_NAMES[info.shiftId], status: info.type,
        checkInAt: fmtIsoDateTime(info.actualIn), checkOutAt: fmtIsoDateTime(info.actualOut),
        workedMinutes: info.worked, otMinutes: 0, dayType: dt, rateApplied: pct ? `${pct}%` : null,
        amount, note: null });
    }
    return { main: mainTotal, overtime: 0, shiftCount, workedMinutes: workedMinutesTotal, otMinutes: 0, snapshot, lateEarlyDeduction: 0 };
  }

  let mainTotal = 0, otTotal = 0, otMinutesTotal = 0, shiftCount = 0, workedMinutesTotal = 0, lateEarlyDeductionTotal = 0;
  for (const [d, info] of records) {
    workedMinutesTotal += info.worked;
    const dt = dayTypeFor(d);
    const pct = DAY_RATE[dt];
    const shiftWage = applyRate(emp.wage, pct);
    const isPaid = info.type === 'PRESENT' && info.actualOut !== null;
    const amount = isPaid ? round0(shiftWage) : 0;
    if (isPaid) shiftCount += 1;
    const scheduled = scheduledMinutes(info.shiftId);
    const otMin = emp.overtime ? info.ot : 0;
    let otAmount = 0;
    if (otMin > 0 && scheduled > 0) {
      const hourlyBase = (emp.wage * 60) / scheduled;
      const otPct = OT_RATE[dt] != null ? OT_RATE[dt] : OT_RATE.normal;
      const perHour = applyRate(hourlyBase, otPct);
      // Pay rounds actual OT minutes DOWN to the nearest multiple of otRoundingMinutes
      // before converting to decimal hours (mirrors SalaryCalculator.otAmount()).
      const roundMin = ATTENDANCE_SETTINGS.otRoundingMinutes;
      const roundedOtMin = roundMin > 0 ? Math.floor(otMin / roundMin) * roundMin : otMin;
      otAmount = round0((perHour * roundedOtMin) / 60);
    }
    let rowDeduction = 0;
    if (ATTENDANCE_SETTINGS.latePenaltyEnabled) {
      rowDeduction = lateEarlyPenaltyAmount(emp.wage, scheduled, info.late, ATTENDANCE_SETTINGS.latePenaltyRoundingMinutes)
        + lateEarlyPenaltyAmount(emp.wage, scheduled, info.early, ATTENDANCE_SETTINGS.latePenaltyRoundingMinutes);
      lateEarlyDeductionTotal += rowDeduction;
    }
    mainTotal += amount; otTotal += otAmount; otMinutesTotal += otMin;
    snapshot.push({ date: fmtDate(d), shiftName: SHIFT_NAMES[info.shiftId], status: info.type,
      checkInAt: fmtIsoDateTime(info.actualIn), checkOutAt: fmtIsoDateTime(info.actualOut),
      workedMinutes: info.worked, otMinutes: otMin, dayType: dt, rateApplied: pct ? `${pct}%` : null,
      amount: amount + otAmount, note: rowDeduction > 0 ? `Tru luong di muon/ve som: ${rowDeduction}d` : null });
  }
  return { main: mainTotal, overtime: otTotal, shiftCount, workedMinutes: workedMinutesTotal, otMinutes: otMinutesTotal,
    snapshot, lateEarlyDeduction: lateEarlyDeductionTotal };
}

const payrollSheetRows = [], payslipRows = [], payslipPaymentRows = [];
const curMonth = { y: END_DATE.getFullYear(), m: END_DATE.getMonth() + 1 };
const prev1Month = shiftMonth(curMonth.y, curMonth.m, -1);
const prev2Month = shiftMonth(curMonth.y, curMonth.m, -2);
const PERIODS = [
  { start: startOfMonth(prev2Month.y, prev2Month.m), end: endOfMonth(prev2Month.y, prev2Month.m),
    name: `Bang luong thang ${prev2Month.m}/${prev2Month.y}`, status: 'FINALIZED', finalizeOffset: 3, partialFor: new Set() },
  { start: startOfMonth(prev1Month.y, prev1Month.m), end: endOfMonth(prev1Month.y, prev1Month.m),
    name: `Bang luong thang ${prev1Month.m}/${prev1Month.y}`, status: 'FINALIZED', finalizeOffset: 3,
    partialFor: new Set([WAITERS[0].id, WAITERS[1].id]) },
  { start: startOfMonth(curMonth.y, curMonth.m), end: endOfMonth(curMonth.y, curMonth.m),
    name: `Bang luong thang ${curMonth.m}/${curMonth.y}`, status: 'DRAFT', finalizeOffset: null, partialFor: new Set() },
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
    const { main, overtime, shiftCount, workedMinutes, otMinutes, snapshot, lateEarlyDeduction } =
      computePayslip(emp, period.start, periodEndClamped);
    const violationDeduction = VIOLATIONS_BY_EMP[emp.id]
      .filter(([dd]) => dd >= period.start && dd <= period.end)
      .reduce((a, [, p]) => a + p, 0);
    const deduction = violationDeduction + lateEarlyDeduction;
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
// Employees / salary settings rows to emit (all 5 are always fresh inserts now)
// ---------------------------------------------------------------------------------------
for (const emp of ROSTER) {
  empRows.push([emp.id, emp.code, emp.name, emp.phone, 'ACTIVE', null, fmtDate(START_DATE), null, null,
    null, null, null, null, emp.userId, NOW_STAMP, NOW_STAMP]);
  if (emp.needsSalary) {
    const rates = emp.salaryType === 'FIXED' ? null : RATES_SHIFT_JSON;
    const otRates = emp.overtime ? OT_RATES_SHIFT_JSON : null;
    salaryRows.push([newId(), emp.id, emp.salaryType, emp.wage, rates, emp.overtime, otRates, null, NOW_STAMP, NOW_STAMP]);
  }
}

const holidayRows = [
  [newId(), 'Ngay Thong Nhat', fmtDate(mkDate(HOLIDAY_YEAR, 4, 30)), NOW_STAMP, NOW_STAMP],
  [newId(), 'Quoc Te Lao Dong', fmtDate(mkDate(HOLIDAY_YEAR, 5, 1)), NOW_STAMP, NOW_STAMP],
];

const salaryTemplateRows = [
  [newId(), 'Mau nhan vien phuc vu', 'SHIFT', 190000, RATES_SHIFT_JSON, true, OT_RATES_SHIFT_JSON, NOW_STAMP, NOW_STAMP],
];

// ---------------------------------------------------------------------------------------
// Emit everything in FK-safe order
// ---------------------------------------------------------------------------------------
emitInsert(OUT, 'users', ['id', 'username', 'password_hash', 'full_name', 'email', 'phone', 'role', 'status',
  'failed_login_attempts', 'locked_at', 'created_at', 'updated_at', 'token_version'], NEW_USER_ROWS);

emitInsert(OUT, 'employees', ['id', 'code', 'name', 'phone', 'status', 'avatar_url', 'start_date', 'timekeep_code',
  'note', 'id_number', 'birthday', 'gender', 'address', 'user_id', 'created_at', 'updated_at'], empRows);

emitInsert(OUT, 'salary_settings', ['id', 'employee_id', 'main_salary_type', 'main_base_wage', 'main_advanced_rates',
  'overtime_enabled', 'overtime_rates', 'salary_template', 'created_at', 'updated_at'], salaryRows);

emitInsert(OUT, 'work_shifts', ['id', 'name', 'start_time', 'end_time', 'check_in_window_start', 'check_in_window_end',
  'apply_scope', 'status', 'created_at', 'updated_at'], newWsRowsOut);

emitInsert(OUT, 'payroll_holidays', ['id', 'name', 'holiday_date', 'created_at', 'updated_at'], holidayRows);

emitInsert(OUT, 'salary_templates', ['id', 'name', 'main_salary_type', 'main_base_wage', 'main_advanced_rates',
  'overtime_enabled', 'overtime_rates', 'created_at', 'updated_at'], salaryTemplateRows);

emitInsert(OUT, 'violation_types', ['id', 'name', 'penalty_amount', 'deleted', 'created_at', 'updated_at'], violationTypeRows);

emitInsert(OUT, 'work_schedules', ['id', 'employee_id', 'shift_id', 'work_date', 'rule_id', 'substitute_employee_id',
  'created_at', 'updated_at'], wsRows);

emitInsert(OUT, 'attendance_records', ['id', 'schedule_id', 'type', 'actual_check_in', 'actual_check_out',
  'worked_minutes', 'late_minutes', 'early_leave_minutes', 'ot_minutes', 'work_credit', 'auto_filled', 'note',
  'created_by', 'created_at', 'updated_at'], arRows);

emitInsert(OUT, 'violations', ['id', 'attendance_record_id', 'violation_type_id', 'count', 'applied_penalty',
  'created_at', 'updated_at'], vioRows);

emitInsert(OUT, 'orders', ['id', 'code', 'table_id', 'cashier_id', 'status', 'note', 'customer_name', 'customer_phone',
  'customer_email', 'created_at', 'updated_at'], orderRows);

emitInsert(OUT, 'order_items', ['id', 'order_id', 'menu_item_id', 'menu_item_name', 'quantity', 'unit_price', 'note',
  'cooking_status', 'rejection_note', 'is_qr_order'], orderItemRows);

// MERGED rows carry a self-referencing FK (merged_into_invoice_id -> another row in this
// same table); a 200-row batch boundary can otherwise land between a MERGED row and its
// target, inserted in a later batch. Stable-sort so every target (merged_into_invoice_id
// IS NULL) is emitted before any row that references it.
invoiceRows.sort((a, b) => (a[9] === null ? 0 : 1) - (b[9] === null ? 0 : 1));

emitInsert(OUT, 'invoices', ['id', 'code', 'order_id', 'subtotal', 'discount_amount', 'total_amount', 'promotion_id',
  'is_paid', 'status', 'merged_into_invoice_id', 'split_from_invoice_id', 'created_by', 'created_at'], invoiceRows);

emitInsert(OUT, 'invoice_item_allocations', ['id', 'invoice_id', 'order_item_id', 'allocated_quantity',
  'unit_price_snapshot', 'active', 'created_at', 'unit_cost_snapshot'], allocationRows);

emitInsert(OUT, 'shifts', ['id', 'cashier_id', 'business_date', 'opened_at', 'closed_at', 'opening_cash', 'closing_cash',
  'total_revenue', 'status', 'shift_type', 'closed_by', 'handover_amount', 'card_batch_total', 'closing_note'], shiftRows);

emitInsert(OUT, 'payments', ['id', 'invoice_id', 'shift_id', 'cashier_id', 'method', 'amount', 'gateway_ref', 'status',
  'received_amount', 'change_amount', 'expires_at', 'paid_at', 'created_at'], paymentRows);

emitInsert(OUT, 'cashbook_vouchers', ['id', 'code', 'type', 'occurred_at', 'category_id', 'method', 'partner_group',
  'partner_id', 'partner_name', 'amount', 'note', 'accounting_to_income', 'source_type', 'source_reference_id',
  'created_by', 'voided', 'created_at'], voucherRows);

emitInsert(OUT, 'reservations', ['id', 'table_id', 'guest_name', 'phone', 'party_size', 'datetime', 'note', 'status',
  'guest_email', 'reminder_sent', 'created_by', 'cancel_token', 'cancel_otp', 'cancel_otp_expires', 'created_at',
  'updated_at'], reservationRows);

emitInsert(OUT, 'payroll_sheets', ['id', 'code', 'name', 'pay_term', 'period_start', 'period_end', 'scope', 'status',
  'payment_status', 'note', 'created_by', 'finalized_by', 'finalized_at', 'data_refreshed_at', 'created_at',
  'updated_at'], payrollSheetRows);

emitInsert(OUT, 'payslips', ['id', 'code', 'payroll_sheet_id', 'employee_id', 'employee_code', 'employee_name',
  'salary_type', 'main_salary', 'overtime_salary', 'deduction', 'main_overridden', 'overtime_overridden',
  'deduction_overridden', 'paid_amount', 'payment_status', 'status', 'shift_count', 'worked_minutes', 'ot_minutes',
  'attendance_snapshot', 'created_at', 'updated_at'], payslipRows);

emitInsert(OUT, 'payslip_payments', ['id', 'payslip_id', 'voucher_code', 'amount', 'method', 'paid_at', 'note',
  'created_by', 'created_at'], payslipPaymentRows);

for (const [promoId, count] of Object.entries(PROMO_USAGE)) {
  emitRaw(OUT, `UPDATE promotions SET used_count = used_count + ${count} WHERE id = '${promoId}';`);
}

emitRaw(OUT, "UPDATE cashbook_opening_balances SET amount = 5000000, updated_by = 'manager01', " +
  "updated_at = SYSUTCDATETIME() WHERE method = 'CASH';");
emitRaw(OUT, "UPDATE cashbook_opening_balances SET amount = 20000000, updated_by = 'manager01', " +
  "updated_at = SYSUTCDATETIME() WHERE method = 'BANK';");

// Advance the live sequences past whatever this run just used -- COUNTERS were seeded from
// the LIVE current_value above, so this never drags the sequence backward (the bug in the
// old script, which restarted from a stale 2026-07-24 snapshot).
emitRaw(OUT, `ALTER SEQUENCE dbo.order_code_seq RESTART WITH ${COUNTERS.order_seq + 1};`);
emitRaw(OUT, `ALTER SEQUENCE dbo.invoice_code_seq RESTART WITH ${COUNTERS.invoice_seq + 1};`);

fs.writeFileSync(OUT_PATH, OUT.join('\n'), 'utf8');
console.log(`Wrote ${OUT_PATH} (${OUT.length} statements)`);
console.log(`window=${fmtDate(START_DATE)}..${fmtDate(END_DATE)} orders=${orderRows.length} invoices=${invoiceRows.length} ` +
  `payments=${paymentRows.length} vouchers=${voucherRows.length} schedules=${wsRows.length} attendance=${arRows.length} ` +
  `violations=${vioRows.length} reservations=${reservationRows.length} shifts=${shiftRows.length} payslips=${payslipRows.length}`);

console.log('[5/5] Applying seed_3_months.sql...');
sqlcmdRunFile(OUT_PATH);
console.log('Done. Seed data applied successfully.');
