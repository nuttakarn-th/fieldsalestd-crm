/**
 * OTAOrderEntry.tsx — บันทึก OTA Orders รายวัน
 * Mirror: Standard Daycation Database → Order Entry page
 */
import { useState, useMemo } from "react";
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { useOTAStore, OTAPlatform, OTA_PLATFORMS, OTAOrder } from "@/store/otaStore";
import { useCurrentUser } from "@/store/authStore";
import { toast } from "sonner";

const PLATFORM_COLORS: Record<OTAPlatform, string> = {
  "Trip.com":     "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "KKday":        "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "Agent Offline":"bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  "GetYourGuide": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "Viator":       "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  "Airbnb":       "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
};

const today = new Date();
const EMPTY_FORM = {
  booking_date: today.toISOString().slice(0, 10),
  usage_date: today.toISOString().slice(0, 10),
  order_number: "",
  group_number: "",
  pax: 2,
  platform: "Trip.com" as OTAPlatform,
  package_id: "",
  package_details: "",
  nationality: "",
  guide_name: "",
  revenue: 0,
};

export default function OTAOrderEntry() {
  const { orders, packages, addOrder, updateOrder, deleteOrder } = useOTAStore();
  const currentUser = useCurrentUser();

  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [year, setYear] = useState(today.getFullYear());
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // ── Filtered orders ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return orders
      .filter((o) => o.usage_date.startsWith(prefix))
      .filter((o) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          o.order_number.toLowerCase().includes(q) ||
          o.platform.toLowerCase().includes(q) ||
          o.nationality?.toLowerCase().includes(q) ||
          packages.find((p) => p.id === o.package_id)?.code.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.usage_date.localeCompare(b.usage_date));
  }, [orders, packages, month, year, search]);

  const totalPax = filtered.reduce((s, o) => s + o.pax, 0);
  const totalRevenue = filtered.reduce((s, o) => s + o.revenue, 0);

  const monthName = new Date(year, month - 1, 1).toLocaleString("en", { month: "long" });

  // ── Month navigation ──────────────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setShowForm(true);
  };
  const openEdit = (o: OTAOrder) => {
    setForm({
      booking_date: o.booking_date,
      usage_date: o.usage_date,
      order_number: o.order_number,
      group_number: o.group_number,
      pax: o.pax,
      platform: o.platform,
      package_id: o.package_id,
      package_details: o.package_details ?? "",
      nationality: o.nationality ?? "",
      guide_name: o.guide_name ?? "",
      revenue: o.revenue,
    });
    setEditId(o.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.usage_date || !form.order_number || !form.package_id) {
      toast.error("กรุณากรอก Usage Date, Order # และ Package");
      return;
    }
    const pkg = packages.find((p) => p.id === form.package_id);
    const payload = { ...form, package_details: pkg?.name ?? form.package_details, created_by: currentUser?.full_name ?? "" };
    if (editId) {
      updateOrder(editId, payload);
      toast.success("แก้ไข Order สำเร็จ");
    } else {
      addOrder(payload);
      toast.success("เพิ่ม Order สำเร็จ");
    }
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("ลบ Order นี้?")) {
      deleteOrder(id);
      toast.success("ลบ Order แล้ว");
    }
  };

  const fmtDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  };
  const fmtCurrency = (n: number) =>
    n.toLocaleString("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Order Entry</h1>
          <p className="text-muted-foreground text-sm">บันทึก OTA orders รายวัน</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Order
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Month nav */}
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
          <button onClick={prevMonth} className="hover:text-purple-600 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold min-w-[120px] text-center">{monthName} {year}</span>
          <button onClick={nextMonth} className="hover:text-purple-600 transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา order, platform..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        {/* Summary */}
        <div className="ml-auto flex gap-4 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{filtered.length}</span> orders</span>
          <span><span className="font-semibold text-foreground">{totalPax}</span> pax</span>
          <span className="font-semibold text-purple-600">{fmtCurrency(totalRevenue)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                {["Booking Date", "Usage Date", "Order #", "Group #", "People", "Platform", "Package", "Nationality", "Guide", "Revenue", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-muted-foreground">
                    ยังไม่มี Order ในเดือนนี้
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const pkg = packages.find((p) => p.id === o.package_id);
                  return (
                    <tr key={o.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(o.booking_date)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium">{fmtDate(o.usage_date)}</td>
                      <td className="px-3 py-2.5">{o.order_number}</td>
                      <td className="px-3 py-2.5">{o.group_number}</td>
                      <td className="px-3 py-2.5 text-center font-semibold">{o.pax}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_COLORS[o.platform]}`}>
                          {o.platform}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                          {pkg?.code ?? "-"}
                        </span>
                        <span className="ml-2 text-muted-foreground text-xs truncate max-w-[160px] inline-block align-middle">
                          {o.package_details}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">{o.nationality}</td>
                      <td className="px-3 py-2.5">{o.guide_name}</td>
                      <td className="px-3 py-2.5 font-medium text-right">{fmtCurrency(o.revenue)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(o)} className="p-1.5 hover:bg-muted rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(o.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit Modal ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold text-lg">{editId ? "แก้ไข Order" : "เพิ่ม Order ใหม่"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Booking Date *</label>
                  <input type="date" value={form.booking_date} onChange={(e) => setForm((f) => ({ ...f, booking_date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Usage Date *</label>
                  <input type="date" value={form.usage_date} onChange={(e) => setForm((f) => ({ ...f, usage_date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Order # *</label>
                  <input value={form.order_number} onChange={(e) => setForm((f) => ({ ...f, order_number: e.target.value }))} placeholder="เลข Order"
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Group #</label>
                  <input value={form.group_number} onChange={(e) => setForm((f) => ({ ...f, group_number: e.target.value }))} placeholder="เลข Group"
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">People (PAX)</label>
                  <input type="number" min={1} value={form.pax} onChange={(e) => setForm((f) => ({ ...f, pax: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Platform</label>
                  <select value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as OTAPlatform }))}
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {OTA_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Package *</label>
                <select value={form.package_id} onChange={(e) => {
                    const pkg = packages.find((p) => p.id === e.target.value);
                    const price = pkg?.platform_prices.find((pp) => pp.platform === form.platform)?.price ?? 0;
                    setForm((f) => ({ ...f, package_id: e.target.value, revenue: price * f.pax }));
                  }}
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">-- เลือก Package --</option>
                  {packages.map((p) => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nationality</label>
                  <input value={form.nationality} onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))} placeholder="สัญชาติ"
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Guide</label>
                  <input value={form.guide_name} onChange={(e) => setForm((f) => ({ ...f, guide_name: e.target.value }))} placeholder="ชื่อ Guide"
                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Revenue (฿)</label>
                <input type="number" min={0} value={form.revenue} onChange={(e) => setForm((f) => ({ ...f, revenue: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
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
