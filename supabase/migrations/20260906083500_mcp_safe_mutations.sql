-- Atomic, optimistic content mutations. Service-role only; no new public policy.
create or replace function public.portfolio_mcp_mutate(
 p_table text, p_action text, p_id text, p_expected jsonb, p_values jsonb default '{}'::jsonb
) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare current_row jsonb; result_row jsonb; blockers bigint; assignments text; invalid_key text;
begin
 if p_table not in ('hero_video_settings','work_projects','work_case_studies','vault_visuals','vault_tools','vault_categories','admin_notes','site_images','site_identity')
    or p_action not in ('update','delete') or p_table is null or p_action is null or p_id is null or length(p_id)=0 then
  raise exception 'Unsupported content mutation';
 end if;
 -- Locks the row AND prevents new FK references until commit. A concurrent
 -- edit fails the snapshot comparison instead of silently overwriting it.
 execute format('select to_jsonb(t) from public.%I t where id=$1 for update',p_table) into current_row using p_id;
 if current_row is null then raise exception 'Row not found'; end if;
 if p_expected is null or current_row is distinct from p_expected then raise exception 'Row changed; read it again and retry'; end if;
 if p_action='delete' then
  if p_table in ('hero_video_settings','site_images','site_identity') then raise exception 'Fixed slots cannot be deleted'; end if;
  if p_table='work_projects' then
   select count(*) into blockers from public.work_case_studies where id=p_id;
  elsif p_table='vault_categories' then
   select count(*) into blockers from public.vault_visuals where category=p_id;
  elsif p_table='work_case_studies' then
   select count(*) into blockers from public.work_case_studies where next_project_id=p_id;
  else blockers:=0;
  end if;
  if blockers>0 then raise exception 'Linked records exist; remove or reassign them explicitly first'; end if;
  execute format('delete from public.%I t where id=$1 returning to_jsonb(t)',p_table) into result_row using p_id;
 else
  if jsonb_typeof(p_values) is distinct from 'object' or p_values='{}'::jsonb then raise exception 'Non-empty changes object required'; end if;
  select k into invalid_key from jsonb_object_keys(p_values) k
   where k in ('id','created_at','updated_at')
    or (k='sort_order' and p_table in ('work_projects','vault_visuals','vault_tools','vault_categories'))
    or not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=p_table and c.column_name=k)
   limit 1;
  if invalid_key is not null then raise exception 'Unsupported or read-only column: %',invalid_key; end if;
  select string_agg(format('%1$I=r.%1$I',k),',') into assignments from jsonb_object_keys(p_values) k;
  execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) r where t.id=$2 returning to_jsonb(t)',p_table,assignments,p_table)
   into result_row using p_values,p_id;
 end if;
 return result_row;
end $$;
revoke all on function public.portfolio_mcp_mutate(text,text,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.portfolio_mcp_mutate(text,text,text,jsonb,jsonb) to service_role;
