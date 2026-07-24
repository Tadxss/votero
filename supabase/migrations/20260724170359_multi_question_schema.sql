-- Multi-question surveys: a lobby can now ask 1+ questions instead of exactly one. Existing
-- single-question lobbies become the common case of "a survey with exactly one question" — no
-- separate lobby "kind", and the data migration below makes this fully backward-compatible.
--
-- Real constraint this migration has to work around: votes had `unique (lobby_id, participant_id)`
-- — a hard one-vote-per-lobby guarantee that physically prevented more than one vote per person
-- per lobby. That's relaxed to `unique (participant_id, question_id)` below, which is the actual
-- "one vote per question" guarantee multi-question voting needs.

create table public.questions (
  id       uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  title    text not null check (char_length(title) between 1 and 200),
  position integer not null,
  unique (lobby_id, position)
);

alter table public.lobbies add column question_count integer not null default 1;
alter table public.participants add column answered_count integer not null default 0;

alter table public.options add column question_id uuid references public.questions(id) on delete cascade;
alter table public.votes add column question_id uuid references public.questions(id) on delete cascade;

-- Data migration: one default question per existing lobby, repoint existing options/votes to it.
insert into public.questions (id, lobby_id, title, position)
select gen_random_uuid(), l.id, l.title, 0
from public.lobbies l;

update public.options o
set question_id = q.id
from public.questions q
where q.lobby_id = o.lobby_id;

update public.votes v
set question_id = o.question_id
from public.options o
where o.id = v.option_id;

-- Backfill answered_count from existing votes (was implicitly 0/1 via has_voted before).
update public.participants p
set answered_count = (select count(*) from public.votes v where v.participant_id = p.id);

alter table public.options alter column question_id set not null;
alter table public.votes alter column question_id set not null;

-- options positions now restart at 0 per question (not per lobby) — the old (lobby_id, position)
-- uniqueness would collide as soon as a second question's first option reused position 0.
alter table public.options drop constraint options_lobby_id_position_key;
alter table public.options add constraint options_question_id_position_key unique (question_id, position);

alter table public.votes drop constraint votes_lobby_id_participant_id_key;
alter table public.votes add constraint votes_participant_id_question_id_key unique (participant_id, question_id);

create index questions_lobby_id_idx on public.questions(lobby_id);
create index options_question_id_idx on public.options(question_id);
create index votes_question_id_idx on public.votes(question_id);

-- questions: readable wherever the parent lobby is readable (same rule as options), writable by
-- the creator only while the lobby is still draft (same rule as options_write_draft_only).
alter table public.questions enable row level security;

create policy questions_select on public.questions
  for select using (
    exists (select 1 from public.lobbies l where l.id = questions.lobby_id)
  );

create policy questions_write_draft_only on public.questions
  for all using (
    exists (
      select 1 from public.lobbies l
      where l.id = questions.lobby_id and l.creator_id = auth.uid() and l.status = 'draft'
    )
  ) with check (
    exists (
      select 1 from public.lobbies l
      where l.id = questions.lobby_id and l.creator_id = auth.uid() and l.status = 'draft'
    )
  );

grant select, insert on public.questions to authenticated;
