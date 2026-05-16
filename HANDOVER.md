# 🤝 HANDOVER — Field Sale CRM (Standard Tour)

> เอกสารส่งต่อสำหรับเริ่ม Chat ใหม่ — แค่ paste ไฟล์นี้ใส่ Claude ทุกอย่างจะต่อเนื่องได้

---

## ⚡ Quick Context (เริ่ม Chat ใหม่ใส่ทั้งหมดนี้)

ฉันกำลังทำต่อโปรเจกต์ **Field Sale CRM ของ Standard Tour** ส่งต่อจาก chat ก่อน
อ่าน `CLAUDE.md` + `NEXT_STEPS.md` + ไฟล์นี้ (`HANDOVER.md`) ก่อนเริ่มงาน

**โครงสร้างสำคัญที่ต้องรู้:**
- Stack: React 18 + Vite 5 + TS + Tailwind + shadcn/ui + Zustand + Supabase
- Deploy: Vercel auto-deploy ทุก push GitHub
- Production URL: https://fieldsalestd-crm.vercel.app
- GitHub: https://github.com/nuttakarn-th/fieldsalestd-crm
- Supabase Project URL: https://jhblvwyjnumfuxdorlnp.supabase.co
- Working folder: `D:\Cowork_All\CRM Project\fieldsale-crm-main`

**Workflow ที่ user ใช้:**
1. คุยกับ Claude → Claude แก้ไฟล์ผ่าน Edit/Write tools
2. User ดับเบิลคลิก `commit-push.bat` → Git push → Vercel deploy อัตโนมัติ
3. ถ้ามี SQL ใหม่ — Claude ใช้ Chrome MCP รันให้ที่ Supabase SQL Editor (user คลิกเปิด tab Supabase ก่อน)

---

## 📊 สถานะ Database (Supabase)

### ตาราง CRM หลัก
- `sales_reps` — รายชื่อ rep (seed: เฟิร์ส โดนัท ปาม + Manager)
- `customers` — ลูกค้า ✅ persist
- `leads` — Pipeline (มี `status_note` column ที่เพิ่มทีหลัง) ✅ persist
- `monthly_targets` — เป้าขายรายเดือน ✅ persist
- `route_plans` + `route_stops` — แผนเยี่ยม ✅ persist
- `chat_messages` — แชททีม ✅ persist + **realtime** (publication = `supabase_realtime`)
- `team_notifications` — แจ้งเตือน
- `quotations` — ใบเสนอราคา/ใบเสร็จ ✅ persist
- `app_users` — ผู้ใช้ระบบ (password_hash = PBKDF2) + columns `line_qr_url`, `department`

### ตาราง Settings / Services
- `site_settings` (single-row JSON) — Tour Presentation profile, social links, Contact Info, presentations[]
- `tours` `cars` `flights` `hotels` `visas` `insurances` — All Service catalog ✅ persist

### Storage Buckets
- `presentations` (public) — เก็บ PDF + cover images

### RLS Policies
- ทุกตาราง: `"open read"` + `"open write"` (allow all) — DEV MODE
- ยังไม่ได้ทำ Supabase Auth จริง — ใช้ anon key + open RLS

### SQL Migration Files (รันแล้วทั้งหมด)
อยู่ที่ `supabase/` folder:
- `schema.sql` — สร้างตาราง CRM 9 ตาราง
- `02_open_rls_for_dev.sql` — เปิด RLS allow anon
- `03_strict_rls_when_auth_ready.sql` — ไว้ใช้ตอนเปิด Auth (ยังไม่รัน)
- `04_app_users.sql` — สร้าง app_users
- `05_add_enum_values.sql` — เพิ่ม "Field Sale", "ลูกค้าทั่วไป"
- `06_lead_status_note.sql` — เพิ่ม column status_note
- `07_user_extras.sql` — เพิ่ม line_qr_url + department
- `08_site_settings_storage.sql` — site_settings table + Storage bucket
- `09_enable_realtime_chat.sql` — เปิด realtime
- `10_services_tables.sql` — ตาราง tours/cars/flights/hotels/visas/insurances

---

## 🎨 Theme / UI

### Colors (`src/index.css`)
- **Light mode**: bg white, primary = purple, accent = pink
- **Dark mode**: bg neutral dark grey (ไม่ใช่ม่วงเข้ม), accents เหมือนเดิม
- **Sidebar**: indigo theme — light = white bg, dark = navy bg, selected = indigo pill
- Gradient cards override สำหรับ dark mode

### Fonts
- หลัก: **Kanit** (Thai-friendly)
- Heading พิเศษ: **Inter Extrabold** (สำหรับ Hub heading `.font-inter`)

### Sidebar Categories (renderจาก `src/config/roleMenus.ts`)
แต่ละ role มี sections ต่างกัน เช่น Admin:
- OVERVIEW, CUSTOMER, SALES MANAGEMENT, FINANCE, REPORT & DATA
- (Account section ลบไปแล้ว — เหลือแค่ SYSTEM)
- Footer: ROLE & TEAM (admin only) + TEAM VIEW (manager+) + user card

### Charts (Recharts)
ใช้ **gradient defs** + `<linearGradient>` ทุก chart:
- Area chart: vertical opacity 0.45 → 0
- Bar chart: vertical opacity 1 → 0.35-0.45, radius `[8,8,0,0]`
- Horizontal bar: horizontal gradient
- กราฟทุกตัว: `tickLine={false}`, `axisLine={false}`, `vertical={false}` grid, tooltip rounded-12

### KPI Cards (มาตรฐาน)
- `flex flex-col items-center justify-center text-center min-h-[140-150px] gap-2`
- icon เล็กบน, label muted-foreground, number `text-3xl md:text-4xl font-extrabold leading-none`

---

## 🔐 Auth (ยังเป็น MVP)
- ใช้ username/password เก็บใน `app_users` table
- Password = PBKDF2-SHA256 hash (`src/lib/passwordHash.ts`)
- Admin login: `admin / adminstd`
- Logic อยู่ใน `src/store/authStore.ts`
- ยังไม่ได้ใช้ Supabase Auth จริง — ทำได้ทีหลัง

---

## 💬 Chat (Realtime)
- `chat_messages` table + Supabase realtime subscription
- `src/components/ChatRealtimeSync.tsx` mount ใน App.tsx
- มี Web Notification API — ปุ่ม 🔕/🔔 ใน chat header
- เสียง ping (Web Audio API) เมื่อมีข้อความใหม่และ chat ไม่ได้เปิด

---

## 📂 ไฟล์โครงสร้างหลัก

```
src/
├── pages/
│   ├── Hub.tsx                  ← landing page, 3:4 cards, Inter Extrabold
│   ├── Login.tsx
│   ├── Index.tsx                ← Dashboard (KPI centered + bigger)
│   ├── ExecutiveDashboard.tsx   ← Gradient charts (Area + ComposedBar)
│   ├── Customers.tsx            ← Table + mobile card grid + filter
│   ├── Pipeline.tsx             ← Kanban + Update Status dialog
│   ├── Quotation.tsx            ← List + search + filter + popup detail + edit
│   ├── QuotationForm.tsx        ← Create + edit mode (?edit=id)
│   ├── FollowUp.tsx             ← KPI summary + sections
│   ├── Targets.tsx
│   ├── MarketingReport.tsx      ← Card centered
│   ├── FinancialReport.tsx      ← Card centered + gradient
│   ├── SalesFollower.tsx        ← Bar charts gradient
│   ├── SalesTeam.tsx            ← Dynamic from users + stats
│   ├── AllService.tsx           ← Tour/Car/Flight/Hotel/Visa/Insurance + date picker
│   ├── TourPresentation.tsx     ← Multi-PDF + cover images
│   ├── ContactInfo.tsx          ← Admin edit
│   ├── MyProfile.tsx            ← Namecard 4:5 + download as image
│   ├── UserManagement.tsx
│   ├── Planning.tsx             ← Route create + stops
│   ├── RouteCalendar.tsx        ← Calendar view
│   ├── Mission.tsx              ← Active mission
│   └── CompletedRoute.tsx
├── components/
│   ├── AppSidebar.tsx           ← Indigo theme + categories
│   ├── AppLayout.tsx            ← Top bar + chat widget + FAB
│   ├── ChatWidget.tsx           ← Realtime + Bell permission button
│   ├── ChatRealtimeSync.tsx     ← Realtime subscription
│   ├── AddCustomerFAB.tsx       ← ซ่อนเมื่อ chat เปิด
│   ├── VoiceTextarea.tsx        ← Voice-to-text textarea (ใช้ทุก textarea ใหญ่)
│   ├── CustomerLeadDialog.tsx   ← เพิ่มลูกค้า + lead (pull services จาก useServices)
│   ├── EditCustomerDialog.tsx
│   ├── GlobalSearch.tsx
│   ├── UserMenu.tsx
│   ├── TeamNotifications.tsx
│   ├── RouteGuard.tsx
│   ├── DateRangeFilter.tsx
│   ├── StopDialog.tsx
│   └── NavLink.tsx
├── store/
│   ├── authStore.ts             ← users + login + password hashing + Supabase sync
│   ├── crmStore.ts              ← customers/leads/quotations/routes/targets/chat
│   ├── siteSettingsStore.ts     ← Tour Presentation + Contact Info + presentations[]
│   ├── serviceStore.ts          ← Tours/Cars/Flights/etc + Supabase sync
│   └── chatReadStore.ts         ← lastReadAt
├── lib/
│   ├── supabase.ts              ← client + SUPABASE_ENABLED flag
│   ├── passwordHash.ts          ← PBKDF2-SHA256
│   ├── imageCompression.ts
│   ├── utils.ts
│   └── db/                      ← service layer (customers/leads/quotations/routes)
├── config/
│   └── roleMenus.ts             ← sections per role
└── data/mockData.ts             ← legacy

public/
├── favicon.ico                  ← Standard Tour logo
└── ...

supabase/                        ← SQL migrations 01-10
.env                             ← VITE_SUPABASE_URL + KEY + USE_SUPABASE=true
.env.example
vercel.json                      ← SPA rewrites
*.bat                            ← install/start/build/commit-push/git-setup
```

---

## ✅ งานที่ทำเสร็จแล้ว (sample list — รายละเอียดดูใน `NEXT_STEPS.md`)

1. Setup Node.js + Git + GitHub
2. Supabase: 9 ตาราง + RLS + seed
3. Persist Customers + Leads + Quotations + Routes + Targets + Users + Chats + Services
4. Password hashing (PBKDF2)
5. Deploy on Vercel
6. SPA routing fix (vercel.json)
7. Active sales filter (dynamic from app_users)
8. Mobile responsive (Customers + Quotation card grid)
9. Dark mode neutral (ไม่ใช่ม่วง)
10. Hub: Inter Extrabold + 3:4 cards single row
11. Sidebar: indigo theme + 7 categories + compact spacing
12. KPI cards centered + extrabold (Index, Executive, FollowUp, Marketing, Financial)
13. Charts: gradient curves + bars + horizontal gradient
14. Tour Presentation: multi-PDF + cover images + fullscreen view
15. My Profile: 4:5 namecard + download as image + Line QR upload
16. Quotation: filter + search + popup + edit + notification + mobile cards
17. Pipeline: Update Status dialog (note + follow-up) + show real customer name
18. Voice-to-text on big textareas
19. 24Hr clock
20. "Field Sale" + "ลูกค้าทั่วไป" enum
21. Chat: persist + realtime + browser notifications + sound + Bell button + hide FAB
22. Tour form: International Tour rename + date pickers + auto-calc days/nights
23. All Service: blank defaults + 6 tables Supabase persist
24. CustomerLeadDialog: pull from useServices (group by category)
25. Logo: Standard Tour favicon ใช้ทุกที่

---

## 🔧 แก้ไขล่าสุด (17 พ.ค. 2026)

**Fix: Supabase Data Persistence ทุกตาราง**
1. `crmStore.ts` — เมื่อ `SUPABASE_ENABLED=true` เริ่มด้วย empty arrays (ไม่ใช้ mock data)
2. `crmStore.ts` — `loadAllFromSupabase` อัพเดต state เสมอ แม้ DB ว่าง + log error แต่ละตาราง
3. `crmStore.ts` — customer/lead/route ID ใช้ `Date.now()` แทน `length+1` (ไม่ชนกัน)
4. `crmStore.ts` — quotation ID ใช้ `crypto.randomUUID()` (ต้องเป็น UUID ตาม schema)
5. `crmStore.ts` — doc_no ใช้ timestamp slice แทน list.length (ไม่ซ้ำข้ามเซสชัน)

---

## 🔜 งานที่ยังเหลือ / อยากทำต่อ (ใส่ที่นี่ตอนต่อ chat ใหม่)

- [ ] Supabase Auth จริง (แทน hashed username/password) → ใช้ `03_strict_rls_when_auth_ready.sql`
- [ ] PWA (mobile install + offline)
- [ ] Email notifications (เช่น ส่ง follow-up reminder)
- [ ] Custom domain Vercel
- [ ] (อื่นๆ — เพิ่มที่นี่)

---

## 🛠️ คำสั่งที่ใช้บ่อย

```bash
# รัน dev
npm run dev                 # หรือ start.bat

# Push code
git add . && git commit -m "..." && git push   # หรือ commit-push.bat

# รัน SQL ใน Supabase → ใช้ Chrome MCP หรือคัดลอกไปวางใน SQL Editor
```

---

## ⚠️ กฎห้ามลืม

1. **อย่าลบ `.env`** — มี API key
2. **อย่า commit `.env`** — `.gitignore` กันอยู่แล้ว
3. **ทุกครั้งที่แก้ code** → push เพื่อให้ Vercel deploy
4. **อย่าใช้ service_role key ใน frontend** — anon เท่านั้น
5. **ก่อนแก้ store/schema ใหญ่ๆ** — commit ก่อน เผื่อ rollback

---

## 📞 ติดต่อ / Login

- Admin: `admin / adminstd`
- Email: nuttakarn.th90@gmail.com
- GitHub: nuttakarn-th
- Supabase Org: nuttakarn.th90@gmail.com's Org

---

**Last updated: เมื่อจบ chat รอบนี้ (ก่อนย้ายไป chat ใหม่ที่ใช้ model ต่ำกว่า)**
