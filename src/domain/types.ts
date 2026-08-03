export const SCHEMA_VERSION = 1 as const;

export type SetupInput = Readonly<{
  schemaVersion: typeof SCHEMA_VERSION;
  premises: Readonly<{
    ubuntu2404: boolean;
    sudoAvailable: boolean;
    keepSshSession: boolean;
  }>;
  admin: Readonly<{
    create: boolean;
    username: string;
  }>;
  ssh: Readonly<{
    publicKey: string;
    disablePasswordAuthentication: boolean;
    disableRootLogin: boolean;
    port: number;
  }>;
  ufw: Readonly<{
    enabled: boolean;
    allowSshPort: boolean;
  }>;
  updates: Readonly<{
    enabled: boolean;
  }>;
}>;

export type FieldError = Readonly<{
  path: string;
  message: string;
  action: string;
}>;

export type ValidationResult =
  | Readonly<{ ok: true; value: SetupInput }>
  | Readonly<{ ok: false; errors: readonly FieldError[] }>;

export type EvidenceId =
  "users" | "openssh" | "ufw" | "updates" | "permissions";

export type ConfigFile = Readonly<{
  name: string;
  path: string;
  owner: string;
  mode: string;
  content: string;
}>;

export type GuideStep = Readonly<{
  id: string;
  title: string;
  purpose: string;
  impact: string;
  danger?: string;
  backup: readonly string[];
  commands: readonly string[];
  files: readonly ConfigFile[];
  verify: readonly string[];
  expected: string;
  rollback: readonly string[];
  evidence: readonly EvidenceId[];
}>;

export type SetupGuide = Readonly<{
  title: string;
  target: "Ubuntu Server 24.04 LTS";
  warnings: readonly string[];
  steps: readonly GuideStep[];
}>;

export const DEFAULT_INPUT: SetupInput = {
  schemaVersion: SCHEMA_VERSION,
  premises: { ubuntu2404: false, sudoAvailable: false, keepSshSession: false },
  admin: { create: true, username: "serveradmin" },
  ssh: {
    publicKey: "",
    disablePasswordAuthentication: true,
    disableRootLogin: true,
    port: 22,
  },
  ufw: { enabled: true, allowSshPort: true },
  updates: { enabled: true },
};
