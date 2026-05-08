# คู่มือทำต่อ — Field Sale CRM

> เขียนเพื่อให้คนที่ไม่เคยเขียนโค้ดทำตามได้ทีละขั้น
> ติ๊ก ✅ คือผมเตรียมให้แล้ว · ⬜ คือต้องทำเอง

---

## สถานะตอนนี้ (8 พ.ค. 2026)

### ✅ ผมจัดการให้แล้ว

- ✅ จัดโครงสร้างโฟลเดอร์โปรเจกต์
- ✅ Windows scripts: `install.bat`, `start.bat`, `build.bat`, `git-setup.bat`
- ✅ Supabase client พร้อมใช้งาน (`src/lib/supabase.ts`)
- ✅ Database schema เต็มชุด (`supabase/schema.sql`) — 9 ตาราง + RLS + seed reps
- ✅ Service layer skeleton (`src/lib/db/customers.ts`, `leads.ts`, `quotations.ts`, `routes.ts`)
- ✅ ไฟล์ `.env` placeholder พร้อมกรอก
- ✅ `CLAUDE.md` — context สำหรับ Claude Code
- ✅ `package.json` เพิ่ม `@supabase/supabase-js` แล้ว
- ✅ `.gitignore` ปิด `.env` ป้องกัน leak credential

### ⬜ ที่คุณต้องทำเอง (ใช้บัญชี/account ของคุณเอง)

1. ⬜ Run `install.bat` ครั้งแรก — **เสร็จแล้ว ✅** (เห็นจาก screenshot)
2. ⬜ Run `start.bat` แล้วเปิด http://localhost:8080
3. ⬜ ติดตั้ง **Git for Windows** + รัน `git-setup.bat`
4. ⬜ สร้าง GitHub repo + push ขึ้นไป (backup)
5. ⬜ ติดตั้ง **Claude Code** (CLI) เพื่อทำงานต่อ
6. ⬜ สมัคร **Supabase** + รัน schema.sql
7. ⬜ กรอก URL + key ใน `.env` แล้วเปลี่ยน `VITE_USE_SUPABASE=true`
8. ⬜ ให้ Claude Code rewrite store ไปใช้ Supabase

---

## 1) เปิดแอปครั้งแรก

ดับเบิลคลิก **`start.bat`** → รอจนเห็น `Local: http://localhost:8080/` → เปิดเบราว์เซอร์ที่ลิงก์นั้น

> หยุดเซิร์ฟเวอร์: คลิกหน้าต่าง command prompt แล้วกด `Ctrl + C`

---

## 2) Backup โค้ดด้วย Git + GitHub (ทำก่อนแก้อะไร!)

### 2.1) ติดตั้ง Git for Windows
1. ไป https://git-scm.com/download/win → ดาวน์โหลด → ติดตั้ง Next-Next-Finish
2. ปิด command prompt เก่าทุกหน้าต่าง

### 2.2) Init local repo
ดับเบิลคลิก **`git-setup.bat`** → เสร็จแล้วจะมี local commit แรก

### 2.3) Push ขึ้น GitHub
1. สมัคร https://github.com (ถ้ายังไม่มี)
2. กดปุ่ม **+** มุมขวาบน → **New repository**
3. ชื่อ `fieldsale-crm` → เลือก **Private** → **อย่า** ติ๊ก "Initialize with README" → กด Create
4. หน้าต่อมา GitHub จะแสดง 3 บล็อก เลือกบล็อกที่ขึ้นว่า **"…or push an existing repository from the command line"**
5. คัดลอก 3 บรรทัดที่ขึ้นต้นด้วย `git remote add origin …`
6. เปิด Command Prompt ในโฟลเดอร์โปรเจกต์ (Shift + คลิกขวาในที่ว่าง → "Open in Terminal" หรือ "Open PowerShell window here") → paste แล้ว Enter
7. ครั้งแรกอาจให้ login ผ่าน browser — ทำตามที่ขึ้น

ทุกครั้งที่แก้โค้ดเสร็จ commit + push ใหม่:
```
git add .
git commit -m "อธิบายว่าแก้อะไร"
git push
```

---

## 3) ติดตั้ง Claude Code (สำหรับให้ Claude แก้โค้ดต่อ)

### 3.1) ติดตั้ง
เปิด Command Prompt → พิมพ์:
```
npm install -g @anthropic-ai/claude-code
```
รอจนเสร็จ (ครั้งแรก ~1 นาที)

### 3.2) เริ่มใช้
1. เปิด Command Prompt ในโฟลเดอร์โปรเจกต์ (`fieldsale-crm-main`)
2. พิมพ์:
   ```
   claude
   ```
3. ครั้งแรกจะให้ login ด้วย Anthropic account
4. หลังจากนั้นพิมพ์ภาษาไทยได้เลย เช่น:
   - "เพิ่มหน้า Dashboard แสดงยอดขายรวมเดือนนี้"
   - "ในหน้า Customers แก้ให้กรองตาม Tier"

> ผมเตรียม `CLAUDE.md` ให้แล้ว — Claude Code จะอ่านอัตโนมัติเพื่อเข้าใจโครงสร้าง

---

## 4) เชื่อม Supabase Database

ตอนนี้แอปใช้ **mock data** (สุ่มทุกครั้งที่เปิดแอป) — ปิดแอปแล้วข้อมูลใหม่หาย ต้องเชื่อม database จริง

### 4.1) สมัคร + สร้าง Project
1. ไป https://supabase.com → Sign in with GitHub
2. กด **New project** → ตั้งชื่อ `fieldsale-crm` → ตั้ง password (จดไว้!) → region `Southeast Asia (Singapore)` → Create
3. รอ 2-3 นาที

### 4.2) Run Schema
1. ใน Supabase project → เมนูซ้าย **SQL Editor** → **New query**
2. เปิดไฟล์ `supabase/schema.sql` ในโปรเจกต์ → คัดลอกทั้งหมด → paste → กด **Run**
3. ควรเห็น "Success" — ตอนนี้มี 9 ตารางพร้อมแล้ว

### 4.3) กรอก env
1. ใน Supabase → **Project Settings** (เฟืองล่างซ้าย) → **API**
2. เปิดไฟล์ `.env` ในโปรเจกต์ (ใช้ Notepad ก็ได้) — มีให้แล้วใน root folder
3. คัดลอกค่า 2 อันใส่:
   - `VITE_SUPABASE_URL=` ← Project URL
   - `VITE_SUPABASE_ANON_KEY=` ← anon public key
4. เปลี่ยน `VITE_USE_SUPABASE=false` เป็น `VITE_USE_SUPABASE=true`
5. **Save** ไฟล์
6. **หยุด dev server** (Ctrl+C) แล้วรัน `start.bat` ใหม่

### 4.4) ให้ Claude rewrite store
แอปยังใช้ mock data อยู่จนกว่าจะ rewrite store — ใน Claude Code พิมพ์:

> *"ทำตาม CLAUDE.md ส่วน 'งานที่เหลือสำหรับ Claude Code' เริ่มจากข้อ 1 ทำ useCustomersQuery hook ใน src/hooks/ แล้วแก้หน้า Customers.tsx ให้อ่านผ่าน hook แทน Zustand store — ทำเฉพาะ Customers ก่อน entity อื่นยังใช้ mock อยู่ก็ได้"*

ทำทีละ entity (Customers → Leads → Quotations → Routes) จะปลอดภัยกว่า

---

## 5) Deploy ขึ้น Production (ทำเมื่อระบบเสถียรแล้ว)

แนะนำ **Vercel** (ฟรี + ง่ายสุด):
1. https://vercel.com → Login with GitHub
2. **Import** GitHub repo
3. Framework: **Vite** (auto-detect)
4. **Environment Variables** → เพิ่ม 3 ตัวจาก `.env`
5. Deploy → ได้ URL เช่น `fieldsale-crm.vercel.app`

ทุกครั้งที่ push GitHub Vercel จะ deploy ใหม่อัตโนมัติ

---

## 6) ลำดับงานแนะนำ

| ลำดับ | งาน | ใครทำ | เวลา |
|---|---|---|---|
| 1 | Run `start.bat` เปิดแอปครั้งแรก | คุณ | 1 นาที |
| 2 | สำรวจหน้าต่างๆ ทุกเมนู | คุณ | 30 นาที |
| 3 | Git + GitHub backup | คุณ | 30 นาที |
| 4 | ติดตั้ง Claude Code | คุณ | 5 นาที |
| 5 | สมัคร Supabase + run schema | คุณ | 15 นาที |
| 6 | Rewrite Customers ใช้ Supabase | Claude Code | 1 ชม. |
| 7 | Rewrite Leads | Claude Code | 1 ชม. |
| 8 | Rewrite ที่เหลือทีละหน้า | Claude Code | 1-2 ชม./หน้า |
| 9 | Auth จริง | Claude Code | 2 ชม. |
| 10 | Deploy บน Vercel | คุณ + Claude | 30 นาที |

---

## ปัญหาที่อาจเจอ

| ปัญหา | วิธีแก้ |
|---|---|
| `'npm' is not recognized` | ติดตั้ง Node.js ยังไม่สำเร็จ — restart Windows |
| `port 8080 already in use` | เปิด `vite.config.ts` เปลี่ยน port เป็น 3000 |
| หน้าเว็บโหลดแล้วขาว | กด F12 ดู Console แล้ว screenshot ส่ง Claude |
| `.env` แก้แล้วไม่มีผล | ต้อง restart dev server (Ctrl+C เปิดใหม่) |
| .bat ดับเบิลคลิกแล้วเด้งหาย | เปิด cmd แล้วรันด้วยมือเพื่อดู error |

---

## ติดต่อขอความช่วยเหลือ

เปิด Claude Code → พิมพ์ปัญหาที่เจอเป็นภาษาไทย พร้อม:
- ขั้นตอนที่ทำ
- error message (copy ทั้งหมด)
- screenshot ถ้ามี

Claude จะช่วยแก้ทีละขั้น โดยที่คุณไม่ต้องเข้าใจโค้ดเอง
