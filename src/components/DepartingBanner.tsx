/**
 * DepartingBanner.tsx
 * แสดงทริปที่กำลังออกเดินทางใน sidebar (start_date ≤ today ≤ end_date)
 * Design: Compact pulse strip (แบบ A)
 */
import { useMemo } from "react";
import { useServices } from "@/store/serviceStore";

// แปลงชื่อประเทศเป็น flag emoji (รองรับประเทศหลักที่ Standard Tour ขาย)
function countryFlag(country: string): string {
  const map: Record<string, string> = {
    ญี่ปุ่น: "🇯🇵", เกาหลี: "🇰🇷", จีน: "🇨🇳", ไต้หวัน: "🇹🇼",
    ฮ่องกง: "🇭🇰", เวียดนาม: "🇻🇳", สิงคโปร์: "🇸🇬",
    มาเลเซีย: "🇲🇾", อินโดนีเซีย: "🇮🇩", กัมพูชา: "🇰🇭",
    พม่า: "🇲🇲", อินเดีย: "🇮🇳", ยุโรป: "🇪🇺", อังกฤษ: "🇬🇧",
    ฝรั่งเศส: "🇫🇷", อิตาลี: "🇮🇹", สวิตเซอร์แลนด์: "🇨🇭",
    ออสเตรเลีย: "🇦🇺", นิวซีแลนด์: "🇳🇿", ตุรกี: "🇹🇷",
    รัสเซีย: "🇷🇺", อียิปต์: "🇪🇬", ดูไบ: "🇦🇪", สหรัฐ: "🇺🇸",
    อเมริกา: "🇺🇸", ไทย: "🇹🇭",
  };
  // ลองจับ keyword จากชื่อประเทศ
  for (const [key, flag] of Object.entries(map)) {
    if (country.includes(key)) return flag;
  }
  return "✈️";
}

// แปลง ISO date → "20 ก.ค." (ย่อ)
function shortThaiDate(iso: string): string {
  const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
                  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

interface Props {
  collapsed?: boolean;
}

export function DepartingBanner({ collapsed }: Props) {
  const tours = useServices((s) => s.tours);
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  const departing = useMemo(() => {
    const result: { tourName: string; country: string; city: string; duration: string; endDate: string; pax: number }[] = [];

    for (const tour of tours) {
      if (!tour.periods?.length) continue;
      for (const p of tour.periods) {
        if (p.cancelled || p.archived) continue;
        if (!p.start_date || !p.end_date) continue;
        if (p.start_date <= today && today <= p.end_date) {
          result.push({
            tourName: `${tour.country} ${tour.city}`,
            country: tour.country,
            city: tour.city,
            duration: tour.duration,
            endDate: p.end_date,
            pax: (p.total_seats ?? 0) - (p.quota ?? 0),
          });
        }
      }
    }

    // เรียงตาม endDate ใกล้สุดก่อน
    return result.sort((a, b) => a.endDate.localeCompare(b.endDate));
  }, [tours, today]);

  if (departing.length === 0) return null;

  // Collapsed: แสดงแค่จุดกะพริบ + จำนวน
  if (collapsed) {
    return (
      <div
        className="mx-auto flex items-center justify-center w-8 h-8 rounded-full bg-green-500/15 border border-green-500/30"
        title={`กำลังเดินทาง ${departing.length} ทริป`}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
      </div>
    );
  }

  return (
    <div className="mx-2 rounded-lg border border-green-500/25 bg-green-500/8 px-3 py-2.5">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
          กำลังเดินทาง {departing.length} ทริป
        </span>
      </div>

      {/* Trip list */}
      <div className="space-y-0">
        {departing.map((trip, i) => (
          <div key={i}>
            {i > 0 && <div className="my-2 border-t border-green-500/20" />}
            <div className="text-xs font-medium text-sidebar-foreground leading-snug">
              {countryFlag(trip.country)} {trip.tourName} {trip.duration}
            </div>
            <div className="text-[10px] text-sidebar-foreground/55 mt-0.5">
              วันกลับ {shortThaiDate(trip.endDate)}
              {trip.pax > 0 && ` · ${trip.pax} pax`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
