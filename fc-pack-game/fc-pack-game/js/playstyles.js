/** PlayStyle icons + rarity: silver | gold | diamond (kim cương) */
const PLAYSTYLE_ICONS = {
  "Finesse Shot": "🎯", "Power Shot": "💥", "Chip Shot": "⛳", "Dead Ball": "📐",
  "Power Header": "🗣️", "Incisive Pass": "➡️", "Pinged Pass": "📡", "Long Ball Pass": "📡",
  "Tiki Taka": "🔗", "Whipped Pass": "🌀", "Jockey": "🛡️", "Block": "🧱",
  "Intercept": "✋", "Anticipate": "👁️", "Slide Tackle": "🦵", "Bruiser": "💪",
  "Technical": "✨", "Trickster": "🎭", "Quick Step": "👟", "Rapid": "⚡",
  "Flair": "🌟", "First Touch": "👆", "Press Proven": "🔒", "Acrobatic": "🤸",
  "Aerial": "🦅", "Trivela": "↩️", "Far Throw": "🧤", "Footwork": "🦶",
  "Cross Claimer": "🛫", "Rush Out": "🚪", "Far Reach": "🖐️"
};

/**
 * OVR → PlayStyle rules (kim cương):
 * 121: 3 vàng
 * 122: 2 vàng + 1 kim cương
 * 123: 2 kim cương + 1 bạc
 * 124: 2 kim cương + 1 vàng
 * 125: 3 kim cương
 */
const PLAYSTYLE_OVR_RULES = {
  121: { gold: 3, diamond: 0, silver: 0 },
  122: { gold: 2, diamond: 1, silver: 0 },
  123: { gold: 0, diamond: 2, silver: 1 },
  124: { gold: 1, diamond: 2, silver: 0 },
  125: { gold: 0, diamond: 3, silver: 0 }
};
