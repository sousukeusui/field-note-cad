# field-note-cad

風除室DXF生成Webアプリ。現場メモ・手書き図面を AI 経由で得た JSON から、CAD互換の R12 DXF を生成します。

将来のバックエンド追加に備えたモノレポ構成です。

```
field-note-cad/
├── frontend/   # Next.js アプリ本体（開発・ビルド・デプロイはここ）
├── backend/    # （将来）バックエンド用に予約
└── docs/       # 仕様書・実装手順書・移植元プロトタイプ
```

## ビルド・起動

開発／本番ビルド／Docker の手順は **[`frontend/README.md`](frontend/README.md)** を参照してください。

```bash
cd frontend
npm install
npm run dev        # 開発サーバ（http://localhost:3000）
npm run build      # 本番ビルド（output: 'standalone'）
```

## ドキュメント

- [仕様書](docs/spec.md)
- [実装手順書](docs/implementation-guide.md)
