-- ============================================================
-- เพิ่มค่า enum ใหม่ — รัน 1 ครั้ง
-- ============================================================

-- เพิ่ม "Field Sale" ใน source_t (ถ้ายังไม่มี)
do $$ begin
  alter type source_t add value if not exists 'Field Sale' before 'FB';
  exception when others then null;
end $$;

-- เพิ่ม "ลูกค้าทั่วไป" ใน lead_category_t (ถ้ายังไม่มี)
do $$ begin
  alter type lead_category_t add value if not exists 'ลูกค้าทั่วไป' before 'บริษัทเอกชน';
  exception when others then null;
end $$;
