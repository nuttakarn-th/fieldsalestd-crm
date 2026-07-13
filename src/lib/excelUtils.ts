import * as XLSX from "xlsx";

export interface ExcelField {
  key: string;
  header: string;         // Thai column header
  example?: string;       // shown in row 2 of template
  required?: boolean;
  type?: "text" | "number" | "date"; // "date" = user enters DD/MM/YYYY or DD-MM-YYYY, stored as YYYY-MM-DD
}

// ── Template ──────────────────────────────────────────────────────────────────
export function downloadTemplate(fields: ExcelField[], sheetName: string, filename: string) {
  const headerRow = fields.map((f) => f.header);
  const noteRow   = fields.map((f) => `(ตัวอย่าง) ${f.example ?? ""}`);
  const emptyRow  = fields.map(() => ""); // first real data row placeholder

  const ws = XLSX.utils.aoa_to_sheet([headerRow, noteRow, emptyRow]);

  // Column widths
  ws["!cols"] = fields.map((f) => ({ wch: Math.max(f.header.length * 2 + 4, 16) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Instructions sheet
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

        // First non-empty row = headers
        const headerRow = raw[0] as string[];
        const fieldMap = new Map(fields.map((f) => [f.header.trim(), f]));

        const colIndexes: { field: ExcelField; idx: number }[] = [];
        headerRow.forEach((h, idx) => {
          const field = fieldMap.get(String(h).trim());
          if (field) colIndexes.push({ field, idx });
        });

        const rows: Record<string, unknown>[] = [];
        let skipped = 0;

        // Start from row index 1 (row 2 in Excel), skip rows that look like example rows
        for (let i = 1; i < raw.length; i++) {
          const cells = raw[i] as unknown[];
          const firstCell = String(cells[0] ?? "").trim();

          // Skip empty rows and example/note rows
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
              // Case 1: Excel date cell → JS Date object (when cellDates: true)
              if (val instanceof Date && !isNaN((val as Date).getTime())) {
                const d = val as Date;
                const y = d.getUTCFullYear();
                const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
                const dy = String(d.getUTCDate()).padStart(2, "0");
                val = `${y}-${mo}-${dy}`;
              } else {
                // Case 2: String — accept DD/MM/YYYY (slash) or DD-MM-YYYY (dash)
                // → convert to YYYY-MM-DD for internal store
                const raw = String(val).trim();
                const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
                val = m
                  ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
                  : raw; // fallback: keep as-is (e.g. already YYYY-MM-DD)
              }
            } else {
              val = String(val).trim();
            }
            obj[field.key] = val;
          });

          // Validate required fields
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
