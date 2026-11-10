/**
 * ฟังก์ชันจัดการข้อมูลใน Google Sheets (ใช้ชีตเป็นตาราง แถวแรกเป็นหัวคอลัมน์)
 * ทุกเซลล์เก็บเป็นข้อความ (format "@") เพื่อป้องกัน Sheets แปลงวันที่/ตัวเลขเอง
 */

/** ใช้สเปรดชีตที่ผูกกับสคริปต์ หรือกำหนด Script Property ชื่อ SHEET_ID เพื่อใช้ไฟล์อื่น */
function getSS_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

const SHEET_CACHE_ = {};

function sheet_(name) {
  if (!SHEET_CACHE_[name]) {
    const sh = getSS_().getSheetByName(name);
    if (!sh) fail_('ไม่พบชีต "' + name + '" กรุณารันฟังก์ชัน setupSystem ก่อน');
    SHEET_CACHE_[name] = sh;
  }
  return SHEET_CACHE_[name];
}

function headers_(name) {
  const sh = sheet_(name);
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
}

/** อ่านทุกแถวเป็น array ของ object (มี _row = เลขแถวในชีต) */
function readAll_(name) {
  const sh = sheet_(name);
  const last = sh.getLastRow();
  const cols = sh.getLastColumn();
  if (last < 2 || cols < 1) return [];
  const values = sh.getRange(1, 1, last, cols).getDisplayValues();
  const h = values[0];
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const o = { _row: i + 1 };
    for (let j = 0; j < h.length; j++) o[h[j]] = values[i][j];
    out.push(o);
  }
  return out;
}

function findBy_(name, field, value) {
  const v = String(value);
  if (!v) return null;
  return readAll_(name).find(function (r) { return r[field] === v; }) || null;
}

function filterBy_(name, field, value) {
  const v = String(value);
  return readAll_(name).filter(function (r) { return r[field] === v; });
}

function toRow_(headers, obj) {
  return headers.map(function (k) {
    const v = obj[k];
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return String(v);
  });
}

function insert_(name, obj) {
  const sh = sheet_(name);
  const h = headers_(name);
  const row = sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, h.length).setNumberFormat('@').setValues([toRow_(h, obj)]);
  return obj;
}

/** อัปเดตแถวเดิม (rec ต้องมาจาก readAll_/findBy_ เพื่อให้มี _row) */
function update_(name, rec, patch) {
  const h = headers_(name);
  const merged = Object.assign({}, rec, patch);
  sheet_(name).getRange(rec._row, 1, 1, h.length).setNumberFormat('@').setValues([toRow_(h, merged)]);
  return merged;
}

/** ลบทุกแถวที่ตรงเงื่อนไข (ลบจากล่างขึ้นบนเพื่อไม่ให้เลขแถวเลื่อน) */
function removeWhere_(name, predicate) {
  const rows = readAll_(name).filter(predicate).map(function (r) { return r._row; });
  rows.sort(function (a, b) { return b - a; });
  const sh = sheet_(name);
  rows.forEach(function (r) { sh.deleteRow(r); });
  return rows.length;
}

function strip_(rec) {
  const o = Object.assign({}, rec);
  delete o._row;
  return o;
}

function uuid_() { return Utilities.getUuid(); }
function now_() { return new Date().toISOString(); }
function addHours_(h) { return new Date(Date.now() + h * 3600 * 1000).toISOString(); }
function clean_(s, max) { return String(s === undefined || s === null ? '' : s).trim().slice(0, max || 200); }

function getSettings_() {
  const map = {};
  readAll_('Settings').forEach(function (r) { map[r.key] = r.value; });
  return map;
}

function log_(userId, action, detail) {
  try {
    insert_('Logs', { timestamp: now_(), user_id: userId || '', action: action, detail: clean_(detail, 500) });
  } catch (e) { /* ไม่ให้การบันทึก log ทำให้งานหลักล้มเหลว */ }
}
