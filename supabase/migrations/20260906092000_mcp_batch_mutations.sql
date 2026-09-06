-- One RPC, one transaction: every selected mutation succeeds or all roll back.
-- Reuses the single-row allowlist, snapshot check, fixed-slot and FK guards.
create or replace function public.portfolio_mcp_batch_mutate(p_operations jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare op jsonb; locked_row jsonb; result_row jsonb; results jsonb := '[]'::jsonb;
begin
 if jsonb_typeof(p_operations) is distinct from 'array' then raise exception 'operations must be an array'; end if;
 if jsonb_array_length(p_operations)<1 or jsonb_array_length(p_operations)>100 then raise exception 'Expected 1 to 100 mutations'; end if;
 -- Validate the entire envelope before locking or mutating any row.
 for op in select value from jsonb_array_elements(p_operations) loop
  if jsonb_typeof(op) is distinct from 'object'
   or coalesce(op->>'table','') not in ('hero_video_settings','work_projects','work_case_studies','vault_visuals','vault_tools','vault_categories','admin_notes','site_images','site_identity')
   or coalesce(op->>'action','') not in ('update','delete')
   or jsonb_typeof(op->'id') is distinct from 'string' or length(op->>'id')=0
   or jsonb_typeof(op->'expected') is distinct from 'object'
   or jsonb_typeof(op->'values') is distinct from 'object'
  then raise exception 'Invalid mutation envelope'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_operations) x group by x->>'table',x->>'id' having count(*)>1) then raise exception 'Duplicate target in batch'; end if;
 -- Deterministic locking prevents overlapping batches from choosing opposite
 -- lock orders. Target locks also block new FK references until commit.
 for op in select value from jsonb_array_elements(p_operations) order by value->>'table',value->>'id' loop
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',op->>'table') into locked_row using op->>'id';
  if locked_row is null then raise exception 'Row not found: %',op->>'id'; end if;
  if locked_row is distinct from op->'expected' then raise exception 'Row changed: %. Read again and retry',op->>'id'; end if;
 end loop;
 for op in select value from jsonb_array_elements(p_operations) order by value->>'table',value->>'id' loop
  result_row:=public.portfolio_mcp_mutate(op->>'table',op->>'action',op->>'id',op->'expected',op->'values');
  results:=results||jsonb_build_array(jsonb_build_object('content_type',op->>'table','action',op->>'action','row',result_row));
 end loop;
 return results;
end $$;
revoke all on function public.portfolio_mcp_batch_mutate(jsonb) from public,anon,authenticated;
grant execute on function public.portfolio_mcp_batch_mutate(jsonb) to service_role;
