"use client";

import { useCallback } from "react";
import confetti from "canvas-confetti";

// One small celebratory burst — used on a successful vote and on a lobby closing. `burst` is
// stable across renders so it's safe to put in a useEffect's dependency array.
export function useConfetti() {
  const burst = useCallback(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      startVelocity: 35,
      origin: { y: 0.7 },
      colors: ["#2F5F9E", "#16A394", "#7DA2D6", "#234A7D"],
    });
  }, []);

  return { burst };
}
