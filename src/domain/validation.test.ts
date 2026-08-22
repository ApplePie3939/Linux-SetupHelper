import { describe, expect, it } from "vitest";
import { DEFAULT_INPUT } from "./types";
import { normalizeInput, parseConfigJson, validateInput } from "./validation";

const validInput = () => ({
  ...structuredClone(DEFAULT_INPUT),
  premises: { ubuntu2404: true, sudoAvailable: true, keepSshSession: true },
  ssh: {
    ...DEFAULT_INPUT.ssh,
    publicKey:
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB test",
  },
});

describe("validateInput", () => {
  it("安全な入力を正規化する", () => {
    const raw = validInput();
    raw.ssh.publicKey =
      "  ssh-ed25519  AAAAC3NzaC1lZDI1NTE5AAAAIAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB  test  ";
    const result = validateInput(raw);
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.value.ssh.publicKey).toBe(
        "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB test",
      );
  });

  it("公開鍵なしでパスワード認証を無効化できない", () => {
    const raw = validInput();
    raw.ssh.publicKey = "";
    const result = validateInput(raw);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(
        result.errors.some((item) => item.message.includes("公開鍵")),
      ).toBe(true);
  });

  it("OpenSSH内部構造が不正な公開鍵を拒否する", () => {
    const raw = validInput();
    raw.ssh.publicKey =
      "ssh-ed25519 AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= fake";
    const result = validateInput(raw);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.some((item) => item.path === "ssh.publicKey")).toBe(
        true,
      );
  });

  it("管理ユーザーなしでrootログインを無効化できない", () => {
    const raw = validInput();
    raw.admin = { ...raw.admin, create: false };
    const result = validateInput(raw);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(
        result.errors.some((item) => item.message.includes("rootログイン")),
      ).toBe(true);
  });

  it("変更SSHポートのUFW許可なしでは生成しない", () => {
    const raw = validInput();
    raw.ssh.port = 2222;
    raw.ufw = { ...raw.ufw, allowSshPort: false };
    const result = validateInput(raw);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(
        result.errors.some((item) => item.message.includes("新しいポート")),
      ).toBe(true);
  });

  it("未知キーと未対応バージョンを拒否する", () => {
    const raw = { ...validInput(), schemaVersion: 2, injected: "$(id)" };
    const result = validateInput(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(2);
  });

  it("破損JSONを日本語エラーにする", () => {
    const result = parseConfigJson("{");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.message).toContain("JSON");
  });

  it("正規化は決定的かつ入力を変更しない", () => {
    const raw = validInput();
    const before = structuredClone(raw);
    expect(normalizeInput(raw)).toEqual(normalizeInput(structuredClone(raw)));
    expect(raw).toEqual(before);
  });
});
