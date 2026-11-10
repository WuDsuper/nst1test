# ระบบฝึกอบรมออนไลน์ (ระยะที่ 1: ระบบพื้นฐาน)

หน้าเว็บ HTML + Bootstrap 5 (GitHub Pages) เชื่อมกับ Google Sheets ผ่าน Google Apps Script
ดูโครงสร้างทั้งหมดได้ที่ [STRUCTURE.md](STRUCTURE.md)

## สิ่งที่มีในระยะที่ 1
- สมัครสมาชิก + ยืนยันตัวตนด้วยอีเมล, เข้าสู่ระบบ, ลืมรหัสผ่าน / ตั้งรหัสผ่านใหม่
- 3 บทบาท: ผู้ดูแลระบบ / ผู้สร้างหลักสูตร / ผู้ใช้ทั่วไป (เมนูและสิทธิ์แยกตามบทบาท)
- ผู้ดูแล: แดชบอร์ด (กราฟ), จัดการผู้ใช้ (กำหนดบทบาท ระงับ เปิดใช้งาน), ปีงบประมาณ, ตั้งค่าระบบ (ชื่อ โลโก้ สี), บันทึกการใช้งาน
- ข้อมูลส่วนตัว / เปลี่ยนรหัสผ่าน
- รองรับมือถือ แท็บเล็ต คอมพิวเตอร์ และโหมดมืด

---

## ทดลองใช้ทันที (โหมดทดลอง)

ถ้า `assets/js/config.js` ยังไม่ได้ใส่ `API_URL` ระบบจะทำงานใน **โหมดทดลอง**: ข้อมูลจำลองเก็บในเบราว์เซอร์ ไม่มีการส่งอีเมลจริง (จะแสดงลิงก์ยืนยันบนหน้าจอแทน)

เปิด `index.html` ในเบราว์เซอร์ หรือรันเซิร์ฟเวอร์ในเครื่อง:

```bash
cd "/Users/wit/Downloads/รวมระบบ" && python3 -m http.server 8080
```

แล้วเปิด http://localhost:8080

| บทบาท | อีเมล | รหัสผ่าน |
|---|---|---|
| ผู้ดูแลระบบ | admin@demo.local | admin1234 |
| ผู้สร้างหลักสูตร | creator@demo.local | creator1234 |
| ผู้ใช้ทั่วไป | user@demo.local | user1234 |

ล้างข้อมูลทดลอง: เปิด Console ของเบราว์เซอร์แล้วพิมพ์ `Mock.reset()`

---

## ติดตั้งใช้งานจริง

### ขั้นที่ 1: สร้าง Google Sheets + Apps Script
1. สร้าง Google Sheets ใหม่ ตั้งชื่อ เช่น `ฐานข้อมูลระบบฝึกอบรม`
2. เมนู **ส่วนขยาย → Apps Script**
3. สร้างไฟล์ให้ตรงกับโฟลเดอร์ `gas/` แล้วคัดลอกโค้ดไปวาง: `Code.gs`, `Db.gs`, `Auth.gs`, `Admin.gs`, `Mail.gs`, `Setup.gs`
4. (ไม่บังคับ) หากต้องการกำหนดอีเมลผู้ดูแลคนแรกเอง ให้แก้ `SETUP_ADMIN_EMAIL` ใน `Setup.gs`
5. เลือกฟังก์ชัน `setupSystem` แล้วกด **Run** → อนุญาตสิทธิ์ (Sheets, Drive, Gmail)
6. เปิด **Execution log** จะเห็น **อีเมลและรหัสผ่านชั่วคราวของผู้ดูแลระบบ** ให้จดไว้

### ขั้นที่ 2: Deploy เป็น Web App
1. **Deploy → New deployment → เลือกประเภท Web app**
2. Execute as: **Me** / Who has access: **Anyone**
3. คัดลอก URL ที่ลงท้ายด้วย `/exec`
4. ใส่ URL ใน `assets/js/config.js`:
   ```js
   API_URL: 'https://script.google.com/macros/s/xxxxxxxx/exec',
   ```
> ทุกครั้งที่แก้โค้ด Apps Script ต้อง **Deploy → Manage deployments → แก้ไข (✏️) → Version: New version** เพื่อให้ URL เดิมใช้โค้ดใหม่

### ขั้นที่ 3: อัปโหลดขึ้น GitHub Pages
1. สร้าง repository ใหม่บน GitHub แล้วอัปโหลดไฟล์ทั้งหมด (ยกเว้นโฟลเดอร์ `gas/` จะอัปหรือไม่ก็ได้)
2. **Settings → Pages → Source: Deploy from a branch → main / (root)**
3. รอสักครู่จะได้ URL เช่น `https://username.github.io/training`

### ขั้นที่ 4: ตั้งค่าในระบบ
1. เข้าสู่ระบบด้วยบัญชีผู้ดูแล → **ข้อมูลส่วนตัว** → เปลี่ยนรหัสผ่านทันที
2. **ตั้งค่าระบบ** → ใส่ **URL หน้าเว็บ** (กดปุ่ม “ใช้ URL ปัจจุบัน”) → บันทึก
   (ต้องตั้งค่านี้ก่อน ผู้ใช้จึงจะสมัครสมาชิกได้ เพราะใช้สร้างลิงก์ในอีเมลยืนยัน)
3. กด **ส่งอีเมลทดสอบ** เพื่อตรวจว่าส่งอีเมลได้
4. ตั้งชื่อระบบ หน่วยงาน โลโก้ และสีหลักตามต้องการ

---

## หมายเหตุ
- **โควตาอีเมล:** Gmail ทั่วไปส่งได้ประมาณ 100 ฉบับ/วัน, Google Workspace ประมาณ 1,500 ฉบับ/วัน (ดูคงเหลือได้ที่แดชบอร์ดผู้ดูแล)
- **ลืมรหัสผ่านผู้ดูแล:** ในไฟล์ Google Sheets เมนู **ระบบฝึกอบรม → ตั้งรหัสผ่านผู้ดูแลระบบใหม่**
- รหัสผ่านเก็บแบบเข้ารหัส (SHA-256 + salt) ไม่มีใครเห็นรหัสผ่านจริงในชีต
- อย่าแก้ไขหัวคอลัมน์ในชีตด้วยมือ หากต้องการเพิ่มคอลัมน์ให้แก้ `SCHEMA` ใน `Setup.gs` แล้วรัน `setupSystem` อีกครั้ง

## โครงสร้างไฟล์ (ระยะที่ 1)
```
index.html, login.html, register.html, verify.html, forgot-password.html, reset-password.html
admin/    dashboard, users, fiscal-years, settings, logs
creator/  dashboard
user/     dashboard, profile
assets/css/style.css
assets/js/ config.js, theme.js, utils.js, api.js, auth.js, layout.js, mock.js
gas/      Code.gs, Db.gs, Auth.gs, Admin.gs, Mail.gs, Setup.gs, appsscript.json
```
