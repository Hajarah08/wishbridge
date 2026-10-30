-- Wish images: private bucket, served through short-lived signed URLs.
-- Object names are "<wish_id>/<random uuid>.<ext>" so paths never reveal account ids.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wish-images', 'wish-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.storage_wish_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

create or replace function private.can_upload_wish_image(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
     and exists (
       select 1 from public.wishes w
       join public.accounts a on a.id = w.owner_id
       where w.id = private.storage_wish_id(p_name)
         and w.owner_id = (select auth.uid())
         and a.status = 'active'
         and w.status in ('draft', 'changes_requested', 'pending_review')
     );
$$;

grant execute on function private.storage_wish_id(text) to anon, authenticated;
grant execute on function private.owns_wish(uuid) to anon;
grant execute on function private.can_upload_wish_image(text) to authenticated;

create policy wish_images_read on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'wish-images' and (
      private.wish_is_public(private.storage_wish_id(name))
      or private.owns_wish(private.storage_wish_id(name))
      or private.is_admin()
    )
  );

create policy wish_images_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'wish-images' and private.can_upload_wish_image(name));

create policy wish_images_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'wish-images' and private.can_upload_wish_image(name));
