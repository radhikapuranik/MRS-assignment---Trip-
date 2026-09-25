-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).

create table if not exists preferences (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  budget             integer not null check (budget > 0),
  date_start         date not null,
  date_end           date not null,
  destination_types  text[] not null,
  dealbreakers       text,
  created_at         timestamptz not null default now(),
  constraint date_end_after_start check (date_end >= date_start)
);

create table if not exists recommendation_cache (
  id                    int primary key,
  response_count        integer not null,
  recommendation_json   jsonb not null,
  generated_at          timestamptz not null default now(),
  constraint single_row check (id = 1)
);
