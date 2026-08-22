import {
  SCHEMA_VERSION,
  type FieldError,
  type SetupInput,
  type ValidationResult,
} from "./types";

const TOP_KEYS = [
  "schemaVersion",
  "premises",
  "admin",
  "ssh",
  "ufw",
  "updates",
] as const;
const PUBLIC_KEY =
  /^(ssh-ed25519|ecdsa-sha2-nistp256|sk-ssh-ed25519@openssh\.com) [A-Za-z0-9+/]+={0,3}(?: [\x20-\x7e]{1,80})?$/;
const USERNAME = /^[a-z_][a-z0-9_-]{0,30}$/;

const error = (path: string, message: string, action: string): FieldError => ({
  path,
  message,
  action,
});
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  errors: FieldError[],
) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key))
      errors.push(
        error(
          path,
          `未対応の項目「${key}」があります。`,
          "この項目を削除してください。",
        ),
      );
  }
}

export function isValidUsername(value: string): boolean {
  return USERNAME.test(value);
}

export function isValidPublicKey(value: string): boolean {
  if (value.includes("\n") || value.includes("\r")) return false;
  const normalized = value.trim().replace(/ +/g, " ");
  if (!PUBLIC_KEY.test(normalized)) return false;
  const [declaredType, encoded] = normalized.split(" ");
  if (!declaredType || !encoded) return false;
  try {
    const bytes = Uint8Array.from(atob(encoded), (character) =>
      character.charCodeAt(0),
    );
    let offset = 0;
    const readBytes = (): Uint8Array => {
      if (offset + 4 > bytes.length) throw new Error("truncated");
      const length =
        ((bytes[offset]! << 24) |
          (bytes[offset + 1]! << 16) |
          (bytes[offset + 2]! << 8) |
          bytes[offset + 3]!) >>>
        0;
      offset += 4;
      if (offset + length > bytes.length) throw new Error("truncated");
      const result = bytes.slice(offset, offset + length);
      offset += length;
      return result;
    };
    const decode = (part: Uint8Array) => new TextDecoder().decode(part);
    if (decode(readBytes()) !== declaredType) return false;
    if (declaredType === "ssh-ed25519")
      return readBytes().length === 32 && offset === bytes.length;
    if (declaredType === "sk-ssh-ed25519@openssh.com")
      return (
        readBytes().length === 32 &&
        readBytes().length > 0 &&
        offset === bytes.length
      );
    if (declaredType === "ecdsa-sha2-nistp256") {
      const curve = decode(readBytes());
      const point = readBytes();
      return (
        curve === "nistp256" &&
        point.length === 65 &&
        point[0] === 4 &&
        offset === bytes.length
      );
    }
    return false;
  } catch {
    return false;
  }
}

export function validateInput(raw: unknown): ValidationResult {
  const errors: FieldError[] = [];
  if (!isRecord(raw))
    return {
      ok: false,
      errors: [
        error(
          "root",
          "設定の形式が正しくありません。",
          "正しい設定JSONを選択してください。",
        ),
      ],
    };
  hasOnlyKeys(raw, TOP_KEYS, "root", errors);
  if (raw.schemaVersion !== SCHEMA_VERSION)
    errors.push(
      error(
        "schemaVersion",
        "この設定JSONのバージョンには対応していません。",
        `schemaVersionを${SCHEMA_VERSION}にしてください。`,
      ),
    );

  const premises = raw.premises;
  const admin = raw.admin;
  const ssh = raw.ssh;
  const ufw = raw.ufw;
  const updates = raw.updates;
  if (
    !isRecord(premises) ||
    !isRecord(admin) ||
    !isRecord(ssh) ||
    !isRecord(ufw) ||
    !isRecord(updates)
  ) {
    errors.push(
      error(
        "root",
        "必要な設定グループが不足しています。",
        "アプリから設定JSONを再出力してください。",
      ),
    );
    return { ok: false, errors };
  }
  hasOnlyKeys(
    premises,
    ["ubuntu2404", "sudoAvailable", "keepSshSession"],
    "premises",
    errors,
  );
  hasOnlyKeys(admin, ["create", "username"], "admin", errors);
  hasOnlyKeys(
    ssh,
    ["publicKey", "disablePasswordAuthentication", "disableRootLogin", "port"],
    "ssh",
    errors,
  );
  hasOnlyKeys(ufw, ["enabled", "allowSshPort"], "ufw", errors);
  hasOnlyKeys(updates, ["enabled"], "updates", errors);

  for (const [path, value] of [
    ["premises.ubuntu2404", premises.ubuntu2404],
    ["premises.sudoAvailable", premises.sudoAvailable],
    ["premises.keepSshSession", premises.keepSshSession],
    ["admin.create", admin.create],
    ["ssh.disablePasswordAuthentication", ssh.disablePasswordAuthentication],
    ["ssh.disableRootLogin", ssh.disableRootLogin],
    ["ufw.enabled", ufw.enabled],
    ["ufw.allowSshPort", ufw.allowSshPort],
    ["updates.enabled", updates.enabled],
  ] as const)
    if (typeof value !== "boolean")
      errors.push(
        error(
          path,
          "はい／いいえで指定する項目です。",
          "設定値を見直してください。",
        ),
      );

  if (typeof admin.username !== "string" || !isValidUsername(admin.username))
    errors.push(
      error(
        "admin.username",
        "ユーザー名は英小文字または_で始まる31文字以内（英小文字・数字・_・-）にしてください。",
        "例: serveradmin",
      ),
    );
  if (
    typeof ssh.publicKey !== "string" ||
    !isValidPublicKey(ssh.publicKey.trim())
  )
    errors.push(
      error(
        "ssh.publicKey",
        "対応する有効なSSH公開鍵を1行で入力してください。秘密鍵は入力しないでください。",
        "ssh-ed25519、ECDSA P-256、またはFIDO鍵の公開鍵を貼り付けてください。",
      ),
    );
  if (
    !Number.isInteger(ssh.port) ||
    (ssh.port as number) < 1 ||
    (ssh.port as number) > 65535
  )
    errors.push(
      error(
        "ssh.port",
        "SSHポートは1〜65535の整数で指定してください。",
        "通常は22を使用します。",
      ),
    );

  if (premises.ubuntu2404 !== true)
    errors.push(
      error(
        "premises.ubuntu2404",
        "対象OSをUbuntu Server 24.04 LTSと確認できません。",
        "対象OSを確認してください。別OSにはこの手順を使わないでください。",
      ),
    );
  if (premises.sudoAvailable !== true)
    errors.push(
      error(
        "premises.sudoAvailable",
        "現在の利用者がsudoを使えることを確認できません。",
        "コンソール等で管理権限を確保してください。",
      ),
    );
  if (premises.keepSshSession !== true)
    errors.push(
      error(
        "premises.keepSshSession",
        "現在のSSH接続を維持する確認が必要です。",
        "作業中は現在の接続を閉じないでください。",
      ),
    );
  if (admin.create !== true)
    errors.push(
      error(
        "admin.create",
        "MVPではsudo可能な管理ユーザーの作成が必須です。",
        "管理ユーザーの作成を有効にしてください。",
      ),
    );
  if (admin.create !== true && ssh.disableRootLogin === true)
    errors.push(
      error(
        "admin.create",
        "sudo可能な管理ユーザーなしでrootログインを無効化できません。",
        "管理ユーザーを作成するか、rootログイン無効化を取りやめてください。",
      ),
    );
  if (
    ssh.disablePasswordAuthentication === true &&
    !isValidPublicKey(String(ssh.publicKey).trim())
  )
    errors.push(
      error(
        "ssh.publicKey",
        "公開鍵が有効になるまでパスワード認証を無効化できません。",
        "有効な公開鍵を入力してください。",
      ),
    );
  if (ufw.enabled === true && ufw.allowSshPort !== true)
    errors.push(
      error(
        "ufw.allowSshPort",
        "SSHポートを許可しないUFW設定は接続を遮断します。",
        "SSHポートの許可を有効にしてください。",
      ),
    );
  if (ssh.port !== 22 && (ufw.enabled !== true || ufw.allowSshPort !== true))
    errors.push(
      error(
        "ufw.allowSshPort",
        "SSHポート変更時は新しいポートのUFW許可が同じ計画に必要です。",
        "UFWとSSHポート許可を有効にしてください。",
      ),
    );

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      schemaVersion: SCHEMA_VERSION,
      premises: { ubuntu2404: true, sudoAvailable: true, keepSshSession: true },
      admin: {
        create: admin.create as boolean,
        username: (admin.username as string).trim(),
      },
      ssh: {
        publicKey: (ssh.publicKey as string).trim().replace(/ +/g, " "),
        disablePasswordAuthentication:
          ssh.disablePasswordAuthentication as boolean,
        disableRootLogin: ssh.disableRootLogin as boolean,
        port: ssh.port as number,
      },
      ufw: {
        enabled: ufw.enabled as boolean,
        allowSshPort: ufw.allowSshPort as boolean,
      },
      updates: { enabled: updates.enabled as boolean },
    },
  };
}

export function parseConfigJson(text: string): ValidationResult {
  try {
    return validateInput(JSON.parse(text) as unknown);
  } catch {
    return {
      ok: false,
      errors: [
        error(
          "root",
          "JSONを読み取れませんでした。",
          "破損していない設定JSONを選択してください。",
        ),
      ],
    };
  }
}

export function normalizeInput(input: SetupInput): SetupInput {
  const result = validateInput(input);
  if (!result.ok)
    throw new Error(result.errors.map((item) => item.message).join(" "));
  return Object.freeze(result.value);
}
