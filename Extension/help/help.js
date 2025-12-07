// タブ切り替え機能
document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // すべてのタブとコンテンツから active クラスを削除
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // クリックされたタブとそのコンテンツに active クラスを追加
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      const targetContent = document.getElementById(tabId);
      if (targetContent) {
        targetContent.classList.add('active');
      }

      // URLハッシュを更新（ブックマーク可能にする）
      window.location.hash = tabId;
    });
  });

  // ページ読み込み時にURLハッシュがあれば該当タブを開く
  const hash = window.location.hash.substring(1);
  if (hash) {
    const targetBtn = document.querySelector(`[data-tab="${hash}"]`);
    if (targetBtn) {
      targetBtn.click();
    }
  }
});
