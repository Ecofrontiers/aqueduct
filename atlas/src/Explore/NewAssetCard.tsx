import clsx from "clsx";
import {
  ArrowUpRight,
  Check,
  Dot,
  Export,
  MapPin,
  Question,
  TreeStructure,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { ChainTag } from "../modules/chains/components/ChainTag";
import { TextShareModal } from "../shared/components/TextShareModal";
import { ExpandableText } from "../shared/components/ExpandableText";
import { Link } from "react-router-dom";
import { SUPPORTED_TOKENS } from "../modules/uniswap";
import { COUNTRY_CODE_TO_NAME } from "../shared/countryCodes";
import { Asset, RelatedAsset } from "../modules/assets";
import { getProvenancesForAsset } from "../modules/filecoin/ProvenanceService";

interface AssetCardProps {
  className?: string;
  asset: Asset;
  showExternalLink?: boolean;
  onPinClicked: () => void;
  bioregion?: { name: string; code: string; color: string; realm_name: string } | null;
  siblingCount?: number;
  onBioregionClick?: () => void;
}

export default ({
  className,
  asset,
  showExternalLink = false,
  onPinClicked,
  bioregion,
  siblingCount,
  onBioregionClick,
}: AssetCardProps): React.ReactElement => {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState<string | null>(null);
  const [dropdownPage, setDropdownPage] = useState({ child: 0, parent: 0 });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const shareUrl = `${window.location.origin}/assets/${asset.id}`;
  const ITEMS_PER_PAGE = 3;

  // Read directly on every render — cheap sync Map lookup, no memo needed.
  // This ensures the badge appears immediately after CID stamping.
  const provenancesForAsset = getProvenancesForAsset(asset.id);
  const hasFilecoinProvenance = provenancesForAsset.some(
    (p) => p.pieceCid && !p.pieceCid.startsWith("local:")
  );

  const handleShareClick = async () => {
    setShowShareOptions(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownVisible(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const celoContractAddress: string =
    asset?.tokens[0]?.platforms?.find((plat) =>
      SUPPORTED_TOKENS.includes(plat.contract_address)
    )?.contract_address || "";

  const renderDropdown = (items: RelatedAsset[], type: "child" | "parent") => {
    const page = dropdownPage[type];
    const start = 1 + page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedItems = items.slice(start, end);
    const hasMore = end < items.length;

    return (
      <div
        ref={dropdownRef}
        className="absolute z-50 top-9 right-0 md:right-auto md:left-0 w-64 bg-white border border-gray-300 rounded-xl shadow-xl overflow-y-auto max-h-60"
      >
        <div className="flex flex-col divide-y divide-gray-100">
          {paginatedItems.map((item) => (
            <Link key={item.id} to={`/assets/${item.id}`}>
              <div className="px-4 py-2 truncate hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors duration-150 text-sm font-medium max-w-full">
                {item.name}
              </div>
            </Link>
          ))}
          {hasMore && (
            <div
              className="px-4 py-2 text-blue-500 text-sm font-medium cursor-pointer hover:underline"
              onClick={() =>
                setDropdownPage((prev) => ({
                  ...prev,
                  [type]: prev[type] + 1,
                }))
              }
            >
              + more available
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className={clsx(
          "asset-card border-2 border-white p-3 rounded-[20px] bg-cardBackground",
          className
        )}
      >
        {bioregion && (
          <button
            onClick={onBioregionClick}
            className="w-full flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 group"
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: bioregion.color }}
            />
            <span className="text-xs text-gray-500 group-hover:text-gray-700">
              {bioregion.name}
            </span>
            {typeof siblingCount === "number" && siblingCount > 0 && (
              <span className="text-xs text-gray-400">
                · {siblingCount} other asset{siblingCount !== 1 ? "s" : ""} nearby
              </span>
            )}
          </button>
        )}

        {asset.parent_assets.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <TreeStructure size={14} />
            Derived from {asset.parent_assets[0].name}
            {asset.parent_assets.length > 1 &&
              ` +${asset.parent_assets.length - 1}`}
          </div>
        )}

        <div className="flex justify-between">
          <div className="font-bold text-gray-600">
            {asset.asset_types[0]?.name}
            {asset.asset_types[1] ? `, ${asset.asset_types[1]?.name}` : ""}
          </div>
          <div className="flex gap-3 justify-between items-center">
            <div className="flex gap-3">
              {asset?.platforms?.map((platform) => (
                <ChainTag key={platform.id} platform={platform} />
              ))}
              <Export
                className="cursor-pointer"
                size={25}
                onClick={handleShareClick}
              />
            </div>
          </div>
        </div>
        <div
          className="h-40 bg-cover bg-center bg-no-repeat mt-3 mb-3 rounded-[20px]"
          style={{ backgroundImage: `url(${asset.main_image})` }}
        ></div>
        <h3 className="text-xl xl:text-2xl font-bold">{asset.name}</h3>
        <div className="flex items-center pt-1 pb-2 text-sm">
          <div
            className="flex items-center cursor-pointer"
            onClick={onPinClicked}
          >
            <MapPin size={16} />
            {asset.region ? `${asset.region}, ` : ""}
            {COUNTRY_CODE_TO_NAME[asset.country_code]}
          </div>
          <Dot size={16} />
          <div>
            Issued by <span className="font-bold">{asset.issuer.name}</span>
          </div>
        </div>

        {(asset.prefinancing || asset.pretoken || asset.yield_bearing) && (
          <div className="flex justify-between items-center mb-2 text-sm">
            <div className="flex gap-2">
              {asset.prefinancing && (
                <div className="flex gap-2 rounded-full p-[2px] pr-2 border border-gray-300">
                  <div className="bg-green-400 rounded-full w-5 h-5 flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                  <div>Prefinancing</div>
                </div>
              )}
              {asset.pretoken && (
                <div className="flex gap-2 rounded-full p-[2px] pr-2 border border-gray-300">
                  <div className="bg-green-400 rounded-full w-5 h-5 flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                  <div>Pretoken</div>
                </div>
              )}
              {asset.yield_bearing && (
                <div className="flex gap-2 rounded-full p-[2px] pr-2 border border-gray-300">
                  <div className="bg-green-400 rounded-full w-5 h-5 flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                  <div>Yield-bearing</div>
                </div>
              )}
            </div>
          </div>
        )}

        {hasFilecoinProvenance && (
          <div className="flex items-center mb-2 text-sm">
            <div className="flex gap-2 rounded-full p-[2px] pr-2 border border-gray-300">
              <div className="bg-primary-300 rounded-full w-5 h-5 flex items-center justify-center">
                <Check size={16} className="text-white" />
              </div>
              <div>Verified on Filecoin</div>
            </div>
          </div>
        )}

        <div className="lg:hidden">
          <ExpandableText
            text={asset.description}
            maxChars={125}
            className="text-sm mb-3"
          />
        </div>
        <div className="hidden lg:block">
          <ExpandableText
            text={asset.description}
            maxChars={150}
            className="text-sm mb-3"
          />
        </div>

        <div className="xxs:text-[13px] text-sm">
          <div className="flex justify-between items-center py-1 min-h-9">
            <p className="font-bold mr-4">Subtype</p>
            <div className="xxs:text-xs text-sm font-bold text-right flex items-center">
              {asset.asset_subtypes[0]?.name.replace(/ /g, "\u00A0")}
              {asset.asset_subtypes[1]
                ? `, ${asset.asset_subtypes[1]?.name.replace(/ /g, "\u00A0")}`
                : ""}
              {asset.asset_subtypes[2]
                ? `, ${asset.asset_subtypes[2]?.name.replace(/ /g, "\u00A0")}`
                : ""}
            </div>
          </div>

          {asset.child_assets.length > 0 && (
            <div className="flex justify-between items-center py-1">
              <p className="font-bold">
                {asset.child_assets.length} Second Order Asset
                {asset.child_assets.length > 1 ? "s" : ""}
              </p>
              <div className="flex gap-2">
                <Link to={`/assets/${asset.child_assets[0].id}`}>
                  <div className="bg-grayTag h-7 flex justify-center items-center rounded-full px-4 xxs:text-xs text-sm font-bold">
                    {asset.child_assets[0].name.length > 20
                      ? `${asset.child_assets[0].name.substring(0, 17)}...`
                      : asset.child_assets[0].name}
                  </div>
                </Link>
                {asset.child_assets.length > 1 && (
                  <div
                    className="relative"
                    onMouseEnter={() => {
                      if (timeoutRef.current) clearTimeout(timeoutRef.current);
                      setDropdownVisible("child");
                    }}
                    onMouseLeave={() => {
                      timeoutRef.current = setTimeout(() => {
                        setDropdownVisible(null);
                        setDropdownPage((prev) => ({ ...prev, child: 0 }));
                      }, 500);
                    }}
                  >
                    <div className="bg-grayTag h-7 flex justify-center items-center rounded-full px-4 xxs:text-xs text-sm font-bold cursor-pointer">
                      +{asset.child_assets.length - 1}
                    </div>
                    {dropdownVisible === "child" &&
                      renderDropdown(asset.child_assets, "child")}
                  </div>
                )}
              </div>
            </div>
          )}

          {asset.parent_assets.length > 0 && (
            <div className="flex justify-between items-center py-1">
              <p className="font-bold">
                {asset.parent_assets.length} Primary Asset
                {asset.parent_assets.length > 1 ? "s" : ""}
              </p>
              <div className="flex gap-2">
                <Link to={`/assets/${asset.parent_assets[0].id}`}>
                  <div className="bg-grayTag h-7 flex justify-center items-center rounded-full px-4 xxs:text-xs text-sm font-bold">
                    {asset.parent_assets[0].name.length > 20
                      ? `${asset.parent_assets[0].name.substring(0, 17)}...`
                      : asset.parent_assets[0].name}
                  </div>
                </Link>
                {asset.parent_assets.length > 1 && (
                  <div
                    className="relative"
                    onMouseEnter={() => {
                      if (timeoutRef.current) clearTimeout(timeoutRef.current);
                      setDropdownVisible("parent");
                    }}
                    onMouseLeave={() => {
                      timeoutRef.current = setTimeout(() => {
                        setDropdownVisible(null);
                        setDropdownPage((prev) => ({ ...prev, parent: 0 }));
                      }, 1000);
                    }}
                  >
                    <div className="bg-grayTag h-7 flex justify-center items-center rounded-full px-4 xxs:text-xs text-sm font-bold cursor-pointer">
                      +{asset.parent_assets.length - 1}
                    </div>
                    {dropdownVisible === "parent" &&
                      renderDropdown(asset.parent_assets, "parent")}
                  </div>
                )}
              </div>
            </div>
          )}

          {asset.certifications.length > 0 && (
            <div className="bg-grayButton rounded-lg p-3 flex justify-between mt-2">
              <div>
                <p className="font-bold">Ratings</p>
                <p>
                  {asset.certifications.length} rating
                  {asset.certifications.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-4">
                {asset.certifications.map((certification) => (
                  <div key={certification.id} className="grid">
                    {certification.certifier.short_name ? (
                      <div
                        className="font-bold tooltip cursor-pointer"
                        data-tip={certification.certifier.name}
                      >
                        <div className="flex">
                          {certification.certifier.short_name}
                          <Question size={16} />
                        </div>
                      </div>
                    ) : (
                      <p className="font-bold">
                        {certification.certifier.name}
                      </p>
                    )}
                    {certification.certification_source ? (
                      <a
                        href={certification.certification_source}
                        className="hover:underline hover:text-primary-300"
                        target="_blank"
                      >
                        {certification.description_short ? (
                          certification.description ? (
                            <div
                              className="tooltip"
                              data-tip={certification.description}
                            >
                              {certification.description_short}
                            </div>
                          ) : (
                            <p>{certification.description_short}</p>
                          )
                        ) : (
                          <p>{certification.value}</p>
                        )}
                      </a>
                    ) : certification.description_short ? (
                      certification.description ? (
                        <div
                          className="tooltip"
                          data-tip={certification.description}
                        >
                          {certification.description_short}
                        </div>
                      ) : (
                        <p>{certification.description}</p>
                      )
                    ) : (
                      <p>{certification.value}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className={clsx("flex gap-3 mt-3 justify-between xxs:text-[13px]")}
        >
          {showExternalLink && (asset.issuer_link || asset.exchange_link) && (
            <a
              href={asset.issuer_link || asset.exchange_link}
              target="_blank"
              className="button !bg-grayButton !text-blue-950 max-w-[190px] flex-1 flex justify-center items-center"
            >
              <span className="mr-1">Learn more</span>
              <ArrowUpRight size={16} />
            </a>
          )}
          {!showExternalLink && (
            <Link
              className="flex items-center justify-center w-full flex-1 button button-gradient text-center"
              to={`/assets/${asset.id}`}
            >
              Details
            </Link>
          )}
          {showExternalLink &&
            !celoContractAddress &&
            !asset.metadata?.celo_retire_wallet_address &&
            (asset.issuer_link || asset.exchange_link) && (
              <a
                className="flex items-center justify-center max-w-[190px] flex-1 button button-gradient text-center justify-self-end"
                href={asset.exchange_link || asset.issuer_link}
                target="_blank"
              >
                Buy
              </a>
            )}
        </div>
      </div>
      {showShareOptions && (
        <TextShareModal
          text={shareUrl}
          onClose={() => setShowShareOptions(false)}
        />
      )}
    </>
  );
};
