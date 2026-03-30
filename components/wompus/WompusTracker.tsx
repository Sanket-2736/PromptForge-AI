"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import WompusSvg from "./WompusSvg";

interface Props {
  progress: number;
  totalSteps: number;
  doneSteps: number;
}

const QUIPS = [
  "Psst... click a step!",
  "You're doing great 🚀",
  "Need a fix prompt?",
  "Ship it! 🛸",
  "That's clean code 💚",
  "Almost there!",
  "Let's gooo! ⚡",
  "Based architecture 🔥",
  "Deploy it! 🌌",
  "You're a 10x dev 💜",
];

interface Props {
  progress: number;
  totalSteps: number;
  doneSteps: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRACK_W = 600;   // SVG viewBox width
const TRACK_H = 110;   // SVG viewBox height
const CHAR_SIZE = 36;

// Zigzag waypoints (x, y) — the road bends through these
const WAYPOINTS = [
  { x: 20,  y: 80 },
  { x: 120, y: 30 },
  { x: 220, y: 80 },
  { x: 320, y: 30 },
  { x: 420, y: 80 },
  { x: 520, y: 30 },
  { x: 580, y: 55 },
];

// Checkpoint positions (0–1 along the path)
const CHECKPOINT_T = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

// Coin positions (0–1 along the path, between checkpoints)
const COIN_T = [0.1, 0.3, 0.5, 0.7, 0.9];

// ─── Path math ────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/** Total path length (sum of segment lengths) */
function totalLength(pts: { x: number; y: number }[]) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

/** Get (x, y, angle) at t ∈ [0,1] along the polyline */
function pointAtT(pts: { x: number; y: number }[], t: number) {
  const total = totalLength(pts);
  let target = t * total;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (target <= segLen) {
      const frac = target / segLen;
      return {
        x: lerp(pts[i - 1].x, pts[i].x, frac),
        y: lerp(pts[i - 1].y, pts[i].y, frac),
        angle: Math.atan2(dy, dx) * (180 / Math.PI),
      };
    }
    target -= segLen;
  }
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  return { x: last.x, y: last.y, angle: Math.atan2(last.y - prev.y, last.x - prev.x) * (180 / Math.PI) };
}

/** Build SVG polyline points string */
function polylinePoints(pts: { x: number; y: number }[]) {
  return pts.map((p) => `${p.x},${p.y}`).join(" ");
}

// ─── Coin component ───────────────────────────────────────────────────────────

function Coin({ cx, cy, collected }: { cx: number; cy: number; collected: boolean }) {
  return (
    <AnimatePresence>
      {!collected && (
        <motion.g
          initial={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 2, y: -12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {/* Glow */}
          <circle cx={cx} cy={cy} r={7} fill="rgba(255,200,0,0.15)" />
          {/* Coin body */}
          <circle cx={cx} cy={cy} r={5} fill="#ffd700" stroke="#ffaa00" strokeWidth={1} />
          {/* Shine */}
          <circle cx={cx - 1.5} cy={cy - 1.5} r={1.5} fill="rgba(255,255,255,0.5)" />
          {/* Star */}
          <text x={cx} y={cy + 1.5} textAnchor="middle" fontSize="5" fill="#b8860b" fontWeight="bold">★</text>
        </motion.g>
      )}
    </AnimatePresence>
  );
}

// ─── Checkpoint component ─────────────────────────────────────────────────────

function Checkpoint({ cx, cy, reached, isFinish }: { cx: number; cy: number; reached: boolean; isFinish?: boolean }) {
  if (isFinish) {
    return (
      <g>
        {/* Flag pole */}
        <line x1={cx} y1={cy - 18} x2={cx} y2={cy + 4} stroke={reached ? "#00ff88" : "rgba(255,255,255,0.3)"} strokeWidth={1.5} strokeLinecap="round" />
        {/* Flag */}
        <motion.polygon
          points={`${cx},${cy - 18} ${cx + 12},${cy - 13} ${cx},${cy - 8}`}
          fill={reached ? "#00ff88" : "rgba(255,255,255,0.2)"}
          animate={reached ? { opacity: [1, 0.6, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        />
        {/* Base */}
        <circle cx={cx} cy={cy + 4} r={3} fill={reached ? "#00ff88" : "rgba(255,255,255,0.2)"} />
        {reached && <circle cx={cx} cy={cy + 4} r={6} fill="rgba(0,255,136,0.2)" className="animate-ping" />}
      </g>
    );
  }

  return (
    <g>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={7} fill={reached ? "rgba(255,45,155,0.2)" : "rgba(255,255,255,0.05)"} stroke={reached ? "#ff2d9b" : "rgba(255,255,255,0.2)"} strokeWidth={1} />
      {/* Inner dot */}
      <circle cx={cx} cy={cy} r={3.5} fill={reached ? "#ff2d9b" : "rgba(255,255,255,0.15)"} />
      {reached && (
        <motion.circle cx={cx} cy={cy} r={7}
          fill="none" stroke="#ff2d9b" strokeWidth={1}
          animate={{ r: [7, 14], opacity: [0.6, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </g>
  );
}

// ─── Confetti burst ───────────────────────────────────────────────────────────

function Confetti({ cx, cy }: { cx: number; cy: number }) {
  const particles = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * Math.PI * 2;
      return { id: i, dx: Math.cos(angle) * (20 + Math.random() * 20), dy: Math.sin(angle) * (20 + Math.random() * 20) - 10, color: ["#ff2d9b", "#2d6fff", "#00ff88", "#ffd700", "#7c3aed"][i % 5] };
    }), []);

  return (
    <>
      {particles.map((p) => (
        <motion.circle key={p.id} cx={cx} cy={cy} r={2.5} fill={p.color}
          initial={{ cx, cy, opacity: 1 }}
          animate={{ cx: cx + p.dx, cy: cy + p.dy, opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WompusTracker({ progress, totalSteps, doneSteps }: Props) {
  const clamped = Math.min(100, Math.max(0, progress));
  const t = clamped / 100;
  const prevRef = useRef(t);
  const isComplete = clamped >= 100;

  const [collectedCoins, setCollectedCoins] = useState<Set<number>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const [running, setRunning] = useState(false);
  const [quip, setQuip] = useState<string | null>(null);
  const [clickBurst, setClickBurst] = useState(false);
  const quipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCharClick = useCallback(() => {
    const msg = QUIPS[Math.floor(Math.random() * QUIPS.length)];
    setQuip(msg);
    setClickBurst(true);
    setTimeout(() => setClickBurst(false), 700);
    if (quipTimer.current) clearTimeout(quipTimer.current);
    quipTimer.current = setTimeout(() => setQuip(null), 3000);
  }, []);

  // Spring-smoothed t value
  const springT = useSpring(t, { stiffness: 80, damping: 18 });

  // Derived position from spring
  const charPos = useTransform(springT, (v) => pointAtT(WAYPOINTS, Math.min(1, Math.max(0, v))));

  // Collect coins as progress passes them
  useEffect(() => {
    if (t !== prevRef.current) {
      springT.set(t);
      setRunning(true);
      const timer = setTimeout(() => setRunning(false), 800);
      prevRef.current = t;

      // Check which coins to collect
      COIN_T.forEach((coinT, idx) => {
        if (t >= coinT && !collectedCoins.has(idx)) {
          setCollectedCoins((prev) => new Set(Array.from(prev).concat(idx)));
        }
      });

      return () => clearTimeout(timer);
    }
  }, [t, springT, collectedCoins]);

  // Completion celebration
  useEffect(() => {
    if (isComplete && !celebrated) {
      setCelebrated(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 800);
    }
  }, [isComplete, celebrated]);

  // Precompute static positions
  const coinPositions = COIN_T.map((ct) => pointAtT(WAYPOINTS, ct));
  const checkpointPositions = CHECKPOINT_T.map((ct) => pointAtT(WAYPOINTS, ct));

  // Road dashes — dotted center line
  const roadPoints = polylinePoints(WAYPOINTS);

  void totalSteps;
  void doneSteps;

  return (
    <div className="w-full select-none space-y-2">
      <div className="w-full overflow-hidden rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <svg
          viewBox={`0 0 ${TRACK_W} ${TRACK_H}`}
          width="100%"
          style={{ display: "block" }}
          aria-label="Wompus progress tracker"
        >
          {/* ── Road shadow ── */}
          <polyline points={roadPoints} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />

          {/* ── Road base ── */}
          <polyline points={roadPoints} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />

          {/* ── Road edges ── */}
          <polyline points={roadPoints} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 8" />

          {/* ── Progress fill ── */}
          <motion.polyline
            points={roadPoints}
            fill="none"
            stroke="url(#roadGrad)"
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={totalLength(WAYPOINTS)}
            style={{ pathLength: springT }}
            initial={{ strokeDashoffset: totalLength(WAYPOINTS) }}
          />

          {/* ── Center dashes ── */}
          <polyline points={roadPoints} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 10" />

          {/* ── Gradient def ── */}
          <defs>
            <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff2d9b" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#00ff88" />
            </linearGradient>
          </defs>

          {/* ── Coins ── */}
          {coinPositions.map((pos, i) => (
            <Coin key={i} cx={pos.x} cy={pos.y - 14} collected={collectedCoins.has(i)} />
          ))}

          {/* ── Checkpoints ── */}
          {checkpointPositions.map((pos, i) => {
            const isFinish = i === checkpointPositions.length - 1;
            const reached = t >= CHECKPOINT_T[i];
            return (
              <Checkpoint key={i} cx={pos.x} cy={pos.y + (isFinish ? 0 : 0)} reached={reached} isFinish={isFinish} />
            );
          })}

          {/* ── Confetti on complete ── */}
          <AnimatePresence>
            {showConfetti && <Confetti cx={checkpointPositions[checkpointPositions.length - 1].x} cy={checkpointPositions[checkpointPositions.length - 1].y} />}
          </AnimatePresence>

          {/* ── Wompus character ── */}
          <motion.g style={{ x: useTransform(charPos, (p) => p.x - CHAR_SIZE / 2), y: useTransform(charPos, (p) => p.y - CHAR_SIZE - 4) }}>
            {/* Shadow */}
            <motion.ellipse
              cx={CHAR_SIZE / 2} cy={CHAR_SIZE + 6}
              rx={10} ry={3}
              fill="rgba(0,0,0,0.3)"
              animate={running ? { rx: [10, 14, 10], ry: [3, 2, 3] } : {}}
              transition={{ duration: 0.3, repeat: Infinity }}
            />

            {/* Glow ring */}
            <motion.circle
              cx={CHAR_SIZE / 2} cy={CHAR_SIZE / 2}
              r={CHAR_SIZE / 2 + 2}
              fill="none"
              stroke={isComplete ? "#00ff88" : "#ff2d9b"}
              strokeWidth={1.5}
              animate={{ opacity: [0.4, 0.8, 0.4], r: [CHAR_SIZE / 2 + 2, CHAR_SIZE / 2 + 5, CHAR_SIZE / 2 + 2] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />

            {/* Click burst particles */}
            <AnimatePresence>
              {clickBurst && Array.from({ length: 12 }).map((_, i) => {
                const angle = (i / 12) * Math.PI * 2;
                const burstColors = ["#ff2d9b", "#7c3aed", "#2d6fff", "#00ff88"];
                return (
                  <motion.circle key={i}
                    cx={CHAR_SIZE / 2} cy={CHAR_SIZE / 2} r={3}
                    fill={burstColors[i % burstColors.length]}
                    initial={{ cx: CHAR_SIZE / 2, cy: CHAR_SIZE / 2, opacity: 1, r: 3 }}
                    animate={{ cx: CHAR_SIZE / 2 + Math.cos(angle) * 28, cy: CHAR_SIZE / 2 + Math.sin(angle) * 28, opacity: 0, r: 1.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                );
              })}
            </AnimatePresence>

            {/* Clickable character */}
            <motion.g
              onClick={handleCharClick}
              style={{ cursor: "pointer" }}
              animate={
                clickBurst
                  ? { rotate: [0, 180, 360] }
                  : isComplete
                  ? { y: [0, -8, 0], rotate: [0, 15, -15, 0] }
                  : running
                  ? { y: [0, -5, 0, -3, 0] }
                  : { y: [0, -2, 0] }
              }
              transition={
                clickBurst
                  ? { duration: 0.5, ease: "easeInOut" }
                  : isComplete
                  ? { duration: 0.5, repeat: Infinity, repeatType: "reverse" }
                  : running
                  ? { duration: 0.35, repeat: Infinity }
                  : { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <foreignObject x={0} y={0} width={CHAR_SIZE} height={CHAR_SIZE}>
                <WompusSvg size={CHAR_SIZE} />
              </foreignObject>
            </motion.g>

            {/* Speed lines when running */}
            <AnimatePresence>
              {running && !clickBurst && (
                <>
                  {[-4, 0, 4].map((dy, i) => (
                    <motion.line key={i}
                      x1={-2} y1={CHAR_SIZE / 2 + dy}
                      x2={-10} y2={CHAR_SIZE / 2 + dy}
                      stroke={["#ff2d9b", "#7c3aed", "#2d6fff"][i]}
                      strokeWidth={1}
                      strokeLinecap="round"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.8, 0], x1: [-2, -6], x2: [-10, -18] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05, repeat: Infinity }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>
          </motion.g>
        </svg>
      </div>

      {/* Speech bubble */}
      <AnimatePresence>
        {quip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 4 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="flex justify-center"
          >
            <div className="relative inline-flex items-center px-3 py-2 rounded-xl text-sm text-white"
              style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,45,155,0.35)", backdropFilter: "blur(12px)", boxShadow: "0 4px 20px rgba(255,45,155,0.15)" }}>
              {/* Tail */}
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
                style={{ background: "rgba(0,0,0,0.7)", borderTop: "1px solid rgba(255,45,155,0.35)", borderLeft: "1px solid rgba(255,45,155,0.35)" }} />
              {quip}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats row */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            {doneSteps}/{totalSteps} steps
          </span>
          {collectedCoins.size > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#ffd700" }}>
              ★ {collectedCoins.size}/{COIN_T.length}
            </span>
          )}
        </div>
        <span className="text-xs font-bold" style={{ color: isComplete ? "#00ff88" : "#ff2d9b", textShadow: `0 0 8px ${isComplete ? "rgba(0,255,136,0.5)" : "rgba(255,45,155,0.5)"}` }}>
          {clamped}%
        </span>
      </div>

      {/* Completion message */}
      <AnimatePresence>
        {isComplete && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm font-semibold"
            style={{ color: "#00ff88", textShadow: "0 0 16px rgba(0,255,136,0.7)" }}
          >
            🎉 Playbook complete! Generate your summary doc.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
