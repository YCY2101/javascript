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
  getOwnedItems: () => {
    try {
      return JSON.parse(localStorage.getItem('fishinGameOwnedItems')) || [];
    } catch (error) {
      return [];
    }
  },
  setOwnedItems: (items) => localStorage.setItem('fishinGameOwnedItems', JSON.stringify(items)),
  addOwnedItem: (itemId) => {
    const owned = StorageManager.getOwnedItems();
    if (!owned.includes(itemId)) {
      owned.push(itemId);
      StorageManager.setOwnedItems(owned);
    }
  },
  getEquippedItems: () => {
    try {
      return JSON.parse(localStorage.getItem('fishinGameEquippedItems')) || {};
    } catch (error) {
      return {};
    }
  },
  setEquippedItems: (items) => localStorage.setItem('fishinGameEquippedItems', JSON.stringify(items)),
  equipItem: (itemId) => {
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return;
    const equipped = StorageManager.getEquippedItems();
    equipped[item.category] = itemId;
    StorageManager.setEquippedItems(equipped);
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
  caughtFishCount: 0, // 這一局釣到的魚數（累計）
  lives: 3,
  elapsedSeconds: 0,
  mode: 'timed',
  isRunning: false,
  isPaused: false,
  spawnInterval: null,
  timerInterval: null
};

// ==========================================
// 🛍️ 商店物品
// ==========================================
const shopItems = [
  // 釣竿類別
  { id: 'rod2', name: '釣竿1', category: '釣竿', price: 220, image: '釣竿1.png' },
  { id: 'rod3', name: '釣竿', category: '釣竿', price: 360, image: '釣竿.png' },
  { id: 'rod4', name: '胡蘿蔔釣竿', category: '釣竿', price: 280, image: '胡蘿蔔釣竿.png' },
  { id: 'rod5', name: '麥塊釣竿', category: '釣竿', price: 260, image: '麥塊釣竿.png' },
  { id: 'rod6', name: '幸運釣竿', category: '釣竿', price: 360, image: '幸運釣竿.png' },
  
  // 人物幫手
  { id: 'char1', name: '魚夫', category: '人物', price: 160, image: '魚夫.png' },
];

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
    baseSpawnRate: 3000,
    rewardMultiplier: 0.8
  },
  normal: {
    name: "中等",
    initialMaxFish: 3,
    maxMaxFish: 4,
    increaseTime: 60,
    minLen: 5,
    maxLen: 8,
    baseSpeed: 2.5,
    baseSpawnRate: 2000,
    rewardMultiplier: 1
  },
  hard: {
    name: "困難",
    initialMaxFish: 4,
    maxMaxFish: 5,
    increaseTime: 60,
    minLen: 8,
    maxLen: 12,
    baseSpeed: 3.5,
    baseSpawnRate: 1500,
    rewardMultiplier: 1.4
  },
  infinite: {
    name: "無限",
    initialMaxFish: 4,
    maxMaxFish: 6,
    increaseTime: 0,
    minLen: 3,
    maxLen: 6,
    baseSpeed: 1.6,
    baseSpawnRate: 2400,
    rewardMultiplier: 1.2
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
  SPAWN_RATE_DECREMENT: 100,
  INFINITE_SPEED_INCREMENT: 0.15,
  INFINITE_MAX_LETTER: 18
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

/**
 * 更新 UI 顯示
 */
function updateUI() {
  scoreEl.innerText = gameState.score;
  comboEl.innerText = gameState.combo;
  input.innerText = gameState.typed;

  const timeLabel = document.getElementById('timeLabel');
  const timeSuffix = document.getElementById('timeSuffix');

  if (gameState.mode === 'infinite') {
    timeLabel.innerText = 'Lives';
    timeEl.innerText = gameState.lives;
    timeSuffix.innerText = '';
  } else {
    timeLabel.innerText = 'Time';
    timeEl.innerText = gameState.timeLeft;
    timeSuffix.innerText = 's';
  }
}

/**
 * 遊戲結束處理
 */
function endGame() {
  clearInterval(gameState.spawnInterval);
  clearInterval(gameState.timerInterval);
  gameState.spawnInterval = null;
  gameState.timerInterval = null;
  gameState.isRunning = false;
  gameState.isPaused = false;

  const pauseModal = document.getElementById('pauseModal');
  if (pauseModal) {
    pauseModal.style.display = 'none';
  }

  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) {
    pauseBtn.style.display = 'block';
  }
  
  // 保存金錢到 localStorage
  StorageManager.setMoney(gameState.money);
  
  // 隱藏遊戲區域，顯示遊戲結束模態框
  game.style.display = "none";
  document.getElementById("startScreen").style.display = "none";
  showGameOverModal();
}

/**
 * 判斷遊戲是否結束
 */
function checkGameOver() {
  if (gameState.mode === 'infinite') {
    if (gameState.lives <= 0) {
      endGame();
    }
  } else {
    if (gameState.timeLeft <= 0) {
      endGame();
    }
  }
}

// ==========================================
// 📡 API 函數
// ==========================================

/**
 * 打開背包視窗
 */
let currentInventoryCategory = '釣竿';
let currentShopCategory = '釣竿';
const inventoryCategoryOrder = ['釣竿', '人物'];

function getInventoryCategories() {
  return Array.from(new Set(shopItems.map(item => item.category))).sort((a, b) => {
    const aIndex = inventoryCategoryOrder.indexOf(a);
    const bIndex = inventoryCategoryOrder.indexOf(b);
    if (aIndex !== -1 || bIndex !== -1) return aIndex - bIndex;
    return a.localeCompare(b);
  });
}

function ensureDefaultInventory() {
  const ownedItems = new Set(StorageManager.getOwnedItems());
  const equippedItems = StorageManager.getEquippedItems();

  if (!ownedItems.has('rod1')) ownedItems.add('rod1');
  if (!ownedItems.has('char0')) ownedItems.add('char0');

  if (!equippedItems['釣竿']) equippedItems['釣竿'] = 'rod1';
  if (!equippedItems['人物']) equippedItems['人物'] = 'char0';

  StorageManager.setOwnedItems(Array.from(ownedItems));
  StorageManager.setEquippedItems(equippedItems);
}

function renderShopTabs() {
  const categories = getInventoryCategories();
  const tabsContainer = document.getElementById('shopTabs');
  if (!tabsContainer) return;

  tabsContainer.innerHTML = categories.map(category => {
    const activeClass = category === currentShopCategory ? 'active' : '';
    return `<button class="inventory-tab-btn ${activeClass}" onclick="openShop('${category}')">${category}</button>`;
  }).join('');
}

function renderShopItems() {
  const shopItemsContainer = document.getElementById('shopItems');
  if (!shopItemsContainer) return;

  const ownedItems = StorageManager.getOwnedItems();
  const items = shopItems.filter(item => item.category === currentShopCategory);

  if (items.length === 0) {
    shopItemsContainer.innerHTML = '<div class="empty-state">目前此分類還沒有任何商品。</div>';
    return;
  }

  shopItemsContainer.innerHTML = '';
  items.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'shop-item';

    const isOwned = ownedItems.includes(item.id);
    const canBuy = !isOwned && gameState.money >= item.price;
    const buttonLabel = isOwned ? '已購買' : item.price === 0 ? '免費' : '購買';
    const buttonClass = isOwned ? 'shop-item-button disabled' : `shop-item-button ${canBuy ? 'buyable' : 'unavailable'}`;
    const disabledAttr = (!canBuy || isOwned) ? 'disabled' : '';

    const imageMarkup = item.image ? `<img class="shop-item-image" src="${item.image}" alt="${item.name}">` : `<div class="shop-item-icon">${item.emoji || ''}</div>`;
    itemDiv.innerHTML = `
      ${imageMarkup}
      <div class="shop-item-name">${item.name}</div>
      <div class="shop-item-category">${item.category}</div>
      <div class="shop-item-price">${item.price === 0 ? '免費' : '$' + item.price}</div>
      <div class="shop-item-actions">
        <button class="${buttonClass}" onclick="buyItem('${item.id}')" ${disabledAttr}>${buttonLabel}</button>
      </div>
    `;

    shopItemsContainer.appendChild(itemDiv);
  });
}

function updatePlayerAppearance() {
  const equippedItems = StorageManager.getEquippedItems();
  const equippedRod = shopItems.find(item => item.id === equippedItems['釣竿']);
  const equippedCharacter = shopItems.find(item => item.id === equippedItems['人物']);

  if (rod && equippedRod && equippedRod.image) {
    rod.style.backgroundImage = `url("${equippedRod.image}")`;
  } else if (rod) {
    rod.style.backgroundImage = `url("釣竿.png")`;
  }

  if (fisherman && equippedCharacter && equippedCharacter.image) {
    fisherman.style.backgroundImage = `url("${equippedCharacter.image}")`;
  } else if (fisherman) {
    fisherman.style.backgroundImage = `url("魚夫.png")`;
  }
}

function getOwnedItemsByCategory() {
  const ownedItems = StorageManager.getOwnedItems();
  return shopItems.reduce((groups, item) => {
    if (!ownedItems.includes(item.id)) return groups;
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
    return groups;
  }, {});
}

function renderInventoryTabs() {
  const categories = getInventoryCategories();
  const tabsContainer = document.getElementById('inventoryTabs');

  if (!tabsContainer) return;

  tabsContainer.innerHTML = categories.map(category => {
    const activeClass = category === currentInventoryCategory ? 'active' : '';
    return `<button class="inventory-tab-btn ${activeClass}" onclick="openInventory('${category}')">${category}</button>`;
  }).join('');
}

function renderInventoryItems() {
  const inventoryItems = document.getElementById('inventoryItems');
  const ownedItems = StorageManager.getOwnedItems();
  const equippedItems = StorageManager.getEquippedItems();

  const items = shopItems.filter(item => item.category === currentInventoryCategory && ownedItems.includes(item.id));
  if (!inventoryItems) return;

  if (items.length === 0) {
    inventoryItems.innerHTML = '<div class="empty-state">目前此分類還沒有任何已擁有的物品。</div>';
    return;
  }

  inventoryItems.innerHTML = items.map(item => {
    const isEquipped = equippedItems[item.category] === item.id;
    const buttonLabel = isEquipped ? '已裝備' : '裝備';
    const buttonClass = isEquipped ? 'shop-item-button disabled' : 'shop-item-button buyable';
    const disabledAttr = isEquipped ? 'disabled' : '';
    const imageMarkup = item.image ? `<img class="shop-item-image" src="${item.image}" alt="${item.name}">` : `<div class="shop-item-icon">${item.emoji || ''}</div>`;

    return `
      <div class="shop-item inventory-item-card">
        ${imageMarkup}
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-category">${item.category}</div>
        <div class="shop-item-actions">
          <button class="${buttonClass}" onclick="equipItem('${item.id}')" ${disabledAttr}>${buttonLabel}</button>
        </div>
      </div>`;
  }).join('');
}

function openInventory(category) {
  ensureDefaultInventory();

  const inventoryModal = document.getElementById('inventoryModal');
  const categories = getInventoryCategories();

  if (category && categories.includes(category)) {
    currentInventoryCategory = category;
  } else if (!categories.includes(currentInventoryCategory)) {
    currentInventoryCategory = categories[0] || '釣竿';
  }

  renderInventoryTabs();
  renderInventoryItems();
  inventoryModal.style.display = 'flex';
}

function equipItem(itemId) {
  const item = shopItems.find(i => i.id === itemId);
  if (!item) return;

  const ownedItems = StorageManager.getOwnedItems();
  if (!ownedItems.includes(itemId)) return;

  StorageManager.equipItem(itemId);
  openInventory();
}

/**
 * 關閉背包視窗
 */
function closeInventory() {
  document.getElementById('inventoryModal').style.display = 'none';
}

/**
 * 從 API 獲取隨機單詞，並根據難度篩選
 */
async function getWord() {
  try {
    const lengthParams = [];

    for (let i = difficulty.minLen; i <= difficulty.maxLen; i++) {
      lengthParams.push(i);
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const length = lengthParams[Math.floor(Math.random() * lengthParams.length)];

      try {
        // 主要 API
        const response = await Promise.race([
          fetch(`https://random-words-api.kushcreates.com/api?language=en&words=1&length=${length}&type=lowercase`),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000))
        ]);

        if (!response.ok) throw new Error("主要 API 回應失敗");

        const data = await response.json();

        let word = "";

        if (Array.isArray(data)) {
          const first = data[0];
          word = typeof first === "string" ? first : first.word;
        } else if (data.words && Array.isArray(data.words)) {
          const first = data.words[0];
          word = typeof first === "string" ? first : first.word;
        } else if (data.word) {
          word = data.word;
        }

        if (
          word &&
          /^[a-z]+$/.test(word) &&
          word.length >= difficulty.minLen &&
          word.length <= difficulty.maxLen
        ) {
          return word.toLowerCase();
        }

      } catch (mainError) {
        console.warn("主要 API 失敗，改用 Datamuse 備用 API");
      }

      try {
        // 備用 API：抓同長度英文單字，再隨機挑一個
        const pattern = "?".repeat(length);

        const backupResponse = await Promise.race([
          fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(pattern)}&max=1000`),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000))
        ]);

        if (!backupResponse.ok) throw new Error("備用 API 回應失敗");

        const backupData = await backupResponse.json();

        const filtered = backupData
          .map(item => item.word)
          .filter(word =>
            word &&
            /^[a-z]+$/.test(word) &&
            word.length >= difficulty.minLen &&
            word.length <= difficulty.maxLen
          );

        if (filtered.length > 0) {
          return filtered[Math.floor(Math.random() * filtered.length)];
        }

      } catch (backupError) {
        console.error("備用 API 也失敗");
      }
    }

    throw new Error("所有 API 都失敗");

  } catch (error) {
    console.error("❌ 單詞獲取失敗:", error);
    return "word";
  }
}

// ==========================================
// 🐟 遊戲物件生成
// ==========================================

/**
 * 生成一條魚並添加到遊戲中
 */
async function spawnFish() {
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
  let y = Math.random() * seaHeight;
  let speedX = difficulty.speed * (0.6 + Math.random() * 0.4); // 速度隨機 0.6~1.0 倍
  let speedY = (Math.random() - 0.5) * 2;

  fish.style.left = x + "px";
  fish.style.top = y + "px";

  sea.appendChild(fish);

  fish.currentX = x;
  fish.currentY = y;
  fish.speedX = speedX;
  fish.speedY = speedY;

  // 魚的移動邏輯
  const moveInterval = setInterval(() => {
    // 防止幽靈魚繼續計時
    if (!document.body.contains(fish)) {
      clearInterval(moveInterval);
      return;
    }

    // 更新位置（使用隨機速度）
    fish.currentX += fish.speedX;
    fish.currentY += fish.speedY;

    // 垂直反彈
    if (fish.currentY <= 0 || fish.currentY >= sea.clientHeight - size) {
      fish.speedY *= -1;
    }

    fish.style.left = fish.currentX + "px";
    fish.style.top = fish.currentY + "px";

    // 檢查魚是否完全離開畫面
    if (fish.currentX > sea.clientWidth + size) {
      clearInterval(moveInterval);
      fish.remove();
      gameState.fishCount--;

      if (gameState.mode === 'infinite') {
        gameState.lives = Math.max(0, gameState.lives - 1);
        if (gameState.lives <= 0) {
          updateUI();
          checkGameOver();
          return;
        }
      }

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
  if (e.key === 'Escape' && gameState.isRunning) {
    if (gameState.isPaused) {
      resumeGame();
    } else {
      pauseGame();
    }
    return;
  }

  if (!gameState.isRunning || gameState.isPaused) return;

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
    const timeBonus = gameState.mode === 'timed' ? 1 + Math.floor(gameState.timeLeft / 10) : 1;
    const baseMultiplier = currentDifficulty?.rewardMultiplier || 1;
    const timeGrowth = gameState.mode === 'infinite' ? 1 + Math.floor(gameState.elapsedSeconds / 15) * 0.05 : 1;
    const rewardMultiplier = baseMultiplier * timeGrowth;
    const pointsEarned = Math.round(CONFIG.SCORE_POINTS * caughtFishes.length * timeBonus * rewardMultiplier);
    gameState.score += pointsEarned;
    gameState.money += pointsEarned;
    gameState.combo++;
    gameState.caughtFishCount += caughtFishes.length; // 累計釣到的魚數

    caughtFishes.forEach(fish => catchFish(fish));
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

function resumeFishMovement(fish) {
  if (!fish || fish.moveInterval) return;

  const size = parseFloat(fish.style.width) || 80;
  fish.currentX = typeof fish.currentX === 'number' ? fish.currentX : parseFloat(fish.style.left) || 0;
  fish.currentY = typeof fish.currentY === 'number' ? fish.currentY : parseFloat(fish.style.top) || 0;
  fish.speedX = typeof fish.speedX === 'number' ? fish.speedX : difficulty.speed * (0.6 + Math.random() * 0.4);
  fish.speedY = typeof fish.speedY === 'number' ? fish.speedY : (Math.random() - 0.5) * 2;

  fish.moveInterval = setInterval(() => {
    if (!document.body.contains(fish)) {
      clearInterval(fish.moveInterval);
      return;
    }

    fish.currentX += fish.speedX;
    fish.currentY += fish.speedY;

    if (fish.currentY <= 0 || fish.currentY >= sea.clientHeight - size) {
      fish.speedY *= -1;
    }

    fish.style.left = fish.currentX + "px";
    fish.style.top = fish.currentY + "px";

    if (fish.currentX > sea.clientWidth + size) {
      clearInterval(fish.moveInterval);
      fish.remove();
      gameState.fishCount--;
      if (gameState.mode === 'infinite') {
        gameState.lives = Math.max(0, gameState.lives - 1);
        if (gameState.lives <= 0) {
          updateUI();
          checkGameOver();
          return;
        }
      }
      gameState.combo = 0;
      updateUI();
    }
  }, CONFIG.UPDATE_INTERVAL);
}

function startSpawnTimer() {
  if (gameState.spawnInterval) return;
  gameState.spawnInterval = setInterval(spawnFish, difficulty.spawnRate);
}

function startGameTimer() {
  if (gameState.timerInterval) return;

  gameState.timerInterval = setInterval(() => {
    if (gameState.mode === 'timed') {
      gameState.timeLeft -= 1;

      if (gameState.timeLeft === 60 - currentDifficulty.increaseTime && CONFIG.MAX_FISH < currentDifficulty.maxMaxFish) {
        CONFIG.MAX_FISH = currentDifficulty.maxMaxFish;
        console.log(`🔥 難度升級！同時最大魚數提升至 ${CONFIG.MAX_FISH}`);
      }

      updateUI();
      if (gameState.timeLeft <= 0) {
        checkGameOver();
      }
    } else {
      gameState.elapsedSeconds += 1;

      if (gameState.elapsedSeconds % 5 === 0) {
        difficulty.speed += CONFIG.INFINITE_SPEED_INCREMENT;
      }

      if (gameState.elapsedSeconds % 10 === 0) {
        difficulty.minLen = Math.min(difficulty.minLen + 1, CONFIG.INFINITE_MAX_LETTER - 2);
        difficulty.maxLen = Math.min(difficulty.maxLen + 1, CONFIG.INFINITE_MAX_LETTER);
      }

      updateUI();
    }
  }, 1000);
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
  ensureDefaultInventory();
  gameState.isRunning = true;
  gameState.mode = difficultyLevel === 'infinite' ? 'infinite' : 'timed';
  gameState.timeLeft = gameState.mode === 'timed' ? 60 : 0;
  gameState.lives = gameState.mode === 'infinite' ? 3 : 0;
  gameState.elapsedSeconds = 0;
  gameState.score = 0;
  gameState.combo = 0;
  gameState.typed = "";
  gameState.fishCount = 0;
  gameState.caughtFishCount = 0; // 重置已釣魚數
  gameState.money = StorageManager.getMoney();  // 從儲存中讀取金錢

  // 隱藏開始畫面，顯示遊戲區域
  document.getElementById("startScreen").style.display = "none";
  game.style.display = "block";

  // 移除主頁背景圖片
  document.body.style.backgroundImage = 'none';

  console.log(`🎣 遊戲開始！難度：${currentDifficulty.name}`);

  // 開始生成魚
  startSpawnTimer();
  startGameTimer();

  gameState.isPaused = false;
  updatePlayerAppearance();
  updateUI();
}

/**
 * 打開商店
 */
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
  gameState.timerInterval = null;

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
    resumeFishMovement(fish);
  });

  // 恢復生成魚與計時器
  startSpawnTimer();
  startGameTimer();
}

function openShop(category) {
  ensureDefaultInventory();

  const shopModal = document.getElementById('shopModal');
  const shopMoney = document.getElementById('shopMoney');

  // 從 localStorage 讀取最新金錢
  gameState.money = StorageManager.getMoney();
  shopMoney.innerText = gameState.money;

  const categories = getInventoryCategories();
  if (category && categories.includes(category)) {
    currentShopCategory = category;
  } else if (!categories.includes(currentShopCategory)) {
    currentShopCategory = categories[0] || '釣竿';
  }

  renderShopTabs();
  renderShopItems();
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
  
  if (gameState.money >= item.price) {
    gameState.money -= item.price;
    StorageManager.setMoney(gameState.money);  // 保存金錢
    StorageManager.addOwnedItem(item.id);
    alert(`✅ 購買成功！\n${item.name}\n餘額: $${gameState.money}`);
    
    // 更新開始畫面的金錢顯示
    if (document.getElementById('startMoney')) {
      document.getElementById('startMoney').innerText = gameState.money;
    }
    
    openShop(); // 重新開啟商店更新顯示
  } else {
    alert('❌ 餘額不足！');
  }
}

// 初始化背包與裝備
ensureDefaultInventory();

// 監聽外部點擊關閉商店
window.addEventListener('click', (e) => {
  const shopModal = document.getElementById('shopModal');
  if (e.target === shopModal) {
    closeShop();
  }
});