// Maps the exception messages raised by our RPCs (supabase/migrations/..._functions.sql) to HTTP
// status codes, so each Edge Function doesn't have to repeat this table.
const STATUS_BY_MESSAGE: Record<string, number> = {
  LOBBY_NOT_FOUND: 404,
  LOBBY_NOT_OPEN: 410,
  LOBBY_NOT_DRAFT: 409,
  LOBBY_FULL: 409,
  NOT_JOINED: 403,
  ALREADY_VOTED: 409,
  INVALID_OPTION: 400,
  INVALID_ACTION: 400,
  FORBIDDEN: 403,
  AT_LEAST_TWO_OPTIONS_REQUIRED: 400,
};

export function statusForRpcError(message: string): number {
  return STATUS_BY_MESSAGE[message] ?? 400;
}
