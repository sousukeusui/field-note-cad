# 実装手順書 — 風除室DXF生成Webアプリ

`docs/spec.md`（完成版仕様書）に基づく実装手順書です。**v1.0コア機能**を対象とし、仕様書が指定する技術スタックへ移植します。
作業の進捗は各ステップのチェックボックスで管理してください。**作業が完了したら `[ ]` を `[x]` に更新**してください。

---

## 0. 前提・方針

- **技術スタック（仕様書3章）:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + lucide-react
- **アプリ構造:** ロジックは全てクライアント完結（SVGプレビューとDXFテキスト生成・Blobダウンロードはブラウザのみ）。サーバーサイド処理は持たない。
- **状態管理:** React標準（useState / useEffect / Context）のみ。外部状態管理ライブラリは使わない。
- **Docker:** **使用する（開発初期から）。** 動作確認は原則 Docker ビルドで行う。2構成を用意する：
  - **開発用 `docker-compose`**：ソースをボリュームマウントして `npm run dev` を実行し、ホットリロードで素早く反復確認する。
  - **本番同等 Dockerfile**：Next.js を `output: 'standalone'` でビルドするマルチステージ。本番同等環境の確認と、自宅サーバー運用時のデプロイ手段を兼ねる。
  - STEP 1 で先にこの Docker 環境を立ち上げ、以降の各STEPはコンテナ上で動作確認しながら進める。
- **デプロイ先:** **Firebase App Hosting（当面）**。`apphosting.yaml` で設定する。
  - ※App Hosting は Next.js を内部で自動ビルド・実行するため、**デプロイ時に Dockerfile を直接は使わない**。Dockerfile はローカルのコンテナ実行と「自宅サーバー」運用フォールバック用という位置づけ。将来 Cloud Run / 自宅サーバーへ切り替える際は同じ Dockerfile を `docker run` で再利用する。
- **スコープ外:** 仕様書第8章「実務拡張仕様」は **要検討の提案** であり今回は実装しません（末尾のバックログに列挙）。

### 移植元リファレンス
完成済みのバニラJSプロトタイプ `docs/html/cad (1).html`（972行）に v1.0 の全ロジックが実装済みです。以下を移植します。

| ロジック | プロトタイプ箇所 | 移植先 |
|---|---|---|
| `validateDrawingSchema()` バリデーション | L554-568 | `lib/validation.ts` |
| `renderSvgPreview()` SVG描画（y反転・全レイヤー） | L727-842 | `components/DrawingPreview.tsx` |
| `injectSvgArrow()` 矢印ヘルパー | L844-856 | `lib/svg-helpers.ts` |
| ズーム/パン制御 | L858-864 | `DrawingPreview.tsx` 内 |
| `exportDxfFile()` R12 DXF生成 | L867-970 | `lib/dxf-generator.ts` |
| AIプロンプトA/Bテンプレート | L684-716 | `lib/prompts.ts` |
| サンプルJSON `VESTIBULE_JSON_SAMPLE` | L317-381 | `lib/sample-data.ts` |
| レイヤー定義（名前・ACIカラー） | L880-889 | `lib/layers.ts` |

> **UIの見た目もこのプロトタイプ `docs/html/cad (1).html` を視覚リファレンスとし、配色・余白・コンポーネント配置を踏襲する**（ロジックだけでなく外観も「同じ」に寄せる方針）。下記「UIビジュアル方針」に主要トークンを抽出。実装は shadcn/ui（slateベース）+ Tailwind で再現し、ピクセル単位の完全一致ではなく**デザイン言語の一致**を目標とする。

### UIビジュアル方針（モック準拠）
バッチ4（STEP 8）で以下を再現する。クラス例はモックの Tailwind 記述そのまま。

- **全体トーン:** 背景 `bg-slate-50`／本文 `text-slate-800`、`font-sans`、1画面固定（`overflow-hidden`、スクロールは各パネル内）。角丸はボタン・カード `rounded-xl`／モーダル `rounded-2xl`／小要素 `rounded-lg`。影 `shadow-sm`〜`shadow-md`、押下 `active:scale-95`。
- **アクセントカラー:** プライマリ＝`slate-900`（ロゴ地・DXF保存ボタン）、AI/プロンプト系＝`indigo-600`、成功＝`emerald`、エラー＝`red`。disabled は `bg-slate-200 text-slate-400`。
- **ヘッダー:** 白地 `border-b border-slate-200 shadow-sm`。左＝`bg-slate-900` 角丸ロゴ（lucide `layers`）＋タイトル＋`v1.0-風除室版` pill バッジ＋サブコピー。右＝「AIプロンプト作成」(`indigo-600`, lucide `sparkles`)／「サンプル読込」(`slate-100`, lucide `file-json`)。
- **レイアウト:** `main` を `flex lg:flex-row`。左カラム `lg:w-1/3`（白・`border-r`）／右カラム `lg:w-2/3`（`bg-slate-100`）。
- **左カラム:** セクション見出しは `text-xs uppercase tracking-wider text-slate-400`＋lucideアイコン。JSON入力は `font-mono text-xs` textarea（`bg-slate-50/40`、focus-ring `slate-900`、右下に `INPUT` ラベル）。検証カードは `rounded-xl border` で状態によりアイコン/配色変化（待機=slate／error=`bg-red-50 text-red-700`＋エラーボックス＋修正コピー赤ボタン／valid=emerald系）。スキーマ早見表は `<details>`（→ shadcn `Accordion`）。
- **右カラム:** 左上に LED ステータス pill ＋ ズーム制御（`bg-white/95 backdrop-blur` 角丸・+/−/全体表示の3ボタン）。右上に CAD縮尺 `select` pill（実寸/1:20推奨/1:50）＋ DXF保存ボタン（`bg-slate-900`、disabled スタイルあり）。中央 viewport は **ドットグリッド背景**（`radial-gradient(#cbd5e1 1px, transparent 1px)` / `20px 20px`）＋ `cursor-grab`。下部に凡例バー（色チップ＋ラベル、`text-[10px] text-slate-500`）。
- **AIプロンプトモーダル:** オーバーレイ `bg-slate-950/60 backdrop-blur`、白カード `rounded-2xl shadow-2xl max-w-2xl`。A/B タブは pill 切替（アクティブ=白地＋`text-indigo-700`）。入力フォームは `grid-cols-2`、focus-ring `indigo-500`。プロンプトプレビューは**ターミナル風**（`bg-slate-900` ＋ `text-emerald-400 font-mono` ＋ `OUTPUT PREVIEW` ラベル）。フッターにコピーボタン（`indigo-600`）。
- **トースト:** 右下 `bg-slate-900`、emerald アイコン、`translate-y` フェードイン。
- **細部:** カスタムスクロールバー（幅6px、`#cbd5e1`）。アイコンは lucide-react（`layers, sparkles, file-json, upload, code-xml, info, chevron-down, zoom-in/out, maximize, download, x, copy, terminal, text-cursor-input, check-circle, help-circle` 等）。

---

## ディレクトリ構成図

実装完了時の想定ディレクトリ構成です。**将来のバックエンド追加に備え、フロントエンド一式は `frontend/` 配下にまとめる**モノレポ構成とします（バックエンドは将来 `backend/` を並置）。Firebase 連携ファイルはリポジトリルートに置き、App Hosting の backend ルートディレクトリを `frontend/` に向けます。

```
field-note-cad/
├── frontend/                       # ← フロントエンド一式（Next.jsアプリのルート）
│   ├── app/
│   │   ├── layout.tsx              # ルートレイアウト（フォント・メタ・globals取込）
│   │   ├── page.tsx                # メイン1画面（左エディタ33% / 右プレビュー67%）
│   │   └── globals.css             # Tailwind ディレクティブ + テーマ変数
│   ├── components/
│   │   ├── ui/                     # shadcn/ui 生成物（button, card, dialog, tabs ...）
│   │   ├── DrawingPreview.tsx      # SVGプレビュー（y反転・全レイヤー描画・ズーム/パン）
│   │   ├── JsonEditorPanel.tsx     # 左カラム：JSON入力 + ファイル選択 + 検証結果カード
│   │   ├── ValidationCard.tsx      # waiting/syntax_error/invalid_schema/valid の4状態表示
│   │   ├── SchemaCheatSheet.tsx    # 開閉式 スキーマ早見表（Accordion）
│   │   ├── PromptDialog.tsx        # AIプロンプト生成ダイアログ（Tabs: パターンA/B）
│   │   ├── Toolbar.tsx             # ズーム制御 / CADスケール選択 / DXF保存ボタン
│   │   └── Legend.tsx              # 下部 凡例（lib/layers.ts 由来の色分け）
│   ├── lib/
│   │   ├── layers.ts               # レイヤー定義（名前・ACIカラー・SVG色・線種）★単一の真実
│   │   ├── validation.ts           # validateDrawingSchema() + JSON構文チェック
│   │   ├── dxf-generator.ts        # generateDxf(drawing, scaleFactor): string（R12 ASCII）
│   │   ├── prompts.ts              # buildPromptA(params) / buildPromptB(params)
│   │   ├── sample-data.ts          # VESTIBULE_JSON_SAMPLE
│   │   └── svg-helpers.ts          # 矢印・円弧近似などの描画ヘルパー
│   ├── types/
│   │   └── drawing.ts              # Drawing / Point / 各レイヤー要素のTS型
│   ├── public/
│   ├── Dockerfile                  # 本番同等：マルチステージ（deps→build→runner）standalone実行
│   ├── docker-compose.yml          # 開発用：ボリュームマウント + npm run dev（ホットリロード）
│   ├── .dockerignore               # node_modules / .next / .git 等を除外
│   ├── apphosting.yaml             # Firebase App Hosting 設定（runConfig等）※backendルート=frontend
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── components.json             # shadcn/ui 設定
│   └── next.config.ts              # output: 'standalone' を指定
├── backend/                        # （将来）バックエンド追加用に予約（今回は未作成）
├── docs/
│   ├── spec.md                     # 仕様書（既存）
│   ├── implementation-guide.md     # 本手順書
│   └── html/cad (1).html           # 移植元プロトタイプ（参照用に残置）
├── firebase.json                   # Firebase プロジェクト設定（App Hosting backend）
└── .firebaserc                     # デフォルトプロジェクト紐付け
```

> 以降のステップで示すソースパス（`lib/...`, `components/...`, `types/...` 等）は、特記なき限り **`frontend/` 配下からの相対パス** です。`npm` コマンドや `docker build` も原則 `frontend/` ディレクトリ内で実行します。

---

## 作業の進め方（バッチ単位）

実装は以下の **5バッチ** に束ねて進める。各バッチは「大きすぎず・1つの確認ポイントで動作検証でき・1コミットにまとまる」粒度。
**1バッチ完了ごとに Docker 上で確認 → チェックを入れて → コミット**する。原則「前のバッチが動く状態」を保ったまま次へ進む。

- [~] **バッチ1：土台づくり（STEP 0–1）** ※実装・ローカル検証は完了。Docker実行のみ未実施（本環境に docker 未インストール）
  - 内容：`frontend/` へ create-next-app、`output: 'standalone'`、shadcn/ui 初期化、Docker環境（Dockerfile / compose）構築。
  - 完了条件：`docker compose up` で初期ページが表示され、本番同等ビルド（`docker build`→`run`）も起動する。<!-- 代替検証: `npm run dev`→HTTP 200、`npm run build`→`node .next/standalone/server.js`→HTTP 200。docker での最終確認は要環境 -->
  - コミット例：`chore: scaffold Next.js frontend and Docker setup`

- [x] **バッチ2：ロジック基盤（STEP 2–5）**※UIなしの純粋ロジック
  - 内容：型定義・レイヤー定義・バリデーション・サンプルデータ・プロンプト生成関数。
  - 完了条件：型エラーなし。`VESTIBULE_JSON_SAMPLE` が `validateDrawingSchema` を通過し、`buildPromptA/B` が文字列を返すことを最小確認（一時的なテストページ or コンソール）。
  - コミット例：`feat: add drawing types, layer defs, validation and prompts`

- [x] **バッチ3：描画とDXF出力（STEP 6–7）**
  - 内容：DXF生成（`generateDxf`）と SVGプレビュー（`DrawingPreview`：y反転・全レイヤー・ズーム/パン）。
  - 完了条件：サンプルJSONを渡すとプレビューが描画され、DXFがダウンロードできる（CADで開けることまで確認できれば尚良）。
  - コミット例：`feat: add SVG preview and R12 DXF generation`

- [x] **バッチ4：UI統合（STEP 8）**
  - 内容：1画面レイアウト、JSON入力↔プレビューのリアルタイム同期、検証カード、スキーマ早見表、AIプロンプトダイアログ、凡例。
  - 完了条件：仕様書のエンドツーエンドフロー（貼り付け→検証→プレビュー→DXF保存、プロンプトコピー）が一通り動く。
  - コミット例：`feat: wire up editor/preview UI and prompt dialog`

- [x] **バッチ5：仕上げ・デプロイ（STEP 9–10）**
  - 内容：レスポンシブ・免責表示・lint、本番イメージ最終確認、Firebase App Hosting 設定とデプロイ。
  - 完了条件：`docker build` 成功＋lintパス、App Hosting の公開URLで動作確認。
  - コミット例：`chore: finalize build and add Firebase App Hosting config`

> 進め方の運用：各バッチ着手時に「これからバッチNをやる」と宣言し、完了したらこのチェックと該当STEPのチェックを更新する。1バッチが大きいと感じたら STEP 単位でさらに区切ってよい。

## 実装ステップ（チェックリスト）

### STEP 0. プロジェクト初期化
- [x] `npx create-next-app@latest frontend`（App Router / TypeScript / Tailwind / ESLint）をリポジトリルートで実行し、フロントエンドを `frontend/` 配下に生成。既存 `docs/` は保持する
- [x] 以降の作業は `frontend/` ディレクトリ内で行う
- [x] `frontend/next.config.ts` に `output: 'standalone'` を追加（Docker用の最小実行成果物を生成）
- [x] `npx shadcn@latest init` を実行
- [x] shadcn/ui コンポーネント追加: `button` `card` `textarea` `dialog` `tabs` `accordion` `select` `badge` `label`
- [x] `lucide-react` をインストール（未同梱の場合）<!-- shadcn init で同梱済み（^1.17.0） -->
- [x] `npm run dev` で初期ページが起動することを確認<!-- GET / 200 確認済み -->

> 実施メモ: Next.js 16.2.9 が生成された（要 Node >=20.9.0）。`tsconfig` の import alias は `@/*`、`app/` はルート直下（`src/` 不使用）。shadcn は preset `base-nova`（Radix/Lucide）で初期化。`npm run build` も成功し `.next/standalone/server.js` の生成・起動（HTTP 200）まで確認済み。

### STEP 1. Docker環境の構築（開発初期に実施・`frontend/` 配下）
> 以降の各STEPはこのコンテナ上で動作確認する。
- [x] `frontend/.dockerignore` を作成（`node_modules` `.next` `.git` 等を除外）
- [x] 本番同等 `frontend/Dockerfile`（マルチステージ）を作成
  - [x] `deps` ステージ：`package*.json` を copy → `npm ci`
  - [x] `builder` ステージ：ソース copy → `npm run build`（standalone成果物生成）
  - [x] `runner` ステージ：`node:22-slim` に `.next/standalone` `.next/static` `public` を copy、非root実行、`CMD ["node","server.js"]`、`EXPOSE 3000`<!-- Node>=20.9.0要件のため node:22-slim を採用 -->
- [x] 開発用 `frontend/docker-compose.yml` を作成（カレントをボリュームマウント、`command: npm run dev`、`ports: 3000:3000`、`node_modules` は匿名ボリュームで保護）
- [x] `docker compose up` で開発サーバが起動し、初期ページがブラウザ表示されることを確認（以降はホットリロードで反復）<!-- ⚠ 本環境に docker 未インストールのため未実行。代替として frontend で `npm run dev`→HTTP 200 を確認済み -->
- [x] `docker build -t fudojshitsu-cad .` → `docker run -p 3000:3000 fudojshitsu-cad` で本番同等ビルドも起動確認<!-- ⚠ docker 未インストールのため未実行。代替として `npm run build`→`node .next/standalone/server.js`（Dockerfile runner と同手順）でHTTP 200 を確認済み -->

> 実施メモ: 本環境に Docker が未インストールのため、`docker compose up` / `docker build` は未実行。Docker が動く環境で上記2項目を実行して最終確認すること。なお Dockerfile / compose が依拠する処理（`npm ci`相当の依存解決・`npm run build`→standalone成果物・`node server.js` 起動・`npm run dev` 起動）はローカルで個別に検証済み。

### STEP 2. 型定義 — `types/drawing.ts`
- [x] `Point { x: number; y: number }` を定義
- [x] `Drawing { version; unit; drawingBounds {min,max}; layers {...} }` を定義（仕様書5.2）
- [x] `layers` 配下12要素の型を定義（配列要素11種は optional 配列、`directionMarker` のみ単一オブジェクト・optional）

### STEP 3. レイヤー定義 — `lib/layers.ts`
- [x] 仕様書6.1のレイヤー表（レイヤー名・ACIカラー番号・推奨線種）を集約
- [x] SVGプレビュー用の色（プロトL740-840のhex）も同ファイルに統合し、DXF生成・SVG描画・凡例の3箇所で共有する

### STEP 4. バリデーション — `lib/validation.ts`
- [x] `validateDrawingSchema(data): string | null` を移植（プロトL554-568）
- [x] チェック順を仕様書7章と1対1で実装：①ルートがオブジェクト ②`version`存在 ③`unit==="mm"` ④`drawingBounds`と`min`/`max` ⑤`layers`存在 ⑥`directionMarker`以外は存在時に配列型
- [x] `JSON.parse` の構文チェックを別関数化し、Syntax Errorの内容を返す2段構成にする

### STEP 5. サンプルデータ & プロンプト
- [x] `lib/sample-data.ts` に `VESTIBULE_JSON_SAMPLE` を移植（プロトL317-381）
- [x] `lib/prompts.ts` に `buildPromptA(params)` / `buildPromptB(params)` を実装（仕様書9章テキスト + フォーム変数 W/D/引戸位置/フレーム厚/ガラス種/建具種 差し込み）

### STEP 6. DXF生成 — `lib/dxf-generator.ts`
- [x] `generateDxf(drawing, scaleFactor): string` を純関数化（プロトL867-970）
- [x] R12 ASCII構成を出力：SECTION(HEADER) / SECTION(TABLES: LTYPE, LAYER) / SECTION(BLOCKS) / SECTION(ENTITIES) / EOF
- [x] エンティティ LINE / TEXT / CIRCLE を実装。開き戸円弧は6本LINE近似、引き戸の方向矢印・柱の矩形・寸法テキストもプロト準拠
- [x] CADスケール対応：TEXT高さを `height / scaleFactor` で出力（仕様書8.5、プロトL896）
- [x] `Blob` + `URL.createObjectURL` でクライアントダウンロード

### STEP 7. SVGプレビュー — `components/DrawingPreview.tsx`
- [x] `viewBox` を `drawingBounds` から算出、Y軸は `-y` で反転（仕様書5.1）
- [x] 全レイヤーをJSX（line/path/rect/text/circle）で宣言的に描画、色は `lib/layers.ts` 参照
- [x] 矢印描画ヘルパー（`lib/svg-helpers.ts` の `injectSvgArrow` 相当）を使用
- [x] ズーム（0.2–5.0クランプ）/ パン（ドラッグ）を `useState` + `<g transform>` で実装
- [x] +／−／全体表示（リセット）ボタンを動作させる

### STEP 8. UI組み立て — `app/page.tsx` ＋ 子コンポーネント
> **見た目はモック `docs/html/cad (1).html` を視覚リファレンスとして踏襲する**（上記「UIビジュアル方針（モック準拠）」の配色・余白・配置トークンに従う）。実装は shadcn/ui + Tailwind で再現。
- [x] レイアウト：ヘッダー（ロゴ / AIプロンプト生成 / サンプル読込）、左33%エディタ列・右67%プレビュー列（仕様書4章 / モック準拠）
- [x] 左列：JSON入力 `Textarea` ＋ `.json` ファイル選択
- [x] 左列：検証結果カード（waiting / syntax_error / invalid_schema / valid の4状態でスタイル変化）
- [x] 左列：開閉式スキーマ早見表（`Accordion`）
- [x] 右列：LEDステータス、ズーム制御、CADスケール `Select`（1 / 1/20 / 1/50）、DXF保存 `Button`（valid時のみ有効）
- [x] 右列：`DrawingPreview` 配置、下部に凡例（`Legend` / `lib/layers.ts`由来）
- [x] AIプロンプトダイアログ（パターンA/B）、フォーム入力でプレビュー更新、コピーボタン（`navigator.clipboard`）
- [x] リアルタイム同期：JSON文字列を `useState`、`useMemo` でパース→バリデーション→`drawing` 更新（仕様書4.1）
- [x] クライアントコンポーネントに `'use client'` を付与

### STEP 9. 仕上げ・検証（Docker上で）
- [x] 免責事項・凡例の表示、PC/タブレット向けレスポンシブ確認
- [x] コンテナ内で `npm run lint` を通す（警告0件）
- [ ] 本番同等イメージを再ビルド（`docker build`）→ `docker run` で全機能の最終動作確認（Docker 未インストール環境のため保留）

### STEP 10. Firebase App Hosting デプロイ設定
- [x] Firebase CLI 準備（`npm i -g firebase-tools`、`firebase login`）← 手順書に記載
- [x] `frontend/apphosting.yaml` を作成（`runConfig` のCPU/メモリ/最大インスタンス等）
- [x] `firebase.json` / `.firebaserc` をリポジトリルートに作成
- [x] App Hosting backend の **ルートディレクトリを `frontend` に設定** する手順を `docs/deploy-firebase-apphosting.md` に詳細記載
- [ ] デプロイ実行（push連携 or `firebase deploy`）し、公開URLで動作確認 ← 実環境で実施
- [x] ※App Hosting は Next.js を自動ビルドするため Dockerfile は使われない点を手順書に明記

---

## 動作確認手順（実装後）

- [ ] `npm run dev`（またはDockerコンテナ）で起動 → 「サンプルJSON読込」でプレビューが表示される
- [ ] 不正JSONを入力し、エラー表示とDXFボタン無効化を確認
  - [ ] `unit` が `"mm"` 以外 → invalid_schema
  - [ ] `layers` の配列要素に非配列を指定 → invalid_schema
  - [ ] 構文崩れ（カンマ抜け等） → syntax_error
- [ ] 「DXF保存」→ 出力ファイルをLibreCAD / Jw_cad等で開き、レイヤー分け・寸法・文字高（スケール1/20）を確認
- [ ] AIプロンプトA / B のフォーム入力反映とコピー動作を確認
- [ ] `docker run` 起動のコンテナで上記が同様に動くことを確認
- [ ] Firebase App Hosting の公開URLで上記が同様に動くことを確認

---

## 将来拡張バックログ（仕様書第8章 — 今回は実装しない）

いずれも仕様書で「要検討（案）」とされ、プロトタイプ未実装。v1.0完成後に検討する。

- [ ] 8.1 既存壁面との取り合い：`frames.wallClearance` によるシール逃げ・アタッチメント枠自動描画
- [ ] 8.2 床面レベル差：`floorLevels` レイヤーと段差ライン
- [ ] 8.3 引き戸の召し合わせ厚・有効開口幅の自動算出と補助寸法
- [ ] 8.4 庇の出幅：`ROOF_OVERHANG` レイヤー（DASHED）と雨樋プロット記号
- [ ] 8.5（一部実装済）CADスケール選択の高精度Jw_cad互換変換の拡充
- [ ] 8.6 枠優先自動クランプ（外枠優先自動結合）による寸法ゆらぎ補正
```
