-- Image Generator: the last catalog tool. Renders one illustration per todo with Cloudflare
-- Workers AI (FLUX.1 schnell, free tier), storing the JPEG in a bucket rather than the row.

-- A rendered image is ~340KB. Base64'd into todos.output it would be ~450KB of text on every
-- dashboard read of that todo — so the binary lives in storage and the row keeps only a URL.
--
-- Public bucket: these are marketing images the user posts publicly, and a public URL is what
-- they paste into Reddit / a launch page. No storage RLS policies:
--   - read  — public buckets serve objects via the CDN URL with no policy needed.
--   - write — the upload runs as the service role from the server action (see
--             lib/supabase/service.ts and runTodoTool). @supabase/ssr doesn't attach the
--             user's JWT to storage requests, so a user-client upload is rejected as anon;
--             rather than depend on that, writes are service-role, authorized in app code by
--             the RLS-scoped todo read above the upload. RLS on storage.objects stays on, so
--             no other authenticated client can write here.
insert into storage.buckets (id, name, public)
values ('campaign-images', 'campaign-images', true)
on conflict (id) do nothing;

-- The image lives in storage; todos.output keeps the prompt / alt text / posting notes as
-- before. Null on every non-image todo and on image todos not yet run — the UI shows an image
-- only when this is set.
alter table todos add column output_image_url text;

-- Turn the catalog-only row into a runnable one, with an honest description of what it makes
-- and — as important — what it refuses to make.
update tools set
  handler = 'image_generator',
  url = 'https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/',
  description = 'Writes an image prompt from your task, then renders one illustration with FLUX.1 (an open model). No text, charts, numbers, logos, or product screenshots — it has never seen your product and renders text as gibberish. Evokes the idea; you review it before posting.'
where name = 'Image Generator';
