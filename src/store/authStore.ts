import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, SUPABASE_ENABLED, setSupabaseAuthToken } from "@/lib/supabase";
import { hashPassword, verifyPassword, isHashed } from "@/lib/passwordHash";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";

export type AppRole =
  | "Admin"
  | "Sales Manager"
  | "OB Manager"
  | "Sales"
  | "OB Co-ordinator"
  | "Marketing"
  | "Co-Ordinator"
  | "Accounting";

export const ALL_ROLES: AppRole[] = [
  "Sales Manager",
  "OB Manager",
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
  jwtToken: string | null;      // custom JWT สำหรับ Supabase RLS (persisted)
  jwtExpiresAt: number | null;  // Unix timestamp (seconds)
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
  // user_id เปลี่ยนจาก "std-006" → "seed-006" เพื่อไม่ให้ชนกับ std-006 จริงใน DB
  // (ปัจจุบัน std-006 ถูกใช้เป็นพนักงานจริงคนอื่นแล้ว — ถ้า id ชนกัน จะได้ 2 การ์ดชื่อซ้ำในหน้า Standard Teams)
  { user_id: "seed-006", full_name: "บีม", username: "cosales1", password: "co123", plain_password: "co123", role: "Co-Ordinator", email: "", tel: "", created_at: new Date(6).toISOString() },
  { user_id: "std-007", full_name: "ยา", username: "acstd", password: "ac123", plain_password: "ac123", role: "Accounting", email: "", tel: "", created_at: new Date(7).toISOString() },
  { user_id: "std-008", full_name: "OB Manager", username: "obmgr", password: "ob123", plain_password: "ob123", role: "OB Manager", email: "", tel: "", created_at: new Date(8).toISOString() },
  { user_id: "std-009", full_name: "แอน", username: "obco01", password: "ob456", plain_password: "ob456", role: "OB Co-ordinator", email: "", tel: "", created_at: new Date(9).toISOString() },
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
      jwtToken: null,
      jwtExpiresAt: null,
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

        // ── ขอ custom JWT จาก Edge Function เพื่อใช้กับ Supabase RLS ──────────
        // AWAIT (ไม่ใช่ .then()) → JWT set ก่อน return → ลด race condition กับ loadAll
        // JWT นี้ทำให้ auth.role() = 'authenticated' + auth.jwt() ->> 'app_role' ใน RLS policies
        if (SUPABASE_ENABLED && supabase) {
          try {
            const { data: jwtData, error: jwtErr } = await supabase.functions.invoke("sign-jwt", {
              body: { user_id: u.user_id, password },
            });
            if (jwtErr) {
              console.warn("[auth] sign-jwt failed (RLS fallback to anon):", jwtErr.message);
            } else if (jwtData?.access_token) {
              setSupabaseAuthToken(jwtData.access_token);
              set({ jwtToken: jwtData.access_token, jwtExpiresAt: jwtData.expires_at ?? null });
              console.info("[auth] JWT set — RLS active");
            }
          } catch (e) {
            console.warn("[auth] sign-jwt exception:", e);
          }
        }

        return { ok: true };
      },

      logout: () => {
        setSupabaseAuthToken(null);
        set({ currentUserId: null, viewAsRole: null, jwtToken: null, jwtExpiresAt: null });
      },

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
          const salesRoles: AppRole[] = ["Sales", "OB Co-ordinator", "Sales Manager", "OB Manager"];
          if (salesRoles.includes(u.role)) {
            const isManager = u.role === "Sales Manager" || u.role === "OB Manager";
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
        // ── ดักจับการเปลี่ยนชื่อ ก่อน update state ────────────────────────────
        const oldUser = get().users.find((u) => u.user_id === id);
        const oldName = oldUser?.full_name;
        const newName = (patch as any).full_name?.trim() as string | undefined;
        const nameChanged = !!(newName && oldName && newName !== oldName);

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

          // ── แปลง undefined → null ก่อนส่ง Supabase ──────────────────────────
          // JSON.stringify omit undefined → Supabase ไม่อัปเดต field ที่ถูกลบ
          // เช่น avatar_url: undefined จะไม่ล้าง column → รูปกลับมาหลัง refresh
          // ใช้ null แทน undefined เพื่อให้ Supabase รับคำสั่งล้างค่าจริง
          const toSupabase = (obj: Record<string, unknown>) =>
            Object.fromEntries(
              Object.entries(obj).map(([k, v]) => [k, v === undefined ? null : v])
            );

          if (newPwd !== undefined) {
            // User เปลี่ยน password เอง → hash แล้ว save ทั้ง password_hash + plain_password
            hashPassword(newPwd).then((newHash) => {
              supabase.from("app_users")
                .update(toSupabase({ ...safePatch, password_hash: newHash, plain_password: newPwd }))
                .eq("user_id", id)
                .then(({ error }) => {
                  if (error) {
                    console.error("[supabase] update user password ล้มเหลว:", error);
                    toast.error("บันทึกข้อมูลไม่สำเร็จ (รวมรหัสผ่าน) — กรุณาลองใหม่ หรือ login ใหม่แล้วลองอีกครั้ง");
                  }
                });
            });
          } else {
            supabase.from("app_users").update(toSupabase(safePatch)).eq("user_id", id).then(({ error }) => {
              if (error) {
                console.error("[supabase] update user ล้มเหลว:", error);
                // แจ้งเตือน user ทันที — ก่อนหน้านี้ error เงียบ ทำให้รูปโปรไฟล์/ข้อมูลที่แก้
                // ดูเหมือนบันทึกสำเร็จ (optimistic local update) แต่จริงๆ ไม่ถึง Supabase
                // และหายไปหลัง refresh หรือไม่ sync ไปเครื่องอื่น
                toast.error("บันทึกข้อมูลไม่สำเร็จ — การเปลี่ยนแปลงอาจหายไปหลัง refresh กรุณาลองใหม่ หรือ login ใหม่");
              }
            });
          }

          // ── Cascade rename ทั่วระบบ ─────────────────────────────────────────
          // ถ้าเปลี่ยน full_name → sync ชื่อใหม่ไปยัง sales_reps
          // Supabase ON UPDATE CASCADE จะอัปเดต:
          //   customers(created_by, transferred_to, transferred_from)
          //   leads(assigned_to), monthly_targets(rep)
          //   route_plans(rep), quotations(rep)
          // chat_messages.author, ahagram_scores.username ไม่มี FK → อัปเดตแยก
          if (nameChanged) {
            (async () => {
              // 1. Update sales_reps.name → CASCADE ทำงานอัตโนมัติ
              const { error: repErr } = await supabase
                .from("sales_reps")
                .update({ name: newName })
                .eq("name", oldName);
              if (repErr) console.error("[rename] sales_reps update ล้มเหลว:", repErr);
              else console.log(`[rename] sales_reps: "${oldName}" → "${newName}" ✅ (CASCADE triggered)`);

              // 2. Update chat_messages.author (plain TEXT, ไม่มี FK)
              const { error: chatErr } = await supabase
                .from("chat_messages")
                .update({ author: newName })
                .eq("author", oldName);
              if (chatErr) console.error("[rename] chat_messages update ล้มเหลว:", chatErr);

              // 3. Update ahagram_scores.username + display_name (plain TEXT, ไม่มี FK)
              //    ป้องกันคะแนน AHAGRAM แยกเป็น 2 แถวเมื่อเปลี่ยนชื่อ (username เดิม vs ชื่อใหม่)
              const { error: ahagramErr } = await supabase
                .from("ahagram_scores")
                .update({ username: newName, display_name: newName })
                .eq("username", oldName);
              if (ahagramErr) console.error("[rename] ahagram_scores update ล้มเหลว:", ahagramErr);

              // 4. Sync in-memory crmStore state ทันที (dynamic import ป้องกัน circular dep)
              const { useCRM } = await import("@/store/crmStore");
              useCRM.getState().renameRepInMemory(oldName!, newName!);

              // 5. Sync in-memory ahagramLeaderboardStore ทันที
              const { useAhagramLeaderboard } = await import("@/store/ahagramLeaderboardStore");
              useAhagramLeaderboard.setState((s) => ({
                entries: s.entries.map((e) =>
                  e.username === oldName ? { ...e, username: newName!, displayName: newName! } : e
                ),
              }));

              console.log(`[rename] ✅ เปลี่ยนชื่อ "${oldName}" → "${newName}" ทั่วระบบเรียบร้อย`);
            })();
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
        // เช็คทั้ง username และ user_id — กัน seed ปลอมมาชนกับ user_id จริงที่ Admin เอา id เดิม
        // ไปสร้าง user จริงทับ (เช่น std-006 เคยเป็น seed "บีม" แต่ปัจจุบันถูกใช้จริงเป็นพนักงานอีกคน)
        if (state) {
          const existingUsernames = new Set(state.users.map((u) => u.username.toLowerCase()));
          const existingIds       = new Set(state.users.map((u) => u.user_id));
          for (const seed of SEED_USERS) {
            if (!existingUsernames.has(seed.username.toLowerCase()) && !existingIds.has(seed.user_id)) {
              state.users.push(seed);
            }
          }
        }
        // ── Restore JWT จาก localStorage เพื่อให้ RLS ทำงานทันทีหลัง page refresh ──
        // ต้องทำก่อน SupabaseSync.loadAll() วิ่ง (onRehydrateStorage runs synchronously)
        if (state?.jwtToken && state?.jwtExpiresAt) {
          const nowSec = Math.floor(Date.now() / 1000);
          if (state.jwtExpiresAt > nowSec + 60) {
            // JWT ยังไม่หมดอายุ (อย่างน้อย 60 วิ เหลืออยู่) → restore
            setSupabaseAuthToken(state.jwtToken);
            console.info("[auth] JWT restored from localStorage — RLS active");
          } else {
            // หมดอายุ → clear (ต้อง login ใหม่)
            state.jwtToken = null;
            state.jwtExpiresAt = null;
            console.info("[auth] JWT expired — cleared (re-login required)");
          }
        }
      },
    },
  ),
);

/**
/**
 * useCurrentUser — returns the currently logged-in AppUser, or null.
 *
 * ใช้ useShallow จาก zustand/react/shallow เพราะ Zustand v5 ลบ equalityFn
 * ออกจาก useStore(selector, equalityFn) แล้ว — ถ้าใส่ argument ที่ 2 จะถูก ignore
 * useShallow ทำ shallow equality comparison ทุก field ของ AppUser object
 * → component re-render เฉพาะเมื่อข้อมูลจริงเปลี่ยน ไม่ใช่แค่ array reference เปลี่ยน
 * → ป้องกัน React #185 infinite loop
 */
export function useCurrentUser(): AppUser | null {
  return useAuth(
    useShallow((s) => {
      if (!s.currentUserId) return null;
      return s.users.find((u) => u.user_id === s.currentUserId) ?? null;
    }),
  );
}

/** Returns full_names of all active users with role 'Sales', 'Sales Manager', 'OB Manager', or 'OB Co-ordinator' */
export function useActiveSalesNames(): string[] {
  const users = useAuth((s) => s.users);
  return users
    .filter((u) => u.role === "Sales" || u.role === "Sales Manager" || u.role === "OB Manager" || u.role === "OB Co-ordinator")
    .map((u) => u.full_name);
}

/** Returns full_names of Sales team only ('Sales', 'Sales Manager') — ไม่รวม OB
 *  ใช้สำหรับหน้า Target Pipeline (Sales Manager) ที่ต้องตั้งเป้าเฉพาะทีม Sales
 *  ทีม OB มีหน้า "เป้าหมายทีม OB" ของตัวเองแยกต่างหาก (OBTargets.tsx) */
export function useActiveSalesTeamNames(): string[] {
  const users = useAuth((s) => s.users);
  return users
    .filter((u) => u.role === "Sales" || u.role === "Sales Manager")
    .map((u) => u.full_name);
}

/** Returns full_names of OB team only ('OB Manager', 'OB Co-ordinator') — ไม่รวม Sales
 *  ใช้สำหรับ dropdown "Sales Owner" ตอนทีม OB สร้าง Lead เอง — ไม่ต้องเห็นชื่อฝั่ง Sales */
export function useActiveOBTeamNames(): string[] {
  const users = useAuth((s) => s.users);
  return users
    .filter((u) => u.role === "OB Manager" || u.role === "OB Co-ordinator")
    .map((u) => u.full_name);
}

/** Returns active Sales + OB Co-ordinator (excluding Manager) — for assignment dropdowns */
export function useActiveSalesOnly(): string[] {
  const users = useAuth((s) => s.users);
  return users
    .filter((u) => u.role === "Sales" || u.role === "OB Co-ordinator")
    .map((u) => u.full_name);
}

/** Returns full_names of all active OB Co-ordinators — for OB shared-pool filter */
export function useActiveOBNames(): string[] {
  const users = useAuth((s) => s.users);
  return users
    .filter((u) => u.role === "OB Co-ordinator")
    .map((u) => u.full_name);
}

/** Hook: คืนจำนวนวินาทีที่เหลือก่อน JWT หมดอายุ (null = ไม่ได้ login) */
export function useJWTSecondsLeft(): number | null {
  const expiresAt = useAuth((s) => s.jwtExpiresAt);
  if (!expiresAt) return null;
  return expiresAt - Math.floor(Date.now() / 1000);
}
