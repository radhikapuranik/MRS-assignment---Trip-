-- Run this in the Supabase SQL editor for the "edit my response" feature.
-- Safe to run against the existing tables/data: adds columns with a default
-- and a unique constraint (only two rows currently exist, no duplicate names).

alter table preferences
  add column if not exists updated_at timestamptz not null default now();

alter table preferences
  add constraint preferences_name_unique unique (name);

alter table recommendation_cache
  add column if not exists latest_response_at timestamptz;
