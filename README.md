# Linux Setup Helper

Ubuntu Server 24.04 LTS の初期設定を、初心者が内容を確認しながら手動実行できる日本語手順書として生成する静的Webアプリです。

## 対象範囲

- sudo可能な管理ユーザーの作成
- SSH公開鍵認証とsshdの安全化
- SSH到達性を維持するUFW設定
- unattended-upgradesによる自動セキュリティ更新
- 画面手順、Markdown、個別設定ファイルを含むZIP、バージョン付き設定JSON

Ubuntu Server 24.04 LTS以外、サーバー接続・自動実行、既存設定の解析や修復、任意コマンド、パスワード・秘密鍵・APIキーは対象外です。

## 安全上の注意

生成結果はシェルスクリプトではありません。各手順の目的・影響・期待結果・復旧方法を確認して、1つずつ手動で実行します。SSH設定中は現在の接続を維持し、新しい別セッションで公開鍵ログインとsudoを確認するまで閉じないでください。

公開鍵が有効でない状態でのパスワード認証無効化、管理ユーザーなしでのrootログイン無効化、変更SSHポートのUFW許可不足は、警告だけで続行せず生成を停止します。

## プライバシーとオフライン

バックエンド、外部API、解析、広告、テレメトリ、CDN、外部フォントを使用しません。入力と生成結果は端末外へ送信せず、localStorage等へ自動保存しません。明示的にダウンロードした設定JSONだけで設定を持ち運べます。

production buildはService Workerを登録し、初回取得後のアプリ資産を同一オリジンのCache Storageへ保存します。PWA非対応環境でも通常の静的Webアプリとして動作します。

## 必要環境

- Node.js 24 LTS
- npm
- E2E用のPlaywright Chromium（`npx playwright install chromium`）
- E2E用のPlaywright Firefox / WebKit（`npx playwright install firefox webkit`）
- E2E対象のChrome / Edge現行版
- ShellCheck（`npm run test:shellcheck`を実行する環境）

## 開発

```bash
npm ci
npm run dev
```

## 品質チェック

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:ui
npm run test:e2e
npm run test:shellcheck
npm run build
```

検証状況と手動確認事項は [docs/verification.md](docs/verification.md)、コマンド・設定の一次資料は [docs/evidence.md](docs/evidence.md) に記録します。

実Safari、各ブラウザの1世代前、スクリーンリーダー、Ubuntu 24.04 VMは手動検証対象です。未検証項目がある場合はリリース判定を保留します。

## 静的配信

```bash
npm run build
npm run preview
```

`dist/`をHTTPSの静的ホスティングへ配置します。サブパス配信時はViteの`base`とmanifestのURLを配信先に合わせてください。

## 設定JSON互換性

現在の`schemaVersion`は`1`です。未知のキー、型違反、範囲外値、未対応バージョンを読込時に拒否します。将来の破壊的変更ではバージョンを増やし、暗黙変換は行いません。

## 依存関係

- React / React DOM (MIT): UI
- JSZip (MIT): ブラウザ内ZIP生成
- Vite、TypeScript、Vitest、Testing Library、Playwright、ESLint、Prettier（開発時のみ）

全機能は初回配信後に外部サービスを必要としません。
