// Mirrors the Postgres enums defined in docs/ARCHITECTURE.md (supabase/migrations/0001_init.sql).

export type LobbyStatus = "draft" | "open" | "closed";
export type BallotMode = "anonymous" | "open";
export type TallyVisibility = "live" | "hidden";
export type LobbyVisibility = "public" | "private";
export type QuestionType = "choice" | "text";

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
  questionCount: number;
  closesAt: string | null;
  openedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LobbyOption {
  id: string;
  lobbyId: string;
  questionId: string;
  label: string;
  position: number;
}

export interface SurveyQuestion {
  id: string;
  lobbyId: string;
  title: string;
  type: QuestionType;
  position: number;
  options: LobbyOption[]; // empty for type: "text"
}

export interface Participant {
  id: string;
  lobbyId: string;
  userId: string;
  displayName: string | null;
  hasVoted: boolean;
  answeredCount: number;
  joinedAt: string;
}

export interface Profile {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UpdateProfileInput {
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

// --- Edge Function request/response DTOs (see docs/ARCHITECTURE.md "Edge Functions") ---

export interface CreateLobbyQuestionInput {
  title: string;
  type: QuestionType;
  options?: string[]; // required (min 2 labels) when type: "choice"; unused for type: "text"
}

export interface CreateLobbyInput {
  title: string;
  questions: CreateLobbyQuestionInput[]; // min 1 question
  voterCap: number;
  ballotMode: BallotMode;
  tallyVisibility: TallyVisibility;
  closesAt?: string; // ISO timestamp; must be in the future. Omit for no scheduled auto-close.
}

export interface CreateLobbyResult {
  lobby: Lobby;
  questions: SurveyQuestion[];
}

export interface JoinLobbyInput {
  code: string;
  displayName?: string;
}

export interface JoinLobbyResult {
  participantId: string;
  hasVoted: boolean;
  lobby: Lobby;
  questions: SurveyQuestion[];
}

export interface CastVoteInput {
  lobbyId: string;
  optionId: string;
}

export interface CastTextResponseInput {
  lobbyId: string;
  questionId: string;
  responseText: string;
}

export interface TallyEntry {
  optionId: string;
  count: number;
}

// Grouped by frequency (lower(trim(...)) match), ordered by count desc — a lightweight
// word-cloud effect (font-size scaled by count) rather than a true word-cloud layout.
export interface TextResponseGroup {
  text: string;
  count: number;
}

export type QuestionTally =
  | { questionId: string; questionTitle: string; type: "choice"; tally: TallyEntry[] }
  | { questionId: string; questionTitle: string; type: "text"; responses: TextResponseGroup[] };

interface BallotDetailIdentity {
  participantId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export type BallotDetailEntry =
  | (BallotDetailIdentity & { optionId: string })
  | (BallotDetailIdentity & { responseText: string });

export type QuestionBallotDetail =
  | { questionId: string; questionTitle: string; type: "choice"; entries: BallotDetailEntry[] }
  | { questionId: string; questionTitle: string; type: "text"; entries: BallotDetailEntry[] };

export interface LobbyProgress {
  joined: number;
  cap: number;
  votesCast: number;
}

export interface LobbyResults {
  progress: LobbyProgress;
  tally: QuestionTally[] | null; // null when tally_visibility='hidden', lobby still open, and caller isn't the creator
  ballotDetail: QuestionBallotDetail[] | null; // only present for ballotMode='open' creators
}

export type SetLobbyStatusInput =
  | { lobbyId: string; action: "open" }
  | { lobbyId: string; action: "close" };
