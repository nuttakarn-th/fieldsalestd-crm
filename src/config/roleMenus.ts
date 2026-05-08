import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  CalendarDays,
  BarChart3,
  Target,
  Route as RouteIcon,
  MapPinned,
  Users2,
  Contact,
  FileText,
  Megaphone,
  Receipt,
  Wallet,
  PackageSearch,
  User as UserIcon,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/store/authStore";

export type MenuTone = "gold" | "pink" | "blue" | undefined;

export interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  end?: boolean;
  tone?: MenuTone;
}

export interface RoleMenu {
  main: MenuItem[];
  footer: MenuItem[];
}

const adminMenu: RoleMenu = {
  main: [
    { title: "Dashboard", url: "/app", icon: LayoutDashboard, end: true, tone: "pink" },
    { title: "Executive Dashboard", url: "/app/executive", icon: BarChart3, tone: "gold" },
    { title: "ฐานข้อมูลลูกค้า", url: "/app/customers", icon: Users, tone: "blue" },
    { title: "Sales Pipeline", url: "/app/pipeline", icon: KanbanSquare },
    { title: "Target Pipeline", url: "/app/targets", icon: Target },
    { title: "Sales Mission", url: "/app/sales-mission", icon: Users2 },
    { title: "ตาราง Follow Up", url: "/app/followup", icon: CalendarDays },
    { title: "ใบเสนอราคา", url: "/app/quotation", icon: FileText },
    { title: "All Service", url: "/app/all-service", icon: PackageSearch },
    { title: "Financial Report", url: "/app/financial-report", icon: BarChart3 },
    { title: "Payment / Invoice", url: "/app/payment", icon: Wallet },
  ],
  footer: [
    { title: "ข้อมูลทีม Sales", url: "/app/sales-team", icon: Contact },
    { title: "My Profile", url: "/app/profile", icon: UserIcon },
  ],
};

const salesManagerMenu: RoleMenu = {
  main: [
    { title: "Executive Dashboard", url: "/app/executive", icon: BarChart3, tone: "gold" },
    { title: "Dashboard", url: "/app", icon: LayoutDashboard, end: true, tone: "pink" },
    { title: "Sales Mission", url: "/app/sales-mission", icon: Users2, tone: "blue" },
    { title: "ฐานข้อมูลลูกค้า", url: "/app/customers", icon: Users },
    { title: "Target Pipeline", url: "/app/targets", icon: Target },
    { title: "Sales Pipeline", url: "/app/pipeline", icon: KanbanSquare },
    { title: "ตาราง Follow Up", url: "/app/followup", icon: CalendarDays },
    { title: "All Service", url: "/app/all-service", icon: PackageSearch },
  ],
  footer: [
    { title: "ข้อมูลทีม Sales", url: "/app/sales-team", icon: Contact },
    { title: "My Profile", url: "/app/profile", icon: UserIcon },
  ],
};

const salesMenu: RoleMenu = {
  main: [
    { title: "Dashboard", url: "/app", icon: LayoutDashboard, end: true, tone: "pink" },
    { title: "ฐานข้อมูลลูกค้า", url: "/app/customers", icon: Users, tone: "blue" },
    { title: "Sales Pipeline", url: "/app/pipeline", icon: KanbanSquare },
    { title: "Planning + Route", url: "/app/planning", icon: RouteIcon },
    { title: "ปฏิทิน Route", url: "/app/calendar", icon: MapPinned },
    { title: "ตาราง Follow Up", url: "/app/followup", icon: CalendarDays },
    { title: "ใบเสนอราคา", url: "/app/quotation", icon: FileText },
    { title: "All Service", url: "/app/all-service", icon: PackageSearch },
  ],
  footer: [
    { title: "ข้อมูลทีม Sales", url: "/app/sales-team", icon: Contact },
    { title: "My Profile", url: "/app/profile", icon: UserIcon },
  ],
};

const marketingMenu: RoleMenu = {
  main: [
    { title: "Dashboard (Marketing)", url: "/app", icon: LayoutDashboard, end: true, tone: "pink" },
    { title: "Campaign Management", url: "/app/campaigns", icon: Megaphone, tone: "blue" },
    { title: "ฐานข้อมูลลูกค้า", url: "/app/customers", icon: Users },
    { title: "All Service", url: "/app/all-service", icon: PackageSearch },
    { title: "Marketing Report", url: "/app/marketing-report", icon: BarChart3 },
  ],
  footer: [
    { title: "My Profile", url: "/app/profile", icon: UserIcon },
  ],
};

const coordinatorMenu: RoleMenu = {
  main: [
    { title: "Dashboard (Booking)", url: "/app", icon: LayoutDashboard, end: true, tone: "pink" },
    { title: "Booking Overview", url: "/app/booking-overview", icon: PackageSearch, tone: "blue" },
    { title: "ฐานข้อมูลลูกค้า", url: "/app/customers", icon: Users },
    { title: "Sales Pipeline", url: "/app/pipeline", icon: KanbanSquare },
    { title: "Planning + Route", url: "/app/planning", icon: RouteIcon },
    { title: "ปฏิทิน Route", url: "/app/calendar", icon: MapPinned },
    { title: "ตาราง Follow Up", url: "/app/followup", icon: CalendarDays },
    { title: "ใบเสนอราคา", url: "/app/quotation", icon: FileText },
    { title: "All Service", url: "/app/all-service", icon: PackageSearch },
  ],
  footer: [
    { title: "My Profile", url: "/app/profile", icon: UserIcon },
  ],
};

const accountingMenu: RoleMenu = {
  main: [
    { title: "Dashboard (Financial)", url: "/app", icon: LayoutDashboard, end: true, tone: "pink" },
    { title: "ฐานข้อมูลลูกค้า", url: "/app/customers", icon: Users },
    { title: "ใบเสนอราคา", url: "/app/quotation", icon: FileText },
    { title: "Payment / Invoice", url: "/app/payment", icon: Receipt, tone: "blue" },
    { title: "Financial Report", url: "/app/financial-report", icon: BarChart3, tone: "gold" },
  ],
  footer: [
    { title: "My Profile", url: "/app/profile", icon: UserIcon },
  ],
};

export function getMenuForRole(role: AppRole): RoleMenu {
  switch (role) {
    case "Admin": return adminMenu;
    case "Sales Manager": return salesManagerMenu;
    case "Sales": return salesMenu;
    case "Marketing": return marketingMenu;
    case "Co-Ordinator": return coordinatorMenu;
    case "Accounting": return accountingMenu;
  }
}

// Permission helpers
export function canEditServices(role: AppRole): boolean {
  return role === "Admin" || role === "Sales Manager" || role === "Co-Ordinator" || role === "Marketing";
}

export function roleBadgeColor(role: AppRole): string {
  switch (role) {
    case "Admin": return "from-red-500 to-rose-600";
    case "Sales Manager": return "from-amber-500 to-orange-600";
    case "Sales": return "from-pink-500 to-fuchsia-600";
    case "Marketing": return "from-purple-500 to-indigo-600";
    case "Co-Ordinator": return "from-sky-500 to-cyan-600";
    case "Accounting": return "from-emerald-500 to-teal-600";
  }
}