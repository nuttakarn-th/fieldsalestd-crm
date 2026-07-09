/**
 * myTasksStore.ts — Personal task manager (per-user, persisted to localStorage)
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "normal" | "high";

export interface MyTask {
  id: string;
  userId: string;
  title: string;
  note?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;       // ISO date string (YYYY-MM-DD)
  createdAt: string;      // ISO datetime
  completedAt?: string;   // ISO datetime
}

interface MyTasksState {
  tasks: MyTask[];
  addTask: (
    userId: string,
    title: string,
    opts?: { note?: string; dueDate?: string; priority?: TaskPriority }
  ) => MyTask;
  updateTask: (id: string, patch: Partial<Omit<MyTask, "id" | "userId" | "createdAt">>) => void;
  deleteTask: (id: string) => void;
  advanceStatus: (id: string) => void;   // todo → doing → done → todo
  getTasksForUser: (userId: string) => MyTask[];
}

function genId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  todo:  "doing",
  doing: "done",
  done:  "todo",
};

export const useMyTasks = create<MyTasksState>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (userId, title, opts) => {
        const task: MyTask = {
          id:         genId(),
          userId,
          title:      title.trim(),
          note:       opts?.note?.trim() || undefined,
          status:     "todo",
          priority:   opts?.priority ?? "normal",
          dueDate:    opts?.dueDate,
          createdAt:  new Date().toISOString(),
        };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return task;
      },

      updateTask: (id, patch) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...patch,
                  completedAt:
                    patch.status === "done" && t.status !== "done"
                      ? new Date().toISOString()
                      : patch.status && patch.status !== "done"
                        ? undefined
                        : t.completedAt,
                }
              : t
          ),
        }));
      },

      deleteTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      },

      advanceStatus: (id) => {
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const next = STATUS_CYCLE[t.status];
            return {
              ...t,
              status: next,
              completedAt:
                next === "done"
                  ? new Date().toISOString()
                  : next === "todo"
                    ? undefined
                    : t.completedAt,
            };
          }),
        }));
      },

      getTasksForUser: (userId) =>
        get().tasks.filter((t) => t.userId === userId),
    }),
    { name: "mkt-my-tasks-v1" }
  )
);

// ── Helpers ──────────────────────────────────────────────────────────────────
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo:  "ยังไม่เริ่ม",
  doing: "กำลังทำ",
  done:  "เสร็จแล้ว",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low:    "ต่ำ",
  normal: "ปกติ",
  high:   "ด่วน",
};
