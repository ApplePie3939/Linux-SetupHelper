import { expect, test } from "@playwright/test";

test("危険な未確認状態では生成フローへ進めない", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await expect(page.getByRole("alert")).toContainText("3件");
  await expect(
    page.getByRole("heading", { name: "はじめる前の安全確認" }),
  ).toBeVisible();
});

test("安全な経路にSSHロックアウト防止手順が含まれる", async ({ page }) => {
  await page.goto("/");
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await page.getByRole("button", { name: /次へ進む/ }).click();
  await page
    .getByLabel("SSH公開鍵（必須）")
    .fill(
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB e2e",
    );
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
    page.getByText("sudo systemctl reload ssh", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/別セッションで公開鍵ログイン/)).toBeVisible();
});

test("初回取得後はオフラインで再読込できる", async ({ page, context }) => {
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
  } finally {
    await context.setOffline(false);
  }
});
