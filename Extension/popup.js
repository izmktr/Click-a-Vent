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
  
  // 期間ボタンを読み込んでからイベントリスナーを設定
  await loadDurationButtons();
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

// 期間ボタンの読み込みと生成
async function loadDurationButtons() {
  try {
    const data = await chrome.storage.sync.get(['durationButtons', 'customInputPosition']);
    const durationButtons = data.durationButtons || [
      { name: '0分', duration: '0m', isDefault: false, minutes: 0 },
      { name: '10分', duration: '10m', isDefault: false, minutes: 10 },
      { name: '30分', duration: '30m', isDefault: false, minutes: 30 },
      { name: '1時間', duration: '1h', isDefault: true, minutes: 60 },
      { name: '2時間', duration: '2h', isDefault: false, minutes: 120 },
      { name: '4時間', duration: '4h', isDefault: false, minutes: 240 },
      { name: '8時間', duration: '8h', isDefault: false, minutes: 480 }
    ];
    const customInputPosition = data.customInputPosition || 'end';
    
    const container = document.getElementById('duration-buttons-container');
    container.innerHTML = '';
    
    // デフォルトのボタンを探す
    let defaultButton = durationButtons.find(btn => btn.isDefault);
    
    // デフォルトがない場合は0分のボタンを探す
    if (!defaultButton) {
      defaultButton = durationButtons.find(btn => btn.minutes === 0);
    }
    
    // それでもない場合は最初のボタン
    if (!defaultButton && durationButtons.length > 0) {
      defaultButton = durationButtons[0];
    }
    
    // 自由入力欄を作成
    const customInput = document.createElement('input');
    customInput.type = 'text';
    customInput.id = 'custom-duration';
    customInput.className = 'duration-input';
    customInput.placeholder = '30m, 2h, 2h30m';
    
    // 先頭に自由入力欄を配置
    if (customInputPosition === 'start') {
      container.appendChild(customInput);
    }
    
    // ボタンを生成
    durationButtons.forEach(button => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'duration-btn';
      btn.dataset.minutes = button.minutes;
      btn.textContent = button.name;
      
      // デフォルトのボタンにactiveクラスを追加
      if (button === defaultButton) {
        btn.classList.add('active');
        selectedDurationMinutes = button.minutes;
      }
      
      container.appendChild(btn);
    });
    
    // 末尾に自由入力欄を配置
    if (customInputPosition === 'end') {
      container.appendChild(customInput);
    }
    
    // 非表示の場合は何もしない（customInputは追加されない）
    
  } catch (error) {
    console.error('期間ボタンの読み込みエラー:', error);
    // エラー時はデフォルトのボタンを表示
    const container = document.getElementById('duration-buttons-container');
    container.innerHTML = `
      <button type="button" class="duration-btn" data-minutes="0">0分</button>
      <button type="button" class="duration-btn" data-minutes="10">10分</button>
      <button type="button" class="duration-btn" data-minutes="30">30分</button>
      <button type="button" class="duration-btn active" data-minutes="60">1時間</button>
      <button type="button" class="duration-btn" data-minutes="120">2時間</button>
      <button type="button" class="duration-btn" data-minutes="240">4時間</button>
      <button type="button" class="duration-btn" data-minutes="480">8時間</button>
      <input type="text" id="custom-duration" class="duration-input" placeholder="30m, 2h, 2h30m">
    `;
    selectedDurationMinutes = 60;
  }
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
  
  const trimmed = str.trim();
  
  // 数値が0の場合は例外的にサフィックスなしでも0を返す
  if (trimmed === '0') {
    return 0;
  }
  
  let totalMinutes = 0;
  // 数値+単位のパターンにマッチ (整数または小数)
  const regex = /(\d+\.?\d*)\s*([smhd])/gi;
  let match;
  let hasMatch = false;
  
  while ((match = regex.exec(str)) !== null) {
    hasMatch = true;
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
  
  // マッチがなかった場合はnullを返す
  if (!hasMatch) return null;
  
  // 0以上の値を返す（0mなども許容）
  return totalMinutes >= 0 ? Math.round(totalMinutes) : null;
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

// 日付・時刻テキストをISO形式に変換
async function parseDateTimeText(dateTimeText) {
  try {
    // 設定から日付・時刻フォーマットを取得
    const settings = await chrome.storage.sync.get(['dateFormats', 'timeFormats']);
    const dateFormats = (settings.dateFormats || '%Y年%M月%D日\n%M月%D日\n%M/%D').split('\n').filter(f => f.trim());
    const timeFormats = (settings.timeFormats || '%H:%M\n%H：%M\n%H時%M分\n%H時').split('\n').filter(f => f.trim());
    
    // 日付を抽出
    const dateInfo = extractDateFromText(dateTimeText, dateFormats);
    
    // 日付マッチ部分を削除したテキストで時刻を抽出
    let textForTime = dateTimeText;
    if (dateInfo && dateInfo.matchedText) {
      textForTime = dateTimeText.replace(dateInfo.matchedText, '');
    }
    
    // 時刻を抽出
    const timeInfo = extractTimeFromText(textForTime, timeFormats);
    
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
    
    // URLがマッチする設定を検索
    const matchedConfig = autoConfigs.find(config => {
      return matchesUrlPattern(currentUrl, config.url, config.useRegex);
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
