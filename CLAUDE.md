# Field Sale CRM — Project Context for Claude Code

ไฟล์นี้บอก Claude Code ว่าโปรเจกต์นี้คืออะไร โครงสร้างเป็นยังไง เพื่อให้ทำงานต่อได้แม่น

## สรุปโปรเจกต์

ระบบ CRM ภาษาไทยสำหรับทีม Field Sales บริษัททัวร์ ฟีเจอร์หลัก:
- ลูกค้า (Customers) → จัดเก็บ contact + tier (New/Regular/VIP)
- โอกาสขาย (Leads/Pipeline) → 6 สถานะ: New → Contacted → Quotation Sent → Negotiating → Closed Won/Lost
- ใบเสนอราคา & ใบเสร็จ (Quotations) → คำนวณ VAT + ส่วนลด
- แผนเยี่ยมลูกค้า (Routes) → จัด stop, ติด in-progress / completed
- เป้าขายรายเดือน (Targets) แยก domestic/international
- แชททีม + Notification, Dashboard, Reports

## Tech Stack

- **Frontend**: React 18 + Vite 5 + TypeScript
- **UI**: Tailwind CSS + shadcn/ui (Radix primitives)
- **State**: Zustand (`src/store/`) — state-management หลัก ตอนนี้ใช้ mock data
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **Server state** (เมื่อพร้อม): @tanstack/react-query
- **Backend**: Supabase (Postgres + Auth) — schema เตรียมไว้ใน `supabase/schema.sql`

## โครงสร้างไฟล์สำคัญ

```
src/
├── pages/                  # 1 ไฟล์ = 1 หน้า — แต่ละ Route อยู่ที่นี่
├── components/
│   ├── ui/                 # shadcn — อย่าเพิ่ม emoji หรือเปลี่ยน API
│   └── *.tsx               # custom components ของโปรเจกต์
├── store/
│   ├── crmStore.ts         # core data (customers, leads, routes, …)
│   ├── authStore.ts        # auth state
│   ├── serviceStore.ts     # services / packages
│   ├── siteSettingsStore.ts
│   └── chatReadStore.ts
├── lib/
│   ├── supabase.ts         # Supabase client (auto-disabled if env missing)
│   ├── db/                 # Service layer ใช้กับ Supabase ทีละ entity
│   │   ├── customers.ts
│   │   ├── leads.ts
│   │   ├── quotations.ts
│   │   ├── routes.ts
│   │   └── index.ts        # central export — import { db } from "@/lib/db"
│   ├── utils.ts
│   └── imageCompression.ts
├── data/mockData.ts        # seed data (จะใช้ลดลงเมื่อย้ายไป Supabase)
├── config/roleMenus.ts     # RBAC menu config
└── hooks/                  # custom hooks
```

## Data Model (TypeScript types ใน `src/store/crmStore.ts`)

- `Customer` — customer_id, full_name, company, phone, line_id, email, source, segment, tier, total_trips, total_spend, created_by (rep)
- `Lead` — lead_id, customer_id, assigned_to, bu_type, lead_category, scope, program, pax_count, urgency, status, quoted_price
- `RoutePlan` + `RouteStop` — แผนเยี่ยม + จุดแวะ
- `QuotationDoc` + `QuotationItem` — ใบเสนอราคา/ใบเสร็จ + รายการ
- `MonthlyTarget` — เป้ารายเดือนของ rep แต่ละคน
- `ChatMessage`, `TeamNotification`

Sales Reps fixed: `เฟิร์ส`, `โดนัท`, `ปาม` + `Manager`.

## กฎการแก้ไข

1. **อย่าแก้ shadcn UI components** ใน `src/components/ui/` ยกเว้นจำเป็นจริง — ปรับ behavior ผ่าน wrapper component แทน
2. **ภาษา**: UI strings เป็นภาษาไทย, code/comments ภาษาอังกฤษ
3. **Currency**: ใช้ `formatTHB()` จาก `crmStore.ts` (Intl.NumberFormat th-TH THB)
4. **Date**: ใช้ `date-fns` v3 (มีติดตั้งแล้ว)
5. **เพิ่มหน้าใหม่**: สร้างไฟล์ใน `src/pages/` แล้วลงทะเบียน Route ใน `src/App.tsx`
6. **State changes ที่กระทบ store**: อัพเดทใน Zustand actions เสมอ (อย่าแก้ state ตรงๆ)
7. **Supabase**: ใช้ผ่าน `src/lib/db/` ไม่ import `supabase` client ตรงๆ จาก page/component

## Run / Build

- Dev: ดับเบิลคลิก `start.bat` หรือ `npm run dev` → http://localhost:8080
- Build: `npm run build` → output ไป `dist/`
- Test: `npm run test` (vitest)

## สถานะ Supabase ปัจจุบัน

- Client พร้อมใช้งาน (`src/lib/supabase.ts`)
- Schema พร้อม run (`supabase/schema.sql` — 9 tables + RLS + seed sales_reps)
- Service layer skeleton พร้อม (`src/lib/db/`)
- **Zustand store ยังใช้ mock data** — ยังไม่ได้ rewrite ไปใช้ db services
- `.env` พร้อม placeholder — flip `VITE_USE_SUPABASE=true` เมื่อพร้อม

## งานที่เหลือสำหรับ Claude Code

ลำดับแนะนำ (ทำทีละ entity เพื่อไม่ให้พังพร้อมกัน):
1. ทำ `useCustomersQuery` + `useCustomerMutations` ใน `src/hooks/` ใช้ React Query รวมกับ `db.customers.*`
2. แก้หน้า `Customers.tsx` ให้อ่านจาก hook แทนจาก Zustand
3. ทำตามขั้นเดียวกันสำหรับ Leads → Quotations → Routes → Targets
4. ทำ Auth จริงด้วย Supabase Auth ใน `Login.tsx`
5. เก็บ Zustand เฉพาะ UI state (current rep filter, theme) ออกจาก data state

## หมายเหตุ Lovable

- เดิม import โดยใช้ alias `@/` → `src/` (ตั้งใน `vite.config.ts`)
- มี `lovable-tagger` plugin ใน dev mode — จะลบทิ้งก็ได้ ไม่กระทบ production build
