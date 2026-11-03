-- Allow anon read on club_posts for home carousel preview
grant select on public.club_posts to anon;
drop policy if exists club_posts_select_anon on public.club_posts;
create policy club_posts_select_anon on public.club_posts
  for select to anon
  using (true);

