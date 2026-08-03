import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const viteCli = fileURLToPath(
  new URL("../node_modules/vite/bin/vite.js", import.meta.url),
);
const playwrightCli = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
);
const server = spawn(
  process.execPath,
  [viteCli, "preview", "--host", "127.0.0.1"],
  { cwd: root, stdio: "ignore" },
);

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null)
      throw new Error("production previewを起動できませんでした。");
    try {
      const response = await fetch("http://127.0.0.1:4173/");
      if (response.ok) return;
    } catch {
      // 起動完了まで短時間だけ再試行する。
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("production previewの起動確認がタイムアウトしました。");
}

let exitCode = 1;
try {
  await waitForServer();
  const tests = spawn(
    process.execPath,
    [playwrightCli, "test", ...process.argv.slice(2)],
    {
      cwd: root,
      stdio: "inherit",
    },
  );
  const [code] = await once(tests, "exit");
  exitCode = typeof code === "number" ? code : 1;
} finally {
  if (server.exitCode === null) {
    server.kill();
    await Promise.race([
      once(server, "exit"),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
}

process.exitCode = exitCode;
