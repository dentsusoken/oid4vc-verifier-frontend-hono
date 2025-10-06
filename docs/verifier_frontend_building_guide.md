# Verifier Frontend 構築

- [Verifier Frontend 構築](#verifier-frontend-構築)
  - [リポジトリのフォーク（任意）](#リポジトリのフォーク任意)
  - [ローカル開発](#ローカル開発)
    - [モジュールのクローン](#モジュールのクローン)
    - [開発](#開発)
    - [デプロイ](#デプロイ)
      - [Cloudflare環境](#cloudflare環境)
    - [環境変数](#環境変数)
      - [各環境共通](#各環境共通)
      - [Cloudflare環境](#cloudflare環境-1)
        - [登録手順](#登録手順)

## リポジトリのフォーク（任意）

このリポジトリのトップページのForkボタンでリポジトリをフォークする。

## ローカル開発

### モジュールのクローン

```bash
git clone https://github.com/dentsusoken/oid4vc-verifier-frontend-hono.git
```

（フォークした場合は、URLを変更）

### 開発

依存関係をインストール

```bash
npm install
```

デザインの修正や対応するVCの追加など適宜変更する。

ローカルサーバーを起動する場合は以下のコマンドを実行する。

```bash
npm run dev
```

### デプロイ

#### Cloudflare環境

1. Cloudflareへのログイン

  以下のコマンドでCloudflareにログインする。

  ```bash
  npx wrangler login
  ```

  または、APIトークンを使用可能。(トークンはCloudflareのWebコンソールから発行。)
  
  ```bash
  export CLOUDFLARE_API_TOKEN=<あなたのAPIトークン>
  ```

2. Cloudflare KVを作成

  以下のコマンドでKVを作成する。

  ```bash
  npx wrangler kv namespace create "PRESENTATION_ID_KV"
  ```

> [!IMPORTANT]
> コマンド実行後に表示されるIDは次の手順で使用。

3. wrangler.tomlを編集

  wrangler.tomlに作成したKVの情報を記載する。
  その他の項目についても必要があれば適宜変更。

  ```toml
  [[kv_namespaces]]
  binding = "PRESENTATION_ID_KV"
  id = "<作成したKVのID>"
  ```

  Verifier Endpointが同じCloudflare環境にデプロイされている場合は、以下の設定も追記。
  
  ```toml
  [[services]]
  binding = "BACKEND"
  service = "<Verifier Endpointのサービス名>" # Verifier Endpointのwrangler.tomlのnameプロパティの値
  ```

4. デプロイ

  以下のコマンドでアプリケーションのビルド、デプロイを一括で行う。

  ```bash
  npm run deploy
  ```

### 環境変数

#### 各環境共通

| 変数名                   | 説明                                             |
| ------------------------ | ------------------------------------------------ |
| API_BASE_URL             | Verifier EndpointのURL                           |
| INIT_TRANSACTION_PATH    | Verifier EndpointのInit transaction APIのパス    |
| GET_WALLET_RESPONSE_PATH | Verifier EndpointのGet wallet response APIのパス |
| WALLET_URL               | WalletのURL                                      |
| PUBLIC_URL               | Verifier Frontend(このアプリケーション)のURL     |

#### Cloudflare環境

特に固有の環境変数はなし。  
下記手順に従い、共通の環境変数を登録。

##### 登録手順

1. [Cloudflare](https://dash.cloudflare.com/)のWebコンソールにアクセスし、画面左側のメニューから、`Compute` -> `Workers & Pages`を選択。
2. Verifier Frontendのサービスをクリックする。
3. 画面上部のメニューから`Settings`を選択。
4. `Variables and Secrets`の`Add`をクリックしてシークレットを追加する。
