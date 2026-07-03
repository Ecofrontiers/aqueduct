import { List } from "@phosphor-icons/react";
import clsx from "clsx";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { setDockOpen } from "./aqueduct/state/tourStore";
import { router } from "./main";
import { analytics } from "./modules/analytics";
import { Modal } from "./shared/components/Modal";

type NavKey = "map" | "financing";

const primaryNav: { key: NavKey; name: string; link: string }[] = [
  { key: "map", name: "Map", link: "/" },
  { key: "financing", name: "Financing", link: "/financing" },
];

const secondaryLinks = [
  {
    name: "Docs",
    url: "/guide",
  },
  {
    name: "Deck",
    url: "/deck.html",
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
  const location = useLocation();

  return (
    <>
      <header
        className={clsx(
          "px-3 md:px-4 z-20 fixed top-0 left-0 w-full",
          "bg-background site-header",
          "h-[60px] lg:h-[36px]",
        )}
      >
        {/* Single row nav */}
        <div className="flex items-center h-[60px] lg:h-[36px]">
          <Link className="font-extrabold tracking-[0.04em] text-[17px] lg:text-[15px] leading-none select-none" to="/">
            AQUEDUCT
            <span className="text-[#9333ea]/80 font-semibold text-[0.9em]" title="exchange">
              x
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {primaryNav.map((item) => (
              <Link
                key={item.key}
                className={clsx(
                  "text-sm font-medium transition-colors",
                  isActive(location.pathname, item.link) ? "text-primary-300 font-bold" : "hover:text-primary-300",
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

          {/* Tour / Docs / Deck pill group (Pat, 2026-07-03) — the tour trigger
              moved up from the map corner; the simulation disclaimer moved to
              the footer. */}
          <div className="hidden lg:flex items-center ml-auto h-full gap-0 text-[11px] font-medium">
            <button
              type="button"
              className="h-full px-3 hover:bg-gray-100 transition-colors"
              onClick={() => {
                if (location.pathname !== "/") router.navigate("/").then(() => setDockOpen(true));
                else setDockOpen(true);
              }}
            >
              Tour
            </button>
            <div className="w-px h-1/2 bg-gray-400/50 self-center" />
            <Link className="h-full px-3 flex items-center hover:bg-gray-100 transition-colors" to="/guide">
              Docs
            </Link>
            <div className="w-px h-1/2 bg-gray-400/50 self-center" />
            <a
              className="h-full px-3 flex items-center hover:bg-gray-100 transition-colors"
              href="/deck.html"
              target="_blank"
              rel="noreferrer"
            >
              Deck
            </a>
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
                      isActive(location.pathname, item.link) && "text-primary-300",
                    )}
                    onClick={() => {
                      analytics.sendEvent({
                        category: "Link Click",
                        action: item.name,
                        label: "Mobile Menu",
                      });
                      router.navigate(item.link).then(() => setIsModalOpen(false));
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
                        // .html targets are static files (deck) — browser handles them, not the SPA router
                        if (!item.url.startsWith("http") && !item.url.endsWith(".html")) {
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
                <p>&copy; AqueductX 2026</p>
                <div className="flex gap-4 mt-2">
                  {legalLinks.map((item) => (
                    <div
                      key={item.name}
                      className="cursor-pointer hover:text-gray-900"
                      onClick={() => {
                        router.navigate(item.link).then(() => setIsModalOpen(false));
                      }}
                    >
                      {item.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Modal>
        )}
      </header>
    </>
  );
};
