/**
 * Feature expansions: quests, pity, chemistry, formations, events, etc.
 */

const FORMATIONS = {
  '4-3-3': {
    name: '4-3-3',
    slots: [
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
    ]
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    slots: [
      { id: 'gk', pos: 'GK', x: 50, y: 90 },
      { id: 'lb', pos: 'LB', x: 15, y: 72 },
      { id: 'cb1', pos: 'CB', x: 35, y: 75 },
      { id: 'cb2', pos: 'CB', x: 65, y: 75 },
      { id: 'rb', pos: 'RB', x: 85, y: 72 },
      { id: 'cdm1', pos: 'CDM', x: 35, y: 58 },
      { id: 'cdm2', pos: 'CDM', x: 65, y: 58 },
      { id: 'lam', pos: 'LM', x: 18, y: 38 },
      { id: 'cam', pos: 'CAM', x: 50, y: 40 },
      { id: 'ram', pos: 'RM', x: 82, y: 38 },
      { id: 'st', pos: 'ST', x: 50, y: 16 }
    ]
  },
  '3-5-2': {
    name: '3-5-2',
    slots: [
      { id: 'gk', pos: 'GK', x: 50, y: 90 },
      { id: 'cb1', pos: 'CB', x: 28, y: 75 },
      { id: 'cb2', pos: 'CB', x: 50, y: 78 },
      { id: 'cb3', pos: 'CB', x: 72, y: 75 },
      { id: 'lm', pos: 'LM', x: 12, y: 48 },
      { id: 'cm1', pos: 'CM', x: 35, y: 52 },
      { id: 'cm2', pos: 'CM', x: 50, y: 55 },
      { id: 'cm3', pos: 'CM', x: 65, y: 52 },
      { id: 'rm', pos: 'RM', x: 88, y: 48 },
      { id: 'st1', pos: 'ST', x: 38, y: 18 },
      { id: 'st2', pos: 'ST', x: 62, y: 18 }
    ]
  }
};

const DAILY_QUESTS = [
  { id: 'open_pack', name: 'Mở 3 pack', target: 3, reward: { coins: 15000, gems: 30 } },
  { id: 'win_match', name: 'Thắng 2 trận', target: 2, reward: { coins: 20000, gems: 40 } },
  { id: 'train_player', name: 'Huấn luyện 1 lần', target: 1, reward: { coins: 10000, gems: 20 } },
  { id: 'open_any', name: 'Mở bất kỳ 5 thẻ', target: 5, reward: { coins: 12000, gems: 25 } }
];

const WEEKLY_QUESTS = [
  { id: 'win_10', name: 'Thắng 10 trận trong tuần', target: 10, reward: { coins: 100000, gems: 200, cd: 20 } },
  { id: 'open_20', name: 'Mở 20 pack trong tuần', target: 20, reward: { coins: 80000, gems: 150 } }
];

/** Sự kiện mùa luân phiên theo tuần trong năm */
const SEASON_EVENTS = [
  { season: 'GOLDEN DRAGON', name: 'Tuần Rồng Vàng', boost: 0.35 },
  { season: 'TOTY', name: 'Tuần TOTY', boost: 0.30 },
  { season: 'TOTS', name: 'Tuần TOTS', boost: 0.30 },
  { season: 'ICON', name: 'Tuần ICON', boost: 0.25 },
  { season: 'ASE', name: 'Tuần ASE / ĐNÁ', boost: 0.40 },
  { season: 'Champions', name: 'Tuần Champions', boost: 0.28 },
  { season: 'World Cup', name: 'Tuần World Cup', boost: 0.28 },
  { season: 'Heroes', name: 'Tuần Heroes', boost: 0.25 }
];

function getActiveSeasonEvent() {
  const week = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  return SEASON_EVENTS[week % SEASON_EVENTS.length];
}

function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function weekKey() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + week;
}

const PITY_THRESHOLD = 40; // mở N pack không ra ≥115 → bảo hiểm
const PITY_OVR_MIN = 115;

function calcChemistry(players) {
  // players: array of player objects in squad (filled)
  if (!players || players.length < 2) return { score: 0, bonus: 0, links: [] };
  const n = players.length;
  let score = 0;
  const nationCount = {};
  const clubCount = {};
  const seasonCount = {};
  players.forEach(p => {
    if (!p) return;
    nationCount[p.nation] = (nationCount[p.nation] || 0) + 1;
    clubCount[p.club] = (clubCount[p.club] || 0) + 1;
    seasonCount[p.season] = (seasonCount[p.season] || 0) + 1;
  });
  const links = [];
  Object.entries(nationCount).forEach(([k, v]) => {
    if (v >= 3) { score += v * 2; links.push(v + ' cùng quốc gia: ' + k); }
    else if (v >= 2) { score += v; links.push(v + ' ' + k); }
  });
  Object.entries(clubCount).forEach(([k, v]) => {
    if (v >= 2) { score += v * 2; links.push(v + ' CLB ' + k); }
  });
  Object.entries(seasonCount).forEach(([k, v]) => {
    if (v >= 3) { score += v * 2; links.push(v + ' mùa ' + k); }
    else if (v >= 2) { score += 1; }
  });
  // bonus OVR: floor(score/8) max +5
  const bonus = Math.min(5, Math.floor(score / 8));
  return { score, bonus, links: links.slice(0, 6), filled: n };
}

function posCompatible(slotPos, playerPos) {
  if (slotPos === playerPos) return 2;
  const def = ['CB', 'LB', 'RB', 'LWB', 'RWB'];
  const mid = ['CM', 'CDM', 'CAM', 'LM', 'RM'];
  const att = ['ST', 'CF', 'LW', 'RW'];
  if (def.includes(slotPos) && def.includes(playerPos)) return 1;
  if (mid.includes(slotPos) && mid.includes(playerPos)) return 1;
  if (att.includes(slotPos) && att.includes(playerPos)) return 1;
  if (slotPos === 'GK' && playerPos === 'GK') return 2;
  return 0;
}

/* ===== FC 26 / Mobile / Online style systems ===== */

const PLAYER_ROLES = {
  ST: ['Poacher', 'False 9', 'Advanced Forward', 'Target Forward'],
  CF: ['False 9', 'Advanced Forward', 'Target Forward'],
  LW: ['Inside Forward', 'Winger', 'Wide Playmaker'],
  RW: ['Inside Forward', 'Winger', 'Wide Playmaker'],
  CAM: ['Playmaker', 'Shadow Striker', 'Classic 10'],
  CM: ['Box-to-Box', 'Holding', 'Playmaker'],
  CDM: ['Holding', 'Deep-Lying Playmaker', 'Anchor'],
  LM: ['Winger', 'Wide Midfielder', 'Wide Playmaker'],
  RM: ['Winger', 'Wide Midfielder', 'Wide Playmaker'],
  CB: ['Defender', 'Ball-Playing', 'Stopper'],
  LB: ['Fullback', 'Wingback', 'Falseback'],
  RB: ['Fullback', 'Wingback', 'Falseback'],
  GK: ['Keeper', 'Sweeper Keeper']
};

const ROLE_MATCH_BONUS = {
  'Poacher': { shot: 0.04 },
  'False 9': { poss: 0.03 },
  'Advanced Forward': { shot: 0.03, poss: 0.02 },
  'Inside Forward': { shot: 0.03 },
  'Winger': { poss: 0.02 },
  'Playmaker': { poss: 0.04 },
  'Box-to-Box': { poss: 0.02, shot: 0.01 },
  'Holding': { defend: 0.04 },
  'Anchor': { defend: 0.05 },
  'Ball-Playing': { poss: 0.03 },
  'Wingback': { poss: 0.02 },
  'Sweeper Keeper': { defend: 0.03 }
};

const DEFAULT_TACTICS = {
  buildup: 50,      // 0 slow build - 100 long ball
  chance: 50,       // possession - direct
  width: 50,
  depth: 50,        // defensive line
  style: 'Balanced' // Balanced | Attacking | Defensive
};

const EVO_PATHS = [
  {
    id: 'evo_sharpshooter',
    name: 'Sharpshooter Evo',
    desc: 'ST/CF +2 OVR, +PlayStyle Shooting',
    costCoins: 150000,
    costGems: 50,
    req: { pos: ['ST', 'CF'], maxOvr: 112, minOvr: 85 },
    boost: { ovr: 2, playstyle: { name: 'Power Shot', icon: '💥', rarity: 'gold' } }
  },
  {
    id: 'evo_engine',
    name: 'Engine Evo',
    desc: 'CM/CDM/CAM +2 OVR, +PlayStyle Passing',
    costCoins: 150000,
    costGems: 50,
    req: { pos: ['CM', 'CDM', 'CAM'], maxOvr: 112, minOvr: 85 },
    boost: { ovr: 2, playstyle: { name: 'Incisive Pass', icon: '🎯', rarity: 'gold' } }
  },
  {
    id: 'evo_wall',
    name: 'Brick Wall Evo',
    desc: 'CB/LB/RB +2 OVR, +PlayStyle Defend',
    costCoins: 150000,
    costGems: 50,
    req: { pos: ['CB', 'LB', 'RB'], maxOvr: 112, minOvr: 85 },
    boost: { ovr: 2, playstyle: { name: 'Anticipate', icon: '🧱', rarity: 'gold' } }
  },
  {
    id: 'evo_legend',
    name: 'Legend Path',
    desc: 'Bất kỳ 100–118 → +3 OVR (1 lần / thẻ)',
    costCoins: 500000,
    costGems: 200,
    costCD: 30,
    req: { minOvr: 100, maxOvr: 118 },
    boost: { ovr: 3 }
  }
];

const SBC_LIST = [
  {
    id: 'sbc_vn11',
    name: 'SBC: Việt Nam XI',
    desc: 'Nộp 3 thẻ Vietnam bất kỳ → pack 3 thẻ + 50 gem',
    slots: 3,
    filter: (p) => p.nation === 'Vietnam',
    reward: { gems: 50, packId: 3 }
  },
  {
    id: 'sbc_80',
    name: 'SBC: 80+ Upgrade',
    desc: 'Nộp 5 thẻ OVR ≥75 → 1 thẻ ≥80',
    slots: 5,
    filter: (p) => (p.ovr || 0) >= 75,
    reward: { minOvr: 80, pick: true }
  },
  {
    id: 'sbc_special',
    name: 'SBC: Special Season',
    desc: 'Nộp 3 thẻ season đặc biệt → 1 thẻ special ≥90',
    slots: 3,
    filter: (p) => ['TOTY','TOTS','ICON','GOLDEN DRAGON','Heroes','Champions'].includes(p.season),
    reward: { minOvr: 90, special: true }
  }
];

const OBJECTIVE_CHAINS = [
  {
    id: 'chain_starter',
    name: 'Khởi đầu HLV',
    steps: [
      { id: 's1', name: 'Mở 5 pack', type: 'open_pack', target: 5, reward: { coins: 20000 } },
      { id: 's2', name: 'Xếp đủ 11 cầu thủ', type: 'full_squad', target: 1, reward: { gems: 30 } },
      { id: 's3', name: 'Thắng 3 trận', type: 'win_match', target: 3, reward: { coins: 50000, gems: 50 } }
    ]
  },
  {
    id: 'chain_striker',
    name: 'Hàng công VN',
    steps: [
      { id: 'v1', name: 'Sở hữu 3 ST Vietnam', type: 'own_vn_st', target: 3, reward: { gems: 40 } },
      { id: 'v2', name: 'Thắng 2 trận (đội có ST VN)', type: 'win_match', target: 2, reward: { packId: 3 } }
    ]
  }
];

const BATTLE_PASS = {
  maxLevel: 20,
  xpPerLevel: 100,
  free: [
    { level: 1, coins: 5000 },
    { level: 3, gems: 20 },
    { level: 5, coins: 15000 },
    { level: 8, gems: 40 },
    { level: 10, packId: 3 },
    { level: 15, coins: 50000 },
    { level: 20, gems: 150 }
  ],
  premium: [
    { level: 2, gems: 30 },
    { level: 4, cd: 10 },
    { level: 6, packId: 5 },
    { level: 9, gems: 80 },
    { level: 12, cd: 25 },
    { level: 16, packId: 1500 },
    { level: 20, cd: 50, gems: 200 }
  ]
};

const STORE_ROTATION = [
  { id: 'rot_totw', name: 'Pack TOTW Mock', packId: 5, seasonBoost: 'TOTS', blurb: 'Boost TOTS tuần này' },
  { id: 'rot_icon', name: 'Pack ICON Spotlight', packId: 1500, seasonBoost: 'ICON', blurb: 'Tăng ICON' },
  { id: 'rot_gd', name: 'Pack Golden Dragon', packId: 5, seasonBoost: 'GOLDEN DRAGON', blurb: 'Rồng Vàng' },
  { id: 'rot_ase', name: 'Pack ĐNÁ', packId: 3, seasonBoost: 'ASE', blurb: 'ASE / VN focus' }
];

function getWeeklyStoreRotation() {
  const w = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  return STORE_ROTATION[w % STORE_ROTATION.length];
}

const CLUB_LEVELS = [
  { level: 1, xp: 0, perks: 'Mở game' },
  { level: 2, xp: 100, perks: '+1 filter kho' },
  { level: 3, xp: 250, perks: 'Mở Evolution' },
  { level: 5, xp: 600, perks: 'Mở SBC' },
  { level: 8, xp: 1200, perks: 'Battle Pass premium trial' },
  { level: 10, xp: 2000, perks: 'Hall of Fame' },
  { level: 15, xp: 4000, perks: 'Cosmetics kit' },
  { level: 20, xp: 8000, perks: 'Title Huyền thoại CLB' }
];

function clubLevelFromXp(xp) {
  let lv = 1;
  CLUB_LEVELS.forEach(c => { if (xp >= c.xp) lv = c.level; });
  return lv;
}

/** Position compatibility penalty for chemistry */
function positionChemMod(slotPos, playerPos) {
  if (slotPos === playerPos) return 1;
  const near = {
    ST: ['CF'], CF: ['ST', 'CAM'], LW: ['LM', 'RW'], RW: ['RM', 'LW'],
    CAM: ['CM', 'CF'], CM: ['CDM', 'CAM'], CDM: ['CM', 'CB'],
    CB: ['CDM'], LB: ['LWB', 'LM'], RB: ['RWB', 'RM'],
    LM: ['LW', 'CM'], RM: ['RW', 'CM'], GK: []
  };
  if ((near[slotPos] || []).includes(playerPos)) return 0.5;
  return 0;
}

function calcChemistryV2(players, slots, roles) {
  // players: [{player, slotId, slotPos}]
  if (!players || !players.length) return { score: 0, bonus: 0, links: [], slotChem: {} };
  let score = 0;
  const links = [];
  const slotChem = {};
  const nationCount = {}, clubCount = {}, seasonCount = {};
  players.forEach(({ player: p, slotId, slotPos }) => {
    if (!p) return;
    nationCount[p.nation] = (nationCount[p.nation] || 0) + 1;
    clubCount[p.club] = (clubCount[p.club] || 0) + 1;
    seasonCount[p.season] = (seasonCount[p.season] || 0) + 1;
    const posMod = positionChemMod(slotPos, p.pos);
    slotChem[slotId] = Math.round(30 * posMod); // base from pos
  });
  Object.entries(nationCount).forEach(([k, v]) => {
    if (v >= 2) {
      score += v * 3;
      links.push(v + '× ' + k);
      players.forEach(({ player: p, slotId }) => {
        if (p && p.nation === k) slotChem[slotId] = Math.min(100, (slotChem[slotId] || 0) + 15 * Math.min(v, 5));
      });
    }
  });
  Object.entries(clubCount).forEach(([k, v]) => {
    if (v >= 2) {
      score += v * 4;
      links.push(v + ' CLB ' + k);
      players.forEach(({ player: p, slotId }) => {
        if (p && p.club === k) slotChem[slotId] = Math.min(100, (slotChem[slotId] || 0) + 20);
      });
    }
  });
  Object.entries(seasonCount).forEach(([k, v]) => {
    if (v >= 3) {
      score += v * 2;
      links.push(v + ' mùa ' + k);
    }
  });
  // role mild bonus
  if (roles) {
    Object.keys(roles).forEach(sid => {
      if (roles[sid] && slotChem[sid] != null) slotChem[sid] = Math.min(100, slotChem[sid] + 5);
    });
  }
  const bonus = Math.min(8, Math.floor(score / 6));
  return { score, bonus, links: links.slice(0, 8), slotChem };
}

const PACK_ODDS_TEXT = {
  1: 'High ~3% · Mid ~18% · Low ~79%',
  2: 'High ~5% · Mid ~22%',
  3: 'High ~8% · Mid ~25%',
  5: 'High ~10% · Mid ~28%',
  1500: 'High ~12% · Elite chance',
  5000: 'High ~15% · Elite+',
  12500: 'High ~20%',
  22500: 'High ~25%',
  50000: 'High ~35%'
};

// Expose for browser (non-module scripts)
if (typeof window !== 'undefined') {
  window.PLAYER_ROLES = PLAYER_ROLES;
  window.ROLE_MATCH_BONUS = ROLE_MATCH_BONUS;
  window.DEFAULT_TACTICS = DEFAULT_TACTICS;
  window.EVO_PATHS = EVO_PATHS;
  window.SBC_LIST = SBC_LIST;
  window.OBJECTIVE_CHAINS = OBJECTIVE_CHAINS;
  window.BATTLE_PASS = BATTLE_PASS;
  window.STORE_ROTATION = STORE_ROTATION;
  window.getWeeklyStoreRotation = getWeeklyStoreRotation;
  window.CLUB_LEVELS = CLUB_LEVELS;
  window.clubLevelFromXp = clubLevelFromXp;
  window.positionChemMod = positionChemMod;
  window.calcChemistryV2 = calcChemistryV2;
  window.PACK_ODDS_TEXT = PACK_ODDS_TEXT;
  window.FORMATIONS = typeof FORMATIONS !== 'undefined' ? FORMATIONS : window.FORMATIONS;
}
