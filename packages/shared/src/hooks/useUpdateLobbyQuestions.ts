import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateLobbyQuestionInput, CreateLobbyResult, Json } from "@repo/types";
import { useSupabaseClient } from "../supabase/context";
import type { LobbyWithQuestions } from "./useLobby";

export interface UpdateLobbyQuestionsInput {
  lobbyId: string;
  questions: CreateLobbyQuestionInput[];
}

// SECURITY INVOKER RPC (rpc_update_lobby_questions), same posture as rpc_create_lobby — the
// existing *_write_draft_only RLS policies on questions/options are the real authorization
// backstop, the RPC just adds a clean creator/draft-status check before the delete+reinsert
// (supabase/migrations/20260802090000_editable_draft_questions.sql). Wire shape and response
// mirror rpc_create_lobby exactly, so this reuses CreateLobbyResult rather than a new type.
export function useUpdateLobbyQuestions(code: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation<CreateLobbyResult, Error, UpdateLobbyQuestionsInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.rpc("rpc_update_lobby_questions", {
        p_lobby_id: input.lobbyId,
        p_questions: input.questions as unknown as Json,
      });
      if (error) throw error;
      return data as unknown as CreateLobbyResult;
    },
    onSuccess: (result) => {
      queryClient.setQueryData<LobbyWithQuestions>(["lobby", code], (old) =>
        old ? { ...old, lobby: result.lobby, questions: result.questions } : old,
      );
    },
  });
}
