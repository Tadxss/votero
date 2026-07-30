-- Adding a new enum value only, in its own migration — Postgres forbids using a just-added enum
-- value in the same transaction it was added in, so this is split from the RPC/column migration
-- that actually uses 'ranked' rather than risk that footgun.
alter type question_type add value 'ranked';
