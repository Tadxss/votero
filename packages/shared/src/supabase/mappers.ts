import type { ApiKey, Lobby, LobbyOption, Profile, SurveyQuestion, Tables } from "@repo/types";

// Direct PostgREST reads (`.from("lobbies").select("*")`) come back with raw Postgres column
// names (snake_case, typed via the generated `Tables<...>` row types), unlike the RPCs
// (rpc_create_lobby, rpc_join_lobby), which build their JSON response through
// lobby_to_json/option_to_json/question_to_json (supabase/migrations) to match these camelCase
// domain types already. This mapper is the client-side half of that same snake_case ->
// camelCase boundary for the one place we read tables directly instead of going through an RPC.
type LobbyRow = Tables<"lobbies">;
type OptionRow = Tables<"options">;
type QuestionRow = Tables<"questions">;
type ProfileRow = Tables<"profiles">;

export function mapLobbyRow(row: LobbyRow): Lobby {
  return {
    id: row.id,
    code: row.code,
    creatorId: row.creator_id,
    title: row.title,
    status: row.status,
    ballotMode: row.ballot_mode,
    tallyVisibility: row.tally_visibility,
    visibility: row.visibility,
    voterCap: row.voter_cap,
    joinedCount: row.joined_count,
    votesCount: row.votes_count,
    otpRequired: row.otp_required,
    questionCount: row.question_count,
    brandLogoUrl: row.brand_logo_url,
    brandColor: row.brand_color,
    closesAt: row.closes_at,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOptionRow(row: OptionRow): LobbyOption {
  return {
    id: row.id,
    lobbyId: row.lobby_id,
    questionId: row.question_id,
    label: row.label,
    position: row.position,
  };
}

// Takes the question's own already-mapped, already-sorted options (grouped by the caller) rather
// than re-querying — mirrors how question_to_json nests options server-side.
export function mapQuestionRow(row: QuestionRow, options: LobbyOption[]): SurveyQuestion {
  return {
    id: row.id,
    lobbyId: row.lobby_id,
    title: row.title,
    type: row.type,
    maxSelections: row.max_selections,
    position: row.position,
    options,
  };
}

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

// Row shape here is deliberately narrower than the full ApiKeyRow — the select in useApiKeys
// never asks for key_hash, so there's nothing to map into ApiKey (which doesn't carry it either).
export function mapApiKeyRow(
  row: Pick<
    Tables<"api_keys">,
    "id" | "name" | "key_prefix" | "created_at" | "last_used_at" | "revoked_at"
  >,
): ApiKey {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  };
}
