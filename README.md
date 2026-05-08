# Field Sale CRM

ระบบ CRM สำหรับทีมขายภาคสนาม (Sales) ของบริษัททัวร์ — ทำต่อจาก Lovable

## เริ่มต้นใช้งาน (สำหรับมือใหม่)

ติดตั้ง [Node.js](https://nodejs.org/) (เลือก LTS) จากนั้น:

1. **ดับเบิลคลิก** `install.bat` — ติดตั้ง packages (รันแค่ครั้งแรก)
2. **ดับเบิลคลิก** `start.bat` — เปิด dev server แล้วเข้าเบราว์เซอร์ที่ http://localhost:8080
3. ปิด dev server ด้วย `Ctrl+C` ในหน้าต่าง command prompt

> ดูคู่มือเต็ม + ขั้นตอนเชื่อม Database ที่ [`NEXT_STEPS.md`](./NEXT_STEPS.md)

## โครงสร้างโปรเจกต์

```
fieldsale-crm-main/
├── src/
│   ├── pages/        ← แต่ละหน้าของแอป (Customers, Pipeline, Quotation, …)
│   ├── components/   ← UI components (shadcn/ui + custom)
│   ├── store/        ← Zustand state stores (mock data ตอนนี้)
│   ├── lib/          ← Utility + supabase client
│   └── data/         ← mockData.ts (sample data)
├── supabase/
│   └── schema.sql    ← Database schema สำหรับเอาไปรันใน Supabase
├── public/           ← static assets
├── .env.example      ← ตัวอย่างไฟล์ env (คัดลอกเป็น .env เมื่อจะเชื่อม Supabase)
├── install.bat       ← ติดตั้ง dependencies (Windows)
├── start.bat         ← รัน dev server (Windows)
└── build.bat         ← Build production (Windows)
```

## Stack

- React 18 + Vite 5 + TypeScript
- Tailwind CSS + shadcn/ui (Radix)
- Zustand (state) · React Query · React Router v6
- Recharts · React Hook Form + Zod
- Supabase — เพิ่มแล้วเป็น dependency พร้อมใช้งาน

## คำสั่ง npm

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รัน dev server (port 8080) |
| `npm run build` | Build production ลง `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ตรวจ ESLint |
| `npm run test` | รัน unit tests (vitest) |
