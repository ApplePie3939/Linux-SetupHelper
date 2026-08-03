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
sudo install -m 0600 -o serveradmin -g serveradmin /dev/null /home/serveradmin/.ssh/authorized_keys
sudo install -m 0644 -o root -g root /dev/null /etc/ssh/sshd_config.d/99-linux-setup-helper.conf
sudo sshd -t
sudo systemctl reload ssh
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
