import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildZip } from "./downloads";
import { generateGuide } from "./generator";
import { renderMarkdown } from "./renderers";
import { DEFAULT_INPUT } from "./types";

const input = {
  ...structuredClone(DEFAULT_INPUT),
  premises: { ubuntu2404: true, sudoAvailable: true, keepSshSession: true },
  ssh: {
    ...DEFAULT_INPUT.ssh,
    port: 2222,
    publicKey:
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB test",
  },
};

describe("generateGuide", () => {
  it("SSHロックアウト防止順序を固定する", () => {
    const guide = generateGuide(input);
    expect(guide.steps.map((step) => step.id)).toEqual([
      "admin-user",
      "ufw-prepare",
      "ssh-configure",
      "ssh-apply",
      "ufw-enable",
      "automatic-updates",
    ]);
    const markdown = renderMarkdown(guide);
    expect(markdown.indexOf("sudo ufw allow 2222/tcp")).toBeLessThan(
      markdown.indexOf("sudo sshd -t"),
    );
    expect(markdown.indexOf("sudo sshd -t")).toBeLessThan(
      markdown.indexOf("sudo systemctl reload ssh"),
    );
    expect(markdown).toContain("現在のSSH接続を維持");
    expect(markdown).toContain("別セッション");
  });

  it("同じ入力から同じ内容を生成する", () => {
    expect(generateGuide(input)).toEqual(generateGuide(structuredClone(input)));
    expect(renderMarkdown(generateGuide(input))).toBe(
      renderMarkdown(generateGuide(input)),
    );
  });

  it("代表入力のMarkdownをスナップショットで固定する", () => {
    expect(renderMarkdown(generateGuide(input))).toMatchSnapshot();
  });

  it("設定全文・所有者・権限・末尾改行を含む", () => {
    const files = generateGuide(input).steps.flatMap((step) => step.files);
    expect(files).toHaveLength(3);
    expect(files.every((file) => file.content.endsWith("\n"))).toBe(true);
    expect(
      files.every(
        (file) => file.owner && file.mode && file.path.startsWith("/"),
      ),
    ).toBe(true);
  });

  it("sshdの最優先drop-inと非破壊的な鍵配置手順を生成する", () => {
    const guide = generateGuide(input);
    const files = guide.steps.flatMap((step) => step.files);
    const commands = guide.steps.flatMap((step) => step.commands).join("\n");
    const verification = guide.steps.flatMap((step) => step.verify).join("\n");
    expect(
      files.some((file) => file.name === "00-linux-setup-helper.conf"),
    ).toBe(true);
    expect(commands).not.toContain("/dev/null");
    expect(commands).toContain(
      "sudo touch /home/serveradmin/.ssh/authorized_keys",
    );
    expect(verification).toContain("sudo sshd -T");
  });

  it("無効化を選んだ機能へ不要な変更を加えない", () => {
    const disabled = structuredClone(input);
    disabled.ssh.port = 22;
    disabled.ufw = { enabled: false, allowSshPort: true };
    disabled.updates = { enabled: false };
    const guide = generateGuide(disabled);
    const commands = guide.steps.flatMap((step) => step.commands).join("\n");
    expect(commands).not.toContain("sudo ufw allow");
    expect(commands).not.toContain("sudo apt install unattended-upgrades");
  });

  it("安全な相対パスだけでZIPを作る", async () => {
    const blob = await buildZip(generateGuide(input), input);
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(blob);
    });
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files);
    expect(names).toContain("README.md");
    expect(names).toContain("setup-config.json");
    expect(
      names.every((name) => !name.includes("..") && !name.startsWith("/")),
    ).toBe(true);
  });
});
