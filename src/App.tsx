import { useRef, useState } from "react";
import { buildZip, downloadBlob, downloadText } from "./domain/downloads";
import { evidenceForStep, generateGuide } from "./domain/generator";
import { renderConfigJson, renderMarkdown } from "./domain/renderers";
import {
  DEFAULT_INPUT,
  type FieldError,
  type SetupGuide,
  type SetupInput,
} from "./domain/types";
import {
  isValidPublicKey,
  isValidUsername,
  parseConfigJson,
  validateInput,
} from "./domain/validation";

const STEPS = [
  "前提確認",
  "管理ユーザー",
  "SSH",
  "UFW",
  "自動更新",
  "最終確認",
  "生成",
] as const;
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type MutableInput = {
  -readonly [K in keyof SetupInput]: SetupInput[K] extends object
    ? { -readonly [P in keyof SetupInput[K]]: SetupInput[K][P] }
    : SetupInput[K];
};

const clone = (input: SetupInput): MutableInput => structuredClone(input);

function FieldNote({ children }: { children: React.ReactNode }) {
  return <p className="field-note">{children}</p>;
}

function Choice({
  label,
  detail,
  checked,
  onChange,
  name,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: () => void;
  name: string;
}) {
  return (
    <label className={`choice ${checked ? "choice--selected" : ""}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </label>
  );
}

function ErrorSummary({
  errors,
  onJump,
}: {
  errors: readonly FieldError[];
  onJump?: (path: string) => void;
}) {
  if (!errors.length) return null;
  return (
    <section
      className="error-summary"
      role="alert"
      aria-labelledby="error-title"
      tabIndex={-1}
    >
      <h2 id="error-title">⚠ 入力を確認してください（{errors.length}件）</h2>
      <ul>
        {errors.map((item, index) => (
          <li key={`${item.path}-${index}`}>
            <button type="button" onClick={() => onJump?.(item.path)}>
              {item.message}
            </button>
            <span>{item.action}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function App() {
  const [step, setStep] = useState<Step>(0);
  const [input, setInput] = useState<SetupInput>(() => clone(DEFAULT_INPUT));
  const [errors, setErrors] = useState<readonly FieldError[]>([]);
  const [guide, setGuide] = useState<SetupGuide | null>(null);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const update = (fn: (draft: MutableInput) => void) => {
    const next = clone(input);
    fn(next);
    setInput(next);
    setErrors([]);
  };

  const move = (next: Step) => {
    setErrors([]);
    setStep(next);
    requestAnimationFrame(() => {
      mainRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const stepErrors = (): FieldError[] => {
    const list: FieldError[] = [];
    if (step === 0) {
      if (!input.premises.ubuntu2404)
        list.push({
          path: "premises.ubuntu2404",
          message: "Ubuntu Server 24.04 LTSであることを確認してください。",
          action: "別のOSにはこの手順を使用できません。",
        });
      if (!input.premises.sudoAvailable)
        list.push({
          path: "premises.sudoAvailable",
          message: "sudoを利用できることを確認してください。",
          action: "管理権限を確保してから続けてください。",
        });
      if (!input.premises.keepSshSession)
        list.push({
          path: "premises.keepSshSession",
          message: "現在のSSH接続を維持することを確認してください。",
          action: "別セッション確認まで現在の接続を閉じないでください。",
        });
    }
    if (step === 1 && !isValidUsername(input.admin.username))
      list.push({
        path: "admin.username",
        message: "ユーザー名の形式が正しくありません。",
        action: "英小文字または_で始まる31文字以内にしてください。",
      });
    if (step === 2) {
      if (!isValidPublicKey(input.ssh.publicKey.trim()))
        list.push({
          path: "ssh.publicKey",
          message: "有効なSSH公開鍵を入力してください。",
          action:
            "秘密鍵ではなく、ssh-ed25519等で始まる公開鍵を1行で貼り付けます。",
        });
      if (
        !Number.isInteger(input.ssh.port) ||
        input.ssh.port < 1 ||
        input.ssh.port > 65535
      )
        list.push({
          path: "ssh.port",
          message: "SSHポートが範囲外です。",
          action: "1〜65535の整数にしてください。",
        });
    }
    return list;
  };

  const next = () => {
    const found = stepErrors();
    if (found.length) {
      setErrors(found);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(".error-summary")?.focus(),
      );
      return;
    }
    move((step + 1) as Step);
  };

  const createGuide = () => {
    const result = validateInput(input);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setInput(result.value);
    setGuide(generateGuide(result.value));
    move(6);
  };

  const jumpForError = (path: string) => {
    const target: Step = path.startsWith("premises")
      ? 0
      : path.startsWith("admin")
        ? 1
        : path.startsWith("ssh")
          ? 2
          : path.startsWith("ufw")
            ? 3
            : 4;
    move(target);
    requestAnimationFrame(() => document.getElementById(path)?.focus());
  };

  const importJson = async (file?: File) => {
    if (!file) return;
    const result = parseConfigJson(await file.text());
    if (!result.ok) {
      setErrors(result.errors);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(".error-summary")?.focus(),
      );
      return;
    }
    setInput(result.value);
    setGuide(null);
    setNotice("設定JSONを検証し、現在の入力を置き換えました。");
    move(0);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("クリップボードへコピーしました。");
    } catch {
      setNotice(
        "コピーできませんでした。コードを選択して手動でコピーしてください。",
      );
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        メイン内容へ移動
      </a>
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            $
          </span>
          <span>
            Linux Setup Helper<small>Ubuntu Server 24.04 LTS 専用</small>
          </span>
        </div>
        <div className="privacy-badge">◉ 端末内だけで処理</div>
      </header>

      <nav className="progress" aria-label="設定の進捗">
        <ol>
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={
                index === step ? "current" : index < step ? "done" : ""
              }
              aria-current={index === step ? "step" : undefined}
            >
              <span>{index < step ? "✓" : index + 1}</span>
              <b>{label}</b>
            </li>
          ))}
        </ol>
      </nav>

      <main id="main" ref={mainRef} tabIndex={-1}>
        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button
              type="button"
              aria-label="通知を閉じる"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}
        <ErrorSummary errors={errors} onJump={jumpForError} />

        {step === 0 && (
          <section className="panel">
            <p className="eyebrow">STEP 01 — SAFETY CHECK</p>
            <h1>はじめる前の安全確認</h1>
            <p className="lead">
              このアプリはサーバーへ接続せず、手動で確認しながら実行する手順書を作ります。すべて確認できる場合だけ続けてください。
            </p>
            <div className="warning-card">
              <span aria-hidden="true">⚠</span>
              <div>
                <strong>SSH切断に備えてください</strong>
                <p>
                  設定作業中は現在のSSH接続を維持し、別セッションで確認できるまで閉じません。コンソール接続手段があれば準備してください。
                </p>
              </div>
            </div>
            <fieldset>
              <legend>必須の前提</legend>
              {[
                [
                  "ubuntu2404",
                  "対象はUbuntu Server 24.04 LTSである",
                  "デスクトップ版や他のLinuxには使用しません。",
                ],
                [
                  "sudoAvailable",
                  "現在のユーザーはsudoを利用できる",
                  "sudo -vで確認できる管理権限が必要です。",
                ],
                [
                  "keepSshSession",
                  "現在のSSH接続を維持できる",
                  "新しい接続の確認完了まで切断しません。",
                ],
              ].map(([key, label, detail]) => (
                <label className="check-row" key={key}>
                  <input
                    id={`premises.${key}`}
                    type="checkbox"
                    checked={
                      input.premises[key as keyof SetupInput["premises"]]
                    }
                    onChange={(e) =>
                      update((d) => {
                        d.premises[key as keyof SetupInput["premises"]] =
                          e.target.checked;
                      })
                    }
                  />
                  <span>
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <details>
              <summary>このアプリが行わないこと</summary>
              <p>
                サーバーへの接続・自動実行、パスワードや秘密鍵の入力、任意コマンド生成、外部送信、自動保存は行いません。
              </p>
            </details>
          </section>
        )}

        {step === 1 && (
          <section className="panel">
            <p className="eyebrow">STEP 02 — ADMIN USER</p>
            <h1>管理ユーザー</h1>
            <p className="lead">
              rootを直接使わず、必要な操作だけsudoで行う管理ユーザーを作成します。
            </p>
            <div className="recommend">
              ★ 推奨設定：新しい管理ユーザーを作成
            </div>
            <label className="text-field" htmlFor="admin.username">
              <span>ユーザー名</span>
              <input
                id="admin.username"
                value={input.admin.username}
                maxLength={31}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) =>
                  update((d) => {
                    d.admin.username = e.target.value;
                  })
                }
                aria-describedby="username-help"
              />
            </label>
            <FieldNote>
              <span id="username-help">
                英小文字または _ で始まり、英小文字・数字・_・- のみ。例:
                serveradmin
              </span>
            </FieldNote>
            <div className="info-grid">
              <article>
                <strong>目的</strong>
                <p>
                  日常作業でrootを使わず、操作記録と権限範囲を明確にします。
                </p>
              </article>
              <article>
                <strong>影響</strong>
                <p>
                  adduserがサーバー上でパスワードを対話入力します。このアプリには入力しません。
                </p>
              </article>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="panel">
            <p className="eyebrow">STEP 03 — SECURE SSH</p>
            <h1>SSH公開鍵認証</h1>
            <p className="lead">
              有効な公開鍵の準備ができるまで、パスワード認証の無効化は許可されません。
            </p>
            <label className="text-field" htmlFor="ssh.publicKey">
              <span>SSH公開鍵（必須）</span>
              <textarea
                id="ssh.publicKey"
                rows={4}
                value={input.ssh.publicKey}
                onChange={(e) =>
                  update((d) => {
                    d.ssh.publicKey = e.target.value;
                  })
                }
                placeholder="ssh-ed25519 AAAA... comment"
                spellCheck={false}
                aria-describedby="key-help"
              />
            </label>
            <FieldNote>
              <span id="key-help">
                公開鍵だけを1行で入力します。
                <strong>
                  -----BEGIN OPENSSH PRIVATE KEY-----
                  は秘密鍵なので入力禁止です。
                </strong>
              </span>
            </FieldNote>
            <label className="text-field compact" htmlFor="ssh.port">
              <span>SSHポート</span>
              <input
                id="ssh.port"
                type="number"
                min="1"
                max="65535"
                value={input.ssh.port}
                onChange={(e) =>
                  update((d) => {
                    d.ssh.port = Number(e.target.value);
                  })
                }
              />
            </label>
            <fieldset>
              <legend>認証の安全化</legend>
              <Choice
                name="password-auth"
                label="パスワード認証を無効化（推奨）"
                detail="公開鍵の検証後に適用します。"
                checked={input.ssh.disablePasswordAuthentication}
                onChange={() =>
                  update((d) => {
                    d.ssh.disablePasswordAuthentication = true;
                  })
                }
              />
              <Choice
                name="password-auth"
                label="パスワード認証を残す"
                detail="総当たり攻撃への対策が別途必要です。"
                checked={!input.ssh.disablePasswordAuthentication}
                onChange={() =>
                  update((d) => {
                    d.ssh.disablePasswordAuthentication = false;
                  })
                }
              />
            </fieldset>
            <div className="warning-card">
              <span>⚠</span>
              <div>
                <strong>反映順序を固定します</strong>
                <p>
                  UFW許可 → 設定配置 → sshd -t → 再読み込み →
                  別セッション確認の順で生成します。
                </p>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="panel">
            <p className="eyebrow">STEP 04 — FIREWALL</p>
            <h1>UFWファイアウォール</h1>
            <p className="lead">
              SSHの到達性を確保してから、未許可の着信を拒否します。
            </p>
            <div className="port-map">
              <span>SSH設定</span>
              <strong>TCP {input.ssh.port}</strong>
              <span className="arrow">→</span>
              <span>UFW許可</span>
              <strong>TCP {input.ssh.port} / ALLOW</strong>
            </div>
            <div className="success-card">
              ✓ SSHポート {input.ssh.port}/tcp
              の許可をUFW有効化より前に自動で含めます。
            </div>
            <fieldset>
              <legend>UFW</legend>
              <Choice
                name="ufw"
                label="有効化する（推奨）"
                detail="着信は既定で拒否、送信は許可します。"
                checked={input.ufw.enabled}
                onChange={() =>
                  update((d) => {
                    d.ufw.enabled = true;
                    d.ufw.allowSshPort = true;
                  })
                }
              />
              <Choice
                name="ufw"
                label="有効化しない"
                detail="ホストファイアウォールによる保護は追加されません。"
                checked={!input.ufw.enabled}
                onChange={() =>
                  update((d) => {
                    d.ufw.enabled = false;
                    d.ufw.allowSshPort = input.ssh.port === 22;
                  })
                }
              />
            </fieldset>
          </section>
        )}

        {step === 4 && (
          <section className="panel">
            <p className="eyebrow">STEP 05 — UPDATES</p>
            <h1>自動セキュリティ更新</h1>
            <p className="lead">
              Ubuntuのセキュリティ更新を毎日自動で適用します。
            </p>
            <fieldset>
              <legend>unattended-upgrades</legend>
              <Choice
                name="updates"
                label="有効化する（推奨）"
                detail="既知の脆弱性にさらされる時間を短くします。自動再起動は有効にしません。"
                checked={input.updates.enabled}
                onChange={() =>
                  update((d) => {
                    d.updates.enabled = true;
                  })
                }
              />
              <Choice
                name="updates"
                label="無効化する"
                detail="確実な手動更新の運用が別途必要です。"
                checked={!input.updates.enabled}
                onChange={() =>
                  update((d) => {
                    d.updates.enabled = false;
                  })
                }
              />
            </fieldset>
            <div className="info-grid">
              <article>
                <strong>影響</strong>
                <p>更新中はaptが一時的に使用中になる場合があります。</p>
              </article>
              <article>
                <strong>制約</strong>
                <p>大規模運用の更新管理や保守時間の制御はMVP対象外です。</p>
              </article>
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="panel">
            <p className="eyebrow">STEP 06 — FINAL REVIEW</p>
            <h1>生成前の最終確認</h1>
            <p className="lead">
              設定内容と安全上の前提を確認してください。各項目は「修正」から戻れます。
            </p>
            <div className="critical-banner">
              <span>⚠</span>
              <div>
                <strong>アクセス不能になる可能性があります</strong>
                <p>
                  SSH設定の変更中は現在の接続を維持し、別セッションでログインとsudoを確認するまで閉じないでください。
                </p>
              </div>
            </div>
            <div className="review-list">
              <article>
                <div>
                  <span>管理ユーザー</span>
                  <strong>{input.admin.username}</strong>
                </div>
                <button type="button" onClick={() => move(1)}>
                  修正
                </button>
              </article>
              <article>
                <div>
                  <span>SSH</span>
                  <strong>
                    公開鍵認証 / TCP {input.ssh.port} / パスワード認証
                    {input.ssh.disablePasswordAuthentication ? "無効" : "有効"}
                  </strong>
                </div>
                <button type="button" onClick={() => move(2)}>
                  修正
                </button>
              </article>
              <article>
                <div>
                  <span>UFW</span>
                  <strong>
                    {input.ufw.enabled
                      ? `有効 / ${input.ssh.port} tcp許可`
                      : "無効"}
                  </strong>
                </div>
                <button type="button" onClick={() => move(3)}>
                  修正
                </button>
              </article>
              <article>
                <div>
                  <span>自動更新</span>
                  <strong>{input.updates.enabled ? "毎日有効" : "無効"}</strong>
                </div>
                <button type="button" onClick={() => move(4)}>
                  修正
                </button>
              </article>
            </div>
            <button
              className="primary generate"
              type="button"
              onClick={createGuide}
            >
              安全性を再検証して手順を生成 <span>→</span>
            </button>
          </section>
        )}

        {step === 6 && guide && (
          <section className="results">
            <div className="result-hero">
              <p className="eyebrow">GUIDE READY</p>
              <h1>手順書を生成しました</h1>
              <p>
                全{guide.steps.length}
                手順。コマンドは自動実行されません。期待結果を確認しながら1つずつ進めてください。
              </p>
            </div>
            <div className="download-bar">
              <button
                type="button"
                onClick={() =>
                  downloadText(
                    renderMarkdown(guide),
                    "ubuntu-24.04-setup-guide.md",
                    "text/markdown;charset=utf-8",
                  )
                }
              >
                ↓ Markdown
              </button>
              <button
                type="button"
                onClick={async () =>
                  downloadBlob(
                    await buildZip(guide, input),
                    "ubuntu-24.04-setup-guide.zip",
                  )
                }
              >
                ↓ ZIP一式
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadText(
                    renderConfigJson(input),
                    "linux-setup-helper-config.json",
                    "application/json",
                  )
                }
              >
                ↓ 設定JSON
              </button>
            </div>
            <div className="result-warning">
              ⚠
              現在のSSH接続を維持し、別セッション確認が完了するまで閉じないでください。
            </div>
            <ol className="guide-steps">
              {guide.steps.map((item, index) => (
                <li key={item.id} className="guide-card">
                  <header>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h2>{item.title}</h2>
                      <p>{item.purpose}</p>
                    </div>
                  </header>
                  {item.danger && <div className="danger">⚠ {item.danger}</div>}
                  <dl>
                    <div>
                      <dt>影響</dt>
                      <dd>{item.impact}</dd>
                    </div>
                    <div>
                      <dt>変更前の確認・バックアップ</dt>
                      <dd>
                        <ul>
                          {item.backup.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  </dl>
                  {item.commands.length > 0 && (
                    <div className="code-group">
                      <h3>実行・配置</h3>
                      {item.commands.map((command) => (
                        <div className="code-block" key={command}>
                          <code>{command}</code>
                          <button
                            type="button"
                            aria-label="コマンドをコピー"
                            onClick={() => copy(command)}
                          >
                            コピー
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {item.files.map((file) => (
                    <div className="file-card" key={file.path}>
                      <h3>設定全文</h3>
                      <p>
                        <code>{file.path}</code> 所有者{" "}
                        <code>{file.owner}</code> 権限 <code>{file.mode}</code>
                      </p>
                      <div className="code-block">
                        <pre>{file.content}</pre>
                        <button
                          type="button"
                          aria-label={`${file.path}をコピー`}
                          onClick={() => copy(file.content)}
                        >
                          コピー
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="verify">
                    <h3>✓ 成功確認</h3>
                    {item.verify.map((command) => (
                      <div className="code-block" key={command}>
                        <code>{command}</code>
                        <button type="button" onClick={() => copy(command)}>
                          コピー
                        </button>
                      </div>
                    ))}
                    <p>
                      <strong>期待結果:</strong> {item.expected}
                    </p>
                  </div>
                  <details>
                    <summary>失敗時の復旧</summary>
                    <ul>
                      {item.rollback.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </details>
                  <details>
                    <summary>公式根拠</summary>
                    <ul>
                      {evidenceForStep(item).map((ref) => (
                        <li key={ref.url}>
                          <a href={ref.url} target="_blank" rel="noreferrer">
                            {ref.title}
                          </a>
                          <br />
                          <small>
                            {ref.target} / 最終確認 {ref.checked}
                          </small>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ol>
          </section>
        )}

        {step < 5 && (
          <div className="actions">
            <button
              className="secondary"
              type="button"
              disabled={step === 0}
              onClick={() => move((step - 1) as Step)}
            >
              ← 戻る
            </button>
            <button className="primary" type="button" onClick={next}>
              次へ進む <span>→</span>
            </button>
          </div>
        )}
      </main>

      <footer>
        <div>
          <strong>設定の持ち運び</strong>
          <p>自動保存はしません。明示的にJSONを保存・読込できます。</p>
        </div>
        <div className="footer-actions">
          <button
            type="button"
            onClick={() =>
              downloadText(
                renderConfigJson(input),
                "linux-setup-helper-config.json",
                "application/json",
              )
            }
          >
            設定JSONを保存
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            設定JSONを読込
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void importJson(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </footer>
    </div>
  );
}
