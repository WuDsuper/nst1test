/**
 * ส่งอีเมล (ยืนยันการสมัคร / รีเซ็ตรหัสผ่าน) พร้อมแม่แบบ HTML
 */

function siteName_() {
  return getSettings_().site_name || 'ระบบฝึกอบรมออนไลน์';
}

function frontendUrl_() {
  const u = String(getSettings_().frontend_url || '').replace(/\/+$/, '');
  if (!u) fail_('ผู้ดูแลระบบยังไม่ได้ตั้งค่า "URL หน้าเว็บ" จึงยังส่งอีเมลยืนยันไม่ได้ กรุณาแจ้งผู้ดูแลระบบ');
  return u;
}

function sendMail_(to, subject, html) {
  if (MailApp.getRemainingDailyQuota() < 1) fail_('ระบบส่งอีเมลครบโควตาประจำวันแล้ว กรุณาลองใหม่ในวันพรุ่งนี้');
  MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, name: siteName_() });
}

function sendVerifyMail_(u) {
  const link = frontendUrl_() + '/verify.html?token=' + encodeURIComponent(u.verify_token);
  sendMail_(u.email, 'ยืนยันอีเมลสมัครสมาชิก - ' + siteName_(), mailLayout_(
    'ยืนยันอีเมลของคุณ',
    '<p>สวัสดีคุณ ' + esc_(u.first_name) + ' ' + esc_(u.last_name) + '</p>' +
    '<p>ขอบคุณที่สมัครสมาชิก <b>' + esc_(siteName_()) + '</b><br>กรุณากดปุ่มด้านล่างเพื่อยืนยันอีเมลและเปิดใช้งานบัญชีของคุณ</p>',
    'ยืนยันอีเมล', link,
    'ลิงก์นี้ใช้ได้ภายใน ' + VERIFY_HOURS + ' ชั่วโมง หากคุณไม่ได้สมัครสมาชิก สามารถละเว้นอีเมลฉบับนี้ได้'
  ));
}

function sendResetMail_(u) {
  const link = frontendUrl_() + '/reset-password.html?token=' + encodeURIComponent(u.reset_token);
  sendMail_(u.email, 'ตั้งรหัสผ่านใหม่ - ' + siteName_(), mailLayout_(
    'ตั้งรหัสผ่านใหม่',
    '<p>สวัสดีคุณ ' + esc_(u.first_name) + ' ' + esc_(u.last_name) + '</p>' +
    '<p>เราได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่</p>',
    'ตั้งรหัสผ่านใหม่', link,
    'ลิงก์นี้ใช้ได้ภายใน ' + RESET_HOURS + ' ชั่วโมง หากคุณไม่ได้ส่งคำขอนี้ สามารถละเว้นอีเมลฉบับนี้ได้ รหัสผ่านเดิมยังใช้งานได้ตามปกติ'
  ));
}

function mailLayout_(title, bodyHtml, btnText, btnUrl, note) {
  const s = getSettings_();
  const color = /^#[0-9a-fA-F]{6}$/.test(s.theme_color || '') ? s.theme_color : '#4F46E5';
  const btn = btnText ? (
    '<p style="text-align:center;margin:32px 0">' +
    '<a href="' + esc_(btnUrl) + '" style="background:' + color + ';background-image:linear-gradient(135deg,' + color + ',#7C3AED);' +
    'color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:bold;display:inline-block">' + esc_(btnText) + '</a></p>' +
    '<p style="font-size:13px;color:#6B7280">หากกดปุ่มไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์<br>' +
    '<a href="' + esc_(btnUrl) + '" style="color:' + color + ';word-break:break-all">' + esc_(btnUrl) + '</a></p>'
  ) : '';
  return '' +
    '<div style="background:#F4F6FB;padding:32px 12px;font-family:Tahoma,Arial,sans-serif">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(16,24,40,.08)">' +
    '<div style="background:' + color + ';background-image:linear-gradient(135deg,' + color + ',#7C3AED);padding:28px 32px;color:#fff">' +
    '<div style="font-size:14px;opacity:.85">' + esc_(siteName_()) + '</div>' +
    '<div style="font-size:22px;font-weight:bold;margin-top:6px">' + esc_(title) + '</div></div>' +
    '<div style="padding:28px 32px;color:#111827;font-size:15px;line-height:1.7">' + bodyHtml + btn +
    (note ? '<p style="font-size:13px;color:#6B7280;border-top:1px solid #E5E7EB;padding-top:16px;margin-top:24px">' + esc_(note) + '</p>' : '') +
    '</div></div>' +
    '<p style="text-align:center;font-size:12px;color:#9CA3AF;margin-top:16px">' + esc_(s.org_name || '') + '</p>' +
    '</div>';
}

function esc_(s) {
  return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
