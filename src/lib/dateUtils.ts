/**
 * dateUtils.ts — Date formatting helpers
 * ใช้ร่วมกันทั้ง project
 */

/**
 * แสดงวันที่ในรูปแบบ DD/MM/YY
 * รองรับทั้ง ISO string, Date object และ undefined/null (คืนค่า "-")
 */
export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

/**
 * แสดงวันที่และเวลา DD/MM/YY HH:MM
 */
export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

/**
 * แปลง ISO date string (YYYY-MM-DD) เป็น DD/MM/YY
 * สำหรับวันที่ที่ไม่มี time component
 */
export function fmtDateStr(value: string | null | undefined): string {
  if (!value) return "-";
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  const [yyyy, mm, dd] = parts;
  return `${dd}/${mm}/${yyyy.slice(2)}`;
}
