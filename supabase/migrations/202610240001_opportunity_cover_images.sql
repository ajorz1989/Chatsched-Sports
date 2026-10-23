-- Additive, non-destructive: optional cover photo for opportunities.
-- Images are uploaded by the listing owner to the existing public 'sport-media' bucket
-- under their own user-id folder (existing storage policies already enforce this).
alter table public.opportunities
  add column if not exists cover_image_url text;

alter table public.opportunities
  drop constraint if exists opportunities_cover_image_url_https;
alter table public.opportunities
  add constraint opportunities_cover_image_url_https
  check (cover_image_url is null or (cover_image_url ~* '^https://' and length(cover_image_url) <= 2048));

comment on column public.opportunities.cover_image_url is 'Optional https cover photo shown on listing cards and detail pages.';
