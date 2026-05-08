import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppRole =
  | "Admin"
  | "Sales Manager"
  | "Sales"
  | "Marketing"
  | "Co-Ordinator"
  | "Accounting";

export const ALL_ROLES: AppRole[] = [
  "Sales Manager",
  "Sales",
  "Marketing",
  "Co-Ordinator",
  "Accounting",
];

export interface AppUser {
  user_id: string; // std-001
  full_name: string;
  username: string;
  password: string; // demo only — plaintext for prototype, replace with hash when wiring Supabase
  role: AppRole;
  email?: string;
  tel?: string;
  avatar_url?: string;
  created_at: string;
}

export type ThemeMode = "day" | "night";

interface AuthState {
  users: AppUser[];
  currentUserId: string | null;
  theme: ThemeMode;
  viewAsRole: AppRole | null; // Admin can preview other roles
  login: (username: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  addUser: (u: Omit<AppUser, "user_id" | "created_at">) => { ok: boolean; error?: string; user_id?: string };
  updateUser: (id: string, patch: Partial<Omit<AppUser, "user_id" | "created_at">>) => void;
  deleteUser: (id: string) => void;
  resetPassword: (id: string, newPwd: string) => void;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  setViewAsRole: (r: AppRole | null) => void;
}

const ADMIN_USER: AppUser = {
  user_id: "std-000",
  full_name: "Administrator",
  username: "admin",
  password: "adminstd",
  role: "Admin",
  email: "admin@standardtour.co",
  tel: "053-818-600",
  created_at: new Date(0).toISOString(),
};

const SEED_USERS: AppUser[] = [
  { user_id: "std-001", full_name: "ชูวิทย์", username: "salesmgr", password: "mgr123", role: "Sales Manager", email: "", tel: "", created_at: new Date(1).toISOString() },
  { user_id: "std-002", full_name: "เฟิร์ส", username: "sales01", password: "sales123", role: "Sales", email: "", tel: "", created_at: new Date(2).toISOString() },
  { user_id: "std-003", full_name: "โดนัท", username: "sales02", password: "sales123", role: "Sales", email: "", tel: "", created_at: new Date(3).toISOString() },
  { user_id: "std-004", full_name: "ปาม", username: "sales03", password: "sales123", role: "Sales", email: "", tel: "", created_at: new Date(4).toISOString() },
  { user_id: "std-005", full_name: "ณัฐกานต์", username: "mktstd", password: "mkt123", role: "Marketing", email: "", tel: "", created_at: new Date(5).toISOString() },
  { user_id: "std-006", full_name: "บีม", username: "cosales1", password: "co123", role: "Co-Ordinator", email: "", tel: "", created_at: new Date(6).toISOString() },
  { user_id: "std-007", full_name: "ยา", username: "acstd", password: "ac123", role: "Accounting", email: "", tel: "", created_at: new Date(7).toISOString() },
];

function nextUserId(users: AppUser[]): string {
  const max = users
    .map((u) => u.user_id.match(/^std-(\d+)$/))
    .filter(Boolean)
    .map((m) => parseInt(m![1], 10))
    .filter((n) => !isNaN(n) && n > 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `std-${String(max + 1).padStart(3, "0")}`;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [ADMIN_USER],
      currentUserId: null,
      theme: "day",
      viewAsRole: null,

      login: (username, password) => {
        const u = get().users.find(
          (x) => x.username.toLowerCase() === username.trim().toLowerCase() && x.password === password,
        );
        if (!u) return { ok: false, error: "Username หรือ Password ไม่ถูกต้อง" };
        set({ currentUserId: u.user_id, viewAsRole: null });
        return { ok: true };
      },

      logout: () => set({ currentUserId: null, viewAsRole: null }),

      addUser: (u) => {
        const users = get().users;
        if (!u.full_name?.trim()) return { ok: false, error: "กรุณากรอกชื่อ-นามสกุล" };
        if (!u.username?.trim()) return { ok: false, error: "กรุณากรอก Username" };
        if (!u.password?.trim()) return { ok: false, error: "กรุณากรอก Password" };
        if (!u.role) return { ok: false, error: "กรุณาเลือก Role" };
        if (u.role === ("Admin" as AppRole)) return { ok: false, error: "ไม่สามารถสร้าง Admin เพิ่มได้" };
        if (users.some((x) => x.username.toLowerCase() === u.username.trim().toLowerCase())) {
          return { ok: false, error: "Username นี้ถูกใช้แล้ว" };
        }
        const user_id = nextUserId(users);
        const newUser: AppUser = {
          user_id,
          full_name: u.full_name.trim(),
          username: u.username.trim(),
          password: u.password,
          role: u.role,
          email: u.email?.trim() || "",
          tel: u.tel?.trim() || "",
          created_at: new Date().toISOString(),
        };
        set({ users: [...users, newUser] });
        return { ok: true, user_id };
      },

      updateUser: (id, patch) => {
        set({
          users: get().users.map((u) =>
            u.user_id === id
              ? {
                  ...u,
                  ...patch,
                  // never allow changing role to Admin or removing admin
                  role: u.role === "Admin" ? "Admin" : (patch.role && patch.role !== "Admin" ? patch.role : u.role),
                }
              : u,
          ),
        });
      },

      deleteUser: (id) => {
        const u = get().users.find((x) => x.user_id === id);
        if (!u || u.role === "Admin") return;
        set({ users: get().users.filter((x) => x.user_id !== id) });
      },

      resetPassword: (id, newPwd) => {
        set({
          users: get().users.map((u) => (u.user_id === id ? { ...u, password: newPwd } : u)),
        });
      },

      setTheme: (t) => {
        set({ theme: t });
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark", t === "night");
        }
      },

      toggleTheme: () => {
        const next: ThemeMode = get().theme === "day" ? "night" : "day";
        get().setTheme(next);
      },

      setViewAsRole: (r) => set({ viewAsRole: r }),
    }),
    {
      name: "stdtour-auth-v2",
      onRehydrateStorage: () => (state) => {
        if (typeof document !== "undefined" && state) {
          document.documentElement.classList.toggle("dark", state.theme === "night");
        }
        // Ensure admin always exists
        if (state && !state.users.some((u) => u.role === "Admin")) {
          state.users = [ADMIN_USER, ...state.users];
        }
        // Seed demo users on first run if missing
        if (state) {
          const existingUsernames = new Set(state.users.map((u) => u.username.toLowerCase()));
          for (const seed of SEED_USERS) {
            if (!existingUsernames.has(seed.username.toLowerCase())) {
              state.users.push(seed);
            }
          }
        }
      },
    },
  ),
);

export function useCurrentUser(): AppUser | null {
  const id = useAuth((s) => s.currentUserId);
  const users = useAuth((s) => s.users);
  return id ? users.find((u) => u.user_id === id) ?? null : null;
}