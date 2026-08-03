# 検証記録

## 自動検証

実行日: 2026-08-03。Windows上のNode.js 24環境で実行した。

| 検証       | コマンドまたは方法                          | 結果                                                   |
| ---------- | ------------------------------------------- | ------------------------------------------------------ |
| Format     | `npm run format:check`                      | 成功                                                   |
| Lint       | `npm run lint`                              | 成功                                                   |
| TypeScript | `npm run typecheck`                         | 成功（strict）                                         |
| 単体       | `npm run test`                              | 成功（13件）                                           |
| UI         | `npm run test:ui`                           | 成功（2件）                                            |
| E2E        | production previewに対して`playwright test` | 成功（デスクトップChromium 3件、モバイルChromium 3件） |
| ShellCheck | `npm run test:shellcheck`                   | 成功（終了コード0、警告なし）                          |
| Build      | `npm run build`                             | 成功                                                   |

## 手動・実環境検証

- Ubuntu 24.04隔離環境: 未実行。ホストへ影響させない破棄可能環境が必要。`sshd -t`、UFW、unattended-upgradesの実構文リスクが残る。
- ブラウザ: Playwright Chromium 151で正常系、生成停止、390px相当のモバイル、オフライン再読込を確認。アプリ内ブラウザの1280px/390px表示で本文の横はみ出しなし、コンソール警告・エラー0件を確認。Edge、Firefox、Safariの現行・1世代前は未実行。
- アクセシビリティ: セマンティックDOM、ラベル、エラー要約、フォーカス表示、キーボード操作可能なネイティブ部品を実装。自動アクセシビリティ検査、200%拡大、実スクリーンリーダーによる確認は未実行。
- productionオフライン: 初回取得・Service Worker制御後にネットワークを切断し、デスクトップ/モバイルの再読込をPlaywrightで確認済み。

Ubuntu 24.04隔離環境、対象ブラウザ全範囲、支援技術の未実行項目は完了扱いにせず、MVPリリース前の残存リスクとして扱う。
