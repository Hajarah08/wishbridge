-- DEVELOPMENT / DEMO SEED DATA ONLY. Never run against production.
-- All demo accounts use the password: WishBridge2026
-- Contributions below are TEST MODE simulations; no real money exists.

do $$
declare
  v_users jsonb := '[
    {"id":"a0000000-0000-4000-8000-000000000001","email":"admin@wishbridge.test","username":"wishbridge_admin"},
    {"id":"a0000000-0000-4000-8000-000000000002","email":"amara@wishbridge.test","username":"amara_dreams"},
    {"id":"a0000000-0000-4000-8000-000000000003","email":"ben@wishbridge.test","username":"ben_gives"},
    {"id":"a0000000-0000-4000-8000-000000000004","email":"chen@wishbridge.test","username":"chen_makes"},
    {"id":"a0000000-0000-4000-8000-000000000005","email":"dana@wishbridge.test","username":"dana_reads"}
  ]';
  u jsonb;
begin
  for u in select * from jsonb_array_elements(v_users) loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', (u->>'id')::uuid, 'authenticated', 'authenticated', u->>'email',
      extensions.crypt('WishBridge2026', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('username', u->>'username'),
      now() - interval '30 days', now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), (u->>'id')::uuid, u->>'id',
            jsonb_build_object('sub', u->>'id', 'email', u->>'email', 'email_verified', true),
            'email', now(), now(), now());
  end loop;
end $$;

-- The admin role is only ever granted from trusted SQL like this (or scripts/make-admin.mjs).
update public.accounts set role = 'admin' where id = 'a0000000-0000-4000-8000-000000000001';
update public.profiles set bio = 'Learning the cello one wobbly note at a time.' where id = 'a0000000-0000-4000-8000-000000000002';

-- Wishes. Inserted directly (status machine applies to updates, not seed inserts).
insert into public.wishes (id, owner_id, title, description, category_id, wish_type, fulfilment_method, country_code,
  currency, estimated_cost_minor, target_amount_minor, status, wisher_identity, show_when_fulfilled, is_featured,
  submitted_at, approved_at, published_at, fulfilled_at, created_at, moderation_note)
values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
   'A secondhand cello for adult beginner lessons',
   'I started cello lessons at 34 using the school''s loaner, but I have to return it next month. A secondhand student cello (even a well-loved one) would let me keep practising at home every evening.',
   (select id from public.categories where slug = 'creative'), 'physical_gift', 'gift_purchase', 'GB',
   'GBP', 45000, null, 'active', 'username', false, true, now() - interval '12 days', now() - interval '11 days', now() - interval '11 days', null, now() - interval '13 days', null),

  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004',
   'Help fund a community seed library',
   'Our neighbourhood allotment group wants to start a free seed library in the local library foyer: a wooden cabinet, envelopes, labels and a first stock of heirloom seeds that anyone can borrow and return.',
   (select id from public.categories where slug = 'community'), 'financial_goal', 'monetary_contribution', 'CA',
   'CAD', null, 60000, 'active', 'username', true, true, now() - interval '9 days', now() - interval '8 days', now() - interval '8 days', null, now() - interval '10 days', null),

  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000005',
   'Textbooks for my nursing degree, second year',
   'I am entering my second year of nursing school and need the pharmacology and adult health textbooks. Used copies are absolutely fine — I just need the current editions for coursework.',
   (select id from public.categories where slug = 'education'), 'physical_gift', 'gift_purchase', 'NG',
   'NGN', 9500000, null, 'active', 'anonymous', false, false, now() - interval '6 days', now() - interval '5 days', now() - interval '5 days', null, now() - interval '7 days', null),

  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002',
   'A pottery taster class with my grandmother',
   'My grandmother has always wanted to try a pottery wheel and her 80th birthday is coming up. A two-person beginner class at a local studio would be a memory we would both treasure.',
   (select id from public.categories where slug = 'experiences'), 'experience', 'gift_card', 'GB',
   'GBP', 9000, null, 'active', 'username', false, true, now() - interval '4 days', now() - interval '3 days', now() - interval '3 days', null, now() - interval '5 days', null),

  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000004',
   'Laptop for learning to code at night',
   'I work days at a warehouse and study web development in the evenings on my phone. A modest refurbished laptop would let me actually build projects and finish my online course.',
   (select id from public.categories where slug = 'technology'), 'financial_goal', 'monetary_contribution', 'US',
   'USD', null, 40000, 'active', 'anonymous', true, false, now() - interval '3 days', now() - interval '2 days', now() - interval '2 days', null, now() - interval '4 days', null),

  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000005',
   'Running shoes for my first marathon',
   'After two years of couch-to-5k and half marathons, I signed up for my first full marathon. My current shoes have over 900km on them and my physio says it is time for a new pair.',
   (select id from public.categories where slug = 'sports'), 'physical_gift', 'gift_purchase', 'KE',
   'KES', 1500000, null, 'fulfilment_pending', 'username', true, false, now() - interval '20 days', now() - interval '19 days', now() - interval '19 days', null, now() - interval '21 days', null),

  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002',
   'A box of picture books for our village nursery',
   'Our small village nursery has the same twenty worn-out books. Thirty new picture books, especially ones with diverse characters, would make story time so much brighter for the children.',
   (select id from public.categories where slug = 'kids'), 'physical_gift', 'gift_purchase', 'IE',
   'EUR', 30000, null, 'fulfilled', 'username', true, false, now() - interval '40 days', now() - interval '39 days', now() - interval '39 days', now() - interval '20 days', now() - interval '41 days', null),

  ('b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000004',
   'Watercolour set and paper for a sketching journal',
   'I want to keep an illustrated journal of my city walks this year. A good student-grade watercolour set and a pad of cold-press paper would get me started.',
   (select id from public.categories where slug = 'creative'), 'physical_gift', 'gift_purchase', 'AU',
   'AUD', 8000, null, 'pending_review', 'username', false, false, now() - interval '1 day', null, null, null, now() - interval '1 day', null),

  ('b0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000005',
   'Weekend camping gear for a family first trip',
   'We have never been camping as a family. Borrowing or receiving a basic four-person tent and two sleeping bags would let us try a weekend at the state park this spring.',
   (select id from public.categories where slug = 'home'), 'physical_gift', 'other', 'US',
   null, null, null, 'pending_review', 'anonymous', false, false, now() - interval '3 hours', null, null, null, now() - interval '4 hours', null),

  ('b0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000002',
   'Guitar lessons for my teenage son',
   'My son taught himself three chords from videos and plays every day. A month of lessons with a real teacher would help him go further.',
   (select id from public.categories where slug = 'education'), 'service', 'service_or_experience', 'GB',
   'GBP', 12000, null, 'changes_requested', 'username', false, false, now() - interval '2 days', null, null, null, now() - interval '3 days',
   'Thanks! Please avoid naming the town your son goes to school in, then resubmit.'),

  ('b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000003',
   'Draft: a telescope for the astronomy club',
   'Still working on this one — our school astronomy club would love a beginner Dobsonian telescope for star parties.',
   (select id from public.categories where slug = 'community'), 'physical_gift', 'gift_purchase', 'US',
   'USD', 35000, null, 'draft', 'username', false, false, null, null, null, null, now() - interval '1 day', null),

  ('b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000004',
   'Birthday cake and party supplies for twins turning 7',
   'Money is tight this month and my twins turn seven next week. A cake and a few decorations would make their day special — they have been counting down for weeks.',
   (select id from public.categories where slug = 'celebrations'), 'physical_gift', 'gift_card', 'ZA',
   'ZAR', 80000, null, 'active', 'username', false, false, now() - interval '1 day', now() - interval '20 hours', now() - interval '20 hours', null, now() - interval '1 day', null);

insert into public.wish_status_history (wish_id, from_status, to_status, actor_role, note)
select id, null, status, 'system', 'Seed data' from public.wishes;

-- Offers
insert into public.fulfilment_offers (id, wish_id, giver_id, status, is_anonymous, message, delivery_plan, idempotency_key,
  giver_confirmed_at, wisher_confirmed_at, decided_at, completed_at, created_at)
values
  -- Pending offer on the cello wish (anonymous giver)
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003',
   'offered', true, 'I have a 3/4 student cello my daughter outgrew — happy to pass it on!',
   'Ship through a courier pickup point so no home address is shared.', gen_random_uuid(), null, null, null, null, now() - interval '2 days'),
  -- Accepted, in progress (named giver) on running shoes
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000004',
   'in_progress', false, 'Good luck with the marathon! I can send a voucher for a local running store.',
   'E-gift voucher sent to the wisher through the offer page.', gen_random_uuid(), null, null, now() - interval '5 days', null, now() - interval '6 days'),
  -- Completed offer on the picture books
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000003',
   'completed', true, 'Our book club would love to help with this.',
   'Order from the bookshop for click-and-collect.', gen_random_uuid(), now() - interval '22 days', now() - interval '20 days', now() - interval '30 days', now() - interval '20 days', now() - interval '31 days');

-- Test-mode contributions
insert into public.contributions (wish_id, contributor_id, amount_minor, currency, is_anonymous, message, status, provider_reference, idempotency_key, created_at)
values
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 20000, 'CAD', false, 'Love this idea!', 'succeeded', 'sim_seed_1', gen_random_uuid(), now() - interval '6 days'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000005', 15000, 'CAD', true, null, 'succeeded', 'sim_seed_2', gen_random_uuid(), now() - interval '4 days'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 10000, 'CAD', true, 'Happy gardening', 'succeeded', 'sim_seed_3', gen_random_uuid(), now() - interval '1 day'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000003', 5000, 'USD', true, null, 'succeeded', 'sim_seed_4', gen_random_uuid(), now() - interval '1 day');

-- Notifications
insert into public.notifications (user_id, type, title, body, link, created_at) values
  ('a0000000-0000-4000-8000-000000000002', 'offer_received', 'Someone offered to fulfil your wish',
   'An anonymous giver offered to fulfil "A secondhand cello for adult beginner lessons". Review the offer to accept or decline.',
   '/dashboard/wishes/b0000000-0000-4000-8000-000000000001', now() - interval '2 days'),
  ('a0000000-0000-4000-8000-000000000002', 'wish_changes_requested', 'Changes requested for your wish',
   'A moderator asked for changes to "Guitar lessons for my teenage son": please avoid naming the town your son goes to school in.',
   '/dashboard/wishes/b0000000-0000-4000-8000-000000000010', now() - interval '1 day'),
  ('a0000000-0000-4000-8000-000000000004', 'offer_accepted', 'Your offer was accepted',
   '@dana_reads accepted your offer for "Running shoes for my first marathon".',
   '/dashboard/offers/c0000000-0000-4000-8000-000000000002', now() - interval '5 days');

-- Moderation queue examples
insert into public.reports (wish_id, reporter_id, reason, details, created_at) values
  ('b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000003', 'spam',
   'Looks similar to another wish I saw last week — might be a duplicate.', now() - interval '6 hours');

insert into public.support_requests (user_id, contact_email, subject, message, created_at) values
  (null, 'visitor@example.com', 'How do anonymous gifts work?',
   'If I give anonymously, will the person ever see my name or email? Thanks!', now() - interval '1 day');

insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, details) values
  ('a0000000-0000-4000-8000-000000000001', 'admin', 'wish.request_changes', 'wish', 'b0000000-0000-4000-8000-000000000010',
   '{"from":"pending_review","to":"changes_requested","note":"Seed example"}');
