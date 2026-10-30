-- WishBridge administration. Every function calls private.require_admin(),
-- which checks accounts.role server-side. Every state change is audited.

create or replace function public.admin_moderate_wish(p_wish_id uuid, p_action text, p_note text default null)
returns public.wish_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_wish public.wishes;
  v_to public.wish_status;
begin
  select * into v_wish from public.wishes where id = p_wish_id for update;
  if v_wish.id is null then
    raise exception 'Wish not found.' using errcode = 'P0002';
  end if;
  if p_note is not null and char_length(p_note) > 2000 then
    raise exception 'Note is too long.' using errcode = '22023';
  end if;
  if p_action in ('request_changes', 'reject', 'suspend') and (p_note is null or char_length(btrim(p_note)) < 5) then
    raise exception 'Please give the wisher a short reason.' using errcode = '22023';
  end if;

  v_to := case p_action
    when 'approve' then case when v_wish.publish_on_approval then 'active' else 'approved' end
    when 'request_changes' then 'changes_requested'
    when 'reject' then 'rejected'
    when 'suspend' then 'suspended'
    when 'reinstate' then case when v_wish.status_before_suspension = 'fulfilled' then 'fulfilled' else 'active' end
    else null end::public.wish_status;
  if v_to is null then
    raise exception 'Unknown moderation action.' using errcode = '22023';
  end if;
  if p_action = 'reinstate' and v_wish.status <> 'suspended' then
    raise exception 'Only suspended wishes can be reinstated.' using errcode = '55000';
  end if;

  perform private.set_wish_status(p_wish_id, v_to, 'admin', p_note);
  update public.wishes set moderation_note = nullif(btrim(p_note), '') where id = p_wish_id;

  if p_action = 'suspend' then
    perform private.close_open_offers(p_wish_id, 'the wish was paused by our moderation team.');
    perform private.refund_test_contributions(p_wish_id, 'Wish suspended by moderation');
  end if;

  perform private.notify(v_wish.owner_id,
    case p_action
      when 'approve' then 'wish_approved'
      when 'request_changes' then 'wish_changes_requested'
      when 'reject' then 'wish_rejected'
      when 'suspend' then 'wish_suspended'
      else 'wish_reinstated' end::public.notification_type,
    case p_action
      when 'approve' then 'Your wish was approved'
      when 'request_changes' then 'Changes requested for your wish'
      when 'reject' then 'Your wish was not approved'
      when 'suspend' then 'Your wish has been paused'
      else 'Your wish is visible again' end,
    case p_action
      when 'approve' then '"' || v_wish.title || '" was approved' ||
        case when v_to = 'active' then ' and is now live for others to see.' else '. Publish it from your dashboard when you are ready.' end
      when 'request_changes' then 'A moderator asked for changes to "' || v_wish.title || '": ' || btrim(p_note)
      when 'reject' then '"' || v_wish.title || '" could not be approved: ' || btrim(p_note)
      when 'suspend' then '"' || v_wish.title || '" was paused by moderation: ' || btrim(p_note)
      else '"' || v_wish.title || '" has been reinstated.' end,
    '/dashboard/wishes/' || p_wish_id);

  perform private.audit('wish.' || p_action, 'wish', p_wish_id::text,
    jsonb_build_object('from', v_wish.status, 'to', v_to, 'note', p_note), 'admin');
  return v_to;
end;
$$;

create or replace function public.admin_set_featured(p_wish_id uuid, p_featured boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
begin
  update public.wishes set is_featured = coalesce(p_featured, false) where id = p_wish_id;
  if not found then
    raise exception 'Wish not found.' using errcode = 'P0002';
  end if;
  perform private.audit(case when p_featured then 'wish.feature' else 'wish.unfeature' end, 'wish', p_wish_id::text, '{}'::jsonb, 'admin');
end;
$$;

create or replace function public.admin_set_account_status(p_user_id uuid, p_status public.account_status, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_old public.accounts;
  v_w record;
  v_o record;
begin
  if p_user_id = v_admin then
    raise exception 'You cannot change your own account status.' using errcode = '42501';
  end if;
  select * into v_old from public.accounts where id = p_user_id for update;
  if v_old.id is null then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;
  if p_status <> 'active' and (p_reason is null or char_length(btrim(p_reason)) < 5) then
    raise exception 'Please record a reason.' using errcode = '22023';
  end if;
  if p_reason is not null and char_length(p_reason) > 500 then
    raise exception 'Reason is too long.' using errcode = '22023';
  end if;

  update public.accounts
  set status = p_status, status_reason = nullif(btrim(p_reason), ''), status_changed_at = now()
  where id = p_user_id;

  if p_status = 'suspended' then
    -- Take their public wishes out of circulation.
    for v_w in select id from public.wishes where owner_id = p_user_id and status in ('approved', 'active', 'fulfilment_pending') loop
      perform private.close_open_offers(v_w.id, 'the wish is no longer available.');
      perform private.refund_test_contributions(v_w.id, 'Wisher account suspended');
      perform private.set_wish_status(v_w.id, 'suspended', 'system', 'Account suspended');
    end loop;
    -- Withdraw their outstanding offers.
    for v_o in select o.id, o.status, o.wish_id, w.owner_id, w.title, w.status as wish_status
               from public.fulfilment_offers o join public.wishes w on w.id = o.wish_id
               where o.giver_id = p_user_id and o.status in ('offered', 'accepted', 'in_progress') loop
      perform private.set_offer_status(v_o.id, 'cancelled', 'system');
      if v_o.status in ('accepted', 'in_progress') and v_o.wish_status = 'fulfilment_pending' then
        perform private.set_wish_status(v_o.wish_id, 'active', 'system', 'Giver account suspended');
      end if;
      perform private.notify(v_o.owner_id, 'offer_cancelled', 'An offer was withdrawn',
        'An offer on "' || v_o.title || '" is no longer available.', '/dashboard/wishes/' || v_o.wish_id);
    end loop;
  end if;

  perform private.notify(p_user_id, 'account_action',
    case p_status when 'active' then 'Your account is in good standing' else 'Your account has been ' || p_status::text end,
    case p_status when 'active' then 'Your account restrictions have been lifted.'
      else 'Reason: ' || btrim(p_reason) || '. Contact support if you believe this is a mistake.' end,
    '/dashboard/settings');
  perform private.audit('account.' || p_status::text, 'account', p_user_id::text,
    jsonb_build_object('from', v_old.status, 'to', p_status, 'reason', p_reason), 'admin');
end;
$$;

create or replace function public.admin_update_report(p_report_id uuid, p_status public.report_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_report public.reports;
begin
  select * into v_report from public.reports where id = p_report_id for update;
  if v_report.id is null then
    raise exception 'Report not found.' using errcode = 'P0002';
  end if;
  if p_note is not null and char_length(p_note) > 2000 then
    raise exception 'Note is too long.' using errcode = '22023';
  end if;
  update public.reports set
    status = p_status,
    resolution_note = coalesce(nullif(btrim(p_note), ''), resolution_note),
    handled_by = v_admin,
    resolved_at = case when p_status in ('resolved', 'dismissed') then now() else null end
  where id = p_report_id;

  if p_status in ('resolved', 'dismissed') and v_report.status not in ('resolved', 'dismissed') then
    perform private.notify(v_report.reporter_id, 'report_update', 'Update on your report',
      'Thank you for your report. Our moderation team has reviewed it and closed it.', null);
  end if;
  perform private.audit('report.' || p_status::text, 'report', p_report_id::text,
    jsonb_build_object('wish_id', v_report.wish_id, 'from', v_report.status, 'note', p_note), 'admin');
end;
$$;

create or replace function public.admin_resolve_dispute(p_offer_id uuid, p_outcome text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_offer public.fulfilment_offers;
  v_wish public.wishes;
begin
  select * into v_offer from public.fulfilment_offers where id = p_offer_id;
  if v_offer.id is null then
    raise exception 'Offer not found.' using errcode = 'P0002';
  end if;
  select * into v_wish from public.wishes where id = v_offer.wish_id for update;
  select * into v_offer from public.fulfilment_offers where id = p_offer_id for update;
  if v_offer.status <> 'disputed' then
    raise exception 'Only disputed offers can be resolved.' using errcode = '55000';
  end if;
  if p_outcome not in ('completed', 'cancelled') then
    raise exception 'Outcome must be completed or cancelled.' using errcode = '22023';
  end if;
  if p_note is null or char_length(btrim(p_note)) < 5 or char_length(p_note) > 2000 then
    raise exception 'Please record a resolution note (5-2000 characters).' using errcode = '22023';
  end if;

  update public.fulfilment_offers set resolved_by = v_admin, resolution_note = btrim(p_note) where id = p_offer_id;
  perform private.set_offer_status(p_offer_id, p_outcome::public.offer_status, 'admin');

  if p_outcome = 'completed' and v_wish.status = 'fulfilment_pending' then
    perform private.set_wish_status(v_wish.id, 'fulfilled', 'system', 'Dispute resolved as completed');
  elsif p_outcome = 'cancelled' and v_wish.status = 'fulfilment_pending' then
    perform private.set_wish_status(v_wish.id, 'active', 'system', 'Dispute resolved as cancelled');
  end if;

  perform private.notify(v_offer.giver_id, 'dispute_resolved', 'Dispute resolved',
    'The dispute on "' || v_wish.title || '" was resolved: ' || btrim(p_note), '/dashboard/offers/' || p_offer_id);
  perform private.notify(v_wish.owner_id, 'dispute_resolved', 'Dispute resolved',
    'The dispute on "' || v_wish.title || '" was resolved: ' || btrim(p_note), '/dashboard/offers/' || p_offer_id);
  perform private.audit('offer.dispute_' || p_outcome, 'fulfilment_offer', p_offer_id::text,
    jsonb_build_object('wish_id', v_wish.id, 'note', p_note), 'admin');
end;
$$;

create or replace function public.admin_upsert_category(
  p_id smallint, p_slug text, p_name text, p_description text, p_icon text, p_is_active boolean, p_sort_order integer
)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_id smallint;
begin
  if p_id is null then
    insert into public.categories (slug, name, description, icon, is_active, sort_order)
    values (p_slug, btrim(p_name), nullif(btrim(p_description), ''), nullif(btrim(p_icon), ''), coalesce(p_is_active, true), coalesce(p_sort_order, 0))
    returning id into v_id;
  else
    update public.categories set
      slug = p_slug, name = btrim(p_name), description = nullif(btrim(p_description), ''),
      icon = nullif(btrim(p_icon), ''), is_active = coalesce(p_is_active, true), sort_order = coalesce(p_sort_order, 0)
    where id = p_id returning id into v_id;
    if v_id is null then
      raise exception 'Category not found.' using errcode = 'P0002';
    end if;
  end if;
  perform private.audit(case when p_id is null then 'category.create' else 'category.update' end, 'category', v_id::text,
    jsonb_build_object('slug', p_slug, 'name', p_name, 'is_active', p_is_active), 'admin');
  return v_id;
exception
  when unique_violation then
    raise exception 'A category with that slug already exists.' using errcode = '23505';
  when check_violation then
    raise exception 'Category details are invalid (slug: lowercase letters, digits, dashes).' using errcode = '22023';
end;
$$;

create or replace function public.admin_update_support(p_id uuid, p_status public.support_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
begin
  update public.support_requests
  set status = p_status, admin_note = coalesce(nullif(btrim(p_note), ''), admin_note)
  where id = p_id;
  if not found then
    raise exception 'Request not found.' using errcode = 'P0002';
  end if;
  perform private.audit('support.' || p_status::text, 'support_request', p_id::text, jsonb_build_object('note', p_note), 'admin');
end;
$$;

-- Simulated refund of a single TEST contribution.
create or replace function public.admin_refund_test_contribution(p_contribution_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_c public.contributions;
  v_wish public.wishes;
begin
  select * into v_c from public.contributions where id = p_contribution_id for update;
  if v_c.id is null then
    raise exception 'Contribution not found.' using errcode = 'P0002';
  end if;
  if v_c.mode <> 'test' then
    raise exception 'Only test contributions can be refunded here.' using errcode = '55000';
  end if;
  if v_c.status <> 'succeeded' then
    raise exception 'Only succeeded contributions can be refunded.' using errcode = '55000';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 5 then
    raise exception 'Please record a reason.' using errcode = '22023';
  end if;
  select * into v_wish from public.wishes where id = v_c.wish_id for update;
  insert into public.refunds (contribution_id, amount_minor, currency, mode, status, reason, provider_reference, requested_by)
  values (v_c.id, v_c.amount_minor, v_c.currency, 'test', 'succeeded', btrim(p_reason),
          'sim_refund_' || replace(gen_random_uuid()::text, '-', ''), v_admin);
  update public.contributions set status = 'refunded' where id = v_c.id;
  perform private.notify(v_c.contributor_id, 'contribution_refunded', 'Test contribution reversed',
    'Your TEST-MODE contribution to "' || v_wish.title || '" was reversed by an administrator. No real money was involved.',
    '/dashboard/giving');
  perform private.audit('contribution.refund_test', 'contribution', v_c.id::text,
    jsonb_build_object('wish_id', v_wish.id, 'amount_minor', v_c.amount_minor, 'reason', p_reason), 'admin');
end;
$$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
begin
  return jsonb_build_object(
    'users_total', (select count(*) from public.accounts),
    'users_restricted', (select count(*) from public.accounts where status <> 'active'),
    'users_new_7d', (select count(*) from public.accounts where created_at > now() - interval '7 days'),
    'wishes_by_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                          from (select status, count(*) n from public.wishes group by status) s),
    'offers_by_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                          from (select status, count(*) n from public.fulfilment_offers group by status) s),
    'reports_open', (select count(*) from public.reports where status in ('open', 'investigating')),
    'support_open', (select count(*) from public.support_requests where status <> 'closed'),
    'disputes_open', (select count(*) from public.fulfilment_offers where status = 'disputed'),
    'test_contributions_count', (select count(*) from public.contributions where mode = 'test' and status = 'succeeded'),
    'test_contributions_minor', (select coalesce(sum(amount_minor), 0) from public.contributions where mode = 'test' and status = 'succeeded')
  );
end;
$$;

-- User directory for administrators. Includes email for support purposes only.
create or replace function public.admin_list_users(p_search text default null, p_limit integer default 25, p_offset integer default 0)
returns table (
  id uuid, username text, email text, role public.app_role, status public.account_status, status_reason text,
  created_at timestamptz, last_sign_in_at timestamptz, wish_count bigint, offer_count bigint, total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
begin
  return query
    select a.id, p.username, u.email::text, a.role, a.status, a.status_reason, a.created_at, u.last_sign_in_at,
           (select count(*) from public.wishes w where w.owner_id = a.id),
           (select count(*) from public.fulfilment_offers o where o.giver_id = a.id),
           count(*) over ()
    from public.accounts a
    join public.profiles p on p.id = a.id
    join auth.users u on u.id = a.id
    where p_search is null or p_search = ''
       or p.username ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%'
    order by a.created_at desc
    limit least(greatest(coalesce(p_limit, 25), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges. Supabase grants EXECUTE to anon/authenticated by
-- default; tighten to exactly what each role needs.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.public_stats() to anon, authenticated;
grant execute on function public.submit_support_request(text, text, text) to anon, authenticated;

grant execute on function
  public.create_wish(text, text, text, public.wish_type, public.fulfilment_method, text, text, bigint, bigint, text, public.wisher_identity, boolean, boolean),
  public.update_wish(uuid, text, text, text, public.wish_type, public.fulfilment_method, text, text, bigint, bigint, text, public.wisher_identity, boolean, boolean),
  public.submit_wish(uuid),
  public.publish_wish(uuid),
  public.withdraw_wish(uuid, text),
  public.confirm_wish_fulfilled(uuid),
  public.add_wish_image(uuid, text, text, integer, integer),
  public.remove_wish_image(uuid),
  public.make_offer(uuid, uuid, text, text, boolean),
  public.respond_to_offer(uuid, boolean, text),
  public.offer_action(uuid, text, text),
  public.send_offer_message(uuid, text),
  public.get_wish_offers(uuid),
  public.get_offer_thread(uuid),
  public.get_my_giving(),
  public.create_contribution_intent(uuid, bigint, uuid, boolean, text),
  public.get_wish_contributions(uuid),
  public.report_wish(uuid, public.report_reason, text),
  public.admin_moderate_wish(uuid, text, text),
  public.admin_set_featured(uuid, boolean),
  public.admin_set_account_status(uuid, public.account_status, text),
  public.admin_update_report(uuid, public.report_status, text),
  public.admin_resolve_dispute(uuid, text, text),
  public.admin_upsert_category(smallint, text, text, text, text, boolean, integer),
  public.admin_update_support(uuid, public.support_status, text),
  public.admin_refund_test_contribution(uuid, text),
  public.admin_stats(),
  public.admin_list_users(text, integer, integer)
to authenticated;

-- Only trusted server code (service role) may record payment outcomes.
grant execute on function public.record_contribution_result(uuid, boolean, text) to service_role;

-- Keep future functions closed by default.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
