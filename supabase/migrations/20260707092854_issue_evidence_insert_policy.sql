-- Allow controlled issue evidence metadata creation through the public API role.
-- Current app scope: insert metadata-only before/after photo evidence rows.
-- Supabase Storage, real file uploads, auth and TIG write paths remain out of scope.

grant insert on table issue_evidence to anon, authenticated;

create policy "insert issue photo evidence metadata"
on issue_evidence for insert
to anon, authenticated
with check (evidence_type in ('before_photo', 'after_photo'));
