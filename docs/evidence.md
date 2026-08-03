# 公式根拠台帳

対象は Ubuntu Server 24.04 LTS (Noble) のみ。最終確認日は 2026-08-03。

| 領域         | 生成内容・ルール                                                             | 一次資料                                                                                              |
| ------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| ユーザー管理 | `adduser`、sudoグループ、rootの直接利用を避ける                              | [Ubuntu Server: User management](https://ubuntu.com/server/docs/how-to/security/user-management/)     |
| OpenSSH      | 先に読み込むdrop-in、公開鍵認証、構文・実効設定検証、サービス再読み込み      | [Ubuntu Server: OpenSSH server](https://ubuntu.com/server/docs/how-to/security/openssh-server/)       |
| UFW          | SSHポート許可、既定ポリシー、有効化、状態確認                                | [Ubuntu Server: Firewall](https://ubuntu.com/server/docs/how-to/security/firewalls/)                  |
| 自動更新     | `20auto-upgrades`、日次実行、dry-run、Ubuntu 24.04のサービス自動再起動の影響 | [Ubuntu Server: Automatic updates](https://ubuntu.com/server/docs/how-to/software/automatic-updates/) |
| 所有者・権限 | `install -d`、`chown`、`chmod`                                               | [Ubuntu noble manpage: install(1)](https://manpages.ubuntu.com/manpages/noble/man1/install.1.html)    |

SSHロックアウト防止の順序（新ポートのUFW許可 → 設定配置 → `sshd -t` → 再読み込み → 現在接続維持 → 別セッション確認）は、上記仕様を安全側に合成したアプリ固有の安全性ルールである。

OpenSSHは多くの指示で最初に得た値を使用するため、アプリのdrop-inは`00-linux-setup-helper.conf`として既存の一般的なdrop-inより先に読み込ませる。反映前に`sshd -t`だけでなく`sshd -T`でもポートと認証の実効値を確認する。
