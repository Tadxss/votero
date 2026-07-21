// Placeholder until Supabase is initialized (docs/ARCHITECTURE.md build order step 2).
// Replace this file's contents with the output of:
//   supabase gen types typescript --local > packages/types/src/database.ts
// The shape below matches what that generator produces (schema -> Tables/Views/Functions/Enums),
// just with loose `any` fields, so @supabase/supabase-js's generic client compiles against it in
// the meantime — `supabase.from(...)`/`.rpc(...)` calls type-check now and get real column/arg
// types for free once the generated file replaces this one.
/* eslint-disable @typescript-eslint/no-explicit-any -- placeholder shape only, see comment above */
export type Database = {
  public: {
    Tables: Record<string, { Row: any; Insert: any; Update: any }>;
    Views: Record<string, { Row: any }>;
    Functions: Record<string, { Args: any; Returns: any }>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, any>;
  };
};
