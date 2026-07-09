/**
 * MyTasksPage.tsx — Personal task manager for Marketing role
 * Route: /marketing/tasks
 */
import { useState, useMemo } from "react";
import { Plus, Trash2, Circle, Clock, CheckCircle2, MoreHorizontal, Flag, CalendarDays } from "lucide-react";
import { useCurrentUser } from "@/store/authStore";
import {
  useMyTasks,
  type MyTask,
  type TaskStatus,
  type TaskPriority,
  TASK_STATUS_LABEL,
  TASK_PRIORITY_LABEL,
} from "@/store/myTasksStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_ICON: Record<TaskStatus, typeof Circle> = {
  todo:  Circle,
  doing: Clock,
  done:  CheckCircle2,
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo:  "text-muted-foreground",
  doing: "text-amber-500",
  done:  "text-emerald-500",
};

const STATUS_BG: Record<TaskStatus, string> = {
  todo:  "bg-muted/50",
  doing: "bg-amber-500/10",
  done:  "bg-emerald-500/10",
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low:    "text-muted-foreground bg-muted",
  normal: "text-blue-600 bg-blue-500/10",
  high:   "text-red-600 bg-red-500/10",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function isOverdue(task: MyTask) {
  if (!task.dueDate || task.status === "done") return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

// ── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, onAdvance, onDelete }: {
  task: MyTask;
  onAdvance: () => void;
  onDelete: () => void;
}) {
  const Icon = STATUS_ICON[task.status];
  const overdue = isOverdue(task);

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border border-border transition-all group ${
        task.status === "done" ? "opacity-60" : ""
      } ${STATUS_BG[task.status]}`}
    >
      {/* Status toggle */}
      <button
        type="button"
        onClick={onAdvance}
        className={`mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center ${STATUS_COLOR[task.status]} hover:scale-110 transition-transform`}
        title={`สถานะ: ${TASK_STATUS_LABEL[task.status]} — คลิกเพื่อเปลี่ยน`}
      >
        <Icon className="w-5 h-5" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {task.title}
        </p>
        {task.note && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{task.note}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${PRIORITY_COLOR[task.priority]}`}>
            {TASK_PRIORITY_LABEL[task.priority]}
          </span>
          <span className={`text-[10px] font-medium ${STATUS_COLOR[task.status]}`}>
            {TASK_STATUS_LABEL[task.status]}
          </span>
          {task.dueDate && (
            <span className={`flex items-center gap-1 text-[10px] ${overdue ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
              <CalendarDays className="w-3 h-3" />
              {overdue ? "เกินกำหนด · " : ""}{fmtDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
        title="ลบ"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Add task form ─────────────────────────────────────────────────────────────
function AddTaskForm({ onAdd }: { onAdd: (title: string, opts: { note?: string; priority: TaskPriority; dueDate?: string }) => void }) {
  const [title, setTitle]       = useState("");
  const [note, setNote]         = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueDate, setDueDate]   = useState("");
  const [expanded, setExpanded] = useState(false);

  const submit = () => {
    if (!title.trim()) { toast.error("กรุณากรอกชื่องาน"); return; }
    onAdd(title.trim(), { note: note.trim() || undefined, priority, dueDate: dueDate || undefined });
    setTitle(""); setNote(""); setPriority("normal"); setDueDate("");
    setExpanded(false);
    toast.success("เพิ่มงานเรียบร้อย");
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="+ เพิ่มงานใหม่..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submit()}
          className="flex-1"
        />
        <Button onClick={submit} size="sm" className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {expanded && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Input
            placeholder="หมายเหตุ (ไม่บังคับ)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="col-span-2 text-xs"
          />
          <div className="flex items-center gap-2">
            <Flag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="flex-1 text-xs h-8 rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="low">ต่ำ</option>
              <option value="normal">ปกติ</option>
              <option value="high">ด่วน</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 text-xs h-8 rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
type Filter = "all" | TaskStatus;

const FILTERS: { label: string; value: Filter }[] = [
  { label: "ทั้งหมด",     value: "all"   },
  { label: "ยังไม่เริ่ม", value: "todo"  },
  { label: "กำลังทำ",     value: "doing" },
  { label: "เสร็จแล้ว",   value: "done"  },
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MyTasksPage() {
  const user           = useCurrentUser();
  const allTasks       = useMyTasks((s) => s.tasks);
  const addTask        = useMyTasks((s) => s.addTask);
  const advanceStatus  = useMyTasks((s) => s.advanceStatus);
  const deleteTask     = useMyTasks((s) => s.deleteTask);

  const [filter, setFilter] = useState<Filter>("all");

  const myTasks = useMemo(
    () => (user ? allTasks.filter((t) => t.userId === user.user_id) : []),
    [allTasks, user]
  );

  const visibleTasks = useMemo(() => {
    const sorted = [...myTasks].sort((a, b) => {
      // done goes to bottom; within same status: newest first
      if (a.status === "done" && b.status !== "done") return 1;
      if (a.status !== "done" && b.status === "done") return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return filter === "all" ? sorted : sorted.filter((t) => t.status === filter);
  }, [myTasks, filter]);

  const counts = useMemo(() => ({
    all:   myTasks.length,
    todo:  myTasks.filter((t) => t.status === "todo").length,
    doing: myTasks.filter((t) => t.status === "doing").length,
    done:  myTasks.filter((t) => t.status === "done").length,
  }), [myTasks]);

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">My Tasks</p>
        <h1 style={{ fontFamily: "'Inter', 'Kanit', sans-serif", fontWeight: 900, fontSize: "1.75rem", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
          งานของฉัน
          <span className="text-purple-500">.</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          บันทึกและติดตามงานส่วนตัว — {myTasks.filter(t => t.status !== "done").length} งานที่ยังค้างอยู่
        </p>
      </div>

      {/* Add task */}
      <AddTaskForm
        onAdd={(title, opts) => {
          if (user) addTask(user.user_id, title, opts);
        }}
      />

      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              filter === f.value
                ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white border-transparent shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-purple-400/50"
            }`}
          >
            {f.label}
            <span className="ml-1 opacity-70">({counts[f.value]})</span>
          </button>
        ))}
      </div>

      {/* Task list */}
      {visibleTasks.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-base font-bold text-foreground">
            {filter === "done" ? "ยังไม่มีงานที่เสร็จแล้ว" : "ไม่มีงานค้างอยู่"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            เพิ่มงานใหม่ด้านบน เพื่อเริ่มจัดการงานของคุณ
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onAdvance={() => advanceStatus(task.id)}
              onDelete={() => {
                deleteTask(task.id);
                toast.success("ลบงานแล้ว");
              }}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {myTasks.length > 0 && (
        <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground border-t border-border">
          <span>รวมทั้งหมด {counts.all} งาน</span>
          <span className="text-amber-500">● กำลังทำ {counts.doing}</span>
          <span className="text-emerald-500">● เสร็จแล้ว {counts.done}</span>
        </div>
      )}

    </div>
  );
}
