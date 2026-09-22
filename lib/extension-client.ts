export type Card={vod_id:string;vod_name:string;vod_pic?:string;vod_remarks?:string;vod_duration?:string;ext?:Record<string,unknown>};
export type Track={name:string;pan?:string;ext?:Record<string,unknown>};
export type TrackGroup={title:string;tracks:Track[]};
export type SourceConfig={title:string;site?:string;tabs?:{name:string;ext?:Record<string,unknown>}[]};
export type PlayInfo={urls:string[];headers?:Record<string,string>[]|Record<string,string>};
export type Source={id:string;name:string;kind:string;path:string};
const repositorySources:Source[]=[
  {id:'4kav',name:'4K-AV',kind:'成人内容 · XPTV 扩展',path:'js/4kav.js'},
  {id:'7sefun',name:'七色番',kind:'动漫 · XPTV 扩展',path:'js/7sefun.js'},
  {id:'91_vod_xptv',name:'91 视频',kind:'成人内容 · XPTV 扩展',path:'js/91_vod_xptv.js'},
  {id:'91jav',name:'91JAV',kind:'成人内容 · XPTV 扩展',path:'js/91jav.js'},
  {id:'alist_tvbox',name:'AList-TvBox',kind:'自建服务 · 需配置',path:'js/alist_tvbox.js'},
  {id:'alist_xiaoya',name:'小雅 AList',kind:'自建服务 · 需配置',path:'js/alist_xiaoya.js'},
  {id:'anfuns',name:'AnFuns 动漫',kind:'动漫 · XPTV 扩展',path:'js/anfuns.js'},
  {id:'anime1',name:'Anime1',kind:'动漫 · XPTV 扩展',path:'js/anime1.js'},
  {id:'aowu',name:'嗷呜动漫',kind:'动漫 · XPTV 扩展',path:'js/aowu.js'},
  {id:'apple',name:'小苹果',kind:'影视 · XPTV 扩展',path:'js/apple.js'},
  {id:'avdb',name:'AVDB',kind:'成人内容 · XPTV 扩展',path:'js/avdb.js'},
  {id:'avtoday',name:'AVToday',kind:'成人内容 · XPTV 扩展',path:'js/avtoday.js'},
  {id:'bililive',name:'哔哩哔哩直播',kind:'直播 · 多清晰度',path:'js/bililive.js'},
  {id:'bttwo',name:'BT TWO',kind:'影视 · XPTV 扩展',path:'js/bttwo.js'},
  {id:'catflix',name:'Catflix',kind:'影视 · XPTV 扩展',path:'js/catflix.js'},
  {id:'cupfox',name:'茶杯狐',kind:'影视 · XPTV 扩展',path:'js/cupfox.js'},
  {id:'czzy',name:'厂长资源',kind:'影视 · XPTV 扩展',path:'js/czzy.js'},
  {id:'douyu',name:'斗鱼直播',kind:'直播 · XPTV 扩展',path:'js/douyu.js'},
  {id:'duanjutt',name:'短剧天堂',kind:'短剧 · XPTV 扩展',path:'js/duanjutt.js'},
  {id:'fmovies',name:'FMovies',kind:'影视 · XPTV 扩展',path:'js/fmovies.js'},
  {id:'gzys',name:'瓜子影视',kind:'影视 · XPTV 扩展',path:'js/gzys.js'},
  {id:'hanime',name:'HAnime',kind:'成人内容 · XPTV 扩展',path:'js/hanime.js'},
  {id:'hdmoli',name:'HDMoli',kind:'影视 · XPTV 扩展',path:'js/hdmoli.js'},
  {id:'hdys',name:'花都影视',kind:'影视 · XPTV 扩展',path:'js/hdys.js'},
  {id:'hjkk',name:'韩剧看看',kind:'韩剧 · XPTV 扩展',path:'js/hjkk.js'},
  {id:'hkdoll',name:'玩偶姐姐',kind:'成人内容 · XPTV 扩展',path:'js/hkdoll.js'},
  {id:'hohoj',name:'HohoJ',kind:'影视 · XPTV 扩展',path:'js/hohoj.js'},
  {id:'huangguo',name:'黄果短剧',kind:'短剧 · 自维护扩展',path:'https://raw.githubusercontent.com/ppvia/huangguo-xptv-extension/main/js/huangguo.js'},
  {id:'huya',name:'虎牙直播',kind:'直播 · XPTV 扩展',path:'js/huya.js'},
  {id:'iyftv',name:'爱壹帆',kind:'影视 · XPTV 扩展',path:'js/iyftv.js'},
  {id:'jable',name:'Jable',kind:'成人内容 · XPTV 扩展',path:'js/jable.js'},
  {id:'javdb_vod_xptv',name:'JAVDB',kind:'成人内容 · XPTV 扩展',path:'js/javdb_vod_xptv.js'},
  {id:'jcy',name:'JCY',kind:'影视 · XPTV 扩展',path:'js/jcy.js'},
  {id:'jdys',name:'绝对影视',kind:'影视 · XPTV 扩展',path:'js/jdys.js'},
  {id:'jianpian',name:'荐片',kind:'影视 · XPTV 扩展',path:'js/jianpian.js'},
  {id:'jpyy',name:'金牌影院',kind:'影视 · XPTV 扩展',path:'js/jpyy.js'},
  {id:'jtapp',name:'JTAPP',kind:'影视 · XPTV 扩展',path:'js/jtapp.js'},
  {id:'kbjfan',name:'KBJFan',kind:'成人内容 · XPTV 扩展',path:'js/kbjfan.js'},
  {id:'kuaikaw',name:'快看',kind:'影视 · XPTV 扩展',path:'js/kuaikaw.js'},
  {id:'laodifang',name:'老地方',kind:'影视 · XPTV 扩展',path:'js/laodifang.js'},
  {id:'lmm85',name:'路漫漫动漫',kind:'动漫 · XPTV 扩展',path:'js/lmm85.js'},
  {id:'madou',name:'麻豆社',kind:'成人内容 · XPTV 扩展',path:'js/madou.js'},
  {id:'mihdr',name:'小米影视',kind:'网盘 · 返回分享链接',path:'js/mihdr.js'},
  {id:'nanfdj',name:'南风短剧',kind:'网盘 · 返回分享链接',path:'js/nanfdj.js'},
  {id:'nmlive',name:'NM Live',kind:'直播 · XPTV 扩展',path:'js/nmlive.js'},
  {id:'novipnoad',name:'NO 视频',kind:'影视 · XPTV 扩展',path:'js/novipnoad.js'},
  {id:'one',name:'ONE',kind:'成人内容 · XPTV 扩展',path:'js/one.js'},
  {id:'ph_vod_gay',name:'Pornhub Gay',kind:'成人内容 · XPTV 扩展',path:'js/ph_vod_gay.js'},
  {id:'ph_vod_xptv',name:'Pornhub XPTV',kind:'成人内容 · XPTV 扩展',path:'js/ph_vod_xptv.js'},
  {id:'pornhub',name:'Pornhub',kind:'成人内容 · XPTV 扩展',path:'js/pornhub.js'},
  {id:'ppnix',name:'PPNix',kind:'影视 · XPTV 扩展',path:'js/ppnix.js'},
  {id:'ppxys',name:'PPX 影视',kind:'影视 · XPTV 扩展',path:'js/ppxys.js'},
  {id:'rrmj',name:'RRMJ',kind:'影视 · XPTV 扩展',path:'js/rrmj.js'},
  {id:'saohuo',name:'烧火电影',kind:'电影 · XPTV 扩展',path:'js/saohuo.js'},
  {id:'subaibai',name:'素白白影视',kind:'影视 · XPTV 扩展',path:'js/subaibai.js'},
  {id:'symx',name:'SYM 影视',kind:'影视 · XPTV 扩展',path:'js/symx.js'},
  {id:'taohuazu',name:'桃花族',kind:'成人内容 · XPTV 扩展',path:'js/taohuazu.js'},
  {id:'tiantian',name:'天天影视',kind:'影视 · XPTV 扩展',path:'js/tiantian.js'},
  {id:'twivideo',name:'TwiVideo',kind:'视频 · XPTV 扩展',path:'js/twivideo.js'},
  {id:'wobg',name:'WOBG',kind:'影视 · XPTV 扩展',path:'js/wobg.js'},
  {id:'wwgz',name:'农民影视',kind:'影视 · XPTV 扩展',path:'js/wwgz.js'},
  {id:'xh_vod_xptv',name:'XHamster XPTV',kind:'成人内容 · XPTV 扩展',path:'js/xh_vod_xptv.js'},
  {id:'xhamster',name:'XHamster',kind:'成人内容 · XPTV 扩展',path:'js/xhamster.js'},
  {id:'xiaohys',name:'小红影视',kind:'影视 · XPTV 扩展',path:'js/xiaohys.js'},
  {id:'xingya',name:'星芽短剧',kind:'短剧 · XPTV 扩展',path:'js/xingya.js'},
  {id:'yiys',name:'意影视',kind:'影视 · XPTV 扩展',path:'js/yiys.js'},
  {id:'ylys',name:'YLYS',kind:'影视 · XPTV 扩展',path:'js/ylys.js'},
  {id:'yunpan8',name:'云盘 8',kind:'网盘 · 返回分享链接',path:'js/yunpan8.js'},
  {id:'yunpanres',name:'云盘资源网',kind:'网盘 · 返回分享链接',path:'js/yunpanres.js'},
  {id:'yydsys',name:'多多影音',kind:'网盘 · 返回分享链接',path:'js/yydsys.js'},
  {id:'zero',name:'零度影视',kind:'影视 · XPTV 扩展',path:'js/zero.js'},
  {id:'zxzj',name:'ZXZJ',kind:'影视 · XPTV 扩展',path:'js/zxzj.js'},
];
export const sources:Source[]=[
  {id:'demo',name:'播放测试',kind:'公开测试片 · 无需视频源',path:''},
  ...repositorySources,
];
export const TEST_URL='https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
export const demoCard:Card={vod_id:'demo',vod_name:'Big Buck Bunny · 播放测试',vod_remarks:'公开 HLS 测试流 · 非片库内容',ext:{demo:true}};
export function mediaURL(url:string,headers:Record<string,string>={}) {return '/api/media?'+new URLSearchParams({url,h:JSON.stringify(headers)});}
export function imageURL(url:string,headers:Record<string,string>={}) {return '/api/image?'+new URLSearchParams({url,h:JSON.stringify(headers)});}
export function safeHttp(url:string){try{return ['http:','https:'].includes(new URL(url).protocol);}catch{return false;}}
export class ExtensionClient {
  worker:Worker;
  next=0;
  closed=false;
  pending=new Map<number,{resolve:(x:any)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  constructor(public sourceId:string,public onLog:(msg:string)=>void=()=>{}) {
    this.worker=new Worker('/extension-worker.js');
    this.worker.onmessage=async({data:m})=>{
      if(m.kind==='network') {
        try {
          const response=await fetch('/api/network',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(m.payload),signal:AbortSignal.timeout(35000)});
          const data=await response.json() as {error?:string};
          if(!response.ok)throw new Error(data.error||'源站请求失败');
          if(!this.closed)this.worker.postMessage({kind:'rpc-result',id:m.id,result:data});
        }catch(e){if(!this.closed)this.worker.postMessage({kind:'rpc-result',id:m.id,error:(e as Error).message});}
      }else if(m.kind==='log')this.onLog(m.message);
      else if(m.kind==='result') {
        const p=this.pending.get(m.id);if(!p)return;
        clearTimeout(p.timer);this.pending.delete(m.id);
        if(m.cache)try{sessionStorage.setItem('xptv-cache:'+this.sourceId,JSON.stringify(m.cache));}catch{}
        m.error?p.reject(new Error(m.error)):p.resolve(m.result);
      }
    };
    this.worker.onerror=()=>this.stop('扩展运行失败，请换源或重新加载。');
  }
  send(message:Record<string,unknown>):Promise<any>{
    if(this.closed)return Promise.reject(new Error('扩展已停止，请重新加载视频源。'));
    return new Promise((resolve,reject)=>{
      const id=++this.next;
      const timer=setTimeout(()=>this.stop('解析超时，已停止扩展。可重新加载或切换视频源。'),60000);
      this.pending.set(id,{resolve,reject,timer});this.worker.postMessage({...message,id});
    });
  }
  async load(path:string,config:Record<string,unknown>={}){
    const response=await fetch('/api/source?'+new URLSearchParams({path}),{signal:AbortSignal.timeout(25000)});
    const result=await response.json() as {code:string;error?:string};if(!response.ok)throw new Error(result.error||'无法加载扩展');
    let cache={};try{cache=JSON.parse(sessionStorage.getItem('xptv-cache:'+this.sourceId)||'{}');}catch{}
    return this.send({kind:'load',code:result.code,config,cache}) as Promise<SourceConfig>;
  }
  call<T>(method:string,args:Record<string,unknown>={}):Promise<T>{return this.send({kind:'call',method,args});}
  stop(message='已切换视频源') {this.closed=true;this.worker.terminate();for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error(message));}this.pending.clear();}
}
