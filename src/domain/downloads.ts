import JSZip from "jszip";
import { listConfigFiles } from "./generator";
import { outputManifest, renderConfigJson, renderMarkdown } from "./renderers";
import type { SetupGuide, SetupInput } from "./types";

export async function buildZip(
  guide: SetupGuide,
  input: SetupInput,
): Promise<Blob> {
  const zip = new JSZip();
  zip.file("README.md", renderMarkdown(guide));
  zip.file("setup-config.json", renderConfigJson(input));
  zip.file("files/manifest.json", outputManifest(guide));
  for (const file of listConfigFiles(guide)) {
    const safe = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
    zip.file(`files/${safe}`, file.content);
  }
  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    platform: "UNIX",
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadText(
  text: string,
  filename: string,
  type: string,
): void {
  downloadBlob(new Blob([text], { type }), filename);
}
