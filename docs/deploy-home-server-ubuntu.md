# 自宅サーバー（Ubuntu Server）デプロイ手順

field-note-cad を自宅の Ubuntu Server 上で Docker で常時稼働させ、まずは LAN 内に公開するための手順書です。
将来 VPN 経由で外部からアクセスする手順も付録に記載します。

> **前提知識：** 本番用の `frontend/Dockerfile` は Next.js を `output: "standalone"` でビルドし、
> 最小実行成果物（`node server.js`）を非 root ユーザーで起動します。この手順ではそれをそのまま利用します。
> Firebase App Hosting に公開したい場合は [deploy-firebase-apphosting.md](./deploy-firebase-apphosting.md) を参照してください。

---

## 事前準備

- Ubuntu Server（24.04 LTS 等）がインストール済みで、sudo 権限を持つユーザーでログインできること
- サーバーが家庭内 LAN に接続済みであること
- このアプリは実行時の環境変数に依存しないため、`.env` などの設定は不要

リポジトリは `frontend/` をアプリのルートとするモノレポ構成です。以降のコマンドは特記なき限り `frontend/` ディレクトリで実行します。

---

## STEP 1: Docker / Docker Compose のインストール

Docker 公式の apt リポジトリから導入します。

```bash
# 古いパッケージを削除（入っていなければスキップされる）
sudo apt-get remove -y docker docker-engine docker.io containerd runc

# 必要なツールと Docker の GPG 鍵・リポジトリを登録
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 本体とプラグインをインストール
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

一般ユーザーで `docker` コマンドを使えるようにグループへ追加します（追加後は一度ログアウト→再ログインが必要）。

```bash
sudo usermod -aG docker $USER
# ここで一度ログアウト & 再ログイン
```

OS 起動時に Docker を自動起動するよう有効化し、導入を確認します。

```bash
sudo systemctl enable --now docker
docker compose version   # バージョンが表示されればOK
```

---

## STEP 2: ソースの取得

```bash
git clone <リポジトリURL> field-note-cad
cd field-note-cad/frontend
```

すでにサーバー上に配置済みなら、最新化するだけです。

```bash
cd field-note-cad/frontend
git pull
```

---

## STEP 3: ビルドと起動

本番用の compose ファイル `docker-compose.prod.yml` を使ってビルド・起動します。

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

状態とログを確認します。

```bash
docker compose -f docker-compose.prod.yml ps      # State が running / Up になっているか
docker compose -f docker-compose.prod.yml logs -f # 起動ログ（Ctrl+C で抜ける）
```

---

## STEP 4: LAN 内からの動作確認

サーバーの LAN IP アドレスを確認します。

```bash
hostname -I        # 例: 192.168.1.50
# または
ip -4 addr show
```

同じ LAN につながった PC やスマホのブラウザから、以下にアクセスして画面が表示されれば成功です。

```
http://<サーバーのIP>:3000
```

---

## STEP 5: ファイアウォール（ufw を使っている場合）

ufw を有効にしている場合は、3000 番ポートを開放します。

```bash
# シンプルに開放
sudo ufw allow 3000/tcp

# LAN 内（例: 192.168.1.0/24）からのみに限定したい場合
sudo ufw allow from 192.168.1.0/24 to any port 3000 proto tcp
```

> ufw を有効化していない（`sudo ufw status` が `inactive`）場合、この手順は不要です。

---

## STEP 6: 自動起動の確認

`docker-compose.prod.yml` の `restart: always` と、STEP 1 で実行した `systemctl enable docker` により、
**サーバーを再起動してもアプリは自動的に立ち上がります**（クラッシュ時も自動復帰）。

実際に確認するには、サーバーを再起動してからコンテナの状態を見ます。

```bash
sudo reboot
# 再ログイン後
cd field-note-cad/frontend
docker compose -f docker-compose.prod.yml ps   # 自動で Up になっていればOK
```

---

## STEP 7: 更新（再デプロイ）手順

コードを更新したら、pull して再ビルド・再起動します。

```bash
cd field-note-cad/frontend
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

`up -d --build` は新しいイメージをビルドしてからコンテナを差し替えるため、ダウンタイムは最小限です。
古いイメージが溜まったら掃除します。

```bash
docker image prune -f
```

---

## 運用 Tips

```bash
# ログを見る
docker compose -f docker-compose.prod.yml logs -f

# 停止（コンテナを削除）
docker compose -f docker-compose.prod.yml down

# 再起動
docker compose -f docker-compose.prod.yml restart

# ディスク使用量の確認 / 不要データの掃除
docker system df
docker system prune -f
```

---

## 付録A: 将来の外部公開 — VPN（Tailscale）

LAN 外（外出先など）からアクセスしたくなった場合、**ポートを開放せず VPN 経由で安全につなぐ**方法を推奨します。
家庭用ルーター配下・動的 IP でもそのまま使え、設定が最も簡単な **Tailscale** を使った手順です。

### なぜ Tailscale か

- WireGuard ベースで高速。NAT 越え・鍵交換・名前解決（MagicDNS）を自動化してくれるため、素の WireGuard や OpenVPN より設定が圧倒的に楽。
- **ルーターのポート開放が不要**。VPN に参加した端末からのみ到達でき、通信は暗号化される（＝実質プライベート公開）。
- 個人利用なら無料プランで足りる。

### 手順

1. サーバーに Tailscale を導入してログインする。

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

   表示される URL をブラウザで開いてアカウント認証すると、サーバーが tailnet（自分の VPN ネットワーク）に参加します。

2. サーバーの Tailscale IP（`100.x.x.x`）を確認します。

   ```bash
   tailscale ip -4
   ```

3. アクセスしたい端末（スマホ・ノート PC など）にも Tailscale アプリを入れ、**同じアカウントでログイン**して同一 tailnet に参加させます。

4. その端末のブラウザから、サーバーの Tailscale IP（または MagicDNS 名）でアクセスします。

   ```
   http://100.x.x.x:3000
   ```

   これで、VPN に参加した自分の端末からだけアプリに到達できます。

### 代替: 不特定多数に HTTPS で公開したい場合

URL を知っていれば誰でもアクセスできる形（独自ドメイン + 自動 HTTPS）で公開したい場合は、
**Cloudflare Tunnel** が選択肢になります。こちらもポート開放不要で、Cloudflare 経由で TLS を自動付与できます。
ただし本アプリはアプリ側の認証を持たないため、一般公開する際は Cloudflare Access 等でアクセス制限をかけることを検討してください。

> **セキュリティ注記:** VPN を使わずにルーターでポート開放し、直接インターネットへ公開するのは推奨しません。
> 本アプリには認証機構がないため、URL に到達できる全員がアクセスできてしまいます。

---

## 料金について

自宅サーバーでの運用のため、**ホスティング費用はかからず、コストは電気代のみ**です。
Tailscale を使う場合も、個人利用の無料プランの範囲で利用できます。
