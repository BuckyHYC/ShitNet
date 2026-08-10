# ShitNet

赛博终端风纯前端项目指引站，用于展示项目、直达 [MoronTown](https://moron-town.vercel.app)，并在页面角落链接到 GitHub。

## 本地运行

```bash
npm install
npm run dev
```

## 构建与预览

```bash
npm run build
npm run preview
```

## 反馈存储

点赞/不满意使用 `localStorage` 键 `shitnet_feedback_v1` 保存，数据只存在当前浏览器，不会上传到任何后端。

## 部署

- Vercel：导入仓库后默认即可构建（`npm run build`，输出目录 `dist`）。
- Netlify：构建命令 `npm run build`，发布目录 `dist`。
- GitHub Pages：需把 `vite.config.js` 中的 `base` 改为 `'/ShitNet/'`，再部署 `dist`。

## 结构

- `src/App.jsx`：页面结构与交互。
- `src/index.css`：终端风格样式。
- `index.html`：入口与字体加载。
