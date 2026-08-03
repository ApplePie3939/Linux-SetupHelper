import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("ウィザード", () => {
  it("前提未確認では次へ進めずエラー要約を表示する", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /次へ進む/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "入力を確認してください",
    );
    expect(
      screen.getByRole("heading", { name: "はじめる前の安全確認" }),
    ).toBeInTheDocument();
  });

  it("確認後は管理ユーザーへ進み、戻っても入力を保持する", async () => {
    render(<App />);
    for (const checkbox of screen.getAllByRole("checkbox"))
      await userEvent.click(checkbox);
    await userEvent.click(screen.getByRole("button", { name: /次へ進む/ }));
    const input = screen.getByLabelText("ユーザー名");
    await userEvent.clear(input);
    await userEvent.type(input, "operator");
    await userEvent.click(screen.getByRole("button", { name: /戻る/ }));
    await userEvent.click(screen.getByRole("button", { name: /次へ進む/ }));
    expect(screen.getByLabelText("ユーザー名")).toHaveValue("operator");
  });
});
