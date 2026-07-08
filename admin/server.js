/**
 * 管理后台服务
 */
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import multer from 'multer';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { readNews, writeNews, readBanner, writeBanner, readMessages, writeMessages, readSettings, writeSettings, ROOT } from './lib/storage.js';
import { publishModules, getPublishPreview, buildDistOnly, isPublishing } from './lib/publish.js';
import { ensureAdminUser } from './lib/auth.js';
import { validateUser, listUsers, createUser, updateUser, deleteUser, changePassword, toPublicUser, findUserById, SUPER_ROLE } from './lib/users.js';
import { appendAuditLog, auditFromRequest, queryAuditLogs } from './lib/audit-log.js';
import { normalizeSettings, getDefaultSettings } from './lib/site-settings.js';
import { readStats, recordPageview } from './lib/stats.js';
import { CONTACT_TYPES, filterMessages, messagesToCsv } from './lib/messages.js';
import { todayDateLocal } from './lib/date.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(ROOT, '.env') });

const PORT = Number(process.env.ADMIN_PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

ensureAdminUser();

/** 确保网站配置存在 */
function ensureSettings() {
  if (!readSettings()) {
    writeSettings(getDefaultSettings());
  }
}
ensureSettings();

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: null,
      },
    },
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: '登录尝试过于频繁，请稍后再试' },
});

const CONTACT_COOLDOWN_MS = 15 * 60 * 1000;

const contactLimiter = rateLimit({
  windowMs: CONTACT_COOLDOWN_MS,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    const reset = options.resetTime ? new Date(options.resetTime).getTime() : Date.now() + CONTACT_COOLDOWN_MS;
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    res.status(429).json({
      error: '15 分钟内只能提交一次留言，请稍后再试',
      retryAfter,
    });
  },
});

const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'too many' },
});

const LOGIN_PENALTY_WINDOW_MS = 20 * 60 * 1000;
const LOGIN_PENALTY_BASE_MS = 30 * 1000;
const LOGIN_PENALTY_MAX_MS = 10 * 60 * 1000;
/** @type {Map<string, { fails: number, blockedUntil: number, updatedAt: number }>} */
const loginPenaltyMap = new Map();

/**
 * @param {string} username
 * @param {string} ip
 * @returns {string}
 */
function getPenaltyKey(username, ip) {
  return `${username.toLowerCase()}@${ip}`;
}

/**
 * @param {string} key
 */
function getPenaltyState(key) {
  const now = Date.now();
  const state = loginPenaltyMap.get(key);
  if (!state) return null;
  if (now - state.updatedAt > LOGIN_PENALTY_WINDOW_MS) {
    loginPenaltyMap.delete(key);
    return null;
  }
  return state;
}

/**
 * @param {string} key
 */
function registerLoginFail(key) {
  const now = Date.now();
  const prev = getPenaltyState(key) || { fails: 0, blockedUntil: 0, updatedAt: now };
  const fails = prev.fails + 1;
  const lockMs = Math.min(LOGIN_PENALTY_BASE_MS * Math.max(1, fails - 2), LOGIN_PENALTY_MAX_MS);
  const next = {
    fails,
    blockedUntil: now + (fails >= 3 ? lockMs : 0),
    updatedAt: now,
  };
  loginPenaltyMap.set(key, next);
  return next;
}

/**
 * @param {string} key
 */
function clearLoginPenalty(key) {
  loginPenaltyMap.delete(key);
}

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
});

app.use('/api', apiLimiter);

app.use(
  session({
    name: 'ddycms.sid',
    secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd && process.env.COOKIE_SECURE !== 'false',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);

/** @param {import('express').Request} req */
function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  res.status(401).json({ error: '未登录或会话已过期' });
}

/** @param {import('express').Request} req */
function requireSuper(req, res, next) {
  if (req.session?.user?.role === SUPER_ROLE) return next();
  res.status(403).json({ error: '需要超级管理员权限' });
}

/**
 * 防护跨站请求：校验 Origin/Referer 与 Host 一致
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function validateWriteOrigin(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const host = req.get('host');
  const origin = req.get('origin');
  const referer = req.get('referer');
  const source = origin || referer;

  // 保持对脚本/CLI 的兼容：无来源头时放行
  if (!source || !host) return next();

  try {
    const sourceUrl = new URL(source);
    const sourceHost = sourceUrl.host;
    const sourceHostname = sourceUrl.hostname;
    const reqHostname = host.split(':')[0];
    const sourcePort = sourceUrl.port || (sourceUrl.protocol === 'https:' ? '443' : '80');
    const reqPort = host.split(':')[1] || '80';

    const allowedOrigins = String(process.env.ADMIN_ALLOWED_ORIGINS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const isLoopback = (name) => ['localhost', '127.0.0.1', '::1'].includes(name);
    const sameHost = sourceHost === host;
    const sameHostname = sourceHostname === reqHostname;
    const trustedLocalPair = isLoopback(sourceHostname) && isLoopback(reqHostname);
    const devProxyPair = trustedLocalPair && ['3000', '5173'].includes(sourcePort) && ['3000', '5173'].includes(reqPort);
    const envAllowed = allowedOrigins.includes(`${sourceUrl.protocol}//${sourceHost}`);

    if (!sameHost && !sameHostname && !trustedLocalPair && !devProxyPair && !envAllowed) {
      return res.status(403).json({ error: '非法来源请求已拦截' });
    }
  } catch {
    return res.status(403).json({ error: '非法来源请求已拦截' });
  }

  return next();
}

app.use('/api', validateWriteOrigin);

const uploadDir = resolve(ROOT, 'public/images/uploads');
const distPath = resolve(ROOT, 'dist');
const publicPath = resolve(ROOT, 'public');
mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持 JPG / PNG / GIF / WebP 图片'));
  },
});

/* ===== API ===== */

app.post('/api/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }
  const safeUsername = String(username).trim();
  const penaltyKey = getPenaltyKey(safeUsername, req.ip || 'unknown');
  const penaltyState = getPenaltyState(penaltyKey);
  const now = Date.now();
  if (penaltyState?.blockedUntil && penaltyState.blockedUntil > now) {
    const retryAfter = Math.ceil((penaltyState.blockedUntil - now) / 1000);
    return res.status(429).json({ error: `登录失败次数过多，请 ${retryAfter} 秒后再试` });
  }

  const user = await validateUser(safeUsername, password);
  if (!user) {
    const nextPenalty = registerLoginFail(penaltyKey);
    const retryAfter = Math.max(0, Math.ceil((nextPenalty.blockedUntil - Date.now()) / 1000));
    appendAuditLog({
      username: safeUsername,
      action: 'login.failed',
      detail: '用户名或密码错误',
      ip: req.ip,
    });
    if (retryAfter > 0) {
      return res.status(429).json({ error: `用户名或密码错误，已临时限制登录 ${retryAfter} 秒` });
    }
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  clearLoginPenalty(penaltyKey);
  req.session.user = { id: user.id, username: user.username, role: user.role };
  req.session.save((err) => {
    if (err) return res.status(500).json({ error: '会话创建失败，请重试' });
    appendAuditLog({
      username: user.username,
      userId: user.id,
      action: 'login.success',
      detail: '登录成功',
      ip: req.ip,
    });
    res.json({ ok: true, username: user.username, role: user.role });
  });
});

app.post('/api/logout', (req, res) => {
  const user = req.session?.user;
  req.session.destroy(() => {
    if (user) {
      appendAuditLog({
        username: user.username,
        userId: user.id,
        action: 'logout',
        detail: '退出登录',
        ip: req.ip,
      });
    }
    res.json({ ok: true });
  });
});

app.get('/api/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: '未登录' });
  res.json(req.session.user);
});

app.get('/api/users', requireAuth, requireSuper, (_req, res) => {
  res.json(listUsers().map(toPublicUser));
});

app.post('/api/users', requireAuth, requireSuper, (req, res) => {
  try {
    const user = createUser(req.body || {});
    auditFromRequest(req, 'user.create', `创建账号 ${user.username}`);
    res.status(201).json({ ok: true, user: toPublicUser(user) });
  } catch (err) {
    res.status(400).json({ error: err.message || '创建失败' });
  }
});

app.put('/api/users/:id', requireAuth, requireSuper, (req, res) => {
  try {
    const user = updateUser(req.params.id, req.body || {}, req.session.user.id);
    auditFromRequest(req, 'user.update', `更新账号 ${user.username}`);
    res.json({ ok: true, user: toPublicUser(user) });
  } catch (err) {
    res.status(400).json({ error: err.message || '更新失败' });
  }
});

app.delete('/api/users/:id', requireAuth, requireSuper, (req, res) => {
  try {
    const target = findUserById(req.params.id);
    deleteUser(req.params.id, req.session.user.id);
    auditFromRequest(req, 'user.delete', `删除账号 ${target?.username || req.params.id}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || '删除失败' });
  }
});

app.put('/api/account/password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请填写原密码和新密码' });
  }
  try {
    changePassword(req.session.user.id, oldPassword, newPassword);
    auditFromRequest(req, 'account.password', '修改自己的密码');
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || '修改失败' });
  }
});

app.get('/api/logs', requireAuth, (req, res) => {
  res.json(queryAuditLogs(req.query));
});

app.get('/api/news', requireAuth, (_req, res) => {
  res.json(readNews());
});

app.get('/api/news/:id', requireAuth, (req, res) => {
  const article = readNews().find((a) => a.id === req.params.id);
  if (!article) return res.status(404).json({ error: '文章不存在' });
  res.json(article);
});

app.post('/api/news', requireAuth, (req, res) => {
  const articles = readNews();
  const body = req.body;
  if (!body?.id || !body?.title) {
    return res.status(400).json({ error: '缺少 id 或 title' });
  }
  if (articles.some((a) => a.id === body.id)) {
    return res.status(409).json({ error: '文章 ID 已存在' });
  }
  articles.unshift(normalizeArticle(body));
  writeNews(articles);
  auditFromRequest(req, 'news.create', body.id);
  res.status(201).json({ ok: true });
});

app.put('/api/news/:id', requireAuth, (req, res) => {
  const articles = readNews();
  const idx = articles.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '文章不存在' });
  articles[idx] = normalizeArticle({ ...req.body, id: req.params.id });
  writeNews(articles);
  auditFromRequest(req, 'news.update', req.params.id);
  res.json({ ok: true });
});

app.delete('/api/news/:id', requireAuth, (req, res) => {
  const articles = readNews().filter((a) => a.id !== req.params.id);
  writeNews(articles);
  auditFromRequest(req, 'news.delete', req.params.id);
  res.json({ ok: true });
});

app.get('/api/banner', requireAuth, (_req, res) => {
  res.json(readBanner());
});

app.get('/api/banner/:id', requireAuth, (req, res) => {
  const slide = readBanner().slides.find((s) => s.id === req.params.id);
  if (!slide) return res.status(404).json({ error: 'Banner 不存在' });
  res.json(slide);
});

app.post('/api/banner', requireAuth, (req, res) => {
  const banner = readBanner();
  const body = req.body;
  if (!body?.id || !body?.title) {
    return res.status(400).json({ error: '缺少 id 或 title' });
  }
  if (banner.slides.some((s) => s.id === body.id)) {
    return res.status(409).json({ error: 'Banner ID 已存在' });
  }
  banner.slides.push(normalizeBannerSlide(body, banner.slides.length));
  writeBanner(banner);
  auditFromRequest(req, 'banner.create', body.id);
  res.status(201).json({ ok: true });
});

app.put('/api/banner/:id', requireAuth, (req, res) => {
  const banner = readBanner();
  const idx = banner.slides.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Banner 不存在' });
  banner.slides[idx] = normalizeBannerSlide({ ...req.body, id: req.params.id }, idx);
  writeBanner(banner);
  auditFromRequest(req, 'banner.update', req.params.id);
  res.json({ ok: true });
});

app.delete('/api/banner/:id', requireAuth, (req, res) => {
  const banner = readBanner();
  banner.slides = banner.slides.filter((s) => s.id !== req.params.id);
  writeBanner(banner);
  auditFromRequest(req, 'banner.delete', req.params.id);
  res.json({ ok: true });
});

app.patch('/api/banner/:id/status', requireAuth, (req, res) => {
  const banner = readBanner();
  const slide = banner.slides.find((s) => s.id === req.params.id);
  if (!slide) return res.status(404).json({ error: 'Banner 不存在' });
  slide.enabled = req.body?.enabled !== false;
  writeBanner(banner);
  auditFromRequest(req, 'banner.status', `${req.params.id} → ${slide.enabled ? '上线' : '下线'}`);
  res.json({ ok: true, enabled: slide.enabled });
});

app.post('/api/banner/:id/move', requireAuth, (req, res) => {
  const banner = readBanner();
  const idx = banner.slides.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Banner 不存在' });

  const direction = req.body?.direction;
  if (direction !== 'up' && direction !== 'down') {
    return res.status(400).json({ error: 'direction 须为 up 或 down' });
  }

  const target = direction === 'up' ? idx - 1 : idx + 1;
  if (target < 0 || target >= banner.slides.length) {
    return res.status(400).json({ error: '无法移动' });
  }

  [banner.slides[idx], banner.slides[target]] = [banner.slides[target], banner.slides[idx]];
  writeBanner(banner);
  auditFromRequest(req, 'banner.move', `${req.params.id} ${direction}`);
  res.json({ ok: true });
});

app.post('/api/contact', contactLimiter, (req, res) => {
  const body = req.body || {};
  if (body.website) {
    return res.status(400).json({ error: '提交失败' });
  }
  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();
  const type = CONTACT_TYPES[body.type] ? body.type : 'other';

  if (!name || !phone || !message) {
    return res.status(400).json({ error: '请填写姓名、电话和留言内容' });
  }
  if (phone.length < 6 || phone.length > 20) {
    return res.status(400).json({ error: '请输入有效的联系电话' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: '留言内容过长' });
  }

  const messages = readMessages();
  const item = {
    id: `msg-${Date.now()}-${randomBytes(4).toString('hex')}`,
    name,
    phone,
    email,
    type,
    message,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  messages.unshift(item);
  writeMessages(messages);
  appendAuditLog({ username: 'visitor', action: 'contact.create', detail: name, ip: req.ip });
  res.status(201).json({ ok: true });
});

app.get('/api/messages', requireAuth, (req, res) => {
  const messages = filterMessages(readMessages(), req.query);
  res.json(messages);
});

app.get('/api/export/messages', requireAuth, (req, res) => {
  const messages = filterMessages(readMessages(), req.query);
  auditFromRequest(req, 'message.export', `导出 ${messages.length} 条`);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `messages-${stamp}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\uFEFF${messagesToCsv(messages)}`);
});

app.get('/api/messages/:id', requireAuth, (req, res) => {
  const item = readMessages().find((m) => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: '留言不存在' });
  res.json(item);
});

app.patch('/api/messages/:id/status', requireAuth, (req, res) => {
  const messages = readMessages();
  const item = messages.find((m) => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: '留言不存在' });

  const status = req.body?.status;
  if (!['pending', 'read', 'done'].includes(status)) {
    return res.status(400).json({ error: '无效的状态' });
  }
  item.status = status;
  writeMessages(messages);
  auditFromRequest(req, 'message.status', `${req.params.id} → ${status}`);
  res.json({ ok: true, status });
});

app.delete('/api/messages/:id', requireAuth, (req, res) => {
  const messages = readMessages().filter((m) => m.id !== req.params.id);
  writeMessages(messages);
  auditFromRequest(req, 'message.delete', req.params.id);
  res.json({ ok: true });
});

app.get('/api/public/settings', (_req, res) => {
  const settings = normalizeSettings(readSettings() || getDefaultSettings());
  res.json(settings);
});

app.post('/api/track', trackLimiter, (req, res) => {
  const settings = readSettings() || getDefaultSettings();
  if (!settings.analytics?.trackPageviews) {
    return res.json({ ok: true, skipped: true });
  }
  const path = String(req.body?.path || '/').slice(0, 200);
  const stats = recordPageview(path);
  res.json({ ok: true, total: stats.total });
});

app.get('/api/settings', requireAuth, (_req, res) => {
  res.json(normalizeSettings(readSettings() || getDefaultSettings()));
});

app.put('/api/settings', requireAuth, (req, res) => {
  const settings = normalizeSettings(req.body || {});
  writeSettings(settings);
  auditFromRequest(req, 'settings.update', '更新网站设置');
  res.json({ ok: true });
});

app.get('/api/stats', requireAuth, (_req, res) => {
  res.json(readStats());
});

app.get('/api/publish/preview', requireAuth, (_req, res) => {
  res.json(getPublishPreview());
});

app.post('/api/publish', requireAuth, (req, res) => {
  try {
    const modules = Array.isArray(req.body?.modules) ? req.body.modules : ['all'];
    const build = req.body?.build === true;
    const result = publishModules(modules, { build });
    auditFromRequest(req, 'publish', `${modules.join(',')}${build ? ' + build' : ''}`);
    const status = result.partial ? 207 : 200;
    res.status(status).json(result);
  } catch (err) {
    const code = err.message.includes('发布进行中') ? 409 : 500;
    res.status(code).json({ error: err.message || '发布失败' });
  }
});

app.post('/api/publish/build', requireAuth, (req, res) => {
  try {
    const result = buildDistOnly();
    auditFromRequest(req, 'publish.build', '仅构建静态站');
    res.json(result);
  } catch (err) {
    const code = err.message.includes('发布进行中') ? 409 : 500;
    res.status(code).json({ error: err.message || '构建失败' });
  }
});

app.post('/api/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: '未选择文件' });

    const distUploadDir = resolve(ROOT, 'dist/images/uploads');
    if (existsSync(distPath)) {
      mkdirSync(distUploadDir, { recursive: true });
      copyFileSync(req.file.path, resolve(distUploadDir, req.file.filename));
    }

    auditFromRequest(req, 'upload', req.file.filename);
    res.json({ url: `/images/uploads/${req.file.filename}` });
  });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    dist: existsSync(distPath),
  });
});

/**
 * @param {Record<string, unknown>} raw
 */
function normalizeArticle(raw) {
  const link = String(raw.link || '').trim();
  const article = {
    id: String(raw.id).trim(),
    category: raw.category || 'company',
    title: String(raw.title).trim(),
    date: String(raw.date || '').trim() || todayDateLocal(),
    excerpt: String(raw.excerpt || '').trim(),
    cover: String(raw.cover || '/images/brand/news-1.jpg').trim(),
    blocks: Array.isArray(raw.blocks) ? raw.blocks : [],
  };
  if (link) {
    article.link = link;
    article.linkTarget = raw.linkTarget === '_self' ? '_self' : '_blank';
  }
  return article;
}

/**
 * @param {Record<string, unknown>} raw
 */
function normalizeBanner(raw) {
  const slides = Array.isArray(raw.slides) ? raw.slides : [];
  return {
    slides: slides.map((slide, index) => normalizeBannerSlide(slide, index)),
  };
}

/**
 * @param {Record<string, unknown>} raw
 * @param {number} index
 */
function normalizeBannerSlide(raw, index) {
  const buttons = Array.isArray(raw.buttons) ? raw.buttons.slice(0, 2) : [];
  return {
    id: String(raw.id || `slide-${index + 1}`).trim(),
    enabled: raw.enabled !== false,
    image: String(raw.image || '/images/brand/hero-1.jpg').trim(),
    tag: String(raw.tag || '').trim(),
    title: String(raw.title || '').trim(),
    subtitle: String(raw.subtitle || '').trim(),
    buttons: buttons
      .map((btn) => ({
        text: String(btn.text || '').trim(),
        url: String(btn.url || '').trim(),
        style: btn.style === 'outline-light' ? 'outline-light' : 'accent',
      }))
      .filter((btn) => btn.text && btn.url),
  };
}

/* ===== 静态资源 ===== */

const adminPublic = resolve(__dirname, 'public');
app.get('/admin', (_req, res) => {
  res.sendFile(resolve(adminPublic, 'index.html'));
});
app.use('/admin', express.static(adminPublic));

/** 上传图片：构建前后均可访问 */
app.use('/images/uploads', express.static(uploadDir, { maxAge: isProd ? '7d' : 0 }));

if (existsSync(distPath)) {
  app.use(express.static(distPath, { maxAge: isProd ? '1d' : 0 }));
} else if (existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

app.listen(PORT, () => {
  console.log(`[admin] 管理后台 http://localhost:${PORT}/admin`);
  if (existsSync(distPath)) {
    console.log(`[admin] 官网静态站 http://localhost:${PORT}`);
  } else {
    console.warn('[admin] 未找到 dist/，请执行 npm run build 后对外提供静态站');
  }
  if (isProd && !process.env.SESSION_SECRET) {
    console.warn('[admin] 生产环境请设置 SESSION_SECRET，否则重启后会话将失效');
  }
});
