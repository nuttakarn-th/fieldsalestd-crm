/**
 * OTAVehicles.tsx — Vehicle Summary for OTA Module
 * Route: /ota/vehicles
 * Layout: Calendar heatmap (primary) → Detail table (collapsible)
 */
import { useMemo, useState } from "react";
import { useOTAStore, OTAVehicleJoinGroup } from "@/store/otaStore";
import { Bus, Plus, Pencil, Trash2, X, Check, Settings2, ChevronDown, ChevronUp } from "lucide-react";

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

function buildGroupKeyFn(joinGroups: OTAVehicleJoinGroup[]): (code: string) => string {
  return (code: string) => {
    for (const jg of joinGroups) {
      if (jg.package_codes.includes(code)) {
        return jg.package_codes.slice().sort().join("+");
      }
    }
    return code.replace(/-\d+$/, "");
  };
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function VanIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width="22" height="22" fill="currentColor" className={className} aria-hidden="true">
      <path d="M59.706,30.519l-.284-.04a6.956,6.956,0,0,1-4.61-2.73L46,16a5.025,5.025,0,0,0-4-2H5a5.006,5.006,0,0,0-5,5V41a5.006,5.006,0,0,0,5,5H6.685a6.985,6.985,0,0,0,12.63,0h25.37a6.985,6.985,0,0,0,12.63,0H59a5.006,5.006,0,0,0,5-5V35.469A5.026,5.026,0,0,0,59.706,30.519ZM62,38H61a3.006,3.006,0,0,1-2.829-2H62ZM2,36a1,1,0,0,1,1,1v2a1,1,0,0,1-1,1ZM13,48a5,5,0,1,1,5-5A5.006,5.006,0,0,1,13,48Zm38,0a5,5,0,1,1,5-5A5.006,5.006,0,0,1,51,48Zm8-4H57.92a7,7,0,1,0-13.84,0H19.92A7,7,0,1,0,6.08,44H5a2.993,2.993,0,0,1-2.821-2.018A3,3,0,0,0,5,39V37a3,3,0,0,0-3-3V19a3,3,0,0,1,3-3H42a3.017,3.017,0,0,1,2.4,1.2l8.812,11.749a8.943,8.943,0,0,0,5.928,3.51l.284.04A3.006,3.006,0,0,1,61.605,34H57a1,1,0,0,0-1,1,5.006,5.006,0,0,0,5,5h1v1A3,3,0,0,1,59,44Z"/>
      <path d="M46.55,22.4a1,1,0,0,0-1.6,1.2l2.85,3.8A1,1,0,0,1,47,29H37a1,1,0,0,1-1-1V20a1,1,0,0,1,1-1h4a1,1,0,0,1,.8.4l.9,1.2a1,1,0,1,0,1.6-1.2l-.9-1.2A3.014,3.014,0,0,0,41,17H37a3,3,0,0,0-3,3v8a3,3,0,0,0,3,3H47a3,3,0,0,0,2.4-4.8Z"/>
      <path d="M29,17H6a3,3,0,0,0-3,3v8a3,3,0,0,0,3,3H29a3,3,0,0,0,3-3V20A3,3,0,0,0,29,17ZM5,28V20a1,1,0,0,1,1-1h6V29H6A1,1,0,0,1,5,28Zm9-9h7V29H14Zm16,9a1,1,0,0,1-1,1H23V19h6a1,1,0,0,1,1,1Z"/>
      <path d="M51,40a3,3,0,1,0,3,3A3,3,0,0,0,51,40Zm0,4a1,1,0,1,1,1-1A1,1,0,0,1,51,44Z"/>
      <path d="M13,40a3,3,0,1,0,3,3A3,3,0,0,0,13,40Zm0,4a1,1,0,1,1,1-1A1,1,0,0,1,13,44Z"/>
      <path d="M39,32H37a1,1,0,0,0,0,2h2a1,1,0,0,0,0-2Z"/>
      <path d="M29,32a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V33A1,1,0,0,0,29,32Z"/>
    </svg>
  );
}

function BusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 570.502 570.502" width="22" height="22" fill="currentColor" className={className} aria-hidden="true">
      <path clipRule="evenodd" d="m517.092 390.006h-54.394c-5.08 0-9.201-4.121-9.201-9.201s4.121-9.201 9.201-9.201h54.394c3.131 0 5.687-2.54 5.687-5.672v-105.034c0-27.333-10.655-53.036-30.001-72.366s-45.081-29.984-72.446-29.984h-373.893c-15.448 0-28.004 12.557-28.004 27.988v157.082c0 15.432 12.572 27.988 28.004 27.988h58.244c5.08 0 9.201 4.121 9.201 9.201s-4.121 9.201-9.201 9.201h-58.244c-25.591 0-46.407-20.8-46.407-46.391v-157.083c0-25.576 20.815-46.391 46.407-46.391h373.892c32.285 0 62.622 12.557 85.45 35.369s35.4 53.132 35.4 85.386v105.035c-.015 13.275-10.814 24.073-24.089 24.073z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m381.911 390.006h-196.458c-5.08 0-9.201-4.121-9.201-9.201s4.121-9.201 9.201-9.201h196.459c5.08 0 9.201 4.121 9.201 9.201.001 5.08-4.121 9.201-9.202 9.201z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m506.836 202.62h-497.618c-5.08 0-9.201-4.122-9.201-9.201s4.121-9.201 9.201-9.201h497.618c5.08 0 9.201 4.122 9.201 9.201 0 5.08-4.121 9.201-9.201 9.201z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m531.98 332.736c-.447 0-.911-.032-1.374-.096l-40.193-6.023c-1.917-.287-3.674-1.166-5.064-2.508l-46.359-45.177h-429.789c-5.08 0-9.201-4.121-9.201-9.201s4.121-9.201 9.201-9.201h433.527c2.396 0 4.697.943 6.422 2.603l46.902 45.72 37.254 5.576c5.032.751 8.483 5.431 7.732 10.463-.655 4.553-4.569 7.844-9.058 7.844z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m99.779 278.917c-5.08 0-9.201-4.121-9.201-9.201v-76.296c0-5.08 4.121-9.201 9.201-9.201s9.201 4.121 9.201 9.201v76.296c.001 5.08-4.121 9.201-9.201 9.201z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m205.885 278.917c-5.08 0-9.201-4.121-9.201-9.201v-76.296c0-5.08 4.121-9.201 9.201-9.201s9.201 4.121 9.201 9.201v76.296c0 5.08-4.121 9.201-9.201 9.201z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m311.989 278.917c-5.08 0-9.201-4.121-9.201-9.201v-76.296c0-5.08 4.121-9.201 9.201-9.201s9.201 4.121 9.201 9.201v76.296c.001 5.08-4.121 9.201-9.201 9.201z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m418.095 278.917c-5.08 0-9.201-4.121-9.201-9.201v-76.296c0-5.08 4.121-9.201 9.201-9.201s9.201 4.121 9.201 9.201v76.296c0 5.08-4.121 9.201-9.201 9.201z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m561.31 270.897c-3.578 0-6.981-2.092-8.467-5.591l-8.067-18.898h-12.812c-5.08 0-9.201-4.122-9.201-9.201s4.122-9.201 9.201-9.201h18.882c3.69 0 7.013 2.205 8.467 5.591l10.448 24.489c1.997 4.68-.176 10.08-4.857 12.077-1.166.495-2.38.734-3.594.734z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m422.296 430.359c-27.349 0-49.586-22.237-49.586-49.554s22.237-49.554 49.586-49.554 49.586 22.237 49.586 49.554c0 27.333-22.237 49.554-49.586 49.554zm0-80.705c-17.189 0-31.183 13.978-31.183 31.151 0 17.174 13.995 31.15 31.183 31.15 17.189 0 31.183-13.978 31.183-31.151 0-17.174-13.978-31.15-31.183-31.15z" fillRule="evenodd"/>
      <path clipRule="evenodd" d="m145.068 430.359c-27.349 0-49.586-22.237-49.586-49.554s22.237-49.554 49.586-49.554 49.586 22.237 49.586 49.554c0 27.333-22.253 49.554-49.586 49.554zm0-80.705c-17.189 0-31.183 13.978-31.183 31.151 0 17.174 13.994 31.151 31.183 31.151s31.183-13.978 31.183-31.151c0-17.174-13.994-31.151-31.183-31.151z" fillRule="evenodd"/>
    </svg>
  );
}

// ── Heatmap style ─────────────────────────────────────────────────────────────

function heatStyle(total: number, isWeekend: boolean): {
  bg: string; text: string; dayText: string; vanIcon: string; busIcon: string;
} {
  if (total === 0) return {
    bg: isWeekend ? "bg-purple-50" : "bg-white",
    text: "text-purple-400",
    dayText: isWeekend ? "text-purple-400" : "text-slate-400",
    vanIcon: "text-purple-300",
    busIcon: "text-rose-300",
  };
  if (total <= 2)  return { bg: "bg-purple-100", text: "text-purple-800",  dayText: "text-purple-700",  vanIcon: "text-purple-600",  busIcon: "text-rose-500" };
  if (total <= 4)  return { bg: "bg-purple-300", text: "text-purple-900",  dayText: "text-purple-900",  vanIcon: "text-purple-800",  busIcon: "text-rose-600" };
  if (total <= 6)  return { bg: "bg-purple-500", text: "text-white",       dayText: "text-white",       vanIcon: "text-purple-100",  busIcon: "text-rose-100" };
  return           { bg: "bg-purple-700", text: "text-white",              dayText: "text-white",       vanIcon: "text-purple-100",  busIcon: "text-rose-100" };
}

const DOW = [
  { label: "จ",  weekend: false },
  { label: "อ",  weekend: false },
  { label: "พ",  weekend: false },
  { label: "พฤ", weekend: false },
  { label: "ศ",  weekend: false },
  { label: "ส",  weekend: true  },
  { label: "อา", weekend: true  },
];

// ── Vehicle Calendar ──────────────────────────────────────────────────────────

function VehicleCalendar({
  vehicleGroups, year, month,
}: {
  vehicleGroups: VehicleGroup[];
  year: number;
  month: number;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  const dayMap = useMemo(() => {
    const m: Record<string, { van: number; bus: number; groups: VehicleGroup[] }> = {};
    vehicleGroups.forEach((g) => {
      if (!m[g.date]) m[g.date] = { van: 0, bus: 0, groups: [] };
      if (g.vehicleType === "Bus") m[g.date].bus += g.vehicleCount;
      else                          m[g.date].van += g.vehicleCount;
      m[g.date].groups.push(g);
    });
    return m;
  }, [vehicleGroups]);

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay  = new Date(year, month, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: (number | null)[] = [
      ...Array(startOffset).fill(null),
      ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, month]);

  const selectedGroups = selectedDate ? (dayMap[selectedDate]?.groups ?? []) : [];

  return (
    <div className="space-y-3">
      {/* Calendar grid */}
      <div className="rounded-xl border border-purple-200 overflow-hidden shadow-sm">
        {/* DOW header */}
        <div className="grid grid-cols-7">
          {DOW.map(({ label, weekend }, i) => (
            <div
              key={i}
              className={[
                "text-center text-[11px] font-bold py-2 tracking-wide",
                weekend ? "bg-purple-700 text-purple-100" : "bg-purple-900 text-white",
              ].join(" ")}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-t border-purple-100 first:border-0">
            {week.map((day, di) => {
              const isWeekend = di >= 5;

              if (!day) {
                return (
                  <div
                    key={di}
                    className={[
                      "min-h-[72px] border-r border-purple-100 last:border-0",
                      isWeekend ? "bg-purple-50/60" : "bg-white/50",
                    ].join(" ")}
                  />
                );
              }

              const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const info    = dayMap[dateStr];
              const van     = info?.van ?? 0;
              const bus     = info?.bus ?? 0;
              const total   = van + bus;
              const isToday    = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const { bg, dayText, vanIcon, busIcon } = heatStyle(total, isWeekend);

              return (
                <button
                  key={di}
                  onClick={() => total > 0 ? setSelectedDate(isSelected ? null : dateStr) : undefined}
                  className={[
                    "min-h-[72px] p-2 border-r border-purple-100 last:border-0 transition-all flex flex-col",
                    bg,
                    total > 0 ? "cursor-pointer hover:brightness-95" : "cursor-default",
                    isSelected ? "ring-2 ring-inset ring-white/70 brightness-90" : "",
                  ].join(" ")}
                >
                  <span className={[
                    "text-[11px] font-black leading-none mb-auto self-start",
                    isToday
                      ? "bg-white text-purple-700 rounded-full w-5 h-5 flex items-center justify-center shadow"
                      : dayText,
                  ].join(" ")}>
                    {day}
                  </span>

                  {total > 0 && (
                    <div className="flex flex-col items-center justify-center gap-1 flex-1">
                      {van > 0 && (
                        <span className={`flex items-center gap-1 font-black text-[13px] leading-none ${vanIcon}`}>
                          <VanIcon />
                          {van}
                        </span>
                      )}
                      {bus > 0 && (
                        <span className={`flex items-center gap-1 font-black text-[13px] leading-none ${busIcon}`}>
                          <BusIcon />
                          {bus}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Detail popover */}
      {selectedDate && selectedGroups.length > 0 && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-purple-800 flex items-center gap-2">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("th-TH", {
                weekday: "long", day: "numeric", month: "long",
              })}
              <span className="px-2 py-0.5 bg-purple-700 text-white rounded-full text-[10px] font-bold">
                {(dayMap[selectedDate]?.van ?? 0) + (dayMap[selectedDate]?.bus ?? 0)} คัน
              </span>
            </p>
            <button onClick={() => setSelectedDate(null)} className="text-purple-400 hover:text-purple-700 text-sm font-bold">✕</button>
          </div>
          <div className="space-y-1.5">
            {selectedGroups.map((g, i) => (
              <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-purple-200 shadow-sm">
                <span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-black text-white tracking-wider ${
                  g.vehicleType === "Bus" ? "bg-rose-500" : "bg-purple-600"
                }`}>
                  {g.vehicleType === "Bus" ? <BusIcon className="text-white" /> : <VanIcon className="text-white" />}
                  {g.vehicleCount}
                </span>
                <div className="flex flex-wrap gap-1 flex-1">
                  {g.packages.map((p) => (
                    <span key={p} className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-mono font-bold border border-purple-200">
                      {p}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap font-medium">
                  {g.totalPax} PAX · {g.orderCount} orders
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
  const [showTable, setShowTable]       = useState(false);

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
  const totalVans     = vehicleGroups.filter((g) => g.vehicleType === "Van").reduce((s, g) => s + g.vehicleCount, 0);
  const totalBuses    = vehicleGroups.filter((g) => g.vehicleType === "Bus").reduce((s, g) => s + g.vehicleCount, 0);

  // จำนวนกรุ๊ปดิบ ก่อนใช้ Join Rules (แต่ละ package+date = 1 กรุ๊ป)
  const rawGroupCount = useMemo(() => {
    const opsOrders = orders.filter((o) => o.usage_date >= start && o.usage_date <= end);
    const seen = new Set<string>();
    opsOrders.forEach((o) => {
      const pkg  = packages.find((p) => p.id === o.package_id);
      const code = pkg?.code ?? "Other";
      seen.add(`${o.usage_date}||${code}`);
    });
    return seen.size;
  }, [orders, packages, start, end]);

  const monthLabel = new Date(selYear, selMonth - 1, 1).toLocaleString("th-TH", { month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <VanIcon className="text-purple-600" />
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* กรุ๊ปทั้งหมด (ก่อน Join) */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="text-xs text-indigo-500 font-semibold mb-1">กรุ๊ปทั้งหมด</div>
          <div className="text-3xl font-black text-indigo-700">{rawGroupCount}</div>
          <div className="text-xs text-indigo-400 mt-1">โปรแกรม</div>
        </div>
        {/* รถรวม (หลัง Join) */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">รถรวม</div>
          <div className="text-3xl font-black text-purple-600">{totalVehicles}</div>
          <div className="text-xs text-muted-foreground mt-1">
            คัน
            {rawGroupCount !== vehicleGroups.length && (
              <span className="ml-1.5 text-purple-400">(หลัง Join)</span>
            )}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
          <VanIcon className="text-purple-600 shrink-0" />
          <div>
            <div className="text-xs text-purple-500 font-semibold mb-0.5">Van</div>
            <div className="text-3xl font-black text-purple-700">{totalVans}</div>
            <div className="text-xs text-purple-400 mt-0.5">{vehicleGroups.filter(g => g.vehicleType === "Van").length} คัน</div>
          </div>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
          <BusIcon className="text-rose-500 shrink-0" />
          <div>
            <div className="text-xs text-rose-500 font-semibold mb-0.5">Bus</div>
            <div className="text-3xl font-black text-rose-600">{totalBuses}</div>
            <div className="text-xs text-rose-400 mt-0.5">{vehicleGroups.filter(g => g.vehicleType === "Bus").length} คัน</div>
          </div>
        </div>
      </div>

      {/* ── Capacity & legend bar ───────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="bg-muted/50 rounded-xl px-4 py-2.5 text-xs text-muted-foreground flex-1">
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
        {/* Heatmap legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
          <span>น้อย</span>
          <span className="w-4 h-4 rounded-sm bg-purple-100 border border-purple-200 inline-block" />
          <span className="w-4 h-4 rounded-sm bg-purple-300 border border-purple-400 inline-block" />
          <span className="w-4 h-4 rounded-sm bg-purple-500 border border-purple-600 inline-block" />
          <span className="w-4 h-4 rounded-sm bg-purple-700 border border-purple-800 inline-block" />
          <span>มาก</span>
        </div>
      </div>

      {/* ── Section 1: Calendar heatmap (primary) ──────────────────────────── */}
      {vehicleGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <VanIcon className="text-muted-foreground/20 w-12 h-12" />
          <p className="text-sm">ไม่มีข้อมูลในเดือนที่เลือก</p>
        </div>
      ) : (
        <VehicleCalendar vehicleGroups={vehicleGroups} year={selYear} month={selMonth} />
      )}

      {/* ── Section 2: Detail table (collapsible) ──────────────────────────── */}
      {vehicleGroups.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Toggle header */}
          <button
            onClick={() => setShowTable((s) => !s)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
          >
            <span className="font-semibold text-sm flex items-center gap-2">
              <span className="w-1 h-4 bg-purple-600 rounded-full inline-block" />
              รายละเอียดรายกรุ๊ป — {monthLabel}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({vehicleGroups.length} กรุ๊ป · {totalVehicles} คัน)
              </span>
            </span>
            {showTable
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          {/* Table body */}
          {showTable && (
            <div className="border-t border-border overflow-x-auto">
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
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          g.vehicleType === "Bus"
                            ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300"
                            : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                        }`}>
                          {g.vehicleType === "Bus"
                            ? <BusIcon className="w-4 h-4" />
                            : <VanIcon className="w-4 h-4" />
                          }
                          {g.vehicleType}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40 border-t-2 border-border font-semibold text-sm">
                    <td className="px-4 py-3 text-muted-foreground" colSpan={2}>
                      รวมทั้งเดือน — {vehicleGroups.length} กรุ๊ป
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {vehicleGroups.reduce((s, g) => s + g.orderCount, 0)}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {vehicleGroups.reduce((s, g) => s + g.totalPax, 0)}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-purple-600 text-lg font-black">
                      {totalVehicles}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                      <span className="flex items-center justify-center gap-2">
                        <span className="flex items-center gap-1 text-purple-600"><VanIcon />×{totalVans}</span>
                        <span className="flex items-center gap-1 text-rose-500"><BusIcon />×{totalBuses}</span>
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
