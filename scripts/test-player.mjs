import {build} from 'esbuild';
import {readFile,mkdir} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
await mkdir('test-output',{recursive:true});
await build({entryPoints:['lib/player-api.ts'],bundle:true,platform:'node',format:'esm',outfile:'test-output/player-api.mjs'});
const {validateURL,publicIPv4,rewriteManifest,handlePlayerAPI,boundedText}=await import('../test-output/player-api.mjs');
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS',name);}
check('私网、IP 字面量、非 HTTP、用户密码、非标准端口被拒绝',()=>{
  for(const url of ['http://127.0.0.1','http://2130706433','http://[::1]','http://10.0.0.1','http://foo.local','http://localhost','ftp://example.com','https://user:pass@example.com','http://example.com:8080'])assert.throws(()=>validateURL(url));
  assert.equal(validateURL('https://media.example.com/a.mp4').hostname,'media.example.com');
  for(const ip of ['0.0.0.0','10.1.1.1','127.0.0.1','169.254.169.254','172.16.0.1','192.168.0.1','100.64.1.1','198.18.0.1','224.0.0.1'])assert.equal(publicIPv4(ip),false);
});
check('HLS 相对路径、密钥、子清单、查询参数完整重写',()=>{
  const base='https://media.example.com/v/master.m3u8?token=x';
  const result=rewriteManifest('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="../key?k=1&v=2"\n#EXT-X-MAP:URI="init.mp4"\n#EXT-X-STREAM-INF:BANDWIDTH=10\nlow/index.m3u8?a=1&b=2\n//cdn.example.com/seg.ts\n',base,{Referer:'https://example.com/'});
  const paths=[...result.matchAll(/\/api\/media\?[^"\n]+/g)].map(m=>new URL(m[0],'https://player.example.com').searchParams);
  assert.equal(paths.length,4);assert.equal(paths[0].get('url'),'https://media.example.com/key?k=1&v=2');assert.equal(paths[2].get('url'),'https://media.example.com/v/low/index.m3u8?a=1&b=2');assert.equal(paths[3].get('url'),'https://cdn.example.com/seg.ts');assert.deepEqual(JSON.parse(paths[0].get('h')),{Referer:'https://example.com/'});
});
await assert.rejects(()=>boundedText(new Response('12345'),4));checks++;console.log('PASS 响应大小限制');
const originalFetch=globalThis.fetch;
let remoteCalls=[];
globalThis.fetch=async(input,options={})=>{
  const url=String(input);remoteCalls.push({url,options});
  if(url.includes('cloudflare-dns.com'))return Response.json({Answer:new URL(url).searchParams.get('type')==='AAAA'?[]:[{type:1,data:'93.184.215.14'}]});
  if(new URL(url).pathname.endsWith('/redirect'))return new Response(null,{status:302,headers:{location:'http://127.0.0.1/secret'}});
  if(new URL(url).pathname.endsWith('/range.mp4'))return new Response('0123',{status:206,headers:{'content-type':'video/mp4','content-range':'bytes 0-3/20','accept-ranges':'bytes'}});
  if(new URL(url).pathname.endsWith('/error'))return new Response('not found',{status:404});
  if(new URL(url).pathname.endsWith('/page'))return new Response('<html>login</html>',{headers:{'content-type':'text/html'}});
  if(new URL(url).hostname==='yd-hls.bnfuiu.cn')return new Response('#EXTM3U\n#EXTINF:4,\nhttps://tp.example.com/videos5/other/segment.ts\n',{headers:{'content-type':'text/plain'}});
  if(url.endsWith('/json'))return Response.json({list:[1]});
  if(url==='https://raw.githubusercontent.com/ppvia/huangguo-xptv-extension/main/js/huangguo.js')return new Response('const custom=true;');
  throw new Error('Unexpected fetch '+url);
};
const req=(path,init={})=>new Request('https://player.example.com'+path,init);
let r=await handlePlayerAPI(req('/api/network',{method:'POST',headers:{origin:'https://evil.example.com'},body:'{}'}));assert.equal(r.status,403);checks++;console.log('PASS 跨站请求拒绝');
r=await handlePlayerAPI(req('/api/media?url='+encodeURIComponent('https://cdn.example.com/redirect')));assert.equal(r.status,400);assert.ok(!remoteCalls.some(c=>c.url.includes('127.0.0.1')));checks++;console.log('PASS 每次重定向均校验目标');
 r=await handlePlayerAPI(req('/api/media?url='+encodeURIComponent('https://cdn.example.com/range.mp4'),{headers:{range:'bytes=0-3'}}));assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),'bytes 0-3/20');assert.equal(await r.text(),'0123');const rangeCall=remoteCalls.find(c=>c.url.includes('range.mp4'));assert.equal(rangeCall.options.cache,'no-store');assert.equal(new Headers(rangeCall.options.headers).get('range'),'bytes=0-3');assert.equal(new Headers(rangeCall.options.headers).get('cache-control'),'no-cache');assert.equal(new Headers(rangeCall.options.headers).get('pragma'),'no-cache');assert.deepEqual(rangeCall.options.cf,{cacheTtlByStatus:{'200-599':-1}});checks++;console.log('PASS MP4 Range 流式透传');
r=await handlePlayerAPI(req('/api/media?url='+encodeURIComponent('https://cdn.example.com/page')));assert.equal(r.status,400);checks++;console.log('PASS 拒绝把 HTML 当成媒体返回');
r=await handlePlayerAPI(req('/api/media?url='+encodeURIComponent('https://yd-hls.bnfuiu.cn/videos5/request/request.m3u8?auth_key=test')));assert.equal(r.status,302);assert.equal(r.headers.get('location'),'https://yd-hls.bnfuiu.cn/videos5/request/request.m3u8?auth_key=test');assert.equal(r.headers.get('x-relay-fallback'),'direct-origin');checks++;console.log('PASS 黄果 CDN 错位清单回退原始地址');
r=await handlePlayerAPI(req('/api/media?url='+encodeURIComponent('https://cdn.example.com/error')));assert.equal(r.status,502);checks++;console.log('PASS 上游媒体错误明确返回');
r=await handlePlayerAPI(req('/api/network',{method:'POST',body:JSON.stringify({url:'https://api.example.com/json',method:'GET'})}));const result=await r.json();assert.equal(typeof result.data,'string');assert.deepEqual(JSON.parse(result.data),{list:[1]});checks++;console.log('PASS XPTV 字符串响应约定');
const imageKey=await crypto.subtle.importKey('raw',new TextEncoder().encode('f5d965df75336270'),{name:'AES-CBC'},false,['encrypt']);
const imagePlain=new Uint8Array([0xff,0xd8,0xff,0xe0,0x01,0x02,0x03,0xff,0xd9]);
const imageCipher=await crypto.subtle.encrypt({name:'AES-CBC',iv:new TextEncoder().encode('97b60394abc2fbe1')},imageKey,imagePlain);
const originalImageFetch=globalThis.fetch;globalThis.fetch=async(input,options={})=>{const u=String(input);if(u.includes('cloudflare-dns.com'))return Response.json({Answer:new URL(u).searchParams.get('type')==='AAAA'?[]:[{type:1,data:'93.184.215.14'}]});if(u==='https://pic.tuafjz.cn/cover.jpg?auth_key=test')return new Response(imageCipher,{headers:{'content-type':'binary/octet-stream'}});return originalImageFetch(input,options);};
r=await handlePlayerAPI(req('/api/image?url='+encodeURIComponent('https://pic.tuafjz.cn/cover.jpg?auth_key=test')));assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/jpeg');assert.deepEqual(Array.from(new Uint8Array(await r.arrayBuffer())),Array.from(imagePlain));checks++;console.log('PASS AES-CBC 封面解密中转');globalThis.fetch=originalImageFetch;
globalThis.fetch=async(input,options={})=>{const u=String(input);if(u.includes('cloudflare-dns.com'))return Response.json({Answer:new URL(u).searchParams.get('type')==='AAAA'?[]:[{type:1,data:'93.184.215.14'}]});if(u==='https://raw.githubusercontent.com/ppvia/huangguo-xptv-extension/main/js/huangguo.js')return new Response('const custom=true;');throw new Error('Unexpected fetch '+u);};
r=await handlePlayerAPI(req('/api/source?path='+encodeURIComponent('https://raw.githubusercontent.com/ppvia/huangguo-xptv-extension/main/js/huangguo.js')));assert.equal(r.status,200);assert.equal((await r.json()).code,'const custom=true;');checks++;console.log('PASS 自维护黄果扩展地址加载');globalThis.fetch=originalFetch;
// Execute the built browser Worker with synthetic pages. No media sources run on this server.
const workerCode=await readFile('public/extension-worker.js','utf8');
const waiters=new Map();let networkPayload;
const sandbox={console,URL,URLSearchParams,TextEncoder,TextDecoder,setTimeout,clearTimeout,atob,btoa,Uint8Array,ArrayBuffer};sandbox.self=sandbox;
sandbox.postMessage=m=>{
  if(m.kind==='network'){networkPayload=m.payload;queueMicrotask(()=>sandbox.onmessage({data:{kind:'rpc-result',id:m.id,result:{status:200,data:'<ul><li><a href="/one">测试影片</a></li></ul>',headers:{}}}}));}
  if(m.kind==='result'){const w=waiters.get(m.id);m.error?w.reject(new Error(m.error)):w.resolve(m.result);waiters.delete(m.id);}
};
vm.createContext(sandbox);vm.runInContext(workerCode,sandbox,{timeout:10000});
let sequence=0;
function call(data){return new Promise((resolve,reject)=>{const id=++sequence;waiters.set(id,{resolve,reject});sandbox.onmessage({data:{...data,id}});});}
const fixture=`const $=createCheerio();const crypto=createCryptoJS();async function getConfig(){return jsonify({title:'测试源',tabs:[{name:'全部'}]});}async function getCards(ext){ext=argsify(ext);const r=await $fetch.get('https://example.com/list',{headers:{Referer:'https://example.com/'}});const dom=$.load(r.data);$cache.set('page',ext.page);return jsonify({list:[{vod_name:dom('li a').text(),ext:{url:dom('li a').attr('href')}}]});}async function getTracks(ext){return jsonify({list:[{title:'默认',tracks:[{name:'1',ext:argsify(ext)}]}]});}async function getPlayinfo(ext){return jsonify({urls:['https://cdn.example.com/test.m3u8'],headers:[{Referer:'https://example.com/'}]});}async function search(ext){return {list:[{vod_name:argsify(ext).text}]};}`;
assert.equal((await call({kind:'load',code:fixture,config:{},cache:{}})).title,'测试源');
const cards=await call({kind:'call',method:'getCards',args:{page:2}});assert.equal(cards.list[0].vod_name,'测试影片');assert.equal(networkPayload.headers.Referer,'https://example.com/');
const tracks=await call({kind:'call',method:'getTracks',args:cards.list[0].ext});assert.equal(tracks.list[0].tracks[0].ext.url,'/one');
const play=await call({kind:'call',method:'getPlayinfo',args:tracks.list[0].tracks[0].ext});assert.equal(play.urls[0],'https://cdn.example.com/test.m3u8');
const search=await call({kind:'call',method:'search',args:{text:'你好'}});assert.equal(search.list[0].vod_name,'你好');
await assert.rejects(()=>call({kind:'call',method:'unknown'}));checks++;console.log('PASS 独立线程完整流程、Cheerio、请求头、JSON 及缺失方法错误');
console.log(`\n${checks} checks passed. Live third-party playback is not asserted.`);
