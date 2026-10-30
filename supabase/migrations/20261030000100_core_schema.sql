-- WishBridge core schema
-- Tables, enums, constraints and indexes. Access control lives in later migrations.

create schema if not exists private;
comment on schema private is 'Internal helpers. Not exposed through the Data API.';

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('user', 'admin');
create type public.account_status as enum ('active', 'restricted', 'suspended');

create type public.wish_status as enum (
  'draft', 'pending_review', 'changes_requested', 'approved', 'active',
  'fulfilment_pending', 'fulfilled', 'withdrawn', 'rejected', 'suspended'
);
create type public.wish_type as enum ('physical_gift', 'financial_goal', 'experience', 'service', 'other');
create type public.fulfilment_method as enum (
  'gift_purchase', 'monetary_contribution', 'gift_card', 'service_or_experience', 'other'
);
create type public.wisher_identity as enum ('username', 'anonymous');

create type public.offer_status as enum (
  'offered', 'accepted', 'declined', 'in_progress', 'awaiting_confirmation',
  'completed', 'cancelled', 'disputed'
);

create type public.payment_mode as enum ('test', 'live');
create type public.contribution_status as enum ('pending', 'succeeded', 'failed', 'refunded', 'cancelled');
create type public.refund_status as enum ('requested', 'processing', 'succeeded', 'failed', 'rejected');

create type public.report_reason as enum (
  'fraud_or_scam', 'prohibited_item', 'harassment', 'child_safety',
  'credential_phishing', 'personal_information', 'spam', 'other'
);
create type public.report_status as enum ('open', 'investigating', 'resolved', 'dismissed');
create type public.support_status as enum ('open', 'in_progress', 'closed');

create type public.notification_type as enum (
  'wish_submitted', 'wish_approved', 'wish_published', 'wish_rejected', 'wish_changes_requested',
  'wish_suspended', 'wish_reinstated', 'wish_fulfilled', 'wish_withdrawn',
  'offer_received', 'offer_accepted', 'offer_declined', 'offer_cancelled', 'offer_in_progress',
  'offer_delivered', 'offer_completed', 'offer_disputed', 'dispute_resolved', 'offer_message',
  'contribution_received', 'target_reached', 'contribution_refunded',
  'report_update', 'account_action'
);

-- ---------------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (public-facing identity) and accounts (private, admin controlled)
-- Email, phone and password live only in auth.users and are never copied here.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 280)
);
create unique index profiles_username_lower_key on public.profiles (lower(username));
comment on table public.profiles is 'Public handle only. Never add real names, email, phone or address here.';

create table public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'user',
  status public.account_status not null default 'active',
  status_reason text,
  status_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_status_reason_length check (status_reason is null or char_length(status_reason) <= 500)
);
comment on table public.accounts is 'Role and standing. Users can read their own row but never write it.';

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  anonymous_giving_default boolean not null default true,
  anonymous_wishing_default boolean not null default false,
  email_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9-]{2,40}$'),
  constraint categories_name_length check (char_length(name) between 2 and 60),
  constraint categories_description_length check (description is null or char_length(description) <= 240),
  constraint categories_icon_length check (icon is null or char_length(icon) <= 8)
);

-- ---------------------------------------------------------------------------
-- Wishes
-- Money is stored as integer minor units (e.g. cents). Max 1,000,000.00.
-- ---------------------------------------------------------------------------
create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null,
  additional_info text,
  category_id smallint not null references public.categories (id),
  wish_type public.wish_type not null,
  fulfilment_method public.fulfilment_method not null,
  country_code char(2) not null,
  currency char(3),
  estimated_cost_minor bigint,
  target_amount_minor bigint,
  status public.wish_status not null default 'draft',
  status_before_suspension public.wish_status,
  wisher_identity public.wisher_identity not null default 'username',
  show_when_fulfilled boolean not null default false,
  publish_on_approval boolean not null default true,
  is_featured boolean not null default false,
  moderation_note text,
  submitted_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  fulfilled_at timestamptz,
  withdrawn_at timestamptz,
  search tsvector generated always as (
    setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(description, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wishes_title_length check (char_length(btrim(title)) between 5 and 120),
  constraint wishes_description_length check (char_length(btrim(description)) between 20 and 5000),
  constraint wishes_additional_info_length check (additional_info is null or char_length(additional_info) <= 2000),
  constraint wishes_country_format check (country_code ~ '^[A-Z]{2}$'),
  constraint wishes_currency_format check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint wishes_estimated_cost_range check (estimated_cost_minor is null or estimated_cost_minor between 1 and 100000000),
  constraint wishes_target_range check (target_amount_minor is null or target_amount_minor between 100 and 100000000),
  constraint wishes_money_needs_currency check (
    (estimated_cost_minor is null and target_amount_minor is null) or currency is not null
  ),
  constraint wishes_contribution_needs_target check (
    fulfilment_method <> 'monetary_contribution' or target_amount_minor is not null
  ),
  constraint wishes_moderation_note_length check (moderation_note is null or char_length(moderation_note) <= 2000)
);
create index wishes_owner_idx on public.wishes (owner_id, created_at desc);
create index wishes_public_listing_idx on public.wishes (status, published_at desc);
create index wishes_category_idx on public.wishes (category_id);
create index wishes_country_idx on public.wishes (country_code);
create index wishes_featured_idx on public.wishes (published_at desc) where is_featured;
create index wishes_search_idx on public.wishes using gin (search);

create table public.wish_images (
  id uuid primary key default gen_random_uuid(),
  wish_id uuid not null references public.wishes (id) on delete cascade,
  storage_path text not null unique,
  alt_text text,
  sort_order smallint not null default 0,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  constraint wish_images_alt_length check (alt_text is null or char_length(alt_text) <= 200),
  constraint wish_images_sort_range check (sort_order between 0 and 9),
  constraint wish_images_path_format check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$')
);
create index wish_images_wish_idx on public.wish_images (wish_id, sort_order);

-- Allowed status changes, keyed by who may make them.
create table public.wish_status_transitions (
  from_status public.wish_status not null,
  to_status public.wish_status not null,
  actor text not null check (actor in ('owner', 'admin', 'system')),
  primary key (from_status, to_status, actor)
);

insert into public.wish_status_transitions (from_status, to_status, actor) values
  ('draft', 'pending_review', 'owner'),
  ('draft', 'withdrawn', 'owner'),
  ('pending_review', 'withdrawn', 'owner'),
  ('changes_requested', 'pending_review', 'owner'),
  ('changes_requested', 'withdrawn', 'owner'),
  ('approved', 'active', 'owner'),
  ('approved', 'withdrawn', 'owner'),
  ('active', 'pending_review', 'owner'),       -- substantive edit requires re-review
  ('active', 'withdrawn', 'owner'),
  ('fulfilment_pending', 'withdrawn', 'owner'),
  ('fulfilment_pending', 'fulfilled', 'owner'),  -- wisher confirms a contribution goal was met
  ('pending_review', 'approved', 'admin'),
  ('pending_review', 'active', 'admin'),         -- approve and publish immediately
  ('pending_review', 'changes_requested', 'admin'),
  ('pending_review', 'rejected', 'admin'),
  ('approved', 'suspended', 'admin'),
  ('active', 'suspended', 'admin'),
  ('fulfilment_pending', 'suspended', 'admin'),
  ('fulfilled', 'suspended', 'admin'),
  ('suspended', 'active', 'admin'),
  ('suspended', 'fulfilled', 'admin'),
  ('suspended', 'rejected', 'admin'),
  ('active', 'fulfilment_pending', 'system'),
  ('fulfilment_pending', 'active', 'system'),
  ('fulfilment_pending', 'fulfilled', 'system'),
  ('approved', 'suspended', 'system'),
  ('active', 'suspended', 'system'),
  ('fulfilment_pending', 'suspended', 'system');

create table public.wish_status_history (
  id bigint generated always as identity primary key,
  wish_id uuid not null references public.wishes (id) on delete cascade,
  from_status public.wish_status,
  to_status public.wish_status not null,
  actor_id uuid references auth.users (id) on delete set null,
  actor_role text not null check (actor_role in ('owner', 'admin', 'system')),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index wish_status_history_wish_idx on public.wish_status_history (wish_id, created_at);

-- ---------------------------------------------------------------------------
-- Fulfilment offers
-- giver_id is never readable by the wisher; wishers read offers through
-- functions that return a display label instead.
-- ---------------------------------------------------------------------------
create table public.fulfilment_offers (
  id uuid primary key default gen_random_uuid(),
  wish_id uuid not null references public.wishes (id) on delete cascade,
  giver_id uuid not null references auth.users (id) on delete cascade,
  status public.offer_status not null default 'offered',
  is_anonymous boolean not null default true,
  message text,
  delivery_plan text,
  idempotency_key uuid not null,
  decision_note text,
  giver_confirmed_at timestamptz,
  wisher_confirmed_at timestamptz,
  dispute_reason text,
  disputed_by text check (disputed_by is null or disputed_by in ('wisher', 'giver')),
  resolution_note text,
  resolved_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fulfilment_offers_idempotency unique (giver_id, idempotency_key),
  constraint fulfilment_offers_message_length check (message is null or char_length(message) <= 1000),
  constraint fulfilment_offers_plan_length check (delivery_plan is null or char_length(delivery_plan) <= 1000),
  constraint fulfilment_offers_decision_length check (decision_note is null or char_length(decision_note) <= 1000),
  constraint fulfilment_offers_dispute_length check (dispute_reason is null or char_length(dispute_reason) <= 1000),
  constraint fulfilment_offers_resolution_length check (resolution_note is null or char_length(resolution_note) <= 2000),
  constraint fulfilment_offers_completion_needs_both check (
    status <> 'completed' or resolved_by is not null or (giver_confirmed_at is not null and wisher_confirmed_at is not null)
  )
);
-- A giver may hold only one live offer per wish.
create unique index fulfilment_offers_one_live_per_giver
  on public.fulfilment_offers (wish_id, giver_id)
  where status in ('offered', 'accepted', 'in_progress', 'awaiting_confirmation', 'disputed');
-- A wish may have only one committed offer at a time.
create unique index fulfilment_offers_one_committed_per_wish
  on public.fulfilment_offers (wish_id)
  where status in ('accepted', 'in_progress', 'awaiting_confirmation', 'disputed');
create index fulfilment_offers_giver_idx on public.fulfilment_offers (giver_id, created_at desc);
create index fulfilment_offers_wish_idx on public.fulfilment_offers (wish_id, created_at desc);
create index fulfilment_offers_status_idx on public.fulfilment_offers (status);

create table public.offer_status_transitions (
  from_status public.offer_status not null,
  to_status public.offer_status not null,
  actor text not null check (actor in ('wisher', 'giver', 'admin', 'system')),
  primary key (from_status, to_status, actor)
);

insert into public.offer_status_transitions (from_status, to_status, actor) values
  ('offered', 'accepted', 'wisher'),
  ('offered', 'declined', 'wisher'),
  ('offered', 'cancelled', 'giver'),
  ('offered', 'cancelled', 'system'),
  ('accepted', 'in_progress', 'giver'),
  ('accepted', 'awaiting_confirmation', 'giver'),
  ('accepted', 'cancelled', 'giver'),
  ('accepted', 'cancelled', 'wisher'),
  ('accepted', 'cancelled', 'system'),
  ('accepted', 'disputed', 'wisher'),
  ('accepted', 'disputed', 'giver'),
  ('in_progress', 'awaiting_confirmation', 'giver'),
  ('in_progress', 'cancelled', 'giver'),
  ('in_progress', 'cancelled', 'wisher'),
  ('in_progress', 'cancelled', 'system'),
  ('in_progress', 'disputed', 'wisher'),
  ('in_progress', 'disputed', 'giver'),
  ('awaiting_confirmation', 'completed', 'wisher'),
  ('awaiting_confirmation', 'disputed', 'wisher'),
  ('awaiting_confirmation', 'disputed', 'giver'),
  ('awaiting_confirmation', 'cancelled', 'system'),
  ('disputed', 'completed', 'admin'),
  ('disputed', 'cancelled', 'admin'),
  ('disputed', 'cancelled', 'system');

create table public.offer_messages (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.fulfilment_offers (id) on delete cascade,
  sender_id uuid references auth.users (id) on delete set null,
  sender_role text not null check (sender_role in ('wisher', 'giver', 'admin')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index offer_messages_offer_idx on public.offer_messages (offer_id, created_at);

-- ---------------------------------------------------------------------------
-- Contributions (TEST MODE ONLY in the MVP) and refunds
-- ---------------------------------------------------------------------------
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  wish_id uuid not null references public.wishes (id) on delete cascade,
  contributor_id uuid references auth.users (id) on delete set null,
  amount_minor bigint not null,
  currency char(3) not null,
  is_anonymous boolean not null default true,
  message text,
  mode public.payment_mode not null default 'test',
  status public.contribution_status not null default 'pending',
  provider text not null default 'simulated',
  provider_reference text,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contributions_idempotency unique (contributor_id, idempotency_key),
  constraint contributions_amount_range check (amount_minor between 100 and 100000000),
  constraint contributions_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint contributions_message_length check (message is null or char_length(message) <= 500),
  -- Remove only after a compliant payment provider and legal review are in place.
  constraint contributions_mvp_test_mode_only check (mode = 'test' and provider = 'simulated')
);
create index contributions_wish_idx on public.contributions (wish_id, created_at desc);
create index contributions_contributor_idx on public.contributions (contributor_id, created_at desc);
create index contributions_succeeded_idx on public.contributions (wish_id) where status = 'succeeded';
create unique index contributions_provider_reference_key on public.contributions (provider, provider_reference)
  where provider_reference is not null;

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  mode public.payment_mode not null default 'test',
  status public.refund_status not null default 'requested',
  reason text check (reason is null or char_length(reason) <= 1000),
  provider_reference text,
  requested_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refunds_mvp_test_mode_only check (mode = 'test')
);
create unique index refunds_one_per_contribution on public.refunds (contribution_id)
  where status in ('requested', 'processing', 'succeeded');

-- ---------------------------------------------------------------------------
-- Notifications, reports, support, audit
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.notification_type not null,
  title text not null check (char_length(title) <= 200),
  body text not null check (char_length(body) <= 1000),
  link text check (link is null or link ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  wish_id uuid not null references public.wishes (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 2000),
  status public.report_status not null default 'open',
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 2000),
  handled_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index reports_one_open_per_reporter
  on public.reports (wish_id, reporter_id) where status in ('open', 'investigating');
create index reports_status_idx on public.reports (status, created_at desc);

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  contact_email text not null,
  subject text not null,
  message text not null,
  status public.support_status not null default 'open',
  admin_note text check (admin_note is null or char_length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_email_format check (
    char_length(contact_email) <= 254 and contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint support_subject_length check (char_length(btrim(subject)) between 3 and 150),
  constraint support_message_length check (char_length(btrim(message)) between 10 and 5000)
);
create index support_requests_status_idx on public.support_requests (status, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  actor_role text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id);

create or replace function private.block_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$;
create trigger audit_logs_append_only
  before update or delete on public.audit_logs
  for each row execute function private.block_audit_mutation();

create table private.rate_limits (
  bucket text not null,
  subject text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (bucket, subject, window_start)
);

-- updated_at triggers
create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger accounts_touch before update on public.accounts for each row execute function private.touch_updated_at();
create trigger user_settings_touch before update on public.user_settings for each row execute function private.touch_updated_at();
create trigger categories_touch before update on public.categories for each row execute function private.touch_updated_at();
create trigger wishes_touch before update on public.wishes for each row execute function private.touch_updated_at();
create trigger offers_touch before update on public.fulfilment_offers for each row execute function private.touch_updated_at();
create trigger contributions_touch before update on public.contributions for each row execute function private.touch_updated_at();
create trigger refunds_touch before update on public.refunds for each row execute function private.touch_updated_at();
create trigger reports_touch before update on public.reports for each row execute function private.touch_updated_at();
create trigger support_touch before update on public.support_requests for each row execute function private.touch_updated_at();

-- Default categories (reference data, required in every environment)
insert into public.categories (slug, name, description, icon, sort_order) values
  ('education', 'Education & Learning', 'Courses, books, school supplies and study goals.', '📚', 10),
  ('creative', 'Creative Projects', 'Art supplies, instruments, writing and making.', '🎨', 20),
  ('experiences', 'Experiences', 'Trips, classes, concerts and memorable moments.', '🎟️', 30),
  ('home', 'Home & Living', 'Things that make a house feel like home.', '🏡', 40),
  ('technology', 'Technology', 'Devices and tools for work, study or play.', '💻', 50),
  ('sports', 'Sports & Wellbeing', 'Equipment, memberships and healthy habits.', '🏃', 60),
  ('kids', 'Kids & Family', 'Toys, books and family activities (posted by parents or guardians).', '🧸', 70),
  ('community', 'Community', 'Wishes that help a club, group or neighbourhood.', '🤝', 80),
  ('celebrations', 'Celebrations', 'Birthdays, milestones and special occasions.', '🎉', 90),
  ('other', 'Something Else', 'Any other lawful wish.', '✨', 100);
