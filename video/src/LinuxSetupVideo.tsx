import type {Caption} from "@remotion/captions";
import {AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame} from "remotion";
import "./linux-setup.css";

const fps = 30;
const durations = [8, 12, 14, 14, 14, 14, 14] as const;
const starts = durations.map((_, index) => durations.slice(0, index).reduce((sum, duration) => sum + duration * fps, 0));

const captions: Caption[] = [
  {text: "Ubuntu Serverの初期設定を、安全な手順書に。", startMs: 800, endMs: 7200, timestampMs: null, confidence: null},
  {text: "サーバーへ接続も、自動実行もしません。", startMs: 900, endMs: 10800, timestampMs: null, confidence: null},
  {text: "7つの画面で、必要な設定だけを選びます。", startMs: 900, endMs: 12800, timestampMs: null, confidence: null},
  {text: "SSHロックアウトにつながる組み合わせは、生成を停止します。", startMs: 900, endMs: 12800, timestampMs: null, confidence: null},
  {text: "確認・バックアップ・復旧まで、手順ごとに示します。", startMs: 900, endMs: 12800, timestampMs: null, confidence: null},
  {text: "Markdown、設定ファイル、ZIPを端末内で出力できます。", startMs: 900, endMs: 12800, timestampMs: null, confidence: null},
  {text: "理解して、1つずつ。安全なサーバー運用へ。", startMs: 900, endMs: 12800, timestampMs: null, confidence: null},
];

const reveal = (frame: number, delay = 0) => ({
  opacity: interpolate(frame, [delay, delay + 14], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)}),
  translate: `${interpolate(frame, [delay, delay + 16], [26, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)})}px 0px`,
});

const Frame: React.FC<{children: React.ReactNode; scene: number}> = ({children, scene}) => {
  const frame = useCurrentFrame();
  const caption = captions[scene];
  const visible = frame * 1000 / fps >= caption.startMs && frame * 1000 / fps < caption.endMs;
  const total = durations.reduce((a, b) => a + b, 0) * fps;
  return <AbsoluteFill className="ls-stage"><div className="ls-glow" /><div className="ls-brand">LINUX <span>SETUP HELPER</span></div><div className="ls-count">0{scene + 1} / 07</div>{children}<div className="ls-caption" style={{opacity: visible ? 1 : 0}}>{caption.text}</div><div className="ls-progress"><i style={{width: `${((starts[scene] + frame) / (total - 1)) * 100}%`}} /></div></AbsoluteFill>;
};

const Hero: React.FC = () => { const frame = useCurrentFrame(); return <Frame scene={0}><div className="ls-hero" style={reveal(frame, 4)}><p>UBUNTU SERVER 24.04 LTS</p><h1>はじめての<br /><em>安全な</em>サーバー設定。</h1><div className="ls-terminal"><span>$</span> setup — safe, step by step <b>_</b></div></div><div className="ls-shield" style={reveal(frame, 18)}>✓<small>SAFE</small></div></Frame>; };

const Promise: React.FC = () => { const frame = useCurrentFrame(); return <Frame scene={1}><section className="ls-title" style={reveal(frame, 0)}><p>DESIGNED FOR BEGINNERS</p><h2>こわくない。<br /><em>でも、あいまいにしない。</em></h2></section><div className="ls-promises"><article style={reveal(frame, 10)}><b>接続しない</b><span>サーバーに触れない</span></article><article style={reveal(frame, 20)}><b>実行しない</b><span>一括スクリプトは作らない</span></article><article style={reveal(frame, 30)}><b>送信しない</b><span>入力は端末の外へ出ない</span></article></div></Frame>; };

const Wizard: React.FC = () => { const frame = useCurrentFrame(); const steps = ["前提確認", "管理ユーザー", "SSH", "UFW", "自動更新", "最終確認", "生成"]; return <Frame scene={2}><section className="ls-title" style={reveal(frame, 0)}><p>GUIDED WIZARD</p><h2>迷わず、<br /><em>順番どおりに。</em></h2></section><div className="ls-wizard">{steps.map((step, index) => <div key={step} style={reveal(frame, 8 + index * 5)}><i>{String(index + 1).padStart(2, "0")}</i><b>{step}</b></div>)}</div></Frame>; };

const Safety: React.FC = () => { const frame = useCurrentFrame(); return <Frame scene={3}><section className="ls-title" style={reveal(frame, 0)}><p>SAFETY FIRST</p><h2>危ない設定は、<br /><em>通さない。</em></h2></section><div className="ls-rule-card" style={reveal(frame, 13)}><strong>SSHの安全ルール</strong><p>公開鍵が有効でなければ、パスワード認証を無効化できません。</p><hr /><p>新しいSSHポートは、UFW許可と同じ計画に含めます。</p><hr /><p><b>sshd -t</b> で検証してから、再読み込みします。</p></div></Frame>; };

const ManualGuide: React.FC = () => { const frame = useCurrentFrame(); return <Frame scene={4}><section className="ls-title" style={reveal(frame, 0)}><p>NOT A SCRIPT</p><h2>実行する前に、<br /><em>理解できる。</em></h2></section><div className="ls-guide-card" style={reveal(frame, 14)}><header><i>03</i><div><b>SSHを安全化する</b><span>目的と影響を確認</span></div></header><div className="ls-code">sudo sshd -t <mark>✓</mark></div><footer><span>✓ 成功確認</span><span>↶ 失敗時の復旧</span><span>⌘ コピー</span></footer></div></Frame>; };

const Downloads: React.FC = () => { const frame = useCurrentFrame(); return <Frame scene={5}><section className="ls-title" style={reveal(frame, 0)}><p>YOUR OUTPUTS</p><h2>必要な形で、<br /><em>持ち帰れる。</em></h2></section><div className="ls-downloads"><article style={reveal(frame, 12)}><i>↓</i><b>Markdown</b><span>手順書</span></article><article style={reveal(frame, 22)}><i>↓</i><b>ZIP一式</b><span>設定ファイル</span></article><article style={reveal(frame, 32)}><i>↓</i><b>設定JSON</b><span>明示保存のみ</span></article></div></Frame>; };

const Closing: React.FC = () => { const frame = useCurrentFrame(); return <Frame scene={6}><div className="ls-closing" style={reveal(frame, 2)}><p>LINUX SETUP HELPER</p><h1>安全性を確認して、<br /><em>一歩ずつ進めよう。</em></h1><div>Ubuntu Server 24.04 LTS 専用</div></div><div className="ls-checklist" style={reveal(frame, 20)}><span>✓ 管理ユーザー</span><span>✓ SSH</span><span>✓ UFW</span><span>✓ 自動更新</span></div></Frame>; };

const scenes = [Hero, Promise, Wizard, Safety, ManualGuide, Downloads, Closing];
export const LinuxSetupVideo: React.FC = () => <AbsoluteFill>{scenes.map((Scene, index) => <Sequence key={starts[index]} from={starts[index]} durationInFrames={durations[index] * fps}><Scene /></Sequence>)}</AbsoluteFill>;
