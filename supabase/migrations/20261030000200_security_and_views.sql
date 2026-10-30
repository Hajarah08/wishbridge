-- WishBridge access control: helpers, new-user provisioning, RLS, grants, public views.
--
-- Model:
--   * anon / authenticated get SELECT on base tables only where RLS restricts rows
--     to the caller (or to admins). Nothing in this file grants INSERT/UPDATE/DELETE
--     on business tables except narrow column grants on the caller's own profile,
--     settings and notification read state.
--   * All other writes go through SECURITY DEFINER functions (later migrations)
--     which authorise the caller, validate state transitions and write audit rows
--     inside a single transaction.
--   * Public listings use views that expose only safe columns. Owner and giver
--     account ids are never part of any public or cross-user result.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.accounts a
    where a.id = (select auth.uid()) and a.role = 'admin' and a.status = 'active'
  );
$$;

create or replace function private.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You need to sign in to do that.' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

-- Caller must be signed in with an account in good standing.
create or replace function private.require_active_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_status public.account_status;
begin
  select status into v_status from public.accounts where id = v_uid;
  if v_status is null then
    raise exception 'Account not found.' using errcode = '42501';
  end if;
  if v_status <> 'active' then
    raise exception 'Your account is currently restricted. Please contact support.' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

create or replace function private.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  if not private.is_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

create or replace function private.check_rate_limit(p_bucket text, p_subject text, p_max integer, p_window_seconds integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into private.rate_limits as r (bucket, subject, window_start, hits)
  values (p_bucket, p_subject, v_window, 1)
  on conflict (bucket, subject, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;

  if v_hits > p_max then
    raise exception 'Too many requests. Please wait a little and try again.' using errcode = 'WB429';
  end if;
end;
$$;

create or replace function private.audit(
  p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}'::jsonb, p_actor_role text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    coalesce(p_actor_role, case when private.is_admin() then 'admin' when auth.uid() is null then 'system' else 'user' end),
    p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

create or replace function private.notify(
  p_user_id uuid, p_type public.notification_type, p_title text, p_body text, p_link text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, left(p_title, 200), left(p_body, 1000), p_link);
end;
$$;

-- Public label for a wisher, honouring their anonymity choice.
create or replace function private.wisher_label(p_wish_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when w.wisher_identity = 'anonymous' then 'An anonymous wisher' else '@' || p.username end
  from public.wishes w join public.profiles p on p.id = w.owner_id
  where w.id = p_wish_id;
$$;

-- Public label for a giver, honouring their anonymity choice.
create or replace function private.giver_label(p_giver_id uuid, p_is_anonymous boolean)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_is_anonymous then 'An anonymous giver'
              else coalesce('@' || (select username from public.profiles where id = p_giver_id), 'A giver') end;
$$;

-- Whether a wish is visible to the public (listings, detail page, images).
create or replace function private.wish_is_public(p_wish_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.wishes w
    where w.id = p_wish_id
      and (w.status in ('active', 'fulfilment_pending') or (w.status = 'fulfilled' and w.show_when_fulfilled))
  );
$$;

create or replace function private.owns_wish(p_wish_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.wishes w where w.id = p_wish_id and w.owner_id = (select auth.uid()));
$$;

-- ---------------------------------------------------------------------------
-- Status machines
-- ---------------------------------------------------------------------------

-- Defence in depth: whoever issues the UPDATE, an unknown transition fails.
create or replace function private.enforce_wish_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and not exists (
    select 1 from public.wish_status_transitions t
    where t.from_status = old.status and t.to_status = new.status
  ) then
    raise exception 'Invalid wish status change from % to %', old.status, new.status using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger wishes_enforce_transition
  before update of status on public.wishes
  for each row execute function private.enforce_wish_transition();

create or replace function private.enforce_offer_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and not exists (
    select 1 from public.offer_status_transitions t
    where t.from_status = old.status and t.to_status = new.status
  ) then
    raise exception 'Invalid offer status change from % to %', old.status, new.status using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger offers_enforce_transition
  before update of status on public.fulfilment_offers
  for each row execute function private.enforce_offer_transition();

-- Change a wish's status as a specific actor. Caller must already hold a row lock
-- or be inside the transaction that validated ownership.
create or replace function private.set_wish_status(
  p_wish_id uuid, p_to public.wish_status, p_actor text, p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from public.wish_status;
begin
  select status into v_from from public.wishes where id = p_wish_id for update;
  if v_from is null then
    raise exception 'Wish not found.' using errcode = 'P0002';
  end if;
  if v_from = p_to then
    return;
  end if;
  if not exists (
    select 1 from public.wish_status_transitions
    where from_status = v_from and to_status = p_to and actor = p_actor
  ) then
    raise exception 'This wish cannot move from % to %.', replace(v_from::text, '_', ' '), replace(p_to::text, '_', ' ')
      using errcode = '55000';
  end if;

  update public.wishes set
    status = p_to,
    status_before_suspension = case when p_to = 'suspended' then v_from else status_before_suspension end,
    submitted_at = case when p_to = 'pending_review' then now() else submitted_at end,
    approved_at  = case when p_to in ('approved', 'active') and v_from = 'pending_review' then now() else approved_at end,
    published_at = case when p_to = 'active' and published_at is null then now() else published_at end,
    fulfilled_at = case when p_to = 'fulfilled' then coalesce(fulfilled_at, now()) else fulfilled_at end,
    withdrawn_at = case when p_to = 'withdrawn' then now() else withdrawn_at end
  where id = p_wish_id;

  insert into public.wish_status_history (wish_id, from_status, to_status, actor_id, actor_role, note)
  values (p_wish_id, v_from, p_to, auth.uid(), p_actor, p_note);
end;
$$;

create or replace function private.set_offer_status(
  p_offer_id uuid, p_to public.offer_status, p_actor text
)
returns public.offer_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from public.offer_status;
begin
  select status into v_from from public.fulfilment_offers where id = p_offer_id for update;
  if v_from is null then
    raise exception 'Offer not found.' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.offer_status_transitions
    where from_status = v_from and to_status = p_to and actor = p_actor
  ) then
    raise exception 'This offer cannot move from % to %.', replace(v_from::text, '_', ' '), replace(p_to::text, '_', ' ')
      using errcode = '55000';
  end if;

  update public.fulfilment_offers set
    status = p_to,
    decided_at = case when p_to in ('accepted', 'declined') then now() else decided_at end,
    cancelled_at = case when p_to = 'cancelled' then now() else cancelled_at end,
    completed_at = case when p_to = 'completed' then now() else completed_at end
  where id = p_offer_id;
  return v_from;
end;
$$;

-- ---------------------------------------------------------------------------
-- New-user provisioning
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := new.raw_user_meta_data ->> 'username';
begin
  if v_username is null
     or v_username !~ '^[A-Za-z0-9_]{3,24}$'
     or exists (select 1 from public.profiles where lower(username) = lower(v_username)) then
    loop
      v_username := 'wisher_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      exit when not exists (select 1 from public.profiles where lower(username) = lower(v_username));
    end loop;
  end if;

  insert into public.profiles (id, username) values (new.id, v_username);
  insert into public.accounts (id) values (new.id);
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.user_settings enable row level security;
alter table public.categories enable row level security;
alter table public.wishes enable row level security;
alter table public.wish_images enable row level security;
alter table public.wish_status_transitions enable row level security;
alter table public.wish_status_history enable row level security;
alter table public.fulfilment_offers enable row level security;
alter table public.offer_status_transitions enable row level security;
alter table public.offer_messages enable row level security;
alter table public.contributions enable row level security;
alter table public.refunds enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.support_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table private.rate_limits enable row level security;

-- Start from zero: Supabase grants broad table privileges by default.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
-- RLS policies below call these helpers with the caller's privileges.
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.owns_wish(uuid) to authenticated;

-- profiles: own row (+ admins). Username/bio editable by the owner only.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant select on public.profiles to authenticated;
grant update (username, bio) on public.profiles to authenticated;

-- accounts: read own (+ admins); nobody writes directly.
create policy accounts_select_own on public.accounts
  for select to authenticated using (id = (select auth.uid()) or (select private.is_admin()));
grant select on public.accounts to authenticated;

-- user_settings: own only.
create policy user_settings_select_own on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy user_settings_update_own on public.user_settings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select on public.user_settings to authenticated;
grant update (anonymous_giving_default, anonymous_wishing_default, email_notifications) on public.user_settings to authenticated;

-- categories: active ones are public; admins see all. Writes via admin RPC.
create policy categories_select on public.categories
  for select to anon, authenticated using (is_active or (select private.is_admin()));
grant select on public.categories to anon, authenticated;

-- transition tables are public reference data.
create policy wish_transitions_select on public.wish_status_transitions for select to anon, authenticated using (true);
create policy offer_transitions_select on public.offer_status_transitions for select to anon, authenticated using (true);
grant select on public.wish_status_transitions, public.offer_status_transitions to anon, authenticated;

-- wishes: owner and admins only. The public reads public_wishes instead.
create policy wishes_select_owner on public.wishes
  for select to authenticated using (owner_id = (select auth.uid()) or (select private.is_admin()));
grant select on public.wishes to authenticated;

create policy wish_images_select_owner on public.wish_images
  for select to authenticated using ((select private.owns_wish(wish_id)) or (select private.is_admin()));
grant select on public.wish_images to authenticated;

create policy wish_history_select_owner on public.wish_status_history
  for select to authenticated using ((select private.owns_wish(wish_id)) or (select private.is_admin()));
grant select (id, wish_id, from_status, to_status, actor_role, note, created_at) on public.wish_status_history to authenticated;

-- offers: the giver sees their own rows; wishers use get_wish_offers(); admins see all.
create policy offers_select_giver on public.fulfilment_offers
  for select to authenticated using (giver_id = (select auth.uid()) or (select private.is_admin()));
grant select on public.fulfilment_offers to authenticated;

-- offer messages: admins only directly; participants use get_offer_thread().
create policy offer_messages_select_admin on public.offer_messages
  for select to authenticated using ((select private.is_admin()));
grant select on public.offer_messages to authenticated;

-- contributions: contributor and admins; wishers use get_wish_contributions().
create policy contributions_select_own on public.contributions
  for select to authenticated using (contributor_id = (select auth.uid()) or (select private.is_admin()));
grant select (id, wish_id, contributor_id, amount_minor, currency, is_anonymous, message, mode, status, created_at, updated_at)
  on public.contributions to authenticated;

create policy refunds_select_admin on public.refunds
  for select to authenticated using ((select private.is_admin()));
grant select on public.refunds to authenticated;

-- notifications: own rows; may only flip read_at.
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy reports_select_own on public.reports
  for select to authenticated using (reporter_id = (select auth.uid()) or (select private.is_admin()));
grant select on public.reports to authenticated;

create policy support_select_own on public.support_requests
  for select to authenticated using (user_id = (select auth.uid()) or (select private.is_admin()));
grant select on public.support_requests to authenticated;

create policy audit_select_admin on public.audit_logs
  for select to authenticated using ((select private.is_admin()));
grant select on public.audit_logs to authenticated;

-- ---------------------------------------------------------------------------
-- Public views
-- These run with the view owner's rights (bypassing RLS) on purpose: they are
-- the only public window onto wishes and expose a fixed, safe column list.
-- Never add owner_id, giver_id, contributor_id or provider references here.
-- ---------------------------------------------------------------------------
create view public.public_wishes with (security_barrier = true) as
select
  w.id,
  w.title,
  w.description,
  w.additional_info,
  w.wish_type,
  w.fulfilment_method,
  w.country_code,
  w.currency,
  w.estimated_cost_minor,
  w.target_amount_minor,
  w.status,
  w.is_featured,
  w.published_at,
  w.fulfilled_at,
  w.search,
  c.slug as category_slug,
  c.name as category_name,
  c.icon as category_icon,
  case when w.wisher_identity = 'anonymous' then null else p.username end as wisher_username,
  coalesce(t.total_minor, 0)::bigint as test_pledged_minor,
  coalesce(t.contribution_count, 0)::integer as contribution_count,
  case when w.target_amount_minor is null then null
       else least(100, floor(coalesce(t.total_minor, 0) * 100.0 / w.target_amount_minor))::integer end as progress_percent,
  img.storage_path as cover_image_path
from public.wishes w
join public.categories c on c.id = w.category_id
join public.profiles p on p.id = w.owner_id
left join lateral (
  select sum(ct.amount_minor) as total_minor, count(*) as contribution_count
  from public.contributions ct
  where ct.wish_id = w.id and ct.status = 'succeeded'
) t on true
left join lateral (
  select i.storage_path from public.wish_images i
  where i.wish_id = w.id order by i.sort_order, i.created_at limit 1
) img on true
where w.status in ('active', 'fulfilment_pending')
   or (w.status = 'fulfilled' and w.show_when_fulfilled);

comment on view public.public_wishes is
  'Public listing. Only active, fulfilment-pending and consented fulfilled wishes. No account identifiers.';

create view public.public_wish_images with (security_barrier = true) as
select i.id, i.wish_id, i.storage_path, i.alt_text, i.sort_order, i.width, i.height
from public.wish_images i
where private.wish_is_public(i.wish_id);

-- Supporters shown on a public wish page. Anonymous supporters stay anonymous.
create view public.public_wish_supporters with (security_barrier = true) as
select
  ct.id,
  ct.wish_id,
  case when ct.is_anonymous then null else p.username end as supporter_username,
  ct.created_at
from public.contributions ct
left join public.profiles p on p.id = ct.contributor_id
where ct.status = 'succeeded' and private.wish_is_public(ct.wish_id);

grant select on public.public_wishes, public.public_wish_images, public.public_wish_supporters to anon, authenticated;
grant execute on function private.wish_is_public(uuid) to anon, authenticated;
