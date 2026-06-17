# 道丹元企业官网

道丹元品牌官方网站，含前台静态站与内容管理后台（CMS）。前台支持新闻、Banner、网站设置、在线留言等动态内容；后台可配置 SEO、统计代码、联系信息与页脚信息。

## 技术栈

- 前台：原生 HTML / CSS / JavaScript + Vite 6 多页构建
- 后台：Express 5 + JSON 文件存储
- 部署：Node 统一托管静态站与 API，可选 Docker + Nginx

## 页面结构

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `index.html` | 轮播 Banner、企业简介、产品矩阵、新闻精选 |
| 关于我们 | `about.html` | 公司简介、团队、文化、社会责任 |
| 产品中心 | `products.html` | 九解丹全系产品、理念与品质标准 |
| 创新技术 | `technology.html` | 研发、配方、工艺、检测体系 |
| 新闻动态 | `news.html` | 企业新闻、品牌活动、行业资讯、媒体报道 |
| 新闻详情 | `news-detail.html?id=文章ID` | 图文/视频混排正文 |
| 商务合作 | `business.html` | 合作模式、FAQ、咨询入口 |
| 联系我们 | `contact.html` | 联系方式、地图占位、在线留言 |

## 本地开发

```bash
npm install

# 终端 1：Vite 开发服（前台，/api 代理到后台）
npm run dev

# 终端 2：管理后台
npm run admin
```

- 前台：http://localhost:5173
- 后台：http://localhost:3000/admin

首次启动会自动创建 `data/admin.json`。开发环境默认账号见控制台输出；生产环境务必通过 `.env` 配置强密码。

## 构建与发布

```bash
# 同步 CMS 数据 → 生成 sitemap → 构建 dist
npm run build

# 生产启动（托管 dist + API + 后台）
npm start
```

**CMS 内容变更后**，在后台执行：

1. 对应模块「发布」（新闻 / Banner / 网站设置）
2. 线上使用静态包时，再执行「全部发布并构建静态站」

上传图片会写入 `public/images/uploads/`，并在有 `dist/` 时同步复制，无需重新构建即可访问。

## 生产部署

### 1. 环境变量

```bash
cp .env.example .env
# 编辑 .env，至少设置：
# ADMIN_PASSWORD、SESSION_SECRET、NODE_ENV=production
# HTTPS 部署时 COOKIE_SECURE=true
# SITE_URL=https://你的域名（用于 sitemap）
```

### 2. 直接部署（Node）

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

服务默认监听 `3000` 端口，提供：

- `/` — 官网静态站（`dist/`）
- `/admin` — 管理后台
- `/api/*` — 留言、统计、配置等接口
- `/health` — 健康检查

### 3. Docker 部署

```bash
cp .env.example .env
# 编辑 .env
docker compose up -d --build
```

数据持久化卷：

- `./data` — 新闻、Banner、设置、留言、管理员账号
- `./public/images/uploads` — 上传图片

**注意**：容器构建时会执行 `npm run build`。若在运行中修改 CMS 内容，需在后台「全部发布并构建」，或重新 `docker compose build` 后重启。

### 4. Nginx 反向代理

参考 [`deploy/nginx.conf.example`](deploy/nginx.conf.example)，建议：

- TLS 终止在 Nginx
- 限制 `/admin` 访问（IP 白名单或 VPN）
- 将 `X-Forwarded-Proto` 传给 Node

## 管理后台功能

- 新闻 / Banner 列表管理（上下线、排序、外链跳转）
- 在线留言（筛选、导出 CSV、状态管理）
- 网站设置（SEO、统计、联系信息、社交二维码、维护模式）
- 分模块发布 + 自动备份 + 静态站构建

## 目录说明

```
data/           CMS 源数据（news、banner、settings、messages）
js/             前台脚本与 sync 生成的 *-data.js
public/         静态资源、robots.txt、sitemap.xml
admin/          Express 后台服务与 CMS 界面
scripts/        数据同步、sitemap 生成、种子脚本
dist/           构建产物（git 忽略，部署前生成）
deploy/         Nginx 等部署示例
```

## 上线前检查清单

- [ ] 修改 `.env` 中的 `ADMIN_PASSWORD` 与 `SESSION_SECRET`
- [ ] 在后台配置真实联系信息、ICP 备案号、社交账号
- [ ] 清理测试内容并「全部发布并构建」
- [ ] 配置 HTTPS 与 `COOKIE_SECURE=true`
- [ ] 限制 `/admin` 外网访问或改用强密码 + 定期轮换
- [ ] 设置 `SITE_URL` 后重新 `npm run build` 生成正确 sitemap
- [ ] 配置百度统计 / Google Analytics（可选）

## 许可证

企业内部项目，未经授权请勿对外分发。
