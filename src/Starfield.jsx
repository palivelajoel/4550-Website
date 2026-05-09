import { useEffect, useRef } from "react";

export default function Starfield({ density = 8000, opacity = 0.55 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let width = 0;
    let height = 0;
    let stars = [];
    let shootingStars = [];
    let time = 0;

    function reset() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = Math.max(window.innerHeight, document.documentElement.scrollHeight || 0);
      const count = Math.max(60, Math.floor((width * window.innerHeight) / density));
      stars = Array.from({ length: count }, () => {
        const layer = Math.random();
        const speed = layer < 0.6 ? 0.08 : layer < 0.85 ? 0.22 : 0.45;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          r: Math.random() * 1.4 + 0.3,
          a: Math.random() * 0.5 + 0.25,
          twinkleSpeed: Math.random() * 0.025 + 0.008,
          twinkleOffset: Math.random() * Math.PI * 2,
          layer,
          color: Math.random() < 0.08 ? "#ef4444" : Math.random() < 0.06 ? "#3b82f6" : null,
        };
      });
    }

    function spawnShootingStar() {
      if (Math.random() < 0.003 && shootingStars.length < 2) {
        shootingStars.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.6,
          vx: Math.random() * 2.5 + 1.5,
          vy: Math.random() * 1.2 + 0.4,
          len: Math.random() * 60 + 30,
          a: 1,
          decay: Math.random() * 0.018 + 0.012,
        });
      }
    }

    function draw() {
      time += 1;
      ctx.clearRect(0, 0, width, height);
      
      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i];
        s.x += s.vx;
        s.y += s.vy;
        
        // Wrap around
        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;
        
        // Twinkle effect
        const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkleOffset) * 0.35 + 0.65;
        const alpha = s.a * twinkle;
        
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        
        if (s.color) {
          ctx.fillStyle = s.color;
          ctx.globalAlpha = alpha * 0.7;
        } else {
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.globalAlpha = alpha;
        }
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Glow for some stars
        if (s.r > 1 && Math.random() < 0.015) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = s.color ? s.color : "rgba(255,255,255,0.08)";
          ctx.fill();
        }
      }
      
      // Shooting stars
      spawnShootingStar();
      for (let i = shootingStars.length - 1; i >= 0; i -= 1) {
        const ss = shootingStars[i];
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.a -= ss.decay;
        
        if (ss.a <= 0 || ss.y > height) {
          shootingStars.splice(i, 1);
          continue;
        }
        
        // Trail
        const grad = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.len, ss.y - ss.len * 0.5);
        grad.addColorStop(0, `rgba(255,255,255,${ss.a})`);
        grad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.len, ss.y - ss.len * 0.5);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      
      raf = requestAnimationFrame(draw);
    }

    reset();
    draw();
    window.addEventListener("resize", reset);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", reset);
    };
  }, [density]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        opacity,
        zIndex: -2,
      }}
    />
  );
}

// Ruler tick marks on the sides
export function RulerMarks({ opacity = 0.25 }) {
  const marks = [];
  for (let i = 0; i < 100; i++) {
    const y = i * 12;
    const isMajor = i % 10 === 0;
    const isMid = i % 5 === 0 && !isMajor;
    marks.push(
      <div key={`l-${i}`} style={{ position: "fixed", left: 0, top: y, width: isMajor ? 28 : isMid ? 18 : 10, height: 1, background: `rgba(239,68,68,${isMajor ? opacity : isMid ? opacity * 0.7 : opacity * 0.4})`, zIndex: 1 }} />,
      <div key={`r-${i}`} style={{ position: "fixed", right: 0, top: y, width: isMajor ? 28 : isMid ? 18 : 10, height: 1, background: `rgba(239,68,68,${isMajor ? opacity : isMid ? opacity * 0.7 : opacity * 0.4})`, zIndex: 1 }} />
    );
    if (isMajor) {
      marks.push(
        <span key={`lt-${i}`} style={{ position: "fixed", left: 32, top: y - 5, fontSize: 9, color: `rgba(239,68,68,${opacity})`, fontFamily: "monospace", zIndex: 1 }}>{i * 10}</span>,
        <span key={`rt-${i}`} style={{ position: "fixed", right: 32, top: y - 5, fontSize: 9, color: `rgba(239,68,68,${opacity})`, fontFamily: "monospace", zIndex: 1 }}>{i * 10}</span>
      );
    }
  }
  return <>{marks}</>;
}
