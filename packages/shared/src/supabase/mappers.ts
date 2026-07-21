import type { Lobby, LobbyOption } from "@repo/types";

// Direct PostgREST reads (`.from("lobbies").select("*")`) come back with raw Postgres column
// names (snake_case), unlike the RPCs (rpc_create_lobby, rpc_join_lobby), which build their JSON
// response through lobby_to_json/option_to_json (supabase/migrations) to match these camelCase
// domain types already. This mapper is the client-side half of that same snake_case -> camelCase
// boundary for the one place we read the table directly instead of going through an RPC.
interface LobbyRow {
  id: string;
  code: string;
  creator_id: string;
  title: string;
  status: Lobby["status"];
  ballot_mode: Lobby["ballotMode"];
  tally_visibility: Lobby["tallyVisibility"];
  visibility: Lobby["visibility"];
  voter_cap: number;
  joined_count: number;
  votes_count: number;
  otp_required: boolean;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface OptionRow {
  id: string;
  lobby_id: string;
  label: string;
  position: number;
}

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
