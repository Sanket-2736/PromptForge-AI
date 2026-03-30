"use client";

import { useEffect, useState, useRef } from "react";

const TOTAL_FRAMES = 51;
const FPS = 24;
const INTERVAL = Math.round(1000 / FPS); // ~42ms
const GLOW_COLORS = ["#ff2d9b", "#2d6fff", "#00ff88"];
const GLOW_INTERVAL = 800;

const PARTICLES = [
  { color: "#ff2d9b", top: "10%",  left: "5%",  delay: "0s",    dur: "1.4s" },
  { color: "#2d6fff", top: "20%",  right: "8%",  delay: "0.3s",  dur: "1.7s" },
  { color: "#00ff88", top: "60%",  left: "3%",  delay: "0.6s",  dur: "1.2s" },
  { color: "#7c3aed", top: "70%",  right: "5%",  delay: "0.9s",  dur: "1.6s" },
  { color: "#ff2d9b", top: "40%",  left: "0%",  delay: "1.1s",  dur: "1.3s" },
  { color: "#00ff88", top: "50%",  right: "2%",  delay: "0.4s",  dur: "1.8s" },
  { color: "#2d6fff", top: "80%",  left: "10%", delay: "0.7s",  dur: "1.5s" },
  { color: "#ff2d9b", top: "30%",  right: "12%", delay: "1.3s",  dur: "1.1s" },
];

interface WompusLoaderProps {
  message?: string;
  size?: number;
}

export default function WompusLoader({ message, size = 160 }: WompusLoaderProps) {
  const [frame, setFrame] = useState(1);
  const [glowIdx, setGlowIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const preloadedRef = useRef(false);

  // Preload all frames
  useEffect(() => {
    if (preloadedRef.current) return;
    preloadedRef.current = true;

    let loaded = 0;
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = `/wompus-frames/ezgif-frame-${String(i).padStart(3, "0")}.png`;
      img.onload = () => {
        loaded++;
        if (loaded === TOTAL_FRAMES) setReady(true);
      };
      img.onerror = () => {
        loaded++;
        if (loaded === TOTAL_FRAMES) setReady(true);
      };
    }
  }, []);

  // Frame cycling
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      setFrame((f) => (f >= TOTAL_FRAMES ? 1 : f + 1));
    }, INTERVAL);
    return () => clearInterval(id);
  }, [ready]);

  // Glow color cycling
  useEffect(() => {
    const id = setInterval(() => {
      setGlowIdx((i) => (i + 1) % GLOW_COLORS.length);
    }, GLOW_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const glowColor = GLOW_COLORS[glowIdx];
  const frameSrc = `/wompus-frames/ezgif-frame-${String(frame).padStart(3, "0")}.png`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Character + particles */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Floating particles */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-particle-float"
            style={{
              backgroundColor: p.color,
              top: p.top,
              left: "left" in p ? p.left : undefined,
              right: "right" in p ? (p as { right: string }).right : undefined,
              animationDelay: p.delay,
              animationDuration: p.dur,
              animationIterationCount: "infinite",
              boxShadow: `0 0 6px ${p.color}`,
            }}
          />
        ))}

        {/* Wompus frame */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frameSrc}
          alt="Wompus loading"
          width={size}
          height={size}
          className="animate-drop-glow-cycle"
          style={{
            filter: `drop-shadow(0 0 16px ${glowColor}) drop-shadow(0 0 32px ${glowColor}80)`,
            transition: "filter 0.4s ease",
            imageRendering: "auto",
          }}
        />

        {/* Glow ring beneath */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full blur-xl opacity-40"
          style={{
            width: size * 0.7,
            height: 20,
            background: glowColor,
            transition: "background 0.4s ease",
          }}
        />
      </div>

      {/* Message */}
      {message && (
        <p
          className="mt-6 text-sm font-medium tracking-wide"
          style={{
            color: glowColor,
            textShadow: `0 0 12px ${glowColor}`,
            transition: "color 0.4s ease, text-shadow 0.4s ease",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
