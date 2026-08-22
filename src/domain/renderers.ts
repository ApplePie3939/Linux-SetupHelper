import { EVIDENCE } from "./evidence";
import { listConfigFiles } from "./generator";
import type { SetupGuide, SetupInput } from "./types";

const code = (value: string, language = "bash") =>
  `\n\`\`\`${language}\n${value}\n\`\`\`\n`;

export function renderMarkdown(guide: SetupGuide): string {
  const sections = guide.steps.map((step, index) => {
    const commands = step.commands.map((command) => code(command)).join("");
    const files = step.files
      .map(
        (file) =>
          `\n#### 設定全文: ${file.path}\n\n- 所有者: \`${file.owner}\`\n- 権限: \`${file.mode}\`\n${code(file.content.trimEnd(), "")}`,
      )
      .join("");
    const refs = step.evidence
      .map((id) => {
        const item = EVIDENCE[id];
        return `- [${item.title}](${item.url}) — 対象: ${item.target}、最終確認: ${item.checked}`;
      })
      .join("\n");
    return `## ${index + 1}. ${step.title}\n\n**目的:** ${step.purpose}\n\n**影響:** ${step.impact}\n${step.danger ? `\n> ⚠️ ${step.danger}\n` : ""}\n### 変更前の確認・バックアップ\n\n${step.backup.map((x) => `- ${x}`).join("\n")}\n\n### 実行・配置\n${commands}${files}\n### 成功確認\n${step.verify.map((x) => code(x)).join("")}\n**期待結果:** ${step.expected}\n\n### 失敗時の復旧\n\n${step.rollback.map((x) => `- ${x}`).join("\n")}\n\n### 根拠\n\n${refs}`;
  });
  return `# ${guide.title}\n\n対象: **${guide.target}**\n\n${guide.warnings.map((warning) => `> ⚠️ ${warning}`).join("\n\n")}\n\n${sections.join("\n\n")}\n`;
}

export function renderConfigJson(input: SetupInput): string {
  return `${JSON.stringify(input, null, 2)}\n`;
}

export function outputManifest(guide: SetupGuide): string {
  return `${JSON.stringify(
    {
      target: guide.target,
      files: listConfigFiles(guide).map(({ name, path, owner, mode }) => ({
        name,
        path,
        owner,
        mode,
      })),
    },
    null,
    2,
  )}\n`;
}
