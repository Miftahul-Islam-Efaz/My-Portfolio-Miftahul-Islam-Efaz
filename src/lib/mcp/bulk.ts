import {createHmac,timingSafeEqual} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {TABLE_SPECS} from '@/lib/admin/columns';
import {FIXED_TYPES,revision,validatedRow,publicRow,tableOf,idOf,type Row,type createContentService} from './content';
import {validateArguments} from './tools';

export function idsOf(value:unknown):string[]{
 if(!Array.isArray(value)||value.length<1||value.length>100)throw Error('ids must contain 1–100 exact ids.');
 const ids=value.map(idOf);if(new Set(ids).size!==ids.length)throw Error('Duplicate ids are not allowed.');return ids.sort();
}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
type Service=ReturnType<typeof createContentService>;
const WRITE_TOOLS={upsert_row:'upsert',update_row:'update',duplicate_row:'duplicate',set_published:'publish',validate_row:'validate'} as const;
export function createBulkService(db:SupabaseClient,invalidate:()=>void,secret:string,service:Service){
 async function readMany(table:ReturnType<typeof tableOf>,ids:string[]){
  const {data,error}=await db.from(table).select('*').in('id',ids);if(error)throw Error(error.message);
  const byId=new Map((data as Row[]??[]).map(r=>[String(r.id),r]));const missing=ids.filter(id=>!byId.has(id));
  if(missing.length)throw Error('No changes made. Missing ids: '+missing.join(', '));return ids.map(id=>byId.get(id)!);
 }
 const digest=(table:string,rows:Row[])=>revision({table,rows:rows.map(r=>({id:r.id,revision:revision(r)}))});
 const signature=(payload:string)=>createHmac('sha256',secret).update(payload).digest('base64url');
 function verify(token:unknown){
  if(typeof token!=='string')throw Error('Call preview_delete_rows first.');const [payload,sig,...extra]=token.split('.');
  if(!payload||!sig||extra.length)throw Error('Invalid batch confirmation token.');const a=Buffer.from(signature(payload)),b=Buffer.from(sig);
  if(a.length!==b.length||!timingSafeEqual(a,b))throw Error('Invalid batch confirmation token.');
  const claims=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as Row;
  if(claims.kind!=='delete_rows'||typeof claims.expires!=='number'||claims.expires<Date.now())throw Error('Expired or wrong confirmation token. Preview again.');return claims;
 }
 async function dependencies(table:string,ids:string[]){
  const refs=table==='work_projects'?[['work_case_studies','id']]:table==='vault_categories'?[['vault_visuals','category']]:table==='work_case_studies'?[['work_case_studies','next_project_id']]:[];
  const blockers=[];
  for(const [target,field] of refs){const {count,error}=await db.from(target).select('id',{count:'exact',head:true}).in(field,ids);if(error)throw Error(error.message);if(count)blockers.push({content_type:target,field,count});}
  return blockers;
 }
 async function previewRows(args:Row){
  const table=tableOf(args.content_type),ids=idsOf(args.ids);if(FIXED_TYPES.has(table))throw Error('Fixed site settings cannot be deleted.');
  const rows=await readMany(table,ids),blockers=await dependencies(table,ids);const expires=Date.now()+600000;
  const payload=Buffer.from(JSON.stringify({kind:'delete_rows',table,digest:digest(table,rows),expires})).toString('base64url');
  return {content_type:table,count:ids.length,ids,can_delete:blockers.length===0,atomic:true,blockers,
   items:rows.map(r=>args.response_detail==='full'?publicRow(table,r):{id:r.id,title:r.title??r.label??r.id}),
   confirmation_token:blockers.length?null:payload+'.'+signature(payload),expires_at:new Date(expires).toISOString(),
   note:'One preview covers this exact set. After explicit user approval, call delete_rows with ids, matching confirm_ids, and this token. One transaction deletes all or none. Related records and uploaded media are never implicitly deleted.'};
 }
 async function removeRows(args:Row){
  const table=tableOf(args.content_type),ids=idsOf(args.ids);if(FIXED_TYPES.has(table))throw Error('Fixed site settings cannot be deleted.');
  if(!same(ids,idsOf(args.confirm_ids)))throw Error('confirm_ids must match exactly the approved ids.');
  const claims=verify(args.confirmation_token);if(claims.table!==table)throw Error('Token belongs to another content type.');
  const rows=await readMany(table,ids);if(claims.digest!==digest(table,rows))throw Error('The selected ids or content changed since preview. Preview again.');
  const {error}=await db.rpc('portfolio_mcp_batch_mutate',{p_operations:rows.map(row=>({table,action:'delete',id:row.id,expected:row,values:{}}))});
  if(error)throw Error(error.message);invalidate();
  return {ok:true,atomic:true,content_type:table,deleted_count:ids.length,deleted_ids:ids,...(args.response_detail==='full'?{deleted:rows.map(r=>publicRow(table,r))}:{}),note:'Deleted selected rows only. Media files retained. This is permanent; there is no trash/undo service.'};
 }
 async function updateRows(args:Row){
  const table=tableOf(args.content_type),ids=idsOf(args.ids);
  if(!args.changes||typeof args.changes!=='object'||Array.isArray(args.changes)||'id' in args.changes)throw Error('changes must be an object without id.');
  const expected=args.expected_revisions;
  if(expected!==undefined){if(!expected||typeof expected!=='object'||Array.isArray(expected))throw Error('expected_revisions must map ids to revisions.');for(const [id,value] of Object.entries(expected))if(!ids.includes(id)||typeof value!=='string')throw Error('Invalid expected_revisions entry.');}
  const rows=await readMany(table,ids);
  const updates=rows.map(row=>{
   const want=(expected as Row|undefined)?.[String(row.id)];if(want!==undefined&&want!==revision(row))throw Error('Stale revision for '+row.id+'. No changes made.');
   const clean=validatedRow(table,{...(args.changes as Row),id:row.id},row);
   const changed=Object.fromEntries(Object.entries(clean).filter(([k,v])=>!same(row[k],v)));
   return {row,changed};
  });
  const operations=updates.filter(u=>Object.keys(u.changed).length).map(u=>({table,action:'update',id:u.row.id,expected:u.row,values:u.changed}));
  if(args.dry_run===true)return {ok:true,atomic:true,dry_run:true,content_type:table,count:ids.length,items:updates.map(u=>({id:u.row.id,changed_fields:Object.keys(u.changed),...(args.response_detail==='full'?{changes:u.changed}:{})}))};
  let written:Row[]=[];
  if(operations.length){const {data,error}=await db.rpc('portfolio_mcp_batch_mutate',{p_operations:operations});if(error)throw Error(error.message);written=(data as Array<{row:Row}>).map(r=>r.row);invalidate();}
  return {ok:true,atomic:true,content_type:table,requested_count:ids.length,updated_count:operations.length,unchanged_count:ids.length-operations.length,updated_ids:operations.map(o=>o.id),...(args.response_detail==='full'?{written:written.map(r=>publicRow(table,r))}:{})};
 }
 async function batchRead(args:Row){
  if(!Array.isArray(args.requests)||args.requests.length<1||args.requests.length>20)throw Error('requests must contain 1–20 get_rows requests.');
  const requests=args.requests.map(r=>validateArguments('get_rows',r));
  const results=[];
  // Bounded batches avoid overwhelming the DB connection pool.
  for(let i=0;i<requests.length;i+=4)results.push(...await Promise.all(requests.slice(i,i+4).map(async (request,index)=>{try{return {index:i+index,ok:true,...await service.rows(request)}}catch(e){return {index:i+index,ok:false,error:e instanceof Error?e.message:'Read failed'}}})));
  return {ok:results.every(r=>r.ok),results};
 }
 async function batchWrite(args:Row){
  if(!Array.isArray(args.operations)||args.operations.length<1||args.operations.length>50)throw Error('operations must contain 1–50 explicit writes.');
  const operations=args.operations.map((op,index)=>{
   if(!op||typeof op!=='object'||Array.isArray(op)||typeof op.tool!=='string'||!Object.prototype.hasOwnProperty.call(WRITE_TOOLS,op.tool))throw Error('Unsupported operation at index '+index+'. Deletions must use delete_rows.');
   if(Object.keys(op).some(k=>!['tool','arguments'].includes(k)))throw Error('Unknown operation property.');
   const validated=validateArguments(op.tool,op.arguments);return {tool:op.tool as keyof typeof WRITE_TOOLS,args:args.dry_run===true?{...validated,dry_run:true}:validated};
  });
  const results:Row[]=[];let stopped=false;
  for(const [index,operation] of operations.entries()){
   const id=operation.args.new_id??operation.args.id??(operation.args.row as Row|undefined)?.id;
   if(stopped){results.push({index,id,tool:operation.tool,status:'skipped'});continue;}
   try{const result=await service.write(operation.args,WRITE_TOOLS[operation.tool]);results.push({index,id,tool:operation.tool,status:result.dry_run?'validated':'ok',...(args.response_detail==='full'?{result}:{...(result.unchanged?{unchanged:true}:{}),...(result.dry_run?{changed_fields:Object.keys(result.changes??{})}:{})})});}
   catch(e){results.push({index,id,tool:operation.tool,status:'error',error:e instanceof Error?e.message:'Write failed'});if(args.stop_on_error!==false)stopped=true;}
  }
  return {ok:!results.some(r=>r.status==='error'),atomic:false,dry_run:args.dry_run===true,succeeded:results.filter(r=>['ok','validated'].includes(String(r.status))).length,failed:results.filter(r=>r.status==='error').length,skipped:results.filter(r=>r.status==='skipped').length,results,note:'Ordered individual transactions, not all-or-nothing. Earlier successes remain if a later operation fails. Retry only failed/skipped items; use update_rows for atomic shared changes.'};
 }
 return {previewRows,removeRows,updateRows,batchRead,batchWrite};
}
