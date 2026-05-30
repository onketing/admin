-- Apply all RLS policies

-- tasks
drop policy if exists "authenticated read write" on tasks;
drop policy if exists "admin delete" on tasks;
create policy "authenticated read write" on tasks for all to authenticated using (true) with check (true);
create policy "admin delete" on tasks for delete to authenticated using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- task_marketings
drop policy if exists "authenticated read write" on task_marketings;
drop policy if exists "admin delete" on task_marketings;
create policy "authenticated read write" on task_marketings for all to authenticated using (true) with check (true);
create policy "admin delete" on task_marketings for delete to authenticated using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- marketing_types
drop policy if exists "authenticated read write" on marketing_types;
drop policy if exists "admin delete" on marketing_types;
create policy "authenticated read write" on marketing_types for all to authenticated using (true) with check (true);
create policy "admin delete" on marketing_types for delete to authenticated using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- expenses
drop policy if exists "authenticated read write" on expenses;
drop policy if exists "admin delete" on expenses;
create policy "authenticated read write" on expenses for all to authenticated using (true) with check (true);
create policy "admin delete" on expenses for delete to authenticated using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- clients
drop policy if exists "authenticated read write" on clients;
drop policy if exists "admin delete" on clients;
create policy "authenticated read write" on clients for all to authenticated using (true) with check (true);
create policy "admin delete" on clients for delete to authenticated using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- expense_categories
drop policy if exists "authenticated read write" on expense_categories;
drop policy if exists "admin delete" on expense_categories;
create policy "authenticated read write" on expense_categories for all to authenticated using (true) with check (true);
create policy "admin delete" on expense_categories for delete to authenticated using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- members
drop policy if exists "authenticated read write" on members;
drop policy if exists "admin delete" on members;
drop policy if exists "public read members" on members;
create policy "authenticated read write" on members for all to authenticated using (true) with check (true);
create policy "admin delete" on members for delete to authenticated using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
create policy "public read members" on members for select to anon using (true);

-- audit_logs
drop policy if exists "authenticated read" on audit_logs;
drop policy if exists "authenticated insert" on audit_logs;
create policy "authenticated read" on audit_logs for select to authenticated using (true);
create policy "authenticated insert" on audit_logs for insert to authenticated with check (true);

-- expense_attachments
drop policy if exists "authenticated can select expense_attachments" on expense_attachments;
drop policy if exists "authenticated can insert expense_attachments" on expense_attachments;
drop policy if exists "authenticated can delete expense_attachments" on expense_attachments;
create policy "authenticated can select expense_attachments" on expense_attachments for select to authenticated using (true);
create policy "authenticated can insert expense_attachments" on expense_attachments for insert to authenticated with check (true);
create policy "authenticated can delete expense_attachments" on expense_attachments for delete to authenticated using (true);

-- storage
drop policy if exists "authenticated can upload expense attachments" on storage.objects;
drop policy if exists "authenticated can read expense attachments" on storage.objects;
drop policy if exists "authenticated can delete expense attachments" on storage.objects;
create policy "authenticated can upload expense attachments" on storage.objects for insert to authenticated with check (bucket_id = 'expense-attachments');
create policy "authenticated can read expense attachments" on storage.objects for select to authenticated using (bucket_id = 'expense-attachments');
create policy "authenticated can delete expense attachments" on storage.objects for delete to authenticated using (bucket_id = 'expense-attachments');

-- threads_posts
drop policy if exists "authenticated read write" on threads_posts;
create policy "authenticated read write" on threads_posts for all to authenticated using (true) with check (true);

-- threads_post_segments
drop policy if exists "authenticated read write" on threads_post_segments;
create policy "authenticated read write" on threads_post_segments for all to authenticated using (true) with check (true);

-- contact_submissions
drop policy if exists "anon insert" on contact_submissions;
drop policy if exists "authenticated read" on contact_submissions;
create policy "anon insert" on contact_submissions for insert to anon with check (true);
create policy "authenticated read" on contact_submissions for select to authenticated using (true);
