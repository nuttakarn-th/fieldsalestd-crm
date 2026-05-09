import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Phone, MessageCircle, Mail, Users2, TrendingUp, FileText, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCRM, formatTHB } from "@/store/crmStore";
import { useAuth } from "@/store/authStore";
import { useChatUI } from "@/components/ChatWidget";
import { roleBadgeColor } from "@/config/roleMenus";

export default function SalesTeam() {
  const openChat = useChatUI((s) => s.open);
  const users = useAuth((s) => s.users);
  const customers = useCRM((s) => s.customers);
  const leads = useCRM((s) => s.leads);
  const quotations = useCRM((s) => s.quotations);
  const routes = useCRM((s) => s.routes);

  // Show all users with Sales-related roles
  const teamUsers = useMemo(
    () => users
      .filter((u) => ["Sales", "Sales Manager"].includes(u.role))
      .sort((a, b) => a.role.localeCompare(b.role) || a.full_name.localeCompare(b.full_name, "th")),
    [users],
  );

  const statsFor = (name: string) => {
    const myCustomers = customers.filter((c) => c.created_by === name).length;
    const myLeads = leads.filter((l) => l.assigned_to === name);
    const closedWon = myLeads.filter((l) => l.status === "Closed Won");
    const totalSales = closedWon.reduce((s, l) => s + (l.quoted_price || 0), 0);
    const myDocs = quotations.filter((q) => q.rep === name);
    const myRoutes = routes.filter((r) => r.rep === name);
    const completedStops = myRoutes.flatMap((r) => r.stops).filter((s) => s.status === "completed").length;
    return {
      customers: myCustomers,
      leads: myLeads.length,
      closedWon: closedWon.length,
      totalSales,
      docs: myDocs.length,
      routes: myRoutes.length,
      completedStops,
    };
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Users2 className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ข้อมูลทีม Sales</h1>
          <p className="text-sm text-muted-foreground">รายชื่อ + สรุปผลงานของแต่ละคน · {teamUsers.length} คน</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamUsers.map((u) => {
          const s = statsFor(u.full_name);
          return (
            <div key={u.user_id} className="bg-card border rounded-2xl p-5 shadow-soft hover:shadow-elegant transition">
              <div className="flex items-center gap-3 mb-4">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.full_name} className="w-14 h-14 rounded-2xl object-cover shadow-glow" />
                ) : (
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${roleBadgeColor(u.role)} flex items-center justify-center text-white text-xl font-bold shadow-glow`}>
                    {u.full_name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg truncate">{u.full_name}</h3>
                  <Badge variant="outline" className="text-[10px]">{u.department || u.role}</Badge>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-muted-foreground">ลูกค้า</p>
                  <p className="font-bold text-base">{s.customers}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-muted-foreground">Leads</p>
                  <p className="font-bold text-base">{s.leads} <span className="text-success font-normal">· ปิด {s.closedWon}</span></p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2 col-span-2">
                  <p className="text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> ยอดขายปิดได้</p>
                  <p className="font-bold text-base text-primary">{formatTHB(s.totalSales)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> เอกสาร</p>
                  <p className="font-bold text-base">{s.docs}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Mission สำเร็จ</p>
                  <p className="font-bold text-base">{s.completedStops}</p>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-1 text-sm mb-3">
                {u.tel && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">{u.tel}</span>
                  </div>
                )}
                {u.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="truncate text-foreground">{u.email}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {u.tel && (
                  <Button asChild className="flex-1 bg-gradient-coral hover:opacity-90">
                    <a href={`tel:${u.tel}`}><Phone className="w-4 h-4 mr-2" /> โทร</a>
                  </Button>
                )}
                <Button variant="outline" className="flex-1 border-primary/40 text-primary hover:bg-primary/5" onClick={() => openChat(u.full_name as never)}>
                  <MessageCircle className="w-4 h-4 mr-2" /> Chat
                </Button>
              </div>
            </div>
          );
        })}
        {teamUsers.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            ยังไม่มีพนักงานในทีม Sales — Admin เพิ่มได้ที่หน้า User Management
          </div>
        )}
      </div>
    </div>
  );
}
