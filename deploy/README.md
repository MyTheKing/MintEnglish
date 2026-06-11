# 部署说明

应用是**纯静态站点**（前端 SPA，无后端）。用 **HashRouter**（路由形如 `/#/reading`），所以放到任何静态服务器都能直接跑，**无需** SPA history 回退重写规则。`vite.config.ts` 里 `base: './'`（相对路径），因此放在**根域名**或**子路径**（如 `https://站点/app/`）都正常。

## 一、构建产物

```bash
npm ci          # 首次/CI 环境装依赖
npm run build   # 产物输出到 dist/
```

`dist/` 即可部署的全部内容。本地预览：`npm run preview`。

## 二、三种部署方式（任选）

### 方式 A · 纯静态托管平台（最省事）
Vercel / Netlify / GitHub Pages / 阿里云 OSS / 腾讯云 COS 等：
- 构建命令 `npm run build`，发布目录 `dist`。
- 把 `dist/` 内容整包上传即可，无需额外配置。

### 方式 B · 自有服务器 + Nginx（VPS）
1. 本地 `npm run build`，把 `dist/` 内容拷到服务器，例如 `/var/www/mint-english`。
2. 用 `deploy/nginx.conf`（改其中 `server_name` 和 `root`），放到 `/etc/nginx/conf.d/`。
3. `nginx -t && systemctl reload nginx`。

### 方式 C · Docker（一条命令起站）
```bash
docker build -t mint-english .
docker run -d -p 8080:80 --name mint-english mint-english
# 访问 http://服务器IP:8080
```
镜像内置 `deploy/nginx.docker.conf`，多阶段构建，最终镜像只含 Nginx + 静态产物。

## 三、本次为部署做的整理

- `public/` 里约 24MB 参考素材（参考视频 mp4/gif、`菜单栏.png`、`spatial - 副本`）已移到 `doc/reference-assets/`（未删除，但不再进入构建产物）。
- 词源精简为**仅** `data/ogden.json`（850 词），移除了 31 万词的 `ecdict.json` 兜底；主包随之减小。
- `public/illustrations/` 10 张配图从 PNG（共约 12MB）转为 WebP 并缩到 768px（共约 120KB，省 99%）。
- 构建分包：`react` / `motion` / `viz` 各自独立 chunk，利于浏览器缓存。
- 新增 `.gitignore` / `.dockerignore`；清掉根目录误生成的编译产物。

## 四、可选的后续优化

- `data/ogden.json`（约 1.5MB）目前打进 JS 包。若想进一步减小首包，可改为构建期放进 `public/` 并在运行时 `fetch` 异步加载（需改 `src/lib/dictionary.ts` 为异步初始化）。
- 面向中国大陆访问，可考虑把 `index.html` 里的 Google Fonts 改为自托管，避免字体 CDN 被墙导致字体回退。
