'use client';
import {useEffect,useRef,useState} from 'react';
import Hls from 'hls.js';
import {Play,Search,Plus,Settings2,RefreshCw,ChevronLeft,ChevronRight,Link2,Copy,Film,Layers,ArrowUpRight,LoaderCircle,Radio,Check,SquarePlay} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Skeleton} from '@/components/ui/skeleton';
import {ExtensionClient,sources,demoCard,TEST_URL,imageURL,safeHttp,type Source,type SourceConfig,type Card,type Track,type TrackGroup,type PlayInfo} from '@/lib/extension-client';
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
function Poster({card}:{card:Card}){
  const [failed,setFailed]=useState(false);
  return <div className="poster">{card.vod_pic&&safeHttp(card.vod_pic)&&!failed?<img src={imageURL(card.vod_pic)} alt={card.vod_name} loading="lazy" onError={()=>setFailed(true)}/>:<span className="poster-letter"><Film size={40} strokeWidth={1}/></span>}<span className="play-hover"><Play size={36} fill="currentColor"/></span></div>;
}
export default function PlayerApp(){
  const [allSources,setAllSources]=useState<Source[]>(sources);
  const [source,setSource]=useState<Source>(sources[0]);
  const [config,setConfig]=useState<SourceConfig>({title:sources[0]?.name||'黄果短剧',tabs:[]});
  const [category,setCategory]=useState(0);
  const [cards,setCards]=useState<Card[]>([]);
  const [page,setPage]=useState(1);
  const [query,setQuery]=useState('');
  const [sourceQuery,setSourceQuery]=useState('');
  const [searchTerm,setSearchTerm]=useState('');
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [status,setStatus]=useState('正在加载黄果短剧…');
  const [selected,setSelected]=useState<Card|null>(null);
  const [groups,setGroups]=useState<TrackGroup[]>([]);
  const [group,setGroup]=useState('0');
  const [episode,setEpisode]=useState(-1);
  const [playInfo,setPlayInfo]=useState<PlayInfo|null>(null);
  const [line,setLine]=useState('0');
  const [playError,setPlayError]=useState('');
  const [videoState,setVideoState]=useState('等待选集');
  const [modal,setModal]=useState<'import'|'config'|'direct'|'url'|null>(null);
  const [importURL,setImportURL]=useState('');
  const [importList,setImportList]=useState<{name:string;ext:string}[]>([]);
  const [configText,setConfigText]=useState('{}');
  const [modalError,setModalError]=useState('');
  const [directURL,setDirectURL]=useState('');
  const [copied,setCopied]=useState(false);
  const [importBusy,setImportBusy]=useState(false);
  const client=useRef<ExtensionClient|null>(null);
  const generation=useRef(0);
  const selection=useRef(0);
  const video=useRef<HTMLVideoElement>(null);
  const playerSection=useRef<HTMLDivElement>(null);
  const currentTracks=groups[Number(group)]?.tracks||[];
  const normalizedSourceQuery=sourceQuery.trim().toLocaleLowerCase();
  const visibleSources=normalizedSourceQuery?allSources.filter(s=>`${s.name} ${s.kind} ${s.id}`.toLocaleLowerCase().includes(normalizedSourceQuery)):allSources;
  const currentURL=playInfo?.urls[Number(line)]||'';
  useEffect(()=>()=>client.current?.stop(),[]);
  useEffect(()=>{if(sources[0])void activate(sources[0]);},[]);
  useEffect(()=>{
    if(!currentURL||!video.current)return;
    const el=video.current;
    const src=currentURL;
    let hls:Hls|null=null;let mediaRetries=0;
    setPlayError('');setVideoState('正在加载视频');
    const hlsURL=/\.m3u8(?:[?#]|$)/i.test(currentURL);
    const started=()=>setVideoState('正在播放');
    const ready=()=>{setVideoState('已就绪');el.play().catch(()=>setVideoState('点击视频中的播放按钮'));};
    const failed=()=>{setVideoState('播放失败');setPlayError('浏览器无法播放此地址。请尝试其他线路或重新解析；源站失效和不支持的编码也会导致失败。');};
    el.addEventListener('playing',started);el.addEventListener('canplay',ready,{once:true});el.addEventListener('error',failed);
    if(hlsURL&&Hls.isSupported()){
      hls=new Hls({maxBufferLength:30,backBufferLength:30,enableWorker:true,
        // Fetch manifests, keys and segments directly from the source CDN.
        // Its wildcard CORS response requires requests without credentials.
        xhrSetup:(xhr)=>{xhr.withCredentials=false;},
        fetchSetup:(context,init)=>new Request(context.url,{...init,credentials:'omit'}),
      });
      hls.on(Hls.Events.ERROR,(_,data)=>{if(!data.fatal)return;if(data.type===Hls.ErrorTypes.MEDIA_ERROR&&mediaRetries++<1)hls?.recoverMediaError();else{setPlayError(`HLS 加载失败（${data.details}）。可重新解析或切换线路后重试。`);setVideoState('播放失败');hls?.destroy();}});
      hls.loadSource(src);hls.attachMedia(el);
    }else if(!hlsURL||el.canPlayType('application/vnd.apple.mpegurl'))el.src=src;
    else failed();
    return()=>{hls?.destroy();el.removeEventListener('playing',started);el.removeEventListener('canplay',ready);el.removeEventListener('error',failed);el.pause();el.removeAttribute('src');el.load();};
  },[currentURL]);
  function resetPlayer(){selection.current++;setSelected(null);setGroups([]);setGroup('0');setEpisode(-1);setPlayInfo(null);setLine('0');setPlayError('');setVideoState('等待选集');}
  async function activate(next:Source,custom?:Record<string,unknown>){
    const gen=++generation.current;client.current?.stop();client.current=null;
    setSource(next);setConfig({title:next.name,tabs:[]});setCards([]);setCategory(0);setPage(1);setQuery('');setSearchTerm('');setError('');resetPlayer();setBusy(false);
    if(next.id==='demo'){setConfig({title:next.name,tabs:[{name:'公开测试片',ext:{}}]});setCards([demoCard]);setStatus('公开 HLS 测试流，可用来检查浏览器和网络。');setLoading(false);return;}
    setLoading(true);setStatus('正在下载并加载扩展…');
    let settings=custom||{};
    if(!custom)try{settings=JSON.parse(sessionStorage.getItem('xptv-config:'+next.id)||'{}');}catch{}
    const c=new ExtensionClient(next.id);client.current=c;
    try{
      const result=await c.load(next.path,settings);if(gen!==generation.current)return;
      setConfig(result);setStatus('扩展已加载，正在获取内容…');
      if(result.tabs?.length){const items=await c.call<{list:Card[]}>('getCards',{...result.tabs[0].ext,page:1});if(gen!==generation.current)return;setCards(items.list||[]);setStatus(items.list?.length?`已加载 ${items.list.length} 个条目`:'此分类暂未返回内容，可尝试搜索或切换视频源。');}
      else setStatus('此源没有分类，可尝试搜索。');
    }catch(e){if(gen===generation.current){setError(message(e));setStatus('视频源加载失败，可以重新加载或换源。');}}
    finally{if(gen===generation.current)setLoading(false);}
  }
  async function loadList(cat:number,nextPage=1,term=''){
    if(source.id==='demo'){setCards(!term||demoCard.vod_name.toLowerCase().includes(term.toLowerCase())?[demoCard]:[]);setSearchTerm(term);setPage(1);return;}
    if(!client.current)return;
    const gen=generation.current;setLoading(true);setError('');setCategory(cat);setPage(nextPage);setSearchTerm(term);
    try{const result=await client.current.call<{list:Card[]}>(term?'search':'getCards',term?{text:term,page:nextPage}:{...config.tabs?.[cat]?.ext,page:nextPage});if(gen!==generation.current)return;setCards(result.list||[]);setStatus(`已加载 ${result.list?.length||0} 个条目`);}
    catch(e){if(gen===generation.current){setCards([]);setError(message(e));}}
    finally{if(gen===generation.current)setLoading(false);}
  }
  async function openCard(card:Card){
    const gen=generation.current;const sel=++selection.current;setSelected(card);setGroups([]);setEpisode(-1);setPlayInfo(null);setLine('0');setGroup('0');setBusy(true);setError('');setPlayError('');setStatus('正在获取剧集…');
    playerSection.current?.scrollIntoView({behavior:'smooth',block:'start'});
    try{
      if(source.id==='demo'){setGroups([{title:'公开测试流',tracks:[{name:'播放测试',ext:{url:TEST_URL}}]}]);setStatus('测试片已就绪，点击“播放测试”。');return;}
      const result=await client.current!.call<{list:TrackGroup[]}>('getTracks',card.ext||{});if(gen!==generation.current||sel!==selection.current)return;
      setGroups((result.list||[]).filter(g=>Array.isArray(g.tracks)));setStatus(result.list?.some(g=>g.tracks?.length)?'剧集已加载，选择一集播放。':'此条目未返回剧集，源站结构可能已变化。');
    }catch(e){if(gen===generation.current&&sel===selection.current)setError(message(e));}
    finally{if(gen===generation.current&&sel===selection.current)setBusy(false);}
  }
  async function playTrack(track:Track,index:number){
    if(track.pan){setStatus('这是网盘分享资源，请通过下方链接在对应网盘打开。');setEpisode(index);setPlayInfo(null);return;}
    const gen=generation.current;const sel=selection.current;setBusy(true);setEpisode(index);setPlayError('');setError('');setPlayInfo(null);setStatus('正在解析播放地址…');
    try{
      const result=source.id==='demo'?{urls:[TEST_URL]}:await client.current!.call<PlayInfo>('getPlayinfo',track.ext||{});
      if(gen!==generation.current||sel!==selection.current)return;
      if(!Array.isArray(result.urls)||!result.urls.length)throw new Error('未解析到播放地址。此源可能已失效、需要原生嗅探或网盘登录。');
      if(result.urls.some(u=>typeof u!=='string'||!safeHttp(u)))throw new Error('源返回非 HTTP 播放地址，网页版暂不支持此协议。');
      setPlayInfo(result);setLine('0');setStatus(`已解析 ${result.urls.length} 条播放线路`);
    }catch(e){if(gen===generation.current&&sel===selection.current)setPlayError(message(e));}
    finally{if(gen===generation.current&&sel===selection.current)setBusy(false);}
  }
  function showModal(name:typeof modal){setModalError('');setImportList([]);if(name==='config'){try{setConfigText(sessionStorage.getItem('xptv-config:'+source.id)||'{}');}catch{setConfigText('{}');}}setModal(name);}
  async function addSource(path:string,name?:string){
    setImportBusy(true);setModalError('');
    try{
      const r=await fetch('/api/source?'+new URLSearchParams({path}),{signal:AbortSignal.timeout(25000)});const data=await r.json() as {error?:string;path?:string;sites?:{name:string;ext:string}[]};if(!r.ok)throw new Error(data.error);
      if(data.sites){setImportList(data.sites.filter((s:any)=>typeof s.ext==='string'&&typeof s.name==='string'));if(!data.sites.length)throw new Error('订阅中没有可用条目');return;}
      const normalized=data.path as string;const id=normalized;
      const next={id,path:normalized,name:name||normalized.split('/').pop()!.replace('.js',''),kind:'导入的 XPTV 扩展'};
      const items=allSources.some(s=>s.path===normalized)?allSources:[...allSources,next];setAllSources(items);
      try{localStorage.setItem('xptv-sources',JSON.stringify(items.filter(s=>!sources.some(x=>x.id===s.id))));}catch{}
      setModal(null);await activate(items.find(s=>s.path===normalized)||next);
    }catch(e){setModalError(message(e));}finally{setImportBusy(false);}
  }
  function saveConfig(){try{const value=JSON.parse(configText);if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('请填写 JSON 对象');sessionStorage.setItem('xptv-config:'+source.id,JSON.stringify(value));setModal(null);void activate(source,value);}catch(e){setModalError('配置保存失败：'+message(e));}}
  function playDirect(){try{
    const url=directURL.trim();if(!safeHttp(url))throw new Error('请填写完整的 HTTP/HTTPS 媒体地址');
    // Invalidate pending source calls before switching to a manually supplied video.
    generation.current++;client.current?.stop();client.current=null;setLoading(false);setBusy(false);resetPlayer();setSource({id:'direct',name:'链接播放',kind:'手动媒体地址',path:''});setConfig({title:'链接播放',tabs:[]});setCards([]);setSelected({vod_id:'direct',vod_name:'链接播放'});setPlayInfo({urls:[url]});setError('');setStatus('媒体地址已载入');setModal(null);
  }catch(e){setModalError(message(e));}}
  async function copyURL(){try{await navigator.clipboard.writeText(currentURL);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{setModalError('复制失败，请手动选中地址复制。');}}
  const pan=currentTracks[episode]?.pan;
  return <div className="shell">
      <header className="topbar"><a className="brand" href="/" aria-label="映流首页"><span className="brand-mark"><Play size={21} fill="currentColor"/></span>映流</a><span className="top-note">在线播放器</span><div className="top-actions"><Button variant="ghost" onClick={()=>showModal('direct')}><Link2 size={16}/>链接播放</Button></div></header>
    <div className="workspace">
      <aside><div className="side-title"><h2>我的视频源</h2><span className="eyebrow">{String(allSources.length).padStart(2,'0')}</span></div><label className="source-filter"><Search size={15}/><input aria-label="筛选视频源" value={sourceQuery} onChange={e=>setSourceQuery(e.target.value)} placeholder="筛选视频源…"/></label><nav className="source-list" aria-label="视频源">{visibleSources.map(s=>{const i=allSources.indexOf(s);return <button key={s.id} className={'source-button '+(source.id===s.id?'active':'')} onClick={()=>void activate(s)} aria-current={source.id===s.id?'true':undefined}><span className="source-icon">{/^(bililive|douyu|huya|nmlive)$/.test(s.id)?<Radio size={15}/>:String(i+1).padStart(2,'0')}</span><span className="source-label">{s.name}<small>{s.kind}</small></span>{source.id===s.id&&<ChevronRight size={15}/>}</button>})}{!visibleSources.length&&<p className="source-empty">没有匹配的视频源</p>}</nav><div className="side-foot">播放器当前仅内置黄果短剧维护版扩展。<br/>脚本和更新记录：<br/><a href="https://github.com/ppvia/huangguo-xptv-extension/blob/main/js/huangguo.js" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-3">查看黄果解析脚本 <ArrowUpRight size={13}/></a></div></aside>
      <main className="content">
        <div className="section-head"><div><div className="eyebrow">WATCH / EXPLORE</div><h1>{config.title||source.name}</h1><p className="subtle">{source.id==='demo'?'先检查播放，再探索视频源':source.kind}</p></div><form className="search" onSubmit={e=>{e.preventDefault();if(!loading)void loadList(category,1,query.trim());}}><Search size={18} color="#929ba9"/><input aria-label="搜索影片" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索影片、剧名…"/><button aria-label="开始搜索" disabled={loading||source.id==='direct'}><ChevronRight size={20}/></button></form></div>
        <section className="stage" ref={playerSection} aria-label="在线播放器"><div className="stage-grid"><div className="screen">{currentURL?<video ref={video} controls playsInline preload="metadata" onEnded={()=>{if(episode>=0&&episode<currentTracks.length-1)void playTrack(currentTracks[episode+1],episode+1);}}/>:<div className="screen-empty"><div className="play-circle">{busy?<LoaderCircle className="animate-spin" size={25}/>:<Play size={27} strokeWidth={1.5}/>}</div><h2>{busy?'正在解析…':selected?'选择一集，开始观看':'你的下一场好戏，从这里开始'}</h2><p>{selected?'剧集和播放线路会显示在选集区。':'从下方选择影片，或粘贴已有的媒体链接。支持 HLS 和 MP4 在线播放。'}</p>{!selected&&<Button variant="outline" className="mt-5" onClick={()=>showModal('direct')}><Link2 size={15}/>粘贴播放链接</Button>}</div>}</div><div className="episodes"><div className="episodes-head"><Layers size={16}/><span>选集</span><span className="subtle ml-auto">{currentTracks.length?`${currentTracks.length} 集`:''}</span></div>{groups.length>1&&<Select disabled={busy} value={group} onValueChange={v=>{selection.current++;setGroup(v);setEpisode(-1);setPlayInfo(null);}}><SelectTrigger className="w-full" aria-label="选择剧集分组"><SelectValue/></SelectTrigger><SelectContent>{groups.map((g,i)=><SelectItem value={String(i)} key={i}>{g.title||`分组 ${i+1}`}</SelectItem>)}</SelectContent></Select>}{currentTracks.length?<div className="episode-grid">{currentTracks.map((t,i)=><button disabled={busy} key={i} className={episode===i?'active':''} onClick={()=>void playTrack(t,i)}>{t.name||`第 ${i+1} 集`}</button>)}</div>:<p className="episodes-empty">{busy?'正在获取剧集…':selected?'未获取到剧集，可尝试其他影片或视频源。':'选择影片后，在这里查看剧集与线路。'}</p>}</div></div><div className="player-bar"><div className="now-title">{selected?.vod_name||'尚未选择影片'}<small>{currentURL?videoState:'等待播放'}</small></div>{playInfo&&playInfo.urls.length>1&&<Select value={line} onValueChange={setLine}><SelectTrigger aria-label="播放线路"><SelectValue/></SelectTrigger><SelectContent>{playInfo.urls.map((_,i)=><SelectItem key={i} value={String(i)}>线路 {i+1}</SelectItem>)}</SelectContent></Select>}{currentURL&&<Button size="sm" variant="ghost" onClick={()=>showModal('url')}><Link2 size={15}/>播放地址</Button>}<span className="text-sm text-muted-foreground">源站直连</span></div></section>
        {playError&&<div role="alert" className="error-banner">{playError}{currentTracks[episode]&&!busy&&<Button variant="ghost" size="sm" onClick={()=>void playTrack(currentTracks[episode],episode)}>重新解析</Button>}</div>}
        {pan&&<div className="error-banner">此条目是网盘分享资源，网页版尚未接入网盘登录。{safeHttp(pan)?<a className="underline ml-3" href={pan} target="_blank" rel="noreferrer">打开网盘分享 ↗</a>:<span>分享地址无效。</span>}</div>}
        <section className="catalog"><div className="catalog-head"><h2>{searchTerm?`“${searchTerm}” 的搜索结果`:'浏览内容'} <span className="subtle ml-2">{cards.length?`${cards.length} 个条目`:''}</span></h2><div className="flex gap-1"><Button aria-label="视频源配置" variant="ghost" size="icon" disabled={source.id==='demo'||source.id==='direct'} onClick={()=>showModal('config')}><Settings2 size={18}/></Button><Button variant="ghost" size="sm" disabled={loading||source.id==='direct'} onClick={()=>void activate(source)}><RefreshCw size={15} className={loading?'animate-spin':''}/>重新加载</Button></div></div>
          {!!config.tabs?.length&&<div className="categories" aria-label="影片分类">{config.tabs.map((t,i)=><button disabled={loading} key={i} className={category===i&&!searchTerm?'active':''} onClick={()=>{setQuery('');void loadList(i);}}>{t.name}</button>)}</div>}
          {error&&<div className="error-banner" role="alert">{error}</div>}
          <p className="status-line" role="status">{loading?'正在加载，请稍候…':status}</p>
          {loading?<div className="loading-grid">{Array.from({length:5},(_,i)=><Skeleton key={i} className="skeleton-poster"/>)}</div>:cards.length?<div className="cards">{cards.map((card,i)=><button className="movie" key={card.vod_id+'-'+i} onClick={()=>void openCard(card)}><Poster card={card}/><h3 title={card.vod_name}>{card.vod_name}</h3><p>{card.vod_remarks||card.vod_duration||'点击查看剧集'}</p></button>)}</div>:<div className="empty-catalog"><SquarePlay className="mx-auto" size={28}/><strong>{searchTerm?'没有找到匹配内容':'还没有可展示的内容'}</strong><p>尝试其他分类、关键词或视频源。部分扩展依赖原生功能，可能无法在网页中运行。</p></div>}
          {source.id!=='demo'&&source.id!=='direct'&&<div className="pagination"><Button size="sm" variant="outline" disabled={page<=1||loading} onClick={()=>void loadList(category,page-1,searchTerm)}><ChevronLeft size={15}/>上一页</Button><span>第 {page} 页</span><Button size="sm" variant="outline" disabled={!cards.length||loading} onClick={()=>void loadList(category,page+1,searchTerm)}>下一页<ChevronRight size={15}/></Button></div>}
        </section>
        <footer className="footer"><span>映流 / XPTV WEB PLAYER</span><span>网页源 · 接口源 · HLS / MP4　|　源站可用性独立于播放器</span></footer>
      </main>
    </div>
    <Dialog open={modal!==null} onOpenChange={open=>{if(!open)setModal(null);}}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{modal==='import'?'添加视频源':modal==='config'?'视频源配置':modal==='direct'?'链接播放':'播放地址'}</DialogTitle><DialogDescription>{modal==='import'?'导入 Yswag/xptv-extensions 仓库内的 JS 脚本或 JSON 订阅。':modal==='config'?'配置仅保存在当前浏览器会话，切换设备需要重新填写。':modal==='direct'?'粘贴你可访问的 HLS（m3u8）或 MP4 媒体地址。':'这是视频源解析得到的原始地址，可能有时效限制。'}</DialogDescription></DialogHeader>
      {modal==='import'&&<><label className="form-label" htmlFor="source-url">脚本或订阅地址</label><input id="source-url" className="form-input" value={importURL} onChange={e=>setImportURL(e.target.value)} placeholder="完整的 GitHub Raw 地址"/><p className="form-help">也可输入公开订阅地址，读取后选择要添加的源。扩展使用独立线程运行；原生网页嗅探、网盘登录和部分专用 API 暂不支持。</p>{importList.length>0&&<div className="bank-list">{importList.map((s,i)=><button key={i} disabled={importBusy} onClick={()=>void addSource(s.ext,s.name)}>{s.name} <span className="float-right">添加 +</span></button>)}</div>}<div className="form-actions"><Button disabled={importBusy||!importURL.trim()} onClick={()=>void addSource(importURL.trim())}>{importBusy?<LoaderCircle size={16} className="animate-spin"/>:<Plus size={16}/>}读取并添加</Button></div></>}
      {modal==='config'&&<><label className="form-label" htmlFor="source-config">自定义配置（JSON）</label><textarea id="source-config" rows={7} className="form-input font-mono" value={configText} onChange={e=>setConfigText(e.target.value)}/><p className="form-help">小雅示例：{'{"url":"https://你的小雅域名","token":"可选令牌"}'}。服务器中转不访问本机和内网；请使用可访问的公开 HTTPS 域名。</p><div className="form-actions"><Button onClick={saveConfig}>保存并重新加载</Button></div></>}
      {modal==='direct'&&<><label className="form-label" htmlFor="media-url">媒体地址</label><input id="media-url" className="form-input" value={directURL} onChange={e=>setDirectURL(e.target.value)} placeholder="https://…/video.m3u8"/><p className="form-help">浏览器直接请求此地址。网页登录页、网盘分享页不能作为媒体地址直接播放。</p><div className="form-actions"><Button onClick={playDirect}><Play size={16}/>开始播放</Button></div></>}
      {modal==='url'&&<><p className="raw-url">{currentURL}</p><div className="form-actions"><Button variant="outline" onClick={()=>void copyURL()}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'已复制':'复制地址'}</Button><Button asChild><a href={currentURL} target="_blank" rel="noreferrer">打开原始地址<ArrowUpRight size={15}/></a></Button></div></>}
      {modalError&&<p className="error-banner" role="alert">{modalError}</p>}
    </DialogContent></Dialog>
  </div>;
}
