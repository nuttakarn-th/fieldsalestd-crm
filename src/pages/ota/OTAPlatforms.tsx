/**
 * OTAPlatforms.tsx — จัดการ Platform Commission Rates
 * Admin สามารถตั้งค่า commission % ของแต่ละ platform
 * ค่าเหล่านี้จะถูก auto-fill เมื่อเลือก Platform ใน Order Entry
 */
import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Percent } from "lucide-react";
import { useOTAStore, OTA_PLATFORMS, OTAPlatformConfig } from "@/store/otaStore";
import { toast } from "sonner";

const PLATFORM_COLORS: Record<string, string> = {
  "Trip.com":     "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "KKday":        "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "Agent Offline":"bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  "GetYourGuide": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "Viator":       "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  "Airbnb":       "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
};

const EMPTY_FORM = {
  platform: "",
  commission_pct: 0,
  notes: "",
};

export default function OTAPlatforms() {
  const {
    platformConfigs,
    addPlatformConfig,
    updatePlatformConfig,
    deletePlatformConfig,
  } = useOTAStore();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [customPlatform, setCustomPlatform] = useState(false);

  const inputCls = "w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500";
  const labelCls = "block text-xs font-medium text-foreground/70 mb-1";

  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setCustomPlatform(false);
    setShowForm(true);
  };

  const openEdit = (cfg: OTAPlatformConfig) => {
    setForm({
      platform: cfg.platform,
      commission_pct: cfg.commission_pct,
      notes: cfg.notes,
    });
    setCustomPlatform(!OTA_PLATFORMS.includes(cfg.platform as never));
    setEditId(cfg.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.platform.trim()) { toast.error("กรุณาเลือกหรือกรอกชื่อ Platform"); return; }
    if (form.commission_pct < 0 || form.commission_pct > 100) { toast.error("Commission % ต้องอยู่ระหว่าง 0–100"); return; }

    // ป้องกัน duplicate platform ขณะเพิ่มใหม่
    if (!editId) {
      const dup = platformConfigs.find((c) => c.platform.toLowerCase() === form.platform.trim().toLowerCase());
      if (dup) { toast.error(`Platform "${form.platform}" มีอยู่แล้ว`); return; }
    }

    if (editId) {
      await updatePlatformConfig(editId, {
        platform: form.platform.trim(),
        commission_pct: form.commission_pct,
        notes: form.notes,
      });
      toast.success("แก้ไข Platform สำเร็จ");
    } else {
      await addPlatformConfig({
        platform: form.platform.trim(),
        commission_pct: form.commission_pct,
        notes: form.notes,
      });
      toast.success("เพิ่ม Platform สำเร็จ");
    }
    setShowForm(false);
  };

  const handleDelete = async (id: string, platform: string) => {
    if (!confirm(`ลบ "${platform}" ?`)) return;
    await deletePlatformConfig(id);
    toast.success("ลบ Platform แล้ว");
  };

  // Platforms ที่ยังไม่มี config
  const existingPlatforms = new Set(platformConfigs.map((c) => c.platform));
  const availablePlatforms = OTA_PLATFORMS.filter((p) => !existingPlatforms.has(p));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Platform Commission</h1>
          <p className="text-muted-foreground text-sm">Commission % ของแต่ละ platform — auto-fill ตอนสร้าง Order</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Platform
        </button>
      </div>

      {/* Info banner */}
      <div className="mb-4 flex items-start gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm text-purple-700 dark:text-purple-300">
        <Percent className="w-4 h-4 mt-0.5 shrink-0" />
        <span>Commission % ที่ตั้งไว้จะเด้งมาอัตโนมัติเมื่อเลือก Platform ใน Order Entry แต่ยังสามารถแก้ไขตัวเลขได้ทุกครั้ง</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        {platformConfigs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Percent className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">ยังไม่มีข้อมูล Platform</p>
            <p className="text-xs mt-1">กด Add Platform เพื่อเพิ่ม commission rate ของแต่ละ platform</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Platform</th>
                <th className="text-center px-4 py-3 font-medium">Commission %</th>
                <th className="text-left px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {platformConfigs.map((cfg) => (
                <tr key={cfg.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[cfg.platform] ?? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"}`}>
                      {cfg.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold text-base ${cfg.commission_pct > 0 ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"}`}>
                      {cfg.commission_pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{cfg.notes || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => openEdit(cfg)}
                        className="p-1.5 hover:bg-muted rounded transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cfg.id, cfg.platform)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add/Edit Modal ────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-bold text-lg">{editId ? "Edit Platform" : "Add Platform"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Platform */}
              <div>
                <label className={labelCls}>Platform <span className="text-red-500">*</span></label>
                {editId ? (
                  // แก้ไข: แสดงชื่อ platform (ไม่ให้เปลี่ยน)
                  <div className={`${inputCls} bg-muted/50 text-muted-foreground cursor-default`}>{form.platform}</div>
                ) : (
                  <>
                    {!customPlatform ? (
                      <div className="flex gap-2">
                        <select
                          value={form.platform}
                          onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                          className={`${inputCls} flex-1`}
                        >
                          <option value="">เลือก Platform...</option>
                          {availablePlatforms.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => { setCustomPlatform(true); setForm((f) => ({ ...f, platform: "" })); }}
                          className="px-3 py-2 text-xs text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg transition-colors whitespace-nowrap"
                        >
                          + Custom
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={form.platform}
                          onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                          placeholder="ชื่อ platform..."
                          className={`${inputCls} flex-1`}
                        />
                        <button
                          type="button"
                          onClick={() => { setCustomPlatform(false); setForm((f) => ({ ...f, platform: "" })); }}
                          className="px-3 py-2 text-xs text-muted-foreground hover:bg-muted border border-border rounded-lg transition-colors"
                        >
                          List
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Commission % */}
              <div>
                <label className={labelCls}>Commission % <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={form.commission_pct}
                    onChange={(e) => setForm((f) => ({ ...f, commission_pct: parseFloat(e.target.value) || 0 }))}
                    className={`${inputCls} pr-8`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
                {/* Quick chips */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {[10, 15, 20, 25, 30].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, commission_pct: pct }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        form.commission_pct === pct
                          ? "bg-purple-600 text-white border-purple-600"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes (optional)</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Standard commission rate"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-muted hover:bg-muted/80 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
              >
                <Check className="w-4 h-4" />
                {editId ? "Save Changes" : "Add Platform"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
