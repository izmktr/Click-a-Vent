# プライバシーポリシー

最終更新日: 2025年12月7日

## はじめに

Click-a-Vent（以下「本拡張機能」）は、ユーザーのプライバシーを尊重し、保護することに全力で取り組んでいます。

## 収集する情報

本拡張機能は、以下の情報をローカルおよびChromeの同期ストレージに保存します：

### 設定データ（Chrome同期ストレージ）
- 自動抽出設定（URL、XPath）
- 日付・時刻フォーマット設定
- 期間ボタンのカスタマイズ設定

### 履歴データ（ローカルストレージ）
- イベント登録履歴（最大30件）
- 登録日時、ページURL、イベント名、開始時刻、場所

## データの使用方法

収集された情報は、以下の目的でのみ使用されます：

1. **機能の提供**: Webページからイベント情報を抽出し、Googleカレンダーに登録する機能の提供
2. **ユーザー体験の向上**: 自動抽出機能により、繰り返しの操作を簡略化
3. **設定の同期**: Chrome同期機能を有効にしている場合、デバイス間で設定を共有

## データの保存と共有

### 保存場所
- **設定データ**: Chromeの同期ストレージ（chrome.storage.sync）
- **履歴データ**: Chromeのローカルストレージ（chrome.storage.local）

### 重要な保証
- ✅ **本拡張機能は、独自の外部サーバーにデータを送信することは一切ありません**
- ✅ 収集されたデータは、お使いのブラウザ内にのみ保存されます
- ✅ 第三者とデータを共有することはありません
- ✅ データの販売や広告目的での使用は一切行いません

## Googleカレンダーとの連携

本拡張機能は、Google Calendar API を使用せず、ブラウザの標準URLスキーム（`https://calendar.google.com/calendar/render`）を使用してカレンダーにイベントを追加します。これは単純なリンク遷移であり、Googleアカウントへの直接的なアクセスは行いません。

## 使用する権限

本拡張機能は、以下のChrome権限を使用します：

- **activeTab**: 現在のページから情報を取得するため
- **storage**: 設定と履歴をブラウザに保存するため
- **scripting**: ページ内の要素を選択可能にするため
- **notifications**: 自動抽出の通知を表示するため

## データの削除

ユーザーは、いつでも以下の方法でデータを削除できます：

1. **設定データの削除**: 設定画面から個別に削除、または拡張機能をアンインストール
2. **履歴データの削除**: 設定画面の履歴タブから個別削除、または拡張機能をアンインストール
3. **完全削除**: 拡張機能をアンインストールすると、すべてのデータが削除されます

## セキュリティ

本拡張機能は、以下のセキュリティ対策を実施しています：

- Manifest V3の最新セキュリティ基準に準拠
- 最小限の権限のみを要求
- XSS攻撃対策としてのContent Security Policy準拠
- 外部への通信は行わず、すべてローカルで処理

## 子供のプライバシー

本拡張機能は、13歳未満の子供を対象としていません。13歳未満の子供から意図的に個人情報を収集することはありません。

## プライバシーポリシーの変更

本プライバシーポリシーは、必要に応じて更新される場合があります。変更があった場合は、本ページに新しいプライバシーポリシーを掲載します。

## お問い合わせ

プライバシーに関するご質問やご懸念がある場合は、以下までご連絡ください：

- GitHub Issues: https://github.com/izmktr/Click-a-Vent/issues

---

**Privacy Policy (English)**

# Privacy Policy

Last updated: December 7, 2025

## Introduction

Click-a-Vent ("the Extension") is committed to respecting and protecting user privacy.

## Information We Collect

The Extension stores the following information locally and in Chrome's sync storage:

### Settings Data (Chrome Sync Storage)
- Auto-extraction settings (URLs, XPaths)
- Date and time format settings
- Duration button customization settings

### History Data (Local Storage)
- Event registration history (up to 30 items)
- Registration timestamps, page URLs, event names, start times, locations

## How We Use Information

Collected information is used solely for:

1. **Providing Functionality**: Extracting event information from web pages and registering to Google Calendar
2. **Improving User Experience**: Simplifying repetitive operations through auto-extraction features
3. **Settings Synchronization**: Sharing settings across devices when Chrome sync is enabled

## Data Storage and Sharing

### Storage Locations
- **Settings Data**: Chrome sync storage (chrome.storage.sync)
- **History Data**: Chrome local storage (chrome.storage.local)

### Important Guarantees
- ✅ **The Extension NEVER sends data to any external servers**
- ✅ All collected data is stored only within your browser
- ✅ We do not share data with third parties
- ✅ We never sell data or use it for advertising purposes

## Google Calendar Integration

The Extension does not use the Google Calendar API. Instead, it uses the browser's standard URL scheme (`https://calendar.google.com/calendar/render`) to add events to calendars. This is a simple link navigation and does not involve direct access to Google accounts.

## Permissions Used

The Extension uses the following Chrome permissions:

- **activeTab**: To retrieve information from the current page
- **storage**: To save settings and history in the browser
- **scripting**: To enable element selection within pages
- **notifications**: To display auto-extraction notifications

## Data Deletion

Users can delete data at any time:

1. **Delete Settings**: Remove individually from settings page or uninstall the extension
2. **Delete History**: Remove individually from history tab or uninstall the extension
3. **Complete Deletion**: Uninstalling the extension removes all data

## Security

The Extension implements the following security measures:

- Complies with Manifest V3 latest security standards
- Requests only minimal necessary permissions
- Follows Content Security Policy to prevent XSS attacks
- All processing is local; no external communication

## Children's Privacy

The Extension is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.

## Changes to Privacy Policy

This Privacy Policy may be updated as needed. Changes will be posted on this page.

## Contact

For privacy questions or concerns, please contact:

- GitHub Issues: https://github.com/izmktr/Click-a-Vent/issues
