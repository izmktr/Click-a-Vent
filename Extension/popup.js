// グローバル変数
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
  showMainScreen();
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
  closeMainBtn.addEventListener('click', () => window.close());
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

// 画面表示の切り替え
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

    // 終了時刻の計算（選択された経過時間を追加）
    const startDate = new Date(eventDate);
    const endDate = new Date(startDate.getTime() + selectedDurationMinutes * 60 * 1000);

    // Googleカレンダーの日時フォーマット（YYYYMMDDTHHmmss形式）
    const formatGoogleDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = '00';
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };

    // GoogleカレンダーのURLを構築
    const calendarUrl = new URL('https://calendar.google.com/calendar/render');
    calendarUrl.searchParams.set('action', 'TEMPLATE');
    calendarUrl.searchParams.set('text', eventName);
    calendarUrl.searchParams.set('dates', `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`);
    
    if (eventLocation) {
      calendarUrl.searchParams.set('location', eventLocation);
    }

    // 新しいタブでGoogleカレンダーの登録画面を開く
    await chrome.tabs.create({ url: calendarUrl.toString() });

    showStatusMessage('Googleカレンダーの登録画面を開きました！', 'success');
    
    // フォームをクリア
    eventNameInput.value = '';
    eventDateInput.value = '';
    eventLocationInput.value = '';
    
    // 少し待ってからポップアップを閉じる
    setTimeout(() => {
      window.close();
    }, 1000);
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
