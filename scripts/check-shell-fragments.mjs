import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

try {
  execFileSync("shellcheck", ["--version"], { stdio: "ignore" });
} catch {
  console.error(
    "ShellCheckが見つかりません。Ubuntu/WSL等でshellcheckをインストールして再実行してください。",
  );
  process.exit(2);
}

const fragments = `#!/bin/sh
sudo adduser serveradmin
sudo adduser serveradmin sudo
sudo ufw allow 2222/tcp comment 'OpenSSH'
sudo install -d -m 0700 -o serveradmin -g serveradmin /home/serveradmin/.ssh
sudo touch /home/serveradmin/.ssh/authorized_keys
sudo chown serveradmin:serveradmin /home/serveradmin/.ssh/authorized_keys
sudo chmod 0600 /home/serveradmin/.ssh/authorized_keys
sudo touch /etc/ssh/sshd_config.d/00-linux-setup-helper.conf
sudo chown root:root /etc/ssh/sshd_config.d/00-linux-setup-helper.conf
sudo chmod 0644 /etc/ssh/sshd_config.d/00-linux-setup-helper.conf
sudo sshd -t
sudo sshd -T | grep -E '^(port|pubkeyauthentication|passwordauthentication|permitrootlogin) '
sudo systemctl disable --now ssh.socket
sudo systemctl restart ssh
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable
sudo apt update
sudo apt install unattended-upgrades
`;
const directory = mkdtempSync(join(tmpdir(), "linux-setup-helper-"));
const target = join(directory, "fragments.sh");
try {
  writeFileSync(target, fragments, "utf8");
  execFileSync("shellcheck", ["--shell=sh", target], { stdio: "inherit" });
} finally {
  rmSync(directory, { recursive: true, force: true });
}
