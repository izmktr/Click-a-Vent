// グローバル変数
let currentToken = null;
let selectionMode = null; // 'eventName', 'dateTime', 'location'
let eventData = {
  name: '',
  dateTime: '',
  endTime: '',
  location: ''
};

// DOM要素
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const loginBtn = document.getElementById('login-btn');
const closeLoginBtn = document.getElementById('close-login-btn');
const selectFromPageBtn = document.getElementById('select-from-page-btn');
const registerBtn = document.getElementById('register-btn');
const closeMainBtn = document.getElementById('close-main-btn');
const settingsBtn = document.getElementById('settings-btn');
const helpBtn = document.getElementById('help-btn');

const eventNameInput = document.getElementById('event-name');
const eventDateInput = document.getElementById('event-date');
const eventEndTimeInput = document.getElementById('event-end-time');
const eventLocationInput = document.getElementById('event-location');

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  await checkLoginStatus();
  setupEventListeners();
});

// イベントリスナーの設定
function setupEventListeners() {
  loginBtn.addEventListener('click', handleLogin);
  closeLoginBtn.addEventListener('click', () => window.close());
  closeMainBtn.addEventListener('click', () => window.close());
  selectFromPageBtn.addEventListener('click', handleSelectFromPage);
  registerBtn.addEventListener('click', handleRegister);
  settingsBtn.addEventListener('click', handleSettings);
  helpBtn.addEventListener('click', handleHelp);
}

// ログイン状態の確認
async function checkLoginStatus() {
  try {
    const result = await chrome.storage.local.get(['accessToken']);
    if (result.accessToken) {
      currentToken = result.accessToken;
      showMainScreen();
    } else {
      showLoginScreen();
    }
  } catch (error) {
    console.error('ログイン状態の確認エラー:', error);
    showLoginScreen();
  }
}

// ログイン処理
async function handleLogin() {
  try {
    const token = await getAuthToken();
    if (token) {
      currentToken = token;
      await chrome.storage.local.set({ accessToken: token });
      showMainScreen();
    }
  } catch (error) {
    console.error('ログインエラー:', error);
    showStatusMessage('ログインに失敗しました。', 'error');
  }
}

// 認証トークンの取得
function getAuthToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

// 画面表示の切り替え
function showLoginScreen() {
  loginScreen.classList.remove('hidden');
  mainScreen.classList.add('hidden');
}

function showMainScreen() {
  loginScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
}

// ページから情報を選択
async function handleSelectFromPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // コンテンツスクリプトに選択モード開始を通知
    await chrome.tabs.sendMessage(tab.id, { 
      action: 'startSelection',
      fields: ['eventName', 'dateTime', 'location']
    });
    
    // ポップアップを閉じる
    window.close();
  } catch (error) {
    console.error('選択モード開始エラー:', error);
    showStatusMessage('ページからの選択に失敗しました。', 'error');
  }
}

// イベント登録処理
async function handleRegister() {
  try {
    // 入力値の取得
    const eventName = eventNameInput.value.trim();
    const eventDate = eventDateInput.value;
    const eventEndTime = eventEndTimeInput.value;
    const eventLocation = eventLocationInput.value.trim();

    // バリデーション
    if (!eventName) {
      showStatusMessage('イベント名を入力してください。', 'error');
      return;
    }

    if (!eventDate) {
      showStatusMessage('日付と開始時刻を入力してください。', 'error');
      return;
    }

    // 終了時刻の処理
    let endDateTime = null;
    if (eventEndTime) {
      const startDate = new Date(eventDate);
      endDateTime = new Date(startDate);
      const [hours, minutes] = eventEndTime.split(':');
      endDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      // 終了時刻が指定されていない場合は開始時刻の1時間後
      endDateTime = new Date(new Date(eventDate).getTime() + 60 * 60 * 1000);
    }

    // Google Calendar APIへのリクエスト
    const event = {
      summary: eventName,
      start: {
        dateTime: new Date(eventDate).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    if (eventLocation) {
      event.location = eventLocation;
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (response.ok) {
      showStatusMessage('イベントを登録しました!', 'success');
      // フォームをクリア
      eventNameInput.value = '';
      eventDateInput.value = '';
      eventEndTimeInput.value = '';
      eventLocationInput.value = '';
      
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      const errorData = await response.json();
      console.error('Calendar API エラー:', errorData);
      
      // トークンが無効な場合は再ログイン
      if (response.status === 401) {
        await chrome.storage.local.remove('accessToken');
        currentToken = null;
        showLoginScreen();
        showStatusMessage('認証が切れました。再度ログインしてください。', 'error');
      } else {
        showStatusMessage('イベントの登録に失敗しました。', 'error');
      }
    }
  } catch (error) {
    console.error('登録エラー:', error);
    showStatusMessage('エラーが発生しました。', 'error');
  }
}

// 設定ボタン
function handleSettings() {
  alert('設定機能は今後追加予定です。');
}

// ヘルプボタン
function handleHelp() {
  const helpText = `【使い方】

1. 「ページから情報を入力」をクリック
2. ページ内の要素をクリックして選択
   - イベント名
   - 日付と開始時刻
   - 場所
3. 右クリックでスキップ可能
4. 「登録」ボタンでGoogleカレンダーに追加

※ 初回使用時はGoogleアカウントでのログインが必要です。`;
  
  alert(helpText);
}

// ステータスメッセージの表示
function showStatusMessage(message, type = 'info') {
  // 既存のメッセージを削除
  const existingMessage = document.querySelector('.status-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `status-message ${type}`;
  messageDiv.textContent = message;

  const mainScreen = document.getElementById('main-screen');
  const actionSection = document.querySelector('.action-section');
  mainScreen.insertBefore(messageDiv, actionSection);

  // 3秒後に自動削除
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 3000);
}

// コンテンツスクリプトからのメッセージを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'selectedData') {
    // 選択されたデータをフォームに入力
    if (request.data.eventName) {
      eventNameInput.value = request.data.eventName;
    }
    if (request.data.dateTime) {
      // 日付時刻の形式を変換
      eventDateInput.value = request.data.dateTime;
    }
    if (request.data.location) {
      eventLocationInput.value = request.data.location;
    }
  }
});
