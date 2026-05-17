import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/store/authStore";
import { useSiteSettings } from "@/store/siteSettingsStore";
import { toast } from "sonner";

// Fallback gradient palette
const SLIDE_GRADIENTS = [
  "from-indigo-600 via-purple-700 to-pink-600",
  "from-sky-500 via-blue-700 to-indigo-700",
  "from-emerald-500 via-teal-600 to-cyan-600",
  "from-amber-500 via-orange-600 to-rose-500",
];

export default function Login() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const currentUserId = useAuth((s) => s.currentUserId);
  const bannerSlides = useSiteSettings((s) => s.bannerSlides);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (currentUserId) navigate("/", { replace: true });
  }, [currentUserId, navigate]);

  const slides = bannerSlides.length > 0 ? bannerSlides : [
    { id: "fallback", imageUrl: "", title: "Standard Tour CRM", subtitle: "ระบบติดตามการขาย และจัดการลูกค้า", showTitle: true },
  ];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setCurrentSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[currentSlide] ?? slides[0];
  const showSlideTitle = slide.showTitle !== false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await login(username, password);
      if (!r.ok) { toast.error(r.error || "เข้าสู่ระบบไม่สำเร็จ"); return; }
      toast.success("เข้าสู่ระบบสำเร็จ");
      navigate("/", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)", fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Top-left logo (white version) ── */}
      <div className="absolute top-5 left-6 z-10 flex items-center gap-2">
        {/* Logo white: ถ้ามีไฟล์ logo-white.png ใน public/ ให้ใช้ แต่ถ้าไม่มีใช้ SVG placeholder */}
        <img
          src="/logo-white.png"
          alt="Standard Tour"
          className="h-7 w-auto"
          onError={(e) => {
            // Fallback to SVG if PNG not available
            (e.target as HTMLImageElement).src = "/logo-white.svg";
          }}
        />
      </div>

      {/* ── Main content: vertically + horizontally centered ── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-20">
        <div className="w-full max-w-[960px] flex flex-col md:flex-row items-center gap-10 md:gap-14">

          {/* ═══ LEFT: Banner Slideshow 1:1 ═══ */}
          <div className="w-full md:w-[460px] shrink-0">
            {/* Square white card */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl bg-white">
              {slides.map((s, i) => (
                <div
                  key={s.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${i === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                >
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${SLIDE_GRADIENTS[i % SLIDE_GRADIENTS.length]}`} />
                  )}
                </div>
              ))}

              {/* Text overlay */}
              {showSlideTitle && (slide.title || slide.subtitle) && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                  <div className="absolute bottom-5 left-5 right-5 text-white text-center">
                    {slide.title && (
                      <p className="font-extrabold text-base leading-snug drop-shadow" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {slide.title}
                      </p>
                    )}
                    {slide.subtitle && (
                      <p className="text-sm text-white/80 mt-1 drop-shadow">{slide.subtitle}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Dots below card */}
            {slides.length > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === currentSlide ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/35 hover:bg-white/60"
                    }`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ═══ RIGHT: Login Panel ═══ */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left max-w-sm w-full">

            {/* Heading */}
            <h1
              className="text-white leading-tight mb-3"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: "clamp(2rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em" }}
            >
              Customer<br />Relationship<br />Management
            </h1>
            <p className="text-sm text-white/45 mb-8 leading-relaxed">
              our ultimate hub for managing leads, closing deals,<br className="hidden md:block" />
              and delivering exceptional travel experiences.<br className="hidden md:block" />
              Let's make every journey count.
            </p>

            {/* Form card */}
            <div className="w-full rounded-2xl border border-white/15 p-6 shadow-2xl"
              style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}>

              <h2
                className="text-white mb-5"
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.01em" }}
              >
                Get Started Now.
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div>
                  <label
                    className="block mb-1.5 text-white/70"
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.03em" }}
                  >
                    Username
                  </label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter Your Username"
                    autoComplete="username"
                    autoFocus
                    style={{ fontFamily: "'Inter', sans-serif", background: "rgba(255,255,255,0.08)" }}
                    className="w-full rounded-xl border border-white/20 text-white placeholder:text-white/30 px-4 py-2.5 text-sm outline-none focus:border-pink-400 transition-all"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    className="block mb-1.5 text-white/70"
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.03em" }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter Your Password"
                      autoComplete="current-password"
                      style={{ fontFamily: "'Inter', sans-serif", background: "rgba(255,255,255,0.08)" }}
                      className="w-full rounded-xl border border-white/20 text-white placeholder:text-white/30 px-4 py-2.5 pr-11 text-sm outline-none focus:border-pink-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60 mt-1 active:scale-[0.98]"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    background: "linear-gradient(90deg, #ec4899 0%, #f43f5e 100%)",
                  }}
                >
                  {submitting ? "กำลังเข้าสู่ระบบ..." : "Log in"}
                </button>
              </form>
            </div>

            <p className="mt-5 text-white/20 text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
              Standard Tour Sales CRM : Version 1.1 (11.5.26)
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
