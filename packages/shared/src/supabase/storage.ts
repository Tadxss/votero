// Supabase Auth needs a persistent key/value store to keep a session (including anonymous
// sessions) alive across app restarts. Web (localStorage) and native (SecureStore/AsyncStorage)
// need different backing implementations, so each app supplies its own adapter here rather than
// packages/shared depending on a platform-specific storage library.
export interface SupabaseStorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}
