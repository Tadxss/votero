// Mirrors the Postgres enums defined in docs/ARCHITECTURE.md (supabase/migrations/0001_init.sql).

export type LobbyStatus = "draft" | "open" | "closed";
export type BallotMode = "anonymous" | "open";
export type TallyVisibility = "live" | "hidden";
export type LobbyVisibility = "public" | "private";

export interface Lobby {
  id: string;
  code: string;
  creatorId: string;
  title: string;
  status: LobbyStatus;
  ballotMode: BallotMode;
  tallyVisibility: TallyVisibility;
  visibility: LobbyVisibility;
  voterCap: number;
  joinedCount: number;
  votesCount: number;
  otpRequired: boolean;
  openedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LobbyOption {
  id: string;
  lobbyId: string;
  label: string;
  position: number;
}

export interface Participant {
  id: string;
  lobbyId: string;
  userId: string;
  displayName: string | null;
  hasVoted: boolean;
  joinedAt: string;
}

// --- Edge Function request/response DTOs (see docs/ARCHITECTURE.md "Edge Functions") ---

export interface CreateLobbyInput {
  title: string;
  options: string[]; // min 2 labels
  voterCap: number;
  ballotMode: BallotMode;
  tallyVisibility: TallyVisibility;
}

export interface CreateLobbyResult {
  lobby: Lobby;
  options: LobbyOption[];
}

export interface JoinLobbyInput {
  code: string;
  displayName?: string;
}

export interface JoinLobbyResult {
  participantId: string;
  lobby: Lobby;
  options: LobbyOption[];
}

export interface CastVoteInput {
  lobbyId: string;
  optionId: string;
}

export interface TallyEntry {
  optionId: string;
  count: number;
}

export interface BallotDetailEntry {
  participantId: string;
  displayName: string | null;
  optionId: string;
}

export interface LobbyProgress {
  joined: number;
  cap: number;
  votesCast: number;
}

export interface LobbyResults {
  progress: LobbyProgress;
  tally: TallyEntry[] | null; // null when tally_visibility='hidden', lobby still open, and caller isn't the creator
  ballotDetail: BallotDetailEntry[] | null; // only present for ballotMode='open' creators
}

export type SetLobbyStatusInput =
  | { lobbyId: string; action: "open" }
  | { lobbyId: string; action: "close" };
