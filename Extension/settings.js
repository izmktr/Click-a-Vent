// グローバル変数
let autoConfigs = [];
let selectedConfigIndex = -1;
let isNewMode = true;

// デフォルト設定
const DEFAULT_DATE_FORMATS = '%Y年%M月%D日\n%M月%D日\n%Y/%M/%D\n%M/%D\n%Y-%M-%D\n%M-%D\n%Y.%M.%D\n%M.%D';
const DEFAULT_TIME_FORMATS = '%H:%M\n%H：%M\n%P%H時%M分\n%P%H時\n%H時%M分\n%H時\n%H.%M\n%H-%M';

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
  
  // URLテスト
  document.getElementById('url-test-btn').addEventListener('click', toggleUrlTest);
  document.getElementById('test-url-input').addEventListener('input', handleTestUrlInput);
  document.getElementById('config-url').addEventListener('input', handleConfigUrlChange);
  document.getElementById('config-use-regex').addEventListener('change', handleUseRegexChange);
  
  // フォーム入力監視
  const formInputs = ['config-title', 'config-url', 'config-event-xpath', 'config-datetime-xpath', 'config-location-xpath'];
  formInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', handleFormInput);
  });
  
  // 日付設定
  document.getElementById('date-format-input').addEventListener('input', () => {
    document.getElementById('save-date-btn').disabled = false;
  });
  document.getElementById('test-date-btn').addEventListener('click', testDateFormat);
  document.getElementById('reset-date-btn').addEventListener('click', resetDateFormat);
  document.getElementById('save-date-btn').addEventListener('click', saveDateFormat);
  
  // 時刻設定
  document.getElementById('time-format-input').addEventListener('input', () => {
    document.getElementById('save-time-btn').disabled = false;
  });
  document.getElementById('test-time-btn').addEventListener('click', testTimeFormat);
  document.getElementById('reset-time-btn').addEventListener('click', resetTimeFormat);
  document.getElementById('save-time-btn').addEventListener('click', saveTimeFormat);
  
  // 履歴設定
  document.getElementById('add-as-regex').addEventListener('change', saveAddAsRegexSetting);
}

// 設定の読み込み
async function loadSettings() {
  try {
    const data = await chrome.storage.sync.get(['autoConfigs', 'dateFormats', 'timeFormats', 'addAsRegex']);
    
    // 自動設定
    autoConfigs = data.autoConfigs || [];
    renderUrlList();
    
    // 日付設定
    document.getElementById('date-format-input').value = data.dateFormats || DEFAULT_DATE_FORMATS;
    
    // 時刻設定
    document.getElementById('time-format-input').value = data.timeFormats || DEFAULT_TIME_FORMATS;
    
    // 履歴からの追加設定
    document.getElementById('add-as-regex').checked = data.addAsRegex || false;
    
    // 履歴からの追加設定
    document.getElementById('add-as-regex').checked = data.addAsRegex || false;
    
    // URLテストセクションを非表示に初期化
    document.getElementById('url-test-section').classList.add('hidden');
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
    
    item.innerHTML = `<div class="url-item-text">${config.title || config.url}</div>`;
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
  document.getElementById('config-title').value = config.title || '';
  document.getElementById('config-url').value = config.url;
  document.getElementById('config-use-regex').checked = config.useRegex || false;
  document.getElementById('config-event-xpath').value = config.eventXPath;
  document.getElementById('config-datetime-xpath').value = config.dateTimeXPath || '';
  document.getElementById('config-location-xpath').value = config.locationXPath || '';
  
  // URLヒントを更新
  updateUrlHint();
  
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
  document.getElementById('config-title').value = '';
  document.getElementById('config-url').value = '';
  document.getElementById('config-use-regex').checked = false;
  document.getElementById('config-event-xpath').value = '';
  document.getElementById('config-datetime-xpath').value = '';
  document.getElementById('config-location-xpath').value = '';
  
  // URLヒントを更新
  updateUrlHint();
  
  clearEditedFlags();
  
  document.getElementById('submit-config-btn').textContent = '追加';
  document.getElementById('submit-config-btn').disabled = true;
  
  // URLテストセクションを非表示
  document.getElementById('url-test-section').classList.add('hidden');
  
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
  const title = document.getElementById('config-title').value.trim();
  const url = document.getElementById('config-url').value.trim();
  const eventXPath = document.getElementById('config-event-xpath').value.trim();
  
  // 必須項目チェック
  const isValid = title && url && eventXPath;
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
  
  const title = document.getElementById('config-title').value.trim();
  const url = document.getElementById('config-url').value.trim();
  const useRegex = document.getElementById('config-use-regex').checked;
  const eventXPath = document.getElementById('config-event-xpath').value.trim();
  const dateTimeXPath = document.getElementById('config-datetime-xpath').value.trim();
  const locationXPath = document.getElementById('config-location-xpath').value.trim();
  
  clearEditedFlags();
  
  // バリデーション
  if (!title) {
    document.getElementById('config-title').classList.add('error');
    alert('タイトルを入力してください。');
    return;
  }
  
  if (!validateUrl(url, useRegex)) {
    document.getElementById('config-url').classList.add('error');
    alert(useRegex ? '正規表現の形式が不正です。' : 'URLの形式が不正です。');
    return;
  }
  
  if (!validateXPath(eventXPath)) {
    document.getElementById('config-event-xpath').classList.add('error');
    alert('イベント名のXPathが不正です。');
    return;
  }
  
  const config = {
    title,
    url,
    useRegex,
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

// URLバリデーション
function validateUrl(url, useRegex) {
  if (!url) return false;
  
  if (useRegex) {
    // 正規表現として妥当かチェック
    try {
      new RegExp(url);
      return true;
    } catch {
      return false;
    }
  } else {
    // 前方一致の場合、通常のURLとして妥当かチェック
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
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

// 日付フォーマットをデフォルトにリセット
async function resetDateFormat() {
  if (!confirm('日付フォーマットをデフォルトに戻しますか？')) return;
  
  try {
    document.getElementById('date-format-input').value = DEFAULT_DATE_FORMATS;
    await chrome.storage.sync.set({ dateFormats: DEFAULT_DATE_FORMATS });
    alert('日付フォーマットをデフォルトに戻しました。');
    document.getElementById('save-date-btn').disabled = true;
  } catch (error) {
    console.error('リセットエラー:', error);
    alert('リセットに失敗しました。');
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

// 時刻フォーマットをデフォルトにリセット
async function resetTimeFormat() {
  if (!confirm('時刻フォーマットをデフォルトに戻しますか？')) return;
  
  try {
    document.getElementById('time-format-input').value = DEFAULT_TIME_FORMATS;
    await chrome.storage.sync.set({ timeFormats: DEFAULT_TIME_FORMATS });
    alert('時刻フォーマットをデフォルトに戻しました。');
    document.getElementById('save-time-btn').disabled = true;
  } catch (error) {
    console.error('リセットエラー:', error);
    alert('リセットに失敗しました。');
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
  
  // URLからドメイン部分を抽出してタイトルに設定
  let title = '';
  try {
    const url = new URL(item.url);
    title = url.hostname;
  } catch (e) {
    title = item.url || '';
  }
  
  // 「正規表現で追加」設定を取得
  const addAsRegex = document.getElementById('add-as-regex').checked;
  
  // URLを加工
  let processedUrl = item.url || '';
  if (addAsRegex) {
    // 正規表現モード: タグをエスケープして冒頭に^を追加
    processedUrl = '^' + escapeRegExp(processedUrl);
  }
  
  // フォームに値を設定
  document.getElementById('config-title').value = title;
  document.getElementById('config-url').value = processedUrl;
  document.getElementById('config-use-regex').checked = addAsRegex;
  document.getElementById('config-event-xpath').value = item.eventXPath || '';
  document.getElementById('config-datetime-xpath').value = item.dateTimeXPath || '';
  document.getElementById('config-location-xpath').value = item.locationXPath || '';
  
  // URLヒントを更新
  updateUrlHint();
  
  // ボタンを有効化
  handleFormInput({ target: document.getElementById('config-url') });
}

// 「正規表現で追加」設定を保存
async function saveAddAsRegexSetting() {
  try {
    const addAsRegex = document.getElementById('add-as-regex').checked;
    await chrome.storage.sync.set({ addAsRegex });
  } catch (error) {
    console.error('設定の保存エラー:', error);
  }
}

// 正規表現の特殊文字をエスケープ
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 「正規表現を使う」チェックボックス変更時の処理
function handleUseRegexChange() {
  updateUrlHint();
  
  // URLテストセクションが表示されている場合は再テスト
  const section = document.getElementById('url-test-section');
  if (!section.classList.contains('hidden')) {
    handleTestUrlInput();
    loadHistoryForTest();
  }
}

// URLヒントテキストを更新
function updateUrlHint() {
  const useRegex = document.getElementById('config-use-regex').checked;
  const hintElement = document.getElementById('url-hint');
  const urlInput = document.getElementById('config-url');
  
  if (useRegex) {
    hintElement.textContent = '正規表現でマッチします（例: https://example\\.com/events/.*）';
    urlInput.placeholder = 'https://example\\.com/events/.*';
  } else {
    hintElement.textContent = '前方一致でマッチします';
    urlInput.placeholder = 'https://example.com/events/';
  }
}

// 正規表現の特殊文字をエスケープ
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

// URLテストセクションの表示/非表示を切り替え
function toggleUrlTest() {
  const section = document.getElementById('url-test-section');
  section.classList.toggle('hidden');
  
  if (!section.classList.contains('hidden')) {
    // 表示時にテストを実行
    handleTestUrlInput();
    loadHistoryForTest();
  }
}

// テストURL入力時の処理
function handleTestUrlInput() {
  const testUrl = document.getElementById('test-url-input').value.trim();
  const configUrl = document.getElementById('config-url').value.trim();
  const useRegex = document.getElementById('config-use-regex').checked;
  const resultDiv = document.getElementById('test-url-result');
  
  if (!testUrl) {
    resultDiv.innerHTML = '';
    return;
  }
  
  if (!configUrl) {
    resultDiv.innerHTML = '<span class="match-result neutral">⚠ URLを入力してください</span>';
    return;
  }
  
  // マッチング
  let isMatch = false;
  try {
    if (useRegex) {
      const regex = new RegExp(configUrl);
      isMatch = regex.test(testUrl);
    } else {
      isMatch = testUrl.startsWith(configUrl);
    }
  } catch (e) {
    resultDiv.innerHTML = '<span class="match-result error">✖ ' + (useRegex ? '正規表現が不正です' : 'URLが不正です') + '</span>';
    return;
  }
  
  if (isMatch) {
    resultDiv.innerHTML = '<span class="match-result match">✔ 一致</span>';
  } else {
    resultDiv.innerHTML = '<span class="match-result no-match">✖ 不一致</span>';
  }
}

// URL正規表現変更時の処理
function handleConfigUrlChange() {
  const section = document.getElementById('url-test-section');
  if (!section.classList.contains('hidden')) {
    // URLテストセクションが表示されている場合は再テスト
    handleTestUrlInput();
    loadHistoryForTest();
  }
}

// 履歴を読み込んでテスト
async function loadHistoryForTest() {
  const configUrl = document.getElementById('config-url').value.trim();
  const useRegex = document.getElementById('config-use-regex').checked;
  const listDiv = document.getElementById('history-match-list');
  
  if (!configUrl) {
    listDiv.innerHTML = '<div class="no-data">URLを入力してください</div>';
    return;
  }
  
  try {
    const data = await chrome.storage.local.get(['eventHistory']);
    const history = data.eventHistory || [];
    
    if (history.length === 0) {
      listDiv.innerHTML = '<div class="no-data">履歴がありません</div>';
      return;
    }
    
    // 正規表現の妥当性チェック（正規表現モードの場合のみ）
    let regex = null;
    if (useRegex) {
      try {
        regex = new RegExp(configUrl);
      } catch (e) {
        listDiv.innerHTML = '<div class="no-data error-text">正規表現が不正です</div>';
        return;
      }
    }
    
    // 履歴の各URLをテスト
    listDiv.innerHTML = '';
    history.forEach((item, index) => {
      const isMatch = useRegex ? regex.test(item.url) : item.url.startsWith(configUrl);
      const div = document.createElement('div');
      div.className = 'history-match-item';
      
      const icon = isMatch 
        ? '<span class="match-icon match">✔</span>' 
        : '<span class="match-icon no-match">✖</span>';
      
      div.innerHTML = `
        ${icon}
        <div class="history-match-content">
          <div class="history-match-name">${item.eventName || '(名称なし)'}</div>
          <div class="history-match-url">${item.url}</div>
        </div>
      `;
      
      listDiv.appendChild(div);
    });
  } catch (error) {
    console.error('履歴読み込みエラー:', error);
    listDiv.innerHTML = '<div class="no-data error-text">エラーが発生しました</div>';
  }
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
