# OID4VC Verifier Frontend (Hono)

OpenID for Verifiable Credentials (OID4VC) の検証者フロントエンドアプリケーション。
HonoフレームワークベースでCloudflare WorkersおよびAWS Lambdaの両方の環境で動作します。

## サポート環境

- **Cloudflare Workers**: Cloudflare のエッジコンピューティング環境
- **AWS Lambda**: AWS のサーバーレス実行環境

## 環境設定

### Cloudflare Workers 環境

#### 必要な環境変数

`wrangler.toml` または Cloudflare ダッシュボードで以下の環境変数を設定してください：

| 変数名                     | 説明                              | 例                             |
| -------------------------- | --------------------------------- | ------------------------------ |
| `API_BASE_URL`             | バックエンドAPIのベースURL        | `https://api.example.com`      |
| `INIT_TRANSACTION_PATH`    | トランザクション初期化のAPIパス   | `/api/v1/init-transaction`     |
| `GET_WALLET_RESPONSE_PATH` | ウォレットレスポンス取得のAPIパス | `/api/v1/wallet-response`      |
| `WALLET_URL`               | ウォレットアプリケーションのURL   | `wallet://example`             |
| `PUBLIC_URL`               | フロントエンドの公開URL           | `https://verifier.example.com` |

#### 必要なバインディング

##### KV Namespace
```toml
[[kv_namespaces]]
binding = "PRESENTATION_ID_KV"
id = "your-kv-namespace-id"
```

プレゼンテーションIDとセッション情報の保存に使用されます。

##### Service Binding (オプション)
```toml
[[services]]
binding = "BACKEND"
service = "your-backend-service-name"
```

バックエンドサービスとの Worker-to-Worker 通信を有効にする場合に設定してください。

#### デプロイ方法

```bash
# 開発環境
npm run dev

# 本番環境
npm run deploy
```

### AWS Lambda 環境

#### 必要な環境変数

Lambda関数の環境変数として以下を設定してください：

| 変数名                      | 説明                                          | 例                                               |
| --------------------------- | --------------------------------------------- | ------------------------------------------------ |
| `AWS_REGION`                | AWSリージョン                                 | `us-east-1`, `ap-northeast-1`                    |
| `SECRETS_MANAGER_SECRET_ID` | AWS Secrets Managerのシークレット識別子       | `verifier-frontend-config`                       |
| `SECRETS_MANAGER_ENDPOINT`  | Secrets Managerのエンドポイント（オプション） | `https://secretsmanager.us-east-1.amazonaws.com` |

#### AWS Secrets Manager設定

AWS Secrets Managerに以下のJSON形式でシークレットを作成してください：

```json
{
  "API_BASE_URL": "https://api.example.com",
  "INIT_TRANSACTION_PATH": "/api/v1/init-transaction",
  "GET_WALLET_RESPONSE_PATH": "/api/v1/wallet-response",
  "WALLET_URL": "https://wallet.example.com",
  "PUBLIC_URL": "https://verifier.example.com",
  "DYNAMODB_ENDPOINT": "https://dynamodb.us-east-1.amazonaws.com",
  "DYNAMODB_TABLE": "verifier-frontend-sessions"
}
```

## アーキテクチャ

### 依存性注入 (DI)

アプリケーションは各環境に応じた依存性注入を行います：

- **Configuration**: 環境変数の管理
- **PortsOut**: 外部リソースへのアクセス（セッション、HTTP通信など）
- **PortsIn**: アプリケーションのエントリーポイント

### セッション管理

- **Cloudflare**: KV Namespaceを使用
- **AWS Lambda**: DynamoDBを使用

### HTTP通信

- **Cloudflare**: Service Bindingによる Worker-to-Worker 通信（設定時）、または標準のfetch API
- **AWS Lambda**: 標準のfetch API

## 開発

### ローカル開発

```bash
# 依存関係インストール
npm install

# Cloudflare Workers環境での開発
npm run dev

# テスト実行
npm run test

# ビルド
npm run build
```

## トラブルシューティング

### Cloudflare Workers

- KV Namespaceが正しく作成されているか確認
- 環境変数が `wrangler.toml` または ダッシュボードで設定されているか確認
- Service Bindingが必要な場合は正しく設定されているか確認

### AWS Lambda

- Secrets Managerのアクセス権限が設定されているか確認
- DynamoDBテーブルが作成され、適切な権限が設定されているか確認
- Lambda関数の環境変数が正しく設定されているか確認
