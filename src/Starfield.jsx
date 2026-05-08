import { useEffect, useRef } from "react";

export default function Starfield({ density = 12000, opacity = 0.45 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let width = 0;
    let height = 0;
    let stars = [];

    function reset() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = Math.max(window.innerHeight, document.documentElement.scrollHeight || 0);
      const count = Math.max(45, Math.floor((width * window.innerHeight) / density));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.35 + 0.35,
        a: Math.random() * 0.45 + 0.22,
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i];
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.fill();
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
        zIndex: 0,
      }}
    />
  );
}
