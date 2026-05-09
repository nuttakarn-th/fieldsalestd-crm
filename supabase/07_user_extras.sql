-- เพิ่มคอลัมน์สำหรับ namecard
alter table app_users add column if not exists line_qr_url text;
alter table app_users add column if not exists department text;
