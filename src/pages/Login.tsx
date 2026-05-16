import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/store/authStore";
import { useSiteSettings } from "@/store/siteSettingsStore";
import { toast } from "sonner";

// Fallback gradient palette for slides without images
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

  // Redirect if already logged in
  useEffect(() => {
    if (currentUserId) navigate("/", { replace: true });
  }, [currentUserId, navigate]);

  // Auto-advance banner slides every 5 s
  const slides = bannerSlides.length > 0 ? bannerSlides : [
    { id: "fallback", imageUrl: "", title: "Standard Tour CRM", subtitle: "ระบบติดตามการขาย และจัดการลูกค้า" },
  ];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((s) => (s + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[currentSlide] ?? slides[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await login(username, password);
      if (!r.ok) {
        toast.error(r.error || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      toast.success("เข้าสู่ระบบสำเร็จ");
      navigate("/", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">

      {/* ===== LEFT: Banner Slideshow ===== */}
      <div className="relative w-full md:w-[55%] h-52 sm:h-64 md:h-auto overflow-hidden flex-shrink-0">
        {/* Slide layers */}
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-700 ${i === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            {s.imageUrl ? (
              <img
                src={s.imageUrl}
                alt={s.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${SLIDE_GRADIENTS[i % SLIDE_GRADIENTS.length]}`} />
            )}
          </div>
        ))}

        {/* Bottom overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {/* Slide text + dots */}
        <div className="absolute bottom-5 left-0 right-0 px-6 flex flex-col items-center gap-3">
          <div className="text-white text-center drop-shadow-lg">
            <h2 className="font-bold text-xl sm:text-2xl md:text-3xl leading-tight">{slide.title}</h2>
            {slide.subtitle && (
              <p className="text-sm sm:text-base text-white/80 mt-1">{slide.subtitle}</p>
            )}
          </div>

          {/* Dot navigation */}
          {slides.length > 1 && (
            <div className="flex gap-2 mt-1">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentSlide
                      ? "w-6 h-2 bg-white"
                      : "w-2 h-2 bg-white/50 hover:bg-white/75"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== RIGHT: Login Panel ===== */}
      <div className="flex-1 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex flex-col items-center justify-center px-6 py-10 md:py-16 min-h-[calc(100vh-13rem)] md:min-h-screen">

        {/* Logo + heading */}
        <div className="mb-7 text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-white items-center justify-center shadow-lg mb-4 overflow-hidden p-2">
            <img src="/favicon.ico" alt="Standard Tour" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
            Customer Relationship
            <br />
            Management
          </h1>
          <p className="text-sm text-white/55 mt-2">ระบบติดตามการขาย และจัดการลูกค้า Standard Tour</p>
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-2xl">
          <h2 className="text-white font-extrabold text-2xl mb-5 tracking-tight">Get Started Now.</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-white/75 mb-1.5">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                autoComplete="username"
                autoFocus
                className="w-full rounded-xl bg-white/10 border border-white/25 text-white placeholder:text-white/35 px-4 py-2.5 text-sm outline-none focus:border-pink-400 focus:bg-white/15 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-white/75 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl bg-white/10 border border-white/25 text-white placeholder:text-white/35 px-4 py-2.5 pr-11 text-sm outline-none focus:border-pink-400 focus:bg-white/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/90 transition-colors"
                  aria-label={showPwd ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-[0.98] text-white font-bold text-sm transition-all disabled:opacity-60 shadow-lg mt-1"
            >
              {submitting ? "กำลังเข้าสู่ระบบ..." : "Log in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-white/25 text-xs">Standard Tour CRM · v1.0</p>
      </div>
    </div>
  );
}
