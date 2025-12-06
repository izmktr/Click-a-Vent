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
const skipLoginBtn = document.getElementById('skip-login-btn');
const closeLoginBtn = document.getElementById('close-login-btn');
const showSetupGuideBtn = document.getElementById('show-setup-guide');
const selectFromPageBtn = document.getElementById('select-from-page-btn');
const registerBtn = document.getElementById('register-btn');
const closeMainBtn = document.getElementById('close-main-btn');
const openCalendarBtn = document.getElementById('open-calendar-btn');
const settingsBtn = document.getElementById('settings-btn');
const helpBtn = document.getElementById('help-btn');

const eventNameInput = document.getElementById('event-name');
const eventDateInput = document.getElementById('event-date');
const eventLocationInput = document.getElementById('event-location');

let selectedDurationMinutes = 60; // デフォルトは1時間

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  await checkLoginStatus();
  setupEventListeners();
  
  // storageから選択されたデータを取得
  const result = await chrome.storage.local.get(['selectedData']);
  if (result.selectedData) {
    await loadSelectedData(result.selectedData);
    // 使用後はクリア
    await chrome.storage.local.remove(['selectedData']);
  }
});
// イベントリスナーの設定
function setupEventListeners() {
  loginBtn.addEventListener('click', handleLogin);
  skipLoginBtn.addEventListener('click', handleSkipLogin);
  closeLoginBtn.addEventListener('click', () => window.close());
  closeMainBtn.addEventListener('click', () => window.close());
  showSetupGuideBtn.addEventListener('click', showSetupGuide);
  selectFromPageBtn.addEventListener('click', handleSelectFromPage);
  registerBtn.addEventListener('click', handleRegister);
  openCalendarBtn.addEventListener('click', handleOpenCalendar);
  settingsBtn.addEventListener('click', handleSettings);
  helpBtn.addEventListener('click', handleHelp);
  
  // 終了時刻ボタンのイベントリスナー
  const durationButtons = document.querySelectorAll('.duration-btn');
  durationButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // すべてのボタンからactiveクラスを削除
      durationButtons.forEach(b => b.classList.remove('active'));
      // クリックされたボタンにactiveクラスを追加
      e.target.classList.add('active');
      // 選択された時間を保存
      selectedDurationMinutes = parseInt(e.target.dataset.minutes);
    });
  });
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
    // OAuth設定の確認
    const manifest = chrome.runtime.getManifest();
    if (!manifest.oauth2 || manifest.oauth2.client_id === 'YOUR_CLIENT_ID.apps.googleusercontent.com') {
      showStatusMessage('エラー: manifest.jsonにGoogle OAuth Client IDを設定してください。詳細はREADME.mdを参照してください。', 'error');
      console.error('OAuth2 Client IDが設定されていません');
      return;
    }

    showStatusMessage('Googleアカウントでログインしています...', 'info');
    
    const token = await getAuthToken();
    if (token) {
      currentToken = token;
      await chrome.storage.local.set({ accessToken: token });
      showMainScreen();
      showStatusMessage('ログインに成功しました！', 'success');
    }
  } catch (error) {
    console.error('ログインエラー:', error);
    let errorMessage = 'ログインに失敗しました。';
    
    if (error.message) {
      errorMessage += '\n詳細: ' + error.message;
    }
    
    // 開発中のための詳細なエラー情報
    if (error.message && error.message.includes('OAuth2')) {
      errorMessage = 'OAuth2の設定が必要です。README.mdの「Google Cloud Consoleでの設定」セクションを参照してください。';
    }
    
    showStatusMessage(errorMessage, 'error');
  }
}

// 認証トークンの取得
function getAuthToken() {
  return new Promise((resolve, reject) => {
    if (!chrome.identity || !chrome.identity.getAuthToken) {
      reject(new Error('Chrome Identity APIが利用できません'));
      return;
    }
    
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}

// ログインスキップ（テスト用）
function handleSkipLogin() {
  currentToken = 'TEST_MODE';
  showMainScreen();
  showStatusMessage('テストモードで起動しました。Google Calendarへの登録は行われません。', 'info');
}

// セットアップガイドの表示
function showSetupGuide(e) {
  e.preventDefault();
  const guideText = `【Google Cloud Console セットアップ手順】

1. https://console.cloud.google.com/ にアクセス
2. 新しいプロジェクトを作成
3. 「APIとサービス」→「ライブラリ」から「Google Calendar API」を検索して有効化
4. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuth クライアントID」
5. アプリケーションの種類: 「Chrome拡張機能」を選択
6. 拡張機能のID: chrome://extensions/ で確認したIDを入力
7. 作成したクライアントIDをコピー
8. manifest.jsonの"oauth2"セクションの"client_id"に貼り付け

詳細はREADME.mdを参照してください。`;
  
  alert(guideText);
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
    
    if (!tab || !tab.id) {
      showStatusMessage('アクティブなタブが見つかりません。', 'error');
      return;
    }

    // chrome:// や edge:// などの特殊なURLではコンテンツスクリプトを注入できない
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
      showStatusMessage('このページではコンテンツスクリプトを実行できません。通常のWebページで試してください。', 'error');
      return;
    }

    try {
      // コンテンツスクリプトが既に注入されているか確認
      await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
    } catch (error) {
      // コンテンツスクリプトが注入されていない場合は注入する
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css']
        });
        
        // スクリプトの読み込みを待つ
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (injectError) {
        console.error('コンテンツスクリプト注入エラー:', injectError);
        showStatusMessage('コンテンツスクリプトの注入に失敗しました。ページを再読み込みしてください。', 'error');
        return;
      }
    }
    
    // コンテンツスクリプトに選択モード開始を通知
    await chrome.tabs.sendMessage(tab.id, { 
      action: 'startSelection',
      fields: ['eventName', 'dateTime', 'location']
    });
    
    // ポップアップを閉じる
    window.close();
  } catch (error) {
    console.error('選択モード開始エラー:', error);
    showStatusMessage('ページからの選択に失敗しました。エラー: ' + error.message, 'error');
  }
}

// イベント登録処理
async function handleRegister() {
  try {
    // 入力値の取得
    const eventName = eventNameInput.value.trim();
    const eventDate = eventDateInput.value;
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

    // テストモードの場合
    if (currentToken === 'TEST_MODE') {
      showStatusMessage('テストモード: イベント情報を確認しました（実際の登録は行われません）', 'info');
      console.log('テストモード - イベント情報:', { eventName, eventDate, duration: selectedDurationMinutes, eventLocation });
      
      // フォームをクリア
      eventNameInput.value = '';
      eventDateInput.value = '';
      eventLocationInput.value = '';
      
      return;
    }

    // 終了時刻の処理（選択された経過時間を追加）
    const startDate = new Date(eventDate);
    const endDateTime = new Date(startDate.getTime() + selectedDurationMinutes * 60 * 1000);

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
  chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
}

// Googleカレンダーを開く
function handleOpenCalendar() {
  chrome.tabs.create({ url: 'https://calendar.google.com' });
}

// ヘルプボタン
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

// 選択されたデータをフォームに読み込む
async function loadSelectedData(data) {
  if (data.eventName) {
    eventNameInput.value = data.eventName;
  }
  if (data.dateTime) {
    // 日付・時刻テキストをISO形式に変換
    const parsedDateTime = await parseDateTimeText(data.dateTime);
    eventDateInput.value = parsedDateTime;
  }
  if (data.location) {
    eventLocationInput.value = data.location;
  }
  
  showStatusMessage('ページから情報を取得しました！', 'success');
}

// コンテンツスクリプトからのメッセージを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'selectedData') {
    // 選択されたデータをフォームに入力
    loadSelectedData(request.data);
    sendResponse({ success: true });
  }
  return true;
});

// テキストから日付を抽出
function extractDateFromText(text, formatList) {
  if (!text) return null;
  
  for (const format of formatList) {
    // %Y, %M, %D をそれぞれ正規表現パターンに変換
    let pattern = format
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 特殊文字をエスケープ
      .replace(/%Y/g, '(\\d{4})') // 年: 4桁の数字
      .replace(/%M/g, '(\\d{1,2})') // 月: 1-2桁の数字
      .replace(/%D/g, '(\\d{1,2})'); // 日: 1-2桁の数字
    
    const regex = new RegExp(pattern);
    const match = text.match(regex);
    
    if (match) {
      // フォーマットから年月日の位置を判定
      const formatParts = format.match(/%[YMD]/g) || [];
      const result = {};
      
      formatParts.forEach((part, index) => {
        if (part === '%Y') result.year = match[index + 1];
        if (part === '%M') result.month = match[index + 1];
        if (part === '%D') result.day = match[index + 1];
      });
      
      // 年が取得できた場合は年月日形式で返す
      if (result.year && result.month && result.day) {
        return {
          year: result.year,
          month: result.month.padStart(2, '0'),
          day: result.day.padStart(2, '0')
        };
      }
    }
  }
  
  return null;
}

// テキストから時刻を抽出
function extractTimeFromText(text, formatList) {
  if (!text) return null;
  
  for (const format of formatList) {
    // %H, %M を正規表現パターンに変換
    let pattern = format
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 特殊文字をエスケープ
      .replace(/%H/g, '(\\d{1,2})') // 時: 1-2桁の数字
      .replace(/%M/g, '(\\d{1,2})'); // 分: 1-2桁の数字
    
    const regex = new RegExp(pattern);
    const match = text.match(regex);
    
    if (match) {
      // フォーマットから時分の位置を判定
      const formatParts = format.match(/%[HM]/g) || [];
      const result = {};
      
      formatParts.forEach((part, index) => {
        if (part === '%H') result.hour = match[index + 1];
        if (part === '%M') result.minute = match[index + 1];
      });
      
      // 時刻を返す
      if (result.hour !== undefined) {
        return {
          hour: result.hour.padStart(2, '0'),
          minute: (result.minute || '00').padStart(2, '0')
        };
      }
    }
  }
  
  return null;
}

// 日付・時刻テキストをISO形式に変換
async function parseDateTimeText(dateTimeText) {
  try {
    // 設定から日付・時刻フォーマットを取得
    const settings = await chrome.storage.sync.get(['dateFormats', 'timeFormats']);
    const dateFormats = (settings.dateFormats || '%Y年%M月%D日\n%M月%D日\n%M/%D').split('\n').filter(f => f.trim());
    const timeFormats = (settings.timeFormats || '%H:%M\n%H：%M\n%H時%M分\n%H時').split('\n').filter(f => f.trim());
    
    // 日付を抽出
    const dateInfo = extractDateFromText(dateTimeText, dateFormats);
    
    // 時刻を抽出
    const timeInfo = extractTimeFromText(dateTimeText, timeFormats);
    
    if (!dateInfo && !timeInfo) {
      // 抽出失敗 - 元のテキストをそのまま返す
      return dateTimeText;
    }
    
    // ISO形式の日時文字列を構築
    const now = new Date();
    const year = dateInfo?.year || now.getFullYear();
    const month = dateInfo?.month || String(now.getMonth() + 1).padStart(2, '0');
    const day = dateInfo?.day || String(now.getDate()).padStart(2, '0');
    const hour = timeInfo?.hour || '00';
    const minute = timeInfo?.minute || '00';
    
    // datetime-local形式 (YYYY-MM-DDTHH:mm)
    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch (error) {
    console.error('日付・時刻の解析エラー:', error);
    return dateTimeText;
  }
}
