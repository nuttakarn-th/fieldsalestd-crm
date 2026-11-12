/**
 * MarketingPlanPage.tsx
 * Marketing Master Plan 2027 — Gantt Timeline + CRUD
 * Route: /marketing/plan
 * v394 — Detail drawer: คลิกชื่อ/แถวเพื่อดูรายละเอียดกิจกรรม
 */
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, Loader2,
  Filter, TrendingUp, AlertCircle, CheckCircle2,
  Clock, XCircle, BarChart2, X, Save, MoreHorizontal, ExternalLink,
} from "lucide-react";
import {
  useMarketingPlanStore,
  PlanItem, PlanItemInput, PlanSide, KpiType, ItemStatus,
} from "@/store/marketingPlanStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const DEPT_COLORS: Record<string, string> = {
  OB:  "bg-purple-200 text-purple-800",
  TK:  "bg-pink-200 text-pink-800",
  TRS: "bg-blue-200 text-blue-800",
  IB:  "bg-emerald-200 text-emerald-800",
  ORG: "bg-amber-200 text-amber-800",
};
const DEPT_BAR: Record<string, string> = {
  OB: "#cdb4db", TK: "#ffc8dd", TRS: "#cddafd", IB: "#b9e4d2", ORG: "#f8d6a6",
};
const STATUS_META: Record<ItemStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: "รอเริ่ม",        color: "bg-gray-100 text-gray-600 border-gray-200",    icon: <Clock className="w-3 h-3"/>        },
  in_progress: { label: "กำลังดำเนินการ", color: "bg-blue-100 text-blue-700 border-blue-200",    icon: <TrendingUp className="w-3 h-3"/>   },
  done:        { label: "เสร็จแล้ว",      color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="w-3 h-3"/> },
  cancelled:   { label: "ยกเลิก",         color: "bg-red-100 text-red-600 border-red-200",       icon: <XCircle className="w-3 h-3"/>      },
};
const KPI_MARK: Record<string, { label: string; color: string }> = {
  ok:  { label: "✓", color: "bg-emerald-100 text-emerald-700" },
  est: { label: "≈", color: "bg-amber-100 text-amber-700" },
  na:  { label: "?", color: "bg-gray-100 text-gray-500" },
};
const CURRENT_MONTH = new Date().getMonth(); // 0-based

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtBudget(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(n));
}
function fmtFull(n: number) {
  return Math.round(n).toLocaleString("th-TH");
}
function getBarGradient(depts: string[]): string {
  const cols = ["OB","TK","TRS","IB","ORG"].filter((d) => depts.includes(d)).map((d) => DEPT_BAR[d]);
  if (!cols.length) return "#e6e0ea";
  if (cols.length === 1) return cols[0];
  return `linear-gradient(90deg,${cols.map((c, i) => `${c} ${Math.round(i / (cols.length - 1) * 100)}%`).join(",")})`;
}
function computeSpans(mo: number[]): Array<{ start: number; end: number; total: number }> {
  const spans: Array<{ start: number; end: number; total: number }> = [];
  let i = 0;
  while (i < 12) {
    if (mo[i] > 0) {
      let j = i, total = 0;
      while (j < 12 && mo[j] > 0) { total += mo[j]; j++; }
      spans.push({ start: i, end: j - 1, total });
      i = j;
    } else { i++; }
  }
  return spans;
}

// ─── Dept Tag ────────────────────────────────────────────────────────────────
function DeptTag({ dept }: { dept: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${DEPT_COLORS[dept] ?? "bg-gray-100 text-gray-600"}`}>
      {dept}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, onChange }: { status: ItemStatus; onChange?: (s: ItemStatus) => void }) {
  const meta = STATUS_META[status];
  const all: ItemStatus[] = ["pending","in_progress","done","cancelled"];
  const [open, setOpen] = useState(false);
  if (!onChange) return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-semibold ${meta.color}`}>
      {meta.icon}{meta.label}
    </span>
  );
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-semibold cursor-pointer hover:opacity-80 transition-opacity ${meta.color}`}>
        {meta.icon}{meta.label}<ChevronDown className="w-2.5 h-2.5"/>
      </button>
      {open && (
        <div className="absolute z-20 left-0 top-6 bg-white border rounded-xl shadow-lg min-w-[130px] py-1">
          {all.map((s) => {
            const m = STATUS_META[s];
            return (
              <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors ${status === s ? "font-bold" : ""}`}>
                {m.icon}<span>{m.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Gantt Bar Cell ───────────────────────────────────────────────────────────
function GanttCell({ item, monthIndex, selectedMonth }: { item: PlanItem; monthIndex: number; selectedMonth: number | null }) {
  const ghostSpans = useMemo(() => item.gantt_spans ?? [], [item.gantt_spans]);
  const planned = item.monthly_amounts[monthIndex] ?? 0;
  const actual  = item.actual_amounts[monthIndex] ?? 0;

  const isCurrent  = monthIndex === CURRENT_MONTH;
  const isSelected = selectedMonth === monthIndex;
  const bg    = isSelected ? "bg-violet-50" : isCurrent ? "bg-amber-50/40" : "";
  const color = getBarGradient(item.departments);

  // ── Ghost spans: items with no budget but planned timeline ──
  if (ghostSpans.length > 0 && planned === 0 && actual === 0) {
    const ghostSpan    = ghostSpans.find((g) => g.s <= monthIndex && monthIndex <= g.e);
    const isGhostStart = !!ghostSpan && ghostSpan.s === monthIndex;
    const ghostColSpan = isGhostStart ? ghostSpan.e - ghostSpan.s + 1 : 1;
    if (!isGhostStart && ghostSpans.some((g) => g.s < monthIndex && monthIndex <= g.e)) return null;
    if (isGhostStart && ghostSpan) {
      return (
        <td colSpan={ghostColSpan} className={`px-1 py-1 border-r border-muted/20 ${bg}`} style={{ width: 52 * ghostColSpan }}>
          <div className="w-full h-5 rounded-full flex items-center justify-center border border-dashed border-muted/50 overflow-hidden"
               style={{ background: color, opacity: 0.35 }}>
            <span className="text-[8.5px] font-semibold text-gray-600 px-1 truncate">{ghostSpan.t}</span>
          </div>
        </td>
      );
    }
    return <td className={`border-r border-dashed border-muted/40 ${bg}`} style={{ width: 52 }}/>;
  }

  // ── Individual monthly cell ──
  if (planned === 0 && actual === 0) {
    return <td className={`border-r border-dashed border-muted/40 ${bg}`} style={{ width: 52 }}/>;
  }

  return (
    <td className={`px-0.5 py-1 border-r border-muted/20 ${bg}`} style={{ width: 52 }}>
      {planned > 0 && (
        <div className="w-full h-5 rounded-md flex items-center justify-center overflow-hidden" style={{ background: color, opacity: 0.85 }}>
          <span className="text-[9px] font-bold text-gray-700 truncate px-0.5">{fmtBudget(planned)}</span>
        </div>
      )}
      {actual > 0 && (
        <div className={`w-full h-1 rounded-full bg-emerald-400/70 ${planned > 0 ? "mt-0.5" : "mt-2"}`} title={`จริง ฿${fmtFull(actual)}`}/>
      )}
    </td>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────
const EMPTY_FORM: Partial<PlanItemInput> = {
  year: 2027, side: "off", level: 3, parent_id: null, sort_order: 0,
  title: "", subtitle: "", description: "", departments: [],
  budget: 0, kpi: "", kpi_type: "est", status: "pending",
  owner: "", is_new: false, is_na: false,
  monthly_amounts: Array(12).fill(0), actual_amounts: Array(12).fill(0),
};

function PlanItemFormModal({
  initial, parents, onSave, onClose, onDelete,
}: {
  initial?: PlanItem | null;
  parents: PlanItem[];
  onSave: (data: PlanItemInput) => Promise<void>;
  onClose: () => void;
  onDelete?: (id: string) => void;
}) {
  const [form, setForm]             = useState<Partial<PlanItemInput>>({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving]         = useState(false);
  const [tab, setTab]               = useState<"basic"|"months"|"actual">("basic");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const set = (k: keyof PlanItemInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const toggleDept = (d: string) => {
    const cur = form.departments ?? [];
    set("departments", cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]);
  };
  const setMonth = (i: number, v: string) => {
    const mo = [...(form.monthly_amounts ?? Array(12).fill(0))];
    mo[i] = Number(v.replace(/,/g, "")) || 0;
    set("monthly_amounts", mo);
  };
  const setActual = (i: number, v: string) => {
    const ac = [...(form.actual_amounts ?? Array(12).fill(0))];
    ac[i] = Number(v.replace(/,/g, "")) || 0;
    set("actual_amounts", ac);
  };
  const handleSave = async () => {
    if (!form.title?.trim()) return;
    setSaving(true);
    await onSave(form as PlanItemInput);
    setSaving(false);
    onClose();
  };

  const availableParents = parents.filter((p) => p.level === (form.level === 3 ? 2 : 1) && p.side === form.side);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-base">{initial ? "แก้ไขกิจกรรม" : "เพิ่มกิจกรรมใหม่"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-4 h-4"/></button>
        </div>
        <div className="flex border-b px-4">
          {(["basic","months","actual"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${tab === t ? "border-violet-600 text-violet-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t === "basic" ? "ข้อมูลทั่วไป" : t === "months" ? "งบรายเดือน (แผน)" : "งบรายเดือน (จริง)"}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {tab === "basic" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">ประเภท</label>
                  <select value={form.side} onChange={(e) => set("side", e.target.value as PlanSide)}
                    className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:outline-none">
                    <option value="off">Offline</option><option value="on">Online</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">ระดับ</label>
                  <select value={form.level} onChange={(e) => set("level", Number(e.target.value))}
                    className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:outline-none">
                    <option value={1}>L1 · หัวข้อใหญ่</option>
                    <option value={2}>L2 · หัวข้อกลาง</option>
                    <option value={3}>L3 · กิจกรรม</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">ลำดับ</label>
                  <input type="number" value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))}
                    className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:outline-none"/>
                </div>
              </div>
              {form.level !== 1 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">หัวข้อแม่ (Parent)</label>
                  <select value={form.parent_id ?? ""} onChange={(e) => set("parent_id", e.target.value || null)}
                    className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:outline-none">
                    <option value="">— ไม่ระบุ —</option>
                    {availableParents.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">ชื่อกิจกรรม / Campaign *</label>
                <input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)}
                  className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:outline-none" placeholder="ชื่อกิจกรรม"/>
              </div>
              {form.level === 1 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">คำอธิบายย่อ (Subtitle)</label>
                  <input value={form.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)}
                    className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:outline-none" placeholder="คำอธิบายย่อ"/>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">รายละเอียด</label>
                <textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} rows={2}
                  className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:outline-none resize-none" placeholder="รายละเอียดกิจกรรม"/>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">แผนก</label>
                <div className="flex flex-wrap gap-2">
                  {["OB","TK","TRS","IB","ORG"].map((d) => (
                    <button key={d} onClick={() => toggleDept(d)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${(form.departments ?? []).includes(d) ? "bg-violet-600 text-white border-violet-600" : "bg-background border-muted-foreground/30 text-muted-foreground hover:border-violet-400"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">งบประมาณ (฿)</label>
                  <input type="number" value={form.budget} onChange={(e) => set("budget", Number(e.target.value))}
                    className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:outline-none"/>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">KPI Type</label>
                  <select value={form.kpi_type ?? "est"} onChange={(e) => set("kpi_type", e.target.value as KpiType)}
                    className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:outline-none">
                    <option value="ok">✓ จากไฟล์ (ok)</option>
                    <option value="est">≈ ข้อเสนอ (est)</option>
                    <option value="na">? รอข้อมูล (na)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">KPI / เป้าหมาย</label>
                <input value={form.kpi ?? ""} onChange={(e) => set("kpi", e.target.value)}
                  className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:outline-none" placeholder="เป้าหมาย เช่น ≥200 ครั้ง/ปี"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">สถานะ</label>
                  <select value={form.status} onChange={(e) => set("status", e.target.value as ItemStatus)}
                    className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:outline-none">
                    {(Object.entries(STATUS_META) as [ItemStatus, typeof STATUS_META[ItemStatus]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">ผู้รับผิดชอบ</label>
                  <input value={form.owner ?? ""} onChange={(e) => set("owner", e.target.value)}
                    className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:outline-none" placeholder="ชื่อทีม / บุคคล"/>
                </div>
              </div>
              <div className="flex gap-4">
                {[["is_new","กิจกรรมใหม่"],["is_na","ซ้อนในงบอื่น (ไม่นับงบ)"]].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={!!(form as Record<string, unknown>)[k]} onChange={(e) => set(k as keyof PlanItemInput, e.target.checked)} className="rounded border-muted"/>
                    {label}
                  </label>
                ))}
              </div>
              {["wait_note","warn_note","unscheduled_note"].map((f) => (
                <div key={f}>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {f === "wait_note" ? "หมายเหตุรอข้อมูล" : f === "warn_note" ? "คำเตือน ⚠" : "หมายเหตุ (ไม่ลงเดือน)"}
                  </label>
                  <input value={(form as Record<string,unknown>)[f] as string ?? ""} onChange={(e) => set(f as keyof PlanItemInput, e.target.value)}
                    className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:outline-none"/>
                </div>
              ))}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">แผนดำเนินงาน / ขั้นตอนหลังอนุมัติ</label>
                <textarea value={form.action_plan ?? ""} onChange={(e) => set("action_plan", e.target.value)} rows={5}
                  className="w-full rounded-lg border bg-background text-sm px-3 py-2 focus:ring-2 focus:ring-violet-400 focus:outline-none resize-none font-mono"
                  placeholder={"ม.ค. · ชื่อขั้นตอน\nรายละเอียด\n\nก.พ. · ขั้นตอนถัดไป\nรายละเอียด"}/>
                <p className="text-[10px] text-muted-foreground mt-1">พิมพ์เป็น: ช่วงเวลา · ชื่อขั้นตอน ขึ้นบรรทัดใหม่ รายละเอียด · คั่นแต่ละขั้นด้วยบรรทัดว่าง</p>
              </div>
            </>
          )}
          {tab === "months" && (
            <div>
              <p className="text-xs text-muted-foreground mb-3">งบประมาณแผน (Plan) แยกรายเดือน — รวม = ฿{fmtFull((form.monthly_amounts ?? []).reduce((a, b) => a + b, 0))}</p>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((m, i) => (
                  <div key={i}>
                    <label className="text-[10px] text-muted-foreground mb-0.5 block">{m}</label>
                    <input type="number" value={form.monthly_amounts?.[i] ?? 0} onChange={(e) => setMonth(i, e.target.value)}
                      className="w-full rounded-lg border bg-background text-sm px-2 py-1.5 focus:ring-2 focus:ring-violet-400 focus:outline-none"/>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === "actual" && (
            <div>
              <p className="text-xs text-muted-foreground mb-3">งบที่ใช้จริง (Actual) แยกรายเดือน — รวม = ฿{fmtFull((form.actual_amounts ?? []).reduce((a, b) => a + b, 0))}</p>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((m, i) => (
                  <div key={i}>
                    <label className="text-[10px] text-muted-foreground mb-0.5 block">{m}{i === CURRENT_MONTH ? " (ปัจจุบัน)" : ""}</label>
                    <input type="number" value={form.actual_amounts?.[i] ?? 0} onChange={(e) => setActual(i, e.target.value)}
                      className="w-full rounded-lg border bg-background text-sm px-2 py-1.5 focus:ring-2 focus:ring-violet-400 focus:outline-none"/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {confirmingDelete ? (
          /* ── Layer 1: in-modal delete confirmation ── */
          <div className="flex flex-col gap-3 p-4 border-t bg-red-50 dark:bg-red-950/20 rounded-b-2xl">
            <div className="flex items-start gap-2 text-red-600">
              <Trash2 className="w-4 h-4 shrink-0 mt-0.5"/>
              <span className="text-sm font-medium">ลบ "{form.title}" ถาวร ไม่สามารถกู้คืนได้</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmingDelete(false)}
                className="flex-1 py-2 rounded-xl border text-sm hover:bg-muted transition-colors">
                ยกเลิก
              </button>
              <button
                onClick={() => { onDelete?.(initial!.id); setConfirmingDelete(false); }}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4"/> ยืนยันลบ
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 p-4 border-t">
            {initial?.id && (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="py-2 px-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-sm transition-colors flex items-center gap-1.5">
                <Trash2 className="w-4 h-4"/> ลบ
              </button>
            )}
            <button onClick={onClose} className="flex-1 py-2 rounded-xl border text-sm hover:bg-muted transition-colors">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving || !form.title?.trim()}
              className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────
function SummaryCards({ items }: { items: PlanItem[] }) {
  const l3          = items.filter((x) => x.level === 3);
  const totalBudget = l3.reduce((a, x) => a + (x.is_na ? 0 : x.budget), 0);
  const offBudget   = l3.filter((x) => x.side === "off").reduce((a, x) => a + x.budget, 0);
  const onBudget    = l3.filter((x) => x.side === "on").reduce((a, x) => a + x.budget, 0);
  const totalActual = l3.reduce((a, x) => a + x.actual_amounts.reduce((b, v) => b + v, 0), 0);
  const doneCount   = l3.filter((x) => x.status === "done").length;
  const pendingZero = l3.filter((x) => x.budget === 0 && !x.is_na).length;

  const cards = [
    { label: "งบรวม 2570",   value: `฿${fmtFull(totalBudget)}`, sub: `ใช้จริง ฿${fmtFull(totalActual)} (${totalBudget ? Math.round(totalActual/totalBudget*100) : 0}%)`, color: "bg-gradient-to-br from-violet-500 to-purple-600", textColor: "text-white" },
    { label: "Offline",       value: `฿${fmtFull(offBudget)}`,   sub: `${totalBudget ? Math.round(offBudget/totalBudget*100) : 0}% ของงบรวม`,   color: "bg-card", textColor: "" },
    { label: "Online",        value: `฿${fmtFull(onBudget)}`,    sub: `${totalBudget ? Math.round(onBudget/totalBudget*100) : 0}% ของงบรวม`,    color: "bg-card", textColor: "" },
    { label: "เสร็จแล้ว",    value: `${doneCount} / ${l3.length}`, sub: "กิจกรรม L3",    color: "bg-card", textColor: "" },
    { label: "รอข้อมูลงบ",   value: String(pendingZero),         sub: "รายการงบ 0 ฿",    color: "bg-card", textColor: "" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      {cards.map((c) => (
        <div key={c.label} className={`${c.color} border rounded-2xl p-3 shadow-sm`}>
          <p className={`text-[11px] mb-1 ${c.textColor || "text-muted-foreground"}`}>{c.label}</p>
          <p className={`text-lg font-bold leading-none mb-1 ${c.textColor || "text-foreground"}`}>{c.value}</p>
          <p className={`text-[10px] ${c.textColor ? "text-white/70" : "text-muted-foreground"}`}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Filter Dropdown ──────────────────────────────────────────────────────────
function FilterDropdown({ label, activeCount, children }: {
  label: string;
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors
          ${activeCount > 0
            ? "bg-violet-600 text-white border-violet-600"
            : "bg-background border-muted-foreground/30 text-muted-foreground hover:border-violet-400"}`}>
        {label}
        {activeCount > 0 && (
          <span className="bg-white/30 rounded-full text-[9px] font-bold w-4 h-4 flex items-center justify-center">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}/>
      </button>
      {open && (
        <div className="absolute z-30 top-full mt-1.5 left-0 bg-background border rounded-xl shadow-lg min-w-[160px] py-1.5">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({
  item,
  onClose,
  onEdit,
}: {
  item: PlanItem | null;
  onClose: () => void;
  onEdit: (item: PlanItem) => void;
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const isOpen = !!item;
  const totalPlan   = item ? item.monthly_amounts.reduce((a, b) => a + b, 0) : 0;
  const totalActual = item ? item.actual_amounts.reduce((a, b) => a + b, 0)  : 0;
  const pct = totalPlan > 0 ? Math.round(totalActual / totalPlan * 100) : 0;
  const maxBar = item ? Math.max(...item.monthly_amounts, ...item.actual_amounts, 1) : 1;

  const deptColor = (d: string) => DEPT_BAR[d] ?? "#e6e0ea";

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full z-50 flex flex-col bg-[#fff9f4] border-l border-muted shadow-2xl transition-transform duration-200 ease-out`}
        style={{ width: "min(460px, 100vw)", transform: isOpen ? "translateX(0)" : "translateX(105%)" }}>

        {!item ? null : (
          <>
            {/* Header */}
            <div className="p-5 pb-4 border-b border-muted/60 relative">
              <p className="text-[11px] text-muted-foreground mb-1">
                {item.side === "off" ? "OFFLINE" : "ONLINE"} · {item.departments.join(" · ")}
              </p>
              <h3 className="text-lg font-bold leading-snug text-foreground pr-8">{item.title}</h3>
              {/* dept color strip */}
              <div className="flex gap-1 mt-2.5 h-1.5">
                {item.departments.map((d) => (
                  <div key={d} className="flex-1 rounded-full" style={{ background: deptColor(d) }}/>
                ))}
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {item.departments.map((d) => <DeptTag key={d} dept={d}/>)}
                <StatusBadge status={item.status}/>
                {item.is_new && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">ใหม่</span>
                )}
              </div>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                <X className="w-4 h-4"/>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* KV: Budget + KPI */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background border rounded-xl p-3">
                  <span className="text-[11px] text-muted-foreground block mb-0.5">งบประมาณ (แผน)</span>
                  <span className="text-lg font-bold text-foreground">
                    {item.is_na ? "ซ้อนในงบอื่น" : item.budget > 0 ? `฿${Math.round(item.budget).toLocaleString("th-TH")}` : "รอข้อมูล"}
                  </span>
                </div>
                <div className="bg-background border rounded-xl p-3">
                  <span className="text-[11px] text-muted-foreground block mb-0.5">ใช้จริงสะสม</span>
                  <span className="text-lg font-bold text-foreground">
                    {totalActual > 0 ? `฿${Math.round(totalActual).toLocaleString("th-TH")}` : "—"}
                    {totalActual > 0 && totalPlan > 0 && (
                      <span className="text-xs font-normal text-muted-foreground ml-1.5">({pct}%)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* KPI */}
              {item.kpi && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">KPI / เป้าหมาย</p>
                  <p className="text-sm text-foreground leading-relaxed bg-violet-50 rounded-xl p-3 border border-violet-100">{item.kpi}</p>
                </div>
              )}

              {/* Description */}
              {item.description && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">รายละเอียด</p>
                  <p className="text-sm leading-relaxed text-foreground">{item.description}</p>
                </div>
              )}

              {/* Owner */}
              {item.owner && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-[11px] font-semibold uppercase tracking-wide">ผู้รับผิดชอบ:</span>
                  <span className="text-foreground font-medium">{item.owner}</span>
                </div>
              )}

              {/* Notes */}
              {item.wait_note && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-800">
                  ⏳ <span className="font-semibold">รอข้อมูล:</span> {item.wait_note}
                </div>
              )}
              {item.warn_note && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
                  ⚠ <span className="font-semibold">คำเตือน:</span> {item.warn_note}
                </div>
              )}
              {item.unscheduled_note && (
                <div className="bg-muted/60 border border-muted rounded-xl p-3 text-sm text-muted-foreground">
                  📌 {item.unscheduled_note}
                </div>
              )}

              {/* Action Plan */}
              {item.action_plan && (() => {
                const steps = item.action_plan
                  .split(/\n\s*\n/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((block) => {
                    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
                    const firstLine = lines[0] ?? "";
                    const sepIdx = firstLine.indexOf(" · ");
                    const period = sepIdx >= 0 ? firstLine.slice(0, sepIdx) : "";
                    const title  = sepIdx >= 0 ? firstLine.slice(sepIdx + 3) : firstLine;
                    const detail = lines.slice(1).join(" · ");
                    return { period, title, detail };
                  });
                return (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold tracking-wide text-blue-600 uppercase">ขั้นตอนหลังอนุมัติ</p>
                    <div className="space-y-2">
                      {steps.map((step, i) => (
                        <div key={i} className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-3">
                          {step.period && (
                            <div className="shrink-0 mt-0.5">
                              <span className="text-[9px] font-bold text-blue-500 bg-blue-100 rounded px-1.5 py-0.5 whitespace-nowrap">{step.period}</span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-foreground leading-snug">{step.title}</p>
                            {step.detail && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.detail}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Monthly budget table */}
              {totalPlan > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">งบรายเดือน</p>
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/40">
                          <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground w-14">เดือน</th>
                          <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground">งบแผน (฿)</th>
                          <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground">ใช้จริง (฿)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MONTHS.map((m, i) => {
                          const plan   = item.monthly_amounts[i] ?? 0;
                          const actual = item.actual_amounts[i] ?? 0;
                          if (plan === 0 && actual === 0) return null;
                          const isHigh = plan === Math.max(...item.monthly_amounts);
                          return (
                            <tr key={i} className={`border-t border-muted/30 ${isHigh ? "bg-violet-50/50" : ""}`}>
                              <td className="px-3 py-1.5 font-medium text-muted-foreground">{m}</td>
                              <td className="px-3 py-1.5 text-right font-semibold tabular-nums">
                                {plan > 0 ? Math.round(plan).toLocaleString("th-TH") : "—"}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-emerald-600">
                                {actual > 0 ? Math.round(actual).toLocaleString("th-TH") : "—"}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="border-t-2 border-muted/50 bg-muted/20">
                          <td className="px-3 py-1.5 font-bold text-muted-foreground">รวม</td>
                          <td className="px-3 py-1.5 text-right font-bold tabular-nums">{Math.round(totalPlan).toLocaleString("th-TH")}</td>
                          <td className="px-3 py-1.5 text-right font-bold tabular-nums text-emerald-600">
                            {totalActual > 0 ? Math.round(totalActual).toLocaleString("th-TH") : "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex gap-2">
              <button
                onClick={() => { onEdit(item); onClose(); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                <Pencil className="w-3.5 h-3.5"/> แก้ไข
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded-xl border hover:bg-muted text-sm transition-colors">
                ปิด
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MarketingPlanPage() {
  const { items, loading, error, fetchAll, createItem, updateItem, deleteItem, updateStatus } = useMarketingPlanStore();

  const [filterSide,   setFilterSide]   = useState<"all"|"off"|"on">("all");
  const [filterDepts,  setFilterDepts]  = useState<Set<string>>(new Set());
  const [filterMonth,  setFilterMonth]  = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<ItemStatus | "all">("all");
  const [collapsed,    setCollapsed]    = useState<Set<string>>(new Set());
  const [modal,             setModal]             = useState<{ mode: "create"|"edit"; item?: PlanItem } | null>(null);
  const [deleting,          setDeleting]          = useState<string | null>(null);
  const [deletingChildCount, setDeletingChildCount] = useState<number>(0);

  // ── Action menu (3-dot, fixed position to avoid overflow clip) ──────────────
  const [actionMenu,    setActionMenu]    = useState<string | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [selectedItem,  setSelectedItem]  = useState<PlanItem | null>(null);

  useEffect(() => {
    const handler = () => { setActionMenu(null); setActionMenuPos(null); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Build hierarchy
  const { l1s, l2Map, l3Map } = useMemo(() => {
    const l1s = items.filter((x) => x.level === 1).sort((a, b) => a.sort_order - b.sort_order);
    const l2Map = new Map<string, PlanItem[]>();
    const l3Map = new Map<string, PlanItem[]>();
    items.filter((x) => x.level === 2).forEach((x) => {
      if (!x.parent_id) return;
      const arr = l2Map.get(x.parent_id) ?? [];
      arr.push(x); l2Map.set(x.parent_id, arr.sort((a, b) => a.sort_order - b.sort_order));
    });
    items.filter((x) => x.level === 3).forEach((x) => {
      if (!x.parent_id) return;
      const arr = l3Map.get(x.parent_id) ?? [];
      arr.push(x); l3Map.set(x.parent_id, arr.sort((a, b) => a.sort_order - b.sort_order));
    });
    return { l1s, l2Map, l3Map };
  }, [items]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleDeptFilter = (d: string) => {
    setFilterDepts((prev) => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n; });
  };

  const passesFilter = useCallback((item: PlanItem): boolean => {
    if (filterSide !== "all" && item.side !== filterSide) return false;
    if (filterDepts.size > 0 && !item.departments.some((d) => filterDepts.has(d))) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterMonth !== null) {
      const mo = item.monthly_amounts ?? [];
      if (mo[filterMonth] <= 0 && !(item.budget === 0 && item.unscheduled_note)) return false;
    }
    return true;
  }, [filterSide, filterDepts, filterStatus, filterMonth]);

  const monthTotals = useMemo(() =>
    Array(12).fill(0).map((_, i) =>
      items.filter((x) => x.level === 3 && !x.is_na).reduce((a, x) => a + (x.monthly_amounts[i] ?? 0), 0)
    ), [items]);

  const monthActuals = useMemo(() =>
    Array(12).fill(0).map((_, i) =>
      items.filter((x) => x.level === 3).reduce((a, x) => a + (x.actual_amounts[i] ?? 0), 0)
    ), [items]);

  const parentItems = items.filter((x) => x.level <= 2);

  const handleSave = async (data: PlanItemInput) => {
    if (modal?.mode === "edit" && modal.item) {
      await updateItem(modal.item.id, data);
    } else {
      await createItem(data);
    }
    setModal(null);
  };

  const confirmDelete = async () => {
    if (deleting) { await deleteItem(deleting); setDeleting(null); setDeletingChildCount(0); }
  };

  const handleDeleteRequest = (itemId: string) => {
    const childCount = items.filter((i) => i.parent_id === itemId).length;
    setDeletingChildCount(childCount);
    setDeleting(itemId);
    setModal(null); // close edit modal first
  };

  const hasFilter = filterDepts.size > 0 || filterSide !== "all" || filterStatus !== "all" || filterMonth !== null;
  const clearAll  = () => { setFilterDepts(new Set()); setFilterSide("all"); setFilterStatus("all"); setFilterMonth(null); };

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500"/>
        <p className="text-sm">กำลังโหลดแผนการตลาด...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-full pb-10 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <BarChart2 className="w-5 h-5 text-white"/>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Marketing Master Plan</h1>
            <p className="text-xs text-muted-foreground">ปี 2570 · Offline + Online · Gantt Timeline</p>
          </div>
        </div>
        <button onClick={() => setModal({ mode: "create" })}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4"/> เพิ่มกิจกรรม
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0"/>{error}
        </div>
      )}

      <SummaryCards items={items}/>

      {/* ── Filter Bar (compact) ─────────────────────────────────────────────── */}
      <div className="bg-card border rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5"/>Filter
        </span>

        {/* Side toggle */}
        <div className="flex rounded-lg border overflow-hidden">
          {(["all","off","on"] as const).map((s) => (
            <button key={s} onClick={() => setFilterSide(s)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors border-r last:border-r-0
                ${filterSide === s ? "bg-violet-600 text-white" : "text-muted-foreground hover:bg-muted"}`}>
              {s === "all" ? "ทั้งหมด" : s === "off" ? "Offline" : "Online"}
            </button>
          ))}
        </div>

        <span className="w-px h-5 bg-border"/>

        {/* Dept dropdown */}
        <FilterDropdown label="แผนก" activeCount={filterDepts.size}>
          {["OB","TK","TRS","IB","ORG"].map((d) => (
            <button key={d} onClick={(e) => { e.stopPropagation(); toggleDeptFilter(d); }}
              className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border flex-shrink-0
                ${filterDepts.has(d) ? "bg-violet-600 border-violet-600" : "border-muted-foreground/40"}`}>
                {filterDepts.has(d) && <span className="w-2 h-1.5 rounded-sm bg-white block"/>}
              </span>
              <DeptTag dept={d}/>
              <span className="text-muted-foreground">{d}</span>
            </button>
          ))}
          {filterDepts.size > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setFilterDepts(new Set()); }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-muted border-t mt-0.5 pt-1.5">
              ล้างทั้งหมด
            </button>
          )}
        </FilterDropdown>

        {/* Status dropdown */}
        <FilterDropdown
          label={filterStatus === "all" ? "สถานะ" : STATUS_META[filterStatus as ItemStatus].label}
          activeCount={filterStatus !== "all" ? 1 : 0}>
          {(["all","pending","in_progress","done","cancelled"] as const).map((s) => (
            <button key={s} onClick={(e) => { e.stopPropagation(); setFilterStatus(s); }}
              className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors
                ${filterStatus === s ? "font-semibold text-violet-700" : ""}`}>
              {s === "all"
                ? <span className="text-muted-foreground">ทุกสถานะ</span>
                : <><span className="flex-shrink-0">{STATUS_META[s].icon}</span><span>{STATUS_META[s].label}</span></>
              }
            </button>
          ))}
        </FilterDropdown>

        {/* Month filter pill (shown when active) */}
        {filterMonth !== null && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold">
            {MONTHS[filterMonth]}
            <button onClick={() => setFilterMonth(null)} className="ml-0.5 hover:text-amber-900">
              <X className="w-3 h-3"/>
            </button>
          </span>
        )}

        {hasFilter && (
          <button onClick={clearAll}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-muted border border-dashed">
            <X className="w-3 h-3"/> ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* ── Gantt Table ─────────────────────────────────────────────────────── */}
      <div className="border rounded-2xl bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 1100 }}>
            <thead>
              {/* Quarter row */}
              <tr className="bg-muted/60">
                <th className="sticky left-0 z-10 bg-muted/60 text-left px-4 py-2 text-xs font-bold text-muted-foreground" colSpan={5}>
                  กิจกรรม / Campaign · ปี 2570
                </th>
                {["Q1 (ม.ค.–มี.ค.)","Q2 (เม.ย.–มิ.ย.)","Q3 (ก.ค.–ก.ย.)","Q4 (ต.ค.–ธ.ค.)"].map((q) => (
                  <th key={q} colSpan={3} className="text-center py-2 text-xs font-bold text-muted-foreground border-l border-muted/40">{q}</th>
                ))}
              </tr>
              {/* Month row */}
              <tr className="bg-muted/40">
                <th className="sticky left-0 z-10 bg-muted/40 text-left px-4 py-2 text-xs font-semibold w-72">กิจกรรม</th>
                <th className="text-center py-2 text-xs font-semibold w-28">แผนก</th>
                <th className="text-center py-2 text-xs font-semibold w-20">สถานะ</th>
                <th className="text-right px-3 py-2 text-xs font-semibold w-20">งบ (฿)</th>
                <th className="w-10 border-l border-muted/40"/>
                {MONTHS.map((m, i) => (
                  <th key={i} onClick={() => setFilterMonth(filterMonth === i ? null : i)}
                    className={`text-center py-2 text-xs font-semibold cursor-pointer hover:bg-violet-100 transition-colors border-l border-muted/40
                      ${filterMonth === i ? "bg-violet-600 text-white" : i === CURRENT_MONTH ? "bg-amber-100 text-amber-800" : ""}`}
                    style={{ width: 52 }} title={`คลิกเพื่อกรองเดือน ${m}`}>
                    {m}
                  </th>
                ))}
              </tr>
              {/* Budget per month */}
              <tr className="border-b border-muted/40 bg-violet-50/60">
                <td className="sticky left-0 z-10 bg-violet-50 px-4 py-1.5 text-[10px] text-muted-foreground font-semibold" colSpan={5}>
                  งบแผนรวมต่อเดือน
                </td>
                {monthTotals.map((v, i) => (
                  <td key={i} className={`text-center py-1.5 text-[9px] font-bold border-l border-muted/20
                    ${filterMonth === i ? "bg-violet-100 text-violet-700" : i === CURRENT_MONTH ? "bg-amber-50 text-amber-700" : "text-muted-foreground"}`}>
                    {v > 0 ? `฿${fmtBudget(v)}` : "—"}
                  </td>
                ))}
              </tr>
            </thead>

            <tbody>
              {l1s.map((l1) => {
                if (filterSide !== "all" && l1.side !== filterSide) return null;
                const l2s = l2Map.get(l1.id) ?? [];
                const l1Visible = l2s.some((l2) => (l3Map.get(l2.id) ?? []).some(passesFilter));
                if (!l1Visible) return null;
                const l1Collapsed = collapsed.has(l1.id);
                const l1Color = l1.side === "off" ? "bg-[#4a3a58] text-white" : "bg-[#3a4566] text-white";

                return (
                  <>
                    {/* L1 Row */}
                    <tr key={l1.id} className={`${l1Color} cursor-pointer hover:opacity-90 transition-opacity`}
                      onClick={() => toggleCollapse(l1.id)}>
                      <td className={`sticky left-0 z-[2] ${l1Color} px-4 py-2.5`} colSpan={4}>
                        <div className="flex items-center gap-2">
                          {l1Collapsed ? <ChevronRight className="w-4 h-4 opacity-70"/> : <ChevronDown className="w-4 h-4 opacity-70"/>}
                          <span className="font-bold text-sm">{l1.title}</span>
                          {l1.subtitle && <span className="text-[11px] opacity-70">· {l1.subtitle}</span>}
                        </div>
                      </td>
                      <td className="border-l border-white/10"/>
                      {MONTHS.map((_, i) => {
                        const mo = (l2Map.get(l1.id) ?? []).flatMap((l2) => l3Map.get(l2.id) ?? [])
                          .reduce((a, x) => a + (x.monthly_amounts[i] ?? 0), 0);
                        return (
                          <td key={i} className="text-center py-2 text-[10px] font-semibold opacity-80 border-l border-white/10" style={{ width: 52 }}>
                            {mo > 0 ? `฿${fmtBudget(mo)}` : ""}
                          </td>
                        );
                      })}
                    </tr>

                    {!l1Collapsed && l2s.map((l2) => {
                      const l3s = (l3Map.get(l2.id) ?? []).filter(passesFilter);
                      if (l3s.length === 0) return null;
                      const l2Collapsed = collapsed.has(l2.id);
                      const l2Budget = l3s.reduce((a, x) => a + (x.is_na ? 0 : x.budget), 0);

                      return (
                        <>
                          {/* L2 Row */}
                          <tr key={l2.id}
                            className="bg-violet-50 dark:bg-violet-900/20 cursor-pointer hover:bg-violet-100/60 transition-colors"
                            onClick={() => toggleCollapse(l2.id)}>
                            <td className="sticky left-0 z-[2] bg-violet-50 dark:bg-violet-900/20 px-6 py-2 text-xs font-bold text-violet-800 dark:text-violet-200" colSpan={2}>
                              <div className="flex items-center gap-1.5">
                                {l2Collapsed ? <ChevronRight className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
                                {l2.title}
                              </div>
                            </td>
                            <td className="text-center py-2 text-[10px] text-violet-600"/>
                            <td className="text-right px-3 py-2 text-xs font-bold text-violet-700">
                              {l2Budget > 0 ? `฿${fmtFull(l2Budget)}` : "—"}
                            </td>
                            <td className="bg-violet-50 dark:bg-violet-900/20"/>
                            {MONTHS.map((_, i) => {
                              const mo = l3s.reduce((a, x) => a + (x.monthly_amounts[i] ?? 0), 0);
                              return (
                                <td key={i} className="text-center py-2 text-[9px] font-semibold text-violet-600 border-l border-violet-100 dark:border-violet-800" style={{ width: 52 }}>
                                  {mo > 0 ? `฿${fmtBudget(mo)}` : ""}
                                </td>
                              );
                            })}
                          </tr>

                          {/* L3 Rows */}
                          {!l2Collapsed && l3s.map((l3) => (
                            <tr
                              key={l3.id}
                              className="hover:bg-muted/30 transition-colors border-b border-muted/30 group cursor-pointer"
                              onClick={() => setSelectedItem(l3)}>
                              {/* Activity name — sticky */}
                              <td className="sticky left-0 z-[2] bg-background group-hover:bg-muted/30 px-8 py-2 text-xs transition-colors" style={{ maxWidth: 288 }}>
                                <div className="flex items-start gap-1">
                                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5"/>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-foreground leading-snug truncate hover:text-violet-700 hover:underline" title={l3.title}>
                                      {l3.title}
                                      {l3.is_new && <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-700">ใหม่</span>}
                                      {l3.warn_note && <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-700">⚠</span>}
                                    </div>
                                    {l3.description && <div className="text-[10px] text-muted-foreground leading-snug mt-0.5 truncate">{l3.description}</div>}
                                    {l3.wait_note && <div className="text-[10px] text-orange-500 mt-0.5">⏳ {l3.wait_note}</div>}
                                  </div>
                                </div>
                              </td>
                              {/* Dept */}
                              <td className="text-center py-2 px-1">
                                <div className="flex flex-wrap gap-0.5 justify-center">
                                  {l3.departments.map((d) => <DeptTag key={d} dept={d}/>)}
                                </div>
                              </td>
                              {/* Status */}
                              <td className="text-center py-2 px-1">
                                <StatusBadge status={l3.status} onChange={(s) => updateStatus(l3.id, s)}/>
                              </td>
                              {/* Budget */}
                              <td className="text-right px-3 py-2 text-xs font-semibold">
                                {l3.is_na ? (
                                  <span className="text-muted-foreground text-[10px]">ซ้อนในงบ</span>
                                ) : l3.budget > 0 ? (
                                  <span>฿{fmtFull(l3.budget)}</span>
                                ) : (
                                  <span className="text-orange-500 text-[10px]">{l3.wait_note ?? "รอข้อมูล"}</span>
                                )}
                                {l3.kpi_type && (
                                  <span className={`ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${KPI_MARK[l3.kpi_type]?.color}`}>
                                    {KPI_MARK[l3.kpi_type]?.label}
                                  </span>
                                )}
                              </td>
                              {/* 3-dot action menu */}
                              <td className="px-1 py-1 w-10 border-l border-muted/20 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (actionMenu === l3.id) { setActionMenu(null); setActionMenuPos(null); return; }
                                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                    setActionMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                    setActionMenu(l3.id);
                                  }}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground mx-auto"
                                  title="แก้ไข / ลบ">
                                  <MoreHorizontal className="w-4 h-4"/>
                                </button>
                              </td>
                              {/* Month Gantt cells */}
                              {Array(12).fill(null).map((_, i) => (
                                <GanttCell key={i} item={l3} monthIndex={i} selectedMonth={filterMonth}/>
                              ))}
                            </tr>
                          ))}
                        </>
                      );
                    })}
                  </>
                );
              })}
            </tbody>

            <tfoot>
              <tr className="bg-gray-800 text-white">
                <td className="sticky left-0 z-[2] bg-gray-800 px-4 py-2.5 text-sm font-bold" colSpan={3}>รวมทั้งปี 2570</td>
                <td className="text-right px-3 py-2.5 text-sm font-bold">
                  ฿{fmtFull(items.filter((x) => x.level === 3 && !x.is_na).reduce((a, x) => a + x.budget, 0))}
                </td>
                <td className="bg-gray-800"/>
                {monthTotals.map((v, i) => (
                  <td key={i} className={`text-center py-2.5 text-[10px] font-bold border-l border-white/10 ${i === CURRENT_MONTH ? "bg-amber-700" : ""}`} style={{ width: 52 }}>
                    {v > 0 ? `฿${fmtBudget(v)}` : "—"}
                  </td>
                ))}
              </tr>
              <tr className="bg-violet-50 border-t border-violet-100">
                <td className="sticky left-0 z-[2] bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-700" colSpan={5}>ใช้จริง (Actual)</td>
                {monthActuals.map((v, i) => (
                  <td key={i} className={`text-center py-2 text-[10px] font-bold border-l border-muted/20 ${v > 0 ? "text-green-700" : "text-muted-foreground"}`} style={{ width: 52 }}>
                    {v > 0 ? `฿${fmtBudget(v)}` : "—"}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(DEPT_BAR).map(([d, color]) => (
          <span key={d} className="flex items-center gap-1.5">
            <span className="w-6 h-3 rounded-full inline-block" style={{ background: color }}/>
            {d}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-3 rounded-full bg-amber-100 border border-amber-300 inline-block"/>
          เดือนปัจจุบัน
        </span>
        <span className="ml-auto flex items-center gap-1 text-[10px]">
          {Object.entries(KPI_MARK).map(([k, v]) => (
            <span key={k} className={`inline-flex items-center px-1.5 py-0.5 rounded-full ${v.color}`}>
              {v.label} = {k === "ok" ? "จากไฟล์" : k === "est" ? "ข้อเสนอ" : "รอข้อมูล"}
            </span>
          ))}
        </span>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MoreHorizontal className="w-3 h-3"/> กด ⋯ ท้ายแถว เพื่อแก้ไข / ลบ · คลิกคอลัมน์เดือน เพื่อกรอง · คลิก สถานะ เพื่อเปลี่ยน
        </p>
      </div>

      {/* ── Detail Drawer ───────────────────────────────────────────────────── */}
      <DetailDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onEdit={(item) => setModal({ mode: "edit", item })}
      />

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {modal && (
        <PlanItemFormModal
          initial={modal.mode === "edit" ? modal.item : null}
          parents={parentItems}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onDelete={modal.mode === "edit" ? handleDeleteRequest : undefined}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-background border rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <Trash2 className="w-10 h-10 text-red-500 mx-auto mb-3"/>
            <h3 className="font-bold text-base mb-2">ยืนยันลบถาวร?</h3>
            {deletingChildCount > 0 ? (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4 text-left">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  รายการนี้มี <strong>{deletingChildCount} รายการย่อย</strong> ที่จะถูกลบพร้อมกันทั้งหมด
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">การลบนี้ถาวร ไม่สามารถกู้คืนได้</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setDeleting(null); setDeletingChildCount(0); }} className="flex-1 py-2 rounded-xl border text-sm hover:bg-muted">ยกเลิก</button>
              <button onClick={confirmDelete} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">ลบถาวร</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3-dot action menu (fixed position, above overflow containers) ──── */}
      {actionMenu && actionMenuPos && (() => {
        const item = items.find((x) => x.id === actionMenu);
        if (!item) return null;
        return (
          <div
            style={{ position: "fixed", top: actionMenuPos.top, right: actionMenuPos.right, zIndex: 60 }}
            className="bg-background border rounded-xl shadow-xl min-w-[140px] py-1"
            onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setModal({ mode: "edit", item }); setActionMenu(null); setActionMenuPos(null); }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-violet-700 font-medium">
              <Pencil className="w-3.5 h-3.5"/> แก้ไข
            </button>
            <div className="border-t mx-2 my-0.5"/>
            <button
              onClick={() => { setDeleting(item.id); setActionMenu(null); setActionMenuPos(null); }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-red-600 font-medium">
              <Trash2 className="w-3.5 h-3.5"/> ลบ
            </button>
          </div>
        );
      })()}
    </div>
  );
}
