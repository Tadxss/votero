-- Free-text questions: a question can now be 'choice' (today's behavior, unchanged) or 'text' —
-- voters type a short answer instead of picking an option. Additive only: existing questions are
-- all implicitly 'choice' and need zero data backfill beyond the new column's default.

create type question_type as enum ('choice', 'text');

alter table public.questions add column type question_type not null default 'choice';

-- A text-question vote has no option; a choice-question vote has no response_text. option_id was
-- `not null` — relaxed here since it no longer applies to every vote.
alter table public.votes add column response_text text;
alter table public.votes alter column option_id drop not null;

alter table public.votes add constraint votes_option_xor_response
  check ((option_id is not null) <> (response_text is not null));

-- 300 chars keeps responses short-phrase-sized, which matters for the frequency-grouped,
-- font-size-scaled display (apps/web) looking reasonable rather than showing a paragraph at 3x size.
alter table public.votes add constraint votes_response_text_length
  check (response_text is null or char_length(trim(response_text)) between 1 and 300);
