/**
 * OTAPackages.tsx — จัดการ Package master data + Platform Prices
 * Mirror: Standard Daycation Database → Resource Library page
 * v3: dynamic platform rows (+ Add Platform), Export/Import XLSX
 */
import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, X, Check, Download, Upload, AlertCircle } from "lucide-react";
import { useOTAStore, OTAPackage, OTAPlatform, OTA_PLATFORMS } from "@/store/otaStore";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ── Color helpers ─────────────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  "Trip.com":     "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "KKday":        "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Agent Offline":"bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  "GetYourGuide": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "Viator":       "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "Airbnb":       "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
};
const fallbackColor = "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
const getPlatformColor = (p: string) => PLATFORM_COLORS[p] ?? fallbackColor;

// ── Export format ─────────────────────────────────────────────────────────────
const EXPORT_HEADERS = ["Code", "Name", ...OTA_PLATFORMS];

// ── Form row type (for dynamic platform list) ─────────────────────────────────
interface PriceRow { platform: string; price: number }

const defaultRows = (): PriceRow[] => OTA_PLATFORMS.map((pl) => ({ platform: pl, price: 0 }));

interface ImportError { row: number; message: string }

export default function OTAPackages() {
  const { packages, addPackage, updatePackage, deletePackage, getPackageByCode, seedDefaultPackages } = useOTAStore();
  const importRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm]         = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [code, setCode]                 = useState("");
  const [name, setName]                 = useState("");
  const [rows, setRows]                 = useState<PriceRow[]>(defaultRows());
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [showImportResult, setShowImportResult] = useState(false);
  const [importStats, setImportStats]   = useState({ added: 0, updated: 0, failed: 0 });

  // ── Row helpers ──────────────────────────────────────────────────────────────
  const updateRow = (i: number, field: keyof PriceRow, value: string | number) =>
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const addRow    = () => setRows((r) => [...r, { platform: "", price: 0 }]);

  // ── Open modal ────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setCode(""); setName(""); setRows(defaultRows()); setEditId(null); setShowForm(true);
  };
  const openEdit = (pkg: OTAPackage) => {
    setCode(pkg.code); setName(pkg.name);
    // Merge default platforms + any extra platforms saved in package
    const saved = pkg.platform_prices;
    const merged: PriceRow[] = OTA_PLATFORMS.map((pl) => ({
      platform: pl,
      price: saved.find((s) => s.platform === pl)?.price ?? 0,
    }));
    saved.forEach((s) => {
      if (!OTA_PLATFORMS.includes(s.platform as OTAPlatform)) {
        merged.push({ platform: s.platform, price: s.price });
      }
    });
    setRows(merged); setEditId(pkg.id); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) { toast.error("กรุณากรอก Package Code และ Package Name"); return; }
    const platform_prices = rows
      .filter((r) => r.platform.trim() && r.price > 0)
      .map((r) => ({ platform: r.platform.trim(), price: r.price }));
    const payload = { code: code.trim().toUpperCase(), name: name.trim(), platform_prices };
    if (editId) { await updatePackage(editId, payload); toast.success("แก้ไข Package สำเร็จ"); }
    else { await addPackage(payload); toast.success("เพิ่ม Package สำเร็จ"); }
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("ลบ Package นี้?")) { await deletePackage(id); toast.success("ลบ Package แล้ว"); }
  };

  // ── Export XLSX ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    const exportRows = packages.map((pkg) => {
      const priceMap: Record<string, number> = {};
      pkg.platform_prices.forEach((pp) => { priceMap[pp.platform] = pp.price; });
      return [pkg.code, pkg.name, ...OTA_PLATFORMS.map((pl) => priceMap[pl] ?? 0)];
    });
    const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...exportRows]);
    ws["!cols"] = [10, 40, ...OTA_PLATFORMS.map(() => 14)].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Packages");
    XLSX.writeFile(wb, "OTA_Packages.xlsx");
    toast.success(`Export ${packages.length} packages สำเร็จ`);
  };

  // ── Download Template ─────────────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const exampleRow = ["CMP", "Chiang Mai Ping River", 1200, 980, 0, 850, 1100, 0];
    const note = ["** ใส่ 0 หรือว่างเปล่า = ไม่มีราคา Platform นั้น"];
    const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, exampleRow, note]);
    ws["!cols"] = [10, 40, ...OTA_PLATFORMS.map(() => 14)].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Packages");
    XLSX.writeFile(wb, "OTA_Packages_Template.xlsx");
  };

  // ── Import XLSX ───────────────────────────────────────────────────────────────
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        const dataRows = allRows.slice(1).filter((r) => (r as unknown[]).some((c) => c !== ""));
        const errors: ImportError[] = [];
        let added = 0, updated = 0;
        dataRows.forEach((row, i) => {
          const rowNum = i + 2;
          const [pkgCode, pkgName, ...prices] = row as string[];
          if (!pkgCode || !pkgName) { errors.push({ row: rowNum, message: "Code และ Name ห้ามว่าง" }); return; }
          const platform_prices = OTA_PLATFORMS
            .map((pl, idx) => ({ platform: pl, price: parseFloat(String(prices[idx])) || 0 }))
            .filter((pp) => pp.price > 0);
          const existing = getPackageByCode(String(pkgCode));
          if (existing) {
            void updatePackage(existing.id, { code: String(pkgCode).toUpperCase(), name: String(pkgName), platform_prices });
            updated++;
          } else {
            void addPackage({ code: String(pkgCode).toUpperCase(), name: String(pkgName), platform_prices });
            added++;
          }
        });
        setImportStats({ added, updated, failed: errors.length });
        setImportErrors(errors);
        setShowImportResult(true);
        if (added + updated > 0) toast.success(`Import: เพิ่ม ${added} · อัปเดต ${updated} packages`);
        if (errors.length > 0) toast.error(`${errors.length} rows มีข้อผิดพลาด`);
      } catch {
        toast.error("ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบ format");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const fmtB = (n: number) => n > 0 ? `฿${n.toLocaleString("th-TH")}` : "-";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Resource Library</h1>
          <p className="text-muted-foreground text-sm">Manage tour packages and platform pricing</p>
        </div>
        <div className="flex gap-2">
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
          <button onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 border border-border hover:bg-muted px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Upload className="w-4 h-4" /> Import
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-2 border border-border hover:bg-muted px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Package
          </button>
        </div>
      </div>

      {/* Template hint */}
      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <button onClick={handleDownloadTemplate} className="text-purple-600 hover:underline flex items-center gap-1">
          <Download className="w-3 h-3" /> ดาวน์โหลด Import Template
        </button>
        <span>· Import จะ Add ใหม่ หรือ Update ถ้า Code ซ้ำ · รองรับ .xlsx / .xls / .csv</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium w-28">Package Code</th>
              <th className="text-left px-4 py-3 font-medium">Package Details</th>
              <th className="text-left px-4 py-3 font-medium">Platform Prices</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {packages.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12">
                  <p className="text-muted-foreground mb-3">ยังไม่มี Package</p>
                  <button
                    onClick={async () => { await seedDefaultPackages(); toast.success("โหลด Default Packages สำเร็จ"); }}
                    className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    โหลด Default Packages
                  </button>
                </td>
              </tr>
            ) : (
              packages.map((pkg) => (
                <tr key={pkg.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-base">{pkg.code}</span>
                  </td>
                  <td className="px-4 py-3"><span className="text-foreground">{pkg.name}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.platform_prices.map((pp) => (
                        <span key={pp.platform} className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPlatformColor(pp.platform)}`}>
                          {pp.platform} {fmtB(pp.price)}
                        </span>
                      ))}
                      {pkg.platform_prices.length === 0 && <span className="text-muted-foreground text-xs">ยังไม่มีราคา</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(pkg)} className="p-1.5 hover:bg-muted rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(pkg.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add/Edit Modal ──────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-bold text-lg">{editId ? "แก้ไข Package" : "เพิ่ม Package ใหม่"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Code */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Package Code *</label>
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="เช่น CMP, CMC"
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono uppercase" />
              </div>
              {/* Name */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Package Details *</label>
                <textarea value={name} onChange={(e) => setName(e.target.value)} placeholder="Describe the tour package..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
              </div>

              {/* Platform Prices — dynamic rows */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">Platform Prices</label>
                  <button onClick={addRow}
                    className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 px-2 py-1 rounded-lg transition-colors">
                    <Plus className="w-3 h-3" /> Add Platform
                  </button>
                </div>

                <div className="space-y-2">
                  {rows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {/* Platform name */}
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground block mb-0.5">Platform Name</label>
                        <input
                          value={row.platform}
                          onChange={(e) => updateRow(i, "platform", e.target.value)}
                          placeholder="Platform"
                          className="w-full px-2.5 py-1.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      {/* Price */}
                      <div className="w-28">
                        <label className="text-[10px] text-muted-foreground block mb-0.5">Price</label>
                        <input
                          type="number" min={0} value={row.price}
                          onChange={(e) => updateRow(i, "price", parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      {/* Delete row */}
                      <button onClick={() => removeRow(i)}
                        className="mt-4 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {rows.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-lg">
                      กด "+ Add Platform" เพื่อเพิ่มราคา
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-border sticky bottom-0 bg-card">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors">ยกเลิก</button>
              <button onClick={handleSubmit} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                <Check className="w-4 h-4" /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Result Modal ──────────────────────────────────────────────────── */}
      {showImportResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-lg">ผลการ Import</h2>
              <button onClick={() => setShowImportResult(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{importStats.added}</div>
                  <div className="text-xs text-green-600/80">เพิ่มใหม่</div>
                </div>
                <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{importStats.updated}</div>
                  <div className="text-xs text-blue-600/80">อัปเดต</div>
                </div>
                <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{importStats.failed}</div>
                  <div className="text-xs text-red-600/80">ผิดพลาด</div>
                </div>
              </div>
              {importErrors.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {importErrors.map((e, i) => (
                    <div key={i} className="flex gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Row {e.row}: {e.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-border">
              <button onClick={() => setShowImportResult(false)} className="w-full px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
