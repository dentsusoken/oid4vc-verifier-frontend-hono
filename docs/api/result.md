# Result

## 概要

ウォレットからの応答を受け取り、VP（Verifiable Presentation）トークンを検証して結果を表示するエンドポイント。検証されたクレデンシャルデータを整理して表示し、技術者向けに生のVPトークンも提供します。

## URL

`{PUBLIC_URL}/result`

> **注記**: `{PUBLIC_URL}` は環境変数で設定される公開URLです。

## リクエスト

### メソッド

- GET

### パラメータ

| パラメータ名  | データ型 | 必須 | 説明                             |
| ------------- | -------- | ---- | -------------------------------- |
| response_code | string   | Yes  | ウォレットからのレスポンスコード |

### Cookie

| 名前      | 説明                              |
| --------- | --------------------------------- |
| sessionId | 初期化時に発行されたセッション ID |

## レスポンス

### フォーマット

- HTML

### レスポンスボディ

検証結果を表示する HTML ページ：

#### メインコンテンツ

- **検証されたクレデンシャルデータ**
  - 各ドキュメントタイプごとの詳細情報
  - 属性のキー/値ペアの構造化表示
  - 画像データの安全な表示処理
  - 日付や数値の適切なフォーマット

#### 技術情報

- **Raw VP Token セクション**
  - 展開可能な詳細エリア（details/summary）
  - 完全なVPトークン文字列の表示
  - 読み取り専用テキストエリア
  - コピー可能なフォーマット

#### ナビゲーション

- **ホームページ戻りリンク**: 新しい検証を開始するオプション

#### エラーハンドリング

- **VPトークン欠如**: 適切なエラーメッセージと再試行ガイダンス
- **クレデンシャルデータなし**: 検証成功だが表示可能データなしの説明
- **設定エラー**: ナビゲーション設定の問題表示

#### セキュリティ機能

- **XSS防止**: 安全なデータレンダリング
- **データサニタイゼーション**: ユーザー入力の適切な処理
- **最小限の情報開示**: エラー時の詳細情報制限

## サンプルリクエスト

```sh
curl -v "{PUBLIC_URL}/result?response_code=eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9..." \
-H "Cookie: sessionId=abc123def456"
```

## サンプルレスポンス

### 成功時（クレデンシャルデータあり）

```html
<!doctype html>
<html>
<head>
  <title>OID4VC Verifier - Presentation Result</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <div class="card">
    <h2>Presentation Result</h2>
    
    <div role="region" aria-label="Verified credential information">
      <div class="presentation-detail">
        <h3>org.iso.18013.5.1.mDL</h3>
        <table>
          <tr><td>family_name</td><td>Doe</td></tr>
          <tr><td>given_name</td><td>John</td></tr>
          <tr><td>birth_date</td><td>1990-01-01</td></tr>
          <tr><td>portrait</td><td>[Image Data]</td></tr>
        </table>
      </div>
    </div>

    <details role="region" aria-label="Raw verification token">
      <summary>Raw VP Token</summary>
      <textarea readonly disabled>
        eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJkaWQ6ZXhhbXBsZToxMjM0NSIsImF1ZCI6WyJkaWQ6ZXhhbXBsZTp2ZXJpZmllciJdLCJuYmYiOjE3MDk2MDE2MjAsImV4cCI6MTcwOTYwNTIyMCwidnAiOnsiaWQiOiJ1cm46dXVpZDoxMjM0NTY3OC05YWJjLWRlZjAtZ2hpai1rbG1ub3BxcnN0dXYiLCJ0eXBlIjpbIlZlcmlmaWFibGVQcmVzZW50YXRpb24iXSwidmVyaWZpYWJsZUNyZWRlbnRpYWwiOlsiZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKRlV6STFOaUo5Li4uIl0sImhvbGRlciI6ImRpZDpleGFtcGxlOjEyMzQ1In19.signature
      </textarea>
    </details>

    <a href="/home">Go back to Home</a>
  </div>
</body>
</html>
```

### エラー時（VPトークンなし）

```html
<!doctype html>
<html>
<head>
  <title>OID4VC Verifier - Verification Error</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <div class="card">
    <h2>Verification Error</h2>
    <p class="error-message">
      No verification token available. Please try the verification process again.
    </p>
    <a href="/home">Go back to Home</a>
  </div>
</body>
</html>
```

### クレデンシャルデータなし

```html
<!doctype html>
<html>
<head>
  <title>OID4VC Verifier - Presentation Result</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <div class="card">
    <h2>Presentation Result</h2>
    
    <div class="no-data-message">
      <p>No credential data available to display.</p>
      <p class="details">The verification was successful, but no readable credential information was found.</p>
    </div>

    <details role="region" aria-label="Raw verification token">
      <summary>Raw VP Token</summary>
      <textarea readonly disabled>
        eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9...
      </textarea>
    </details>

    <a href="/home">Go back to Home</a>
  </div>
</body>
</html>
```
