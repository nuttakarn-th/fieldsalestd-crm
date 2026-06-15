import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { hashPassword, verifyPassword, isHashed } from "@/lib/passwordHash";

export type AppRole =
  | "Admin"
  | "Sales Manager"
  | "Sales"
  | "OB Co-ordinator"
  | "Marketing"
  | "Co-Ordinator"
  | "Accounting";

export const ALL_ROLES: AppRole[] = [
  "Sales Manager",
  "Sales",
  "OB Co-ordinator",
  "Marketing",
  "Co-Ordinator",
  "Accounting",
];

export interface AppUser {
  user_id: string; // std-001
  full_name: string;
  username: string;
  password: string; // hashed (PBKDF2)
  plain_password?: string; // plain text — แสดงใน UserManagement เท่านั้น
  role: AppRole;
  email?: string;
  tel?: string;
  avatar_url?: string;
  line_qr_url?: string;
  department?: string;
  created_at: string;
}

export type ThemeMode = "day" | "night";

interface AuthState {
  users: AppUser[];
  currentUserId: string | null;
  theme: ThemeMode;
  viewAsRole: AppRole | null; // Admin can preview other roles
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  addUser: (u: Omit<AppUser, "user_id" | "created_at">) => Promise<{ ok: boolean; error?: string; user_id?: string }>;
  updateUser: (id: string, patch: Partial<Omit<AppUser, "user_id" | "created_at">>) => void;
  deleteUser: (id: string) => void;
  resetPassword: (id: string, newPwd: string) => Promise<void>;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  setViewAsRole: (r: AppRole | null) => void;
  loadUsersFromSupabase: () => Promise<void>;
}

const ADMIN_USER: AppUser = {
  user_id: "std-000",
  full_name: "Administrator",
  username: "admin",
  password: "adminstd",
  plain_password: "adminstd",
  role: "Admin",
  email: "admin@standardtour.co",
  tel: "053-818-600",
  created_at: new Date(0).toISOString(),
};

const SEED_USERS: AppUser[] = [
  { user_id: "std-001", full_name: "ชูวิทย์", username: "salesmgr", password: "mgr123", plain_password: "mgr123", role: "Sales Manager", email: "", tel: "", created_at: new Date(1).toISOString() },
  { user_id: "std-002", full_name: "เฟิร์ส", username: "sales01", password: "sales123", plain_password: "sales123", role: "Sales", email: "", tel: "", created_at: new Date(2).toISOString() },
  { user_id: "std-003", full_name: "โดนัท", username: "sales02", password: "sales123", plain_password: "sales123", role: "Sales", email: "", tel: "", created_at: new Date(3).toISOString() },
  { user_id: "std-004", full_name: "ปาม", username: "sales03", password: "sales123", plain_password: "sales123", role: "Sales", email: "", tel: "", created_at: new Date(4).toISOString() },
  { user_id: "std-005", full_name: "ณัฐกานต์", username: "mktstd", password: "mkt123", plain_password: "mkt123", role: "Marketing", email: "", tel: "", created_at: new Date(5).toISOString() },
  { user_id: "std-006", full_name: "บีม", username: "cosales1", password: "co123", plain_password: "co123", role: "Co-Ordinator", email: "", tel: "", created_at: new Date(6).toISOString() },
  { user_id: "std-007", full_name: "ยา", username: "acstd", password: "ac123", plain_password: "ac123", role: "Accounting", email: "", tel: "", created_at: new Date(7).toISOString() },
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

      login: async (username, password) => {
        const u = get().users.find(
          (x) => x.username.toLowerCase() === username.trim().toLowerCase(),
        );
        if (!u) return { ok: false, error: "Username หรือ Password ไม่ถูกต้อง" };
        const ok = await verifyPassword(password, u.password);
        if (!ok) return { ok: false, error: "Username หรือ Password ไม่ถูกต้อง" };
        // Auto-upgrade legacy plaintext to hash on successful login
        if (!isHashed(u.password)) {
          const newHash = await hashPassword(password);
          set({
            users: get().users.map((x) => (x.user_id === u.user_id ? { ...x, password: newHash } : x)),
          });
          if (SUPABASE_ENABLED && supabase) {
            supabase.from("app_users").update({ password_hash: newHash }).eq("user_id", u.user_id).then(({ error }) => {
              if (error) console.error("[supabase] upgrade pwd hash ล้มเหลว:", error);
            });
          }
        }
        set({ currentUserId: u.user_id, viewAsRole: null });
        return { ok: true };
      },

      logout: () => set({ currentUserId: null, viewAsRole: null }),

      addUser: async (u) => {
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
        const plainPwd = u.password;
        const passwordHash = await hashPassword(u.password);
        const newUser: AppUser = {
          user_id,
          full_name: u.full_name.trim(),
          username: u.username.trim(),
          password: passwordHash,
          plain_password: plainPwd,
          role: u.role,
          email: u.email?.trim() || "",
          tel: u.tel?.trim() || "",
          created_at: new Date().toISOString(),
        };
        set({ users: [...users, newUser] });
        if (SUPABASE_ENABLED && supabase) {
          const { password, ...rest } = newUser;
          supabase.from("app_users").insert({ ...rest, password_hash: passwordHash, plain_password: plainPwd }).then(({ error }) => {
            if (error) console.error("[supabase] เพิ่ม user ล้มเหลว:", error);
          });
          // sync ชื่อไปยัง sales_reps เพื่อไม่ให้ FK constraint ปฏิเสธ insert ของ customers/leads/routes
          const salesRoles: AppRole[] = ["Sales", "OB Co-ordinator", "Sales Manager"];
          if (salesRoles.includes(u.role)) {
            const isManager = u.role === "Sales Manager";
            supabase.from("sales_reps").upsert({
              name: newUser.full_name,
              position: u.role,
              phone: u.tel?.trim() || null,
              email: u.email?.trim() || null,
              is_manager: isManager,
              is_active: true,
            }, { onConflict: "name" }).then(({ error }) => {
              if (error) console.error("[supabase] sync sales_rep ล้มเหลว:", error);
            });
          }
        }
        return { ok: true, user_id };
      },

      updateUser: (id, patch) => {
        set({
          users: get().users.map((u) =>
            u.user_id === id
              ? {
                  ...u,
                  ...patch,
                  // ถ้า patch มี password ให้อัปเดต plain_password ด้วย
                  plain_password: (patch as any).password !== undefined ? (patch as any).password : u.plain_password,
                  // never allow changing role to Admin or removing admin
                  role: u.role === "Admin" ? "Admin" : (patch.role && patch.role !== "Admin" ? patch.role : u.role),
                }
              : u,
          ),
        });
        if (SUPABASE_ENABLED && supabase) {
          const { password: newPwd, ...safePatch } = patch as any;
          if (newPwd !== undefined) {
            // User เปลี่ยน password เอง → hash แล้ว save ทั้ง password_hash + plain_password
            hashPassword(newPwd).then((newHash) => {
              supabase.from("app_users")
                .update({ ...safePatch, password_hash: newHash, plain_password: newPwd })
                .eq("user_id", id)
                .then(({ error }) => {
                  if (error) console.error("[supabase] update user password ล้มเหลว:", error);
                });
            });
          } else {
            supabase.from("app_users").update(safePatch).eq("user_id", id).then(({ error }) => {
              if (error) console.error("[supabase] update user ล้มเหลว:", error);
            });
          }
        }
      },

      deleteUser: (id) => {
        const u = get().users.find((x) => x.user_id === id);
        if (!u || u.role === "Admin") return;
        set({ users: get().users.filter((x) => x.user_id !== id) });
        if (SUPABASE_ENABLED && supabase) {
          supabase.from("app_users").delete().eq("user_id", id).then(({ error }) => {
            if (error) console.error("[supabase] delete user ล้มเหลว:", error);
          });
        }
      },

      resetPassword: async (id, newPwd) => {
        const newHash = await hashPassword(newPwd);
        set({
          users: get().users.map((u) => (u.user_id === id ? { ...u, password: newHash, plain_password: newPwd } : u)),
        });
        if (SUPABASE_ENABLED && supabase) {
          supabase.from("app_users").update({ password_hash: newHash, plain_password: newPwd }).eq("user_id", id).then(({ error }) => {
            if (error) console.error("[supabase] reset password ล้มเหลว:", error);
          });
        }
      },

      loadUsersFromSupabase: async () => {
        if (!SUPABASE_ENABLED || !supabase) return;
        try {
          const { data, error } = await supabase.from("app_users").select("*").order("created_at", { ascending: true });
          if (error) throw error;
          if (data && data.length > 0) {
            const users = data.map((r: any) => {
              const { password_hash, plain_password: pp, ...rest } = r;
              return { ...rest, password: password_hash, plain_password: pp ?? undefined } as AppUser;
            });
            // eslint-disable-next-line no-console
            console.info(`[supabase] โหลด users ${users.length} ราย จาก DB`);
            set({ users });
          } else {
            // DB ว่าง → migrate localStorage seed users → DB
            // eslint-disable-next-line no-console
            console.info("[supabase] DB ว่าง — migrate users จาก localStorage → DB (hash passwords)");
            const localUsers = get().users;
            const migrated: AppUser[] = [];
            for (const u of localUsers) {
              const hash = isHashed(u.password) ? u.password : await hashPassword(u.password);
              migrated.push({ ...u, password: hash });
            }
            set({ users: migrated });
            // Bulk insert
            const rows = migrated.map((u) => {
              const { password, ...rest } = u;
              return { ...rest, password_hash: password };
            });
            const { error: insErr } = await supabase.from("app_users").insert(rows);
            if (insErr) console.error("[supabase] migrate users ล้มเหลว:", insErr);
            else console.info("[supabase] migrate สำเร็จ — passwords ถูก hash แล้ว");
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("[supabase] loadUsers ล้มเหลว:", e);
        }
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

/**
 * useCurrentUser — returns the currently logged-in AppUser, or null.
 *
 * IMPORTANT: uses a custom equality function so components only re-render
 * when the user's actual DATA changes (user_id, role, full_name, avatar_url…),
 * NOT every time loadUsersFromSupabase replaces the users array with a new
 * reference. Without this, the selector returns a new object on every auth
 * refresh, which triggers all useEffect([user]) hooks → React #185 infinite loop.
 */
export function useCurrentUser(): AppUser | null {
  return useAuth(
    (s) => (s.currentUserId ? (s.users.find((u) => u.user_id === s.currentUserId) ?? null) : null),
    // Custom equality: shallow compare key fields — ignore array-reference churn
    (prev, next) => {
      if (prev === next) return true;
      if (!prev || !next) return prev === next;
      return (
        prev.user_id      === next.user_id      &&
        prev.role         === next.role          &&
        prev.full_name    === next.full_name     &&
        prev.username     === next.username      &&
        prev.avatar_url   === next.avatar_url    &&
        prev.is_active    === next.is_active
      );
    },
  );
}

/** Returns full_names of all active users with role 'Sales', 'Sales Manager', or 'OB Co-ordinator' */
export function useActiveSalesNames(): string[] {
  const users = useAuth((s) => s.users);
  return users
    .filter((u) => u.role === "Sales" || u.role === "Sales Manager" || u.role === "OB Co-ordinator")
    .map((u) => u.full_name);
}

/** Returns active Sales + OB Co-ordinator (excluding Manager) — for assignment dropdowns */
export function useActiveSalesOnly(): string[] {
  const users = useAuth((s) => s.users);
  return users
    .filter((u) => u.role === "Sales" || u.role === "OB Co-ordinator")
    .map((u) => u.full_name);
}