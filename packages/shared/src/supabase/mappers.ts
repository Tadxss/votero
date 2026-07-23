import type { Lobby, LobbyOption, Profile, Tables } from "@repo/types";

// Direct PostgREST reads (`.from("lobbies").select("*")`) come back with raw Postgres column
// names (snake_case, typed via the generated `Tables<...>` row types), unlike the RPCs
// (rpc_create_lobby, rpc_join_lobby), which build their JSON response through
// lobby_to_json/option_to_json (supabase/migrations) to match these camelCase domain types
// already. This mapper is the client-side half of that same snake_case -> camelCase boundary for
// the one place we read the table directly instead of going through an RPC.
type LobbyRow = Tables<"lobbies">;
type OptionRow = Tables<"options">;
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
    label: row.label,
    position: row.position,
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
