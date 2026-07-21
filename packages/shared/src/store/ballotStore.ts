import { create } from "zustand";

// In-progress ballot selection UI state — purely local, reset once a vote is confirmed cast.
// Server-authoritative state (has the vote actually landed, current tally, etc.) lives in
// TanStack Query (see ../hooks), not here.
interface BallotState {
  selectedOptionId: string | null;
  select: (optionId: string) => void;
  reset: () => void;
}

export const useBallotStore = create<BallotState>((set) => ({
  selectedOptionId: null,
  select: (optionId) => set({ selectedOptionId: optionId }),
  reset: () => set({ selectedOptionId: null }),
}));
