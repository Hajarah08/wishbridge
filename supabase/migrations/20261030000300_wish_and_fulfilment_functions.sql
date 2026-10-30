-- WishBridge user-facing operations.
-- Every function: SECURITY DEFINER, empty search_path, authorises the caller,
-- validates input, enforces the status machine and runs in one transaction.

-- ---------------------------------------------------------------------------
-- Validation helper shared by create/update
-- ---------------------------------------------------------------------------
create or replace function private.validate_wish_input(
  p_title text, p_description text, p_category_slug text, p_wish_type public.wish_type,
  p_fulfilment_method public.fulfilment_method, p_country_code text, p_currency text,
  p_estimated_cost_minor bigint, p_target_amount_minor bigint
)
returns smallint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_category_id smallint;
begin
  if p_title is null or char_length(btrim(p_title)) not between 5 and 120 then
    raise exception 'Title must be between 5 and 120 characters.' using errcode = '22023';
  end if;
  if p_description is null or char_length(btrim(p_description)) not between 20 and 5000 then
    raise exception 'Description must be between 20 and 5000 characters.' using errcode = '22023';
  end if;
  if p_wish_type is null or p_fulfilment_method is null then
    raise exception 'Wish type and fulfilment method are required.' using errcode = '22023';
  end if;
  if p_country_code is null or p_country_code !~ '^[A-Z]{2}$' then
    raise exception 'Please choose a country.' using errcode = '22023';
  end if;
  select id into v_category_id from public.categories where slug = p_category_slug and is_active;
  if v_category_id is null then
    raise exception 'Please choose a valid category.' using errcode = '22023';
  end if;
  if (p_estimated_cost_minor is not null or p_target_amount_minor is not null)
     and (p_currency is null or p_currency !~ '^[A-Z]{3}$') then
    raise exception 'Please choose a currency for the amount.' using errcode = '22023';
  end if;
  if p_fulfilment_method = 'monetary_contribution' and p_target_amount_minor is null then
    raise exception 'Contribution wishes need a target amount.' using errcode = '22023';
  end if;
  if p_target_amount_minor is not null and p_target_amount_minor not between 100 and 100000000 then
    raise exception 'Target amount must be between 1 and 1,000,000.' using errcode = '22023';
  end if;
  if p_estimated_cost_minor is not null and p_estimated_cost_minor not between 1 and 100000000 then
    raise exception 'Estimated cost must be between 0.01 and 1,000,000.' using errcode = '22023';
  end if;
  return v_category_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Wish lifecycle
-- ---------------------------------------------------------------------------
create or replace function public.create_wish(
  p_title text,
  p_description text,
  p_category_slug text,
  p_wish_type public.wish_type,
  p_fulfilment_method public.fulfilment_method,
  p_country_code text,
  p_currency text default null,
  p_estimated_cost_minor bigint default null,
  p_target_amount_minor bigint default null,
  p_additional_info text default null,
  p_wisher_identity public.wisher_identity default 'username',
  p_show_when_fulfilled boolean default false,
  p_submit boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_active_user();
  v_category_id smallint;
  v_id uuid;
begin
  perform private.check_rate_limit('create_wish', v_uid::text, 10, 3600);
  v_category_id := private.validate_wish_input(p_title, p_description, p_category_slug, p_wish_type,
    p_fulfilment_method, p_country_code, p_currency, p_estimated_cost_minor, p_target_amount_minor);

  insert into public.wishes (
    owner_id, title, description, additional_info, category_id, wish_type, fulfilment_method,
    country_code, currency, estimated_cost_minor, target_amount_minor, wisher_identity, show_when_fulfilled
  ) values (
    v_uid, btrim(p_title), btrim(p_description), nullif(btrim(p_additional_info), ''), v_category_id,
    p_wish_type, p_fulfilment_method, p_country_code, p_currency, p_estimated_cost_minor,
    p_target_amount_minor, coalesce(p_wisher_identity, 'username'), coalesce(p_show_when_fulfilled, false)
  ) returning id into v_id;

  insert into public.wish_status_history (wish_id, from_status, to_status, actor_id, actor_role)
  values (v_id, null, 'draft', v_uid, 'owner');

  if p_submit then
    perform public.submit_wish(v_id);
  end if;
  return v_id;
end;
$$;

create or replace function public.update_wish(
  p_wish_id uuid,
  p_title text,
  p_description text,
  p_category_slug text,
  p_wish_type public.wish_type,
  p_fulfilment_method public.fulfilment_method,
  p_country_code text,
  p_currency text default null,
  p_estimated_cost_minor bigint default null,
  p_target_amount_minor bigint default null,
  p_additional_info text default null,
  p_wisher_identity public.wisher_identity default 'username',
  p_show_when_fulfilled boolean default false,
  p_submit boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_active_user();
  v_wish public.wishes;
  v_category_id smallint;
begin
  select * into v_wish from public.wishes where id = p_wish_id for update;
  if v_wish.id is null or v_wish.owner_id <> v_uid then
    raise exception 'Wish not found.' using errcode = 'P0002';
  end if;
  if v_wish.status not in ('draft', 'changes_requested', 'pending_review', 'active') then
    raise exception 'This wish can no longer be edited.' using errcode = '55000';
  end if;
  if v_wish.status = 'active' and (
    exists (select 1 from public.fulfilment_offers where wish_id = p_wish_id and status not in ('declined', 'cancelled'))
    or exists (select 1 from public.contributions where wish_id = p_wish_id and status in ('pending', 'succeeded'))
  ) then
    raise exception 'A wish with offers or contributions cannot be edited. Withdraw it or contact support.' using errcode = '55000';
  end if;

  v_category_id := private.validate_wish_input(p_title, p_description, p_category_slug, p_wish_type,
    p_fulfilment_method, p_country_code, p_currency, p_estimated_cost_minor, p_target_amount_minor);

  update public.wishes set
    title = btrim(p_title),
    description = btrim(p_description),
    additional_info = nullif(btrim(p_additional_info), ''),
    category_id = v_category_id,
    wish_type = p_wish_type,
    fulfilment_method = p_fulfilment_method,
    country_code = p_country_code,
    currency = p_currency,
    estimated_cost_minor = p_estimated_cost_minor,
    target_amount_minor = p_target_amount_minor,
    wisher_identity = coalesce(p_wisher_identity, 'username'),
    show_when_fulfilled = coalesce(p_show_when_fulfilled, false)
  where id = p_wish_id;

  -- Editing a live wish takes it back through moderation.
  if v_wish.status = 'active' then
    perform private.set_wish_status(p_wish_id, 'pending_review', 'owner', 'Edited after publication');
    perform private.notify(v_uid, 'wish_submitted', 'Your edited wish is back in review',
      'Changes to "' || btrim(p_title) || '" need a quick review before the wish is visible again.',
      '/dashboard/wishes/' || p_wish_id);
  elsif p_submit and v_wish.status in ('draft', 'changes_requested') then
    perform public.submit_wish(p_wish_id);
  end if;
end;
$$;

create or replace function public.submit_wish(p_wish_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_active_user();
  v_wish public.wishes;
begin
  select * into v_wish from public.wishes where id = p_wish_id for update;
  if v_wish.id is null or v_wish.owner_id <> v_uid then
    raise exception 'Wish not found.' using errcode = 'P0002';
  end if;
  if v_wish.status = 'pending_review' then
    return; -- idempotent
  end if;
  perform private.set_wish_status(p_wish_id, 'pending_review', 'owner');
  update public.wishes set moderation_note = null where id = p_wish_id;
  perform private.notify(v_uid, 'wish_submitted', 'Wish submitted for review',
    '"' || v_wish.title || '" is in the review queue. We will let you know once a moderator has looked at it.',
    '/dashboard/wishes/' || p_wish_id);
end;
$$;

create or replace function public.publish_wish(p_wish_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_active_user();
  v_wish public.wishes;
begin
  select * into v_wish from public.wishes where id = p_wish_id for update;
  if v_wish.id is null or v_wish.owner_id <> v_uid then
    raise exception 'Wish not found.' using errcode = 'P0002';
  end if;
  if v_wish.status = 'active' then
    return;
  end if;
  perform private.set_wish_status(p_wish_id, 'active', 'owner');
end;
$$;

-- Cancels open commitments when a wish leaves circulation. Givers are told
-- the wish is closed without revealing why beyond the given reason.
create or replace function private.close_open_offers(p_wish_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offer record;
  v_title text;
begin
  select title into v_title from public.wishes where id = p_wish_id;
  for v_offer in
    select id, giver_id, status from public.fulfilment_offers
    where wish_id = p_wish_id and status in ('offered', 'accepted', 'in_progress', 'awaiting_confirmation', 'disputed')
    for update
  loop
    perform private.set_offer_status(v_offer.id, 'cancelled', 'system');
    perform private.notify(v_offer.giver_id, 'offer_cancelled', 'An offer you made was closed',
      'Your offer for "' || v_title || '" was closed: ' || p_reason, '/dashboard/offers/' || v_offer.id);
  end loop;
end;
$$;

-- Simulated refunds of test contributions when a wish is withdrawn or suspended.
create or replace function private.refund_test_contributions(p_wish_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c record;
  v_title text;
begin
  select title into v_title from public.wishes where id = p_wish_id;
  for v_c in
    select id, contributor_id, amount_minor, currency from public.contributions
    where wish_id = p_wish_id and status = 'succeeded' and mode = 'test'
    for update
  loop
    insert into public.refunds (contribution_id, amount_minor, currency, mode, status, reason, provider_reference, requested_by)
    values (v_c.id, v_c.amount_minor, v_c.currency, 'test', 'succeeded', p_reason,
            'sim_refund_' || replace(gen_random_uuid()::text, '-', ''), auth.uid());
    update public.contributions set status = 'refunded' where id = v_c.id;
    perform private.notify(v_c.contributor_id, 'contribution_refunded', 'Test contribution reversed',
      'Your TEST-MODE contribution to "' || v_title || '" was reversed (no real money was involved).',
      '/dashboard/giving');
  end loop;
end;
$$;

create or replace function public.withdraw_wish(p_wish_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user(); -- restricted users may still withdraw their own wishes
  v_wish public.wishes;
begin
  select * into v_wish from public.wishes where id = p_wish_id for update;
  if v_wish.id is null or v_wish.owner_id <> v_uid then
    raise exception 'Wish not found.' using errcode = 'P0002';
  end if;
  if v_wish.status = 'withdrawn' then
    return;
  end if;
  if exists (
    select 1 from public.fulfilment_offers
    where wish_id = p_wish_id and status in ('awaiting_confirmation', 'disputed')
  ) then
    raise exception 'A giver has reported delivery or a dispute is open. Please confirm or resolve it before withdrawing.'
      using errcode = '55000';
  end if;
  if p_reason is not null and char_length(p_reason) > 1000 then
    raise exception 'Reason is too long.' using errcode = '22023';
  end if;

  perform private.set_wish_status(p_wish_id, 'withdrawn', 'owner', p_reason);
  perform private.close_open_offers(p_wish_id, 'the wisher withdrew this wish.');
  perform private.refund_test_contributions(p_wish_id, 'Wish withdrawn by wisher');
end;
$$;

-- Wisher confirms a contribution-based wish has been fulfilled.
create or replace function public.confirm_wish_fulfilled(p_wish_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_wish public.wishes;
  v_c record;
begin
  select * into v_wish from public.wishes where id = p_wish_id for update;
  if v_wish.id is null or v_wish.owner_id <> v_uid then
    raise exception 'Wish not found.' using errcode = 'P0002';
  end if;
  if v_wish.fulfilment_method <> 'monetary_contribution' then
    raise exception 'Gift wishes are fulfilled by confirming a delivered offer.' using errcode = '55000';
  end if;
  if v_wish.status = 'fulfilled' then
    return;
  end if;
  perform private.set_wish_status(p_wish_id, 'fulfilled', 'owner', 'Wisher confirmed the goal was met');
  for v_c in select distinct contributor_id from public.contributions
             where wish_id = p_wish_id and status = 'succeeded' and contributor_id is not null loop
    perform private.notify(v_c.contributor_id, 'wish_fulfilled', 'A wish you supported was fulfilled',
      '"' || v_wish.title || '" has been marked as fulfilled. Thank you for your kindness.', '/dashboard/giving');
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Images (file bytes go to Storage; this records metadata)
-- ---------------------------------------------------------------------------
create or replace function public.add_wish_image(
  p_wish_id uuid, p_storage_path text, p_alt_text text default null, p_width integer default null, p_height integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_active_user();
  v_wish public.wishes;
  v_count integer;
  v_id uuid;
begin
  select * into v_wish from public.wishes where id = p_wish_id for update;
  if v_wish.id is null or v_wish.owner_id <> v_uid then
    raise exception 'Wish not found.' using errcode = 'P0002';
  end if;
  if v_wish.status not in ('draft', 'changes_requested', 'pending_review') then
    raise exception 'Images can only be changed before a wish is approved.' using errcode = '55000';
  end if;
  if split_part(p_storage_path, '/', 1) <> p_wish_id::text then
    raise exception 'Invalid image path.' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'wish-images' and name = p_storage_path) then
    raise exception 'Image upload not found.' using errcode = '22023';
  end if;
  select count(*) into v_count from public.wish_images where wish_id = p_wish_id;
  if v_count >= 4 then
    raise exception 'A wish can have up to 4 images.' using errcode = '22023';
  end if;
  insert into public.wish_images (wish_id, storage_path, alt_text, sort_order, width, height)
  values (p_wish_id, p_storage_path, nullif(left(btrim(p_alt_text), 200), ''), v_count, p_width, p_height)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.remove_wish_image(p_image_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_img public.wish_images;
  v_wish public.wishes;
begin
  select * into v_img from public.wish_images where id = p_image_id;
  select * into v_wish from public.wishes where id = v_img.wish_id for update;
  if v_img.id is null or v_wish.owner_id <> v_uid then
    raise exception 'Image not found.' using errcode = 'P0002';
  end if;
  if v_wish.status not in ('draft', 'changes_requested', 'pending_review') then
    raise exception 'Images can only be changed before a wish is approved.' using errcode = '55000';
  end if;
  delete from public.wish_images where id = p_image_id;
  return v_img.storage_path;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fulfilment offers
-- ---------------------------------------------------------------------------
create or replace function public.make_offer(
  p_wish_id uuid,
  p_idempotency_key uuid,
  p_message text default null,
  p_delivery_plan text default null,
  p_is_anonymous boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_active_user();
  v_wish public.wishes;
  v_existing uuid;
  v_id uuid;
begin
  if p_idempotency_key is null then
    raise exception 'Missing request key.' using errcode = '22023';
  end if;
  -- Replayed request: return the original result.
  select id into v_existing from public.fulfilment_offers where giver_id = v_uid and idempotency_key = p_idempotency_key;
  if v_existing is not null then
    return v_existing;
  end if;

  perform private.check_rate_limit('make_offer', v_uid::text, 20, 3600);

  select * into v_wish from public.wishes where id = p_wish_id for update;
  if v_wish.id is null or not private.wish_is_public(p_wish_id) then
    raise exception 'Wish not found.' using errcode = 'P0002';
  end if;
  if v_wish.owner_id = v_uid then
    raise exception 'You cannot offer to fulfil your own wish.' using errcode = '42501';
  end if;
  if v_wish.status <> 'active' then
    raise exception 'This wish is not accepting new offers right now.' using errcode = '55000';
  end if;
  if v_wish.fulfilment_method = 'monetary_contribution' then
    raise exception 'This wish accepts contributions rather than offers.' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.fulfilment_offers
    where wish_id = p_wish_id and giver_id = v_uid
      and status in ('offered', 'accepted', 'in_progress', 'awaiting_confirmation', 'disputed')
  ) then
    raise exception 'You already have an open offer for this wish.' using errcode = '23505';
  end if;
  if (p_message is not null and char_length(p_message) > 1000) or (p_delivery_plan is not null and char_length(p_delivery_plan) > 1000) then
    raise exception 'Message is too long.' using errcode = '22023';
  end if;

  insert into public.fulfilment_offers (wish_id, giver_id, is_anonymous, message, delivery_plan, idempotency_key)
  values (p_wish_id, v_uid, coalesce(p_is_anonymous, true), nullif(btrim(p_message), ''),
          nullif(btrim(p_delivery_plan), ''), p_idempotency_key)
  returning id into v_id;

  perform private.notify(v_wish.owner_id, 'offer_received', 'Someone offered to fulfil your wish',
    private.giver_label(v_uid, coalesce(p_is_anonymous, true)) || ' offered to fulfil "' || v_wish.title || '". Review the offer to accept or decline.',
    '/dashboard/wishes/' || p_wish_id);
  perform private.notify(v_uid, 'offer_received', 'Your offer was sent',
    'Your offer for "' || v_wish.title || '" was sent. The wisher can accept or decline it.',
    '/dashboard/offers/' || v_id);
  return v_id;
end;
$$;

create or replace function public.respond_to_offer(p_offer_id uuid, p_accept boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_active_user();
  v_offer public.fulfilment_offers;
  v_wish public.wishes;
begin
  select * into v_offer from public.fulfilment_offers where id = p_offer_id;
  if v_offer.id is null then
    raise exception 'Offer not found.' using errcode = 'P0002';
  end if;
  select * into v_wish from public.wishes where id = v_offer.wish_id for update;
  if v_wish.owner_id <> v_uid then
    raise exception 'Offer not found.' using errcode = 'P0002';
  end if;
  select * into v_offer from public.fulfilment_offers where id = p_offer_id for update;
  if p_note is not null and char_length(p_note) > 1000 then
    raise exception 'Note is too long.' using errcode = '22023';
  end if;

  if p_accept then
    if v_offer.status = 'accepted' then
      return; -- idempotent
    end if;
    if v_wish.status <> 'active' then
      raise exception 'This wish already has an accepted offer or is not active.' using errcode = '55000';
    end if;
    perform private.set_offer_status(p_offer_id, 'accepted', 'wisher');
    update public.fulfilment_offers set decision_note = nullif(btrim(p_note), '') where id = p_offer_id;
    perform private.set_wish_status(v_wish.id, 'fulfilment_pending', 'system', 'Offer accepted');
    perform private.notify(v_offer.giver_id, 'offer_accepted', 'Your offer was accepted',
      private.wisher_label(v_wish.id) || ' accepted your offer for "' || v_wish.title || '". Use the private offer page to coordinate safely.',
      '/dashboard/offers/' || p_offer_id);
  else
    if v_offer.status = 'declined' then
      return;
    end if;
    perform private.set_offer_status(p_offer_id, 'declined', 'wisher');
    update public.fulfilment_offers set decision_note = nullif(btrim(p_note), '') where id = p_offer_id;
    perform private.notify(v_offer.giver_id, 'offer_declined', 'Your offer was declined',
      'Your offer for "' || v_wish.title || '" was declined. Thank you for offering — there are many other wishes waiting.',
      '/dashboard/offers/' || p_offer_id);
  end if;
end;
$$;

-- Progress actions on an offer after acceptance.
--   giver:  start | mark_delivered | cancel | dispute
--   wisher: confirm_received | cancel | dispute
create or replace function public.offer_action(p_offer_id uuid, p_action text, p_note text default null)
returns public.offer_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_offer public.fulfilment_offers;
  v_wish public.wishes;
  v_role text;
  v_label text;
  v_new public.offer_status;
  v_other uuid;
  v_o record;
begin
  select * into v_offer from public.fulfilment_offers where id = p_offer_id;
  if v_offer.id is null then
    raise exception 'Offer not found.' using errcode = 'P0002';
  end if;
  select * into v_wish from public.wishes where id = v_offer.wish_id for update;
  select * into v_offer from public.fulfilment_offers where id = p_offer_id for update;

  if v_offer.giver_id = v_uid then
    v_role := 'giver';
    v_other := v_wish.owner_id;
    v_label := private.giver_label(v_offer.giver_id, v_offer.is_anonymous);
  elsif v_wish.owner_id = v_uid then
    v_role := 'wisher';
    v_other := v_offer.giver_id;
    v_label := private.wisher_label(v_wish.id);
  else
    raise exception 'Offer not found.' using errcode = 'P0002';
  end if;

  if p_note is not null and char_length(p_note) > 1000 then
    raise exception 'Note is too long.' using errcode = '22023';
  end if;

  v_new := case
    when p_action = 'start' and v_role = 'giver' then 'in_progress'
    when p_action = 'mark_delivered' and v_role = 'giver' then 'awaiting_confirmation'
    when p_action = 'confirm_received' and v_role = 'wisher' then 'completed'
    when p_action = 'cancel' then 'cancelled'
    when p_action = 'dispute' then 'disputed'
    else null end;
  if v_new is null then
    raise exception 'That action is not available to you.' using errcode = '42501';
  end if;
  if v_offer.status = v_new then
    return v_new; -- duplicate click
  end if;
  if p_action = 'dispute' and (p_note is null or char_length(btrim(p_note)) < 10) then
    raise exception 'Please describe the problem (at least 10 characters).' using errcode = '22023';
  end if;

  -- Record confirmations before the status change so the
  -- completion_needs_both constraint sees them.
  if v_new = 'awaiting_confirmation' then
    update public.fulfilment_offers set giver_confirmed_at = now() where id = p_offer_id;
  elsif v_new = 'completed' then
    update public.fulfilment_offers set wisher_confirmed_at = now() where id = p_offer_id;
  end if;

  perform private.set_offer_status(p_offer_id, v_new, v_role);

  if v_new = 'awaiting_confirmation' then
    perform private.notify(v_other, 'offer_delivered', 'Your gift is on its way — please confirm',
      v_label || ' reports that "' || v_wish.title || '" has been fulfilled. Confirm once you have received it, or open a dispute if something is wrong.',
      '/dashboard/wishes/' || v_wish.id);
  elsif v_new = 'in_progress' then
    perform private.notify(v_other, 'offer_in_progress', 'Fulfilment in progress',
      v_label || ' has started fulfilling "' || v_wish.title || '".', '/dashboard/wishes/' || v_wish.id);
  elsif v_new = 'completed' then
    perform private.set_wish_status(v_wish.id, 'fulfilled', 'system', 'Delivery confirmed by wisher');
    perform private.notify(v_other, 'offer_completed', 'Wish fulfilled — thank you!',
      'The wisher confirmed they received "' || v_wish.title || '". You made a wish come true.',
      '/dashboard/offers/' || p_offer_id);
    perform private.notify(v_wish.owner_id, 'wish_fulfilled', 'Your wish is fulfilled',
      '"' || v_wish.title || '" is now marked as fulfilled.', '/dashboard/wishes/' || v_wish.id);
    -- Close any other pending offers.
    for v_o in select id, giver_id from public.fulfilment_offers
               where wish_id = v_wish.id and status = 'offered' and id <> p_offer_id loop
      perform private.set_offer_status(v_o.id, 'cancelled', 'system');
      perform private.notify(v_o.giver_id, 'offer_cancelled', 'This wish has been fulfilled',
        '"' || v_wish.title || '" was fulfilled by someone else, so your offer was closed. Thank you for offering.',
        '/dashboard/offers/' || v_o.id);
    end loop;
  elsif v_new = 'cancelled' then
    update public.fulfilment_offers set decision_note = coalesce(nullif(btrim(p_note), ''), decision_note) where id = p_offer_id;
    -- Was this the committed offer? Then the wish reopens.
    if v_offer.status in ('accepted', 'in_progress') and v_wish.status = 'fulfilment_pending' then
      perform private.set_wish_status(v_wish.id, 'active', 'system', 'Accepted offer cancelled by ' || v_role);
    end if;
    perform private.notify(v_other, 'offer_cancelled', 'An offer was cancelled',
      'The offer for "' || v_wish.title || '" was cancelled by the ' || v_role || '.',
      case when v_role = 'giver' then '/dashboard/wishes/' || v_wish.id else '/dashboard/offers/' || p_offer_id end);
  elsif v_new = 'disputed' then
    update public.fulfilment_offers set dispute_reason = btrim(p_note), disputed_by = v_role where id = p_offer_id;
    perform private.notify(v_other, 'offer_disputed', 'A dispute was opened',
      'A dispute was opened on the offer for "' || v_wish.title || '". Our moderators will review it.',
      case when v_role = 'giver' then '/dashboard/wishes/' || v_wish.id else '/dashboard/offers/' || p_offer_id end);
    perform private.audit('offer.disputed', 'fulfilment_offer', p_offer_id::text,
      jsonb_build_object('wish_id', v_wish.id, 'by', v_role), 'user');
  end if;
  return v_new;
end;
$$;

create or replace function public.send_offer_message(p_offer_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_offer public.fulfilment_offers;
  v_wish public.wishes;
  v_role text;
  v_other uuid;
  v_id uuid;
begin
  select * into v_offer from public.fulfilment_offers where id = p_offer_id;
  select * into v_wish from public.wishes where id = v_offer.wish_id;
  if v_offer.id is null then
    raise exception 'Offer not found.' using errcode = 'P0002';
  end if;
  if v_offer.giver_id = v_uid then
    v_role := 'giver'; v_other := v_wish.owner_id;
  elsif v_wish.owner_id = v_uid then
    v_role := 'wisher'; v_other := v_offer.giver_id;
  elsif private.is_admin() then
    v_role := 'admin'; v_other := null;
  else
    raise exception 'Offer not found.' using errcode = 'P0002';
  end if;
  if v_offer.status not in ('accepted', 'in_progress', 'awaiting_confirmation', 'disputed') then
    raise exception 'Messages are available once an offer has been accepted.' using errcode = '55000';
  end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 2000 then
    raise exception 'Message must be between 1 and 2000 characters.' using errcode = '22023';
  end if;
  perform private.check_rate_limit('offer_message', v_uid::text, 60, 600);

  insert into public.offer_messages (offer_id, sender_id, sender_role, body)
  values (p_offer_id, v_uid, v_role, btrim(p_body)) returning id into v_id;

  if v_role = 'admin' then
    perform private.notify(v_offer.giver_id, 'offer_message', 'Message from a WishBridge moderator',
      'A moderator posted on the offer for "' || v_wish.title || '".', '/dashboard/offers/' || p_offer_id);
    perform private.notify(v_wish.owner_id, 'offer_message', 'Message from a WishBridge moderator',
      'A moderator posted on the offer for "' || v_wish.title || '".', '/dashboard/offers/' || p_offer_id);
  else
    perform private.notify(v_other, 'offer_message', 'New message about "' || left(v_wish.title, 80) || '"',
      'You have a new message from the ' || v_role || '.',
      case when v_role = 'giver' then '/dashboard/offers/' || p_offer_id else '/dashboard/offers/' || p_offer_id end);
  end if;
  return v_id;
end;
$$;

-- Offers on a wish, for its owner. Returns a display label instead of the giver's id.
create or replace function public.get_wish_offers(p_wish_id uuid)
returns table (
  id uuid, status public.offer_status, giver_display text, is_anonymous boolean, message text,
  delivery_plan text, decision_note text, giver_confirmed_at timestamptz, wisher_confirmed_at timestamptz,
  dispute_reason text, disputed_by text, resolution_note text, created_at timestamptz, decided_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  if not exists (select 1 from public.wishes w where w.id = p_wish_id and w.owner_id = v_uid) then
    raise exception 'Wish not found.' using errcode = 'P0002';
  end if;
  return query
    select o.id, o.status, private.giver_label(o.giver_id, o.is_anonymous), o.is_anonymous, o.message,
           o.delivery_plan, o.decision_note, o.giver_confirmed_at, o.wisher_confirmed_at,
           o.dispute_reason, o.disputed_by, o.resolution_note, o.created_at, o.decided_at
    from public.fulfilment_offers o
    where o.wish_id = p_wish_id
    order by o.created_at desc;
end;
$$;

-- Offer thread for either participant (or an admin). Never includes account ids.
create or replace function public.get_offer_thread(p_offer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_offer public.fulfilment_offers;
  v_wish public.wishes;
  v_role text;
begin
  select * into v_offer from public.fulfilment_offers where id = p_offer_id;
  select * into v_wish from public.wishes where id = v_offer.wish_id;
  if v_offer.id is null then
    raise exception 'Offer not found.' using errcode = 'P0002';
  end if;
  v_role := case
    when v_offer.giver_id = v_uid then 'giver'
    when v_wish.owner_id = v_uid then 'wisher'
    when private.is_admin() then 'admin'
    else null end;
  if v_role is null then
    raise exception 'Offer not found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'viewer_role', v_role,
    'offer', jsonb_build_object(
      'id', v_offer.id, 'status', v_offer.status, 'is_anonymous', v_offer.is_anonymous,
      'giver_display', private.giver_label(v_offer.giver_id, v_offer.is_anonymous),
      'message', v_offer.message, 'delivery_plan', v_offer.delivery_plan, 'decision_note', v_offer.decision_note,
      'giver_confirmed_at', v_offer.giver_confirmed_at, 'wisher_confirmed_at', v_offer.wisher_confirmed_at,
      'dispute_reason', v_offer.dispute_reason, 'disputed_by', v_offer.disputed_by,
      'resolution_note', v_offer.resolution_note, 'created_at', v_offer.created_at, 'decided_at', v_offer.decided_at
    ),
    'wish', jsonb_build_object(
      'id', v_wish.id, 'title', v_wish.title, 'status', v_wish.status,
      'fulfilment_method', v_wish.fulfilment_method, 'wish_type', v_wish.wish_type,
      'country_code', v_wish.country_code, 'wisher_display', private.wisher_label(v_wish.id)
    ),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'sender_role', m.sender_role, 'body', m.body, 'created_at', m.created_at,
        'is_mine', m.sender_id = v_uid
      ) order by m.created_at)
      from public.offer_messages m where m.offer_id = p_offer_id
    ), '[]'::jsonb)
  );
end;
$$;

-- Everything the caller has given or offered, with wisher anonymity respected.
create or replace function public.get_my_giving()
returns table (
  kind text, id uuid, wish_id uuid, wish_title text, wish_status public.wish_status, wisher_display text,
  status text, is_anonymous boolean, amount_minor bigint, currency text, mode public.payment_mode, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  return query
    select 'offer'::text, o.id, w.id, w.title, w.status, private.wisher_label(w.id), o.status::text,
           o.is_anonymous, null::bigint, null::text, null::public.payment_mode, o.created_at
    from public.fulfilment_offers o join public.wishes w on w.id = o.wish_id
    where o.giver_id = v_uid
    union all
    select 'contribution'::text, c.id, w.id, w.title, w.status, private.wisher_label(w.id), c.status::text,
           c.is_anonymous, c.amount_minor, c.currency::text, c.mode, c.created_at
    from public.contributions c join public.wishes w on w.id = c.wish_id
    where c.contributor_id = v_uid
    order by 12 desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Contributions (TEST MODE). Two steps so that, once a real provider exists,
-- only the server (service role, after provider confirmation or webhook) can
-- mark a contribution as succeeded.
-- ---------------------------------------------------------------------------
create or replace function public.create_contribution_intent(
  p_wish_id uuid, p_amount_minor bigint, p_idempotency_key uuid,
  p_is_anonymous boolean default true, p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_active_user();
  v_wish public.wishes;
  v_existing uuid;
  v_total bigint;
  v_id uuid;
begin
  if p_idempotency_key is null then
    raise exception 'Missing request key.' using errcode = '22023';
  end if;
  select id into v_existing from public.contributions where contributor_id = v_uid and idempotency_key = p_idempotency_key;
  if v_existing is not null then
    return v_existing;
  end if;
  perform private.check_rate_limit('contribution', v_uid::text, 30, 3600);

  select * into v_wish from public.wishes where id = p_wish_id for update;
  if v_wish.id is null or not private.wish_is_public(p_wish_id) then
    raise exception 'Wish not found.' using errcode = 'P0002';
  end if;
  if v_wish.owner_id = v_uid then
    raise exception 'You cannot contribute to your own wish.' using errcode = '42501';
  end if;
  if v_wish.fulfilment_method <> 'monetary_contribution' or v_wish.status <> 'active' then
    raise exception 'This wish is not accepting contributions right now.' using errcode = '55000';
  end if;
  if p_amount_minor is null or p_amount_minor not between 100 and 100000000 then
    raise exception 'Amount must be between 1 and 1,000,000.' using errcode = '22023';
  end if;
  select coalesce(sum(amount_minor), 0) into v_total from public.contributions
  where wish_id = p_wish_id and status in ('pending', 'succeeded');
  if v_total + p_amount_minor > v_wish.target_amount_minor then
    raise exception 'That amount is more than this wish still needs.' using errcode = '22023';
  end if;
  if p_message is not null and char_length(p_message) > 500 then
    raise exception 'Message is too long.' using errcode = '22023';
  end if;

  insert into public.contributions (wish_id, contributor_id, amount_minor, currency, is_anonymous, message, idempotency_key)
  values (p_wish_id, v_uid, p_amount_minor, v_wish.currency, coalesce(p_is_anonymous, true),
          nullif(btrim(p_message), ''), p_idempotency_key)
  returning id into v_id;
  return v_id;
end;
$$;

-- Server-only (service role). Records the provider outcome for a contribution.
create or replace function public.record_contribution_result(
  p_contribution_id uuid, p_succeeded boolean, p_provider_reference text
)
returns public.contribution_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.contributions;
  v_wish public.wishes;
  v_total bigint;
begin
  select * into v_c from public.contributions where id = p_contribution_id for update;
  if v_c.id is null then
    raise exception 'Contribution not found.' using errcode = 'P0002';
  end if;
  if v_c.status <> 'pending' then
    return v_c.status; -- duplicate webhook / retry
  end if;
  select * into v_wish from public.wishes where id = v_c.wish_id for update;

  update public.contributions
  set status = case when p_succeeded then 'succeeded'::public.contribution_status else 'failed'::public.contribution_status end,
      provider_reference = p_provider_reference
  where id = p_contribution_id;

  if p_succeeded then
    perform private.notify(v_wish.owner_id, 'contribution_received', 'New TEST-MODE contribution',
      private.giver_label(v_c.contributor_id, v_c.is_anonymous) || ' made a simulated contribution to "' || v_wish.title || '". No real money was transferred.',
      '/dashboard/wishes/' || v_wish.id);
    select coalesce(sum(amount_minor), 0) into v_total from public.contributions
    where wish_id = v_wish.id and status = 'succeeded';
    if v_total >= v_wish.target_amount_minor and v_wish.status = 'active' then
      perform private.set_wish_status(v_wish.id, 'fulfilment_pending', 'system', 'Test-mode target reached');
      perform private.notify(v_wish.owner_id, 'target_reached', 'Your target was reached (test mode)',
        '"' || v_wish.title || '" reached its target in test mode. Confirm on your dashboard when the wish is fulfilled.',
        '/dashboard/wishes/' || v_wish.id);
    end if;
    return 'succeeded';
  end if;
  return 'failed';
end;
$$;

-- Contributions to a wish, for its owner, without contributor ids.
create or replace function public.get_wish_contributions(p_wish_id uuid)
returns table (
  id uuid, amount_minor bigint, currency text, status public.contribution_status, mode public.payment_mode,
  supporter_display text, message text, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  if not exists (select 1 from public.wishes w where w.id = p_wish_id and w.owner_id = v_uid) then
    raise exception 'Wish not found.' using errcode = 'P0002';
  end if;
  return query
    select c.id, c.amount_minor, c.currency::text, c.status, c.mode,
           private.giver_label(c.contributor_id, c.is_anonymous), c.message, c.created_at
    from public.contributions c
    where c.wish_id = p_wish_id and c.status <> 'pending'
    order by c.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reports and support
-- ---------------------------------------------------------------------------
create or replace function public.report_wish(p_wish_id uuid, p_reason public.report_reason, p_details text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_id uuid;
begin
  perform private.check_rate_limit('report', v_uid::text, 10, 3600);
  if not private.wish_is_public(p_wish_id) and not private.owns_wish(p_wish_id) then
    raise exception 'Wish not found.' using errcode = 'P0002';
  end if;
  if p_details is not null and char_length(p_details) > 2000 then
    raise exception 'Details are too long.' using errcode = '22023';
  end if;
  select id into v_id from public.reports
  where wish_id = p_wish_id and reporter_id = v_uid and status in ('open', 'investigating');
  if v_id is not null then
    return v_id; -- already reported; don't create duplicates
  end if;
  insert into public.reports (wish_id, reporter_id, reason, details)
  values (p_wish_id, v_uid, p_reason, nullif(btrim(p_details), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.submit_support_request(p_contact_email text, p_subject text, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  perform private.check_rate_limit('support', coalesce(v_uid::text, 'email:' || lower(coalesce(p_contact_email, ''))), 5, 3600);
  perform private.check_rate_limit('support_global_anon', case when v_uid is null then 'anon' else v_uid::text end,
    case when v_uid is null then 200 else 1000 end, 3600);
  if p_contact_email is null or p_contact_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(p_contact_email) > 254 then
    raise exception 'Please enter a valid email address.' using errcode = '22023';
  end if;
  if p_subject is null or char_length(btrim(p_subject)) not between 3 and 150 then
    raise exception 'Subject must be between 3 and 150 characters.' using errcode = '22023';
  end if;
  if p_message is null or char_length(btrim(p_message)) not between 10 and 5000 then
    raise exception 'Message must be between 10 and 5000 characters.' using errcode = '22023';
  end if;
  insert into public.support_requests (user_id, contact_email, subject, message)
  values (v_uid, btrim(p_contact_email), btrim(p_subject), btrim(p_message))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_username ~ '^[A-Za-z0-9_]{3,24}$'
     and not exists (select 1 from public.profiles where lower(username) = lower(p_username));
$$;

-- Lightweight public numbers for the homepage.
create or replace function public.public_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'open_wishes', (select count(*) from public.wishes where status = 'active'),
    'fulfilled_wishes', (select count(*) from public.wishes where status = 'fulfilled'),
    'countries', (select count(distinct country_code) from public.wishes where status in ('active', 'fulfilment_pending', 'fulfilled'))
  );
$$;
