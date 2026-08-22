# 検証記録

## リリース判定

**保留**（2026-08-23、対象コミット`e2ec41c`を基準とする作業ツリー）。Ubuntu Server 24.04 VMでの安全性重要検証、現行ブラウザ、実Safari、Windows Narrator、iPhone VoiceOverの既存確認は有効である。Safari、Chrome、Edge、Firefoxの各1世代前は、利用者の承認によりリリース条件から除外した。ただし、Playwright Firefoxを含む最終E2Eを完走できなかったため、リリース判定は保留とする。

### 2026-08-23 最終品質ゲートの再実行

Node.js 24.18.0、npm 11.16.0で実行した。`npm ci`は、Playwrightテストサーバーを停止して依存ファイルのロックを解消した後に成功した。ShellCheck 0.11.0も導入済みである。

| 検証                     | 結果                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Format、Lint、TypeScript | 成功                                                                                                                                             |
| 単体                     | 成功（15件）                                                                                                                                     |
| UI                       | 成功（2件）                                                                                                                                      |
| ShellCheck               | 成功（0.11.0、警告なし）                                                                                                                         |
| Build                    | 成功                                                                                                                                             |
| E2E                      | Chromium、Chrome、Edge、WebKit、Mobile Chromiumで成功。WebKitのオフライン1件は既知のスキップ。Playwright Firefoxはテスト開始後に進行せず未完了。 |

E2E再実行中に、ポート2222の安全経路テストが旧来の`sudo systemctl reload ssh`を期待していることを検出した。実装はUbuntu 24.04の`ssh.socket`対策として`sudo systemctl disable --now ssh.socket`と`sudo systemctl restart ssh`を正しく生成していたため、E2Eの期待値を安全性仕様に合わせて更新した。Firefoxを含む全E2Eを完走し、更新後の差分で品質ゲートを再実行することがリリース再開条件である。

## 自動検証

Windows、Node.js 24.18.0、npm 11.16.0で実行した。

| 検証       | コマンドまたは方法                          | 結果                                                         |
| ---------- | ------------------------------------------- | ------------------------------------------------------------ |
| Format     | `npm run format:check`                      | 成功                                                         |
| Lint       | `npm run lint`                              | 成功                                                         |
| TypeScript | `npm run typecheck`                         | 成功（strict）                                               |
| 単体       | `npm run test`                              | 成功（15件、Markdownスナップショット1件）                    |
| UI         | `npm run test:ui`                           | 成功（2件）                                                  |
| E2E        | production previewに対して`playwright test` | 成功（6プロジェクト、59件成功・WebKitオフライン1件スキップ） |
| ShellCheck | `npm run test:shellcheck`                   | ShellCheck 0.11.0で成功（終了コード0、警告なし）             |
| Build      | `npm run build`                             | 成功                                                         |

E2Eは生成停止、SSH安全順序、`sshd -T`による実効設定確認、キーボード操作、エラー要約フォーカス、320px幅、200%拡大相当、文字コントラスト、Markdown・ZIP・設定JSONの入出力、古いHTMLキャッシュからのオンライン更新、オフライン再読込後の生成とZIP出力を検査する。

## ブラウザ検証

| プロジェクト     | バージョン                          | 結果・制約                                                                                                               |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Chrome           | 150.0.7871.187                      | 全E2E成功                                                                                                                |
| Edge             | 151.0.4129.59                       | 全E2E成功                                                                                                                |
| Chromium         | Playwright 151.0.7922.34            | 全E2E成功                                                                                                                |
| Firefox          | Playwright 153.0                    | 全E2E成功                                                                                                                |
| WebKit           | Playwright 26.5                     | オフラインreloadはWindows版の内部エラー。他6件は成功                                                                     |
| Safari           | iPhone 17の現行Safari               | HTTPSのGitHub Pages配信で手動確認。通常フロー、3種のダウンロード、オフライン再読込後の生成・ZIP出力、VoiceOver操作に成功 |
| Mobile Chromium  | Playwright iPhone 13相当            | 全E2E成功                                                                                                                |
| アプリ内ブラウザ | Chromium系、1280px・390pxで手動確認 | 横方向の本文はみ出しなし、エラー要約へフォーカス、警告0                                                                  |

Playwright WebKitは実Safariの代替ではない。Safari現行版のオフライン試験は実Safariで完了した。Safari、Chrome、Edge、Firefoxの各1世代前は未検証だが、2026-08-23の利用者承認によりリリース条件から除外した。

## アクセシビリティ検証

- キーボードだけで前提確認から次画面へ進めること、エラー時に要約へフォーカスすることを全ブラウザプロジェクトで確認した。
- 320px幅と200%拡大相当の640 CSS pxで本文の意図しない横スクロールがないことを確認した。
- 計算可能な主要テキストのコントラストをWCAG AAの4.5:1（大きな文字は3:1）で自動検査した。検出した進捗、強調色、補助文の不足を修正済み。
- 390pxのアプリ内ブラウザでフォーカス表示、エラー要約、本文レイアウト、コンソール警告・エラー0件を目視確認した。
- NVDAまたはVoiceOverによる読み上げ確認は未実行だったが、2026-08-18にWindows Narratorで代替確認を完了した（詳細は次節）。

### 2026-08-18 Windows Narrator実機確認

- production buildを`127.0.0.1`で配信し、Windows実機のCodexアプリ内ブラウザで、前提確認から手順書生成までを操作した。
- 支援技術ツリーで、スキップリンク、`banner`、進捗用の`navigation`、`main`、見出し階層、入力ラベル、チェックボックスの状態、結果画面のダウンロードボタン、各コピー操作の名称を確認した。
- Windows Narrator（`C:\\Windows\\System32\\Narrator.exe`）を利用し、利用者が音声を聴取して確認した。TabとSpaceだけのウィザード操作、エラー要約、入力ラベル、コピー成功通知、Markdown・ZIP・設定JSONのダウンロード操作、および`details`内の「失敗時の復旧」と「公式根拠」の開閉はいずれも読み上げ・操作できた。
- 同日に前提確認画面から再確認し、上記のNarrator操作に問題がないことを利用者が確認した。
- この結果によりT-050を完了とする。NVDA、VoiceOver、実Safari、および各対象ブラウザの1世代前の確認は、リリース判定に残る別の互換性検証課題である。

### 2026-08-23 iPhone VoiceOver・実Safari確認

- iPhone 17の現行Safariで、HTTPS配信したproduction buildを手動確認した。
- VoiceOverで入力ラベル、チェックボックスの状態、エラー要約、コピー操作、`details`、3種のダウンロード操作を確認した。
- Service Worker登録後、機内モードで再読込し、手順書生成とZIP出力を確認した。
- この結果により現行SafariとiPhone VoiceOverの確認を完了とする。Safari、Chrome、Edge、Firefoxの各1世代前は未検証だが、2026-08-23の利用者承認によりリリース判定の未完了項目ではない。

## Ubuntu Server 24.04隔離環境

Hyper-Vの`Default Switch`に接続した、チェックポイントとコンソール接続を持つ使い捨てVMで実行した。ホストや実サーバーには変更を加えていない。

| 項目                | 実測値・結果                                                                     |
| ------------------- | -------------------------------------------------------------------------------- |
| OS                  | Ubuntu Server 24.04.4 LTS、kernel `6.8.0-137-generic`                            |
| OpenSSH             | `1:9.6p1-3ubuntu13.18`                                                           |
| UFW                 | `0.36.2-6`                                                                       |
| unattended-upgrades | `2.9.1+nmu4ubuntu1`                                                              |
| 復旧経路            | Hyper-Vコンソール、初期状態・ポート22検証済み状態のチェックポイント、既存SSH接続 |

### 推奨シナリオ（22/tcp）

1. `serveradmin`を作成してsudoグループへの所属と`sudo -l -U`を確認した。
2. `ufw allow 22/tcp`を先に登録し、公開鍵、`00-linux-setup-helper.conf`、`20auto-upgrades`を配置した。
3. `.ssh`は`serveradmin:serveradmin 700`、`authorized_keys`は`serveradmin:serveradmin 600`、両設定ファイルは`root:root 644`だった。
4. `sshd -t`は成功し、`sshd -T`は`port 22`、`pubkeyauthentication yes`、`passwordauthentication no`、`permitrootlogin no`を示した。
5. 別のホストPowerShellから公開鍵で接続し、`sudo -v`に成功した。UFW有効化後も接続を維持し、incoming deny、outgoing allow、`22/tcp ALLOW`を確認した。
6. `APT::Periodic::Update-Package-Lists`と`APT::Periodic::Unattended-Upgrade`はともに`"1"`で、`unattended-upgrade --dry-run --debug`は終了コード0、実更新なしで完了した。

### ポート変更・ロールバック（2222/tcp）

1. `ufw allow 2222/tcp`を登録してからdrop-inの`Port`を`2222`へ変更し、`sshd -t`と`sshd -T`で実効値を確認した。
2. 最初の`systemctl reload ssh`では`2222`に待ち受けず、`ssh -p 2222`は接続拒否となった。Ubuntu 24.04では`ssh.socket`がactiveで、`ListenStream=0.0.0.0:22`および`[::]:22`を保持していたためである。
3. 既存SSH接続とHyper-Vコンソールを維持したまま`systemctl disable --now ssh.socket`、`systemctl restart ssh`を実行すると、`sshd`は`0.0.0.0:2222`と`[::]:2222`で待ち受けた。ホストからの公開鍵接続と`sudo -v`も成功した。
4. ポート22のdrop-inへ戻し、`ssh.socket`を再有効化してから`ssh`を起動すると、22番での待ち受けと公開鍵接続が復帰した。`ufw delete allow 2222/tcp`後は、22番だけが許可された。

この実機結果を反映して、ポート変更時の生成手順を`sshd -t` → `ssh.socket`の停止・無効化 → `ssh`再起動 → 待受確認へ修正した。通常の22番シナリオは従来どおり再読み込みのみとする。

### 修正後の静的解析

VM上でShellCheck `0.9.0`を導入し、ポート2222の代表生成断片（`ssh.socket`の停止・無効化と`ssh`再起動を含む）を`--shell=sh`で解析した。警告・エラーはなく、終了コードは0だった。
