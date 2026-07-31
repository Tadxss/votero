import { useMutation } from "@tanstack/react-query";
import { useSupabaseClient } from "../supabase/context";

// Mirrors useUploadAvatar.ts exactly. Uploads to lobby-logos/{creatorId}/{lobbyId}.{ext} with
// upsert so re-uploading a logo replaces the same file. Returns the public URL only — persisting
// it to lobbies.brand_logo_url is the caller's job (via useUpdateLobbyBranding).
export function useUploadLobbyLogo(creatorId: string | undefined, lobbyId: string | undefined) {
  const supabase = useSupabaseClient();

  return useMutation<string, Error, File>({
    mutationFn: async (file) => {
      if (!creatorId) throw new Error("NOT_SIGNED_IN");
      if (!lobbyId) throw new Error("NO_LOBBY_ID");

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${creatorId}/${lobbyId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("lobby-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("lobby-logos").getPublicUrl(path);
      return `${data.publicUrl}?t=${Date.now()}`;
    },
  });
}
