/**
 * Rank · Match Simulator · Sổ siêu sao · Nạp tiền CD (giống FV)
 */

const RANK_LADDER = [
  { id: 'nhua', name: 'NHỰA', maxStars: 5, icon: '🧱', color: '#94a3b8', badge: 'assets/ranks/nhua.png', badgeSm: 'assets/ranks/nhua_sm.png' },
  { id: 'dong', name: 'ĐỒNG', maxStars: 5, icon: '🥉', color: '#cd7f32', badge: 'assets/ranks/dong.png', badgeSm: 'assets/ranks/dong_sm.png' },
  { id: 'bac', name: 'BẠC', maxStars: 5, icon: '🥈', color: '#c0c0c0', badge: 'assets/ranks/bac.png', badgeSm: 'assets/ranks/bac_sm.png' },
  { id: 'vang', name: 'VÀNG', maxStars: 5, icon: '🥇', color: '#ffd700', badge: 'assets/ranks/vang.png', badgeSm: 'assets/ranks/vang_sm.png' },
  { id: 'thegioi', name: 'THẾ GIỚI', maxStars: 5, icon: '🌍', color: '#38bdf8', badge: 'assets/ranks/thegioi.png', badgeSm: 'assets/ranks/thegioi_sm.png' },
  { id: 'huyenthoai', name: 'HUYỀN THOẠI', maxStars: 10, icon: '👑', color: '#a855f7', badge: 'assets/ranks/huyenthoai.png', badgeSm: 'assets/ranks/huyenthoai_sm.png' },
  { id: 'caothu', name: 'CAO THỦ', maxStars: 60, icon: '🔥', color: '#ef4444', isMaster: true, badge: 'assets/ranks/caothu.png', badgeSm: 'assets/ranks/caothu_sm.png', badgeMaster: 'assets/ranks/dairauma.png', badgeMasterSm: 'assets/ranks/dairauma_sm.png' },
  { id: 'chienthan', name: 'CHIẾN THẦN NEM CHUA', maxStars: 9999, icon: '⚔️', color: '#f97316', isMaster: true, isGod: true, badge: 'assets/ranks/chienthan.png', badgeSm: 'assets/ranks/chienthan_sm.png' }
];

/** Badge path theo rank + stars (Đại Rau Má dùng badge riêng) */
function getRankBadge(rankId, stars, small) {
  const r = RANK_LADDER.find(x => x.id === rankId) || RANK_LADDER[0];
  const sm = !!small;
  if (rankId === 'caothu' && stars >= 51 && r.badgeMaster) {
    return sm ? (r.badgeMasterSm || r.badgeMaster) : r.badgeMaster;
  }
  return sm ? (r.badgeSm || r.badge) : r.badge;
}

/** Cao Thủ titles — đạt 60★ ĐẠI RAU MÁ → lên Chiến Thần Nem Chua */
const MASTER_TITLES = [
  { min: 0, max: 9, title: 'CAO THỦ 0 SAO' },
  { min: 10, max: 19, title: 'CAO THỦ 10 SAO' },
  { min: 20, max: 29, title: 'CAO THỦ 20 SAO' },
  { min: 30, max: 39, title: 'CAO THỦ 30 SAO' },
  { min: 40, max: 49, title: 'CAO THỦ 40 SAO' },
  { min: 50, max: 50, title: 'CAO THỦ 50 SAO' },
  { min: 51, max: 59, title: 'ĐẠI RAU MÁ' },
  { min: 60, max: 9999, title: 'ĐẠI RAU MÁ 60 SAO' }
];

/** Chiến Thần Nem Chua: 0, 10, 20, ... 100, 200 sao */
const GOD_TITLES = [
  { min: 0, max: 9, title: 'CHIẾN THẦN NEM CHUA 0 SAO' },
  { min: 10, max: 19, title: 'CHIẾN THẦN NEM CHUA 10 SAO' },
  { min: 20, max: 29, title: 'CHIẾN THẦN NEM CHUA 20 SAO' },
  { min: 30, max: 39, title: 'CHIẾN THẦN NEM CHUA 30 SAO' },
  { min: 40, max: 49, title: 'CHIẾN THẦN NEM CHUA 40 SAO' },
  { min: 50, max: 59, title: 'CHIẾN THẦN NEM CHUA 50 SAO' },
  { min: 60, max: 69, title: 'CHIẾN THẦN NEM CHUA 60 SAO' },
  { min: 70, max: 79, title: 'CHIẾN THẦN NEM CHUA 70 SAO' },
  { min: 80, max: 89, title: 'CHIẾN THẦN NEM CHUA 80 SAO' },
  { min: 90, max: 99, title: 'CHIẾN THẦN NEM CHUA 90 SAO' },
  { min: 100, max: 199, title: 'CHIẾN THẦN NEM CHUA 100 SAO' },
  { min: 200, max: 99999, title: 'CHIẾN THẦN NEM CHUA 200 SAO' }
];

const FORMATION_433 = [
  { id: 'gk', pos: 'GK', x: 50, y: 90 },
  { id: 'lb', pos: 'LB', x: 15, y: 72 },
  { id: 'cb1', pos: 'CB', x: 35, y: 75 },
  { id: 'cb2', pos: 'CB', x: 65, y: 75 },
  { id: 'rb', pos: 'RB', x: 85, y: 72 },
  { id: 'cm1', pos: 'CM', x: 30, y: 52 },
  { id: 'cm2', pos: 'CM', x: 50, y: 48 },
  { id: 'cm3', pos: 'CM', x: 70, y: 52 },
  { id: 'lw', pos: 'LW', x: 18, y: 28 },
  { id: 'st', pos: 'ST', x: 50, y: 18 },
  { id: 'rw', pos: 'RW', x: 82, y: 28 }
];

/** Nạp tiền → nhận CD (giống FV) */
const TOPUP_PACKS = [
  { id: 't1', name: 'Gói Tân Thủ', cd: 50, price: '19.000đ', hot: false },
  { id: 't2', name: 'Gói Cơ Bản', cd: 150, price: '49.000đ', hot: false },
  { id: 't3', name: 'Gói Phổ Biến', cd: 350, price: '99.000đ', hot: true },
  { id: 't4', name: 'Gói Cao Cấp', cd: 800, price: '199.000đ', hot: true },
  { id: 't5', name: 'Gói Siêu Sao', cd: 2000, price: '399.000đ', hot: true },
  { id: 't6', name: 'Gói Huyền Thoại', cd: 5500, price: '999.000đ', hot: false }
];

const STARBOOK_MILESTONES = [
  { pct: 5, gems: 50, coins: 10000 },
  { pct: 10, gems: 100, coins: 25000 },
  { pct: 25, gems: 250, coins: 50000 },
  { pct: 50, gems: 500, coins: 100000 },
  { pct: 75, gems: 1000, coins: 250000 },
  { pct: 100, gems: 3000, coins: 1000000 }
];

/**
 * Sổ Siêu Sao Cao Cấp (SSS) — mở gói album cao cấp bằng CD.
 * Không bao gồm Công Hoàng.
 */
const SSS_PREMIUM = [
  { id: 'sss_icon', name: 'Album ICON', season: 'ICON', costCD: 500, ovrMin: 112, desc: 'ICON cao cấp ≥112 OVR' },
  { id: 'sss_gd', name: 'Album GOLDEN DRAGON', season: 'GOLDEN DRAGON', costCD: 450, ovrMin: 110, desc: 'Golden Dragon ≥110' },
  { id: 'sss_toty', name: 'Album TOTY', season: 'TOTY', costCD: 400, ovrMin: 108, desc: 'TOTY ≥108 OVR' },
  { id: 'sss_tots', name: 'Album TOTS', season: 'TOTS', costCD: 350, ovrMin: 105, desc: 'TOTS ≥105 OVR' },
  { id: 'sss_heroes', name: 'Album Heroes', season: 'Heroes', costCD: 320, ovrMin: 105, desc: 'Heroes ≥105 OVR' },
  { id: 'sss_champ', name: 'Album Champions', season: 'Champions', costCD: 280, ovrMin: 100, desc: 'Champions ≥100' },
  { id: 'sss_wc', name: 'Album World Cup', season: 'World Cup', costCD: 250, ovrMin: 98, desc: 'World Cup ≥98' },
  { id: 'sss_ase', name: 'Album ASE', season: 'ASE', costCD: 200, ovrMin: 95, desc: 'ASE / ĐNÁ ≥95' },
  { id: 'sss_elite', name: 'Siêu sao 105+', season: null, costCD: 300, ovrMin: 105, desc: 'Random bất kỳ ≥105' },
  { id: 'sss_legend', name: 'Huyền thoại 118+', season: null, costCD: 800, ovrMin: 118, desc: 'Random ≥118 (không Admin)' },
  { id: 'sss_creation', name: 'Album CREATION', season: 'CREATION', costCD: 600, ovrMin: 128, desc: 'Sơn Liz · Gnam · Mạnh Frost' }
];

/** Mốc thưởng Sổ Siêu Sao Cao Cấp (theo số thẻ SSS đã mở bằng CD) */
const SSS_PREMIUM_MILESTONES = [
  { count: 3, gems: 100, coins: 50000, label: '3 thẻ' },
  { count: 5, gems: 250, coins: 100000, label: '5 thẻ' },
  { count: 10, gems: 500, coins: 250000, label: '10 thẻ' },
  { count: 20, gems: 1200, coins: 500000, label: '20 thẻ' },
  { count: 30, gems: 2500, coins: 1000000, label: '30 thẻ' }
];

function getMasterTitle(stars) {
  for (let i = MASTER_TITLES.length - 1; i >= 0; i--) {
    if (stars >= MASTER_TITLES[i].min) return MASTER_TITLES[i].title;
  }
  return 'CAO THỦ 0 SAO';
}

function getGodTitle(stars) {
  for (let i = GOD_TITLES.length - 1; i >= 0; i--) {
    if (stars >= GOD_TITLES[i].min) return GOD_TITLES[i].title;
  }
  return 'CHIẾN THẦN NEM CHUA 0 SAO';
}

function getRankInfo(rankId, stars) {
  const r = RANK_LADDER.find(x => x.id === rankId) || RANK_LADDER[0];
  const badge = typeof getRankBadge === 'function' ? getRankBadge(rankId, stars, false) : r.badge;
  const badgeSm = typeof getRankBadge === 'function' ? getRankBadge(rankId, stars, true) : r.badgeSm;
  if (r.isGod) {
    return { ...r, displayName: getGodTitle(stars), stars, maxStars: r.maxStars, isMaster: true, badge, badgeSm };
  }
  if (r.isMaster) {
    return { ...r, displayName: getMasterTitle(stars), stars, maxStars: r.maxStars, badge, badgeSm };
  }
  return { ...r, displayName: r.name, stars, maxStars: r.maxStars, badge, badgeSm };
}


/** Đổi CD → xu / gem / pack / buff */
const CD_SHOP = [
  { id: 'cd_coins_1', name: 'Túi Vàng', desc: 'Đổi CD lấy xu', costCD: 10, coins: 500000, gems: 0, icon: '🪙' },
  { id: 'cd_coins_2', name: 'Két Vàng', desc: 'Nhiều xu hơn', costCD: 50, coins: 3000000, gems: 0, icon: '🪙', hot: true },
  { id: 'cd_coins_3', name: 'Kho Bạc', desc: 'Siêu nhiều xu', costCD: 150, coins: 12000000, gems: 0, icon: '🪙' },
  { id: 'cd_gems_1', name: 'Túi Gem', desc: 'Đổi CD lấy gem', costCD: 20, coins: 0, gems: 200, icon: '💎' },
  { id: 'cd_gems_2', name: 'Rương Gem', desc: 'Gem giá trị', costCD: 80, coins: 0, gems: 1000, icon: '💎', hot: true },
  { id: 'cd_gems_3', name: 'Kho Gem', desc: 'Siêu gem', costCD: 200, coins: 0, gems: 3000, icon: '💎' },
  { id: 'cd_combo_1', name: 'Combo Starter', desc: 'Xu + Gem', costCD: 40, coins: 1000000, gems: 150, icon: '🎁' },
  { id: 'cd_combo_2', name: 'Combo Pro', desc: 'Xu + Gem lớn', costCD: 120, coins: 5000000, gems: 600, icon: '🎁', hot: true },
  { id: 'cd_pack_3', name: 'Pack ×3 (CD)', desc: 'Mở 1 pack 3 thẻ', costCD: 30, packId: 3, icon: '📦' },
  { id: 'cd_pack_5', name: 'Pack ×5 (CD)', desc: 'Mở 1 pack 5 thẻ', costCD: 70, packId: 5, icon: '📦', hot: true },
  { id: 'cd_protect', name: 'Rank Protect +1', desc: 'Thêm 1 lần bảo rank hôm nay', costCD: 25, protect: 1, icon: '🛡️' },
  { id: 'cd_bp', name: 'Battle Pass Premium', desc: 'Mở BP Premium', costCD: 100, bpPremium: true, icon: '⭐' }
];
