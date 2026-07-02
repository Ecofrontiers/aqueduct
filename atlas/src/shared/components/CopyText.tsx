import { Copy } from "@phosphor-icons/react";
import clsx from "clsx";
import { useRef, useState } from "react";

export const CopyText = ({ text }: { text: string }): React.ReactElement => {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (textarea.current) {
      setIsCopied(true);
      textarea.current.select();

      try {
        document.execCommand("copy");
        console.log("Text copied to clipboard");
      } catch (err) {
        console.error("Failed to copy text: ", err);
      }
    }
  };

  return (
    <div className="border-[1px] border-gray-400 rounded-lg p-2 bg-white grid grid-cols-[1fr_auto] gap-4">
      <textarea
        ref={textarea}
        className={clsx(
          "break-all h-20 md:h-auto w-[60vw] md:w-[400px] resize-none focus:outline-none disabled:bg-white",
          isCopied && "selection:text-[#181818]"
        )}
        value={text}
        onChange={() => {}}
      ></textarea>
      <Copy className="cursor-pointer" size={24} onClick={handleCopy} />
    </div>
  );
};
