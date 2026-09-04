/**
 * OTAPackages.tsx — จัดการ Package master data + Platform Prices
 * Mirror: Standard Daycation Database → Resource Library page
 */
import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { useOTAStore, OTAPackage, OTAPlatform, OTA_PLATFORMS, PlatformPrice } from "@/store/otaStore";
import { toast } from "sonner";

const PLATFORM_COLORS: Record<OTAPlatform, string> = {
  "Trip.com":     "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "KKday":        "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Agent Offline":"bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  "GetYourGuide": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "Viator":       "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "Airbnb":       "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
};

const EMPTY_FORM = { code: "", name: "", platform_prices: [] as PlatformPrice[] };

export default function OTAPackages() {
  const { packages, addPackage, updatePackage, deletePackage } = useOTAStore();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Platform prices temp state in form
  const setPlatformPrice = (platform: OTAPlatform, price: number) => {
    setForm((f) => {
      const existing = f.platform_prices.filter((p) => p.platform !== platform);
      return { ...f, platform_prices: [...existing, { platform, price }] };
    });
  };
  const getPlatformPrice = (platform: OTAPlatform): number =>
    form.platform_prices.find((p) => p.platform === platform)?.price ?? 0;

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, platform_prices: [] });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (pkg: OTAPackage) => {
    setForm({ code: pkg.code, name: pkg.name, platform_prices: [...pkg.platform_prices] });
    setEditId(pkg.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("กรุณากรอก Package Code และ Package Name");
      return;
    }
    const payload = { code: form.code.trim().toUpperCase(), name: form.name.trim(), platform_prices: form.platform_prices.filter((p) => p.price > 0) };
    if (editId) {
      updatePackage(editId, payload);
      toast.success("แก้ไข Package สำเร็จ");
    } else {
      addPackage(payload);
      toast.success("เพิ่ม Package สำเร็จ");
    }
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("ลบ Package นี้? Order ที่ใช้ Package นี้จะยังคงอยู่")) {
      deletePackage(id);
      toast.success("ลบ Package แล้ว");
    }
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
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Package
        </button>
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
                <td colSpan={4} className="text-center py-12 text-muted-foreground">ยังไม่มี Package</td>
              </tr>
            ) : (
              packages.map((pkg) => (
                <tr key={pkg.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-base">{pkg.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-foreground">{pkg.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.platform_prices.map((pp) => (
                        <span key={pp.platform} className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[pp.platform]}`}>
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

      {/* ── Add/Edit Modal ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
              <h2 className="font-bold text-lg">{editId ? "แก้ไข Package" : "เพิ่ม Package ใหม่"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Package Code *</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="เช่น CMP, CMC"
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Package Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="ชื่อโปรแกรมเต็ม"
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Platform Prices (฿ ต่อคน, ใส่ 0 = ไม่มีราคา)</label>
                <div className="space-y-2">
                  {OTA_PLATFORMS.map((pl) => (
                    <div key={pl} className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full min-w-[110px] text-center ${PLATFORM_COLORS[pl]}`}>{pl}</span>
                      <input
                        type="number"
                        min={0}
                        value={getPlatformPrice(pl)}
                        onChange={(e) => setPlatformPrice(pl, parseFloat(e.target.value) || 0)}
                        className="flex-1 px-3 py-1.5 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  ))}
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
    </div>
  );
}
