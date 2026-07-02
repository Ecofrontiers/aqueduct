import { useState } from "react";
import { LinkedinLogo, List, XLogo } from "@phosphor-icons/react";
import { Link, useLocation } from "react-router-dom";
import { Modal } from "./shared/components/Modal";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import { router } from "./main";
import clsx from "clsx";
import { ParagraphIcon } from "./shared/components/ParagraphIcon";
import { analytics } from "./modules/analytics";

type NavKey = "about" | "explore" | "hacks";

const hacksSubmenu = [
  { name: "Explore + EII", link: "/hacks/explore" },
  { name: "Impact & Market Intelligence", link: "/insights" },
  { name: "Bioregion Vaults", link: "/vaults/NT01" },
  { name: "Interspecies Parliament", link: "/parliament" },
  { name: "Hedera — RAEIS Provenance", link: "/publish" },
];

const primaryNav: { key: NavKey; name: string; link: string }[] = [
  { key: "about", name: "About", link: "/about" },
  { key: "explore", name: "Explore", link: "/" },
];

const secondaryLinks = [
  {
    name: "List Project",
    url: "/list",
  },
  {
    name: "Docs",
    url: "https://regen-atlas.gitbook.io/regen-atlas-docs",
  },
  {
    name: "Blog",
    url: "https://paragraph.xyz/@regenatlas",
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
      pathname.startsWith("/actions")
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
        <Link className="hidden md:block" to="/">
          <img
            src="/RA_logo-01.svg"
            alt="logo"
            className="h-[35px] lg:h-[24px]"
          />
        </Link>
        <Link className="block md:hidden h-[32px]" to="/">
          <img src="/RA_logo-02.svg" alt="logo" className="h-[32px]" />
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
          <div className="relative group">
            <button
              className={clsx(
                "text-sm font-medium transition-colors",
                ["/insights", "/parliament", "/publish", "/vaults", "/hacks"].some((p) =>
                  location.pathname.startsWith(p)
                )
                  ? "text-primary-300 font-bold"
                  : "hover:text-primary-300"
              )}
            >
              Hacks
            </button>
            <div className="absolute top-full left-0 pt-1 hidden group-hover:block z-30">
              <div className="bg-white rounded shadow-lg border border-gray-200 py-1 min-w-[160px]">
                {hacksSubmenu.map((item) => (
                  <Link
                    key={item.link}
                    to={item.link}
                    className={clsx(
                      "block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors",
                      location.pathname === item.link && "text-primary-300 font-semibold"
                    )}
                    onClick={() => {
                      analytics.sendEvent({
                        category: "Link Click",
                        action: item.name,
                        label: "Header Nav — Hacks",
                      });
                    }}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
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

              <div className="mt-2 mb-4">
                <p className="text-sm text-gray-500 text-center uppercase tracking-wider mb-1">Hacks</p>
                {hacksSubmenu.map((item) => (
                  <div
                    key={item.link}
                    className={clsx(
                      "p-3 text-lg mb-1 text-gray-900 text-center cursor-pointer",
                      location.pathname === item.link && "text-primary-300"
                    )}
                    onClick={() => {
                      analytics.sendEvent({
                        category: "Link Click",
                        action: item.name,
                        label: "Mobile Menu — Hacks",
                      });
                      router.navigate(item.link).then(() => setIsModalOpen(false));
                    }}
                  >
                    {item.name}
                  </div>
                ))}
              </div>

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
                <a
                  className="block p-3 text-lg mb-1 text-gray-900 text-center"
                  href="https://x.com/theregenatlas"
                  target="_blank"
                >
                  X
                </a>
                <a
                  className="block p-3 text-lg mb-1 text-gray-900 text-center"
                  href="https://www.linkedin.com/company/regen-atlas"
                  target="_blank"
                >
                  LinkedIn
                </a>
              </div>
            </div>

            {/* Footer — pinned to bottom */}
            <div className="flex flex-col items-center pb-8 text-xs text-gray-500">
              <p>&copy; Regen Atlas 2026</p>
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
