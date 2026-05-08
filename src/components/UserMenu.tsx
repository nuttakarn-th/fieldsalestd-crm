import { LogOut, User as UserIcon, Sun, Moon } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, useCurrentUser } from "@/store/authStore";
import { roleBadgeColor } from "@/config/roleMenus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

export function UserMenu() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const logout = useAuth((s) => s.logout);
  const theme = useAuth((s) => s.theme);
  const toggleTheme = useAuth((s) => s.toggleTheme);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} className="w-9 h-9 rounded-full object-cover shadow-elegant" />
          ) : (
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${roleBadgeColor(user.role)} flex items-center justify-center text-sm font-bold text-white shadow-elegant`}>
              {user.full_name[0]?.toUpperCase() ?? "U"}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleBadgeColor(user.role)} flex items-center justify-center text-xs font-bold text-white`}>
              {user.full_name[0]?.toUpperCase()}
            </div>
          )}
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate">{user.full_name}</p>
            <p className="text-[10px] text-muted-foreground">{user.role}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/profile" className="cursor-pointer">
            <UserIcon className="w-4 h-4 mr-2" /> My Profile
          </Link>
        </DropdownMenuItem>
        <div className="flex items-center justify-between px-2 py-1.5 text-sm">
          <div className="flex items-center gap-2">
            {theme === "day" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "day" ? "Day Mode" : "Night Mode"}</span>
          </div>
          <Switch checked={theme === "night"} onCheckedChange={toggleTheme} />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive font-semibold"
        >
          <LogOut className="w-4 h-4 mr-2" /> ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}