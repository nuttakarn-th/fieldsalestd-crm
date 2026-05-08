import { Link } from "react-router-dom";
import { ArrowLeft, Phone, MapPin, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const phones = [
  { label: "ทัวร์ต่างประเทศ", num: "081-681-5588" },
  { label: "ทัวร์ในประเทศ", num: "088-604-4933" },
  { label: "ตั๋วเครื่องบิน", num: "086-923-1661" },
  { label: "รถเช่า", num: "094-571-6666" },
  { label: "สำนักงานใหญ่", num: "053-818-600" },
  { label: "สาขากรุงเทพฯ", num: "092-197-2185" },
];

export default function ContactInfo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <header className="px-6 py-6 max-w-5xl mx-auto flex items-center gap-3">
        <Link to="/"><Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">ข้อมูลติดต่อ</h1>
          <p className="text-sm text-muted-foreground">Line, เบอร์โทรแต่ละแผนก และที่อยู่บริษัท</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16 space-y-6">
        <section className="rounded-3xl bg-card border shadow-soft p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-emerald-600" /> Line Official</h2>
          <div className="grid md:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex flex-col items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent("https://line.me/R/ti/p/@standardtour")}`}
                alt="Line QR"
                className="w-44 h-44 rounded-lg bg-white p-2"
              />
              <p className="text-xs text-muted-foreground mt-2">สแกนเพิ่มเพื่อน</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Line ID</p>
              <p className="text-2xl font-bold text-emerald-700">@standardtour</p>
              <a href="https://line.me/R/ti/p/@standardtour" target="_blank" rel="noreferrer" className="inline-block">
                <Button className="bg-emerald-600 hover:bg-emerald-700"><MessageCircle className="w-4 h-4 mr-2" /> เพิ่มเพื่อนบน Line</Button>
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-card border shadow-soft p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Phone className="w-5 h-5 text-primary" /> เบอร์โทรแต่ละแผนก</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {phones.map((p) => (
              <a key={p.label} href={`tel:${p.num.replace(/-/g, "")}`} className="flex items-center justify-between rounded-2xl border bg-muted/30 hover:bg-muted/50 transition p-4">
                <div>
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                  <p className="font-bold text-lg">{p.num}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Phone className="w-4 h-4" /></div>
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-card border shadow-soft p-6 space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-accent" /> เวลาทำการ</h2>
          <p className="text-sm">จันทร์-เสาร์ <span className="font-semibold">08.30 - 17.30 น.</span> <span className="text-muted-foreground">(หยุดวันอาทิตย์)</span></p>
        </section>

        <section className="rounded-3xl bg-card border shadow-soft p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-destructive" /> ที่อยู่บริษัท</h2>
          <div>
            <p className="font-semibold">บริษัท สแตนดาร์ดทัวร์ จำกัด</p>
            <p className="text-sm text-muted-foreground mt-1">เลขประจำตัวผู้เสียภาษี 0505533000491 · ใบอนุญาตเลขที่ 21/00296</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">สำนักงานใหญ่</p>
            <p className="text-sm">172/8 ถนนช้างคลาน ตำบลช้างคลาน อำเภอเมือง จังหวัดเชียงใหม่ 50100</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">สาขากรุงเทพฯ</p>
            <p className="text-sm">ที่ 00003 อาคารฟอรั่ม ทาวเวอร์ ห้อง C4-C5 ชั้น 32 เลขที่ 184/222 ถนนรัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพ 10310</p>
          </div>
        </section>
      </main>
    </div>
  );
}