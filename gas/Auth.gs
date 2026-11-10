/**
 * สมัครสมาชิก ยืนยันอีเมล เข้าสู่ระบบ และจัดการรหัสผ่าน
 */

const SESSION_HOURS = 24 * 7;     // อายุการเข้าสู่ระบบ 7 วัน
const VERIFY_HOURS = 24;          // ลิงก์ยืนยันอีเมลใช้ได้ 24 ชม.
const RESET_HOURS = 1;            // ลิงก์รีเซ็ตรหัสผ่านใช้ได้ 1 ชม.
const RESEND_COOLDOWN_SEC = 120;  // ส่งอีเมลซ้ำได้ทุก 2 นาที
const ROLES = ['admin', 'creator', 'user'];
const PROFILE_FIELDS = ['prefix', 'first_name', 'last_name', 'position', 'organization', 'phone'];

function normEmail_(e) { return String(e || '').trim().toLowerCase(); }
function isEmail_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function token_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }

function hash_(password, salt) {
  let v = salt + '|' + password;
  for (let i = 0; i < 100; i++) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, v + salt, Utilities.Charset.UTF_8);
    v = bytes.map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
  }
  return v;
}

function publicUser_(u) {
  return {
    user_id: u.user_id, email: u.email, prefix: u.prefix, first_name: u.first_name, last_name: u.last_name,
    position: u.position, organization: u.organization, phone: u.phone,
    role: u.role, status: u.status, created_at: u.created_at, last_login: u.last_login
  };
}

function validatePassword_(pw) {
  if (String(pw || '').length < 8) fail_('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
}

/** ตรวจ token และสิทธิ์ คืนค่าข้อมูลผู้ใช้ (ใช้ในทุกคำสั่งที่ต้อง login) */
function requireUser_(ctx, roles) {
  if (!ctx.token) fail_('กรุณาเข้าสู่ระบบ', 'AUTH');
  const s = findBy_('Sessions', 'session_token', ctx.token);
  if (!s || new Date(s.expires_at) < new Date()) fail_('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'AUTH');
  const u = findBy_('Users', 'user_id', s.user_id);
  if (!u || u.status !== 'active') fail_('บัญชีนี้ไม่สามารถใช้งานได้', 'AUTH');
  if (roles && roles.indexOf(u.role) < 0) fail_('คุณไม่มีสิทธิ์ใช้งานส่วนนี้', 'FORBIDDEN');
  return u;
}

function register_(ctx) {
  const d = ctx.data;
  const email = normEmail_(d.email);
  if (!isEmail_(email)) fail_('รูปแบบอีเมลไม่ถูกต้อง');
  validatePassword_(d.password);
  const first = clean_(d.first_name), last = clean_(d.last_name);
  if (!first || !last) fail_('กรุณากรอกชื่อและนามสกุล');

  const exist = findBy_('Users', 'email', email);
  if (exist) {
    if (exist.status === 'pending') {
      fail_('อีเมลนี้สมัครไว้แล้วแต่ยังไม่ได้ยืนยัน กรุณาตรวจสอบกล่องอีเมล หรือขอส่งอีเมลยืนยันอีกครั้ง', 'NOT_VERIFIED');
    }
    fail_('อีเมลนี้ถูกใช้สมัครสมาชิกแล้ว');
  }

  const salt = token_();
  const t = now_();
  const user = {
    user_id: uuid_(), email: email, password_hash: hash_(d.password, salt), salt: salt,
    prefix: clean_(d.prefix), first_name: first, last_name: last,
    position: clean_(d.position), organization: clean_(d.organization), phone: clean_(d.phone, 30),
    role: 'user', status: 'pending',
    verify_token: token_(), verify_expires: addHours_(VERIFY_HOURS), verify_sent_at: t,
    reset_token: '', reset_expires: '', created_at: t, last_login: ''
  };
  sendVerifyMail_(user);          // ส่งอีเมลก่อน ถ้าส่งไม่ได้จะไม่สร้างบัญชี
  insert_('Users', user);
  log_(user.user_id, 'register', email);
  return { email: email };
}

function verifyEmail_(ctx) {
  const token = clean_(ctx.data.token);
  const u = token ? findBy_('Users', 'verify_token', token) : null;
  if (!u) fail_('ลิงก์ยืนยันไม่ถูกต้อง หรือถูกใช้งานไปแล้ว');
  if (new Date(u.verify_expires) < new Date()) fail_('ลิงก์ยืนยันหมดอายุแล้ว กรุณาขอส่งอีเมลยืนยันใหม่', 'EXPIRED');
  update_('Users', u, { status: 'active', verify_token: '', verify_expires: '' });
  log_(u.user_id, 'verify', u.email);
  return { email: u.email };
}

function resendVerify_(ctx) {
  const email = normEmail_(ctx.data.email);
  const u = findBy_('Users', 'email', email);
  if (!u) fail_('ไม่พบอีเมลนี้ในระบบ');
  if (u.status !== 'pending') fail_('บัญชีนี้ยืนยันอีเมลแล้ว สามารถเข้าสู่ระบบได้ทันที');
  if (u.verify_sent_at) {
    const wait = RESEND_COOLDOWN_SEC - Math.floor((Date.now() - new Date(u.verify_sent_at).getTime()) / 1000);
    if (wait > 0) fail_('กรุณารออีก ' + wait + ' วินาที แล้วลองใหม่');
  }
  const patch = { verify_token: token_(), verify_expires: addHours_(VERIFY_HOURS), verify_sent_at: now_() };
  sendVerifyMail_(Object.assign({}, u, patch));
  update_('Users', u, patch);
  return { email: email };
}

function login_(ctx) {
  const email = normEmail_(ctx.data.email);
  const u = findBy_('Users', 'email', email);
  if (!u || hash_(String(ctx.data.password || ''), u.salt) !== u.password_hash) {
    fail_('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }
  if (u.status === 'pending') fail_('กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ', 'NOT_VERIFIED');
  if (u.status !== 'active') fail_('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');

  // ล้างเซสชันที่หมดอายุของผู้ใช้นี้
  const nowD = new Date();
  removeWhere_('Sessions', function (s) { return s.user_id === u.user_id && new Date(s.expires_at) < nowD; });

  const token = token_();
  insert_('Sessions', { session_token: token, user_id: u.user_id, created_at: now_(), expires_at: addHours_(SESSION_HOURS) });
  const updated = update_('Users', u, { last_login: now_() });
  log_(u.user_id, 'login', email);
  return { token: token, user: publicUser_(updated) };
}

function logout_(ctx) {
  if (ctx.token) {
    const s = findBy_('Sessions', 'session_token', ctx.token);
    removeWhere_('Sessions', function (r) { return r.session_token === ctx.token; });
    if (s) log_(s.user_id, 'logout', '');
  }
  return true;
}

function me_(ctx) {
  return publicUser_(requireUser_(ctx));
}

function forgotPassword_(ctx) {
  const email = normEmail_(ctx.data.email);
  const u = findBy_('Users', 'email', email);
  // ตอบเหมือนกันทุกกรณี เพื่อไม่เปิดเผยว่ามีอีเมลนี้ในระบบหรือไม่
  if (u && u.status === 'active') {
    if (u.reset_expires) {
      const sentAt = new Date(u.reset_expires).getTime() - RESET_HOURS * 3600 * 1000;
      if (Date.now() - sentAt < RESEND_COOLDOWN_SEC * 1000) return { sent: true };
    }
    const patch = { reset_token: token_(), reset_expires: addHours_(RESET_HOURS) };
    sendResetMail_(Object.assign({}, u, patch));
    update_('Users', u, patch);
    log_(u.user_id, 'forgot_password', email);
  }
  return { sent: true };
}

function resetPassword_(ctx) {
  const token = clean_(ctx.data.token);
  validatePassword_(ctx.data.password);
  const u = token ? findBy_('Users', 'reset_token', token) : null;
  if (!u) fail_('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง หรือถูกใช้งานไปแล้ว');
  if (new Date(u.reset_expires) < new Date()) fail_('ลิงก์หมดอายุแล้ว กรุณาขอรีเซ็ตรหัสผ่านใหม่', 'EXPIRED');
  const salt = token_();
  update_('Users', u, { password_hash: hash_(ctx.data.password, salt), salt: salt, reset_token: '', reset_expires: '' });
  removeWhere_('Sessions', function (s) { return s.user_id === u.user_id; });
  log_(u.user_id, 'reset_password', u.email);
  return true;
}

function changePassword_(ctx) {
  const u = requireUser_(ctx);
  if (hash_(String(ctx.data.old_password || ''), u.salt) !== u.password_hash) fail_('รหัสผ่านเดิมไม่ถูกต้อง');
  validatePassword_(ctx.data.new_password);
  const salt = token_();
  update_('Users', u, { password_hash: hash_(ctx.data.new_password, salt), salt: salt });
  // ออกจากระบบในอุปกรณ์อื่น ยกเว้นเครื่องปัจจุบัน
  removeWhere_('Sessions', function (s) { return s.user_id === u.user_id && s.session_token !== ctx.token; });
  log_(u.user_id, 'change_password', '');
  return true;
}

function updateProfile_(ctx) {
  const u = requireUser_(ctx);
  const patch = {};
  PROFILE_FIELDS.forEach(function (k) {
    if (ctx.data[k] !== undefined) patch[k] = clean_(ctx.data[k], k === 'phone' ? 30 : 200);
  });
  if (patch.first_name === '' || patch.last_name === '') fail_('กรุณากรอกชื่อและนามสกุล');
  const updated = update_('Users', u, patch);
  log_(u.user_id, 'update_profile', '');
  return publicUser_(updated);
}
