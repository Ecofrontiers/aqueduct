import clsx from "clsx";
import {
  ArrowUpRight,
  CalendarBlank,
  Export,
  MapPin,
  Users,
  Certificate,
} from "@phosphor-icons/react";
import { useState } from "react";
import { TextShareModal } from "../shared/components/TextShareModal";
import { ExpandableText } from "../shared/components/ExpandableText";
import { Action } from "../shared/types";
import { Link } from "react-router-dom";
import { COUNTRY_CODE_TO_NAME } from "../shared/countryCodes";

interface ActionCardProps {
  className?: string;
  action: Action;
  selectClicked: () => void;
}

const formatDate = (dateString: string | null): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

export default ({
  className,
  action,
  selectClicked,
}: ActionCardProps): React.ReactElement => {
  const [showShareOptions, setShowShareOptions] = useState(false);

  const shareUrl = `${window.location.origin}/actions/${action.id}`;

  const handleShareClick = async () => {
    setShowShareOptions(true);
  };

  const dateRange =
    action.action_start_date || action.action_end_date
      ? `${formatDate(action.action_start_date)}${action.action_start_date && action.action_end_date ? " - " : ""}${formatDate(action.action_end_date)}`
      : null;

  return (
    <>
      <div
        className={clsx(
          "asset-card border-2 border-white p-3 rounded-[20px] bg-cardBackground",
          className
        )}
      >
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            {action.proofs.slice(0, 4).map((proof) => (
              <div
                key={proof.id}
                className="tooltip tooltip-right w-4 h-4 flex items-center justify-center rounded-full bg-grayTag text-xs font-bold"
                data-tip={proof.protocol.name}
              >
                <img src={proof.protocol.logo || ""} alt={proof.protocol.name} className="w-4 h-4" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-between items-center">
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

        {action.main_image && (
          <div
            className="h-40 bg-cover bg-center bg-no-repeat mt-3 mb-3 rounded-[20px] cursor-pointer"
            style={{ backgroundImage: `url(${action.main_image})` }}
            onClick={selectClicked}
          />
        )}

        <h3
          className="font-bold md:text-xl cursor-pointer"
          onClick={selectClicked}
        >
          {action.title}
        </h3>

        <div className="flex flex-wrap items-center gap-2 pt-1 pb-2 text-sm">
          {(action.region || action.country_code) && (
            <div
              className="flex items-center font-bold cursor-pointer"
              onClick={selectClicked}
            >
              <MapPin size={16} className="mr-1" />
              {[action.region, action.country_code ? COUNTRY_CODE_TO_NAME[action.country_code] : null].filter(Boolean).join(", ")}
            </div>
          )}
          {dateRange && (
            <div className="flex items-center text-gray-600">
              <CalendarBlank size={16} className="mr-1" />
              <span>{dateRange}</span>
            </div>
          )}
        </div>

        {action.description && (
          <>
            <div className="lg:hidden">
              <ExpandableText
                text={action.description}
                maxChars={125}
                className="text-sm mb-3"
              />
            </div>
            <div className="hidden lg:block">
              <ExpandableText
                text={action.description}
                maxChars={150}
                className="text-sm mb-3"
              />
            </div>
          </>
        )}

        <div className="xxs:text-[13px] text-sm">
          {/* Actors */}
          {action.actors.length > 0 && (
            <div className="flex justify-between items-start py-2 min-h-9">
              <p className="font-bold mr-4 flex items-center">
                <Users size={16} className="mr-1" />
                Actors
              </p>
              <div className="text-sm font-bold text-right flex items-center flex-wrap gap-2 justify-end">
                {action.actors.slice(0, 3).map((actor) => (
                  <a
                    key={actor.id}
                    href={actor.website || "#"}
                    target={actor.website ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!actor.website) e.preventDefault();
                    }}
                    className={clsx(
                      "bg-grayTag h-7 flex justify-center items-center rounded-full px-4 text-xs",
                      actor.website && "hover:bg-gray-300 cursor-pointer"
                    )}
                  >
                    {actor.name.length > 23
                      ? `${actor.name.substring(0, 20)}...`
                      : actor.name}
                  </a>
                ))}
                {action.actors.length > 3 && (
                  <div className="bg-grayTag h-7 flex justify-center items-center rounded-full px-3 text-xs font-bold">
                    +{action.actors.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SDG Outcomes */}
          {action.sdg_outcomes.length > 0 && (
            <div className="flex justify-between items-start py-2 min-h-9">
              <p className="font-bold mr-4">SDG Outcomes</p>
              <div className="flex items-center flex-wrap gap-1 justify-end">
                {action.sdg_outcomes
                  .sort((a, b) => parseInt(a.code, 10) - parseInt(b.code, 10))
                  .slice(0, 6)
                  .map((sdg) => (
                    <div
                      key={sdg.id}
                      className="w-8 h-8 tooltip tooltip-left flex items-center justify-center rounded-full bg-grayTag text-xs font-bold"
                      data-tip={`${sdg.code} - ${sdg.title}`}
                    >
                      {/* <img
                        src={getSDGIconPath(sdg.code)}
                        alt={`SDG ${sdg.code}`}
                        className="w-full h-full rounded"
                      /> */}
                      <span>{sdg.code}</span>
                    </div>
                  ))}
                {action.sdg_outcomes.length > 6 && (
                  <div className="bg-grayTag h-7 flex justify-center items-center rounded-full px-2 text-xs font-bold">
                    +{action.sdg_outcomes.length - 6}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Proofs */}
          {action.proofs.length > 0 && (
            <div className="flex justify-between items-center py-2 min-h-9">
              <p className="font-bold mr-4 flex items-center">
                <Certificate size={16} className="mr-1" />
                Proofs
              </p>
              <div className="text-sm font-bold text-right flex items-center gap-2">
                {action.proofs.slice(0, 4).map((proof) => (
                  <a
                    key={proof.id}
                    href={proof.proof_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="tooltip cursor-pointer"
                    data-tip={proof.protocol.name}
                  >
                    <img src={proof.protocol.logo || ""} alt={proof.protocol.name} className="w-4 h-4" />
                  </a>
                ))}
                {action.proofs.length > 4 && (
                  <div className="bg-grayTag h-7 flex justify-center items-center rounded-full px-3 text-xs font-bold">
                    +{action.proofs.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={clsx("flex gap-3 mt-3 justify-between xxs:text-[13px]")}>
          <Link
            to={`/actions/${action.id}`}
            className="button !bg-grayButton !text-blue-950 max-w-[190px] flex-1 flex justify-center items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mr-1">Details</span>
            <ArrowUpRight size={16} />
          </Link>

          {action.proofs.length > 0 && action.proofs[0].proof_link && (
            <a
              href={action.proofs[0].proof_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center max-w-[190px] flex-1 button button-gradient text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="mr-1">View Proof</span>
              <ArrowUpRight size={16} />
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
