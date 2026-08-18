/**
 * FC Pack Opening Game - Main Logic
 * Open source web game inspired by FC Mobile
 */

const STORAGE_KEY = 'fc_pack_game_save_v1';

const PACK_CONFIG = {
  1: { count: 1, costCoins: 5000, costGems: 0, rates: { high: 0.03, mid: 0.18 } },
  2: { count: 2, costCoins: 12000, costGems: 0, rates: { high: 0.05, mid: 0.22 } },
  3: { count: 3, costCoins: 0, costGems: 50, rates: { high: 0.08, mid: 0.25 } },
  5: { count: 5, costCoins: 0, costGems: 120, rates: { high: 0.10, mid: 0.28 } },
  1500: { count: 3, costCoins: 0, costGems: 1500, rates: { high: 0.12, mid: 0.30 } },
  5000: { count: 5, costCoins: 0, costGems: 5000, rates: { high: 0.15, mid: 0.32 } },
  12500: { count: 8, costCoins: 0, costGems: 12500, rates: { high: 0.20, mid: 0.30 } },
  22500: { count: 12, costCoins: 0, costGems: 22500, rates: { high: 0.25, mid: 0.28 } },
  50000: { count: 20, costCoins: 0, costGems: 50000, rates: { high: 0.35, mid: 0.25 } }
};

/** Tỷ lệ drop Adminstration */
const CONG_HOANG_RATE = 0.00003; // 0.003% — Admin chính, cực hiếm
const DUCKY_JR_RATE = 0.0008;    // 0.08%  — Admin phó, cao hơn rõ
/** Phân cấp admin */
const ADMIN_FULL = ['conghoang'];           // Admin chính — full quyền
const ADMIN_LIMITED = ['anhduc'];           // Admin phó — quyền hạn chế
const ADMIN_USERS = [...ADMIN_FULL, ...ADMIN_LIMITED];

/** Giới hạn giftcode cho Admin phó (anhduc) */
const LIMITED_ADMIN_CAPS = {
  coins: 500000,   // max xu / code
  gems: 5000,      // max gem / code
  cd: 100,         // max CD / code
  allowPlayer: false,  // không tặng cầu thủ đặc biệt
  allowPack: true,
  maxPackId: 5,    // chỉ pack 1,2,3,5 (không mega gem)
  maxUses: 10      // tối đa 10 lượt / code
};
const USERS_KEY = 'fc_pack_users_v1';
const GIFT_KEY = 'fc_pack_gifts_v1';
const CONTENT_KEY = 'fc_pack_content_v1';
const SESSION_KEY = 'fc_pack_session_v1';
/** Công Hoàng = Admin chính (mạnh nhất) · Ducky Jr = Admin phó */
const CONG_HOANG_SELL = { coins: 40000000000, gems: 40000000000 }; // 40 tỷ vàng + 40 tỷ KC
const DUCKY_JR_SELL = { coins: 20000000000, gems: 20000000000 }; // 20 tỷ vàng + 20 tỷ KC

/** Huấn luyện: cấp tối đa 30 */
const TRAIN_MAX_LEVEL = 30;
/** OVR tối đa sau khi cộng dồn thăng hạng (gốc có thể 130) */
const OVR_MAX = 200;
const STAT_MAX = 200;

const SPECIAL_SEASONS = ['TOTY', 'TOTS', 'GOLDEN DRAGON', 'Champions', 'World Cup', 'GINGA', 'EURO', 'ASE', 'ICON', 'Heroes', 'Adminstration', 'CREATION'];

class Game {
  constructor() {
    this.coins = 500000;
    this.gems = 5000;
    this.cd = 0;
    this.inventory = [];
    this.lastDaily = 0;
    this.isOpening = false;
    this.pendingCards = [];
    this.walkoutQueue = [];
    this.user = null; // { username, isAdmin }
    this.redeemedCodes = [];
    this.rankId = 'nhua';
    this.rankStars = 0;
    this.squad = {}; // slotId -> player uid/card snapshot
    this.starbookClaimed = [];
    this.sssOwned = [];
    this.sssOpened = []; // album id đã mở (mỗi cái 1 lần)
    this.sssMsClaimed = [];
    this._pickerSlot = null;
    this._matchRunning = false;
    // ===== Feature expansions =====
    this.formationId = '4-3-3';
    this.captainUid = null;
    this.pityCount = 0; // packs since last ≥115
    this.loginStreak = 0;
    this.lastLoginDay = '';
    this.questDay = '';
    this.questProgress = {};
    this.questClaimed = [];
    this.weekKey = '';
    this.weekProgress = {};
    this.weekClaimed = [];
    this.seasonPeakRank = 'nhua';
    this.seasonPeakStars = 0;
    this.matchSeries = null; // {wins, losses, target}
    this.reducedMotion = false;
    this.stats = { packsOpened: 0, matchesWon: 0, matchesPlayed: 0, trainCount: 0 };
    this.rankProtectLeft = 3;
    this.rankProtectDay = '';
    this._compareA = null;
    this._compareB = null;
    this._replayMode = false;
    // FC systems
    this.clubXp = 0;
    this.tactics = typeof DEFAULT_TACTICS !== 'undefined' ? { ...DEFAULT_TACTICS } : { buildup: 50, chance: 50, width: 50, depth: 50, style: 'Balanced' };
    this.slotRoles = {}; // slotId -> role name
    this.seasonTokens = 0; // seasonal currency
    this.bpXp = 0;
    this.bpPremium = false;
    this.bpClaimedFree = [];
    this.bpClaimedPrem = [];
    this.chainProgress = {}; // chainId -> { stepIdx, progress }
    this.chainClaimed = {};
    this.hallOfFame = []; // {name, season, ovr, at}
    this.winStreak = 0;
    this.formBonus = 0; // temp OVR from form
    this.rivalsPoints = 0;
    this.champsWins = 0;
    this.champsPlayed = 0;
    this.tutorialDone = false;
    this.kitId = 'default';
    this.gameContent = { seasons: [], events: [] };
    this.eventProgress = {}; // eventId -> { questId: n }
    this.eventClaimed = {}; // eventId -> [questId]
    this.eventShopBought = {}; // eventId -> count by shop id
  }

  async init() {
    await loadPlayers();
    this.bindUI();
    // Detect cloud server
    this.cloudOnline = false;
    this._cloudPass = sessionStorage.getItem('fc_cloud_pass') || '';
    if (window.Cloud) {
      Cloud.password = this._cloudPass;
      this.cloudOnline = await Cloud.health();
      this.updateCloudBadge();
    }
    const session = this.getSession();
    if (session && session.username) {
      this.user = session;
      if (this.cloudOnline && this._cloudPass) {
        try {
          const remote = await Cloud.loadSave(session.username);
          if (remote) {
            localStorage.setItem(this.storageKey(), JSON.stringify(remote));
          }
        } catch (e) { console.warn('Cloud load', e); }
      }
      this.load();
      this.applyLoginStreak();
      this.ensureQuests();
      this.showApp();
      this.updateCurrency();
      this.checkDailyButton();
      this.updateAuthUI();
      this.updateRankUI();
      this.renderQuests();
      this.renderEventBanner();
      if (this.reducedMotion) document.body.classList.add('reduced-motion');
    } else {
      this.showLogin();
    }
    await this.syncContentFromCloud();
    console.log('[FC Pack] Game ready · cloud=', this.cloudOnline);
  }

  updateCloudBadge() {
    let el = document.getElementById('cloud-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cloud-status';
      el.className = 'cloud-status';
      document.body.appendChild(el);
    }
    if (this.cloudOnline) {
      el.textContent = '☁️ Cloud save ON';
      el.classList.add('online');
      el.classList.remove('offline');
    } else {
      el.textContent = '💾 Local only';
      el.classList.add('offline');
      el.classList.remove('online');
    }
  }

  // ===== AUTH =====
  getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); }
    catch { return {}; }
  }
  saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }
  setSession(user) {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  }
  isAdminUser(username) {
    return ADMIN_USERS.includes(String(username || '').toLowerCase());
  }
  isFullAdmin(username) {
    const u = String(username || this.user?.username || '').toLowerCase().trim();
    if (ADMIN_FULL.includes(u)) return true;
    // Cloud có thể trả adminRole mà username lệch nhẹ
    if ((this.user && this.user.adminRole) === 'full') return true;
    return false;
  }
  isLimitedAdmin(username) {
    return ADMIN_LIMITED.includes(String(username || this.user?.username || '').toLowerCase());
  }
  getAdminRole(username) {
    const u = String(username || this.user?.username || '').toLowerCase();
    if (ADMIN_FULL.includes(u)) return 'full';
    if (ADMIN_LIMITED.includes(u)) return 'limited';
    return null;
  }
  storageKey() {
    const u = (this.user && this.user.username) || 'guest';
    return STORAGE_KEY + '_' + u.toLowerCase();
  }

  async register(username, password) {
    username = (username || '').trim();
    password = (password || '').trim();
    if (username.length < 3) return this.toast('Tên đăng nhập tối thiểu 3 ký tự', 'error');
    if (password.length < 3) return this.toast('Mật khẩu tối thiểu 3 ký tự', 'error');

    if (this.cloudOnline && window.Cloud) {
      try {
        const user = await Cloud.register(username, password);
        this._cloudPass = password;
        sessionStorage.setItem('fc_cloud_pass', password);
        Cloud.password = password;
        // mirror local cache
        const users = this.getUsers();
        users[username.toLowerCase()] = { username, password, isAdmin: !!user.isAdmin, adminRole: user.adminRole };
        this.saveUsers(users);
        let msg = 'Đăng ký cloud thành công!';
        if (user.adminRole === 'full') msg = 'Đăng ký cloud (ADMIN CHÍNH)!';
        else if (user.adminRole === 'limited') msg = 'Đăng ký cloud (Admin phó)!';
        this.toast(msg, 'success');
        return this.login(username, password);
      } catch (e) {
        return this.toast(e.message || 'Đăng ký cloud thất bại', 'error');
      }
    }

    const users = this.getUsers();
    const key = username.toLowerCase();
    if (users[key]) return this.toast('Tên đã tồn tại!', 'error');
    const isAdmin = this.isAdminUser(username);
    const adminRole = this.getAdminRole(username);
    users[key] = { username, password, isAdmin, adminRole };
    this.saveUsers(users);
    let msg = 'Đăng ký thành công (local)!';
    if (adminRole === 'full') msg = 'Đăng ký thành công (ADMIN CHÍNH)!';
    else if (adminRole === 'limited') msg = 'Đăng ký thành công (Admin phó — quyền hạn chế)!';
    this.toast(msg, 'success');
    this.login(username, password);
  }

  async login(username, password) {
    username = (username || '').trim();
    password = (password || '').trim();

    if (this.cloudOnline && window.Cloud) {
      try {
        const user = await Cloud.login(username, password);
        this._cloudPass = password;
        sessionStorage.setItem('fc_cloud_pass', password);
        Cloud.password = password;
        this.user = { username: user.username, isAdmin: !!user.isAdmin, adminRole: user.adminRole };
        this.setSession(this.user);
        // load remote save (ưu tiên server)
        try {
          const remote = await Cloud.loadSave(user.username);
          if (remote) localStorage.setItem(this.storageKey(), JSON.stringify(remote));
        } catch (e) { console.warn(e); }
        // gifts shared
        try {
          const gifts = await Cloud.loadGifts();
          if (gifts) localStorage.setItem(GIFT_KEY, JSON.stringify(gifts));
        } catch (e) {}
        this.load();
        this.applyLoginStreak && this.applyLoginStreak();
        this.ensureQuests && this.ensureQuests();
        this.showApp();
        this.updateCurrency();
        this.checkDailyButton();
        this.updateAuthUI();
        this.updateRankUI();
        this.renderQuests && this.renderQuests();
        let hello = 'Xin chào, ' + user.username + ' ☁️';
        if (user.adminRole === 'full') hello += ' (Admin chính)';
        else if (user.adminRole === 'limited') hello += ' (Admin phó)';
        this.toast(hello + '!', 'success');
        return;
      } catch (e) {
        // fall through to local
        console.warn('Cloud login fail, try local', e);
      }
    }

    const users = this.getUsers();
    const key = username.toLowerCase();
    const rec = users[key];
    if (!rec || rec.password !== password) {
      return this.toast('Sai tên đăng nhập hoặc mật khẩu!', 'error');
    }
    rec.isAdmin = this.isAdminUser(username);
    rec.adminRole = this.getAdminRole(username);
    users[key] = rec;
    this.saveUsers(users);
    this._cloudPass = password;
    sessionStorage.setItem('fc_cloud_pass', password);
    this.user = { username: rec.username, isAdmin: !!rec.isAdmin, adminRole: rec.adminRole };
    this.setSession(this.user);
    this.load();
    this.showApp();
    this.updateCurrency();
    this.checkDailyButton();
    this.updateAuthUI();
    this.updateRankUI();
    let hello = 'Xin chào, ' + rec.username;
    if (rec.adminRole === 'full') hello += ' (Admin chính)';
    else if (rec.adminRole === 'limited') hello += ' (Admin phó)';
    this.toast(hello + '!', 'success');
  }

  logout() {
    this.save();
    this.user = null;
    this.setSession(null);
    this._cloudPass = '';
    sessionStorage.removeItem('fc_cloud_pass');
    if (window.Cloud) Cloud.password = '';
    this.inventory = [];
    this.coins = 500000;
    this.gems = 5000;
    this.redeemedCodes = [];
    this.showLogin();
    this.updateAuthUI();
    this.toast('Đã đăng xuất', 'success');
  }

  showLogin() {
    const login = document.getElementById('login-overlay');
    const app = document.getElementById('app');
    if (login) login.classList.remove('hidden');
    if (app) app.classList.add('app-locked');
  }
  showApp() {
    const login = document.getElementById('login-overlay');
    const app = document.getElementById('app');
    if (login) login.classList.add('hidden');
    if (app) app.classList.remove('app-locked');
  }
  updateAuthUI() {
    const nameEl = document.getElementById('user-name-display');
    const adminBtn = document.getElementById('btn-admin');
    const logoutBtn = document.getElementById('btn-logout');
    if (nameEl) nameEl.textContent = this.user ? this.user.username : '';
    if (adminBtn) {
      if (this.user && this.user.isAdmin) adminBtn.classList.remove('hidden');
      else adminBtn.classList.add('hidden');
    }
    if (logoutBtn) {
      if (this.user) logoutBtn.classList.remove('hidden');
      else logoutBtn.classList.add('hidden');
    }
  }

  // ===== GIFT CODES =====
  getGifts() {
    try { return JSON.parse(localStorage.getItem(GIFT_KEY) || '{}'); }
    catch { return {}; }
  }
  saveGifts(gifts) {
    localStorage.setItem(GIFT_KEY, JSON.stringify(gifts));
    if (this.cloudOnline && window.Cloud && this.user && this.user.isAdmin) {
      Cloud.password = this._cloudPass || Cloud.password;
      Cloud.saveGifts(this.user.username, gifts).catch(e => console.warn('gift cloud', e));
    }
  }

  redeemGiftCode(code) {
    if (!this.user) return this.toast('Cần đăng nhập!', 'error');
    code = (code || '').trim().toUpperCase();
    if (!code) return this.toast('Nhập giftcode!', 'error');
    const gifts = this.getGifts();
    const g = gifts[code];
    if (!g) return this.toast('Giftcode không tồn tại!', 'error');
    if (g.maxUses > 0 && (g.used || 0) >= g.maxUses) return this.toast('Giftcode đã hết lượt!', 'error');
    if (this.redeemedCodes.includes(code)) return this.toast('Bạn đã nhập code này rồi!', 'error');

    // Apply rewards
    const r = g.rewards || {};
    let msg = [];
    if (r.coins) { this.coins += Number(r.coins); msg.push('+' + Number(r.coins).toLocaleString() + ' xu'); }
    if (r.gems) { this.gems += Number(r.gems); msg.push('+' + Number(r.gems).toLocaleString() + ' gem'); }
    if (r.cd) { this.cd = (Number(this.cd) || 0) + Number(r.cd); msg.push('+' + Number(r.cd).toLocaleString() + ' CD'); }
    if (r.playerId) {
      const base = PLAYERS.find(p => p.id === r.playerId || p.name === r.playerId);
      if (base) {
        const card = { ...base, trainLevel: 0, trainExp: 0, upgradeLevel: 0,
          _uid: 'u' + Date.now() + '_' + Math.random().toString(36).slice(2, 9) };
        this.inventory.push(card);
        msg.push('+' + card.name + ' (' + card.ovr + ')');
      }
    }
    if (r.packId && PACK_CONFIG[r.packId]) {
      // Grant free pack open without cost
      const cfg = PACK_CONFIG[r.packId];
      const cards = this.generatePackCards(r.packId);
      cards.forEach(c => {
        c._uid = 'u' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
        c.trainLevel = 0; c.trainExp = 0; c.upgradeLevel = 0;
        this.inventory.push(c);
      });
      msg.push('Pack ' + r.packId + ' (' + cards.length + ' thẻ)');
    }

    this.redeemedCodes.push(code);
    g.used = (g.used || 0) + 1;
    gifts[code] = g;
    this.saveGifts(gifts);
    this.updateCurrency();
    this.save();
    this.toast('Nhận quà: ' + (msg.join(', ') || 'OK'), 'success');
    const input = document.getElementById('gift-input');
    if (input) input.value = '';
  }

  adminCreateGift(code, rewards, maxUses) {
    if (!this.user || !this.user.isAdmin) return this.toast('Không có quyền admin!', 'error');
    code = (code || '').trim().toUpperCase();
    if (!code || code.length < 3) return this.toast('Code tối thiểu 3 ký tự', 'error');
    const gifts = this.getGifts();
    if (gifts[code]) return this.toast('Code đã tồn tại!', 'error');

    const role = this.user.adminRole || this.getAdminRole(this.user.username);
    rewards = { ...(rewards || {}) };

    // Admin phó (anhduc): giới hạn quyền
    if (role === 'limited') {
      const cap = LIMITED_ADMIN_CAPS;
      if (rewards.coins) rewards.coins = Math.min(Number(rewards.coins) || 0, cap.coins);
      if (rewards.gems) rewards.gems = Math.min(Number(rewards.gems) || 0, cap.gems);
      if (rewards.cd) rewards.cd = Math.min(Number(rewards.cd) || 0, cap.cd);
      if (!cap.allowPlayer) delete rewards.playerId;
      if (rewards.packId != null && rewards.packId !== '') {
        const pid = isNaN(Number(rewards.packId)) ? rewards.packId : Number(rewards.packId);
        if (!cap.allowPack || (typeof pid === 'number' && pid > cap.maxPackId)) {
          delete rewards.packId;
          this.toast('Admin phó chỉ được tặng pack ≤ ' + cap.maxPackId, 'error');
        } else {
          rewards.packId = pid;
        }
      }
      const uses = Number(maxUses) || 0;
      if (uses <= 0 || uses > cap.maxUses) maxUses = cap.maxUses;
      // Không cho code trống reward sau khi cắt
      if (!rewards.coins && !rewards.gems && !rewards.cd && !rewards.packId && !rewards.playerId) {
        return this.toast('Admin phó: giftcode cần xu/gem/CD/pack hợp lệ (có giới hạn)', 'error');
      }
    }

    gifts[code] = {
      rewards,
      maxUses: Number(maxUses) || 0, // 0 = unlimited (chỉ Admin chính)
      used: 0,
      createdBy: this.user.username,
      createdAt: Date.now(),
      limited: role === 'limited'
    };
    this.saveGifts(gifts);
    this.toast('Đã tạo giftcode: ' + code + (role === 'limited' ? ' (giới hạn Admin phó)' : ''), 'success');
    this.renderAdminGifts();
  }

  adminDeleteGift(code) {
    if (!this.user || !this.user.isAdmin) return;
    const gifts = this.getGifts();
    const g = gifts[code];
    if (!g) return;
    const role = this.user.adminRole || this.getAdminRole(this.user.username);
    // Admin phó chỉ xóa code do mình tạo
    if (role === 'limited' && g.createdBy && g.createdBy.toLowerCase() !== this.user.username.toLowerCase()) {
      return this.toast('Admin phó chỉ xóa được code do mình tạo!', 'error');
    }
    delete gifts[code];
    this.saveGifts(gifts);
    this.renderAdminGifts();
    this.toast('Đã xóa ' + code, 'success');
  }

  renderAdminGifts() {
    const list = document.getElementById('admin-gift-list');
    if (!list) return;
    const gifts = this.getGifts();
    const keys = Object.keys(gifts).sort();
    if (!keys.length) {
      list.innerHTML = '<p class="empty-msg" style="display:block">Chưa có giftcode nào.</p>';
      return;
    }
    list.innerHTML = keys.map(code => {
      const g = gifts[code];
      const r = g.rewards || {};
      const parts = [];
      if (r.coins) parts.push(Number(r.coins).toLocaleString() + ' xu');
      if (r.gems) parts.push(Number(r.gems).toLocaleString() + ' gem');
      if (r.playerId) parts.push('Player: ' + r.playerId);
      if (r.packId) parts.push('Pack: ' + r.packId);
      return `<div class="admin-gift-row">
        <div><strong>${code}</strong><br><span class="tf-sub">${parts.join(' · ') || '—'} · used ${g.used||0}/${g.maxUses||'∞'}</span></div>
        <button class="btn-sell-quick" data-del-gift="${code}">Xóa</button>
      </div>`;
    }).join('');
    list.querySelectorAll('[data-del-gift]').forEach(btn => {
      btn.addEventListener('click', () => this.adminDeleteGift(btn.dataset.delGift));
    });
  }

  // ===== SAVE / LOAD (per user) =====
  save() {
    if (!this.user) return;
    const data = {
      coins: this.coins,
      gems: this.gems,
      cd: this.cd || 0,
      inventory: this.inventory,
      lastDaily: this.lastDaily,
      redeemedCodes: this.redeemedCodes,
      rankId: this.rankId,
      rankStars: this.rankStars,
      squad: this.squad,
      starbookClaimed: this.starbookClaimed,
      sssOwned: this.sssOwned || [],
      sssOpened: this.sssOpened || [],
      sssMsClaimed: this.sssMsClaimed || [],
      formationId: this.formationId || '4-3-3',
      captainUid: this.captainUid || null,
      pityCount: this.pityCount || 0,
      loginStreak: this.loginStreak || 0,
      lastLoginDay: this.lastLoginDay || '',
      questDay: this.questDay || '',
      questProgress: this.questProgress || {},
      questClaimed: this.questClaimed || [],
      weekKey: this.weekKey || '',
      weekProgress: this.weekProgress || {},
      weekClaimed: this.weekClaimed || [],
      seasonPeakRank: this.seasonPeakRank || 'nhua',
      seasonPeakStars: this.seasonPeakStars || 0,
      reducedMotion: !!this.reducedMotion,
      stats: this.stats || {},
      rankProtectLeft: this.rankProtectLeft != null ? this.rankProtectLeft : 3,
      rankProtectDay: this.rankProtectDay || '',
      clubXp: this.clubXp || 0,
      tactics: this.tactics || null,
      slotRoles: this.slotRoles || {},
      seasonTokens: this.seasonTokens || 0,
      bpXp: this.bpXp || 0,
      bpPremium: !!this.bpPremium,
      bpClaimedFree: this.bpClaimedFree || [],
      bpClaimedPrem: this.bpClaimedPrem || [],
      chainProgress: this.chainProgress || {},
      chainClaimed: this.chainClaimed || {},
      hallOfFame: this.hallOfFame || [],
      winStreak: this.winStreak || 0,
      rivalsPoints: this.rivalsPoints || 0,
      champsWins: this.champsWins || 0,
      champsPlayed: this.champsPlayed || 0,
      tutorialDone: !!this.tutorialDone,
      kitId: this.kitId || 'default',
      eventProgress: this.eventProgress || {},
      eventClaimed: this.eventClaimed || {},
      eventShopBought: this.eventShopBought || {}
    };
    localStorage.setItem(this.storageKey(), JSON.stringify(data));
    // Cloud sync (debounce)
    if (this.cloudOnline && window.Cloud && this.user && (this._cloudPass || Cloud.password)) {
      Cloud.password = this._cloudPass || Cloud.password;
      clearTimeout(this._cloudSaveTimer);
      this._cloudSaveTimer = setTimeout(() => {
        Cloud.saveSave(this.user.username, data).catch(e => console.warn('Cloud save fail', e));
      }, 400);
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) {
        this.coins = 500000;
        this.gems = 5000;
        this.inventory = [];
        this.lastDaily = 0;
        this.redeemedCodes = [];
        this.rankId = 'nhua';
        this.rankStars = 0;
        this.squad = {};
        this.starbookClaimed = [];
        return;
      }
      const data = JSON.parse(raw);
      this.coins = Number(data.coins) || 0;
      this.gems = Number(data.gems) || 0;
      this.cd = Number(data.cd) || 0;
      this.inventory = data.inventory ?? [];
      this.inventory.forEach(p => {
        if (p.trainLevel == null) p.trainLevel = 0;
        if (p.trainExp == null) p.trainExp = 0;
        if (p.upgradeLevel == null) p.upgradeLevel = 0;
        // Chỉ nâng cấp xu (+ tối đa 5) cộng OVR; huấn luyện KHÔNG cộng OVR
        const up = Math.min(5, p.upgradeLevel || 0);
        p.upgradeLevel = up;
        const tl = p.trainLevel || 0;
        // Gỡ OVR từng bị cộng nhầm từ train: gốc ≈ ovr - up - tl (nếu từng +1/cấp HL)
        let base = p.baseOvr;
        if (base == null) {
          base = Math.max(1, (p.ovr || 80) - up - tl);
        } else {
          // nếu ovr đang cao hơn base+up (do train cũ) → giữ base, reset ovr
          // nếu base đã bị lệch, suy lại
          if ((p.ovr || 0) > base + up + 2) {
            base = Math.max(1, (p.ovr || 80) - up - tl);
          }
        }
        p.baseOvr = base;
        p.ovr = Math.min(OVR_MAX, base + up);
        if (p.ovr >= 110) p.rarity = 'mythic';
        else if (p.ovr >= 100) p.rarity = 'legendary';
        else if (p.ovr >= 90) p.rarity = 'epic';
      });
      this.lastDaily = data.lastDaily ?? 0;
      this.redeemedCodes = data.redeemedCodes ?? [];
      this.rankId = data.rankId || 'nhua';
      this.rankStars = Number(data.rankStars) || 0;
      this.squad = data.squad || {};
      this.starbookClaimed = data.starbookClaimed || [];
      this.sssOwned = data.sssOwned || [];
      this.sssOpened = data.sssOpened || [];
      this.sssMsClaimed = data.sssMsClaimed || [];
      this.formationId = data.formationId || '4-3-3';
      this.captainUid = data.captainUid || null;
      this.pityCount = Number(data.pityCount) || 0;
      this.loginStreak = Number(data.loginStreak) || 0;
      this.lastLoginDay = data.lastLoginDay || '';
      this.questDay = data.questDay || '';
      this.questProgress = data.questProgress || {};
      this.questClaimed = data.questClaimed || [];
      this.weekKey = data.weekKey || '';
      this.weekProgress = data.weekProgress || {};
      this.weekClaimed = data.weekClaimed || [];
      this.seasonPeakRank = data.seasonPeakRank || 'nhua';
      this.seasonPeakStars = Number(data.seasonPeakStars) || 0;
      this.reducedMotion = !!data.reducedMotion;
      this.stats = data.stats || { packsOpened: 0, matchesWon: 0, matchesPlayed: 0, trainCount: 0 };
      this.rankProtectLeft = data.rankProtectLeft != null ? Number(data.rankProtectLeft) : 3;
      this.rankProtectDay = data.rankProtectDay || '';
      this.clubXp = Number(data.clubXp) || 0;
      this.tactics = data.tactics || (typeof DEFAULT_TACTICS !== 'undefined' ? { ...DEFAULT_TACTICS } : {});
      this.slotRoles = data.slotRoles || {};
      this.seasonTokens = Number(data.seasonTokens) || 0;
      this.bpXp = Number(data.bpXp) || 0;
      this.bpPremium = !!data.bpPremium;
      this.bpClaimedFree = data.bpClaimedFree || [];
      this.bpClaimedPrem = data.bpClaimedPrem || [];
      this.chainProgress = data.chainProgress || {};
      this.chainClaimed = data.chainClaimed || {};
      this.hallOfFame = data.hallOfFame || [];
      this.winStreak = Number(data.winStreak) || 0;
      this.rivalsPoints = Number(data.rivalsPoints) || 0;
      this.champsWins = Number(data.champsWins) || 0;
      this.champsPlayed = Number(data.champsPlayed) || 0;
      this.tutorialDone = !!data.tutorialDone;
      this.kitId = data.kitId || 'default';
      this.eventProgress = data.eventProgress || {};
      this.eventClaimed = data.eventClaimed || {};
      this.eventShopBought = data.eventShopBought || {};
    } catch (e) {
      console.warn('Load failed', e);
    }
  }

  // ===== CURRENCY =====
  updateCurrency() {
    this.coins = Number(this.coins) || 0;
    this.gems = Number(this.gems) || 0;
    this.cd = Number(this.cd) || 0;
    const cEl = document.getElementById('coins-display');
    const gEl = document.getElementById('gems-display');
    const dEl = document.getElementById('cd-display');
    if (cEl) cEl.textContent = this.coins.toLocaleString('vi-VN');
    if (gEl) gEl.textContent = this.gems.toLocaleString('vi-VN');
    if (dEl) dEl.textContent = this.cd.toLocaleString('vi-VN');
  }

  canAfford(packId) {
    const cfg = PACK_CONFIG[packId];
    if (cfg.costCoins > 0) return this.coins >= cfg.costCoins;
    return this.gems >= cfg.costGems;
  }

  spend(packId) {
    const cfg = PACK_CONFIG[packId];
    if (cfg.costCoins > 0) {
      this.coins -= cfg.costCoins;
    } else {
      this.gems -= cfg.costGems;
    }
    this.updateCurrency();
    this.save();
  }

  // ===== PACK OPENING =====

  openPack(packId) {
    if (this.isOpening) return;
    if (!this.user) return this.toast('Cần đăng nhập!', 'error');
    if (!PACK_CONFIG[packId]) return this.toast('Pack không hợp lệ!', 'error');

    if (!this.canAfford(packId)) {
      this.toast('Không đủ xu / gem!', 'error');
      return;
    }

    this.spend(packId);
    this.isOpening = true;
    this.pendingCards = this.generatePackCards(packId);
    this.walkoutQueue = this.pendingCards.filter(c => c.ovr >= 115);

    // Show overlay
    const overlay = document.getElementById('opening-overlay');
    overlay.classList.remove('hidden');
    document.getElementById('pack-animation').classList.remove('hidden', 'open');
    document.getElementById('cards-reveal').classList.add('hidden');
    document.getElementById('cards-reveal').innerHTML = '';
    document.getElementById('walkout-stage').classList.add('hidden');
    document.getElementById('btn-skip').classList.remove('hidden');
    document.getElementById('btn-continue').classList.add('hidden');

    // Pack shake then open
    setTimeout(() => {
      document.getElementById('pack-animation').classList.add('open');
      setTimeout(() => this.startReveal(), 700);
    }, 800);
  }

  generatePackCards(packId) {
    const cfg = PACK_CONFIG[packId];
    if (!cfg) return [];
    const cards = [];
    const usedIds = new Set();

    for (let i = 0; i < cfg.count; i++) {
      let pool = PLAYERS.filter(p => !usedIds.has(p.id));
      if (pool.length === 0) pool = PLAYERS;

      // Ducky Jr (Admin phó) — tỉ lệ cao hơn
      if (Math.random() < DUCKY_JR_RATE) {
        const dj = pool.find(p => p.name === 'Ducky Jr' || (p.id && String(p.id).includes('ducky_jr')));
        if (dj) {
          usedIds.add(dj.id);
          cards.push({ ...dj, trainLevel: 0, trainExp: 0, upgradeLevel: 0, baseOvr: dj.ovr });
          continue;
        }
      }
      // Công Hoàng (Admin chính) — cực hiếm, mạnh nhất game
      if (Math.random() < CONG_HOANG_RATE) {
        const ch = pool.find(p => p.name === 'Công Hoàng' || (p.id && String(p.id).includes('công_hoàng')));
        if (ch) {
          usedIds.add(ch.id);
          cards.push({ ...ch, trainLevel: 0, trainExp: 0, upgradeLevel: 0, baseOvr: ch.ovr });
          continue;
        }
      }
      // ~0.8% thẻ CREATION
      if (Math.random() < 0.008) {
        const cr = pool.filter(p => p.season === 'CREATION');
        if (cr.length) {
          const pick = cr[Math.floor(Math.random() * cr.length)];
          usedIds.add(pick.id);
          cards.push({ ...pick, trainLevel: 0, trainExp: 0, upgradeLevel: 0, baseOvr: pick.ovr });
          continue;
        }
      }

      const roll = Math.random();
      let candidates;

      if (roll < cfg.rates.high) {
        // High: special seasons nhưng OVR vừa phải (khó hơn ra 110+)
        candidates = pool.filter(p =>
          (p.ovr >= 85 && p.ovr < 110) ||
          (SPECIAL_SEASONS.includes(p.season) && p.ovr < 112)
        );
        if (candidates.length === 0) candidates = pool.filter(p => p.ovr >= 80 && p.ovr < 100);
      } else if (roll < cfg.rates.high + cfg.rates.mid) {
        candidates = pool.filter(p => p.ovr >= 75 && p.ovr < 88);
      } else {
        candidates = pool.filter(p => p.ovr < 80);
      }

      if (candidates.length === 0) candidates = pool.filter(p => p.ovr < 90);
      if (candidates.length === 0) candidates = pool;

      // Mega gem packs: tỉ lệ elite thấp hơn trước
      if ([1500, 5000, 12500, 22500, 50000].includes(Number(packId)) && Math.random() < (0.03 + Number(packId) / 400000)) {
        const elites = pool.filter(p => p.ovr >= 110 && p.ovr < 120);
        if (elites.length) candidates = elites;
      }

      // Boost nhẹ cầu thủ VN (không bao gồm thẻ 120+)
      if (Number(packId) >= 3 && Math.random() < 0.22) {
        const vn = candidates.filter(p => p.nation === 'Vietnam' && p.ovr < 115);
        if (vn.length) candidates = vn;
      }

      // Sự kiện mùa tuần
      const ev = typeof getActiveSeasonEvent === 'function' ? getActiveSeasonEvent() : null;
      if (ev && Math.random() < (ev.boost || 0.25)) {
        const seas = candidates.filter(p => p.season === ev.season);
        if (seas.length) candidates = seas;
        else {
          const allS = pool.filter(p => p.season === ev.season && p.ovr < 125);
          if (allS.length) candidates = allS;
        }
      }

      // Mùa custom do Admin CongHoang tạo
      let card = null;
      const customSeasons = this.getActiveCustomSeasons ? this.getActiveCustomSeasons() : [];
      for (const cs of customSeasons) {
        if (Math.random() < (cs.rate || 0)) {
          card = this.makeCustomSeasonCard(cs);
          break;
        }
      }
      if (!card) {
        card = candidates[Math.floor(Math.random() * candidates.length)];
        card = { ...card, trainLevel: 0, trainExp: 0, upgradeLevel: 0, baseOvr: card.ovr };
      }
      usedIds.add(card.id);
      cards.push(card);
    }

    cards.sort((a, b) => b.ovr - a.ovr);

    // Pity: N pack không ra ≥115 → bảo hiểm 1 thẻ
    const gotHigh = cards.some(c => (c.ovr || 0) >= PITY_OVR_MIN);
    if (gotHigh) {
      this.pityCount = 0;
    } else {
      this.pityCount = (this.pityCount || 0) + 1;
      if (this.pityCount >= PITY_THRESHOLD) {
        const pool = PLAYERS.filter(p => p.ovr >= PITY_OVR_MIN && p.ovr < 128 && p.season !== 'Adminstration');
        if (pool.length) {
          const pick = { ...pool[Math.floor(Math.random() * pool.length)], trainLevel: 0, trainExp: 0, upgradeLevel: 0, baseOvr: 0 };
          pick.baseOvr = pick.ovr;
          pick._pity = true;
          cards[cards.length - 1] = pick;
          cards.sort((a, b) => b.ovr - a.ovr);
          this.pityCount = 0;
        }
      }
    }
    return cards;
  }

  startReveal() {
    document.getElementById('pack-animation').classList.add('hidden');

    if (this.walkoutQueue.length > 0) {
      this.showNextWalkout();
    } else {
      this.showAllCards();
    }
  }

  showNextWalkout() {
    if (this.walkoutQueue.length === 0) {
      if (this._replayMode) {
        this._replayMode = false;
        this.isOpening = false;
        document.getElementById('walkout-stage')?.classList.add('hidden');
        document.getElementById('opening-overlay')?.classList.add('hidden');
        document.getElementById('btn-skip')?.classList.add('hidden');
        this.toast('Hết walkout replay', 'success');
        return;
      }
      this.showAllCards();
      return;
    }

    const card = this.walkoutQueue.shift();
    const stage = document.getElementById('walkout-stage');
    const cardEl = document.getElementById('walkout-card');
    const nameEl = document.getElementById('walkout-name');
    const ovrEl = document.getElementById('walkout-ovr');
    const textEl = document.querySelector('.walkout-text');
    const nationEl = document.getElementById('wr-nation');
    const posEl = document.getElementById('wr-pos');
    const clubEl = document.getElementById('wr-club');

    // Reset
    stage.classList.remove('hidden');
    cardEl.classList.remove('show');
    cardEl.innerHTML = '';
    textEl.classList.remove('show');
    [nationEl, posEl, clubEl].forEach(el => { el.classList.remove('show'); el.textContent = ''; });

    nationEl.textContent = '🌍 ' + (card.nation || '');
    posEl.textContent = card.pos || '';
    clubEl.textContent = '🏟️ ' + (card.club || '');
    if (card.name === 'Công Hoàng') {
      nameEl.innerHTML = '<img class="walkout-signature" src="assets/cong_hoang_signature.png" alt="Công Hoàng" />';
    } else if (card.name === 'Ducky Jr') {
      nameEl.innerHTML = '<img class="walkout-signature" src="assets/ducky_jr_signature.png" alt="Ducky Jr" />';
    } else {
      nameEl.textContent = card.name;
    }
    ovrEl.textContent = card.ovr + ' OVR';
    cardEl.appendChild(this.createCardElement(card, true));

    // Sequence: hiện từng cái 1 → ẩn → cái tiếp theo
    // Quốc gia → (ẩn) → Vị trí → (ẩn) → CLB → (ẩn) → Thẻ
    const showOne = (el) => {
      el.classList.remove('hide');
      el.classList.add('show');
    };
    const hideOne = (el) => {
      el.classList.remove('show');
      el.classList.add('hide');
    };

    const t1 = setTimeout(() => showOne(nationEl), 400);          // hiện quốc gia
    const t2 = setTimeout(() => hideOne(nationEl), 1400);         // ẩn quốc gia
    const t3 = setTimeout(() => showOne(posEl), 1800);            // hiện vị trí
    const t4 = setTimeout(() => hideOne(posEl), 2800);            // ẩn vị trí
    const t5 = setTimeout(() => showOne(clubEl), 3200);           // hiện CLB
    const t6 = setTimeout(() => hideOne(clubEl), 4200);           // ẩn CLB
    const t7 = setTimeout(() => {
      cardEl.classList.add('show');
      textEl.classList.add('show');
    }, 4600);                                                     // hiện thẻ

    this._walkoutTimers = [t1, t2, t3, t4, t5, t6, t7];
    this._walkoutTimer = setTimeout(() => {
      stage.classList.add('hidden');
      this.showNextWalkout();
    }, 7500);
  }

  showAllCards() {
    clearTimeout(this._walkoutTimer);
    document.getElementById('walkout-stage').classList.add('hidden');
    document.getElementById('btn-skip').classList.add('hidden');

    const container = document.getElementById('cards-reveal');
    container.classList.remove('hidden');
    container.innerHTML = '';

    this.pendingCards.forEach((card, idx) => {
      const el = this.createCardElement(card, false);
      el.classList.add('card-reveal');
      el.style.animationDelay = `${idx * 0.15}s`;
      el.addEventListener('click', () => this.showPlayerDetail(card));
      container.appendChild(el);

      // Add to inventory with unique id for upgrade tracking
      card._uid = card._uid || ('u' + Date.now() + '_' + Math.random().toString(36).slice(2, 9));
      card.upgradeLevel = card.upgradeLevel || 0;
      card.trainLevel = card.trainLevel || 0;
      card.trainExp = card.trainExp || 0;
      card.baseOvr = card.baseOvr || card.ovr; // OVR gốc khi rút thẻ
      this.inventory.push(card);
    });

    this.save();
    document.getElementById('btn-continue').classList.remove('hidden');
  }

  finishOpening() {
    document.getElementById('opening-overlay').classList.add('hidden');
    this.isOpening = false;
    const n = document.querySelectorAll('#cards-reveal .player-card').length;
    // dupe check on last pending (already in inventory)
    let dupes = 0;
    (this.pendingCards || []).forEach(c => {
      const same = this.inventory.filter(x => x.name === c.name && x.season === c.season);
      if (same.length > 1) dupes++;
      this.recordHallOfFame(c);
    });
    this.pendingCards = [];
    this.walkoutQueue = [];
    this.stats = this.stats || {};
    this.stats.packsOpened = (this.stats.packsOpened || 0) + 1;
    this.trackQuest('open_pack', 1);
    this.trackQuest('open_any', n);
    this.trackWeek('open_20', 1);
    this.addClubXp(15 + n * 2);
    this.seasonTokens = (this.seasonTokens || 0) + 1;
    this.save();
    this.renderQuests();
    this.renderFcPanels && this.renderFcPanels();
    let msg = `Nhận được ${n} cầu thủ!`;
    if (dupes) msg += ` · ${dupes} duplicate`;
    if (this.pityCount) msg += ` · Pity ${this.pityCount}/${PITY_THRESHOLD}`;
    this.toast(msg, 'success');
  }

  // ===== CARD UI =====
  createCardElement(player, large = false) {
    const div = document.createElement('div');
    const seasonClass = 'card-' + String(player.season || 'Base').replace(/ /g, '-');
    div.className = `player-card ${seasonClass} rarity-${player.rarity}${large ? ' large' : ''}${player.locked ? ' is-locked' : ''}${player.favorite ? ' is-fav' : ''}`;
    
    const seasonShort = {
      'GOLDEN DRAGON': '🐉 GD',
      'World Cup': 'WC',
      'Champions': 'CHAMP',
      'TOTY': 'TOTY',
      'TOTS': 'TOTS',
      'GINGA': 'GINGA',
      'EURO': 'EURO',
      'ASE': 'ASE',
      'ICON': '👑 ICON',
      'Heroes': '⭐ HERO',
      'Adminstration': '👑 ADMIN',
      'CREATION': '✨ CREATE',
      'Base': 'BASE'
    }[player.season] || player.season;

    const ps = (player.playstyles || []).slice(0, 4);
    const psHtml = ps.map(s => {
      const rarity = s.rarity || (s.plus ? 'gold' : 'silver');
      return `<span class="ps-icon ps-${rarity}" title="${s.name}">${s.icon}</span>`;
    }).join('');

    const face = player.face || { initials: '?', c1: '#1e293b', c2: '#334155', hue: 200 };
    const faceHtml = `
      <div class="player-face" style="--fc1:${face.c1};--fc2:${face.c2};--fhue:${face.hue}">
        <div class="face-silhouette"></div>
        <div class="face-initials">${face.initials}</div>
      </div>`;

    div.innerHTML = `
      <div class="card-inner">
        <div class="ovr${((player.baseOvr != null && player.ovr > player.baseOvr) ? ' ovr-boosted' : '')}">${player.ovr}</div>
        <div class="pos">${player.pos}</div>
        ${player.locked ? '<span class="card-lock-badge" title="Đã khóa">🔒</span>' : ''}
        ${player.favorite ? '<span class="card-fav-badge" title="Yêu thích">⭐</span>' : ''}
        <div class="season-badge">${seasonShort}</div>
        ${(() => {
          const up = Math.min(5, player.upgradeLevel || 0);
          const lv = player.trainLevel || 0;
          let html = '';
          if (lv > 0) html += `<div class="upgrade-badge train-badge">Lv${lv}</div>`;
          if (up > 0) html += `<div class="upgrade-badge">+${up} OVR</div>`;
          return html;
        })()}
        ${faceHtml}
        ${(() => {
          if (player.name === 'Công Hoàng') {
            return `<div class="player-name player-name-sig"><img class="name-signature" src="assets/cong_hoang_signature.png" alt="Công Hoàng" title="Công Hoàng" /></div>`;
          }
          if (player.name === 'Ducky Jr') {
            return `<div class="player-name player-name-sig"><img class="name-signature" src="assets/ducky_jr_signature.png" alt="Ducky Jr" title="Ducky Jr" /></div>`;
          }
          return `<div class="player-name">${player.name}</div>`;
        })()}
        <div class="nation-club">${player.nation} · ${player.club}</div>
        <div class="ps-row">${psHtml}</div>
      </div>
    `;
    return div;
  }

  showPlayerDetail(player, fromInventory = false) {
    this._modalPlayer = player;
    this._modalFromInventory = fromInventory;

    const modal = document.getElementById('player-modal');
    const cardContainer = document.getElementById('modal-card');
    const infoContainer = document.getElementById('modal-info');
    const statsContainer = document.getElementById('modal-stats');
    const sellBtn = document.getElementById('btn-sell-player');

    cardContainer.innerHTML = '';
    cardContainer.appendChild(this.createCardElement(player, true));

    // Vị trí · Quốc tịch · CLB · OVR (gốc + hiện tại nếu đã thăng)
    const baseO = player.baseOvr != null ? player.baseOvr : (player.ovr - Math.min(5, player.upgradeLevel || 0));
    const up = Math.min(5, player.upgradeLevel || 0);
    const ovrTag = (up > 0)
      ? `<span class="info-tag"><strong>OVR</strong> ${player.ovr} <span style="color:#a3e635">(+${up} nâng cấp · gốc ${baseO})</span></span>`
      : `<span class="info-tag"><strong>OVR</strong> ${player.ovr}</span>`;
    infoContainer.innerHTML = `
      <span class="info-tag"><strong>Vị trí</strong> ${player.pos}</span>
      <span class="info-tag"><strong>Quốc tịch</strong> ${player.nation}</span>
      <span class="info-tag"><strong>CLB</strong> ${player.club}</span>
      <span class="info-tag"><strong>Mùa</strong> ${player.season}</span>
      ${ovrTag}
    `;

    // PlayStyles
    const psBox = document.getElementById('modal-playstyles');
    if (psBox) {
      const styles = player.playstyles || [];
      if (styles.length === 0) {
        psBox.innerHTML = '';
      } else {
        psBox.innerHTML = '<div class="ps-title">PlayStyles</div><div class="ps-list">' +
          styles.map(s => {
            const rarity = s.rarity || (s.plus ? 'gold' : 'silver');
            return `<div class="ps-item ${rarity}">
              <span class="ps-diamond ps-${rarity}">${s.icon}</span>
              <span class="ps-name">${s.name}${rarity === 'diamond' ? ' ◆' : (rarity === 'gold' ? ' ★' : '')}</span>
            </div>`;
          }).join('') + '</div>';
      }
    }

    const stats = player.stats || {};
    const labels = player.pos === 'GK' 
      ? ['DIV', 'HAN', 'KIC', 'REF', 'SPD', 'POS']
      : ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];

    statsContainer.innerHTML = labels.map(key => `
      <div class="stat-item">
        <div class="label">${key}</div>
        <div class="value">${stats[key] ?? '-'}</div>
      </div>
    `).join('');

    // Bán + Nâng cấp + Huấn luyện chỉ từ Kho
    const upBtn = document.getElementById('btn-upgrade-player');
    const upInfo = document.getElementById('upgrade-info');
    const trainBtn = document.getElementById('btn-train-player');
    const trainInfo = document.getElementById('train-level-info');
    const level = player.upgradeLevel || 0;
    const tLevel = player.trainLevel || 0;
    const tExp = player.trainExp || 0;
    const tNeed = tLevel >= TRAIN_MAX_LEVEL ? 0 : this.getExpRequired(player, tLevel);

    // Extra action buttons
    this._ensureDetailExtraBtns();
    const lockBtn = document.getElementById('btn-lock-player');
    const favBtn = document.getElementById('btn-fav-player');
    const walkBtn = document.getElementById('btn-replay-walkout');
    const cmpBtn = document.getElementById('btn-compare-player');

    if (fromInventory) {
      if (sellBtn) {
        if (player.locked) {
          sellBtn.textContent = '🔒 Đang khóa — không bán được';
          sellBtn.disabled = true;
        } else {
          sellBtn.textContent = `💰 Bán · ${this.formatSellPrice(player)}`;
          sellBtn.disabled = false;
        }
        sellBtn.classList.remove('hidden');
      }
      if (lockBtn) {
        lockBtn.classList.remove('hidden');
        lockBtn.textContent = player.locked ? '🔓 Mở khóa' : '🔒 Khóa thẻ';
      }
      if (favBtn) {
        favBtn.classList.remove('hidden');
        favBtn.textContent = player.favorite ? '☆ Bỏ yêu thích' : '⭐ Yêu thích';
      }
      if (walkBtn) {
        if ((player.ovr || 0) >= 115) {
          walkBtn.classList.remove('hidden');
        } else {
          walkBtn.classList.add('hidden');
        }
      }
      if (cmpBtn) cmpBtn.classList.remove('hidden');

      if (upBtn && upInfo) {
        upInfo.classList.remove('hidden');
        upInfo.innerHTML = `Nâng cấp xu: <strong>${level}/5</strong>` +
          (level >= 5 ? ' · <span class="up-max">MAX</span>' : ' · +1 OVR / lần');
        if (level >= 5) {
          upBtn.classList.add('hidden');
        } else {
          upBtn.classList.remove('hidden');
          upBtn.disabled = this.coins < 100000;
          upBtn.textContent = this.coins < 100000
            ? '⬆️ Không đủ 100.000 xu'
            : `⬆️ Nâng cấp · 100.000 🪙 (${level}/5)`;
        }
      }
      if (trainBtn && trainInfo) {
        trainInfo.classList.remove('hidden');
        trainInfo.innerHTML = tLevel >= TRAIN_MAX_LEVEL
          ? `Huấn luyện: <strong>Lv ${tLevel}/${TRAIN_MAX_LEVEL}</strong> · <span class="up-max">MAX</span>`
          : `Huấn luyện: <strong>Lv ${tLevel}/${TRAIN_MAX_LEVEL}</strong> · ${tExp.toLocaleString()}/${tNeed.toLocaleString()} EXP`;
        trainBtn.classList.remove('hidden');
        trainBtn.disabled = false;
        trainBtn.textContent = tLevel >= TRAIN_MAX_LEVEL ? '🏋️ Đã MAX Lv 30' : '🏋️ Huấn luyện';
      }
    } else {
      if (sellBtn) sellBtn.classList.add('hidden');
      if (upBtn) upBtn.classList.add('hidden');
      if (upInfo) upInfo.classList.add('hidden');
      if (trainBtn) trainBtn.classList.add('hidden');
      if (trainInfo) trainInfo.classList.add('hidden');
      if (lockBtn) lockBtn.classList.add('hidden');
      if (favBtn) favBtn.classList.add('hidden');
      if (walkBtn) walkBtn.classList.add('hidden');
      if (cmpBtn) cmpBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
  }

  _ensureDetailExtraBtns() {
    const actions = document.querySelector('#player-modal .modal-actions');
    if (!actions || document.getElementById('btn-lock-player')) return;
    const html = `
      <button id="btn-lock-player" class="btn-secondary hidden" type="button">🔒 Khóa thẻ</button>
      <button id="btn-fav-player" class="btn-secondary hidden" type="button">⭐ Yêu thích</button>
      <button id="btn-replay-walkout" class="btn-secondary hidden" type="button">🎬 Xem lại Walkout</button>
      <button id="btn-compare-player" class="btn-secondary hidden" type="button">🆚 So sánh</button>
    `;
    actions.insertAdjacentHTML('afterbegin', html);
  }

  toggleLockPlayer() {
    const p = this._modalPlayer;
    if (!p || !this._modalFromInventory) return;
    const real = this.inventory.find(x => x === p || (p._uid && x._uid === p._uid));
    if (!real) return;
    real.locked = !real.locked;
    this._modalPlayer = real;
    this.save();
    this.renderInventory();
    this.showPlayerDetail(real, true);
    this.toast(real.locked ? 'Đã khóa thẻ 🔒' : 'Đã mở khóa 🔓', 'success');
  }

  toggleFavPlayer() {
    const p = this._modalPlayer;
    if (!p || !this._modalFromInventory) return;
    const real = this.inventory.find(x => x === p || (p._uid && x._uid === p._uid));
    if (!real) return;
    real.favorite = !real.favorite;
    this._modalPlayer = real;
    this.save();
    this.renderInventory();
    this.showPlayerDetail(real, true);
    this.toast(real.favorite ? 'Đã thêm yêu thích ⭐' : 'Đã bỏ yêu thích', 'success');
  }

  replayWalkout(player) {
    const card = player || this._modalPlayer;
    if (!card) return;
    if ((card.ovr || 0) < 115) return this.toast('Chỉ replay walkout thẻ ≥115 OVR', 'error');
    // đóng modal
    document.getElementById('player-modal')?.classList.add('hidden');
    this._replayMode = true;
    this.walkoutQueue = [{ ...card }];
    this.isOpening = true;
    const overlay = document.getElementById('opening-overlay');
    if (overlay) overlay.classList.remove('hidden');
    document.getElementById('pack-animation')?.classList.add('hidden');
    document.getElementById('cards-reveal')?.classList.add('hidden');
    document.getElementById('btn-continue')?.classList.add('hidden');
    document.getElementById('btn-skip')?.classList.remove('hidden');
    document.getElementById('walkout-stage')?.classList.remove('hidden');
    this.showNextWalkout();
  }

  addToCompare(player) {
    const p = player || this._modalPlayer;
    if (!p) return;
    if (!this._compareA) {
      this._compareA = p;
      this.toast('Đã chọn thẻ A — chọn thẻ thứ 2 để so sánh', 'success');
      return;
    }
    if (!this._compareB) {
      // same card?
      if ((p._uid && p._uid === this._compareA._uid) || p === this._compareA) {
        this.toast('Chọn thẻ khác với thẻ A', 'error');
        return;
      }
      this._compareB = p;
      this.showCompareModal();
      return;
    }
    // reset with new A
    this._compareA = p;
    this._compareB = null;
    this.toast('Đổi thẻ A — chọn thẻ thứ 2', 'success');
  }

  showCompareModal() {
    let modal = document.getElementById('compare-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'compare-modal';
      modal.className = 'modal hidden';
      modal.innerHTML = `
        <div class="modal-content compare-modal-content">
          <button class="modal-close" id="compare-close">×</button>
          <h2 class="section-title">🆚 So sánh thẻ</h2>
          <div class="compare-grid">
            <div id="compare-col-a"></div>
            <div id="compare-col-b"></div>
          </div>
          <div id="compare-table" class="compare-table"></div>
          <button type="button" class="btn-secondary" id="compare-clear">Xóa lựa chọn</button>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#compare-close').addEventListener('click', () => modal.classList.add('hidden'));
      modal.querySelector('#compare-clear').addEventListener('click', () => {
        this._compareA = null; this._compareB = null;
        modal.classList.add('hidden');
        this.toast('Đã xóa so sánh', 'success');
      });
    }
    const a = this._compareA, b = this._compareB;
    if (!a || !b) return;
    const colA = modal.querySelector('#compare-col-a');
    const colB = modal.querySelector('#compare-col-b');
    colA.innerHTML = ''; colB.innerHTML = '';
    colA.appendChild(this.createCardElement(a, true));
    colB.appendChild(this.createCardElement(b, true));
    const labels = (a.pos === 'GK' || b.pos === 'GK')
      ? ['DIV','HAN','KIC','REF','SPD','POS']
      : ['PAC','SHO','PAS','DRI','DEF','PHY'];
    const sa = a.stats || {}, sb = b.stats || {};
    let rows = `<div class="cmp-row cmp-head"><span>Chỉ số</span><span>${a.name}</span><span>${b.name}</span></div>`;
    rows += `<div class="cmp-row"><span>OVR</span><span class="${a.ovr>=b.ovr?'cmp-win':''}">${a.ovr}</span><span class="${b.ovr>=a.ovr?'cmp-win':''}">${b.ovr}</span></div>`;
    rows += `<div class="cmp-row"><span>Vị trí</span><span>${a.pos}</span><span>${b.pos}</span></div>`;
    rows += `<div class="cmp-row"><span>Mùa</span><span>${a.season}</span><span>${b.season}</span></div>`;
    labels.forEach(k => {
      const va = sa[k] ?? '-', vb = sb[k] ?? '-';
      const na = Number(va), nb = Number(vb);
      rows += `<div class="cmp-row"><span>${k}</span><span class="${na>=nb?'cmp-win':''}">${va}</span><span class="${nb>=na?'cmp-win':''}">${vb}</span></div>`;
    });
    const psa = (a.playstyles||[]).map(s => s.icon + s.name).join(', ') || '—';
    const psb = (b.playstyles||[]).map(s => s.icon + s.name).join(', ') || '—';
    rows += `<div class="cmp-row"><span>PlayStyle</span><span>${psa}</span><span>${psb}</span></div>`;
    modal.querySelector('#compare-table').innerHTML = rows;
    modal.classList.remove('hidden');
    document.getElementById('player-modal')?.classList.add('hidden');
  }

  ensureRankProtect() {
    const d = typeof todayKey === 'function' ? todayKey() : '';
    if (this.rankProtectDay !== d) {
      this.rankProtectDay = d;
      this.rankProtectLeft = 3;
    }
  }



  // ===== HUẤN LUYỆN (Training) =====
  /** EXP nhận được khi dùng 1 cầu thủ làm nguyên liệu */
  getFodderExp(fodder) {
    const ovr = fodder.ovr || 70;
    const trainLv = fodder.trainLevel || 0;
    let exp = Math.floor(ovr * ovr * 0.12);
    // Bonus mùa
    const seasonBonus = {
      'ICON': 800, 'Heroes': 500, 'GOLDEN DRAGON': 600,
      'TOTY': 450, 'TOTS': 400, 'Champions': 300,
      'World Cup': 250, 'GINGA': 200, 'EURO': 200, 'ASE': 220, 'Base': 0
    };
    exp += seasonBonus[fodder.season] || 0;
    // Bonus cấp huấn luyện của nguyên liệu
    exp += trainLv * 40;
    if (ovr >= 110) exp += 1200;
    else if (ovr >= 100) exp += 600;
    else if (ovr >= 90) exp += 250;
    return Math.max(50, exp);
  }

  /**
   * EXP cần để lên cấp tiếp theo.
   * OVR cao → cần nhiều EXP hơn; cấp cao → nhân hệ số.
   * level hiện tại: 0..29 (cần EXP để lên level+1), max 30.
   */
  getExpRequired(player, level) {
    const ovr = player.ovr || 80;
    const lv = level == null ? (player.trainLevel || 0) : level;
    // Base theo OVR: ~ ovr^1.35 * hệ số
    const base = Math.floor(Math.pow(ovr, 1.32) * 2.2);
    // Mỗi cấp tăng ~14%
    const need = Math.floor(base * Math.pow(1.14, lv));
    return Math.max(100, need);
  }

  getTrainLevel(player) {
    return Math.min(TRAIN_MAX_LEVEL, player.trainLevel || 0);
  }

  /** Tổng EXP còn thiếu để max level */
  getTotalExpToMax(player) {
    let total = 0;
    const start = this.getTrainLevel(player);
    for (let lv = start; lv < TRAIN_MAX_LEVEL; lv++) {
      total += this.getExpRequired(player, lv);
    }
    // trừ exp hiện có ở cấp hiện tại
    total -= (player.trainExp || 0);
    return Math.max(0, total);
  }

  openTrainPanel(player) {
    if (!player || !this._modalFromInventory) {
      this.toast('Chỉ huấn luyện cầu thủ trong kho!', 'error');
      return;
    }
    this._trainTarget = player;
    this._trainFodderUids = new Set();
    // Tự chọn nguyên liệu OVR thấp → cao đủ 1 cấp
    this.autoSelectFodder(false);
    this.renderTrainPanel();
    const panel = document.getElementById('train-panel');
    if (panel) panel.classList.remove('hidden');
  }

  /** Lấy danh sách nguyên liệu sort OVR thấp → cao */
  getFodderSorted() {
    const target = this._trainTarget;
    if (!target) return [];
    return this.inventory
      .filter(p => {
        if (p === target) return false;
        if (target._uid && p._uid === target._uid) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.ovr !== b.ovr) return a.ovr - b.ovr;
        return (a.name || '').localeCompare(b.name || '');
      });
  }

  /**
   * Tự tích chọn nguyên liệu từ OVR thấp → cao.
   * @param {boolean} maxAll - true: chọn đến khi đủ max level hoặc hết nguyên liệu
   *                          false: chỉ đủ EXP cho cấp tiếp theo
   */
  autoSelectFodder(maxAll = false) {
    const target = this._trainTarget;
    if (!target) return;
    const level = this.getTrainLevel(target);
    if (level >= TRAIN_MAX_LEVEL) {
      this._trainFodderUids = new Set();
      return;
    }

    const sorted = this.getFodderSorted();
    this._trainFodderUids = new Set();

    let needExp;
    if (maxAll) {
      // Tổng EXP còn thiếu đến max
      needExp = this.getTotalExpToMax(target);
    } else {
      const cur = target.trainExp || 0;
      const need = this.getExpRequired(target, level);
      needExp = Math.max(0, need - cur);
    }

    let got = 0;
    for (const f of sorted) {
      if (got >= needExp && needExp > 0) break;
      const uid = f._uid || f.id;
      this._trainFodderUids.add(uid);
      got += this.getFodderExp(f);
      // maxAll: chọn hết nếu vẫn thiếu
      if (!maxAll && got >= needExp) break;
    }

    if (this._trainFodderUids.size === 0 && sorted.length) {
      // fallback: chọn ít nhất 1 thẻ thấp nhất
      const f = sorted[0];
      this._trainFodderUids.add(f._uid || f.id);
    }
  }

  clearFodderSelection() {
    this._trainFodderUids = new Set();
  }

  closeTrainPanel() {
    const panel = document.getElementById('train-panel');
    if (panel) panel.classList.add('hidden');
    this._trainTarget = null;
    this._trainFodderUids = new Set();
  }

  renderTrainPanel() {
    const panel = document.getElementById('train-panel');
    if (!panel || !this._trainTarget) return;
    const target = this._trainTarget;
    const level = this.getTrainLevel(target);
    const exp = target.trainExp || 0;
    const need = level >= TRAIN_MAX_LEVEL ? 0 : this.getExpRequired(target, level);
    const pct = need > 0 ? Math.min(100, Math.floor((exp / need) * 100)) : 100;

    // Fodder candidates: inventory trừ target
    const fodders = this.inventory.filter(p => {
      if (p === target) return false;
      if (target._uid && p._uid === target._uid) return false;
      if (p.locked) return false; // không đốt thẻ khóa
      return true;
    });

    let selectedExp = 0;
    fodders.forEach(f => {
      const uid = f._uid || f.id;
      if (this._trainFodderUids.has(uid)) selectedExp += this.getFodderExp(f);
    });

    const infoEl = document.getElementById('train-info');
    if (infoEl) {
      infoEl.innerHTML = `
        <div class="train-target-name">${target.name} · ${target.ovr} OVR</div>
        <div class="train-level">Cấp huấn luyện: <strong>${level}/${TRAIN_MAX_LEVEL}</strong></div>
        <div class="train-exp-bar-wrap">
          <div class="train-exp-bar" style="width:${pct}%"></div>
        </div>
        <div class="train-exp-text">${level >= TRAIN_MAX_LEVEL ? 'MAX LEVEL' : exp.toLocaleString() + ' / ' + need.toLocaleString() + ' EXP'}</div>
        <div class="train-selected">Nguyên liệu đã chọn: <strong>+${selectedExp.toLocaleString()} EXP</strong></div>
      `;
    }

    const listEl = document.getElementById('train-fodder-list');
    if (listEl) {
      listEl.innerHTML = '';
      if (!fodders.length) {
        listEl.innerHTML = '<p class="empty-msg" style="display:block">Không còn cầu thủ để làm nguyên liệu.</p>';
      } else {
        // sort low ovr first (fodder)
        const sorted = [...fodders].sort((a, b) => a.ovr - b.ovr);
        sorted.forEach(f => {
          const uid = f._uid || f.id;
          const selected = this._trainFodderUids.has(uid);
          const expGain = this.getFodderExp(f);
          const row = document.createElement('div');
          row.className = 'train-fodder-row' + (selected ? ' selected' : '');
          row.innerHTML = `
            <div class="tf-check">${selected ? '✓' : ''}</div>
            <div class="tf-meta">
              <span class="tf-name">${f.name}</span>
              <span class="tf-sub">${f.pos} · ${f.ovr} · ${f.season}</span>
            </div>
            <div class="tf-exp">+${expGain.toLocaleString()}</div>
          `;
          row.addEventListener('click', () => {
            if (this._trainFodderUids.has(uid)) this._trainFodderUids.delete(uid);
            else this._trainFodderUids.add(uid);
            this.renderTrainPanel();
          });
          listEl.appendChild(row);
        });
      }
    }

    const confirmBtn = document.getElementById('btn-train-confirm');
    if (confirmBtn) {
      confirmBtn.disabled = this._trainFodderUids.size === 0 || level >= TRAIN_MAX_LEVEL;
      confirmBtn.textContent = level >= TRAIN_MAX_LEVEL
        ? 'Đã MAX cấp 30'
        : `Huấn luyện · +${selectedExp.toLocaleString()} EXP`;
    }
  }

  confirmTrain() {
    const target = this._trainTarget;
    if (!target || !this._trainFodderUids || this._trainFodderUids.size === 0) {
      this.toast('Chọn ít nhất 1 nguyên liệu!', 'error');
      return;
    }
    if (this.getTrainLevel(target) >= TRAIN_MAX_LEVEL) {
      this.toast('Đã đạt cấp huấn luyện tối đa!', 'error');
      return;
    }

    // Tìm target trong inventory
    let tIdx = this.inventory.findIndex(x => x === target);
    if (tIdx < 0 && target._uid) tIdx = this.inventory.findIndex(x => x._uid === target._uid);
    if (tIdx < 0) {
      this.toast('Không tìm thấy cầu thủ trong kho!', 'error');
      return;
    }

    // Thu thập fodder và EXP
    let gained = 0;
    const toRemove = [];
    this.inventory.forEach((f, idx) => {
      if (idx === tIdx) return;
      const uid = f._uid || f.id;
      if (this._trainFodderUids.has(uid)) {
        gained += this.getFodderExp(f);
        toRemove.push(idx);
      }
    });
    if (gained <= 0) {
      this.toast('Không có EXP!', 'error');
      return;
    }

    // Xóa nguyên liệu (từ cuối lên)
    toRemove.sort((a, b) => b - a).forEach(i => this.inventory.splice(i, 1));

    // Áp EXP + level up
    const card = this.inventory[this.inventory.findIndex(x =>
      (target._uid && x._uid === target._uid) || x === target ||
      (x.id === target.id && x.name === target.name && x.ovr === target.ovr)
    )];
    if (!card) {
      this.toast('Lỗi cập nhật cầu thủ!', 'error');
      return;
    }

    card.trainLevel = card.trainLevel || 0;
    card.trainExp = (card.trainExp || 0) + gained;
    let levelsGained = 0;

    while (card.trainLevel < TRAIN_MAX_LEVEL) {
      const need = this.getExpRequired(card, card.trainLevel);
      if (card.trainExp < need) break;
      card.trainExp -= need;
      card.trainLevel += 1;
      levelsGained += 1;
      // Mỗi cấp huấn luyện: chỉ tăng chỉ số (KHÔNG +OVR — OVR chỉ từ nâng cấp xu, max +5)
      if (card.baseOvr == null) card.baseOvr = card.ovr - (card.upgradeLevel || 0);
      if (!card.stats) card.stats = {};
      Object.keys(card.stats).forEach(k => {
        card.stats[k] = Math.min(STAT_MAX, (card.stats[k] || 70) + 1 + (card.trainLevel % 3 === 0 ? 1 : 0));
      });
      // Giữ OVR = base + upgradeLevel (không đụng train)
      card.ovr = Math.min(OVR_MAX, (card.baseOvr || card.ovr) + Math.min(5, card.upgradeLevel || 0));
    }
    if (card.trainLevel >= TRAIN_MAX_LEVEL) card.trainExp = 0;

    this._trainTarget = card;
    this._modalPlayer = card;
    this._trainFodderUids = new Set();
    this.stats = this.stats || {};
    this.stats.trainCount = (this.stats.trainCount || 0) + 1;
    this.trackQuest && this.trackQuest('train_player', 1);
    this.save();
    this.renderInventory();
    this.renderTrainPanel();
    this.renderQuests && this.renderQuests();
    this.showPlayerDetail(card, true);

    if (levelsGained > 0) {
      this.toast(`Huấn luyện +${levelsGained} cấp → Lv ${card.trainLevel}/${TRAIN_MAX_LEVEL} (chỉ số ↑ · OVR không đổi từ HL)`, 'success');
    } else {
      this.toast(`+${gained.toLocaleString()} EXP · Cấp ${card.trainLevel}/${TRAIN_MAX_LEVEL}`, 'success');
    }
  }

  getSellPrice(player) {
    // Adminstration siêu cấp — giá cố định
    if (player.name === 'Công Hoàng') {
      return { coins: CONG_HOANG_SELL.coins, gems: CONG_HOANG_SELL.gems };
    }
    if (player.name === 'Ducky Jr') {
      return { coins: DUCKY_JR_SELL.coins, gems: DUCKY_JR_SELL.gems };
    }
    // Giá bán xu + gem theo OVR & mùa
    let coins = player.ovr * 800;
    let gems = Math.floor(player.ovr * 2);
    const seasonBonus = {
      'ICON': 25000,
      'Heroes': 18000,
      'GOLDEN DRAGON': 20000,
      'TOTY': 18000,
      'TOTS': 15000,
      'Champions': 12000,
      'World Cup': 10000,
      'GINGA': 8000,
      'EURO': 8000,
      'ASE': 9000,
      'Adminstration': 50000,
      'Base': 0
    };
    const gemBonus = {
      'ICON': 80, 'Heroes': 50, 'GOLDEN DRAGON': 60, 'TOTY': 50, 'TOTS': 40,
      'Champions': 30, 'World Cup': 25, 'GINGA': 20, 'EURO': 20, 'ASE': 22,
      'Adminstration': 200, 'Base': 0
    };
    coins += seasonBonus[player.season] || 0;
    gems += gemBonus[player.season] || 0;
    if (player.ovr >= 120) { coins += 50000; gems += 150; }
    else if (player.ovr >= 110) { coins += 30000; gems += 80; }
    else if (player.ovr >= 100) { coins += 15000; gems += 40; }
    // train level bonus
    const tl = player.trainLevel || 0;
    coins += tl * 500;
    gems += Math.floor(tl * 1.5);
    return { coins: Math.floor(coins), gems: Math.floor(gems) };
  }

  formatSellPrice(player) {
    const p = this.getSellPrice(player);
    return p.coins.toLocaleString('vi-VN') + ' 🪙 + ' + p.gems.toLocaleString('vi-VN') + ' 💎';
  }

  getBuyPrice(player) {
    // Adminstration siêu cấp: giá mua = giá bán (không markup)
    if (player.name === 'Công Hoàng') {
      return { coins: CONG_HOANG_SELL.coins, gems: CONG_HOANG_SELL.gems };
    }
    if (player.name === 'Ducky Jr') {
      return { coins: DUCKY_JR_SELL.coins, gems: DUCKY_JR_SELL.gems };
    }
    const sell = this.getSellPrice(player);
    return {
      coins: Math.floor(sell.coins * 1.45),
      gems: Math.floor(sell.gems * 1.35)
    };
  }

  formatBuyPrice(player) {
    const p = this.getBuyPrice(player);
    return p.coins.toLocaleString('vi-VN') + ' 🪙 + ' + p.gems.toLocaleString('vi-VN') + ' 💎';
  }

  generateMarketListings(force = false) {
    if (!force && this._marketListings && this._marketListings.length && (Date.now() - (this._marketTs || 0) < 3 * 60 * 1000)) {
      return this._marketListings;
    }
    const pool = (typeof PLAYERS !== 'undefined' && PLAYERS.length) ? PLAYERS : [];
    const buckets = [
      pool.filter(p => p.ovr >= 115),
      pool.filter(p => p.ovr >= 100 && p.ovr < 115),
      pool.filter(p => p.ovr >= 88 && p.ovr < 100),
      pool.filter(p => p.ovr >= 78 && p.ovr < 88),
      pool.filter(p => p.ovr < 78)
    ];
    const picks = [];
    const used = new Set();
    const addFrom = (arr, maxAdd) => {
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      let added = 0;
      for (const p of shuffled) {
        if (added >= maxAdd || picks.length >= 48) break;
        if (used.has(p.id)) continue;
        used.add(p.id);
        picks.push({
          ...p,
          _listingId: 'm_' + p.id + '_' + Math.random().toString(36).slice(2, 7),
          trainLevel: 0,
          trainExp: 0,
          upgradeLevel: 0,
          baseOvr: p.ovr
        });
        added++;
      }
    };
    addFrom(buckets[0], 8);
    addFrom(buckets[1], 12);
    addFrom(buckets[2], 14);
    addFrom(buckets[3], 10);
    addFrom(buckets[4], 8);
    if (picks.length < 40) {
      for (const p of [...pool].sort(() => Math.random() - 0.5)) {
        if (picks.length >= 48) break;
        if (used.has(p.id)) continue;
        used.add(p.id);
        picks.push({
          ...p,
          _listingId: 'm_' + p.id + '_' + Math.random().toString(36).slice(2, 7),
          trainLevel: 0, trainExp: 0, upgradeLevel: 0, baseOvr: p.ovr
        });
      }
    }
    this._marketListings = picks;
    this._marketTs = Date.now();
    return picks;
  }

  buyMarketPlayer(listing) {
    if (!this.user) return this.toast('Cần đăng nhập!', 'error');
    if (!listing) return;
    const price = this.getBuyPrice(listing);
    const needC = Number(price.coins) || 0;
    const needG = Number(price.gems) || 0;
    if ((Number(this.coins) || 0) < needC || (Number(this.gems) || 0) < needG) {
      return this.toast('Không đủ xu hoặc gem để mua!', 'error');
    }
    this.coins = (Number(this.coins) || 0) - needC;
    this.gems = (Number(this.gems) || 0) - needG;
    const card = {
      ...listing,
      _uid: 'u' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      trainLevel: 0,
      trainExp: 0,
      upgradeLevel: 0,
      baseOvr: listing.baseOvr || listing.ovr
    };
    delete card._listingId;
    delete card._price;
    delete card._gems;
    this.inventory.push(card);
    if (this._marketListings) {
      this._marketListings = this._marketListings.filter(x => x._listingId !== listing._listingId);
    }
    this.updateCurrency();
    this.save();
    this.renderMarket();
    this.toast('Đã mua ' + card.name + ' (' + card.ovr + ') · -' + needC.toLocaleString('vi-VN') + ' 🪙 -' + needG.toLocaleString('vi-VN') + ' 💎', 'success');
  }



  // ===== UPGRADE (tối đa 5 lần, +1 OVR, +stats, 100k xu) =====
  getUpgradeLevel(player) {
    return player.upgradeLevel || 0;
  }

  canUpgrade(player) {
    return this.getUpgradeLevel(player) < 5 && this.coins >= 100000;
  }

  upgradePlayer() {
    const p = this._modalPlayer;
    if (!p || !this._modalFromInventory) {
      this.toast('Chỉ nâng cấp cầu thủ trong kho!', 'error');
      return;
    }
    const level = this.getUpgradeLevel(p);
    if (level >= 5) {
      this.toast('Đã nâng cấp tối đa 5 lần!', 'error');
      return;
    }
    if (this.coins < 100000) {
      this.toast('Không đủ 100.000 xu!', 'error');
      return;
    }

    // Tìm trong inventory theo instance (uid) hoặc id + ovr + name
    let idx = this.inventory.findIndex(x => x === p);
    if (idx < 0 && p._uid) idx = this.inventory.findIndex(x => x._uid === p._uid);
    if (idx < 0) idx = this.inventory.findIndex(x =>
      x.id === p.id && x.name === p.name && x.ovr === p.ovr && (x.upgradeLevel||0) === level);
    if (idx < 0) idx = this.inventory.findIndex(x => x.name === p.name && x.season === p.season && x.ovr === p.ovr);
    if (idx < 0) {
      this.toast('Không tìm thấy cầu thủ trong kho!', 'error');
      return;
    }

    this.coins -= 100000;
    const card = this.inventory[idx];
    if (card.baseOvr == null) card.baseOvr = card.ovr - (card.upgradeLevel || 0);
    card.upgradeLevel = level + 1;
    // OVR = gốc + số lần nâng cấp xu (tối đa +5)
    card.ovr = Math.min(OVR_MAX, (card.baseOvr || 80) + card.upgradeLevel);
    // Tăng chỉ số
    if (!card.stats) card.stats = { PAC: 70, SHO: 70, PAS: 70, DRI: 70, DEF: 70, PHY: 70 };
    const keys = Object.keys(card.stats);
    keys.forEach(k => {
      card.stats[k] = Math.min(STAT_MAX, (card.stats[k] || 70) + (2 + Math.floor(Math.random() * 3))); // +2~4
    });
    // Cập nhật rarity nếu cần
    if (card.ovr >= 110) card.rarity = 'mythic';
    else if (card.ovr >= 100) card.rarity = 'legendary';
    else if (card.ovr >= 90) card.rarity = 'epic';

    this._modalPlayer = card;
    this.updateCurrency();
    this.save();
    this.renderInventory();
    if (document.getElementById('market')?.classList.contains('active')) this.renderMarket();
    this.showPlayerDetail(card, true);
    this.toast(`Nâng cấp +1 OVR! (${card.upgradeLevel}/5) · OVR ${card.ovr}`, 'success');
  }

  sellPlayer() {
    const player = this._modalPlayer;
    if (!player) {
      this.toast('Không có cầu thủ để bán!', 'error');
      return;
    }
    if (player.locked) {
      this.toast('Thẻ đang khóa 🔒 — mở khóa trước khi bán!', 'error');
      return;
    }
    // Tìm trong kho (ưu tiên uid / reference)
    let idx = this.inventory.findIndex(p => p === player);
    if (idx < 0 && player._uid) idx = this.inventory.findIndex(p => p._uid === player._uid);
    if (idx < 0) idx = this.inventory.findIndex(p =>
      p.id === player.id && p.name === player.name && p.ovr === player.ovr &&
      (p.season || '') === (player.season || '')
    );
    if (idx < 0) idx = this.inventory.findIndex(p =>
      p.name === player.name && p.season === player.season && p.ovr === player.ovr
    );
    if (idx === -1) {
      this.toast('Không tìm thấy cầu thủ trong kho!', 'error');
      return;
    }

    const sold = this.inventory[idx];
    const price = this.getSellPrice(sold);
    const addCoins = Number(price.coins) || 0;
    const addGems = Number(price.gems) || 0;

    // Xóa thẻ rồi CỘNG DỒN vào tiền hiện tại
    this.inventory.splice(idx, 1);
    this.coins = (Number(this.coins) || 0) + addCoins;
    this.gems = (Number(this.gems) || 0) + addGems;

    this.updateCurrency();
    this.save();

    const modal = document.getElementById('player-modal');
    if (modal) modal.classList.add('hidden');
    if (typeof this.closeTrainPanel === 'function') this.closeTrainPanel();
    this.renderInventory();
    if (document.getElementById('market')?.classList.contains('active')) this.renderMarket();

    this.toast(
      `Đã bán ${sold.name} · +${addCoins.toLocaleString('vi-VN')} 🪙 + ${addGems.toLocaleString('vi-VN')} 💎 · Tổng: ${this.coins.toLocaleString('vi-VN')} 🪙 / ${this.gems.toLocaleString('vi-VN')} 💎`,
      'success'
    );
  }

  // ===== INVENTORY =====
  renderInventory() {
    const grid = document.getElementById('inventory-grid');
    const empty = document.getElementById('inventory-empty');
    const seasonFilter = document.getElementById('filter-season').value;
    const sort = document.getElementById('filter-sort').value;

    let list = [...this.inventory];

    if (seasonFilter !== 'all') {
      list = list.filter(p => p.season === seasonFilter);
    }

    if (sort === 'ovr-desc') list.sort((a, b) => (b.favorite?1:0) - (a.favorite?1:0) || b.ovr - a.ovr);
    else if (sort === 'ovr-asc') list.sort((a, b) => (b.favorite?1:0) - (a.favorite?1:0) || a.ovr - b.ovr);
    else if (sort === 'fav') list.sort((a, b) => (b.favorite?1:0) - (a.favorite?1:0) || b.ovr - a.ovr);
    else list.sort((a, b) => a.name.localeCompare(b.name));

    grid.innerHTML = '';
    if (list.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    list.forEach(p => {
      const wrap = document.createElement('div');
      wrap.className = 'inv-item';
      const el = this.createCardElement(p);
      el.addEventListener('click', () => this.showPlayerDetail(p, true));
      wrap.appendChild(el);

      const level = p.upgradeLevel || 0;
      const actions = document.createElement('div');
      actions.className = 'inv-actions';

      const upBtn = document.createElement('button');
      upBtn.className = 'btn-up-small';
      if (level >= 5) {
        upBtn.textContent = 'MAX +5';
        upBtn.disabled = true;
      } else {
        upBtn.textContent = '⬆️ +1 (' + level + '/5)';
        upBtn.title = 'Nâng cấp · 100.000 xu';
        upBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._modalPlayer = p;
          this._modalFromInventory = true;
          this.upgradePlayer();
        });
      }
      actions.appendChild(upBtn);

      const sellBtn = document.createElement('button');
      sellBtn.className = 'btn-sell-quick';
      sellBtn.textContent = 'Bán';
      sellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._modalPlayer = p;
        this._modalFromInventory = true;
        this.sellPlayer();
        this.renderInventory();
      });
      actions.appendChild(sellBtn);

      wrap.appendChild(actions);
      grid.appendChild(wrap);
    });
  }


  renderMarket() {
    const grid = document.getElementById('market-grid');
    const empty = document.getElementById('market-empty');
    if (!grid) return;
    const mode = this._marketTab || 'buy';
    const sort = (document.getElementById('market-sort') || {}).value || 'price-desc';
    const seasonF = (document.getElementById('market-filter-season') || {}).value || 'all';

    document.querySelectorAll('.market-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mtab === mode);
    });
    const refreshBtn = document.getElementById('btn-market-refresh');
    if (refreshBtn) refreshBtn.style.display = mode === 'buy' ? '' : 'none';

    let list = [];
    if (mode === 'buy') {
      list = this.generateMarketListings().map(p => {
        const pr = this.getBuyPrice(p);
        return Object.assign({}, p, { _price: pr.coins, _gems: pr.gems });
      });
    } else {
      list = this.inventory.map(p => {
        const pr = this.getSellPrice(p);
        return Object.assign({}, p, { _price: pr.coins, _gems: pr.gems });
      });
    }

    if (seasonF !== 'all') list = list.filter(p => p.season === seasonF);

    if (sort === 'price-desc') list.sort((a, b) => b._price - a._price);
    else if (sort === 'price-asc') list.sort((a, b) => a._price - b._price);
    else if (sort === 'ovr-asc') list.sort((a, b) => a.ovr - b.ovr);
    else list.sort((a, b) => b.ovr - a.ovr);

    grid.innerHTML = '';
    if (!list.length) {
      if (empty) {
        empty.style.display = 'block';
        empty.textContent = mode === 'buy'
          ? 'Không có cầu thủ rao bán. Bấm Làm mới!'
          : 'Kho trống. Mở thẻ để có cầu thủ bán!';
      }
      return;
    }
    if (empty) empty.style.display = 'none';

    list.forEach(p => {
      const wrap = document.createElement('div');
      wrap.className = 'market-item';
      if (mode === 'sell') {
        const real = (p._uid && this.inventory.find(x => x._uid === p._uid)) ||
          this.inventory.find(x => x.id === p.id && x.name === p.name && x.ovr === p.ovr) || p;
        const card = this.createCardElement(real);
        card.addEventListener('click', () => this.showPlayerDetail(real, true));
        const price = document.createElement('div');
        price.className = 'market-price';
        price.textContent = '💰 ' + Number(p._price || 0).toLocaleString('vi-VN') + ' 🪙 + ' + Number(p._gems || 0).toLocaleString('vi-VN') + ' 💎';
        const btn = document.createElement('button');
        btn.className = 'btn-sell-quick';
        btn.textContent = 'Bán ngay';
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._modalPlayer = real;
          this._modalFromInventory = true;
          this.sellPlayer();
          this.renderMarket();
        });
        wrap.appendChild(card);
        wrap.appendChild(price);
        wrap.appendChild(btn);
      } else {
        const card = this.createCardElement(p);
        card.addEventListener('click', () => this.showPlayerDetail(p, false));
        const price = document.createElement('div');
        price.className = 'market-price buy-price';
        price.textContent = '🛒 ' + Number(p._price || 0).toLocaleString('vi-VN') + ' 🪙 + ' + Number(p._gems || 0).toLocaleString('vi-VN') + ' 💎';
        const btn = document.createElement('button');
        btn.className = 'btn-buy-quick';
        const can = (Number(this.coins) || 0) >= (p._price || 0) && (Number(this.gems) || 0) >= (p._gems || 0);
        btn.textContent = can ? 'Mua' : 'Thiếu tiền';
        btn.disabled = !can;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.buyMarketPlayer(p);
        });
        wrap.appendChild(card);
        wrap.appendChild(price);
        wrap.appendChild(btn);
      }
      grid.appendChild(wrap);
    });
  }

  // ===== PLAYER DATABASE (Danh sách tất cả cầu thủ) =====
  renderDatabase() {
    const grid = document.getElementById('database-grid');
    const empty = document.getElementById('database-empty');
    const countEl = document.getElementById('db-count');
    const search = (document.getElementById('db-search').value || '').trim().toLowerCase();
    const seasonFilter = document.getElementById('db-filter-season').value;
    const nationFilter = document.getElementById('db-filter-nation').value;
    const posFilter = document.getElementById('db-filter-pos').value;
    const sort = document.getElementById('db-sort').value;

    let list = [...PLAYERS];

    if (search) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(search) ||
        (p.club && p.club.toLowerCase().includes(search)) ||
        (p.nation && p.nation.toLowerCase().includes(search))
      );
    }
    if (seasonFilter !== 'all') {
      list = list.filter(p => p.season === seasonFilter);
    }
    if (nationFilter !== 'all') {
      list = list.filter(p => p.nation === nationFilter);
    }
    if (posFilter !== 'all') {
      list = list.filter(p => p.pos === posFilter);
    }

    if (sort === 'ovr-desc') list.sort((a, b) => b.ovr - a.ovr);
    else if (sort === 'ovr-asc') list.sort((a, b) => a.ovr - b.ovr);
    else if (sort === 'season') list.sort((a, b) => a.season.localeCompare(b.season) || b.ovr - a.ovr);
    else list.sort((a, b) => a.name.localeCompare(b.name));

    countEl.textContent = `${list.length} / ${PLAYERS.length} cầu thủ`;

    grid.innerHTML = '';
    if (list.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    // Limit render for performance if too many (still show all but batch visually)
    list.forEach(p => {
      const el = this.createCardElement(p);
      el.addEventListener('click', () => this.showPlayerDetail(p));
      grid.appendChild(el);
    });
  }


  // ===== RANK =====
  getRankDisplay() {
    return getRankInfo(this.rankId || 'nhua', this.rankStars || 0);
  }

  updateRankUI() {
    const info = this.getRankDisplay();
    let stars;
    if (info.isGod || info.id === 'chienthan' || info.isMaster) {
      stars = '★' + (info.stars || 0);
    } else {
      stars = '★'.repeat(Math.min(info.stars, info.maxStars)) + '☆'.repeat(Math.max(0, info.maxStars - info.stars));
    }
    const badgeSrc = info.badgeSm || info.badge || '';
    const badgeImg = badgeSrc
      ? '<img class="rank-badge-img" src="' + badgeSrc + '" alt="' + (info.displayName || '') + '" />'
      : '<span class="rank-icon">' + (info.icon || '') + '</span>';

    const homeBar = document.getElementById('home-rank-bar');
    const home = document.getElementById('home-rank-text');
    if (homeBar) {
      homeBar.innerHTML =
        badgeImg +
        '<div class="home-rank-meta"><span class="home-rank-name">' + (info.displayName || '') +
        '</span><span class="home-rank-stars">' + stars + '</span></div>';
    } else if (home) {
      home.textContent = (info.displayName || '') + '  ' + stars;
    }

    const panel = document.getElementById('lineup-rank');
    if (panel) {
      panel.innerHTML =
        '<div class="rank-badge" style="border-color:' + (info.color || '#94a3b8') + '">' +
        badgeImg +
        '<div><strong>' + (info.displayName || '') + '</strong><br><span class="rank-stars">' + stars + '</span></div></div>';
    }
  }

  applyMatchResult(won) {
    const beforeId = this.rankId || 'nhua';
    const beforeStars = this.rankStars || 0;
    const beforeInfo = this.getRankDisplay();

    let id = beforeId;
    let stars = beforeStars;
    const idx = RANK_LADDER.findIndex(r => r.id === id);
    const cur = RANK_LADDER[idx] || RANK_LADDER[0];
    let promoted = false;
    let demoted = false;
    let titleUp = false;

    if (won) {
      stars += 1;
      // Cao Thủ / ĐẠI RAU MÁ đạt 60★ → CHIẾN THẦN NEM CHUA
      if (id === 'caothu' && stars >= 60) {
        id = 'chienthan';
        stars = 0;
        promoted = true;
      } else if (!cur.isMaster && stars > cur.maxStars) {
        if (idx < RANK_LADDER.length - 1) {
          id = RANK_LADDER[idx + 1].id;
          stars = RANK_LADDER[idx + 1].isMaster ? 0 : 1;
          promoted = true;
        } else {
          stars = cur.maxStars;
        }
      }
    } else {
      this.ensureRankProtect && this.ensureRankProtect();
      if ((this.rankProtectLeft || 0) > 0) {
        this.rankProtectLeft -= 1;
        // không trừ sao
        this.toast('🛡️ Rank Protect! Còn ' + this.rankProtectLeft + '/3 hôm nay', 'success');
      } else {
        stars -= 1;
        if (stars < 0) {
          if (idx > 0) {
            const prev = RANK_LADDER[idx - 1];
            id = prev.id;
            demoted = true;
            if (prev.isGod) stars = 0;
            else if (prev.isMaster) stars = Math.min(59, prev.maxStars - 1);
            else stars = prev.maxStars;
          } else {
            stars = 0;
          }
        }
      }
    }

    this.rankId = id;
    this.rankStars = stars;
    this.save();
    this.updateRankUI();

    const afterInfo = this.getRankDisplay();
    if (!promoted && !demoted && beforeInfo.displayName !== afterInfo.displayName) {
      titleUp = won; // mốc sao master/god (10★, 20★...)
    }
    return { before: beforeInfo, after: afterInfo, promoted, demoted, titleUp, won: !!won };
  }

  /** Hiệu ứng thăng hạng rank (Bạc→Vàng, lên Chiến Thần, mốc sao...) */
  showRankUpAnimation(result) {
    if (!result || (!result.promoted && !result.titleUp)) return;
    const after = result.after || this.getRankDisplay();
    const before = result.before || {};
    let overlay = document.getElementById('rankup-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'rankup-overlay';
      overlay.className = 'rankup-overlay';
      overlay.innerHTML = `
        <div class="rankup-burst"></div>
        <div class="rankup-card">
          <div class="rankup-label">THĂNG HẠNG</div>
          <div class="rankup-from" id="rankup-from"></div>
          <div class="rankup-arrow">⬆</div>
          <div class="rankup-icon" id="rankup-icon"></div>
          <div class="rankup-name" id="rankup-name"></div>
          <div class="rankup-stars" id="rankup-stars"></div>
          <button type="button" class="btn-open rankup-ok" id="rankup-ok">Tiếp tục</button>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#rankup-ok').addEventListener('click', () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.classList.add('hidden'), 400);
      });
    }
    overlay.classList.remove('hidden');
    const fromEl = overlay.querySelector('#rankup-from');
    const iconEl = overlay.querySelector('#rankup-icon');
    const nameEl = overlay.querySelector('#rankup-name');
    const starsEl = overlay.querySelector('#rankup-stars');
    if (fromEl) {
      const fromBadge = before.badgeSm || before.badge;
      if (fromBadge) {
        fromEl.innerHTML = '<img class="rankup-from-img" src="' + fromBadge + '" alt="" /> ' + (before.displayName || '');
      } else {
        fromEl.textContent = (before.icon || '') + ' ' + (before.displayName || '');
      }
    }
    if (iconEl) {
      const toBadge = after.badge || after.badgeSm;
      if (toBadge) {
        iconEl.innerHTML = '<img class="rankup-badge-img" src="' + toBadge + '" alt="' + (after.displayName || '') + '" />';
      } else {
        iconEl.textContent = after.icon || '🏆';
      }
    }
    if (nameEl) {
      nameEl.textContent = after.displayName || after.name;
      nameEl.style.color = after.color || '#ffd700';
    }
    if (starsEl) {
      if (after.isMaster || after.isGod) {
        starsEl.textContent = '★ ' + (after.stars || 0) + ' SAO';
      } else {
        starsEl.textContent = '★'.repeat(Math.min(after.stars || 0, after.maxStars || 5));
      }
    }
    // restart CSS animation
    overlay.classList.remove('show');
    void overlay.offsetWidth;
    overlay.classList.add('show');
    // auto close
    clearTimeout(this._rankupTimer);
    this._rankupTimer = setTimeout(() => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.classList.add('hidden'), 400);
    }, 4200);
  }

  // ===== SQUAD / LINEUP =====
  getSquadOvr() {
    let total = 0, n = 0;
    Object.values(this.squad || {}).forEach(uid => {
      const p = this.inventory.find(x => x._uid === uid || x.id === uid);
      if (p) { total += p.ovr; n++; }
    });
    return n ? Math.round(total / n) : 0;
  }

  renderLineup() {
    const pitch = document.getElementById('lineup-pitch');
    if (!pitch) return;
    pitch.innerHTML = '';
    const chem = this.getChemistry ? this.getChemistry() : { slotChem: {} };
    this.getFormationSlots().forEach(slot => {
      const el = document.createElement('button');
      el.className = 'pitch-slot';
      el.style.left = slot.x + '%';
      el.style.top = slot.y + '%';
      const uid = (this.squad || {})[slot.id];
      const p = uid && this.inventory.find(x => x._uid === uid || x.id === uid);
      const sc = (chem.slotChem && chem.slotChem[slot.id]) || 0;
      if (sc >= 70) el.classList.add('chem-full');
      else if (sc >= 40) el.classList.add('chem-mid');
      else if (p) el.classList.add('chem-low');
      const role = (this.slotRoles || {})[slot.id];
      if (p) {
        el.classList.add('filled');
        el.innerHTML = '<span class="ps-ovr">' + p.ovr + '</span><span class="ps-pos">' + slot.pos + (role ? ' · ' + role : '') + '</span><span class="ps-name">' + (p.name.length > 10 ? p.name.slice(0, 9) + '…' : p.name) + '</span>';
      } else {
        el.innerHTML = '<span class="ps-pos">' + slot.pos + '</span><span class="ps-empty">+</span>';
      }
      el.addEventListener('click', () => this.openPicker(slot));
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!p) return;
        const roles = (typeof PLAYER_ROLES !== 'undefined' && PLAYER_ROLES[slot.pos]) || [];
        if (!roles.length) return;
        const pick = prompt('Chọn Role cho ' + slot.pos + ':\n' + roles.join(', '), role || roles[0]);
        if (pick && roles.includes(pick)) {
          this.slotRoles = this.slotRoles || {};
          this.slotRoles[slot.id] = pick;
          this.save();
          this.renderLineup();
        }
      });
      pitch.appendChild(el);
    });
    const ovrEl = document.getElementById('squad-ovr');
    if (ovrEl) ovrEl.textContent = this.getEffectiveSquadOvr ? this.getEffectiveSquadOvr() : this.getSquadOvr();
    const chemEl = document.getElementById('chem-info');
    if (chemEl && chem) {
      chemEl.innerHTML = 'Hóa học: <b>' + (chem.score||0) + '</b> (+' + (chem.bonus||0) + ' OVR)' +
        (chem.links && chem.links.length ? '<br><span class="tf-sub">' + chem.links.join(' · ') + '</span>' : '') +
        '<br><span class="tf-sub">Chuột phải slot = chọn Role (FC 26)</span>';
    }
    const formSel = document.getElementById('formation-select');
    if (formSel && this.formationId) formSel.value = this.formationId;
    this.updateRankUI();
  }

  openPicker(slot) {
    this._pickerSlot = slot;
    const box = document.getElementById('lineup-picker');
    const label = document.getElementById('picker-pos-label');
    const list = document.getElementById('picker-list');
    if (!box || !list) return;
    if (label) label.textContent = 'Chọn ' + slot.pos;
    const used = new Set(Object.values(this.squad || {}));
    let cands = this.inventory.filter(p => !used.has(p._uid) && !used.has(p.id));
    // prefer matching pos
    cands.sort((a, b) => {
      const am = a.pos === slot.pos ? 1 : 0;
      const bm = b.pos === slot.pos ? 1 : 0;
      if (bm !== am) return bm - am;
      return b.ovr - a.ovr;
    });
    list.innerHTML = '';
    // clear slot option
    const clear = document.createElement('button');
    clear.className = 'picker-item clear';
    clear.textContent = '— Để trống —';
    clear.addEventListener('click', () => {
      delete this.squad[slot.id];
      this.save();
      this.renderLineup();
      box.classList.add('hidden');
    });
    list.appendChild(clear);
    cands.slice(0, 40).forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'picker-item';
      btn.innerHTML = '<b>' + p.ovr + '</b> ' + p.name + ' <span>' + p.pos + ' · ' + p.season + '</span>';
      btn.addEventListener('click', () => {
        if (!this.squad) this.squad = {};
        this.squad[slot.id] = p._uid || p.id;
        this.save();
        this.renderLineup();
        box.classList.add('hidden');
      });
      list.appendChild(btn);
    });
    if (!cands.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-msg';
      empty.style.display = 'block';
      empty.textContent = 'Không còn cầu thủ phù hợp trong kho.';
      list.appendChild(empty);
    }
    box.classList.remove('hidden');
  }

  autoLineup() {
    const used = new Set();
    const squad = {};
    this.getFormationSlots().forEach(slot => {
      let cands = this.inventory.filter(p => {
        const id = p._uid || p.id;
        return !used.has(id);
      });
      cands.sort((a, b) => {
        const am = typeof posCompatible === 'function' ? posCompatible(slot.pos, a.pos) : (a.pos === slot.pos ? 2 : 0);
        const bm = typeof posCompatible === 'function' ? posCompatible(slot.pos, b.pos) : (b.pos === slot.pos ? 2 : 0);
        if (bm !== am) return bm - am;
        return b.ovr - a.ovr;
      });
      if (cands[0]) {
        const id = cands[0]._uid || cands[0].id;
        used.add(id);
        squad[slot.id] = id;
      }
    });
    this.squad = squad;
    // Đội trưởng = OVR cao nhất trong đội
    const sps = this.getSquadPlayers ? this.getSquadPlayers() : [];
    if (sps.length) {
      sps.sort((a, b) => b.ovr - a.ovr);
      this.captainUid = sps[0]._uid || sps[0].id;
    }
    this.save();
    this.renderLineup();
    this.toast('Đã tự xếp đội hình!', 'success');
  }

  clearLineup() {
    this.squad = {};
    this.save();
    this.renderLineup();
  }

  // ===== MATCH SIMULATOR =====
  startMatch() {
    if (this._matchRunning) return;
    const filled = this.getFormationSlots().filter(s => this.squad && this.squad[s.id]).length;
    if (filled < 7) {
      this.toast('Cần ít nhất 7 cầu thủ trong đội hình!', 'error');
      this._bossMode = false;
      this._seriesMode = false;
      return;
    }
    const myOvr = this.getEffectiveSquadOvr ? this.getEffectiveSquadOvr() : this.getSquadOvr();
    // AI strength scales with rank
    const rankIdx = Math.max(0, RANK_LADDER.findIndex(r => r.id === this.rankId));
    let aiOvr = Math.min(130, 72 + rankIdx * 6 + Math.floor(Math.random() * 8) + Math.floor((this.rankStars || 0) * 0.3));
    let awayLabel = 'ĐỐI THỦ';
    if (this._friendlyMode && this._friendlyOpponent) {
      aiOvr = Number(this._friendlyOpponent.ovr) || aiOvr;
      awayLabel = '🤝 ' + (this._friendlyOpponent.name || 'Bạn bè') + ' (' + aiOvr + ')';
    } else if (this._bossMode) {
      aiOvr = Math.min(145, myOvr + 8 + Math.floor(Math.random() * 6));
      awayLabel = 'BOSS XI';
    }
    const awayNameEl0 = document.getElementById('match-away-name');
    if (awayNameEl0) awayNameEl0.textContent = awayLabel;
    this.stats = this.stats || {};
    this.stats.matchesPlayed = (this.stats.matchesPlayed || 0) + 1;

    const overlay = document.getElementById('match-overlay');
    const canvas = document.getElementById('match-canvas');
    const logEl = document.getElementById('match-log');
    const scoreEl = document.getElementById('match-score');
    const timeEl = document.getElementById('match-time');
    const skipBtn = document.getElementById('btn-match-skip');
    const closeBtn = document.getElementById('btn-match-close');
    if (!overlay || !canvas) return;

    clearTimeout(this._matchCloseTimer);
    overlay.classList.remove('hidden');
    if (closeBtn) { closeBtn.style.display = 'none'; closeBtn.classList.add('hidden'); }
    const mvpEl0 = document.getElementById('match-mvp');
    if (mvpEl0) { mvpEl0.classList.add('hidden'); mvpEl0.textContent = ''; }
    if (skipBtn) {
      skipBtn.style.display = '';
      skipBtn.classList.remove('hidden');
      skipBtn.disabled = false;
      skipBtn.textContent = '⏭ Skip trận đấu';
    }
    if (logEl) logEl.innerHTML = '';
    document.getElementById('match-away-name').textContent = awayLabel || ('AI ' + aiOvr + ' OVR');

    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    let home = 0, away = 0;
    let minute = 0;
    let homePoss = 0, awayPoss = 0;
    let homeShots = 0, awayShots = 0;
    let homeOnTarget = 0, awayOnTarget = 0;
    this._matchRunning = true;
    this._matchSkip = false;

    // players positions (normalized 0-1)
    const formSlots = this.getFormationSlots();
    const homeP = formSlots.map(s => ({ x: s.x / 100, y: s.y / 100, ox: s.x / 100, oy: s.y / 100 }));
    const awayP = formSlots.map(s => ({ x: 1 - s.x / 100, y: 1 - s.y / 100, ox: 1 - s.x / 100, oy: 1 - s.y / 100 }));
    let ball = { x: 0.5, y: 0.5 };
    let ballTarget = { x: 0.5, y: 0.5 };
    let possession = 'home';
    const diff = myOvr - aiOvr;
    // possession bias theo OVR (+/- tối đa ~20%)
    const homePossBias = 0.5 + Math.max(-0.2, Math.min(0.2, diff * 0.008));

    const log = (msg) => {
      if (!logEl) return;
      const d = document.createElement('div');
      d.textContent = msg;
      logEl.prepend(d);
      while (logEl.children.length > 8) logEl.removeChild(logEl.lastChild);
    };

    const updateMatchStatsUI = () => {
      const el = document.getElementById('match-stats');
      if (!el) return;
      const totalP = homePoss + awayPoss || 1;
      const hp = Math.round(homePoss / totalP * 100);
      el.textContent = 'Kiểm soát ' + hp + '%-' + (100 - hp) + '% · Sút ' + homeShots + '-' + awayShots + ' (trúng ' + homeOnTarget + '-' + awayOnTarget + ')';
    };

    const chance = () => {
      // Cập nhật possession
      if (Math.random() < homePossBias) {
        possession = 'home';
        homePoss++;
      } else {
        possession = 'away';
        awayPoss++;
      }
      ballTarget = {
        x: 0.2 + Math.random() * 0.6,
        y: possession === 'home' ? 0.2 + Math.random() * 0.35 : 0.45 + Math.random() * 0.35
      };

      // Cơ hội dứt điểm ~ mỗi phase
      const tac = this.tactics || {};
      const tacAtk = ((tac.chance || 50) - 50) * 0.0015 + ((tac.buildup || 50) - 50) * 0.0008;
      const attackPower = possession === 'home'
        ? 0.22 + Math.max(0, diff * 0.005) + tacAtk
        : 0.22 + Math.max(0, -diff * 0.005) - tacAtk * 0.5;
      if (Math.random() > attackPower) {
        updateMatchStatsUI();
        return;
      }

      // Có cú sút
      if (possession === 'home') {
        homeShots++;
        // on target
        const onT = Math.random() < (0.45 + Math.max(0, diff * 0.004));
        if (onT) {
          homeOnTarget++;
          // chuyển thành bàn — phụ thuộc OVR + residual random
          const goalP = 0.28 + Math.max(-0.1, Math.min(0.25, diff * 0.006));
          if (Math.random() < goalP) {
            home++;
            ball = { x: 0.5, y: 0.12 };
            ballTarget = { x: 0.5, y: 0.5 };
            log(minute + "' ⚽ BÀN THẮNG! Sút thành bàn (" + home + '-' + away + ')');
          } else {
            log(minute + "' 🎯 Bạn sút trúng đích — thủ môn cứu!");
          }
        } else {
          log(minute + "' 👟 Bạn sút lệch");
        }
      } else {
        awayShots++;
        const onT = Math.random() < (0.45 + Math.max(0, -diff * 0.004));
        if (onT) {
          awayOnTarget++;
          const goalP = 0.28 + Math.max(-0.1, Math.min(0.25, -diff * 0.006));
          if (Math.random() < goalP) {
            away++;
            ball = { x: 0.5, y: 0.88 };
            ballTarget = { x: 0.5, y: 0.5 };
            log(minute + "' ⚽ Đối thủ ghi bàn (" + home + '-' + away + ')');
          } else {
            log(minute + "' 🧤 Thủ môn bạn cứu thua!");
          }
        } else {
          log(minute + "' 👟 Đối thủ sút lệch");
        }
      }
      if (scoreEl) scoreEl.textContent = home + ' - ' + away;
      updateMatchStatsUI();
    };

    const draw = () => {
      // pitch
      ctx.fillStyle = '#1a7a3a';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, W - 24, H - 24);
      ctx.beginPath();
      ctx.moveTo(12, H / 2); ctx.lineTo(W - 12, H / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 40, 0, Math.PI * 2);
      ctx.stroke();
      // penalty boxes
      ctx.strokeRect(W * 0.2, 12, W * 0.6, 70);
      ctx.strokeRect(W * 0.2, H - 82, W * 0.6, 70);

      const drawTeam = (arr, color) => {
        arr.forEach(p => {
          const px = 12 + p.x * (W - 24);
          const py = 12 + p.y * (H - 24);
          ctx.beginPath();
          ctx.arc(px, py, 9, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      };
      drawTeam(homeP, '#3b82f6');
      drawTeam(awayP, '#ef4444');

      // ball
      const bx = 12 + ball.x * (W - 24);
      const by = 12 + ball.y * (H - 24);
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.stroke();
    };

    const tick = () => {
      if (!this._matchRunning) return;
      if (this._matchSkip) {
        // Skip: mô phỏng nhanh vài cơ hội rồi kết thúc 90'
        for (let i = 0; i < 8; i++) chance();
        minute = 90;
      } else {
        minute += 1;
        // animate players slightly
        homeP.forEach(p => {
          p.x = Math.max(0.05, Math.min(0.95, p.ox + (Math.random() - 0.5) * 0.06));
          p.y = Math.max(0.05, Math.min(0.95, p.oy + (Math.random() - 0.5) * 0.06));
        });
        awayP.forEach(p => {
          p.x = Math.max(0.05, Math.min(0.95, p.ox + (Math.random() - 0.5) * 0.06));
          p.y = Math.max(0.05, Math.min(0.95, p.oy + (Math.random() - 0.5) * 0.06));
        });
        ball.x += (ballTarget.x - ball.x) * 0.25;
        ball.y += (ballTarget.y - ball.y) * 0.25;
        if (Math.random() < 0.35) {
          ballTarget.x = Math.max(0.1, Math.min(0.9, ball.x + (Math.random() - 0.5) * 0.3));
          ballTarget.y = Math.max(0.1, Math.min(0.9, ball.y + (Math.random() - 0.5) * 0.3));
        }
        if (minute % 8 === 0) chance();
      }
      if (timeEl) {
        const m = Math.min(90, minute);
        timeEl.textContent = String(m).padStart(2, '0') + ':00';
      }
      draw();

      if (minute >= 90) {
        this._matchRunning = false;
        const won = home > away;
        const drawMatch = home === away;
        let msg;
        if (drawMatch) {
          msg = 'Hòa ' + home + '-' + away + ' · Giữ nguyên rank';
          log('⏱ Hết giờ — Hòa!');
        } else if (won) {
          let rankResult = { after: this.getRankDisplay(), promoted: false, titleUp: false };
          const isBoss = this._bossMode;
          const isSeries = this._seriesMode;
          // Series best-of: only apply rank on series win
          let applyRank = true;
          if (isSeries) {
            this.matchSeries = this.matchSeries || { wins: 0, losses: 0, target: 2 };
            this.matchSeries.wins += 1;
            log('Series: ' + this.matchSeries.wins + '-' + this.matchSeries.losses);
            if (this.matchSeries.wins < this.matchSeries.target) {
              applyRank = false;
              msg = 'THẮNG ' + home + '-' + away + ' (Series ' + this.matchSeries.wins + '/' + this.matchSeries.target + ')';
            } else {
              this.matchSeries = { wins: 0, losses: 0, target: 2 };
            }
          }
          if (applyRank && !isBoss) {
            rankResult = this._friendlyMode ? { after: this.getRankDisplay(), friendly: true } : this.applyMatchResult(true);
          }
          const after = rankResult.after || this.getRankDisplay();
          if (applyRank) {
            msg = 'THẮNG ' + home + '-' + away + '! +1★ → ' + after.displayName;
            if (isBoss) msg = 'BOSS HẠ GỤC! ' + home + '-' + away;
          }
          log('🏆 Chiến thắng! +1 sao xếp hạng');
          if (rankResult.promoted) log('⬆ THĂNG HẠNG → ' + after.displayName + '!');
          // MVP
          const squadP = this.getSquadPlayers ? this.getSquadPlayers() : [];
          if (squadP.length) {
            const mvp = squadP.slice().sort((a, b) => b.ovr - a.ovr)[0];
            log('⭐ MVP: ' + mvp.name + ' (' + mvp.ovr + ' OVR)');
            const mvpEl = document.getElementById('match-mvp');
            if (mvpEl) { mvpEl.textContent = 'MVP: ' + mvp.name + ' · ' + mvp.ovr; mvpEl.classList.remove('hidden'); }
          }
          this.coins += isBoss ? 25000 : 5000;
          this.gems += isBoss ? 30 : 5;
          if (isBoss) this.cd = (this.cd || 0) + 5;
          this.stats.matchesWon = (this.stats.matchesWon || 0) + 1;
          this.trackQuest('win_match', 1);
          this.trackWeek('win_10', 1);
          if (!this._friendlyMode) {
            this.winStreak = (this.winStreak || 0) + 1;
            this.addClubXp && this.addClubXp(25);
            if (this._rivalsMode) this.rivalsPoints = (this.rivalsPoints || 0) + 20;
            if (this._champsMode) { this.champsWins = (this.champsWins||0)+1; this.champsPlayed = (this.champsPlayed||0)+1; }
          } else {
            this.addClubXp && this.addClubXp(5);
          }
          this._rivalsMode = false; this._champsMode = false;
          this.updateSeasonPeak && this.updateSeasonPeak();
          this.updateCurrency();
          this.save();
          this.renderQuests && this.renderQuests();
          if (rankResult.promoted || rankResult.titleUp) {
            setTimeout(() => this.showRankUpAnimation(rankResult), 600);
          }
          this._bossMode = false;
          this._seriesMode = false;
        } else {
          let rankResult = { after: this.getRankDisplay() };
          if (this._seriesMode) {
            this.matchSeries = this.matchSeries || { wins: 0, losses: 0, target: 2 };
            this.matchSeries.losses += 1;
            if (this.matchSeries.losses >= this.matchSeries.target) {
              rankResult = this._friendlyMode ? { after: this.getRankDisplay(), friendly: true } : this.applyMatchResult(false);
              this.matchSeries = { wins: 0, losses: 0, target: 2 };
            }
          } else if (!this._bossMode) {
            rankResult = this._friendlyMode ? { after: this.getRankDisplay(), friendly: true } : this.applyMatchResult(false);
          }
          const after = rankResult.after || this.getRankDisplay();
          msg = 'THUA ' + home + '-' + away + ' → ' + after.displayName +
            (this.rankProtectLeft != null ? ' · Protect còn ' + this.rankProtectLeft + '/3' : '');
          log('😞 Thua · Sút ' + homeShots + '-' + awayShots + ' · Kiểm soát xem bảng thống kê');
          this.winStreak = 0;
          if (this._champsMode) this.champsPlayed = (this.champsPlayed||0)+1;
          if (this._rivalsMode) this.rivalsPoints = Math.max(0, (this.rivalsPoints||0) - 5);
          this._rivalsMode = false; this._champsMode = false;
          this._bossMode = false;
          this._seriesMode = false;
        }
        this.toast(msg, won ? 'success' : (drawMatch ? '' : 'error'));
        if (skipBtn) {
          skipBtn.style.display = 'none';
          skipBtn.classList.add('hidden');
        }
        // Tự thoát overlay sau trận (không cần bấm nút)
        clearTimeout(this._matchCloseTimer);
        if (this._friendlyMode && window.Cloud && this._friendlyOpponent?.code) {
          Cloud.reportFriendlyResult(
            this._friendlyOpponent.code,
            this.user?.username || 'guest',
            home + '-' + away
          );
        }
        const wasFriendly = this._friendlyMode;
        this._matchCloseTimer = setTimeout(() => {
          this._matchRunning = false;
          this._matchSkip = false;
          this._friendlyMode = false;
          this._friendlyOpponent = null;
          clearTimeout(this._matchTimer);
          const ov = document.getElementById('match-overlay');
          if (ov) ov.classList.add('hidden');
          const mvpEl = document.getElementById('match-mvp');
          if (mvpEl) mvpEl.classList.add('hidden');
          this.updateRankUI();
          this.renderLineup();
          this.renderQuests && this.renderQuests();
          if (wasFriendly) this.toast('Giao hữu xong — không ±sao rank', 'success');
        }, 1600);
        return;
      }
      this._matchTimer = setTimeout(tick, this._matchSkip ? 40 : 180);
    };

    if (scoreEl) scoreEl.textContent = '0 - 0';
    if (timeEl) timeEl.textContent = '00:00';
    log('Trận đấu bắt đầu! Đội bạn OVR ' + myOvr + ' vs AI ' + aiOvr + ' · Possession/Sút ảnh hưởng tỉ số');
    updateMatchStatsUI();
    draw();
    this._matchTimer = setTimeout(tick, 200);
  }

  // ===== STAR BOOK =====
  getOwnedKeys() {
    const set = new Set();
    this.inventory.forEach(p => set.add(p.name + '|' + p.season));
    return set;
  }

  renderStarbook() {
    this.renderSSSPremium();
    const grid = document.getElementById('starbook-grid');
    const stats = document.getElementById('sb-stats');
    const bar = document.getElementById('sb-bar');
    if (!grid) return;
    const owned = this.getOwnedKeys();
    // unique catalog by name+season
    const catalog = [];
    const seen = new Set();
    (PLAYERS || []).forEach(p => {
      const k = p.name + '|' + p.season;
      if (seen.has(k)) return;
      seen.add(k);
      catalog.push(p);
    });
    const total = catalog.length;
    const have = catalog.filter(p => owned.has(p.name + '|' + p.season)).length;
    const pct = total ? Math.floor(have / total * 100) : 0;
    if (stats) stats.textContent = have + ' / ' + total + ' (' + pct + '%)';
    if (bar) bar.style.width = pct + '%';

    // milestones
    const ms = document.getElementById('sb-milestones');
    if (ms) {
      ms.innerHTML = STARBOOK_MILESTONES.map(m => {
        const claimed = (this.starbookClaimed || []).includes(m.pct);
        const can = pct >= m.pct && !claimed;
        return '<button class="sb-ms' + (claimed ? ' claimed' : '') + (can ? ' can' : '') + '" data-ms="' + m.pct + '"' +
          (can ? '' : ' disabled') + '>' + m.pct + '% · ' + (claimed ? 'Đã nhận' : (m.gems + '💎 + ' + (m.coins/1000) + 'k🪙')) + '</button>';
      }).join('');
      ms.querySelectorAll('[data-ms]').forEach(btn => {
        btn.addEventListener('click', () => this.claimStarbook(Number(btn.dataset.ms)));
      });
    }

    const q = ((document.getElementById('sb-search') || {}).value || '').trim().toLowerCase();
    const f = ((document.getElementById('sb-filter') || {}).value || 'all');
    let list = catalog;
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
    if (f === 'owned') list = list.filter(p => owned.has(p.name + '|' + p.season));
    if (f === 'missing') list = list.filter(p => !owned.has(p.name + '|' + p.season));
    list = list.slice(0, 80);

    grid.innerHTML = '';
    list.forEach(p => {
      const has = owned.has(p.name + '|' + p.season);
      const wrap = document.createElement('div');
      wrap.className = 'sb-item' + (has ? ' owned' : ' missing');
      const card = this.createCardElement(p);
      if (!has) card.style.opacity = '0.35';
      wrap.appendChild(card);
      const tag = document.createElement('div');
      tag.className = 'sb-tag';
      tag.textContent = has ? '✓ Đã có' : '✗ Chưa có';
      wrap.appendChild(tag);
      grid.appendChild(wrap);
    });
  }

  claimStarbook(pct) {
    if ((this.starbookClaimed || []).includes(pct)) return;
    const owned = this.getOwnedKeys();
    const total = new Set((PLAYERS || []).map(p => p.name + '|' + p.season)).size;
    const have = [...owned].length;
    const cur = total ? Math.floor(have / total * 100) : 0;
    if (cur < pct) return this.toast('Chưa đủ ' + pct + '%!', 'error');
    const m = STARBOOK_MILESTONES.find(x => x.pct === pct);
    if (!m) return;
    this.coins += m.coins;
    this.gems += m.gems;
    this.starbookClaimed = [...(this.starbookClaimed || []), pct];
    this.updateCurrency();
    this.save();
    this.renderStarbook();
    this.toast('Nhận mốc ' + pct + '%: +' + m.gems + '💎 +' + m.coins.toLocaleString() + '🪙', 'success');
  }

  // ===== SỔ SIÊU SAO CAO CẤP (SSS) — mở bằng CD, không có Công Hoàng =====
  renderSSSPremium() {
    const grid = document.getElementById('sss-premium-grid');
    const prog = document.getElementById('sss-premium-progress');
    if (!grid || typeof SSS_PREMIUM === 'undefined') return;

    const owned = this.sssOwned || [];
    if (prog) {
      const n = owned.length;
      const msHtml = (typeof SSS_PREMIUM_MILESTONES !== 'undefined' ? SSS_PREMIUM_MILESTONES : []).map(m => {
        const claimed = (this.sssMsClaimed || []).includes(m.count);
        const can = n >= m.count && !claimed;
        return '<button class="sb-ms' + (claimed ? ' claimed' : '') + (can ? ' can' : '') + '" data-sss-ms="' + m.count + '"' +
          (can ? '' : ' disabled') + '>' + m.label + ' · ' + (claimed ? 'Đã nhận' : (m.gems + '💎')) + '</button>';
      }).join('');
      prog.innerHTML = '<div class="sb-stats">Đã mở Sổ Siêu Sao Cao Cấp: <strong>' + n + '</strong> thẻ</div><div class="sb-milestones">' + msHtml + '</div>';
      prog.querySelectorAll('[data-sss-ms]').forEach(btn => {
        btn.addEventListener('click', () => this.claimSSSMilestone(Number(btn.dataset.sssMs)));
      });
    }

    const opened = this.sssOpened || [];
    grid.innerHTML = SSS_PREMIUM.map(item => {
      const already = opened.includes(item.id);
      const can = !already && (Number(this.cd) || 0) >= item.costCD;
      let btnLabel = 'Mở album';
      if (already) btnLabel = '✓ Đã mở';
      else if ((Number(this.cd) || 0) < item.costCD) btnLabel = 'Thiếu CD';
      return '<div class="sss-card' + (already ? ' sss-opened' : '') + '">' +
        '<div class="sss-name">' + item.name + '</div>' +
        '<div class="sss-desc">' + item.desc + '</div>' +
        '<div class="sss-cost">' + (already ? 'Đã mở 1 lần' : ('💠 ' + Number(item.costCD).toLocaleString('vi-VN') + ' CD')) + '</div>' +
        '<button class="btn-open btn-sss" data-sss="' + item.id + '"' + (can ? '' : ' disabled') + '>' +
        btnLabel + '</button></div>';
    }).join('');
    grid.querySelectorAll('[data-sss]').forEach(btn => {
      btn.addEventListener('click', () => this.buySSSPremium(btn.dataset.sss));
    });
  }

  claimSSSMilestone(count) {
    if ((this.sssMsClaimed || []).includes(count)) return;
    if ((this.sssOwned || []).length < count) return this.toast('Chưa đủ ' + count + ' thẻ SSS!', 'error');
    const m = (SSS_PREMIUM_MILESTONES || []).find(x => x.count === count);
    if (!m) return;
    this.coins += m.coins;
    this.gems += m.gems;
    this.sssMsClaimed = [...(this.sssMsClaimed || []), count];
    this.updateCurrency();
    this.save();
    this.renderSSSPremium();
    this.toast('Mốc SSS Cao cấp ' + m.label + ': +' + m.gems + '💎 +' + m.coins.toLocaleString() + '🪙', 'success');
  }

  buySSSPremium(id) {
    const item = (SSS_PREMIUM || []).find(x => x.id === id);
    if (!item) return;
    if (!this.sssOpened) this.sssOpened = [];
    if (this.sssOpened.includes(id)) return this.toast('Album này đã mở rồi (chỉ 1 lần)!', 'error');
    const cost = Number(item.costCD) || 0;
    if ((Number(this.cd) || 0) < cost) return this.toast('Không đủ CD!', 'error');

    const pool = typeof PLAYERS !== 'undefined' ? PLAYERS : [];
    // Không lấy Công Hoàng / Adminstration
    let list = pool.filter(p => {
      if (p.name === 'Công Hoàng') return false;
      if (p.season === 'Adminstration') return false;
      if (item.season && p.season !== item.season) return false;
      if (item.ovrMin && (p.ovr || 0) < item.ovrMin) return false;
      return true;
    });
    if (!list.length) {
      list = pool.filter(p => p.name !== 'Công Hoàng' && p.season !== 'Adminstration' && (p.ovr || 0) >= (item.ovrMin || 90));
    }
    if (!list.length) return this.toast('Không có cầu thủ phù hợp!', 'error');

    const card = list[Math.floor(Math.random() * list.length)];
    this.cd = (Number(this.cd) || 0) - cost;
    const got = {
      ...card,
      _uid: 'u' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      trainLevel: 0, trainExp: 0, upgradeLevel: 0,
      baseOvr: card.ovr
    };
    this.inventory.push(got);
    const key = got.name + '|' + got.season;
    if (!this.sssOwned) this.sssOwned = [];
    if (!this.sssOwned.includes(key)) this.sssOwned.push(key);
    if (!this.sssOpened.includes(id)) this.sssOpened.push(id);
    this.updateCurrency();
    this.save();
    this.renderSSSPremium();
    this.renderStarbook();
    this.toast('Sổ Siêu Sao Cao Cấp: ' + got.name + ' (' + got.ovr + ') · -' + cost + ' CD (đã khóa album)', 'success');
  }

  // ===== NẠP TIỀN → CD + CỬA HÀNG ĐỔI CD =====
  renderTopup() {
    const bal = document.getElementById('cd-shop-balance');
    if (bal) bal.innerHTML = 'CD hiện có: <b>💠 ' + (Number(this.cd) || 0).toLocaleString('vi-VN') + '</b>';

    const shop = document.getElementById('cd-shop-grid');
    const list = (typeof CD_SHOP !== 'undefined' ? CD_SHOP : []);
    if (shop) {
      shop.innerHTML = list.map(p => {
        const rewards = [];
        if (p.coins) rewards.push('🪙 ' + Number(p.coins).toLocaleString('vi-VN') + ' xu');
        if (p.gems) rewards.push('💎 ' + Number(p.gems).toLocaleString('vi-VN') + ' gem');
        if (p.packId) rewards.push('📦 Pack #' + p.packId);
        if (p.protect) rewards.push('🛡️ +' + p.protect + ' Rank Protect');
        if (p.bpPremium) rewards.push('⭐ BP Premium');
        const can = (Number(this.cd) || 0) >= (p.costCD || 0);
        return '<div class="topup-card cd-shop-card' + (p.hot ? ' hot' : '') + (can ? '' : ' disabled') + '">' +
          (p.hot ? '<div class="topup-badge">HOT</div>' : '') +
          '<div class="topup-icon">' + (p.icon || '💠') + '</div>' +
          '<h3>' + p.name + '</h3>' +
          '<p class="tf-sub">' + (p.desc || '') + '</p>' +
          '<div class="topup-rewards">' + rewards.join(' · ') + '</div>' +
          '<div class="topup-price">💠 ' + Number(p.costCD || 0).toLocaleString('vi-VN') + ' CD</div>' +
          '<button type="button" class="btn-open btn-cd-shop" data-cdshop="' + p.id + '"' + (can ? '' : ' disabled') + '>' +
          (can ? 'Đổi ngay' : 'Thiếu CD') + '</button></div>';
      }).join('') || '<p class="tf-sub">Chưa có gói đổi CD</p>';
      shop.querySelectorAll('[data-cdshop]').forEach(btn => {
        btn.addEventListener('click', () => this.buyCdShop(btn.dataset.cdshop));
      });
    }

    const grid = document.getElementById('topup-grid');
    if (!grid || typeof TOPUP_PACKS === 'undefined') return;
    grid.innerHTML = TOPUP_PACKS.map(p => `
      <div class="topup-card${p.hot ? ' hot' : ''}">
        ${p.hot ? '<div class="topup-badge">HOT</div>' : ''}
        <h3>${p.name}</h3>
        <div class="topup-rewards">💠 ${Number(p.cd || 0).toLocaleString('vi-VN')} CD</div>
        <div class="topup-price">${p.price}</div>
        <button class="btn-open btn-topup" data-topup="${p.id}">Nạp ngay</button>
      </div>
    `).join('');
    grid.querySelectorAll('[data-topup]').forEach(btn => {
      btn.addEventListener('click', () => this.doTopup(btn.dataset.topup));
    });
  }

  buyCdShop(id) {
    const list = (typeof CD_SHOP !== 'undefined' ? CD_SHOP : []);
    const p = list.find(x => x.id === id);
    if (!p) return;
    const cost = Number(p.costCD) || 0;
    if ((Number(this.cd) || 0) < cost) return this.toast('Không đủ CD!', 'error');
    if (p.bpPremium && this.bpPremium) return this.toast('Bạn đã có Battle Pass Premium', 'error');

    this.cd = (Number(this.cd) || 0) - cost;
    const got = [];
    if (p.coins) {
      this.coins = (Number(this.coins) || 0) + Number(p.coins);
      got.push('+' + Number(p.coins).toLocaleString('vi-VN') + ' xu');
    }
    if (p.gems) {
      this.gems = (Number(this.gems) || 0) + Number(p.gems);
      got.push('+' + Number(p.gems).toLocaleString('vi-VN') + ' gem');
    }
    if (p.protect) {
      this.ensureRankProtect && this.ensureRankProtect();
      this.rankProtectLeft = (this.rankProtectLeft || 0) + Number(p.protect);
      got.push('+' + p.protect + ' Rank Protect');
    }
    if (p.bpPremium) {
      this.bpPremium = true;
      got.push('BP Premium');
    }
    if (p.packId) {
      const cards = this.generatePackCards(p.packId);
      this.pendingCards = cards;
      cards.forEach(c => {
        c._uid = 'cd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        this.inventory.push(c);
        this.recordHallOfFame && this.recordHallOfFame(c);
      });
      got.push('Pack ' + cards.length + ' thẻ');
      // show open animation if available
      if (typeof this.startOpeningReveal === 'function') {
        // fallthrough to inventory toast
      } else if (typeof this.openPack === 'function') {
        // cards already added
      }
    }

    this.updateCurrency();
    this.save();
    this.renderTopup();
    this.toast('Đổi CD thành công! ' + got.join(' · ') + ' · -' + cost + ' CD', 'success');
  }

  doTopup(id) {
    const p = TOPUP_PACKS.find(x => x.id === id);
    if (!p) return;
    this.toast('Đang xử lý nạp CD...', '');
    setTimeout(() => {
      this.cd = (Number(this.cd) || 0) + Number(p.cd || 0);
      this.updateCurrency();
      this.save();
      this.renderTopup();
      this.toast('Nạp thành công! +' + Number(p.cd || 0).toLocaleString('vi-VN') + ' CD', 'success');
    }, 500);
  }

  showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(sectionId);
    if (el) el.classList.add('active');
    else console.warn('Section not found:', sectionId);
    if (sectionId === 'lineup') this.renderLineup();
    if (sectionId === 'fc-hub' || sectionId === 'shop') {
      this.renderFcPanels && this.renderFcPanels();
      if (typeof PACK_ODDS_TEXT !== 'undefined') {
        document.querySelectorAll('.pack-card[data-pack]').forEach(card => {
          const id = card.getAttribute('data-pack');
          if (PACK_ODDS_TEXT[id]) {
            card.title = 'Odds: ' + PACK_ODDS_TEXT[id];
            const oddsEl = card.querySelector('.pack-odds');
            if (oddsEl) oddsEl.textContent = PACK_ODDS_TEXT[id];
            else {
              const p = document.createElement('p');
              p.className = 'pack-odds tf-sub';
              p.textContent = PACK_ODDS_TEXT[id];
              card.querySelector('.btn-open')?.before(p);
            }
          }
        });
      }
    }
    if (sectionId === 'starbook') this.renderStarbook();
    if (sectionId === 'topup') this.renderTopup();
    if (sectionId === 'admin') { this.renderAdminContent(); this.renderAdminGiftList && this.renderAdminGiftList(); }
    if (sectionId === 'events') this.renderEventsPanel();
    if (sectionId === 'home') this.updateRankUI();
  }

  // ===== DAILY =====
  checkDailyButton() {
    const btn = document.getElementById('btn-daily');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (now - this.lastDaily < oneDay) {
      btn.disabled = true;
      btn.textContent = '🎁 Đã nhận thưởng hôm nay';
    } else {
      btn.disabled = false;
      btn.textContent = '🎁 Nhận thưởng hàng ngày (+10,000 xu + 20 gem)';
    }
  }


  // ===== FEATURE HELPERS =====
  getFormationSlots() {
    const f = (typeof FORMATIONS !== 'undefined' && FORMATIONS[this.formationId]) || null;
    if (f) return f.slots;
    return (typeof FORMATION_433 !== 'undefined' ? FORMATION_433 : []);
  }

  getSquadPlayers() {
    const out = [];
    (this.getFormationSlots() || []).forEach(slot => {
      const uid = this.squad && this.squad[slot.id];
      if (!uid) return;
      const p = this.inventory.find(x => x._uid === uid || x.id === uid);
      if (p) out.push(p);
    });
    return out;
  }

  getChemistry() {
    return typeof calcChemistry === 'function' ? calcChemistry(this.getSquadPlayers()) : { score: 0, bonus: 0, links: [] };
  }

  getEffectiveSquadOvr() {
    const base = this.getSquadOvr();
    const chem = this.getChemistry();
    let bonus = chem.bonus || 0;
    // Captain +1 OVR team feel
    if (this.captainUid) {
      const cap = this.inventory.find(x => x._uid === this.captainUid || x.id === this.captainUid);
      if (cap) bonus += 1;
    }
    return base + bonus;
  }

  applyLoginStreak() {
    const today = typeof todayKey === 'function' ? todayKey() : '';
    if (!today) return;
    if (this.lastLoginDay === today) return;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yKey = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
    if (this.lastLoginDay === yKey) this.loginStreak = (this.loginStreak || 0) + 1;
    else this.loginStreak = 1;
    this.lastLoginDay = today;
    this.save();
  }

  ensureQuests() {
    const d = typeof todayKey === 'function' ? todayKey() : '';
    const w = typeof weekKey === 'function' ? weekKey() : '';
    if (this.questDay !== d) {
      this.questDay = d;
      this.questProgress = {};
      this.questClaimed = [];
    }
    if (this.weekKey !== w) {
      this.weekKey = w;
      this.weekProgress = {};
      this.weekClaimed = [];
    }
  }

  trackQuest(id, amount) {
    this.ensureQuests();
    this.questProgress[id] = (this.questProgress[id] || 0) + (amount || 1);
  }

  trackWeek(id, amount) {
    this.ensureQuests();
    this.weekProgress[id] = (this.weekProgress[id] || 0) + (amount || 1);
  }

  claimQuest(id, weekly) {
    this.ensureQuests();
    const list = weekly ? WEEKLY_QUESTS : DAILY_QUESTS;
    const claimed = weekly ? this.weekClaimed : this.questClaimed;
    const prog = weekly ? this.weekProgress : this.questProgress;
    const q = list.find(x => x.id === id);
    if (!q) return;
    if (claimed.includes(id)) return this.toast('Đã nhận rồi!', 'error');
    if ((prog[id] || 0) < q.target) return this.toast('Chưa hoàn thành!', 'error');
    claimed.push(id);
    if (q.reward.coins) this.coins += q.reward.coins;
    if (q.reward.gems) this.gems += q.reward.gems;
    if (q.reward.cd) this.cd = (this.cd || 0) + q.reward.cd;
    this.updateCurrency();
    this.save();
    this.renderQuests();
    this.toast('Nhận thưởng nhiệm vụ!', 'success');
  }

  renderQuests() {
    this.ensureQuests();
    this.ensureRankProtect && this.ensureRankProtect();
    const rp = document.getElementById('rank-protect-info');
    if (rp) rp.textContent = '🛡️ Rank Protect còn ' + (this.rankProtectLeft != null ? this.rankProtectLeft : 3) + '/3 hôm nay (thua không rớt sao)';
    const box = document.getElementById('quest-list');
    if (!box) return;
    const day = (DAILY_QUESTS || []).map(q => {
      const p = this.questProgress[q.id] || 0;
      const done = p >= q.target;
      const claimed = (this.questClaimed || []).includes(q.id);
      return `<div class="quest-row ${claimed ? 'claimed' : ''}">
        <div><strong>${q.name}</strong><br><span class="tf-sub">${Math.min(p, q.target)}/${q.target}</span></div>
        <button class="btn-secondary btn-quest" data-qid="${q.id}" data-weekly="0" ${(!done || claimed) ? 'disabled' : ''}>${claimed ? 'Đã nhận' : 'Nhận'}</button>
      </div>`;
    }).join('');
    const week = (WEEKLY_QUESTS || []).map(q => {
      const p = this.weekProgress[q.id] || 0;
      const done = p >= q.target;
      const claimed = (this.weekClaimed || []).includes(q.id);
      return `<div class="quest-row ${claimed ? 'claimed' : ''}">
        <div><strong>[Tuần] ${q.name}</strong><br><span class="tf-sub">${Math.min(p, q.target)}/${q.target}</span></div>
        <button class="btn-secondary btn-quest" data-qid="${q.id}" data-weekly="1" ${(!done || claimed) ? 'disabled' : ''}>${claimed ? 'Đã nhận' : 'Nhận'}</button>
      </div>`;
    }).join('');
    box.innerHTML = `<div class="quest-streak">🔥 Streak đăng nhập: <b>${this.loginStreak || 0}</b> ngày · Pity pack: <b>${this.pityCount || 0}/${typeof PITY_THRESHOLD !== 'undefined' ? PITY_THRESHOLD : 40}</b></div>` + day + week;
    box.querySelectorAll('.btn-quest').forEach(btn => {
      btn.addEventListener('click', () => this.claimQuest(btn.dataset.qid, btn.dataset.weekly === '1'));
    });
  }

  renderEventBanner() {
    const el = document.getElementById('event-banner');
    if (!el || typeof getActiveSeasonEvent !== 'function') return;
    const ev = getActiveSeasonEvent();
    el.innerHTML = `🎉 <strong>${ev.name}</strong> — tỉ lệ mùa <b>${ev.season}</b> tăng trong pack!`;
    el.classList.remove('hidden');
  }

  setFormation(id) {
    if (!FORMATIONS[id]) return;
    this.formationId = id;
    // clear slots not in new formation
    const ids = new Set(FORMATIONS[id].slots.map(s => s.id));
    Object.keys(this.squad || {}).forEach(k => { if (!ids.has(k)) delete this.squad[k]; });
    this.save();
    this.renderLineup();
    this.toast('Đội hình: ' + FORMATIONS[id].name, 'success');
  }

  setCaptain(uid) {
    this.captainUid = uid || null;
    this.save();
    this.renderLineup();
    this.toast(uid ? 'Đã chọn đội trưởng' : 'Bỏ đội trưởng', 'success');
  }

  renderShowcase() {
    const grid = document.getElementById('showcase-grid');
    if (!grid) return;
    const top = [...this.inventory].sort((a, b) => b.ovr - a.ovr).slice(0, 11);
    grid.innerHTML = '';
    top.forEach(p => grid.appendChild(this.createCardElement(p, false)));
    const meta = document.getElementById('showcase-meta');
    if (meta) {
      const info = this.getRankDisplay();
      meta.textContent = (this.user?.username || '') + ' · ' + info.displayName + ' ★' + (info.stars || 0) +
        ' · Đội OVR ' + this.getEffectiveSquadOvr() + ' · ' + this.inventory.length + ' thẻ';
    }
  }

  renderLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    const users = this.getUsers();
    const rows = [];
    Object.keys(users).forEach(key => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY + '_' + key);
        if (!raw) return;
        const d = JSON.parse(raw);
        const rankId = d.rankId || 'nhua';
        const stars = Number(d.rankStars) || 0;
        const inv = d.inventory || [];
        const maxOvr = inv.reduce((m, p) => Math.max(m, p.ovr || 0), 0);
        const info = typeof getRankInfo === 'function' ? getRankInfo(rankId, stars) : { displayName: rankId };
        const rankIdx = RANK_LADDER.findIndex(r => r.id === rankId);
        rows.push({ user: users[key].username || key, rankIdx, stars, maxOvr, name: info.displayName, count: inv.length });
      } catch (e) {}
    });
    rows.sort((a, b) => b.rankIdx - a.rankIdx || b.stars - a.stars || b.maxOvr - a.maxOvr);
    list.innerHTML = rows.length ? rows.map((r, i) =>
      `<div class="lb-row"><span class="lb-pos">#${i + 1}</span><span class="lb-name">${r.user}</span><span class="lb-rank">${r.name} ★${r.stars}</span><span class="lb-ovr">Max ${r.maxOvr}</span></div>`
    ).join('') : '<p class="empty-msg" style="display:block">Chưa có dữ liệu.</p>';
  }

  renderGiftBoard() {
    const list = document.getElementById('gift-board-list');
    if (!list) return;
    const gifts = this.getGifts();
    const codes = Object.keys(gifts);
    list.innerHTML = codes.length ? codes.map(c => {
      const g = gifts[c];
      const left = g.maxUses ? Math.max(0, g.maxUses - (g.used || 0)) : '∞';
      return `<div class="gift-board-row"><strong>${c}</strong><span>còn ${left} lượt · bởi ${g.createdBy || '?'}</span></div>`;
    }).join('') : '<p class="empty-msg" style="display:block">Chưa có code công khai.</p>';
  }

  exportSave() {
    if (!this.user) return this.toast('Cần đăng nhập', 'error');
    this.save();
    const raw = localStorage.getItem(this.storageKey());
    const blob = new Blob([raw || '{}'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'fc-save-' + (this.user.username || 'guest') + '.json';
    a.click();
    this.toast('Đã xuất save!', 'success');
  }

  importSave(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object') throw new Error('invalid');
        localStorage.setItem(this.storageKey(), JSON.stringify(data));
        this.load();
        this.updateCurrency();
        this.updateRankUI();
        this.renderQuests();
        this.toast('Đã nhập save!', 'success');
      } catch (e) {
        this.toast('File save không hợp lệ', 'error');
      }
    };
    reader.readAsText(file);
  }

  startBossMatch() {
    this._bossMode = true;
    this.startMatch();
  }

  startSeriesMatch() {
    if (!this.matchSeries) this.matchSeries = { wins: 0, losses: 0, target: 2 };
    this._seriesMode = true;
    this.startMatch();
  }

  updateSeasonPeak() {
    const idx = RANK_LADDER.findIndex(r => r.id === this.rankId);
    const pIdx = RANK_LADDER.findIndex(r => r.id === this.seasonPeakRank);
    if (idx > pIdx || (idx === pIdx && this.rankStars > this.seasonPeakStars)) {
      this.seasonPeakRank = this.rankId;
      this.seasonPeakStars = this.rankStars;
    }
  }

  claimDaily() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (now - this.lastDaily < oneDay) {
      this.toast('Bạn đã nhận thưởng hôm nay rồi!', 'error');
      return;
    }
    this.applyLoginStreak();
    let coins = 10000;
    let gems = 20;
    const streak = this.loginStreak || 1;
    // streak bonus
    coins += Math.min(50000, (streak - 1) * 2000);
    gems += Math.min(100, (streak - 1) * 5);
    // day 7 bonus pack gem small
    if (streak > 0 && streak % 7 === 0) {
      gems += 100;
      this.cd = (this.cd || 0) + 10;
    }
    this.coins += coins;
    this.gems += gems;
    this.lastDaily = now;
    this.updateCurrency();
    this.save();
    this.checkDailyButton();
    this.renderQuests();
    this.toast('Nhận ' + coins.toLocaleString() + ' xu + ' + gems + ' gem (streak ' + streak + ')!', 'success');
  }


  // ===== FC SYSTEMS =====
  addClubXp(n) {
    this.clubXp = (this.clubXp || 0) + (n || 0);
    this.bpXp = (this.bpXp || 0) + Math.floor((n || 0) * 0.5);
  }

  getClubLevel() {
    return typeof clubLevelFromXp === 'function' ? clubLevelFromXp(this.clubXp || 0) : 1;
  }

  recordHallOfFame(card) {
    if (!card || (card.ovr || 0) < 120) return;
    this.hallOfFame = this.hallOfFame || [];
    const key = card.name + '|' + card.season;
    if (this.hallOfFame.some(h => h.name + '|' + h.season === key)) return;
    this.hallOfFame.unshift({ name: card.name, season: card.season, ovr: card.ovr, at: Date.now() });
    this.hallOfFame = this.hallOfFame.slice(0, 50);
  }

  getChemistry() {
    const slots = this.getFormationSlots() || [];
    const packed = [];
    slots.forEach(slot => {
      const uid = this.squad && this.squad[slot.id];
      if (!uid) return;
      const p = this.inventory.find(x => x._uid === uid || x.id === uid);
      if (p) packed.push({ player: p, slotId: slot.id, slotPos: slot.pos });
    });
    if (typeof calcChemistryV2 === 'function') {
      return calcChemistryV2(packed, slots, this.slotRoles || {});
    }
    return typeof calcChemistry === 'function' ? calcChemistry(packed.map(x => x.player)) : { score: 0, bonus: 0, links: [], slotChem: {} };
  }

  getEffectiveSquadOvr() {
    const base = this.getSquadOvr();
    const chem = this.getChemistry();
    let bonus = chem.bonus || 0;
    if (this.captainUid) bonus += 1;
    // form from win streak
    const form = Math.min(3, Math.floor((this.winStreak || 0) / 3));
    bonus += form;
    // tactics slight
    if (this.tactics && this.tactics.style === 'Attacking') bonus += 1;
    if (this.tactics && this.tactics.style === 'Defensive') bonus += 0;
    return base + bonus;
  }

  applyEvo(evoId, player) {
    const evo = (typeof EVO_PATHS !== 'undefined' ? EVO_PATHS : []).find(e => e.id === evoId);
    if (!evo || !player) return this.toast('Evo không hợp lệ', 'error');
    if (player.evoId) return this.toast('Thẻ đã evolution rồi!', 'error');
    const real = this.inventory.find(x => x === player || (player._uid && x._uid === player._uid));
    if (!real) return this.toast('Không tìm thấy thẻ', 'error');
    const r = evo.req || {};
    if (r.pos && !r.pos.includes(real.pos)) return this.toast('Sai vị trí cho evo này', 'error');
    if (r.minOvr && real.ovr < r.minOvr) return this.toast('OVR thấp quá', 'error');
    if (r.maxOvr && real.ovr > r.maxOvr) return this.toast('OVR cao quá cho evo này', 'error');
    const costC = evo.costCoins || 0, costG = evo.costGems || 0, costCD = evo.costCD || 0;
    if (this.coins < costC || this.gems < costG || (this.cd || 0) < costCD) return this.toast('Không đủ resource', 'error');
    this.coins -= costC; this.gems -= costG; this.cd = (this.cd || 0) - costCD;
    real.baseOvr = (real.baseOvr != null ? real.baseOvr : real.ovr) + (evo.boost.ovr || 0);
    real.ovr = Math.min(OVR_MAX, real.baseOvr + Math.min(5, real.upgradeLevel || 0));
    real.evoId = evo.id;
    real.evoName = evo.name;
    if (evo.boost.playstyle) {
      real.playstyles = real.playstyles || [];
      real.playstyles.push(evo.boost.playstyle);
    }
    this.addClubXp(40);
    this.updateCurrency();
    this.save();
    this.toast('Evolution thành công! ' + real.name + ' → ' + real.ovr + ' OVR', 'success');
    this.renderFcPanels();
    return true;
  }

  submitSbc(sbcId, uids) {
    const sbc = (typeof SBC_LIST !== 'undefined' ? SBC_LIST : []).find(s => s.id === sbcId);
    if (!sbc) return;
    if ((uids || []).length < sbc.slots) return this.toast('Chưa đủ thẻ', 'error');
    const cards = [];
    for (const uid of uids) {
      const p = this.inventory.find(x => x._uid === uid || x.id === uid);
      if (!p || p.locked) return this.toast('Thẻ khóa / không hợp lệ', 'error');
      if (sbc.filter && !sbc.filter(p)) return this.toast('Thẻ không khớp điều kiện SBC', 'error');
      cards.push(p);
    }
    // remove
    uids.forEach(uid => {
      const i = this.inventory.findIndex(x => x._uid === uid || x.id === uid);
      if (i >= 0) this.inventory.splice(i, 1);
    });
    const rw = sbc.reward || {};
    if (rw.coins) this.coins += rw.coins;
    if (rw.gems) this.gems += rw.gems;
    if (rw.packId) {
      const cards2 = this.generatePackCards(rw.packId);
      cards2.forEach(c => {
        c._uid = 'u' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        this.inventory.push(c);
        this.recordHallOfFame(c);
      });
    }
    if (rw.pick || rw.minOvr) {
      let pool = PLAYERS.filter(p => (p.ovr || 0) >= (rw.minOvr || 80));
      if (rw.special) pool = pool.filter(p => SPECIAL_SEASONS.includes(p.season));
      if (pool.length) {
        const p = pool[Math.floor(Math.random() * pool.length)];
        this.inventory.push({ ...p, _uid: 'sbc_' + Date.now(), trainLevel: 0, trainExp: 0, upgradeLevel: 0, baseOvr: p.ovr, untradeable: true });
        this.recordHallOfFame(p);
      }
    }
    this.addClubXp(60);
    this.seasonTokens = (this.seasonTokens || 0) + 5;
    this.updateCurrency();
    this.save();
    this.renderInventory();
    this.renderFcPanels();
    this.toast('SBC hoàn thành: ' + sbc.name, 'success');
  }

  claimBp(level, premium) {
    const bp = typeof BATTLE_PASS !== 'undefined' ? BATTLE_PASS : null;
    if (!bp) return;
    const xpNeed = level * bp.xpPerLevel;
    if ((this.bpXp || 0) < xpNeed) return this.toast('Chưa đủ BP XP', 'error');
    if (premium && !this.bpPremium) return this.toast('Cần Battle Pass Premium (mua bằng CD)', 'error');
    const list = premium ? bp.premium : bp.free;
    const item = list.find(x => x.level === level);
    if (!item) return;
    const claimed = premium ? this.bpClaimedPrem : this.bpClaimedFree;
    if (claimed.includes(level)) return this.toast('Đã nhận', 'error');
    claimed.push(level);
    if (item.coins) this.coins += item.coins;
    if (item.gems) this.gems += item.gems;
    if (item.cd) this.cd = (this.cd || 0) + item.cd;
    if (item.packId) {
      this.generatePackCards(item.packId).forEach(c => {
        c._uid = 'bp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        c.untradeable = true;
        this.inventory.push(c);
      });
    }
    this.updateCurrency();
    this.save();
    this.renderFcPanels();
    this.toast('Đã nhận BP level ' + level, 'success');
  }

  buyBpPremium() {
    if (this.bpPremium) return this.toast('Đã có Premium', 'error');
    if ((this.cd || 0) < 100) return this.toast('Cần 100 CD', 'error');
    this.cd -= 100;
    this.bpPremium = true;
    this.updateCurrency();
    this.save();
    this.renderFcPanels();
    this.toast('Đã mở Battle Pass Premium!', 'success');
  }


  getSquadSnapshot() {
    const slots = this.getFormationSlots() || [];
    const team = slots.map(s => {
      const uid = this.squad && this.squad[s.id];
      const p = this.inventory.find(x => x._uid === uid || x.id === uid);
      return p
        ? { slot: s.id, pos: s.pos, name: p.name, ovr: p.ovr, season: p.season, nation: p.nation, club: p.club, role: (this.slotRoles || {})[s.id] || '' }
        : { slot: s.id, pos: s.pos, empty: true };
    });
    return {
      v: 1,
      user: this.user?.username || 'guest',
      formation: this.formationId,
      tactics: this.tactics,
      ovr: this.getEffectiveSquadOvr ? this.getEffectiveSquadOvr() : this.getSquadOvr(),
      team
    };
  }

  async createFriendlyRoom() {
    const filled = this.getFormationSlots().filter(s => this.squad && this.squad[s.id]).length;
    if (filled < 7) return this.toast('Cần xếp ít nhất 7 cầu thủ trước khi tạo phòng!', 'error');
    const snap = this.getSquadSnapshot();
    // Local fallback code (luôn có)
    const localCode = 'L' + Math.random().toString(36).slice(2, 8).toUpperCase();
    try {
      sessionStorage.setItem('fc_friendly_' + localCode, JSON.stringify(snap));
    } catch (_) {}

    if (this.cloudOnline && window.Cloud && this.user && this._cloudPass) {
      try {
        Cloud.password = this._cloudPass;
        const res = await Cloud.createFriendly(
          this.user.username,
          this._cloudPass,
          snap,
          snap.ovr,
          this.tactics
        );
        const code = res.code;
        const el = document.getElementById('friendly-code-out');
        if (el) el.textContent = code;
        try { await navigator.clipboard.writeText(code); } catch (_) {}
        this.toast('Phòng giao hữu: ' + code + ' (đã copy) — gửi cho bạn bè!', 'success');
        return code;
      } catch (e) {
        this.toast('Cloud lỗi, dùng mã local: ' + localCode, 'error');
      }
    }
    const el = document.getElementById('friendly-code-out');
    if (el) el.textContent = localCode;
    try { await navigator.clipboard.writeText(localCode); } catch (_) {}
    this.toast('Mã giao hữu local: ' + localCode + ' (bạn bè cần cùng máy/cloud)', 'success');
    return localCode;
  }

  async joinFriendlyRoom() {
    const input = document.getElementById('friendly-code-in');
    const code = (input && input.value ? input.value : prompt('Nhập mã phòng giao hữu:')) || '';
    const c = code.trim().toUpperCase();
    if (!c) return;

    let opp = null;
    // 1) Cloud room
    if (this.cloudOnline && window.Cloud) {
      try {
        const room = await Cloud.getFriendly(c);
        opp = {
          name: room.host,
          ovr: room.ovr,
          squad: room.squad,
          tactics: room.tactics,
          code: room.code
        };
      } catch (e) {
        console.warn(e);
      }
    }
    // 2) session local
    if (!opp) {
      try {
        const raw = sessionStorage.getItem('fc_friendly_' + c);
        if (raw) {
          const snap = JSON.parse(raw);
          opp = { name: snap.user || 'Bạn', ovr: snap.ovr, squad: snap, tactics: snap.tactics, code: c };
        }
      } catch (_) {}
    }
    // 3) Club code (base64 payload)
    if (!opp) {
      try {
        const json = decodeURIComponent(escape(atob(c)));
        const snap = JSON.parse(json);
        if (snap && snap.team) {
          opp = { name: snap.user || 'Club', ovr: snap.ovr, squad: snap, tactics: snap.tactics, code: null };
        }
      } catch (_) {
        try {
          // user might paste club code with different charset
          const snap = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
          if (snap && snap.team) {
            opp = { name: snap.user || 'Club', ovr: snap.ovr, squad: snap, tactics: snap.tactics, code: null };
          }
        } catch (e2) {}
      }
    }

    if (!opp) {
      return this.toast('Không tìm thấy phòng / club code. Kiểm tra lại mã.', 'error');
    }

    this._friendlyMode = true;
    this._friendlyOpponent = opp;
    this._bossMode = false;
    this._seriesMode = false;
    this._rivalsMode = false;
    this._champsMode = false;
    this.toast('Giao hữu vs ' + opp.name + ' · OVR ' + opp.ovr + ' (không ±rank)', 'success');
    this.startMatch();
  }

  playFriendlyVsClubCode() {
    const raw = prompt('Dán Club Code của bạn (Export Club Code):');
    if (!raw) return;
    try {
      const snap = JSON.parse(decodeURIComponent(escape(atob(raw.trim()))));
      if (!snap || !snap.team) throw new Error('bad');
      this._friendlyMode = true;
      this._friendlyOpponent = {
        name: snap.user || 'Bạn bè',
        ovr: snap.ovr || 80,
        squad: snap,
        tactics: snap.tactics,
        code: null
      };
      this._bossMode = false;
      this._seriesMode = false;
      this.toast('Giao hữu vs ' + this._friendlyOpponent.name, 'success');
      this.startMatch();
    } catch {
      this.toast('Club code không hợp lệ', 'error');
    }
  }

  exportClubCode() {
    const payload = this.getSquadSnapshot();
    const str = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    navigator.clipboard?.writeText(str).catch(() => {});
    this.toast('Club code đã copy clipboard!', 'success');
    return str;
  }

  renderFcPanels() {
    try {
      const evoPaths = (typeof EVO_PATHS !== 'undefined' ? EVO_PATHS : (window.EVO_PATHS || []));
      const sbcList = (typeof SBC_LIST !== 'undefined' ? SBC_LIST : (window.SBC_LIST || []));
      const bpData = (typeof BATTLE_PASS !== 'undefined' ? BATTLE_PASS : window.BATTLE_PASS);
      const chains = (typeof OBJECTIVE_CHAINS !== 'undefined' ? OBJECTIVE_CHAINS : (window.OBJECTIVE_CHAINS || []));

      const clubEl = document.getElementById('club-level-info');
      if (clubEl) {
        const lv = this.getClubLevel ? this.getClubLevel() : 1;
        clubEl.innerHTML = 'Club Lv <b>' + lv + '</b> · XP ' + (this.clubXp || 0) +
          ' · Token mùa: <b>' + (this.seasonTokens || 0) + '</b> · Form streak: ' + (this.winStreak || 0);
      }

      const evoBox = document.getElementById('evo-list');
      if (evoBox) {
        if (!evoPaths.length) {
          evoBox.innerHTML = '<p class="tf-sub">Chưa tải được danh sách Evo — F5 lại trang</p>';
        } else {
          evoBox.innerHTML = evoPaths.map(e =>
            '<div class="fc-card"><strong>' + e.name + '</strong>' +
            '<p class="tf-sub">' + e.desc + '</p>' +
            '<p class="tf-sub">💰' + (e.costCoins || 0).toLocaleString() + ' · 💎' + (e.costGems || 0) +
            (e.costCD ? ' · CD ' + e.costCD : '') + '</p>' +
            '<button type="button" class="btn-secondary btn-evo-pick" data-evo="' + e.id + '">Chọn thẻ Evo</button></div>'
          ).join('');
          evoBox.querySelectorAll('.btn-evo-pick').forEach(btn => {
            btn.addEventListener('click', () => this.pickForEvo(btn.dataset.evo));
          });
        }
      }

      const sbcBox = document.getElementById('sbc-list');
      if (sbcBox) {
        if (!sbcList.length) {
          sbcBox.innerHTML = '<p class="tf-sub">Chưa tải SBC — F5 lại trang</p>';
        } else {
          sbcBox.innerHTML = sbcList.map(s =>
            '<div class="fc-card"><strong>' + s.name + '</strong>' +
            '<p class="tf-sub">' + s.desc + '</p>' +
            '<button type="button" class="btn-secondary btn-sbc" data-sbc="' + s.id + '">Nộp SBC</button></div>'
          ).join('');
          sbcBox.querySelectorAll('.btn-sbc').forEach(btn => {
            btn.addEventListener('click', () => this.pickForSbc(btn.dataset.sbc));
          });
        }
      }

      const bpBox = document.getElementById('bp-track');
      if (bpBox) {
        if (!bpData) {
          bpBox.innerHTML = '<p class="tf-sub">Chưa tải Battle Pass</p>';
        } else {
          const bp = bpData;
          const claimedF = this.bpClaimedFree || [];
          const claimedP = this.bpClaimedPrem || [];
          const lv = Math.min(bp.maxLevel, Math.floor((this.bpXp || 0) / bp.xpPerLevel));
          let html = '<p class="tf-sub">BP XP: <b>' + (this.bpXp || 0) + '</b> · Level ~' + lv + '/' + bp.maxLevel + ' · ';
          html += this.bpPremium
            ? '⭐ Premium</p>'
            : '</p><button type="button" class="btn-secondary" id="btn-bp-prem">Mua Premium 100 CD</button>';
          html += '<div class="bp-rows">';
          for (let i = 1; i <= bp.maxLevel; i++) {
            const f = (bp.free || []).find(x => x.level === i);
            const p = (bp.premium || []).find(x => x.level === i);
            html += '<div class="bp-row"><span>Lv' + i + '</span>';
            if (f) html += '<button type="button" class="btn-secondary btn-bp" data-lv="' + i + '" data-prem="0"' +
              (claimedF.includes(i) ? ' disabled' : '') + '>Free</button>';
            else html += '<span></span>';
            if (p) html += '<button type="button" class="btn-secondary btn-bp" data-lv="' + i + '" data-prem="1"' +
              (claimedP.includes(i) ? ' disabled' : '') + '>Prem</button>';
            html += '</div>';
          }
          html += '</div>';
          bpBox.innerHTML = html;
          bpBox.querySelector('#btn-bp-prem')?.addEventListener('click', () => this.buyBpPremium());
          bpBox.querySelectorAll('.btn-bp').forEach(b => {
            b.addEventListener('click', () => this.claimBp(Number(b.dataset.lv), b.dataset.prem === '1'));
          });
        }
      }

      const chainBox = document.getElementById('chain-list');
      if (chainBox) {
        if (!chains.length) {
          chainBox.innerHTML = '<p class="tf-sub">Chưa có objective chain</p>';
        } else {
          chainBox.innerHTML = chains.map(ch => {
            const st = (this.chainProgress || {})[ch.id] || { step: 0, prog: 0 };
            const stepIdx = Math.min(st.step || 0, ch.steps.length - 1);
            const step = ch.steps[stepIdx];
            const done = (st.step || 0) >= ch.steps.length;
            return '<div class="fc-card"><strong>' + ch.name + '</strong><p class="tf-sub">' +
              (done ? '✅ Hoàn thành chain' : (step.name + ' · ' + (st.prog || 0) + '/' + step.target)) +
              '</p></div>';
          }).join('');
        }
      }

      const hof = document.getElementById('hof-list');
      if (hof) {
        const list = this.hallOfFame || [];
        hof.innerHTML = list.length
          ? list.map(h => '<div class="hof-row">' + h.ovr + ' · ' + h.name + ' · ' + h.season + '</div>').join('')
          : '<p class="tf-sub">Thẻ ≥120 từng có sẽ hiện tại đây</p>';
      }

      if (this.tactics) {
        ['buildup', 'chance', 'width', 'depth'].forEach(k => {
          const el = document.getElementById('tac-' + k);
          if (el) el.value = this.tactics[k] || 50;
        });
        const st = document.getElementById('tac-style');
        if (st) st.value = this.tactics.style || 'Balanced';
      }

      const rot = document.getElementById('store-rotation');
      if (rot) {
        const fn = typeof getWeeklyStoreRotation === 'function' ? getWeeklyStoreRotation : window.getWeeklyStoreRotation;
        if (typeof fn === 'function') {
          const r = fn();
          rot.innerHTML = '🛒 <b>' + r.name + '</b> — ' + r.blurb + ' · Boost <b>' + r.seasonBoost + '</b>';
        }
      }

      const riv = document.getElementById('rivals-info');
      if (riv) {
        riv.textContent = 'Rivals điểm: ' + (this.rivalsPoints || 0) +
          ' · Champs: ' + (this.champsWins || 0) + 'W / ' + (this.champsPlayed || 0) + ' trận';
      }
    } catch (err) {
      console.error('renderFcPanels', err);
      const clubEl = document.getElementById('club-level-info');
      if (clubEl) clubEl.textContent = 'FC Hub lỗi: ' + (err.message || err) + ' — F5 hoặc chạy node server.js';
    }
  }

  pickForEvo(evoId) {
    const unlocked = this.inventory.filter(p => !p.evoId && !p.locked);
    if (!unlocked.length) return this.toast('Không có thẻ phù hợp', 'error');
    const top = unlocked.sort((a,b) => b.ovr - a.ovr).slice(0, 15);
    const name = prompt('Nhập chính xác tên thẻ để Evo:\n' + top.map(p => p.name + ' (' + p.ovr + ' ' + p.pos + ')').join('\n'));
    if (!name) return;
    const p = this.inventory.find(x => x.name === name.trim() && !x.evoId);
    if (!p) return this.toast('Không tìm thấy', 'error');
    this.applyEvo(evoId, p);
  }

  pickForSbc(sbcId) {
    const sbc = SBC_LIST.find(s => s.id === sbcId);
    if (!sbc) return;
    const cands = this.inventory.filter(p => !p.locked && (!sbc.filter || sbc.filter(p))).sort((a,b) => a.ovr - b.ovr);
    if (cands.length < sbc.slots) return this.toast('Không đủ thẻ điều kiện', 'error');
    const pick = cands.slice(0, sbc.slots);
    if (!confirm('Nộp ' + pick.map(p => p.name + '(' + p.ovr + ')').join(', ') + '?')) return;
    this.submitSbc(sbcId, pick.map(p => p._uid || p.id));
  }

  saveTacticsFromUI() {
    this.tactics = this.tactics || {};
    ['buildup','chance','width','depth'].forEach(k => {
      const el = document.getElementById('tac-' + k);
      if (el) this.tactics[k] = Number(el.value) || 50;
    });
    const st = document.getElementById('tac-style');
    if (st) this.tactics.style = st.value;
    this.save();
    this.toast('Đã lưu tactics', 'success');
  }

  startRivalsMatch() {
    this._rivalsMode = true;
    this.startMatch();
  }

  startChampsMatch() {
    if ((this.champsPlayed || 0) >= 5) return this.toast('Hết 5 trận Champs tuần (mock)', 'error');
    this._champsMode = true;
    this.startMatch();
  }

  runTutorial() {
    if (this.tutorialDone) return this.toast('Bạn đã xong tutorial', 'success');
    alert('Tutorial nhanh:\\n1) Mở pack ở Cửa hàng\\n2) Vào Kho khóa thẻ quý\\n3) Đội hình → xếp 11\\n4) Đá trận\\n5) Làm SBC / Evo khi Club Lv đủ');
    this.tutorialDone = true;
    this.addClubXp(20);
    this.coins += 10000;
    this.updateCurrency();
    this.save();
    this.toast('Tutorial xong! +10k xu', 'success');
  }


  // ===== ADMIN CONTENT: events + seasons =====
  loadLocalContent() {
    try {
      const raw = localStorage.getItem(CONTENT_KEY);
      if (raw) this.gameContent = JSON.parse(raw);
    } catch (_) {}
    if (!this.gameContent) this.gameContent = { seasons: [], events: [] };
    if (!this.gameContent.seasons) this.gameContent.seasons = [];
    if (!this.gameContent.events) this.gameContent.events = [];
  }

  saveLocalContent() {
    localStorage.setItem(CONTENT_KEY, JSON.stringify(this.gameContent || { seasons: [], events: [] }));
  }

  async syncContentFromCloud() {
    this.loadLocalContent();
    if (this.cloudOnline && window.Cloud) {
      try {
        const c = await Cloud.loadContent();
        if (c && (c.seasons || c.events)) {
          this.gameContent = { seasons: c.seasons || [], events: c.events || [] };
          this.saveLocalContent();
        }
      } catch (e) { console.warn('content sync', e); }
    }
  }

  async publishContent() {
    if (!this.isFullAdmin()) return this.toast('Chỉ Admin chính CongHoang', 'error');
    this.saveLocalContent();
    if (this.cloudOnline && window.Cloud && this._cloudPass) {
      try {
        await Cloud.saveContent(this.user.username, this._cloudPass, this.gameContent);
        this.toast('Đã lưu content lên cloud!', 'success');
      } catch (e) {
        this.toast('Lưu local OK · Cloud: ' + (e.message || e), 'error');
      }
    } else {
      this.toast('Đã lưu content (local)', 'success');
    }
    this.renderAdminContent();
    this.renderEventsPanel();
  }

  getActiveEvents() {
    const now = Date.now();
    return (this.gameContent?.events || []).filter(e => e.active !== false && (!e.endAt || e.endAt > now));
  }

  getActiveCustomSeasons() {
    return (this.gameContent?.seasons || []).filter(s => s.active !== false);
  }

  adminCreateEvent() {
    if (!this.isFullAdmin()) return this.toast('Chỉ CongHoang', 'error');
    const name = (document.getElementById('ev-name')?.value || '').trim();
    const desc = (document.getElementById('ev-desc')?.value || '').trim();
    const days = Math.max(1, Number(document.getElementById('ev-days')?.value) || 7);
    if (!name) return this.toast('Nhập tên sự kiện', 'error');
    const quests = [];
    const qRaw = (document.getElementById('ev-quests')?.value || '').trim();
    qRaw.split('\n').forEach((line, i) => {
      const p = line.split('|').map(x => x.trim());
      if (p.length < 3) return;
      quests.push({
        id: 'q' + i + '_' + Date.now().toString(36).slice(-3),
        name: p[0],
        type: p[1] || 'open_pack',
        target: Number(p[2]) || 1,
        reward: { coins: Number(p[3]) || 0, gems: Number(p[4]) || 0, cd: Number(p[5]) || 0 }
      });
    });
    const shop = [];
    const sRaw = (document.getElementById('ev-shop')?.value || '').trim();
    sRaw.split('\n').forEach((line, i) => {
      const p = line.split('|').map(x => x.trim());
      if (p.length < 2) return;
      shop.push({
        id: 's' + i + '_' + Date.now().toString(36).slice(-3),
        name: p[0],
        costCD: Number(p[1]) || 0,
        coins: Number(p[2]) || 0,
        gems: Number(p[3]) || 0,
        packId: p[4] ? Number(p[4]) : 0
      });
    });
    const id = 'ev_' + Date.now().toString(36);
    const ev = {
      id, name, desc, active: true,
      startAt: Date.now(),
      endAt: Date.now() + days * 86400000,
      quests, shop
    };
    this.loadLocalContent();
    this.gameContent.events = this.gameContent.events || [];
    this.gameContent.events.unshift(ev);
    this.publishContent();
    this.toast('Đã tạo sự kiện: ' + name, 'success');
  }

  adminDeleteEvent(id) {
    if (!this.isFullAdmin()) return;
    this.gameContent.events = (this.gameContent.events || []).filter(e => e.id !== id);
    this.publishContent();
  }

  adminCreateSeason() {
    if (!this.isFullAdmin()) return this.toast('Chỉ CongHoang', 'error');
    const name = (document.getElementById('season-name')?.value || '').trim();
    if (!name) return this.toast('Nhập tên mùa', 'error');
    const rate = Math.max(0, Math.min(100, Number(document.getElementById('season-rate')?.value) || 10)) / 100;
    const ovrMin = Number(document.getElementById('season-ovr-min')?.value) || 100;
    const ovrMax = Number(document.getElementById('season-ovr-max')?.value) || 118;
    const cdOnly = !!document.getElementById('season-cd-only')?.checked;
    const costCD = Number(document.getElementById('season-cd-cost')?.value) || 40;
    const packCount = Math.max(1, Number(document.getElementById('season-pack-count')?.value) || 3);
    const id = 'season_' + Date.now().toString(36);
    const season = {
      id, name, rate, ovrMin, ovrMax, cdOnly, costCD, packCount, active: true, createdAt: Date.now()
    };
    this.loadLocalContent();
    this.gameContent.seasons = this.gameContent.seasons || [];
    // replace same name
    this.gameContent.seasons = this.gameContent.seasons.filter(s => s.name.toLowerCase() !== name.toLowerCase());
    this.gameContent.seasons.unshift(season);
    this.publishContent();
    this.toast('Đã tạo mùa: ' + name + ' · rate ' + (rate * 100) + '%', 'success');
  }

  adminDeleteSeason(id) {
    if (!this.isFullAdmin()) return;
    this.gameContent.seasons = (this.gameContent.seasons || []).filter(s => s.id !== id);
    this.publishContent();
  }

  adminToggleSeason(id) {
    if (!this.isFullAdmin()) return;
    const s = (this.gameContent.seasons || []).find(x => x.id === id);
    if (!s) return;
    s.active = !s.active;
    this.publishContent();
  }

  renderAdminContent() {
    const isFull = this.isFullAdmin();
    const full = document.getElementById('admin-full-only');
    if (full) {
      full.style.display = isFull ? 'block' : 'none';
      full.hidden = !isFull;
    }

    // Badge version để biết đã deploy bản mới chưa
    let verBadge = document.getElementById('admin-build-badge');
    if (!verBadge) {
      const adminSec = document.getElementById('admin');
      const top = adminSec && adminSec.querySelector('.section-top, .section-title, .section-desc');
      verBadge = document.createElement('p');
      verBadge.id = 'admin-build-badge';
      verBadge.className = 'tf-sub';
      verBadge.style.cssText = 'color:#86efac;font-weight:600;margin:8px 0;';
      if (top && top.parentNode) top.parentNode.insertBefore(verBadge, top.nextSibling);
      else if (adminSec) adminSec.prepend(verBadge);
    }
    if (verBadge) {
      verBadge.textContent = 'Build 2.2.2 · user=' + (this.user?.username || '?') +
        ' · fullAdmin=' + isFull + ' · role=' + (this.user?.adminRole || this.getAdminRole() || 'none');
    }

    if (!isFull) return;

    // Inject TRƯỚC khi fill list (index production có thể thiếu HTML form)
    this.ensureAdminFullPanels();
    this.ensureAdminRankPanel();

    const evList = document.getElementById('admin-event-list');
    if (evList) {
      const events = this.gameContent?.events || [];
      evList.innerHTML = events.length ? events.map(e => {
        const left = e.endAt ? Math.max(0, Math.ceil((e.endAt - Date.now()) / 86400000)) : '∞';
        return '<div class="fc-card"><b>' + e.name + '</b> · ' + left + ' ngày · ' +
          (e.quests?.length || 0) + ' NV · ' + (e.shop?.length || 0) + ' quà' +
          ' <button type="button" class="btn-secondary btn-del-ev" data-id="' + e.id + '">Xóa</button></div>';
      }).join('') : '<p class="tf-sub">Chưa có sự kiện</p>';
      evList.querySelectorAll('.btn-del-ev').forEach(b => b.addEventListener('click', () => this.adminDeleteEvent(b.dataset.id)));
    }
    const sList = document.getElementById('admin-season-list');
    if (sList) {
      const seasons = this.gameContent?.seasons || [];
      sList.innerHTML = seasons.length ? seasons.map(s =>
        '<div class="fc-card"><b>' + s.name + '</b> · rate ' + ((s.rate || 0) * 100).toFixed(1) + '%' +
        ' · OVR ' + s.ovrMin + '-' + s.ovrMax +
        (s.cdOnly ? ' · <span style="color:#fbbf24">CD only ' + s.costCD + '</span>' : '') +
        ' · ' + (s.active === false ? 'OFF' : 'ON') +
        ' <button type="button" class="btn-secondary btn-tog-s" data-id="' + s.id + '">Bật/Tắt</button>' +
        ' <button type="button" class="btn-secondary btn-del-s" data-id="' + s.id + '">Xóa</button></div>'
      ).join('') : '<p class="tf-sub">Chưa có mùa custom</p>';
      sList.querySelectorAll('.btn-del-s').forEach(b => b.addEventListener('click', () => this.adminDeleteSeason(b.dataset.id)));
      sList.querySelectorAll('.btn-tog-s').forEach(b => b.addEventListener('click', () => this.adminToggleSeason(b.dataset.id)));
    }

    this.renderAdminRankForm();
  }

  /** Khôi phục block admin-full-only (Sự kiện + Mùa thẻ) nếu HTML thiếu */
  ensureAdminFullPanels() {
    if (!this.isFullAdmin()) return;
    const adminSec = document.getElementById('admin');
    if (!adminSec) return;
    let full = document.getElementById('admin-full-only');
    if (!full) {
      full = document.createElement('div');
      full.id = 'admin-full-only';
      full.className = 'admin-full-panel';
      full.innerHTML =
        '<h2 class="subsection-title">📅 Sự kiện cày (Admin chính)</h2>' +
        '<p class="tf-sub">Tạo event có nhiệm vụ + đổi quà. Người chơi vào tab Sự kiện.</p>' +
        '<div class="admin-form">' +
        '<input type="text" id="ev-name" placeholder="Tên sự kiện" class="db-search" />' +
        '<input type="text" id="ev-desc" placeholder="Mô tả ngắn" class="db-search" />' +
        '<div class="admin-row"><input type="number" id="ev-days" placeholder="Số ngày kéo dài" class="db-search" min="1" value="7" /></div>' +
        '<p class="tf-sub">Nhiệm vụ (mỗi dòng: tên | loại open_pack/win_match/train | target | xu | gem | cd)</p>' +
        '<textarea id="ev-quests" class="admin-textarea" rows="3" placeholder="Mở 10 pack|open_pack|10|50000|20|0"></textarea>' +
        '<p class="tf-sub">Đổi quà (mỗi dòng: tên | costCD | xu thưởng | gem thưởng | packId)</p>' +
        '<textarea id="ev-shop" class="admin-textarea" rows="3" placeholder="Rương event|30|0|0|3"></textarea>' +
        '<button type="button" id="btn-ev-create" class="btn-open">Tạo / Cập nhật sự kiện</button>' +
        '</div><div id="admin-event-list"></div>' +
        '<h2 class="subsection-title">🃏 Mùa thẻ mới + tỉ lệ (Admin chính)</h2>' +
        '<p class="tf-sub">Tạo mùa + set tỉ lệ xuất hiện trong pack. Có thể bán pack chỉ bằng CD.</p>' +
        '<div class="admin-form">' +
        '<input type="text" id="season-name" placeholder="Tên mùa (vd: TET 2026)" class="db-search" />' +
        '<div class="admin-row">' +
        '<input type="number" id="season-rate" placeholder="Tỉ lệ % trong pack (vd: 15)" class="db-search" min="0" max="100" step="0.1" />' +
        '<input type="number" id="season-ovr-min" placeholder="OVR min thẻ ảo" class="db-search" min="70" value="100" />' +
        '<input type="number" id="season-ovr-max" placeholder="OVR max thẻ ảo" class="db-search" min="70" value="118" />' +
        '</div><div class="admin-row">' +
        '<label class="admin-check"><input type="checkbox" id="season-cd-only" /> Pack mùa chỉ mua bằng CD</label>' +
        '<input type="number" id="season-cd-cost" placeholder="Giá CD / pack" class="db-search" min="0" value="40" />' +
        '<input type="number" id="season-pack-count" placeholder="Số thẻ / pack" class="db-search" min="1" value="3" />' +
        '</div>' +
        '<button type="button" id="btn-season-create" class="btn-open">Tạo mùa thẻ</button>' +
        '</div><div id="admin-season-list"></div>';
      const giftList = document.getElementById('admin-gift-list');
      if (giftList && giftList.parentNode) {
        giftList.parentNode.insertBefore(full, giftList.nextSibling);
      } else {
        adminSec.appendChild(full);
      }
      // Bind nút (bindUI có thể đã chạy trước khi inject)
      const evBtn = document.getElementById('btn-ev-create');
      const seBtn = document.getElementById('btn-season-create');
      if (evBtn && !evBtn._bound) {
        evBtn._bound = true;
        evBtn.addEventListener('click', () => this.adminCreateEvent());
      }
      if (seBtn && !seBtn._bound) {
        seBtn._bound = true;
        seBtn.addEventListener('click', () => this.adminCreateSeason());
      }
    }
    full.style.display = 'block';
    full.hidden = false;
  }

  /** Tạo panel set rank bằng JS nếu index.html chưa có (Railway cache / deploy lệch) */
  ensureAdminRankPanel() {
    if (!this.isFullAdmin()) return;
    let box = document.getElementById('admin-rank-panel');
    if (box) {
      box.style.display = 'block';
      return;
    }
    const adminSec = document.getElementById('admin');
    if (!adminSec) return;
    const giftList = document.getElementById('admin-gift-list');
    const full = document.getElementById('admin-full-only');
    box = document.createElement('div');
    box.id = 'admin-rank-panel';
    box.className = 'admin-form';
    box.style.cssText = 'margin-top:20px;padding:16px;border:2px solid #fbbf24;border-radius:12px;background:rgba(15,23,42,0.95);';
    box.innerHTML =
      '<h2 class="subsection-title" style="margin-top:0;color:#fbbf24">🏅 Tự thiết lập Rank (Admin chính)</h2>' +
      '<p class="tf-sub">Chỉ <b>CongHoang</b> · Set rank + sao cho tài khoản đang login</p>' +
      '<p id="admin-rank-current" class="tf-sub">Rank hiện tại: —</p>' +
      '<div class="admin-row" style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0">' +
      '<select id="admin-rank-id" class="db-search" style="min-width:180px">' +
      '<option value="nhua">NHỰA</option>' +
      '<option value="dong">ĐỒNG</option>' +
      '<option value="bac">BẠC</option>' +
      '<option value="vang">VÀNG</option>' +
      '<option value="thegioi">THẾ GIỚI</option>' +
      '<option value="huyenthoai">HUYỀN THOẠI</option>' +
      '<option value="caothu">CAO THỦ / ĐẠI RAU MÁ</option>' +
      '<option value="chienthan">CHIẾN THẦN NEM CHUA</option>' +
      '</select>' +
      '<input type="number" id="admin-rank-stars" class="db-search" min="0" max="9999" value="0" placeholder="Số sao" style="min-width:100px" />' +
      '</div>' +
      '<p class="tf-sub">NHỰA–HUYỀN THOẠI max 5★ · CAO THỦ 0–60★ · CHIẾN THẦN 0–9999★</p>' +
      '<div class="admin-row" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">' +
      '<button type="button" id="btn-admin-set-rank" class="btn-open">Áp dụng Rank</button>' +
      '<button type="button" id="btn-admin-rank-max" class="btn-secondary">Max Chiến Thần 200★</button>' +
      '<button type="button" id="btn-admin-rank-reset" class="btn-secondary">Reset NHỰA 0★</button>' +
      '</div>';
    // Chèn SAU gift list, TRƯỚC full panels nếu có — hoặc cuối admin
    if (full && full.parentNode) {
      full.parentNode.insertBefore(box, full);
    } else if (giftList && giftList.parentNode) {
      giftList.parentNode.insertBefore(box, giftList.nextSibling);
    } else {
      adminSec.appendChild(box);
    }
    const setBtn = document.getElementById('btn-admin-set-rank');
    const maxBtn = document.getElementById('btn-admin-rank-max');
    const resetBtn = document.getElementById('btn-admin-rank-reset');
    if (setBtn && !setBtn._bound) {
      setBtn._bound = true;
      setBtn.addEventListener('click', () => this.adminSetOwnRank());
    }
    if (maxBtn && !maxBtn._bound) {
      maxBtn._bound = true;
      maxBtn.addEventListener('click', () => this.adminSetRankMax());
    }
    if (resetBtn && !resetBtn._bound) {
      resetBtn._bound = true;
      resetBtn.addEventListener('click', () => this.adminSetRankReset());
    }
  }

  renderAdminRankForm() {
    if (!this.isFullAdmin()) return;
    this.ensureAdminRankPanel();
    const curEl = document.getElementById('admin-rank-current');
    const sel = document.getElementById('admin-rank-id');
    const starsIn = document.getElementById('admin-rank-stars');
    const info = this.getRankDisplay();
    if (curEl) {
      curEl.textContent = 'Rank hiện tại: ' + (info.displayName || this.rankId) + ' · ' + (this.rankStars || 0) + '★';
    }
    if (sel) sel.value = this.rankId || 'nhua';
    if (starsIn) starsIn.value = this.rankStars || 0;
  }

  /**
   * Admin chính (CongHoang) tự set rank + sao cho chính mình.
   * @param {string} [rankId]
   * @param {number} [stars]
   */
  adminSetOwnRank(rankId, stars) {
    if (!this.isFullAdmin()) {
      return this.toast('Chỉ Admin chính CongHoang được set rank!', 'error');
    }
    const id = String(rankId || document.getElementById('admin-rank-id')?.value || 'nhua').toLowerCase();
    const ladder = (typeof RANK_LADDER !== 'undefined' ? RANK_LADDER : []);
    const entry = ladder.find(r => r.id === id);
    if (!entry) {
      return this.toast('Rank không hợp lệ: ' + id, 'error');
    }
    let s = Number(stars != null ? stars : document.getElementById('admin-rank-stars')?.value);
    if (isNaN(s) || s < 0) s = 0;
    if (entry.isGod) {
      s = Math.min(9999, Math.floor(s));
    } else if (entry.isMaster) {
      s = Math.min(entry.maxStars || 60, Math.floor(s));
    } else {
      s = Math.min(entry.maxStars || 5, Math.floor(s));
      if (s < 1 && id !== 'nhua') s = 0;
    }
    const before = this.getRankDisplay();
    this.rankId = id;
    this.rankStars = s;
    // Cập nhật peak mùa nếu rank mới cao hơn
    try {
      const idx = ladder.findIndex(r => r.id === this.rankId);
      const pIdx = ladder.findIndex(r => r.id === this.seasonPeakRank);
      if (idx > pIdx || (idx === pIdx && this.rankStars > (this.seasonPeakStars || 0))) {
        this.seasonPeakRank = this.rankId;
        this.seasonPeakStars = this.rankStars;
      }
    } catch (_) {}
    this.save();
    this.updateRankUI();
    this.renderAdminRankForm();
    const after = this.getRankDisplay();
    this.toast('Đã set rank: ' + (after.displayName || id) + ' (' + s + '★)', 'success');
    console.log('[Admin Rank]', before.displayName, '→', after.displayName, s);
  }

  adminSetRankMax() {
    this.adminSetOwnRank('chienthan', 200);
  }

  adminSetRankReset() {
    this.adminSetOwnRank('nhua', 0);
  }

  makeCustomSeasonCard(season) {
    const basePool = PLAYERS.filter(p => p.ovr >= (season.ovrMin || 90) && p.ovr <= (season.ovrMax || 120) && p.season !== 'Adminstration');
    const pool = basePool.length ? basePool : PLAYERS.filter(p => p.ovr >= 90 && p.season !== 'Adminstration');
    const src = pool[Math.floor(Math.random() * pool.length)] || PLAYERS[0];
    const ovr = Math.min(season.ovrMax || 118, Math.max(season.ovrMin || 100, src.ovr));
    return {
      ...src,
      id: 'custom_' + season.id + '_' + Math.random().toString(36).slice(2, 8),
      season: season.name,
      ovr,
      baseOvr: ovr,
      trainLevel: 0,
      trainExp: 0,
      upgradeLevel: 0,
      rarity: ovr >= 110 ? 'special' : (ovr >= 90 ? 'rare' : 'common'),
      _customSeason: true
    };
  }

  trackEventProgress(type, amount) {
    const n = amount || 1;
    const active = this.getActiveEvents();
    if (!active.length) return;
    this.eventProgress = this.eventProgress || {};
    active.forEach(ev => {
      const prog = this.eventProgress[ev.id] || {};
      (ev.quests || []).forEach(q => {
        if (q.type === type) prog[q.id] = (prog[q.id] || 0) + n;
      });
      this.eventProgress[ev.id] = prog;
    });
    this.save();
  }

  claimEventQuest(eventId, questId) {
    const ev = (this.gameContent?.events || []).find(e => e.id === eventId);
    if (!ev) return;
    const q = (ev.quests || []).find(x => x.id === questId);
    if (!q) return;
    const prog = (this.eventProgress[eventId] || {})[questId] || 0;
    if (prog < q.target) return this.toast('Chưa đủ tiến độ', 'error');
    this.eventClaimed = this.eventClaimed || {};
    const claimed = this.eventClaimed[eventId] || [];
    if (claimed.includes(questId)) return this.toast('Đã nhận', 'error');
    claimed.push(questId);
    this.eventClaimed[eventId] = claimed;
    if (q.reward?.coins) this.coins += q.reward.coins;
    if (q.reward?.gems) this.gems += q.reward.gems;
    if (q.reward?.cd) this.cd = (this.cd || 0) + q.reward.cd;
    this.updateCurrency();
    this.save();
    this.renderEventsPanel();
    this.toast('Nhận quà nhiệm vụ event!', 'success');
  }

  buyEventShop(eventId, shopId) {
    const ev = (this.gameContent?.events || []).find(e => e.id === eventId);
    if (!ev) return;
    const item = (ev.shop || []).find(x => x.id === shopId);
    if (!item) return;
    const cost = Number(item.costCD) || 0;
    if ((this.cd || 0) < cost) return this.toast('Không đủ CD', 'error');
    this.cd -= cost;
    if (item.coins) this.coins += item.coins;
    if (item.gems) this.gems += item.gems;
    if (item.packId) {
      const cards = this.generatePackCards(item.packId);
      cards.forEach(c => {
        c._uid = 'ev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        this.inventory.push(c);
      });
    }
    this.updateCurrency();
    this.save();
    this.renderEventsPanel();
    this.toast('Đổi quà event thành công!', 'success');
  }

  openSeasonPack(seasonId) {
    if (this.isOpening) return;
    const season = (this.gameContent?.seasons || []).find(s => s.id === seasonId && s.active !== false);
    if (!season) return this.toast('Mùa không khả dụng', 'error');
    if (!season.cdOnly) return this.toast('Mùa này không bán pack CD riêng', 'error');
    const cost = Number(season.costCD) || 0;
    if ((this.cd || 0) < cost) return this.toast('Không đủ CD!', 'error');
    this.cd -= cost;
    this.updateCurrency();
    this.save();
    this.isOpening = true;
    const count = season.packCount || 3;
    const cards = [];
    for (let i = 0; i < count; i++) {
      // high chance this season
      if (Math.random() < Math.max(0.55, season.rate || 0.4)) {
        cards.push(this.makeCustomSeasonCard(season));
      } else {
        const pool = PLAYERS.filter(p => p.ovr >= 80 && p.season !== 'Adminstration');
        const src = pool[Math.floor(Math.random() * pool.length)];
        cards.push({ ...src, trainLevel: 0, trainExp: 0, upgradeLevel: 0, baseOvr: src.ovr });
      }
    }
    cards.sort((a, b) => b.ovr - a.ovr);
    this.pendingCards = cards;
    this.walkoutQueue = cards.filter(c => c.ovr >= 115);
    this.trackEventProgress('open_pack', 1);
    const overlay = document.getElementById('opening-overlay');
    overlay.classList.remove('hidden');
    document.getElementById('pack-animation').classList.remove('hidden', 'open');
    document.getElementById('cards-reveal').classList.add('hidden');
    document.getElementById('cards-reveal').innerHTML = '';
    document.getElementById('walkout-stage').classList.add('hidden');
    document.getElementById('btn-skip').classList.remove('hidden');
    document.getElementById('btn-continue').classList.add('hidden');
    setTimeout(() => {
      document.getElementById('pack-animation').classList.add('open');
      setTimeout(() => this.startReveal(), 700);
    }, 800);
  }

  renderEventsPanel() {
    const box = document.getElementById('events-panel');
    if (!box) return;
    this.loadLocalContent();
    const events = this.getActiveEvents();
    const seasons = this.getActiveCustomSeasons().filter(s => s.cdOnly);
    let html = '';

    if (seasons.length) {
      html += '<h3 class="subsection-title">Pack mùa (CD)</h3><div class="topup-grid">';
      seasons.forEach(s => {
        html += '<div class="topup-card hot"><h3>' + s.name + '</h3>' +
          '<div class="topup-rewards">' + (s.packCount || 3) + ' thẻ · rate ' + ((s.rate || 0) * 100).toFixed(0) + '%</div>' +
          '<div class="topup-price">💠 ' + (s.costCD || 0) + ' CD</div>' +
          '<button type="button" class="btn-open btn-season-pack" data-sid="' + s.id + '">Mở pack mùa</button></div>';
      });
      html += '</div>';
    }

    if (!events.length && !seasons.length) {
      html += '<p class="empty-msg" style="display:block">Chưa có sự kiện / pack mùa. Admin CongHoang tạo trong Admin Panel.</p>';
    }

    events.forEach(ev => {
      const left = ev.endAt ? Math.max(0, Math.ceil((ev.endAt - Date.now()) / 86400000)) : '∞';
      html += '<div class="hub-tile" style="margin-bottom:14px"><h3>' + ev.name + '</h3>' +
        '<p class="tf-sub">' + (ev.desc || '') + ' · Còn ~' + left + ' ngày</p>';
      html += '<h4 class="tf-sub">Nhiệm vụ</h4>';
      (ev.quests || []).forEach(q => {
        const prog = (this.eventProgress[ev.id] || {})[q.id] || 0;
        const claimed = (this.eventClaimed[ev.id] || []).includes(q.id);
        const done = prog >= q.target;
        html += '<div class="fc-card"><b>' + q.name + '</b> · ' + prog + '/' + q.target +
          (claimed ? ' ✅' : (done ? ' <button type="button" class="btn-secondary btn-ev-claim" data-eid="' + ev.id + '" data-qid="' + q.id + '">Nhận</button>' : '')) +
          '</div>';
      });
      if (ev.shop && ev.shop.length) {
        html += '<h4 class="tf-sub">Đổi quà</h4>';
        ev.shop.forEach(item => {
          html += '<div class="fc-card"><b>' + item.name + '</b> · 💠' + (item.costCD || 0) +
            (item.coins ? ' → 🪙' + item.coins : '') +
            (item.gems ? ' → 💎' + item.gems : '') +
            (item.packId ? ' → Pack ' + item.packId : '') +
            ' <button type="button" class="btn-secondary btn-ev-shop" data-eid="' + ev.id + '" data-sid="' + item.id + '">Đổi</button></div>';
        });
      }
      html += '</div>';
    });
    box.innerHTML = html;
    box.querySelectorAll('.btn-ev-claim').forEach(b => b.addEventListener('click', () => this.claimEventQuest(b.dataset.eid, b.dataset.qid)));
    box.querySelectorAll('.btn-ev-shop').forEach(b => b.addEventListener('click', () => this.buyEventShop(b.dataset.eid, b.dataset.sid)));
    box.querySelectorAll('.btn-season-pack').forEach(b => b.addEventListener('click', () => this.openSeasonPack(b.dataset.sid)));
  }

  // ===== UI BINDINGS =====
  bindUI() {
    const $ = (id) => document.getElementById(id);
    const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

    // Pack open buttons
    document.querySelectorAll('.btn-open').forEach(btn => {
      btn.addEventListener('click', () => {
        const raw = btn.dataset.pack;
        const packId = raw === 'ad' ? 'ad' : parseInt(raw, 10);
        this.openPack(packId);
      });
    });

    // Header
    on('btn-inventory', 'click', () => {
      this.showSection('inventory');
      this.renderInventory();
    });
    on('btn-database', 'click', () => {
      this.showSection('database');
      this.renderDatabase();
    });

    // Inventory filters
    on('filter-season', 'change', () => this.renderInventory());
    on('filter-sort', 'change', () => this.renderInventory());

    // Database filters
    on('db-search', 'input', () => this.renderDatabase());
    on('db-filter-season', 'change', () => this.renderDatabase());
    on('db-filter-nation', 'change', () => this.renderDatabase());
    on('db-filter-pos', 'change', () => this.renderDatabase());
    on('db-sort', 'change', () => this.renderDatabase());

    // Opening controls
    on('btn-skip', 'click', () => {
      clearTimeout(this._walkoutTimer);
      (this._walkoutTimers || []).forEach(clearTimeout);
      const stage = $('walkout-stage');
      if (stage) stage.classList.add('hidden');
      this.walkoutQueue = [];
      if (this._replayMode) {
        this._replayMode = false;
        this.isOpening = false;
        document.getElementById('opening-overlay')?.classList.add('hidden');
        document.getElementById('btn-skip')?.classList.add('hidden');
        return;
      }
      this.showAllCards();
    });
    on('btn-continue', 'click', () => this.finishOpening());

    // Modal
    on('modal-close', 'click', () => {
      const m = $('player-modal');
      if (m) m.classList.add('hidden');
    });
    on('player-modal', 'click', (e) => {
      if (e.target.id === 'player-modal') e.target.classList.add('hidden');
    });
    on('btn-sell-player', 'click', () => this.sellPlayer());
    on('btn-upgrade-player', 'click', () => this.upgradePlayer());
    on('btn-train-player', 'click', () => {
      if (this._modalPlayer) this.openTrainPanel(this._modalPlayer);
    });
    on('btn-train-close', 'click', () => this.closeTrainPanel());
    on('btn-train-confirm', 'click', () => this.confirmTrain());
    on('btn-train-auto', 'click', (e) => {
      e.stopPropagation();
      this.autoSelectFodder(false);
      this.renderTrainPanel();
      this.toast('Đã tự chọn nguyên liệu (OVR thấp → cao, đủ 1 cấp)', 'success');
    });
    on('btn-train-auto-max', 'click', (e) => {
      e.stopPropagation();
      this.autoSelectFodder(true);
      this.renderTrainPanel();
      this.toast('Đã tự chọn tối đa nguyên liệu (OVR thấp → cao)', 'success');
    });
    on('btn-train-clear', 'click', (e) => {
      e.stopPropagation();
      this.clearFodderSelection();
      this.renderTrainPanel();
    });
    on('train-panel', 'click', (e) => {
      if (e.target.id === 'train-panel') this.closeTrainPanel();
    });

    // HD Mobile home navigation
    document.querySelectorAll('[data-home]').forEach(btn => {
      btn.addEventListener('click', () => this.showSection('home'));
    });
    on('nav-shop', 'click', () => this.showSection('shop'));
    on('nav-market', 'click', () => {
      this._marketTab = this._marketTab || 'buy';
      this.showSection('market');
      this.renderMarket();
    });
    on('nav-squad', 'click', () => {
      this.showSection('inventory');
      this.renderInventory();
    });
    on('nav-lineup', 'click', () => this.showSection('lineup'));
    on('nav-starbook', 'click', () => this.showSection('starbook'));
    on('nav-topup', 'click', () => this.showSection('topup'));
    on('btn-auto-lineup', 'click', () => this.autoLineup());
    on('btn-clear-lineup', 'click', () => this.clearLineup());
    on('btn-start-match', 'click', () => this.startMatch());
    on('btn-picker-close', 'click', () => {
      const b = document.getElementById('lineup-picker');
      if (b) b.classList.add('hidden');
    });
    on('btn-match-skip', 'click', () => {
      if (!this._matchRunning) return;
      this._matchSkip = true;
      const skipBtn = document.getElementById('btn-match-skip');
      if (skipBtn) { skipBtn.disabled = true; skipBtn.textContent = 'Đang kết thúc...'; }
    });
    const closeMatch = () => {
      this._matchRunning = false;
      this._matchSkip = false;
      clearTimeout(this._matchTimer);
      const ov = document.getElementById('match-overlay');
      if (ov) ov.classList.add('hidden');
      this.updateRankUI();
      this.renderLineup();
    };
    on('btn-match-close', 'click', closeMatch);
    on('btn-match-x', 'click', closeMatch);
    // Click nền tối cũng thoát khi trận đã xong
    document.getElementById('match-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'match-overlay' && !this._matchRunning) closeMatch();
    });
    on('sb-search', 'input', () => this.renderStarbook());
    on('sb-filter', 'change', () => this.renderStarbook());
    on('market-sort', 'change', () => this.renderMarket());
    on('market-filter-season', 'change', () => this.renderMarket());
    on('btn-market-refresh', 'click', () => {
      this.generateMarketListings(true);
      this.renderMarket();
      this.toast('Đã làm mới thị trường!', 'success');
    });
    document.querySelectorAll('.market-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this._marketTab = tab.dataset.mtab || 'buy';
        this.renderMarket();
      });
    });
    on('btn-daily', 'click', () => this.claimDaily());
    // detail extras (delegation — nút tạo động)
    document.getElementById('player-modal')?.addEventListener('click', (e) => {
      const t = e.target;
      if (!t || !t.id) return;
      if (t.id === 'btn-lock-player') this.toggleLockPlayer();
      if (t.id === 'btn-fav-player') this.toggleFavPlayer();
      if (t.id === 'btn-replay-walkout') this.replayWalkout();
      if (t.id === 'btn-compare-player') this.addToCompare();
    });
    on('btn-seed-demo', 'click', () => this.seedDemoAccount());

    on('btn-boss-match', 'click', () => this.startBossMatch());
    on('btn-series-match', 'click', () => this.startSeriesMatch());
    on('formation-select', 'change', (e) => this.setFormation(e.target.value));
    on('btn-export-save', 'click', () => this.exportSave());
    on('btn-import-save', 'click', () => document.getElementById('import-save-file')?.click());
    const importFile = document.getElementById('import-save-file');
    if (importFile) importFile.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) this.importSave(f);
      e.target.value = '';
    });
    on('btn-reduced-motion', 'click', () => {
      this.reducedMotion = !this.reducedMotion;
      document.body.classList.toggle('reduced-motion', this.reducedMotion);
      this.save();
      this.toast(this.reducedMotion ? 'Đã bật giảm animation' : 'Animation bình thường', 'success');
    });
    on('nav-quests', 'click', () => { this.showSection('quests'); this.renderQuests(); this.renderEventBanner(); });
    on('nav-profile', 'click', () => { this.showSection('profile'); this.renderShowcase(); this.renderLeaderboard(); this.renderGiftBoard(); });
    on('nav-settings', 'click', () => this.showSection('settings'));
    on('nav-fc-hub', 'click', () => { this.showSection('fc-hub'); this.renderFcPanels(); });
    on('btn-save-tactics', 'click', () => this.saveTacticsFromUI());
    document.querySelectorAll('#btn-rivals, [data-action="rivals"]').forEach(b => b.addEventListener('click', () => this.startRivalsMatch()));
    document.querySelectorAll('#btn-champs, [data-action="champs"]').forEach(b => b.addEventListener('click', () => this.startChampsMatch()));
    on('btn-club-code', 'click', () => this.exportClubCode());
    on('btn-friendly-create', 'click', () => this.createFriendlyRoom());
    on('btn-friendly-join', 'click', () => this.joinFriendlyRoom());
    on('btn-friendly-club', 'click', () => this.playFriendlyVsClubCode());

    on('btn-tutorial', 'click', () => this.runTutorial());

    // Mobile tab bar
    const goSection = (id) => {
      if (id === 'more') {
        document.getElementById('mobile-more-sheet')?.classList.remove('hidden');
        return;
      }
      document.getElementById('mobile-more-sheet')?.classList.add('hidden');
      if (id === 'inventory') {
        this.showSection('inventory');
        this.renderInventory();
      } else if (id === 'shop') {
        this.showSection('shop');
        this.renderFcPanels && this.renderFcPanels();
      } else if (id === 'fc-hub') {
        this.showSection('fc-hub');
        this.renderFcPanels && this.renderFcPanels();
      } else if (id === 'lineup') {
        this.showSection('lineup');
        this.renderLineup();
      } else if (id === 'market') {
        this.showSection('market');
        this.renderMarket && this.renderMarket();
      } else if (id === 'events') {
        this.showSection('events');
        this.renderEventsPanel();
      } else if (id === 'quests') {
        this.showSection('quests');
        this.renderQuests && this.renderQuests();
      } else if (id === 'profile') {
        this.showSection('profile');
        this.renderShowcase && this.renderShowcase();
        this.renderLeaderboard && this.renderLeaderboard();
      } else if (id === 'settings') {
        this.showSection('settings');
      } else if (id === 'database') {
        this.showSection('database');
        this.renderDatabase && this.renderDatabase();
      } else if (id === 'starbook') {
        this.showSection('starbook');
        this.renderStarbook && this.renderStarbook();
      } else {
        this.showSection(id || 'home');
      }
      document.querySelectorAll('.mtab').forEach(t => {
        t.classList.toggle('active', t.getAttribute('data-go') === id);
      });
    };
    document.getElementById('mobile-tabbar')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.mtab');
      if (!btn) return;
      goSection(btn.getAttribute('data-go'));
    });
    document.getElementById('mobile-more-sheet')?.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close-sheet') || e.target.classList.contains('mobile-sheet-backdrop')) {
        document.getElementById('mobile-more-sheet')?.classList.add('hidden');
        return;
      }
      const b = e.target.closest('[data-go]');
      if (b) goSection(b.getAttribute('data-go'));
      if (e.target.id === 'msheet-gift') document.getElementById('btn-gift')?.click();
      if (e.target.id === 'msheet-admin') document.getElementById('btn-admin')?.click();
      if (e.target.id === 'msheet-logout') document.getElementById('btn-logout')?.click();
    });



    // Auth
    on('btn-login', 'click', () => {
      this.login(document.getElementById('login-user')?.value, document.getElementById('login-pass')?.value);
    });
    on('btn-register', 'click', () => {
      this.register(document.getElementById('login-user')?.value, document.getElementById('login-pass')?.value);
    });
    on('btn-logout', 'click', () => this.logout());
    ['login-user', 'login-pass'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.login(document.getElementById('login-user')?.value, document.getElementById('login-pass')?.value);
      });
    });

    // Giftcode
    on('btn-gift-redeem', 'click', () => {
      this.redeemGiftCode(document.getElementById('gift-input')?.value);
    });
    on('btn-gift', 'click', () => {
      this.showSection('gift');
    });

    // Admin
    on('btn-admin', 'click', () => {
      if (!this.user?.isAdmin) return this.toast('Không có quyền!', 'error');
      // Đồng bộ role theo username (user cloud cũ có thể thiếu adminRole)
      this.user.adminRole = this.getAdminRole(this.user.username) || this.user.adminRole || null;
      this.user.isAdmin = !!this.user.isAdmin || !!this.user.adminRole || this.isAdminUser(this.user.username);
      this.showSection('admin');
      this.renderAdminGifts();
      this.renderAdminContent();
      // Ẩn / khóa field vượt quyền Admin phó
      const limited = (this.user.adminRole || this.getAdminRole()) === 'limited';
      const playerIn = document.getElementById('admin-player');
      const packIn = document.getElementById('admin-pack');
      const coinsIn = document.getElementById('admin-coins');
      const gemsIn = document.getElementById('admin-gems');
      const cdIn = document.getElementById('admin-cd');
      const usesIn = document.getElementById('admin-maxuses');
      if (playerIn) {
        playerIn.disabled = limited;
        playerIn.placeholder = limited ? 'Admin phó: không tặng cầu thủ' : 'ID/Tên cầu thủ (vd: Công Hoàng)';
        if (limited) playerIn.value = '';
      }
      if (packIn) {
        packIn.placeholder = limited ? 'Pack ID (1,2,3,5 only)' : 'Pack ID (1,2,3,5,1500...)';
      }
      if (coinsIn) coinsIn.placeholder = limited ? 'Xu (max 500.000)' : 'Xu thưởng';
      if (gemsIn) gemsIn.placeholder = limited ? 'Gem (max 5.000)' : 'Gem thưởng';
      if (cdIn) cdIn.placeholder = limited ? 'CD (max 100)' : 'CD thưởng (tặng)';
      if (usesIn) {
        usesIn.placeholder = limited ? 'Số lượt (1–10)' : 'Số lượt dùng (0 = không giới hạn)';
      }
    });
    
    on('btn-ev-create', 'click', () => this.adminCreateEvent());
    on('btn-season-create', 'click', () => this.adminCreateSeason());
    on('nav-events', 'click', () => { this.showSection('events'); this.renderEventsPanel(); });
    on('btn-admin-set-rank', 'click', () => this.adminSetOwnRank());
    on('btn-admin-rank-max', 'click', () => this.adminSetRankMax());
    on('btn-admin-rank-reset', 'click', () => this.adminSetRankReset());

    on('btn-admin-create', 'click', () => {
      const code = document.getElementById('admin-code')?.value;
      const coins = Number(document.getElementById('admin-coins')?.value) || 0;
      const gems = Number(document.getElementById('admin-gems')?.value) || 0;
      const cdAmt = Number(document.getElementById('admin-cd')?.value) || 0;
      const playerId = (document.getElementById('admin-player')?.value || '').trim();
      const packId = (document.getElementById('admin-pack')?.value || '').trim();
      const maxUses = Number(document.getElementById('admin-maxuses')?.value) || 0;
      const rewards = {};
      if (coins) rewards.coins = coins;
      if (gems) rewards.gems = gems;
      if (cdAmt) rewards.cd = cdAmt;
      if (playerId) rewards.playerId = playerId;
      if (packId) rewards.packId = isNaN(Number(packId)) ? packId : Number(packId);
      this.adminCreateGift(code, rewards, maxUses);
    });

    console.log('[FC Pack] UI bound OK');
  }

  toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast ' + type;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2500);
  }
}

// Boot
const game = new Game();
document.addEventListener('DOMContentLoaded', () => game.init());
