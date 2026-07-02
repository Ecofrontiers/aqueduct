import clsx from "clsx";
import { ArrowUpRight, Dot, Export, MapPin } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { ChainTag } from "../modules/chains/components/ChainTag";
import { TextShareModal } from "../shared/components/TextShareModal";
import { ExpandableText } from "../shared/components/ExpandableText";
import { Org } from "../shared/types";
import { COUNTRY_CODE_TO_NAME } from "../shared/countryCodes";
import { Link, useNavigate } from "react-router-dom";
import SocialLinks from "./SocialLinks";
import { useNewFiltersDispatch } from "../context/filters";

interface OrgCardProps {
  className?: string;
  org: Org;
  selectClicked: () => void;
}

export default ({
  className,
  org,
  selectClicked,
}: OrgCardProps): React.ReactElement => {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPage, setDropdownPage] = useState(0);
  const dispatchFilters = useNewFiltersDispatch();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 3;

  const shareUrl = `${window.location.origin}/orgs/${org.id}`;

  const handleShareClick = async () => {
    setShowShareOptions(true);
  };

  const handleIssuerClick = (issuer: { id: number; name: string }) => {
    dispatchFilters({
      type: "RESET_FILTERS",
    });
    dispatchFilters({
      type: "SET_PROVIDER_FILTER",
      payload: issuer.id,
    });
    navigate(`/`);
  };

  const renderDropdown = (assets: Array<{ id: string; name: string }>) => {
    const page = dropdownPage;
    const start = 1 + page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedItems = assets.slice(start, end);
    const hasMore = end < assets.length;

    return (
      <div
        ref={dropdownRef}
        className="absolute z-50 top-9 right-0 md:right-auto md:left-0 w-64 bg-white border border-gray-300 rounded-xl shadow-xl overflow-y-auto max-h-60"
      >
        <div className="flex flex-col divide-y divide-gray-100">
          {paginatedItems.map((item) => (
            <Link
              key={item.id}
              to={`/assets/${item.id}`}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="px-4 py-2 truncate hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors duration-150 text-sm font-medium max-w-full">
                {item.name}
              </div>
            </Link>
          ))}
          {hasMore && (
            <div
              className="px-4 py-2 text-blue-500 text-sm font-medium cursor-pointer hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                setDropdownPage((prev) => prev + 1);
              }}
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
        <div className="flex justify-between">
          <h3 className="font-bold md:text-xl" onClick={selectClicked}>
            {org.name}
          </h3>
          <div className="flex gap-3 justify-between items-center">
            <div className="flex gap-3">
              {org.ecosystems.map((ecosystem) => (
                <div
                  className="w-7 h-7 flex items-center justify-center rounded-full tooltip tooltip-left"
                  key={ecosystem.id}
                  data-tip={ecosystem.name}
                >
                  <img
                    src={ecosystem.icon}
                    alt={ecosystem.name}
                    className="w-7 h-7 rounded-full"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Export
                className="cursor-pointer"
                size={25}
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareClick();
                }}
              />
            </div>
          </div>
        </div>
        <div
          className="h-40 bg-cover bg-center bg-no-repeat mt-3 mb-3 rounded-[20px]"
          style={{ backgroundImage: `url(${org.main_image})` }}
          onClick={selectClicked}
        ></div>
        {org.address && (
          <div className="flex items-center pt-1 pb-2 text-sm">
            <div
              className="flex items-center font-bold"
              onClick={selectClicked}
            >
              <MapPin size={16} />
              {org.address}
            </div>
            {org.established && (
              <>
                <Dot size={16} />
                <div className="flex items-center">
                  <span>Est. {new Date(org.established).getFullYear()}</span>
                </div>
              </>
            )}
          </div>
        )}
        {(org.country_codes?.length || org.bioregion_codes?.length) && (
          <div className="flex flex-wrap gap-1.5 pb-2">
            {org.country_codes?.map((cc) => (
              <span
                key={cc}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {COUNTRY_CODE_TO_NAME[cc] ?? cc}
              </span>
            ))}
            {org.bioregion_codes?.map((bc) => (
              <span
                key={bc}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                {bc}
              </span>
            ))}
          </div>
        )}

        <div className="lg:hidden">
          <ExpandableText
            text={org.description}
            maxChars={125}
            className="text-sm mb-3"
          />
        </div>
        <div className="hidden lg:block">
          <ExpandableText
            text={org.description}
            maxChars={150}
            className="text-sm mb-3"
          />
        </div>

        <div className="xxs:text-[13px] text-sm">
          {org.assets.length > 0 && (
            <div className="flex justify-between items-start py-2 min-h-9">
              <p className="font-bold mr-4 hidden md:block">
                Associated Assets
              </p>
              <p className="font-bold mr-2 md:hidden">Assoc. Assets</p>
              <div className="xxs:text-xs text-sm font-bold text-right flex items-center flex-wrap gap-2">
                <Link
                  to={`/assets/${org.assets[0].id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <div className="bg-grayTag h-7 flex justify-center items-center rounded-full px-4 xxs:text-xs text-sm font-bold cursor-pointer">
                    {org.assets[0].name.length > 20
                      ? `${org.assets[0].name.substring(0, 17)}...`
                      : org.assets[0].name}
                  </div>
                </Link>
                <div
                  className="relative"
                  onMouseEnter={() => {
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    setDropdownVisible(true);
                  }}
                  onMouseLeave={() => {
                    timeoutRef.current = setTimeout(() => {
                      setDropdownVisible(false);
                      setDropdownPage(0);
                    }, 500);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <div className="bg-grayTag h-7 flex justify-center items-center rounded-full px-4 xxs:text-xs text-sm font-bold cursor-pointer">
                    +{org.assets.length - 1}
                  </div>
                  {dropdownVisible && renderDropdown(org.assets)}
                </div>
              </div>
            </div>
          )}
          {org.issuers.length > 0 && (
            <div className="flex justify-between items-start py-2 min-h-9">
              <p className="font-bold mr-4 hidden md:block">
                Associated Issuers
              </p>
              <p className="font-bold mr-2 md:hidden">Assoc. Issuers</p>
              <div className="xxs:text-xs text-sm font-bold text-right flex items-center flex-wrap gap-2">
                {org?.issuers?.map((issuer) => (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleIssuerClick(issuer);
                    }}
                    className="bg-grayTag h-7 flex justify-center items-center rounded-full px-4 xxs:text-xs text-sm font-bold cursor-pointer"
                    key={issuer.id}
                  >
                    {issuer.name}
                  </div>
                ))}
              </div>
            </div>
          )}
          {org.treasury.length > 0 && (
            <div className="flex justify-between items-center py-2 min-h-9">
              <p className="font-bold mr-4">Treasury</p>
              <div className="xxs:text-xs text-sm font-bold text-right flex items-center gap-2">
                {org?.treasury?.map((treasury) => (
                  <a
                    key={treasury.platform.id}
                    href={treasury.link}
                    target="_blank"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="cursor-pointer tooltip"
                    data-tip={treasury.platform.name}
                  >
                    <ChainTag
                      key={treasury.platform.id}
                      platform={treasury.platform}
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 pt-2 mt-2">
          <SocialLinks org={org} />
        </div>

        <div
          className={clsx("flex gap-3 mt-3 justify-between xxs:text-[13px]")}
        >
          <a
            href={org.impact_link || ""}
            target="_blank"
            className="button !bg-grayButton !text-blue-950 max-w-[190px] flex-1 flex justify-center items-center"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <span className="mr-1">Impact</span>
            <ArrowUpRight size={16} />
          </a>

          <a
            href={org.link || ""}
            target="_blank"
            className="flex items-center justify-center max-w-[190px] flex-1 button button-gradient text-center justify-self-end"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <span className="mr-1">Website</span>
            <ArrowUpRight size={16} />
          </a>
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
