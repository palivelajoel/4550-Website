import { useEffect, useRef, useState } from "react";

const SUPABASE_URL = "https://ehkwxzumgizryvhkeusr.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoa3d4enVtZ2l6cnl2aGtldXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTEwODcsImV4cCI6MjA5MzI4NzA4N30.IXAhkAx1ygZpJMNSWNd3k80Hmt4rNmRtuFPnLZGcGuc";

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

function useParallax(isMobile) {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    if (isMobile) return; // disable parallax on mobile for perf
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [isMobile]);
  return scrollY;
}

// ── Particle canvas ────────────────────────────────────────────────────────
function ParticleCanvas({ isMobile }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    // Fewer particles on mobile
    const density = isMobile ? 24000 : 12000;
    const particles = Array.from({ length: Math.floor((W * H) / density) }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fill();
        // Skip connecting lines on mobile for perf
        if (!isMobile) {
          for (let j = i + 1; j < particles.length; j++) {
            const q = particles[j];
            const dx = p.x - q.x, dy = p.y - q.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              ctx.strokeStyle = `rgba(239,68,68,${0.15 * (1 - dist / 120)})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    }
    draw();

    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", onResize); };
  }, [isMobile]);

  return (
    <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.6 }} />
  );
}

// ── Fade section ───────────────────────────────────────────────────────────
function FadeSection({ children, style }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)", transition: "opacity 0.65s ease, transform 0.65s ease", ...style }}>
      {children}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Landing() {
  const isMobile = useIsMobile();
  const scrollY = useParallax(isMobile);
  const [config, setConfig] = useState({});
  const [captains, setCaptains] = useState([]);
  const [logoUrl, setLogoUrl] = useState("/logo.jpg");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.title = "Team 4550 Something's Bruin";
    loadConfig();
    loadCaptains();
  }, []);

  // Close menu on scroll
  useEffect(() => { if (menuOpen) setMenuOpen(false); }, [scrollY]);

  async function loadConfig() {
    const rows = await sbFetch("site_config?select=key,value");
    if (!rows) return;
    const obj = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    setConfig(obj);
    if (obj.logo_url) setLogoUrl(obj.logo_url);
  }

  async function loadCaptains() {
    const rows = await sbFetch("captains?select=*&order=sort_order.asc");
    if (rows) setCaptains(rows);
  }

  const teamEmail = config.team_email || "team4550frc@gmail.com";
  const instagram = config.instagram || "https://www.instagram.com/cherrycreek.robotics";
  const youtube = config.youtube || "https://www.youtube.com/channel/UC4_P1A5xYb7A7rCdEXdKzBQ";
  const donateUrl = config.donate_url || "https://www.vancoevents.com/us/events/landing/46671";

  const navLinks = ["About", "Team", "Outreach", "Sponsors", "Contact"];

  return (
    <div style={{ background: "#080a0f", color: "#f1f5f9", fontFamily: "'Exo 2', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700&family=Bebas+Neue&family=DM+Mono&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; -webkit-tap-highlight-color: transparent; }
        body { background: #080a0f; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #ef4444; border-radius: 3px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes menuSlide { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        a { -webkit-tap-highlight-color: transparent; }

        /* Responsive grid helpers */
        .about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .outreach-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
        .captains-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 24px; }
        .media-row { display: flex; gap: 20px; flex-wrap: wrap; }
        .media-card { flex: 1 1 200px; }
        .contact-row { display: flex; gap: 28px; justify-content: center; flex-wrap: wrap; margin-top: 24px; }
        .footer-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; flex-wrap: wrap; gap: 20px; }
        .footer-links { display: flex; gap: 18px; flex-wrap: wrap; }
        .hero-eyebrow { font-family: 'Share Tech Mono', monospace; font-size: 11px; color: #64748b; letter-spacing: 3px; margin-bottom: 20px; }
        .tier-row { display: flex; gap: 12px; justify-content: center; margin-bottom: 28px; flex-wrap: wrap; }
        .section-inner { padding: 80px 24px; max-width: 1100px; margin: 0 auto; }

        @media (max-width: 767px) {
          .about-grid { grid-template-columns: 1fr; gap: 32px; }
          .stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .outreach-grid { grid-template-columns: 1fr; gap: 14px; }
          .captains-grid { grid-template-columns: 1fr 1fr; gap: 14px; }
          .media-row { flex-direction: column; gap: 14px; }
          .media-card { flex: unset; }
          .contact-row { flex-direction: column; align-items: center; gap: 16px; }
          .footer-top { flex-direction: column; align-items: flex-start; }
          .footer-links { gap: 12px; }
          .hero-eyebrow { font-size: 9px; letter-spacing: 2px; }
          .tier-row { gap: 8px; }
          .section-inner { padding: 56px 18px; }
        }

        @media (max-width: 480px) {
          .captains-grid { grid-template-columns: 1fr; }
          .stats-grid { gap: 8px; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        background: "rgba(8,10,15,0.95)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 18px" : "14px 32px" }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <img src={logoUrl} alt="logo" style={{ width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: "50%", objectFit: "cover" }} />
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: isMobile ? 11 : 13, fontWeight: 700, color: "#ef4444", letterSpacing: isMobile ? 1 : 2 }}>
              {isMobile ? "4550" : "SOMETHING'S BRUIN"}
            </span>
          </div>

          {/* Desktop links */}
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              {navLinks.map(l => (
                <a key={l} href={`#${l.toLowerCase()}`} style={{ color: "#94a3b8", textDecoration: "none", fontSize: 13, fontFamily: "'Share Tech Mono', monospace" }}>{l}</a>
              ))}
              <a href="/hub" style={{ background: "transparent", border: "1px solid #ef4444", color: "#ef4444", padding: "7px 16px", borderRadius: 4, textDecoration: "none", fontSize: 12, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>FOR MEMBERS ›</a>
            </div>
          )}

          {/* Mobile: Members btn + hamburger */}
          {isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <a href="/hub" style={{ border: "1px solid #ef4444", color: "#ef4444", padding: "6px 12px", borderRadius: 4, textDecoration: "none", fontSize: 10, fontFamily: "'Orbitron', sans-serif", letterSpacing: 1 }}>MEMBERS</a>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, display: "flex", flexDirection: "column", gap: 5 }}
                aria-label="Menu"
              >
                <span style={{ display: "block", width: 22, height: 2, background: menuOpen ? "#ef4444" : "#94a3b8", transition: "all 0.2s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
                <span style={{ display: "block", width: 22, height: 2, background: menuOpen ? "transparent" : "#94a3b8", transition: "all 0.2s" }} />
                <span style={{ display: "block", width: 22, height: 2, background: menuOpen ? "#ef4444" : "#94a3b8", transition: "all 0.2s", transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
              </button>
            </div>
          )}
        </div>

        {/* Mobile dropdown menu */}
        {isMobile && menuOpen && (
          <div style={{ background: "rgba(13,17,23,0.98)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px 0 12px", animation: "menuSlide 0.2s ease" }}>
            {navLinks.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMenuOpen(false)}
                style={{ display: "block", padding: "13px 20px", color: "#94a3b8", textDecoration: "none", fontSize: 14, fontFamily: "'Share Tech Mono', monospace", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {l}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, #080a0f 0%, #0d1117 100%)", paddingTop: 70, position: "relative", overflow: "hidden" }}>
        <ParticleCanvas isMobile={isMobile} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(239,68,68,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.04) 1px, transparent 1px)",
          backgroundSize: isMobile ? "40px 40px" : "60px 60px",
          pointerEvents: "none",
        }} />
        <div style={{ textAlign: "center", zIndex: 1, padding: isMobile ? "0 20px" : "0 24px", transform: isMobile ? "none" : `translateY(${scrollY * 0.25}px)` }}>
          <div className="hero-eyebrow">FRC ROBOTICS · CHERRY CREEK HIGH SCHOOL · GREENWOOD VILLAGE, CO</div>
          <img src={logoUrl} alt="Team Logo" style={{
            width: isMobile ? 88 : 110, height: isMobile ? 88 : 110,
            borderRadius: "50%", objectFit: "cover",
            border: "2px solid rgba(239,68,68,0.4)",
            boxShadow: "0 0 40px rgba(239,68,68,0.2)",
            marginBottom: isMobile ? 20 : 28,
            animation: "fadeUp 0.8s ease both",
          }} />
          <h1 style={{
            fontFamily: "'Orbitron', sans-serif", fontWeight: 900,
            fontSize: isMobile ? "clamp(22px, 8vw, 40px)" : "clamp(32px, 6vw, 72px)",
            letterSpacing: isMobile ? 2 : 4, color: "#f1f5f9",
            animation: "fadeUp 0.8s ease 0.15s both",
          }}>SOMETHING'S BRUIN</h1>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: isMobile ? "clamp(16px, 5vw, 24px)" : "clamp(18px, 3vw, 32px)",
            color: "#ef4444", letterSpacing: isMobile ? 6 : 8, marginTop: 6,
            animation: "fadeUp 0.8s ease 0.25s both",
          }}>FRC TEAM 4550</div>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, transparent, #ef4444, transparent)", margin: isMobile ? "18px auto" : "24px auto", animation: "fadeUp 0.8s ease 0.35s both" }} />
          <p style={{ color: "#94a3b8", fontSize: isMobile ? 14 : 16, maxWidth: 420, margin: "0 auto", marginBottom: isMobile ? 28 : 36, lineHeight: 1.7, animation: "fadeUp 0.8s ease 0.4s both", padding: "0 8px" }}>
            Engineering excellence. Community impact. Championship mindset.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 0.8s ease 0.5s both" }}>
            <a href="#about" style={{ background: "#ef4444", color: "#fff", textDecoration: "none", padding: isMobile ? "12px 24px" : "14px 32px", borderRadius: 6, fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: isMobile ? 11 : 13, letterSpacing: 2 }}>LEARN MORE</a>
            <a href={donateUrl} target="_blank" rel="noreferrer" style={{ background: "transparent", color: "#ef4444", textDecoration: "none", padding: isMobile ? "12px 24px" : "14px 32px", borderRadius: 6, border: "1px solid #ef4444", fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: isMobile ? 11 : 13, letterSpacing: 2 }}>SUPPORT US</a>
          </div>
        </div>
      </section>

      {/* ── ABOUT ───────────────────────────────────────────────────────── */}
      <section id="about">
        <div className="section-inner">
          <FadeSection>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#ef4444", letterSpacing: 3, marginBottom: 10 }}>// WHO WE ARE</div>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "clamp(20px, 4vw, 36px)", color: "#f1f5f9", marginBottom: 36 }}>About the Team</h2>
            <div className="about-grid">
              <div>
                <p style={{ color: "#94a3b8", lineHeight: 1.8, fontSize: 15 }}>
                  FRC Team 4550 "Something's Bruin" has been competing since 2012, representing Cherry Creek High School in FIRST Robotics Competition. Our team of 40–50 student engineers, programmers, and designers builds competition-ready robots each season — from scratch, in six weeks.
                </p>
                <p style={{ color: "#94a3b8", lineHeight: 1.8, fontSize: 15, marginTop: 14 }}>
                  We've competed at the 2016 World Championship and continue to push the boundaries of what student-built robots can achieve. Beyond the robot, we're committed to STEM outreach and community impact.
                </p>
              </div>
              <div className="stats-grid">
                {[
                  { num: "12+", label: "Years Competing" },
                  { num: "40–50", label: "Members" },
                  { num: "2016", label: "World Championship" },
                  { num: "3", label: "Sub-Teams" },
                ].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: isMobile ? "18px 14px" : "24px 20px", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: "#ef4444" }}>{s.num}</div>
                    <div style={{ fontSize: 11, color: "#64748b", fontFamily: "'Share Tech Mono', monospace", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── OUR TEAM / CAPTAINS ─────────────────────────────────────────── */}
      {captains.length > 0 && (
        <section id="team" style={{ background: "rgba(255,255,255,0.015)" }}>
          <div className="section-inner">
            <FadeSection>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#ef4444", letterSpacing: 3, marginBottom: 10 }}>// LEADERSHIP</div>
              <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "clamp(20px, 4vw, 36px)", color: "#f1f5f9", marginBottom: 36 }}>Our Team</h2>
              <div className="captains-grid">
                {captains.map((c, i) => (
                  <CaptainCard key={c.id} captain={c} index={i} scrollY={scrollY} isMobile={isMobile} />
                ))}
              </div>
            </FadeSection>
          </div>
        </section>
      )}

      {/* ── OUTREACH ────────────────────────────────────────────────────── */}
      <section id="outreach">
        <div className="section-inner">
          <FadeSection>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#ef4444", letterSpacing: 3, marginBottom: 10 }}>// COMMUNITY</div>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "clamp(20px, 4vw, 36px)", color: "#f1f5f9", marginBottom: 36 }}>Community Outreach</h2>
            <div className="outreach-grid">
              {[
                { icon: "🤖", title: "Team Mentoring", desc: "We mentor younger FRC and FLL teams throughout the Denver metro area, sharing technical knowledge and competition experience." },
                { icon: "🏫", title: "School Outreach", desc: "Visiting local elementary and middle schools to inspire the next generation of engineers through hands-on robotics demos." },
                { icon: "🌍", title: "Community Events", desc: "Participating in local STEM fairs, library events, and community festivals to promote robotics and engineering education." },
              ].map(o => (
                <div key={o.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: isMobile ? "22px 18px" : "28px 24px" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{o.icon}</div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>{o.title}</div>
                  <p style={{ color: "#94a3b8", lineHeight: 1.7, fontSize: 14 }}>{o.desc}</p>
                </div>
              ))}
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── MEDIA ───────────────────────────────────────────────────────── */}
      <section id="media" style={{ background: "rgba(255,255,255,0.015)" }}>
        <div className="section-inner">
          <FadeSection>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#ef4444", letterSpacing: 3, marginBottom: 10 }}>// FOLLOW ALONG</div>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "clamp(20px, 4vw, 36px)", color: "#f1f5f9", marginBottom: 36 }}>Media</h2>
            <div className="media-row">
              {[
                { href: instagram, icon: "📸", title: "Instagram", handle: "@cherrycreek.robotics", borderColor: "rgba(59,130,246,0.3)" },
                { href: youtube, icon: "▶️", title: "YouTube", handle: "Team 4550 Something's Bruin", borderColor: "rgba(239,68,68,0.3)" },
              ].map(m => (
                <a key={m.title} href={m.href} target="_blank" rel="noreferrer" className="media-card"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${m.borderColor}`, borderRadius: 10, padding: isMobile ? "24px 18px" : "32px 24px", textDecoration: "none", textAlign: "center", display: "block" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{m.icon}</div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>{m.title}</div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#64748b" }}>{m.handle}</div>
                </a>
              ))}
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── SPONSORS ────────────────────────────────────────────────────── */}
      <section id="sponsors">
        <div className="section-inner">
          <FadeSection>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#ef4444", letterSpacing: 3, marginBottom: 10 }}>// PARTNER WITH US</div>
              <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "clamp(20px, 4vw, 36px)", color: "#f1f5f9", marginBottom: 24 }}>Become a Sponsor</h2>
              <p style={{ color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.8, fontSize: 15 }}>
                Sponsoring FRC Team 4550 connects your organization with motivated young engineers and demonstrates your commitment to STEM education. Multiple sponsorship tiers available.
              </p>
              <div className="tier-row">
                {[
                  { name: "Bronze", color: "#b45309" },
                  { name: "Silver", color: "#94a3b8" },
                  { name: "Gold", color: "#eab308" },
                  { name: "Platinum", color: "#818cf8" },
                ].map(t => (
                  <div key={t.name} style={{ border: `1px solid ${t.color}`, borderRadius: 20, padding: isMobile ? "5px 14px" : "6px 20px", fontFamily: "'Orbitron', sans-serif", fontSize: isMobile ? 10 : 12, fontWeight: 700, letterSpacing: 2, color: t.color }}>
                    {t.name}
                  </div>
                ))}
              </div>
              <a href={`mailto:${teamEmail}`} style={{ display: "inline-block", background: "#ef4444", color: "#fff", textDecoration: "none", padding: isMobile ? "12px 24px" : "14px 32px", borderRadius: 6, fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: isMobile ? 11 : 13, letterSpacing: 2 }}>
                CONTACT US TO SPONSOR
              </a>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── DONATE ──────────────────────────────────────────────────────── */}
      <section style={{ background: "rgba(239,68,68,0.05)", borderTop: "1px solid rgba(239,68,68,0.2)" }}>
        <div className="section-inner">
          <FadeSection>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#ef4444", letterSpacing: 3, marginBottom: 10 }}>// SUPPORT THE TEAM</div>
              <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "clamp(20px, 4vw, 36px)", color: "#f1f5f9", marginBottom: 18 }}>Make a Donation</h2>
              <p style={{ color: "#94a3b8", maxWidth: 460, margin: "0 auto 28px", lineHeight: 1.8, fontSize: 15 }}>
                Every donation goes directly toward robot parts, competition fees, and team travel.
              </p>
              <a href={donateUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#ef4444", color: "#fff", textDecoration: "none", padding: isMobile ? "12px 28px" : "14px 32px", borderRadius: 6, fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: isMobile ? 11 : 13, letterSpacing: 2 }}>
                DONATE NOW
              </a>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── CONTACT ─────────────────────────────────────────────────────── */}
      <section id="contact">
        <div className="section-inner">
          <FadeSection>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#ef4444", letterSpacing: 3, marginBottom: 10 }}>// GET IN TOUCH</div>
              <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: "clamp(20px, 4vw, 36px)", color: "#f1f5f9", marginBottom: 12 }}>Contact</h2>
              <div className="contact-row">
                <a href={`mailto:${teamEmail}`} style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", textDecoration: "none", fontSize: isMobile ? 13 : 15, fontFamily: "'Share Tech Mono', monospace", padding: isMobile ? "12px 20px" : 0, background: isMobile ? "rgba(255,255,255,0.04)" : "transparent", borderRadius: isMobile ? 8 : 0, border: isMobile ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                  <span style={{ fontSize: 18 }}>✉️</span>{teamEmail}
                </a>
                <a href={instagram} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", textDecoration: "none", fontSize: isMobile ? 13 : 15, fontFamily: "'Share Tech Mono', monospace", padding: isMobile ? "12px 20px" : 0, background: isMobile ? "rgba(255,255,255,0.04)" : "transparent", borderRadius: isMobile ? 8 : 0, border: isMobile ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                  <span style={{ fontSize: 18 }}>📸</span>@cherrycreek.robotics
                </a>
              </div>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: isMobile ? "32px 18px 20px" : "40px 32px 24px" }}>
        <div className="footer-top">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={logoUrl} alt="logo" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
            <div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, color: "#ef4444" }}>SOMETHING'S BRUIN</div>
              <div style={{ fontSize: 11, color: "#64748b", fontFamily: "'Share Tech Mono', monospace" }}>FRC Team 4550 · Cherry Creek High School</div>
            </div>
          </div>
          <div className="footer-links">
            {["About", "Team", "Outreach", "Sponsors", "Contact"].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} style={{ color: "#64748b", textDecoration: "none", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>{l}</a>
            ))}
            <a href="/hub" style={{ color: "#64748b", textDecoration: "none", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>Member Hub</a>
          </div>
        </div>
        <div style={{ textAlign: "center", color: "#334155", fontSize: 11, fontFamily: "'Share Tech Mono', monospace", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 18 }}>
          © {new Date().getFullYear()} FRC Team 4550 Something's Bruin · Built by Palivela_Joel
        </div>
      </footer>
    </div>
  );
}

// ── Captain Card ───────────────────────────────────────────────────────────
function CaptainCard({ captain, index, scrollY, isMobile }) {
  const ref = useRef(null);
  const [offsetY, setOffsetY] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (isMobile || !ref.current || !visible) return;
    const rect = ref.current.getBoundingClientRect();
    setOffsetY((rect.top + rect.height / 2 - window.innerHeight / 2) * 0.06);
  }, [scrollY, visible, isMobile]);

  return (
    <div ref={ref} style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: isMobile ? "20px 14px" : "28px 20px",
      textAlign: "center",
      transform: isMobile ? "none" : `translateY(${offsetY}px)`,
      transition: "transform 0.1s ease",
    }}>
      {captain.photo_url ? (
        <img src={captain.photo_url} alt={captain.name} style={{ width: isMobile ? 70 : 90, height: isMobile ? 70 : 90, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(239,68,68,0.4)", display: "block", margin: "0 auto 12px" }} />
      ) : (
        <div style={{ width: isMobile ? 70 : 90, height: isMobile ? 70 : 90, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontFamily: "'Orbitron', sans-serif", fontSize: 24, color: "#ef4444" }}>
          {captain.name ? captain.name[0].toUpperCase() : "?"}
        </div>
      )}
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: isMobile ? 12 : 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{captain.name}</div>
      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#ef4444", letterSpacing: 2, marginBottom: 8 }}>{captain.position}</div>
      {captain.bio && <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6 }}>{captain.bio}</p>}
    </div>
  );
}
