"use client";

const COLORS = ["bg-lime-400", "bg-gold-400", "bg-pink-400", "bg-sky-400", "bg-gold-300"];

// A small, tasteful confetti burst for one-time celebratory moments (e.g.
// finishing a game). Deliberately sparse — not a page-wide effect.
export default function Confetti({ count = 18 }: { count?: number }) {
  const pieces = Array.from({ length: count }, (_, i) => ({
    left: Math.round((i / count) * 100 + (Math.random() * 6 - 3)),
    delay: Math.random() * 0.4,
    color: COLORS[i % COLORS.length],
    rotate: Math.random() * 360,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`confetti-piece ${p.color}`}
          style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, transform: `rotate(${p.rotate}deg)` }}
        />
      ))}
    </div>
  );
}
