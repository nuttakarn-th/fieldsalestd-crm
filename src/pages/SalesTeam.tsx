import { Phone, MessageCircle, Mail, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SALES_REP_INFO, useCRM } from "@/store/crmStore";
import { useChatUI } from "@/components/ChatWidget";

export default function SalesTeam() {
  const openChat = useChatUI((s) => s.open);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Users2 className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ข้อมูลทีม Sales</h1>
          <p className="text-sm text-muted-foreground">รายชื่อทีมงาน, เบอร์โทร และช่องทางติดต่อด่วน</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SALES_REP_INFO.map((rep) => (
          <div key={rep.name} className="bg-card border rounded-2xl p-5 shadow-soft hover:shadow-elegant transition">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${rep.avatar_color} flex items-center justify-center text-white text-xl font-bold shadow-glow`}>
                {rep.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{rep.name}</h3>
                <p className="text-xs text-muted-foreground">{rep.position}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground">{rep.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4 text-primary" />
                <span className="truncate text-foreground">{rep.email}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button asChild className="flex-1 bg-gradient-coral hover:opacity-90">
                <a href={`tel:${rep.phone}`}><Phone className="w-4 h-4 mr-2" /> โทรด่วน</a>
              </Button>
              <Button variant="outline" className="flex-1 border-primary/40 text-primary hover:bg-primary/5" onClick={() => openChat(rep.name)}>
                <MessageCircle className="w-4 h-4 mr-2" /> Chat
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}