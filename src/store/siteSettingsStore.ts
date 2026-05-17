import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

export interface SocialLink { name: string; url: string; tone: string }
export interface PhoneEntry { label: string; num: string }
export interface PresentationItem {
  id: string;
  title: string;
  pdfUrl: string;
  pdfName: string;
  coverUrl?: string;
  uploadedAt: string;
}
export interface BannerSlide {
  id: string;
  imageUrl: string;
  title: string;
  subtitle?: string;
  showTitle?: boolean; // false = ไม่แสดง title/subtitle บน banner (default: true)
}

interface State {
  // Tour Presentation
  companyProfile: string;
  socialLinks: SocialLink[];
  presentations: PresentationItem[];
  // Legacy single-file fields kept for backward compat
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
  // Login Banner Slides
  bannerSlides: BannerSlide[];

  setProfile: (v: string) => void;
  setSocial: (l: SocialLink[]) => void;
  setPdf: (url?: string, name?: string) => void;
  setPresentations: (list: PresentationItem[]) => void;
  addPresentation: (p: PresentationItem) => void;
  updatePresentation: (id: string, patch: Partial<PresentationItem>) => void;
  removePresentation: (id: string) => void;
  setContact: (patch: Partial<Pick<State, "lineId" | "lineUrl" | "workingHours" | "phones" | "hqAddress" | "bkkAddress" | "taxId" | "license">>) => void;
  setBannerSlides: (slides: BannerSlide[]) => void;
  addBannerSlide: (slide: BannerSlide) => void;
  updateBannerSlide: (id: string, patch: Partial<BannerSlide>) => void;
  removeBannerSlide: (id: string) => void;

  loadFromSupabase: () => Promise<void>;
  saveToSupabase: () => Promise<void>;
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

const DEFAULT_BANNER_SLIDES: BannerSlide[] = [
  { id: "bs-1", imageUrl: "", title: "ยินดีต้อนรับสู่ Standard Tour", subtitle: "ผู้นำด้านบริการท่องเที่ยวคุณภาพ" },
  { id: "bs-2", imageUrl: "", title: "ทัวร์ในประเทศและต่างประเทศ", subtitle: "เส้นทางท่องเที่ยวหลากหลาย ราคาพิเศษ" },
  { id: "bs-3", imageUrl: "", title: "บริการลูกค้าระดับพรีเมียม", subtitle: "ทีมงานมืออาชีพพร้อมให้บริการตลอด 24 ชั่วโมง" },
];

const DEFAULTS = {
  companyProfile: "บริษัท สแตนดาร์ดทัวร์ จำกัด ผู้นำด้านบริการท่องเที่ยวคุณภาพ ทั้งทัวร์ในประเทศและต่างประเทศ จองตั๋วเครื่องบิน และเช่ารถเดินทาง ดำเนินงานด้วยทีมมืออาชีพ พร้อมบริการลูกค้าระดับพรีเมียม",
  socialLinks: DEFAULT_SOCIAL,
  presentations: [] as PresentationItem[],
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
  bannerSlides: DEFAULT_BANNER_SLIDES,
};

// Pick only the data fields (no actions) for serialization
function snapshot(s: State) {
  return {
    companyProfile: s.companyProfile,
    socialLinks: s.socialLinks,
    presentations: s.presentations,
    presentationPdfUrl: s.presentationPdfUrl,
    presentationPdfName: s.presentationPdfName,
    lineId: s.lineId,
    lineUrl: s.lineUrl,
    workingHours: s.workingHours,
    phones: s.phones,
    hqAddress: s.hqAddress,
    bkkAddress: s.bkkAddress,
    taxId: s.taxId,
    license: s.license,
    bannerSlides: s.bannerSlides,
  };
}

export const useSiteSettings = create<State>()(persist((set, get) => ({
  ...DEFAULTS,

  setProfile: (v) => { set({ companyProfile: v }); get().saveToSupabase(); },
  setSocial: (l) => { set({ socialLinks: l }); get().saveToSupabase(); },
  setPdf: (url, name) => { set({ presentationPdfUrl: url, presentationPdfName: name }); get().saveToSupabase(); },
  setPresentations: (list) => { set({ presentations: list }); get().saveToSupabase(); },
  addPresentation: (p) => { set({ presentations: [...get().presentations, p] }); get().saveToSupabase(); },
  updatePresentation: (id, patch) => {
    set({ presentations: get().presentations.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
    get().saveToSupabase();
  },
  removePresentation: (id) => { set({ presentations: get().presentations.filter((x) => x.id !== id) }); get().saveToSupabase(); },
  setContact: (patch) => { set(patch as never); get().saveToSupabase(); },
  setBannerSlides: (slides) => { set({ bannerSlides: slides }); get().saveToSupabase(); },
  addBannerSlide: (slide) => { set({ bannerSlides: [...get().bannerSlides, slide] }); get().saveToSupabase(); },
  updateBannerSlide: (id, patch) => {
    set({ bannerSlides: get().bannerSlides.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    get().saveToSupabase();
  },
  removeBannerSlide: (id) => { set({ bannerSlides: get().bannerSlides.filter((s) => s.id !== id) }); get().saveToSupabase(); },

  loadFromSupabase: async () => {
    if (!SUPABASE_ENABLED || !supabase) return;
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("payload")
        .eq("id", "default")
        .maybeSingle();
      if (error) throw error;
      if (data?.payload && Object.keys(data.payload).length > 0) {
        // eslint-disable-next-line no-console
        console.info("[supabase] โหลด site settings จาก DB");
        const payload = data.payload as Partial<State>;
        // Migrate legacy single-file pdf to multi-file presentations array
        if ((!payload.presentations || payload.presentations.length === 0) && payload.presentationPdfUrl) {
          payload.presentations = [{
            id: `legacy-${Date.now()}`,
            title: payload.presentationPdfName ?? "Tour Presentation",
            pdfUrl: payload.presentationPdfUrl,
            pdfName: payload.presentationPdfName ?? "presentation.pdf",
            uploadedAt: new Date().toISOString(),
          }];
        }
        // Ensure bannerSlides defaults if missing in old payload
        if (!payload.bannerSlides || payload.bannerSlides.length === 0) {
          payload.bannerSlides = DEFAULT_BANNER_SLIDES;
        }
        set(payload);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[supabase] load site settings ล้มเหลว:", e);
    }
  },

  saveToSupabase: async () => {
    if (!SUPABASE_ENABLED || !supabase) return;
    try {
      const payload = snapshot(get());
      const { error } = await supabase
        .from("site_settings")
        .upsert({ id: "default", payload }, { onConflict: "id" });
      if (error) console.error("[supabase] save site settings ล้มเหลว:", error);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[supabase] save site settings ล้มเหลว:", e);
    }
  },
}), { name: "stdtour-site-v1" }));
