# Initiate

## 概要

検証フローを開始し、ウォレットへのリダイレクト URL または QR コードを表示するページを生成するエンドポイント。デバイスタイプを自動検出し、最適なユーザーエクスペリエンスを提供します。

## URL

### mDL検証
`{PUBLIC_URL}/init`

### UnifiedID検証
`{PUBLIC_URL}/init/unifiedID`

> **注記**: `{PUBLIC_URL}` は環境変数で設定される公開URLです。

## リクエスト

### メソッド

- GET

### パラメータ

なし

## レスポンス

### フォーマット

- HTML

### レスポンスボディ

デバイスタイプに応じて以下の情報を含む HTML ページ：

#### モバイルデバイスの場合

- **ウォレットリダイレクトボタン**: 直接ウォレットアプリを開くリンク
- **ホームページ戻りリンク**: 検証を中断して戻るオプション
- **QRコード非表示**: 同一デバイスのため不要

#### デスクトップデバイスの場合

- **QRコード表示**: モバイルウォレットでスキャン可能なQRコード（SVG形式）
- **ウォレットリダイレクトボタン**: フォールバック用の直接リンク
- **自動ポーリング**: 検証完了を5分間監視（1秒間隔）
- **ホームページ戻りリンク**: 検証を中断して戻るオプション

#### エラーハンドリング

- **QRコード生成失敗**: フォールバック表示と説明メッセージ
- **設定エラー**: 適切なエラーメッセージとサポート情報

### セッション管理

| 名前      | 値     | 属性                                                             |
| --------- | ------ | ---------------------------------------------------------------- |
| sessionId | string | `Path=/`<br>`HttpOnly=true`<br>`SameSite=Lax`<br>`MaxAge=604800` |

### JavaScript機能（デスクトップのみ）

- **自動ポーリング**: 結果エンドポイントを定期的に確認
- **タイムアウト制御**: 5分後に自動停止
- **クリーンアップ**: ページ離脱時にポーリング停止

## サンプルリクエスト

```sh
# mDL検証
curl -v "{PUBLIC_URL}/init"

# UnifiedID検証
curl -v "{PUBLIC_URL}/init/unifiedID"
```

## サンプルレスポンス

### デスクトップ（QRコード表示）

```html
<!doctype html>
<html>
<head>
  <title>OID4VC Verifier - Verification Started</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <div class="card">
    <h2>Verification Started</h2>
    <div class="qr-code" role="img" aria-label="QR code for wallet verification">
      <svg>...QR code SVG...</svg>
    </div>
    <a href="wallet://verify?request=..." class="wallet-button" role="button">
      Redirect to Wallet
    </a>
    <a href="/home">Go back to Home</a>
  </div>
  <script>
    // Auto-polling functionality for desktop
  </script>
</body>
</html>
```

### モバイル（QRコード非表示）

```html
<!doctype html>
<html>
<head>
  <title>OID4VC Verifier - Verification Started</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <div class="card">
    <h2>Verification Started</h2>
    <a href="wallet://verify?request=..." class="wallet-button" role="button">
      Redirect to Wallet
    </a>
    <a href="/home">Go back to Home</a>
  </div>
</body>
</html>
```
