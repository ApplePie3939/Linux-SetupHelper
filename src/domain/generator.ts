import { EVIDENCE } from "./evidence";
import type { ConfigFile, GuideStep, SetupGuide, SetupInput } from "./types";
import { normalizeInput } from "./validation";

const lines = (...values: string[]) => values.join("\n") + "\n";

function adminStep(input: SetupInput): GuideStep {
  const user = input.admin.username;
  return {
    id: "admin-user",
    title: "管理ユーザーを作成する",
    purpose:
      "日常の管理をrootで行わず、必要な操作だけsudoで実行できるようにします。",
    impact: `ローカルユーザー「${user}」を作成し、sudoグループへ追加します。パスワードはサーバー上のadduserが対話的に尋ねます。`,
    backup: ["既存ユーザーとsudoグループを確認します: getent group sudo"],
    commands: [`sudo adduser ${user}`, `sudo adduser ${user} sudo`],
    files: [],
    verify: [`id ${user}`, `sudo -l -U ${user}`],
    expected: `idのgroupsにsudoが含まれ、sudo -lが「${user}」の許可を表示します。`,
    rollback: [
      `公開鍵設定や別セッション確認より前なら、sudo deluser ${user} sudo で権限だけを外せます。ユーザー削除はデータ確認後に手動で判断してください。`,
    ],
    evidence: ["users"],
  };
}

function ufwPrepareStep(input: SetupInput): GuideStep {
  const port = input.ssh.port;
  const enabled = input.ufw.enabled;
  return {
    id: "ufw-prepare",
    title: enabled
      ? "SSH用のUFW許可を先に追加する"
      : "UFWを変更しないことを確認する",
    purpose: enabled
      ? "SSHポート変更やUFW有効化による接続遮断を防ぎます。"
      : "UFWを有効化しない選択を手順へ明示します。",
    impact: enabled
      ? `TCPポート${port}への着信を許可します。`
      : "UFWのルールや状態は変更しません。",
    danger: enabled
      ? "この許可を確認する前にsshdのポート変更やUFW有効化を行わないでください。"
      : "ホストファイアウォールの保護は追加されません。",
    backup: [
      "現在のルールを画面または作業記録へ保存します: sudo ufw status numbered",
    ],
    commands: enabled ? [`sudo ufw allow ${port}/tcp comment 'OpenSSH'`] : [],
    files: [],
    verify: ["sudo ufw status numbered"],
    expected: enabled
      ? `${port}/tcp のALLOWルールが表示されます。`
      : "UFWの状態に変更はありません。",
    rollback: enabled
      ? [
          `別セッション確認後、不要なら sudo ufw delete allow ${port}/tcp を実行します。確認前には削除しないでください。`,
        ]
      : ["変更はありません。"],
    evidence: ["ufw"],
  };
}

function sshFiles(input: SetupInput): ConfigFile[] {
  const user = input.admin.username;
  const sshd = lines(
    "# Linux Setup Helper — Ubuntu Server 24.04 LTS",
    `Port ${input.ssh.port}`,
    "PubkeyAuthentication yes",
    `PasswordAuthentication ${input.ssh.disablePasswordAuthentication ? "no" : "yes"}`,
    `PermitRootLogin ${input.ssh.disableRootLogin ? "no" : "prohibit-password"}`,
  );
  return [
    {
      name: "99-linux-setup-helper.conf",
      path: "/etc/ssh/sshd_config.d/99-linux-setup-helper.conf",
      owner: "root:root",
      mode: "0644",
      content: sshd,
    },
    {
      name: `authorized_keys-${user}`,
      path: `/home/${user}/.ssh/authorized_keys`,
      owner: `${user}:${user}`,
      mode: "0600",
      content: `${input.ssh.publicKey}\n`,
    },
  ];
}

function sshConfigureStep(input: SetupInput): GuideStep {
  const user = input.admin.username;
  return {
    id: "ssh-configure",
    title: "公開鍵とsshd設定を配置する",
    purpose:
      "管理ユーザーの公開鍵認証を準備し、sshdの変更を独立したdrop-inへ限定します。",
    impact: `SSHはポート${input.ssh.port}を使用し、パスワード認証は${input.ssh.disablePasswordAuthentication ? "無効" : "有効"}、rootログインは${input.ssh.disableRootLogin ? "無効" : "公開鍵に限定"}になります。`,
    danger:
      "現在のSSH接続は閉じないでください。設定ミスがあると新しい接続ができなくなります。",
    backup: [
      "sudo install -d -m 0700 /root/linux-setup-helper-backup",
      "sudo cp -a /etc/ssh/sshd_config.d /root/linux-setup-helper-backup/sshd_config.d",
    ],
    commands: [
      `sudo install -d -m 0700 -o ${user} -g ${user} /home/${user}/.ssh`,
      `sudo install -m 0600 -o ${user} -g ${user} /dev/null /home/${user}/.ssh/authorized_keys`,
      "sudo install -m 0644 -o root -g root /dev/null /etc/ssh/sshd_config.d/99-linux-setup-helper.conf",
      "上記2ファイルの「設定全文」を、それぞれの配置先へエディターで貼り付けます。",
    ],
    files: sshFiles(input),
    verify: [
      `sudo stat -c '%U:%G %a %n' /home/${user}/.ssh /home/${user}/.ssh/authorized_keys`,
      "sudo sshd -t",
    ],
    expected: `.sshは${user}:${user} 700、authorized_keysは${user}:${user} 600と表示され、sshd -tは何も表示せず終了します。`,
    rollback: [
      "sshd -tが失敗したら再読み込みせず、sudo rm /etc/ssh/sshd_config.d/99-linux-setup-helper.conf を実行します。",
      "必要なら sudo cp -a /root/linux-setup-helper-backup/sshd_config.d/. /etc/ssh/sshd_config.d/ で戻し、再度 sudo sshd -t を実行します。",
    ],
    evidence: ["openssh", "permissions"],
  };
}

function sshApplyStep(input: SetupInput): GuideStep {
  return {
    id: "ssh-apply",
    title: "検証後にsshdを再読み込みし、別セッションで確認する",
    purpose:
      "構文検証に成功した設定だけを反映し、既存接続を復旧経路として残します。",
    impact:
      "新しいSSH接続に変更後の認証とポートが適用されます。現在の接続は維持します。",
    danger:
      "別セッションでsudoまで確認できるまで、現在のSSH接続を絶対に閉じないでください。",
    backup: [
      "直前の手順で作成した/root/linux-setup-helper-backupを保持します。",
    ],
    commands: ["sudo sshd -t", "sudo systemctl reload ssh"],
    files: [],
    verify: [
      `別のローカル端末から ssh -p ${input.ssh.port} ${input.admin.username}@サーバーのIPアドレス`,
      "新しいSSHセッション内で sudo -v",
    ],
    expected:
      "別セッションで公開鍵ログインでき、sudo -vが成功します。現在のセッションも接続されたままです。",
    rollback: [
      "現在の接続から sudo rm /etc/ssh/sshd_config.d/99-linux-setup-helper.conf を実行します。",
      "sudo sshd -t が成功することを確認してから sudo systemctl reload ssh を実行します。",
    ],
    evidence: ["openssh"],
  };
}

function ufwEnableStep(input: SetupInput): GuideStep {
  return {
    id: "ufw-enable",
    title: "UFWを有効化する",
    purpose: "明示的に許可したSSHポート以外の不要な着信を既定で拒否します。",
    impact:
      "既存のネットワークサービスは、別途許可しない限り外部から接続できなくなる可能性があります。",
    danger:
      "対象外のサービスがある場合は、その管理者が必要な許可を確認するまで有効化しないでください。",
    backup: [
      "sudo ufw status numbered と sudo ufw show raw の結果を作業記録へ保存します。",
    ],
    commands: input.ufw.enabled
      ? [
          "sudo ufw default deny incoming",
          "sudo ufw default allow outgoing",
          "sudo ufw enable",
        ]
      : [],
    files: [],
    verify: ["sudo ufw status verbose"],
    expected: input.ufw.enabled
      ? `Status: active、既定のincoming deny、${input.ssh.port}/tcp ALLOWが表示されます。`
      : "Status: inactiveと表示されます。",
    rollback: input.ufw.enabled
      ? ["現在のSSH接続を維持したまま sudo ufw disable を実行します。"]
      : ["変更はありません。"],
    evidence: ["ufw"],
  };
}

function updatesStep(input: SetupInput): GuideStep {
  const enabled = input.updates.enabled;
  const value = enabled ? "1" : "0";
  const file: ConfigFile = {
    name: "20auto-upgrades",
    path: "/etc/apt/apt.conf.d/20auto-upgrades",
    owner: "root:root",
    mode: "0644",
    content: lines(
      `APT::Periodic::Update-Package-Lists "${value}";`,
      `APT::Periodic::Unattended-Upgrade "${value}";`,
    ),
  };
  return {
    id: "automatic-updates",
    title: `${enabled ? "自動セキュリティ更新を有効化" : "自動更新を無効化"}する`,
    purpose: enabled
      ? "セキュリティ更新を毎日自動適用し、既知の脆弱性にさらされる時間を短くします。"
      : "自動適用を止め、更新を手動管理します。",
    impact: enabled
      ? "更新中は一時的にaptが使用中になり、更新によって再起動が推奨される場合があります。自動再起動は有効化しません。"
      : "管理者が定期的に更新しないと脆弱性が残ります。",
    danger: enabled
      ? undefined
      : "無効化は非推奨です。別の確実な更新運用が必要です。",
    backup: [
      "sudo cp -a /etc/apt/apt.conf.d/20auto-upgrades /root/linux-setup-helper-backup/20auto-upgrades 2>/dev/null || true",
    ],
    commands: [
      ...(enabled
        ? ["sudo apt update", "sudo apt install unattended-upgrades"]
        : []),
      "上記の「設定全文」を/etc/apt/apt.conf.d/20auto-upgradesへエディターで貼り付けます。",
    ],
    files: [file],
    verify: [
      'apt-config dump | grep -E "APT::Periodic::(Update-Package-Lists|Unattended-Upgrade)"',
      "sudo unattended-upgrade --dry-run --debug",
    ],
    expected: `2項目が"${value}"と表示されます。dry-runは実際の更新を適用せず、候補を確認します。`,
    rollback: [
      "バックアップがある場合は sudo cp -a /root/linux-setup-helper-backup/20auto-upgrades /etc/apt/apt.conf.d/20auto-upgrades で戻します。",
    ],
    evidence: ["updates"],
  };
}

export function generateGuide(rawInput: SetupInput): SetupGuide {
  const input = normalizeInput(rawInput);
  const steps = [
    adminStep(input),
    ufwPrepareStep(input),
    sshConfigureStep(input),
    sshApplyStep(input),
    ufwEnableStep(input),
    updatesStep(input),
  ];
  return {
    title: "Ubuntu Server 24.04 LTS 初期設定手順",
    target: "Ubuntu Server 24.04 LTS",
    warnings: [
      "この手順はコマンドを自動実行しません。各項目を読み、期待結果を確認してから次へ進んでください。",
      "SSH設定中は現在の接続を維持し、別セッションで公開鍵ログインとsudoを確認するまで閉じないでください。",
      "パスワード、秘密鍵、APIキーをこのアプリへ入力しないでください。",
    ],
    steps,
  };
}

export function listConfigFiles(guide: SetupGuide): readonly ConfigFile[] {
  return guide.steps.flatMap((step) => step.files);
}

export function evidenceForStep(step: GuideStep) {
  return step.evidence.map((id) => EVIDENCE[id]);
}
