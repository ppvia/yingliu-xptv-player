// Shared by the Sites Worker and the independently deployable Cloudflare Worker.
const REPO='https://raw.githubusercontent.com/Yswag/xptv-extensions/main/';
const CUSTOM_REPO='https://raw.githubusercontent.com/ppvia/huangguo-xptv-extension/main/';
const LIMIT=5*1024*1024;
const redirectCodes=new Set([301,302,303,307,308]);
const dnsCache=new Map<string,number>();
export function publicIPv4(ip:string){
  const p=ip.split('.').map(Number);if(p.length!==4||p.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
  const [a,b,c]=p;
  return !(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===2))||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19||b===51&&c===100))||(a===203&&b===0&&c===113));
}
export function validateURL(raw:string){
  const u=new URL(raw);
  const h=u.hostname.toLowerCase();
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password||h.length>253||!h.includes('.')||h.includes(':')||h.endsWith('.')||/^\d/.test(h)&&/^[\d.]+$/.test(h)||/\.(localhost|local|internal|home|lan|test|invalid)$/.test(h))throw new Error('仅支持公开域名的 HTTP/HTTPS 地址，不允许本机或内网地址。');
  if(u.port&&u.port!=='80'&&u.port!=='443')throw new Error('服务请通过公开 HTTPS 域名提供，不支持自定义端口。');
  if(raw.length>12000)throw new Error('地址过长');
  return u;
}
async function validateDNS(u:URL){
  const host=u.hostname;
  if((dnsCache.get(host)||0)>Date.now())return;
  const [r,v6]=await Promise.all(['A','AAAA'].map(type=>fetch('https://cloudflare-dns.com/dns-query?'+new URLSearchParams({name:host,type}),{headers:{Accept:'application/dns-json'},signal:AbortSignal.timeout(10000)}).catch(()=>{throw new Error('域名检查超时，请重试或切换直连播放');})));
  if(!r.ok||!v6.ok)throw new Error('域名安全校验失败');
  const d=await r.json() as {Answer?:{type:number;data:string}[]};
  const records=d.Answer?.filter(x=>x.type===1)||[];
  if(!records.length||records.some(x=>!publicIPv4(x.data)))throw new Error('域名不可解析或指向受限地址');
  const v6data=await v6.json() as {Answer?:{type:number;data:string}[]};
  if(v6data.Answer?.some(x=>x.type===28&&!/^[23][0-9a-f]{3}:/i.test(x.data)))throw new Error('域名指向受限 IPv6 地址');
  if(dnsCache.size>1000)dnsCache.clear();dnsCache.set(host,Date.now()+30000);
}
function outgoingHeaders(input:Record<string,string>={}){
  const h=new Headers();
  for(const [k,v] of Object.entries(input)){
    if(/^(user-agent|referer|origin|accept|accept-language|content-type|authorization|cookie|range|x-[a-z\d-]+|platform|manufacturer|version_name|app_version|device_platform|device_type|device_brand|os_version|channel|raw_channel|oaid|msa_oaid|uuid|device_id|ab_id|support_h265|personalized_recommend_status|dev_token|user_agent)$/i.test(k)&&typeof v==='string'&&v.length<12000&&!/[\r\n]/.test(v))h.set(k,v);
  }
  if(!h.has('user-agent'))h.set('user-agent','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36');
  return h;
}
async function upstream(raw:string,init:RequestInit={},maxRedirects=5){
  let u=validateURL(raw);let opts={...init,headers:new Headers(init.headers),redirect:'manual' as RequestRedirect,signal:AbortSignal.timeout(20000)};
  for(let i=0;i<=maxRedirects;i++){
    await validateDNS(u);
    const r=await fetch(u,opts).catch(()=>{throw new Error('源站连接失败或超时，请切换来源或稍后重试');});
    if(!redirectCodes.has(r.status))return {response:r,url:u.toString()};
    const location=r.headers.get('location');if(!location||maxRedirects===0)return {response:r,url:u.toString()};
    await r.body?.cancel();
    const next=validateURL(new URL(location,u).toString());
    if(next.origin!==u.origin){opts.headers.delete('authorization');opts.headers.delete('cookie');}
    if(r.status===303||([301,302].includes(r.status)&&opts.method==='POST')){opts={...opts,method:'GET',body:undefined};opts.headers.delete('content-type');}
    u=next;
  }
  throw new Error('源站重定向次数过多');
}
export async function boundedText(r:Response,limit=LIMIT){
  if(Number(r.headers.get('content-length')||0)>limit){await r.body?.cancel();throw new Error('响应超过允许大小');}
  if(!r.body)return '';
  const reader=r.body.getReader();const parts:Uint8Array[]=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw new Error('响应超过允许大小');}parts.push(value);}
  const bytes=new Uint8Array(total);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.byteLength;}return new TextDecoder().decode(bytes);
}
async function boundedBytes(r:Response,limit=LIMIT){
  if(Number(r.headers.get('content-length')||0)>limit){await r.body?.cancel();throw new Error('响应超过允许大小');}
  if(!r.body)return new Uint8Array();
  const reader=r.body.getReader();const parts:Uint8Array[]=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw new Error('响应超过允许大小');}parts.push(value);}
  const bytes=new Uint8Array(total);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.byteLength;}return bytes;
}
function imageSignature(bytes:Uint8Array){
  return (bytes[0]===0xff&&bytes[1]===0xd8)||(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)||
    (bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x46&&bytes[8]===0x57&&bytes[9]===0x45&&bytes[10]===0x42&&bytes[11]===0x50)||
    (bytes[0]===0x47&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x38);
}
function imageType(bytes:Uint8Array){
  if(bytes[0]===0xff&&bytes[1]===0xd8)return 'image/jpeg';
  if(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)return 'image/png';
  if(bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x46&&bytes[8]===0x57&&bytes[9]===0x45&&bytes[10]===0x42&&bytes[11]===0x50)return 'image/webp';
  if(bytes[0]===0x47&&bytes[1]===0x49&&bytes[2]===0x46)return 'image/gif';
  return '';
}
async function decryptHuangguoImage(bytes:Uint8Array){
  if(bytes.byteLength<16||bytes.byteLength%16!==0||imageSignature(bytes))return bytes;
  try{
    const encoder=new TextEncoder();
    const keyBytes=encoder.encode('f5d965df75336270').buffer as ArrayBuffer;
    const iv=encoder.encode('97b60394abc2fbe1').buffer as ArrayBuffer;
    const input=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;
    const key=await crypto.subtle.importKey('raw',keyBytes,{name:'AES-CBC'},false,['decrypt']);
    const plain=await crypto.subtle.decrypt({name:'AES-CBC',iv},key,input);
    const result=new Uint8Array(plain);return imageSignature(result)?result:bytes;
  }catch{return bytes;}
}
function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export function rewriteManifest(text:string,base:string,headers:Record<string,string>){
  const proxify=(value:string)=>{
    const absolute=new URL(value,base).toString();validateURL(absolute);
    return '/api/media?'+new URLSearchParams({url:absolute,h:JSON.stringify(headers)});
  };
  return text.split(/\r?\n/).map(line=>{
    const s=line.trim();if(!s)return line;
    if(s.startsWith('#'))return line.replace(/URI="([^"]+)"/g,(_,uri)=>`URI="${proxify(uri)}"`);
    return proxify(s);
  }).join('\n');
}
export async function handlePlayerAPI(request:Request):Promise<Response|null>{
  const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return null;
  try {
    const origin=request.headers.get('origin');
    if(origin&&origin!==url.origin)return json({error:'不允许跨站调用'},403);
    if(request.headers.get('sec-fetch-site')==='cross-site')return json({error:'不允许跨站调用'},403);
    if(url.pathname==='/api/source'&&request.method==='GET'){
      let path=url.searchParams.get('path')||'';
      let sourceBase=REPO;
      if(path.startsWith('https://')){
        const u=new URL(path);
        const upstreamPrefix='/Yswag/xptv-extensions/';const customPrefix='/ppvia/huangguo-xptv-extension/';
        if(u.hostname==='github.com'&&u.pathname.startsWith(upstreamPrefix+'blob/main/'))path=u.pathname.slice((upstreamPrefix+'blob/main/').length);
        else if(u.hostname==='github.com'&&u.pathname.startsWith(customPrefix+'blob/main/')){path=u.pathname.slice((customPrefix+'blob/main/').length);sourceBase=CUSTOM_REPO;}
        else if(u.hostname==='raw.githubusercontent.com'&&u.pathname.startsWith('/Yswag/xptv-extensions/'))path=u.pathname.replace(/^\/Yswag\/xptv-extensions\/(?:refs\/heads\/)?main\//,'');
        else if(u.hostname==='raw.githubusercontent.com'&&u.pathname.startsWith('/ppvia/huangguo-xptv-extension/')){path=u.pathname.replace(/^\/ppvia\/huangguo-xptv-extension\/(?:refs\/heads\/)?main\//,'');sourceBase=CUSTOM_REPO;}
        else throw new Error('请填写已允许的 GitHub XPTV 扩展地址');
      }
      if(!/^(js\/[a-zA-Z\d_-]+\.js|subs\/[a-zA-Z\d_-]+\.json)$/.test(path))throw new Error('仅支持指定仓库 js/ 和 subs/ 目录内的文件');
      const r=await fetch(sourceBase+path,{signal:AbortSignal.timeout(15000)});
      if(!r.ok)throw new Error('GitHub 源码下载失败：HTTP '+r.status);
      const code=await boundedText(r,2*1024*1024);
      if(path.endsWith('.json'))return json({sites:JSON.parse(code).sites||[]});
      return json({code,path});
    }
    if(url.pathname==='/api/network'&&request.method==='POST'){
      const payload=JSON.parse(await boundedText(new Response(request.body),128*1024));
      let raw=String(payload.url||'');const u=validateURL(raw);
      for(const [k,v] of Object.entries(payload.params||{}))u.searchParams.set(k,String(v));raw=u.toString();
      const method=String(payload.method||'GET').toUpperCase();if(!['GET','POST'].includes(method))throw new Error('只支持 GET 和 POST');
      const headers=outgoingHeaders(payload.headers);let body:string|undefined;
      if(method==='POST'&&payload.data!==undefined){
        const ct=headers.get('content-type')||'';
        if(typeof payload.data==='string')body=payload.data;
        else if(ct.includes('application/x-www-form-urlencoded'))body=new URLSearchParams(payload.data).toString();
        else{body=JSON.stringify(payload.data);if(!ct)headers.set('content-type','application/json');}
      }
      const {response:r,url:finalURL}=await upstream(raw,{method,headers,body},payload.maxRedirects===0?0:5);
      const text=await boundedText(r);
      const safeHeaders:Record<string,string>={};for(const k of ['content-type','location']){const v=r.headers.get(k);if(v)safeHeaders[k]=v;}
      return json({data:text,status:r.status,headers:safeHeaders,url:finalURL});
    }
    if(url.pathname==='/api/media'&&['GET','HEAD'].includes(request.method)){
      const raw=url.searchParams.get('url')||'';
      const input=JSON.parse(url.searchParams.get('h')||'{}');const headers=outgoingHeaders(input);
      const range=request.headers.get('range');if(range)headers.set('range',range);
      const {response:r,url:finalURL}=await upstream(raw,{headers,method:request.method});
      if(!r.ok&&r.status!==206){await r.body?.cancel();return json({error:`视频源返回 HTTP ${r.status}`},502);}
      const ct=r.headers.get('content-type')||'';
      const output=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
      if(ct.includes('mpegurl')||new URL(finalURL).pathname.toLowerCase().endsWith('.m3u8')){
        output.set('Content-Type','application/vnd.apple.mpegurl');
        if(request.method==='HEAD')return new Response(null,{headers:output});
        const manifest=await boundedText(r,2*1024*1024);if(!manifest.trimStart().startsWith('#EXTM3U'))throw new Error('源站返回的不是有效 HLS 播放清单');
        return new Response(rewriteManifest(manifest,finalURL,input),{headers:output});
      }
      if(/text\/html|image\/svg|javascript/i.test(ct)){await r.body?.cancel();throw new Error('此地址返回网页或脚本，不是视频媒体');}
      for(const k of ['content-type','content-length','content-range','accept-ranges']){const v=r.headers.get(k);if(v)output.set(k,v);}
      if(!output.has('content-type'))output.set('content-type','application/octet-stream');
      return new Response(r.body,{status:r.status,headers:output});
    }
    if(url.pathname==='/api/image'&&['GET','HEAD'].includes(request.method)){
      const raw=url.searchParams.get('url')||'';
      const input=JSON.parse(url.searchParams.get('h')||'{}');const headers=outgoingHeaders(input);
      const {response:r,url:finalURL}=await upstream(raw,{headers,method:request.method});
      if(!r.ok){await r.body?.cancel();return json({error:`图片源返回 HTTP ${r.status}`},502);}
      const bytes=await boundedBytes(r,8*1024*1024);const decoded=await decryptHuangguoImage(bytes);
      const output=new Headers({'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'});
      const ct=imageType(decoded)||r.headers.get('content-type')||'application/octet-stream';output.set('Content-Type',ct);
      if(request.method==='HEAD')return new Response(null,{status:r.status,headers:output});
      const body=decoded.buffer.slice(decoded.byteOffset,decoded.byteOffset+decoded.byteLength) as ArrayBuffer;
      return new Response(body,{status:r.status,headers:output});
    }
    return json({error:'接口不存在'},404);
  }catch(error){return json({error:(error as Error).message||'请求失败'},400);}
}
