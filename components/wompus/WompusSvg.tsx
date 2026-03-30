// Shared inline SVG Wompus character
// size: width/height in px

interface Props {
  size?: number;
  className?: string;
}

export default function WompusSvg({ size = 40, className }: Props) {
  const s = size;
  // proportional helpers
  const bx = s * 0.15;   // body x
  const by = s * 0.35;   // body y
  const bw = s * 0.70;   // body width
  const bh = s * 0.55;   // body height
  const br = s * 0.18;   // body corner radius

  const elx = s * 0.22;  // left ear x
  const erx = s * 0.58;  // right ear x
  const ey  = s * 0.04;  // ear y
  const ew  = s * 0.20;  // ear width
  const eh  = s * 0.28;  // ear height
  const er  = s * 0.10;  // ear radius

  // eyes
  const eylx = s * 0.34;
  const eyrx = s * 0.58;
  const eyy  = s * 0.52;
  const eyr  = s * 0.055;

  // smile
  const smx  = s * 0.50;
  const smy  = s * 0.70;
  const smr  = s * 0.14;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left ear */}
      <rect x={elx} y={ey} width={ew} height={eh} rx={er} fill="#534AB7" />
      {/* Right ear */}
      <rect x={erx} y={ey} width={ew} height={eh} rx={er} fill="#534AB7" />
      {/* Body */}
      <rect x={bx} y={by} width={bw} height={bh} rx={br} fill="#534AB7" />
      {/* Left eye */}
      <circle cx={eylx} cy={eyy} r={eyr} fill="white" />
      {/* Right eye */}
      <circle cx={eyrx} cy={eyy} r={eyr} fill="white" />
      {/* Smile */}
      <path
        d={`M ${smx - smr} ${smy} Q ${smx} ${smy + smr * 1.1} ${smx + smr} ${smy}`}
        stroke="white"
        strokeWidth={s * 0.04}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
