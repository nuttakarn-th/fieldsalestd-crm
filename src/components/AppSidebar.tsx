import { ArrowLeft, User as UserIcon, Eye } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth, useCurrentUser, ALL_ROLES, type AppRole } from "@/store/authStore";
import { useCRM } from "@/store/crmStore";
import { getMenuForRole, roleBadgeColor, type MenuItem, type MenuTone } from "@/config/roleMenus";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

function toneClasses(_tone: MenuTone) {
  // Unified design — selected item = indigo pill on light bg, all items use sidebar palette
  return {
    base: "rounded-lg text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
    active: "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm",
  };
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const user = useCurrentUser();
  const viewAsRole = useAuth((s) => s.viewAsRole);
  const setViewAsRole = useAuth((s) => s.setViewAsRole);
  const allUsers = useAuth((s) => s.users);
  const currentRep = useCRM((s) => s.currentRep);
  const setCurrentRep = useCRM((s) => s.setCurrentRep);

  if (!user) return null;
  const effectiveRole: AppRole = user.role === "Admin" && viewAsRole ? viewAsRole : user.role;
  const menu = getMenuForRole(effectiveRole);
  const showRepSelector = effectiveRole === "Sales Manager" || effectiveRole === "Admin";

  // Sales reps that exist in registered users (by full_name) — show only active Sales
  const repOptions = allUsers.filter((u) => u.role === "Sales").map((u) => u.full_name);

  const renderItem = (item: MenuItem) => {
    const t = toneClasses(item.tone);
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild tooltip={item.title}>
          <NavLink to={item.url} end={item.end} className={t.base} activeClassName={t.active}>
            <item.icon className="w-4 h-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-glow shrink-0 flex items-center justify-center overflow-hidden p-1">
            <img src="/favicon.ico" alt="Standard Tour" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-bold text-sidebar-foreground text-base leading-tight">Standard Tour CRM</p>
              <p className="text-[11px] text-sidebar-foreground/60 leading-tight">Travel Sales Suite</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col">
        {menu.sections.map((section) => (
          <SidebarGroup key={section.category}>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-sidebar-primary/80">
              {section.category}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{section.items.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-sidebar-primary/80">
            ACCOUNT
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{menu.account.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-sidebar-primary/80">
            SYSTEM
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="กลับหน้าหลัก">
                  <NavLink to="/" className="rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    {!collapsed && <span>กลับหน้าหลัก</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-3">
        {!collapsed && (
          <>
            {user.role === "Admin" && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sidebar-primary/80 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> ROLE & TEAM
                </p>
                <p className="text-[10px] text-sidebar-foreground/60">ในมุมมอง ROLE</p>
                <Select
                  value={viewAsRole ?? "Admin"}
                  onValueChange={(v) => setViewAsRole(v === "Admin" ? null : (v as AppRole))}
                >
                  <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">👑 Admin (มุมมองเต็ม)</SelectItem>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>🎭 {r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showRepSelector && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sidebar-primary/80">TEAM VIEW</p>
                <p className="text-[10px] text-sidebar-foreground/60">มุมมองข้อมูล SALES</p>
                <Select value={currentRep} onValueChange={(v) => setCurrentRep(v as never)}>
                  <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">👔 ภาพรวมทีม</SelectItem>
                    {repOptions.map((r) => (
                      <SelectItem key={r} value={r}>🧑‍💼 {r}</SelectItem>
                    ))}
                    {repOptions.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">ยังไม่มี Sales ที่ลงทะเบียน</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className={`rounded-lg p-2.5 bg-gradient-to-br ${roleBadgeColor(effectiveRole)} text-white shadow-elegant`}>
              <div className="flex items-center gap-2">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/25 backdrop-blur flex items-center justify-center text-sm font-bold">
                    {user.full_name[0]?.toUpperCase() ?? <UserIcon className="w-4 h-4" />}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-xs leading-tight truncate font-semibold">{user.full_name}</p>
                  <p className="text-[10px] leading-tight opacity-90">มุมมอง — {effectiveRole}</p>
                </div>
              </div>
            </div>
          </>
        )}
        {collapsed && (
          user.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} className="w-9 h-9 mx-auto rounded-full object-cover" />
          ) : (
            <div className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${roleBadgeColor(effectiveRole)}`}>
              {user.full_name[0]?.toUpperCase() ?? "U"}
            </div>
          )
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
