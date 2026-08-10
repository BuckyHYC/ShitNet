# ShitNet

赛博终端风纯前端项目指引站，用于展示项目、直达 [MoronTown](https://moron-town.vercel.app)，并在页面角落链接到 GitHub。

## 本地运行

```bash
npm install
npm run dev
```

普通 `npm run dev` 不包含 `api/` 路由，页面会以 0 计数启动；联调后端请使用：

```bash
npx vercel dev
```

需要先在 Vercel 控制台给项目绑定 Upstash Redis 集成（自动注入 `UPSTASH_REDIS_REST_URL` 与 `UPSTASH_REDIS_REST_TOKEN`，也兼容旧的 `KV_REST_API_URL` / `KV_REST_API_TOKEN`）；本地可通过 `.env.local` 提供同样的变量。

## 构建与预览

```bash
npm run build
npm run preview
```

## 反馈与点击量存储

满意/不满意与项目卡片点击量使用 Upstash Redis 全局持久化：

- `GET /api/stats`：读取全局统计。
- `POST /api/vote`：满意/不满意每次点击 +1，不限制次数。
- `POST /api/click`：项目卡片点击量 +1。

统计只走云端全局计数，不提供本地降级模式；API 不可用时计数保持为 0。

## 部署

- Vercel：导入仓库后默认即可构建（`npm run build`，输出目录 `dist`），`api/` 目录会自动发布为 serverless functions；在项目设置中连接 Upstash Redis 集成即可自动注入连接变量（也可手动配置 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`）。
- Netlify：构建命令 `npm run build`，发布目录 `dist`；无 `api/` 时反馈与点击量不可用。
- GitHub Pages：需把 `vite.config.js` 中的 `base` 改为 `'/ShitNet/'`，再部署 `dist`；反馈与点击量不可用。

## 结构

- `api/`：Vercel serverless functions（统计、投票、点击）。
- `src/App.jsx`：页面结构与交互。
- `src/index.css`：终端风格样式。
- `index.html`：入口与字体加载。
