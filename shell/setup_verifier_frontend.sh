#!/bin/bash

# エラーハンドリング関数
handle_error() {
    echo "エラーが発生しました: $1"
    # クリーンアップ処理を実行
    cleanup
    exit 1
}

# クリーンアップ関数
cleanup() {
    echo "クリーンアップを実行します..."
    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR" || echo "警告: buildディレクトリの削除に失敗しました"
    fi
}

# エラー発生時に handle_error 関数を呼び出す
set -e
trap 'handle_error "$BASH_COMMAND"' ERR
# スクリプト終了時に cleanup を実行
# trap cleanup EXIT

echo "Verifier Frontendのセットアップを開始します。"
echo "続行するにはEnterキーを押してください。"
read -p ""

# 各モジュールのディレクトリを設定
BUILD_DIR=$(pwd)/build
CORE_DIR=$BUILD_DIR/oid4vc-core
PREX_DIR=$BUILD_DIR/oid4vc-prex
CBOR_DIR=$BUILD_DIR/mdoc-cbor-ts

# build ディレクトリの存在確認と作成
if [ ! -d "$BUILD_DIR" ]; then
    mkdir -p "$BUILD_DIR" || handle_error "buildディレクトリの作成に失敗しました"
fi

# モジュールをクローン
cd $BUILD_DIR || handle_error "buildディレクトリへの移動に失敗しました"

echo "oid4vc-coreをクローンしています..."
git clone https://github.com/dentsusoken/oid4vc-core || handle_error "oid4vc-coreのクローンに失敗しました"

echo "oid4vc-prexをクローンしています..."
git clone https://github.com/dentsusoken/oid4vc-prex || handle_error "oid4vc-prexのクローンに失敗しました"

echo "mdoc-cbor-tsをクローンしています..."
git clone https://github.com/dentsusoken/mdoc-cbor-ts || handle_error "mdoc-cbor-tsのクローンに失敗しました"

echo "oid4vc-coreをビルドしています..."
cd $CORE_DIR || handle_error "oid4vc-coreディレクトリへの移動に失敗しました"
git checkout ed7a39cc8fe30d82a475bcb8c847bd5f953277da
npm install
npm run build || handle_error "oid4vc-coreのビルドに失敗しました"
npm link || handle_error "oid4vc-coreのnpm linkに失敗しました"

echo "oid4vc-prexをビルドしています..."
cd $PREX_DIR || handle_error "oid4vc-prexディレクトリへの移動に失敗しました"
git checkout 66ff55ffecd250d3c7e673717875e0ec444f56cf
npm install
npm link oid4vc-core || handle_error "oid4vc-coreのリンクに失敗しました"
npm run build || handle_error "oid4vc-prexのビルドに失敗しました"
npm link || handle_error "oid4vc-prexのnpm linkに失敗しました"

echo "mdoc-cbor-tsをビルドしています..."
cd $CBOR_DIR || handle_error "mdoc-cbor-tsディレクトリへの移動に失敗しました"
git checkout d6bc31260b3a6ea9b85a950e1e38fa46019c07c0
npm install
npm link oid4vc-core oid4vc-prex || handle_error "依存モジュールのリンクに失敗しました"
npm run build || handle_error "mdoc-cbor-tsのビルドに失敗しました"
npm link || handle_error "mdoc-cbor-tsのnpm linkに失敗しました"

echo "oid4vc-verifier-frontend-honoをビルドしています..."
cd .. || handle_error "oid4vc-verifier-frontend-honoディレクトリへの移動に失敗しました"
npm install
npm link oid4vc-core oid4vc-prex mdoc-cbor-ts || handle_error "依存モジュールのリンクに失敗しました"

echo "Verifier Frontendのセットアップが完了しました。"

echo "終了するにはEnterキーを押してください。"
read -p ""

exit