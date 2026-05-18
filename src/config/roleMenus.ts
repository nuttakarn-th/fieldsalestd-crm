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
  FileText,
  Megaphone,
  Receipt,
  Wallet,
  PackageSearch,
  User as UserIcon,
  Home,
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

export interface MenuSection {
  category: string;
  items: MenuItem[];
}

export interface RoleMenu {
  /** Grouped sections (rendered in order) */
  sections: MenuSection[];
  /** Account section (My Profile etc.) — at the bottom of the scrollable list */
  account: MenuItem[];
}

const adminMenu: RoleMenu = {
  sections: [
    {
      category: "OVERVIEW",
      items: [
        { title: "Dashboard", url: "/app", icon: LayoutDashboard, end: true },
        { title: "Executive Dashboard", url: "/app/executive", icon: BarChart3 },
      ],
    },
    {
      category: "CUSTOMER",
      items: [
        { title: "Leads/Customers", url: "/app/customers", icon: Users },
      ],
    },
    {
      category: "SALES MANAGEMENT",
      items: [
        { title: "Sales Pipeline", url: "/app/pipeline", icon: KanbanSquare },
        { title: "Target Pipeline", url: "/app/targets", icon: Target },
        { title: "Sales Mission", url: "/app/sales-mission", icon: Users2 },
        { title: "Follow-up", url: "/app/followup", icon: CalendarDays },
        { title: "Quotation/Invoice", url: "/app/quotation", icon: FileText },
        { title: "Service and Stock", url: "/service-stock", icon: PackageSearch },
      ],
    },
    {
      category: "FINANCE",
      items: [
        { title: "Financial Report", url: "/app/financial-report", icon: BarChart3 },
        { title: "Payment / Invoice", url: "/app/payment", icon: Wallet },
      ],
    },
    {
      category: "NAVIGATION",
      items: [
        { title: "กลับหน้าหลัก", url: "/", icon: Home },
      ],
    },
  ],
  account: [],
};

const salesManagerMenu: RoleMenu = {
  sections: [
    {
      category: "OVERVIEW",
      items: [
        { title: "Executive Dashboard", url: "/app/executive", icon: BarChart3 },
        { title: "Dashboard", url: "/app", icon: LayoutDashboard, end: true },
      ],
    },
    {
      category: "CUSTOMER",
      items: [{ title: "Leads/Customers", url: "/app/customers", icon: Users }],
    },
    {
      category: "SALES MANAGEMENT",
      items: [
        { title: "Sales Pipeline", url: "/app/pipeline", icon: KanbanSquare },
        { title: "Target Pipeline", url: "/app/targets", icon: Target },
        { title: "Sales Mission", url: "/app/sales-mission", icon: Users2 },
        { title: "Follow-up", url: "/app/followup", icon: CalendarDays },
        { title: "Service and Stock", url: "/service-stock", icon: PackageSearch },
      ],
    },
    {
      category: "NAVIGATION",
      items: [
        { title: "กลับหน้าหลัก", url: "/", icon: Home },
      ],
    },
  ],
  account: [],
};

const salesMenu: RoleMenu = {
  sections: [
    {
      category: "OVERVIEW",
      items: [{ title: "Dashboard", url: "/app", icon: LayoutDashboard, end: true }],
    },
    {
      category: "CUSTOMER",
      items: [{ title: "Leads/Customers", url: "/app/customers", icon: Users }],
    },
    {
      category: "SALES MANAGEMENT",
      items: [
        { title: "Sales Pipeline", url: "/app/pipeline", icon: KanbanSquare },
        { title: "Planning + Route", url: "/app/planning", icon: RouteIcon },
        { title: "Calendar Route", url: "/app/calendar", icon: MapPinned },
        { title: "Follow-up", url: "/app/followup", icon: CalendarDays },
        { title: "Quotation/Invoice", url: "/app/quotation", icon: FileText },
        { title: "Service and Stock", url: "/service-stock", icon: PackageSearch },
      ],
    },
    {
      category: "NAVIGATION",
      items: [
        { title: "กลับหน้าหลัก", url: "/", icon: Home },
      ],
    },
  ],
  account: [],
};

const marketingMenu: RoleMenu = {
  sections: [
    {
      category: "OVERVIEW",
      items: [{ title: "Marketing Dashboard", url: "/marketing-dashboard", icon: LayoutDashboard, end: true }],
    },
    {
      category: "CUSTOMER",
      items: [{ title: "Leads/Customers", url: "/marketing-customers", icon: Users }],
    },
    {
      category: "MARKETING",
      items: [
        { title: "Campaign Management", url: "/marketing-campaigns", icon: Megaphone },
        { title: "Service and Stock", url: "/service-stock", icon: PackageSearch },
      ],
    },
    {
      category: "REPORT & DATA",
      items: [{ title: "Marketing Report", url: "/marketing-report", icon: BarChart3 }],
    },
    {
      category: "NAVIGATION",
      items: [
        { title: "กลับหน้าหลัก", url: "/", icon: Home },
      ],
    },
  ],
  account: [],
};

const coordinatorMenu: RoleMenu = {
  sections: [
    {
      category: "OVERVIEW",
      items: [
        { title: "Dashboard (Booking)", url: "/app", icon: LayoutDashboard, end: true },
        { title: "Booking Overview", url: "/app/booking-overview", icon: PackageSearch },
      ],
    },
    {
      category: "CUSTOMER",
      items: [{ title: "Leads/Customers", url: "/app/customers", icon: Users }],
    },
    {
      category: "SALES MANAGEMENT",
      items: [
        { title: "Sales Pipeline", url: "/app/pipeline", icon: KanbanSquare },
        { title: "Planning + Route", url: "/app/planning", icon: RouteIcon },
        { title: "Calendar Route", url: "/app/calendar", icon: MapPinned },
        { title: "Follow-up", url: "/app/followup", icon: CalendarDays },
        { title: "Quotation/Invoice", url: "/app/quotation", icon: FileText },
        { title: "Service and Stock", url: "/service-stock", icon: PackageSearch },
      ],
    },
    {
      category: "NAVIGATION",
      items: [
        { title: "กลับหน้าหลัก", url: "/", icon: Home },
      ],
    },
  ],
  account: [],
};

const accountingMenu: RoleMenu = {
  sections: [
    {
      category: "OVERVIEW",
      items: [{ title: "Dashboard (Financial)", url: "/app", icon: LayoutDashboard, end: true }],
    },
    {
      category: "CUSTOMER",
      items: [{ title: "Leads/Customers", url: "/app/customers", icon: Users }],
    },
    {
      category: "FINANCE",
      items: [
        { title: "Quotation/Invoice", url: "/app/quotation", icon: FileText },
        { title: "Payment / Invoice", url: "/app/payment", icon: Receipt },
        { title: "Financial Report", url: "/app/financial-report", icon: BarChart3 },
      ],
    },
    {
      category: "NAVIGATION",
      items: [
        { title: "กลับหน้าหลัก", url: "/", icon: Home },
      ],
    },
  ],
  account: [],
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
