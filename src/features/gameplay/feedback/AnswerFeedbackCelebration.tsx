"use client";

import type { CSSProperties } from "react";

const PARTICLES = [
  { x: -62, y: -32, rotation: -30, color: "bg-lime-400", delay: 0 },
  { x: -44, y: 26, rotation: 42, color: "bg-gold-400", delay: 25 },
  { x: -24, y: -50, rotation: 70, color: "bg-pink-400", delay: 45 },
  { x: 0, y: 38, rotation: -55, color: "bg-sky-400", delay: 20 },
  { x: 22, y: -48, rotation: 22, color: "bg-gold-300", delay: 60 },
  { x: 43, y: 27, rotation: 65, color: "bg-lime-500", delay: 35 },
  { x: 62, y: -24, rotation: -45, color: "bg-pink-300", delay: 10 },
  { x: 12, y: 55, rotation: 35, color: "bg-sky-300", delay: 55 },
];

export default function AnswerFeedbackCelebration({
  isCorrect,
  pointsEarned,
}: {
  isCorrect: boolean;
  pointsEarned: number;
}) {
  return (
    <div
      className={`answer-feedback-celebration ${isCorrect ? "is-correct" : "is-incorrect"}`}
      aria-hidden="true"
    >
      {isCorrect && (
        <>
          <span className="answer-feedback-points">+{pointsEarned} điểm</span>
          {PARTICLES.map((particle, index) => (
            <span
              key={index}
              className={`answer-confetti-piece ${particle.color}`}
              style={
                {
                  "--burst-x": `${particle.x}px`,
                  "--burst-y": `${particle.y}px`,
                  "--burst-rotation": `${particle.rotation}deg`,
                  "--burst-delay": `${particle.delay}ms`,
                } as CSSProperties
              }
            />
          ))}
        </>
      )}
    </div>
  );
}
