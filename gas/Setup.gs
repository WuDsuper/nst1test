/**
 * ติดตั้งระบบครั้งแรก: สร้างชีต หัวคอลัมน์ ค่าตั้งต้น ปีงบประมาณ และบัญชีผู้ดูแล
 * วิธีใช้: เลือกฟังก์ชัน setupSystem แล้วกด Run (รันซ้ำได้ ไม่ลบข้อมูลเดิม)
 */

// อีเมลผู้ดูแลระบบคนแรก (เว้นว่าง = ใช้อีเมลบัญชี Google ที่รันสคริปต์)
const SETUP_ADMIN_EMAIL = '';

const SCHEMA = {
  Users: ['user_id', 'email', 'password_hash', 'salt', 'prefix', 'first_name', 'last_name', 'position', 'organization', 'phone',
          'role', 'status', 'verify_token', 'verify_expires', 'verify_sent_at', 'reset_token', 'reset_expires', 'created_at', 'last_login'],
  Sessions: ['session_token', 'user_id', 'created_at', 'expires_at'],
  FiscalYears: ['fy_id', 'year', 'start_date', 'end_date', 'is_active'],
  Projects: ['project_id', 'fy_id', 'code', 'title', 'description', 'objectives', 'cover_url', 'owner_id', 'start_date', 'end_date',
             'reg_open', 'reg_close', 'capacity', 'enroll_mode', 'pass_criteria', 'status', 'drive_folder_id', 'created_at', 'updated_at'],
  Enrollments: ['enroll_id', 'project_id', 'user_id', 'status', 'enrolled_at', 'completed_at'],
  Activities: ['activity_id', 'project_id', 'order_no', 'type', 'title', 'description', 'content_url', 'open_at', 'close_at',
               'is_required', 'settings_json', 'status', 'created_at', 'updated_at'],
  Questions: ['question_id', 'activity_id', 'order_no', 'type', 'question_text', 'image_url', 'options_json', 'answer_json', 'score', 'explanation'],
  QuizAttempts: ['attempt_id', 'activity_id', 'user_id', 'attempt_no', 'answers_json', 'score', 'max_score', 'percent', 'passed',
                 'started_at', 'submitted_at', 'graded_status'],
  Submissions: ['submission_id', 'activity_id', 'user_id', 'file_id', 'file_url', 'link_url', 'text_answer', 'submitted_at',
                'score', 'feedback', 'grader_id', 'graded_at', 'status'],
  Progress: ['progress_id', 'activity_id', 'user_id', 'completed_at'],
  Settings: ['key', 'value'],
  Logs: ['timestamp', 'user_id', 'action', 'detail']
};

const DEFAULT_SETTINGS = {
  site_name: 'ระบบฝึกอบรมออนไลน์',
  org_name: '',
  logo_url: '',
  theme_color: '#4F46E5',
  frontend_url: '',
  drive_root_id: ''
};

/** เมนูในไฟล์ Google Sheets */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('ระบบฝึกอบรม')
    .addItem('ติดตั้ง / อัปเดตโครงสร้างชีต', 'setupSystem')
    .addItem('ตั้งรหัสผ่านผู้ดูแลระบบใหม่', 'resetAdminPassword')
    .addToUi();
}

function setupSystem() {
  const ss = getSS_();
  Object.keys(SCHEMA).forEach(function (name) { ensureSheet_(ss, name, SCHEMA[name]); });

  // ลบชีตว่างเริ่มต้น (Sheet1 / แผ่น1)
  ss.getSheets().forEach(function (sh) {
    if (!SCHEMA[sh.getName()] && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });

  // ค่าตั้งต้น
  const current = getSettings_();
  Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
    if (!(k in current)) insert_('Settings', { key: k, value: DEFAULT_SETTINGS[k] });
  });

  // ปีงบประมาณปัจจุบัน (1 ต.ค. – 30 ก.ย.)
  if (readAll_('FiscalYears').length === 0) {
    const d = new Date();
    const y = d.getFullYear() + 543 + (d.getMonth() >= 9 ? 1 : 0);
    insert_('FiscalYears', { fy_id: uuid_(), year: String(y), start_date: (y - 544) + '-10-01', end_date: (y - 543) + '-09-30', is_active: 'TRUE' });
  }

  // โฟลเดอร์ Google Drive สำหรับเก็บไฟล์ส่งงาน
  const settingsRows = readAll_('Settings');
  const driveRow = settingsRows.find(function (r) { return r.key === 'drive_root_id'; });
  if (driveRow && !driveRow.value) {
    const folder = DriveApp.createFolder((getSettings_().site_name || 'ระบบฝึกอบรม') + ' - ไฟล์ส่งงาน');
    update_('Settings', driveRow, { value: folder.getId() });
  }

  // บัญชีผู้ดูแลระบบคนแรก
  let msg = 'ติดตั้งระบบเรียบร้อยแล้ว';
  const hasAdmin = readAll_('Users').some(function (u) { return u.role === 'admin'; });
  if (!hasAdmin) {
    const info = createOrResetAdmin_();
    msg += '\n\nบัญชีผู้ดูแลระบบ\nอีเมล: ' + info.email + '\nรหัสผ่านชั่วคราว: ' + info.password +
           '\n\nกรุณาเข้าสู่ระบบแล้วเปลี่ยนรหัสผ่านทันที';
  }
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* รันจาก editor จะแสดงใน Execution log */ }
}

/** ตั้งรหัสผ่านผู้ดูแลระบบใหม่ (กรณีลืมรหัสผ่าน) */
function resetAdminPassword() {
  const info = createOrResetAdmin_();
  const msg = 'ตั้งรหัสผ่านใหม่แล้ว\nอีเมล: ' + info.email + '\nรหัสผ่านชั่วคราว: ' + info.password;
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { }
}

function createOrResetAdmin_() {
  const email = normEmail_(SETUP_ADMIN_EMAIL || Session.getEffectiveUser().getEmail());
  if (!isEmail_(email)) throw new Error('ไม่พบอีเมลผู้ดูแลระบบ กรุณากำหนด SETUP_ADMIN_EMAIL ใน Setup.gs');
  const password = randomPassword_();
  const salt = token_();
  const exist = findBy_('Users', 'email', email);
  if (exist) {
    update_('Users', exist, { role: 'admin', status: 'active', password_hash: hash_(password, salt), salt: salt, verify_token: '' });
  } else {
    insert_('Users', {
      user_id: uuid_(), email: email, password_hash: hash_(password, salt), salt: salt,
      prefix: '', first_name: 'ผู้ดูแล', last_name: 'ระบบ', position: 'ผู้ดูแลระบบ', organization: '', phone: '',
      role: 'admin', status: 'active', verify_token: '', verify_expires: '', verify_sent_at: '',
      reset_token: '', reset_expires: '', created_at: now_(), last_login: ''
    });
  }
  return { email: email, password: password };
}

function randomPassword_() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

function ensureSheet_(ss, name, cols) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastColumn() === 0) {
    sh.getRange(1, 1, 1, cols.length).setValues([cols]);
  } else {
    const existing = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
    const missing = cols.filter(function (c) { return existing.indexOf(c) < 0; });
    if (missing.length) sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  const lastCol = sh.getLastColumn();
  sh.getRange(1, 1, sh.getMaxRows(), lastCol).setNumberFormat('@');
  sh.getRange(1, 1, 1, lastCol).setFontWeight('bold').setBackground('#4F46E5').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  SHEET_CACHE_[name] = sh;
}
