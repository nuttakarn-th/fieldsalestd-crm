/**
 * PresentView.tsx
 * Public viewer page for live Ads Report presentations.
 *
 * URL: /present/:sessionId
 * - No login required
 * - Loads report snapshot from Supabase
 * - Subscribes to Realtime → follows presenter's slide in real time
 * - Shows "สิ้นสุดการรายงาน" when presenter ends the session
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getPresentSession,
  subscribePresentSlide,
  type PresentSession,
} from "@/lib/presentSession";

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

import React, { lazy, Suspense } from "react";

const LazyPresentSlides = lazy(() =>
  import("@/pages/AdsReport").then((mod) => ({
    default: mod.PresentationModeViewer,
  }))
);

// ── Ended Screen ──────────────────────────────────────────────────────────────

function EndedScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#09080e]">
      <div className="text-center flex flex-col items-center gap-6">
        <div style={{
          width:80,height:80,borderRadius:"50%",
          background:"rgba(239,68,68,0.15)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:36,
        }}>⏹</div>
        <div>
          <p className="text-white font-bold text-xl mb-2">สิ้นสุดการรายงานแล้ว</p>
          <p className="text-white/40 text-sm">ผู้นำเสนอได้ปิดการแสดงผล Live</p>
        </div>
        <div style={{
          padding:"10px 20px",borderRadius:10,
          background:"rgba(255,255,255,0.06)",
          fontSize:13,color:"rgba(255,255,255,0.4)",
        }}>
          {new Date().toLocaleString("th-TH",{dateStyle:"medium",timeStyle:"short"})}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PresentView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<PresentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ended, setEnded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Load session on mount
  useEffect(() => {
    if (!sessionId) return;
    getPresentSession(sessionId).then((s) => {
      if (!s) {
        setNotFound(true);
      } else if (s.status === "ended") {
        setEnded(true);
      } else {
        setSession(s);
        setCurrentSlide(s.current_slide);
      }
      setLoading(false);
    });
  }, [sessionId]);

  // Subscribe to Realtime — slide changes AND ended status
  useEffect(() => {
    if (!sessionId || !session) return;
    const unsubscribe = subscribePresentSlide(
      sessionId,
      (slide) => setCurrentSlide(slide),
      () => setEnded(true)     // onEnded callback
    );
    return unsubscribe;
  }, [sessionId, session]);

  // ── Heartbeat staleness check — if presenter goes silent > 90 s → ended ──
  useEffect(() => {
    if (!session || ended) return;
    const iv = setInterval(() => {
      getPresentSession(session.id).then((s) => {
        if (!s) return;
        if (s.status === "ended") { setEnded(true); return; }
        const age = Date.now() - new Date(s.last_ping_at).getTime();
        if (age > 90_000) setEnded(true);
      });
    }, 30_000);
    return () => clearInterval(iv);
  }, [session, ended]);

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

  if (ended) return <EndedScreen />;

  if (notFound || !session || !reportData) {
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
