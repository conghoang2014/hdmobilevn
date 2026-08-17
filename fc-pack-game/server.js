/**
 * FC Pack Game — free cloud save server (zero dependency)
 * Chỉ cần: node server.js
 * Data bền trong data/ — cập nhật code không mất save
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GIFTS_FILE = path.join(DATA_DIR, 'gifts.json');
const FRIENDLY_FILE = path.join(DATA_DIR, 'friendly.json');
const SAVES_DIR = path.join(DATA_DIR, 'saves');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function ensureDirs() {
  [DATA_DIR, SAVES_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');
  if (!fs.existsSync(GIFTS_FILE)) fs.writeFileSync(GIFTS_FILE, '{}');
  if (!fs.existsSync(FRIENDLY_FILE)) fs.writeFileSync(FRIENDLY_FILE, '{}');
}

function readJson(file, fb) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fb; }
}
function writeJson(file, obj) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, file);
}
function safeUser(u) {
  return String(u || '').trim().toLowerCase().replace(/[^a-z0-9_\-\.]/gi, '_').slice(0, 64);
}
function hashPass(pw) {
  return crypto.createHash('sha256').update(String(pw) + '|fc-pack-salt-v1').digest('hex');
}
function savePath(u) { return path.join(SAVES_DIR, safeUser(u) + '.json'); }

function send(res, code, body, type) {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': type || 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache'
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > 8 * 1024 * 1024) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function adminRoleOf(key) {
  if (['conghoang'].includes(key)) return 'full';
  if (['anhduc'].includes(key)) return 'limited';
  return null;
}

ensureDirs();

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');

  const url = new URL(req.url || '/', 'http://localhost');
  const p = url.pathname;

  try {
    // API
    if (p === '/api/health') {
      return send(res, 200, { ok: true, time: Date.now(), dataDir: DATA_DIR });
    }

    if (p === '/api/register' && req.method === 'POST') {
      const body = await readBody(req);
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      if (username.length < 3) return send(res, 400, { error: 'Tên tối thiểu 3 ký tự' });
      if (password.length < 3) return send(res, 400, { error: 'Mật khẩu tối thiểu 3 ký tự' });
      const key = safeUser(username);
      const users = readJson(USERS_FILE, {});
      if (users[key]) return send(res, 409, { error: 'Tên đã tồn tại' });
      const role = adminRoleOf(key);
      users[key] = {
        username,
        passwordHash: hashPass(password),
        isAdmin: !!role,
        adminRole: role,
        createdAt: Date.now()
      };
      writeJson(USERS_FILE, users);
      return send(res, 200, { ok: true, user: { username, isAdmin: !!role, adminRole: role } });
    }

    if (p === '/api/login' && req.method === 'POST') {
      const body = await readBody(req);
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const key = safeUser(username);
      const users = readJson(USERS_FILE, {});
      const rec = users[key];
      if (!rec || rec.passwordHash !== hashPass(password)) {
        return send(res, 401, { error: 'Sai tài khoản hoặc mật khẩu' });
      }
      const role = adminRoleOf(key);
      rec.isAdmin = !!role;
      rec.adminRole = role;
      writeJson(USERS_FILE, users);
      return send(res, 200, {
        ok: true,
        user: { username: rec.username, isAdmin: !!rec.isAdmin, adminRole: rec.adminRole }
      });
    }

    if (p.startsWith('/api/save/') && req.method === 'GET') {
      const user = decodeURIComponent(p.slice('/api/save/'.length));
      const file = savePath(user);
      if (!fs.existsSync(file)) return send(res, 200, { ok: true, data: null });
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return send(res, 200, { ok: true, data, updatedAt: fs.statSync(file).mtimeMs });
    }

    if (p.startsWith('/api/save/') && req.method === 'PUT') {
      const user = decodeURIComponent(p.slice('/api/save/'.length));
      const body = await readBody(req);
      const key = safeUser(user);
      const users = readJson(USERS_FILE, {});
      const rec = users[key];
      if (!rec || rec.passwordHash !== hashPass(body.password || '')) {
        return send(res, 401, { error: 'Unauthorized' });
      }
      if (!body.data || typeof body.data !== 'object') {
        return send(res, 400, { error: 'Invalid data' });
      }
      writeJson(savePath(key), body.data);
      return send(res, 200, { ok: true, updatedAt: Date.now() });
    }

    if (p === '/api/gifts' && req.method === 'GET') {
      return send(res, 200, readJson(GIFTS_FILE, {}));
    }

    if (p === '/api/gifts' && req.method === 'PUT') {
      const body = await readBody(req);
      const key = safeUser(body.username);
      const users = readJson(USERS_FILE, {});
      const rec = users[key];
      if (!rec || rec.passwordHash !== hashPass(body.password || '') || !rec.isAdmin) {
        return send(res, 401, { error: 'Admin only' });
      }
      if (!body.gifts || typeof body.gifts !== 'object') {
        return send(res, 400, { error: 'Invalid gifts' });
      }
      writeJson(GIFTS_FILE, body.gifts);
      return send(res, 200, { ok: true });
    }


    if (p === '/api/friendly/create' && req.method === 'POST') {
      const body = await readBody(req);
      const key = safeUser(body.username);
      const users = readJson(USERS_FILE, {});
      const rec = users[key];
      if (!rec || rec.passwordHash !== hashPass(body.password || '')) {
        return send(res, 401, { error: 'Unauthorized' });
      }
      if (!body.squad || typeof body.squad !== 'object') {
        return send(res, 400, { error: 'Thiếu đội hình' });
      }
      const code = (body.username || 'F').slice(0, 3).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
      const rooms = readJson(FRIENDLY_FILE, {});
      // dọn phòng > 24h
      const now = Date.now();
      Object.keys(rooms).forEach(c => {
        if (now - (rooms[c].createdAt || 0) > 24 * 3600 * 1000) delete rooms[c];
      });
      rooms[code] = {
        code,
        host: rec.username,
        hostKey: key,
        squad: body.squad,
        ovr: Number(body.ovr) || 0,
        tactics: body.tactics || null,
        createdAt: now,
        status: 'open',
        results: []
      };
      writeJson(FRIENDLY_FILE, rooms);
      return send(res, 200, { ok: true, code, ovr: rooms[code].ovr });
    }

    if (p.startsWith('/api/friendly/') && req.method === 'GET') {
      const code = decodeURIComponent(p.slice('/api/friendly/'.length)).toUpperCase();
      if (!code || code === 'CREATE') return send(res, 400, { error: 'Bad code' });
      const rooms = readJson(FRIENDLY_FILE, {});
      const room = rooms[code];
      if (!room) return send(res, 404, { error: 'Không tìm thấy phòng giao hữu' });
      return send(res, 200, {
        ok: true,
        code: room.code,
        host: room.host,
        ovr: room.ovr,
        squad: room.squad,
        tactics: room.tactics,
        status: room.status
      });
    }

    if (p.startsWith('/api/friendly/') && p.endsWith('/result') && req.method === 'POST') {
      const code = decodeURIComponent(p.slice('/api/friendly/'.length, -('/result'.length))).toUpperCase();
      const body = await readBody(req);
      const rooms = readJson(FRIENDLY_FILE, {});
      const room = rooms[code];
      if (!room) return send(res, 404, { error: 'Phòng không tồn tại' });
      room.results = room.results || [];
      room.results.push({
        guest: body.guest || 'guest',
        score: body.score,
        at: Date.now()
      });
      room.results = room.results.slice(-20);
      writeJson(FRIENDLY_FILE, rooms);
      return send(res, 200, { ok: true });
    }

    // Static files
    let rel = p === '/' ? '/index.html' : p;
    rel = decodeURIComponent(rel.split('?')[0]);
    // prevent path traversal
    const filePath = path.normalize(path.join(ROOT, rel));
    if (!filePath.startsWith(ROOT)) return send(res, 403, { error: 'Forbidden' });
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return send(res, 404, { error: 'Not found' });
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': (ext === '.html' || ext === '.js') ? 'no-cache' : 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log('[FC Pack] http://localhost:' + PORT);
  console.log('[FC Pack] Data: ' + DATA_DIR + ' (keep this folder when updating)');
});
