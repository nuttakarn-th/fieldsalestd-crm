-- ── Bot Q&A Training Table ──────────────────────────────────────────────────
-- Admin เพิ่ม Q&A เองได้ใน Web Setting → Standy ดึงมาตอบก่อน rule engine
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bot_qa (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  keywords    text[]      NOT NULL,           -- คำ/วลีที่ trigger (lowercase)
  answer      text        NOT NULL,           -- คำตอบที่จะแสดง
  category    text        DEFAULT 'ทั่วไป',   -- หมวดหมู่ (ทัวร์/รถ/ราคา/ทั่วไป)
  active      boolean     DEFAULT true,       -- เปิด/ปิดใช้งาน
  match_mode  text        DEFAULT 'any',      -- 'any' = ตรงคำใดคำหนึ่ง | 'all' = ตรงทุกคำ
  priority    integer     DEFAULT 0,          -- ยิ่งสูง ยิ่งมาก่อน
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Index เพื่อ GIN search บน keywords array
CREATE INDEX IF NOT EXISTS bot_qa_keywords_gin ON public.bot_qa USING gin(keywords);

-- RLS
ALTER TABLE public.bot_qa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bot_qa_all" ON public.bot_qa
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS bot_qa_updated_at ON public.bot_qa;
CREATE TRIGGER bot_qa_updated_at
  BEFORE UPDATE ON public.bot_qa
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── ข้อมูลตัวอย่าง ────────────────────────────────────────────────────────
INSERT INTO public.bot_qa (keywords, answer, category, priority) VALUES
(
  ARRAY['โปรโมชัน','ส่วนลด','ราคาพิเศษ','ลด','deal'],
  'ตอนนี้มีโปรโมชัน Early Bird สำหรับทัวร์ที่จองล่วงหน้า 60 วัน ลด 5% ครับ 🎉 สอบถามรายละเอียดเพิ่มเติมจาก Staff ได้เลยนะครับ',
  'ราคา', 10
),
(
  ARRAY['เงื่อนไข','การจอง','วางมัดจำ','มัดจำ','deposit'],
  'เงื่อนไขการจองของเรา:\n• วางมัดจำ 30% ของราคาทัวร์\n• ชำระส่วนที่เหลือก่อนออกเดินทาง 30 วัน\n• ยกเลิกก่อน 30 วัน คืน 50% | ก่อน 15 วัน ไม่คืนครับ',
  'ทั่วไป', 10
),
(
  ARRAY['ติดต่อ','เบอร์โทร','โทรหา','line','ไลน์','facebook','เฟส'],
  'ติดต่อ Standard Tour ได้ที่:\n📞 โทร: 02-XXX-XXXX\n💬 Line: @standardtour\n📘 Facebook: Standard Tour\n\nเปิดบริการทุกวัน 8:00–18:00 น. ครับ',
  'ทั่วไป', 10
),
(
  ARRAY['วีซ่าจีน','ขอวีซ่าจีน','visa จีน'],
  'วีซ่าจีนใช้เวลาดำเนินการ 7–10 วันทำการครับ\nเอกสารที่ต้องใช้: พาสปอร์ต, รูปถ่าย 2 นิ้ว, สำเนาบัตรประชาชน\n\nสนใจให้เราดำเนินการให้ได้เลยครับ 😊',
  'วีซ่า', 5
);
