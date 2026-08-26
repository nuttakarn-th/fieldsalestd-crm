/**
 * PresentView.tsx
 * Public viewer page for live Ads Report presentations.
 *
 * URL: /present/:sessionId
 * - No login required
 * - Loads report snapshot from Supabase
 * - Subscribes to Realtime → follows presenter's slide in real time
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getPresentSession,
  subscribePresentSlide,
  type PresentSession,
} from "@/lib/presentSession";

// Re-use PresentationMode (viewOnly mode) — import it from AdsReport.
// We need to lazy-import the component since AdsReport is a large file.
// Instead we inline a lightweight viewer shell + dynamic import.

// ── Types matching AdsReport internals ───────────────────────────────────────

interface AdRow {
  name:string;status:string;spend:number|null;impressions:number|null;reach:number|null;
  cpm:number|null;ctr:number|null;cpcLink:number|null;cpcAll:number|null;
  messages:number|null;costPerMsg:number|null;pageEngagement:number|null;
  roas:number|null;startDate:string;endDate:string;group:string;
}
interface ColumnMap {
  name?:number;status?:number;spend?:number;impressions?:number;reach?:number;
  cpm?:number;ctr?:number;cpcLink?:number;cpcAll?:number;messages?:number;
  costPerMsg?:number;pageEngagement?:number;roas?:number;startDate?:number;endDate?:number;
}
interface ReportData {
  id:string;period_label:string;file_name:string;uploaded_at:string;uploaded_by:string|null;
  report_name?:string;
  inbox_revenue?:number|null;deals_closed?:number|null;total_inbox?:number|null;
  ads:AdRow[];colMap:ColumnMap;
}

// ── Lazy PresentationMode (avoids full AdsReport bundle) ─────────────────────
// We dynamically import AdsReport and pull out the component.
// Since PresentationMode is not exported we use React.lazy on a tiny wrapper.

import React, { lazy, Suspense } from "react";

// Wrapper page that PresentationMode can be forwarded through.
// We create a minimal thin wrapper component exported from AdsReport.
// (We will add that export below and use it here.)
const LazyPresentSlides = lazy(() =>
  import("@/pages/AdsReport").then((mod) => ({
    default: mod.PresentationModeViewer,
  }))
);

// ── Main Component ────────────────────────────────────────────────────────────

export default function PresentView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<PresentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Load session on mount
  useEffect(() => {
    if (!sessionId) return;
    getPresentSession(sessionId).then((s) => {
      if (!s) {
        setExpired(true);
      } else {
        setSession(s);
        setCurrentSlide(s.current_slide);
      }
      setLoading(false);
    });
  }, [sessionId]);

  // Subscribe to Realtime slide updates
  useEffect(() => {
    if (!sessionId || !session) return;
    const unsubscribe = subscribePresentSlide(sessionId, (slide) => {
      setCurrentSlide(slide);
    });
    return unsubscribe;
  }, [sessionId, session]);

  // ── Build ReportData from snapshot ────────────────────────────────────────
  const reportData: ReportData | null = session
    ? {
        ...(session.snapshot.report as ReportData),
        ads: session.snapshot.ads as AdRow[],
        colMap: session.snapshot.cm as ColumnMap,
      }
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#09080e]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[#7F77DD] border-t-transparent animate-spin" />
          <p className="text-sm text-white/40">กำลังโหลด…</p>
        </div>
      </div>
    );
  }

  if (expired || !session || !reportData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#09080e]">
        <div className="text-center">
          <p className="text-3xl mb-4">🔒</p>
          <p className="text-white/70 font-semibold">Link หมดอายุหรือไม่พบ Session</p>
          <p className="text-white/30 text-sm mt-2">Link มีอายุ 8 ชั่วโมงหลังสร้าง</p>
        </div>
      </div>
    );
  }

  const groupColorMap = (session.snapshot.groupColorMap ?? {}) as Record<string, string>;

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-[#09080e]">
          <div className="w-10 h-10 rounded-full border-2 border-[#7F77DD] border-t-transparent animate-spin" />
        </div>
      }
    >
      <LazyPresentSlides
        report={reportData}
        ads={reportData.ads}
        cm={reportData.colMap}
        groupColorMap={groupColorMap}
        onClose={() => {}}
        viewOnly={true}
        externalSlide={currentSlide}
      />
    </Suspense>
  );
}
