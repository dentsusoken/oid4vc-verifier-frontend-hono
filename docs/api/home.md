# Home

## 概要

検証フローを開始するためのトップページを提供するエンドポイント。ユーザーはmDL（mobile Driver's License）検証またはUnifiedID検証を選択できます。

## URL

`{PUBLIC_URL}/home`

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

以下の要素を含む HTML ページ：

- **mDL Verification** ボタン（`/init` へのリンク）
- **UnifiedID Verification** ボタン（`/init/unifiedID` へのリンク）
- Cardベースのレスポンシブデザイン
- アクセシビリティ機能（ARIA labels等）

### UI特徴

- **レスポンシブデザイン**: 様々な画面サイズに対応
- **アクセシビリティ**: スクリーンリーダー対応
- **エラーハンドリング**: 設定エラー時の適切なメッセージ表示

## サンプルリクエスト

```sh
curl -v "{PUBLIC_URL}/home"
```

## サンプルレスポンス

```html
<!doctype html>
<html>
<head>
  <title>OID4VC Verifier</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <div class="card">
    <h2>Start Verification</h2>
    <a href="/init" class="verification-button" role="button" aria-label="Start mDL verification process">
      mDL Verification
    </a>
    <a href="/init/unifiedID" class="verification-button" role="button" aria-label="Start unifiedID verification process">
      UnifiedID Verification
    </a>
  </div>
</body>
</html>
```
