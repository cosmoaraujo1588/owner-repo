-- Security hardening found during the June 2026 production audit.
alter view public.admin_category_summary set (security_invoker = true);
alter view public.admin_realtime_overview set (security_invoker = true);
alter view public.admin_product_performance_7d set (security_invoker = true);
alter view public.admin_visits_hourly_48h set (security_invoker = true);

alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.set_view_event_product_id_from_payload() set search_path = public, pg_temp;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Public buckets serve object URLs without a broad storage.objects SELECT policy.
drop policy if exists "public read kairos files" on storage.objects;
