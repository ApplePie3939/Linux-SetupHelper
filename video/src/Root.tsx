import { Composition } from "remotion";
import { LinuxSetupVideo } from "./LinuxSetupVideo";

export const RemotionRoot: React.FC = () => <Composition id="LinuxSetupHelperDigest" component={LinuxSetupVideo} durationInFrames={2700} fps={30} width={1920} height={1080} />;
