// 選択モードの状態管理
let selectionActive = false;
let currentField = null;
let fieldsToSelect = [];
let selectedData = {};
let selectedXPaths = {}; // XPathを保存
let highlightedElement = null;
let overlay = null;
let infoBox = null;

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    // コンテンツスクリプトが読み込まれているか確認するためのpingに応答
    sendResponse({ status: 'ready' });
    return true;
  }
  
  if (request.action === 'startSelection') {
    startSelectionMode(request.fields);
    sendResponse({ success: true });
    return true;
  }
  
  return true;
});
// 選択モードの開始
function startSelectionMode(fields) {
  if (selectionActive) return;
  
  selectionActive = true;
  fieldsToSelect = fields;
  selectedData = {};
  selectedXPaths = {}; // XPathをリセット
  currentField = fields[0];
  
  createOverlay();
  createInfoBox();
  updateInfoBox();
  
  // イベントリスナーの追加
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('contextmenu', handleRightClick, true);
}

// 選択モードの終了
function endSelectionMode() {
  selectionActive = false;
  
  // イベントリスナーの削除
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('mouseover', handleMouseOver, true);
  document.removeEventListener('mouseout', handleMouseOut, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('contextmenu', handleRightClick, true);
  
  // オーバーレイとインフォボックスの削除
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  if (infoBox) {
    infoBox.remove();
    infoBox = null;
  }
  
  // ハイライトをクリア
  if (highlightedElement) {
    highlightedElement.style.outline = '';
    highlightedElement = null;
  }
  
  // 選択したデータをポップアップに送信
  chrome.storage.local.set({ selectedData: selectedData });
}

// オーバーレイの作成
function createOverlay() {
  overlay = document.createElement('div');
  overlay.id = 'click-a-vent-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999998;
    pointer-events: none;
  `;
  document.body.appendChild(overlay);
}

// 情報ボックスの作成
function createInfoBox() {
  infoBox = document.createElement('div');
  infoBox.id = 'click-a-vent-info';
  infoBox.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 999999;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    color: #333;
    width: 260px;
    max-width: calc(100vw - 40px);
    text-align: center;
    pointer-events: none;
    transition: top 0.2s ease, left 0.2s ease;
  `;
  document.body.appendChild(infoBox);
}

// 情報ボックスの更新
function updateInfoBox() {
  if (!infoBox) return;
  
  const fieldNames = {
    'eventName': 'イベント名',
    'dateTime': '日付・開始時刻',
    'location': '場所'
  };
  
  const currentFieldName = fieldNames[currentField] || currentField;
  
  infoBox.innerHTML = `
    <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #1a73e8;">
      ${currentFieldName}を選択
    </div>
    <div style="font-size: 14px; color: #666;">
      要素をクリックして選択<br>
      右クリックでスキップ<br>
      ESCでキャンセル
    </div>
  `;
}

// マウス移動処理（情報ボックスの位置調整）
function handleMouseMove(e) {
  if (!selectionActive || !infoBox) return;
  
  const margin = 10;
  const boxWidth = 260;
  const boxHeight = 90;
  
  // カーソル位置を取得
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  
  // 現在のボックス位置を取得
  const currentLeft = parseInt(infoBox.style.left) || margin;
  const currentTop = parseInt(infoBox.style.top) || margin;
  
  // ボックスの矩形範囲を計算
  const boxRect = {
    left: currentLeft,
    top: currentTop,
    right: currentLeft + boxWidth,
    bottom: currentTop + boxHeight
  };
  
  // カーソルがボックスと重なっているかチェック
  const isOverlapping = mouseX >= boxRect.left && mouseX <= boxRect.right &&
                        mouseY >= boxRect.top && mouseY <= boxRect.bottom;
  
  // 重なっている場合のみ移動
  if (!isOverlapping) return;
  
  // 画面の右半分にカーソルがある場合は左側に、左半分の場合は右側に配置
  let left, top;
  
  if (mouseX > window.innerWidth / 2) {
    // カーソルが右側 → ボックスを左上に
    left = margin;
  } else {
    // カーソルが左側 → ボックスを右側に（画面内に収まるように）
    left = Math.max(margin, window.innerWidth - boxWidth - margin);
  }
  
  // 上半分なら下に、下半分なら上に
  if (mouseY > window.innerHeight / 2) {
    top = margin;
  } else {
    top = Math.max(margin, window.innerHeight - boxHeight - margin);
  }
  
  infoBox.style.left = left + 'px';
  infoBox.style.top = top + 'px';
}

// マウスオーバー処理
function handleMouseOver(e) {
  if (!selectionActive) return;
  
  // オーバーレイやインフォボックス自体は無視
  if (e.target.id === 'click-a-vent-overlay' || 
      e.target.id === 'click-a-vent-info' ||
      e.target.closest('#click-a-vent-info')) {
    return;
  }
  
  // 前のハイライトをクリア
  if (highlightedElement) {
    highlightedElement.style.outline = '';
  }
  
  // 新しい要素をハイライト
  highlightedElement = e.target;
  highlightedElement.style.outline = '3px solid #1a73e8';
}

// マウスアウト処理
function handleMouseOut(e) {
  if (!selectionActive) return;
  
  if (e.target === highlightedElement) {
    e.target.style.outline = '';
    highlightedElement = null;
  }
}

// クリック処理
function handleClick(e) {
  if (!selectionActive) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  // オーバーレイやインフォボックス自体は無視
  if (e.target.id === 'click-a-vent-overlay' || 
      e.target.id === 'click-a-vent-info' ||
      e.target.closest('#click-a-vent-info')) {
    return;
  }
  
  // 要素のテキストを取得
  const selectedText = getElementText(e.target);
  
  // 選択したデータを保存
  selectedData[currentField] = selectedText;
  
  // XPathを取得して保存
  selectedXPaths[currentField] = getXPath(e.target);
  
  // ハイライトをクリア
  if (highlightedElement) {
    highlightedElement.style.outline = '';
    highlightedElement = null;
  }
  
  // 次のフィールドへ
  moveToNextField();
}

// 右クリック処理
function handleRightClick(e) {
  if (!selectionActive) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  // このフィールドをスキップ
  selectedData[currentField] = '';
  
  // ハイライトをクリア
  if (highlightedElement) {
    highlightedElement.style.outline = '';
    highlightedElement = null;
  }
  
  // 次のフィールドへ
  moveToNextField();
}

// キーボードイベント (ESCでキャンセル)
document.addEventListener('keydown', (e) => {
  if (selectionActive && e.key === 'Escape') {
    endSelectionMode();
  }
});

// 次のフィールドへ移動
function moveToNextField() {
  const currentIndex = fieldsToSelect.indexOf(currentField);
  
  if (currentIndex < fieldsToSelect.length - 1) {
    // 次のフィールドへ
    currentField = fieldsToSelect[currentIndex + 1];
    updateInfoBox();
  } else {
    // 全フィールドの選択完了
    endSelectionMode();
    
    // 履歴に追加
    saveToHistory();
    
    // 選択したデータをstorageに保存
    chrome.storage.local.set({ selectedData: selectedData }, () => {
      // ポップアップを開く
      chrome.runtime.sendMessage({ 
        action: 'openPopup'
      });
    });
  }
}

// 履歴に保存
async function saveToHistory() {
  try {
    // 現在のページURLを取得
    const currentUrl = window.location.href;
    
    // 履歴データを作成
    const historyItem = {
      timestamp: Date.now(),
      url: currentUrl,
      eventName: selectedData.eventName || '',
      eventXPath: selectedXPaths.eventName || '',
      dateTime: selectedData.dateTime || '',
      dateTimeXPath: selectedXPaths.dateTime || '',
      location: selectedData.location || '',
      locationXPath: selectedXPaths.location || ''
    };
    
    // 既存の履歴を取得
    const data = await chrome.storage.local.get(['eventHistory']);
    let history = data.eventHistory || [];
    
    // 新しい履歴を先頭に追加
    history.unshift(historyItem);
    
    // 最大30件に制限
    if (history.length > 30) {
      history = history.slice(0, 30);
    }
    
    // 履歴を保存
    await chrome.storage.local.set({ eventHistory: history });
  } catch (error) {
    console.error('履歴の保存エラー:', error);
  }
}

// 要素のXPathを取得
function getXPath(element) {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  if (element === document.body) {
    return '/html/body';
  }
  
  let path = '';
  let current = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling = current.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    
    const tagName = current.nodeName.toLowerCase();
    const pathIndex = index > 0 ? `[${index + 1}]` : '';
    path = `/${tagName}${pathIndex}${path}`;
    
    current = current.parentNode;
  }
  
  return path;
}

// 要素からテキストを取得
function getElementText(element) {
  // 入力フィールドの場合
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    return element.value;
  }
  
  // その他の要素の場合
  // 子要素を含まず、直接のテキストノードのみを取得
  let text = '';
  for (let node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    }
  }
  
  // テキストがない場合は、innerTextを使用
  if (!text.trim()) {
    text = element.innerText || element.textContent;
  }
  
  return text.trim();
}
