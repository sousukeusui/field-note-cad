# Firebase App Hosting デプロイ手順

field-note-cad を Firebase App Hosting に公開するための手順書です。

> **前提知識：** App Hosting は GitHub リポジトリと直接連携し、Next.js を自動ビルド・実行します。
> `Dockerfile` はローカル/自宅サーバー用であり、App Hosting のデプロイには使用しません。
> 自宅の Ubuntu Server で運用したい場合は [deploy-home-server-ubuntu.md](./deploy-home-server-ubuntu.md) を参照してください。

---

## 事前準備

- Google アカウント
- GitHub リポジトリへの push 権限（`main` または `develop` ブランチ）

---

## 料金について

### プランの前提

App Hosting の利用には **Blaze プラン（従量課金）** への切り替えが必要です。
Firebase Console → プロジェクトの設定 → 「Blaze にアップグレード」から変更できます。
クレジットカードの登録が必要ですが、無料枠の範囲内であれば請求は発生しません。

### 無料枠（毎月リセット）

| 項目 | 無料枠 |
|---|---|
| リクエスト数 | 50万回/月 |
| CPU | 180,000 vCPU 秒/月 |
| メモリ | 360,000 GiB 秒/月 |
| 下り転送（Egress） | 10 GB/月 |
| ビルド時間 | 30 分/日 |

### 無料枠超過後の単価

| 項目 | 単価 |
|---|---|
| リクエスト | $0.0025 / 1,000 件 |
| CPU | $0.024 / 1,000 vCPU 秒 |
| メモリ | $0.0025 / 1,000 GiB 秒 |
| 下り転送 | $0.12 / GB |
| ビルド | $0.003 / ビルド分 |

> 料金は変更される場合があります。最新情報は [Firebase 料金ページ](https://firebase.google.com/pricing) を確認してください。

---

### このアプリの概算

field-note-cad は **処理がすべてブラウザ完結**（SVG描画・DXF生成・JSONバリデーション）の Next.js アプリです。サーバー側では静的ファイルを返すだけなので、CPU・メモリの消費は最小限です。

**想定ユースケース：社内・個人ツールとして少人数で使用**

| 条件 | 値 |
|---|---|
| 月間ユーザー数 | 〜10名 |
| 1ユーザーあたりのページロード | 〜20回/月 |
| 月間リクエスト合計 | 約 200 件 |
| 転送データ量 | 約 50〜100 MB/月（JS バンドル込み） |
| デプロイ頻度 | 月 5〜10 回（ビルド 2〜4 分/回） |

**概算コスト：ほぼ $0/月**

リクエスト数・CPU・メモリ・転送量すべて無料枠に収まります。
ビルド時間も月 40 分以内に収まるため、実質 **月額 $0** での運用が見込めます。

利用が拡大して月間ユーザーが 100 名規模になっても、静的ファイル中心の構成であれば
無料枠内か $1〜2/月 程度に収まる見込みです。

---

## STEP 1. Firebase プロジェクトを作成する

1. [Firebase Console](https://console.firebase.google.com/) を開く
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `field-note-cad`）
4. Google アナリティクスは任意（不要なら無効化）
5. 「プロジェクトを作成」をクリック

作成後、画面上部に表示される **プロジェクト ID** をメモしておく（例: `field-note-cad-xxxxx`）。

---

## STEP 2. App Hosting を有効化して backend を作成する

1. Firebase Console の左サイドバーから **「App Hosting」** を選択する
2. 「使ってみる」または「バックエンドを作成」をクリック
3. 以下の項目を設定する

| 項目 | 設定値 |
|---|---|
| リージョン | `asia-northeast1`（東京）を推奨 |
| GitHub リポジトリ | 認証画面が開くので Google アカウントで GitHub を連携し、対象リポジトリを選択 |
| ライブブランチ | `main`（または `develop`） |
| ルートディレクトリ | `frontend` ← **必ずここを指定** |
| バックエンド ID | 任意（例: `field-note-cad`） |

4. 「バックエンドを作成」をクリック

> **ルートディレクトリの指定が重要です。**
> このリポジトリはモノレポ構成（`frontend/` にNext.jsを配置）なので、
> `frontend` と入力しないと `package.json` が見つからずビルドに失敗します。

---

## STEP 3. `apphosting.yaml` の設定を確認する

`frontend/apphosting.yaml` はリポジトリに作成済みです。
App Hosting は自動でこのファイルを読み込んでインスタンスの設定を行います。

```yaml
runConfig:
  cpu: 1
  memoryMiB: 512
  maxInstances: 3   # 同時起動するインスタンスの上限
  minInstances: 0   # アクセスがないときはインスタンスを停止（コスト削減）
  concurrency: 80   # 1インスタンスあたりの同時リクエスト数
```

このアプリはサーバーサイド処理を持たない静的中心の Next.js なので、この最小構成で十分です。

---

## STEP 4. 初回デプロイを確認する

backend 作成後、Firebase Console の **「App Hosting」→ 対象 backend → 「ロールアウト」タブ** でビルドの進行状況を確認できます。

ライブブランチへの push が検知されると自動でビルド・デプロイが始まります。ビルドには通常 **3〜5 分** かかります。

---

## STEP 5. `.firebaserc` のプロジェクト ID を更新する（CLI使用時のみ）

CLIを使う場合は、リポジトリルートの `.firebaserc` を開き、`YOUR_FIREBASE_PROJECT_ID` を実際の ID に変更する。

```json
{
  "projects": {
    "default": "field-note-cad-xxxxx"
  }
}
```

> Console からの操作のみでデプロイする場合はこの手順は不要です。

---

## STEP 6. 公開 URL で動作確認する

デプロイ完了後、Console の「App Hosting」画面に表示される URL（例: `https://field-note-cad-xxxxx.web.app`）にアクセスして以下を確認する。

- [ ] トップページが表示される
- [ ] 「サンプルJSON読込」でプレビューが描画される
- [ ] 「寸法入力でJSON生成」ダイアログが開き、左パネルに反映できる
- [ ] DXF保存ボタンが機能する
- [ ] 不正 JSON 入力時にエラーカードが表示される

---

## カスタムドメインの設定（Cloudflare 使用）

### 1. Cloudflare でドメインを購入する

1. [cloudflare.com](https://www.cloudflare.com/) にアクセスしてログイン（アカウント未作成の場合は無料で作成）
2. 左サイドバーの「**Domain Registration**」→「**Register Domains**」をクリック
3. 希望のドメイン名を検索し、「**Purchase**」をクリックして購入手続きを進める

**料金目安（年額・原価販売のため他社より安め）**

| ドメイン | 年額目安 |
|---|---|
| `.com` | 約 $10〜11 |
| `.net` | 約 $11〜12 |
| `.dev` | 約 $13〜14 |
| `.app` | 約 $14〜15 |
| `.jp` | 約 $9〜10 |
| `.io` | 約 $37〜38 |

---

### 2. Firebase Console でカスタムドメインを追加する

1. Firebase Console の「**App Hosting**」→ 対象 backend を開く
2. 「**ドメイン**」タブ →「**カスタムドメインを追加**」をクリック
3. 購入したドメイン名（例: `example.com`）を入力して「続行」

Firebase が以下の2種類の DNS レコードを発行します。次のステップで Cloudflare に追加します。

- **TXT レコード**（ドメインの所有権確認用）
- **CNAME レコード**（トラフィックの転送先）

---

### 3. Cloudflare DNS に TXT レコードを追加する（所有権確認）

1. Cloudflare Console の左サイドバーから対象ドメインを選択
2. 「**DNS**」→「**レコード**」→「**レコードを追加**」をクリック
3. 以下のように入力する

| 項目 | 入力値 |
|---|---|
| タイプ | `TXT` |
| 名前 | Firebase Console に表示された値（例: `@` または `_firebase-app-hosting`） |
| コンテンツ | Firebase Console に表示された値をそのまま入力 |
| プロキシ | **「DNS のみ」（グレー雲）** |

4. 「**保存**」をクリック

---

### 4. Cloudflare DNS に CNAME レコードを追加する（ルーティング）

1. 同じく「**レコードを追加**」をクリック
2. 以下のように入力する

| 項目 | 入力値 |
|---|---|
| タイプ | `CNAME` |
| 名前 | `www`（またはサブドメインなしなら `@`） |
| ターゲット | Firebase Console に表示された値（例: `xxxx.web.app`） |
| プロキシ | **「DNS のみ」（グレー雲）** ← 必須 |

3. 「**保存**」をクリック

> **⚠ プロキシは必ず「DNS のみ（グレー雲）」にすること**
>
> Cloudflare のデフォルトは「プロキシ有効（オレンジ雲）」ですが、
> この状態だと Firebase が SSL 証明書の発行に使う検証リクエストを
> Cloudflare が横取りしてしまい、証明書の発行に失敗します。
> グレー雲（DNS のみ）に設定することで、リクエストが Firebase に直接届くようになります。

---

### 5. Firebase での検証完了を待つ

Firebase Console の「ドメイン」タブでステータスが「**アクティブ**」に変わるのを確認します。DNS の伝搬には通常 **数分〜30分** かかります。

SSL 証明書は Firebase が自動で発行するため、追加の設定は不要です。

---

## 以降の更新デプロイ

ライブブランチ（`main` など）に push するたびに、App Hosting が自動でビルド・デプロイします。
Console の「ロールアウト」タブでいつでも状況を確認・ロールバックできます。

---

## トラブルシューティング

### ビルドが失敗する

Console の「ロールアウト」タブにあるビルドログを確認する。主な原因:

- **ルートディレクトリが間違っている** → STEP 2 の設定を確認。`frontend` を指定しているか
- **ビルドエラー** → ローカルで `cd frontend && npm run build` を先に確認

### `apphosting.yaml` が認識されない

ファイルが `frontend/apphosting.yaml`（ルートディレクトリの直下）に存在することを確認する。

### カスタムドメインを設定したい

上記「カスタムドメインの設定（Cloudflare 使用）」セクションを参照。

---

## ローカル Docker での事前確認（任意）

push 前に本番同等の動作を確認したい場合:

```bash
cd frontend
docker build -t field-note-cad .
docker run -p 3000:3000 field-note-cad
```

`http://localhost:3000` で確認後、問題なければ push する。

---

## 参考リンク

- [Firebase App Hosting ドキュメント](https://firebase.google.com/docs/app-hosting)
- [App Hosting + Next.js のガイド](https://firebase.google.com/docs/app-hosting/get-started)
- [apphosting.yaml リファレンス](https://firebase.google.com/docs/app-hosting/configure)
