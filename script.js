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

const openedGifts = new Set([...loadSavedSet("yunisha_opened_gifts")].filter((index) => Number.isInteger(index) && index >= 0 && index < 10));
const foundTreasures = loadSavedSet("yunisha_dashain_treasures");
const bloomedFlowers = loadSavedSet("yunisha_bloomed_flowers");
const unlockedAchievements = loadSavedSet("yunisha_achievements");
const collectedStars = loadSavedSet("yunisha_collected_stars");
const litDiyas = loadSavedSet("yunisha_lit_diyas");
const placedMarigolds = loadSavedSet("yunisha_placed_marigolds");
const visitedLandmarks = loadSavedSet("yunisha_visited_landmarks");
const gardenDashainDiscoveries = loadSavedSet("yunisha_garden_dashain_discoveries");
const celestialDiscoveries = new Set([...loadSavedSet("yunisha_celestial_discoveries")].filter((id) => ["dream_planet", "moon_garden", "sister_star"].includes(id)));
const savedFairyQuest = loadSavedObject("yunisha_lost_fairy_quest", {}) || {};
const fairyQuestProgress = {
  flowers: new Set(Array.isArray(savedFairyQuest.flowers) ? savedFairyQuest.flowers.filter((id) => ["rose", "lily", "lotus", "orchid", "marigold"].includes(id)) : []),
  crystals: new Set(Array.isArray(savedFairyQuest.crystals) ? savedFairyQuest.crystals.filter((id) => ["crystal_1", "crystal_2", "crystal_3"].includes(id)) : []),
  mirrorBlessing: ["Kindness", "Courage", "Imagination", "Happiness"].includes(savedFairyQuest.mirrorBlessing) ? savedFairyQuest.mirrorBlessing : "",
  rainbowRestored: savedFairyQuest.rainbowRestored === true,
  completed: savedFairyQuest.completed === true,
  rewardGranted: savedFairyQuest.rewardGranted === true,
};
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
let gardenSurpriseShown = sessionStorage.getItem("yunisha_garden_surprise") === "true";

function saveFairyQuestProgress() {
  saveObject("yunisha_lost_fairy_quest", {
    flowers: [...fairyQuestProgress.flowers],
    crystals: [...fairyQuestProgress.crystals],
    mirrorBlessing: fairyQuestProgress.mirrorBlessing,
    rainbowRestored: fairyQuestProgress.rainbowRestored,
    completed: fairyQuestProgress.completed,
    rewardGranted: fairyQuestProgress.rewardGranted,
  });
}
let princessBlessed = localStorage.getItem("yunisha_princess_blessed") === "true";
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
// ACHIEVEMENTS SYSTEM
// =========================================================================
const achievementsList = [
  { id: "first_step", title: "First Royal Steps", icon: "🏰", desc: "Enter Princess Yunisha's magical kingdom." },
  { id: "first_gift", title: "Precious Keepsake", icon: "🎁", desc: "Open your first sisterly keepsake gift." },
  { id: "all_gifts", title: "Heart of Gold", icon: "💖", desc: "Open all 10 loving gifts from Didi." },
  { id: "flower_whisper", title: "Enchanted Botanist", icon: "🌸", desc: "Help all five magic blossoms in the garden bloom." },
  { id: "star_gazer", title: "Constellation Chaser", icon: "✨", desc: "Connect stars in the Star Observatory." },
  { id: "starlight_princess", title: "Starlight Princess", icon: "🌟", desc: "Complete the Sister Heart Constellation in the correct order." },
  { id: "star_seeker", title: "Star Collector", icon: "⭐", desc: "Collect all 3 golden quest stars in the 3D kingdom." },
  { id: "first_treasure", title: "Dashain Seeker", icon: "🔍", desc: "Uncover your first hidden Dashain treasure." },
  { id: "treasure_master", title: "Master of Dashain Magic", icon: "🏆", desc: "Collect all 3 sacred Dashain treasures." },
  { id: "diya_lighter", title: "Festival of Lights", icon: "🪔", desc: "Light all 5 sacred diyas in the courtyard." },
  { id: "garland_weaver", title: "Marigold Blossom Weaver", icon: "🌼", desc: "Hang all 3 fragrant marigold garlands in the courtyard." },
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
    targetCoords: { x: -2.0, z: 4.0 },
    rewardXP: 150,
    rewardReward: "Starry Night Diadem ⭐",
    checkCompleted: () => collectedStars.size >= 3,
    getProgress: () => ({ current: Math.min(collectedStars.size, 3), total: 3, label: "Quest stars caught" }),
    hint: "Kari: Look for golden glowing stars spinning near the crystal bridge, garden path, and castle lawn!"
  },
  {
    id: "quest_4",
    tag: "Quest 4",
    title: "The Dashain Royal Treasure Hunt",
    nepali: "शाही दशैं खजाना",
    desc: "Enter the Dashain Courtyard and uncover the 3 sacred Dashain treasures: Golden Marigold, Sacred Jamara, and Tika Plate.",
    targetLocation: "dashain",
    locationName: "Dashain Courtyard",
    targetCoords: { x: 0, z: 1.8 },
    rewardXP: 200,
    rewardReward: "Dashain Golden Mukut 👑",
    checkCompleted: () => foundTreasures.size >= 3,
    getProgress: () => ({ current: Math.min(foundTreasures.size, 3), total: 3, label: "Dashain treasures found" }),
    hint: "Kari: Step into the festive courtyard! Search among the flowerbeds, earthen pots, and altar for the 3 sacred items!"
  },
  {
    id: "quest_5",
    tag: "Quest 5",
    title: "Festival of Light",
    nepali: "उज्यालो पर्व र पवित्र दियो",
    desc: "Light all 5 sacred earthen Diyas in the Dashain Courtyard to illuminate the kingdom for Vijaya Dashami.",
    targetLocation: "dashain",
    locationName: "Dashain Courtyard",
    targetCoords: { x: 0, z: 2.6 },
    rewardXP: 200,
    rewardReward: "Radiant Light Tiara 🪔",
    checkCompleted: () => litDiyas.size >= 5,
    getProgress: () => ({ current: Math.min(litDiyas.size, 5), total: 5, label: "Sacred Diyas lit" }),
    hint: "Kari: Approach the carved stone pedestals in the Dashain Courtyard! Press E to light each sacred flame!"
  },
  {
    id: "quest_6",
    tag: "Quest 6",
    title: "Marigold Garland Magic",
    nepali: "सयपत्री मालाको सुगन्ध",
    desc: "Hang fragrant orange and yellow marigold garlands with golden bells on the 3 courtyard pillars.",
    targetLocation: "dashain",
    locationName: "Dashain Courtyard",
    targetCoords: { x: 0, z: -1.5 },
    rewardXP: 250,
    rewardReward: "Goddess Durga Blessing & Grand Dashain Finale 🌺",
    checkCompleted: () => placedMarigolds.size >= 3,
    getProgress: () => ({ current: Math.min(placedMarigolds.size, 3), total: 3, label: "Garlands placed" }),
    hint: "Kari: Approach the 3 vermilion toran pillars in the courtyard and press E to hang the festive garlands!"
  },
  {
    id: "fairy_kingdom",
    tag: "Optional Quest",
    title: "The Lost Fairy Kingdom",
    nepali: "हराएको परी राज्य",
    desc: "Awaken five flowers with wand magic, find three crystals, choose a mirror blessing, restore the rainbow, and complete the adventure.",
    targetLocation: "simulations",
    locationName: "Enchanted Garden",
    targetCoords: { x: -8, z: 2 },
    rewardXP: 100,
    rewardReward: "Fairy Princess Tiara 🧚",
    optional: true,
    checkCompleted: () => fairyQuestProgress.completed,
    getProgress: () => ({
      current: fairyQuestProgress.flowers.size
        + fairyQuestProgress.crystals.size
        + Number(Boolean(fairyQuestProgress.mirrorBlessing))
        + Number(fairyQuestProgress.rainbowRestored)
        + Number(fairyQuestProgress.completed),
      total: 11,
      label: "Fairy adventure steps",
    }),
    hint: "Kari: Open the Enchanted Garden quest panel. Wake each flower with a chosen wand spell, tap all three crystals, then visit the Castle mirror and restore the rainbow!"
  },
];

function getActiveQuest() {
  const current = storyQuests.find((q) => q.id === activeQuestId);
  if (current && !current.checkCompleted()) return current;
  const next = storyQuests.find((q) => !q.optional && !q.checkCompleted());
  return next || storyQuests.find((q) => !q.optional) || storyQuests[0];
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

  if (typeof updateQuestGuidePanel === "function") updateQuestGuidePanel();
  if (typeof updateObjectiveBeacon === "function") updateObjectiveBeacon();
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
  if (typeof updateControlsVisibility === "function") updateControlsVisibility();
  if (typeof showTutorialModal === "function") showTutorialModal(false);
  kariSpeak("Hello, Princess Yunisha! 🦋 I'm Kari, your little magical friend. Shall we explore the kingdom together? ✨", 8000);
}

let isAdventureMode = false;

function setAdventureMode(active) {
  isAdventureMode = Boolean(active);
  world?.setAdventureMode(isAdventureMode);

  const btnReturnWelcome = document.getElementById("btn-return-welcome");

  if (isAdventureMode) {
    kingdom.classList.add("adventure-mode");
    btnReturnWelcome?.classList.remove("hidden");
    announce("Entered Adventure Mode! Stroll through the kingdom ✨");
  } else {
    kingdom.classList.remove("adventure-mode");
    btnReturnWelcome?.classList.add("hidden");
    announce("Returned to Kingdom Cards 🏰");
  }

  if (typeof updateControlsVisibility === "function") updateControlsVisibility();
}

function enterWorld(skipAnimation = false) {
  welcomeKari?.pause();
  portalEntered = !skipAnimation;
  setAdventureMode(false);
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
  setAdventureMode(false);
  portalEntered = false;
  world?.resetPortal();
  kingdom.classList.add("hidden");
  princessHud?.classList.add("hidden");
  kariSpeechBubble?.classList.add("hidden");
  intro.classList.remove("hidden", "is-leaving");
  welcomeKari?.resume();
  if (typeof updateControlsVisibility === "function") updateControlsVisibility();
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
  if (typeof updateControlsVisibility === "function") updateControlsVisibility();
}

function closeModal() {
  if (!modalRoot.firstElementChild) return;
  modalCleanup?.();
  modalCleanup = null;
  modalRoot.innerHTML = "";
  if (typeof updateControlsVisibility === "function") updateControlsVisibility();
  if (previousFocus instanceof HTMLElement) previousFocus.focus();
}

function openModal(name) {
  visitedLandmarks.add(name);
  saveSet("yunisha_visited_landmarks", visitedLandmarks);

  if (name === "dashain" && activeWorldTheme !== "DASHAIN_WORLD") {
    setWorldTheme("DASHAIN_WORLD");
    soundManager.play("doorway");
  }

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
  announce(`Golden Star Caught! ⭐ (${collectedStars.size}/3)`);
  kariSpeak("You caught a golden falling star! Look at it sparkle in your hands! ⭐", 6000);
  if (collectedStars.size >= 3) {
    unlockAchievement("star_seeker");
    addXP(100, "Completed Quest 3: Falling Stars");
  }
  checkAdventureFinale();
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
  if (litDiyas.size >= 5) {
    unlockAchievement("diya_lighter");
    addXP(100, "Completed Quest 5: Festival of Light");
  }
  checkAdventureFinale();
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
  if (placedMarigolds.size >= 3) {
    unlockAchievement("garland_weaver");
    addXP(100, "Completed Quest 6: Marigold Garlands");
  }
  checkAdventureFinale();
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

function checkAdventureFinale() {
  const starsDone = collectedStars.size >= 3;
  const diyasDone = litDiyas.size >= 5;
  const marigoldsDone = placedMarigolds.size >= 3;

  if (starsDone && diyasDone && marigoldsDone && !festivalCelebrated) {
    festivalCelebrated = true;
    localStorage.setItem("yunisha_festival_celebrated", "true");
    soundManager.play("fanfare");
    world?.triggerCelebration("celebration");
    unlockAchievement("treasure_master");
    unlockAchievement("garland_weaver");
    addXP(300, "Grand Dashain Quest Finale");
    announce("🎉 ALL 3 CORE QUESTS COMPLETE! You are the radiant Princess of Dashain! 👑✨");
    kariSpeak("🌟 WONDERFUL, PRINCESS YUNISHA! You found all 3 falling stars, lit all 5 sacred diyas, and hung the 3 marigold garlands! You make our kingdom shine so bright! Seek the Secret Rose Room for your Goddess Durga blessing! 🪔✨💖", 12000);
  }
}

// =========================================================================
// SAFE PLAY AGAIN & RESTART ADVENTURE SYSTEM
// =========================================================================
let pendingResetIsFullNewGame = false;

function showRestartConfirmationDialog(isFullReset = false) {
  pendingResetIsFullNewGame = Boolean(isFullReset);
  modalShell(`
    <div class="restart-confirm-card">
      <div class="restart-confirm-icon">🌟</div>
      <p class="modal-eyebrow" style="color: #ffd166; letter-spacing: 0.16em;">NEW ADVENTURE ✦ REPLAY MODE</p>
      <h2 class="restart-confirm-title">Start a new adventure?</h2>
      <p class="restart-confirm-prompt">
        Start a new adventure? Your current quest progress will be reset.
      </p>

      <div class="restart-details-box">
        <strong style="color: #ffd787; display: block; margin-bottom: 6px;">✨ Quests to replay:</strong>
        • 5 Sacred Courtyard Diyas (ready to light again 🪔)<br/>
        • 3 Marigold Garlands (ready to hang on pillars 🌼)<br/>
        • 3 Falling Golden Stars (return to the kingdom pathways ⭐)<br/>
        • Quest rewards & Dashain Grand Finale celebration can be earned again! 👑
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255, 209, 102, 0.18);">
          <strong style="color: #ffd787; display: block; margin-bottom: 4px;">💖 Safe & Preserved:</strong>
          • All 10 family photos & sister videos 📷<br/>
          • Personal Dashain letter & blessings 💌<br/>
          • Princess dresses, tiaras & Kari's look 👗<br/>
          • Unrelated achievements and treasures 🏆
        </div>
      </div>

      <div class="restart-actions-row">
        <button id="btn-cancel-restart" class="button secondary-button" type="button" style="padding: 10px 24px; font-size: 0.9rem;">
          Cancel
        </button>
        <button id="btn-confirm-restart" class="button button-gold" type="button" style="padding: 10px 26px; font-size: 0.9rem; font-weight: 700;">
          Start New Adventure
        </button>
      </div>
    </div>
  `, "Start New Adventure");

  document.getElementById("btn-cancel-restart")?.addEventListener("click", () => {
    closeModal();
  });

  document.getElementById("btn-confirm-restart")?.addEventListener("click", () => {
    restartAdventureProgress(pendingResetIsFullNewGame);
  });
}

function restartAdventureProgress(isFullReset = false) {
  if (isFullReset) {
    // 1. Reset all gameplay collections
    collectedStars.clear();
    litDiyas.clear();
    placedMarigolds.clear();
    foundTreasures.clear();
    openedGifts.clear();
    bloomedFlowers.clear();
    gardenDashainDiscoveries.clear();
    celestialDiscoveries.clear();
    fairyQuestProgress.flowers.clear();
    fairyQuestProgress.crystals.clear();
    fairyQuestProgress.mirrorBlessing = "";
    fairyQuestProgress.rainbowRestored = false;
    fairyQuestProgress.completed = false;
    fairyQuestProgress.rewardGranted = false;
    saveFairyQuestProgress();
    if (equippedWardrobe.crown === "fairy") {
      equippedWardrobe.crown = "royal";
      saveObject("yunisha_wardrobe", equippedWardrobe);
      world?.setPrincessCrown("royal");
    }
    princessBlessed = false;
    festivalCelebrated = false;
    wardrobeVisited = false;
    unlockedAchievements.clear();
    xp = 0;

    // 2. Persist to storage
    saveSet("yunisha_collected_stars", collectedStars);
    saveSet("yunisha_lit_diyas", litDiyas);
    saveSet("yunisha_placed_marigolds", placedMarigolds);
    saveSet("yunisha_dashain_treasures", foundTreasures);
    saveSet("yunisha_opened_gifts", openedGifts);
    saveSet("yunisha_bloomed_flowers", bloomedFlowers);
    saveSet("yunisha_garden_dashain_discoveries", gardenDashainDiscoveries);
    saveSet("yunisha_celestial_discoveries", celestialDiscoveries);
    saveSet("yunisha_achievements", unlockedAchievements);
    localStorage.removeItem("yunisha_festival_celebrated");
    localStorage.removeItem("yunisha_princess_blessed");
    localStorage.removeItem("yunisha_wardrobe_visited");
    localStorage.setItem("yunisha_xp", "0");
    updateHUD();

    // 3. Restore all 3D world objects
    world?.resetQuestStars();
    world?.resetFairyCrystals();
    world?.setFairyRainbowRestored(false);
    world?.resetDiyas();
    world?.resetMarigolds();
    world?.resetTreasures();

    // 4. Reset active quest to Quest 1
    activeQuestId = "quest_1";
    localStorage.setItem("yunisha_active_quest", activeQuestId);
    updateQuestHUD();

    // 5. Update UI
    if (typeof updateQuestGuidePanel === "function") updateQuestGuidePanel();
    if (typeof updateObjectiveBeacon === "function") updateObjectiveBeacon();

    closeModal();
    soundManager.play("sparkle");
    announce("✨ A brand new royal adventure has begun! Happy exploring, Princess Yunisha!");
    kariSpeak("🌟 Welcome to your sparkling new kingdom adventure, Princess Yunisha! Every flower, gift, treasure, and star is waiting for you! Let's go! 💖", 8000);
    return;
  }
  // 1. Calculate XP earned from replayable adventure quests to avoid duplicate XP
  let adventureXpEarned = 0;
  // Quest 3: Golden Stars (50 XP each + 100 XP quest completion + 50 XP achievement)
  adventureXpEarned += collectedStars.size * 50;
  if (collectedStars.size >= 3) adventureXpEarned += 100;
  if (unlockedAchievements.has("star_seeker")) adventureXpEarned += 50;

  // Quest 5: Sacred Courtyard Diyas (40 XP each + 100 XP quest completion + 50 XP achievement)
  adventureXpEarned += litDiyas.size * 40;
  if (litDiyas.size >= 5) adventureXpEarned += 100;
  if (unlockedAchievements.has("diya_lighter")) adventureXpEarned += 50;

  // Quest 6: Marigold Garlands (40 XP each + 100 XP quest completion + 50 XP achievement)
  adventureXpEarned += placedMarigolds.size * 40;
  if (placedMarigolds.size >= 3) adventureXpEarned += 100;
  if (unlockedAchievements.has("garland_weaver")) adventureXpEarned += 50;

  // Grand Dashain Finale Celebration (300 XP)
  if (festivalCelebrated) adventureXpEarned += 300;

  // Safely adjust XP so it can be re-earned without duplication
  xp = Math.max(0, xp - adventureXpEarned);
  localStorage.setItem("yunisha_xp", String(xp));
  updateHUD();

  // 2. Clear quest collection sets
  collectedStars.clear();
  litDiyas.clear();
  placedMarigolds.clear();
  festivalCelebrated = false;

  // 3. Persist reset states to localStorage
  saveSet("yunisha_collected_stars", collectedStars);
  saveSet("yunisha_lit_diyas", litDiyas);
  saveSet("yunisha_placed_marigolds", placedMarigolds);
  localStorage.removeItem("yunisha_festival_celebrated");

  // 4. Reset adventure-specific achievements so they can be re-earned
  unlockedAchievements.delete("star_seeker");
  unlockedAchievements.delete("diya_lighter");
  unlockedAchievements.delete("garland_weaver");
  saveSet("yunisha_achievements", unlockedAchievements);

  // 5. Restore 3D world objects
  world?.resetQuestStars();
  world?.resetDiyas();
  world?.resetMarigolds();

  // 6. Reset active quest to Quest 3
  activeQuestId = "quest_3";
  localStorage.setItem("yunisha_active_quest", activeQuestId);
  updateQuestHUD();

  // 7. Update Adventure Guide panel & beacon
  if (typeof updateQuestGuidePanel === "function") updateQuestGuidePanel();
  if (typeof updateObjectiveBeacon === "function") updateObjectiveBeacon();

  // 8. Close modal & celebratory announcement
  closeModal();
  soundManager.play("sparkle");
  announce("✨ A new adventure has begun! Happy exploring, Princess Yunisha!");
  kariSpeak("🌟 Welcome back to your adventure, Princess Yunisha! The falling stars and holy courtyard are waiting for you once again! Let's go! 💖", 8000);
}

function handleProximityInteraction(target) {
  if (!target) return;
  if (target.type === "welcome_cards") {
    setAdventureMode(false);
  } else if (target.type === "landmark") {
    openModal(target.id);
  } else if (target.type === "treasure") {
    collectWorldTreasure(target.id);
  } else if (target.type === "star") {
    collectWorldStar(target.id);
  } else if (target.type === "fairy_crystal") {
    discoverFairyCrystal(target.id);
  } else if (target.type === "diya") {
    lightWorldDiya(target.id);
  } else if (target.type === "marigold_point") {
    placeWorldMarigold(target.id);
  } else if (target.type === "mirror") {
    openModal("wardrobe");
  } else if (target.type === "secret_door") {
    openModal("secret");
  } else if (target.type === "dashain_portal") {
    setWorldTheme("DASHAIN_WORLD");
    world?.teleportTo(0, 0.5);
    soundManager.play("doorway");
    announce("Entered the Dashain Courtyard! ❁");
    kariSpeak("Welcome to the Dashain Courtyard! Let's light all 5 sacred diyas and hang the 3 marigold garlands! 🪔🌼", 8000);
  } else if (target.type === "fairy_portal") {
    setWorldTheme("FAIRY_WORLD");
    world?.teleportTo(0, 2.0);
    soundManager.play("doorway");
    announce("Returned to Fairy Kingdom! 🏰");
    kariSpeak("Back in our fairy kingdom! Look at the castle shining in the sunlight! 🌸", 6000);
  }
}

function discoverFairyCrystal(id) {
  const crystalIds = ["crystal_1", "crystal_2", "crystal_3"];
  if (!crystalIds.includes(id) || fairyQuestProgress.crystals.has(id)) return;
  fairyQuestProgress.crystals.add(id);
  saveFairyQuestProgress();
  world?.collectFairyCrystal(id);
  world?.castFairySpell?.("stardust");
  soundManager.play("secret");
  updateQuestHUD();
  const found = fairyQuestProgress.crystals.size;
  announce(`Fairy crystal discovered! ${found}/3 crystals found. 💎`);
  kariSpeak(found === 3
    ? "Every hidden fairy crystal is shining in your collection! Now choose a blessing in the Castle mirror. 🪞"
    : `You found a fairy crystal! ${3 - found} more ${found === 2 ? "crystal" : "crystals"} are hidden around the Enchanted Garden path.`, 5500);
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
    { id: "observatory", name: "Star Observatory", icon: "☾", coords: { x: 8, z: 4 }, desc: "Star constellations, celestial sky & sparkling wishes.", theme: "FAIRY_WORLD" },
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
                ${!completed && (q.id === "quest_4" || q.id === "quest_5" || q.id === "quest_6") ? `
                  <button class="secondary-button" type="button" data-quest-goto="${q.id}">
                    Go to Courtyard 🪔
                  </button>
                ` : ""}
                ${!completed && q.id === "quest_3" ? `
                  <button class="secondary-button" type="button" data-quest-goto-fairy="${q.id}">
                    Find Golden Stars ⭐
                  </button>
                ` : ""}
                ${!completed && q.id === "fairy_kingdom" ? `
                  <button class="secondary-button" type="button" data-quest-start-fairy>
                    Enter Fairy Garden 🧚
                  </button>
                ` : ""}
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

    <div class="quests-replay-banner">
      <div class="quests-replay-info">
        <h3 class="quests-replay-title">Ready for a New Adventure? 🌟</h3>
        <p class="quests-replay-desc">You can safely replay the Golden Stars, Courtyard Diyas, and Marigold Garlands anytime. Your personal photos, videos, letter, wardrobe, and sister memories stay 100% safe!</p>
      </div>
      <button id="btn-restart-adventure-modal" class="button button-gold" type="button">
        🔄 Play Again / Restart Adventure ✨
      </button>
    </div>
  `, "Story Quests");

  modalRoot.querySelector("#btn-restart-adventure-modal")?.addEventListener("click", () => {
    showRestartConfirmationDialog();
  });

  modalRoot.querySelectorAll("[data-quest-hint]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = storyQuests.find((item) => item.id === btn.dataset.questHint);
      if (q) {
        closeModal();
        kariSpeak(q.hint, 8000);
      }
    });
  });

  modalRoot.querySelectorAll("[data-quest-goto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeQuestId = btn.dataset.questGoto;
      localStorage.setItem("yunisha_active_quest", activeQuestId);
      updateQuestHUD();
      closeModal();
      setWorldTheme("DASHAIN_WORLD");
      world?.teleportTo(0, 0.5);
      setAdventureMode(true);
      soundManager.play("sparkle");
      announce("Arrived at Dashain Courtyard! 🪔");
      const q = getActiveQuest();
      kariSpeak(`Here is our festival courtyard! ${q.hint}`, 8000);
    });
  });

  modalRoot.querySelectorAll("[data-quest-goto-fairy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeQuestId = btn.dataset.questGotoFairy;
      localStorage.setItem("yunisha_active_quest", activeQuestId);
      updateQuestHUD();
      closeModal();
      if (activeWorldTheme !== "FAIRY_WORLD") setWorldTheme("FAIRY_WORLD");
      world?.teleportTo(0, 2.5);
      setAdventureMode(true);
      soundManager.play("sparkle");
      announce("Searching for falling stars! ⭐");
      const q = getActiveQuest();
      kariSpeak(`Look around the bridge, garden entrance, and castle lawn! ${q.hint}`, 8000);
    });
  });

  modalRoot.querySelector("[data-quest-start-fairy]")?.addEventListener("click", () => {
    activeQuestId = "fairy_kingdom";
    localStorage.setItem("yunisha_active_quest", activeQuestId);
    updateQuestHUD();
    openModal("simulations");
    requestAnimationFrame(() => modalRoot.querySelector("#lost-fairy-quest")?.scrollIntoView({ block: "start", behavior: reducedMotion ? "instant" : "smooth" }));
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
    { id: "fairy", name: "Fairy Princess Tiara", icon: "🧚", desc: "A delicate tiara awarded for restoring the Lost Fairy Kingdom.", unlocked: fairyQuestProgress.completed },
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
        <div style="margin-top: 24px; text-align: center;">
          <button id="btn-journal-new-game" class="button secondary-button" type="button" style="padding: 9px 22px; font-size: 0.8rem; border-radius: 99px;">
            ✨ Start New Game / Restart All Progress
          </button>
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

    modalRoot.querySelector("#btn-journal-new-game")?.addEventListener("click", () => {
      showRestartConfirmationDialog(true);
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
              <p>Choose a spell and send its magic through the kingdom.</p>
            </div>
          </div>
          <div class="royal-spell-grid" role="group" aria-label="Choose a wand spell">
            <button class="secondary-button" type="button" data-royal-spell="blossom">Blossom Magic 🌸</button>
            <button class="secondary-button" type="button" data-royal-spell="stardust">Stardust ✨</button>
            <button class="secondary-button" type="button" data-royal-spell="flight">Fairy Flight 🦋</button>
            <button class="secondary-button" type="button" data-royal-spell="rainbow">Rainbow 🌈</button>
            <button class="secondary-button" type="button" data-royal-spell="heart">Heart of Magic 💗</button>
          </div>
          <div id="wand-stars-stage" class="wand-stars-stage" aria-hidden="true"></div>
          <p id="wand-spell-feedback" class="small-note" aria-live="polite">Choose a spell to begin.</p>
        </div>

        <div class="castle-activity-card">
          <div class="activity-header">
            <span class="activity-icon">🪞</span>
            <div>
              <h3>Magic Mirror of Truth</h3>
              <p>Choose a little truth for your heart to remember.</p>
            </div>
          </div>
          <div class="royal-mirror-choices" role="group" aria-label="Choose a mirror blessing">
            <button class="pill-button" type="button" data-mirror-choice="Kindness">Kindness</button>
            <button class="pill-button" type="button" data-mirror-choice="Courage">Courage</button>
            <button class="pill-button" type="button" data-mirror-choice="Imagination">Imagination</button>
            <button class="pill-button" type="button" data-mirror-choice="Happiness">Happiness</button>
          </div>
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
    localStorage.setItem("yunisha_princess_blessed", "true");
    crownBtn.classList.add("crown-ceremony-complete");
    soundManager.play("fanfare");
    world?.interact("blessing");
    blessingText.textContent = "May your days always be filled with kindness, courage, laughter, and magical dreams, Princess Yunisha!";
    announce("A golden royal blessing for Princess Yunisha! 👑✨");
  });

  const wandStage = modalRoot.querySelector("#wand-stars-stage");
  const spellFeedback = modalRoot.querySelector("#wand-spell-feedback");
  const spellCopy = {
    blossom: { message: "Blossom magic sends pink petals dancing through the castle!", symbols: ["🌸", "🌺", "🌼"], sound: "bloom", effect: "celebration" },
    stardust: { message: "Golden stardust twinkles around the kingdom!", symbols: ["✨", "⭐", "💫"], sound: "sparkle", effect: "celebration" },
    flight: { message: "Kari flutters beside you on a little fairy flight!", symbols: ["🦋", "🦋", "✨"], sound: "wish", effect: "kari_greet" },
    rainbow: { message: "A rainbow shimmer fills the royal sky!", symbols: ["🌈", "✨", "🌈"], sound: "secret", effect: "celebration" },
    heart: { message: "A warm heart of magic glows around the princess!", symbols: ["💗", "💖", "💕"], sound: "wish", effect: "blessing" },
  };
  modalRoot.querySelectorAll("[data-royal-spell]").forEach((spellButton) => spellButton.addEventListener("click", () => {
    const spell = spellCopy[spellButton.dataset.royalSpell];
    if (!spell) return;
    soundManager.play(spell.sound);
    world?.interact(spell.effect);
    world?.castFairySpell?.(spellButton.dataset.royalSpell);
    wandStage.innerHTML = "";
    wandStage.dataset.spell = spellButton.dataset.royalSpell;
    for (let i = 0; i < 15; i += 1) {
      const star = document.createElement("span");
      star.className = "floating-wand-star";
      star.textContent = spell.symbols[i % spell.symbols.length];
      star.style.left = `${10 + Math.random() * 80}%`;
      star.style.top = `${Math.random() * 80}%`;
      wandStage.appendChild(star);
    }
    spellFeedback.textContent = spell.message;
    announce(spell.message);
  }));

  const mirrorText = modalRoot.querySelector("#mirror-reflection");
  const mirrorBlessings = {
    Kindness: "Your kind heart makes the world gentler and brighter.",
    Courage: "You can be brave, one small step and one big dream at a time.",
    Imagination: "Your imagination can turn every day into a wonderful adventure.",
    Happiness: "Your smile brings sunshine to the people who love you.",
  };
  modalRoot.querySelectorAll("[data-mirror-choice]").forEach((choice) => choice.addEventListener("click", () => {
    const value = choice.dataset.mirrorChoice;
    soundManager.play("wish");
    world?.interact("blessing");
    fairyQuestProgress.mirrorBlessing = value;
    saveFairyQuestProgress();
    mirrorText.textContent = `The mirror sees a thoughtful princess. ${mirrorBlessings[value]}`;
  }));

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
  let surpriseTimer = null;

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
      ${bloomedFlowers.size === gardenFlowers.length
        ? `<button class="flower-bloom-card secret-flower-card" id="secret-garden-flower" type="button"><span class="flower-icon">✨</span><strong>Fairy Star of Secrets</strong><small class="flower-status">A hidden bloom is ready!</small></button>`
        : `<p class="small-note secret-flower-hint">A tiny golden secret may appear when every flower has bloomed…</p>`}
      <p id="garden-blessing-display" class="compliment" aria-live="polite">Choose a flower to discover its blessing.</p>
    </div>

    <section class="garden-dashain-discoveries" aria-labelledby="garden-dashain-title">
      <div class="row-between">
        <h3 class="section-title" id="garden-dashain-title">Dashain Garden Treasures</h3>
        <span class="badge-counter" id="garden-dashain-count">Found: ${gardenDashainDiscoveries.size}/3</span>
      </div>
      <p class="small-note">Tap each keepsake to discover a little Dashain tradition. These are separate from courtyard quests.</p>
      <div class="garden-discovery-grid">
        <button type="button" class="pill-button" data-garden-discovery="jamara">${gardenDashainDiscoveries.has("jamara") ? "✓ " : ""}🌱 Sacred Jamara</button>
        <button type="button" class="pill-button" data-garden-discovery="diya">${gardenDashainDiscoveries.has("diya") ? "✓ " : ""}🪔 Festival Diya</button>
        <button type="button" class="pill-button" data-garden-discovery="garland">${gardenDashainDiscoveries.has("garland") ? "✓ " : ""}🌼 Marigold Garland</button>
      </div>
      <p id="garden-discovery-message" class="compliment" aria-live="polite">${gardenDashainDiscoveries.size === 3 ? "शुभ दशैं! May love, light, and happiness bless your whole family. 🌼" : "Three gentle discoveries are waiting."}</p>
    </section>

    <details class="fairy-quest-panel" id="lost-fairy-quest" ${activeQuestId === "fairy_kingdom" ? "open" : ""}>
      <summary>
        <span><strong>Optional Quest: The Lost Fairy Kingdom 🧚</strong><small>Restore the fairy garden through real discoveries.</small></span>
        <span class="badge-counter" id="fairy-quest-count">Steps: ${fairyQuestProgress.flowers.size + fairyQuestProgress.crystals.size + Number(Boolean(fairyQuestProgress.mirrorBlessing)) + Number(fairyQuestProgress.rainbowRestored) + Number(fairyQuestProgress.completed)}/11</span>
      </summary>
      <div class="fairy-quest-content">
        <p class="small-note">Choose a wand spell for each flower, discover all three crystals, then choose a blessing in the Castle mirror and restore the rainbow.</p>
        <label class="control-label" for="fairy-quest-spell">Wand spell for the next flower</label>
        <select class="select-control" id="fairy-quest-spell">
          <option value="blossom">Blossom Magic 🌸</option>
          <option value="stardust">Stardust ✨</option>
          <option value="flight">Fairy Flight 🦋</option>
          <option value="rainbow">Rainbow Magic 🌈</option>
          <option value="heart">Heart of Magic 💗</option>
        </select>
        <div class="fairy-quest-flower-grid">
          ${gardenFlowers.map((flower) => `
            <button type="button" class="pill-button ${fairyQuestProgress.flowers.has(flower.id) ? "is-complete" : ""}" data-fairy-quest-flower="${flower.id}" ${fairyQuestProgress.flowers.has(flower.id) ? "disabled" : ""}>
              ${fairyQuestProgress.flowers.has(flower.id) ? "✓ " : "✧ "}${flower.icon} Awaken ${flower.name}
            </button>
          `).join("")}
        </div>
        <div class="fairy-quest-crystals">
          <strong>3D crystal discoveries: <span id="fairy-crystal-count">${fairyQuestProgress.crystals.size}/3 found</span></strong>
          <p class="small-note">Explore the Enchanted Garden in the 3D kingdom. Look near the moonlit garden path, rose beds, and lily pond; walk close and tap Discover Crystal.</p>
        </div>
        <div class="fairy-quest-actions">
          <button class="secondary-button" type="button" data-open="princess">Choose a blessing in the Magic Mirror 🪞${fairyQuestProgress.mirrorBlessing ? ` ✓ ${fairyQuestProgress.mirrorBlessing}` : ""}</button>
          <button class="secondary-button" type="button" id="fairy-quest-rainbow" ${fairyQuestProgress.flowers.size < 5 || fairyQuestProgress.crystals.size < 3 || !fairyQuestProgress.mirrorBlessing || fairyQuestProgress.rainbowRestored ? "disabled" : ""}>${fairyQuestProgress.rainbowRestored ? "Rainbow restored ✓" : "Restore the Rainbow 🌈"}</button>
          <button class="button button-gold" type="button" id="fairy-quest-complete" ${!fairyQuestProgress.rainbowRestored || fairyQuestProgress.completed ? "disabled" : ""}>${fairyQuestProgress.completed ? "Fairy adventure complete ✓" : "Complete Fairy Adventure ✨"}</button>
        </div>
        <p class="compliment" id="fairy-quest-message" aria-live="polite">${fairyQuestProgress.completed ? "The Lost Fairy Kingdom is shining again! Your Fairy Princess Tiara is ready in the wardrobe. 👑" : "Kari: The five flowers, three crystals, Castle mirror, and rainbow are all waiting for your magic."}</p>
        <button class="pill-button" type="button" id="fairy-quest-hint">Ask Kari for a location-aware hint 🦋</button>
      </div>
    </details>

    <details class="fairy-rescue-panel">
      <summary><strong>Mini-game: Fairy Garden Rescue 🦋</strong><small>Guide each tiny light to its matching flower.</small></summary>
      <p class="small-note">Tap a fairy light, then tap the flower with the same colour. Match all five to help Kari!</p>
      <div class="rescue-light-row" role="group" aria-label="Fairy lights">
        ${[["rose", "Pink", "🌹"], ["lily", "Golden", "🌼"], ["lotus", "Blue", "🪷"], ["orchid", "Violet", "🌸"], ["marigold", "Orange", "🌺"]].map(([id, color, icon]) => `<button type="button" class="rescue-light" data-rescue-light="${id}" aria-label="Select ${color} fairy light">${icon}<small>${color}</small></button>`).join("")}
      </div>
      <div class="rescue-flower-row" role="group" aria-label="Matching flowers">
        ${gardenFlowers.map((flower) => `<button type="button" class="rescue-flower" data-rescue-flower="${flower.id}" aria-label="Match light to ${flower.name}">${flower.icon}<small>${flower.name.replace(/ of .*/, "")}</small></button>`).join("")}
      </div>
      <p class="compliment" id="rescue-message" aria-live="polite">Choose one fairy light, then its matching flower. Matches: 0/5</p>
      <button type="button" class="secondary-button" id="rescue-replay">Replay Fairy Garden Rescue ↺</button>
    </details>
    <p class="garden-surprise-note" id="garden-surprise-note" aria-live="polite"></p>

    <h3 class="section-title">Magical Physics Laboratory 🪄</h3>
    <p class="modal-intro">Experiment with spell formations on the interactive magical canvas.</p>
    <div class="row simulation-tabs" role="group" aria-label="Choose a spell simulation">
      <button class="pill-button is-active" data-mode="orb">Particle orb</button>
      <button class="pill-button" data-mode="wand">Wand challenge</button>
      <button class="pill-button" data-mode="dust">Catch fairy dust</button>
      <button class="pill-button" data-mode="mixer">Rainbow mixer</button>
      <button class="pill-button" data-mode="crystal">Crystal restoration</button>
      <button class="pill-button" data-mode="pattern">Star mystery</button>
      <button class="pill-button" data-mode="orbit">Celestial orbit</button>
      <button class="pill-button" data-mode="gravity">Gravity simulation</button>
      <button class="pill-button" data-mode="floating">Floating orb game</button>
      <button class="pill-button" data-mode="laboratory">Secret spell lab</button>
      <button class="pill-button" data-mode="flowers">Flower garden</button>
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
      }
      const firstBloom = !bloomedFlowers.has(id);
      bloomedFlowers.add(id);
      saveSet("yunisha_bloomed_flowers", bloomedFlowers);
      if (bloomedFlowers.size === gardenFlowers.length) {
        unlockAchievement("flower_whisper");
        if (!modalRoot.querySelector("#secret-garden-flower")) {
          const secretFlower = document.createElement("button");
          secretFlower.className = "flower-bloom-card secret-flower-card";
          secretFlower.id = "secret-garden-flower";
          secretFlower.type = "button";
          secretFlower.innerHTML = `<span class="flower-icon">✨</span><strong>Fairy Star of Secrets</strong><small class="flower-status">A hidden bloom is ready!</small>`;
          modalRoot.querySelector(".secret-flower-hint")?.replaceWith(secretFlower);
        }
      }
      card.classList.add("is-bloomed");
      card.style.setProperty("--flower-color", flower.color);
      card.classList.remove("flower-bloom-burst");
      void card.offsetWidth;
      card.classList.add("flower-bloom-burst");
      card.querySelector(".flower-status").textContent = "Bloomed ✓";
      bouquetCount.textContent = `Bloomed: ${bloomedFlowers.size}/${gardenFlowers.length}`;
      blessingDisplay.textContent = `${flower.icon} ${flower.name}: "${flower.blessing}"`;
      soundManager.play("bloom");
      world?.interact("celebration");
      if (firstBloom) {
        const kariReactions = {
          rose: "The rose is blooming with all your love, Princess! 🌹",
          lily: "Your golden lily is shining like a little sun! 🌼",
          lotus: "The blue lotus is glowing with peaceful magic! 🪷",
          orchid: "Dreams are twinkling in your violet orchid! 🌸",
          marigold: "A sunny marigold for a joyful Dashain! 🌺",
        };
        kariSpeak(kariReactions[id], 3500);
      }
      announce(`The ${flower.name} bloomed with magic! ✨`);
      updateQuestHUD();
    });
  });

  modalRoot.querySelector(".garden-walkthrough-section")?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest("#secret-garden-flower")) return;
    const secretFlower = event.target.closest("#secret-garden-flower");
    secretFlower.classList.add("flower-bloom-burst");
    blessingDisplay.textContent = "✨ Fairy Star of Secrets: What has roots but never grows, and keeps your Dashain memories safe? Your heart! Surprise—you make this garden magical. ✨";
    soundManager.play("secret");
    world?.triggerCelebration();
    kariSpeak("You found the secret flower, Princess! Its golden light is all yours. ✨", 4500);
  });

  const dashainDiscoveryMessages = {
    jamara: "Sacred Jamara is grown for Dashain and shared as a blessing for growth and good fortune.",
    diya: "A Festival Diya brings a warm light of hope and welcome during Dashain.",
    garland: "Marigold garlands brighten Dashain homes and celebrations with their sunny golden colour.",
  };
  modalRoot.querySelectorAll("[data-garden-discovery]").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.gardenDiscovery;
    const isNewDiscovery = !gardenDashainDiscoveries.has(id);
    gardenDashainDiscoveries.add(id);
    saveSet("yunisha_garden_dashain_discoveries", gardenDashainDiscoveries);
    button.textContent = `✓ ${button.textContent.replace(/^✓\s*/, "")}`;
    modalRoot.querySelector("#garden-dashain-count").textContent = `Found: ${gardenDashainDiscoveries.size}/3`;
    const message = modalRoot.querySelector("#garden-discovery-message");
    if (gardenDashainDiscoveries.size === 3) {
      message.textContent = "शुभ दशैं! May love, light, and happiness bless your whole family. 🌼";
      if (isNewDiscovery) {
        world?.triggerCelebration();
        soundManager.play("celebrate");
        kariSpeak("We discovered every Dashain garden treasure! शुभ दशैं! 🪔", 5000);
      }
    } else {
      message.textContent = dashainDiscoveryMessages[id];
      soundManager.play("wish");
    }
  }));

  const updateFairyQuestCount = () => {
    const count = fairyQuestProgress.flowers.size
      + fairyQuestProgress.crystals.size
      + Number(Boolean(fairyQuestProgress.mirrorBlessing))
      + Number(fairyQuestProgress.rainbowRestored)
      + Number(fairyQuestProgress.completed);
    modalRoot.querySelector("#fairy-quest-count").textContent = `Steps: ${count}/11`;
    modalRoot.querySelector("#fairy-crystal-count").textContent = `${fairyQuestProgress.crystals.size}/3 found`;
  };
  const fairyQuestMessage = modalRoot.querySelector("#fairy-quest-message");
  const fairyQuestSpell = modalRoot.querySelector("#fairy-quest-spell");
  const fairySpellNames = {
    blossom: "Blossom Magic",
    stardust: "Stardust",
    flight: "Fairy Flight",
    rainbow: "Rainbow Magic",
    heart: "Heart of Magic",
  };

  modalRoot.querySelectorAll("[data-fairy-quest-flower]").forEach((button) => button.addEventListener("click", () => {
    const flowerId = button.dataset.fairyQuestFlower;
    if (fairyQuestProgress.flowers.has(flowerId)) return;
    const spell = fairyQuestSpell.value;
    fairyQuestProgress.flowers.add(flowerId);
    saveFairyQuestProgress();
    button.disabled = true;
    button.classList.add("is-complete");
    button.textContent = `✓ ${gardenFlowers.find((flower) => flower.id === flowerId)?.name || "Magical flower"} awakened`;
    updateFairyQuestCount();
    world?.castFairySpell?.(spell);
    soundManager.play("bloom");
    fairyQuestMessage.textContent = `${fairySpellNames[spell]} awakened a fairy flower! ${fairyQuestProgress.flowers.size}/5 blossoms are glowing.`;
    if (fairyQuestProgress.flowers.size === 5) kariSpeak("All five fairy flowers are awake! The hidden crystals are waiting nearby. ✨", 4500);
  }));

  modalRoot.querySelector(".fairy-quest-panel [data-open='princess']")?.addEventListener("click", () => openModal("princess"));
  modalRoot.querySelector("#fairy-quest-rainbow")?.addEventListener("click", (event) => {
    if (fairyQuestProgress.flowers.size < 5 || fairyQuestProgress.crystals.size < 3 || !fairyQuestProgress.mirrorBlessing) return;
    fairyQuestProgress.rainbowRestored = true;
    saveFairyQuestProgress();
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "Rainbow restored ✓";
    modalRoot.querySelector("#fairy-quest-complete").disabled = false;
    updateFairyQuestCount();
    world?.setFairyRainbowRestored(true);
    world?.castFairySpell?.("rainbow");
    soundManager.play("celebrate");
    fairyQuestMessage.textContent = "The rainbow shines across the Fairy Garden! One last step remains: complete the adventure.";
    kariSpeak("The rainbow is back! Tap Complete Fairy Adventure to receive your tiara. 🌈", 5000);
  });
  modalRoot.querySelector("#fairy-quest-complete")?.addEventListener("click", (event) => {
    if (!fairyQuestProgress.rainbowRestored || fairyQuestProgress.completed) return;
    fairyQuestProgress.completed = true;
    if (!fairyQuestProgress.rewardGranted) {
      addXP(100, "Restored the Lost Fairy Kingdom");
      fairyQuestProgress.rewardGranted = true;
    }
    saveFairyQuestProgress();
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "Fairy adventure complete ✓";
    updateFairyQuestCount();
    fairyQuestMessage.textContent = "The Lost Fairy Kingdom is shining again! Your Fairy Princess Tiara is ready in the wardrobe. 👑";
    soundManager.play("fanfare");
    world?.triggerCelebration();
    updateQuestHUD();
    announce("The Lost Fairy Kingdom is restored! Fairy Princess Tiara unlocked! 🧚👑");
  });
  modalRoot.querySelector("#fairy-quest-hint")?.addEventListener("click", () => {
    const position = world?.getPrincessPosition() || { x: 0, z: 0 };
    let locationHint = "Open the Enchanted Garden quest panel to find the fairy flowers and crystals.";
    if (Math.hypot(position.x + 8, position.z - 2) < 5) {
      if (fairyQuestProgress.flowers.size < 5) locationHint = `Choose a wand spell and awaken a flower in the first row; ${5 - fairyQuestProgress.flowers.size} blossoms remain.`;
      else if (fairyQuestProgress.crystals.size < 3) {
        const remaining = (world?.getFairyCrystalsList?.() || []).filter((crystal) => !fairyQuestProgress.crystals.has(crystal.id));
        remaining.sort((a, b) => Math.hypot(a.x - position.x, a.z - position.z) - Math.hypot(b.x - position.x, b.z - position.z));
        const nextCrystal = remaining[0];
        locationHint = nextCrystal
          ? `Close the garden panel and follow the guide arrow to the ${nextCrystal.title}. Walk close and tap Discover Crystal; ${3 - fairyQuestProgress.crystals.size} remain.`
          : "Explore the Enchanted Garden and look for glowing crystals.";
      }
      else if (!fairyQuestProgress.mirrorBlessing) locationHint = "Visit the Castle's Magic Mirror and choose one of its four blessings.";
      else if (!fairyQuestProgress.rainbowRestored) locationHint = "The flowers, crystals, and mirror are ready; tap Restore the Rainbow.";
      else locationHint = "The rainbow is back! Complete the adventure to claim your Fairy Princess Tiara.";
    } else {
      locationHint = "The fairy garden is near the Enchanted Garden landmark. Open it, then use the quest panel's flowers and crystal discoveries.";
    }
    kariSpeak(`Kari: ${locationHint}`, 6500);
  });

  let selectedRescueLight = "";
  const rescuedFairies = new Set();
  const rescueMessage = modalRoot.querySelector("#rescue-message");
  modalRoot.querySelectorAll("[data-rescue-light]").forEach((button) => button.addEventListener("click", () => {
    if (rescuedFairies.has(button.dataset.rescueLight)) return;
    selectedRescueLight = button.dataset.rescueLight;
    modalRoot.querySelectorAll("[data-rescue-light]").forEach((light) => light.classList.toggle("is-selected", light === button));
    rescueMessage.textContent = `Guide the ${button.querySelector("small").textContent.toLowerCase()} fairy light to its matching flower. Matches: ${rescuedFairies.size}/5`;
  }));
  modalRoot.querySelectorAll("[data-rescue-flower]").forEach((button) => button.addEventListener("click", () => {
    const flowerId = button.dataset.rescueFlower;
    if (!selectedRescueLight || rescuedFairies.has(flowerId)) {
      if (!selectedRescueLight) rescueMessage.textContent = "Choose a fairy light first.";
      return;
    }
    if (selectedRescueLight !== flowerId) {
      rescueMessage.textContent = "Not quite—follow the matching colours and try again.";
      soundManager.play("click");
      return;
    }
    rescuedFairies.add(flowerId);
    button.disabled = true;
    button.classList.add("is-rescued");
    modalRoot.querySelector(`[data-rescue-light="${flowerId}"]`)?.classList.add("is-rescued");
    selectedRescueLight = "";
    modalRoot.querySelectorAll("[data-rescue-light]").forEach((light) => light.classList.remove("is-selected"));
    if (rescuedFairies.size === 5) {
      rescueMessage.textContent = "Every fairy light found its flower! The whole garden is blooming! 🌸";
      soundManager.play("celebrate");
      world?.triggerCelebration();
      kariSpeak("You rescued every little fairy light! The garden is glowing because of you! 🦋", 4500);
    } else {
      rescueMessage.textContent = `A fairy light found its flower! Matches: ${rescuedFairies.size}/5`;
      soundManager.play("bloom");
    }
  }));
  modalRoot.querySelector("#rescue-replay")?.addEventListener("click", () => {
    rescuedFairies.clear();
    selectedRescueLight = "";
    modalRoot.querySelectorAll("[data-rescue-light], [data-rescue-flower]").forEach((button) => {
      button.disabled = false;
      button.classList.remove("is-selected", "is-rescued");
    });
    rescueMessage.textContent = "Choose one fairy light, then its matching flower. Matches: 0/5";
  });

  // Canvas simulation setup
  const canvas = modalRoot.querySelector(".simulation-canvas");
  const context = canvas?.getContext("2d");
  if (!context) return;

  const state = {
    mode: "orb", formation: "spiral", intensity: 1, speed: 1, gravity: 0.6, paused: false,
    pointer: null, pointerDown: false, trail: [], pulses: [], flower: -1, orbitClock: 0, lastFrame: 0,
    wandShape: "heart", burst: null, dustStarted: false, dustCollected: new Set(), mixIngredients: [],
    crystalSequence: ["⭐", "🌙", "🌸"], crystalStep: 0, crystalDone: false, crystalMessage: "Follow the glowing symbols in order.",
    patternSequence: [0, 2, 1, 3, 4], patternLength: 2, patternStep: 0, patternPlaying: false,
    patternInput: false, patternFlash: -1, patternStatus: "Tap Start, watch the stars, then repeat them.",
    floatOrb: { x: 0.12, y: 0.72 }, floatDragging: false, floatStars: new Set(), floatWon: false,
    ingredients: new Set(), spellResult: "",
  };
  const controls = modalRoot.querySelector("#simulation-controls");
  let animationFrame;
  let patternTimers = [];
  let stars = Array.from({ length: 22 }, () => ({ x: Math.random(), y: Math.random(), phase: Math.random() * 8 }));

  function renderControls() {
    if (state.mode === "orb") {
      controls.innerHTML = `<label class="control-label">Particle intensity <input class="range-control" id="intensity" type="range" min="0.4" max="1.8" step="0.1" value="${state.intensity}"></label><label class="control-label">Formation <select id="formation" class="select-control"><option value="spiral">Spiral galaxy</option><option value="flower">Flower</option><option value="heart">Heart</option><option value="crown">Crown</option></select></label>`;
    } else if (state.mode === "orbit") {
      controls.innerHTML = `<label class="control-label">Orbital speed <input class="range-control" id="speed" type="range" min="0" max="2.5" step="0.1" value="${state.speed}"></label><button class="pill-button" id="pause-orbit" type="button">${state.paused ? "Resume" : "Pause"} orbit</button>`;
    } else if (state.mode === "gravity") {
      controls.innerHTML = `<label class="control-label">Gravity strength <input class="range-control" id="gravity" type="range" min="0" max="2" step="0.1" value="${state.gravity}"></label>`;
    } else if (state.mode === "wand") {
      controls.innerHTML = `<span class="small-note">Draw a spell with your finger or mouse.</span>${["heart", "star", "circle", "butterfly"].map((shape) => `<button class="pill-button ${state.wandShape === shape ? "is-active" : ""}" type="button" data-wand-shape="${shape}">${shape[0].toUpperCase()}${shape.slice(1)}</button>`).join("")}<button class="secondary-button" type="button" data-lab-reset="wand">Clear trail</button>`;
    } else if (state.mode === "dust") {
      controls.innerHTML = `<button class="button button-gold" type="button" data-dust-start>${state.dustStarted ? "Restart fairy dust hunt" : "Start fairy dust hunt"}</button><span class="badge-counter">${state.dustCollected.size}/20 fairy dust</span><span class="small-note">${state.dustCollected.size === 20 ? "Rainbow celebration complete! 🌈" : "Tap each glowing dust mote on the canvas."}</span>`;
    } else if (state.mode === "mixer") {
      controls.innerHTML = `<span class="small-note">Choose two different magical colours.</span>${[["pink", "Rose Pink"], ["blue", "Celestial Blue"], ["gold", "Golden Sunlight"]].map(([id, label]) => `<button class="pill-button ${state.mixIngredients.includes(id) ? "is-active" : ""}" type="button" data-mix-color="${id}">${label}</button>`).join("")}<button class="secondary-button" type="button" data-lab-reset="mixer">Mix again</button><span class="compliment">${state.spellResult || `${state.mixIngredients.length}/2 colours selected`}</span>`;
    } else if (state.mode === "crystal") {
      controls.innerHTML = `<span class="small-note">${state.crystalDone ? "Crystal restored! Your gentle magic brought it back to life. 💎" : `${state.crystalMessage} ${state.crystalSequence.map((symbol, index) => index < state.crystalStep ? "✓" : "✧").join(" ")}`}</span>${["⭐", "🌙", "🌸"].map((symbol) => `<button class="pill-button" type="button" data-crystal-symbol="${symbol}" aria-label="Choose ${symbol}">${symbol}</button>`).join("")}<button class="secondary-button" type="button" data-lab-reset="crystal">Play again</button>`;
    } else if (state.mode === "pattern") {
      controls.innerHTML = `<span class="small-note" aria-live="polite">${state.patternStatus}</span><button class="button button-gold" type="button" data-pattern-start>${state.patternInput ? "Repeat the stars below" : "Start star pattern"}</button><button class="secondary-button" type="button" data-lab-reset="pattern">Restart</button>`;
    } else if (state.mode === "laboratory") {
      const items = [["petals", "🌸 Marigold Petals"], ["starlight", "⭐ Starlight"], ["fairy", "🦋 Fairy Dust"], ["moon", "🌙 Moon Crystals"], ["rainbow", "🌈 Rainbow Drops"]];
      controls.innerHTML = `<span class="small-note">Choose exactly three ingredients, then cast.</span>${items.map(([id, label]) => `<button class="pill-button ${state.ingredients.has(id) ? "is-active" : ""}" type="button" data-ingredient="${id}">${label}</button>`).join("")}<button class="button button-gold" type="button" data-cast-spell ${state.ingredients.size !== 3 ? "disabled" : ""}>Cast spell</button><button class="secondary-button" type="button" data-lab-reset="laboratory">Clear</button><span class="compliment">${state.spellResult || `${state.ingredients.size}/3 ingredients`}</span>`;
    } else if (state.mode === "floating") {
      controls.innerHTML = `<span class="small-note">${state.floatWon ? "You guided the magic home! 🌟" : "Drag the glowing orb through the path and gather three stars."}</span><button class="secondary-button" type="button" data-lab-reset="floating">Restart floating magic</button>`;
    } else {
      controls.innerHTML = `<span class="small-note">${state.mode === "flowers" ? "Tap any flower on canvas to bloom." : "Drag the glowing orb through the path and gather three stars."}</span><button class="secondary-button" type="button" data-lab-reset="floating">Restart floating magic</button>${state.mode === "floating" && state.floatWon ? `<span class="compliment">You guided the magic home! 🌟</span>` : ""}`;
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
      if (state.burst && now - state.burst.time < 950) {
        const progress = (now - state.burst.time) / 950;
        const scale = 20 + progress * 28;
        context.save();
        context.translate(state.burst.x, state.burst.y);
        context.globalAlpha = 1 - progress;
        context.strokeStyle = "#f6c4df";
        context.fillStyle = "#ffe8ac";
        context.lineWidth = 3;
        if (state.burst.shape === "circle") {
          context.beginPath(); context.arc(0, 0, scale, 0, Math.PI * 2); context.stroke();
        } else if (state.burst.shape === "star") {
          context.font = `${scale * 2}px serif`; context.fillText("★", -scale, scale * .6);
        } else if (state.burst.shape === "butterfly") {
          context.font = `${scale * 2}px serif`; context.fillText("🦋", -scale, scale * .6);
        } else {
          context.font = `${scale * 2}px serif`; context.fillText("♥", -scale * .5, scale * .6);
        }
        context.restore();
      }
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
    } else if (state.mode === "gravity") {
      for (let i = 0; i < 9; i += 1) {
        const x = width * (0.11 + i * 0.1);
        const phase = t * (0.5 + state.gravity * 0.65) + i * 1.3;
        const y = height * (0.25 + ((Math.sin(phase) + 1) * 0.27));
        context.save(); context.translate(x, y); context.rotate(phase * 0.3);
        context.fillStyle = i % 2 ? "#eac68c" : "#c4a1ee";
        context.fillRect(-7, -7, 14, 14);
        context.restore();
      }
    } else if (state.mode === "dust") {
      for (let i = 0; i < 20; i += 1) {
        const x = width * (0.1 + ((i * 37) % 81) / 100);
        const y = height * (0.2 + ((i * 53) % 61) / 100);
        if (state.dustCollected.has(i)) continue;
        const pulse = 1 + Math.sin(t * 3 + i) * 1.3;
        context.fillStyle = i % 7 === 0 ? "#ffe48d" : "#f7c7ec";
        context.shadowColor = context.fillStyle; context.shadowBlur = 12;
        context.beginPath(); context.arc(x, y, 5 + pulse, 0, Math.PI * 2); context.fill();
        context.shadowBlur = 0;
        context.fillStyle = "#fff8e8";
        context.beginPath(); context.arc(x - 2, y - 2, 1.4, 0, Math.PI * 2); context.fill();
      }
      if (!state.dustStarted) {
        context.fillStyle = "#fff8ed"; context.font = "16px sans-serif"; context.textAlign = "center";
        context.fillText("Press Start, then tap each glowing mote", width / 2, height * .88);
        context.textAlign = "start";
      }
    } else if (state.mode === "mixer") {
      const colors = { pink: "#f08cbd", blue: "#78b5ec", gold: "#e8bf59" };
      const selected = state.mixIngredients;
      selected.forEach((color, index) => {
        const x = width / 2 + (index - (selected.length - 1) / 2) * Math.min(95, width * .24);
        context.fillStyle = colors[color]; context.shadowColor = colors[color]; context.shadowBlur = 26;
        context.beginPath(); context.arc(x, height * .48, 28, 0, Math.PI * 2); context.fill();
      });
      context.shadowBlur = 0;
      if (state.spellResult) {
        const mixColor = state.spellResult.includes("Purple") ? "#b78ce5" : state.spellResult.includes("Celestial") ? "#8ac9dc" : "#e7a97f";
        context.fillStyle = mixColor; context.shadowColor = mixColor; context.shadowBlur = 35;
        context.beginPath(); context.arc(width / 2, height * .73, 20 + Math.sin(t * 3) * 3, 0, Math.PI * 2); context.fill();
        context.shadowBlur = 0;
      }
    } else if (state.mode === "crystal") {
      const cx = width / 2; const cy = height / 2;
      context.fillStyle = state.crystalDone ? "#8be3df" : "#bd9be8";
      context.shadowColor = context.fillStyle; context.shadowBlur = 18 + state.crystalStep * 6;
      context.beginPath();
      context.moveTo(cx, cy - 64); context.lineTo(cx + 36, cy - 10); context.lineTo(cx + 20, cy + 52);
      context.lineTo(cx, cy + 66); context.lineTo(cx - 20, cy + 52); context.lineTo(cx - 36, cy - 10);
      context.closePath(); context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = "#fff4d3"; context.lineWidth = 3;
      for (let i = 0; i < state.crystalStep; i += 1) {
        context.beginPath(); context.moveTo(cx - 22 + i * 14, cy - 28); context.lineTo(cx + 8 - i * 4, cy + 30); context.stroke();
      }
      context.fillStyle = "#fff8ed"; context.font = "18px serif"; context.fillText(state.crystalDone ? "💎" : "✧", cx + 45, cy - 42);
    } else if (state.mode === "pattern") {
      const points = [0, 1, 2, 3, 4].map((i) => ({ x: width * (.2 + i * .15), y: height * (.48 + Math.sin(i * 1.1) * .22) }));
      if (state.patternLength >= 5 && state.patternStep === 5) {
        context.strokeStyle = "#f8c6e3"; context.lineWidth = 3; context.beginPath();
        points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
        context.closePath(); context.stroke();
      }
      points.forEach((point, index) => {
        context.fillStyle = state.patternFlash === index ? "#fff4a7" : "#dfc1f4";
        context.shadowColor = context.fillStyle; context.shadowBlur = state.patternFlash === index ? 22 : 7;
        context.beginPath(); context.arc(point.x, point.y, state.patternFlash === index ? 12 : 7, 0, Math.PI * 2); context.fill();
      });
      context.shadowBlur = 0;
    } else if (state.mode === "floating") {
      const start = { x: width * .12, y: height * .72 };
      const finish = { x: width * .9, y: height * .28 };
      context.strokeStyle = "rgba(247,222,178,.65)"; context.lineWidth = 8; context.lineCap = "round";
      context.beginPath(); context.moveTo(start.x, start.y); context.bezierCurveTo(width * .3, height * .15, width * .63, height * .85, finish.x, finish.y); context.stroke();
      [[.34,.38],[.55,.58],[.74,.4]].forEach(([x,y], index) => {
        if (state.floatStars.has(index)) return;
        context.fillStyle = "#ffe998"; context.shadowColor = "#ffe998"; context.shadowBlur = 12;
        context.beginPath(); context.arc(width*x, height*y, 8, 0, Math.PI*2); context.fill();
      });
      context.shadowBlur = 0;
      context.fillStyle = "#e8af71"; context.beginPath(); context.arc(width*state.floatOrb.x, height*state.floatOrb.y, 15, 0, Math.PI*2); context.fill();
      context.fillStyle = "#fff5d9"; context.beginPath(); context.arc(width*state.floatOrb.x, height*state.floatOrb.y, 7, 0, Math.PI*2); context.fill();
      context.fillStyle = "#b7edcf"; context.beginPath(); context.arc(finish.x, finish.y, 16, 0, Math.PI*2); context.fill();
      context.fillStyle = "#fff8ed"; context.font = "13px sans-serif"; context.fillText("START", start.x - 18, start.y + 30); context.fillText("GOAL", finish.x - 16, finish.y - 22);
    } else if (state.mode === "laboratory") {
      const effects = {
        "Festival of Light": ["#f3c46d", "✨"],
        "Celestial Rainbow": ["#9dc6ed", "🌈"],
        "Enchanted Garden Bloom": ["#e99dc5", "🌸"],
      };
      const resultName = Object.keys(effects).find((name) => state.spellResult.startsWith(name));
      const [color, glyph] = effects[resultName] || ["#d9c5ee", "🪄"];
      context.fillStyle = color; context.shadowColor = color; context.shadowBlur = state.spellResult ? 30 : 12;
      context.beginPath(); context.arc(width / 2, height * .5, 25 + (state.spellResult ? Math.sin(t * 3) * 3 : 0), 0, Math.PI * 2); context.fill();
      context.shadowBlur = 0;
      context.font = "30px serif"; context.fillText(glyph, width / 2 + 35, height * .5 + 10);
    }
    animationFrame = requestAnimationFrame(draw);
  }

  renderControls();
  animationFrame = requestAnimationFrame(draw);

  const clearPatternTimers = () => {
    patternTimers.forEach((timer) => window.clearTimeout(timer));
    patternTimers = [];
  };
  const startPatternRound = () => {
    clearPatternTimers();
    state.patternPlaying = true;
    state.patternInput = false;
    state.patternStep = 0;
    state.patternStatus = "Watch the glowing stars…";
    renderControls();
    const showStep = (step) => {
      if (step >= state.patternLength) {
        state.patternFlash = -1;
        state.patternPlaying = false;
        state.patternInput = true;
        state.patternStatus = "Your turn! Tap the stars in the same order.";
        renderControls();
        return;
      }
      state.patternFlash = state.patternSequence[step];
      patternTimers.push(window.setTimeout(() => {
        state.patternFlash = -1;
        patternTimers.push(window.setTimeout(() => showStep(step + 1), 170));
      }, 420));
    };
    showStep(0);
  };
  modalRoot.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
    clearPatternTimers();
    state.patternPlaying = false;
    state.patternInput = false;
    state.pointerDown = false;
    state.mode = button.dataset.mode;
    canvas.style.touchAction = state.mode === "wand" || state.mode === "floating" ? "none" : "pan-y";
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
    const target = event.target.closest("button");
    if (!target) return;
    if (target.id === "pause-orbit") {
      state.paused = !state.paused;
      target.textContent = state.paused ? "Resume orbit" : "Pause orbit";
      return;
    }
    if (target.dataset.wandShape) {
      state.wandShape = target.dataset.wandShape;
      renderControls();
    } else if (target.dataset.labReset) {
      const resetMode = target.dataset.labReset;
      if (resetMode === "wand") { state.trail = []; state.burst = null; }
      if (resetMode === "dust") { state.dustCollected.clear(); state.dustStarted = true; }
      if (resetMode === "mixer") { state.mixIngredients = []; state.spellResult = ""; }
      if (resetMode === "crystal") { state.crystalStep = 0; state.crystalDone = false; state.crystalMessage = "Follow the glowing symbols in order."; }
      if (resetMode === "pattern") { clearPatternTimers(); state.patternLength = 2; state.patternStep = 0; state.patternInput = false; state.patternFlash = -1; state.patternStatus = "Tap Start, watch the stars, then repeat them."; }
      if (resetMode === "floating") { state.floatOrb = { x: .12, y: .72 }; state.floatStars.clear(); state.floatWon = false; }
      if (resetMode === "laboratory") { state.ingredients.clear(); state.spellResult = ""; }
      renderControls();
    } else if (target.hasAttribute("data-dust-start")) {
      state.dustStarted = true;
      state.dustCollected.clear();
      renderControls();
    } else if (target.dataset.mixColor) {
      if (state.mixIngredients.includes(target.dataset.mixColor)) return;
      if (state.mixIngredients.length === 2) state.mixIngredients.shift();
      state.mixIngredients.push(target.dataset.mixColor);
      const combination = [...state.mixIngredients].sort().join("-");
      const results = {
        "blue-pink": "Purple Fairy Magic — Pink and blue swirl into a dreamy violet glow.",
        "blue-gold": "Celestial Glow — Blue and sunlight shimmer like a gentle dawn.",
        "gold-pink": "Rose-Gold Sparkle — Warm gold and rose make a sparkling sunset.",
      };
      state.spellResult = state.mixIngredients.length === 2 ? results[combination] || "A surprising new glow!" : "";
      renderControls();
    } else if (target.dataset.crystalSymbol) {
      if (state.crystalDone) return;
      if (target.dataset.crystalSymbol === state.crystalSequence[state.crystalStep]) {
        state.crystalStep += 1;
        state.crystalDone = state.crystalStep === state.crystalSequence.length;
        state.crystalMessage = state.crystalDone ? "Your patient magic restored the crystal!" : "Lovely! Keep going:";
        soundManager.play(state.crystalDone ? "celebrate" : "sparkle");
        if (state.crystalDone) world?.triggerCelebration();
      } else {
        state.crystalStep = 0;
        state.crystalMessage = "Not quite—try the first symbol again:";
        soundManager.play("click");
      }
      renderControls();
    } else if (target.hasAttribute("data-pattern-start")) {
      if (!state.patternPlaying) startPatternRound();
    } else if (target.dataset.ingredient) {
      if (state.ingredients.has(target.dataset.ingredient)) state.ingredients.delete(target.dataset.ingredient);
      else if (state.ingredients.size < 3) state.ingredients.add(target.dataset.ingredient);
      state.spellResult = "";
      renderControls();
    } else if (target.hasAttribute("data-cast-spell")) {
      const recipe = [...state.ingredients].sort().join("-");
      const recipes = {
        "fairy-petals-starlight": ["Festival of Light", "A glowing Dashain lantern of gentle golden magic appears. ✨"],
        "moon-rainbow-starlight": ["Celestial Rainbow", "Moon crystals and rainbow drops paint a shining path across the sky. 🌈"],
        "fairy-moon-petals": ["Enchanted Garden Bloom", "Fairy dust wakes a garden of warm marigold light. 🌸"],
      };
      const result = recipes[recipe];
      state.spellResult = result ? `${result[0]} — ${result[1]}` : "A tiny fizz! Try a different trio of ingredients.";
      soundManager.play(result ? "secret" : "click");
      if (result) world?.triggerCelebration();
      renderControls();
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    if (state.mode === "orb") state.pointer = { x, y };
    if (state.mode === "wand" && state.pointerDown) state.trail.push({ x, y, time: performance.now() });
    if (state.mode === "floating" && state.floatDragging && !state.floatWon) {
      state.floatOrb = { x: x / rect.width, y: y / rect.height };
      [[.34,.38],[.55,.58],[.74,.4]].forEach(([sx, sy], index) => {
        if (Math.hypot(state.floatOrb.x - sx, state.floatOrb.y - sy) < .07) state.floatStars.add(index);
      });
      if (state.floatOrb.x > .86 && state.floatOrb.y < .4 && state.floatStars.size === 3) {
        state.floatWon = true;
        state.floatDragging = false;
        world?.triggerCelebration();
        soundManager.play("celebrate");
        renderControls();
      }
    }
  });
  canvas.addEventListener("pointerleave", () => { state.pointer = null; });
  canvas.addEventListener("pointerdown", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left; const y = event.clientY - rect.top;
    if (state.mode === "orb") {
      state.pulses.push({ x, y, time: performance.now() });
      soundManager.play("sparkle");
    } else if (state.mode === "wand") {
      event.preventDefault();
      state.pointerDown = true;
      canvas.setPointerCapture(event.pointerId);
      state.trail.push({ x, y, time: performance.now() });
      soundManager.play("sparkle");
    } else if (state.mode === "flowers") {
      const index = Math.max(0, Math.min(4, Math.round((x / rect.width) * 5 - 0.5)));
      state.flower = index;
      soundManager.play("bloom");
    } else if (state.mode === "dust" && state.dustStarted && state.dustCollected.size < 20) {
      const hitIndex = Array.from({ length: 20 }, (_, index) => index).find((index) => {
        if (state.dustCollected.has(index)) return false;
        const dustX = rect.width * (0.1 + ((index * 37) % 81) / 100);
        const dustY = rect.height * (0.2 + ((index * 53) % 61) / 100);
        return Math.hypot(x - dustX, y - dustY) < 25;
      });
      if (hitIndex !== undefined) {
        state.dustCollected.add(hitIndex);
        soundManager.play("sparkle");
        if (state.dustCollected.size === 20) {
          state.dustStarted = false;
          world?.triggerCelebration();
          soundManager.play("celebrate");
          kariSpeak("Twenty fairy-dust sparkles! Look at that rainbow magic! 🌈", 4500);
        }
        renderControls();
      }
    } else if (state.mode === "pattern" && state.patternInput && !state.patternPlaying) {
      const points = [0, 1, 2, 3, 4].map((i) => ({ x: rect.width * (.2 + i * .15), y: rect.height * (.48 + Math.sin(i * 1.1) * .22) }));
      const selected = points.reduce((best, point, index) => Math.hypot(x - point.x, y - point.y) < Math.hypot(x - points[best].x, y - points[best].y) ? index : best, 0);
      if (Math.hypot(x - points[selected].x, y - points[selected].y) > 28) return;
      if (selected === state.patternSequence[state.patternStep]) {
        state.patternStep += 1;
        state.patternFlash = selected;
        if (state.patternStep === state.patternLength) {
          state.patternInput = false;
          state.patternLength = Math.min(state.patternLength + 1, 5);
          state.patternStatus = state.patternLength === 5 && state.patternStep === 5
            ? "Beautiful! You made a sister-heart constellation! 💗"
            : "You remembered them! Start the next, slightly longer pattern.";
          if (state.patternLength === 5 && state.patternStep === 5) {
            world?.triggerCelebration();
            soundManager.play("celebrate");
          }
          else soundManager.play("wish");
        }
      } else {
        state.patternInput = false;
        state.patternStep = 0;
        state.patternStatus = "Almost! Press Start to watch the pattern and try again.";
        soundManager.play("click");
      }
      renderControls();
    } else if (state.mode === "floating" && !state.floatWon) {
      const orbX = rect.width * state.floatOrb.x;
      const orbY = rect.height * state.floatOrb.y;
      if (Math.hypot(x - orbX, y - orbY) < 35) {
        state.floatDragging = true;
        canvas.setPointerCapture(event.pointerId);
      }
    }
  });
  canvas.addEventListener("pointerup", (event) => {
    if (state.mode === "wand" && state.pointerDown) {
      state.pointerDown = false;
      const rect = canvas.getBoundingClientRect();
      state.burst = { x: event.clientX - rect.left, y: event.clientY - rect.top, time: performance.now(), shape: state.wandShape };
    }
    state.floatDragging = false;
  });
  canvas.addEventListener("pointercancel", () => {
    state.pointerDown = false;
    state.floatDragging = false;
  });

  if (!gardenSurpriseShown && Math.random() < 0.3) {
    surpriseTimer = window.setTimeout(() => {
      const note = modalRoot.querySelector("#garden-surprise-note");
      if (!note || !modalRoot.firstElementChild) return;
      gardenSurpriseShown = true;
      sessionStorage.setItem("yunisha_garden_surprise", "true");
      note.textContent = [
        "A rainbow butterfly just fluttered past the flowers! 🦋",
        "A trail of golden fairy dust sparkles along the garden path! ✨",
        "Didi's little blessing: May your day bloom with joy and sunshine. 🌼",
      ][Math.floor(Math.random() * 3)];
    }, 7000);
  }

  modalCleanup = () => {
    cancelAnimationFrame(animationFrame);
    clearPatternTimers();
    window.clearTimeout(surpriseTimer);
  };
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
      <span class="small-note" id="gift-open-count" aria-live="polite">Opened ${openedGifts.size} of ${gifts.length} magical keepsakes.</span>
      <button class="pill-button" data-open="letter">Read Didi's Full Letter 💌</button>
    </div>
  `, "Hall of Magical Gifts");

  const panel = modalRoot.querySelector("#gift-reveal");

  modalRoot.querySelectorAll("[data-gift]").forEach((tile) => {
    tile.addEventListener("click", () => {
      const index = Number(tile.dataset.gift);
      const gift = gifts[index];
      const isNewGift = !openedGifts.has(index);
      if (isNewGift) {
        addXP(30, "Opened Royal Gift");
        unlockAchievement("first_gift");
      }
      openedGifts.add(index);
      saveSet("yunisha_opened_gifts", openedGifts);
      modalRoot.querySelector("#gift-open-count").textContent = `Opened ${openedGifts.size} of ${gifts.length} magical keepsakes.`;
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
        <div class="row gift-next-action"><button class="pill-button" type="button" id="open-another-gift">Open Another Gift 🎁</button></div>
      `;

      if (gift.title === "Memories") {
        const sisterPhotos = galleryPhotos.filter((photo) => ["sis n me dashain 1.jpeg", "sis n me dashain 2.jpeg"].includes(photo.file));
        const book = document.createElement("section");
        book.className = "gift-memory-book";
        book.setAttribute("aria-label", "A little book of sister memories");
        book.innerHTML = `
          <h4>Our Little Memory Book 💗</h4>
          <div class="gift-memory-frame">
            <img src="${sisterPhotos[0].src}" alt="${sisterPhotos[0].alt}" />
          </div>
          <p class="gift-memory-caption" aria-live="polite">${sisterPhotos[0].caption}</p>
          <div class="row centered-action">
            <button class="secondary-button" type="button" data-memory-step="-1" aria-label="Previous sister memory">← Previous</button>
            <span class="small-note gift-memory-count">1 / ${sisterPhotos.length}</span>
            <button class="secondary-button" type="button" data-memory-step="1" aria-label="Next sister memory">Next →</button>
          </div>
        `;
        panel.appendChild(book);
        let photoIndex = 0;
        let touchStartX = null;
        const memoryImage = book.querySelector("img");
        const memoryCaption = book.querySelector(".gift-memory-caption");
        const memoryCount = book.querySelector(".gift-memory-count");
        const showPhoto = (nextIndex) => {
          photoIndex = (nextIndex + sisterPhotos.length) % sisterPhotos.length;
          const photo = sisterPhotos[photoIndex];
          memoryImage.src = photo.src;
          memoryImage.alt = photo.alt;
          memoryCaption.textContent = photo.caption;
          memoryCount.textContent = `${photoIndex + 1} / ${sisterPhotos.length}`;
        };
        watchLocalImage(memoryImage, sisterPhotos[0].file);
        book.querySelectorAll("[data-memory-step]").forEach((button) => button.addEventListener("click", () => {
          showPhoto(photoIndex + Number(button.dataset.memoryStep));
          soundManager.play("click");
        }));
        book.addEventListener("touchstart", (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
        book.addEventListener("touchend", (event) => {
          if (touchStartX === null) return;
          const delta = event.changedTouches[0].clientX - touchStartX;
          touchStartX = null;
          if (Math.abs(delta) > 45) showPhoto(photoIndex + (delta < 0 ? 1 : -1));
        }, { passive: true });
      }

      if (openedGifts.size === gifts.length && isNewGift) {
        panel.querySelector(".gift-reveal").classList.add("gift-collection-complete");
        kariSpeak("You opened all ten keepsakes! Every one is wrapped with Didi's love. 💖", 5000);
        world?.triggerCelebration();
      }

      panel.querySelectorAll("[data-open]").forEach((btn) => {
        btn.addEventListener("click", () => openModal(btn.dataset.open));
      });
      panel.querySelector("#open-another-gift")?.addEventListener("click", () => {
        const nextIndex = gifts.findIndex((_, giftIndex) => !openedGifts.has(giftIndex));
        const nextTile = modalRoot.querySelector(`[data-gift="${nextIndex >= 0 ? nextIndex : (index + 1) % gifts.length}"]`);
        nextTile?.click();
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
            <button class="button button-gold" id="walk-in-3d-courtyard-hunt-btn" type="button">Walk in 3D Courtyard 🏰</button>
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

        <!-- Quest 5 3D Courtyard Status & Direct Walk Button -->
        <div class="soft-panel quest5-courtyard-card" style="margin-top:20px; padding:16px 20px; background:rgba(255, 235, 205, 0.15); border:1px solid rgba(255, 209, 102, 0.45); border-radius:14px;">
          <div class="row row-between" style="gap:14px; flex-wrap:wrap; align-items:center;">
            <div style="flex:1; min-width:240px;">
              <span class="modal-eyebrow" style="color:var(--gold-light); font-weight:700;">QUEST 5 · FESTIVAL OF LIGHT &amp; LOVE 🪔</span>
              <h4 style="margin:4px 0 6px; font-size:1.05rem;">The 5 Sacred Diyas &amp; 3 Marigold Garlands</h4>
              <p style="margin:0; font-size:0.86rem; color:#fdf3e5; line-height:1.4;">
                Light all 5 earthen Diyas and hang the 3 fragrant Marigold garlands in the 3D Courtyard!
                <br/>
                <span style="display:inline-block; margin-top:4px; font-weight:700; color:#ffeaa7;">
                  Progress: ${litDiyas.size}/5 Diyas lit &nbsp;•&nbsp; ${placedMarigolds.size}/3 Garlands hung (${litDiyas.size + placedMarigolds.size}/8)
                </span>
              </p>
            </div>
            <button class="button button-gold" id="teleport-to-3d-courtyard-btn" type="button" style="white-space:nowrap;">
              Walk in 3D Courtyard 🏰
            </button>
          </div>
        </div>

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

    // Start Hunt button — seamlessly enters 3D Dashain Courtyard
    modalRoot.querySelector("#start-treasure-hunt-btn")?.addEventListener("click", () => {
      huntStarted = true;
      soundManager.play("fanfare");
      closeModal();
      setWorldTheme("DASHAIN_WORLD");
      world?.teleportTo(0, 0.5);
      announce("Treasure Hunt started! Look for the Marigold, Jamara, and Tika! 🔍");
      kariSpeak("Look around, Princess! Find the 3 Dashain treasures, and explore the 5 sacred diyas and marigolds! ✨", 8000);
    });

    // Walk in 3D Courtyard buttons
    modalRoot.querySelector("#walk-in-3d-courtyard-hunt-btn")?.addEventListener("click", () => {
      closeModal();
      setWorldTheme("DASHAIN_WORLD");
      world?.teleportTo(0, 0.5);
      announce("Exploring 3D Dashain Courtyard! 🏰");
      kariSpeak("You're in the 3D courtyard! Walk up to each diya, garland post, and treasure, and press E! 🪔🌼", 8000);
    });

    modalRoot.querySelector("#teleport-to-3d-courtyard-btn")?.addEventListener("click", () => {
      closeModal();
      setWorldTheme("DASHAIN_WORLD");
      world?.teleportTo(0, 0.5);
      announce("Welcome to the 3D Dashain Courtyard! 🏰");
      kariSpeak("Here is our festival courtyard! Walk up to each Diya to light it with E, and look for the 3 Marigold pillars! 🪔🌼", 8000);
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
      setWorldTheme("FAIRY_WORLD");
      world?.teleportTo(0, 2.0);
      announce("Returned to Fairy Kingdom! 🏰");
      kariSpeak("Welcome back to your fairy castle, Princess Yunisha! 💖", 6000);
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
          <button type="button" class="observatory-star-node ${starConstellationConnected.has(s.id) ? "is-connected" : ""}" data-star-id="${s.id}" style="left:${s.x}%; top:${s.y}%;" aria-label="${s.label}" aria-pressed="${starConstellationConnected.has(s.id)}">
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
          ? "💖 CONSTELLATION COMPLETED: Across every star and every sky, a sister's love will always shine. Wherever you wander under the stars, my sisterly love will always light your path, Yunisha!"
          : "Begin with the Star of Kindness, then follow the heart-shaped path."}
      </p>
      <button class="pill-button moon-hint-button" type="button" id="moon-hint">Ask the moon for a puzzle hint ☾</button>
    </div>

    <div class="soft-panel row-between" style="margin-top:20px;">
      <div>
        <strong><span class="observatory-moon" id="observatory-moon" aria-hidden="true">🌙</span> The Moon Watches Over You</strong>
        <p class="small-note" style="margin:2px 0 0;">Each twinkle in the night sky is a little wish whispered for your happiness.</p>
      </div>
      <button class="pill-button" data-open="simulations">Try Orbit Simulation 🪐</button>
    </div>
    <section class="shooting-star-wishes soft-panel" aria-labelledby="shooting-star-title">
      <h3 class="section-title" id="shooting-star-title">A Shooting-Star Wish 🌠</h3>
      <p class="small-note">Choose a wish to keep in your heart.</p>
      <div class="wish-choice-row" role="group" aria-label="Choose a shooting-star wish">
        <button class="pill-button" type="button" data-star-wish="Happiness">Happiness ☀️</button>
        <button class="pill-button" type="button" data-star-wish="Courage">Courage 🦁</button>
        <button class="pill-button" type="button" data-star-wish="Imagination">Imagination 🌈</button>
        <button class="pill-button" type="button" data-star-wish="Love & Family">Love &amp; Family 💗</button>
      </div>
      <p id="star-wish-message" class="compliment" aria-live="polite">Your wish stays right here with you.</p>
    </section>
    <details class="celestial-discoveries soft-panel">
      <summary><strong>Optional Celestial Discoveries ✨</strong><small>Three little secrets are waiting among the stars.</small></summary>
      <div class="celestial-discovery-buttons">
        <button class="pill-button" type="button" data-celestial-discovery="dream_planet" aria-pressed="${celestialDiscoveries.has("dream_planet")}">Dream Planet 🪐</button>
        <button class="pill-button" type="button" data-celestial-discovery="moon_garden" aria-pressed="${celestialDiscoveries.has("moon_garden")}">Moon Garden 🌙</button>
        <button class="pill-button" type="button" data-celestial-discovery="sister_star" aria-pressed="${celestialDiscoveries.has("sister_star")}">Sister Star 💗</button>
      </div>
      <p class="compliment" id="celestial-discovery-message" aria-live="polite">Tap a celestial secret to discover its message.</p>
    </details>
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
    const moon = modalRoot.querySelector("#observatory-moon");
    if (moon) moon.style.filter = `brightness(${0.8 + starConstellationConnected.size * 0.08})`;
  };
  updateLines();

  modalRoot.querySelector("#moon-hint")?.addEventListener("click", () => {
    const nextStar = constellationStars[starConstellationConnected.size];
    msg.textContent = nextStar
      ? `The moon whispers: your next star is ${nextStar.label}. Tap it to continue the heart.`
      : "The Sister Heart is complete! Tap Reset Constellation if you would like to trace it again.";
    modalRoot.querySelector("#observatory-moon")?.classList.add("moon-twinkle");
    soundManager.play("sparkle");
  });

  const celestialMessages = {
    dream_planet: "On the Dream Planet, every kind wish grows into a bright new possibility. 🪐",
    moon_garden: "The Moon Garden blooms with silver flowers that shine brightest at bedtime. 🌙",
    sister_star: "The Sister Star reminds us that love can find its way across every sky. 💗",
  };
  modalRoot.querySelectorAll("[data-celestial-discovery]").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.celestialDiscovery;
    if (!celestialMessages[id]) return;
    const isNew = !celestialDiscoveries.has(id);
    celestialDiscoveries.add(id);
    if (isNew) saveSet("yunisha_celestial_discoveries", celestialDiscoveries);
    button.setAttribute("aria-pressed", "true");
    button.classList.toggle("is-discovered", celestialDiscoveries.has(id));
    modalRoot.querySelector("#celestial-discovery-message").textContent = celestialMessages[id];
    if (isNew) {
      soundManager.play("wish");
      world?.castFairySpell?.("stardust");
    }
  }));

  modalRoot.querySelectorAll("[data-star-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.starId);
      if (starConstellationConnected.size >= constellationStars.length) {
        msg.textContent = "The Sister Heart is shining! Tap Reset Constellation to trace it again.";
        return;
      }
      const expectedId = starConstellationConnected.size;
      if (id !== expectedId) {
        btn.classList.remove("star-selection-wrong");
        void btn.offsetWidth;
        btn.classList.add("star-selection-wrong");
        msg.textContent = `The heart path begins at ${constellationStars[expectedId].label}. Follow the stars in order.`;
        soundManager.play("click");
        return;
      }
      starConstellationConnected.add(id);
      btn.classList.add("is-connected");
      btn.setAttribute("aria-pressed", "true");
      const moon = modalRoot.querySelector("#observatory-moon");
      moon?.classList.add("moon-twinkle");
      soundManager.play("wish");
      updateLines();

      if (starConstellationConnected.size === constellationStars.length) {
        soundManager.play("secret");
        svgLines.setAttribute("stroke-dasharray", "none");
        modalRoot.querySelector(".observatory-stage")?.classList.add("constellation-complete");
        moon?.classList.add("moon-celebrate");
        msg.textContent = "💖 CONSTELLATION COMPLETED: Across every star and every sky, a sister's love will always shine. Wherever you wander under the stars, my sisterly love will always light your path, Yunisha!";
        announce("Sister Heart Constellation completed! A stellar blessing unlocked! ✨");
        const firstCompletion = !unlockedAchievements.has("star_gazer");
        unlockAchievement("star_gazer");
        unlockAchievement("starlight_princess");
        if (firstCompletion) addXP(60, "Constellation Completed");
        world?.triggerCelebration();
      } else {
        msg.textContent = `${constellationStars[id].label} is glowing! Now connect ${constellationStars[starConstellationConnected.size].label}.`;
      }
    });
  });

  modalRoot.querySelector("#reset-stars-btn")?.addEventListener("click", () => {
    starConstellationConnected.clear();
    modalRoot.querySelectorAll(".observatory-star-node").forEach((b) => b.classList.remove("is-connected"));
    modalRoot.querySelectorAll(".observatory-star-node").forEach((b) => b.setAttribute("aria-pressed", "false"));
    modalRoot.querySelector(".observatory-stage")?.classList.remove("constellation-complete");
    modalRoot.querySelector("#observatory-moon")?.classList.remove("moon-celebrate");
    modalRoot.querySelector("#observatory-moon")?.style.removeProperty("filter");
    svgLines.setAttribute("stroke-dasharray", "3 3");
    updateLines();
    msg.textContent = "Begin with the Star of Kindness, then follow the heart-shaped path.";
  });

  const wishBlessings = {
    Happiness: "May laughter and sunny little moments find you every day.",
    Courage: "May you remember how brave you are whenever a new adventure begins.",
    Imagination: "May your bright imagination keep opening doors to wonderful worlds.",
    "Love & Family": "May our family always surround you with care, hugs, and love.",
  };
  modalRoot.querySelectorAll("[data-star-wish]").forEach((button) => button.addEventListener("click", () => {
    const choice = button.dataset.starWish;
    modalRoot.querySelector("#star-wish-message").textContent = `🌠 ${wishBlessings[choice]}`;
    modalRoot.querySelector(".shooting-star-wishes")?.classList.remove("shooting-star-active");
    void modalRoot.querySelector(".shooting-star-wishes").offsetWidth;
    modalRoot.querySelector(".shooting-star-wishes")?.classList.add("shooting-star-active");
    soundManager.play("wish");
  }));

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
          <h2 class="np">मेरी प्यारी बहिनी युनिशा 💗</h2>
          <p class="reunion-dialogue-nepali" lang="ne">
            नानी युनिशा, संसारमा तिमिभन्दा प्यारो कोही छैन।<br/>
            तिमी मुस्कुराउँदा मेरो सारा संसार खुसी हुन्छ।<br/>
            जीवनका हरेक पाइलामा दिदी सधैँ तिम्रो साथमा हुनेछु।
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
        <h2 class="np">विजया दशमीको पावन आशिर्वाद</h2>
        <div class="soft-panel sacred-mantra-box">
          <p class="sacred-mantra-nepali" lang="ne">
            ॐ सर्वमङ्गल माङ्गल्ये शिवे सर्वार्थ साधिके।<br/>
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
          <div id="typed-letter" class="typed-letter" aria-live="polite"></div>
        </article>
      </div>
      <p id="letter-page-indicator" class="small-note hidden" aria-live="polite"></p>
      <div class="row letter-controls">
        <button id="open-book" class="button button-gold" type="button" aria-expanded="false">Open your book 📖</button>
        <button id="read-complete" class="secondary-button hidden" type="button">Skip opening animation</button>
        <button id="letter-previous-page" class="secondary-button hidden" type="button">← Previous Page</button>
        <button id="letter-next-page" class="button button-gold hidden" type="button">Next Page →</button>
        <button id="close-book" class="secondary-button hidden" type="button">Close the book</button>
      </div>
      <div id="letter-extra-actions" class="row centered-action hidden">
        <button id="open-memory-book" class="secondary-button" type="button">Open Our Little Memory Book 💗</button>
        <button id="open-letter-envelope" class="pill-button" type="button">Open the Golden Envelope 💌</button>
      </div>
      <section class="letter-memory-book hidden" id="letter-memory-book" aria-label="Our Little Memory Book">
        <h3>Our Little Memory Book 💗</h3>
        <figure class="letter-memory-frame">
          <img id="letter-memory-photo" alt="" />
          <figcaption id="letter-memory-caption"></figcaption>
        </figure>
        <div class="row centered-action">
          <button class="secondary-button" id="letter-memory-prev" type="button">← Previous</button>
          <span class="small-note" id="letter-memory-count"></span>
          <button class="secondary-button" id="letter-memory-next" type="button">Next →</button>
        </div>
        <button class="pill-button" type="button" data-return-letter>Back to the letter</button>
      </section>
      <section class="letter-envelope-view hidden" id="letter-envelope-view" aria-live="polite">
        <div class="letter-envelope-heart" aria-hidden="true">💗</div>
        <p>No matter how big your world becomes, you'll always have a special place in mine. 💗</p>
        <button class="pill-button" type="button" data-return-letter>Back to the letter</button>
      </section>
    </div>
  `, "A Letter for Yunisha");

  const letter = `Meri pyari sano baini, Yunisha 🥹💗\n\nHey mero sano princess! 👑💗\n\nKaha bata suru garum nai tha chaina, tara timilai yo bhanna man cha ki timi mero lagi kati special chau bhanera sayad maile kahile ramrari bhanna sakeko chaina.\n\nTimi mero baini matra haina, timi mero mutu ko ekdamai pyaro part hau. Timi hasda malai pani khusi lagcha, timi udaas huda timilai k bhayo hola bhanera sochna thalchu. Kahile kahi timilai risauchu hola, jiskauchu hola, karauchu pani hola, tara tyo sab bhanda mathi timilai maya garne mero mutu kahile change hudaina hai. 🥹❤️\n\nSano, euta kura sadhai yaad rakhnu hai—timi jasto chau, mero lagi tyastai perfect chau. Timile sabai kura ma ramro garnai parcha bhanne chaina. Mistake garchau, kahile fail hunchau, kahile runa man lagcha, kahile kei pani ramro lagdaina hola. It's okay, baby. Timi pani manche hau, ani timilai pani naramro feel garna paune right cha.\n\nKahile kei kura le man dukhyo bhane, malai bhanna hai. Kasaile timilai hurt garyo bhane pani, aayera malai bhannu. Khusi chau bhane tyo pani share garnu, dukhi chau bhane tyo pani. Timile sabai kura aafai handle garnu pardaina. Ma timro kura sunna sadhai try garnechu. Maile sabai kura bujhna nasakum hola, tara timilai bujhna chai sadhai khojnechu. 🫂💗\n\nAni mero baby, ma timilai ekdamai proud feel garchu. Timi sano-sano kura sikdai chau, grow hudai chau, aafno dreams banaudai chau. Timro future ma timile k-k garnechau hola bhanera sochda nai khusi lagcha. Ma chahanchu timi aafno life ma dherai agadi badha, ramro manche bana, aafno dreams pura gara, ani sab bhanda important—aafailai maya garna kahile nabirsinu.\n\nAruko lagi change hunu pardaina. Arule k bhancha bhanera aafno happiness sacrifice garnu pardaina. Timro opinion important cha, timro feelings important chan, ani timi pani important chau.\n\nMa timilai sadhai protect garna sakchu bhanera promise garna sakdina, tara timilai strong banna, aafno lagi bolna, ani life ma aafno bato khojna chai sadhai encourage garnechu.\n\nHami kahile jhagada garlaum, ek-arkasanga risau laum, ek-arkako kura nasunlaum pani. Tara please, mero maya lai kahile doubt nagarnu hai. Jhagada bhayo bhandai ma timi mero lagi less important hune haina. You will always be my little sister, no matter how big you grow. 🥹💗\n\nThulo bhayepachi timi aafno life ma busy hola, naya manche haru bhetaula, naya thau haru ghumaula, aafno beautiful world banaula. Ma chahanchu timi tyo sab gara, dherai khusi hau, dherai agadi badha.\n\nTara life ma kahile garo time aayo bhane, timro lagi euta didi sadhai cha bhanne kura nabirsinu hai. Timilai advice chahiyo bhane, hug chahiyo bhane, ya kei naboli basna matra man lagyo bhane pani, you can come to me.\n\nTimi mero lagi kahile burden hune chainau. Timro problems, timro feelings, timro tears—maile timilai maya garna chhoddine reason kahile hune chainan.\n\nI may not be the perfect didi, tara ma timilai mero tarikale, mero pura mutu le maya garchu. ❤️\n\nThank you mero life ma aayeko ma. Thank you malai didi banna sikaidiyeko ma. Timisanga bitayeka sano-sano moments haru pani mero lagi special chan. Sayad timilai thaha hudaina hola, tara timile gareko sano kura le pani mero face ma smile lyaidincha.\n\nMero sano princess, sadhai hasirakhnu, ramailo garnu, dherai sapana dekhnu, ani aafno heart lai kind rakhnu. Tara kind huda-hudai aafno value chai kahile nabirsinu hai.\n\nMa timro biggest fan banna chahanchu. Timro success ma timibhanda dherai khusi hune manche, timro failure ma timilai feri try gara bhanne manche, ani timi aafailai doubt garda \"Mero baini le sakchha\" bhanera believe garne manche. 🥹❤️\n\nI love you so much, Yunisha. Words le explain garna nasakne gari.\n\nAni euta kura hai, timi jati thulo bhaye pani, mero lagi chai sadhai tei pyari sano baini nai hunechau. 💗\n\nLots of love, hugs, kisses, ani unlimited maya.\n\nForever timro didi,\nwho will always be there for you. 🫂💗\n\nP.S. Kahile ma timilai dherai maya garchu bhanera doubt lagyo bhane, yo letter feri padhnu hai. Maile timilai yo sab kura sachikai man bata bhanya ho. Love you, mero sano mutu. 😭💗👑`;

  const book = modalRoot.querySelector("#letter-book");
  const page = modalRoot.querySelector("#letter-paper");
  const typed = modalRoot.querySelector("#typed-letter");
  const openButton = modalRoot.querySelector("#open-book");
  const completeButton = modalRoot.querySelector("#read-complete");
  const previousPageButton = modalRoot.querySelector("#letter-previous-page");
  const nextPageButton = modalRoot.querySelector("#letter-next-page");
  const closeButton = modalRoot.querySelector("#close-book");
  const pageIndicator = modalRoot.querySelector("#letter-page-indicator");
  const extraActions = modalRoot.querySelector("#letter-extra-actions");
  const memoryBook = modalRoot.querySelector("#letter-memory-book");
  const envelopeView = modalRoot.querySelector("#letter-envelope-view");
  const letterParagraphs = letter.split("\n\n");
  const letterPages = [
    letterParagraphs.slice(0, 3).join("\n\n"),
    letterParagraphs.slice(3, 5).join("\n\n"),
    letterParagraphs.slice(5, 7).join("\n\n"),
    letterParagraphs.slice(7, 10).join("\n\n"),
    letterParagraphs.slice(10, 13).join("\n\n"),
    letterParagraphs.slice(13, 16).join("\n\n"),
    letterParagraphs.slice(16, 19).join("\n\n"),
    letterParagraphs.slice(19).join("\n\n")
  ];

  let timer;
  let cursor = 0;
  let pageIndex = 0;
  let memoryIndex = 0;
  const sisterPhotos = galleryPhotos.filter((photo) => ["sis n me dashain 1.jpeg", "sis n me dashain 2.jpeg"].includes(photo.file));
  const letterPhoto = modalRoot.querySelector("#letter-memory-photo");
  const letterCaption = modalRoot.querySelector("#letter-memory-caption");
  const letterPhotoCount = modalRoot.querySelector("#letter-memory-count");

  const showExtraActions = () => {
    extraActions.classList.toggle("hidden", pageIndex !== letterPages.length - 1 || cursor < letterPages[pageIndex].length);
  };

  const showCompleteLetter = () => {
    window.clearInterval(timer);
    cursor = letterPages[pageIndex].length;
    typed.textContent = letterPages[pageIndex];
    completeButton.classList.add("hidden");
    showExtraActions();
  };

  const renderPage = (animate = true) => {
    window.clearInterval(timer);
    cursor = 0;
    const pageText = letterPages[pageIndex];
    typed.textContent = "";
    typed.scrollTop = 0;
    pageIndicator.textContent = `Page ${pageIndex + 1} of ${letterPages.length}`;
    pageIndicator.classList.remove("hidden");
    previousPageButton.classList.toggle("hidden", pageIndex === 0);
    nextPageButton.classList.toggle("hidden", pageIndex === letterPages.length - 1);
    extraActions.classList.add("hidden");
    completeButton.classList.toggle("hidden", !animate || reducedMotion);
    if (!animate || reducedMotion) {
      cursor = pageText.length;
      typed.textContent = pageText;
      showExtraActions();
      return;
    }
    timer = window.setInterval(() => {
      cursor = Math.min(cursor + 3, pageText.length);
      typed.textContent = pageText.slice(0, cursor);
      if (cursor >= pageText.length) {
        window.clearInterval(timer);
        completeButton.classList.add("hidden");
        showExtraActions();
      }
    }, 18);
  };

  const openBook = () => {
    soundManager.play("doorway");
    kariSpeak("Ooooh! A letter filled with love! ✨", 3500);
    book.classList.add("is-open");
    page.classList.remove("hidden");
    openButton.classList.add("hidden");
    closeButton.classList.remove("hidden");
    previousPageButton.classList.remove("hidden");
    nextPageButton.classList.remove("hidden");
    pageIndex = 0;
    renderPage(true);
  };

  const closeBook = () => {
    window.clearInterval(timer);
    cursor = 0;
    typed.textContent = "";
    typed.scrollTop = 0;
    page.classList.add("hidden");
    book.classList.remove("is-open");
    openButton.classList.remove("hidden");
    completeButton.classList.add("hidden");
    previousPageButton.classList.add("hidden");
    nextPageButton.classList.add("hidden");
    closeButton.classList.add("hidden");
    pageIndicator.classList.add("hidden");
    extraActions.classList.add("hidden");
    memoryBook.classList.add("hidden");
    envelopeView.classList.add("hidden");
  };

  openButton.addEventListener("click", openBook);
  completeButton.addEventListener("click", showCompleteLetter);
  previousPageButton.addEventListener("click", () => {
    if (pageIndex > 0) { pageIndex -= 1; renderPage(true); }
  });
  nextPageButton.addEventListener("click", () => {
    if (pageIndex < letterPages.length - 1) { pageIndex += 1; renderPage(true); }
  });
  closeButton.addEventListener("click", closeBook);
  modalRoot.querySelector("#open-memory-book").addEventListener("click", () => {
    memoryBook.classList.remove("hidden");
    book.classList.add("hidden");
    pageIndicator.classList.add("hidden");
    modalRoot.querySelector(".letter-controls").classList.add("hidden");
    extraActions.classList.add("hidden");
    memoryIndex = 0;
    const showMemory = (nextIndex) => {
      memoryIndex = (nextIndex + sisterPhotos.length) % sisterPhotos.length;
      const photo = sisterPhotos[memoryIndex];
      letterPhoto.src = photo.src;
      letterPhoto.alt = photo.alt;
      letterCaption.textContent = photo.caption;
      letterPhotoCount.textContent = `${memoryIndex + 1} / ${sisterPhotos.length}`;
      watchLocalImage(letterPhoto, photo.file);
    };
    showMemory(0);
    modalRoot.querySelector("#letter-memory-prev").onclick = () => showMemory(memoryIndex - 1);
    modalRoot.querySelector("#letter-memory-next").onclick = () => showMemory(memoryIndex + 1);
  });
  modalRoot.querySelector("#open-letter-envelope").addEventListener("click", () => {
    envelopeView.classList.remove("hidden");
    book.classList.add("hidden");
    pageIndicator.classList.add("hidden");
    modalRoot.querySelector(".letter-controls").classList.add("hidden");
    extraActions.classList.add("hidden");
    soundManager.play("secret");
  });
  modalRoot.querySelectorAll("[data-return-letter]").forEach((button) => button.addEventListener("click", () => {
    memoryBook.classList.add("hidden");
    envelopeView.classList.add("hidden");
    book.classList.remove("hidden");
    pageIndicator.classList.remove("hidden");
    modalRoot.querySelector(".letter-controls").classList.remove("hidden");
    showExtraActions();
  }));
  modalCleanup = () => window.clearInterval(timer);
}

// =========================================================================
// 10. FINAL SURPRISE & ARTIFACTS
// =========================================================================
function renderFinal() {
  modalShell(`
    <div class="final-adventure" id="final-adventure">
      <p class="modal-eyebrow">A tiny adventure just for you ✨</p>
      <h2>A Final Little Surprise</h2>
      <div class="final-gift-stage" id="final-gift-stage">
        <span class="final-gift-sparkles" aria-hidden="true">✦　✧　✦</span>
        <button class="final-golden-gift" id="final-golden-gift" type="button" aria-label="Open the mysterious golden gift">🎁</button>
        <p id="final-invitation">A mysterious golden gift is waiting. Tap it to discover its magic!</p>
      </div>
      <section class="final-spell-section hidden" id="final-spell-section" aria-labelledby="final-spell-title">
        <h3 id="final-spell-title">Choose three little spells</h3>
        <p class="small-note">Tap each spell once to wake the surprise.</p>
        <div class="final-spell-choices" role="group" aria-label="Final surprise spells">
          <button class="final-spell-card" type="button" data-final-spell="kindness"><span>🌸</span><strong>Kindness</strong></button>
          <button class="final-spell-card" type="button" data-final-spell="love"><span>💗</span><strong>Love</strong></button>
          <button class="final-spell-card" type="button" data-final-spell="dreams"><span>⭐</span><strong>Dreams</strong></button>
        </div>
        <p id="final-spell-feedback" class="compliment" aria-live="polite">Spells awakened: 0 / 3</p>
      </section>
      <section class="final-crown-reveal hidden" id="final-crown-reveal" aria-live="polite">
        <div class="final-crown" aria-hidden="true">👑</div>
        <h3>Surprise! You are the real magic of this kingdom.</h3>
        <p class="final-finale-line">Every magical kingdom needs a princess...</p>
        <p class="final-name">...and this one belongs to YOU, YUNISHA. 👑❤️</p>
        <p class="final-subtitle np">शुभ दशैं, मेरी प्यारी युनिशा!</p>
        <p class="final-message"><span class="final-signoff-intro">Lots of love,</span> <strong class="final-signoff-name">Your Didi 💗</strong></p>
        <div class="row centered-action final-actions">
          <button class="button button-gold" type="button" id="wear-final-crown">Wear My Crown 👑</button>
          <button class="secondary-button" type="button" id="stay-fairy-garden">Stay in the Fairy Garden 🦋</button>
          <button class="pill-button" type="button" id="replay-final-surprise">Replay My Surprise ✨</button>
          <button class="secondary-button" id="replay-button" type="button">Replay the experience ↺</button>
          <button class="secondary-button" id="return-kingdom" type="button">Return to the kingdom 🏰</button>
        </div>
        <p id="final-crown-feedback" class="small-note" aria-live="polite"></p>
      </section>
    </div>
  `, "Final Surprise for Yunisha");

  const spellChoices = new Set();
  const invitation = modalRoot.querySelector("#final-invitation");
  const giftButton = modalRoot.querySelector("#final-golden-gift");
  const spellSection = modalRoot.querySelector("#final-spell-section");
  const spellFeedback = modalRoot.querySelector("#final-spell-feedback");
  const crownReveal = modalRoot.querySelector("#final-crown-reveal");
  const spellEffects = {
    kindness: { message: "Kindness made the garden flowers bloom! 🌸", symbols: ["🌸", "🌼", "🌷"], effect: "celebration" },
    love: { message: "Love sent glowing hearts dancing through the garden! 💗", symbols: ["💗", "💕", "💖"], effect: "blessing" },
    dreams: { message: "Dreams lit the sky with twinkling stars! ⭐", symbols: ["⭐", "✨", "🌟"], effect: "celebration" },
  };
  giftButton.addEventListener("click", () => {
    if (!spellSection.classList.contains("hidden")) return;
    giftButton.classList.add("is-open");
    modalRoot.querySelector("#final-gift-stage").classList.add("final-gift-opened");
    invitation.textContent = "The ribbon twirls away—three spells are ready for you!";
    spellSection.classList.remove("hidden");
    soundManager.play("gift");
    kariSpeak("A golden surprise! Choose kindness, love, and dreams to reveal its secret. ✨", 5000);
  });

  modalRoot.querySelectorAll("[data-final-spell]").forEach((button) => button.addEventListener("click", () => {
    const spellName = button.dataset.finalSpell;
    if (spellChoices.has(spellName)) return;
    const spell = spellEffects[spellName];
    if (!spell) return;
    spellChoices.add(spellName);
    button.classList.add("is-cast");
    button.setAttribute("aria-pressed", "true");
    const stage = modalRoot.querySelector("#final-gift-stage");
    spell.symbols.forEach((symbol, index) => {
      const particle = document.createElement("span");
      particle.className = `final-spell-particle final-particle-${index + 1}`;
      particle.textContent = symbol;
      stage.appendChild(particle);
      window.setTimeout(() => particle.remove(), 1800);
    });
    world?.interact(spell.effect);
    soundManager.play("sparkle");
    spellFeedback.textContent = `${spell.message} Spells awakened: ${spellChoices.size} / 3`;
    if (spellChoices.size === 3) {
      crownReveal.classList.remove("hidden");
      crownReveal.classList.add("is-revealed");
      modalRoot.querySelector("#final-gift-stage").classList.add("final-crown-unlocked");
      world?.triggerCelebration();
      soundManager.play("celebrate");
      kariSpeak("All three spells are shining! The crown is yours, Princess Yunisha! 👑", 6000);
    }
  }));

  modalRoot.querySelector("#wear-final-crown").addEventListener("click", () => {
    equippedWardrobe.crown = "royal";
    saveObject("yunisha_wardrobe", equippedWardrobe);
    world?.setPrincessCrown("royal");
    modalRoot.querySelector("#final-crown-feedback").textContent = "Your Golden Sovereign Crown is now worn in the kingdom! 👑";
    soundManager.play("fanfare");
    world?.triggerCelebration();
  });
  modalRoot.querySelector("#stay-fairy-garden").addEventListener("click", () => openModal("simulations"));
  modalRoot.querySelector("#replay-final-surprise").addEventListener("click", () => renderFinal());
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

document.getElementById("home-button").addEventListener("click", () => {
  if (!kingdom.classList.contains("hidden") && isAdventureMode) {
    setAdventureMode(false);
  } else {
    goHome();
  }
});
document.querySelector(".wordmark").addEventListener("click", (event) => { event.preventDefault(); goHome(); });

const soundToggle = document.getElementById("sound-toggle");
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
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      if (!isAdventureMode) {
        setAdventureMode(true);
      }
    } else if (key === "h") {
      event.preventDefault();
      setAdventureMode(false);
    } else if (key === "m") {
      event.preventDefault();
      openModal("map");
    } else if (key === "j") {
      event.preventDefault();
      openModal("journal");
    } else if (key === "q") {
      event.preventDefault();
      openModal("quests");
    } else if (key === "c") {
      event.preventDefault();
      openModal("wardrobe");
    } else if ((key === "e" || event.key === "Enter") && activeProximityTarget) {
      event.preventDefault();
      handleProximityInteraction(activeProximityTarget);
    }
  }
});

questTrackerHud?.addEventListener("click", () => openModal("quests"));

document.getElementById("btn-explore-kingdom")?.addEventListener("click", () => {
  setAdventureMode(true);
  soundManager.play("sparkle");
});

document.getElementById("btn-return-welcome")?.addEventListener("click", () => {
  setAdventureMode(false);
  soundManager.play("click");
});

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

// =========================================================================
// TOUCH CONTROLS, VIRTUAL JOYSTICK, OBJECTIVE COMPASS & QUEST GUIDE
// =========================================================================
const DESKTOP_CONTROLS_HINT = "WASD or arrow keys to stroll · Shift to run · Space to hop · Approach landmarks or click to explore";
const MOBILE_CONTROLS_HINT = "Use the joystick to move · Tap RUN to run · Tap JUMP to hop · Tap objects to explore";

const isTouchDevice = () => (
  ('ontouchstart' in window) ||
  (navigator.maxTouchPoints > 0) ||
  window.matchMedia('(pointer: coarse)').matches
);

const exploreHintEl = document.getElementById("explore-hint");
const mobileControlsEl = document.getElementById("mobile-controls");
const joystickBaseEl = document.getElementById("joystick-base");
const joystickKnobEl = document.getElementById("joystick-knob");
const mobileInteractBtn = document.getElementById("mobile-interact-btn");
const mobileInteractLabel = document.getElementById("mobile-interact-label");
const mobileInteractIcon = document.getElementById("mobile-interact-icon");
const mobileRunBtn = document.getElementById("mobile-run-btn");
const mobileJumpBtn = document.getElementById("mobile-jump-btn");

const objectiveBeaconEl = document.getElementById("objective-beacon");
const beaconBtnEl = document.getElementById("beacon-btn");
const beaconArrowEl = document.getElementById("beacon-arrow");
const beaconLabelEl = document.getElementById("beacon-label");
const beaconDistEl = document.getElementById("beacon-dist");

const questGuidePanelEl = document.getElementById("quest-guide-panel");
const questGuideToggleEl = document.getElementById("quest-guide-toggle");
const questGuideBodyEl = document.getElementById("quest-guide-body");
const guideBadgeCountEl = document.getElementById("guide-badge-count");
const guideStarsValEl = document.getElementById("guide-stars-val");
const guideDiyasValEl = document.getElementById("guide-diyas-val");
const guideGarlandsValEl = document.getElementById("guide-garlands-val");
const guideTreasuresValEl = document.getElementById("guide-treasures-val");
const guideTaskTextEl = document.getElementById("guide-task-text");
const guideTaskHintEl = document.getElementById("guide-task-hint");
const guideAskKariBtn = document.getElementById("guide-ask-kari-btn");
const guideBeaconToggleBtn = document.getElementById("guide-beacon-toggle-btn");
const guideHelpBtn = document.getElementById("guide-help-btn");

const tutorialModalEl = document.getElementById("tutorial-modal");
const tutorialCloseBtn = document.getElementById("tutorial-close-btn");
const tutorialStartBtn = document.getElementById("tutorial-start-btn");

function updateControlsVisibility() {
  const inKingdom = !kingdom.classList.contains("hidden");
  const hasModal = Boolean(modalRoot.firstElementChild);
  const touch = isTouchDevice();
  const showAdventureHud = inKingdom && !hasModal && (!touch || isAdventureMode);

  if (!inKingdom || hasModal || !isAdventureMode) resetTouchMovement();

  if (exploreHintEl) {
    exploreHintEl.textContent = touch ? MOBILE_CONTROLS_HINT : DESKTOP_CONTROLS_HINT;
  }

  if (mobileControlsEl) {
    mobileControlsEl.classList.toggle("hidden", !(inKingdom && !hasModal && touch && isAdventureMode));
  }

  if (objectiveBeaconEl) {
    objectiveBeaconEl.classList.toggle("hidden", !showAdventureHud);
  }

  if (questGuidePanelEl) {
    questGuidePanelEl.classList.toggle("hidden", !showAdventureHud);
  }

  const btnReturnWelcome = document.getElementById("btn-return-welcome");
  if (btnReturnWelcome) {
    btnReturnWelcome.classList.toggle("hidden", !(inKingdom && !hasModal && isAdventureMode));
  }

  if (inKingdom && !hasModal) {
    updateObjectiveBeacon();
    updateQuestGuidePanel();
  }
}

function getNearestObjective() {
  const theme = activeWorldTheme;
  const princessPos = world?.getPrincessPosition() || { x: 0, z: 0 };
  const currentQuest = getActiveQuest();

  if (currentQuest.id === "fairy_kingdom" && !fairyQuestProgress.completed) {
    if (fairyQuestProgress.crystals.size < 3) {
      const hiddenCrystals = (world?.getFairyCrystalsList?.() || []).filter((crystal) => !fairyQuestProgress.crystals.has(crystal.id));
      hiddenCrystals.sort((a, b) => Math.hypot(a.x - princessPos.x, a.z - princessPos.z) - Math.hypot(b.x - princessPos.x, b.z - princessPos.z));
      if (hiddenCrystals.length) {
        const nextCrystal = hiddenCrystals[0];
        return {
          id: nextCrystal.id,
          x: nextCrystal.x,
          z: nextCrystal.z,
          title: `${nextCrystal.title} 💎`,
          hint: `${nextCrystal.title} is glowing in the garden. Walk close and tap Discover Crystal.`,
        };
      }
    }
    return {
      id: "simulations",
      x: -8,
      z: 2,
      title: "Lost Fairy Kingdom 🧚",
      hint: currentQuest.hint,
    };
  }

  // 1. If currently tracking Quest 3 (The Missing Falling Stars)
  if (currentQuest.id === "quest_3" && collectedStars.size < 3) {
    if (theme === "FAIRY_WORLD") {
      const stars = [
        { id: "star_1", x: -2.0, z: 4.0, title: "Crystal Bridge Star ⭐", hint: "Walk along the crystal bridge to catch the golden star! ⭐" },
        { id: "star_2", x: -7.5, z: 1.5, title: "Garden Entrance Star ⭐", hint: "A golden star is glowing beside the flowers at the Enchanted Garden entrance! 🌸" },
        { id: "star_3", x: 3.2, z: -2.0, title: "Castle East Lawn Star ⭐", hint: "Look on the east lawn right beside the castle walls for the falling star! ⭐" },
      ];
      const uncollected = stars.filter((s) => !collectedStars.has(s.id));
      if (uncollected.length > 0) {
        uncollected.sort((a, b) => Math.hypot(a.x - princessPos.x, a.z - princessPos.z) - Math.hypot(b.x - princessPos.x, b.z - princessPos.z));
        return { ...uncollected[0], type: "star" };
      }
    } else {
      return { id: "fairy_portal", x: 0, z: 6.0, title: "Return to Fairy Kingdom 🏰", hint: "Step through the archway to return to the Fairy Kingdom and find your falling stars! 🏰" };
    }
  }

  // 2. If currently tracking Quest 5 (Festival of Light - 5 Diyas)
  if (currentQuest.id === "quest_5" && litDiyas.size < 5) {
    if (theme === "DASHAIN_WORLD") {
      const diyas = [
        { id: "diya_1", x: -4.8, z: 1.6, title: "Sacred Diya 1 🪔", hint: "Approach the carved stone plinth on the west side of the courtyard to light Diya 1! 🪔" },
        { id: "diya_2", x: -2.4, z: 2.2, title: "Sacred Diya 2 🪔", hint: "Step up to the second stone plinth and press E to light Diya 2! 🪔" },
        { id: "diya_3", x: 0.0, z: 2.6, title: "Center Sacred Diya 3 🪔", hint: "Light the central sacred diya right in front of the courtyard steps! 🪔" },
        { id: "diya_4", x: 2.4, z: 2.2, title: "Sacred Diya 4 🪔", hint: "Approach the fourth diya on the east terrace and light it! 🪔" },
        { id: "diya_5", x: 4.8, z: 1.6, title: "Sacred Diya 5 🪔", hint: "Light the fifth sacred diya on the far east terrace of the courtyard! 🪔" },
      ];
      const unlit = diyas.filter((d) => !litDiyas.has(d.id));
      if (unlit.length > 0) {
        unlit.sort((a, b) => Math.hypot(a.x - princessPos.x, a.z - princessPos.z) - Math.hypot(b.x - princessPos.x, b.z - princessPos.z));
        return { ...unlit[0], type: "diya" };
      }
    } else {
      return { id: "dashain_portal", x: 0, z: 5.0, title: "Enter Dashain Courtyard ❁", hint: "Step into the glowing Dashain Gateway south of the castle plaza to light the sacred earthen diyas! 🪔" };
    }
  }

  // 3. If currently tracking Quest 6 (Marigold Garland Magic - 3 Pillars)
  if (currentQuest.id === "quest_6" && placedMarigolds.size < 3) {
    if (theme === "DASHAIN_WORLD") {
      const marigolds = [
        { id: "marigold_1", x: -4.0, z: -1.5, title: "West Toran Pillar 🌼", hint: "Hang a fragrant marigold garland on the carved vermilion pillar on the left! 🌼" },
        { id: "marigold_2", x: 0.0, z: -3.2, title: "North Altar Pillar 🌼", hint: "Place the holy marigold garland on the central altar mandap pillar! 🌼" },
        { id: "marigold_3", x: 4.0, z: -1.5, title: "East Toran Pillar 🌼", hint: "Hang the festive marigold garland on the carved vermilion pillar on the right! 🌼" },
      ];
      const unplaced = marigolds.filter((m) => !placedMarigolds.has(m.id));
      if (unplaced.length > 0) {
        unplaced.sort((a, b) => Math.hypot(a.x - princessPos.x, a.z - princessPos.z) - Math.hypot(b.x - princessPos.x, b.z - princessPos.z));
        return { ...unplaced[0], type: "marigold" };
      }
    } else {
      return { id: "dashain_portal", x: 0, z: 5.0, title: "Enter Dashain Courtyard ❁", hint: "Step into the glowing Dashain Gateway to hang the marigold garlands! 🌼" };
    }
  }

  // 4. If currently tracking Quest 4 (Dashain Treasures)
  if (currentQuest.id === "quest_4" && foundTreasures.size < 3) {
    if (theme === "DASHAIN_WORLD") {
      const treasures = [
        { id: "marigold", x: 5.2, z: 1.8, title: "Golden Marigold 🌼", hint: "Look near the terracotta planter on the east courtyard terrace! 🔍" },
        { id: "jamara", x: -5.2, z: 1.8, title: "Sacred Jamara 🌿", hint: "Search near the earthen pot on the west courtyard terrace for fresh Jamara! 🔍" },
        { id: "tika", x: 0.0, z: 4.2, title: "Dashain Tika Plate 🔴", hint: "Approach the carved wooden table near the courtyard entrance for the Tika Plate! 🔍" },
      ];
      const unfound = treasures.filter((t) => !foundTreasures.has(t.id));
      if (unfound.length > 0) {
        unfound.sort((a, b) => Math.hypot(a.x - princessPos.x, a.z - princessPos.z) - Math.hypot(b.x - princessPos.x, b.z - princessPos.z));
        return { ...unfound[0], type: "treasure" };
      }
    } else {
      return { id: "dashain_portal", x: 0, z: 5.0, title: "Enter Dashain Courtyard ❁", hint: "Step into the Dashain Gateway to find the sacred treasures! 🔍" };
    }
  }

  // 5. General Fallbacks based on Realm
  if (theme === "FAIRY_WORLD") {
    if (collectedStars.size < 3) {
      const stars = [
        { id: "star_1", x: -2.0, z: 4.0, title: "Crystal Bridge Star ⭐", hint: "Follow the crystal bridge towards the castle to find the golden star! ⭐" },
        { id: "star_2", x: -7.5, z: 1.5, title: "Garden Entrance Star ⭐", hint: "A golden star is glowing beside the flowers at the Enchanted Garden entrance! 🌸" },
        { id: "star_3", x: 3.2, z: -2.0, title: "Castle East Lawn Star ⭐", hint: "Look on the east lawn right beside the castle walls for the falling star! ⭐" },
      ];
      const uncollected = stars.filter((s) => !collectedStars.has(s.id));
      if (uncollected.length > 0) {
        uncollected.sort((a, b) => Math.hypot(a.x - princessPos.x, a.z - princessPos.z) - Math.hypot(b.x - princessPos.x, b.z - princessPos.z));
        return { ...uncollected[0], type: "star" };
      }
    }
    if (litDiyas.size < 5 || placedMarigolds.size < 3 || foundTreasures.size < 3) {
      return {
        id: "dashain_portal",
        x: 0,
        z: 5.0,
        title: "Dashain Gateway ❁",
        hint: "Step into the glowing Dashain Gateway south of the plaza to celebrate the festival! ❁",
      };
    }
    return {
      id: "princess",
      x: 0,
      z: -4.0,
      title: "Princess Castle 👑",
      hint: "All golden stars and festival tasks complete! Visit the royal castle or Secret Rose Room for your blessings! 💖",
    };
  } else {
    // DASHAIN_WORLD
    if (litDiyas.size < 5) {
      const diyas = [
        { id: "diya_1", x: -4.8, z: 1.6, title: "Sacred Diya 1 🪔", hint: "Light the sacred diya on the northwest carved stone plinth! 🪔" },
        { id: "diya_2", x: -2.4, z: 2.2, title: "Sacred Diya 2 🪔", hint: "Light the sacred diya on the north-central stone plinth! 🪔" },
        { id: "diya_3", x: 0.0, z: 2.6, title: "Center Sacred Diya 3 🪔", hint: "Light the central sacred diya right in front of the courtyard steps! 🪔" },
        { id: "diya_4", x: 2.4, z: 2.2, title: "Sacred Diya 4 🪔", hint: "Light the sacred diya on the east-central stone plinth! 🪔" },
        { id: "diya_5", x: 4.8, z: 1.6, title: "Sacred Diya 5 🪔", hint: "Light the sacred diya on the northeast carved stone plinth! 🪔" },
      ];
      const unlit = diyas.filter((d) => !litDiyas.has(d.id));
      if (unlit.length > 0) {
        unlit.sort((a, b) => Math.hypot(a.x - princessPos.x, a.z - princessPos.z) - Math.hypot(b.x - princessPos.x, b.z - princessPos.z));
        return { ...unlit[0], type: "diya" };
      }
    }
    if (placedMarigolds.size < 3) {
      const marigolds = [
        { id: "marigold_1", x: -4.0, z: -1.5, title: "West Toran Pillar 🌼", hint: "Hang a fragrant marigold garland on the carved vermilion pillar on the left! 🌼" },
        { id: "marigold_2", x: 0.0, z: -3.2, title: "North Altar Pillar 🌼", hint: "Place the holy marigold garland on the central altar mandap pillar! 🌼" },
        { id: "marigold_3", x: 4.0, z: -1.5, title: "East Toran Pillar 🌼", hint: "Hang the festive marigold garland on the carved vermilion pillar on the right! 🌼" },
      ];
      const unplaced = marigolds.filter((m) => !placedMarigolds.has(m.id));
      if (unplaced.length > 0) {
        unplaced.sort((a, b) => Math.hypot(a.x - princessPos.x, a.z - princessPos.z) - Math.hypot(b.x - princessPos.x, b.z - princessPos.z));
        return { ...unplaced[0], type: "marigold" };
      }
    }
    if (foundTreasures.size < 3) {
      const treasures = [
        { id: "marigold", x: 5.2, z: 1.8, title: "Golden Marigold 🌼", hint: "Look near the terracotta planter on the east courtyard terrace! 🔍" },
        { id: "jamara", x: -5.2, z: 1.8, title: "Sacred Jamara 🌿", hint: "Search near the earthen pot on the west courtyard terrace for fresh Jamara! 🔍" },
        { id: "tika", x: 0.0, z: 4.2, title: "Dashain Tika Plate 🔴", hint: "Approach the carved wooden table near the courtyard entrance for the Tika Plate! 🔍" },
      ];
      const unfound = treasures.filter((t) => !foundTreasures.has(t.id));
      if (unfound.length > 0) {
        unfound.sort((a, b) => Math.hypot(a.x - princessPos.x, a.z - princessPos.z) - Math.hypot(b.x - princessPos.x, b.z - princessPos.z));
        return { ...unfound[0], type: "treasure" };
      }
    }
    return {
      id: "fairy_portal",
      x: 0,
      z: 6.0,
      title: "Return to Fairy Kingdom 🏰",
      hint: "All Dashain courtyard tasks are complete and glowing with holy light! Return to the castle! 🌸",
    };
  }
}

function updateObjectiveBeacon() {
  if (kingdom.classList.contains("hidden") || modalRoot.firstElementChild) {
    objectiveBeaconEl?.classList.add("hidden");
    return;
  }
  const target = getNearestObjective();
  if (!target) return;

  const princessPos = world?.getPrincessPosition() || { x: 0, z: 0 };
  const dx = target.x - princessPos.x;
  const dz = target.z - princessPos.z;
  const dist = Math.hypot(dx, dz);

  const angleRad = Math.atan2(dx, -dz);
  const angleDeg = angleRad * (180 / Math.PI);

  if (beaconArrowEl) beaconArrowEl.style.transform = `rotate(${angleDeg}deg)`;
  if (beaconLabelEl) beaconLabelEl.textContent = target.title;
  if (beaconDistEl) {
    beaconDistEl.textContent = dist < 2.2 ? "Nearby! ✨" : `${Math.round(dist * 2)}m away`;
  }
  beaconBtnEl?.classList.toggle("is-near", dist < 2.5);
}

function askKariCurrentGuidance() {
  soundManager.play("sparkle");
  world?.interact("kari_greet");
  const target = getNearestObjective();
  if (target && target.hint) {
    kariSpeak(`🦋 Kari: ${target.hint}`, 7500);
  } else {
    kariSpeak("🦋 Kari: You are doing wonderful, Princess Yunisha! Explore the glowing landmarks or check your Adventure Guide!", 7000);
  }
}

function updateQuestGuidePanel() {
  if (guideStarsValEl) guideStarsValEl.textContent = `${collectedStars.size}/3`;
  if (guideDiyasValEl) guideDiyasValEl.textContent = `${litDiyas.size}/5`;
  if (guideGarlandsValEl) guideGarlandsValEl.textContent = `${placedMarigolds.size}/3`;
  if (guideTreasuresValEl) guideTreasuresValEl.textContent = `${foundTreasures.size}/3`;

  const remaining = (3 - collectedStars.size) + (5 - litDiyas.size) + (3 - placedMarigolds.size) + (3 - foundTreasures.size);
  if (guideBadgeCountEl) {
    guideBadgeCountEl.textContent = remaining > 0 ? `${remaining} Tasks` : "All Done! 👑";
  }

  const target = getNearestObjective();
  if (guideTaskTextEl && target) {
    guideTaskTextEl.textContent = target.title;
  }
  if (guideTaskHintEl && target) {
    guideTaskHintEl.textContent = `💡 ${target.hint || "Approach the object and tap to interact!"}`;
  }
}

function showTutorialModal(force = false) {
  const seen = localStorage.getItem("yunisha_tutorial_seen");
  if (!seen || force) {
    tutorialModalEl?.classList.remove("hidden");
  }
}

function hideTutorialModal() {
  tutorialModalEl?.classList.add("hidden");
  localStorage.setItem("yunisha_tutorial_seen", "true");
}

let joystickPointerId = null;
let runPointerId = null;

function resetTouchMovement() {
  joystickPointerId = null;
  runPointerId = null;
  if (joystickKnobEl) joystickKnobEl.style.transform = "translate(0, 0)";
  mobileRunBtn?.classList.remove("is-running");
  world?.setJoystick(0, 0);
  world?.setRunning(false);
}

function setupVirtualJoystick() {
  if (!joystickBaseEl || !joystickKnobEl) return;

  const handleJoystickMove = (e) => {
    if (joystickPointerId === null || e.pointerId !== joystickPointerId) return;
    const rect = joystickBaseEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const maxRadius = 40;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    joystickKnobEl.style.transform = `translate(${kx}px, ${ky}px)`;

    const nx = kx / maxRadius;
    const ny = -(ky / maxRadius);
    if (!isAdventureMode && clampedDist > 6) {
      setAdventureMode(true);
    }
    world?.setJoystick(nx, ny);
  };

  const handleJoystickUp = (e) => {
    if (joystickPointerId !== null && e.pointerId === joystickPointerId) {
      joystickPointerId = null;
      joystickKnobEl.style.transform = "translate(0, 0)";
      world?.setJoystick(0, 0);
    }
  };

  joystickBaseEl.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (joystickPointerId !== null) return;
    joystickPointerId = e.pointerId;
    joystickBaseEl.setPointerCapture?.(e.pointerId);
    handleJoystickMove(e);
  });

  window.addEventListener("pointermove", handleJoystickMove);
  window.addEventListener("pointerup", handleJoystickUp);
  window.addEventListener("pointercancel", handleJoystickUp);
  window.addEventListener("lostpointercapture", handleJoystickUp);
}

function setupMobileControls() {
  setupVirtualJoystick();

  if (mobileRunBtn) {
    const startRun = (e) => {
      e.preventDefault();
      if (runPointerId !== null) return;
      runPointerId = e.pointerId;
      if (!isAdventureMode) setAdventureMode(true);
      world?.setRunning(true);
      mobileRunBtn.classList.add("is-running");
    };
    const endRun = (e) => {
      if (runPointerId === e.pointerId) {
        e.preventDefault();
        runPointerId = null;
        world?.setRunning(false);
        mobileRunBtn.classList.remove("is-running");
      }
    };
    mobileRunBtn.addEventListener("pointerdown", startRun);
    window.addEventListener("pointerup", endRun);
    window.addEventListener("pointercancel", endRun);
    window.addEventListener("lostpointercapture", endRun);
  }

  if (mobileJumpBtn) {
    mobileJumpBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (!isAdventureMode) setAdventureMode(true);
      world?.triggerJump();
      soundManager.play("sparkle");
      if (navigator.vibrate) {
        try { navigator.vibrate(20); } catch {}
      }
    });
  }

  if (mobileInteractBtn) {
    mobileInteractBtn.addEventListener("click", () => {
      if (activeProximityTarget) {
        handleProximityInteraction(activeProximityTarget);
      }
    });
  }

  if (beaconBtnEl) {
    beaconBtnEl.addEventListener("click", () => {
      askKariCurrentGuidance();
    });
  }

  if (questGuideToggleEl) {
    questGuideToggleEl.addEventListener("click", () => {
      const isExpanded = questGuideToggleEl.getAttribute("aria-expanded") === "true";
      questGuideToggleEl.setAttribute("aria-expanded", String(!isExpanded));
      questGuideBodyEl?.classList.toggle("hidden", isExpanded);
    });
  }

  if (guideAskKariBtn) {
    guideAskKariBtn.addEventListener("click", () => {
      askKariCurrentGuidance();
    });
  }

  if (guideBeaconToggleBtn) {
    guideBeaconToggleBtn.addEventListener("click", () => {
      objectiveBeaconEl?.classList.toggle("hidden");
      askKariCurrentGuidance();
    });
  }

  if (guideHelpBtn) {
    guideHelpBtn.addEventListener("click", () => {
      showTutorialModal(true);
    });
  }

  const guideRestartBtn = document.getElementById("guide-restart-btn");
  if (guideRestartBtn) {
    guideRestartBtn.addEventListener("click", () => {
      showRestartConfirmationDialog(false);
    });
  }

  const guideNewGameBtn = document.getElementById("guide-new-game-btn");
  if (guideNewGameBtn) {
    guideNewGameBtn.addEventListener("click", () => {
      showRestartConfirmationDialog(true);
    });
  }

  const footerRestartBtn = document.getElementById("btn-footer-restart");
  if (footerRestartBtn) {
    footerRestartBtn.addEventListener("click", () => {
      showRestartConfirmationDialog();
    });
  }

  if (tutorialCloseBtn) {
    tutorialCloseBtn.addEventListener("click", () => {
      hideTutorialModal();
    });
  }

  if (tutorialStartBtn) {
    tutorialStartBtn.addEventListener("click", () => {
      hideTutorialModal();
      soundManager.play("sparkle");
    });
  }

  window.addEventListener("resize", updateControlsVisibility);
  window.addEventListener("blur", resetTouchMovement);
  window.addEventListener("pagehide", resetTouchMovement);
  window.addEventListener("orientationchange", resetTouchMovement);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetTouchMovement();
  });

  setInterval(() => {
    if (!kingdom.classList.contains("hidden") && !modalRoot.firstElementChild) {
      updateObjectiveBeacon();
    }
  }, 250);
}

function useWorldFallback(error) {
  console.warn("3D rendering is unavailable; interactive experiences remain usable.", error);
  document.getElementById("world-canvas").classList.add("hidden");
  document.getElementById("world-loading").classList.add("is-ready");
  announce("3D scenery is unavailable in this browser, but all magical experiences work perfectly!");
}

import("./world.js").then(({ createWorld }) => {
  world = createWorld(document.getElementById("world-canvas"), useWorldFallback);
  window.world = world;
  window.collectWorldStar = collectWorldStar;
  window.lightWorldDiya = lightWorldDiya;
  window.placeWorldMarigold = placeWorldMarigold;
  window.setAdventureMode = setAdventureMode;
  window.setWorldTheme = setWorldTheme;
  window.getActiveQuest = getActiveQuest;
  window.updateQuestHUD = updateQuestHUD;
  window.storyQuests = storyQuests;
  window.collectedStars = collectedStars;
  window.litDiyas = litDiyas;
  window.placedMarigolds = placedMarigolds;
  window.foundTreasures = foundTreasures;
  window.unlockedAchievements = unlockedAchievements;
  window.isFestivalCelebrated = () => festivalCelebrated;
  window.setActiveQuestId = (id) => { activeQuestId = id; updateQuestHUD(); };
  window.showRestartConfirmationDialog = showRestartConfirmationDialog;
  window.restartAdventureProgress = restartAdventureProgress;
  world.setReducedMotion(reducedMotion);
  world.setAdventureMode(isAdventureMode);
  if (activeWorldTheme !== "FAIRY_WORLD") world.setTheme(activeWorldTheme);
  if (portalEntered) world.enterPortal();

  // Restore already collected treasures & stars in 3D scene
  foundTreasures.forEach((id) => world.collectTreasure(id));
  collectedStars.forEach((id) => world.collectQuestStar(id));
  fairyQuestProgress.crystals.forEach((id) => world.collectFairyCrystal(id));
  world.setFairyRainbowRestored(fairyQuestProgress.rainbowRestored);
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
    const inKingdom = !kingdom.classList.contains("hidden");
    const noModal = !modalRoot.firstElementChild;
    if (data && inKingdom && noModal) {
      worldPrompt.classList.toggle("hidden", isTouchDevice());
      worldPromptText.textContent = `Press E or tap to explore: ${data.title}`;
      if (mobileInteractBtn && isTouchDevice() && isAdventureMode) {
        mobileInteractBtn.classList.remove("hidden");
        mobileInteractLabel.textContent = data.actionLabel || data.title;
        mobileInteractIcon.textContent = data.icon || "✨";
      } else {
        mobileInteractBtn?.classList.add("hidden");
      }
    } else {
      worldPrompt?.classList.add("hidden");
      mobileInteractBtn?.classList.add("hidden");
    }
  });

  setupMobileControls();
  updateControlsVisibility();
}).catch((error) => {
  console.error("Could not load the 3D scenery module.", error);
  useWorldFallback(error);
});
