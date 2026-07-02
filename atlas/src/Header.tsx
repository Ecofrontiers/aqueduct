import { useState } from "react";
import { List } from "@phosphor-icons/react";
import { Link, useLocation } from "react-router-dom";
import { Modal } from "./shared/components/Modal";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import { router } from "./main";
import clsx from "clsx";
import { analytics } from "./modules/analytics";

type NavKey = "map" | "ledger" | "about";

const primaryNav: { key: NavKey; name: string; link: string }[] = [
  { key: "map", name: "Map", link: "/" },
  { key: "ledger", name: "Ledger", link: "/ledger" },
  { key: "about", name: "About", link: "/about" },
];

const secondaryLinks = [
  {
    name: "List Project",
    url: "/list",
  },
];

const legalLinks = [
  { name: "Privacy Policy", link: "/privacy-policy" },
  { name: "Imprint", link: "/imprint" },
];

function isActive(pathname: string, link: string): boolean {
  if (link === "/") {
    return (
      pathname === "/" ||
      pathname.startsWith("/assets") ||
      pathname.startsWith("/orgs") ||
      pathname.startsWith("/actions") ||
      pathname.startsWith("/lots") ||
      pathname.startsWith("/agents")
    );
  }
  return pathname.startsWith(link);
}

export default (): React.ReactElement => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBmwiNotice, setShowBmwiNotice] = useState(false);
  const location = useLocation();
  const { chain, isConnected: walletConnected } = useAccount();

  return (
    <header
      className={clsx(
        "px-3 md:px-4 z-20 fixed top-0 left-0 w-full",
        "bg-background site-header",
        "h-[60px] lg:h-[36px]"
      )}
    >
      {/* Single row nav */}
      <div className="flex items-center h-[60px] lg:h-[36px]">
        <Link
          className="font-extrabold tracking-[0.04em] text-[17px] lg:text-[15px] leading-none select-none"
          to="/"
        >
          AQUEDUCT
        </Link>

        <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {primaryNav.map((item) => (
            <Link
              key={item.key}
              className={clsx(
                "text-sm font-medium transition-colors",
                isActive(location.pathname, item.link)
                  ? "text-primary-300 font-bold"
                  : "hover:text-primary-300"
              )}
              to={item.link}
              onClick={() => {
                analytics.sendEvent({
                  category: "Link Click",
                  action: item.name,
                  label: "Header Nav",
                });
              }}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center ml-auto h-full group/wallet">
          {walletConnected && chain && (
            <>
              <div className="flex items-center gap-1.5 px-3 text-[10px] text-gray-400">
                <div
                  className={clsx(
                    "w-1.5 h-1.5 rounded-full",
                    chain.testnet ? "bg-amber-400" : "bg-green-400"
                  )}
                />
                <span>{chain.name}</span>
              </div>
              <div className="w-px h-1/2 bg-gray-400/50 self-center" />
            </>
          )}
          <div className="w-px h-1/2 bg-gray-400/50 group-hover/wallet:bg-gray-400 transition-colors self-center" />
          <ConnectKitButton.Custom>
            {({ isConnected, show, truncatedAddress, ensName }) => (
              <button
                onClick={show}
                className="h-full px-4 text-[11px] font-medium hover:bg-gray-100 transition-colors flex items-center"
              >
                {isConnected
                  ? ensName ?? truncatedAddress
                  : "Connect Wallet"}
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>

        <button
          className="lg:hidden ml-auto p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={() => setIsModalOpen(true)}
        >
          <List size={32} />
        </button>
      </div>

      {/* Mobile menu */}
      {isModalOpen && (
        <Modal fullScreen={true} onClose={() => setIsModalOpen(false)}>
          <div className="flex flex-col justify-between h-full text-gray-900">
            {/* Nav links */}
            <div className="flex flex-col items-center mt-[40px]">
              {primaryNav.map((item) => (
                <div
                  key={item.key}
                  className={clsx(
                    "p-4 text-2xl mb-2 font-semibold text-gray-900",
                    isActive(location.pathname, item.link) &&
                      "text-primary-300"
                  )}
                  onClick={() => {
                    analytics.sendEvent({
                      category: "Link Click",
                      action: item.name,
                      label: "Mobile Menu",
                    });
                    router
                      .navigate(item.link)
                      .then(() => setIsModalOpen(false));
                  }}
                >
                  {item.name}
                </div>
              ))}

              <div className="mt-4">
                {secondaryLinks.map((item) => (
                  <a
                    className="block p-3 text-lg mb-1 text-gray-900 text-center"
                    key={item.name}
                    href={item.url}
                    target={item.url.startsWith("http") ? "_blank" : undefined}
                    onClick={(e) => {
                      analytics.sendEvent({
                        category: "Link Click",
                        action: item.name,
                        label: "Mobile Menu",
                      });
                      if (!item.url.startsWith("http")) {
                        e.preventDefault();
                        router.navigate(item.url).then(() => setIsModalOpen(false));
                      }
                    }}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>

            {/* Footer — pinned to bottom */}
            <div className="flex flex-col items-center pb-8 text-xs text-gray-500">
              <p>&copy; Aqueduct 2026 &middot; built on Regen Atlas</p>
              <div className="flex gap-4 mt-2">
                {legalLinks.map((item) => (
                  <div
                    key={item.name}
                    className="cursor-pointer hover:text-gray-900"
                    onClick={() => {
                      router
                        .navigate(item.link)
                        .then(() => setIsModalOpen(false));
                    }}
                  >
                    {item.name}
                  </div>
                ))}
                <div
                  className="cursor-pointer hover:text-gray-900"
                  onClick={() => setShowBmwiNotice(true)}
                >
                  BMWi Notice
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* BMWi Notice modal */}
      {showBmwiNotice && (
        <Modal onClose={() => setShowBmwiNotice(false)}>
          <div className="flex flex-col items-center gap-4 p-4">
            <img src="/BMWE_de_v3__Web_farbig.svg" width="200" />
            <p className="text-sm text-center text-gray-700 leading-relaxed">
              Funded by the Federal Ministry for Economic Affairs and Energy
              (BMWi) based on a decision of the German Bundestag.
            </p>
            <button
              className="mt-2 px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded"
              onClick={() => setShowBmwiNotice(false)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </header>
  );
};
