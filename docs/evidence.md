# 公式根拠台帳

対象は Ubuntu Server 24.04 LTS (Noble) のみ。最終確認日は 2026-08-03。

| 領域         | 生成内容・ルール                                          | 一次資料                                                                                                       |
| ------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| ユーザー管理 | `adduser`、sudoグループ、rootの直接利用を避ける           | [Ubuntu Server: User management](https://documentation.ubuntu.com/server/how-to/security/user-management/)     |
| OpenSSH      | `sshd_config.d`、公開鍵認証、設定検証、サービス再読み込み | [Ubuntu Server: OpenSSH server](https://documentation.ubuntu.com/server/how-to/security/openssh-server/)       |
| UFW          | SSHポート許可、既定ポリシー、有効化、状態確認             | [Ubuntu Server: Firewall](https://documentation.ubuntu.com/server/how-to/security/firewalls/)                  |
| 自動更新     | `20auto-upgrades`、日次実行、dry-run                      | [Ubuntu Server: Automatic updates](https://documentation.ubuntu.com/server/how-to/software/automatic-updates/) |
| 所有者・権限 | `install -d`、`-m`、`-o`、`-g`                            | [Ubuntu noble manpage: install(1)](https://manpages.ubuntu.com/manpages/noble/en/man1/install.1.html)          |

SSHロックアウト防止の順序（新ポートのUFW許可 → 設定配置 → `sshd -t` → 再読み込み → 現在接続維持 → 別セッション確認）は、上記仕様を安全側に合成したアプリ固有の安全性ルールである。
