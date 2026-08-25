# Linux Setup Helper 動画

Linux Setup Helperを紹介する、90秒・字幕のみの16:9 Remotion動画です。外部の画像、音声、フォントは使っていません。

```powershell
npm install
npm run dev
```

Studioでは `LinuxSetupHelperDigest` を開きます。MP4を書き出すには次を実行します。

```powershell
npx remotion render LinuxSetupHelperDigest out/linux-setup-helper-digest.mp4
```

動画は1920x1080、30fps、90秒です。シーン構成と字幕は `src/LinuxSetupVideo.tsx` にあります。
