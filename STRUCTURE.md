# ระบบบริหารการฝึกอบรม (Training Management System)
ร่างโครงสร้างระบบ ฉบับที่ 1 (10 พ.ย. 2569)

---

## 1. สถาปัตยกรรมระบบ

```
┌──────────────────────────────┐        HTTPS (fetch, JSON)        ┌──────────────────────────────┐
│  Frontend (GitHub Pages)     │  ───────────────────────────────▶ │  Backend: Google Apps Script │
│  HTML + CSS + Bootstrap 5    │  ◀─────────────────────────────── │  (Web App = REST-like API)   │
│  JavaScript (vanilla)        │                                   │                              │
│  Chart.js (แดชบอร์ด)          │                                   │  ├─ Google Sheets (ฐานข้อมูล)  │
│  SweetAlert2 (แจ้งเตือน)       │                                   │  ├─ Google Drive (ไฟล์ส่งงาน)   │
└──────────────────────────────┘                                   │  └─ MailApp (ส่งอีเมลยืนยัน)    │
                                                                   └──────────────────────────────┘
```

| ส่วน | เทคโนโลยี | ค่าใช้จ่าย |
|---|---|---|
| หน้าเว็บ | HTML, CSS, Bootstrap 5.3, Bootstrap Icons, JavaScript | ฟรี (GitHub Pages) |
| API | Google Apps Script (Web App) | ฟรี |
| ฐานข้อมูล | Google Sheets (1 ไฟล์ แยกชีตตามตาราง) | ฟรี |
| เก็บไฟล์ส่งงาน | Google Drive (โฟลเดอร์แยกตามโครงการ) | ฟรี (ตามพื้นที่ Drive) |
| อีเมลยืนยัน | MailApp / GmailApp | ฟรี (บัญชีทั่วไปส่งได้ประมาณ 100 ฉบับ/วัน, Workspace ประมาณ 1,500 ฉบับ/วัน) |

> **หมายเหตุ:** ระบบไม่ใช้ PHP เพราะ GitHub Pages รันได้เฉพาะไฟล์ static งานฝั่งเซิร์ฟเวอร์ทั้งหมดอยู่ใน Apps Script

---

## 2. บทบาทผู้ใช้และสิทธิ์ (Roles)

| ความสามารถ | ผู้ดูแลระบบ<br>`admin` | ผู้สร้างหลักสูตร<br>`creator` | ผู้ใช้ทั่วไป<br>`user` |
|---|:---:|:---:|:---:|
| จัดการปีงบประมาณ | ✅ | ❌ | ❌ |
| จัดการผู้ใช้ / กำหนดบทบาท | ✅ | ❌ | ❌ |
| สร้าง/แก้ไขโครงการ | ✅ ทุกโครงการ | ✅ เฉพาะของตน | ❌ |
| สร้างกิจกรรม แบบทดสอบ แบบส่งงาน | ✅ | ✅ เฉพาะโครงการของตน | ❌ |
| อนุมัติผู้สมัครเข้าโครงการ | ✅ | ✅ | ❌ |
| ตรวจงาน / ให้คะแนน | ✅ | ✅ | ❌ |
| แดชบอร์ด | ภาพรวมทั้งระบบ | เฉพาะโครงการของตน | ความก้าวหน้าของตนเอง |
| ลงทะเบียน เลือกเข้าร่วมโครงการ | – | – | ✅ |
| ทำแบบทดสอบ / ส่งงาน | – | – | ✅ |
| ดาวน์โหลดเกียรติบัตร (ระยะ 2) | – | – | ✅ |

- ผู้สมัครใหม่ทุกคนได้บทบาท `user` โดยอัตโนมัติ
- admin เป็นผู้เลื่อนบทบาทเป็น `creator`

---

## 3. ลำดับชั้นข้อมูล

```
ปีงบประมาณ (FiscalYear)  เช่น 2569 = 1 ต.ค. 68 – 30 ก.ย. 69
 └─ โครงการ (Project)
     ├─ ผู้เข้าร่วม (Enrollment)
     └─ กิจกรรม (Activity)  ← เรียงลำดับได้ กำหนดวันเปิด-ปิดได้
         ├─ ประเภท: quiz        → แบบทดสอบ (Questions)  → ผลสอบ (QuizAttempts)
         ├─ ประเภท: assignment  → แบบส่งงาน               → งานที่ส่ง (Submissions)
         └─ ประเภท: content     → เนื้อหา / วิดีโอ / ลิงก์    → บันทึกว่าเรียนแล้ว (Progress)
```

---

## 4. โครงสร้างฐานข้อมูล (Google Sheets)

ใช้ไฟล์ Google Sheets 1 ไฟล์ แต่ละชีตคือ 1 ตาราง แถวแรกเป็นหัวคอลัมน์ รหัส (id) ใช้ UUID

### 4.1 `Users` ผู้ใช้
| คอลัมน์ | คำอธิบาย |
|---|---|
| user_id | รหัสผู้ใช้ |
| email | อีเมล (ห้ามซ้ำ) |
| password_hash | รหัสผ่านที่เข้ารหัส SHA-256 + salt |
| salt | ค่าสุ่มสำหรับเข้ารหัส |
| prefix, first_name, last_name | คำนำหน้า ชื่อ นามสกุล |
| position, organization | ตำแหน่ง หน่วยงาน/โรงเรียน |
| phone | เบอร์โทร |
| role | `admin` / `creator` / `user` |
| status | `pending` (รอยืนยันอีเมล) / `active` / `suspended` |
| verify_token, verify_expires | โทเค็นยืนยันอีเมล และวันหมดอายุ (24 ชม.) |
| reset_token, reset_expires | โทเค็นรีเซ็ตรหัสผ่าน |
| created_at, last_login | วันที่สมัคร วันที่เข้าใช้ล่าสุด |

### 4.2 `Sessions` การเข้าสู่ระบบ
| session_token | user_id | created_at | expires_at |
|---|---|---|---|

### 4.3 `FiscalYears` ปีงบประมาณ
| fy_id | year (เช่น 2569) | start_date | end_date | is_active |
|---|---|---|---|---|

### 4.4 `Projects` โครงการ
| คอลัมน์ | คำอธิบาย |
|---|---|
| project_id, fy_id | รหัสโครงการ ปีงบประมาณ |
| code, title | รหัสโครงการ ชื่อโครงการ |
| description, objectives | รายละเอียด วัตถุประสงค์ |
| cover_url | ภาพปก |
| owner_id | ผู้สร้าง (creator) |
| start_date, end_date | ช่วงเวลาอบรม |
| reg_open, reg_close | ช่วงเปิดรับสมัคร |
| capacity | จำนวนรับ (เว้นว่าง = ไม่จำกัด) |
| enroll_mode | `auto` (เข้าได้ทันที) / `approval` (ต้องอนุมัติ) |
| pass_criteria | เกณฑ์ผ่าน เช่น ทำกิจกรรมครบ 80% |
| status | `draft` / `published` / `closed` |
| drive_folder_id | โฟลเดอร์เก็บไฟล์ส่งงานของโครงการ |
| created_at, updated_at | |

### 4.5 `Enrollments` การลงทะเบียนเข้าโครงการ
| enroll_id | project_id | user_id | status (`pending`/`approved`/`rejected`/`completed`) | enrolled_at | completed_at |
|---|---|---|---|---|---|

### 4.6 `Activities` กิจกรรม
| คอลัมน์ | คำอธิบาย |
|---|---|
| activity_id, project_id | |
| order_no | ลำดับกิจกรรม |
| type | `quiz` / `assignment` / `content` |
| title, description | |
| content_url | ลิงก์วิดีโอ/เอกสาร (กรณี content) |
| open_at, close_at | วันเวลาเปิด-ปิด |
| is_required | ต้องทำจึงจะผ่านโครงการ |
| settings_json | ค่าตั้งเพิ่มเติมตามประเภท (ดูด้านล่าง) |
| status | `draft` / `published` |

**settings_json แยกตามประเภท**
- quiz: `{ "time_limit_min": 30, "max_attempts": 2, "pass_score_pct": 60, "shuffle_questions": true, "show_answer": "after_close", "quiz_kind": "pre|post|general" }`
- assignment: `{ "submit_types": ["file","link","text"], "allowed_ext": ["pdf","docx","jpg"], "max_size_mb": 10, "max_score": 10, "allow_resubmit": true }`

### 4.7 `Questions` ข้อสอบ
| คอลัมน์ | คำอธิบาย |
|---|---|
| question_id, activity_id, order_no | |
| type | `single` (ตัวเลือกเดียว) / `multiple` (หลายคำตอบ) / `truefalse` / `short` (เติมคำ) / `essay` (อัตนัย ตรวจเอง) |
| question_text, image_url | โจทย์ รูปประกอบ |
| options_json | `["ก","ข","ค","ง"]` |
| answer_json | คำตอบที่ถูก เช่น `[1]` |
| score | คะแนนของข้อนี้ |
| explanation | เฉลย/คำอธิบาย |

### 4.8 `QuizAttempts` ผลการทำแบบทดสอบ
| attempt_id | activity_id | user_id | attempt_no | answers_json | score | max_score | percent | passed | started_at | submitted_at | graded_status (`auto`/`waiting`/`done`) |
|---|---|---|---|---|---|---|---|---|---|---|---|

### 4.9 `Submissions` งานที่ส่ง
| submission_id | activity_id | user_id | file_id / file_url | link_url | text_answer | submitted_at | score | feedback | grader_id | graded_at | status (`submitted`/`graded`/`revise`) |
|---|---|---|---|---|---|---|---|---|---|---|---|

### 4.10 `Progress` ความก้าวหน้ากิจกรรมเนื้อหา
| progress_id | activity_id | user_id | completed_at |
|---|---|---|---|

### 4.11 `Settings` ค่าตั้งระบบ
| key | value |
|---|---|
| site_name | ชื่อระบบ |
| org_name | ชื่อหน่วยงาน |
| logo_url | โลโก้ |
| theme_color | สีหลัก |
| frontend_url | URL หน้าเว็บ (ใช้สร้างลิงก์ยืนยันอีเมล) |

### 4.12 `Logs` บันทึกการใช้งาน
| timestamp | user_id | action | detail |
|---|---|---|---|

---

## 5. ขั้นตอนลงทะเบียนและยืนยันอีเมล

```
1. ผู้ใช้กรอกฟอร์มสมัคร (register.html)
2. API ตรวจอีเมลซ้ำ → บันทึก Users (status = pending) + สร้าง verify_token
3. MailApp ส่งอีเมล HTML พร้อมปุ่ม "ยืนยันอีเมล"
     → ลิงก์: https://<github-pages>/verify.html?token=xxxx
4. หน้า verify.html เรียก API action=verifyEmail
5. ตรวจ token และวันหมดอายุ → status = active
6. ผู้ใช้เข้าสู่ระบบได้ (ถ้ายังไม่ยืนยัน → แจ้งให้ยืนยัน พร้อมปุ่ม "ส่งอีเมลอีกครั้ง")
```
- ลืมรหัสผ่านใช้กลไกเดียวกัน (reset_token, หมดอายุ 1 ชม.)
- รหัสผ่านไม่เก็บเป็นข้อความตรง ใช้ hash + salt
- จำกัดการส่งอีเมลซ้ำ เช่น ห่างกันอย่างน้อย 2 นาที

---

## 6. โครงสร้างไฟล์โปรเจกต์

```
รวมระบบ/
├── index.html                 หน้าแรก: แนะนำระบบ + รายการโครงการที่เปิดรับ (เลือกปีงบประมาณได้)
├── login.html                 เข้าสู่ระบบ
├── register.html              สมัครสมาชิก
├── verify.html                ยืนยันอีเมล
├── forgot-password.html       ขอรีเซ็ตรหัสผ่าน
├── reset-password.html        ตั้งรหัสผ่านใหม่
│
├── user/                      ผู้ใช้ทั่วไป
│   ├── dashboard.html         โครงการของฉัน + ความก้าวหน้า (%)
│   ├── projects.html          ค้นหา/สมัครเข้าร่วมโครงการ
│   ├── project.html           รายละเอียดโครงการ + รายการกิจกรรม (timeline)
│   ├── quiz.html              ทำแบบทดสอบ (จับเวลา)
│   ├── assignment.html        ส่งงาน (อัปโหลดไฟล์/ลิงก์/ข้อความ)
│   └── profile.html           ข้อมูลส่วนตัว / เปลี่ยนรหัสผ่าน
│
├── creator/                   ผู้สร้างหลักสูตร
│   ├── dashboard.html         สรุปโครงการของตน (กราฟ)
│   ├── projects.html          รายการโครงการ เพิ่ม/แก้ไข/ลบ
│   ├── project-edit.html      ฟอร์มโครงการ
│   ├── activities.html        จัดการกิจกรรมในโครงการ (ลากเรียงลำดับ)
│   ├── quiz-builder.html      สร้าง/แก้ไขแบบทดสอบ (เพิ่มข้อ/ตัวเลือก/คะแนน)
│   ├── assignment-edit.html   ตั้งค่าแบบส่งงาน
│   ├── participants.html      ผู้เข้าร่วม อนุมัติ/ปฏิเสธ
│   ├── grading.html           ตรวจงาน ให้คะแนน ให้ความเห็น
│   └── reports.html           รายงานผลรายคน/รายกิจกรรม + ส่งออก Excel
│
├── admin/                     ผู้ดูแลระบบ
│   ├── dashboard.html         ภาพรวมทั้งระบบ
│   ├── users.html             จัดการผู้ใช้ กำหนดบทบาท ระงับบัญชี
│   ├── fiscal-years.html      จัดการปีงบประมาณ
│   ├── projects.html          ทุกโครงการ (เข้าแก้ไขได้ทุกโครงการ)
│   ├── settings.html          ตั้งค่าระบบ ชื่อ โลโก้ สี
│   └── logs.html              บันทึกการใช้งาน
│
├── assets/
│   ├── css/
│   │   └── style.css          ธีมหลัก (ตัวแปรสี, gradient, การ์ด, dark mode)
│   ├── js/
│   │   ├── config.js          URL ของ Apps Script API
│   │   ├── api.js             ฟังก์ชันเรียก API กลาง (แนบ token, จัดการ error)
│   │   ├── auth.js            login/logout, ตรวจสิทธิ์ตามบทบาท, redirect
│   │   ├── layout.js          สร้าง navbar/sidebar ตามบทบาท
│   │   ├── utils.js           จัดรูปแบบวันที่ไทย, loading, alert
│   │   ├── theme.js           โหมดมืด/สีหลัก (โหลดใน head)
│   │   └── mock.js            โหมดทดลอง (จำลอง API เมื่อยังไม่ใส่ API_URL)
│   │   (สคริปต์เฉพาะหน้าเขียนไว้ท้ายไฟล์ HTML ของหน้านั้น)
│   └── img/                   โลโก้ ภาพประกอบ
│
├── gas/                       โค้ดฝั่ง Google Apps Script (คัดลอกไปวางใน Apps Script)
│   ├── Code.gs                doGet/doPost + router
│   ├── Auth.gs                สมัคร ยืนยันอีเมล login session
│   ├── Db.gs                  ฟังก์ชันอ่าน/เขียนชีตทั่วไป (CRUD)
│   ├── Projects.gs            โครงการ / การลงทะเบียน
│   ├── Activities.gs          กิจกรรม / ข้อสอบ / ส่งงาน / ตรวจคะแนน
│   ├── Dashboard.gs           คำนวณสถิติ
│   ├── Mail.gs                แม่แบบอีเมล HTML
│   └── Setup.gs               สร้างชีตและหัวคอลัมน์อัตโนมัติ + บัญชี admin แรก
│
├── STRUCTURE.md               เอกสารนี้
└── README.md                  วิธีติดตั้งและ deploy
```

---

## 7. รายการ API (Apps Script)

ทุกคำขอส่งแบบ `POST` (Content-Type: `text/plain` เพื่อหลีกเลี่ยงปัญหา CORS)
รูปแบบ: `{ "action": "...", "token": "...", "data": { ... } }` → ตอบกลับ `{ "ok": true, "data": ... }` หรือ `{ "ok": false, "error": "..." }`

| กลุ่ม | action | สิทธิ์ |
|---|---|---|
| **Auth** | register, verifyEmail, resendVerify, login, logout, me, forgotPassword, resetPassword, changePassword, updateProfile | ทุกคน / ผู้ที่ login |
| **ปีงบประมาณ** | fy.list, fy.save, fy.delete | list: ทุกคน, อื่น ๆ: admin |
| **โครงการ** | project.list (กรองตาม fy), project.get, project.save, project.delete, project.publish | save/delete: เจ้าของ หรือ admin |
| **ลงทะเบียน** | enroll.join, enroll.cancel, enroll.listByProject, enroll.approve, enroll.reject, enroll.my | |
| **กิจกรรม** | activity.list, activity.get, activity.save, activity.delete, activity.reorder | |
| **แบบทดสอบ** | question.list, question.saveAll, quiz.start, quiz.submit, quiz.myAttempts, quiz.gradeEssay | |
| **ส่งงาน** | submission.upload (base64 → Drive), submission.my, submission.listByActivity, submission.grade | |
| **เนื้อหา** | progress.markDone | |
| **แดชบอร์ด** | dash.admin, dash.creator, dash.user, report.project (สำหรับส่งออก) | ตามบทบาท |
| **ผู้ใช้** | user.list, user.setRole, user.setStatus | admin |
| **ระบบ** | settings.get, settings.save, logs.list | admin (settings.get: ทุกคน) |

> ตรวจสิทธิ์ทุกครั้งที่ฝั่ง Apps Script ไม่พึ่งการซ่อนปุ่มที่หน้าเว็บอย่างเดียว
> เฉลยข้อสอบไม่ส่งไปที่หน้าเว็บก่อนส่งคำตอบ ตรวจคะแนนที่ฝั่ง Apps Script

---

## 8. แดชบอร์ด (เลือกปีงบประมาณ และโครงการได้ทุกหน้า)

**ผู้ดูแลระบบ**
- การ์ดสรุป: จำนวนโครงการ / ผู้ใช้ทั้งหมด / ผู้ลงทะเบียน / ผู้ผ่านการอบรม
- กราฟแท่ง: ผู้เข้าร่วมแยกตามโครงการ
- กราฟวงกลม: สัดส่วนสถานะ (กำลังอบรม / ผ่าน / ยังไม่เริ่ม)
- กราฟเส้น: การสมัครรายเดือนในปีงบประมาณ
- ตาราง: โครงการทั้งหมด พร้อม % ความสำเร็จ

**ผู้สร้างหลักสูตร** (เฉพาะโครงการของตน)
- การ์ด: ผู้เข้าร่วม / รออนุมัติ / งานรอตรวจ / ผ่านเกณฑ์
- กราฟ: อัตราการทำแต่ละกิจกรรม
- เปรียบเทียบคะแนน Pre-test กับ Post-test (ค่าเฉลี่ย พัฒนาการ)
- ตารางรายคน × รายกิจกรรม (✅ / ⏳ / ❌ พร้อมคะแนน) ส่งออก Excel/CSV ได้

**ผู้ใช้ทั่วไป**
- การ์ดโครงการที่เข้าร่วม พร้อมแถบความก้าวหน้า (%)
- กิจกรรมที่ใกล้ครบกำหนด
- คะแนนแบบทดสอบ และสถานะงานที่ส่ง

---

## 9. แนวทางออกแบบหน้าตา (UI)

- **Bootstrap 5.3 + Bootstrap Icons**, ฟอนต์ **Prompt / Sarabun** (Google Fonts)
- โทนสีหลัก: น้ำเงินคราม → ม่วง (gradient) เช่น `#4F46E5 → #7C3AED` สีเสริม: เขียว `#10B981` (สำเร็จ), ส้ม `#F59E0B` (รอดำเนินการ), แดง `#EF4444` (เลยกำหนด)
- การ์ดมุมโค้ง เงานุ่ม ไอคอนในวงกลมสี
- Sidebar ด้านซ้ายบนจอใหญ่ ยุบเป็นเมนูแฮมเบอร์เกอร์บนมือถือ
- ตารางบนมือถือแปลงเป็นการ์ด (responsive)
- รองรับโหมดมืด (dark mode)
- แสดงวันที่เป็นแบบไทย พ.ศ.

---

## 10. ข้อจำกัดที่ควรทราบ

| เรื่อง | รายละเอียด | แนวทาง |
|---|---|---|
| ความเร็ว | Apps Script ตอบสนองประมาณ 1–3 วินาที/คำขอ | รวมข้อมูลที่ต้องใช้ในคำขอเดียว, cache ใน sessionStorage, แสดง loading |
| ปริมาณข้อมูล | Google Sheets เหมาะกับหลักหมื่นถึงแสนแถว | ใช้ CacheService, แยกไฟล์ตามปีงบประมาณได้ในอนาคต |
| ผู้ใช้พร้อมกัน | Apps Script รันพร้อมกันได้จำกัด | ใช้ LockService ตอนเขียนข้อมูล เหมาะกับหลักร้อยคนพร้อมกัน |
| ขนาดไฟล์ส่งงาน | ส่งผ่าน base64 ควรไม่เกินประมาณ 10 MB | จำกัดขนาดในตั้งค่าแบบส่งงาน หรือให้ส่งเป็นลิงก์ Google Drive |
| โควตาอีเมล | บัญชี Gmail ทั่วไปประมาณ 100 ฉบับ/วัน | ใช้บัญชี Google Workspace ขององค์กร (ประมาณ 1,500 ฉบับ/วัน) |

---

## 11. แผนการพัฒนา

| ระยะ | งาน |
|---|---|
| **1. พื้นฐาน** | Setup.gs สร้างชีต, ระบบสมัคร/ยืนยันอีเมล/login, layout + ธีม, จัดการปีงบประมาณและผู้ใช้ |
| **2. โครงการ** | สร้าง/แก้ไขโครงการ, หน้ารายการโครงการ, สมัครเข้าร่วม, อนุมัติผู้เข้าร่วม |
| **3. กิจกรรม** | จัดการกิจกรรม, ตัวสร้างแบบทดสอบ, ทำแบบทดสอบ + ตรวจอัตโนมัติ, ส่งงาน + ตรวจให้คะแนน |
| **4. แดชบอร์ด** | แดชบอร์ด 3 บทบาท, รายงาน, ส่งออก Excel |
| **5. ส่วนเสริม** (ถ้าต้องการ) | เกียรติบัตร PDF อัตโนมัติ, แบบประเมินความพึงพอใจ, นำเข้าข้อสอบจากไฟล์, แจ้งเตือนทางอีเมล |

---

## 12. ประเด็นที่ต้องการให้ยืนยัน

1. อีเมลที่ใช้ส่งยืนยันเป็น Gmail ส่วนตัว หรือ Google Workspace ขององค์กร
2. ข้อมูลที่ต้องกรอกตอนสมัคร (ตำแหน่ง, โรงเรียน/หน่วยงาน, สังกัด เขตพื้นที่ ฯลฯ)
3. ต้องการเกียรติบัตรอัตโนมัติเมื่อผ่านเกณฑ์หรือไม่
4. ชื่อระบบ / หน่วยงาน / โลโก้ / โทนสีที่ต้องการ
