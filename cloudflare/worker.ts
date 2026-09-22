import {handlePlayerAPI} from '../lib/player-api';
interface Env { ASSETS:{fetch:(r:Request)=>Promise<Response>}; PLAYER_ACCESS_KEY?:string; }
export default {
  async fetch(request:Request,env:Env){
    // This deployment includes a network/media relay. Keep it private.
    if(!env.PLAYER_ACCESS_KEY)return new Response('请先配置 PLAYER_ACCESS_KEY 后再使用播放器。',{status:503});
    let password='';try{const auth=request.headers.get('authorization')||'';if(auth.startsWith('Basic '))password=atob(auth.slice(6)).split(':').slice(1).join(':');}catch{}
    const enc=new TextEncoder();const a=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(password)));const b=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(env.PLAYER_ACCESS_KEY)));let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
    if(diff)return new Response('需要访问密码。用户名可填写 player。',{status:401,headers:{'WWW-Authenticate':'Basic realm="Yingliu Player", charset="UTF-8"','Cache-Control':'no-store'}});
    const response=await handlePlayerAPI(request)||await env.ASSETS.fetch(request);
    const out=new Response(response.body,response);
    out.headers.set('Referrer-Policy','no-referrer');out.headers.set('X-Content-Type-Options','nosniff');
    return out;
  }
};
