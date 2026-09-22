// Optional integration check against freshly downloaded, unmodified source files.
// Fixtures are local test data; this never asserts live video-source availability.
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const bundle=await readFile('public/extension-worker.js','utf8');
for(const name of ['duanjutt','xingya','bililive','anfuns']){
  const code=await readFile(`test-output/${name}.js`,'utf8');
  const waiters=new Map();let seq=0;const requests=[];
  const sandbox={console,URL,URLSearchParams,TextEncoder,TextDecoder,setTimeout,clearTimeout,atob,btoa,Uint8Array,ArrayBuffer};sandbox.self=sandbox;
  const html='<div class="dropdown-box"><ul><li><a href="/list/1.html">短剧</a></li></ul></div><ul class="myui-vodlist"><li><a class="myui-vodlist__thumb" href="/detail/1.html" title="测试影片" data-original="https://example.com/cover.jpg"></a><span class="pic-text">1集</span></li></ul><div id="playlist1"><a href="/play/1.html">第1集</a></div><script>var player_aaaa={"encrypt":0,"url":"https://example.com/test.m3u8"}</script>';
  sandbox.postMessage=m=>{
    if(m.kind==='network'){
      requests.push(m.payload.url);const url=m.payload.url;let data=html;
      if(name==='xingya'){
        if(url.includes('/account/login'))data=JSON.stringify({data:{token:'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({exp:4102444800})).toString('base64url')+'.c2ln'}});
        else if(url.includes('home_page'))data=JSON.stringify({data:{list:[{theater:{id:1,title:'测试剧',cover_url:'https://example.com/cover.jpg',total:1}}]}});
        else if(url.includes('/detail'))data=JSON.stringify({data:{theaters:[{num:1,son_video_url:'https://example.com/test.m3u8'}]}});
        else if(url.includes('/search'))data=JSON.stringify({data:{theater:{search_data:[{id:1,title:'测试剧',total:1}]}}});
      }
      if(name==='bililive'){
        if(url.includes('getList'))data=JSON.stringify({data:{list:[{roomid:1,title:'测试直播',cover:'https://example.com/a.jpg',uname:'测试'}]}});
        else if(url.includes('getRoomPlayInfo'))data=JSON.stringify({data:{playurl_info:{playurl:{g_qn_desc:[{qn:80,desc:'流畅'}],stream:[{format:[{codec:[{accept_qn:[80],base_url:'/test.m3u8',url_info:[{host:'https://example.com',extra:'?t=1'}]}]}]}]}}}});
        else data=JSON.stringify({data:{result:{live_room:[{roomid:1,title:'测试直播',cover:'//example.com/a.jpg',uname:'测试'}]}}});
      }
      queueMicrotask(()=>sandbox.onmessage({data:{kind:'rpc-result',id:m.id,result:{status:200,data,headers:{}}}}));
    }
    if(m.kind==='result'){const p=waiters.get(m.id);waiters.delete(m.id);m.error?p.reject(new Error(m.error)):p.resolve(m.result);}
  };
  vm.createContext(sandbox);vm.runInContext(bundle,sandbox,{timeout:10000});
  const call=data=>new Promise((resolve,reject)=>{const id=++seq;waiters.set(id,{resolve,reject});sandbox.onmessage({data:{...data,id}});});
  const config=await call({kind:'load',code,cache:{},config:{}});assert.ok(config.title);
  if(name==='anfuns'){console.log('PASS anfuns: 未修改源码加载成功');continue;}
  const cards=await call({kind:'call',method:'getCards',args:{...config.tabs[0].ext,page:1}});assert.ok(cards.list.length);
  const tracks=await call({kind:'call',method:'getTracks',args:cards.list[0].ext});assert.ok(tracks.list[0].tracks.length);
  const info=await call({kind:'call',method:'getPlayinfo',args:tracks.list[0].tracks[0].ext});assert.ok(info.urls[0].startsWith('https://example.com/'));
  if(name!=='duanjutt'){const search=await call({kind:'call',method:'search',args:{text:'测试',page:1}});assert.ok(search.list.length);}
  console.log(`PASS ${name}: 未修改源码分类→列表→选集→解析，${requests.length} 次模拟请求`);
}
