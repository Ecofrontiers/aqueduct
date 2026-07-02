import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MapBox } from "../shared/components/MapBox";
import { useMapState } from "../context/map";
import Footer from "../Footer";
import Header from "../Header";
import {
  CELO_TOKENS_MAP,
  TOKEN_POOL_TOKEN_MAP,
  UniswapTrading,
} from "../modules/uniswap";
import { useSupabaseItemById } from "../shared/hooks/useSupabaseItemById";
import { useSupabaseItemsByIds } from "../shared/hooks/useSupabaseItemsByIds";
import { Asset } from "../modules/assets";
import { AssetBioregionCard } from "../Explore/AssetBioregionCard";
import React, { useMemo, useState } from "react";
import { AssetRetirement } from "./AssetRetirement";
import { ClusteredAssetLayer } from "../shared/components/ClusteredAssetLayer";
import { getProvenancesForAsset } from "../modules/filecoin/ProvenanceService";
import type { VerifiableProvenance } from "../modules/intelligence/types";
import type { Address } from "viem";

function formatUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// Synapse CDN retrieval: https://{client}.calibration.filbeam.io/{pieceCid}
const FILBEAM_CLIENT = "0xC4d9d1a93068d311Ab18E988244123430eB4F1CD";
function cidUrl(pieceCid: string): string {
  return `https://${FILBEAM_CLIENT}.calibration.filbeam.io/${pieceCid}`;
}

function ProvenanceSection({
  provenances,
  open,
  onToggle,
}: {
  provenances: VerifiableProvenance[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mt-4 border-2 border-white rounded-[20px] bg-cardBackground p-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="text-lg font-bold">Impact Provenance</h3>
        <span className="text-gray-500 text-sm">
          {open ? "Hide" : "Show"} ({provenances.length})
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          <p className="text-xs text-gray-500">
            Independently verified ecosystem service data, valued using scientific
            methodologies and archived onchain for transparency.
          </p>
          {provenances.map((p, i) => {
            const m = p.impact.metrics;
            return (
              <div
                key={p.pieceCid ?? i}
                className="bg-grayButton rounded-lg p-4 text-sm space-y-3"
              >
                {/* Header: source + crediting pathway */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold capitalize text-base">
                      {p.source.protocol}
                    </span>
                    {p.impact.creditingPathway && (
                      <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                        {p.impact.creditingPathway}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    Attested {new Date(p.attestedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Project origin */}
                <div className="text-gray-600 text-xs space-y-0.5">
                  {p.origin.project && (
                    <div>
                      <span className="font-medium text-gray-700">Project:</span>{" "}
                      {p.origin.project}
                    </div>
                  )}
                  {p.origin.developer && (
                    <div>
                      <span className="font-medium text-gray-700">Developer:</span>{" "}
                      {p.origin.developer}
                    </div>
                  )}
                  {p.origin.methodology && (
                    <div>
                      <span className="font-medium text-gray-700">Methodology:</span>{" "}
                      {p.origin.methodology}
                    </div>
                  )}
                  {(p.origin.startDate || p.origin.endDate) && (
                    <div>
                      <span className="font-medium text-gray-700">Period:</span>{" "}
                      {p.origin.startDate ?? "—"} to {p.origin.endDate ?? "present"}
                    </div>
                  )}
                  {p.origin.location?.jurisdiction && (
                    <div>
                      <span className="font-medium text-gray-700">Jurisdiction:</span>{" "}
                      {p.origin.location.jurisdiction}
                    </div>
                  )}
                </div>

                {/* Impact metrics — detailed */}
                <div className="border-t border-gray-200 pt-2">
                  <div className="font-medium text-gray-700 text-xs mb-1">
                    Ecosystem Impact
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {m.climate && (
                      <>
                        <div>
                          <span className="text-gray-500">Carbon:</span>{" "}
                          <span className="font-semibold">
                            {m.climate.tCO2e.toLocaleString()} tCO2e
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Standard:</span>{" "}
                          {m.climate.standard || "—"}
                        </div>
                        {m.climate.vintage && (
                          <div>
                            <span className="text-gray-500">Vintage:</span>{" "}
                            {m.climate.vintage}
                          </div>
                        )}
                        {m.climate.methodology && (
                          <div>
                            <span className="text-gray-500">Method:</span>{" "}
                            {m.climate.methodology}
                          </div>
                        )}
                      </>
                    )}
                    {m.biodiversity && (
                      <>
                        <div>
                          <span className="text-gray-500">Biodiversity:</span>{" "}
                          <span className="font-semibold">
                            {m.biodiversity.hectares.toLocaleString()} ha
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Biome:</span>{" "}
                          {m.biodiversity.biome}
                        </div>
                        {m.biodiversity.creditType && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Credit type:</span>{" "}
                            {m.biodiversity.creditType}
                          </div>
                        )}
                      </>
                    )}
                    {m.energy && (
                      <>
                        <div>
                          <span className="text-gray-500">Energy:</span>{" "}
                          <span className="font-semibold">
                            {m.energy.mwhGenerated.toLocaleString()} MWh
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Source:</span>{" "}
                          {m.energy.sourceType}
                        </div>
                        {m.energy.farmCount > 0 && (
                          <div>
                            <span className="text-gray-500">Farms:</span>{" "}
                            {m.energy.farmCount}
                          </div>
                        )}
                      </>
                    )}
                    {m.marine && (
                      <>
                        <div>
                          <span className="text-gray-500">Marine:</span>{" "}
                          <span className="font-semibold">
                            {m.marine.hectares.toLocaleString()} ha
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Type:</span>{" "}
                          {m.marine.stewardshipType}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Valuation */}
                <div className="border-t border-gray-200 pt-2">
                  <div className="font-medium text-gray-700 text-xs mb-1">
                    Scientific Valuation
                    <span className="font-normal text-gray-400 ml-1">
                      ({p.valuation.methodology})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className="text-gray-500">Total value:</span>{" "}
                      <span className="font-semibold">
                        {formatUSD(p.valuation.totalValue.low)} &ndash;{" "}
                        {formatUSD(p.valuation.totalValue.high)}
                      </span>
                    </div>
                    {p.valuation.valuePerUnit && (
                      <div>
                        <span className="text-gray-500">Per unit:</span>{" "}
                        ${p.valuation.valuePerUnit.low.toFixed(2)} &ndash; $
                        {p.valuation.valuePerUnit.high.toFixed(2)}{" "}
                        / {p.valuation.valuePerUnit.unit}
                      </div>
                    )}
                  </div>
                  {p.valuation.gapFactor && (
                    <div className="mt-1 text-xs">
                      <span className="text-gray-500">Market gap:</span>{" "}
                      <span className="text-primary-300 font-semibold">
                        {p.valuation.gapFactor.low.toFixed(1)}x &ndash;{" "}
                        {p.valuation.gapFactor.high.toFixed(1)}x
                      </span>
                      <span className="text-gray-400 ml-1">
                        (scientific value vs. market price)
                      </span>
                    </div>
                  )}
                  {p.valuation.tokenMarketContext && (
                    <div className="mt-1 text-xs text-gray-500">
                      Token price: ${p.valuation.tokenMarketContext.price.toFixed(4)}{" "}
                      (MCap {formatUSD(p.valuation.tokenMarketContext.marketCap)})
                      <span className="ml-1 text-gray-400">
                        via {p.valuation.tokenMarketContext.source}
                      </span>
                    </div>
                  )}
                </div>

                {/* MRV status */}
                {p.mrv && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">MRV:</span>
                    <span className="capitalize">{p.mrv.status}</span>
                    {p.mrv.provider && <span>({p.mrv.provider})</span>}
                  </div>
                )}

                {/* Filecoin CID */}
                {p.pieceCid && !p.pieceCid.startsWith("local:") && (
                  <div className="border-t border-gray-200 pt-2">
                    <div className="text-xs text-gray-500 mb-0.5">
                      Archived on Filecoin (Calibration Testnet)
                    </div>
                    <a
                      href={cidUrl(p.pieceCid)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-300 hover:underline text-xs break-all"
                    >
                      {p.pieceCid}
                    </a>
                  </div>
                )}
                {p.pieceCid && p.pieceCid.startsWith("local:") && (
                  <div className="text-xs text-gray-400">
                    Pending upload (local hash: {p.pieceCid.slice(6, 46)}...)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default (): React.ReactElement => {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { mapStyle } = useMapState();

  const { item: asset } = useSupabaseItemById<Asset>(
    "assets_published_view",
    assetId
  );

  const parentAssetIds = useMemo(() => {
    if (!asset?.second_order || !asset.parent_assets) {
      return [];
    }
    return asset.parent_assets.map((p) => p.id);
  }, [asset?.second_order, asset?.parent_assets]);

  const { items: fullParentAssets } = useSupabaseItemsByIds<Asset>(
    "assets_published_view",
    parentAssetIds
  );

  const celoContractAddress: Address | undefined = asset?.tokens[0]?.platforms
    ?.find((platform) => platform.id === "celo")
    ?.contract_address.toLowerCase() as Address;

  const tokenIn = celoContractAddress
    ? TOKEN_POOL_TOKEN_MAP[celoContractAddress]
    : "";
  const tokenOut = celoContractAddress
    ? CELO_TOKENS_MAP[celoContractAddress]
    : "";

  const celoRetireWalletAddress: Address = asset?.metadata
    ?.celo_retire_wallet_address as Address;

  const provenances = useMemo(
    () => (assetId ? getProvenancesForAsset(assetId) : []),
    [assetId]
  );
  const [provenanceOpen, setProvenanceOpen] = useState(true);

  const handleAssetOpenClick = (id: string) => {
    navigate(`/assets/${id}`);
  };

  if (!asset) {
    return (
      <div className="w-svw h-svh flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const renderAssetLayer = () => {
    if (!asset.second_order) {
      return (
        <ClusteredAssetLayer
          assets={[asset]}
          onAssetClick={(clickedAssetId: string) =>
            handleAssetOpenClick(clickedAssetId)
          }
        />
      );
    } else if (fullParentAssets.length > 0) {
      return (
        <ClusteredAssetLayer
          assets={fullParentAssets}
          onAssetClick={(clickedAssetId: string) =>
            handleAssetOpenClick(clickedAssetId)
          }
        />
      );
    }
    return null;
  };

  return (
    <>
      <Helmet>
        <title>{asset.name}</title>
        <meta
          name="description"
          content={`${asset.description.substring(0, 160)}...`}
        />
      </Helmet>
      <Header />
      <div className="main-container">
        <div className="pt-[60px] md:pt-[80px]">
          <div className="grid lg:grid-cols-[440px_1fr] md:grid-cols-2 gap-4">
            <div>
              {asset.parent_assets.length > 0 && (
                <div className="bg-primary-400 text-white rounded-2xl h-8 w-[200px] font-bold flex justify-center items-center mb-4">
                  Second Order Asset
                </div>
              )}
              <AssetBioregionCard
                asset={asset}
                showExternalLinks={true}
                onAssetSelect={(id) => navigate(`/assets/${id}`)}
              />
              {celoContractAddress && tokenIn && tokenOut && (
                <div className="flex justify-center mt-4">
                  <div className="w-full">
                    <UniswapTrading tokenPair={[tokenIn, tokenOut]} />
                  </div>
                </div>
              )}
              {celoRetireWalletAddress && (
                <div className="mt-4">
                  <AssetRetirement retirementWallet={celoRetireWalletAddress} />
                </div>
              )}
              {provenances.length > 0 && (
                <ProvenanceSection
                  provenances={provenances}
                  open={provenanceOpen}
                  onToggle={() => setProvenanceOpen((o) => !o)}
                />
              )}
            </div>
            <div>
              <MapBox
                mapStyle={mapStyle}
                initialViewState={{
                  longitude: asset.second_order
                    ? 15
                    : asset.coordinates.longitude,
                  latitude: asset.second_order
                    ? 30
                    : asset.coordinates.latitude,
                  zoom: asset.second_order ? 1 : 5,
                }}
              >
                {renderAssetLayer()}
              </MapBox>
            </div>
          </div>
          <div className="hidden md:block">
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
};
