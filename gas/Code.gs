/**
 * ระบบบริหารการฝึกอบรม — Google Apps Script API
 * --------------------------------------------------
 * วิธี Deploy: Deploy > New deployment > Web app
 *   Execute as:      Me
 *   Who has access:  Anyone
 * แล้วนำ URL ที่ได้ไปใส่ใน assets/js/config.js (API_URL)
 *
 * รูปแบบคำขอ (POST, Content-Type: text/plain):
 *   { "action": "login", "token": "...", "data": { ... } }
 * รูปแบบคำตอบ:
 *   { "ok": true, "data": ... }  หรือ  { "ok": false, "error": "...", "code": "..." }
 */

function doGet() {
  return json_({ ok: true, data: { app: 'Training Management API', version: '1.0.0', time: now_() } });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'รูปแบบคำขอไม่ถูกต้อง' });
  }

  const route = routes_()[req.action];
  if (!route) return json_({ ok: false, error: 'ไม่พบคำสั่ง: ' + req.action });

  const ctx = { token: String(req.token || ''), data: req.data || {} };
  let lock = null;
  try {
    if (route.write) {
      lock = LockService.getScriptLock();
      lock.waitLock(20000);
    }
    const data = route.fn(ctx);
    return json_({ ok: true, data: data === undefined ? null : data });
  } catch (err) {
    return json_({ ok: false, error: err.message || String(err), code: err.code || '' });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

/** ตารางคำสั่ง: write = true จะล็อกระหว่างเขียนข้อมูล ป้องกันข้อมูลชนกัน */
function routes_() {
  const R = function (fn, write) { return { fn: fn, write: !!write }; };
  return {
    // Auth
    'register':        R(register_, true),
    'verifyEmail':     R(verifyEmail_, true),
    'resendVerify':    R(resendVerify_, true),
    'login':           R(login_, true),
    'logout':          R(logout_, true),
    'me':              R(me_),
    'forgotPassword':  R(forgotPassword_, true),
    'resetPassword':   R(resetPassword_, true),
    'changePassword':  R(changePassword_, true),
    'updateProfile':   R(updateProfile_, true),

    // ปีงบประมาณ
    'fy.list':         R(fyList_),
    'fy.save':         R(fySave_, true),
    'fy.delete':       R(fyDelete_, true),

    // ผู้ใช้
    'user.list':       R(userList_),
    'user.setRole':    R(userSetRole_, true),
    'user.setStatus':  R(userSetStatus_, true),

    // ตั้งค่า / ระบบ
    'settings.get':      R(settingsGet_),
    'settings.save':     R(settingsSave_, true),
    'settings.testMail': R(settingsTestMail_),
    'dash.admin':        R(dashAdmin_),
    'logs.list':         R(logsList_)
  };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** โยนข้อผิดพลาดพร้อมรหัส (เช่น AUTH, FORBIDDEN, NOT_VERIFIED, EXPIRED) */
function fail_(message, code) {
  const e = new Error(message);
  e.code = code || '';
  throw e;
}
