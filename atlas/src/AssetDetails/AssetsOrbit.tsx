import { ArrowLeft, ArrowsIn } from "@phosphor-icons/react";
import React from "react";
import { Asset, RelatedAsset } from "../modules/assets";

interface OrbitProps {
  primaryAsset: Asset;
  secondOrderAssets: Array<RelatedAsset>;
  onPrimaryAssetClick: (assetId: string) => void;
  onSecondOrderAssetClick: (asset: RelatedAsset) => void;
}

export const AssetsOrbit: React.FC<OrbitProps> = ({
  secondOrderAssets,
  primaryAsset,
  onPrimaryAssetClick,
  onSecondOrderAssetClick,
}) => {
  const radius = 100; // Distance from the center circle (adjust as needed)
  const centralCircleSize = 64;
  const orbitingCircleSize = 40;

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* Central Circle */}
      <div
        className="bg-primary-300 border-primary-500 border-2 flex justify-center items-center shadow-md text-white rounded-full"
        style={{
          width: `${centralCircleSize}px`,
          height: `${centralCircleSize}px`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onPrimaryAssetClick(primaryAsset.id);
        }}
      >
        <ArrowsIn size={40} />
      </div>

      {/* Orbiting Circles */}
      {secondOrderAssets.map((_, index) => {
        const angle = (index / secondOrderAssets.length) * 2 * Math.PI;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const rotation = (angle * 180) / Math.PI; // Rotate to point toward center

        return (
          <div
            key={index}
            className="absolute rounded-full bg-primary-100 border-primary-300 border-2 flex justify-center items-center shadow-md"
            style={{
              width: `${orbitingCircleSize}px`,
              height: `${orbitingCircleSize}px`,
              transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSecondOrderAssetClick(secondOrderAssets[index]);
            }}
          >
            <ArrowLeft size={24} weight="bold" />
          </div>
        );
      })}
    </div>
  );
};
