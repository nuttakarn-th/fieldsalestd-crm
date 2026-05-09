-- ============================================================
-- เพิ่มคอลัมน์ status_note ในตาราง leads
-- สำหรับบันทึกรายละเอียด Update Status (note)
-- ============================================================

alter table leads add column if not exists status_note text;
