-- ============================================================
-- เปิด Supabase Realtime ให้ chat_messages
-- เพื่อให้ user คนอื่นเห็นข้อความใหม่ทันทีโดยไม่ต้อง refresh
-- ============================================================

-- เพิ่ม chat_messages เข้า realtime publication (ถ้ายังไม่ได้เพิ่ม)
do $$ begin
  alter publication supabase_realtime add table chat_messages;
  exception when duplicate_object then null;
end $$;

-- ส่วน team_notifications ก็ realtime ด้วย เผื่อใช้ในอนาคต
do $$ begin
  alter publication supabase_realtime add table team_notifications;
  exception when duplicate_object then null;
end $$;
