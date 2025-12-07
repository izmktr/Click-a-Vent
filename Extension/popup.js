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
const eventEndDateInput = document.getElementById('event-end-date');
const eventLocationInput = document.getElementById('event-location');

let selectedDurationMinutes = 60; // デフォルトは1時間

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  showMainScreen();
  setupEventListeners();
  
  // 自動設定のチェックと適用
  await checkAndApplyAutoConfig();
  
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
      // カスタム入力をクリア
      document.getElementById('custom-duration').value = '';
      // クリックされたボタンにactiveクラスを追加
      e.target.classList.add('active');
      // 選択された時間を保存
      selectedDurationMinutes = parseInt(e.target.dataset.minutes);
      updateEndDateTime();
    });
  });
  
  // カスタム時間入力のイベントリスナー
  const customDurationInput = document.getElementById('custom-duration');
  customDurationInput.addEventListener('input', (e) => {
    const minutes = parseDurationString(e.target.value);
    if (minutes !== null) {
      // すべてのボタンからactiveクラスを削除
      durationButtons.forEach(b => b.classList.remove('active'));
      selectedDurationMinutes = minutes;
      updateEndDateTime();
    }
  });
  
  // 開始日時変更時に終了日時を更新
  eventDateInput.addEventListener('change', updateEndDateTime);
  
  // 終了日時直接入力時のイベントリスナー
  eventEndDateInput.addEventListener('change', handleEndDateChange);
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

    // 終了日時の取得（直接入力されている場合はそれを使用）
    const endDateTime = eventEndDateInput.value;
    let endDate;
    
    if (endDateTime) {
      endDate = new Date(endDateTime);
    } else {
      // 終了日時が入力されていない場合は選択された経過時間を使用
      const startDate = new Date(eventDate);
      endDate = new Date(startDate.getTime() + selectedDurationMinutes * 60 * 1000);
    }

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
    
    const startDate = new Date(eventDate);

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

  setTimeout(() => messageDiv.remove(), 3000);
}

// 時間文字列をパース（例: "2h30m", "0.5h", "30m", "1d"）
function parseDurationString(str) {
  if (!str || !str.trim()) return null;
  
  let totalMinutes = 0;
  // 数値+単位のパターンにマッチ (整数または小数)
  const regex = /(\d+\.?\d*)\s*([smhd])/gi;
  let match;
  
  while ((match = regex.exec(str)) !== null) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 's': // 秒
        totalMinutes += value / 60;
        break;
      case 'm': // 分
        totalMinutes += value;
        break;
      case 'h': // 時
        totalMinutes += value * 60;
        break;
      case 'd': // 日
        totalMinutes += value * 60 * 24;
        break;
    }
  }
  
  return totalMinutes > 0 ? Math.round(totalMinutes) : null;
}

// 終了日時を更新
function updateEndDateTime() {
  const startDateTime = eventDateInput.value;
  
  if (!startDateTime) {
    eventEndDateInput.value = '';
    return;
  }
  
  const startDate = new Date(startDateTime);
  const endDate = new Date(startDate.getTime() + selectedDurationMinutes * 60 * 1000);
  
  // datetime-local形式でフォーマット (YYYY-MM-DDTHH:MM)
  const year = endDate.getFullYear();
  const month = String(endDate.getMonth() + 1).padStart(2, '0');
  const day = String(endDate.getDate()).padStart(2, '0');
  const hours = String(endDate.getHours()).padStart(2, '0');
  const minutes = String(endDate.getMinutes()).padStart(2, '0');
  
  eventEndDateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
}

// 終了日時が直接変更された時の処理
function handleEndDateChange() {
  const startDateTime = eventDateInput.value;
  const endDateTime = eventEndDateInput.value;
  
  if (!startDateTime || !endDateTime) return;
  
  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);
  
  // 経過時間を分単位で計算
  const diffMinutes = Math.round((endDate - startDate) / (1000 * 60));
  
  // 対応するボタンがあるか確認
  const durationButtons = document.querySelectorAll('.duration-btn');
  let foundButton = false;
  
  durationButtons.forEach(btn => {
    const btnMinutes = parseInt(btn.dataset.minutes);
    if (btnMinutes === diffMinutes) {
      // すべてのボタンからactiveクラスを削除
      durationButtons.forEach(b => b.classList.remove('active'));
      // 対応するボタンを選択
      btn.classList.add('active');
      foundButton = true;
      selectedDurationMinutes = diffMinutes;
      // カスタム入力をクリア
      document.getElementById('custom-duration').value = '';
    }
  });
  
  // 対応するボタンがない場合
  if (!foundButton) {
    // すべてのボタンからactiveクラスを削除
    durationButtons.forEach(b => b.classList.remove('active'));
    selectedDurationMinutes = diffMinutes;
    // カスタム入力にも表示しない（直接入力されたため）
    document.getElementById('custom-duration').value = '';
  }
}

// 選択されたデータをフォームに読み込む
async function loadSelectedData(data, showMessage = true) {
  if (data.eventName) {
    eventNameInput.value = data.eventName;
  }
  if (data.dateTime) {
    // 日付・時刻テキストをISO形式に変換
    const parsedDateTime = await parseDateTimeText(data.dateTime);
    eventDateInput.value = parsedDateTime;
    // 終了日時を更新
    updateEndDateTime();
  }
  if (data.location) {
    eventLocationInput.value = data.location;
  }
  
  if (showMessage) {
    showStatusMessage('ページから情報を取得しました！', 'success');
  }
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
      
      // 年がない場合は現在の年を使用し、3ヶ月以上過去なら来年にする
      if (!result.year && result.month && result.day) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const month = parseInt(result.month);
        const day = parseInt(result.day);
        
        // 現在の年で日付を作成
        const targetDate = new Date(currentYear, month - 1, day);
        
        // 現在の日付との差を計算（ミリ秒）
        const diffMs = now - targetDate;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        // 3ヶ月（約90日）以上過去の場合は来年の日付とする
        if (diffDays > 90) {
          return {
            year: (currentYear + 1).toString(),
            month: result.month.padStart(2, '0'),
            day: result.day.padStart(2, '0')
          };
        } else {
          return {
            year: currentYear.toString(),
            month: result.month.padStart(2, '0'),
            day: result.day.padStart(2, '0')
          };
        }
      }
    }
  }
  
  return null;
}

// テキストから時刻を抽出
function extractTimeFromText(text, formatList) {
  if (!text) return null;
  
  for (const format of formatList) {
    // %P, %H, %M を正規表現パターンに変換
    let pattern = format
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 特殊文字をエスケープ
      .replace(/%P/g, '(午前|午後)') // 午前/午後
      .replace(/%H/g, '(\\d{1,2})') // 時: 1-2桁の数字
      .replace(/%M/g, '(\\d{1,2})'); // 分: 1-2桁の数字
    
    const regex = new RegExp(pattern);
    const match = text.match(regex);
    
    if (match) {
      // フォーマットから午前/午後・時分の位置を判定
      const formatParts = format.match(/%[PHM]/g) || [];
      const result = {};
      
      formatParts.forEach((part, index) => {
        if (part === '%P') result.period = match[index + 1];
        if (part === '%H') result.hour = match[index + 1];
        if (part === '%M') result.minute = match[index + 1];
      });
      
      // 時刻を返す
      if (result.hour !== undefined) {
        let hour = parseInt(result.hour);
        
        // 午後の場合は12時間を加算（12時台はそのまま）
        if (result.period === '午後' && hour < 12) {
          hour += 12;
        }
        // 午前12時は0時に変換
        if (result.period === '午前' && hour === 12) {
          hour = 0;
        }
        
        return {
          hour: hour.toString().padStart(2, '0'),
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

// 自動設定のチェックと適用
async function checkAndApplyAutoConfig() {
  try {
    // 現在のタブのURLを取得
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;
    
    const currentUrl = tab.url;
    
    // chrome:// や edge:// などの特殊なURLはスキップ
    if (currentUrl.startsWith('chrome://') || currentUrl.startsWith('edge://') || currentUrl.startsWith('about:')) {
      return;
    }
    
    // 自動設定を取得
    const settings = await chrome.storage.sync.get(['autoConfigs']);
    const autoConfigs = settings.autoConfigs || [];
    
    if (autoConfigs.length === 0) return;
    
    // URLが正規表現にマッチする設定を検索
    const matchedConfig = autoConfigs.find(config => {
      try {
        const regex = new RegExp(config.url);
        return regex.test(currentUrl);
      } catch (e) {
        console.error('正規表現エラー:', config.url, e);
        return false;
      }
    });
    
    if (!matchedConfig) return;
    
    // マッチした設定を使ってページから情報を取得
    await applyAutoConfig(tab, matchedConfig);
    
  } catch (error) {
    console.error('自動設定の適用エラー:', error);
  }
}

// 自動設定を適用してページから情報を取得
async function applyAutoConfig(tab, config) {
  try {
    // コンテンツスクリプトが既に注入されているか確認
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
    } catch (error) {
      // コンテンツスクリプトが注入されていない場合は注入する
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content.css']
      });
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // XPathを使ってページから情報を取得
    const result = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractByXPath',
      xpaths: {
        eventName: config.eventXPath,
        dateTime: config.dateTimeXPath,
        location: config.locationXPath
      }
    });
    
    if (result && result.success) {
      // 取得したデータをフォームに設定（自動設定の場合はメッセージを表示しない）
      await loadSelectedData(result.data, false);
      
      // 自動設定インジケーターを表示
      showAutoConfigIndicator(config, result.data);
    }
  } catch (error) {
    console.error('自動設定の適用エラー:', error);
  }
}

// 自動設定インジケーターを表示
function showAutoConfigIndicator(config, data) {
  const indicator = document.getElementById('auto-config-indicator');
  const tooltip = document.getElementById('auto-config-tooltip');
  
  if (!indicator || !tooltip) return;
  
  // ツールチップの内容を作成
  let tooltipContent = `<div class="tooltip-row"><span class="tooltip-label">URL:</span> ${config.url}</div>`;
  
  if (data.eventName) {
    tooltipContent += `<div class="tooltip-row"><span class="tooltip-label">タイトル:</span> ${data.eventName}</div>`;
  }
  
  if (data.dateTime) {
    tooltipContent += `<div class="tooltip-row"><span class="tooltip-label">開始日時:</span> ${data.dateTime}</div>`;
  }
  
  if (data.location) {
    tooltipContent += `<div class="tooltip-row"><span class="tooltip-label">場所:</span> ${data.location}</div>`;
  }
  
  tooltip.innerHTML = tooltipContent;
  
  // インジケーターを表示
  indicator.classList.remove('hidden');
  
  // マウスオーバーでツールチップを表示
  indicator.addEventListener('mouseenter', () => {
    tooltip.classList.remove('hidden');
  });
  
  indicator.addEventListener('mouseleave', () => {
    tooltip.classList.add('hidden');
  });
}
