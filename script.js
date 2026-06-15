// ==========================================
// 🎮 釣魚遊戲 - DOM 元素
// ==========================================
const game = document.getElementById("game");
const sea = document.getElementById("sea");
const input = document.getElementById("input");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const comboEl = document.getElementById("combo");
const hitSound = document.getElementById("hitSound");
const fisherman = document.getElementById("fisherman");
const rod = document.getElementById("rod");

const INVENTORY_STORAGE_KEY = 'fishinGameInventory';

// ==========================================
// 💾 本地存儲管理
// ==========================================
const StorageManager = {
  getMoney: () => parseInt(localStorage.getItem('fishinGameMoney')) || 0,
  setMoney: (amount) => localStorage.setItem('fishinGameMoney', amount),
  addMoney: (amount) => {
    const current = StorageManager.getMoney();
    StorageManager.setMoney(current + amount);
  },
  getInventory: () => {
    try {
      return JSON.parse(localStorage.getItem(INVENTORY_STORAGE_KEY)) || {};
    } catch (error) {
      return {};
    }
  },
  setInventory: (inventory) => localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory)),
  addItemToInventory: (itemId) => {
    const inventory = StorageManager.getInventory();
    if (inventory[itemId]) {
      return;
    }
    inventory[itemId] = 1;
    StorageManager.setInventory(inventory);
  }
};

// 初始化頁面金錢顯示
if (document.getElementById('startMoney')) {
  document.getElementById('startMoney').innerText = StorageManager.getMoney();
  // 監聽商店關閉時更新金錢顯示
  const updateStartMoneyDisplay = () => {
    document.getElementById('startMoney').innerText = StorageManager.getMoney();
  };
  window.addEventListener('moneyUpdated', updateStartMoneyDisplay);
}

// ==========================================
// 📊 遊戲狀態
// ==========================================
const gameState = {
  score: 0,
  money: StorageManager.getMoney(),
  timeLeft: 60,
  combo: 0,
  typed: "",
  fishCount: 0,
  isRunning: false,
  isPaused: false,
  spawnInterval: null,
  timerInterval: null,
  lastRoundId: null
};

const VOCAB_STORAGE_KEY = 'fishinGameVocabHistory';
const vocabState = {
  currentRound: null,
  history: []
};

function loadVocabularyHistory() {
  try {
    const raw = localStorage.getItem(VOCAB_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // 清理資料，確保 totalWords 是數字
    vocabState.history = parsed.map(round => ({
      ...round,
      totalWords: typeof round.totalWords === 'number' && !isNaN(round.totalWords) ? round.totalWords : Object.keys(round.words || {}).length
    }));
  } catch (error) {
    console.warn('無法讀取單字本紀錄，已重置。', error);
    vocabState.history = [];
  }
}

function saveVocabularyHistory() {
  localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(vocabState.history));
}

function createVocabularyRound() {
  vocabState.currentRound = {
    id: `round-${Date.now()}`,
    date: new Date().toLocaleString(),
    words: {},
    totalWords: 0
  };
}

function recordVocabularyWord(word) {
  if (!word) return;
  if (!vocabState.currentRound) {
    createVocabularyRound();
  }

  const count = vocabState.currentRound.words[word] || 0;
  vocabState.currentRound.words[word] = count + 1;
  vocabState.currentRound.totalWords = Object.values(vocabState.currentRound.words).reduce((sum, value) => sum + value, 0);
}

function finalizeVocabularyRound() {
  if (!vocabState.currentRound) return;

  // 確保 totalWords 是正確的數字
  vocabState.currentRound.totalWords = Object.values(vocabState.currentRound.words).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);

  const existing = vocabState.history.find(round => round.id === vocabState.currentRound.id);
  if (!existing) {
    vocabState.history.unshift(vocabState.currentRound);
  }

  vocabState.currentRound = null;
  saveVocabularyHistory();
}

// ==========================================
// 🛍️ 商店物品
// ==========================================
const shopItems = [
  // 釣竿類別
  { id: 'rod1', name: '釣金竿', category: '釣竿', price: 100, emoji: '🎣' },
  { id: 'rod2', name: '銀釣竿', category: '釣竿', price: 250, emoji: '💪' },
  { id: 'rod3', name: '香螺釣竿', category: '釣竿', price: 500, emoji: '✨' },
  
  // 人物幫手
  { id: 'char1', name: '墨眼鯨', category: '人物', price: 150, emoji: '😏' },
  { id: 'char2', name: '牛仔', category: '人物', price: 300, emoji: '😖' },
  { id: 'char3', name: '賢士人', category: '人物', price: 600, emoji: '🧠' },
  
  // 服裝
  { id: 'cloth1', name: '漂亮日本和服', category: '服裝', price: 200, emoji: '👕' },
  { id: 'cloth2', name: '神祕流沙蟲', category: '服裝', price: 350, emoji: '⚡' },
  { id: 'cloth3', name: '阡陸型人', category: '服裝', price: 700, emoji: '🤟' }
];

function getInventoryItems() {
  const inventory = StorageManager.getInventory();
  return Object.entries(inventory)
    .map(([itemId, count]) => {
      const item = shopItems.find(i => i.id === itemId);
      return item ? { ...item, count } : null;
    })
    .filter(Boolean);
}

function renderInventory() {
  const inventoryContent = document.getElementById('inventoryContent');
  const inventoryCount = document.getElementById('inventoryCount');
  const inventoryItems = getInventoryItems();

  if (!inventoryContent || !inventoryCount) return;

  inventoryContent.innerHTML = '';
  inventoryCount.innerText = `${inventoryItems.reduce((sum, item) => sum + item.count, 0)} 件`;

  if (inventoryItems.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'inventory-empty';
    emptyMessage.textContent = '目前尚未購買任何物品，快去商店挑選吧！';
    inventoryContent.appendChild(emptyMessage);
    return;
  }

  const groups = inventoryItems.reduce((grouped, item) => {
    grouped[item.category] = grouped[item.category] || [];
    grouped[item.category].push(item);
    return grouped;
  }, {});

  Object.entries(groups).forEach(([category, items]) => {
    const groupHeader = document.createElement('div');
    groupHeader.className = 'inventory-group';
    groupHeader.innerHTML = `<h4>${category}</h4><div class="inventory-item-meta">${items.length} 種物品</div>`;
    inventoryContent.appendChild(groupHeader);

    items.forEach(item => {
      const itemCard = document.createElement('div');
      itemCard.className = 'inventory-card';
      itemCard.innerHTML = `
        <h4>${item.emoji} ${item.name}</h4>
        <div class="inventory-item-meta">類別：${item.category}</div>
        <div class="inventory-item-count">數量：${item.count}</div>
      `;
      inventoryContent.appendChild(itemCard);
    });
  });
}

// ==========================================
// 🎯 難度設定
// ==========================================
const difficulties = {
  easy: {
    name: "簡單",
    initialMaxFish: 2,
    maxMaxFish: 3,
    increaseTime: 60,
    minLen: 2,
    maxLen: 5,
    baseSpeed: 1.5,
    baseSpawnRate: 3000
  },
  normal: {
    name: "中等",
    initialMaxFish: 3,
    maxMaxFish: 4,
    increaseTime: 60,
    minLen: 5,
    maxLen: 8,
    baseSpeed: 2.5,
    baseSpawnRate: 2000
  },
  hard: {
    name: "困難",
    initialMaxFish: 4,
    maxMaxFish: 5,
    increaseTime: 60,
    minLen: 8,
    maxLen: 12,
    baseSpeed: 3.5,
    baseSpawnRate: 1500
  }
};

let currentDifficulty = difficulties.easy;
let difficulty = {
  speed: 1.5,
  spawnRate: 3000,
  minLen: 2,
  maxLen: 5
};

// ==========================================
// 🎨 遊戲配置
// ==========================================
const CONFIG = {
  MAX_FISH: 3,
  BASE_FISH_SIZE: 80,
  SIZE_PER_LETTER: 10,
  MAX_FISH_SIZE: 200,
  UPDATE_INTERVAL: 20,
  SPAWN_HEIGHT_RATIO: 0.7,
  SCORE_POINTS: 10,
  DIFFICULTY_INCREASE: 50,
  SPEED_INCREMENT: 0.5,
  MIN_SPAWN_RATE: 800,
  SPAWN_RATE_DECREMENT: 100
};

// 🐟 魚的圖片列表
const fishImages = [
  "魚.png",
  "菜市場魚.png",
  "蒼龍.png",
  "銀龍魚.png"
];

// ==========================================
// 🛠️ 工具函數
// ==========================================

/**
 * 隨機選擇魚的圖片
 */
function randomFish() {
  return fishImages[Math.floor(Math.random() * fishImages.length)];
}

/**
 * 根據單詞長度計算魚的大小
 */
function calculateFishSize(wordLength) {
  let size = CONFIG.BASE_FISH_SIZE + wordLength * CONFIG.SIZE_PER_LETTER;
  return Math.min(size, CONFIG.MAX_FISH_SIZE);
}

const JS_WORDS = [
  'array', 'object', 'string', 'number', 'boolean', 'null', 'undefined', 'symbol',
  'function', 'callback', 'promise', 'async', 'await', 'module', 'import', 'export',
  'class', 'constructor', 'prototype', 'closure', 'scope', 'hoisting', 'event',
  'listener', 'document', 'window', 'console', 'debugger', 'browser', 'package',
  'npm', 'node', 'browserify', 'webpack', 'babel', 'transpile', 'syntax', 'operator',
  'variable', 'constant', 'let', 'const', 'default', 'template', 'literal', 'spread',
  'destructuring', 'promise', 'fetch', 'json', 'parse', 'stringify', 'callback',
  'iterator', 'generator', 'map', 'filter', 'reduce', 'forEach', 'index', 'length',
  'prototype', 'property', 'method', 'apply', 'bind', 'call', 'arrow', 'expression',
  'statement', 'boolean', 'true', 'false', 'event', 'listener', 'async', 'await',
  'response', 'request', 'timeout', 'interval', 'promise', 'resolve', 'reject',
  'exception', 'error', 'try', 'catch', 'finally', 'throw', 'class', 'extends',
  'super', 'constructor', 'this', 'instance', 'module', 'export', 'default', 'require',
  'package', 'dependency', 'library', 'framework', 'react', 'vue', 'angular', 'svelte',
  'typescript', 'javascript', 'html', 'css', 'dom', 'nodejs', 'runtime', 'server', 'client'
];

const JS_DEFINITIONS = {
  array: 'JavaScript 中的陣列，用於儲存多個值的有序集合。',
  object: 'JavaScript 中的物件，是鍵值對的集合，用來描述實體的屬性與方法。',
  string: '表示文字字串的資料型別，例如 "hello"。',
  number: '表示數值的資料型別，可包含整數與小數。',
  boolean: '布林值，只有 true 或 false 兩種狀態。',
  null: '表示「沒有值」的特殊資料型別。',
  undefined: '表示變數已宣告但尚未指派值。',
  symbol: 'ES6 提供的唯一且不可變的原始資料型別。',
  function: '封裝可重複使用的程式碼區塊，可接受參數並回傳結果。',
  callback: '作為參數傳入函式的函式，在完成某項任務後呼叫。',
  promise: '表示非同步操作最終完成或失敗的代理物件。',
  async: '用於聲明非同步函式，允許在內部使用 await。',
  await: '用於等待 Promise 完成，必須在 async 函式內使用。',
  module: '可重用程式碼的單位，常搭配 import/export 使用。',
  import: '從外部模組匯入函式、物件或變數。',
  export: '將函式、物件、變數從模組匯出供外部使用。',
  class: 'ES6 語法，用於定義可建立實例的物件藍圖。',
  constructor: '類別的建構子函式，用於初始化新建立的實例。',
  prototype: 'JavaScript 中物件共用方法與屬性的原型機制。',
  closure: '函式與其詞法環境的組合，可保留外層變數。',
  scope: '變數可見與存取的範圍，分為全域與區域。',
  hoisting: '宣告提升，變數與函式宣告會先於執行階段處理。',
  event: '使用者或瀏覽器觸發的動作，例如點擊或加載。',
  listener: '監聽器，負責回應特定事件。',
  document: 'DOM 中的根物件，代表網頁文件。',
  window: '瀏覽器中的全域物件，代表視窗或分頁。',
  console: '瀏覽器內建物件，用於輸出除錯訊息。',
  debugger: 'JavaScript 關鍵字，用於中斷執行並啟用調試。',
  browser: '用來執行前端程式碼的網頁瀏覽器。',
  package: '可重複使用的程式碼單元，通常透過 npm 安裝。',
  npm: 'Node.js 的套件管理工具。',
  node: 'Node.js 的執行環境，可在伺服器端執行 JavaScript。',
  browserify: '把 Node 模組打包成瀏覽器可用的程式。',
  webpack: '打包工具，可將多個資源打包成瀏覽器可載入檔案。',
  babel: 'JavaScript 轉譯器，可將新語法轉換為舊版語法。',
  transpile: '將程式碼從一種語言或語法版本轉換為另一種。',
  syntax: '程式語言的語法規則。',
  operator: '用於執行運算的符號或關鍵字。',
  variable: '用來儲存資料的命名位置。',
  constant: '不可變的變數，使用 const 宣告。',
  let: 'ES6 宣告區域變數的方式。',
  const: 'ES6 宣告常數的方式，值不能重新指派。',
  default: '預設輸出或參數值。',
  template: '模板字串，用反引號包住，可包含插值。',
  literal: '字面值表示法，例如字串、數字、陣列等。',
  spread: '展開運算子，用於展開陣列或物件。',
  destructuring: '解構賦值，可從陣列或物件取值。',
  map: '陣列方法，對每個元素執行函式並回傳新陣列。',
  filter: '陣列方法，過濾符合條件的元素並回傳新陣列。',
  reduce: '陣列方法，累加元素並回傳單一值。',
  forEach: '陣列方法，對每個元素執行函式。',
  index: '索引，用於表示元素在陣列中的位置。',
  length: '表示字串或陣列的長度。',
  property: '物件的屬性名稱和值。',
  method: '物件所擁有的函式。',
  apply: '呼叫函式並傳入參數陣列。',
  bind: '建立一個具有固定 this 值的新函式。',
  call: '呼叫函式並傳入參數。',
  arrow: '箭頭函式語法，用 => 定義函式。',
  expression: '會求值並產生結果的語法片段。',
  statement: '執行操作的語句。',
  true: '布林值，表示真。',
  false: '布林值，表示假。',
  response: 'HTTP 回應物件，通常由 fetch 取得。',
  request: 'HTTP 請求物件，向伺服器請求資源。',
  timeout: '設定延遲或時間限制。',
  interval: '重複執行的時間間隔。',
  resolve: 'Promise 成功時的回呼。',
  reject: 'Promise 失敗時的回呼。',
  exception: '執行期間發生的異常狀況。',
  error: '表示程式執行失敗的錯誤。',
  try: '搭配 catch 使用，處理例外。',
  catch: '捕捉例外並執行處理。',
  finally: '不論是否發生例外都會執行的區塊。',
  throw: '拋出例外。',
  extends: '類別繼承另一個類別。',
  super: '在子類別中呼叫父類別的建構子或方法。',
  this: '指向當前執行上下文的物件。',
  instance: '類別建立後的實例物件。',
  export: '對外匯出模組內容。',
  require: 'Node.js 中載入模組的方式。',
  dependency: '程式碼所仰賴的外部套件或模組。',
  library: '可重用的程式碼集合。',
  framework: '提供開發架構與規則的程式庫。',
  react: '由 Facebook 開發的前端 UI 函式庫。',
  vue: '漸進式前端框架，易於上手。',
  angular: 'Google 開發的前端應用框架。',
  svelte: '編譯時框架，可生成高效執行碼。',
  typescript: 'JavaScript 的超集，新增型別註記。',
  javascript: '一種廣泛使用的網頁與伺服器端程式語言。',
  html: '標記語言，用於構建網頁內容。',
  css: '樣式表語言，用於描述網頁外觀。',
  dom: '文件物件模型，用於操作 HTML 結構。',
  nodejs: '基於 Chrome V8 的 JavaScript 執行環境。',
  runtime: '程式執行期間的環境。',
  server: '伺服器端，用於提供資料與服務。',
  client: '客戶端，通常指瀏覽器端。'
};

function getRandomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getJSWord(minLen, maxLen) {
  const filtered = JS_WORDS.filter(word => word.length >= minLen && word.length <= maxLen);
  if (filtered.length > 0) {
    return getRandomFromArray(filtered);
  }
  return getRandomFromArray(JS_WORDS);
}

/**
 * 更新 UI 顯示
 */
function updateUI() {
  scoreEl.innerText = gameState.score;
  timeEl.innerText = gameState.timeLeft;
  comboEl.innerText = gameState.combo;
  input.innerText = gameState.typed;
}

function renderVocabularyModal(selectedRoundId = null) {
  loadVocabularyHistory();

  const vocabModal = document.getElementById('vocabModal');
  const vocabEmpty = document.getElementById('vocabEmpty');
  const vocabContent = document.getElementById('vocabContent');
  const vocabHistoryList = document.getElementById('vocabHistoryList');
  const vocabRoundTitle = document.getElementById('vocabRoundTitle');
  const vocabRoundMeta = document.getElementById('vocabRoundMeta');
  const vocabTableBody = document.getElementById('vocabTableBody');

  vocabHistoryList.innerHTML = '';
  vocabTableBody.innerHTML = '';

  if (vocabState.history.length === 0) {
    vocabEmpty.style.display = 'block';
    vocabContent.style.display = 'none';
    return;
  }

  vocabEmpty.style.display = 'none';
  vocabContent.style.display = 'block';

  let selectedRound = null;
  if (selectedRoundId) {
    selectedRound = vocabState.history.find(round => round.id === selectedRoundId);
  }
  if (!selectedRound) {
    selectedRound = vocabState.history[0];
  }

  vocabState.history.forEach(round => {
    const roundButton = document.createElement('button');
    roundButton.type = 'button';
    roundButton.className = 'history-round-btn';
    roundButton.textContent = `${round.date} (${round.totalWords}字)`;
    roundButton.onclick = () => renderVocabularyModal(round.id);
    if (round.id === selectedRound.id) {
      roundButton.classList.add('active');
    }
    vocabHistoryList.appendChild(roundButton);
  });

  vocabRoundTitle.innerText = `單字紀錄 - ${selectedRound.date}`;
  vocabRoundMeta.innerText = `總共 ${selectedRound.totalWords} 個單字，${Object.keys(selectedRound.words).length} 種`;

  const sortedWords = Object.entries(selectedRound.words)
    .sort((a, b) => b[1] - a[1]);

  sortedWords.forEach(([word, count]) => {
    const explanation = JS_DEFINITIONS[word] || '這是一個 JavaScript 相關術語。';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${word}</td>
      <td>${count}</td>
      <td>${explanation}</td>
    `;
    vocabTableBody.appendChild(row);
  });
}

function openVocabularyBook(roundId = null) {
  renderVocabularyModal(roundId);
  const vocabModal = document.getElementById('vocabModal');
  vocabModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeVocabularyBook() {
  const vocabModal = document.getElementById('vocabModal');
  vocabModal.style.display = 'none';
  document.body.style.overflow = '';
}

function openInventory() {
  renderInventory();
  const inventoryModal = document.getElementById('inventoryModal');
  if (inventoryModal) {
    inventoryModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeInventory() {
  const inventoryModal = document.getElementById('inventoryModal');
  if (inventoryModal) {
    inventoryModal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function clearVocabularyHistory() {
  if (!confirm('確定要清空所有單字本紀錄嗎？')) return;
  vocabState.history = [];
  vocabState.currentRound = null;
  localStorage.removeItem(VOCAB_STORAGE_KEY);
  renderVocabularyModal();
}

/**
 * 遊戲結束處理
 */
function endGame() {
  clearInterval(gameState.spawnInterval);
  clearInterval(gameState.timerInterval);
  gameState.isRunning = false;
  gameState.isPaused = false;

  // 清除所有仍在背景裡的魚
  document.querySelectorAll('.fish').forEach(fish => {
    if (fish.moveInterval) {
      clearInterval(fish.moveInterval);
      fish.moveInterval = null;
    }
    fish.remove();
  });
  gameState.fishCount = 0;
  
  finalizeVocabularyRound();
  gameState.lastRoundId = vocabState.history[0]?.id || null;
  
  StorageManager.setMoney(gameState.money);
  
  const gameOverModal = document.getElementById('gameOverModal');
  document.getElementById('finalScore').innerText = gameState.score;
  document.getElementById('finalMoney').innerText = gameState.money;
  const wordCount = vocabState.history[0]?.totalWords;
  document.getElementById('finalWordCount').innerText = (typeof wordCount === 'number' && !isNaN(wordCount)) ? wordCount : 0;
  gameOverModal.style.display = 'flex';
}

/**
 * 判斷遊戲是否結束
 */
function checkGameOver() {
  if (gameState.timeLeft <= 0) {
    endGame();
  }
}

function restartGame() {
  const gameOverModal = document.getElementById('gameOverModal');
  if (gameOverModal) {
    gameOverModal.style.display = 'none';
  }

  const vocabModal = document.getElementById('vocabModal');
  if (vocabModal) {
    vocabModal.style.display = 'none';
  }

  const pauseModal = document.getElementById('pauseModal');
  if (pauseModal) {
    pauseModal.style.display = 'none';
  }

  // 清除所有尚在畫面上的魚與計時器
  document.querySelectorAll('.fish').forEach(fish => fish.remove());
  clearInterval(gameState.spawnInterval);
  clearInterval(gameState.timerInterval);

  gameState.isRunning = false;
  gameState.fishCount = 0;
  gameState.typed = '';
  gameState.combo = 0;
  gameState.timeLeft = 60;
  gameState.score = 0;
  gameState.isPaused = false;

  // 顯示首頁
  const gameSection = document.getElementById('game');
  if (gameSection) {
    gameSection.style.display = 'none';
  }

  const startScreen = document.getElementById('startScreen');
  if (startScreen) {
    startScreen.style.display = 'flex';
  }

  document.body.style.backgroundImage = `url('主頁.png')`;
  document.body.style.overflow = '';

  const startMoney = document.getElementById('startMoney');
  if (startMoney) {
    startMoney.innerText = StorageManager.getMoney();
  }

  renderInventory();
  updateUI();
}

function pauseGame() {
  if (!gameState.isRunning || gameState.isPaused) return;

  gameState.isPaused = true;

  // 停止所有魚的移動
  document.querySelectorAll('.fish').forEach(fish => {
    if (fish.moveInterval) {
      clearInterval(fish.moveInterval);
      fish.moveInterval = null;
    }
  });

  // 停止生成魚與計時器
  clearInterval(gameState.spawnInterval);
  gameState.spawnInterval = null;
  clearInterval(gameState.timerInterval);

  // 顯示暫停模態
  const pauseModal = document.getElementById('pauseModal');
  if (pauseModal) {
    pauseModal.style.display = 'flex';
  }

  // 隱藏暫停按鈕
  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) {
    pauseBtn.style.display = 'none';
  }
}

function resumeGame() {
  if (!gameState.isRunning || !gameState.isPaused) return;

  gameState.isPaused = false;

  // 隱藏暫停模態
  const pauseModal = document.getElementById('pauseModal');
  if (pauseModal) {
    pauseModal.style.display = 'none';
  }

  // 顯示暫停按鈕
  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) {
    pauseBtn.style.display = 'block';
  }

  // 恢復所有魚的移動
  document.querySelectorAll('.fish').forEach(fish => {
    if (!fish.moveInterval) {
      const size = parseFloat(fish.style.width) || 80;
      const seaHeight = Math.max(0, sea.clientHeight - size);

      fish.currentX = parseFloat(fish.style.left) || 0;
      fish.baseY = typeof fish.baseY === 'number' ? fish.baseY : Math.min(Math.max(8, parseFloat(fish.style.top) || 0), seaHeight - 8);
      fish.phase = typeof fish.phase === 'number' ? fish.phase : Math.random() * Math.PI * 2;
      fish.oscillationAmplitude = typeof fish.oscillationAmplitude === 'number' ? fish.oscillationAmplitude : Math.max(8, size * 0.12);
      fish.oscillationSpeed = typeof fish.oscillationSpeed === 'number' ? fish.oscillationSpeed : 0.03 + Math.random() * 0.02;
      fish.speedX = typeof fish.speedX === 'number' ? fish.speedX : difficulty.speed * (0.6 + Math.random() * 0.4);
      fish.currentY = fish.baseY + Math.sin(fish.phase) * fish.oscillationAmplitude;

      const moveInterval = setInterval(() => {
        if (!document.body.contains(fish)) {
          clearInterval(moveInterval);
          return;
        }

        fish.currentX += fish.speedX;
        fish.phase += fish.oscillationSpeed;
        fish.currentY = fish.baseY + Math.sin(fish.phase) * fish.oscillationAmplitude;

        fish.style.left = fish.currentX + "px";
        fish.style.top = fish.currentY + "px";

        if (fish.currentX > sea.clientWidth + size) {
          clearInterval(moveInterval);
          fish.remove();
          gameState.fishCount--;
          gameState.combo = 0;
          updateUI();
        }
      }, CONFIG.UPDATE_INTERVAL);
      fish.moveInterval = moveInterval;
    }
  });

  // 恢復生成魚
  if (!gameState.spawnInterval) {
    gameState.spawnInterval = setInterval(spawnFish, difficulty.spawnRate);
  }

  // 恢復計時器
  gameState.timerInterval = setInterval(() => {
    gameState.timeLeft -= 1;

    if (gameState.timeLeft === 60 - currentDifficulty.increaseTime && CONFIG.MAX_FISH < currentDifficulty.maxMaxFish) {
      CONFIG.MAX_FISH = currentDifficulty.maxMaxFish;
      console.log(`🔥 難度升級！同時最大魚數提升至 ${CONFIG.MAX_FISH}`);
    }

    updateUI();
    if (gameState.timeLeft <= 0) {
      checkGameOver();
    }
  }, 1000);
}

// ==========================================
// 📡 API 函數
// ==========================================

/**
 * 從 API 獲取隨機單詞，並根據難度篩選
 */
async function getWord() {
  const minLen = difficulty.minLen;
  const maxLen = difficulty.maxLen;
  return getJSWord(minLen, maxLen);
}

// ==========================================
// 🐟 遊戲物件生成
// ==========================================

/**
 * 生成一條魚並添加到遊戲中
 */
async function spawnFish() {
  // 如果遊戲暫停，不生成新魚
  if (gameState.isPaused) {
    return;
  }

  // 檢查是否已達到最大魚數
  if (gameState.fishCount >= CONFIG.MAX_FISH) {
    return;
  }

  gameState.fishCount++;

  // 建立魚元素
  const fish = document.createElement("div");
  fish.className = "fish";

  const word = await getWord();
  fish.innerText = word;
  fish.dataset.word = word;
  fish.style.backgroundImage = `url(${randomFish()})`;

  // 計算魚的大小
  const size = calculateFishSize(word.length);
  fish.style.width = size + "px";
  fish.style.height = (size * 0.5) + "px";

  // 初始位置和速度
  const seaHeight = Math.max(0, sea.clientHeight - size);
  let x = -size;
  let amplitude = Math.max(8, size * 0.12);
  let baseY = Math.min(Math.max(amplitude, Math.random() * (seaHeight - amplitude)), seaHeight - amplitude);
  let speedX = difficulty.speed * (0.6 + Math.random() * 0.4); // 速度隨機 0.6~1.0 倍
  let oscillationSpeed = 0.03 + Math.random() * 0.02;
  let phase = Math.random() * Math.PI * 2;

  fish.currentX = x;
  fish.baseY = baseY;
  fish.phase = phase;
  fish.oscillationAmplitude = amplitude;
  fish.oscillationSpeed = oscillationSpeed;
  fish.speedX = speedX;
  fish.currentY = baseY + Math.sin(phase) * amplitude;

  fish.style.left = fish.currentX + "px";
  fish.style.top = fish.currentY + "px";

  sea.appendChild(fish);

  // 魚的移動邏輯
  const moveInterval = setInterval(() => {
    // 防止幽靈魚繼續計時
    if (!document.body.contains(fish)) {
      clearInterval(moveInterval);
      return;
    }

    fish.currentX += fish.speedX;
    fish.phase += fish.oscillationSpeed;
    fish.currentY = fish.baseY + Math.sin(fish.phase) * fish.oscillationAmplitude;

    fish.style.left = fish.currentX + "px";
    fish.style.top = fish.currentY + "px";

    // 檢查魚是否完全離開畫面
    if (fish.currentX > sea.clientWidth + size) {
      clearInterval(moveInterval);
      fish.remove();
      gameState.fishCount--;

      gameState.combo = 0;
      updateUI();
    }
  }, CONFIG.UPDATE_INTERVAL);

  // 保存 interval 供其他函數使用
  fish.moveInterval = moveInterval;
}

// ==========================================
// ⌨️ 事件監聽
// ==========================================

/**
 * 處理鍵盤輸入
 */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (gameState.isRunning) {
      if (gameState.isPaused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }
    return;
  }

  // 如果遊戲暫停，不處理輸入
  if (gameState.isPaused) return;

  // 處理退格鍵
  if (e.key === "Backspace") {
    gameState.typed = gameState.typed.slice(0, -1);
  } else if (e.key.length === 1) {
    gameState.typed += e.key;
  }

  updateUI();

  // 檢查是否有魚被擊中
  const caughtFishes = [];

  document.querySelectorAll(".fish").forEach(fish => {
    if (gameState.typed === fish.dataset.word) {
      caughtFishes.push(fish);
    }
  });

  // 成功擊中魚
  if (caughtFishes.length > 0) {
    gameState.typed = "";
    const pointsEarned = CONFIG.SCORE_POINTS * caughtFishes.length;
    gameState.score += pointsEarned;
    gameState.money += pointsEarned;  // 分數 = 金錢
    gameState.combo++;

    caughtFishes.forEach(fish => {
      recordVocabularyWord(fish.dataset.word);
      catchFish(fish);
    });
    fishingAction();

    updateUI();
    hitSound.play();

    // 自動提升難度
    increaseDifficulty();
  }
});

/**
 * 將魚拉向魚夫
 */
function catchFish(fish) {
  if (!fish) return;
  clearInterval(fish.moveInterval);

  const fishRect = fish.getBoundingClientRect();
  const fishermanRect = fisherman.getBoundingClientRect();
  const rodRect = rod.getBoundingClientRect();

  const tipX = rodRect.left + rodRect.width * 0.15;
  const tipY = rodRect.top + rodRect.height * 0.12;
  const fishCenterX = fishRect.left + fishRect.width / 2;
  const fishCenterY = fishRect.top + fishRect.height / 2;
  const dx = fishCenterX - tipX;
  const dy = fishCenterY - tipY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  const line = document.createElement("div");
  line.className = "catch-line";
  line.style.left = `${tipX}px`;
  line.style.top = `${tipY}px`;
  line.style.transform = `rotate(${angle}deg)`;
  line.style.width = `0px`;
  game.appendChild(line);

  requestAnimationFrame(() => {
    line.style.width = `${length}px`;
  });

  const targetX = tipX + 25;
  const targetY = tipY + 40;
  const offsetX = targetX - (fishRect.left + fishRect.width / 2);
  const offsetY = targetY - (fishRect.top + fishRect.height / 2);

  fish.style.transition = "transform 1.2s ease-in";
  fish.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  fish.style.opacity = "1";
  fish.style.zIndex = "20";

  let animFrame;
  const updateLine = () => {
    const currentFishRect = fish.getBoundingClientRect();
    const currentCenterX = currentFishRect.left + currentFishRect.width / 2;
    const currentCenterY = currentFishRect.top + currentFishRect.height / 2;
    const dx2 = currentCenterX - tipX;
    const dy2 = currentCenterY - tipY;
    const len2 = Math.max(0, Math.sqrt(dx2 * dx2 + dy2 * dy2));
    const ang2 = Math.atan2(dy2, dx2) * 180 / Math.PI;
    line.style.transform = `rotate(${ang2}deg)`;
    line.style.width = `${len2}px`;
    if (fish.parentElement) {
      animFrame = requestAnimationFrame(updateLine);
    }
  };
  animFrame = requestAnimationFrame(updateLine);

  setTimeout(() => {
    // 隨機決定消失時間 (2-4秒之間)
    const disappearTime = 2000 + Math.random() * 2000; // 2000-4000ms

    // 魚和線同時開始消失動畫，且同時完全消失
    fish.style.transition = `opacity ${disappearTime}ms ease-in`;
    fish.style.opacity = "0";
    line.style.transition = `opacity ${disappearTime}ms ease-in, width ${disappearTime}ms ease-in`;
    line.style.width = "0px";
    line.style.opacity = "0";
    cancelAnimationFrame(animFrame);
    
    // 同時移除線和魚
    setTimeout(() => {
      line.remove();
      fish.remove();
      gameState.fishCount--;
      updateUI();
    }, disappearTime);
  }, 1200);
}

/**
 * 讓魚夫旋轉
 */
function fishingAction() {
  if (!fisherman) return;
  fisherman.classList.remove("spin");
  void fisherman.offsetWidth;
  fisherman.classList.add("spin");
  fisherman.addEventListener("animationend", () => {
    fisherman.classList.remove("spin");
  }, { once: true });
}

/**
 * 隨著分數提升難度
 */
function increaseDifficulty() {
  if (gameState.score % CONFIG.DIFFICULTY_INCREASE === 0) {
    difficulty.speed += CONFIG.SPEED_INCREMENT;
    
    if (difficulty.spawnRate > CONFIG.MIN_SPAWN_RATE) {
      difficulty.spawnRate -= CONFIG.SPAWN_RATE_DECREMENT;
    }
    
    console.log(`🔥 難度提升！速度: ${difficulty.speed.toFixed(1)}, 刷新率: ${difficulty.spawnRate}ms`);
  }
}

// ==========================================
// 🎮 遊戲控制
// ==========================================

/**
 * 開始遊戲
 */
function startGame(difficultyLevel = 'easy') {
  // 防止多次啟動
  if (gameState.isRunning) return;

  // 設定難度
  currentDifficulty = difficulties[difficultyLevel] || difficulties.easy;
  difficulty.speed = currentDifficulty.baseSpeed;
  difficulty.spawnRate = currentDifficulty.baseSpawnRate;
  difficulty.minLen = currentDifficulty.minLen;
  difficulty.maxLen = currentDifficulty.maxLen;
  CONFIG.MAX_FISH = currentDifficulty.initialMaxFish;

  // 重新初始化遊戲狀態（從 localStorage 讀取金錢）
  loadVocabularyHistory();
  createVocabularyRound();

  gameState.isRunning = true;
  gameState.isPaused = false;
  gameState.timeLeft = 60;
  gameState.score = 0;
  gameState.combo = 0;
  gameState.typed = "";
  gameState.money = StorageManager.getMoney();  // 從儲存中讀取金錢

  // 隱藏開始畫面，顯示遊戲區域
  document.getElementById("startScreen").style.display = "none";
  game.style.display = "block";

  // 顯示暫停按鈕（如果之前被隱藏）
  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) {
    pauseBtn.style.display = 'block';
  }

  // 移除主頁背景圖片
  document.body.style.backgroundImage = 'none';

  console.log(`🎣 遊戲開始！難度：${currentDifficulty.name}`);

  // 開始生成魚
  gameState.spawnInterval = setInterval(spawnFish, difficulty.spawnRate);

  // 倒數計時 - 難度升級邏輯
  gameState.timerInterval = setInterval(() => {
    gameState.timeLeft -= 1;
    
    // 在規定時間後提高魚的數量
    if (gameState.timeLeft === 60 - currentDifficulty.increaseTime && CONFIG.MAX_FISH < currentDifficulty.maxMaxFish) {
      CONFIG.MAX_FISH = currentDifficulty.maxMaxFish;
      console.log(`🔥 難度升級！同時最大魚數提升至 ${CONFIG.MAX_FISH}`);
    }
    
    updateUI();
    if (gameState.timeLeft <= 0) {
      checkGameOver();
    }
  }, 1000);

  updateUI();
}

/**
 * 打開商店
 */
function openShop() {
  const shopModal = document.getElementById('shopModal');
  const shopMoney = document.getElementById('shopMoney');
  const shopItemsContainer = document.getElementById('shopItems');
  const inventory = StorageManager.getInventory();
  
  // 從 localStorage 讀取最新金錢
  gameState.money = StorageManager.getMoney();
  shopMoney.innerText = gameState.money;
  shopItemsContainer.innerHTML = '';
  
  shopItems.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'shop-item';
    itemDiv.style.cssText = 'border: 2px solid #ddd; border-radius: 10px; padding: 18px; text-align: center; background: #f8fbff;';
    
    const owned = Boolean(inventory[item.id]);
    const canBuy = !owned && gameState.money >= item.price;
    const buttonLabel = owned ? '已購買' : (canBuy ? '購買' : '餘額不足');
    const buttonClass = owned ? 'shop-btn owned' : (canBuy ? 'shop-btn buy' : 'shop-btn locked');
    const disabledAttr = owned || !canBuy ? 'disabled' : '';
    
    itemDiv.innerHTML = `
      <div class="shop-item-icon">${item.emoji}</div>
      <div class="shop-item-name">${item.name}</div>
      <div class="shop-item-category">${item.category}</div>
      <div class="shop-item-price">$${item.price}</div>
      <button class="${buttonClass}" onclick="buyItem('${item.id}')" ${disabledAttr}>${buttonLabel}</button>
    `;
    
    if (owned) {
      const label = document.createElement('div');
      label.className = 'shop-item-badge';
      label.textContent = '已購買';
      itemDiv.appendChild(label);
    }
    
    shopItemsContainer.appendChild(itemDiv);
  });
  
  shopModal.style.display = 'block';
}

/**
 * 關閉商店
 */
function closeShop() {
  document.getElementById('shopModal').style.display = 'none';
}

/**
 * 購買物品
 */
function buyItem(itemId) {
  const item = shopItems.find(i => i.id === itemId);
  
  if (!item) return;
  const inventory = StorageManager.getInventory();
  if (inventory[itemId]) {
    alert('❌ 此物品已購買，無法重複購買。');
    return;
  }
  
  if (gameState.money >= item.price) {
    gameState.money -= item.price;
    StorageManager.setMoney(gameState.money);  // 保存金錢
    StorageManager.addItemToInventory(item.id);
    alert(`✅ 購買成功！\n${item.emoji} ${item.name}\n餘額: $${gameState.money}`);
    
    // 更新開始畫面的金錢顯示
    if (document.getElementById('startMoney')) {
      document.getElementById('startMoney').innerText = gameState.money;
    }
    
    renderInventory();
    openShop(); // 重新開啟商店更新顯示
  } else {
    alert('❌ 餘額不足！');
  }
}

// 監聽外部點擊關閉商店
window.addEventListener('click', (e) => {
  const shopModal = document.getElementById('shopModal');
  if (e.target === shopModal) {
    closeShop();
  }
});

// 頁面載入時初始化背包顯示
renderInventory();