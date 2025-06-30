# Verifier Frontend 構築

- [Verifier Frontend 構築](#verifier-frontend-構築)
  - [リポジトリの作成](#リポジトリの作成)
  - [ローカル開発（デザイン等の修正）](#ローカル開発デザイン等の修正)
    - [モジュールのクローン](#モジュールのクローン)
    - [セットアップ](#セットアップ)
    - [開発](#開発)
    - [デプロイ](#デプロイ)
    - [シークレットの設定](#シークレットの設定)

## リポジトリの作成

[こちら](https://github.com/dentsusoken/oid4vc-verifier-frontend-hono)のリポジトリにアクセスし、Fork ボタンを押してリポジトリを作成する。

![Fork1](./images/fork1.png)
![Fork2](./images/fork2.png)

## ローカル開発（デザイン等の修正）

### モジュールのクローン

```bash
git clone <ForkしたリポジトリのURL>
```

### セットアップ

shell/setup_verifier_frontend.[sh|bat] を以下のように クローンしたリポジトリと同じディレクトリに配置する。  
(Linux、MacOS の場合は setup_verifier_frontend.sh を配置する。Windows の場合は setup_verifier_frontend.bat を配置する。)

```bash
|- <クローンしたリポジトリ>
|_ setup_verifier_frontend.sh.[sh|bat]
```

setup_verifier_frontend.[sh|bat] を実行する。

```bash
# Linux、MacOS の場合
sh ./setup_verifier_frontend.sh
```

```bash
# Windows の場合
./setup_verifier_frontend.bat
```

### 開発

デザインの修正など適宜変更する。

ローカルサーバーを起動する場合は以下のコマンドを実行する。

```bash
npm run dev
```

> [!IMPORTANT]
> 新たに npm モジュールをインストールする場合は、npm install を実行後、以下のコマンドを実行してリンクを設定し直してください。

```bash
npm link oid4vc-core oid4vc-prex mdoc-cbor-ts
```

### デプロイ

クローンしたリポジトリのルートディレクトリで shell/deploy_verifier_frontend.[sh|bat] を実行する。
(Linux、MacOS の場合は deploy_verifier_frontend.sh を実行する。Windows の場合は deploy_verifier_frontend.bat を実行する。)

```bash
# Linux、MacOS の場合
sh ./shell/deploy_verifier_frontend.sh
```

```bash
# Windows の場合
./shell/deploy_verifier_frontend.bat
```

### シークレットの設定

[Cloudflare](https://dash.cloudflare.com/)のダッシュボードにアクセスし、画面左側のメニューから、`Compute` -> `Workers & Pages`を選択。
デプロイされた Workers をクリックする。
画面上部のメニューから`Settings`を選択。

`Variables and Secrets`の`Add`をクリックしてシークレットを追加する。

| Type     | Variable name              | Value                                                                                       |
| -------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| `Secret` | `PUBLCI_URL`               | Verifier Frontend の URL（例：https://verifier-frontend.example.com）                       |
| `Secret` | `API_BASE_URL`             | Verifier Endpoint の URL（例：https://verifier-endpoint.example.com）                       |
| `Secret` | `INIT_TRANSACTION_PATH`    | Verifier Endpoint の API のパス（例：/api/init-transaction）                                |
| `Secret` | `GET_WALLET_RESPONSE_PATH` | Verifier Endpoint の API のパス（例：/api/wallet-response）                                 |
| `Secret` | `WALLET_URL`               | Wallet アプリにリダイレクトするためのディープリンクの URL（例：https://wallet.example.com） |
