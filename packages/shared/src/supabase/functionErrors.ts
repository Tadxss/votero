import { FunctionsHttpError } from "@supabase/supabase-js";

// supabase.functions.invoke()'s `error` for a non-2xx response is a generic FunctionsHttpError —
// its `.message` is NOT our Edge Functions' `{"error":"LOBBY_FULL"}` JSON body, which is only
// reachable via `error.context` (a Response). This extracts that code so callers can just check
// `err.message === "LOBBY_FULL"` etc. (see supabase/functions/_shared/errors.ts for the full list).
export async function extractFunctionErrorCode(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      // fall through to the generic message below
    }
  }
  return error instanceof Error ? error.message : "UNKNOWN_ERROR";
}
