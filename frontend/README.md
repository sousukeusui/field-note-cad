# 風除室DXF生成Webアプリ（フロントエンド）

現場メモ・手書き図面を AI 経由で得た JSON から、CAD互換の **R12 DXF** を生成するクライアント完結型 Web アプリです。処理（SVGプレビュー・DXF生成・ダウンロード）はすべてブラウザ内で行い、サーバーサイド処理は持ちません。

- 技術スタック: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + lucide-react
- 仕様: [`../docs/spec.md`](../docs/spec.md) / 実装手順: [`../docs/implementation-guide.md`](../docs/implementation-guide.md)
- このディレクトリ（`frontend/`）がアプリのルートです。`npm` / `docker` コマンドは原則ここで実行します。

## 必要要件

- **Node.js >= 20.9.0**（Next.js 16 の要件。開発は v22 系で確認）
- npm（同梱）
- 任意: Docker / Docker Compose（コンテナで動かす場合）

## セットアップ

```bash
cd frontend
npm install
```

## 開発（ホットリロード）

### ローカルで起動

```bash
npm run dev
```

→ http://localhost:3000 を開く。`app/`・`components/` 等を編集すると自動リロードされます。

### Docker で起動（ソースをマウントして dev サーバ）

```bash
# frontend/ で実行
docker compose up
```

`docker-compose.yml` がカレントをボリュームマウントし、コンテナ内で `npm install && npm run dev` を実行します（`node_modules` は匿名ボリュームで保護）。ホスト側でファイルを編集すればホットリロードされます。停止は `Ctrl+C`、後片付けは `docker compose down`。

## 本番ビルド

### 1) 通常ビルド

```bash
npm run build      # .next/ に最適化済み成果物を生成（standalone 含む）
npm run start      # 本番モードで起動（http://localhost:3000）
```

`next.config.ts` で `output: 'standalone'` を指定しているため、ビルド時に `.next/standalone/` に最小実行成果物（`server.js` 同梱）が生成されます。

### 2) standalone を直接起動（Docker runner と同じ起動方法）

```bash
npm run build
# 静的アセットと public を standalone 配下へコピー
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
# 起動
PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

### 3) Docker で本番同等ビルド

`Dockerfile` はマルチステージ（`deps` → `builder` → `runner`）。`runner` は `node:22-slim` に standalone 成果物のみを載せ、非root の `nextjs` ユーザーで `node server.js` を実行します。

```bash
# frontend/ で実行
docker build -t fudojshitsu-cad .
docker run --rm -p 3000:3000 fudojshitsu-cad
```

→ http://localhost:3000

## デプロイ（Firebase App Hosting）

当面は **Firebase App Hosting** を利用します（`apphosting.yaml` で設定予定）。App Hosting は Next.js を内部で自動ビルド・実行するため、**デプロイ時に上記 Dockerfile は使用しません**。Dockerfile はローカルのコンテナ実行と、将来の Cloud Run / 自宅サーバー運用フォールバック用という位置づけです。詳細は実装手順書 STEP 10 を参照。

## ディレクトリ概要

```
frontend/
├── app/            # ルートレイアウト・メイン1画面・globals.css
├── components/     # UI コンポーネント（ui/ は shadcn/ui 生成物）
├── lib/            # バリデーション・DXF生成・レイヤー定義・プロンプト等のロジック
├── types/          # TypeScript 型定義
├── public/
├── Dockerfile          # 本番同等（マルチステージ standalone）
├── docker-compose.yml  # 開発用（マウント + npm run dev）
└── next.config.ts      # output: 'standalone'
```

## よく使うコマンド

| 目的 | コマンド |
|---|---|
| 開発サーバ | `npm run dev` |
| Lint | `npm run lint` |
| 本番ビルド | `npm run build` |
| 本番起動 | `npm run start` |
| Docker 開発 | `docker compose up` |
| Docker 本番 | `docker build -t fudojshitsu-cad . && docker run --rm -p 3000:3000 fudojshitsu-cad` |
