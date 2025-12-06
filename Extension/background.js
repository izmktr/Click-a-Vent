// Background Service Worker

// コンテンツスクリプトからのメッセージを受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPopup') {
    // ポップアップを開く（拡張機能アイコンをクリックしたのと同じ動作）
    // Manifest V3では直接ポップアップを開けないため、
    // ユーザーに通知を表示するか、別の方法を使用する必要がある
    
    // 代わりに、選択完了の通知を表示
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Click-a-Vent',
      message: '情報の選択が完了しました。拡張機能アイコンをクリックして登録してください。',
      priority: 2
    });
    
    sendResponse({ success: true });
  }
  return true;
});

// インストール時の処理
chrome.runtime.onInstalled.addListener(() => {
  console.log('Click-a-Vent がインストールされました');
});
