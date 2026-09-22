export type Card={vod_id:string;vod_name:string;vod_pic?:string;vod_remarks?:string;vod_duration?:string;ext?:Record<string,unknown>};
export type Track={name:string;pan?:string;ext?:Record<string,unknown>};
export type TrackGroup={title:string;tracks:Track[]};
export type SourceConfig={title:string;site?:string;tabs?:{name:string;ext?:Record<string,unknown>}[]};
export type PlayInfo={urls:string[];headers?:Record<string,string>[]|Record<string,string>};
export type Source={id:string;name:string;kind:string;path:string};
const repositorySources:Source[]=[
  {id:'huangguo',name:'黄果短剧',kind:'短剧 · 自维护扩展',path:'https://raw.githubusercontent.com/ppvia/huangguo-xptv-extension/main/js/huangguo.js'},
];
export const sources:Source[]=[
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

