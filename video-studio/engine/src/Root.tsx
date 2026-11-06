import React from "react";
import { AbsoluteFill, Composition } from "remotion";
import { INK } from "./brand/theme";
import { BrandSamples } from "./brand-samples/BrandSamples";

const Empty: React.FC = () => <AbsoluteFill style={{ backgroundColor: INK }} />;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Empty" component={Empty} durationInFrames={60} fps={30} width={1080} height={1920} />
      <Composition id="BrandSamples" component={BrandSamples} durationInFrames={6} fps={30} width={1080} height={1920} />
    </>
  );
};
