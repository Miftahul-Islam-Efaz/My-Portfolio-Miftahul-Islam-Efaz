import {createHash,timingSafeEqual,randomBytes} from 'node:crypto';
const processSigningKey=randomBytes(32).toString('hex');
function equal(a:string,b:string){return timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());}
/** Optional auth. With no credentials configured the endpoint is OPEN, by
 * explicit owner request (the URL is treated as private). Set MCP_BEARER_TOKEN
 * or both MCP_USERNAME and MCP_PASSWORD to close it - no code change needed. */
export function authorizeMcp(request:Request,env:NodeJS.ProcessEnv=process.env){
 const user=env.MCP_USERNAME,password=env.MCP_PASSWORD,token=env.MCP_BEARER_TOKEN;
 const configured=!!(token||(user&&password));const key=env.MCP_SIGNING_SECRET||token||password||env.SUPABASE_SERVICE_ROLE_KEY||processSigningKey;
 const secret=createHash('sha256').update('portfolio-mcp-confirmation-v3\0').update(key).digest('hex');
 if(!configured)return {configured:false,allowed:true,secret};
 const header=request.headers.get('authorization')??'';
 let allowed=false;
 if(token&&/^Bearer\s+/i.test(header))allowed=equal(header.replace(/^Bearer\s+/i,''),token);
 if(user&&password&&/^Basic\s+/i.test(header)){
  const decoded=Buffer.from(header.replace(/^Basic\s+/i,''),'base64').toString('utf8'),split=decoded.indexOf(':');
  if(split>=0){const a=equal(decoded.slice(0,split),user),b=equal(decoded.slice(split+1),password);allowed=a&&b;}
 }
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)allowed=false;
 return {configured:true,allowed,secret};
}
