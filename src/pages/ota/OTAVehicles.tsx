/**
 * OTAVehicles.tsx — Vehicle Summary for OTA Module
 * Route: /ota/vehicles
 * Join groups loaded dynamically from Supabase (ota_vehicle_join_groups)
 */
import { useMemo, useState } from "react";
import { useOTAStore, OTAVehicleJoinGroup } from "@/store/otaStore";
import { Bus, Plus, Pencil, Trash2, X, Check, Settings2 } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = new Date();

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const last  = new Date(year, month, 0).getDate();
  const end   = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

function calcVehicles(pax: number): { count: number; type: "Van" | "Bus" } {
  if (pax > 26) return { count: 1, type: "Bus" };
  if (pax >= 14) return { count: 2, type: "Van" };
  return { count: 1, type: "Van" };
}

interface VehicleGroup {
  date: string;
  groupKey: string;
  packages: string[];
  orderCount: number;
  totalPax: number;
  vehicleCount: number;
  vehicleType: "Van" | "Bus";
}

/** Build a code→groupKey map from dynamic join groups */
function buildGroupKeyFn(joinGroups: OTAVehicleJoinGroup[]): (code: string) => string {
  return (code: string) => {
    for (const jg of joinGroups) {
      if (jg.package_codes.includes(code)) {
        return jg.package_codes.slice().sort().join("+");
      }
    }
    // sub-itinerary fallback: strip trailing -N
    return code.replace(/-\d+$/, "");
  };
}

// ── Join Group Settings Panel ─────────────────────────────────────────────────

function JoinGroupSettings({ packages }: { packages: { code: string }[] }) {
  const {
    vehicleJoinGroups,
    addVehicleJoinGroup,
    updateVehicleJoinGroup,
    deleteVehicleJoinGroup,
  } = useOTAStore();

  const [editId, setEditId]       = useState<string | null>(null);
  const [editName, setEditName]   = useState("");
  const [editCodes, setEditCodes] = useState<string[]>([]);
  const [editNote, setEditNote]   = useState("");
  const [adding, setAdding]       = useState(false);

  const allCodes = [...new Set(packages.map((p) => p.code))].sort();

  const startAdd = () => {
    setAdding(true); setEditId(null);
    setEditName(""); setEditCodes([]); setEditNote("");
  };

  const startEdit = (g: OTAVehicleJoinGroup) => {
    setAdding(false); setEditId(g.id);
    setEditName(g.group_name); setEditCodes([...g.package_codes]); setEditNote(g.note);
  };

  const cancel = () => { setAdding(false); setEditId(null); };

  const save = async () => {
    if (!editName.trim() || editCodes.length < 2) return;
    if (adding) {
      await addVehicleJoinGroup({ group_name: editName.trim(), package_codes: editCodes, note: editNote });
    } else if (editId) {
      await updateVehicleJoinGroup(editId, {
        group_name: editName.trim(), package_codes: editCodes, note: editNote,
      });
    }
    cancel();
  };

  const toggleCode = (code: string) => {
    setEditCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const isEditing = adding || editId !== null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-purple-600" />
          Join Groups (กำหนดเองได้)
        </h3>
        {!isEditing && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่ม Group
          </button>
        )}
      </div>

      {/* Group list */}
      <div className="space-y-2">
        {vehicleJoinGroups.map((g) => (
          editId === g.id ? (
            <EditRow key={g.id} name={editName} setName={setEditName}
              codes={editCodes} allCodes={allCodes} toggle={toggleCode}
              note={editNote} setNote={setEditNote}
              onSave={save} onCancel={cancel} />
          ) : (
            <div key={g.id} className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{g.group_name}</span>
                  {g.package_codes.map((c) => (
                    <span key={c} className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[10px] font-mono font-semibold">
                      {c}
                    </span>
                  ))}
                </div>
                {g.note && <p className="text-xs text-muted-foreground mt-0.5">{g.note}</p>}
              </div>
              <button onClick={() => startEdit(g)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => deleteVehicleJoinGroup(g.id)}
                className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        ))}

        {vehicleJoinGroups.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground py-2">ยังไม่มี Join Group — เพิ่มได้จากปุ่มด้านบน</p>
        )}

        {adding && (
          <EditRow name={editName} setName={setEditName}
            codes={editCodes} allCodes={allCodes} toggle={toggleCode}
            note={editNote} setNote={setEditNote}
            onSave={save} onCancel={cancel} />
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Sub-itinerary (เช่น CRW-1, CRW-2) จะ join อัตโนมัติโดยตัดเลขท้ายออก — ไม่ต้องกำหนดที่นี่
      </p>
    </div>
  );
}

function EditRow({
  name, setName, codes, allCodes, toggle, note, setNote, onSave, onCancel,
}: {
  name: string; setName: (v: string) => void;
  codes: string[]; allCodes: string[]; toggle: (c: string) => void;
  note: string; setNote: (v: string) => void;
  onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="border border-purple-300 dark:border-purple-700 rounded-lg p-3 space-y-2 bg-purple-50 dark:bg-purple-950/20">
      <input
        value={name} onChange={(e) => setName(e.target.value)}
        placeholder="ชื่อ Group เช่น CMP+CMS"
        className="w-full text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      <div className="flex flex-wrap gap-1.5">
        {allCodes.map((c) => (
          <button
            key={c}
            onClick={() => toggle(c)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border transition-colors ${
              codes.includes(c)
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-background text-muted-foreground border-border hover:border-purple-400"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      {codes.length < 2 && (
        <p className="text-[10px] text-amber-600">เลือกอย่างน้อย 2 Package codes</p>
      )}
      <input
        value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="หมายเหตุ (ไม่บังคับ)"
        className="w-full text-xs bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={!name.trim() || codes.length < 2}
          className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> บันทึก
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:border-foreground/30 transition-colors">
          <X className="w-3.5 h-3.5" /> ยกเลิก
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OTAVehicles() {
  const { orders, packages, vehicleJoinGroups } = useOTAStore();
  const [selYear,  setSelYear]  = useState(today.getFullYear());
  const [selMonth, setSelMonth] = useState(today.getMonth() + 1);
  const [showSettings, setShowSettings] = useState(false);

  const { start, end } = useMemo(() => monthBounds(selYear, selMonth), [selYear, selMonth]);

  const vehicleGroupKeyFn = useMemo(
    () => buildGroupKeyFn(vehicleJoinGroups),
    [vehicleJoinGroups]
  );

  const vehicleGroups = useMemo<VehicleGroup[]>(() => {
    const opsOrders = orders.filter((o) => o.usage_date >= start && o.usage_date <= end);
    const map: Record<string, { packages: Set<string>; pax: number; orders: number }> = {};
    opsOrders.forEach((o) => {
      const pkg  = packages.find((p) => p.id === o.package_id);
      const code = pkg?.code ?? "Other";
      const gk   = vehicleGroupKeyFn(code);
      const key  = `${o.usage_date}||${gk}`;
      if (!map[key]) map[key] = { packages: new Set(), pax: 0, orders: 0 };
      map[key].packages.add(code);
      map[key].pax    += o.pax;
      map[key].orders += 1;
    });
    return Object.entries(map).map(([key, v]) => {
      const [date, gk] = key.split("||");
      const { count, type } = calcVehicles(v.pax);
      return {
        date, groupKey: gk,
        packages: [...v.packages].sort(),
        orderCount: v.orders, totalPax: v.pax,
        vehicleCount: count, vehicleType: type,
      };
    }).sort((a, b) => a.date.localeCompare(b.date) || a.groupKey.localeCompare(b.groupKey));
  }, [orders, packages, start, end, vehicleGroupKeyFn]);

  const totalVehicles = vehicleGroups.reduce((s, g) => s + g.vehicleCount, 0);
  const totalVans  = vehicleGroups.filter((g) => g.vehicleType === "Van").reduce((s, g) => s + g.vehicleCount, 0);
  const totalBuses = vehicleGroups.filter((g) => g.vehicleType === "Bus").reduce((s, g) => s + g.vehicleCount, 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Bus className="w-6 h-6 text-purple-600" />
            Vehicle Summary
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
            สรุปจำนวนรถแยกตามกรุ๊ปและ Package — คำนวณจาก Usage Date
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month dropdown */}
          <div className="relative">
            <select
              value={`${selYear}-${String(selMonth).padStart(2, "0")}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                setSelYear(y); setSelMonth(m);
              }}
              className="appearance-none bg-background border border-border rounded-lg pl-3 pr-8 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer hover:border-purple-400 transition-colors"
            >
              {Array.from({ length: 19 }, (_, i) => {
                const d = new Date(today.getFullYear(), today.getMonth() - 12 + i, 1);
                const y = d.getFullYear(); const m = d.getMonth() + 1;
                const val = `${y}-${String(m).padStart(2, "0")}`;
                return <option key={val} value={val}>{d.toLocaleString("en", { month: "long" })} {y}</option>;
              })}
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings((s) => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              showSettings
                ? "bg-purple-600 text-white border-purple-600"
                : "border-border text-muted-foreground hover:border-purple-400 hover:text-foreground"
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Join Rules</span>
          </button>
        </div>
      </div>

      {/* ── Settings panel ─────────────────────────────────────────────────── */}
      {showSettings && <JoinGroupSettings packages={packages} />}

      {/* ── KPI strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "รถรวม", value: totalVehicles, colorL: "border-l-purple-500", colorT: "text-purple-600" },
          { label: "🚐 Van", value: totalVans,    colorL: "border-l-blue-500",   colorT: "text-blue-600" },
          { label: "🚌 Bus", value: totalBuses,   colorL: "border-l-amber-500",  colorT: "text-amber-600" },
        ].map((k) => (
          <div key={k.label} className={`bg-card border border-border border-l-4 ${k.colorL} rounded-xl p-4`}>
            <div className="text-xs text-muted-foreground mb-1">{k.label}</div>
            <div className={`text-3xl font-black ${k.colorT}`}>{k.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{vehicleGroups.length} กรุ๊ป</div>
          </div>
        ))}
      </div>

      {/* ── Capacity rule reminder ──────────────────────────────────────────── */}
      <div className="bg-muted/50 rounded-xl px-4 py-2.5 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Capacity:</span>
        {" "}1–13 pax = 1 Van · 14–26 pax = 2 Van · &gt;26 pax = 1 Bus
        {vehicleJoinGroups.length > 0 && (
          <span className="ml-4">
            <span className="font-semibold text-foreground">Join Groups:</span>{" "}
            {vehicleJoinGroups.map((g) => g.package_codes.join("+")).join(" · ")}
            {" · "}sub-itinerary (CRW-1+CRW-2…)
          </span>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {vehicleGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Bus className="w-12 h-12 opacity-20" />
          <p className="text-sm">ไม่มีข้อมูลในเดือนที่เลือก</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card border-b border-border">
                <tr className="text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Usage Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Package Group</th>
                  <th className="text-center px-4 py-3 font-semibold">Orders</th>
                  <th className="text-center px-4 py-3 font-semibold">PAX</th>
                  <th className="text-center px-4 py-3 font-semibold">รถ (คัน)</th>
                  <th className="text-center px-4 py-3 font-semibold">ประเภท</th>
                </tr>
              </thead>
              <tbody>
                {vehicleGroups.map((g, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap">
                      {new Date(g.date + "T00:00:00").toLocaleDateString("th-TH", {
                        weekday: "short", day: "numeric", month: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {g.packages.map((p) => (
                          <span key={p} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md text-[11px] font-mono font-semibold">
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{g.orderCount}</td>
                    <td className="px-4 py-3 text-center tabular-nums font-semibold">{g.totalPax}</td>
                    <td className="px-4 py-3 text-center tabular-nums font-black text-purple-600 text-lg">{g.vehicleCount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        g.vehicleType === "Bus"
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      }`}>
                        {g.vehicleType === "Bus" ? "🚌" : "🚐"} {g.vehicleType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 border-t-2 border-border font-semibold text-sm">
                  <td className="px-4 py-3 text-muted-foreground" colSpan={2}>รวมทั้งเดือน — {vehicleGroups.length} กรุ๊ป</td>
                  <td className="px-4 py-3 text-center tabular-nums">{vehicleGroups.reduce((s, g) => s + g.orderCount, 0)}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{vehicleGroups.reduce((s, g) => s + g.totalPax, 0)}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-purple-600 text-lg font-black">{totalVehicles}</td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">🚐×{totalVans} · 🚌×{totalBuses}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
