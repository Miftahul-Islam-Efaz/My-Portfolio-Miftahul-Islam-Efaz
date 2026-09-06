-- Existing Work rows have no historical creation date. They receive the same
-- migration timestamp; sort_order remains the deterministic tie-breaker.
alter table public.work_projects add column if not exists created_at timestamptz not null default now();
-- Keep the legacy unique position columns for compatibility, but assign them
-- automatically for new rows. No existing content or positions are deleted.
do $$
declare t text; seq text; next_position bigint;
begin
 foreach t in array array['work_projects','vault_visuals','vault_tools','vault_categories'] loop
  seq := t || '_auto_position';
  execute format('create sequence if not exists public.%I', seq);
  execute format('select greatest(coalesce(max(sort_order),0),0) + 1 from public.%I', t) into next_position;
  perform setval(('public.' || seq)::regclass, next_position, false);
  execute format('alter table public.%I alter column sort_order set default nextval(%L::regclass)', t, 'public.' || seq);
  execute format('alter sequence public.%I owned by public.%I.sort_order', seq, t);
  execute format('grant usage, select on sequence public.%I to service_role',seq);
 end loop;
end $$;
