import clsx from "clsx";
import { useState } from "react";

interface ExpandableTextProps {
  text: string;
  maxChars?: number;
  className?: string;
}

export const ExpandableText = ({
  text,
  maxChars = 150,
  className,
}: ExpandableTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const truncatedText =
    text.length > maxChars ? text.slice(0, maxChars).trimEnd() + "..." : text;

  const toggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={clsx("overflow-hidden", className)}>
      {isExpanded ? text : truncatedText}
      {text.length > maxChars && (
        <span onClick={toggle} className="font-bold cursor-pointer">
          {" "}
          {isExpanded ? " read\u00A0less" : `read\u00A0more`}
        </span>
      )}
    </div>
  );
};
