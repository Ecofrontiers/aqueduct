import {
  TelegramShareButton,
  TelegramIcon,
  TwitterShareButton,
  XIcon,
  LinkedinShareButton,
  LinkedinIcon,
  EmailShareButton,
  EmailIcon,
} from "react-share";
import { CopyText } from "./CopyText";
import { Modal } from "./Modal";

export const TextShareModal = ({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}): React.ReactElement => {
  return (
    <Modal onClose={onClose}>
      <div className="max-w-[84vw] md:max-w-[500px] pt-3">
        <CopyText text={text} />

        <div className="mt-6 flex justify-end gap-4">
          <TelegramShareButton url={text}>
            <TelegramIcon size={32} round />
          </TelegramShareButton>

          <TwitterShareButton url={text}>
            <XIcon size={32} />
          </TwitterShareButton>

          <LinkedinShareButton url={text}>
            <LinkedinIcon size={32} round />
          </LinkedinShareButton>

          <EmailShareButton url={text}>
            <EmailIcon size={32} round />
          </EmailShareButton>
        </div>
      </div>
    </Modal>
  );
};
