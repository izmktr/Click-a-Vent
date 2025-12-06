// グローバル変数
let autoConfigs = [];
let selectedConfigIndex = -1;
let isNewMode = true;

// デフォルト設定
const DEFAULT_DATE_FORMATS = '%Y年%M月%D日\n%M月%D日\n%M/%D';
const DEFAULT_TIME_FORMATS = '%H:%M\n%H：%M\n%H時%M分\n%H時';

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupEventListeners();
  await loadSettings();
  await loadHistory();
});

// タブの設定
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      // すべてのタブとコンテンツから active を削除
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // クリックされたタブとコンテンツに active を追加
      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
}

// イベントリスナーの設定
function setupEventListeners() {
  // 自動設定
  document.getElementById('new-btn').addEventListener('click', handleNewConfig);
  document.getElementById('delete-btn').addEventListener('click', handleDeleteConfig);
  document.getElementById('move-up-btn').addEventListener('click', () => moveConfig(-1));
  document.getElementById('move-down-btn').addEventListener('click', () => moveConfig(1));
  document.getElementById('auto-config-form').addEventListener('submit', handleSubmitConfig);
  
  // フォーム入力監視
  const formInputs = ['config-url', 'config-event-xpath', 'config-datetime-xpath', 'config-location-xpath'];
  formInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', handleFormInput);
  });
  
  // 日付設定
  document.getElementById('date-format-input').addEventListener('input', () => {
    document.getElementById('save-date-btn').disabled = false;
  });
  document.getElementById('test-date-btn').addEventListener('click', testDateFormat);
  document.getElementById('save-date-btn').addEventListener('click', saveDateFormat);
  
  // 時刻設定
  document.getElementById('time-format-input').addEventListener('input', () => {
    document.getElementById('save-time-btn').disabled = false;
  });
  document.getElementById('test-time-btn').addEventListener('click', testTimeFormat);
  document.getElementById('save-time-btn').addEventListener('click', saveTimeFormat);
}

// 設定の読み込み
async function loadSettings() {
  try {
    const data = await chrome.storage.sync.get(['autoConfigs', 'dateFormats', 'timeFormats']);
    
    // 自動設定
    autoConfigs = data.autoConfigs || [];
    renderUrlList();
    
    // 日付設定
    document.getElementById('date-format-input').value = data.dateFormats || DEFAULT_DATE_FORMATS;
    
    // 時刻設定
    document.getElementById('time-format-input').value = data.timeFormats || DEFAULT_TIME_FORMATS;
  } catch (error) {
    console.error('設定の読み込みエラー:', error);
  }
}

// URLリストの描画
function renderUrlList() {
  const urlList = document.getElementById('url-list');
  urlList.innerHTML = '';
  
  if (autoConfigs.length === 0) {
    urlList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">登録なし</div>';
    return;
  }
  
  autoConfigs.forEach((config, index) => {
    const item = document.createElement('div');
    item.className = 'url-item';
    if (index === selectedConfigIndex) {
      item.classList.add('selected');
    }
    
    item.innerHTML = `<div class="url-item-text">${config.url}</div>`;
    item.addEventListener('click', () => selectConfig(index));
    urlList.appendChild(item);
  });
  
  updateControlButtons();
}

// 設定の選択
function selectConfig(index) {
  selectedConfigIndex = index;
  isNewMode = false;
  
  const config = autoConfigs[index];
  document.getElementById('config-url').value = config.url;
  document.getElementById('config-event-xpath').value = config.eventXPath;
  document.getElementById('config-datetime-xpath').value = config.dateTimeXPath || '';
  document.getElementById('config-location-xpath').value = config.locationXPath || '';
  
  // 編集フラグをリセット
  clearEditedFlags();
  
  // ボタンの更新
  document.getElementById('submit-config-btn').textContent = '更新';
  document.getElementById('submit-config-btn').disabled = true;
  
  renderUrlList();
}

// 新規作成
function handleNewConfig() {
  selectedConfigIndex = -1;
  isNewMode = true;
  
  // フォームをクリア
  document.getElementById('config-url').value = '';
  document.getElementById('config-event-xpath').value = '';
  document.getElementById('config-datetime-xpath').value = '';
  document.getElementById('config-location-xpath').value = '';
  
  clearEditedFlags();
  
  document.getElementById('submit-config-btn').textContent = '追加';
  document.getElementById('submit-config-btn').disabled = true;
  
  renderUrlList();
}

// 削除
async function handleDeleteConfig() {
  if (selectedConfigIndex === -1) return;
  
  if (!confirm('この設定を削除しますか？')) return;
  
  autoConfigs.splice(selectedConfigIndex, 1);
  await saveAutoConfigs();
  
  handleNewConfig();
}

// 移動
async function moveConfig(direction) {
  if (selectedConfigIndex === -1) return;
  
  const newIndex = selectedConfigIndex + direction;
  if (newIndex < 0 || newIndex >= autoConfigs.length) return;
  
  // 入れ替え
  [autoConfigs[selectedConfigIndex], autoConfigs[newIndex]] = 
  [autoConfigs[newIndex], autoConfigs[selectedConfigIndex]];
  
  selectedConfigIndex = newIndex;
  
  await saveAutoConfigs();
  renderUrlList();
}

// コントロールボタンの更新
function updateControlButtons() {
  const hasSelection = selectedConfigIndex !== -1;
  const canMoveUp = hasSelection && selectedConfigIndex > 0;
  const canMoveDown = hasSelection && selectedConfigIndex < autoConfigs.length - 1;
  
  document.getElementById('move-up-btn').disabled = !canMoveUp;
  document.getElementById('move-down-btn').disabled = !canMoveDown;
  document.getElementById('delete-btn').disabled = !hasSelection;
}

// フォーム入力の監視
function handleFormInput(e) {
  const url = document.getElementById('config-url').value.trim();
  const eventXPath = document.getElementById('config-event-xpath').value.trim();
  
  // 必須項目チェック
  const isValid = url && eventXPath;
  document.getElementById('submit-config-btn').disabled = !isValid;
  
  // 編集中フラグ
  if (!isNewMode && e.target.value !== '') {
    e.target.classList.add('edited');
  }
}

// 編集フラグのクリア
function clearEditedFlags() {
  document.querySelectorAll('#auto-config-form input').forEach(input => {
    input.classList.remove('edited', 'error');
  });
}

// 設定の送信
async function handleSubmitConfig(e) {
  e.preventDefault();
  
  const url = document.getElementById('config-url').value.trim();
  const eventXPath = document.getElementById('config-event-xpath').value.trim();
  const dateTimeXPath = document.getElementById('config-datetime-xpath').value.trim();
  const locationXPath = document.getElementById('config-location-xpath').value.trim();
  
  clearEditedFlags();
  
  // バリデーション
  if (!validateUrl(url)) {
    document.getElementById('config-url').classList.add('error');
    alert('URLの形式が不正です。');
    return;
  }
  
  if (!validateXPath(eventXPath)) {
    document.getElementById('config-event-xpath').classList.add('error');
    alert('イベント名のXPathが不正です。');
    return;
  }
  
  // URL競合チェック
  if (isUrlConflict(url, selectedConfigIndex)) {
    document.getElementById('config-url').classList.add('error');
    alert('このURLは既に登録されているURLと競合します。');
    return;
  }
  
  const config = {
    url,
    eventXPath,
    dateTimeXPath,
    locationXPath
  };
  
  if (isNewMode) {
    autoConfigs.push(config);
  } else {
    autoConfigs[selectedConfigIndex] = config;
  }
  
  await saveAutoConfigs();
  handleNewConfig();
}

// URL競合チェック
function isUrlConflict(url, currentIndex) {
  return autoConfigs.some((config, index) => {
    if (index === currentIndex) return false;
    // 前方一致チェック
    return url.startsWith(config.url) || config.url.startsWith(url);
  });
}

// URLバリデーション
function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// XPathバリデーション
function validateXPath(xpath) {
  if (!xpath) return true; // 空は許可
  try {
    document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
    return true;
  } catch {
    return false;
  }
}

// 自動設定の保存
async function saveAutoConfigs() {
  try {
    await chrome.storage.sync.set({ autoConfigs });
    renderUrlList();
  } catch (error) {
    console.error('保存エラー:', error);
    alert('保存に失敗しました。');
  }
}

// 日付フォーマットのテスト
async function testDateFormat() {
  const formats = document.getElementById('date-format-input').value;
  const result = document.getElementById('date-test-result');
  
  // 履歴を取得
  const data = await chrome.storage.local.get(['eventHistory']);
  const history = data.eventHistory || [];
  
  if (history.length === 0) {
    result.className = 'test-result show error';
    result.innerHTML = 'テスト用の履歴データがありません。';
    return;
  }
  
  // フォーマットリストを取得
  const formatList = formats.split('\n').filter(f => f.trim());
  
  // テスト結果を生成
  let html = '<div style="max-height: 400px; overflow-y: auto;">';
  html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
  html += '<thead><tr style="background: #f5f5f5; position: sticky; top: 0;">';
  html += '<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">URL</th>';
  html += '<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">日時テキスト</th>';
  html += '<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">抽出した日付</th>';
  html += '</tr></thead><tbody>';
  
  // 最大10件まで表示
  const testHistory = history.slice(0, 10);
  
  testHistory.forEach(item => {
    const extractedDate = extractDateFromText(item.dateTime || '', formatList);
    const urlShort = item.url.length > 50 ? item.url.substring(0, 50) + '...' : item.url;
    
    html += '<tr>';
    html += `<td style="padding: 8px; border: 1px solid #ddd; font-size: 11px;" title="${item.url}">${urlShort}</td>`;
    html += `<td style="padding: 8px; border: 1px solid #ddd;">${item.dateTime || '(なし)'}</td>`;
    html += `<td style="padding: 8px; border: 1px solid #ddd; ${extractedDate ? 'color: #1a73e8; font-weight: bold;' : 'color: #999;'}">${extractedDate || '抽出失敗'}</td>`;
    html += '</tr>';
  });
  
  html += '</tbody></table></div>';
  html += `<div style="margin-top: 10px; font-size: 12px; color: #666;">※ 最新10件の履歴でテストしました（全${history.length}件）</div>`;
  
  result.className = 'test-result show success';
  result.innerHTML = html;
}

// 日付フォーマットの保存
async function saveDateFormat() {
  const formats = document.getElementById('date-format-input').value;
  
  try {
    await chrome.storage.sync.set({ dateFormats: formats });
    alert('日付フォーマットを保存しました。');
    document.getElementById('save-date-btn').disabled = true;
  } catch (error) {
    console.error('保存エラー:', error);
    alert('保存に失敗しました。');
  }
}

// 時刻フォーマットのテスト
async function testTimeFormat() {
  const formats = document.getElementById('time-format-input').value;
  const result = document.getElementById('time-test-result');
  
  const data = await chrome.storage.local.get(['eventHistory']);
  const history = data.eventHistory || [];
  
  if (history.length === 0) {
    result.className = 'test-result show error';
    result.innerHTML = 'テスト用の履歴データがありません。';
    return;
  }
  
  // フォーマットリストを取得
  const formatList = formats.split('\n').filter(f => f.trim());
  
  // テスト結果を生成
  let html = '<div style="max-height: 400px; overflow-y: auto;">';
  html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
  html += '<thead><tr style="background: #f5f5f5; position: sticky; top: 0;">';
  html += '<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">URL</th>';
  html += '<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">日時テキスト</th>';
  html += '<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">抽出した時刻</th>';
  html += '</tr></thead><tbody>';
  
  // 最大10件まで表示
  const testHistory = history.slice(0, 10);
  
  testHistory.forEach(item => {
    const extractedTime = extractTimeFromText(item.dateTime || '', formatList);
    const urlShort = item.url.length > 50 ? item.url.substring(0, 50) + '...' : item.url;
    
    html += '<tr>';
    html += `<td style="padding: 8px; border: 1px solid #ddd; font-size: 11px;" title="${item.url}">${urlShort}</td>`;
    html += `<td style="padding: 8px; border: 1px solid #ddd;">${item.dateTime || '(なし)'}</td>`;
    html += `<td style="padding: 8px; border: 1px solid #ddd; ${extractedTime ? 'color: #1a73e8; font-weight: bold;' : 'color: #999;'}">${extractedTime || '抽出失敗'}</td>`;
    html += '</tr>';
  });
  
  html += '</tbody></table></div>';
  html += `<div style="margin-top: 10px; font-size: 12px; color: #666;">※ 最新10件の履歴でテストしました（全${history.length}件）</div>`;
  
  result.className = 'test-result show success';
  result.innerHTML = html;
}

// 時刻フォーマットの保存
async function saveTimeFormat() {
  const formats = document.getElementById('time-format-input').value;
  
  try {
    await chrome.storage.sync.set({ timeFormats: formats });
    alert('時刻フォーマットを保存しました。');
    document.getElementById('save-time-btn').disabled = true;
  } catch (error) {
    console.error('保存エラー:', error);
    alert('保存に失敗しました。');
  }
}

// 履歴の読み込み
async function loadHistory() {
  try {
    const data = await chrome.storage.local.get(['eventHistory']);
    const history = data.eventHistory || [];
    
    renderHistory(history);
  } catch (error) {
    console.error('履歴の読み込みエラー:', error);
  }
}

// 履歴の描画
function renderHistory(history) {
  const historyList = document.getElementById('history-list');
  const noHistory = document.getElementById('no-history');
  
  if (history.length === 0) {
    historyList.style.display = 'none';
    noHistory.style.display = 'block';
    return;
  }
  
  historyList.style.display = 'block';
  noHistory.style.display = 'none';
  historyList.innerHTML = '';
  
  // 最新30件のみ
  const recentHistory = history.slice(0, 30);
  
  recentHistory.forEach((item, index) => {
    const historyItem = createHistoryItem(item, index);
    historyList.appendChild(historyItem);
  });
}

// 履歴アイテムの作成
function createHistoryItem(item, index) {
  const div = document.createElement('div');
  div.className = 'history-item';
  
  const date = new Date(item.timestamp).toLocaleString('ja-JP');
  
  div.innerHTML = `
    <div class="history-header">
      <div class="history-date">
        <span class="expand-icon">▶</span>
        ${date}
      </div>
      <div class="history-url">${item.url}</div>
      <div class="history-event">${item.eventName || '(なし)'}</div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button class="history-add-btn" data-index="${index}">
          自動設定に追加
        </button>
        <button class="history-delete-btn" data-index="${index}" title="この履歴を削除">
          削除
        </button>
      </div>
    </div>
    <div class="history-details">
      <div class="detail-row">
        <div class="detail-label">イベント名</div>
        <div class="detail-value">${item.eventName || '(なし)'}</div>
        ${item.eventXPath ? `<div class="detail-xpath">XPath: ${item.eventXPath}</div>` : ''}
      </div>
      <div class="detail-row">
        <div class="detail-label">日付・時刻</div>
        <div class="detail-value">${item.dateTime || '(なし)'}</div>
        ${item.dateTimeXPath ? `<div class="detail-xpath">XPath: ${item.dateTimeXPath}</div>` : ''}
      </div>
      <div class="detail-row">
        <div class="detail-label">場所</div>
        <div class="detail-value">${item.location || '(なし)'}</div>
        ${item.locationXPath ? `<div class="detail-xpath">XPath: ${item.locationXPath}</div>` : ''}
      </div>
    </div>
  `;
  
  // ボタンのイベントリスナーを追加
  const addBtn = div.querySelector('.history-add-btn');
  const deleteBtn = div.querySelector('.history-delete-btn');
  
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const index = parseInt(e.target.dataset.index);
    addToAutoConfig(index);
  });
  
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const index = parseInt(e.target.dataset.index);
    deleteHistory(index);
  });
  
  // ヘッダークリックで展開/折りたたみ
  div.querySelector('.history-header').addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') {
      div.classList.toggle('expanded');
    }
  });
  
  return div;
}

// 履歴から自動設定に追加
async function addToAutoConfig(index) {
  const data = await chrome.storage.local.get(['eventHistory']);
  const history = data.eventHistory || [];
  const item = history[index];
  
  if (!item) return;
  
  // 自動設定タブに切り替え（確実に実行）
  const autoConfigTab = document.querySelector('[data-tab="auto-config"]');
  const allTabButtons = document.querySelectorAll('.tab-btn');
  const allTabContents = document.querySelectorAll('.tab-content');
  
  // すべてのタブから active を削除
  allTabButtons.forEach(b => b.classList.remove('active'));
  allTabContents.forEach(c => c.classList.remove('active'));
  
  // 自動設定タブを active に
  autoConfigTab.classList.add('active');
  document.getElementById('auto-config').classList.add('active');
  
  // 新規モードに設定
  handleNewConfig();
  
  // フォームに値を設定
  document.getElementById('config-url').value = item.url || '';
  document.getElementById('config-event-xpath').value = item.eventXPath || '';
  document.getElementById('config-datetime-xpath').value = item.dateTimeXPath || '';
  document.getElementById('config-location-xpath').value = item.locationXPath || '';
  
  // ボタンを有効化
  handleFormInput({ target: document.getElementById('config-url') });
}

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
      
      // 年が取得できた場合は年月日形式、そうでなければ月日形式
      if (result.year) {
        return `${result.year}/${result.month?.padStart(2, '0')}/${result.day?.padStart(2, '0')}`;
      } else if (result.month && result.day) {
        return `${result.month}/${result.day}`;
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
      
      // 時刻を整形
      if (result.hour) {
        let hour = parseInt(result.hour);
        
        // 午後の場合は12時間を加算（12時台はそのまま）
        if (result.period === '午後' && hour < 12) {
          hour += 12;
        }
        // 午前12時は0時に変換
        if (result.period === '午前' && hour === 12) {
          hour = 0;
        }
        
        const hourStr = hour.toString().padStart(2, '0');
        const minute = (result.minute || '00').padStart(2, '0');
        return `${hourStr}:${minute}`;
      }
    }
  }
  
  return null;
}

// 履歴を削除
async function deleteHistory(index) {
  if (!confirm('この履歴を削除しますか？')) return;
  
  try {
    const data = await chrome.storage.local.get(['eventHistory']);
    let history = data.eventHistory || [];
    
    // 指定されたインデックスの履歴を削除
    history.splice(index, 1);
    
    // 保存
    await chrome.storage.local.set({ eventHistory: history });
    
    // 再描画
    await loadHistory();
  } catch (error) {
    console.error('履歴の削除エラー:', error);
    alert('削除に失敗しました。');
  }
}
