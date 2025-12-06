# Click-a-Vent

Webページの情報をクリックして選択し、Google Calendarにイベントを登録するChrome拡張機能です。

## 機能

- **ページから情報を選択**: Webページ上の要素をクリックして、イベント名、日付、場所を簡単に選択
- **Google Calendar連携**: 選択した情報を直接Google Calendarに登録
- **直感的なUI**: ハイライト表示で選択する要素が分かりやすい

## インストール方法

1. このリポジトリをクローンまたはダウンロード
2. Chromeで `chrome://extensions/` を開く
3. 右上の「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `Extension` フォルダを選択

## 使い方

1. **初回ログイン**
   - 拡張機能のアイコンをクリック
   - 「Googleにログイン」ボタンをクリックしてGoogle アカウントで認証

2. **イベントの登録**
   - 拡張機能のアイコンをクリック
   - 「ページから情報を入力」をクリック
   - ページ上の要素をクリックして選択:
     - **イベント名**: イベントのタイトルとなる要素をクリック
     - **日付・開始時刻**: 日時情報を含む要素をクリック
     - **場所**: 場所情報を含む要素をクリック
   - 右クリックでその項目をスキップ可能
   - ESCキーで選択をキャンセル
   - 「登録」ボタンでGoogle Calendarに追加

## 設定が必要な項目

### Google Cloud Consoleでの設定

この拡張機能を使用するには、Google Cloud Consoleで以下の設定が必要です:

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. Google Calendar APIを有効化
4. OAuth 2.0クライアントIDを作成:
   - アプリケーションの種類: Chrome拡張機能
   - 拡張機能のIDを入力（Chromeで拡張機能を読み込んだ後に表示されます）
5. 取得したクライアントIDを `manifest.json` の `oauth2.client_id` に設定

```json
"oauth2": {
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/calendar.events"
  ]
}
```

## アイコンについて

`Extension/icons/` フォルダには、拡張機能用のアイコンファイルが必要です:
- `icon16.png` (16x16ピクセル)
- `icon48.png` (48x48ピクセル)
- `icon128.png` (128x128ピクセル)

現在、`icon128.svg` がサンプルとして含まれています。実際に使用する際は、SVGをPNGに変換するか、独自のアイコン画像を用意してください。

オンラインツール（例: https://cloudconvert.com/svg-to-png）などでSVGをPNGに変換できます。

## ファイル構成

```
Extension/
├── manifest.json       # 拡張機能の設定ファイル
├── popup.html          # ポップアップのHTML
├── popup.css           # ポップアップのスタイル
├── popup.js            # ポップアップのロジック
├── content.js          # ページ内での要素選択機能
├── content.css         # 要素選択時のスタイル
├── icons/              # アイコン画像フォルダ
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # このファイル
```

## 技術仕様

- **Manifest Version**: 3
- **API使用**: 
  - Chrome Identity API (Google認証)
  - Chrome Storage API (トークン保存)
  - Chrome Tabs API (タブ操作)
  - Chrome Scripting API (コンテンツスクリプト)
  - Google Calendar API v3
- **権限**:
  - `identity`: Google認証
  - `storage`: ローカルストレージ
  - `activeTab`: アクティブなタブへのアクセス
  - `scripting`: コンテンツスクリプトの注入

## 注意事項

- この拡張機能はGoogle Calendarへのアクセス権限を要求します
- 初回使用時にGoogleアカウントでの認証が必要です
- 選択した要素のテキストが適切に取得できない場合は、手動で入力・修正できます
- 日付と時刻の形式は自動で認識されない場合があるため、手動入力が必要な場合があります

## ライセンス

MIT License

## 作成者

Click-a-Vent Development Team
