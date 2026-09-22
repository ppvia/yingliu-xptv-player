# 映流 · XPTV Web Player

映流是一个面向黄果短剧维护版扩展的网页播放器。内置视频源只有黄果短剧，提供分类、搜索、翻页、剧集分组、选集、线路选择、HLS/MP4 播放、链接播放、原始地址复制和 JSON 配置。

## 怎么用

首次打开会自动加载黄果短剧维护版扩展，页面加载分类和片单。选择影片、剧集即可解析并播放。中转播放用于处理 CORS、Referer 等请求头；遇到失败可切换直连、重新解析或使用“链接播放”手动粘贴地址。

## 架构和支持边界

- `app/player-app.tsx`：React 页面和 HLS.js 播放器。
- `runtime/extension-worker.js`：独立 Web Worker，提供 `$fetch`、axios 别名、Cheerio、CryptoJS、`argsify/jsonify`、`$cache`、`$config_str`、提示函数，以及五个 XPTV 入口。每次运行最多 60 秒，超时终止线程。
- `lib/player-api.ts`：Cloudflare 服务端抓取和媒体中转；支持 HLS 子清单、分片、密钥 URI 重写，Range 请求，以及手动重定向验证。
- `cloudflare/`：直接部署到用户 Cloudflare 账户的独立 SPA + Worker，不依赖 Sites 服务。
- `worker/index.ts`：Sites/Vinext 的同一业务接口入口。

黄果短剧使用维护版扩展仓库 <https://github.com/ppvia/huangguo-xptv-extension>。播放器的 `/api/image` 会保留图片 CDN 的签名参数并用站点使用的 AES-CBC 参数解密封面；视频仍通过受保护的 `/api/media` 中转，HLS 清单中的分片和密钥 URI 会继续重写到播放器域名。

兼容性不是“所有 JS 都能运行”：依赖 XPTV 原生 WebView 嗅探、专用插件、浏览器 Cookie 持久化和其他未实现宿主 API 的源可能失败；网盘源提供分享链接，不实现网盘登录、转存或解锁。小雅需公开 HTTPS 域名；本机/内网 IP 与自定义端口不走中转。源站封禁、验证码、过期接口、加密封面、DRM 或浏览器不支持的视频编码不会由本项目自动解决。HLS 通过 .m3u8 URL 识别，无扩展名的 HLS 地址可能需要手动适配。

扩展配置和缓存仅存浏览器 sessionStorage，不上传配置到数据库。执行扩展会按其逻辑向源站发送请求。中转不提供任意协议或私网访问。媒体以流式响应转发，不整体缓存到 Worker 内存。

## 本地构建

Node.js 22.13+：

```sh
npm ci
npm run build:cloudflare
npm run test:player
```

完整 Sites/Vinext 构建（Linux）：`npm run build`。

## 部署到自己的 Cloudflare

使用 Workers + Static Assets，页面和服务端接口一次部署。只有静态 Pages 托管无法完整承担请求头和媒体中转。

```sh
npx wrangler login
npm run build:cloudflare
npm run deploy:cloudflare
npx wrangler secret put PLAYER_ACCESS_KEY --config cloudflare/wrangler.jsonc
```

首次部署在未设置密码时返回 503，不会开放中转。最后一步通过 CLI 安全输入你自己的访问密码，不要写入仓库。打开 Wrangler 返回的 workers.dev 地址，用户名任意（如 player），密码为你设置的值。

如项目同名已存在，请先修改 `cloudflare/wrangler.jsonc` 的 `name`，避免覆盖其他项目。可在 Cloudflare Workers 设置中绑定自定义域名。网站默认有访问密码，媒体请求同样需要登录，不会作为匿名开放代理。

Cloudflare 计费和媒体传输适用账户的实际套餐与服务条款。本项目未修改任何账户设置。构建成功不代表已部署；须以 Wrangler 或 Cloudflare 后台成功结果及实际播放为准。

## 校验

`npm run test:player` 校验实际扩展的隔离运行协议（合成输入）、宿主 API、HTML 解析、HLS URI 重写、内网 URL 拒绝、媒体 Range 转发、上游错误和跨站请求拒绝。网络源是否可用需在部署环境逐个测试；本地测试不作可用性保证。

## 来源

扩展接口参考：https://github.com/Yswag/xptv-extensions

播放器库：https://github.com/video-dev/hls.js

公开播放测试流：https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

不包含第三方影片文件，不复制或发布仓库中的扩展源码。请仅播放你有权访问的内容。
