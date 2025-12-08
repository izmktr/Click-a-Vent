# Chrome Web Store 権限の説明

## 権限が必要な理由（日本語）

この拡張機能は、以下の権限を使用します：

### activeTab（アクティブなタブ）
**使用目的**: 現在開いているWebページからイベント情報を取得するため

**具体的な用途**:
- ユーザーがクリックした要素（イベント名、日時、場所など）のテキスト内容を読み取る
- ページ内の要素を選択できるようにするハイライト機能の実装
- XPathを使用して要素の位置を特定し、自動抽出設定に保存

**データの取り扱い**: 取得した情報はブラウザ内にのみ保存され、外部サーバーには送信されません。

---

### storage（ストレージ）
**使用目的**: ユーザーの設定と履歴をブラウザに保存するため

**具体的な用途**:
- **chrome.storage.sync**: 自動抽出設定、日付・時刻フォーマット、期間ボタンのカスタマイズ設定を保存（デバイス間で同期可能）
- **chrome.storage.local**: イベント登録履歴（最大30件）をローカルに保存

**データの取り扱い**: すべてのデータはChromeのストレージAPIを通じてブラウザ内に保存され、拡張機能が独自の外部サーバーにデータを送信することはありません。

---

### scripting（スクリプト実行）
**使用目的**: Webページ内で要素を選択可能にするため

**具体的な用途**:
- 「ページから情報を入力」ボタンをクリックしたときに、ページ内の要素を選択できるようにする
- 選択した要素にハイライトや枠線を表示して、視覚的にフィードバックを提供
- マウスクリックイベントをリスニングして、ユーザーが選択した要素を検出

**データの取り扱い**: スクリプトはページ内での操作のみに使用され、取得したデータは外部に送信されません。

---

### notifications（通知）
**使用目的**: 自動抽出機能の利用可否を通知するため

**具体的な用途**:
- イベント情報の入力完了時に、自動抽出設定を保存できることをユーザーに通知
- 自動抽出が適用されたことをポップアップのヘッダーに表示
- エラーや重要な情報をユーザーに通知

**データの取り扱い**: 通知はブラウザ内でのみ表示され、通知内容が外部に送信されることはありません。

---

## プライバシーに関する重要事項

✅ **外部サーバーへのデータ送信なし**: この拡張機能は独自の外部サーバーを持たず、すべての処理はブラウザ内で完結します

✅ **最小限の権限**: 機能の提供に必要最小限の権限のみを要求しています

✅ **透明性**: すべてのソースコードはGitHubで公開されており、動作を確認できます

✅ **ユーザーコントロール**: すべてのデータは設定画面から削除可能で、拡張機能をアンインストールすれば完全に削除されます

---

## Permission Justification (English)

This extension requires the following permissions:

### activeTab
**Purpose**: To retrieve event information from the currently open web page

**Specific Uses**:
- Read text content from elements clicked by the user (event name, date/time, location, etc.)
- Implement highlighting functionality to enable element selection within the page
- Identify element positions using XPath and save them to auto-extraction settings

**Data Handling**: Retrieved information is stored only within the browser and is never sent to external servers.

---

### storage
**Purpose**: To save user settings and history in the browser

**Specific Uses**:
- **chrome.storage.sync**: Save auto-extraction settings, date/time formats, and duration button customizations (can be synced across devices)
- **chrome.storage.local**: Save event registration history locally (up to 30 items)

**Data Handling**: All data is stored within the browser through Chrome's Storage API. The extension does not send any data to proprietary external servers.

---

### scripting
**Purpose**: To enable element selection within web pages

**Specific Uses**:
- Enable element selection on the page when "Get Info from Page" button is clicked
- Display highlights and borders on selected elements for visual feedback
- Listen to mouse click events to detect user-selected elements

**Data Handling**: Scripts are used only for in-page operations. Retrieved data is not sent externally.

---

### notifications
**Purpose**: To notify users about auto-extraction functionality availability

**Specific Uses**:
- Notify users that auto-extraction settings can be saved when event information input is complete
- Display in the popup header that auto-extraction has been applied
- Notify users of errors or important information

**Data Handling**: Notifications are displayed only within the browser. Notification content is never sent externally.

---

## Important Privacy Information

✅ **No External Server Communication**: This extension has no proprietary external servers; all processing is completed within the browser

✅ **Minimal Permissions**: Only the minimum permissions necessary to provide functionality are requested

✅ **Transparency**: All source code is publicly available on GitHub for verification

✅ **User Control**: All data can be deleted from the settings page, and complete removal occurs upon extension uninstallation
