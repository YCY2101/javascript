// ==========================================
// 🏆 線上排行榜管理
// ==========================================

// JSONBin.io API 設定（免費在線JSON存儲）
const LEADERBOARD_API = {
  // 使用簡單的本地存儲模擬在線排行榜
  // 實際應用中可以替換為真正的API端點
  BIN_ID: 'fishing-game-leaderboard',
  
  async getLeaderboard() {
    try {
      // 優先嘗試從真實API獲取
      const response = await fetch('https://api.jsonbin.io/v3/b/fishing-game-leaderboard/latest', {
        headers: {
          'X-Master-Key': '$2b$10$your-master-key-here' // 需要替換為實際的密鑰
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.record.scores || [];
      }
    } catch (error) {
      console.log('無法連線到在線API，使用本地存儲');
    }
    
    // 回退到本地存儲
    return JSON.parse(localStorage.getItem('fishinGameLeaderboard')) || [];
  },
  
  async saveScore(playerData) {
    try {
      const scores = await this.getLeaderboard();
      const duplicate = scores.find(entry =>
        entry.playerName === playerData.playerName &&
        entry.score === playerData.score &&
        entry.difficulty === playerData.difficulty &&
        entry.wordCount === playerData.wordCount
      );

      if (duplicate) {
        return { scores, duplicate: true };
      }

      const newEntry = {
        ...playerData,
        timestamp: new Date().toISOString()
      };
      scores.push(newEntry);
      
      // 排序：分數從高到低
      scores.sort((a, b) => b.score - a.score);
      
      // 只保留前1000名
      const topScores = scores.slice(0, 1000);
      const playerRank = topScores.findIndex(entry =>
        entry.playerName === playerData.playerName &&
        entry.score === playerData.score &&
        entry.difficulty === playerData.difficulty &&
        entry.wordCount === playerData.wordCount &&
        entry.timestamp === newEntry.timestamp
      ) + 1;
      
      // 保存到本地存儲（作為主要存儲）
      localStorage.setItem('fishinGameLeaderboard', JSON.stringify(topScores));
      
      // 嘗試同步到遠程API
      try {
        await fetch('https://api.jsonbin.io/v3/b/fishing-game-leaderboard', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': '$2b$10$your-master-key-here'
          },
          body: JSON.stringify({ scores: topScores })
        });
      } catch (e) {
        console.log('本地保存成功，但無法同步到遠程API');
      }
      
      return { scores: topScores, duplicate: false, rank: playerRank };
    } catch (error) {
      console.error('❌ 保存分數失敗:', error);
      return { scores: [], duplicate: false };
    }
  }
};

let currentLeaderboard = [];
let currentLeaderboardPage = 1;
let currentLeaderboardDifficulty = '全部';
const LEADERBOARD_PAGE_SIZE = 50;
const LEADERBOARD_DIFFICULTIES = ['全部', '簡單', '中等', '困難', '無限'];

/**
 * 顯示遊戲結束模態框
 */
function showGameOverModal() {
  const modal = document.getElementById('gameOverModal');
  const finalScore = document.getElementById('finalScore');
  const finalMoney = document.getElementById('finalMoney');
  const finalWordCount = document.getElementById('finalWordCount');
  const playerNameInput = document.getElementById('playerNameInput');
  const leaderboardStatus = document.getElementById('leaderboardStatus');
  const submitScoreBtn = document.getElementById('submitScoreBtn');
  
  // 更新遊戲結束信息
  finalScore.innerText = gameState.score;
  finalMoney.innerText = gameState.money;
  finalWordCount.innerText = gameState.caughtFishCount; // 這一局釣到的魚總數
  
  // 清空輸入框和狀態信息
  playerNameInput.value = '';
  leaderboardStatus.innerText = '';
  submitScoreBtn.disabled = false;
  submitScoreBtn.innerText = '登記分數';
  
  // 顯示排行榜預覽
  // 顯示模態框
  modal.style.display = 'flex';
  
  // 聚焦於輸入框
  playerNameInput.focus();
}

/**
 * 提交分數到排行榜
 */
async function submitScore() {
  const playerNameInput = document.getElementById('playerNameInput');
  const playerName = playerNameInput.value.trim();
  const leaderboardStatus = document.getElementById('leaderboardStatus');
  const submitScoreBtn = document.getElementById('submitScoreBtn');
  
  // 驗證名字不為空
  if (playerName === '') {
    leaderboardStatus.innerText = '❌ 請輸入玩家名稱';
    leaderboardStatus.style.color = '#ff6b6b';
    return;
  }
  
  // 驗證名字長度
  if (playerName.length > 50) {
    leaderboardStatus.innerText = '❌ 名字不能超過50個字符';
    leaderboardStatus.style.color = '#ff6b6b';
    return;
  }

  
  leaderboardStatus.innerText = '⏳ 登記中...';
  leaderboardStatus.style.color = '#999';
  submitScoreBtn.disabled = true;
  
  try {
    const playerData = {
      playerName: playerName,
      score: gameState.score,
      difficulty: currentDifficulty?.name || '未知',
      mode: gameState.mode,
      duration: gameState.mode === 'infinite' ? gameState.elapsedSeconds : null,
      finishedAt: new Date().toISOString(),
      wordCount: gameState.caughtFishCount
    };
    
    // 保存分數
    const saveResult = await LEADERBOARD_API.saveScore(playerData);

    if (saveResult.duplicate) {
      leaderboardStatus.innerText = '❌ 已登記，無法重複登記相同分數';
      leaderboardStatus.style.color = '#ff6b6b';
      submitScoreBtn.disabled = false;
      return;
    }

    const playerRank = saveResult.rank || null;
    
    leaderboardStatus.innerHTML = playerRank
      ? `✅ 成功登記！排名：<strong>#${playerRank}</strong>`
      : '✅ 成功登記！請刷新排行榜查看排名。';
    leaderboardStatus.style.color = '#4CAF50';
    
    // 刷新排行榜預覽
    await displayLeaderboardPreview();
    
    // 更新按鈕狀態
    submitScoreBtn.innerText = '已登記';
    
  } catch (error) {
    console.error('❌ 登記失敗:', error);
    leaderboardStatus.innerHTML = '❌ 登記失敗，請重試';
    leaderboardStatus.style.color = '#ff6b6b';
    submitScoreBtn.disabled = false;
  }
}

/**
 * 跳過分數登記，返回首頁
 */
function skipScoreRegistration() {
  // 關閉遊戲結束模態框
  document.getElementById('gameOverModal').style.display = 'none';
  
  // 顯示開始畫面
  document.getElementById('startScreen').style.display = 'flex';
  
  // 恢復背景圖片
  document.body.style.backgroundImage = "url('主頁.png')";
  
  // 清空遊戲區域
  document.getElementById('sea').innerHTML = '';
  
  // 重置遊戲狀態
  gameState.score = 0;
  gameState.timeLeft = 60;
  gameState.combo = 0;
  gameState.typed = "";
  gameState.fishCount = 0;
  gameState.caughtFishCount = 0; // 重置已釣魚數
  gameState.isRunning = false;
  
  // 隱藏遊戲區域
  document.getElementById('game').style.display = 'none';
  
  // 更新顯示的金錢
  document.getElementById('startMoney').innerText = StorageManager.getMoney();
  
  // 更新UI
  updateUI();
}

/**
 * 打開排行榜視窗
 */
async function openLeaderboard() {
  const leaderboardModal = document.getElementById('leaderboardModal');
  const loadingEl = document.getElementById('leaderboardLoading');
  const emptyEl = document.getElementById('leaderboardEmpty');
  const tableBody = document.getElementById('leaderboardTableBody');
  const noticeEl = document.getElementById('leaderboardNotice');
  
  // 顯示加載狀態
  loadingEl.style.display = 'block';
  emptyEl.style.display = 'none';
  tableBody.innerHTML = '';
  
  leaderboardModal.style.display = 'flex';
  
  currentLeaderboardDifficulty = '全部';
  renderLeaderboardTabs();

  // 加載排行榜數據
  await loadLeaderboard();
}

async function displayLeaderboardPreview() {
  await loadLeaderboard();
}

function renderLeaderboardTabs() {
  const tabsContainer = document.getElementById('leaderboardTabs');
  if (!tabsContainer) return;

  tabsContainer.innerHTML = LEADERBOARD_DIFFICULTIES.map(label => {
    const activeClass = currentLeaderboardDifficulty === label ? 'active' : '';
    return `<button class="leaderboard-tab-btn ${activeClass}" onclick="selectLeaderboardDifficulty('${label}')">${label}</button>`;
  }).join('');
}

function selectLeaderboardDifficulty(label) {
  currentLeaderboardDifficulty = label;
  currentLeaderboardPage = 1;
  renderLeaderboardTabs();
  renderLeaderboardPage(1);
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  return `${year}年${month}月${day}日 ${hour}:${minute}`;
}

function getFilteredLeaderboard() {
  if (currentLeaderboardDifficulty === '全部') return currentLeaderboard;
  return currentLeaderboard.filter(item => item.difficulty === currentLeaderboardDifficulty);
}

function getLeaderboardPageCount() {
  const filtered = getFilteredLeaderboard();
  return Math.max(1, Math.ceil(filtered.length / LEADERBOARD_PAGE_SIZE));
}

function renderLeaderboardPage(page = 1) {
  const tableBody = document.getElementById('leaderboardTableBody');
  const paginationContainer = document.getElementById('leaderboardPagination');
  const emptyEl = document.getElementById('leaderboardEmpty');

  const filtered = getFilteredLeaderboard();
  const totalPages = Math.max(1, Math.ceil(filtered.length / LEADERBOARD_PAGE_SIZE));
  currentLeaderboardPage = Math.min(Math.max(page, 1), totalPages);

  const startIndex = (currentLeaderboardPage - 1) * LEADERBOARD_PAGE_SIZE;
  const endIndex = startIndex + LEADERBOARD_PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, endIndex);

  if (pageItems.length === 0) {
    tableBody.innerHTML = '';
    paginationContainer.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';
  tableBody.innerHTML = '';

  pageItems.forEach((player, index) => {
    const row = document.createElement('tr');
    const globalIndex = startIndex + index;
    const timeCell = player.mode === 'infinite'
      ? formatDuration(player.duration || 0)
      : player.finishedAt
        ? formatDate(player.finishedAt)
        : player.timestamp
          ? formatDate(player.timestamp)
          : '-';

    row.innerHTML = `
      <td>#${globalIndex + 1}</td>
      <td>${player.playerName}</td>
      <td style="color: #ff6b6b; font-weight: bold;">${player.score}</td>
      <td>${player.difficulty || '未知'}</td>
      <td style="font-size: 12px; color: #999;">${timeCell}</td>
    `;

    tableBody.appendChild(row);
  });

  renderLeaderboardPagination();
}

function renderLeaderboardPagination() {
  const paginationContainer = document.getElementById('leaderboardPagination');
  if (!paginationContainer) return;

  const totalPages = getLeaderboardPageCount();
  const hasMultiplePages = totalPages > 1;

  if (!hasMultiplePages) {
    paginationContainer.innerHTML = '';
    return;
  }

  const prevDisabled = currentLeaderboardPage === 1 ? 'disabled' : '';
  const nextDisabled = currentLeaderboardPage === totalPages ? 'disabled' : '';

  paginationContainer.innerHTML = `
    <button class="pagination-btn" onclick="changeLeaderboardPage(${currentLeaderboardPage - 1})" ${prevDisabled}>上一頁</button>
    <span class="pagination-info">第 ${currentLeaderboardPage} 頁 / 共 ${totalPages} 頁</span>
    <button class="pagination-btn" onclick="changeLeaderboardPage(${currentLeaderboardPage + 1})" ${nextDisabled}>下一頁</button>
  `;
}

function changeLeaderboardPage(page) {
  renderLeaderboardPage(page);
}

/**
 * 關閉排行榜視窗
 */
function closeLeaderboard() {
  document.getElementById('leaderboardModal').style.display = 'none';
}

/**
 * 加載並顯示排行榜
 */
async function loadLeaderboard() {
  const loadingEl = document.getElementById('leaderboardLoading');
  const emptyEl = document.getElementById('leaderboardEmpty');
  const tableBody = document.getElementById('leaderboardTableBody');
  
  try {
    const leaderboard = await LEADERBOARD_API.getLeaderboard();
    
    loadingEl.style.display = 'none';
    
    if (leaderboard.length === 0) {
      currentLeaderboard = [];
      currentLeaderboardPage = 1;
      emptyEl.style.display = 'block';
      tableBody.innerHTML = '';
      renderLeaderboardPagination();
      return;
    }
    
    currentLeaderboard = leaderboard;
    currentLeaderboardPage = 1;
    renderLeaderboardTabs();
    renderLeaderboardPage(1);
    
  } catch (error) {
    console.error('❌ 加載排行榜失敗:', error);
    loadingEl.style.display = 'none';
    emptyEl.innerText = '❌ 無法加載排行榜，請檢查網絡連接';
    emptyEl.style.display = 'block';
  }
}

/**
 * 外部點擊關閉排行榜模態框
 */
window.addEventListener('click', (e) => {
  const leaderboardModal = document.getElementById('leaderboardModal');
  if (e.target === leaderboardModal) {
    closeLeaderboard();
  }
});

/**
 * 初始化排行榜（頁面加載時）
 */
document.addEventListener('DOMContentLoaded', () => {
  const savedLeaderboard = JSON.parse(localStorage.getItem('fishinGameLeaderboard') || '[]');
  const sampleNames = ['釣魚高手', '快速打字員', '新手玩家'];
  const isSampleData = Array.isArray(savedLeaderboard) && savedLeaderboard.length > 0 && savedLeaderboard.every(entry => sampleNames.includes(entry.playerName));

  if (!Array.isArray(savedLeaderboard) || savedLeaderboard.length === 0 || isSampleData) {
    localStorage.setItem('fishinGameLeaderboard', JSON.stringify([]));
  }
});
