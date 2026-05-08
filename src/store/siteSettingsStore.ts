import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SocialLink { name: string; url: string; tone: string }
export interface PhoneEntry { label: string; num: string }

interface State {
  // Tour Presentation
  companyProfile: string;
  socialLinks: SocialLink[];
  presentationPdfUrl?: string;
  presentationPdfName?: string;
  // Contact Info
  lineId: string;
  lineUrl: string;
  workingHours: string;
  phones: PhoneEntry[];
  hqAddress: string;
  bkkAddress: string;
  taxId: string;
  license: string;

  setProfile: (v: string) => void;
  setSocial: (l: SocialLink[]) => void;
  setPdf: (url?: string, name?: string) => void;
  setContact: (patch: Partial<Pick<State, "lineId" | "lineUrl" | "workingHours" | "phones" | "hqAddress" | "bkkAddress" | "taxId" | "license">>) => void;
}

const DEFAULT_SOCIAL: SocialLink[] = [
  { name: "Facebook", url: "https://www.facebook.com/standardtour", tone: "bg-blue-600" },
  { name: "Instagram", url: "https://www.instagram.com/standardtour", tone: "bg-pink-600" },
  { name: "TikTok", url: "https://www.tiktok.com/@standardtour", tone: "bg-black" },
  { name: "YouTube", url: "https://www.youtube.com/@standardtour", tone: "bg-red-600" },
  { name: "Website", url: "https://www.standardtour.com", tone: "bg-emerald-600" },
];

const DEFAULT_PHONES: PhoneEntry[] = [
  { label: "ทัวร์ต่างประเทศ", num: "081-681-5588" },
  { label: "ทัวร์ในประเทศ", num: "088-604-4933" },
  { label: "ตั๋วเครื่องบิน", num: "086-923-1661" },
  { label: "รถเช่า", num: "094-571-6666" },
  { label: "สำนักงานใหญ่", num: "053-818-600" },
  { label: "สาขากรุงเทพฯ", num: "092-197-2185" },
];

export const useSiteSettings = create<State>()(persist((set) => ({
  companyProfile: "บริษัท สแตนดาร์ดทัวร์ จำกัด ผู้นำด้านบริการท่องเที่ยวคุณภาพ ทั้งทัวร์ในประเทศและต่างประเทศ จองตั๋วเครื่องบิน และเช่ารถเดินทาง ดำเนินงานด้วยทีมมืออาชีพ พร้อมบริการลูกค้าระดับพรีเมียม",
  socialLinks: DEFAULT_SOCIAL,
  presentationPdfUrl: undefined,
  presentationPdfName: undefined,
  lineId: "@standardtour",
  lineUrl: "https://line.me/R/ti/p/@standardtour",
  workingHours: "จันทร์-เสาร์ 08.30 - 17.30 น. (หยุดวันอาทิตย์)",
  phones: DEFAULT_PHONES,
  hqAddress: "172/8 ถนนช้างคลาน ตำบลช้างคลาน อำเภอเมือง จังหวัดเชียงใหม่ 50100",
  bkkAddress: "ที่ 00003 อาคารฟอรั่ม ทาวเวอร์ ห้อง C4-C5 ชั้น 32 เลขที่ 184/222 ถนนรัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพ 10310",
  taxId: "0505533000491",
  license: "21/00296",
  setProfile: (v) => set({ companyProfile: v }),
  setSocial: (l) => set({ socialLinks: l }),
  setPdf: (url, name) => set({ presentationPdfUrl: url, presentationPdfName: name }),
  setContact: (patch) => set(patch as never),
}), { name: "stdtour-site-v1" }));
