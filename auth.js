const AUTH_STORAGE_KEY = 'fishingGameCurrentUser';
const USERS_STORAGE_KEY = 'fishingGameUsers';
const ADMIN_REGISTRATION_CODE = '68796452';
let currentUser = null;
let authMode = 'login';

function getStoredUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function saveStoredUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function hashPassword(password) {
  return btoa(encodeURIComponent(password));
}

function getCurrentUser() {
  if (currentUser) {
    // 確保帳號 51315142 被識別為管理員
    if (currentUser.name === '51315142') {
      currentUser.isAdmin = true;
    }
    return currentUser;
  }

  try {
    const stored = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    if (stored) {
      // 確保帳號 51315142 被識別為管理員
      if (stored.name === '51315142') {
        stored.isAdmin = true;
      }
      currentUser = stored;
    }
  } catch (error) {
    currentUser = null;
  }

  return currentUser;
}

function setCurrentUser(user) {
  currentUser = user;
  // 確保帳號 51315142 被識別為管理員
  if (user && user.name === '51315142') {
    user.isAdmin = true;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  refreshAuthUI();
}

function clearCurrentUser() {
  currentUser = null;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  refreshAuthUI();
}

function saveGameDataToUser() {
  if (!currentUser) return;

  const gameData = {
    money: localStorage.getItem('fishinGameMoney') || '0',
    highScore: localStorage.getItem('fishinGameHighScore') || '0',
    ownedItems: localStorage.getItem('fishinGameOwnedItems') || '[]',
    equippedItems: localStorage.getItem('fishinGameEquippedItems') || '{}'
  };

  const users = getStoredUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex !== -1) {
    users[userIndex].gameData = gameData;
    saveStoredUsers(users);
    currentUser.gameData = gameData;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
  }
}

function loadGameDataFromUser(user) {
  if (!user || !user.gameData) {
    if (window.resetPersistentGameData) {
      window.resetPersistentGameData();
    }
    return;
  }

  localStorage.setItem('fishinGameMoney', user.gameData.money || '0');
  localStorage.setItem('fishinGameHighScore', user.gameData.highScore || '0');
  localStorage.setItem('fishinGameOwnedItems', user.gameData.ownedItems || '[]');
  localStorage.setItem('fishinGameEquippedItems', user.gameData.equippedItems || '{}');

  if (window.updateGameDisplay) {
    window.updateGameDisplay();
  }
}

function isAdminUser(user) {
  return !!(user && user.isAdmin);
}

function showAuthMessage(message, type = 'error') {
  const messageEl = document.getElementById('authMessage');
  if (!messageEl) return;
  messageEl.innerText = message;
  messageEl.style.color = type === 'success' ? '#2e7d32' : '#d32f2f';
}

function initializeBuiltinAccounts() {
  const users = getStoredUsers();
  const BUILTIN_ACCOUNT = {
    username: '51315142',
    password: '68796452'
  };

  // 檢查內置帳號是否已存在
  const existing = users.find(u => u.name === BUILTIN_ACCOUNT.username);
  if (!existing) {
    const builtinUser = {
      id: `user_builtin_${Date.now()}`,
      name: BUILTIN_ACCOUNT.username,
      passwordHash: hashPassword(BUILTIN_ACCOUNT.password),
      authProvider: 'local',
      createdAt: new Date().toISOString(),
      scoreEntries: [],
      isAdmin: true,
      gameData: {
        money: '0',
        highScore: '0',
        ownedItems: '[]',
        equippedItems: '{}'
      }
    };
    users.push(builtinUser);
    saveStoredUsers(users);
  }
}

function clearAllLeaderboardEntries() {
  localStorage.setItem('fishinGameLeaderboard', '[]');

  const users = getStoredUsers();
  users.forEach(user => {
    user.scoreEntries = [];
  });
  saveStoredUsers(users);

  if (currentUser) {
    currentUser.scoreEntries = [];
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
  }

  showAuthMessage('排行榜已清空。', 'success');
  if (window.loadLeaderboard) {
    window.loadLeaderboard();
  }
}

function updateAdminMoney() {
  const input = document.getElementById('adminMoneyInput');
  if (!input) return;
  const amount = parseInt(input.value, 10);
  if (Number.isNaN(amount)) {
    showAuthMessage('請輸入有效金額。', 'error');
    return;
  }
  
  // 更新 localStorage
  localStorage.setItem('fishinGameMoney', String(amount));
  
  // 更新 gameState
  if (typeof gameState !== 'undefined') {
    gameState.money = amount;
  }
  
  // 刷新顯示
  if (window.updateGameDisplay) {
    window.updateGameDisplay();
  }
  
  // 分派事件
  window.dispatchEvent(new Event('moneyUpdated'));
  
  showAuthMessage('金額已更新。', 'success');
  input.value = '';
}

function updateAdminScore() {
  const input = document.getElementById('adminScoreInput');
  if (!input) return;
  const score = parseInt(input.value, 10);
  if (Number.isNaN(score)) {
    showAuthMessage('請輸入有效分數。', 'error');
    return;
  }
  
  // 更新 localStorage
  localStorage.setItem('fishinGameHighScore', String(score));
  
  // 更新 gameState
  if (typeof gameState !== 'undefined') {
    gameState.highScore = score;
  }
  
  // 刷新顯示
  if (window.updateGameDisplay) {
    window.updateGameDisplay();
  }
  
  // 分派事件
  window.dispatchEvent(new Event('highScoreUpdated'));
  
  showAuthMessage('分數已更新。', 'success');
  input.value = '';
}

function adminResetInventoryState() {
  if (window.resetInventoryState) {
    window.resetInventoryState();
  }
  showAuthMessage('背包已清空。', 'success');
}

function adminResetShopState() {
  if (window.resetShopState) {
    window.resetShopState();
  }
  showAuthMessage('商店已清空。', 'success');
}

function returnToHomePage() {
  const authModal = document.getElementById('authModal');
  if (authModal) {
    authModal.style.display = 'none';
  }

  const startScreen = document.getElementById('startScreen');
  if (startScreen) {
    startScreen.style.display = 'flex';
  }

  const game = document.getElementById('game');
  if (game) {
    game.style.display = 'none';
  }

  const pauseModal = document.getElementById('pauseModal');
  if (pauseModal) {
    pauseModal.style.display = 'none';
  }

  const gameOverModal = document.getElementById('gameOverModal');
  if (gameOverModal) {
    gameOverModal.style.display = 'none';
  }

  document.body.style.backgroundImage = "url('主頁.png')";
}

function switchAuthMode(mode) {
  const user = getCurrentUser();
  if (user) return;
  
  authMode = mode;
  const loginPanel = document.getElementById('authLoginPanel');
  const registerPanel = document.getElementById('authRegisterPanel');
  const tabs = document.querySelectorAll('.auth-tab');

  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  if (loginPanel && registerPanel) {
    loginPanel.style.display = mode === 'login' ? 'block' : 'none';
    registerPanel.style.display = mode === 'register' ? 'block' : 'none';
  }

  showAuthMessage('');
}

function submitAuthForm() {
  if (authMode === 'register') {
    const nameInput = document.getElementById('registerName');
    const passwordInput = document.getElementById('registerPassword');
    const confirmPasswordInput = document.getElementById('registerConfirmPassword');
    const name = nameInput ? nameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

    // 一般用戶註冊
    if (!name || !password || !confirmPassword) {
      showAuthMessage('請填寫完整資料。', 'error');
      return;
    }

    if (password.length < 8) {
      showAuthMessage('密碼需至少 8 碼。', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showAuthMessage('註冊密碼與確認密碼不一致。', 'error');
      return;
    }

    const users = getStoredUsers();
    const existing = users.find(user => user.name === name);
    if (existing) {
      showAuthMessage('使用者名稱已存在。', 'error');
      return;
    }

    const newUser = {
      id: `user_${Date.now()}`,
      name,
      passwordHash: hashPassword(password),
      authProvider: 'local',
      createdAt: new Date().toISOString(),
      scoreEntries: [],
      isAdmin: false,
      gameData: {
        money: '0',
        highScore: '0',
        ownedItems: '[]',
        equippedItems: '{}'
      }
    };

    users.push(newUser);
    saveStoredUsers(users);
    setCurrentUser(newUser);
    showAuthMessage('註冊成功，已為您登入。', 'success');
    document.getElementById('registerForm').reset();
    refreshAuthUI();
    setTimeout(() => closeAuthModal(), 500);
    return;
  }

  const name = document.getElementById('loginName').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!name || !password) {
    showAuthMessage('請輸入名字與密碼。', 'error');
    return;
  }

  // 隱藏的管理員登入方式
  if (name === 'admin' && password === ADMIN_REGISTRATION_CODE) {
    const users = getStoredUsers();
    let adminUser = users.find(user => user.name === '管理員' && user.isAdmin);

    if (!adminUser) {
      adminUser = {
        id: `admin_${Date.now()}`,
        name: '管理員',
        passwordHash: hashPassword(ADMIN_REGISTRATION_CODE),
        authProvider: 'local',
        createdAt: new Date().toISOString(),
        scoreEntries: [],
        isAdmin: true,
        gameData: {
          money: '0',
          highScore: '0',
          ownedItems: '[]',
          equippedItems: '{}'
        }
      };
      users.push(adminUser);
      saveStoredUsers(users);
    }

    setCurrentUser(adminUser);
    showAuthMessage('登入成功。', 'success');
    document.getElementById('loginForm').reset();
    refreshAuthUI();
    setTimeout(() => closeAuthModal(), 500);
    return;
  }

  const users = getStoredUsers();
  const user = users.find(item => item.name === name);
  if (!user) {
    showAuthMessage('使用者不存在，請先註冊。', 'error');
    return;
  }

  if (user.passwordHash !== hashPassword(password)) {
    showAuthMessage('密碼錯誤。', 'error');
    return;
  }

  setCurrentUser(user);
  loadGameDataFromUser(user);
  showAuthMessage('登入成功。', 'success');
  document.getElementById('loginForm').reset();
  refreshAuthUI();
}

function logoutUser() {
  saveGameDataToUser();
  if (window.resetPersistentGameData) {
    window.resetPersistentGameData();
  }
  clearCurrentUser();
  showAuthMessage('已登出。', 'success');
}

function deleteAccount() {
  if (!currentUser) return;

  if (!confirm('確定要刪除帳號嗎？此操作無法復原。')) return;
  if (!confirm('這是最後警告，真的要刪除嗎？')) return;

  const users = getStoredUsers();
  const userIndex = users.findIndex(item => item.id === currentUser.id);
  if (userIndex === -1) {
    showAuthMessage('帳號找不到。', 'error');
    return;
  }

  users.splice(userIndex, 1);
  saveStoredUsers(users);

  const leaderboard = JSON.parse(localStorage.getItem('fishinGameLeaderboard') || '[]');
  const filteredLeaderboard = leaderboard.filter(entry => entry.ownerId !== currentUser.id);
  localStorage.setItem('fishinGameLeaderboard', JSON.stringify(filteredLeaderboard));

  if (window.resetPersistentGameData) {
    window.resetPersistentGameData();
  }
  clearCurrentUser();
  showAuthMessage('帳號已刪除。', 'success');
  setTimeout(() => {
    closeAuthModal();
  }, 1000);
}

function syncCurrentUserFromStorage() {
  const user = getCurrentUser();
  if (!user) return;

  const users = getStoredUsers();
  const storedUser = users.find(item => item.id === user.id);
  if (storedUser) {
    // 確保帳號 51315142 被識別為管理員
    if (storedUser.name === '51315142') {
      storedUser.isAdmin = true;
    }
    currentUser = storedUser;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(storedUser));
    loadGameDataFromUser(storedUser);
  }
}

function renderUserScoreEntries() {
  const listEl = document.getElementById('authUserScoreList');
  if (!listEl) return;

  const user = getCurrentUser();
  if (!user) {
    listEl.innerHTML = '<div class="empty-state">尚未登入，無法管理排行榜資料。</div>';
    return;
  }

  const entries = Array.isArray(user.scoreEntries) ? user.scoreEntries : [];
  if (entries.length === 0) {
    listEl.innerHTML = '<div class="empty-state">目前沒有任何排行榜資料可刪除。</div>';
    return;
  }

  listEl.innerHTML = entries.map(entry => `
    <div class="auth-score-item">
      <div>
        <div style="font-weight: bold;">${entry.score} 分</div>
        <div style="font-size: 12px; color: #666;">${entry.difficulty || '未知'} · ${entry.wordCount || 0} 字</div>
      </div>
      <button class="secondary-btn" onclick="deleteOwnedLeaderboardEntry('${entry.id}')">刪除</button>
    </div>
  `).join('');
}

function refreshAuthUI() {
  const user = getCurrentUser();
  const authStatus = document.getElementById('authStatusLabel');
  const authButton = document.getElementById('authBtn');
  const loginPanel = document.getElementById('authLoginPanel');
  const registerPanel = document.getElementById('authRegisterPanel');
  const userPanel = document.getElementById('authUserPanel');

  if (authStatus) {
    authStatus.innerText = user ? `已登入：${user.name}${isAdminUser(user) ? '（管理員）' : ''}` : '尚未登入';
  }

  if (authButton) {
    authButton.innerText = user ? '👤 帳號管理' : '🔐 登入/註冊';
  }

  const adminPanel = document.getElementById('adminPanel');
  if (userPanel) {
    if (user) {
      userPanel.style.display = 'block';
      document.getElementById('authUserName').innerText = user.name;
      document.getElementById('authUserEmail').innerText = user.authProvider === 'local' ? '本地帳號' : '帳號已登入';
      
      // 顯示或隱藏管理員面板
      if (adminPanel) {
        const shouldShowAdmin = isAdminUser(user);
        adminPanel.style.display = shouldShowAdmin ? 'block' : 'none';
      }

      try {
        renderUserScoreEntries();
      } catch (e) {
        // 忽略 renderUserScoreEntries 的錯誤，不影響其他功能
      }

      // 只在非管理員帳號上添加「註銷帳號」按鈕
      if (!isAdminUser(user)) {
        try {
          const actionsEl = userPanel.querySelector('.modal-actions');
          if (actionsEl) {
            let delBtn = actionsEl.querySelector('[data-delete-account]');
            if (!delBtn) {
              const btn = document.createElement('button');
              btn.className = 'secondary-btn';
              btn.style.backgroundColor = '#cc4444';
              btn.style.marginLeft = '8px';
              btn.textContent = '註銷帳號';
              btn.setAttribute('data-delete-account', '1');
              btn.addEventListener('click', () => {
                if (typeof deleteAccount === 'function') deleteAccount();
              });
              actionsEl.appendChild(btn);
            }
          }
        } catch (e) {
          // ignore
        }
      }
    } else {
      userPanel.style.display = 'none';
      if (adminPanel) {
        adminPanel.style.display = 'none';
      }
    }
  }

  if (loginPanel && registerPanel) {
    loginPanel.style.display = authMode === 'login' && !user ? 'block' : 'none';
    registerPanel.style.display = authMode === 'register' && !user ? 'block' : 'none';
  }
}

function openAuthModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  switchAuthMode('login');
  refreshAuthUI();
  modal.style.display = 'flex';
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.style.display = 'none';
}

function saveUserScoreEntry(entry) {
  if (!currentUser) return;

  const users = getStoredUsers();
  const userIndex = users.findIndex(item => item.id === currentUser.id);
  if (userIndex === -1) return;

  const user = users[userIndex];
  user.scoreEntries = Array.isArray(user.scoreEntries) ? user.scoreEntries : [];
  user.scoreEntries.push(entry);
  users[userIndex] = user;
  saveStoredUsers(users);

  currentUser = user;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  refreshAuthUI();
}

function deleteOwnedLeaderboardEntry(entryId) {
  if (!currentUser) return;

  const users = getStoredUsers();
  const userIndex = users.findIndex(item => item.id === currentUser.id);
  if (userIndex === -1) return;

  const user = users[userIndex];
  const filteredEntries = (user.scoreEntries || []).filter(entry => entry.id !== entryId);
  user.scoreEntries = filteredEntries;
  users[userIndex] = user;
  saveStoredUsers(users);

  if (window.LEADERBOARD_API && typeof window.LEADERBOARD_API.deleteScore === 'function') {
    window.LEADERBOARD_API.deleteScore(entryId);
  }

  currentUser = user;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  refreshAuthUI();
}

function deleteUserScoreEntry(entryId) {
  if (!currentUser) return;

  const users = getStoredUsers();
  const userIndex = users.findIndex(item => item.id === currentUser.id);
  if (userIndex === -1) return;

  const user = users[userIndex];
  const filteredEntries = (user.scoreEntries || []).filter(entry => entry.id !== entryId);
  user.scoreEntries = filteredEntries;
  users[userIndex] = user;
  saveStoredUsers(users);

  currentUser = user;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthMode = switchAuthMode;
window.submitAuthForm = submitAuthForm;
window.logoutUser = logoutUser;
window.deleteAccount = deleteAccount;
window.saveUserScoreEntry = saveUserScoreEntry;
window.deleteUserScoreEntry = deleteUserScoreEntry;
window.deleteOwnedLeaderboardEntry = deleteOwnedLeaderboardEntry;
window.getCurrentUser = getCurrentUser;
window.syncCurrentUserFromStorage = syncCurrentUserFromStorage;
window.clearAllLeaderboardEntries = clearAllLeaderboardEntries;
window.updateAdminMoney = updateAdminMoney;
window.updateAdminScore = updateAdminScore;
window.adminResetInventoryState = adminResetInventoryState;
window.adminResetShopState = adminResetShopState;

window.addEventListener('DOMContentLoaded', () => {
  initializeBuiltinAccounts();
  syncCurrentUserFromStorage();
  refreshAuthUI();
});
