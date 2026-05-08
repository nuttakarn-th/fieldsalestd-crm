import { Link } from "react-router-dom";
import { ArrowLeft, Facebook, Instagram, Youtube, Globe, ExternalLink, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const channels = [
  { name: "Facebook", icon: Facebook, url: "https://www.facebook.com/standardtour", tone: "bg-blue-600" },
  { name: "Instagram", icon: Instagram, url: "https://www.instagram.com/standardtour", tone: "bg-pink-600" },
  { name: "TikTok", icon: Music2, url: "https://www.tiktok.com/@standardtour", tone: "bg-black" },
  { name: "YouTube", icon: Youtube, url: "https://www.youtube.com/@standardtour", tone: "bg-red-600" },
  { name: "Website", icon: Globe, url: "https://www.standardtour.com", tone: "bg-emerald-600" },
];

export default function TourPresentation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <header className="px-6 py-6 max-w-5xl mx-auto flex items-center gap-3">
        <Link to="/"><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Standard Tour Presentation</h1>
          <p className="text-sm text-muted-foreground">Company Profile และช่องทางการติดตามของเรา</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16 space-y-6">
        <section className="rounded-3xl bg-card border shadow-soft p-6">
          <h2 className="text-xl font-bold mb-2">Company Profile</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            บริษัท สแตนดาร์ดทัวร์ จำกัด ผู้นำด้านบริการท่องเที่ยวคุณภาพ ทั้งทัวร์ในประเทศและต่างประเทศ จองตั๋วเครื่องบิน และเช่ารถเดินทาง
            ดำเนินงานด้วยทีมมืออาชีพ พร้อมบริการลูกค้าระดับพรีเมียม
          </p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">ก่อตั้ง</p><p className="font-semibold">2533</p></div>
            <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">ใบอนุญาต</p><p className="font-semibold">21/00296</p></div>
            <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">สำนักงาน</p><p className="font-semibold">เชียงใหม่ · กรุงเทพฯ</p></div>
            <div className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">บริการ</p><p className="font-semibold">Tour · Flight · Rent</p></div>
          </div>
        </section>

        <section className="rounded-3xl bg-card border shadow-soft p-6">
          <h2 className="text-xl font-bold mb-4">ช่องทางสื่อโซเชียล</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {channels.map((c) => (
              <a key={c.name} href={c.url} target="_blank" rel="noreferrer"
                className={`rounded-2xl ${c.tone} text-white p-4 flex items-center justify-between hover:opacity-90 transition shadow-soft`}>
                <span className="flex items-center gap-3 font-semibold"><c.icon className="w-5 h-5" /> {c.name}</span>
                <ExternalLink className="w-4 h-4 opacity-80" />
              </a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">* Admin สามารถปรับลิงก์ได้จากการตั้งค่าระบบในอนาคต</p>
        </section>
      </main>
    </div>
  );
}