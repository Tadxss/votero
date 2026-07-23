import { useMutation } from "@tanstack/react-query";
import { useSupabaseClient } from "../supabase/context";

// Uploads to avatars/{userId}/avatar.{ext} with upsert so re-uploading replaces the same file
// rather than accumulating orphaned objects. Returns the public URL only — persisting it to
// profiles.avatar_url is the caller's job (via useUpdateProfile), keeping this hook symmetric with
// the storage-only concern instead of coupling it to the profile write.
export function useUploadAvatar(userId: string | undefined) {
  const supabase = useSupabaseClient();

  return useMutation<string, Error, File>({
    mutationFn: async (file) => {
      if (!userId) throw new Error("NOT_SIGNED_IN");

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so a changed photo shows up immediately instead of the browser serving a
      // cached image from the same (upserted) URL.
      return `${data.publicUrl}?t=${Date.now()}`;
    },
  });
}
