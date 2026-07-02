import {
  XLogo,
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  YoutubeLogo,
  GithubLogo,
  DiscordLogo,
  TelegramLogo,
  TiktokLogo,
  LinktreeLogo,
  ThreadsLogo,
  Files,
  Newspaper,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { Org } from "../shared/types";
import { ParagraphIcon } from "../shared/components/ParagraphIcon";

export default ({ org }: { org: Org }) => {
  return (
    <div className="flex gap-2">
      {org.social.slice(0, 8).map((social) => (
        <a
          className="block"
          href={social.link}
          target="_blank"
          rel="noopener noreferrer"
          key={social.platform}
        >
          <div
            className="font-bold tooltip cursor-pointer"
            data-tip={social.platform}
          >
            {social.platform === "facebook" ? (
              <FacebookLogo weight="fill" size={32} color="#1877F2" />
            ) : social.platform === "x" ? (
              <XLogo weight="fill" size={32} />
            ) : social.platform === "instagram" ? (
              <InstagramLogo weight="fill" size={32} />
            ) : social.platform === "tiktok" ? (
              <TiktokLogo weight="fill" size={32} color="#000000" />
            ) : social.platform === "karmagap" ? (
              <img
                src="/social/karmagap.svg"
                alt="karmagap"
                width={32}
                height={32}
              />
            ) : social.platform === "farcaster" ? (
              <img
                src="/social/farcaster.svg"
                alt="farcaster"
                width={32}
                height={32}
              />
            ) : social.platform === "mirror" ? (
              <img
                src="/social/mirror.png"
                alt="mirror"
                width={32}
                height={32}
              />
            ) : social.platform === "paragraph" ? (
              <div className="w-8 h-8 flex justify-center items-center">
                <ParagraphIcon className="w-6 h-6" />
              </div>
            ) : social.platform === "linktree" ? (
              <LinktreeLogo weight="fill" size={32} />
            ) : social.platform === "discord" ? (
              <DiscordLogo weight="fill" size={32} color="#5865F2" />
            ) : social.platform === "youtube" ? (
              <YoutubeLogo weight="fill" size={32} color="#FF0000" />
            ) : social.platform === "linkedin" ? (
              <LinkedinLogo weight="fill" size={32} color="#0077B5" />
            ) : social.platform === "telegram" ? (
              <TelegramLogo weight="fill" size={32} color="#2AABEE" />
            ) : social.platform === "signal" ? (
              <div className="w-8 h-8 flex justify-center items-center">
                <img
                  src="/social/signal.svg"
                  alt="signal"
                  width={28}
                  height={28}
                />
              </div>
            ) : social.platform === "threads" ? (
              <ThreadsLogo weight="fill" size={32} color="#000000" />
            ) : social.platform === "hylo" ? (
              <div className="w-8 h-8 flex justify-center items-center">
                <img src="/social/hylo.svg" alt="hylo" width={28} height={28} />
              </div>
            ) : social.platform === "bluesky" ? (
              <div className="w-8 h-8 flex justify-center items-center">
                <img
                  src="/social/bluesky.svg"
                  alt="bluesky"
                  width={28}
                  height={28}
                />
              </div>
            ) : social.platform === "charmverse" ? (
              <img
                src="/social/charmverse.webp"
                alt="charmverse"
                width={32}
                height={32}
              />
            ) : social.platform === "blog" ? (
              <Newspaper weight="fill" size={32} />
            ) : social.platform === "docs" ? (
              <Files weight="fill" size={32} />
            ) : social.platform === "discourse" ? (
              <div className="w-8 h-8 flex justify-center items-center">
                <img
                  src="/social/discourse.svg"
                  alt="discourse"
                  width={28}
                  height={28}
                />
              </div>
            ) : social.platform === "github" ? (
              <GithubLogo weight="fill" size={32} color="#181717" />
            ) : social.platform === "gitbook" ? (
              <div className="w-8 h-8 flex justify-center items-center">
                <img
                  src="/social/gitbook.png"
                  alt="gitbook"
                  width={28}
                  height={28}
                />
              </div>
            ) : social.platform === "whatsapp" ? (
              <WhatsappLogo weight="fill" size={32} color="#25D366" />
            ) : social.platform === "luma" ? (
              <div className="w-8 h-8 flex justify-center items-center">
                <img src="/social/luma.svg" alt="luma" width={28} height={28} />
              </div>
            ) : social.platform === "giveth" ? (
              <div className="w-8 h-8 flex justify-center items-center">
                <img
                  src="/social/giveth.svg"
                  alt="giveth"
                  width={28}
                  height={28}
                />
              </div>
            ) : null}
          </div>
        </a>
      ))}
    </div>
  );
};

export const SOCIAL_PLATFORMS = [
  {
    id: "facebook",
    name: "Facebook",
  },
  {
    id: "x",
    name: "X",
  },
  {
    id: "instagram",
    name: "Instagram",
  },
  {
    id: "tiktok",
    name: "TikTok",
  },
  {
    id: "karmagap",
    name: "KarmaGAP",
  },
  {
    id: "farcaster",
    name: "Farcaster",
  },
  {
    id: "mirror",
    name: "Mirror",
  },
  {
    id: "paragraph",
    name: "Paragraph",
  },
  {
    id: "linktree",
    name: "Linktree",
  },
  {
    id: "discord",
    name: "Discord",
  },
  {
    id: "youtube",
    name: "Youtube",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
  },
  {
    id: "telegram",
    name: "Telegram",
  },
  {
    id: "signal",
    name: "Signal",
  },
  {
    id: "threads",
    name: "Threads",
  },
  {
    id: "hylo",
    name: "Hylo",
  },
  {
    id: "bluesky",
    name: "Bluesky",
  },
  {
    id: "charmverse",
    name: "Charmverse",
  },
  {
    id: "blog",
    name: "Blog",
  },
  {
    id: "docs",
    name: "Docs",
  },
  {
    id: "discourse",
    name: "Discourse",
  },
  {
    id: "github",
    name: "Github",
  },
  {
    id: "gitbook",
    name: "Gitbook",
  },
];
