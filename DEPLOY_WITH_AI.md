# 给部署 AI 的任务说明

用户需要你将这个已经完成的网页播放器部署到用户自己的 Cloudflare 账户。请先阅读本文件和 README.md，保持现有功能和界面，不要从零重写项目。

## 当前交付状态

- 已完成 React 网页播放器：视频源切换、导入 JS/JSON 订阅、分类、搜索、分页、选集、线路切换、HLS/MP4 播放、直连/中转切换、播放地址复制、源配置。
- 已包含独立 Cloudflare 构建产物 `cloudflare-dist/`，可直接部署，无需 ChatGPT Sites。
- 已包含完整源码和依赖锁文件，可按需重新构建。
- 尚未部署到用户的 Cloudflare 账户。此前会话没有可调用的 Cloudflare 连接；本包不含任何账户令牌或登录凭据。
- 默认视频源为「播放测试」，使用公开 Big Buck Bunny HLS 测试流，并明确标注不是片库内容。

## 应使用的部署方式

Cloudflare Workers + Static Assets。Worker 负责远程源码获取、受限公开网络请求和流式媒体中转，静态资产负责页面。不需要数据库、R2、其他服务器或 XPTV 客户端。

请使用 `cloudflare/wrangler.jsonc`；不要使用 `.openai/hosting.json`，也不要把页面只上传为纯静态 Pages 后就报告成功。

## 最短步骤

1. 进入解压后的 `yingliu-xptv-player/`。
2. 确认 Node.js >=22.13，并执行 `npm ci`。
3. 通过用户已连接的 Cloudflare 工具或 `npx wrangler login` 确认账户。不要向用户索要明文 API Token 粘贴到聊天窗口。
4. 查看是否存在名为 `yingliu-xptv-player` 的 Worker。若已存在且无法确认是本项目，修改 `cloudflare/wrangler.jsonc` 的 `name`，避免覆盖无关项目。
5. 运行 `npm run deploy:cloudflare`。这会上传预构建页面和 Worker。未配置访问密码时返回 503，这是预期的默认保护。
6. 运行 `npx wrangler secret put PLAYER_ACCESS_KEY --config cloudflare/wrangler.jsonc`，让用户通过工具的安全凭据输入或 CLI 输入自己的访问密码。不要把密码写入源码、配置、日志或公开对话。
7. 返回 Cloudflare 实际生成的 workers.dev 地址；如用户有自定义域名，按授权再绑定。
8. 浏览器打开网址：HTTP Basic 用户名可填 `player`，密码为刚设置的值。中转接口也使用相同的登录保护。

如源码被修改，先执行：

```sh
npm run build:cloudflare
npm test
npm run typecheck
npx wrangler deploy --dry-run --config cloudflare/wrangler.jsonc
npm run deploy:cloudflare
```

`npm run build` 是附带的 Sites/Vinext 构建路径；部署到用户 Cloudflare 请使用 `build:cloudflare`，不要混淆两套输出目录。

## 部署后必须验证

- 网址返回真实页面，密码保护生效，静态脚本与 CSS 能加载。
- 默认「播放测试」：点击测试片卡片，再选择「播放测试」，检查视频真正开始播放、有声音、可拖动进度。
- 「添加视频源」可以导入 `js/duanjutt.js` 或 `subs/vod.json`；源码请求应成功，源站若失效需显示错误，不要伪造数据。
- 检查至少一个实时可用的普通视频源，完成分类、搜索或列表、选集、解析与播放。若源站被封禁/返回空页面，应明确标记该源不可用，而不是反复重写整个播放器。
- 检查手机和桌面布局、选集滚动、切换源时停止旧请求、切换视频时销毁旧 HLS 实例。

## 已完成的验证（不等于所有源实测）

1. Sites/Vinext 生产构建通过。
2. Cloudflare 独立 SPA + Worker 构建通过，Wrangler 部署 dry-run 通过。
3. TypeScript 类型校验通过。
4. 十项接口/运行时检查通过：HLS 子清单/分片/密钥 URI 重写、Range 透传、私网 URL 和危险协议拒绝、重定向目标检查、响应大小限制、跨站请求拒绝、媒体错误、字符串响应约定、独立线程接口流程等。
5. 仓库未修改的 `duanjutt.js`、`xingya.js`、`bililive.js` 在模拟上游响应下跑通分类→列表→选集→播放地址；`anfuns.js` 加载通过。用于检查的临时脚本不随包分发，可从原仓库重新下载后运行 `scripts/check-repository-scripts.mjs`。
6. 实际网络请求验证：GitHub 源码下载 HTTP 200；公开 HLS 测试流主清单、子清单、媒体分片 HEAD 均 HTTP 200。此项验证了中转网络链路，未进行真实浏览器视听测试。

## 已知限制

- 不承诺仓库每个 JS 都兼容。原生 WebView 嗅探、未实现的 XPTV 专用 API、网盘登录/转存暂不支持。
- 网盘源显示分享链接；这不是可直接播放的媒体 URL。
- 部分网站存在验证码、失效域名、令牌变化、加密封面或编码不兼容。页面会显示错误或封面占位，不应伪造真实影片数据。
- 小雅配置必须使用可访问的公开域名，服务器拒绝内网、IP 字面量及非标准端口。
- HLS 前端根据 `.m3u8` URL 识别；无后缀的 HLS 需另行适配。仅改后缀不能代替确认真实媒体类型。
- 不支持 DRM 解密、付费解锁或绕过登录。
- HLS/MP4 中转消耗 Cloudflare 请求和媒体传输资源，部署前确认账户计划允许此用途。默认密码保护不要删除，也不要将接口变成匿名开放代理。

## 代码入口

- UI：`app/player-app.tsx`、`app/globals.css`
- 扩展宿主：`runtime/extension-worker.js`、`lib/extension-client.ts`
- 网络/媒体：`lib/player-api.ts`
- Cloudflare：`cloudflare/worker.ts`、`cloudflare/wrangler.jsonc`
- 构建：`scripts/build-runtime.mjs`、`scripts/build-cloudflare.mjs`

上游仓库：https://github.com/Yswag/xptv-extensions

不要把测试片、模拟响应校验、构建或 dry-run 成功说成所有视频源已可在线播放。最终只报告亲自验证的结果和真实部署 URL。
