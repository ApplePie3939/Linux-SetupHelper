import type { EvidenceId } from "./types";

export const EVIDENCE: Readonly<
  Record<
    EvidenceId,
    { title: string; url: string; target: string; checked: string }
  >
> = {
  users: {
    title: "Ubuntu Server documentation — User management",
    url: "https://ubuntu.com/server/docs/how-to/security/user-management/",
    target: "Ubuntu Server 24.04 LTS",
    checked: "2026-08-03",
  },
  openssh: {
    title: "Ubuntu Server documentation — OpenSSH server",
    url: "https://ubuntu.com/server/docs/how-to/security/openssh-server/",
    target: "Ubuntu Server 24.04 LTS / OpenSSH",
    checked: "2026-08-03",
  },
  ufw: {
    title: "Ubuntu Server documentation — Firewall",
    url: "https://ubuntu.com/server/docs/how-to/security/firewalls/",
    target: "Ubuntu Server 24.04 LTS / ufw",
    checked: "2026-08-03",
  },
  updates: {
    title: "Ubuntu Server documentation — Automatic updates",
    url: "https://ubuntu.com/server/docs/how-to/software/automatic-updates/",
    target: "Ubuntu Server 24.04 LTS / unattended-upgrades",
    checked: "2026-08-03",
  },
  permissions: {
    title: "Ubuntu Manpage — install(1)",
    url: "https://manpages.ubuntu.com/manpages/noble/man1/install.1.html",
    target: "Ubuntu 24.04 LTS (Noble)",
    checked: "2026-08-03",
  },
};
