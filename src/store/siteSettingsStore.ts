import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

export interface SocialLink { name: string; url: string; tone: string }
export interface PhoneEntry { label: string; num: string }
export interface OgMeta {
  title: string;
  description: string;
  imageUrl: string;
}
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

export interface TourPackageItem {
  id: string;
  title: string;
  duration: string;         // e.g. "6 วัน 4 คืน"
  continent: string;        // e.g. "ยุโรป", "เอเชีย"
  country: string;          // e.g. "ญี่ปุ่น", "สวิตเซอร์แลนด์"  (ประเทศหลัก)
  extraCountries?: string[]; // ประเทศที่ 2, 3 สำหรับโปรแกรมหลายประเทศ
  city: string;             // e.g. "โตเกียว", "เซอร์แมท"
  tourTypes: string[];      // e.g. ["ครอบครัว", "Premium"]
  pdfUrl: string;
  pdfName: string;
  coverUrl?: string;
  description?: string;
  isHighlight?: boolean;    // แสดงในส่วน Highlight Program
  uploadedAt: string;
}

export interface TourPackageBanner {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  linkUrl?: string;
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
  // Tour Package Presentations
  tourPackages: TourPackageItem[];
  // Tour Package Page Banners (1920×700)
  tourPackageBanners: TourPackageBanner[];
  // OG Meta for social sharing
  ogMain: OgMeta;
  ogPackages: OgMeta;
  // Office GPS Location (for Check-in/Check-out geofence)
  officeLat: number | null;
  officeLng: number | null;
  officeSetAt?: string; // ISO timestamp ครั้งล่าสุดที่ set

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
  addTourPackage: (p: TourPackageItem) => void;
  updateTourPackage: (id: string, patch: Partial<TourPackageItem>) => void;
  removeTourPackage: (id: string) => void;
  setTourPackageBanners: (banners: TourPackageBanner[]) => void;
  addTourPackageBanner: (banner: TourPackageBanner) => void;
  updateTourPackageBanner: (id: string, patch: Partial<TourPackageBanner>) => void;
  removeTourPackageBanner: (id: string) => void;
  setOgMain: (patch: Partial<OgMeta>) => void;
  setOgPackages: (patch: Partial<OgMeta>) => void;
  setOfficeLocation: (lat: number, lng: number) => Promise<void>;

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

const DEFAULT_OG_MAIN: OgMeta = {
  title: "Standard Tour Hub — ระบบบริหารงานขายและจัดการลูกค้า",
  description: "ระบบติดตามการขาย จัดการลูกค้า Pipeline, Target, Mission และ Dashboard สำหรับทีม Standard Tour",
  imageUrl: "https://standardtour-hub.vercel.app/og-image.jpg",
};

const DEFAULT_OG_PACKAGES: OgMeta = {
  title: "Standard Tour — โปรแกรมทัวร์ & E-Booklet",
  description: "เลือกโปรแกรมทัวร์ที่ใช่สำหรับคุณ — ทัวร์ต่างประเทศ ในประเทศ และทั่วโลก โดย Standard Tour",
  imageUrl: "https://standardtour-hub.vercel.app/og-image-packages.jpg",
};

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
  tourPackages: [] as TourPackageItem[],
  tourPackageBanners: [] as TourPackageBanner[],
  ogMain: DEFAULT_OG_MAIN,
  ogPackages: DEFAULT_OG_PACKAGES,
  officeLat: null,
  officeLng: null,
  officeSetAt: undefined,
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
    tourPackages: s.tourPackages,
    tourPackageBanners: s.tourPackageBanners,
    ogMain: s.ogMain,
    ogPackages: s.ogPackages,
    officeLat: s.officeLat,
    officeLng: s.officeLng,
    officeSetAt: s.officeSetAt,
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
  addTourPackage: (p) => { set({ tourPackages: [...(get().tourPackages ?? []), p] }); get().saveToSupabase(); },
  updateTourPackage: (id, patch) => {
    set({ tourPackages: (get().tourPackages ?? []).map((x) => x.id === id ? { ...x, ...patch } : x) });
    get().saveToSupabase();
  },
  removeTourPackage: (id) => { set({ tourPackages: (get().tourPackages ?? []).filter((x) => x.id !== id) }); get().saveToSupabase(); },
  setTourPackageBanners: (banners) => { set({ tourPackageBanners: banners }); get().saveToSupabase(); },
  addTourPackageBanner: (banner) => { set({ tourPackageBanners: [...(get().tourPackageBanners ?? []), banner] }); get().saveToSupabase(); },
  updateTourPackageBanner: (id, patch) => {
    set({ tourPackageBanners: (get().tourPackageBanners ?? []).map((b) => b.id === id ? { ...b, ...patch } : b) });
    get().saveToSupabase();
  },
  removeTourPackageBanner: (id) => { set({ tourPackageBanners: (get().tourPackageBanners ?? []).filter((b) => b.id !== id) }); get().saveToSupabase(); },
  setOgMain: (patch) => { set({ ogMain: { ...get().ogMain, ...patch } }); get().saveToSupabase(); },
  setOgPackages: (patch) => { set({ ogPackages: { ...get().ogPackages, ...patch } }); get().saveToSupabase(); },

  setOfficeLocation: async (lat, lng) => {
    const now = new Date().toISOString();
    set({ officeLat: lat, officeLng: lng, officeSetAt: now });
    if (SUPABASE_ENABLED && supabase) {
      const snap = { ...snapshot(get()), officeLat: lat, officeLng: lng, officeSetAt: now };
      const { error } = await supabase
        .from("site_settings")
        .upsert({ id: "default", payload: snap }, { onConflict: "id" });
      if (error) console.error("[siteSettings] setOfficeLocation ล้มเหลว:", error);
    }
  },

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
        // Ensure tourPackages defaults
        if (!payload.tourPackages) payload.tourPackages = [];
        // Ensure tourPackageBanners defaults
        if (!payload.tourPackageBanners) payload.tourPackageBanners = [];
        // Ensure OG meta defaults
        if (!payload.ogMain) payload.ogMain = DEFAULT_OG_MAIN;
        if (!payload.ogPackages) payload.ogPackages = DEFAULT_OG_PACKAGES;
        // Office GPS — keep null if not set
        if (payload.officeLat === undefined) payload.officeLat = null;
        if (payload.officeLng === undefined) payload.officeLng = null;
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
