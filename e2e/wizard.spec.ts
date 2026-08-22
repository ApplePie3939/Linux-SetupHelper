import { expect, test, type Page } from "@playwright/test";

const PUBLIC_KEY =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB e2e";
const VALID_CONFIG = {
  schemaVersion: 1,
  premises: { ubuntu2404: true, sudoAvailable: true, keepSshSession: true },
  admin: { create: true, username: "serveradmin" },
  ssh: {
    publicKey: PUBLIC_KEY,
    disablePasswordAuthentication: true,
    disableRootLogin: true,
    port: 22,
  },
  ufw: { enabled: true, allowSshPort: true },
  updates: { enabled: true },
};

const configFile = (value: unknown) => ({
  name: "setup.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(value)),
});

async function confirmPremises(page: Page) {
  for (const box of await page.getByRole("checkbox").all()) await box.check();
}

async function completeWizard(page: Page, port = "2222") {
  await confirmPremises(page);
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await page.getByLabel("SSH公開鍵（必須）").fill(PUBLIC_KEY);
  await page.getByLabel("SSHポート").fill(port);
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await page.getByRole("button", { name: /安全性を再検証/ }).click();
}

async function reachGeneratedGuide(page: Page, port = "2222") {
  await page.goto("/");
  await completeWizard(page, port);
}

test("危険な未確認状態では生成フローへ進めない", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await expect(page.getByRole("alert")).toContainText("3件");
  await expect(
    page.getByRole("heading", { name: "はじめる前の安全確認" }),
  ).toBeVisible();
});

test("危険な設定JSONを読込時に拒否する", async ({ page }) => {
  for (const unsafe of [
    {
      ...structuredClone(VALID_CONFIG),
      ssh: { ...VALID_CONFIG.ssh, publicKey: "" },
    },
    {
      ...structuredClone(VALID_CONFIG),
      admin: { ...VALID_CONFIG.admin, create: false },
    },
    {
      ...structuredClone(VALID_CONFIG),
      ssh: { ...VALID_CONFIG.ssh, port: 2222 },
      ufw: { enabled: false, allowSshPort: false },
    },
  ]) {
    await page.goto("/");
    await page.locator('input[type="file"]').setInputFiles(configFile(unsafe));
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(
      page.getByText("設定JSONを検証し、現在の入力を置き換えました。"),
    ).toHaveCount(0);
  }
});

test("検証済み設定JSONを明示的に読み込める", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(
    configFile({
      ...structuredClone(VALID_CONFIG),
      admin: { create: true, username: "operator" },
    }),
  );
  await expect(
    page.getByText("設定JSONを検証し、現在の入力を置き換えました。"),
  ).toBeVisible();
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await expect(page.getByLabel("ユーザー名")).toHaveValue("operator");
});

test("安全な経路にSSHロックアウト防止手順が含まれる", async ({ page }) => {
  await page.goto("/");
  await confirmPremises(page);
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await page.getByLabel("SSH公開鍵（必須）").fill(PUBLIC_KEY);
  await page.getByLabel("SSHポート").fill("2222");
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await expect(page.getByText("TCP 2222 / ALLOW")).toBeVisible();
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await page.getByRole("button", { name: /安全性を再検証/ }).click();
  await expect(page.getByText("手順書を生成しました")).toBeVisible();
  await expect(
    page.getByText("sudo sshd -t", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("sudo systemctl disable --now ssh.socket", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("sudo systemctl restart ssh", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/sudo sshd -T/).first()).toBeVisible();
  await expect(
    page.getByText(/00-linux-setup-helper\.conf/).first(),
  ).toBeVisible();
  await expect(page.getByText(/別セッションで公開鍵ログイン/)).toBeVisible();
});

test("エラー要約へフォーカスし、キーボードだけで次の画面へ進める", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /次へ進む/ }).press("Enter");
  const summary = page.getByRole("alert");
  await expect(summary).toBeFocused();

  for (const name of [
    "対象はUbuntu Server 24.04 LTSである",
    "現在のユーザーはsudoを利用できる",
    "現在のSSH接続を維持できる",
  ]) {
    await page.getByRole("checkbox", { name }).press("Space");
  }
  await page.getByRole("button", { name: /次へ進む/ }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "管理ユーザー" }),
  ).toBeVisible();
});

test("200%拡大相当と狭幅で横方向にはみ出さない", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 720 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.setViewportSize({ width: 320, height: 720 });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("主要画面の文字コントラストがWCAG AA基準を満たす", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /次へ進む/ }).click();
  const violations = await page.evaluate(() => {
    const parseColor = (color: string) => {
      const match = color.match(
        /rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)(?:[, /]+([\d.]+))?\)/,
      );
      return match
        ? [
            Number(match[1]),
            Number(match[2]),
            Number(match[3]),
            match[4] === undefined ? 1 : Number(match[4]),
          ]
        : null;
    };
    const luminance = (rgb: number[]) => {
      const values = rgb.slice(0, 3).map((value) => {
        const channel = value / 255;
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * values[0]! + 0.7152 * values[1]! + 0.0722 * values[2]!;
    };
    const contrast = (foreground: number[], background: number[]) => {
      const first = luminance(foreground);
      const second = luminance(background);
      return (
        (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
      );
    };

    const failures: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>("body *")) {
      if (element.children.length || !element.textContent?.trim()) continue;
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const foreground = parseColor(style.color);
      if (!foreground) continue;
      let parent: HTMLElement | null = element;
      let background: number[] | null = null;
      while (parent && !background) {
        const candidate = parseColor(getComputedStyle(parent).backgroundColor);
        if (candidate?.[3] === 1) background = candidate;
        parent = parent.parentElement;
      }
      background ??= [244, 242, 235, 1];
      const size = Number(style.fontSize.replace("px", ""));
      const large =
        size >= 24 || (Number(style.fontWeight) >= 700 && size >= 18.66);
      if (contrast(foreground, background) < (large ? 3 : 4.5))
        failures.push(element.textContent.trim().slice(0, 60));
    }
    return failures;
  });
  expect(violations).toEqual([]);
});

test("Markdown・ZIP・設定JSONを端末内でダウンロードできる", async ({
  page,
}) => {
  await reachGeneratedGuide(page);
  for (const [buttonName, filename] of [
    ["↓ Markdown", "ubuntu-24.04-setup-guide.md"],
    ["↓ ZIP一式", "ubuntu-24.04-setup-guide.zip"],
    ["↓ 設定JSON", "linux-setup-helper-config.json"],
  ] as const) {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: buttonName, exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(filename);
  }
});

test("オンライン再読込で古いHTMLキャッシュを更新する", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.evaluate(async () => {
    const cacheName = (await caches.keys()).find((name) =>
      name.startsWith("linux-setup-helper-"),
    );
    if (!cacheName) throw new Error("アプリキャッシュが見つかりません。");
    const cache = await caches.open(cacheName);
    await cache.put(
      "/index.html",
      new Response(
        "<!doctype html><title>stale-cache</title><p>stale-cache</p>",
        {
          headers: { "Content-Type": "text/html" },
        },
      ),
    );
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "はじめる前の安全確認" }),
  ).toBeVisible();
  await expect(page.getByText("stale-cache")).toHaveCount(0);
});

test("初回取得後はオフラインで再読込できる", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "Windows版Playwright WebKitはオフラインreloadで内部エラーになるため、実Safariで手動確認する。",
  );
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "はじめる前の安全確認" }),
    ).toBeVisible();
    await completeWizard(page);
    await expect(
      page.getByRole("heading", { name: "手順書を生成しました" }),
    ).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "↓ ZIP一式", exact: true }).click();
    expect((await downloadPromise).suggestedFilename()).toBe(
      "ubuntu-24.04-setup-guide.zip",
    );
  } finally {
    await context.setOffline(false);
  }
});
