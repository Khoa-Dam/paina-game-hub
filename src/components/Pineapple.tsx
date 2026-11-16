"use client";

import { useId } from "react";

// PAINA's signature mark: a chunky, bold-outlined pineapple (the fruit's
// natural diamond-lattice skin doubles as the brand's "diamond" motif),
// drawn in a Mario-block style — thick black strokes, flat candy colors.
export default function Pineapple({ className = "h-8 w-8", bounce = false }: { className?: string; bounce?: boolean }) {
  const clipId = `pineappleBody-${useId()}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={`${className} ${bounce ? "animate-float" : ""}`}
      aria-hidden="true"
    >
      {/* crown */}
      <path
        d="M32 4 L36 18 L32 14 L28 18 Z"
        fill="#98C928"
        stroke="#2A2140"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M22 8 L30 20 L24 19 L20 22 Z"
        fill="#B3E63A"
        stroke="#2A2140"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M42 8 L34 20 L40 19 L44 22 Z"
        fill="#B3E63A"
        stroke="#2A2140"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* body */}
      <rect x="14" y="20" width="36" height="38" rx="16" fill="#FFC93C" stroke="#2A2140" strokeWidth="3" />

      {/* diamond lattice texture */}
      <g stroke="#2A2140" strokeWidth="1.6" strokeLinecap="round" clipPath={`url(#${clipId})`}>
        <path d="M14 26 L30 58" />
        <path d="M22 20 L42 58" />
        <path d="M32 20 L50 52" />
        <path d="M42 20 L50 36" />
        <path d="M50 26 L30 58" />
        <path d="M42 20 L22 58" />
        <path d="M32 20 L14 52" />
        <path d="M22 20 L14 36" />
      </g>
      <clipPath id={clipId}>
        <rect x="14" y="20" width="36" height="38" rx="16" />
      </clipPath>
    </svg>
  );
}
