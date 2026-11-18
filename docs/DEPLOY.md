# 部署说明 · mindulle 4D 体验馆

本工程是纯前端静态站点，构建产物为 `dist/`。可以部署到任意静态服务器、对象存储、Docker 或 Serverless 平台。

## 1. 环境要求

| 项目 | 要求 |
| --- | --- |
| Node.js | 18.0 或更高（推荐 20 LTS） |
| npm | 9+ |
| 内存 | 构建建议 1 GB 以上 |
| 浏览器 | 支持 WebGL2 的现代浏览器（Chrome / Edge / Safari / Firefox） |

## 2. 本地构建

```bash
npm install
VITE_WS_URL=off npm run build
```

Windows PowerShell：

```powershell
npm install
$env:VITE_WS_URL="off"; npm run build
```

构建完成后，`dist/` 目录即完整站点：

```text
dist/
├── index.html
├── favicon.svg
└── assets/
    ├── index-*.js
    ├── index-*.css
    ├── audio/
    ├── models/
    └── tex/
```

本地检查生产包：

```bash
npm run preview
# 默认 http://localhost:4173
```

## 3. 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `VITE_WS_URL` | `ws://localhost:8080` | 多人 WebSocket 地址；设为 `off` 表示纯前端单人模式 |
| `VITE_API_BASE` | 空 | 许愿文云端接口前缀；留空时许愿文仅存浏览器本地 |
| `VITE_PAYMENT_GATEWAY` | 空 | 支付网关后端地址；留空时体验券仅记录意向，不发起扣款 |

注意：Vite 的环境变量在**构建时**注入，不是运行时读取。修改 `VITE_WS_URL` 后必须重新执行 `npm run build`。

纯静态托管、没有 WS 服务时，务必使用 `VITE_WS_URL=off`，否则浏览器会尝试连接默认地址并在控制台产生连接失败信息。

## 4. Nginx 部署

仓库自带 [`nginx.conf`](../nginx.conf)。最小步骤：

```bash
npm install
VITE_WS_URL=off npm run build

sudo mkdir -p /var/www/mindulle-ansimdang-3d
sudo cp -r dist/* /var/www/mindulle-ansimdang-3d/

sudo cp nginx.conf /etc/nginx/conf.d/mindulle-ansimdang-3d.conf
sudo nginx -t
sudo systemctl reload nginx
```

访问 `http://服务器地址/`。

### 关键点

- `try_files $uri $uri/ /index.html;` 保证入口页始终可回退。
- `dist/assets/*` 带内容哈希，配置一年强缓存与 `immutable`。
- `index.html` 不缓存，发版后立即生效。
- 如果部署在子目录（如 `/care/`），`base: './'` 会自动使用相对路径，无需改构建配置。
- 站点需要 HTTPS 时，在 Nginx 前置证书配置；音频播放要求用户首次交互后解锁，与协议无关。

## 5. Docker 部署

仓库自带多阶段 [`Dockerfile`](../Dockerfile)：

```bash
docker build -t mindulle-ansimdang-3d .
docker run -d --name mindulle-ansimdang-3d -p 8080:80 --restart unless-stopped mindulle-ansimdang-3d
```

访问 `http://localhost:8080`。

镜像内：

- 构建阶段：`node:20-alpine`，`npm ci` + `VITE_WS_URL=off npm run build`
- 运行阶段：`nginx:1.27-alpine`，只保留 `dist/` 静态文件
- 已配置健康检查

查看日志：

```bash
docker logs -f mindulle-ansimdang-3d
```

## 6. 其他静态平台

| 平台 | 配置 |
| --- | --- |
| GitHub Pages | 把 `dist/` 推到 `gh-pages` 分支；`base: './'` 可直接在子路径访问 |
| Netlify | Build command: `VITE_WS_URL=off npm run build`；Publish directory: `dist` |
| Vercel | Framework: Vite；Build: `npm run build`；Output: `dist`；环境变量 `VITE_WS_URL=off` |
| 对象存储（OSS / COS / S3） | 上传 `dist/` 全部文件，`index.html` 设为默认首页；静态网站模式开启 |
| CDN | 回源到上面的静态站点；`index.html` 短缓存，`/assets/*` 长缓存 |

## 7. 可选：多人 WebSocket 服务

单人静态部署不需要服务端。需要多人同房间时：

```bash
# 1. 启动 WS 服务（默认 8080）
npm run server

# 2. 用线上 WS 地址重新构建前端
VITE_WS_URL=wss://your-domain/ws npm run build
```

生产环境建议：

- 用 Nginx / 云负载均衡把 `/ws` 反代到 WS 服务，并升级 `Upgrade` / `Connection` 头。
- 为 WS 服务配置进程守护（systemd / pm2 / Docker）。
- 如跨域，确保反向代理同域，避免混合内容（HTTPS 页面不能连 `ws://`，必须 `wss://`）。

Nginx 反代示例：

```nginx
location /ws {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
}
```

## 8. 整合到现有网站 mindulle.kr

本寺院最终并入现有站 **https://www.mindulle.kr/**（WordPress/PHP）。前端是纯静态 `dist/`，不依赖 PHP 运行时，两种挂接方式二选一。

### 方式 A：静态子目录（推荐，体验最好）

1. 本地 `VITE_WS_URL=off npm run build` 生成 `dist/`。
2. 把 `dist/` 全部文件上传到 mindulle.kr 服务器的子目录，例如 `https://www.mindulle.kr/care/`。
3. 工程 `base: './'` 使用相对路径，子目录下无需改构建配置；确保该目录由 Nginx/Apache 直接托管静态文件，不要走 WordPress 的 PHP 路由。
4. 在 mindulle.kr 菜单或页面加入口链接指向 `/care/`。

### 方式 B：iframe 嵌入

在 WordPress 页面里插入（src 指向静态站点或子目录地址）：

```html
<iframe
  src="https://www.mindulle.kr/care/"
  style="width:100%;height:100vh;border:0;"
  allow="autoplay; fullscreen; xr-spatial-tracking"
  title="민들레 안심당 · Mindulle"
></iframe>
```

iframe 内 WebGL、触控、音频均可正常工作；注意父页面需 HTTPS，避免混合内容。

### 后续在 mindulle.kr 服务器侧对接的预留项

前端已留好接口位，本轮不接真实后端：

| 能力 | 前端预留 | 服务端需要提供 |
| --- | --- | --- |
| 云端许愿文 | `src/api/wishes.ts`，`POST {VITE_API_BASE}/api/wishes` | 保存许愿文的接口与存储；未配置时降级浏览器本地 |
| 韩国收款（Toss 等） | `src/api/payment.ts`，`createDonation()` 返回订单/跳转地址 | 后端签发支付订单、对接 Toss Payments、处理回调对账；前端不存密钥、不直接扣款 |
| 多人同寺 | `VITE_WS_URL` | WebSocket 房间服务（见第 7 节） |

对接时在构建前配置对应环境变量并重新 `npm run build`。

## 9. 验证清单

部署后依次检查：

1. 打开首页，入口页与 108 珠光环正常显示。
2. 点击 `체험관 열기`，4D 体验馆在 3 秒内出现，无白屏。
3. `WASD` / 方向键可移动，拖拽可旋转，滚轮可缩放。
4. 点击 `구슬` 打开轮盘，点按或拖动后计数增加。
5. `손 모으기` 1.5 秒后自动结束；`예 갖추기` 可起身；`나무북` 有动作与音效。
6. 右上角喇叭可静音 / 恢复。
7. 手机竖屏打开，动作栏不溢出，轻触地面可移动。
8. 浏览器控制台无持续报错。

## 10. 常见问题

**白屏 / 资源 404**

- 确认部署的是整个 `dist/`，不是只上传 `index.html`。
- 子目录部署不要手改 `index.html` 里的资源路径，`base: './'` 已处理。
- Nginx 静态根目录必须指向 `dist/` 的内容，而不是仓库根目录。

**页面能开但 画面黑屏**

- 浏览器需支持 WebGL2；远程桌面 / 老显卡可能只支持软件渲染。
- 检查是否禁用了硬件加速；Chrome 打开 `chrome://gpu` 查看 WebGL 状态。
- 控制台若有 `WebGL context lost`，刷新页面即可。

**没有声音**

- 浏览器要求用户交互后才能播放音频；先点击页面任意位置或进入按钮。
- 检查右上角喇叭是否处于静音；入口页 `소리 켜짐` 状态。
- 确认 `dist/assets/audio/` 已上传。

**多人模式连不上**

- 纯静态部署必须 `VITE_WS_URL=off`。
- 使用 `wss://` 而不是 `ws://`（HTTPS 页面）。
- 检查反向代理的 `Upgrade` 头与防火墙端口。

## 11. 测试与截图

```bash
npm test           # 16 项逻辑测试
npm run test:e2e   # 14 项浏览器验收
npm run build
npm run screenshots
```

详细结果见 [`TEST-REPORT.md`](TEST-REPORT.md)。
