import "./style.css";
import { createSoundManager } from "./sound.js";

const localMedia = import.meta.glob("./assets/**/*.{jpeg,mp4}", {
  eager: true,
  query: "?url",
  import: "default",
});

const intro = document.getElementById("intro");
const kingdom = document.getElementById("kingdom");
const modalRoot = document.getElementById("modal-root");
const toast = document.getElementById("toast");
const motionToggle = document.getElementById("motion-toggle");
const worldPrompt = document.getElementById("world-prompt");
const worldPromptText = document.getElementById("world-prompt-text");
const worldPromptBtn = document.getElementById("world-prompt-btn");
const soundManager = createSoundManager();

// Princess Royal HUD & Companion elements
const princessHud = document.getElementById("princess-hud");
const hudLevelBadge = document.getElementById("hud-level-badge");
const hudRoyalTitle = document.getElementById("hud-royal-title");
const hudXpBar = document.getElementById("hud-xp-bar");
const hudXpText = document.getElementById("hud-xp-text");
const questTrackerHud = document.getElementById("quest-tracker-hud");
const trackerQuestTag = document.getElementById("tracker-quest-tag");
const trackerQuestTitle = document.getElementById("tracker-quest-title");
const trackerObjective = document.getElementById("tracker-objective");
const trackerCount = document.getElementById("tracker-count");
const kariSpeechBubble = document.getElementById("kari-speech-bubble");
const kariSpeechText = document.getElementById("kari-speech-text");
const kariBubbleClose = document.getElementById("kari-bubble-close");
const achievementToastContainer = document.getElementById("achievement-toast-container");

// Persistent State with localStorage
function loadSavedSet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}
function saveSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}
}
function loadSavedObject(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveObject(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {}
}

const openedGifts = loadSavedSet("yunisha_opened_gifts");
const foundTreasures = loadSavedSet("yunisha_dashain_treasures");
const bloomedFlowers = loadSavedSet("yunisha_bloomed_flowers");
const unlockedAchievements = loadSavedSet("yunisha_achievements");
const collectedStars = loadSavedSet("yunisha_collected_stars");
const litDiyas = loadSavedSet("yunisha_lit_diyas");
const placedMarigolds = loadSavedSet("yunisha_placed_marigolds");
const visitedLandmarks = loadSavedSet("yunisha_visited_landmarks");
let xp = parseInt(localStorage.getItem("yunisha_xp") || "0", 10);
let activeQuestId = localStorage.getItem("yunisha_active_quest") || "quest_1";
let wardrobeVisited = localStorage.getItem("yunisha_wardrobe_visited") === "true";
let festivalCelebrated = localStorage.getItem("yunisha_festival_celebrated") === "true";

const defaultWishes = [
  "May our family always be filled with joy, laughter, and warm hugs 💖",
  "To learn lots of exciting new things at school and shine brightly! 🌟",
  "May Princess Yunisha have endless magical adventures with Didi 👭🌸",
  "A happy, peaceful, and prosperous Dashain for everyone we love 🪔✨",
];
let savedWishes = loadSavedObject("yunisha_wishes", defaultWishes);
let equippedWardrobe = loadSavedObject("yunisha_wardrobe", {
  outfit: "royal",
  crown: "royal",
  trail: "sparkle",
  kari: "golden",
});

let world;
let activeWorldTheme = "FAIRY_WORLD";
let toastTimer;
let previousFocus;
let modalCleanup;
let portalEntered = false;
let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let activeProximityTarget = null;
let starConstellationConnected = new Set();
let princessBlessed = false;
let welcomeKari = null;

// =========================================================================
// PRINCESS LEVEL & XP SYSTEM (LEVELS 1 - 6)
// =========================================================================
const levelTiers = [
  { level: 1, title: "Little Princess", minXP: 0, maxXP: 100 },
  { level: 2, title: "Royal Dreamer", minXP: 100, maxXP: 250 },
  { level: 3, title: "Kindness Weaver", minXP: 250, maxXP: 450 },
  { level: 4, title: "Star Explorer", minXP: 450, maxXP: 700 },
  { level: 5, title: "Dashain Champion", minXP: 700, maxXP: 1000 },
  { level: 6, title: "Radiant Empress", minXP: 1000, maxXP: 9999 },
];

function getLevelInfo(totalXP) {
  let tier = levelTiers[0];
  for (const t of levelTiers) {
    if (totalXP >= t.minXP) tier = t;
  }
  const span = Math.max(1, tier.maxXP - tier.minXP);
  const currentInTier = totalXP - tier.minXP;
  const progressPercent = tier.level === 6 ? 100 : Math.min(100, Math.round((currentInTier / span) * 100));
  return {
    ...tier,
    currentInTier,
    span,
    progressPercent,
    totalXP,
  };
}

function updateHUD() {
  const info = getLevelInfo(xp);
  if (hudLevelBadge) hudLevelBadge.textContent = `Lvl ${info.level}`;
  if (hudRoyalTitle) hudRoyalTitle.textContent = info.title;
  if (hudXpBar) hudXpBar.style.width = `${info.progressPercent}%`;
  if (hudXpText) {
    hudXpText.textContent = info.level === 6
      ? `${info.totalXP} XP (MAX LEVEL 👑)`
      : `${info.totalXP} / ${info.maxXP} XP`;
  }
}

function addXP(amount, reason = "") {
  const oldLevel = getLevelInfo(xp).level;
  xp += amount;
  localStorage.setItem("yunisha_xp", String(xp));
  updateHUD();

  const newLevel = getLevelInfo(xp).level;
  if (newLevel > oldLevel) {
    soundManager.play("levelup");
    world?.triggerCelebration("fanfare");
    const info = getLevelInfo(xp);
    announce(`🎉 LEVEL UP! You are now Level ${info.level}: ${info.title}! 👑`);
    kariSpeak(`🌟 Hooray, Princess Yunisha! You leveled up to Level ${info.level}: ${info.title}! You make our world sparkle! ✨`, 8000);
  }
}

// =========================================================================
// 12 UNIQUE ACHIEVEMENTS SYSTEM
// =========================================================================
const achievementsList = [
  { id: "first_step", title: "First Royal Steps", icon: "🏰", desc: "Enter Princess Yunisha's magical kingdom." },
  { id: "first_gift", title: "Precious Keepsake", icon: "🎁", desc: "Open your first sisterly keepsake gift." },
  { id: "all_gifts", title: "Heart of Gold", icon: "💖", desc: "Open all 10 loving gifts from Didi." },
  { id: "flower_whisper", title: "Enchanted Botanist", icon: "🌸", desc: "Help the magic blossoms in the garden bloom." },
  { id: "star_gazer", title: "Constellation Chaser", icon: "✨", desc: "Connect stars in the Star Observatory." },
  { id: "star_seeker", title: "Star Collector", icon: "⭐", desc: "Collect all 3 golden quest stars in the 3D kingdom." },
  { id: "first_treasure", title: "Dashain Seeker", icon: "🔍", desc: "Uncover your first hidden Dashain treasure." },
  { id: "treasure_master", title: "Master of Dashain Magic", icon: "🏆", desc: "Collect all 3 sacred Dashain treasures." },
  { id: "diya_lighter", title: "Festival of Lights", icon: "🪔", desc: "Light all 5 sacred diyas in the courtyard." },
  { id: "sister_bond", title: "Cherished Sister", icon: "👭", desc: "Browse family memories and read Didi's letter." },
  { id: "secret_finder", title: "Mystery Unlocked", icon: "🗝️", desc: "Find the Secret Rose Doorway hidden in the kingdom." },
  { id: "style_icon", title: "Fashion Royalty", icon: "👗", desc: "Visit the Royal Wardrobe mirror and try on royal outfits." },
];

function unlockAchievement(id) {
  if (unlockedAchievements.has(id)) return;
  const ach = achievementsList.find((a) => a.id === id);
  if (!ach) return;

  unlockedAchievements.add(id);
  saveSet("yunisha_achievements", unlockedAchievements);
  soundManager.play("achievement");
  addXP(50, `Achievement: ${ach.title}`);

  if (achievementToastContainer) {
    const el = document.createElement("div");
    el.className = "achievement-toast";
    el.innerHTML = `
      <span class="achievement-toast-icon">${ach.icon}</span>
      <div class="achievement-toast-text">
        <span class="achievement-toast-header">ACHIEVEMENT UNLOCKED ✦</span>
        <strong class="achievement-toast-title">${ach.title}</strong>
        <span class="achievement-toast-desc">${ach.desc}</span>
      </div>
      <span class="achievement-toast-xp">+50 XP</span>
    `;
    achievementToastContainer.appendChild(el);
    window.setTimeout(() => {
      el.classList.add("is-hiding");
      window.setTimeout(() => el.remove(), 450);
    }, 4500);
  }
}

// =========================================================================
// KARI THE BUTTERFLY COMPANION MANAGER
// =========================================================================
let kariTimer = null;
function kariSpeak(message, duration = 6000) {
  if (!kariSpeechBubble || !kariSpeechText) return;
  kariSpeechText.textContent = message;
  kariSpeechBubble.classList.remove("hidden");
  world?.interact("kari_greet");
  window.clearTimeout(kariTimer);
  kariTimer = window.setTimeout(() => {
    kariSpeechBubble?.classList.add("hidden");
  }, duration);
}

kariBubbleClose?.addEventListener("click", () => {
  kariSpeechBubble?.classList.add("hidden");
  window.clearTimeout(kariTimer);
});

// =========================================================================
// 5 STORY QUESTS ENGINE
// =========================================================================
const storyQuests = [
  {
    id: "quest_1",
    tag: "Quest 1",
    title: "The Whispering Blossom",
    nepali: "फूल्ने बगैंचा",
    desc: "Fly to the Enchanted Garden and help 3 magical flowers blossom with your royal touch.",
    targetLocation: "simulations",
    locationName: "Enchanted Garden",
    targetCoords: { x: -8, z: 2 },
    rewardXP: 100,
    rewardReward: "Blossom Floral Tiara 🌸",
    checkCompleted: () => bloomedFlowers.size >= 3,
    getProgress: () => ({ current: Math.min(bloomedFlowers.size, 3), total: 3, label: "Flowers bloomed" }),
    hint: "Kari: Follow me to the Enchanted Garden! Tap on the glowing flower buds to watch them unfold in bright colors!"
  },
  {
    id: "quest_2",
    tag: "Quest 2",
    title: "Follow Kari's Wings",
    nepali: "पखेटाको यात्रा",
    desc: "Stroll across the kingdom grounds and visit the enchanted Royal Dressing Room mirror near the castle wall.",
    targetLocation: "wardrobe",
    locationName: "Royal Wardrobe Mirror",
    targetCoords: { x: 3.5, z: -3.5 },
    rewardXP: 100,
    rewardReward: "Celestial Starlight Trail ✨",
    checkCompleted: () => wardrobeVisited,
    getProgress: () => ({ current: wardrobeVisited ? 1 : 0, total: 1, label: "Mirror visited" }),
    hint: "Kari: Look to the right of the castle! A magical full-length mirror is waiting where you can try on lovely gowns and tiaras!"
  },
  {
    id: "quest_3",
    tag: "Quest 3",
    title: "The Missing Falling Stars",
    nepali: "चम्किला ताराहरू",
    desc: "Three golden shooting stars fell into the kingdom! Search the 3D kingdom to find and collect all 3 stars.",
    targetLocation: "map",
    locationName: "Kingdom Grounds",
    targetCoords: { x: 0, z: 0 },
    rewardXP: 150,
    rewardReward: "Starry Night Diadem ⭐",
    checkCompleted: () => collectedStars.size >= 3,
    getProgress: () => ({ current: collectedStars.size, total: 3, label: "Quest stars collected" }),
    hint: "Kari: Look for golden glowing stars spinning near the bridge, the lake, and the courtyard pathway!"
  },
  {
    id: "quest_4",
    tag: "Quest 4",
    title: "The Dashain Royal Treasure Hunt",
    nepali: "शाही दशैं खजाना",
    desc: "Enter the Dashain Courtyard and uncover the 3 sacred Dashain treasures: Golden Marigold, Sacred Jamara, and Tika Plate.",
    targetLocation: "dashain",
    locationName: "Dashain Courtyard",
    targetCoords: { x: 0, z: 0 },
    rewardXP: 200,
    rewardReward: "Dashain Golden Mukut 👑",
    checkCompleted: () => foundTreasures.size >= 3,
    getProgress: () => ({ current: foundTreasures.size, total: 3, label: "Dashain treasures found" }),
    hint: "Kari: Step into the festive courtyard! Search among the flowerbeds, pillars, and blessing table for the 3 sacred items!"
  },
  {
    id: "quest_5",
    tag: "Quest 5",
    title: "Festival of Light & Love",
    nepali: "उज्यालो पर्व र देवी आशीर्वाद",
    desc: "Light all 5 courtyard Diyas and hang 3 marigold garlands to prepare the kingdom for Vijaya Dashami.",
    targetLocation: "dashain",
    locationName: "Dashain Courtyard",
    targetCoords: { x: 0, z: 0 },
    rewardXP: 250,
    rewardReward: "Grand Festival Finale & Goddess Durga Blessing 🪔",
    checkCompleted: () => litDiyas.size >= 5 && placedMarigolds.size >= 3,
    getProgress: () => ({ current: litDiyas.size + placedMarigolds.size, total: 8, label: "Courtyard lights & garlands" }),
    hint: "Kari: Approach the earthen diyas and marigold posts in the Courtyard! Press E to light the holy flames and hang the garlands!"
  },
];

function getActiveQuest() {
  const current = storyQuests.find((q) => q.id === activeQuestId);
  if (current && !current.checkCompleted()) return current;
  const next = storyQuests.find((q) => !q.checkCompleted());
  return next || storyQuests[storyQuests.length - 1];
}

function updateQuestHUD() {
  const quest = getActiveQuest();
  activeQuestId = quest.id;
  localStorage.setItem("yunisha_active_quest", activeQuestId);

  const prog = quest.getProgress();
  const completed = quest.checkCompleted();

  if (trackerQuestTag) trackerQuestTag.textContent = quest.tag;
  if (trackerQuestTitle) trackerQuestTitle.textContent = quest.title;
  if (trackerObjective) trackerObjective.textContent = completed ? "Quest Completed! 🎉" : quest.desc;
  if (trackerCount) trackerCount.textContent = completed ? "✓ DONE" : `${prog.current}/${prog.total}`;
}

function localAsset(path) {
  const url = localMedia[`./${path}`];
  if (typeof url !== "string") {
    throw new Error(`Expected local media file was not found: ${path}`);
  }
  return url;
}

function watchLocalImage(image, file) {
  if (!image) return;
  image.addEventListener("error", () => {
    console.error(`Could not load local image "${file}".`, image.currentSrc || image.src);
    const fallback = document.createElement("span");
    fallback.className = "photo-load-error";
    fallback.setAttribute("role", "status");
    fallback.textContent = `Could not load ${file}. Check the local asset request.`;
    image.replaceWith(fallback);
  }, { once: true });
}

// 10 Real family photographs from the project
const galleryPhotos = [
  { file: "princess.jpeg", folder: "princess", group: "Yunisha", title: "Princess Yunisha", alt: "Yunisha in a royal red dress", caption: "Our shining little princess in her royal red dress 👑" },
  { file: "sis n me dashain 1.jpeg", folder: "dashain", group: "Our Little World", title: "Sisters at Dashain", alt: "Sisters together during Dashain", caption: "Sweet smiles and sisterly love on Dashain 👭❤️" },
  { file: "sis n me dashain 2.jpeg", folder: "dashain", group: "Our Little World", title: "Dashain Memories", alt: "Sisters together during Dashain", caption: "Celebrating Dashain together with warm hearts ✨" },
  { file: "sis time.jpeg", folder: "dashain", group: "Our Little World", title: "Sister Time", alt: "A sister photo from the Dashain folder", caption: "Cherished moments that make life brighter 🌸" },
  { file: "memory 0.jpeg", folder: "memories", group: "Little Moments", title: "Sweet Keepsake", alt: "A family memory", caption: "A precious family memory held forever close ♡" },
  { file: "memory 1.jpeg", folder: "memories", group: "Little Moments", title: "Sunny Days", alt: "A family memory", caption: "Laughter, warmth, and sunshine moments ☀️" },
  { file: "memory 2.jpeg", folder: "memories", group: "Little Moments", title: "Happy Smiles", alt: "A family memory", caption: "Every smile of yours brings happiness to our home 🌷" },
  { file: "memory 3.jpeg", folder: "memories", group: "Little Moments", title: "Precious Times", alt: "A family memory", caption: "Little steps, big memories, and everlasting love 💫" },
  { file: "dashain pray.jpeg", folder: "dashain", group: "Dashain Gold", title: "Dashain Puja & Prayer", alt: "A Dashain prayer moment", caption: "Traditional Dashain prayer, seeking blessings for our family 🪔" },
  { file: "sis dashain pic 1.jpeg", folder: "dashain", group: "Dashain Gold", title: "Dashain Festival Joy", alt: "A photo from Dashain", caption: "Festive joy and blessings wrapped in Dashain gold 🌺" },
].map((photo) => ({
  ...photo,
  src: localAsset(`assets/images/${photo.folder}/${photo.file}`),
}));

// 2 Real local videos
const videos = [
  {
    file: "funny vdo 1.mp4",
    title: "Funny Sister Memory #1 😂",
    subtitle: "A delightful moment of sisterly fun and laughter",
    src: localAsset("assets/videos/funny vdo 1.mp4"),
  },
  {
    file: "funny vdo 2.mp4",
    title: "Funny Sister Memory #2 💗",
    subtitle: "Pure joy, laughter, and fun memories to smile about",
    src: localAsset("assets/videos/funny vdo 2.mp4"),
  },
];

// 10 Meaningful Gifts
const gifts = [
  { title: "Love", icon: "💗", tag: "GIFT 1 — LOVE", message: "To my dearest Yunisha: You will always hold the most special place in my heart. No matter how much you grow, you are my beloved little sister, and my love will always be your safe harbour." },
  { title: "Courage", icon: "🦋", tag: "GIFT 2 — COURAGE", message: "Dear Yunisha: Always be brave enough to try new things and speak your mind with confidence. You have so much strength inside you, little warrior princess!" },
  { title: "Dreams", icon: "🌙", tag: "GIFT 3 — DREAMS", message: "May your future shine brighter than the stars. Never stop imagining, dreaming big, and reaching for the sky. You are capable of truly wonderful things!" },
  { title: "Dashain Surprise", icon: "🌺", tag: "GIFT 4 — DASHAIN SURPRISE", message: "विजया दशमीको धेरै धेरै माया र आशीर्वाद! May this auspicious Dashain bless your life with vibrant health, immense happiness, success in your studies, and sweet memories.", action: "dashain" },
  { title: "Happiness", icon: "☀️", tag: "GIFT 5 — HAPPINESS", message: "May your days be sprinkled with cheerful laughter, joyful songs, and endless sunny adventures." },
  { title: "Confidence", icon: "👑", tag: "GIFT 6 — CONFIDENCE", message: "Believe in yourself, Princess Yunisha. Your ideas are smart, your voice matters, and your unique personality makes the world sparkle.", action: "princess" },
  { title: "Kindness", icon: "🌷", tag: "GIFT 7 — KINDNESS", message: "Your gentle kindness is the greatest kind of fairy magic. The care you show to family and friends makes everything brighter.", action: "flowers" },
  { title: "Adventure", icon: "🗝️", tag: "GIFT 8 — ADVENTURE", message: "The world is full of fascinating secrets and wonders waiting for you to explore. Stay curious and enjoy every journey!", action: "secret" },
  { title: "Memories", icon: "📸", tag: "GIFT 9 — MEMORIES", message: "Every moment we share is a treasure I keep close. May we fill many more albums with laughter and adventures together.", action: "gallery" },
  { title: "Forever", icon: "💌", tag: "GIFT 10 — FOREVER", message: "Through every step of your life, remember that your Didi will always cheer for you, stand by you, and love you forever and always.", action: "letter" },
];

// Dashain Courtyard Treasures
const dashainTreasures = {
  marigold: {
    id: "marigold",
    title: "Golden Marigold",
    nepali: "सयपत्री फूल",
    icon: "🌼",
    description: "Find the special golden marigold hidden along the floral courtyard pathway.",
    hint: "Look near the colourful flower beds along the stone garden path on the right side of the courtyard!",
    foundTitle: "YOU FOUND THE GOLDEN MARIGOLD! 🌼",
    foundBlessing: "May your days always bloom with happiness, laughter, and fragrant sisterly joy.",
    svg: `<svg viewBox="0 0 100 100" class="treasure-svg" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="#fff4e0"/><g transform="translate(50,50)"><circle cx="0" cy="0" r="14" fill="#ff9f1c"/><circle cx="0" cy="0" r="9" fill="#ffbf69"/><path d="M-6,-28 C-3,-38 3,-38 6,-28 C12,-32 18,-26 18,-20 C24,-24 30,-16 28,-10 C34,-10 36,0 32,6 C38,10 34,18 28,22 C30,28 24,34 18,32 C16,38 8,38 4,34 C0,40 -6,38 -10,34 C-16,36 -22,30 -22,24 C-28,24 -32,16 -28,10 C-34,6 -34,-4 -28,-8 C-32,-16 -24,-22 -18,-20 C-18,-28 -10,-32 -6,-28 Z" fill="#ff7b00" opacity="0.92"/><path d="M-4,-20 C-2,-27 2,-27 4,-20 C8,-23 13,-19 13,-14 C17,-17 21,-11 20,-7 C24,-7 25,0 22,4 C27,7 24,13 20,16 C21,20 17,24 13,23 C11,27 6,27 3,24 C0,28 -4,27 -7,24 C-11,25 -15,21 -15,17 C-20,17 -23,11 -20,7 C-24,4 -24,-3 -20,-6 C-23,-11 -17,-15 -13,-14 C-13,-20 -7,-23 -4,-20 Z" fill="#ffd166"/></g></svg>`,
  },
  jamara: {
    id: "jamara",
    title: "Sacred Jamara",
    nepali: "पवित्र जमरा",
    icon: "🌿",
    description: "Look carefully for the sacred jamara among the festive decorations.",
    hint: "Search around the traditional earthen pot near the left courtyard pillars!",
    foundTitle: "YOU FOUND THE SACRED JAMARA! 🌿",
    foundBlessing: "Wishing you divine blessings, flourishing good health, and strength for all your future endeavors.",
    svg: `<svg viewBox="0 0 100 100" class="treasure-svg" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="#eaf7ea"/><path d="M28 80 C28 65 35 60 42 60 L58 60 C65 60 72 65 72 80 C72 88 28 88 28 80 Z" fill="#9e5a3f"/><ellipse cx="50" cy="60" rx="14" ry="4" fill="#bd7353"/><path d="M50 58 Q46 36 34 20 Q48 32 49 58 Z" fill="#40916c"/><path d="M50 58 Q50 30 46 12 Q54 28 52 58 Z" fill="#52b788"/><path d="M50 58 Q54 34 66 18 Q54 34 51 58 Z" fill="#74c69d"/><path d="M50 58 Q42 42 26 32 Q44 44 48 58 Z" fill="#52b788"/><path d="M50 58 Q58 42 74 34 Q56 44 52 58 Z" fill="#40916c"/><rect x="40" y="66" width="20" height="3" fill="#b32822" rx="1"/></svg>`,
  },
  tika: {
    id: "tika",
    title: "Dashain Tika Plate",
    nepali: "दशैं टीका थाली",
    icon: "🔴",
    description: "Find the beautiful tika plate prepared for Dashain.",
    hint: "Look near the festive entrance and decorated blessing altar table in the courtyard!",
    foundTitle: "YOU FOUND THE DASHAIN TIKA! 🔴",
    foundBlessing: "May your life always be blessed with love, prosperity, wisdom, and warm family togetherness.",
    svg: `<svg viewBox="0 0 100 100" class="treasure-svg" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="#fff8e8"/><ellipse cx="50" cy="55" rx="36" ry="24" fill="#e0a93b"/><ellipse cx="50" cy="55" rx="30" ry="19" fill="#f5c760"/><ellipse cx="50" cy="54" rx="14" ry="9" fill="#b32822"/><circle cx="50" cy="53" r="5" fill="#e63946"/><circle cx="52" cy="51" r="2" fill="#fffaf0"/><circle cx="48" cy="52" r="1.5" fill="#fffaf0"/><path d="M68 45 Q74 35 80 40 Q74 46 68 45 Z" fill="#52b788"/><circle cx="34" cy="50" r="4" fill="#ff7b00"/><circle cx="32" cy="56" r="3.5" fill="#ffbf69"/></svg>`,
  },
};

// 12 Artifacts
const artifacts = [
  ["👑", "Golden Crown", "A reminder that kindness, honesty, and courage are the brightest royal virtues."],
  ["💖", "Crystal Heart", "A glowing heart holding all the unconditional love that surrounds you."],
  ["🌹", "Magical Rose", "May you always notice beauty in small things and help happiness bloom."],
  ["🎁", "Gift of Wonder", "Life's surprises are sweetest when celebrated with those you love."],
  ["⭐", "Wishing Star", "Make a wish, keep trying, and let your unique inner light illuminate the way."],
  ["🪞", "Kindness Mirror", "Look closely: there is a thoughtful, brave, and wonderful princess looking back."],
  ["🗝️", "Golden Key", "Imagination and curiosity are the keys to endless adventures."],
  ["🦋", "Floating Butterfly", "Embrace growth and follow your passions wherever they lead you."],
  ["✨", "Magical Wand", "A little creativity and sparkle can turn any ordinary day into magic."],
  ["🪔", "Dashain Diya", "A warm flame dispelling darkness, bringing peace and light to Dashain."],
  ["🍽️", "Tika Plate", "Sacred vermilion and akshata—symbolizing family devotion, honor, and joy."],
  ["🌿", "Sacred Jamara", "Tender green barley shoots representing growth, prosperity, and blessings."],
];

function announce(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function setWorldTheme(theme) {
  activeWorldTheme = theme;
  document.body.dataset.worldTheme = theme === "DASHAIN_WORLD" ? "dashain" : "fairy";
  world?.setTheme(theme);
  soundManager.setTheme(theme);
}

function onEnterKingdom() {
  unlockAchievement("first_step");
  updateHUD();
  updateQuestHUD();
  kariSpeak("Hello, Princess Yunisha! 🦋 I'm Kari, your little magical friend. Shall we explore the kingdom together? ✨", 8000);
}

function enterWorld(skipAnimation = false) {
  welcomeKari?.pause();
  portalEntered = !skipAnimation;
  if (!skipAnimation) world?.enterPortal();
  if (skipAnimation) {
    intro.classList.add("hidden");
    intro.classList.remove("is-leaving");
    kingdom.classList.remove("hidden");
    princessHud?.classList.remove("hidden");
    soundManager.play("sparkle");
    onEnterKingdom();
    return;
  }
  document.body.classList.add("portal-entering");
  intro.classList.add("is-leaving");
  soundManager.play("doorway");
  window.setTimeout(() => {
    intro.classList.add("hidden");
    kingdom.classList.remove("hidden");
    princessHud?.classList.remove("hidden");
    onEnterKingdom();
  }, reducedMotion ? 0 : 650);
  window.setTimeout(() => document.body.classList.remove("portal-entering"), reducedMotion ? 0 : 1500);
}

function goHome() {
  closeModal();
  portalEntered = false;
  world?.resetPortal();
  kingdom.classList.add("hidden");
  princessHud?.classList.add("hidden");
  kariSpeechBubble?.classList.add("hidden");
  intro.classList.remove("hidden", "is-leaving");
  welcomeKari?.resume();
  window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
}

function modalShell(content, label = "Magical experience") {
  modalCleanup?.();
  modalCleanup = null;
  previousFocus = document.activeElement;
  modalRoot.innerHTML = `
    <div class="modal-backdrop" role="presentation">
      <section class="modal" role="dialog" aria-modal="true" aria-label="${label}">
        <button class="modal-close" type="button" aria-label="Close experience">×</button>
        <div class="modal-content">${content}</div>
      </section>
    </div>
  `;
  const closeBtn = modalRoot.querySelector(".modal-close");
  closeBtn.focus();
  closeBtn.addEventListener("click", closeModal);
}

function closeModal() {
  if (!modalRoot.firstElementChild) return;
  modalCleanup?.();
  modalCleanup = null;
  modalRoot.innerHTML = "";
  if (activeWorldTheme === "DASHAIN_WORLD") setWorldTheme("FAIRY_WORLD");
  if (previousFocus instanceof HTMLElement) previousFocus.focus();
}

function openModal(name) {
  visitedLandmarks.add(name);
  saveSet("yunisha_visited_landmarks", visitedLandmarks);

  const enteringDashain = name === "dashain";
  setWorldTheme(enteringDashain ? "DASHAIN_WORLD" : "FAIRY_WORLD");
  if (enteringDashain) soundManager.play("doorway");

  if (name === "secret") unlockAchievement("secret_finder");
  if (name === "letter" && visitedLandmarks.has("gallery")) unlockAchievement("sister_bond");

  const renderers = {
    princess: renderPrincess,
    simulations: renderSimulations,
    gifts: renderGifts,
    letter: renderLetter,
    gallery: renderGallery,
    dashain: renderDashain,
    observatory: renderObservatory,
    secret: renderSecretRoom,
    final: renderFinal,
    artifacts: renderArtifacts,
    videos: renderVideos,
    map: renderKingdomMap,
    journal: renderPrincessJournal,
    wardrobe: renderCustomizationStudio,
    quests: renderQuestsModal,
  };
  const render = renderers[name];
  if (render) render();
}

// =========================================================================
// 3D PROXIMITY INTERACTIVE ACTIONS
// =========================================================================
function collectWorldStar(id) {
  if (collectedStars.has(id)) return;
  collectedStars.add(id);
  saveSet("yunisha_collected_stars", collectedStars);
  world?.collectQuestStar(id);
  soundManager.play("sparkle");
  addXP(50, "Collected Quest Star");
  announce(`Collected a golden Quest Star! ⭐ (${collectedStars.size}/3)`);
  kariSpeak("You caught a falling star! Look at it sparkle in your hands! ⭐", 6000);
  if (collectedStars.size >= 3) unlockAchievement("star_seeker");
  updateQuestHUD();
}

function lightWorldDiya(id) {
  if (litDiyas.has(id)) return;
  litDiyas.add(id);
  saveSet("yunisha_lit_diyas", litDiyas);
  world?.lightDiya(id);
  soundManager.play("blessing");
  addXP(40, "Lit Sacred Diya");
  announce(`Lit sacred Dashain Diya! 🪔 (${litDiyas.size}/5)`);
  kariSpeak("The holy flame is dancing! May it illuminate your life with joy and peace! 🪔", 6000);
  if (litDiyas.size >= 5) unlockAchievement("diya_lighter");
  checkFestivalFinale();
  updateQuestHUD();
}

function placeWorldMarigold(id) {
  if (placedMarigolds.has(id)) return;
  placedMarigolds.add(id);
  saveSet("yunisha_placed_marigolds", placedMarigolds);
  world?.placeMarigold(id);
  soundManager.play("bloom");
  addXP(40, "Placed Marigold Garland");
  announce(`Hung fragrant Marigold garland! 🌼 (${placedMarigolds.size}/3)`);
  kariSpeak("So beautiful! The courtyard smells like sweet Dashain flowers! 🌼", 6000);
  checkFestivalFinale();
  updateQuestHUD();
}

function collectWorldTreasure(id) {
  if (foundTreasures.has(id)) {
    openModal("dashain");
    return;
  }
  foundTreasures.add(id);
  saveSet("yunisha_dashain_treasures", foundTreasures);
  world?.collectTreasure(id);
  soundManager.play("treasure");
  addXP(100, "Found Dashain Treasure");
  unlockAchievement("first_treasure");
  const tr = dashainTreasures[id];
  announce(`Discovered: ${tr?.title || id}! 🔍 (${foundTreasures.size}/3)`);
  if (foundTreasures.size >= 3) {
    unlockAchievement("treasure_master");
    world?.triggerCelebration("petals");
    kariSpeak("🎉 YOU FOUND ALL THREE DASHAIN TREASURES! You are the true master of Dashain magic, Princess Yunisha! 🌺", 8000);
  }
  updateQuestHUD();
  openModal("dashain");
}

function checkFestivalFinale() {
  if (litDiyas.size >= 5 && placedMarigolds.size >= 3 && !festivalCelebrated) {
    festivalCelebrated = true;
    localStorage.setItem("yunisha_festival_celebrated", "true");
    soundManager.play("fanfare");
    world?.triggerCelebration("celebration");
    addXP(250, "Grand Festival of Light");
    kariSpeak("🌟 GRAND FESTIVAL COMPLETE! All diyas are glowing and marigolds are blooming! Seek the Secret Rose Room for your Goddess Durga blessing! 🪔✨", 10000);
    announce("Courtyard is radiant with holy light! Grand Festival completed! 🪔");
  }
}

function handleProximityInteraction(target) {
  if (!target) return;
  if (target.type === "landmark") {
    openModal(target.id);
  } else if (target.type === "treasure") {
    collectWorldTreasure(target.id);
  } else if (target.type === "star") {
    collectWorldStar(target.id);
  } else if (target.type === "diya") {
    lightWorldDiya(target.id);
  } else if (target.type === "marigold_point") {
    placeWorldMarigold(target.id);
  } else if (target.type === "mirror") {
    openModal("wardrobe");
  } else if (target.type === "secret_door") {
    openModal("secret");
  }
}

// =========================================================================
// ROYAL KINGDOM MAP MODAL
// =========================================================================
function renderKingdomMap() {
  const landmarks = [
    { id: "princess", name: "Princess Castle", icon: "♕", coords: { x: 0, z: -4 }, desc: "Royal Hall, Crown Ceremony & Magic Sparkle Wand.", theme: "FAIRY_WORLD" },
    { id: "simulations", name: "Enchanted Garden", icon: "❀", coords: { x: -8, z: 2 }, desc: "Blooming flowers, floating petals & nature physics spells.", theme: "FAIRY_WORLD" },
    { id: "gifts", name: "Hall of Gifts", icon: "✧", coords: { x: 6, z: 2 }, desc: "Ten meaningful sisterly keepsake treasures from Didi.", theme: "FAIRY_WORLD" },
    { id: "gallery", name: "Moonlight Lake & Gallery", icon: "♡", coords: { x: -7, z: -7.5 }, desc: "Real sister and family photos glowing under moonlight.", theme: "FAIRY_WORLD" },
    { id: "dashain", name: "Dashain Courtyard", icon: "❁", coords: { x: 0, z: 0 }, desc: "Treasure Hunt, 3D Diyas, Marigolds, Tika & Jamara.", theme: "DASHAIN_WORLD" },
    { id: "observatory", name: "Star Observatory", icon: "☾", coords: { x: 8, z: -4 }, desc: "Star constellations, celestial sky & sparkling wishes.", theme: "FAIRY_WORLD" },
    { id: "secret", name: "Secret Rose Doorway", icon: "🗝️", coords: { x: -6.5, z: -8.5 }, desc: "Hidden sanctuary of peace, kindness & Durga blessing.", theme: "FAIRY_WORLD" },
  ];

  modalShell(`
    <p class="modal-eyebrow">The Royal Kingdom Map 🗺️</p>
    <h2>Explore Princess Yunisha's Realm</h2>
    <p class="modal-intro">Every corner of this fairy-tale realm holds love, memories, and surprises. Select a destination to travel instantly or explore its wonders!</p>

    <div class="ask-kari-banner">
      <div class="ask-kari-left">
        <span style="font-size:2rem;">🦋</span>
        <div>
          <strong style="font-family:var(--serif); color:#ffd166; font-size:0.88rem;">Need Directions from Kari?</strong>
          <p style="margin:2px 0 0; font-size:0.75rem; color:#f0e4f5;">Kari knows every hidden path and blooming tree in the kingdom.</p>
        </div>
      </div>
      <button class="button button-gold" id="ask-kari-map-btn" type="button">Ask Kari ✦</button>
    </div>

    <div class="map-grid">
      ${landmarks.map((lm) => {
        const visited = visitedLandmarks.has(lm.id);
        return `
          <div class="map-card" data-landmark="${lm.id}">
            <div class="map-card-header">
              <span class="map-card-icon">${lm.icon}</span>
              <span class="map-badge ${visited ? "badge-visited" : "badge-available"}">
                ${visited ? "DISCOVERED ✨" : "EXPLORE ✦"}
              </span>
            </div>
            <h3 class="map-card-title">${lm.name}</h3>
            <p class="map-card-desc">${lm.desc}</p>
            <div class="map-card-actions">
              <button class="map-teleport-btn" type="button" data-teleport="${lm.id}">
                Teleport There ✧
              </button>
              <button class="map-open-btn" type="button" data-open-target="${lm.id}">
                Open Place ↗
              </button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `, "Royal Kingdom Map");

  // Wire Map Actions
  modalRoot.querySelector("#ask-kari-map-btn")?.addEventListener("click", () => {
    const q = getActiveQuest();
    closeModal();
    kariSpeak(q.hint, 8000);
  });

  modalRoot.querySelectorAll("[data-teleport]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lmId = btn.dataset.teleport;
      const lm = landmarks.find((l) => l.id === lmId);
      if (!lm) return;

      closeModal();
      if (lm.theme !== activeWorldTheme) setWorldTheme(lm.theme);
      world?.teleportTo(lm.coords.x, lm.coords.z);
      soundManager.play("sparkle");
      visitedLandmarks.add(lm.id);
      saveSet("yunisha_visited_landmarks", visitedLandmarks);
      announce(`Teleported to ${lm.name}! ✨`);
      kariSpeak(`We arrived at ${lm.name}! Let's look around! 🌸`);
    });
  });

  modalRoot.querySelectorAll("[data-open-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lmId = btn.dataset.openTarget;
      closeModal();
      openModal(lmId);
    });
  });
}

// =========================================================================
// STORY QUESTS MODAL
// =========================================================================
function renderQuestsModal() {
  modalShell(`
    <p class="modal-eyebrow">Royal Story Quests 📜</p>
    <h2>Princess Yunisha's Adventures</h2>
    <p class="modal-intro">Complete each story quest to discover all the hidden magic, earn Princess XP, and unlock royal tiaras and festival wonders!</p>

    <div class="quests-container">
      ${storyQuests.map((q) => {
        const completed = q.checkCompleted();
        const isActive = q.id === activeQuestId;
        const prog = q.getProgress();
        const percent = Math.min(100, Math.round((prog.current / prog.total) * 100));

        return `
          <div class="quest-story-card ${completed ? "is-completed" : isActive ? "is-active-quest" : ""}">
            <div class="quest-card-top">
              <span class="quest-card-number">${q.tag}</span>
              <span class="quest-card-xp-tag">+${q.rewardXP} XP</span>
            </div>
            <div>
              <h3 class="quest-card-title">${q.title}</h3>
              <span class="quest-card-nepali">${q.nepali}</span>
            </div>
            <p class="quest-card-desc">${q.desc}</p>
            <div class="quest-card-progress-bar-wrap">
              <div class="quest-card-progress-bar" style="width: ${percent}%;"></div>
            </div>
            <div class="quest-card-footer">
              <span class="quest-status-text">
                ${completed ? "✓ COMPLETED" : `${prog.label}: ${prog.current}/${prog.total}`}
              </span>
              <div class="quest-action-row">
                <button class="secondary-button" type="button" data-quest-hint="${q.id}">
                  Kari's Hint 💡
                </button>
                ${!completed ? `
                  <button class="button button-gold" type="button" data-quest-track="${q.id}">
                    ${isActive ? "Currently Tracking ✓" : "Track Quest ✦"}
                  </button>
                ` : ""}
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `, "Story Quests");

  modalRoot.querySelectorAll("[data-quest-hint]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = storyQuests.find((item) => item.id === btn.dataset.questHint);
      if (q) {
        closeModal();
        kariSpeak(q.hint, 8000);
      }
    });
  });

  modalRoot.querySelectorAll("[data-quest-track]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeQuestId = btn.dataset.questTrack;
      localStorage.setItem("yunisha_active_quest", activeQuestId);
      updateQuestHUD();
      closeModal();
      announce("Tracking active quest!");
      const q = getActiveQuest();
      kariSpeak(`Now following: ${q.title}! ${q.hint}`);
    });
  });
}

// =========================================================================
// PRINCESS CUSTOMIZATION STUDIO (WARDROBE)
// =========================================================================
function renderCustomizationStudio() {
  wardrobeVisited = true;
  localStorage.setItem("yunisha_wardrobe_visited", "true");
  unlockAchievement("style_icon");
  updateQuestHUD();

  let activeTab = "gowns";

  const gowns = [
    { id: "royal", name: "Royal Crimson & Gold Gown", icon: "👑", desc: "The grand regal gown worn by Princess Yunisha.", unlocked: true },
    { id: "blossom", name: "Cherry Blossom Pink Gown", icon: "🌸", desc: "A sweet pink silk gown embroidered with garden petals.", unlocked: true },
    { id: "ice", name: "Ice Princess Diamond Blue Gown", icon: "❄️", desc: "A glistening cyan gown reflecting winter starlight.", unlocked: true },
    { id: "dream", name: "Dream Lavender Twilight Gown", icon: "💜", desc: "A dreamy purple gown woven from soft evening clouds.", unlocked: true },
    { id: "sunset", name: "Sunset Festival Saffron Gown", icon: "🌅", desc: "A warm golden-orange gown celebrating Dashain sunshine.", unlocked: true },
  ];

  const crowns = [
    { id: "royal", name: "Golden Sovereign Crown", icon: "👑", desc: "The shining golden crown of the royal palace.", unlocked: true },
    { id: "blossom", name: "Blossom Floral Tiara", icon: "🌸", desc: "A delicate tiara made of everlasting pink blossoms.", unlocked: bloomedFlowers.size >= 3 },
    { id: "starry", name: "Starry Night Diadem", icon: "⭐", desc: "Formed from three falling stars collected in the kingdom.", unlocked: collectedStars.size >= 3 },
    { id: "crystal", name: "Crystal Ice Tiara", icon: "💎", desc: "Awarded to princesses reaching Level 3 Kindness Weaver.", unlocked: getLevelInfo(xp).level >= 3 },
    { id: "dashain", name: "Dashain Golden Mukut", icon: "🌺", desc: "The sacred festive crown blessed by Dashain traditions.", unlocked: foundTreasures.size >= 3 },
  ];

  const trails = [
    { id: "sparkle", name: "Sparkling Gold Dust", icon: "✨", desc: "Leaves glowing golden dust as you stroll and hop.", unlocked: true },
    { id: "petals", name: "Floating Rose Petals", icon: "🌹", desc: "Soft fragrant rose petals drift behind your footsteps.", unlocked: true },
    { id: "starlight", name: "Celestial Starlight", icon: "💫", desc: "Twinkling starbeams follow every royal step.", unlocked: wardrobeVisited },
    { id: "none", name: "Gentle Stroll", icon: "🕊️", desc: "Clean and graceful movement across the kingdom.", unlocked: true },
  ];

  const kariStyles = [
    { id: "golden", name: "Golden Radiance Wings", icon: "🦋", desc: "Kari's natural warm golden sunlit butterfly wings.", unlocked: true },
    { id: "blossom", name: "Pink Blossom Wings", icon: "🌸", desc: "Pastel cherry blossom wings with floral shimmer.", unlocked: true },
    { id: "lavender", name: "Lavender Twilight Wings", icon: "💜", desc: "Soft purple wings reflecting twilight stars.", unlocked: true },
    { id: "rainbow", name: "Rainbow Prism Wings", icon: "🌈", desc: "Shimmering rainbow wings unlocked at Level 4 Star Explorer.", unlocked: getLevelInfo(xp).level >= 4 },
  ];

  const renderContent = () => {
    let items = gowns;
    let typeKey = "outfit";
    let currentEquipped = equippedWardrobe.outfit;

    if (activeTab === "crowns") {
      items = crowns;
      typeKey = "crown";
      currentEquipped = equippedWardrobe.crown;
    } else if (activeTab === "trails") {
      items = trails;
      typeKey = "trail";
      currentEquipped = equippedWardrobe.trail;
    } else if (activeTab === "kari") {
      items = kariStyles;
      typeKey = "kari";
      currentEquipped = equippedWardrobe.kari;
    }

    return `
      <div class="wardrobe-grid">
        ${items.map((item) => {
          const isEquipped = currentEquipped === item.id;
          return `
            <div class="wardrobe-item-card ${isEquipped ? "is-equipped" : ""}">
              <div>
                <span class="wardrobe-item-icon">${item.icon}</span>
                <h3 class="wardrobe-item-title">${item.name}</h3>
                <p class="wardrobe-item-desc">${item.desc}</p>
              </div>
              <div>
                ${isEquipped ? `
                  <div class="wardrobe-equipped-pill">EQUIPPED ✓</div>
                ` : item.unlocked ? `
                  <button class="wardrobe-equip-btn" type="button" data-equip-type="${typeKey}" data-equip-id="${item.id}">
                    Equip Style ✧
                  </button>
                ` : `
                  <div class="wardrobe-locked-pill">🔒 Complete Quest / Level</div>
                `}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  };

  modalShell(`
    <p class="modal-eyebrow">The Royal Dressing Room &amp; Mirror 🪞</p>
    <h2>Princess Customization Studio</h2>
    <p class="modal-intro">Choose your favorite royal gown, sparkling crown, magical movement trail, and Kari's butterfly wings!</p>

    <div class="wardrobe-tabs">
      <button class="pill-button ${activeTab === "gowns" ? "is-active" : ""}" id="tab-gowns" type="button">Royal Gowns 👗</button>
      <button class="pill-button ${activeTab === "crowns" ? "is-active" : ""}" id="tab-crowns" type="button">Sparkling Crowns 👑</button>
      <button class="pill-button ${activeTab === "trails" ? "is-active" : ""}" id="tab-trails" type="button">Movement Trails ✨</button>
      <button class="pill-button ${activeTab === "kari" ? "is-active" : ""}" id="tab-kari" type="button">Kari's Butterfly Wings 🦋</button>
    </div>

    <div id="wardrobe-content-container">${renderContent()}</div>
  `, "Princess Customization Studio");

  const wireStudio = () => {
    modalRoot.querySelectorAll(".wardrobe-tabs button").forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        activeTab = tabBtn.id.replace("tab-", "");
        modalRoot.querySelectorAll(".wardrobe-tabs button").forEach((b) => b.classList.remove("is-active"));
        tabBtn.classList.add("is-active");
        const container = modalRoot.querySelector("#wardrobe-content-container");
        if (container) {
          container.innerHTML = renderContent();
          wireStudio();
        }
      });
    });

    modalRoot.querySelectorAll("[data-equip-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.equipType;
        const id = btn.dataset.equipId;
        equippedWardrobe[type] = id;
        saveObject("yunisha_wardrobe", equippedWardrobe);

        if (type === "outfit") world?.setPrincessOutfit(id);
        else if (type === "crown") world?.setPrincessCrown(id);
        else if (type === "trail") world?.setPrincessTrail(id);
        else if (type === "kari") world?.setKariStyle(id);

        soundManager.play("sparkle");
        announce(`Equipped new ${type}! ✨`);

        const container = modalRoot.querySelector("#wardrobe-content-container");
        if (container) {
          container.innerHTML = renderContent();
          wireStudio();
        }
      });
    });
  };

  wireStudio();
}

// =========================================================================
// PRINCESS JOURNAL MODAL (5 STORYBOOK TABS)
// =========================================================================
function renderPrincessJournal() {
  let activeTab = "journey";

  const renderContent = () => {
    const info = getLevelInfo(xp);

    if (activeTab === "journey") {
      return `
        <div class="journal-profile-card">
          <img class="journal-profile-photo" src="${galleryPhotos[0].src}" alt="${galleryPhotos[0].alt}" />
          <div>
            <div class="row" style="gap:8px; margin-bottom:4px;">
              <span class="hud-badge">Level ${info.level}</span>
              <strong class="journal-profile-name">Princess Yunisha Karki</strong>
            </div>
            <p class="journal-profile-title">Title: ${info.title} 👑</p>
            <div class="hud-xp-bar-wrap" style="height:7px;">
              <div class="hud-xp-bar" style="width:${info.progressPercent}%;"></div>
            </div>
            <span class="journal-profile-xp">
              ${info.level === 6 ? `${info.totalXP} XP (MAX)` : `${info.totalXP} / ${info.maxXP} XP`}
            </span>
            <p class="journal-profile-quote">
              "To my little princess Yunisha: Every day you fill our home with joy, sweet smiles, and bright laughter. May your kingdom and your life forever sparkle with love, courage, and dreams come true." — Didi ❤️
            </p>
          </div>
        </div>

        <div class="journal-stats-grid">
          <div class="journal-stat-tile">
            <span class="journal-stat-val">${openedGifts.size}/10</span>
            <span class="journal-stat-lbl">Gifts Opened 🎁</span>
          </div>
          <div class="journal-stat-tile">
            <span class="journal-stat-val">${foundTreasures.size}/3</span>
            <span class="journal-stat-lbl">Treasures Found 🔍</span>
          </div>
          <div class="journal-stat-tile">
            <span class="journal-stat-val">${collectedStars.size}/3</span>
            <span class="journal-stat-lbl">Stars Collected ⭐</span>
          </div>
          <div class="journal-stat-tile">
            <span class="journal-stat-val">${litDiyas.size}/5</span>
            <span class="journal-stat-lbl">Diyas Lit 🪔</span>
          </div>
          <div class="journal-stat-tile">
            <span class="journal-stat-val">${placedMarigolds.size}/3</span>
            <span class="journal-stat-lbl">Garlands Placed 🌼</span>
          </div>
          <div class="journal-stat-tile">
            <span class="journal-stat-val">${unlockedAchievements.size}/12</span>
            <span class="journal-stat-lbl">Achievements 🏆</span>
          </div>
        </div>
      `;
    }

    if (activeTab === "achievements") {
      return `
        <div class="achievements-grid">
          ${achievementsList.map((ach) => {
            const unlocked = unlockedAchievements.has(ach.id);
            return `
              <div class="achievement-card ${unlocked ? "is-unlocked" : "is-locked"}">
                <span class="achievement-card-icon">${ach.icon}</span>
                <div class="achievement-card-info">
                  <div class="achievement-card-header">
                    <h4 class="achievement-card-title">${ach.title}</h4>
                    <span class="achievement-status-badge ${unlocked ? "badge-unlocked" : "badge-locked"}">
                      ${unlocked ? "✓ UNLOCKED" : "🔒 LOCKED"}
                    </span>
                  </div>
                  <p class="achievement-card-desc">${ach.desc}</p>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    if (activeTab === "discoveries") {
      return `
        <div class="discoveries-list">
          <div class="discovery-card">
            <div class="discovery-card-header">
              <span class="discovery-card-icon">🌼</span>
              <div>
                <h4 class="discovery-card-title">Golden Marigold</h4>
                <span class="discovery-card-nepali">सयपत्री फूल</span>
              </div>
            </div>
            <p class="discovery-card-text">
              The marigold symbolizes pure affection, vitality, and longevity. During Dashain, garlands of golden marigolds adorn doorways and bring cheerful fragrance to every home.
            </p>
          </div>

          <div class="discovery-card">
            <div class="discovery-card-header">
              <span class="discovery-card-icon">🌿</span>
              <div>
                <h4 class="discovery-card-title">Sacred Jamara</h4>
                <span class="discovery-card-nepali">पवित्र जमरा</span>
              </div>
            </div>
            <p class="discovery-card-text">
              Grown from barley seeds planted on Ghatasthapana in sacred earthen pots, these yellow-green shoots symbolize divine blessings, good health, and the triumph of light over darkness.
            </p>
          </div>

          <div class="discovery-card">
            <div class="discovery-card-header">
              <span class="discovery-card-icon">🔴</span>
              <div>
                <h4 class="discovery-card-title">Dashain Tika</h4>
                <span class="discovery-card-nepali">रातो टीका र अक्षता</span>
              </div>
            </div>
            <p class="discovery-card-text">
              A sacred mixture of red vermilion powder, yogurt, and unbroken rice grains placed on the forehead by elders with auspicious mantras, wishing long life, prosperity, and courage.
            </p>
          </div>

          <div class="discovery-card">
            <div class="discovery-card-header">
              <span class="discovery-card-icon">🪔</span>
              <div>
                <h4 class="discovery-card-title">Courtyard Diya</h4>
                <span class="discovery-card-nepali">पवित्र दियो</span>
              </div>
            </div>
            <p class="discovery-card-text">
              Traditional clay lamps glowing with golden light, representing clarity, warmth, peace, and driving away any shadows so love and happiness can flourish.
            </p>
          </div>
        </div>
      `;
    }

    if (activeTab === "rewards") {
      return `
        <div class="soft-panel journal-wardrobe-panel" style="text-align:center; padding:30px 20px;">
          <span style="font-size:3rem; display:block; margin-bottom:10px;">👑 👗 🦋</span>
          <h3 class="journal-wardrobe-title">Royal Wardrobe Collection</h3>
          <p class="journal-wardrobe-desc">
            Visit your full-length magical mirror in the royal dressing room to equip your unlocked gowns, crowns, sparkles, and Kari's wings!
          </p>
          <button class="button button-gold" id="journal-go-wardrobe-btn" type="button">
            Enter Royal Dressing Room 👗
          </button>
        </div>
      `;
    }

    // Wishes Tab
    return `
      <div class="journal-wishes-tab">
        <p class="journal-wishes-intro">
          Cast your wishes into Princess Yunisha's celestial wish jar! Each wish is carried to the stars. ✨
        </p>

        <form class="wishes-composer" id="wishes-form">
          <input class="wishes-input" id="wish-input" type="text" placeholder="Type a sweet wish for this Dashain..." maxlength="120" required />
          <button class="button button-gold" type="submit">Cast Wish ✦</button>
        </form>

        <div class="wishes-list" id="wishes-container">
          ${savedWishes.map((w, idx) => `
            <div class="wish-item">
              <span class="wish-item-text">✨ ${w}</span>
              <button class="wish-delete-btn" type="button" data-del-wish="${idx}" title="Remove wish">✕</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  };

  modalShell(`
    <p class="modal-eyebrow">The Royal Storybook 📖</p>
    <h2>Princess Yunisha's Journal</h2>
    <p class="modal-intro">A personal record of your adventures, unlocked achievements, sacred Dashain discoveries, and heartfelt wishes.</p>

    <div class="journal-nav-tabs">
      <button class="journal-tab-btn ${activeTab === "journey" ? "is-active" : ""}" id="jtab-journey" type="button">My Journey 🏰</button>
      <button class="journal-tab-btn ${activeTab === "achievements" ? "is-active" : ""}" id="jtab-achievements" type="button">Achievements 🏆</button>
      <button class="journal-tab-btn ${activeTab === "discoveries" ? "is-active" : ""}" id="jtab-discoveries" type="button">Discoveries 🌿</button>
      <button class="journal-tab-btn ${activeTab === "rewards" ? "is-active" : ""}" id="jtab-rewards" type="button">My Wardrobe 👗</button>
      <button class="journal-tab-btn ${activeTab === "wishes" ? "is-active" : ""}" id="jtab-wishes" type="button">My Wishes 🌟</button>
    </div>

    <div id="journal-content-container">${renderContent()}</div>
  `, "Princess Journal");

  const wireJournal = () => {
    modalRoot.querySelectorAll(".journal-nav-tabs button").forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        activeTab = tabBtn.id.replace("jtab-", "");
        modalRoot.querySelectorAll(".journal-nav-tabs button").forEach((b) => b.classList.remove("is-active"));
        tabBtn.classList.add("is-active");
        const container = modalRoot.querySelector("#journal-content-container");
        if (container) {
          container.innerHTML = renderContent();
          wireJournal();
        }
      });
    });

    modalRoot.querySelector("#journal-go-wardrobe-btn")?.addEventListener("click", () => {
      closeModal();
      openModal("wardrobe");
    });

    const wishForm = modalRoot.querySelector("#wishes-form");
    wishForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = modalRoot.querySelector("#wish-input");
      const val = input?.value?.trim();
      if (!val) return;
      savedWishes.unshift(val);
      saveObject("yunisha_wishes", savedWishes);
      soundManager.play("wish");
      announce("Your wish was cast to the stars! ✨");
      addXP(30, "Cast Wish");
      const container = modalRoot.querySelector("#journal-content-container");
      if (container) {
        container.innerHTML = renderContent();
        wireJournal();
      }
    });

    modalRoot.querySelectorAll("[data-del-wish]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.delWish, 10);
        savedWishes.splice(idx, 1);
        saveObject("yunisha_wishes", savedWishes);
        const container = modalRoot.querySelector("#journal-content-container");
        if (container) {
          container.innerHTML = renderContent();
          wireJournal();
        }
      });
    });
  };

  wireJournal();
}

// =========================================================================
// 1. PRINCESS CASTLE EXPERIENCE
// =========================================================================
function renderPrincess() {
  modalShell(`
    <p class="modal-eyebrow">The Royal Castle of Yunisha 👑</p>
    <h2>Princess Yunisha's Royal Realm</h2>
    <p class="modal-intro">Welcome to your very own fairytale palace! Explore your royal chamber, receive your sisterly crown blessing, wave your magical wand, and uncover royal treasures.</p>

    <div class="castle-chamber-grid">
      <figure class="princess-photo-frame">
        <img src="${galleryPhotos[0].src}" alt="${galleryPhotos[0].alt}" loading="lazy" />
        <figcaption><strong>Princess Yunisha Karki</strong><br/>To the little princess who makes our world brighter. 💖</figcaption>
      </figure>

      <div class="castle-interactive-suite">
        <div class="castle-activity-card">
          <div class="activity-header">
            <span class="activity-icon">👑</span>
            <div>
              <h3>Royal Crown Ceremony</h3>
              <p>Tap your crown to receive your special princess blessing.</p>
            </div>
          </div>
          <button class="button button-gold" id="crown-bless-btn" type="button">
            ${princessBlessed ? "Wear Golden Crown 👑" : "Receive Princess Blessing ✧"}
          </button>
          <p id="princess-blessing-text" class="compliment">${princessBlessed ? "May your days always be filled with kindness, courage, laughter, and magical dreams." : "Awaiting your royal touch..."}</p>
        </div>

        <div class="castle-activity-card">
          <div class="activity-header">
            <span class="activity-icon">✨</span>
            <div>
              <h3>Magic Wand of Sparkles</h3>
              <p>Wave your golden wand to release starbursts across the kingdom.</p>
            </div>
          </div>
          <button class="secondary-button" id="wave-wand-btn" type="button">Wave Magic Wand 🪄</button>
          <div id="wand-stars-stage" class="wand-stars-stage" aria-hidden="true"></div>
        </div>

        <div class="castle-activity-card">
          <div class="activity-header">
            <span class="activity-icon">🪞</span>
            <div>
              <h3>Magic Mirror of Truth</h3>
              <p>Ask the mirror what it sees in Princess Yunisha.</p>
            </div>
          </div>
          <button class="secondary-button" id="ask-mirror-btn" type="button">Look into Mirror 🪞</button>
          <p id="mirror-reflection" class="compliment"></p>
        </div>
      </div>
    </div>

    <div class="row row-between" style="margin-top:24px;">
      <button class="secondary-button" data-open="artifacts" type="button">Explore the 12 Magical Artifacts 🗝️</button>
      <button class="pill-button" data-open="secret" type="button">Seek the Secret Room ✨</button>
    </div>
  `, "Princess Castle");

  watchLocalImage(modalRoot.querySelector(".princess-photo-frame img"), galleryPhotos[0].file);

  const crownBtn = modalRoot.querySelector("#crown-bless-btn");
  const blessingText = modalRoot.querySelector("#princess-blessing-text");
  crownBtn.addEventListener("click", () => {
    if (!princessBlessed) addXP(40, "Princess Blessing");
    princessBlessed = true;
    soundManager.play("fanfare");
    world?.interact("blessing");
    blessingText.textContent = "May your days always be filled with kindness, courage, laughter, and magical dreams, Princess Yunisha!";
    announce("A golden royal blessing for Princess Yunisha! 👑✨");
  });

  const waveBtn = modalRoot.querySelector("#wave-wand-btn");
  const wandStage = modalRoot.querySelector("#wand-stars-stage");
  waveBtn.addEventListener("click", () => {
    soundManager.play("sparkle");
    world?.interact("sparkle");
    addXP(15, "Waved Magic Wand");
    wandStage.innerHTML = "";
    for (let i = 0; i < 12; i += 1) {
      const star = document.createElement("span");
      star.className = "floating-wand-star";
      star.textContent = ["✨", "⭐", "✦", "💫"][i % 4];
      star.style.left = `${10 + Math.random() * 80}%`;
      star.style.top = `${Math.random() * 80}%`;
      wandStage.appendChild(star);
    }
    announce("You waved your wand! Magical sparkles filled the castle.");
  });

  const mirrorBtn = modalRoot.querySelector("#ask-mirror-btn");
  const mirrorText = modalRoot.querySelector("#mirror-reflection");
  const reflections = [
    "The mirror reflects: A kind, thoughtful, and brave girl whose smile brightens every room.",
    "The mirror reflects: An adventurous princess with endless curiosity and an artistic spirit.",
    "The mirror reflects: A beloved little sister who is cherished more than all the kingdom's gold.",
    "The mirror reflects: A bright star who will achieve wonderful and meaningful things in life.",
  ];
  let mirrorIndex = 0;
  mirrorBtn.addEventListener("click", () => {
    soundManager.play("wish");
    addXP(15, "Looked into Mirror");
    mirrorText.textContent = reflections[mirrorIndex % reflections.length];
    mirrorIndex += 1;
  });

  modalRoot.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.open));
  });
}

// =========================================================================
// 2. ENCHANTED GARDEN & BLOOMING WALKTHROUGH
// =========================================================================
function renderSimulations() {
  const gardenFlowers = [
    { id: "rose", name: "Royal Rose of Love", color: "#f472b6", icon: "🌹", blessing: "May love and tenderness always blossom around you." },
    { id: "lily", name: "Golden Sunburst Lily", color: "#fcd34d", icon: "🌼", blessing: "May you always bring warmth and sunshine wherever you go." },
    { id: "lotus", name: "Crystal Blue Lotus", color: "#60a5fa", icon: "🪷", blessing: "May you stay calm, pure, and strong through life's waters." },
    { id: "orchid", name: "Violet Orchid of Dreams", color: "#c084fc", icon: "🌸", blessing: "May your deepest dreams and hopes take joyful flight." },
    { id: "marigold", name: "Sweet Marigold of Joy", color: "#fb923c", icon: "🌺", blessing: "May festival cheer and laughter accompany every single step." },
  ];

  modalShell(`
    <p class="modal-eyebrow">Where Magic & Nature Bloom ❀</p>
    <h2>The Enchanted Garden</h2>
    <p class="modal-intro">Walk through blooming flowerbeds, discover hidden blessings, and play with floating magical physics!</p>

    <div class="garden-walkthrough-section">
      <div class="row-between">
        <h3 class="section-title" style="margin:0;">Magical Flowerbeds 🌸</h3>
        <span class="badge-counter" id="garden-bouquet-count">Bloomed: ${bloomedFlowers.size}/${gardenFlowers.length}</span>
      </div>
      <p class="small-note">Tap each enchanted flower to help it bloom and receive its sisterly blessing.</p>

      <div class="garden-flowers-grid">
        ${gardenFlowers.map((f) => {
          const isBloomed = bloomedFlowers.has(f.id);
          return `
            <button type="button" class="flower-bloom-card ${isBloomed ? "is-bloomed" : ""}" data-flower-id="${f.id}">
              <span class="flower-icon">${f.icon}</span>
              <strong>${f.name}</strong>
              <small class="flower-status">${isBloomed ? "Bloomed ✓" : "Tap to Bloom"}</small>
            </button>
          `;
        }).join("")}
      </div>
      <p id="garden-blessing-display" class="compliment" aria-live="polite">Choose a flower to discover its blessing.</p>
    </div>

    <h3 class="section-title">Magical Physics Laboratory 🪄</h3>
    <p class="modal-intro">Experiment with spell formations on the interactive magical canvas.</p>
    <div class="row simulation-tabs" role="group" aria-label="Choose a spell simulation">
      <button class="pill-button is-active" data-mode="orb">Particle orb</button>
      <button class="pill-button" data-mode="wand">Magic wand</button>
      <button class="pill-button" data-mode="flowers">Flower garden</button>
      <button class="pill-button" data-mode="orbit">Celestial orbit</button>
      <button class="pill-button" data-mode="gravity">Floating magic</button>
    </div>
    <div class="soft-panel" style="margin-top:14px">
      <div class="canvas-stage"><canvas class="simulation-canvas" aria-label="Interactive magical simulation"></canvas></div>
      <div class="simulation-controls" id="simulation-controls"></div>
    </div>
  `, "Enchanted Garden");

  // Garden blooming logic
  const flowerCards = modalRoot.querySelectorAll("[data-flower-id]");
  const bouquetCount = modalRoot.querySelector("#garden-bouquet-count");
  const blessingDisplay = modalRoot.querySelector("#garden-blessing-display");

  flowerCards.forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.flowerId;
      const flower = gardenFlowers.find((f) => f.id === id);
      if (!flower) return;
      if (!bloomedFlowers.has(id)) {
        addXP(25, "Bloomed Magic Flower");
        unlockAchievement("flower_whisper");
      }
      bloomedFlowers.add(id);
      saveSet("yunisha_bloomed_flowers", bloomedFlowers);
      card.classList.add("is-bloomed");
      card.querySelector(".flower-status").textContent = "Bloomed ✓";
      bouquetCount.textContent = `Bloomed: ${bloomedFlowers.size}/${gardenFlowers.length}`;
      blessingDisplay.textContent = `${flower.icon} ${flower.name}: "${flower.blessing}"`;
      soundManager.play("bloom");
      world?.interact("sparkle");
      announce(`The ${flower.name} bloomed with magic! ✨`);
      updateQuestHUD();
    });
  });

  // Canvas simulation setup
  const canvas = modalRoot.querySelector(".simulation-canvas");
  const context = canvas?.getContext("2d");
  if (!context) return;

  const state = { mode: "orb", formation: "spiral", intensity: 1, speed: 1, gravity: 0.6, paused: false, pointer: null, trail: [], pulses: [], flower: -1, orbitClock: 0, lastFrame: 0 };
  const controls = modalRoot.querySelector("#simulation-controls");
  let animationFrame;
  let stars = Array.from({ length: 22 }, () => ({ x: Math.random(), y: Math.random(), phase: Math.random() * 8 }));

  function renderControls() {
    if (state.mode === "orb") {
      controls.innerHTML = `<label class="control-label">Particle intensity <input class="range-control" id="intensity" type="range" min="0.4" max="1.8" step="0.1" value="${state.intensity}"></label><label class="control-label">Formation <select id="formation" class="select-control"><option value="spiral">Spiral galaxy</option><option value="flower">Flower</option><option value="heart">Heart</option><option value="crown">Crown</option></select></label>`;
    } else if (state.mode === "orbit") {
      controls.innerHTML = `<label class="control-label">Orbital speed <input class="range-control" id="speed" type="range" min="0" max="2.5" step="0.1" value="${state.speed}"></label><button class="pill-button" id="pause-orbit" type="button">${state.paused ? "Resume" : "Pause"} orbit</button>`;
    } else if (state.mode === "gravity") {
      controls.innerHTML = `<label class="control-label">Gravity strength <input class="range-control" id="gravity" type="range" min="0" max="2" step="0.1" value="${state.gravity}"></label>`;
    } else {
      controls.innerHTML = `<span class="small-note">${state.mode === "wand" ? "Click and drag to draw a trail of sparkles." : "Click any flower on canvas to bloom."}</span>`;
    }
  }

  function draw(now) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    if (canvas.width !== Math.round(width * pixelRatio) || canvas.height !== Math.round(height * pixelRatio)) {
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
    }
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    const t = reducedMotion ? 0 : now / 1000;
    if (state.mode === "orbit" && !state.paused && state.lastFrame) state.orbitClock += ((now - state.lastFrame) / 1000) * state.speed;
    state.lastFrame = now;

    context.fillStyle = "#f8e7c6";
    stars.forEach((star) => {
      context.globalAlpha = 0.35 + Math.sin(t * 1.8 + star.phase) * 0.3;
      context.beginPath(); context.arc(star.x * width, star.y * height, 1.3, 0, Math.PI * 2); context.fill();
    });
    context.globalAlpha = 1;

    if (state.mode === "orb") {
      const cx = width / 2; const cy = height / 2; const radius = Math.min(width, height) * 0.29;
      const count = Math.round(190 * state.intensity);
      const influenceX = state.pointer ? (state.pointer.x - cx) * 0.1 : 0;
      const influenceY = state.pointer ? (state.pointer.y - cy) * 0.1 : 0;
      for (let i = 0; i < count; i += 1) {
        const progress = i / count;
        let x, y;
        if (state.formation === "heart") {
          const a = progress * Math.PI * 2;
          x = 16 * Math.sin(a) ** 3 / 18;
          y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 18;
        } else if (state.formation === "flower") {
          const a = progress * Math.PI * 10;
          const r = 0.52 + 0.34 * Math.cos(5 * a);
          x = Math.cos(a) * r; y = Math.sin(a) * r;
        } else if (state.formation === "crown") {
          const a = progress * Math.PI * 2;
          x = Math.cos(a); y = -0.34 - Math.abs(Math.sin(a * 3)) * 0.48;
        } else {
          const a = progress * Math.PI * 18 + t * 0.6;
          const r = 0.2 + progress * 0.8;
          x = Math.cos(a) * r; y = Math.sin(a) * r;
        }
        const drift = state.paused ? 0 : Math.sin(t * 1.7 + i * 0.1) * 3;
        context.beginPath();
        context.fillStyle = i % 4 === 0 ? "#ffdda3" : i % 3 === 0 ? "#f4a8d9" : "#d5b6ff";
        context.globalAlpha = 0.45 + (i % 6) * 0.08;
        context.arc(cx + x * radius + drift + influenceX, cy + y * radius + influenceY, 1 + (i % 4) * 0.45, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      state.pulses = state.pulses.filter((pulse) => now - pulse.time < 750);
      state.pulses.forEach((pulse) => {
        const progress = (now - pulse.time) / 750;
        context.globalAlpha = 1 - progress;
        context.strokeStyle = "#ffe4a8";
        context.lineWidth = 2;
        context.beginPath();
        context.arc(pulse.x, pulse.y, 10 + progress * radius * 1.8, 0, Math.PI * 2);
        context.stroke();
      });
      context.globalAlpha = 1;
    } else if (state.mode === "wand") {
      state.trail = state.trail.filter((point) => now - point.time < 950);
      state.trail.forEach((point, index) => {
        const fade = 1 - (now - point.time) / 950;
        context.globalAlpha = fade;
        context.fillStyle = index % 2 ? "#f2c984" : "#ffdff3";
        context.beginPath(); context.arc(point.x, point.y, 1 + fade * 4, 0, Math.PI * 2); context.fill();
      });
      context.globalAlpha = 1;
      context.fillStyle = "#ffe6aa"; context.font = "18px serif"; context.fillText("✦", width / 2 - 6, height / 2 + 5);
    } else if (state.mode === "flowers") {
      for (let i = 0; i < 5; i += 1) {
        const x = width * (0.1 + i * 0.2); const y = height * 0.55;
        context.strokeStyle = "#8bb17b"; context.lineWidth = 3;
        context.beginPath(); context.moveTo(x, y + 10); context.lineTo(x, height * 0.91); context.stroke();
        const blooming = state.flower === i;
        const petals = blooming ? 9 : 5;
        const size = blooming ? 14 : 9;
        for (let p = 0; p < petals; p += 1) {
          const angle = (p / petals) * Math.PI * 2 + (state.paused ? 0 : Math.sin(t + i) * 0.04);
          context.fillStyle = i % 2 ? "#f29dca" : "#f4c784";
          context.beginPath(); context.ellipse(x + Math.cos(angle) * size, y + Math.sin(angle) * size, size * 0.66, size * 0.42, angle, 0, Math.PI * 2); context.fill();
        }
        context.fillStyle = "#ffe4a5"; context.beginPath(); context.arc(x, y, 5, 0, Math.PI * 2); context.fill();
      }
    } else if (state.mode === "orbit") {
      const cx = width / 2; const cy = height / 2;
      [38, 70, 103].forEach((radius, index) => {
        context.strokeStyle = "rgba(232,210,245,.25)"; context.lineWidth = 1;
        context.beginPath(); context.ellipse(cx, cy, radius * 1.55, radius * 0.55, -0.3, 0, Math.PI * 2); context.stroke();
        const angle = state.orbitClock * (index % 2 ? -0.65 : 0.55) + index * 2;
        const x = cx + Math.cos(angle) * radius * 1.55; const y = cy + Math.sin(angle) * radius * 0.55;
        context.fillStyle = "#ffe3a3"; context.beginPath(); context.arc(x, y, 4 + index, 0, Math.PI * 2); context.fill();
      });
    } else {
      for (let i = 0; i < 9; i += 1) {
        const x = width * (0.11 + i * 0.1);
        const phase = t * (0.5 + state.gravity * 0.65) + i * 1.3;
        const y = height * (0.25 + ((Math.sin(phase) + 1) * 0.27));
        context.save(); context.translate(x, y); context.rotate(phase * 0.3);
        context.fillStyle = i % 2 ? "#eac68c" : "#c4a1ee";
        context.fillRect(-7, -7, 14, 14);
        context.restore();
      }
    }
    animationFrame = requestAnimationFrame(draw);
  }

  renderControls();
  animationFrame = requestAnimationFrame(draw);

  modalRoot.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    modalRoot.querySelectorAll("[data-mode]").forEach((item) => item.classList.toggle("is-active", item === button));
    renderControls();
  }));

  controls.addEventListener("input", (event) => {
    const { id, value } = event.target;
    if (id === "intensity") state.intensity = Number(value);
    if (id === "speed") state.speed = Number(value);
    if (id === "gravity") state.gravity = Number(value);
  });
  controls.addEventListener("change", (event) => {
    if (event.target.id === "formation") state.formation = event.target.value;
  });
  controls.addEventListener("click", (event) => {
    if (event.target.id === "pause-orbit") {
      state.paused = !state.paused;
      event.target.textContent = state.paused ? "Resume orbit" : "Pause orbit";
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (state.mode === "orb") state.pointer = { x, y };
    if (state.mode === "wand" && event.buttons !== 0) state.trail.push({ x, y, time: performance.now() });
  });
  canvas.addEventListener("pointerleave", () => { state.pointer = null; });
  canvas.addEventListener("pointerdown", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left; const y = event.clientY - rect.top;
    if (state.mode === "orb") {
      state.pulses.push({ x, y, time: performance.now() });
      soundManager.play("sparkle");
    } else if (state.mode === "wand") {
      state.trail.push({ x, y, time: performance.now() });
      soundManager.play("sparkle");
    } else if (state.mode === "flowers") {
      const index = Math.max(0, Math.min(4, Math.round((x / rect.width) * 5 - 0.5)));
      state.flower = index;
      soundManager.play("bloom");
    }
  });

  modalCleanup = () => cancelAnimationFrame(animationFrame);
}

// =========================================================================
// 3. HALL OF GIFTS
// =========================================================================
function renderGifts() {
  modalShell(`
    <p class="modal-eyebrow">Wrapped up with love from your Didi 🎁</p>
    <h2>Ten Magical Keepsakes for Princess Yunisha</h2>
    <p class="modal-intro">Each magical box holds a personal sisterly wish or encouragement. Open any box to reveal its golden message; you can revisit them anytime.</p>

    <div class="gift-grid">
      ${gifts.map((gift, index) => {
        const isOpened = openedGifts.has(index);
        return `
          <button type="button" class="gift-tile gift-style-${index + 1} ${isOpened ? "is-opened" : ""}" data-gift="${index}" aria-label="Open gift ${index + 1}: ${gift.title}">
            <span class="gift-check">${isOpened ? "✓" : ""}</span>
            <div class="gift-box-wrapper">
              <span class="gift-box-lid" aria-hidden="true">🎀</span>
              <span class="gift-box">${gift.icon}</span>
            </div>
            <strong class="gift-title">${gift.title}</strong>
            <small class="gift-tag">${isOpened ? "Opened" : "Tap to open"}</small>
          </button>
        `;
      }).join("")}
    </div>

    <div id="gift-reveal" aria-live="polite"></div>
    <div class="row row-between" style="margin-top:20px;">
      <span class="small-note">Opened ${openedGifts.size} of ${gifts.length} magical keepsakes.</span>
      <button class="pill-button" data-open="letter">Read Didi's Full Letter 💌</button>
    </div>
  `, "Hall of Magical Gifts");

  const panel = modalRoot.querySelector("#gift-reveal");

  modalRoot.querySelectorAll("[data-gift]").forEach((tile) => {
    tile.addEventListener("click", () => {
      const index = Number(tile.dataset.gift);
      const gift = gifts[index];
      if (!openedGifts.has(index)) {
        addXP(30, "Opened Royal Gift");
        unlockAchievement("first_gift");
      }
      openedGifts.add(index);
      saveSet("yunisha_opened_gifts", openedGifts);
      if (openedGifts.size >= 10) unlockAchievement("all_gifts");

      tile.classList.add("is-opened");
      tile.querySelector(".gift-check").textContent = "✓";
      tile.querySelector(".gift-tag").textContent = "Opened";

      soundManager.play("gift");
      world?.interact("gift");

      let actionHtml = "";
      if (gift.action === "dashain") actionHtml = `<button class="button button-gold" data-open="dashain">Visit Dashain Courtyard ❁</button>`;
      if (gift.action === "letter") actionHtml = `<button class="secondary-button" data-open="letter">Open Didi's Letter 💌</button>`;
      if (gift.action === "flowers") actionHtml = `<button class="secondary-button" data-open="simulations">Visit Flower Garden ❀</button>`;
      if (gift.action === "princess") actionHtml = `<button class="secondary-button" data-open="princess">Visit Princess Castle 👑</button>`;
      if (gift.action === "secret") actionHtml = `<button class="secondary-button" data-open="secret">Seek Secret Room 🗝️</button>`;
      if (gift.action === "gallery") actionHtml = `<button class="secondary-button" data-open="gallery">Explore Memories ♡</button>`;

      panel.innerHTML = `
        <div class="soft-panel gift-reveal gift-reveal-${index + 1}" data-gift-index="${index}">
          <span class="gift-sparkle" aria-hidden="true">✦　✧　✦</span>
          <p class="eyebrow" style="margin-bottom:6px;">${gift.tag}</p>
          <h3>${gift.icon} &nbsp; ${gift.title}</h3>
          <p class="gift-body-message">${gift.message}</p>
          <div class="row" style="margin-top:14px;">${actionHtml}</div>
        </div>
      `;

      panel.querySelectorAll("[data-open]").forEach((btn) => {
        btn.addEventListener("click", () => openModal(btn.dataset.open));
      });

      announce(`Opened: ${gift.title}! ✨`);
    });
  });

  modalRoot.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.open));
  });
}

// =========================================================================
// 4. MEMORY GALLERY — 10 REAL PHOTOGRAPHS
// =========================================================================
function renderGallery() {
  const categories = [
    { id: "all", title: "All Memories (10)" },
    { id: "Yunisha", title: "👑 Princess Yunisha" },
    { id: "Our Little World", title: "👭 Sister Moments" },
    { id: "Dashain Gold", title: "✨ Dashain Gold" },
    { id: "Little Moments", title: "🌸 Precious Memories" },
  ];

  let currentCategory = "all";

  const renderPhotos = () => {
    const filtered = currentCategory === "all"
      ? galleryPhotos
      : galleryPhotos.filter((p) => p.group === currentCategory);

    return filtered.map((photo) => {
      const globalIndex = galleryPhotos.indexOf(photo);
      return `
        <button class="photo-frame" type="button" data-photo-index="${globalIndex}" aria-label="View photo: ${photo.title}">
          <div class="photo-image-wrap">
            <img src="${photo.src}" alt="${photo.alt}" loading="lazy" decoding="async" />
          </div>
          <div class="photo-meta">
            <strong class="photo-title">${photo.title}</strong>
            <span class="photo-caption">${photo.caption}</span>
          </div>
        </button>
      `;
    }).join("");
  };

  modalShell(`
    <p class="modal-eyebrow">Beautiful memories, made with love. 💗</p>
    <h2>Little Moments, Precious Memories</h2>
    <p class="modal-intro">Sweet family memories kept close to our hearts. Tap any photo frame to view it larger.</p>

    <div class="gallery-category-tabs" role="tablist">
      ${categories.map((c) => `<button class="pill-button ${c.id === currentCategory ? "is-active" : ""}" data-category="${c.id}" type="button">${c.title}</button>`).join("")}
    </div>

    <div class="photo-grid" id="gallery-photo-grid" style="margin-top:18px;">
      ${renderPhotos()}
    </div>

    <div id="photo-lightbox"></div>
  `, "Memory Gallery");

  const grid = modalRoot.querySelector("#gallery-photo-grid");
  const lightboxRoot = modalRoot.querySelector("#photo-lightbox");
  let selected = -1;

  const wireImages = () => {
    grid.querySelectorAll(".photo-frame img").forEach((img, i) => {
      const idx = Number(img.closest(".photo-frame").dataset.photoIndex);
      watchLocalImage(img, galleryPhotos[idx].file);
    });
  };
  wireImages();

  modalRoot.querySelectorAll("[data-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentCategory = btn.dataset.category;
      modalRoot.querySelectorAll("[data-category]").forEach((b) => b.classList.toggle("is-active", b === btn));
      grid.innerHTML = renderPhotos();
      wireImages();
      wireFrames();
    });
  });

  const showPhoto = (index) => {
    selected = (index + galleryPhotos.length) % galleryPhotos.length;
    const photo = galleryPhotos[selected];
    lightboxRoot.innerHTML = `
      <div class="photo-lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
        <button class="lightbox-close" type="button" aria-label="Close photo">×</button>
        <button class="lightbox-step lightbox-prev" type="button" aria-label="Previous photo">‹</button>
        <figure>
          <img src="${photo.src}" alt="${photo.alt}" />
          <figcaption>
            <strong>${photo.title}</strong>
            <span>${photo.caption}</span>
            <small class="photo-filename">${photo.file}</small>
          </figcaption>
        </figure>
        <button class="lightbox-step lightbox-next" type="button" aria-label="Next photo">›</button>
      </div>
    `;
    watchLocalImage(lightboxRoot.querySelector("figure img"), photo.file);
    lightboxRoot.querySelector(".lightbox-close").addEventListener("click", closePhoto);
    lightboxRoot.querySelector(".lightbox-prev").addEventListener("click", () => showPhoto(selected - 1));
    lightboxRoot.querySelector(".lightbox-next").addEventListener("click", () => showPhoto(selected + 1));
  };

  const closePhoto = () => {
    lightboxRoot.innerHTML = "";
    selected = -1;
  };

  const wireFrames = () => {
    grid.querySelectorAll("[data-photo-index]").forEach((frame) => {
      frame.addEventListener("click", () => showPhoto(Number(frame.dataset.photoIndex)));
    });
  };
  wireFrames();

  const onKeydown = (event) => {
    if (selected < 0) return;
    if (event.key === "ArrowLeft") showPhoto(selected - 1);
    if (event.key === "ArrowRight") showPhoto(selected + 1);
    if (event.key === "Escape") closePhoto();
  };
  window.addEventListener("keydown", onKeydown);
  modalCleanup = () => window.removeEventListener("keydown", onKeydown);
}

// =========================================================================
// 5. FUNNY VIDEO SURPRISE — REAL LOCAL VIDEOS
// =========================================================================
function renderVideos() {
  modalShell(`
    <p class="modal-eyebrow">Ready for a little laugh? 🎀</p>
    <h2>Funny Sister Moments 😂💗</h2>
    <p class="modal-intro">Some sweet memories make us smile and laugh every time we watch them. Choose a video clip and press play whenever you are ready. (Sound will only play when you press play!)</p>

    <div class="video-stage">
      <video id="memory-video" controls playsinline preload="metadata" aria-label="Selected family video">
        <source id="memory-video-source" type="video/mp4" />
      </video>
      <div class="video-overlay" id="video-overlay">
        <span>🎬</span>
        <p>Select a video to begin</p>
      </div>
    </div>

    <div class="video-picker-grid" style="margin-top:16px;">
      ${videos.map((v, i) => `
        <button class="video-choice-card ${i === 0 ? "is-active" : ""}" type="button" data-video-index="${i}">
          <span class="video-badge">Clip ${i + 1}</span>
          <strong>${v.title}</strong>
          <small>${v.subtitle}</small>
        </button>
      `).join("")}
    </div>

    <div class="row video-playback-controls" style="margin-top:14px;">
      <button id="video-play-btn" class="button button-gold" type="button">Play Selected Video ▶</button>
      <button id="video-replay-btn" class="secondary-button" type="button">Replay ↺</button>
      <button id="video-fullscreen-btn" class="pill-button" type="button">Full Screen ⛶</button>
    </div>

    <p id="video-message" class="video-message" aria-live="polite"></p>
    <p class="small-note">Videos are loaded locally from your device assets. Sound only plays when you choose to play it.</p>
  `, "Funny Video Surprise");

  const video = modalRoot.querySelector("#memory-video");
  const source = modalRoot.querySelector("#memory-video-source");
  const overlay = modalRoot.querySelector("#video-overlay");
  const message = modalRoot.querySelector("#video-message");
  const playBtn = modalRoot.querySelector("#video-play-btn");
  const replayBtn = modalRoot.querySelector("#video-replay-btn");
  const fsBtn = modalRoot.querySelector("#video-fullscreen-btn");

  let selectedIndex = 0;
  let activeVid = videos[0];

  source.src = activeVid.src;
  video.load();
  message.textContent = `Ready: ${activeVid.title}. Press play when you're ready!`;

  video.addEventListener("play", () => {
    overlay.classList.add("hidden");
    playBtn.textContent = "Pause Video ❚❚";
  });
  video.addEventListener("pause", () => {
    playBtn.textContent = "Play Video ▶";
  });
  video.addEventListener("ended", () => {
    message.textContent = "Hope this memory made you smile! Sending you a giant hug, Yunisha! 💗";
  });
  video.addEventListener("error", () => {
    message.textContent = `Could not play ${activeVid.file}. Please try the other video clip.`;
  });

  modalRoot.querySelectorAll("[data-video-index]").forEach((card) => {
    card.addEventListener("click", () => {
      selectedIndex = Number(card.dataset.videoIndex);
      activeVid = videos[selectedIndex];
      modalRoot.querySelectorAll("[data-video-index]").forEach((c) => c.classList.toggle("is-active", c === card));
      video.pause();
      source.src = activeVid.src;
      video.load();
      overlay.classList.add("hidden");
      message.textContent = `Selected: ${activeVid.title}. Press play to watch.`;
    });
  });

  playBtn.addEventListener("click", async () => {
    if (video.paused) {
      try {
        await video.play();
      } catch (err) {
        console.warn("Video playback blocked", err);
      }
    } else {
      video.pause();
    }
  });

  replayBtn.addEventListener("click", async () => {
    video.currentTime = 0;
    try {
      await video.play();
    } catch {}
  });

  fsBtn.addEventListener("click", async () => {
    try {
      if (video.requestFullscreen) await video.requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    } catch {}
  });

  modalCleanup = () => {
    video.pause();
    source.removeAttribute("src");
    video.load();
  };
}

// =========================================================================
// 6. DASHAIN COURTYARD & REBUILT TREASURE HUNT (CRITICAL)
// =========================================================================
let nextBlessingIdx = 0;
function renderDashain() {
  let activeTab = "hunt"; // "hunt" or "traditions"
  let huntStarted = foundTreasures.size > 0;

  const renderContent = () => {
    const isCompleted = foundTreasures.size === 3;
    const progressCount = `${foundTreasures.size}/3 TREASURES FOUND`;

    if (activeTab === "hunt") {
      if (!huntStarted && foundTreasures.size === 0) {
        // A. INTRODUCTION SCREEN
        return `
          <div class="treasure-hunt-intro-panel">
            <div class="hunt-hero-banner">
              <span class="hunt-badge">DASHAIN QUEST</span>
              <h3 class="hunt-main-title">THE DASHAIN TREASURE HUNT 🔍</h3>
              <p class="hunt-lead">Three magical treasures are hidden in the courtyard.<br/>Can you discover all three?</p>
            </div>

            <div class="treasure-cards-row">
              <div class="treasure-target-card">
                <div class="target-card-svg">${dashainTreasures.marigold.svg}</div>
                <h4>TREASURE 1: 🌼 GOLDEN MARIGOLD</h4>
                <p>Find the special golden marigold hidden along the courtyard pathway.</p>
                <span class="target-state-pill">Not found yet</span>
              </div>

              <div class="treasure-target-card">
                <div class="target-card-svg">${dashainTreasures.jamara.svg}</div>
                <h4>TREASURE 2: 🌿 SACRED JAMARA</h4>
                <p>Look carefully for the sacred jamara among the festive decorations.</p>
                <span class="target-state-pill">Not found yet</span>
              </div>

              <div class="treasure-target-card">
                <div class="target-card-svg">${dashainTreasures.tika.svg}</div>
                <h4>TREASURE 3: 🔴 DASHAIN TIKA</h4>
                <p>Find the beautiful tika plate prepared for Dashain.</p>
                <span class="target-state-pill">Not found yet</span>
              </div>
            </div>

            <!-- B. EXPLAIN THE CONTROLS -->
            <div class="soft-panel hunt-how-to-play">
              <h4>HOW TO PLAY</h4>
              <p>Explore the Dashain courtyard and look for the three treasures shown on your map.<br/>
              When you spot a treasure, move close to it and press <strong>E</strong>, or tap the object, to collect it!</p>
            </div>

            <div class="centered-action" style="margin-top:20px;">
              <button class="button button-gold" id="start-treasure-hunt-btn" type="button">
                Start Your Adventure ✨
              </button>
            </div>
          </div>
        `;
      }

      // Live Hunt Map & Courtyard Discovery
      return `
        <div class="treasure-live-hunt-panel">
          <div class="hunt-live-header row-between">
            <div>
              <p class="eyebrow" style="margin-bottom:4px;">THE DASHAIN TREASURE MAP 🔍</p>
              <h3 style="margin:0;">Courtyard Explorer</h3>
            </div>
            <div class="hunt-progress-pill ${isCompleted ? "is-complete" : ""}">
              <span class="progress-number">${progressCount}</span>
            </div>
          </div>

          <!-- F. THE MAP UPDATING VISIBLY -->
          <div class="treasure-cards-row live-map-grid" style="margin-top:14px;">
            ${["marigold", "jamara", "tika"].map((id) => {
              const tr = dashainTreasures[id];
              const isFound = foundTreasures.has(id);
              return `
                <div class="treasure-target-card ${isFound ? "is-found" : "is-searching"}">
                  <span class="card-status-badge">${isFound ? "COLLECTED ✓" : "SEARCHING"}</span>
                  <div class="target-card-svg">${tr.svg}</div>
                  <h4>${tr.title}</h4>
                  <p class="small-note">${isFound ? tr.foundBlessing : tr.description}</p>
                  <span class="target-state-pill ${isFound ? "pill-collected" : ""}">${isFound ? "Collected!" : "Not found yet"}</span>
                </div>
              `;
            }).join("")}
          </div>

          <!-- C. PLACE REAL TREASURES IN THE COURTYARD SCENE -->
          <div class="dashain-interactive-stage" style="margin-top:18px;">
            <div class="toran-garland" aria-hidden="true">
              <span>✿</span><span>❁</span><span>✿</span><span>❁</span><span>✿</span><span>❁</span><span>✿</span>
            </div>
            <div class="stage-himalaya" aria-hidden="true">▲ ▲ ▲</div>

            <p class="stage-guide">Look around the courtyard below and tap the treasures you spot:</p>

            <div class="courtyard-treasure-anchors">
              <!-- Treasure 1: Marigold on Right Flowerbed -->
              <button type="button" class="courtyard-collect-target target-marigold ${foundTreasures.has("marigold") ? "is-collected" : ""}" data-treasure="marigold" title="Collect Golden Marigold">
                <span class="target-halo" aria-hidden="true"></span>
                <span class="target-glyph">🌼</span>
                <span class="target-label">Golden Marigold</span>
              </button>

              <!-- Treasure 2: Jamara near Left Pillar -->
              <button type="button" class="courtyard-collect-target target-jamara ${foundTreasures.has("jamara") ? "is-collected" : ""}" data-treasure="jamara" title="Collect Sacred Jamara">
                <span class="target-halo" aria-hidden="true"></span>
                <span class="target-glyph">🌿</span>
                <span class="target-label">Sacred Jamara</span>
              </button>

              <!-- Treasure 3: Tika on Entrance Altar Table -->
              <button type="button" class="courtyard-collect-target target-tika ${foundTreasures.has("tika") ? "is-collected" : ""}" data-treasure="tika" title="Collect Dashain Tika Plate">
                <span class="target-halo" aria-hidden="true"></span>
                <span class="target-glyph">🔴</span>
                <span class="target-label">Dashain Tika</span>
              </button>
            </div>
          </div>

          <!-- D. HINTS & DISCOVERY MESSAGES -->
          <div class="hunt-actions-row row-between" style="margin-top:16px;">
            <button class="pill-button" id="hunt-hint-btn" type="button">NEED A HINT? 💡</button>
            <button class="secondary-button" id="reset-hunt-btn" type="button">Restart Treasure Hunt ↺</button>
          </div>
          <div id="hunt-hint-box" class="soft-panel hidden" style="margin-top:12px;"></div>
          <div id="hunt-discovery-announcement" class="hunt-discovery-box" aria-live="polite"></div>

          <!-- G. GRAND COMPLETION CELEBRATION -->
          ${isCompleted ? `
            <div class="hunt-grand-celebration">
              <span class="celebration-burst-icon" aria-hidden="true">✨ 🎊 ✨</span>
              <h3 class="np celebration-nepali">शुभ दशैं, युनिशा! ❤️</h3>
              <h2 class="celebration-title">You did it, Princess! I'm so proud of you! 💖</h2>
              <p class="celebration-body">
                You found all three Dashain treasures! May your life always be filled with happiness, love, good health, and sweet memories.
              </p>
              <div class="row centered-action" style="margin-top:18px;">
                <button class="button button-gold" id="see-dashain-blessing-btn" type="button">Discover Dashain Blessings 🌸</button>
                <button class="secondary-button" id="return-from-hunt-btn" type="button">Return to Kingdom 🏰</button>
              </div>
            </div>
          ` : ""}
        </div>
      `;
    }

    // Traditions Tab
    return `
      <div class="dashain-traditions-panel">
        <div class="dashain-greeting">
          <h3 lang="ne">शुभ दशैं, मेरी प्यारी नानी युनिशा! ❤️</h3>
          <h4 lang="ne">विजया दशमीको हार्दिक मंगलमय शुभकामना!</h4>
          <p lang="ne">दिदीको तर्फबाट तिमीलाई धेरै धेरै माया र आशीर्वाद। ❤️</p>
        </div>

        <section class="tika-blessing" style="margin-top:20px;">
          <p class="modal-eyebrow">A symbolic digital blessing shared with love</p>
          <h3 class="section-title" style="margin:0 0 10px;">The Sacred Tika &amp; Jamara</h3>
          <div class="tika-thali" aria-hidden="true">
            <span class="tika-powder"></span>
            <span class="jamara-sprig">🌿</span>
            <span class="thali-flower">✿</span>
          </div>
          <button class="button button-gold" id="receive-digital-tika" type="button">
            Discover the next Dashain blessing ✨
          </button>
          <p id="tika-reveal-text" class="compliment blessing-reveal-text" style="margin-top:14px; font-size:1.05rem;" aria-live="polite"></p>
        </section>

        <h3 class="section-title">Interactive Courtyard Festivities</h3>
        <p class="small-note">Tap objects in the courtyard to light diyas, ring temple bells, and release petals:</p>
        <div class="fest-interactions">
          <button class="fest-object" data-fest="diya" type="button" aria-label="Light the Diya">🪔</button>
          <button class="fest-object" data-fest="bell" type="button" aria-label="Ring the Bell">🔔</button>
          <button class="fest-object" data-fest="garland" type="button" aria-label="Release Marigold Petals">🌼</button>
          <button class="fest-object" data-fest="book" type="button" aria-label="Open Blessing Book">📖</button>
        </div>
        <p id="tradition-feedback" class="compliment" style="margin-top:12px;"></p>

        <figure class="dashain-memory-photo" style="margin-top:24px;">
          <img src="${galleryPhotos[8].src}" alt="${galleryPhotos[8].alt}" loading="lazy" />
          <figcaption>dashain pray.jpeg · A sacred Dashain prayer from our family album</figcaption>
        </figure>
      </div>
    `;
  };

  modalShell(`
    <div class="dashain-header-banner">
      <p class="modal-eyebrow">Celebrate the joy and blessings of Dashain. 🌼</p>
      <h2 class="np">शुभ दशैं, युनिशा! ❤️</h2>
      <div class="row dashain-tab-switcher">
        <button class="pill-button ${activeTab === "hunt" ? "is-active" : ""}" id="tab-hunt-btn" type="button">
          The Dashain Treasure Hunt 🔍
        </button>
        <button class="pill-button ${activeTab === "traditions" ? "is-active" : ""}" id="tab-traditions-btn" type="button">
          Courtyard Traditions &amp; Blessings 🪔
        </button>
      </div>
    </div>
    <div id="dashain-view-container">${renderContent()}</div>
  `, "Dashain Courtyard and Treasure Hunt");

  const viewContainer = modalRoot.querySelector("#dashain-view-container");

  const wireView = () => {
    // Tab switching
    modalRoot.querySelector("#tab-hunt-btn")?.addEventListener("click", () => {
      activeTab = "hunt";
      modalRoot.querySelector("#tab-hunt-btn").classList.add("is-active");
      modalRoot.querySelector("#tab-traditions-btn").classList.remove("is-active");
      viewContainer.innerHTML = renderContent();
      wireView();
    });

    modalRoot.querySelector("#tab-traditions-btn")?.addEventListener("click", () => {
      activeTab = "traditions";
      modalRoot.querySelector("#tab-traditions-btn").classList.add("is-active");
      modalRoot.querySelector("#tab-hunt-btn").classList.remove("is-active");
      viewContainer.innerHTML = renderContent();
      wireView();
    });

    // Start Hunt button
    modalRoot.querySelector("#start-treasure-hunt-btn")?.addEventListener("click", () => {
      huntStarted = true;
      soundManager.play("fanfare");
      viewContainer.innerHTML = renderContent();
      wireView();
      announce("Treasure Hunt started! Look for the Marigold, Jamara, and Tika!");
    });

    // Treasure collecting
    modalRoot.querySelectorAll("[data-treasure]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.treasure;
        if (foundTreasures.has(id)) return;

        foundTreasures.add(id);
        saveTreasures();

        world?.collectTreasure(id);
        soundManager.play("treasure");

        const tr = dashainTreasures[id];
        const announceBox = modalRoot.querySelector("#hunt-discovery-announcement");
        if (announceBox) {
          announceBox.innerHTML = `
            <div class="discovery-alert">
              <span class="discovery-icon">${tr.icon}</span>
              <div>
                <strong>${tr.foundTitle}</strong>
                <p>${tr.foundBlessing}</p>
              </div>
            </div>
          `;
        }

        announce(`Found: ${tr.title}! (${foundTreasures.size}/3 collected)`);
        addXP(100, "Found Dashain Treasure");
        unlockAchievement("first_treasure");

        if (foundTreasures.size === 3) {
          world?.triggerCelebration("petals");
          soundManager.play("celebrate");
          unlockAchievement("treasure_master");
          kariSpeak("You did it, Princess! I'm so proud of you! 💖 You found all three Dashain treasures! 🌺", 8000);
          announce("All 3 Treasures found! Dashain blessing unlocked! ✨");
        }
        updateQuestHUD();

        // Re-render live map
        viewContainer.innerHTML = renderContent();
        wireView();
      });
    });

    // Need a hint button
    const hintBtn = modalRoot.querySelector("#hunt-hint-btn");
    const hintBox = modalRoot.querySelector("#hunt-hint-box");
    if (hintBtn && hintBox) {
      hintBtn.addEventListener("click", () => {
        const missing = ["marigold", "jamara", "tika"].filter((id) => !foundTreasures.has(id));
        if (!missing.length) {
          hintBox.innerHTML = "<p>All treasures are already discovered! Enjoy your Dashain blessing! ✨</p>";
        } else {
          const nextHintId = missing[0];
          const tr = dashainTreasures[nextHintId];
          hintBox.innerHTML = `
            <h4>💡 Hint for ${tr.title} (${tr.nepali}):</h4>
            <p>${tr.hint}</p>
          `;
        }
        hintBox.classList.remove("hidden");
        soundManager.play("wish");
      });
    }

    // Reset hunt button
    modalRoot.querySelector("#reset-hunt-btn")?.addEventListener("click", () => {
      foundTreasures.clear();
      saveTreasures();
      world?.resetTreasures();
      viewContainer.innerHTML = renderContent();
      wireView();
      announce("Treasure Hunt restarted. Good luck exploring!");
    });

    // Celebration actions
    modalRoot.querySelector("#see-dashain-blessing-btn")?.addEventListener("click", () => {
      activeTab = "traditions";
      viewContainer.innerHTML = renderContent();
      wireView();
      modalRoot.querySelector("#receive-digital-tika")?.click();
    });

    modalRoot.querySelector("#return-from-hunt-btn")?.addEventListener("click", () => {
      closeModal();
    });

    // Traditions tab listeners — 8 authentic pure-Nepali Dashain blessings preserved verbatim
    const dashainBlessings = [
      "मन लगाएर पढ्नु है, नानी। 📚",
      "ममी-बाबालाई सधैँ माया गर्नू। ❤️",
      "सधैँ खुसी र स्वस्थ रहनू। 🌸",
      "जीवनमा धेरै प्रगति गर्नु र सफल बन्नु। ✨",
      "सधैँ सही बाटोमा हिँड्नु र असल मान्छे बन्नु। 🌷",
      "तिम्रा सुन्दर सपनाहरू पूरा हुँदै जाऊन्। ⭐",
      "तिम्रो जीवन माया, खुसी र असल संस्कारले भरियोस्। 💗",
      "धेरै धेरै माया र आशीर्वाद, तिम्री दिदी। ❤️",
    ];

    const tikaBtn = modalRoot.querySelector("#receive-digital-tika");
    const tikaText = modalRoot.querySelector("#tika-reveal-text");
    if (tikaBtn && tikaText) {
      tikaBtn.addEventListener("click", () => {
        soundManager.play("blessing");
        world?.interact("blessing");
        const blessing = dashainBlessings[nextBlessingIdx % dashainBlessings.length];
        nextBlessingIdx += 1;
        tikaText.textContent = blessing;
        tikaText.classList.remove("blessing-pulse");
        void tikaText.offsetWidth;
        tikaText.classList.add("blessing-pulse");
        announce(blessing);
      });
    }

    modalRoot.querySelectorAll("[data-fest]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.fest;
        world?.interact(type === "diya" ? "diya" : type === "bell" ? "bell" : "garland");
        soundManager.play(type === "bell" ? "bell" : type === "diya" ? "sparkle" : "bloom");
        const fb = modalRoot.querySelector("#tradition-feedback");
        if (fb) {
          if (type === "diya") fb.textContent = "The sacred Diya shines with golden warmth and peace 🪔";
          if (type === "bell") fb.textContent = "The temple bell chimes with pure joy and blessings 🔔";
          if (type === "garland") fb.textContent = "Marigold petals drift through the festive courtyard 🌼";
          if (type === "book") {
            const blessing = dashainBlessings[nextBlessingIdx % dashainBlessings.length];
            nextBlessingIdx += 1;
            fb.textContent = `📖 ${blessing}`;
          }
        }
      });
    });

    const photoImg = modalRoot.querySelector(".dashain-memory-photo img");
    if (photoImg) watchLocalImage(photoImg, galleryPhotos[8].file);
  };

  wireView();
}

function saveTreasures() {
  saveSet("yunisha_dashain_treasures", foundTreasures);
}

// =========================================================================
// 7. STAR OBSERVATORY & CONSTELLATION CONNECTOR
// =========================================================================
function renderObservatory() {
  const constellationStars = [
    { id: 0, x: 25, y: 35, label: "Star of Kindness" },
    { id: 1, x: 50, y: 15, label: "Star of Courage" },
    { id: 2, x: 75, y: 35, label: "Star of Joy" },
    { id: 3, x: 62, y: 65, label: "Star of Dreams" },
    { id: 4, x: 50, y: 85, label: "Star of Love" },
    { id: 5, x: 38, y: 65, label: "Star of Hope" },
  ];

  modalShell(`
    <p class="modal-eyebrow">A Starlit Sky Just for You ☾</p>
    <h2>The Celestial Observatory</h2>
    <p class="modal-intro">Gaze up at the glowing constellations. Connect the starlight points to form the Sister Heart Constellation and reveal Yunisha's sky blessing.</p>

    <div class="observatory-stage">
      <div class="constellation-connector-area" id="constellation-area">
        <svg class="constellation-svg" viewBox="0 0 100 100" id="constellation-svg" aria-label="Interactive constellation puzzle">
          <polyline id="constellation-lines" points="" fill="none" stroke="#f6d37b" stroke-width="1.8" stroke-dasharray="3 3" />
        </svg>

        ${constellationStars.map((s) => `
          <button type="button" class="observatory-star-node ${starConstellationConnected.has(s.id) ? "is-connected" : ""}" data-star-id="${s.id}" style="left:${s.x}%; top:${s.y}%;" aria-label="${s.label}">
            <span class="star-sparkle-glyph">★</span>
            <span class="star-node-label">${s.label}</span>
          </button>
        `).join("")}
      </div>

      <div class="row-between" style="margin-top:14px;">
        <span class="badge-counter" id="constellation-counter">Connected: ${starConstellationConnected.size}/${constellationStars.length}</span>
        <button class="secondary-button" id="reset-stars-btn" type="button">Reset Constellation ↺</button>
      </div>

      <p id="observatory-message" class="compliment" aria-live="polite">
        ${starConstellationConnected.size === constellationStars.length
          ? "💖 CONSTELLATION COMPLETED: Wherever you wander under the stars, my sisterly love will always light your path, Yunisha!"
          : "Tap the glowing stars to draw lines and complete the Sister Constellation."}
      </p>
    </div>

    <div class="soft-panel row-between" style="margin-top:20px;">
      <div>
        <strong>The Moon Watches Over You</strong>
        <p class="small-note" style="margin:2px 0 0;">Each twinkle in the night sky is a little wish whispered for your happiness.</p>
      </div>
      <button class="pill-button" data-open="simulations">Try Orbit Simulation 🪐</button>
    </div>
  `, "Celestial Observatory");

  const svgLines = modalRoot.querySelector("#constellation-lines");
  const counter = modalRoot.querySelector("#constellation-counter");
  const msg = modalRoot.querySelector("#observatory-message");

  const updateLines = () => {
    const points = Array.from(starConstellationConnected).map((id) => {
      const s = constellationStars[id];
      return `${s.x},${s.y}`;
    }).join(" ");
    svgLines.setAttribute("points", points);
    counter.textContent = `Connected: ${starConstellationConnected.size}/${constellationStars.length}`;
  };
  updateLines();

  modalRoot.querySelectorAll("[data-star-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.starId);
      starConstellationConnected.add(id);
      btn.classList.add("is-connected");
      soundManager.play("wish");
      updateLines();

      if (starConstellationConnected.size === constellationStars.length) {
        soundManager.play("secret");
        svgLines.setAttribute("stroke-dasharray", "none");
        msg.textContent = "💖 CONSTELLATION COMPLETED: Wherever you wander under the stars, my sisterly love will always light your path, Yunisha!";
        announce("Sister Heart Constellation completed! A stellar blessing unlocked! ✨");
        unlockAchievement("star_gazer");
        addXP(60, "Constellation Completed");
      }
    });
  });

  modalRoot.querySelector("#reset-stars-btn")?.addEventListener("click", () => {
    starConstellationConnected.clear();
    modalRoot.querySelectorAll(".observatory-star-node").forEach((b) => b.classList.remove("is-connected"));
    svgLines.setAttribute("stroke-dasharray", "3 3");
    updateLines();
    msg.textContent = "Tap the glowing stars to draw lines and complete the Sister Constellation.";
  });

  modalRoot.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => openModal(b.dataset.open)));
}

// =========================================================================
// 8. THE SECRET ROOM — SISTER REUNION & GODDESS DURGA BLESSING
// =========================================================================
function renderSecretRoom() {
  let currentScene = 1;

  const renderScene = () => {
    if (currentScene === 1) {
      return `
        <div class="secret-scene-wrapper">
          <div class="secret-portal-graphic">
            <span class="portal-ivy-symbol">🌹 🗝️ 🌹</span>
          </div>
          <p class="modal-eyebrow">Hidden Deep in the Castle Gardens</p>
          <h2>The Rose-Covered Hidden Doorway</h2>
          <p class="modal-intro">
            Beyond the blooming rose wall and golden terrace lies a secret sanctuary kept safe just for Princess Yunisha and her Didi.
          </p>
          <div class="centered-action" style="margin-top:24px;">
            <button class="button button-gold" id="secret-open-portal-btn" type="button">
              Turn the Golden Key &amp; Enter ✧
            </button>
          </div>
        </div>
      `;
    }

    if (currentScene === 2) {
      return `
        <div class="secret-scene-wrapper">
          <p class="modal-eyebrow">A Heartfelt Sister Reunion 👭❤️</p>
          <div class="sister-reunion-portrait">
            <span class="reunion-duo-icon" aria-hidden="true">👭</span>
            <div class="reunion-glow-ring"></div>
          </div>
          <h2 class="np">मेरी प्यारी बहिनी युनिशा ❤️</h2>
          <p class="reunion-dialogue-nepali" lang="ne">
            "नानी युनिशा, संसारमा तिमीभन्दा प्यारो कोही छैन।<br/>
            तिमी मुस्कुराउँदा मेरो सारा संसार खुसी हुन्छ।<br/>
            जीवनका हरेक पाइलामा दिदी सधैँ तिम्रो साथमा हुनेछु।"
          </p>
          <p class="reunion-dialogue-english">
            "Dearest Yunisha, you are the brightest joy of my life. Never forget how proud I am of you, and that my love and hugs will always be right beside you."
          </p>
          <div class="row centered-action" style="margin-top:24px;">
            <button class="button button-gold" id="secret-durga-transition-btn" type="button">
              Receive Goddess Durga's Celestial Blessing 🌸
            </button>
            <button class="secondary-button" id="secret-skip-btn" type="button">Skip to Blessing →</button>
          </div>
        </div>
      `;
    }

    // Scene 3: Celestial Durga Blessing
    return `
      <div class="secret-scene-wrapper celestial-durga-scene">
        <div class="durga-aura-halo" aria-hidden="true">
          <span class="divine-lotus-symbol">🪷</span>
        </div>
        <p class="modal-eyebrow">Divine Dashain Protection &amp; Grace</p>
        <h2 class="np">विजया दशमीको पावन आशीर्वाद</h2>
        <div class="soft-panel sacred-mantra-box">
          <p class="sacred-mantra-nepali" lang="ne">
            ॐ सर्वमंगल मांगल्ये शिवे सर्वार्थ साधिके।<br/>
            शरण्ये त्र्यम्बके गौरि नारायणि नमोऽस्तु ते॥
          </p>
          <p class="sacred-mantra-trans">
            "May Goddess Durga bless Princess Yunisha with unshakable courage, radiant good health, pure joy, and victory over every challenge in life."
          </p>
        </div>
        <div class="row centered-action" style="margin-top:24px;">
          <button class="button button-gold" id="secret-replay-btn" type="button">Replay Storyline ↺</button>
          <button class="secondary-button" id="secret-return-btn" type="button">Return to Kingdom 🏰</button>
        </div>
      </div>
    `;
  };

  modalShell(`
    <div id="secret-room-container">${renderScene()}</div>
  `, "The Secret Room");

  const container = modalRoot.querySelector("#secret-room-container");

  const wireSecret = () => {
    modalRoot.querySelector("#secret-open-portal-btn")?.addEventListener("click", () => {
      soundManager.play("secret");
      currentScene = 2;
      container.innerHTML = renderScene();
      wireSecret();
      announce("The rose doorway opened into your sanctuary!");
    });

    modalRoot.querySelector("#secret-durga-transition-btn")?.addEventListener("click", () => {
      soundManager.play("fanfare");
      world?.interact("celebration");
      currentScene = 3;
      container.innerHTML = renderScene();
      wireSecret();
      announce("Divine Dashain blessing received!");
    });

    modalRoot.querySelector("#secret-skip-btn")?.addEventListener("click", () => {
      currentScene = 3;
      container.innerHTML = renderScene();
      wireSecret();
    });

    modalRoot.querySelector("#secret-replay-btn")?.addEventListener("click", () => {
      currentScene = 1;
      container.innerHTML = renderScene();
      wireSecret();
    });

    modalRoot.querySelector("#secret-return-btn")?.addEventListener("click", () => {
      closeModal();
    });
  };

  wireSecret();
}

// =========================================================================
// 9. A LETTER FROM YOUR SISTER
// =========================================================================
function renderLetter() {
  modalShell(`
    <p class="modal-eyebrow">A little note from your elder sister</p>
    <h2>A Letter from Your Didi 💌</h2>
    <p class="modal-intro">Open the enchanted keepsake book to read a letter written especially for you.</p>

    <div class="book-stage">
      <div class="letter-book" id="letter-book">
        <div class="book-cover">
          <span class="wax-seal">♥</span>
          <span>For Yunisha Karki</span>
        </div>
        <article class="book-page hidden" id="letter-paper" aria-label="Letter from your Didi">
          <div id="typed-letter" class="typed-letter" aria-hidden="true"></div>
        </article>
      </div>
      <div class="row letter-controls">
        <button id="open-book" class="button button-gold" type="button" aria-expanded="false">Open your book 📖</button>
        <button id="read-complete" class="secondary-button hidden" type="button">Read complete letter</button>
        <button id="close-book" class="secondary-button hidden" type="button">Close the book</button>
      </div>
    </div>
  `, "A Letter for Yunisha");

  const letter = `To my dearest Yunisha,\n\nI wanted to make something truly special for you this Dashain.\n\nNot just an ordinary gift, but an entire magical kingdom you could explore whenever you wish.\n\nEvery sparkling star, every blooming flower, and every tower of this castle was crafted with love just for you.\n\nKeep smiling your wonderful smile, keep being kind and curious, and always remember how deeply precious you are.\n\nAs you grow older, know that you will always have someone cheering for you, believing in your dreams, and loving you through every adventure.\n\nHappy Dashain, my little princess.\n\nWith all my love,\nYour Didi ❤️`;

  const book = modalRoot.querySelector("#letter-book");
  const page = modalRoot.querySelector("#letter-paper");
  const typed = modalRoot.querySelector("#typed-letter");
  const openButton = modalRoot.querySelector("#open-book");
  const completeButton = modalRoot.querySelector("#read-complete");
  const closeButton = modalRoot.querySelector("#close-book");

  let timer;
  let cursor = 0;

  const showCompleteLetter = () => {
    window.clearInterval(timer);
    cursor = letter.length;
    typed.textContent = letter;
    completeButton.classList.add("hidden");
  };

  const openBook = () => {
    soundManager.play("doorway");
    book.classList.add("is-open");
    page.classList.remove("hidden");
    openButton.classList.add("hidden");
    closeButton.classList.remove("hidden");
    completeButton.classList.remove("hidden");

    if (reducedMotion) {
      showCompleteLetter();
      return;
    }

    timer = window.setInterval(() => {
      cursor = Math.min(cursor + 3, letter.length);
      typed.textContent = letter.slice(0, cursor);
      if (cursor >= letter.length) {
        window.clearInterval(timer);
        completeButton.classList.add("hidden");
      }
    }, 18);
  };

  const closeBook = () => {
    window.clearInterval(timer);
    cursor = 0;
    typed.textContent = "";
    page.classList.add("hidden");
    book.classList.remove("is-open");
    openButton.classList.remove("hidden");
    completeButton.classList.add("hidden");
    closeButton.classList.add("hidden");
  };

  openButton.addEventListener("click", openBook);
  completeButton.addEventListener("click", showCompleteLetter);
  closeButton.addEventListener("click", closeBook);
  modalCleanup = () => window.clearInterval(timer);
}

// =========================================================================
// 10. FINAL SURPRISE & ARTIFACTS
// =========================================================================
function renderFinal() {
  modalShell(`
    <div class="final-scene">
      <p class="modal-eyebrow">A little piece of magic, made with love</p>
      <span class="heart-crystal" aria-hidden="true">♥</span>
      <p class="final-first-line">Every magical kingdom needs a princess...</p>
      <h2 class="final-name">...and this one belongs to YOU, YUNISHA. 👑❤️</h2>
      <p class="final-subtitle np">शुभ दशैं, मेरी प्यारी युनिशा!</p>
      <p class="final-message">
        <span class="final-signoff-intro">Lots of love,</span>
        <strong class="final-signoff-name">Your Didi 💗</strong>
      </p>
      <div class="row centered-action" style="margin-top:24px;">
        <button class="button button-gold" id="replay-button" type="button">Replay the experience ↺</button>
        <button class="secondary-button" id="return-kingdom" type="button">Return to the kingdom 🏰</button>
      </div>
    </div>
  `, "Final Surprise for Yunisha");

  soundManager.play("celebrate");
  modalRoot.querySelector("#replay-button").addEventListener("click", goHome);
  modalRoot.querySelector("#return-kingdom").addEventListener("click", () => {
    closeModal();
    intro.classList.add("hidden");
    kingdom.classList.remove("hidden");
  });
}

function renderArtifacts() {
  let selected = 0;
  const detail = () => `
    <div class="artifact-view">
      <span class="artifact-model" aria-hidden="true">${artifacts[selected][0]}</span>
      <div class="artifact-copy">
        <h3>${artifacts[selected][1]}</h3>
        <p>${artifacts[selected][2]}</p>
        <p class="small-note">A stylized keepsake from the kingdom of Yunisha.</p>
      </div>
    </div>
  `;

  modalShell(`
    <p class="modal-eyebrow">The Royal Treasury of Yunisha</p>
    <h2>The 12 Magical Artifacts</h2>
    <p class="modal-intro">Explore each enchanted artifact of kindness, courage, and festival magic.</p>
    <div class="artifact-grid">
      ${artifacts.map(([icon, name], index) => `
        <button class="artifact-card ${index === selected ? "is-selected" : ""}" data-artifact="${index}" type="button">
          <span class="artifact-symbol">${icon}</span>
          <span class="artifact-name">${name}</span>
        </button>
      `).join("")}
    </div>
    <div id="artifact-detail">${detail()}</div>
  `, "Magical Artifact Gallery");

  modalRoot.querySelectorAll("[data-artifact]").forEach((button) => {
    button.addEventListener("click", () => {
      selected = Number(button.dataset.artifact);
      modalRoot.querySelectorAll("[data-artifact]").forEach((item) => item.classList.toggle("is-selected", item === button));
      modalRoot.querySelector("#artifact-detail").innerHTML = detail();
      soundManager.play("click");
    });
  });
}

// =========================================================================
// KARI THE GOLDEN BUTTERFLY COMPANION (WELCOME SCREEN CONTROLLER)
// =========================================================================
class WelcomeKariController {
  constructor(introElement) {
    this.intro = introElement;
    this.layer = document.getElementById("welcome-kari-layer");
    this.kari = document.getElementById("welcome-kari");
    this.canvas = document.getElementById("welcome-kari-canvas");
    this.bubble = document.getElementById("welcome-kari-bubble");
    this.leftWing = this.kari?.querySelector(".welcome-kari-wing-left");
    this.rightWing = this.kari?.querySelector(".welcome-kari-wing-right");

    if (!this.layer || !this.kari || !this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    // Viewport dimensions
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Flight state coordinates
    this.x = 85;
    this.y = 115;
    this.vx = 0;
    this.vy = 0;
    this.targetX = 140;
    this.targetY = 160;
    this.currentZoneName = "";

    // Angle and bank tilt
    this.bankAngle = 0;
    this.mode = "flying"; // "flying" | "hovering"
    this.hoverTimer = 0;
    this.interactiveExcitement = 0;
    this.bubbleTimer = null;

    // Sparkle trail pool
    this.sparkles = [];
    this.maxSparkles = 14;
    this.lastSparkleTime = 0;

    // Motion and lifecycle
    this.reducedMotion = reducedMotion;
    this.animId = null;
    this.running = false;
    this.lastTime = performance.now();

    // Bindings
    this.onTick = this.onTick.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    this.init();
  }

  init() {
    this.onResize();
    window.addEventListener("resize", this.onResize);
    this.kari.addEventListener("click", this.onClick);
    this.kari.addEventListener("keydown", this.onKeyDown);

    // Initial position in upper-left sky
    const zones = this.getOpenZones();
    if (zones.length > 0) {
      const z = zones[0];
      this.x = z.xMin + 20;
      this.y = z.yMin + 20;
      this.pickNextWaypoint();
    }
    this.resume();
  }

  getProtectedBox() {
    const introRect = this.intro.getBoundingClientRect();
    const copy = this.intro.querySelector(".intro-copy");
    if (!copy) {
      const cx = introRect.width / 2;
      const cy = introRect.height / 2;
      return { left: cx - 210, top: cy - 170, right: cx + 210, bottom: cy + 170 };
    }
    const copyRect = copy.getBoundingClientRect();
    // Safety buffer keeping Kari away from title, subtitle, and Enter buttons
    const buffer = 42;
    return {
      left: Math.max(0, copyRect.left - introRect.left - buffer),
      top: Math.max(0, copyRect.top - introRect.top - buffer),
      right: Math.min(introRect.width, copyRect.right - introRect.left + buffer),
      bottom: Math.min(introRect.height, copyRect.bottom - introRect.top + buffer)
    };
  }

  getOpenZones() {
    const box = this.getProtectedBox();
    const w = this.width;
    const h = this.height;
    const zones = [];

    // Zone 1: Upper-left open sky
    if (box.left > 80) {
      zones.push({
        name: "upper-left",
        xMin: 35,
        xMax: Math.max(45, box.left - 25),
        yMin: 50,
        yMax: Math.min(230, box.top + 80)
      });
    }

    // Zone 2: Upper-right open sky
    if (w - box.right > 80) {
      zones.push({
        name: "upper-right",
        xMin: Math.min(w - 75, box.right + 25),
        xMax: w - 45,
        yMin: 50,
        yMax: Math.min(230, box.top + 80)
      });
    }

    // Zone 3: High center sky (above heading)
    if (box.top > 80) {
      zones.push({
        name: "high-center",
        xMin: Math.max(60, box.left + 30),
        xMax: Math.min(w - 60, box.right - 30),
        yMin: 35,
        yMax: Math.max(45, box.top - 25)
      });
    }

    // Zone 4: Mid-left (around castle towers)
    if (box.left > 90) {
      zones.push({
        name: "mid-left",
        xMin: 35,
        xMax: Math.max(45, box.left - 25),
        yMin: box.top + 40,
        yMax: Math.max(box.top + 60, box.bottom - 40)
      });
    }

    // Zone 5: Mid-right (around castle towers)
    if (w - box.right > 90) {
      zones.push({
        name: "mid-right",
        xMin: Math.min(w - 75, box.right + 25),
        xMax: w - 40,
        yMin: box.top + 40,
        yMax: Math.max(box.top + 60, box.bottom - 40)
      });
    }

    // Zone 6: Lower-left near garden/trees
    if (box.left > 70 && h - box.bottom > 50) {
      zones.push({
        name: "lower-left",
        xMin: 40,
        xMax: Math.max(50, box.left - 20),
        yMin: Math.max(box.bottom - 20, h * 0.65),
        yMax: h - 55
      });
    }

    // Zone 7: Lower-right near trees
    if (w - box.right > 70 && h - box.bottom > 50) {
      zones.push({
        name: "lower-right",
        xMin: Math.min(w - 80, box.right + 20),
        xMax: w - 45,
        yMin: Math.max(box.bottom - 20, h * 0.65),
        yMax: h - 55
      });
    }

    // Narrow screen / mobile fallback
    if (zones.length === 0) {
      if (box.top > 60) {
        zones.push({ name: "mobile-top", xMin: 30, xMax: w - 30, yMin: 30, yMax: box.top - 15 });
      }
      if (h - box.bottom > 60) {
        zones.push({ name: "mobile-bottom", xMin: 30, xMax: w - 30, yMin: box.bottom + 15, yMax: h - 35 });
      }
    }

    return zones;
  }

  pickNextWaypoint() {
    const zones = this.getOpenZones();
    if (zones.length === 0) return;

    let chosen = zones[Math.floor(Math.random() * zones.length)];
    if (zones.length > 1 && chosen.name === this.currentZoneName) {
      const candidates = zones.filter((z) => z.name !== this.currentZoneName);
      chosen = candidates[Math.floor(Math.random() * candidates.length)];
    }
    this.currentZoneName = chosen.name;

    this.targetX = chosen.xMin + Math.random() * (chosen.xMax - chosen.xMin);
    this.targetY = chosen.yMin + Math.random() * (chosen.yMax - chosen.yMin);
  }

  isInsideProtected(px, py) {
    const box = this.getProtectedBox();
    return px >= box.left && px <= box.right && py >= box.top && py <= box.bottom;
  }

  onResize() {
    if (!this.intro || !this.canvas) return;
    this.width = this.intro.clientWidth || window.innerWidth;
    this.height = this.intro.clientHeight || window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Reposition if outside bounds
    this.x = Math.max(20, Math.min(this.width - 65, this.x));
    this.y = Math.max(20, Math.min(this.height - 55, this.y));

    // If inside protected box after resize, gently push to open sky
    if (this.isInsideProtected(this.x, this.y)) {
      const box = this.getProtectedBox();
      this.x = box.left > 80 ? box.left - 45 : box.right + 45;
      this.pickNextWaypoint();
    }
  }

  setReducedMotion(isReduced) {
    this.reducedMotion = isReduced;
  }

  onClick(e) {
    e.stopPropagation();
    try { soundManager.play("sparkle"); } catch (_) {}

    // Excited wing flutter
    this.interactiveExcitement = 2.2;

    // Spawn burst of 4 celebration sparkles
    for (let k = 0; k < 4; k++) {
      this.sparkles.push({
        x: this.x + 30 + (Math.random() - 0.5) * 16,
        y: this.y + 24 + (Math.random() - 0.5) * 14,
        vx: (Math.random() - 0.5) * 1.8,
        vy: -1.2 - Math.random() * 1.4,
        size: 3.5,
        alpha: 1.0,
        maxLife: 55,
        life: 0,
        color: k % 2 === 0 ? "#ff80ab" : "#ffd54f"
      });
    }

    // Display cute greeting bubble
    if (this.bubble) {
      this.bubble.classList.remove("hidden");
      void this.bubble.offsetWidth;
      this.bubble.classList.add("is-visible");

      window.clearTimeout(this.bubbleTimer);
      this.bubbleTimer = window.setTimeout(() => {
        this.bubble.classList.remove("is-visible");
        window.setTimeout(() => this.bubble.classList.add("hidden"), 300);
      }, 2400);
    }
  }

  onKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.onClick(e);
    }
  }

  pause() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.ctx?.clearRect(0, 0, this.width, this.height);
  }

  resume() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.animId = requestAnimationFrame(this.onTick);
  }

  onTick(now) {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const timeSec = now / 1000;

    // Decay interactive excitement
    if (this.interactiveExcitement > 0) {
      this.interactiveExcitement = Math.max(0, this.interactiveExcitement - dt);
    }

    // 1. FLIGHT DYNAMICS & WAYPOINT STEERING
    if (this.reducedMotion) {
      // Gentle stationary hover in upper corner
      const hoverBob = Math.sin(timeSec * 1.5) * 4;
      this.kari.style.transform = `translate3d(${this.x}px, ${this.y + hoverBob}px, 0)`;
      if (this.leftWing && this.rightWing) {
        const flap = Math.sin(timeSec * 8) * 30;
        this.leftWing.style.transform = `rotateY(${flap}deg)`;
        this.rightWing.style.transform = `rotateY(${-flap}deg)`;
      }
    } else {
      if (this.mode === "hovering") {
        this.hoverTimer -= dt;
        this.x += Math.cos(timeSec * 1.6) * 0.45;
        this.y += Math.sin(timeSec * 2.8) * 0.6;
        if (this.hoverTimer <= 0) {
          this.mode = "flying";
          this.pickNextWaypoint();
        }
      } else {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 32) {
          if (Math.random() < 0.45) {
            this.mode = "hovering";
            this.hoverTimer = 1.2 + Math.random() * 1.8;
          } else {
            this.pickNextWaypoint();
          }
        } else {
          const maxSpeed = 70; // gentle speed (pixels per second)
          const desiredVx = (dx / dist) * maxSpeed;
          const desiredVy = (dy / dist) * maxSpeed;

          this.vx += (desiredVx - this.vx) * 0.045;
          this.vy += (desiredVy - this.vy) * 0.045;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // If path unexpectedly grazes protected box, steer away
        if (this.isInsideProtected(this.x, this.y)) {
          const box = this.getProtectedBox();
          if (this.x < (box.left + box.right) / 2) {
            this.x = box.left - 25;
            this.vx = -Math.abs(this.vx);
          } else {
            this.x = box.right + 25;
            this.vx = Math.abs(this.vx);
          }
          this.pickNextWaypoint();
        }
      }

      // 2. BANK TILT & VERTICAL BOB
      const targetBank = Math.max(-24, Math.min(24, this.vx * 0.35));
      this.bankAngle += (targetBank - this.bankAngle) * 0.08;
      const bob = Math.sin(timeSec * 3.8) * 3;

      this.kari.style.transform = `translate3d(${this.x}px, ${this.y + bob}px, 0) rotate(${this.bankAngle}deg)`;

      // 3. 3D WING FLAP
      let flapFreq = 16 + Math.sin(timeSec * 1.2) * 2;
      if (this.mode === "hovering") flapFreq = 11;
      if (this.interactiveExcitement > 0) flapFreq = 40;

      const flap = Math.sin(timeSec * flapFreq);
      const wingAngle = flap * (this.interactiveExcitement > 0 ? 62 : 54);
      if (this.leftWing && this.rightWing) {
        this.leftWing.style.transform = `rotateY(${wingAngle}deg)`;
        this.rightWing.style.transform = `rotateY(${-wingAngle}deg)`;
      }

      // 4. SUBTLE GOLDEN SPARKLE TRAIL
      if (now - this.lastSparkleTime > 120 && this.sparkles.length < this.maxSparkles) {
        this.lastSparkleTime = now;
        this.sparkles.push({
          x: this.x + 30 + (Math.random() - 0.5) * 8,
          y: this.y + 24 + bob + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 0.35,
          vy: 0.35 + Math.random() * 0.5,
          size: 1.8 + Math.random() * 1.8,
          alpha: 0.85,
          maxLife: 42 + Math.random() * 20,
          life: 0,
          color: Math.random() > 0.35 ? "#ffd54f" : "#fffde7"
        });
      }
    }

    // 5. RENDER SPARKLES ON CANVAS
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
      for (let i = this.sparkles.length - 1; i >= 0; i--) {
        const sp = this.sparkles[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life++;
        const progress = sp.life / sp.maxLife;
        if (progress >= 1) {
          this.sparkles.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, (1 - progress) * sp.alpha);
        const s = sp.size * (1 - progress * 0.35);

        this.ctx.save();
        this.ctx.translate(sp.x, sp.y);
        this.ctx.fillStyle = sp.color;
        this.ctx.globalAlpha = alpha;

        // Draw soft 4-pointed golden sparkle star
        this.ctx.beginPath();
        this.ctx.moveTo(0, -s);
        this.ctx.quadraticCurveTo(0, 0, s, 0);
        this.ctx.quadraticCurveTo(0, 0, 0, s);
        this.ctx.quadraticCurveTo(0, 0, -s, 0);
        this.ctx.quadraticCurveTo(0, 0, 0, -s);
        this.ctx.fill();
        this.ctx.restore();
      }
    }

    this.animId = requestAnimationFrame(this.onTick);
  }
}

// =========================================================================
// INITIALIZATION & EVENT BINDINGS
// =========================================================================
const enterButton = document.getElementById("enter-button");
enterButton.addEventListener("click", enterWorld);
document.getElementById("skip-intro").addEventListener("click", () => enterWorld(true));
enterButton.disabled = false;

// Initialize Welcome Screen Golden Butterfly (Kari)
if (intro) {
  welcomeKari = new WelcomeKariController(intro);
}

if (reducedMotion) {
  motionToggle.setAttribute("aria-pressed", "true");
  motionToggle.innerHTML = "◉ <span>Motion off</span>";
  document.body.classList.add("reduced-motion");
}

document.getElementById("home-button").addEventListener("click", goHome);
document.querySelector(".wordmark").addEventListener("click", (event) => { event.preventDefault(); goHome(); });

const soundToggle = document.getElementById("sound-toggle");
const ambienceToggle = document.getElementById("ambience-toggle");

soundToggle.addEventListener("click", async () => {
  try {
    const enabled = await soundManager.setEffectsEnabled(!soundManager.effectsEnabled);
    soundToggle.setAttribute("aria-pressed", String(enabled));
    soundToggle.title = enabled ? "Mute sound effects" : "Turn sound effects on";
    soundToggle.innerHTML = `♫ <span>Sound ${enabled ? "on" : "off"}</span>`;
    announce(enabled ? "Gentle sound effects are on." : "Sound effects are muted.");
  } catch (error) {
    console.error("Could not enable sound effects.", error);
    announce("Sound effects are not supported by this browser.");
  }
});

ambienceToggle.addEventListener("click", async () => {
  try {
    const enabled = await soundManager.setAmbienceEnabled(!soundManager.ambienceEnabled);
    ambienceToggle.setAttribute("aria-pressed", String(enabled));
    ambienceToggle.title = enabled ? "Turn ambience off" : "Turn ambience on";
    ambienceToggle.innerHTML = `♪ <span>Ambience ${enabled ? "on" : "off"}</span>`;
    announce(enabled ? "Soft synthesized ambience is on." : "Ambience is off.");
  } catch (error) {
    console.error("Could not enable ambience.", error);
    announce("Ambience is not supported by this browser.");
  }
});

// Click sounds
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest("button");
  if (!button || button.classList.contains("sound-control") || button.id === "motion-toggle") return;
  if (button.matches(".fest-object, [data-treasure], [data-gift], [data-flower-id], [data-star-id], [data-artifact]")) return;
  soundManager.play("click");
});

window.addEventListener("pagehide", () => { void soundManager.dispose(); }, { once: true });

// Landmark button handlers
document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.open));
});

// Modal close on backdrop or ESC
document.addEventListener("click", (event) => {
  if (event.target.classList.contains("modal-close")) closeModal();
  if (event.target.classList.contains("modal-backdrop")) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const lightboxClose = modalRoot.querySelector(".photo-lightbox .lightbox-close");
    if (lightboxClose) lightboxClose.click();
    else closeModal();
    return;
  }

  // Keyboard navigation shortcuts (when no modal is open and in kingdom)
  if (!modalRoot.firstElementChild && !kingdom.classList.contains("hidden")) {
    if (event.key === "m" || event.key === "M") {
      event.preventDefault();
      openModal("map");
    } else if (event.key === "j" || event.key === "J") {
      event.preventDefault();
      openModal("journal");
    } else if (event.key === "q" || event.key === "Q") {
      event.preventDefault();
      openModal("quests");
    } else if (event.key === "c" || event.key === "C") {
      event.preventDefault();
      openModal("wardrobe");
    } else if ((event.key === "e" || event.key === "E" || event.key === "Enter") && activeProximityTarget) {
      event.preventDefault();
      handleProximityInteraction(activeProximityTarget);
    }
  }
});

questTrackerHud?.addEventListener("click", () => openModal("quests"));

motionToggle.addEventListener("click", () => {
  reducedMotion = !reducedMotion;
  motionToggle.setAttribute("aria-pressed", String(reducedMotion));
  motionToggle.innerHTML = `${reducedMotion ? "◉" : "◌"} <span>${reducedMotion ? "Motion off" : "Motion"}</span>`;
  world?.setReducedMotion(reducedMotion);
  welcomeKari?.setReducedMotion(reducedMotion);
  document.body.classList.toggle("reduced-motion", reducedMotion);
  announce(reducedMotion ? "Decorative motion reduced." : "Decorative motion restored.");
});

worldPromptBtn?.addEventListener("click", () => {
  if (activeProximityTarget) handleProximityInteraction(activeProximityTarget);
});

function useWorldFallback(error) {
  console.warn("3D rendering is unavailable; interactive experiences remain usable.", error);
  document.getElementById("world-canvas").classList.add("hidden");
  document.getElementById("world-loading").classList.add("is-ready");
  announce("3D scenery is unavailable in this browser, but all magical experiences work perfectly!");
}

import("./world.js").then(({ createWorld }) => {
  world = createWorld(document.getElementById("world-canvas"), useWorldFallback);
  world.setReducedMotion(reducedMotion);
  if (activeWorldTheme !== "FAIRY_WORLD") world.setTheme(activeWorldTheme);
  if (portalEntered) world.enterPortal();

  // Restore already collected treasures & stars in 3D scene
  foundTreasures.forEach((id) => world.collectTreasure(id));
  collectedStars.forEach((id) => world.collectQuestStar(id));
  litDiyas.forEach((id) => world.lightDiya(id));
  placedMarigolds.forEach((id) => world.placeMarigold(id));

  // Restore equipped wardrobe & butterfly style
  world.setPrincessOutfit(equippedWardrobe.outfit);
  world.setPrincessCrown(equippedWardrobe.crown);
  world.setPrincessTrail(equippedWardrobe.trail);
  world.setKariStyle(equippedWardrobe.kari);

  // Connect Proximity callback to in-world HUD prompt
  world.onProximity((data) => {
    activeProximityTarget = data;
    if (data && !modalRoot.firstElementChild && !kingdom.classList.contains("hidden")) {
      worldPrompt.classList.remove("hidden");
      worldPromptText.textContent = `Press E or tap to explore: ${data.title}`;
    } else {
      worldPrompt?.classList.add("hidden");
    }
  });
}).catch((error) => {
  console.error("Could not load the 3D scenery module.", error);
  useWorldFallback(error);
});
