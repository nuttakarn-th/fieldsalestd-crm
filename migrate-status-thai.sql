-- ============================================================
-- v336: Migrate LeadStatus → ภาษาไทย
-- อัปเดต status ใน leads table จาก English → Thai
-- Run once in Supabase SQL Editor
-- ============================================================

UPDATE leads SET status = 'ใหม่'            WHERE status = 'New';
UPDATE leads SET status = 'ติดต่อแล้ว'    WHERE status = 'Contacted';
UPDATE leads SET status = 'ส่ง Quote แล้ว' WHERE status = 'Quotation Sent';
UPDATE leads SET status = 'กำลังเจรจา'    WHERE status = 'Negotiating';
UPDATE leads SET status = 'จองแล้ว'        WHERE status = 'Closed Won';
UPDATE leads SET status = 'ยกเลิก'         WHERE status = 'Closed Lost';

-- ตรวจสอบหลัง migrate
SELECT status, count(*) FROM leads GROUP BY status ORDER BY count(*) DESC;
