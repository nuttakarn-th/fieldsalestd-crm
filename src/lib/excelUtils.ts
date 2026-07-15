import * as XLSX from "xlsx";

export interface ExcelField {
  key: string;
  header: string;         // Thai column header
  example?: string;       // shown in row 2 of template
  required?: boolean;
  type?: "text" | "number" | "date";
}

// ── Template ──────────────────────────────────────────────────────────────────
export function downloadTemplate(fields: ExcelField[], sheetName: string, filename: string) {
  const headerRow = fields.map((f) => f.header);
  const noteRow   = fields.map((f) => `(ตัวอย่าง) ${f.example ?? ""}`);
  const emptyRow  = fields.map(() => "");

  const ws = XLSX.utils.aoa_to_sheet([headerRow, noteRow, emptyRow]);
  ws["!cols"] = fields.map((f) => ({ wch: Math.max(f.header.length * 2 + 4, 16) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const instrWs = XLSX.utils.aoa_to_sheet([
    ["คำแนะนำการกรอกข้อมูล"],
    [""],
    ["1. แถวที่ 1 คือชื่อคอลัมน์ — ห้ามแก้ไขหรือลบ"],
    ["2. แถวที่ 2 คือตัวอย่าง — ลบออกก่อน Import หรือปล่อยไว้ก็ได้ (ระบบจะข้ามแถวตัวอย่าง)"],
    ["3. กรอกข้อมูลจริงตั้งแต่แถวที่ 3 เป็นต้นไป"],
    ["4. บันทึกไฟล์เป็น .xlsx แล้วกด Import"],
    ...fields.map((f) => [
      `${f.header}${f.required ? " *" : ""}`,
      f.example ? `ตัวอย่าง: ${f.example}` : "",
    ]),
  ]);
  XLSX.utils.book_append_sheet(wb, instrWs, "คำแนะนำ");
  XLSX.writeFile(wb, `${filename}_template.xlsx`);
}

// ── Export ────────────────────────────────────────────────────────────────────
export function exportToExcel(
  data: Record<string, unknown>[],
  fields: ExcelField[],
  sheetName: string,
  filename: string,
) {
  const rows = [
    fields.map((f) => f.header),
    ...data.map((row) =>
      fields.map((f) => {
        const v = row[f.key];
        return v !== undefined && v !== null ? v : "";
      }),
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = fields.map((f) => ({ wch: Math.max(f.header.length * 2 + 4, 16) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`);
}

// ── Import ────────────────────────────────────────────────────────────────────
export function parseExcelFile(
  file: File,
  fields: ExcelField[],
): Promise<{ rows: Record<string, unknown>[]; skipped: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", codepage: 65001, cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

        if (raw.length < 1) { resolve({ rows: [], skipped: 0 }); return; }

        const headerRow = raw[0] as string[];

        const stripHint = (h: string) => h.trim().replace(/\s*\([^)]*\)\s*$/, "").trim();
        const exactMap      = new Map(fields.map((f) => [f.header.trim(),   f]));
        const normalizedMap = new Map(fields.map((f) => [stripHint(f.header), f]));

        const colIndexes: { field: ExcelField; idx: number }[] = [];
        headerRow.forEach((h, idx) => {
          const hStr  = String(h).trim();
          const field = exactMap.get(hStr) ?? normalizedMap.get(stripHint(hStr));
          if (field) colIndexes.push({ field, idx });
        });

        const rows: Record<string, unknown>[] = [];
        let skipped = 0;

        for (let i = 1; i < raw.length; i++) {
          const cells = raw[i] as unknown[];
          const firstCell = String(cells[0] ?? "").trim();

          if (!firstCell || firstCell.startsWith("(ตัวอย่าง)") || firstCell.startsWith("*")) {
            skipped++;
            continue;
          }

          const obj: Record<string, unknown> = {};
          colIndexes.forEach(({ field, idx }) => {
            let val: unknown = cells[idx] ?? "";
            if (field.type === "number") {
              const n = parseFloat(String(val).replace(/,/g, ""));
              val = isNaN(n) ? 0 : n;
            } else if (field.type === "date") {
              // XLSX สร้าง Date เป็น UTC แต่ offset ผิดประมาณ 7 ชม. เช่น Sep 16 → 2026-09-15T16:59:56Z
              // แก้ด้วย: round ไป nearest day ใน UTC (16:59 > 12h → วันถัดไป = Sep 16 ✓)
              if (val instanceof Date && !isNaN((val as Date).getTime())) {
                const DAY_MS = 86_400_000;
                const nd = new Date(Math.round((val as Date).getTime() / DAY_MS) * DAY_MS);
                const y  = nd.getUTCFullYear();
                const mo = String(nd.getUTCMonth() + 1).padStart(2, "0");
                const dy = String(nd.getUTCDate()).padStart(2, "0");
                val = `${y}-${mo}-${dy}`;
              } else {
                const rawStr = String(val).trim();
                const m = rawStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
                val = m
                  ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
                  : rawStr;
              }
            } else {
              val = String(val).trim();
            }
            obj[field.key] = val;
          });

          const missingRequired = fields
            .filter((f) => f.required)
            .some((f) => !obj[f.key] || obj[f.key] === "");

          if (missingRequired) { skipped++; continue; }

          rows.push(obj);
        }

        resolve({ rows, skipped });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
