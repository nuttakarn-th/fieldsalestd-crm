/**
 * TeamKPIPage.tsx
 * หน้า KPI แต่ละตำแหน่งในทีม Marketing
 *
 * Marketing role      → view-only (accordion rubric + competency)
 * Marketing Manager   → view + edit mode + แท็บ "ประเมินผลทีม"
 */
import { useState, useMemo, useRef, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Check,
  X,
  ClipboardList,
  BookOpen,
  Eye,
  EyeOff,
  Trash2,
  Star,
  Save,
  RotateCcw,
  AlertCircle,
  PenLine,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useCurrentUser, useAuth } from "@/store/authStore";
import {
  useKPIDefinitionStore,
  type KPIItem,
  type Competency,
  formatWeight,
  weightsValid,
} from "@/store/kpiDefinitionStore";
import {
  useKPIEvaluationStore,
  calcWeightedScore,
  scoreLabel,
  scoreBadgeClass,
  currentPeriod,
  formatPeriodThai,
  type KPIScore,
} from "@/store/kpiEvaluationStore";
import { useShallow } from "zustand/react/shallow";

// ─── Position tab meta ───────────────────────────────────────────────────────

const POSITION_TABS = [
  { key: "marketing_manager",   label: "Marketing Manager",   color: "from-violet-500 to-purple-600" },
  { key: "vdo_content",         label: "VDO Content",         color: "from-rose-500 to-pink-600" },
  { key: "content_marketing",   label: "Content Marketing",   color: "from-sky-500 to-blue-600" },
  { key: "graphic_designer",    label: "Graphic Designer",    color: "from-amber-500 to-orange-500" },
  { key: "marketing_executive", label: "Mkt Executive",       color: "from-teal-500 to-emerald-600" },
] as const;

type PositionKey = typeof POSITION_TABS[number]["key"];

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Badge แสดงน้ำหนัก KPI */
function WeightBadge({ weight }: { weight: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 shrink-0">
      {formatWeight(weight)}
    </span>
  );
}

/** ระดับ 1–5 pill สำหรับ read mode */
function LevelPills({ levels }: { levels: KPIItem["levels"] }) {
  const colors = [
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  ];
  return (
    <div className="space-y-1.5 pt-1">
      {levels.map((text, i) => (
        <div key={i} className={`flex gap-2 items-start text-xs rounded-lg border px-3 py-2 ${colors[i]}`}>
          <span className="font-bold shrink-0 w-4">{i + 1}</span>
          <span className="leading-relaxed">{text}</span>
        </div>
      ))}
    </div>
  );
}

/** Accordion สำหรับ KPI เดี่ยว — read mode */
function KPIAccordionItem({
  kpi,
  defaultOpen = false,
  onEdit,
  isManager,
}: {
  kpi: KPIItem;
  defaultOpen?: boolean;
  onEdit?: () => void;
  isManager: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-muted-foreground shrink-0">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{kpi.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.nameEn}</p>
        </div>
        <WeightBadge weight={kpi.weight} />
        {isManager && onEdit && (
          <button
            className="ml-1 p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors shrink-0"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="แก้ไข KPI"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t bg-muted/20">
          <LevelPills levels={kpi.levels} />
          <p className="mt-3 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">หลักฐาน: </span>
            {kpi.evidence}
          </p>
        </div>
      )}
    </div>
  );
}

/** Edit form สำหรับ KPI เดี่ยว */
function KPIEditForm({
  kpi,
  onSave,
  onCancel,
}: {
  kpi: KPIItem;
  onSave: (patch: Partial<KPIItem>) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<KPIItem>({ ...kpi, levels: [...kpi.levels] as KPIItem["levels"] });

  const updateLevel = (i: number, val: string) => {
    const next = [...draft.levels] as KPIItem["levels"];
    next[i] = val;
    setDraft((d) => ({ ...d, levels: next }));
  };

  const levelColors = ["text-red-600", "text-orange-600", "text-amber-600", "text-green-600", "text-emerald-600"];

  return (
    <div className="border-2 border-primary/40 rounded-xl p-4 space-y-3 bg-primary/5">
      <div className="flex items-center gap-2 mb-1">
        <Pencil className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-primary">แก้ไข KPI</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">ชื่อ KPI (ไทย)</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">ชื่อ KPI (English)</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={draft.nameEn}
            onChange={(e) => setDraft((d) => ({ ...d, nameEn: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">น้ำหนัก (%)</label>
          <input
            type="number"
            min={1} max={100} step={1}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={Math.round(draft.weight * 100)}
            onChange={(e) => setDraft((d) => ({ ...d, weight: Number(e.target.value) / 100 }))}
          />
        </div>
        <div className="md:col-span-3">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">หลักฐาน / แหล่งอ้างอิง</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={draft.evidence}
            onChange={(e) => setDraft((d) => ({ ...d, evidence: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground block">คำอธิบายระดับ 1–5</label>
        {draft.levels.map((lvl, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className={`font-bold text-sm w-5 shrink-0 mt-2 ${levelColors[i]}`}>{i + 1}</span>
            <textarea
              rows={2}
              className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={lvl}
              onChange={(e) => updateLevel(i, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(draft)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Check className="w-4 h-4" /> บันทึก
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" /> ยกเลิก
        </button>
      </div>
    </div>
  );
}

/** Section Competency (K/S/A) */
function CompetencySection({
  competency,
  isManager,
  onEdit,
}: {
  competency: Competency;
  isManager: boolean;
  onEdit?: () => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<Competency>(competency);

  const blocks: { key: keyof Competency; label: string; color: string }[] = [
    { key: "knowledge", label: "K — ความรู้ (Knowledge)", color: "text-blue-600 dark:text-blue-400" },
    { key: "skill",     label: "S — ทักษะ (Skill)",     color: "text-purple-600 dark:text-purple-400" },
    { key: "attribute", label: "A — คุณลักษณะ (Attribute)", color: "text-rose-600 dark:text-rose-400" },
  ];

  const handleSave = () => {
    onEdit && onEdit();
    setEditMode(false);
  };

  return (
    <div className="border rounded-xl p-4 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">สมรรถนะ KSA</h3>
        {isManager && !editMode && (
          <button
            onClick={() => { setDraft(competency); setEditMode(true); }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> แก้ไข
          </button>
        )}
      </div>

      {editMode ? (
        <div className="space-y-4">
          {blocks.map(({ key, label, color }) => (
            <div key={key}>
              <p className={`text-xs font-semibold mb-2 ${color}`}>{label}</p>
              {draft[key].map((item, i) => (
                <div key={i} className="flex gap-2 mb-1.5">
                  <textarea
                    rows={2}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={item}
                    onChange={(e) => {
                      const arr = [...draft[key]];
                      arr[i] = e.target.value;
                      setDraft((d) => ({ ...d, [key]: arr }));
                    }}
                  />
                  <button
                    onClick={() => setDraft((d) => ({ ...d, [key]: d[key].filter((_, j) => j !== i) }))}
                    className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setDraft((d) => ({ ...d, [key]: [...d[key], ""] }))}
                className="text-xs text-primary hover:underline mt-1"
              >
                + เพิ่มรายการ
              </button>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Check className="w-4 h-4" /> บันทึก
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" /> ยกเลิก
            </button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {blocks.map(({ key, label, color }) => (
            <div key={key}>
              <p className={`text-xs font-semibold mb-2 ${color}`}>{label}</p>
              <ul className="space-y-1.5">
                {competency[key].map((item, i) => (
                  <li key={i} className="flex gap-2 items-start text-xs text-muted-foreground">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Evaluation Tab (Marketing Manager only) ─────────────────────────────────

type EvalView = "list" | "form" | "report";

function EvaluationTab({ managerId, managerName }: { managerId: string; managerName: string }) {
  const { positions } = useKPIDefinitionStore();
  const { evaluations, upsertEvaluation, toggleShare, deleteEvaluation, markAckSeen } = useKPIEvaluationStore();
  const { users } = useAuth(useShallow((s) => ({ users: s.users })));

  const marketingTeam = useMemo(
    () => users.filter((u) => u.role === "Marketing" || u.role === "Marketing Manager"),
    [users]
  );

  const [view, setView] = useState<EvalView>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [period, setPeriod] = useState(currentPeriod());
  const [selectedPositionKey, setSelectedPositionKey] = useState<string>(POSITION_TABS[1].key);
  const [scores, setScores] = useState<Record<string, 1 | 2 | 3 | 4 | 5>>({});
  const [overallNote, setOverallNote] = useState("");

  const selectedPosition = positions.find((p) => p.positionKey === selectedPositionKey);
  const selectedUser = users.find((u) => u.user_id === selectedUserId);

  const resetForm = () => {
    setSelectedUserId("");
    setPeriod(currentPeriod());
    setSelectedPositionKey(POSITION_TABS[1].key);
    setScores({});
    setOverallNote("");
    setEditingId(null);
  };

  const openReport = (evalId: string) => {
    setReportId(evalId);
    setView("report");
    // ถ้า evaluation มี acknowledgment แล้ว → mark ว่า Manager เห็นแล้ว
    const ev = evaluations.find((e) => e.id === evalId);
    if (ev?.acknowledgment) {
      markAckSeen(managerId, evalId);
    }
  };

  const openNewForm = () => {
    resetForm();
    setView("form");
  };

  const openEditForm = (evalId: string) => {
    const ev = evaluations.find((e) => e.id === evalId);
    if (!ev) return;
    setEditingId(evalId);
    setSelectedUserId(ev.evaluateeId);
    setPeriod(ev.period);
    setSelectedPositionKey(ev.positionKey);
    const scoreMap: Record<string, 1 | 2 | 3 | 4 | 5> = {};
    ev.scores.forEach((s) => { scoreMap[s.kpiId] = s.score; });
    setScores(scoreMap);
    setOverallNote(ev.overallNote ?? "");
    setView("form");
  };

  const handleSave = () => {
    if (!selectedPosition || !selectedUser) return;
    const scoreArr: KPIScore[] = selectedPosition.kpis.map((k) => ({
      kpiId: k.id,
      score: scores[k.id] ?? 1,
    }));
    const weighted = calcWeightedScore(scoreArr, selectedPosition.kpis.map((k) => ({ id: k.id, weight: k.weight })));

    upsertEvaluation({
      id: editingId ?? undefined,
      evaluateeId: selectedUser.user_id,
      evaluateeName: selectedUser.full_name,
      evaluatorId: managerId,
      period,
      positionKey: selectedPosition.positionKey,
      positionTitle: selectedPosition.positionTitle,
      scores: scoreArr,
      weightedTotal: weighted,
      overallNote: overallNote.trim() || undefined,
      isShared: false,
    });
    setView("list");
    resetForm();
  };

  const reportEval = reportId ? evaluations.find((e) => e.id === reportId) : null;

  // ── List view ─────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">ประวัติการประเมิน</h3>
          <button
            onClick={openNewForm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5" /> ประเมินใหม่
          </button>
        </div>

        {evaluations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <ClipboardList className="w-8 h-8 opacity-30" />
            <p className="text-sm">ยังไม่มีผลการประเมิน</p>
            <button onClick={openNewForm} className="text-xs text-primary hover:underline">
              เริ่มประเมินคนแรก →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {[...evaluations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((ev) => (
              <div key={ev.id} className="border rounded-xl p-4 bg-card flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{ev.evaluateeName}</span>
                    <span className="text-xs text-muted-foreground">{ev.positionTitle}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{formatPeriodThai(ev.period)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreBadgeClass(ev.weightedTotal)}`}>
                      {ev.weightedTotal.toFixed(2)} — {scoreLabel(ev.weightedTotal)}
                    </span>
                    <span className={`text-xs flex items-center gap-1 ${ev.isShared ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {ev.isShared ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {ev.isShared ? "แชร์แล้ว" : "ยังไม่แชร์"}
                    </span>
                    {ev.acknowledgment && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> ตอบรับแล้ว
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openReport(ev.id)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="ดูรายงาน"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditForm(ev.id)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="แก้ไข"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleShare(ev.id)}
                    className={`p-2 rounded-lg transition-colors ${ev.isShared ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" : "text-muted-foreground hover:bg-muted"}`}
                    title={ev.isShared ? "ซ่อนจากพนักงาน" : "แชร์ให้พนักงานดู"}
                  >
                    {ev.isShared ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { if (confirm("ลบผลการประเมินนี้?")) deleteEvaluation(ev.id); }}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors"
                    title="ลบ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Report view ───────────────────────────────────────────────────────────
  if (view === "report" && reportEval) {
    const pos = positions.find((p) => p.positionKey === reportEval.positionKey);
    return (
      <div className="space-y-4">
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← กลับรายการ
        </button>
        <div className="border rounded-xl p-5 bg-card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-base">{reportEval.evaluateeName}</h3>
              <p className="text-sm text-muted-foreground">{reportEval.positionTitle} · {formatPeriodThai(reportEval.period)}</p>
            </div>
            <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${scoreBadgeClass(reportEval.weightedTotal)}`}>
              {reportEval.weightedTotal.toFixed(2)} — {scoreLabel(reportEval.weightedTotal)}
            </span>
          </div>

          <div className="space-y-2">
            {reportEval.scores.map((sc) => {
              const kpi = pos?.kpis.find((k) => k.id === sc.kpiId);
              if (!kpi) return null;
              const levelText = kpi.levels[sc.score - 1];
              return (
                <div key={sc.kpiId} className="flex items-start gap-3 text-sm border rounded-lg p-3 bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs">{kpi.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{levelText}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`w-3.5 h-3.5 ${n <= sc.score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                      />
                    ))}
                    <span className="text-xs font-bold ml-1 text-foreground">{sc.score}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {reportEval.overallNote && (
            <div className="border rounded-lg p-3 bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground mb-1">หมายเหตุ / Feedback</p>
              <p className="text-sm">{reportEval.overallNote}</p>
            </div>
          )}

          {/* ── การตอบรับจากพนักงาน ── */}
          {reportEval.acknowledgment ? (
            <div className="border rounded-xl p-4 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                พนักงานรับทราบผลการประเมินแล้ว
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDateTimeThai(reportEval.acknowledgment.acknowledgedAt)} · ยืนยันโดย {reportEval.acknowledgment.confirmedName}
              </p>
              <div className="bg-white rounded-lg p-2 border inline-block">
                <img
                  src={reportEval.acknowledgment.signatureDataUrl}
                  alt="ลายเซ็น"
                  className="h-14 object-contain"
                />
              </div>
            </div>
          ) : reportEval.isShared ? (
            <div className="border rounded-lg p-3 bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
              <PenLine className="w-3.5 h-3.5 shrink-0" />
              รอพนักงานยืนยันรับทราบและลงลายเซ็น...
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleShare(reportEval.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                reportEval.isShared
                  ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {reportEval.isShared ? <><Eye className="w-3.5 h-3.5" /> แชร์แล้ว — คลิกเพื่อซ่อน</> : <><EyeOff className="w-3.5 h-3.5" /> แชร์ให้พนักงานดู</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────────────
  const canSave = selectedUserId && selectedPosition && Object.keys(scores).length === (selectedPosition?.kpis.length ?? 0);

  const previewTotal = selectedPosition
    ? calcWeightedScore(
        selectedPosition.kpis.map((k) => ({ kpiId: k.id, score: scores[k.id] ?? 1 })),
        selectedPosition.kpis.map((k) => ({ id: k.id, weight: k.weight }))
      )
    : 0;

  return (
    <div className="space-y-4">
      <button
        onClick={() => { setView("list"); resetForm(); }}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← กลับรายการ
      </button>

      <div className="border rounded-xl p-4 bg-card space-y-4">
        <h3 className="font-semibold text-sm">{editingId ? "แก้ไขผลการประเมิน" : "ประเมินผลการทำงาน"}</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">พนักงาน</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">— เลือกพนักงาน —</option>
              {marketingTeam.map((u) => (
                <option key={u.user_id} value={u.user_id}>{u.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">งวดเดือน (YYYY-MM)</label>
            <input
              type="month"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">ตำแหน่ง / KPI Template</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={selectedPositionKey}
              onChange={(e) => { setSelectedPositionKey(e.target.value); setScores({}); }}
            >
              {positions.map((p) => (
                <option key={p.positionKey} value={p.positionKey}>{p.positionTitle}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedPosition && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ให้คะแนนแต่ละ KPI</p>
            {selectedPosition.kpis.map((kpi) => {
              const currentScore = scores[kpi.id];
              const levelText = currentScore ? kpi.levels[currentScore - 1] : undefined;
              return (
                <div key={kpi.id} className="border rounded-xl p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium flex-1 min-w-0">{kpi.name}</span>
                    <WeightBadge weight={kpi.weight} />
                  </div>
                  {/* Score buttons 1–5 */}
                  <div className="flex gap-1.5 flex-wrap">
                    {([1, 2, 3, 4, 5] as const).map((n) => (
                      <button
                        key={n}
                        onClick={() => setScores((s) => ({ ...s, [kpi.id]: n }))}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          currentScore === n
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground"
                        }`}
                      >
                        <Star className={`w-3 h-3 ${currentScore === n ? "fill-current" : ""}`} />
                        {n}
                      </button>
                    ))}
                  </div>
                  {levelText && (
                    <p className="text-xs text-muted-foreground italic">&ldquo;{levelText}&rdquo;</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">หมายเหตุ / Feedback โดยรวม (ไม่บังคับ)</label>
          <textarea
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="ความคิดเห็นและข้อเสนอแนะสำหรับพนักงาน..."
            value={overallNote}
            onChange={(e) => setOverallNote(e.target.value)}
          />
        </div>

        {selectedPosition && Object.keys(scores).length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
            <span>คะแนนรวม (preview):</span>
            <span className={`font-bold ${scoreBadgeClass(previewTotal)} px-2 py-0.5 rounded-full text-xs`}>
              {previewTotal.toFixed(2)} — {scoreLabel(previewTotal)}
            </span>
          </div>
        )}

        {!canSave && selectedPosition && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" />
            กรุณาเลือกพนักงาน และให้คะแนน KPI ทุกข้อ ({Object.keys(scores).length}/{selectedPosition.kpis.length})
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" /> บันทึกผลการประเมิน
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SignaturePad ─────────────────────────────────────────────────────────────

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
}

function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawing.current = true;
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasDrawn(true);
    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const stopDraw = useCallback(() => { isDrawing.current = false; }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-dashed border-muted-foreground/30 rounded-xl overflow-hidden bg-white cursor-crosshair select-none">
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="w-full h-[120px] touch-none block"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!hasDrawn && (
          <p className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-xs pointer-events-none select-none">
            วาดลายเซ็นที่นี่
          </p>
        )}
      </div>
      {hasDrawn && (
        <button
          onClick={clear}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
        >
          ล้างลายเซ็น
        </button>
      )}
    </div>
  );
}

// ─── AcknowledgeSection ───────────────────────────────────────────────────────

function formatDateTimeThai(isoStr: string) {
  return new Date(isoStr).toLocaleString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface AcknowledgeSectionProps {
  evalId: string;
  evaluateeName: string;
}

function AcknowledgeSection({ evalId, evaluateeName }: AcknowledgeSectionProps) {
  const { evaluations, acknowledgeEvaluation } = useKPIEvaluationStore();
  const evaluation = evaluations.find((e) => e.id === evalId);
  const [name, setName] = useState("");
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);

  if (!evaluation) return null;

  // ── ตอบรับแล้ว ──
  if (evaluation.acknowledgment) {
    return (
      <div className="border rounded-xl p-4 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 space-y-3">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
          <CheckCircle2 className="w-4 h-4" />
          รับทราบผลการประเมินแล้ว
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDateTimeThai(evaluation.acknowledgment.acknowledgedAt)} · ยืนยันโดย {evaluation.acknowledgment.confirmedName}
        </p>
        <div className="bg-white rounded-lg p-2 border inline-block">
          <img
            src={evaluation.acknowledgment.signatureDataUrl}
            alt="ลายเซ็น"
            className="h-12 object-contain"
          />
        </div>
      </div>
    );
  }

  // ── ฟอร์มตอบรับ ──
  const canSubmit = name.trim() !== "" && sigDataUrl !== null;

  return (
    <div className="border rounded-xl p-4 space-y-4 bg-card">
      <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
        <PenLine className="w-4 h-4 text-violet-500" />
        ยืนยันรับทราบผลการประเมิน
      </h4>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">พิมพ์ชื่อ-นามสกุลเพื่อยืนยัน</label>
        <input
          type="text"
          className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder={evaluateeName}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <PenLine className="w-3 h-3" /> วาดลายเซ็น
        </label>
        <SignaturePad onChange={setSigDataUrl} />
      </div>

      <button
        disabled={!canSubmit}
        onClick={() => {
          if (!canSubmit) return;
          acknowledgeEvaluation(evalId, name.trim(), sigDataUrl!);
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
        ส่งการตอบรับกลับ Manager
      </button>
    </div>
  );
}

// ─── My Evaluation view (Marketing role — view own shared evaluations) ────────

function MyEvaluationView({ userId }: { userId: string }) {
  const { evaluations, markSeen } = useKPIEvaluationStore();
  const { positions } = useKPIDefinitionStore();

  const myEvals = evaluations
    .filter((e) => e.evaluateeId === userId && e.isShared)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = myEvals.find((e) => e.id === selectedId);

  if (myEvals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <ClipboardList className="w-8 h-8 opacity-30" />
        <p className="text-sm">ยังไม่มีผลการประเมินที่แชร์มาให้คุณ</p>
      </div>
    );
  }

  if (selected) {
    const pos = positions.find((p) => p.positionKey === selected.positionKey);
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedId(null)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← กลับรายการ
        </button>
        <div className="border rounded-xl p-5 bg-card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-base">{selected.positionTitle}</h3>
              <p className="text-sm text-muted-foreground">{formatPeriodThai(selected.period)}</p>
            </div>
            <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${scoreBadgeClass(selected.weightedTotal)}`}>
              {selected.weightedTotal.toFixed(2)} — {scoreLabel(selected.weightedTotal)}
            </span>
          </div>
          <div className="space-y-2">
            {selected.scores.map((sc) => {
              const kpi = pos?.kpis.find((k) => k.id === sc.kpiId);
              if (!kpi) return null;
              return (
                <div key={sc.kpiId} className="flex items-start gap-3 text-sm border rounded-lg p-3 bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs">{kpi.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.levels[sc.score - 1]}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`w-3.5 h-3.5 ${n <= sc.score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                    <span className="text-xs font-bold ml-1">{sc.score}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {selected.overallNote && (
            <div className="border rounded-lg p-3 bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Feedback จาก Manager</p>
              <p className="text-sm">{selected.overallNote}</p>
            </div>
          )}
        </div>

        {/* ── ยืนยันรับทราบ / ลายเซ็น ── */}
        <AcknowledgeSection evalId={selected.id} evaluateeName={selected.evaluateeName} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {myEvals.map((ev) => (
        <button
          key={ev.id}
          onClick={() => { setSelectedId(ev.id); markSeen(userId, ev.id); }}
          className="w-full border rounded-xl p-4 bg-card text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="font-medium text-sm">{ev.positionTitle}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatPeriodThai(ev.period)}</p>
            </div>
            <div className="flex items-center gap-2">
              {ev.acknowledgment && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> รับทราบแล้ว
                </span>
              )}
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${scoreBadgeClass(ev.weightedTotal)}`}>
                {ev.weightedTotal.toFixed(2)} — {scoreLabel(ev.weightedTotal)}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeamKPIPage() {
  const user = useCurrentUser();
  const { positions, updateKPIItem, updateCompetency, resetPosition } = useKPIDefinitionStore();

  const isManager = user?.role === "Marketing Manager";
  const [activePosKey, setActivePosKey] = useState<PositionKey>("marketing_manager");
  const [mainTab, setMainTab] = useState<"kpi" | "eval">("kpi");
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);

  const position = positions.find((p) => p.positionKey === activePosKey);

  const handleSaveKPI = (kpiId: string, patch: Partial<KPIItem>) => {
    if (!user) return;
    updateKPIItem(activePosKey, kpiId, patch, user.full_name);
    setEditingKpiId(null);
  };

  const handleSaveCompetency = (competency: Competency) => {
    if (!user) return;
    updateCompetency(activePosKey, competency, user.full_name);
  };

  if (!user) return null;

  return (
    <div className="min-h-full">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="border-b bg-card/80 px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              KPI แต่ละตำแหน่ง
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              ตัวชี้วัดผลการปฏิบัติงาน และสมรรถนะ KSA ของทีม Marketing
            </p>
          </div>

          {isManager && (
            <div className="flex gap-2">
              <button
                onClick={() => setMainTab("kpi")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  mainTab === "kpi"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border hover:bg-muted text-muted-foreground"
                }`}
              >
                <BookOpen className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                KPI Reference
              </button>
              <button
                onClick={() => setMainTab("eval")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  mainTab === "eval"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border hover:bg-muted text-muted-foreground"
                }`}
              >
                <ClipboardList className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                ประเมินผลทีม
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">

        {/* ── Evaluation tab — เฉพาะ Manager ───────────────────────────────── */}
        {isManager && mainTab === "eval" && (
          <EvaluationTab managerId={user.user_id} managerName={user.full_name} />
        )}

        {/* ── My Evaluation — เฉพาะ Marketing role (ไม่ใช่ Manager) ─────────── */}
        {!isManager && (
          <div className="border rounded-xl p-4 bg-card">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              ผลการประเมินของคุณ
            </h3>
            <MyEvaluationView userId={user.user_id} />
          </div>
        )}

        {/* ── KPI Reference (always show unless Manager is on eval tab) ─────── */}
        {(mainTab === "kpi" || !isManager) && (
          <>
            {/* Position tab strip */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {POSITION_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActivePosKey(tab.key as PositionKey); setEditingKpiId(null); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    activePosKey === tab.key
                      ? `bg-gradient-to-r ${tab.color} text-white shadow-sm`
                      : "border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {position && (
              <>
                {/* Position header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="font-bold text-base">{position.positionTitle}</h2>
                    <p className="text-xs text-muted-foreground">{position.department}</p>
                    {position.lastEditedBy && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        แก้ไขล่าสุดโดย {position.lastEditedBy} · {new Date(position.lastEditedAt!).toLocaleDateString("th-TH")}
                      </p>
                    )}
                  </div>
                  {isManager && (
                    <button
                      onClick={() => { if (confirm("Reset KPI ตำแหน่งนี้กลับเป็นค่าเริ่มต้น?")) resetPosition(activePosKey); }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border rounded-lg px-3 py-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset ค่าเริ่มต้น
                    </button>
                  )}
                </div>

                {/* Weight validation warning */}
                {isManager && !weightsValid(position.kpis) && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    น้ำหนัก KPI รวมไม่เท่ากับ 100% — กรุณาตรวจสอบ
                  </div>
                )}

                {/* KPI list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">ตัวชี้วัด KPI</h3>
                    <span className="text-xs text-muted-foreground">น้ำหนักรวม: {Math.round(position.kpis.reduce((a, k) => a + k.weight, 0) * 100)}%</span>
                  </div>

                  {position.kpis.map((kpi) =>
                    editingKpiId === kpi.id ? (
                      <KPIEditForm
                        key={kpi.id}
                        kpi={kpi}
                        onSave={(patch) => handleSaveKPI(kpi.id, patch)}
                        onCancel={() => setEditingKpiId(null)}
                      />
                    ) : (
                      <KPIAccordionItem
                        key={kpi.id}
                        kpi={kpi}
                        isManager={isManager}
                        onEdit={isManager ? () => setEditingKpiId(kpi.id) : undefined}
                      />
                    )
                  )}
                </div>

                {/* Competency KSA */}
                <CompetencySection
                  competency={position.competency}
                  isManager={isManager}
                  onEdit={() => handleSaveCompetency(position.competency)}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
