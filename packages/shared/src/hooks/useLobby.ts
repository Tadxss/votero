import { useQuery } from "@tanstack/react-query";
import type { Lobby, SurveyQuestion } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";
import { mapLobbyRow, mapOptionRow, mapQuestionRow } from "../supabase/mappers";

export interface LobbyWithQuestions {
  lobby: Lobby;
  questions: SurveyQuestion[];
}

// Direct RLS-gated read (not an Edge Function) — the `lobbies`/`questions`/`options` SELECT
// policies in docs/ARCHITECTURE.md already permit this for a public, non-draft lobby or its
// creator. Only `authenticated` (not `anon`) has a table grant at all (see
// supabase/migrations/..._grants.sql), so callers on a fresh browser session must wait for
// `useEnsureSession` before this can succeed — pass `enabled: false` until it's ready, otherwise
// the first attempt 401s (silently masked by TanStack Query's default retry, but avoidable).
export function useLobby(code: string | undefined, options?: { enabled?: boolean }) {
  const supabase = useSupabaseClient();

  return useQuery<LobbyWithQuestions>({
    queryKey: ["lobby", code],
    enabled: Boolean(code) && (options?.enabled ?? true),
    queryFn: async () => {
      const { data: lobby, error: lobbyError } = await supabase
        .from("lobbies")
        .select("*")
        .eq("code", code as string)
        .single();
      if (lobbyError) throw lobbyError;
      const mappedLobby = mapLobbyRow(lobby);

      const { data: questionRows, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("lobby_id", mappedLobby.id)
        .order("position", { ascending: true });
      if (questionsError) throw questionsError;

      const { data: optionRows, error: optionsError } = await supabase
        .from("options")
        .select("*")
        .eq("lobby_id", mappedLobby.id)
        .order("position", { ascending: true });
      if (optionsError) throw optionsError;

      const mappedOptions = (optionRows ?? []).map(mapOptionRow);
      const questions = (questionRows ?? []).map((row) =>
        mapQuestionRow(
          row,
          mappedOptions.filter((o) => o.questionId === row.id),
        ),
      );

      return {
        lobby: mappedLobby,
        questions,
      };
    },
  });
}
