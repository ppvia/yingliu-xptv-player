import * as cheerio from 'cheerio/slim';
import CryptoJS from 'crypto-js';
// Only repository scripts run here. The UI and its DOM stay outside this Worker.
let api = null;
let cache = {};
let requestId = 0;
const pending = new Map();
const argsify = v => typeof v === 'string' ? JSON.parse(v || '{}') : (v ?? {});
const jsonify = v => JSON.stringify(v);
function rpc(kind, payload) {
  return new Promise((resolve,reject) => {
    const id=++requestId;
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('上游请求超时'));},36000);
    pending.set(id,{resolve,reject,timer});
    postMessage({kind,id,payload});
  });
}
async function request(url,options={}) {
  const result=await rpc('network',{url,...options});
  if(result.status>=400) {
    const error=new Error(`源站返回 HTTP ${result.status}`); error.response=result; throw error;
  }
  return result;
}
const $fetch={
  get:(url,options={})=>request(url,{...options,method:'GET'}),
  post:(url,data,options={})=>request(url,{...options,method:'POST',data}),
  request:options=>request(options.url,options)
};
const $cache={get:key=>cache[key],set:(key,value)=>{cache[key]=value;},delete:key=>{delete cache[key];},remove:key=>{delete cache[key];}};
const $print=(...v)=>postMessage({kind:'log',message:v.map(String).join(' ').slice(0,300)});
const $utils={toastInfo:$print,toastError:$print,toastSuccess:$print};
const unsupported=()=>{throw new Error('此源依赖 XPTV 原生网页嗅探，网页版暂不支持；请切换视频源。');};
self.onmessage=async({data:m})=>{
  if(m.kind==='rpc-result') {const p=pending.get(m.id);if(!p)return;clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(new Error(m.error)):p.resolve(m.result);return;}
  try {
    let result;
    if(m.kind==='load') {
      cache=m.cache||{};
      // Supply the XPTV host contract without evaluating code on the server.
      const factory=new Function('createCheerio','createCryptoJS','$fetch','axios','argsify','jsonify','$cache','$config_str','$utils','$print','$webview','fetch',
        `${m.code}\n;return {getConfig:typeof getConfig==='function'?getConfig:null,getCards:typeof getCards==='function'?getCards:null,getTracks:typeof getTracks==='function'?getTracks:null,getPlayinfo:typeof getPlayinfo==='function'?getPlayinfo:null,search:typeof search==='function'?search:null};`);
      api=factory(()=>cheerio,()=>CryptoJS,$fetch,$fetch,argsify,jsonify,$cache,JSON.stringify(m.config||{}),$utils,$print,{load:unsupported,evaluateJavaScript:unsupported},unsupported);
      if(!api.getConfig)throw new Error('脚本缺少 getConfig，不是受支持的 XPTV 视频源。');
      result=argsify(await api.getConfig());
    } else {
      if(!api?.[m.method])throw new Error('此源未实现 '+m.method);
      result=argsify(await api[m.method](JSON.stringify(m.args||{})));
    }
    postMessage({kind:'result',id:m.id,result,cache});
  }catch(error){postMessage({kind:'result',id:m.id,error:String(error.message||error)});}
};
