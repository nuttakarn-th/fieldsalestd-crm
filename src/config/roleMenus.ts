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
  Map,
  LayoutGrid,
  User as UserIcon,
  RefreshCcw,
  Diamond,
  Tag,
  UserPlus,
  CalendarRange,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
// Note: Users2 imported above covers Org Chart icon
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
        { title: "Province Heatmap", url: "/app/heatmap", icon: Map },
        { title: "Service and Stock", url: "/service-stock", icon: PackageSearch },
        { title: "Stock Analytics",   url: "/app/stock-analytics", icon: TrendingUp },
      ],
    },
    {
      category: "FINANCE",
      items: [
        { title: "Financial Report", url: "/app/financial-report", icon: BarChart3 },
        { title: "Payment / Invoice", url: "/app/payment", icon: Wallet },
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
        { title: "Province Heatmap", url: "/app/heatmap", icon: Map },
        { title: "Service and Stock", url: "/service-stock", icon: PackageSearch },
        { title: "Stock Analytics",   url: "/app/stock-analytics", icon: TrendingUp },
      ],
    },
    {
      category: "AUDIENCE TOOLS",
      items: [
        { title: "Cold Lead Re-engage", url: "/app/audience/cold-lead", icon: RefreshCcw },
        { title: "VIP Loyalty List",    url: "/app/audience/vip",       icon: Diamond },
        { title: "Interest Segment",    url: "/app/audience/interest",  icon: Tag },
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
      items: [
        { title: "Leads/Customers", url: "/app/customers", icon: Users },
        { title: "Marketing Leads", url: "/app/marketing-leads", icon: UserPlus },
      ],
    },
    {
      category: "SALES MANAGEMENT",
      items: [
        { title: "Sales Pipeline", url: "/app/pipeline", icon: KanbanSquare },
        { title: "Calendar Plan", url: "/app/calendar-plan", icon: CalendarRange },
        { title: "Planning + Route", url: "/app/planning", icon: RouteIcon },
        { title: "Follow-up", url: "/app/followup", icon: CalendarDays },
        { title: "Province Heatmap", url: "/app/heatmap", icon: Map },
        { title: "Quotation/Invoice", url: "/app/quotation", icon: FileText },
        { title: "Service and Stock", url: "/service-stock", icon: PackageSearch },
        { title: "Stock Analytics",   url: "/app/stock-analytics", icon: TrendingUp },
      ],
    },
    {
      category: "AUDIENCE TOOLS",
      items: [
        { title: "Cold Lead Re-engage", url: "/app/audience/cold-lead", icon: RefreshCcw },
      ],
    },
  ],
  account: [],
};

const marketingMenu: RoleMenu = {
  sections: [
    {
      // หน้าแรกของ Marketing — Intelligence Feed ที่รู้ทุก Signal
      category: "OVERVIEW",
      items: [
        { title: "Marketing Hub",         url: "/marketing",              icon: Megaphone, end: true },
      ],
    },
    {
      // เครื่องมือสร้าง Content & Campaign
      category: "CAMPAIGNS",
      items: [
        { title: "Campaign Management",   url: "/marketing/campaigns",        icon: Megaphone },
        { title: "Contents Management",   url: "/marketing-contents",         icon: LayoutGrid },
        { title: "Audience Builder",      url: "/audience-builder",           icon: Target },
      ],
    },
    {
      // Outbound / OB team leads
      // ── ใช้ path /marketing/* ตรงๆ (ไม่ใช่ /app/customers?dept=) ──
      // เหตุผล: /app/customers มี redirect guard เด้งกลับ /marketing/customers อยู่แล้วสำหรับ role Marketing
      // แต่ redirect ไม่เก็บ query string (?dept=) ไว้ ทำให้ตัวกรอง OB/Sales หายไป และ NavLink
      // ไฮไลท์ผิด (3 ปุ่มติดสีพร้อมกัน เพราะ pathname ซ้ำกันหมด ต่างแค่ query) — ชี้ตรงไปที่หน้าเฉพาะทาง
      // (MarketingOBLeads / MarketingSalesLeads) แก้ปัญหาได้ตรงจุดและ UX ดีกว่าด้วย
      category: "OUTBOUND LEADS",
      items: [
        { title: "OB Leads",              url: "/marketing/ob-leads",     icon: Users2 },
      ],
    },
    {
      // Sales team leads
      category: "SALES LEADS",
      items: [
        { title: "Sales Leads",           url: "/marketing/sales-leads",  icon: Users },
        { title: "ลูกค้าทั้งหมด",          url: "/marketing/customers",    icon: UserPlus },
        { title: "Marketing Leads",       url: "/marketing/marketing-leads", icon: UserPlus },
      ],
    },
    {
      // ติดตาม Stock โปรแกรม
      category: "STOCK",
      items: [
        { title: "Service and Stock",     url: "/marketing/all-service",     icon: PackageSearch },
        { title: "Stock Analytics",       url: "/marketing/stock-analytics", icon: TrendingUp },
      ],
    },
    {
      category: "REPORTS",
      items: [
        { title: "Marketing Report",      url: "/marketing/marketing-report", icon: BarChart3 },
        { title: "Ads Dashboard",         url: "/ads-dashboard",          icon: TrendingUp },
      ],
    },
  ],
  account: [],
};

const obCoordinatorMenu: RoleMenu = {
  sections: [
    {
      category: "OVERVIEW",
      items: [
        { title: "OB Dashboard", url: "/app/ob-dashboard", icon: LayoutDashboard },
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
        { title: "Province Heatmap", url: "/app/heatmap", icon: Map },
        { title: "Quotation/Invoice", url: "/app/quotation", icon: FileText },
      ],
    },
    {
      category: "SERVICES",
      items: [
        { title: "Service and Stock", url: "/service-stock", icon: PackageSearch },
        { title: "Stock Analytics",   url: "/app/stock-analytics", icon: TrendingUp },
      ],
    },
    {
      category: "INCENTIVE",
      items: [
        { title: "Incentive Pipeline", url: "/app/incentive-pipeline", icon: Trophy },
      ],
    },
  ],
  account: [],
};

const obManagerMenu: RoleMenu = {
  sections: [
    {
      category: "OVERVIEW",
      items: [
        { title: "OB Dashboard", url: "/app/ob-dashboard", icon: LayoutDashboard },
        { title: "Executive Dashboard", url: "/app/executive", icon: BarChart3 },
      ],
    },
    {
      category: "CUSTOMER",
      items: [{ title: "Leads/Customers", url: "/app/customers", icon: Users }],
    },
    {
      category: "OB MANAGEMENT",
      items: [
        { title: "Sales Pipeline", url: "/app/pipeline", icon: KanbanSquare },
        { title: "Target Pipeline", url: "/app/ob-targets", icon: Target },
        { title: "Follow-up", url: "/app/followup", icon: CalendarDays },
        { title: "Province Heatmap", url: "/app/heatmap", icon: Map },
        { title: "Service and Stock", url: "/service-stock", icon: PackageSearch },
        { title: "Stock Analytics", url: "/app/stock-analytics", icon: TrendingUp },
      ],
    },
    {
      category: "INCENTIVE",
      items: [
        { title: "Incentive Pipeline", url: "/app/incentive-pipeline", icon: Trophy },
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
        { title: "Stock Analytics",   url: "/app/stock-analytics", icon: TrendingUp },
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
  ],
  account: [],
};

export function getMenuForRole(role: AppRole): RoleMenu {
  switch (role) {
    case "Admin": return adminMenu;
    case "Sales Manager": return salesManagerMenu;
    case "OB Manager": return obManagerMenu;
    case "Sales": return salesMenu;
    case "OB Co-ordinator": return obCoordinatorMenu;
    case "Marketing": return marketingMenu;
    case "Co-Ordinator": return coordinatorMenu;
    case "Accounting": return accountingMenu;
  }
}

export function canEditServices(role: AppRole): boolean {
  return role === "Admin" || role === "Sales Manager" || role === "OB Manager" || role === "OB Co-ordinator" || role === "Co-Ordinator" || role === "Marketing";
}

export function roleBadgeColor(role: AppRole): string {
  switch (role) {
    case "Admin": return "from-red-500 to-rose-600";
    case "Sales Manager": return "from-amber-500 to-orange-600";
    case "OB Manager": return "from-teal-600 to-cyan-700";
    case "Sales": return "from-pink-500 to-fuchsia-600";
    case "OB Co-ordinator": return "from-teal-500 to-emerald-600";
    case "Marketing": return "from-purple-500 to-indigo-600";
    case "Co-Ordinator": return "from-sky-500 to-cyan-600";
    case "Accounting": return "from-emerald-500 to-teal-600";
  }
}
