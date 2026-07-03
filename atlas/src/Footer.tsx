import { GithubLogo, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { analytics } from "./modules/analytics";

function LegalModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4 relative" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-3 right-3 text-gray-400 hover:text-white" onClick={onClose}>
          <X size={18} />
        </button>
        <h3 className="text-sm font-semibold mb-4">Legal</h3>
        <div className="flex flex-col gap-3">
          <Link to="/privacy-policy" className="text-sm hover:text-primary-300 transition-colors" onClick={onClose}>
            Privacy Policy
          </Link>
          <Link to="/imprint" className="text-sm hover:text-primary-300 transition-colors" onClick={onClose}>
            Imprint
          </Link>
        </div>
      </div>
    </div>
  );
}

export default (): React.ReactElement => {
  const [showLegal, setShowLegal] = useState(false);

  return (
    <footer>
      <div className="border-t border-gray-200 flex items-center justify-between px-4 h-[36px] overflow-hidden">
        {/* Left: copyright + legal */}
        <div className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
          <span>&copy; AqueductX 2026</span>
          <span>&middot;</span>
          <button className="text-gray-500 hover:text-gray-700 transition-colors" onClick={() => setShowLegal(true)}>
            Legal
          </button>
        </div>

        {/* Center: List Project — hidden on small screens */}
        <div className="hidden md:flex items-center h-full group/list">
          <div className="w-px h-1/2 bg-gray-400/50 group-hover/list:bg-gray-400 transition-colors self-center" />
          <a
            className="h-full flex items-center px-6 text-[11px] font-medium hover:bg-gray-100 transition-colors"
            href="/guide"
            onClick={() => {
              analytics.sendEvent({
                category: "Link Click",
                action: "Docs",
                label: "Footer",
              });
            }}
          >
            Docs
          </a>
          <div className="w-px h-1/2 bg-gray-400/50 transition-colors self-center" />
          <a
            className="h-full flex items-center px-6 text-[11px] font-medium hover:bg-gray-100 transition-colors"
            href="/deck.html"
            target="_blank"
            onClick={() => {
              analytics.sendEvent({
                category: "Link Click",
                action: "Deck",
                label: "Footer",
              });
            }}
            rel="noreferrer"
          >
            Deck
          </a>
          <div className="w-px h-1/2 bg-gray-400/50 group-hover/list:bg-gray-400 transition-colors self-center" />
        </div>

        {/* Right: source */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <a
            className="text-gray-400"
            href="https://github.com/Ecofrontiers/aqueduct"
            target="_blank"
            onClick={() => {
              analytics.sendEvent({
                category: "Link Click",
                action: "GitHub",
                label: "Footer",
              });
            }}
            rel="noreferrer"
          >
            <GithubLogo size={14} />
          </a>
        </div>
      </div>

      {showLegal && <LegalModal onClose={() => setShowLegal(false)} />}
    </footer>
  );
};
