"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ANSWER_FEEDBACK_VIBRATION,
  BACKGROUND_BASS_HZ,
  BACKGROUND_MELODY_HZ,
  BACKGROUND_NOTE_INTERVAL_MS,
} from "./constants";

type WindowWithWebkitAudioContext = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

function playTone(
  context: AudioContext,
  frequency: number,
  duration: number,
  volume: number,
  waveform: OscillatorType,
  delay = 0,
) {
  const startAt = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}

export function useGameAudio() {
  const contextRef = useRef<AudioContext | null>(null);
  const musicTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const musicNoteIndexRef = useRef(0);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [audioSupported, setAudioSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const audioWindow = window as WindowWithWebkitAudioContext;
    setAudioSupported(
      Boolean(audioWindow.AudioContext ?? audioWindow.webkitAudioContext),
    );
  }, []);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;

    if (!contextRef.current || contextRef.current.state === "closed") {
      const audioWindow = window as WindowWithWebkitAudioContext;
      const AudioContextConstructor =
        audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

      if (!AudioContextConstructor) {
        setAudioSupported(false);
        return null;
      }

      try {
        contextRef.current = new AudioContextConstructor();
        setAudioSupported(true);
      } catch {
        setAudioSupported(false);
        return null;
      }
    }

    return contextRef.current;
  }, []);

  const unlockAudio = useCallback(() => {
    const context = getAudioContext();
    if (context?.state === "suspended") {
      void context.resume().catch(() => undefined);
    }
  }, [getAudioContext]);

  const stopMusic = useCallback(() => {
    if (musicTimerRef.current) {
      clearInterval(musicTimerRef.current);
      musicTimerRef.current = null;
    }
    musicNoteIndexRef.current = 0;
  }, []);

  const startMusic = useCallback(() => {
    const context = getAudioContext();
    if (!context) return false;

    if (context.state === "suspended") {
      void context.resume().catch(() => undefined);
    }

    stopMusic();
    const playNextNote = () => {
      if (context.state === "closed") return;

      const noteIndex = musicNoteIndexRef.current;
      const melodyNote = BACKGROUND_MELODY_HZ[noteIndex];
      playTone(context, melodyNote, 0.18, 0.022, "triangle");

      if (noteIndex % 4 === 0) {
        const bassIndex = Math.floor(noteIndex / 4) % BACKGROUND_BASS_HZ.length;
        playTone(context, BACKGROUND_BASS_HZ[bassIndex], 0.42, 0.012, "sine");
      }

      musicNoteIndexRef.current = (noteIndex + 1) % BACKGROUND_MELODY_HZ.length;
    };

    playNextNote();
    musicTimerRef.current = setInterval(
      playNextNote,
      BACKGROUND_NOTE_INTERVAL_MS,
    );
    return true;
  }, [getAudioContext, stopMusic]);

  const toggleMusic = useCallback(() => {
    if (musicEnabled) {
      stopMusic();
      setMusicEnabled(false);
      return;
    }

    if (startMusic()) setMusicEnabled(true);
  }, [musicEnabled, startMusic, stopMusic]);

  const playAnswerFeedback = useCallback(
    (isCorrect: boolean) => {
      const context = getAudioContext();
      if (context) {
        if (context.state === "suspended") {
          void context.resume().catch(() => undefined);
        }

        if (isCorrect) {
          playTone(context, 880, 0.13, 0.075, "sine");
          playTone(context, 1174.66, 0.18, 0.065, "sine", 0.09);
        } else {
          const startAt = context.currentTime;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "square";
          oscillator.frequency.setValueAtTime(190, startAt);
          oscillator.frequency.linearRampToValueAtTime(110, startAt + 0.16);
          gain.gain.setValueAtTime(0.0001, startAt);
          gain.gain.exponentialRampToValueAtTime(0.045, startAt + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(startAt);
          oscillator.stop(startAt + 0.2);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
        }
      }

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(
          isCorrect
            ? [...ANSWER_FEEDBACK_VIBRATION.correct]
            : [...ANSWER_FEEDBACK_VIBRATION.incorrect],
        );
      }
    },
    [getAudioContext],
  );

  useEffect(() => {
    return () => {
      stopMusic();
      const context = contextRef.current;
      contextRef.current = null;
      if (context && context.state !== "closed") {
        void context.close().catch(() => undefined);
      }
    };
  }, [stopMusic]);

  return {
    audioSupported,
    musicEnabled,
    playAnswerFeedback,
    toggleMusic,
    unlockAudio,
  };
}
