# Firebase App Hosting デプロイ手順

field-note-cad を Firebase App Hosting に公開するための手順書です。

> **前提知識：** App Hosting は GitHub リポジトリと直接連携し、Next.js を自動ビルド・実行します。
> `Dockerfile` はローカル/自宅サーバー用であり、App Hosting のデプロイには使用しません。

---

## 事前準備

### 必要なアカウント・権限

- Google アカウント
- Firebase プロジェクト（未作成の場合は後述の手順で作成）
- GitHub リポジトリへの push 権限

### ローカル環境の要件

| ツール | バージョン目安 | 確認コマンド |
|---|---|---|
| Node.js | 20.9.0 以上 | `node -v` |
| npm | 10 以上 | `npm -v` |
| Firebase CLI | 最新版 | `firebase --version` |

### Firebase CLI のインストール

```bash
npm install -g firebase-tools
```

---

## STEP 1. Firebase プロジェクトを作成する

1. [Firebase Console](https://console.firebase.google.com/) を開く
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `field-note-cad`）
4. Google アナリティクスは任意（不要なら無効化）
5. 「プロジェクトを作成」をクリック

作成後、**プロジェクト ID** をメモしておく（例: `field-note-cad-xxxxx`）。

---

## STEP 2. Firebase CLI にログインする

```bash
firebase login
```

ブラウザが開くので Google アカウントで認証する。

認証済みかどうかは以下で確認できる:

```bash
firebase projects:list
```

---

## STEP 3. `.firebaserc` のプロジェクト ID を更新する

リポジトリルートの `.firebaserc` を開き、`YOUR_FIREBASE_PROJECT_ID` を実際の ID に変更する。

```json
{
  "projects": {
    "default": "field-note-cad-xxxxx"
  }
}
```

---

## STEP 4. App Hosting backend を作成する

リポジトリルート（`field-note-cad/`）で以下を実行する。

```bash
firebase apphosting:backends:create
```

対話式プロンプトで以下を設定する:

| 質問 | 入力値 |
|---|---|
| Select a Firebase project | 作成したプロジェクトを選択 |
| Provide a name for this backend | `field-note-cad`（任意） |
| Select a region | `asia-northeast1`（東京）を推奨 |
| Set the root directory of your app | `frontend` ← **必ずここを指定** |
| Connect to a GitHub repository | GitHub を認証してリポジトリを選択 |
| Set the live branch | `main`（または `develop`） |

> **`frontend` の指定が重要です。** App Hosting はモノレポ構成に対応しており、
> root directory を `frontend` に設定することで `frontend/package.json` を起点に
> Next.js を自動ビルドします。

---

## STEP 5. `apphosting.yaml` の設定内容を確認する

`frontend/apphosting.yaml` は以下の内容で作成済みです。必要に応じて調整してください。

```yaml
runConfig:
  cpu: 1
  memoryMiB: 512
  maxInstances: 3   # 同時起動するインスタンスの上限
  minInstances: 0   # 0 にするとアクセスがないときはインスタンスを落とす（コスト削減）
  concurrency: 80   # 1インスタンスあたりの同時リクエスト数
```

このアプリはサーバーサイド処理を持たない静的中心の Next.js なので、最小構成で十分です。

---

## STEP 6. 初回デプロイを実行する

App Hosting は GitHub の対象ブランチへの push を検知して自動ビルド・デプロイします。

```bash
git push origin main
```

Firebase Console の「App Hosting」→ 対象 backend → 「Rollouts」タブでビルドの進行状況を確認できます。

ビルドには通常 3〜5 分かかります。

### 手動デプロイしたい場合

```bash
firebase apphosting:backends:get
# backend ID を確認してから
firebase deploy --only apphosting
```

---

## STEP 7. 公開 URL で動作確認する

デプロイ完了後、Console に表示される URL（例: `https://field-note-cad-xxxxx.web.app`）にアクセスして以下を確認する。

- [ ] トップページが表示される
- [ ] 「サンプルJSON読込」でプレビューが描画される
- [ ] 「寸法入力でJSON生成」ダイアログが開き、左パネルに反映できる
- [ ] DXF保存ボタンが機能する
- [ ] 不正 JSON 入力時にエラーカードが表示される

---

## トラブルシューティング

### ビルドが失敗する

Firebase Console のビルドログを確認する。主な原因:

- `frontend/` の指定が間違っている → STEP 4 の root directory 設定を確認
- `package.json` の `build` スクリプトがエラー → ローカルで `npm run build` を先に確認

### `apphosting.yaml` が認識されない

ファイルが `frontend/apphosting.yaml`（root directory の直下）に存在することを確認する。

### カスタムドメインを設定したい

Firebase Console → App Hosting → 対象 backend → 「ドメイン」タブ → 「カスタムドメインを追加」から設定できる。DNS の TXT レコード検証が必要。

---

## ローカル Docker での最終確認（デプロイ前に推奨）

本番同等の動作を確認したい場合は、Docker でビルドして確認する。

```bash
cd frontend

# 本番イメージをビルド
docker build -t field-note-cad .

# コンテナ起動
docker run -p 3000:3000 field-note-cad
```

`http://localhost:3000` で動作確認後、問題なければ push → 自動デプロイ。

---

## 参考リンク

- [Firebase App Hosting ドキュメント](https://firebase.google.com/docs/app-hosting)
- [App Hosting + Next.js のガイド](https://firebase.google.com/docs/app-hosting/get-started)
- [apphosting.yaml リファレンス](https://firebase.google.com/docs/app-hosting/configure)
