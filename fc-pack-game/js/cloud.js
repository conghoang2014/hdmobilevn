/**
 * Cloud save client — tự detect server, fallback localStorage
 */
const Cloud = {
  base: '', // same origin when served by server.js
  password: '', // giữ trong session memory (không localStorage plain nếu không cần)
  online: null, // null unknown, true/false

  async health() {
    try {
      const r = await fetch(this.base + '/api/health', { cache: 'no-store' });
      if (!r.ok) throw new Error('bad');
      this.online = true;
      return true;
    } catch {
      this.online = false;
      return false;
    }
  },

  async register(username, password) {
    const r = await fetch(this.base + '/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Register failed');
    this.password = password;
    return j.user;
  },

  async login(username, password) {
    const r = await fetch(this.base + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Login failed');
    this.password = password;
    return j.user;
  },

  async loadSave(username) {
    const r = await fetch(this.base + '/api/save/' + encodeURIComponent(username), { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Load failed');
    return j.data;
  },

  async saveSave(username, data) {
    if (!this.password) return false;
    const r = await fetch(this.base + '/api/save/' + encodeURIComponent(username), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: this.password, data })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Save failed');
    return true;
  },

  async loadGifts() {
    const r = await fetch(this.base + '/api/gifts', { cache: 'no-store' });
    return await r.json();
  },

  async createFriendly(username, password, squad, ovr, tactics) {
    const r = await fetch(this.base + '/api/friendly/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, squad, ovr, tactics })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Tạo phòng thất bại');
    return j;
  },

  async getFriendly(code) {
    const r = await fetch(this.base + '/api/friendly/' + encodeURIComponent(code), { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Không tìm thấy phòng');
    return j;
  },

  async reportFriendlyResult(code, guest, score) {
    try {
      await fetch(this.base + '/api/friendly/' + encodeURIComponent(code) + '/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest, score })
      });
    } catch (_) {}
  },

  async saveGifts(username, gifts) {
    if (!this.password) return false;
    const r = await fetch(this.base + '/api/gifts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: this.password, gifts })
    });
    return r.ok;
  }
};

// Expose
window.Cloud = Cloud;
