"use client";

import { useEffect, useRef } from "react";

// Generate deterministic star data so SSR/CSR match
function generateStars(count: number) {
  const stars = [];
  // Use a simple seeded pseudo-random to avoid hydration mismatch
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };

  for (let i = 0; i < count; i++) {
    const size = rand() < 0.5 ? 1 : rand() < 0.7 ? 1.5 : 2;
    stars.push({
      top: rand() * 100,
      left: rand() * 100,
      size,
      dur: 2 + rand() * 4,
      delay: rand() * 5,
      opacity: 0.3 + rand() * 0.7,
    });
  }
  return stars;
}

const STARS = generateStars(160);

export default function GalaxyBackground() {
  const canvasRef = useRef<HTMLDivElement>(null);

  // No canvas needed — pure CSS stars for zero JS overhead
  return (
    <div
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      style={{ background: "#0a0a0f" }}
    >
      {/* Deep nebula base gradients */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, rgba(124,58,237,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 60%, rgba(45,111,255,0.10) 0%, transparent 55%),
            radial-gradient(ellipse 50% 60% at 50% 20%, rgba(255,45,155,0.08) 0%, transparent 50%),
            radial-gradient(ellipse 70% 40% at 30% 80%, rgba(0,255,136,0.06) 0%, transparent 50%)
          `,
        }}
      />

      {/* Orb 1 — deep pink */}
      <div
        className="absolute animate-orb-drift"
        style={{
          width: 600,
          height: 600,
          top: "10%",
          left: "15%",
          background: "radial-gradient(circle, rgba(255,45,155,0.18) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(40px)",
        }}
      />

      {/* Orb 2 — electric blue */}
      <div
        className="absolute animate-orb-drift-2"
        style={{
          width: 700,
          height: 700,
          top: "40%",
          right: "10%",
          background: "radial-gradient(circle, rgba(45,111,255,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(50px)",
        }}
      />

      {/* Orb 3 — violet */}
      <div
        className="absolute animate-orb-drift-3"
        style={{
          width: 500,
          height: 500,
          bottom: "15%",
          left: "30%",
          background: "radial-gradient(circle, rgba(124,58,237,0.20) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(45px)",
        }}
      />

      {/* Orb 4 — electric green */}
      <div
        className="absolute animate-orb-drift"
        style={{
          width: 400,
          height: 400,
          bottom: "5%",
          right: "25%",
          background: "radial-gradient(circle, rgba(0,255,136,0.10) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(35px)",
          animationDelay: "-8s",
        }}
      />

      {/* CSS Stars */}
      {STARS.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-twinkle"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: star.size,
            height: star.size,
            background: "#ffffff",
            opacity: star.opacity,
            ["--twinkle-dur" as string]: `${star.dur}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
