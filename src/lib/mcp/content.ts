import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {EDITABLE_TABLES,NEWEST_FIRST_TABLES,isEditableTable,type EditableTable} from '@/lib/cms/types';
import {TABLE_SPECS,REQUIRED,sanitizeRow,youtubeIdFrom} from '@/lib/admin/columns';

export type Row=Record<string,unknown>;
export const FIXED_TYPES=new Set<string>(['site_identity','site_images','hero_video_settings']);
const object=(v:unknown):v is Row=>!!v&&typeof v==='object'&&!Array.isArray(v);
function canonical(v:unknown):string {if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(object(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v)??'null';}
export const revision=(row:Row)=>createHash('sha256').update(canonical(row)).digest('hex');
export function tableOf(v:unknown):EditableTable {if(!isEditableTable(v))throw Error('Unknown content type. Call list_content_types.');return v;}
export function idOf(v:unknown):string {if(typeof v!=='string'||!v.trim()||v.length>200)throw Error('An exact non-empty id is required (max 200 characters).');return v.trim();}
function integer(v:unknown,fallback:number,min:number,max:number){if(v===undefined)return fallback;if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max)throw Error(`Expected an integer from ${min} to ${max}.`);return v;}
export function publicRow(table:EditableTable,row:Row){const allowed=[...TABLE_SPECS[table].cols,'created_at','updated_at'];return {...Object.fromEntries(Object.entries(row).filter(([key])=>allowed.includes(key))),_revision:revision(row)};}
function checkJson(col:string,value:unknown){
 if(typeof value==='string'){try{value=JSON.parse(value)}catch{throw Error(`${col}: invalid JSON; existing content was not changed.`);}}
 if(value===null)return;
 if(col==='feedback'){if(!object(value)||typeof value.quote!=='string'||!value.quote.trim()||typeof value.attribution!=='string'||!value.attribution.trim())throw Error('feedback needs both quote and attribution, or null.');return;}
 if(!Array.isArray(value))throw Error(`${col} must be an array or null.`);
 for(const entry of value){if(!object(entry))throw Error(`${col}: every entry must be an object.`);const key=col==='screens'?'label':'title';if(typeof entry[key]!=='string'||!(entry[key] as string).trim())throw Error(`${col}: every entry needs ${key}.`);
  if(col==='screens'){
   const kind=entry.mediaType??entry.media_type??'image';if(!['image','video'].includes(String(kind)))throw Error('Screen mediaType must be image or video.');
   if(kind==='video'&&!youtubeIdFrom(entry.youtubeId??entry.youtube_id))throw Error('Video screen needs a valid YouTube id or URL.');
   if(entry.layout!==undefined&&!['auto','centered','full'].includes(String(entry.layout)))throw Error('Invalid screen layout.');
  }
 }
}
export function validatedRow(table:EditableTable,raw:unknown,existing:Row|null){
 if(!object(raw))throw Error('row/changes must be an object.');const spec=TABLE_SPECS[table];const input:Row={};
 for(const [key,value] of Object.entries(raw)){
  if(['_revision','created_at','updated_at'].includes(key))continue;
  if(!spec.cols.includes(key))throw Error(`Unknown column '${key}'. Call list_content_types for exact names.`);
  if(key==='sort_order'&&NEWEST_FIRST_TABLES.includes(table))continue;
  if(spec.jsonCols?.includes(key))checkJson(key,value);
  else if(spec.boolCols.includes(key)){if(typeof value!=='boolean')throw Error(`${key} must be true or false.`);}
  else if(spec.numberCols.includes(key)){if(typeof value!=='number'||!Number.isFinite(value))throw Error(`${key} must be a finite number.`);}
  else if(spec.arrayCols.includes(key)){if(value!==null&&typeof value!=='string'&&(!Array.isArray(value)||value.some(v=>typeof v!=='string')))throw Error(`${key} must be a string array or multiline string.`);}
  else if(value!==null&&typeof value!=='string')throw Error(`${key} must be text or null.`);
  input[key]=value;
 }
 const merged={...(existing??{}),...input};const clean=sanitizeRow(table,merged);
 const missing=REQUIRED[table].filter(k=>clean[k]===null||clean[k]===undefined||clean[k]==='');if(missing.length)throw Error('Missing required fields: '+missing.join(', '));
 if(table==='work_case_studies'){
  if(!Array.isArray(clean.narrative)||clean.narrative.length!==3)throw Error('A case study narrative requires exactly three paragraphs.');
  if(Array.isArray(merged.palette_names)&&Array.isArray(merged.palette)&&merged.palette_names.length>merged.palette.length)throw Error('palette_names cannot be longer than palette.');
  if(merged.next_project_id===merged.id)throw Error('A case study cannot link to itself as next_project_id.');
 }
 if(table==='vault_visuals'&&clean.media_type!=null&&!['image','video'].includes(String(clean.media_type)))throw Error('media_type must be image or video.');
 for(const key of spec.numberCols)if(key.includes('opacity')&&(Number(clean[key])<0||Number(clean[key])>1))throw Error(`${key} must be between 0 and 1.`);
 // Only supplied columns are written on updates. Omitted fields stay intact.
 return existing?Object.fromEntries(Object.keys(input).filter(k=>k!=='id').map(k=>[k,clean[k]])):clean;
}

export function createContentService(db:SupabaseClient,invalidate:()=>void,secret:string){
 async function read(table:EditableTable,id:string){const {data,error}=await db.from(table).select('*').eq('id',id).maybeSingle();if(error)throw Error(error.message);return data as Row|null;}
 async function dependencies(table:EditableTable,id:string){const blockers:Array<{content_type:string;field:string;count:number}>=[];
  const refs=table==='work_projects'?[['work_case_studies','id']]:table==='vault_categories'?[['vault_visuals','category']]:table==='work_case_studies'?[['work_case_studies','next_project_id']]:[];
  for(const [target,field] of refs){const {count,error}=await db.from(target).select('id',{count:'exact',head:true}).eq(field,id);if(error)throw Error(error.message);if(count)blockers.push({content_type:target,field,count});}
  return blockers;
 }
 function sign(payload:string){return createHmac('sha256',secret).update(payload).digest('base64url');}
 async function rows(args:Row){const table=tableOf(args.content_type),limit=integer(args.limit,Array.isArray(args.ids)?args.ids.length:50,1,100),offset=integer(args.offset,0,0,100000);const spec=TABLE_SPECS[table];let query=db.from(table).select('*',{count:'exact'});
  if(args.id!==undefined&&args.ids!==undefined)throw Error('Use id or ids, not both.');
  if(args.id!==undefined)query=query.eq('id',idOf(args.id));
  if(args.ids!==undefined){
   if(!Array.isArray(args.ids)||args.ids.length<1||args.ids.length>100)throw Error('ids must contain 1–100 ids.');
   const ids=args.ids.map(idOf);if(new Set(ids).size!==ids.length)throw Error('Duplicate ids.');query=query.in('id',ids);
  }
  let fields:string[]|undefined;
  if(args.fields!==undefined){
   if(!Array.isArray(args.fields)||!args.fields.length||args.fields.some(f=>typeof f!=='string'||![...spec.cols,'created_at','updated_at','_revision'].includes(f)))throw Error('Unknown or invalid fields.');
   fields=Array.from(new Set(['id',...args.fields as string[]]));
  }
  if(args.published!==undefined){if(typeof args.published!=='boolean'||!spec.boolCols.includes('published'))throw Error('This type does not support the requested published filter.');query=query.eq('published',args.published);}
  if(args.category!==undefined){if(typeof args.category!=='string'||!spec.cols.includes('category'))throw Error('Invalid category filter.');query=query.eq('category',args.category);}
  if(args.search!==undefined){if(typeof args.search!=='string'||!args.search.trim()||args.search.length>200)throw Error('search must be 1–200 characters.');
   // Quote PostgREST operands and escape LIKE metacharacters; never interpolate a raw filter.
   const needle=args.search.trim().replace(/\\/g,'\\\\').replace(/[%_]/g,'\\$&');
   const columns=['id','title','label','caption','description','body','site_title','tagline'].filter(c=>spec.cols.includes(c));
   query=query.or(columns.map(c=>`${c}.ilike.${JSON.stringify('%'+needle+'%')}`).join(','));
  }
  if(NEWEST_FIRST_TABLES.includes(table))query=query.order('created_at',{ascending:false}).order('sort_order',{ascending:true});
  const {data,error,count}=await query.order('id',{ascending:true}).range(offset,offset+limit-1);if(error)throw Error(error.message);
  const values=(data??[]) as Row[];return {content_type:table,count:values.length,total:count,offset,next_offset:count!==null&&offset+values.length<count?offset+values.length:null,rows:values.map(r=>{let out:Row=publicRow(table,r);if(fields)out=Object.fromEntries(Object.entries(out).filter(([k])=>fields!.includes(k)||k==='_revision'));if(args.include_revision===false)delete out._revision;return out;})};
 }
 async function write(args:Row,mode:'upsert'|'update'|'duplicate'|'publish'|'validate'){
  const table=tableOf(args.content_type);let raw:Row;
  if(mode==='upsert'||mode==='validate'){if(!object(args.row))throw Error('row must be an object.');raw=args.row;}else{raw={...(object(args.changes)?args.changes:{}),id:idOf(args.id)};if(object(args.changes)&&'id' in args.changes)throw Error('The id cannot be changed.');}
  const id=idOf(raw.id),existing=await read(table,id);
  if(args.expected_revision!==undefined&&(!existing||args.expected_revision!==revision(existing)))throw Error('The row changed. Read it again before editing.');
  if(mode==='update'&&!object(args.changes))throw Error('changes must be an object.');
  if(['update','publish','duplicate'].includes(mode)&&!existing)throw Error('Row not found.');
  if(mode==='publish'){if(!TABLE_SPECS[table].boolCols.includes('published')||typeof args.published!=='boolean')throw Error('This content type does not support publishing.');raw={id,published:args.published};}
  let current=existing;
  if(mode==='duplicate'){
   if(FIXED_TYPES.has(table)||table==='work_case_studies')throw Error('Duplicate the project first and create its case study explicitly; fixed slots cannot be duplicated.');
   const newId=idOf(args.new_id);if(await read(table,newId))throw Error('new_id already exists.');
   raw={...Object.fromEntries(Object.entries(existing!).filter(([k])=>TABLE_SPECS[table].cols.includes(k))),...raw,id:newId};delete raw.sort_order;
   if(TABLE_SPECS[table].boolCols.includes('published'))raw.published=false;
   current=null;
  }
  if(!current&&FIXED_TYPES.has(table))throw Error('Fixed slots must already exist; edit the existing id.');
  const clean=validatedRow(table,raw,current);
  const changes=Object.fromEntries(Object.entries(clean).filter(([k,v])=>!current||canonical(current[k])!==canonical(v)).map(([k,v])=>[k,{before:current?.[k]??null,after:v}]));
  if(mode==='validate'||args.dry_run===true)return {ok:true,dry_run:true,content_type:table,id:raw.id,operation:current?'update':'create',changes};
  if(current&&Object.keys(changes).length===0)return {ok:true,unchanged:true,written:publicRow(table,current)};
  const {data,error}=current?await db.rpc('portfolio_mcp_mutate',{p_table:table,p_action:'update',p_id:id,p_expected:current,p_values:clean}):await db.from(table).insert(clean).select('*').single();
  if(error)throw Error(error.message);invalidate();return {ok:true,content_type:table,written:publicRow(table,data as Row),changes};
 }
 async function preview(args:Row){const table=tableOf(args.content_type),id=idOf(args.id);if(FIXED_TYPES.has(table))throw Error('Fixed site settings cannot be deleted. Edit them instead.');const row=await read(table,id);if(!row)throw Error('Row not found.');const blockers=await dependencies(table,id);
  const payload=Buffer.from(JSON.stringify({table,id,revision:revision(row),expires:Date.now()+10*60*1000})).toString('base64url');
  return {content_type:table,id,row:publicRow(table,row),can_delete:blockers.length===0,blockers,confirmation_token:blockers.length?null:payload+'.'+sign(payload),note:'Permanent single-row deletion. Obtain explicit user approval for this exact item, then call delete_row with confirm_id and this 10-minute token. Uploaded media files are not deleted. Linked records must be reassigned or removed separately.'};
 }
 async function remove(args:Row){const table=tableOf(args.content_type),id=idOf(args.id);if(FIXED_TYPES.has(table))throw Error('Fixed site settings cannot be deleted.');if(args.confirm_id!==id)throw Error('confirm_id must exactly match the approved id.');if(typeof args.confirmation_token!=='string')throw Error('Call preview_delete first.');
  const [payload,signature,...extra]=args.confirmation_token.split('.');if(!payload||!signature||extra.length)throw Error('Invalid confirmation token.');const expected=Buffer.from(sign(payload)),actual=Buffer.from(signature);if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('Invalid confirmation token.');
  const claims=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as Row;
  if(claims.table!==table||claims.id!==id||typeof claims.expires!=='number'||claims.expires<Date.now())throw Error('Expired or mismatched preview. Preview again.');
  const row=await read(table,id);if(!row)throw Error('Row not found; no content deleted.');if(claims.revision!==revision(row))throw Error('The row changed since preview. Preview again.');
  const {data,error}=await db.rpc('portfolio_mcp_mutate',{p_table:table,p_action:'delete',p_id:id,p_expected:row,p_values:{}});if(error)throw Error(error.message);invalidate();
  return {ok:true,content_type:table,deleted:publicRow(table,data as Row),note:'Deleted this row only. Media files were retained. Keep the returned record if you need to recreate it.'};
 }
 return {rows,write,preview,remove,async summary(){return Promise.all(EDITABLE_TABLES.map(async table=>{const {count,error}=await db.from(table).select('id',{count:'exact',head:true});if(error)throw Error(error.message);return {content_type:table,total:count,deletable:!FIXED_TYPES.has(table),supports_publishing:TABLE_SPECS[table].boolCols.includes('published')};}));}};
}
