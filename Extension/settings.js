// グローバル変数
let autoConfigs = [];
let selectedConfigIndex = -1;
let isNewMode = true;

// イベント期間設定
let durationButtons = [];
let selectedDurationIndex = -1;
let isDurationNewMode = true;

// デフォルト設定
const DEFAULT_DATE_FORMATS = '%Y年%M月%D日\n%M月%D日\n%Y/%M/%D\n%M/%D\n%Y-%M-%D\n%M-%D\n%Y.%M.%D\n%M.%D';
const DEFAULT_TIME_FORMATS = '%H:%M\n%H：%M\n%P%H時%M分\n%P%H時\n%H時%M分\n%H時\n%H.%M\n%H-%M';
const DEFAULT_DURATION_BUTTONS = [
  { name: '0分', duration: '0m', isDefault: false, minutes: 0 },
  { name: '10分', duration: '10m', isDefault: false, minutes: 10 },
  { name: '30分', duration: '30m', isDefault: false, minutes: 30 },
  { name: '1時間', duration: '1h', isDefault: true, minutes: 60 },
  { name: '2時間', duration: '2h', isDefault: false, minutes: 120 },
  { name: '4時間', duration: '4h', isDefault: false, minutes: 240 },
  { name: '8時間', duration: '8h', isDefault: false, minutes: 480 }
];

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
  document.getElementById('date-test-input').addEventListener('input', handleDateTestInput);
  
  // 時刻設定
  document.getElementById('time-format-input').addEventListener('input', () => {
    document.getElementById('save-time-btn').disabled = false;
  });
  document.getElementById('test-time-btn').addEventListener('click', testTimeFormat);
  document.getElementById('reset-time-btn').addEventListener('click', resetTimeFormat);
  document.getElementById('save-time-btn').addEventListener('click', saveTimeFormat);
  document.getElementById('time-test-input').addEventListener('input', handleTimeTestInput);
  
  // イベント期間設定
  document.getElementById('duration-new-btn').addEventListener('click', handleNewDuration);
  document.getElementById('duration-delete-btn').addEventListener('click', handleDeleteDuration);
  document.getElementById('duration-move-up-btn').addEventListener('click', () => moveDuration(-1));
  document.getElementById('duration-move-down-btn').addEventListener('click', () => moveDuration(1));
  document.getElementById('duration-config-form').addEventListener('submit', handleSubmitDuration);
  document.getElementById('duration-value').addEventListener('input', handleDurationValueInput);
  document.getElementById('custom-input-position').addEventListener('change', saveCustomInputPosition);
  
  // 期間フォーム入力監視
  const durationFormInputs = ['duration-button-name', 'duration-value'];
  durationFormInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', handleDurationFormInput);
  });
  
  // デフォルトチェックボックスの変更も監視
  document.getElementById('duration-is-default').addEventListener('change', handleDurationFormInput);
  
  // 履歴設定
  document.getElementById('add-as-regex').addEventListener('change', saveAddAsRegexSetting);
  
  // ヘルプボタン
  document.getElementById('settings-help-btn').addEventListener('click', handleHelp);
  
  // Placeholderの処理を統一
  setupPlaceholderHandlers();
}

// Placeholderの処理を統一
function setupPlaceholderHandlers() {
  // すべてのplaceholderを持つinputとtextareaを取得
  const elementsWithPlaceholder = document.querySelectorAll('input[placeholder], textarea[placeholder]');
  
  elementsWithPlaceholder.forEach(element => {
    // 元のplaceholderを保存
    const originalPlaceholder = element.getAttribute('placeholder');
    
    // フォーカス時: placeholderを空にする
    element.addEventListener('focus', () => {
      element.setAttribute('data-placeholder', originalPlaceholder);
      element.setAttribute('placeholder', '');
    });
    
    // ブラー時: placeholderを元に戻す
    element.addEventListener('blur', () => {
      const savedPlaceholder = element.getAttribute('data-placeholder');
      if (savedPlaceholder) {
        element.setAttribute('placeholder', savedPlaceholder);
      }
    });
  });
}

// 設定の読み込み
async function loadSettings() {
  try {
    const data = await chrome.storage.sync.get(['autoConfigs', 'dateFormats', 'timeFormats', 'addAsRegex', 'durationButtons', 'customInputPosition']);
    
    // 自動設定
    autoConfigs = data.autoConfigs || [];
    renderUrlList();
    
    // 日付設定
    document.getElementById('date-format-input').value = data.dateFormats || DEFAULT_DATE_FORMATS;
    
    // 時刻設定
    document.getElementById('time-format-input').value = data.timeFormats || DEFAULT_TIME_FORMATS;
    
    // イベント期間設定
    durationButtons = data.durationButtons || DEFAULT_DURATION_BUTTONS;
    renderDurationList();
    
    // 自由入力欄の配置
    document.getElementById('custom-input-position').value = data.customInputPosition || 'end';
    
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
  const testSection = document.getElementById('date-test-section');
  const result = document.getElementById('date-test-result');
  
  // テストセクションの表示を切り替え
  if (testSection.style.display === 'none') {
    testSection.style.display = 'block';
    result.className = 'test-result';
    result.innerHTML = '';
    
    // テスト用テキストボックスにフォーカス
    document.getElementById('date-test-input').focus();
  } else {
    testSection.style.display = 'none';
    result.className = 'test-result';
    result.innerHTML = '';
  }
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
  const testSection = document.getElementById('time-test-section');
  const result = document.getElementById('time-test-result');
  
  // テストセクションの表示を切り替え
  if (testSection.style.display === 'none') {
    testSection.style.display = 'block';
    result.className = 'test-result';
    result.innerHTML = '';
    
    // テスト用テキストボックスにフォーカス
    document.getElementById('time-test-input').focus();
  } else {
    testSection.style.display = 'none';
    result.className = 'test-result';
    result.innerHTML = '';
  }
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
  const isMatch = matchesUrlPattern(testUrl, configUrl, useRegex);
  
  // エラーチェック（正規表現が不正な場合はnullを返すように修正が必要）
  if (isMatch === false && useRegex) {
    try {
      new RegExp(configUrl);
    } catch (e) {
      resultDiv.innerHTML = '<span class="match-result error">✖ 正規表現が不正です</span>';
      return;
    }
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
      const isMatch = matchesUrlPattern(item.url, configUrl, useRegex);
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

// 日付テスト用テキストボックスの入力ハンドラー
function handleDateTestInput() {
  const inputText = document.getElementById('date-test-input').value.trim();
  const resultDiv = document.getElementById('date-test-parse-result');
  
  if (!inputText) {
    resultDiv.innerHTML = '';
    return;
  }
  
  // フォーマットリストを取得
  const formats = document.getElementById('date-format-input').value;
  const formatList = formats.split('\n').filter(f => f.trim());
  
  // 日付を抽出
  const dateInfo = extractDateFromText(inputText, formatList);
  
  // 日付マッチ部分を削除したテキストで時刻を抽出
  let textForTime = inputText;
  if (dateInfo && dateInfo.matchedText) {
    textForTime = inputText.replace(dateInfo.matchedText, '');
  }
  
  // 時刻フォーマットを取得
  const timeFormats = document.getElementById('time-format-input').value;
  const timeFormatList = timeFormats.split('\n').filter(f => f.trim());
  
  // 時刻を抽出
  const timeInfo = extractTimeFromText(textForTime, timeFormatList);
  
  // 結果を表示
  let html = '';
  
  if (dateInfo) {
    html += `<div class="parse-result-row">`;
    html += `<span class="parse-result-label">マッチ部分:</span>`;
    html += `<span class="parse-result-value">"${dateInfo.matchedText}" [${dateInfo.matchedFormat}]</span>`;
    html += `</div>`;
    const dateStr = `${dateInfo.year}年${dateInfo.month}月${dateInfo.day}日`;
    html += `<div class="parse-result-row">`;
    html += `<span class="parse-result-label">抽出日付:</span>`;
    html += `<span class="parse-result-value">${dateStr}</span>`;
    html += `</div>`;
  } else {
    html += `<div class="parse-result-row">`;
    html += `<span class="parse-result-label">マッチ部分:</span>`;
    html += `<span class="parse-result-value error">抽出失敗</span>`;
    html += `</div>`;
  }
  
  if (timeInfo) {
    html += `<div class="parse-result-row">`;
    html += `<span class="parse-result-label">マッチ部分:</span>`;
    html += `<span class="parse-result-value">"${textForTime}" [${timeInfo.matchedFormat}]</span>`;
    html += `</div>`;
    html += `<div class="parse-result-row">`;
    html += `<span class="parse-result-label">抽出時刻:</span>`;
    html += `<span class="parse-result-value">${timeInfo.hour}:${timeInfo.minute}</span>`;
    html += `</div>`;
  } else {
    html += `<div class="parse-result-row">`;
    html += `<span class="parse-result-label">マッチ部分:</span>`;
    html += `<span class="parse-result-value error">抽出失敗</span>`;
    html += `</div>`;
  }
  
  // 時刻抽出用テキストを表示
  if (dateInfo && dateInfo.matchedText && textForTime !== inputText) {
    html += `<div class="parse-result-note">`;
    html += `※ 日付部分 "${dateInfo.matchedText}" を削除して時刻を抽出: "${textForTime}"`;
    html += `</div>`;
  }
  
  resultDiv.innerHTML = html;
}

// 時刻テスト用テキストボックスの入力ハンドラー
function handleTimeTestInput() {
  const inputText = document.getElementById('time-test-input').value.trim();
  const resultDiv = document.getElementById('time-test-parse-result');
  
  if (!inputText) {
    resultDiv.innerHTML = '';
    return;
  }
  
  // 日付フォーマットを取得
  const dateFormats = document.getElementById('date-format-input').value;
  const dateFormatList = dateFormats.split('\n').filter(f => f.trim());
  
  // 日付を抽出
  const dateInfo = extractDateFromText(inputText, dateFormatList);
  
  // 日付マッチ部分を削除したテキストで時刻を抽出
  let textForTime = inputText;
  if (dateInfo && dateInfo.matchedText) {
    textForTime = inputText.replace(dateInfo.matchedText, '');
  }
  
  // 時刻フォーマットを取得
  const formats = document.getElementById('time-format-input').value;
  const formatList = formats.split('\n').filter(f => f.trim());
  
  // 時刻を抽出
  const timeInfo = extractTimeFromText(textForTime, formatList);
  
  // 結果を表示
  let html = '';
  
  if (dateInfo) {
    html += `<div class="parse-result-row">`;
    html += `<span class="parse-result-label">マッチ部分:</span>`;
    html += `<span class="parse-result-value">"${dateInfo.matchedText}" [${dateInfo.matchedFormat}]</span>`;
    html += `</div>`;
    const dateStr = `${dateInfo.year}年${dateInfo.month}月${dateInfo.day}日`;
    html += `<div class="parse-result-row">`;
    html += `<span class="parse-result-label">抽出日付:</span>`;
    html += `<span class="parse-result-value">${dateStr}</span>`;
    html += `</div>`;
  } else {
    html += `<div class="parse-result-row">`;
    html += `<span class="parse-result-label">マッチ部分:</span>`;
    html += `<span class="parse-result-value error">抽出失敗</span>`;
    html += `</div>`;
  }
  
  if (timeInfo) {
    html += `<div class="parse-result-row">`;
    html += `<span class="parse-result-label">マッチ部分:</span>`;
    html += `<span class="parse-result-value">"${textForTime}" [${timeInfo.matchedFormat}]</span>`;
    html += `</div>`;
    html += `<div class="parse-result-row">`;
    html += `<span class="parse-result-label">抽出時刻:</span>`;
    html += `<span class="parse-result-value">${timeInfo.hour}:${timeInfo.minute}</span>`;
    html += `</div>`;
  } else {
    html += `<div class="parse-result-row">`;
    html += `<span class="parse-result-label">マッチ部分:</span>`;
    html += `<span class="parse-result-value error">抽出失敗</span>`;
    html += `</div>`;
  }
  
  // 時刻抽出用テキストを表示
  if (dateInfo && dateInfo.matchedText && textForTime !== inputText) {
    html += `<div class="parse-result-note">`;
    html += `※ 日付部分 "${dateInfo.matchedText}" を削除して時刻を抽出: "${textForTime}"`;
    html += `</div>`;
  }
  
  resultDiv.innerHTML = html;
}

// ====================
// イベント期間設定の関数群
// ====================

// 期間リストの描画
function renderDurationList() {
  const durationList = document.getElementById('duration-list');
  durationList.innerHTML = '';
  
  if (durationButtons.length === 0) {
    durationList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">登録なし</div>';
    return;
  }
  
  durationButtons.forEach((button, index) => {
    const item = document.createElement('div');
    item.className = 'url-item';
    if (index === selectedDurationIndex) {
      item.classList.add('selected');
    }
    
    const displayText = button.isDefault ? `${button.name} [デフォルト]` : button.name;
    item.innerHTML = `<div class="url-item-text">${displayText}</div>`;
    item.addEventListener('click', () => selectDuration(index));
    durationList.appendChild(item);
  });
  
  updateDurationControlButtons();
}

// 期間の選択
function selectDuration(index) {
  selectedDurationIndex = index;
  isDurationNewMode = false;
  
  const button = durationButtons[index];
  document.getElementById('duration-button-name').value = button.name || '';
  document.getElementById('duration-value').value = button.duration || '';
  document.getElementById('duration-is-default').checked = button.isDefault || false;
  
  // 期間の解析結果を表示
  handleDurationValueInput();
  
  // 編集フラグをリセット
  clearDurationEditedFlags();
  
  // ボタンの更新
  document.getElementById('submit-duration-btn').textContent = '更新';
  document.getElementById('submit-duration-btn').disabled = true;
  
  renderDurationList();
}

// 新規作成
function handleNewDuration() {
  selectedDurationIndex = -1;
  isDurationNewMode = true;
  
  // フォームをクリア
  document.getElementById('duration-button-name').value = '';
  document.getElementById('duration-value').value = '';
  document.getElementById('duration-is-default').checked = false;
  document.getElementById('duration-parse-result').innerHTML = '';
  
  clearDurationEditedFlags();
  
  document.getElementById('submit-duration-btn').textContent = '追加';
  document.getElementById('submit-duration-btn').disabled = true;
  
  renderDurationList();
}

// 削除
async function handleDeleteDuration() {
  if (selectedDurationIndex === -1) return;
  
  if (!confirm('この期間ボタンを削除しますか？')) return;
  
  durationButtons.splice(selectedDurationIndex, 1);
  await saveDurationButtons();
  
  handleNewDuration();
}

// 移動
async function moveDuration(direction) {
  if (selectedDurationIndex === -1) return;
  
  const newIndex = selectedDurationIndex + direction;
  if (newIndex < 0 || newIndex >= durationButtons.length) return;
  
  // 入れ替え
  [durationButtons[selectedDurationIndex], durationButtons[newIndex]] = 
  [durationButtons[newIndex], durationButtons[selectedDurationIndex]];
  
  selectedDurationIndex = newIndex;
  
  await saveDurationButtons();
  renderDurationList();
}

// コントロールボタンの更新
function updateDurationControlButtons() {
  const hasSelection = selectedDurationIndex !== -1;
  const canMoveUp = hasSelection && selectedDurationIndex > 0;
  const canMoveDown = hasSelection && selectedDurationIndex < durationButtons.length - 1;
  
  document.getElementById('duration-move-up-btn').disabled = !canMoveUp;
  document.getElementById('duration-move-down-btn').disabled = !canMoveDown;
  document.getElementById('duration-delete-btn').disabled = !hasSelection;
}

// フォーム入力の監視
function handleDurationFormInput(e) {
  const buttonName = document.getElementById('duration-button-name').value.trim();
  const durationValue = document.getElementById('duration-value').value.trim();
  
  // 期間の解析
  const minutes = parseDurationString(durationValue);
  
  // 必須項目チェック（期間が正しく解析できることも確認）
  const isValid = buttonName && durationValue && minutes !== null;
  document.getElementById('submit-duration-btn').disabled = !isValid;
  
  // 編集中フラグ
  if (!isDurationNewMode) {
    if (e.target.type === 'checkbox') {
      // チェックボックスは変更されたら編集フラグ
      e.target.classList.add('edited');
    } else if (e.target.value !== '') {
      // テキスト入力は値があれば編集フラグ
      e.target.classList.add('edited');
    }
  }
}

// 期間値入力時の処理
function handleDurationValueInput() {
  const durationValue = document.getElementById('duration-value').value.trim();
  const resultDiv = document.getElementById('duration-parse-result');
  
  if (!durationValue) {
    resultDiv.innerHTML = '';
    return;
  }
  
  const minutes = parseDurationString(durationValue);
  
  if (minutes === null) {
    resultDiv.innerHTML = '<div class="parse-result-row"><span class="parse-result-value error">解析エラー: 正しい形式で入力してください (例: 30m, 2h, 1d)</span></div>';
    resultDiv.style.display = 'block';
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const days = Math.floor(minutes / (60 * 24));
    
    let displayText = '';
    if (days > 0) {
      const remainingHours = hours % 24;
      displayText = `${days}日`;
      if (remainingHours > 0 || mins > 0) {
        displayText += ` ${remainingHours}時間${mins}分`;
      }
    } else if (hours > 0) {
      displayText = `${hours}時間`;
      if (mins > 0) {
        displayText += `${mins}分`;
      }
    } else {
      displayText = `${mins}分`;
    }
    
    resultDiv.innerHTML = `<div class="parse-result-row"><span class="parse-result-label">解析結果:</span><span class="parse-result-value">${minutes}分 (${displayText})</span></div>`;
    resultDiv.style.display = 'block';
  }
}

// 編集フラグのクリア
function clearDurationEditedFlags() {
  document.querySelectorAll('#duration-config-form input').forEach(input => {
    input.classList.remove('edited', 'error');
  });
}

// 設定の送信
async function handleSubmitDuration(e) {
  e.preventDefault();
  
  const buttonName = document.getElementById('duration-button-name').value.trim();
  const durationValue = document.getElementById('duration-value').value.trim();
  const isDefault = document.getElementById('duration-is-default').checked;
  
  clearDurationEditedFlags();
  
  // バリデーション
  if (!buttonName) {
    document.getElementById('duration-button-name').classList.add('error');
    alert('ボタン名を入力してください。');
    return;
  }
  
  const minutes = parseDurationString(durationValue);
  if (minutes === null) {
    document.getElementById('duration-value').classList.add('error');
    alert('期間の形式が不正です。正しい形式で入力してください (例: 30m, 2h, 1d)。');
    return;
  }
  
  const button = {
    name: buttonName,
    duration: durationValue,
    isDefault: isDefault,
    minutes: minutes
  };
  
  // デフォルトの処理：0分のボタンがある場合は例外的にそれをデフォルトにする
  if (isDefault) {
    // 他のボタンのデフォルトを解除
    durationButtons.forEach(btn => btn.isDefault = false);
  }
  
  if (isDurationNewMode) {
    durationButtons.push(button);
  } else {
    durationButtons[selectedDurationIndex] = button;
  }
  
  // 0分のボタンがある場合、それを強制的にデフォルトにする
  const zeroMinuteButton = durationButtons.find(btn => btn.minutes === 0);
  if (zeroMinuteButton) {
    durationButtons.forEach(btn => btn.isDefault = false);
    zeroMinuteButton.isDefault = true;
  }
  
  await saveDurationButtons();
  handleNewDuration();
}

// 期間ボタンの保存
async function saveDurationButtons() {
  try {
    await chrome.storage.sync.set({ durationButtons });
    renderDurationList();
  } catch (error) {
    console.error('保存エラー:', error);
    alert('保存に失敗しました。');
  }
}

// 自由入力欄の配置設定を保存
async function saveCustomInputPosition() {
  try {
    const position = document.getElementById('custom-input-position').value;
    await chrome.storage.sync.set({ customInputPosition: position });
  } catch (error) {
    console.error('設定の保存エラー:', error);
  }
}

// 時間文字列をパース（utils.jsに移動すべきだが、ここでは重複定義）
function parseDurationString(str) {
  if (!str || !str.trim()) return null;
  
  const trimmed = str.trim();
  
  // 数値が0の場合は例外的にサフィックスなしでも0を返す
  if (trimmed === '0') {
    return 0;
  }
  
  let totalMinutes = 0;
  const regex = /(\d+\.?\d*)\s*([smhd])/gi;
  let match;
  let hasMatch = false;
  
  while ((match = regex.exec(str)) !== null) {
    hasMatch = true;
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 's':
        totalMinutes += value / 60;
        break;
      case 'm':
        totalMinutes += value;
        break;
      case 'h':
        totalMinutes += value * 60;
        break;
      case 'd':
        totalMinutes += value * 60 * 24;
        break;
    }
  }
  
  // マッチがなかった場合はnullを返す
  if (!hasMatch) return null;
  
  // 0以上の値を返す（0mなども許容）
  return totalMinutes >= 0 ? Math.round(totalMinutes) : null;
}

// ヘルプボタンの処理
function handleHelp() {
  chrome.tabs.create({ url: chrome.runtime.getURL('help/index.html') });
}
