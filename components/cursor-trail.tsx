"use client";

import { useEffect, useRef } from "react";

const TRAIL_LENGTH = 12;
const COLORS = ["#ff2d9b", "#ff2d9b", "#7c3aed", "#7c3aed", "#2d6fff", "#2d6fff", "#00ff88", "#00ff88", "#ff2d9b", "#7c3aed", "#2d6fff", "#00ff88"];
const BASE_SIZE = 6;

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -200, y: -200 });
  const dots = useRef(
    Array.from({ length: TRAIL_LENGTH }, () => ({ x: -200, y: -200 }))
  );
  const burst = useRef<{ x: number; y: number; t: number } | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };

    const onClick = (e: MouseEvent) => {
      burst.current = { x: e.clientX, y: e.clientY, t: 0 };
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);

    const LERP_FACTORS = Array.from({ length: TRAIL_LENGTH }, (_, i) =>
      0.35 - i * 0.022
    );

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update dot positions with lerp
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        const target = i === 0 ? mouse.current : dots.current[i - 1];
        const lf = Math.max(0.05, LERP_FACTORS[i]);
        dots.current[i].x += (target.x - dots.current[i].x) * lf;
        dots.current[i].y += (target.y - dots.current[i].y) * lf;
      }

      // Draw trail dots
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        const frac = 1 - i / TRAIL_LENGTH;
        const size = BASE_SIZE * (0.2 + frac * 0.8);
        const opacity = 0.1 + frac * 0.7;
        const dot = dots.current[i];

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[i] + Math.round(opacity * 255).toString(16).padStart(2, "0");
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[i] + "18";
        ctx.fill();
      }

      // Burst animation
      if (burst.current) {
        const b = burst.current;
        b.t += 0.06;
        if (b.t < 1) {
          const burstColors = ["#ff2d9b", "#7c3aed", "#2d6fff", "#00ff88", "#ffd700", "#ff2d9b"];
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const dist = b.t * 40;
            const bx = b.x + Math.cos(angle) * dist;
            const by = b.y + Math.sin(angle) * dist;
            const bOpacity = Math.max(0, 1 - b.t * 1.2);
            const bSize = 4 * (1 - b.t * 0.7);
            ctx.beginPath();
            ctx.arc(bx, by, bSize, 0, Math.PI * 2);
            ctx.fillStyle = burstColors[i % burstColors.length] + Math.round(bOpacity * 255).toString(16).padStart(2, "0");
            ctx.fill();
          }
        } else {
          burst.current = null;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[999] pointer-events-none"
      aria-hidden="true"
    />
  );
}
