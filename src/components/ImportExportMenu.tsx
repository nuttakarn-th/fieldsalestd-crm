import { useRef } from "react";
import { FileDown, FileUp, FileSpreadsheet, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { downloadTemplate, exportToExcel, parseExcelFile, ExcelField } from "@/lib/excelUtils";

interface ImportExportMenuProps {
  /** Field definitions for template, import, export */
  fields: ExcelField[];
  /** Sheet name inside the workbook */
  sheetName: string;
  /** Base filename (no extension, no date) */
  filename: string;
  /** Current data to export */
  data: Record<string, unknown>[];
  /** Called with parsed rows after a successful import */
  onImport: (rows: Record<string, unknown>[]) => void | Promise<void>;
  /** Optional: disable the menu */
  disabled?: boolean;
  /** Optional: hide import options (Template + Import .xlsx) for read-only roles */
  canImport?: boolean;
}

export function ImportExportMenu({
  fields,
  sheetName,
  filename,
  data,
  onImport,
  disabled = false,
  canImport = true,
}: ImportExportMenuProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleTemplate = () => {
    downloadTemplate(fields, sheetName, filename);
    toast.success("ดาวน์โหลด Template แล้ว");
  };

  const handleExport = () => {
    if (data.length === 0) {
      toast.error("ไม่มีข้อมูลสำหรับ Export");
      return;
    }
    exportToExcel(data, fields, sheetName, filename);
    toast.success(`Export ${data.length} รายการแล้ว`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = "";
    try {
      const { rows, skipped } = await parseExcelFile(file, fields);
      if (rows.length === 0) {
        toast.error("ไม่พบข้อมูลที่สามารถ Import ได้");
        return;
      }
      await onImport(rows);
      const skippedMsg = skipped > 0 ? ` (ข้าม ${skipped} แถว)` : "";
      toast.success(`Import ${rows.length} รายการแล้ว${skippedMsg}`);
    } catch (err) {
      console.error(err);
      toast.error("อ่านไฟล์ไม่สำเร็จ — ตรวจสอบรูปแบบ .xlsx");
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={handleFileChange}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {canImport ? "Import / Export" : "Export"}
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {canImport && (
            <>
              <DropdownMenuItem onClick={handleTemplate} className="gap-2 cursor-pointer">
                <FileDown className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="font-medium">ดาวน์โหลด Template</p>
                  <p className="text-xs text-muted-foreground">ไฟล์ตัวอย่างสำหรับกรอกข้อมูล</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => fileRef.current?.click()}
                className="gap-2 cursor-pointer"
              >
                <FileUp className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="font-medium">Import .xlsx</p>
                  <p className="text-xs text-muted-foreground">เพิ่มข้อมูลจากไฟล์ Excel</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleExport} className="gap-2 cursor-pointer">
            <FileDown className="w-4 h-4 text-orange-500" />
            <div>
              <p className="font-medium">Export .xlsx</p>
              <p className="text-xs text-muted-foreground">ดาวน์โหลดข้อมูลทั้งหมด</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
