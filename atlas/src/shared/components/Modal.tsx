import { X } from "@phosphor-icons/react";
import clsx from "clsx";
import { useEffect } from "react";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  closeOnOutsideClick?: boolean;
  fullScreen?: boolean;
}

export const Modal = ({
  children,
  onClose,
  closeOnOutsideClick = true,
  fullScreen = false,
}: ModalProps) => {
  useEffect(() => {
    const classesToAdd: string[] = [];
    if (!document.body.classList.contains("modal-open")) {
      classesToAdd.push("modal-open", "overflow-hidden");
    }
    document.body.classList.add(...classesToAdd);
    return () => {
      document.body.classList.remove(...classesToAdd);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 z-50 w-svw h-[100vh] flex justify-center items-center bg-black bg-opacity-60"
      onClick={() => (closeOnOutsideClick ? onClose() : "")}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          "bg-background px-3 md:px-6 py-10 relative",
          fullScreen && "w-full h-full",
          !fullScreen && "rounded-md shadow-lg"
        )}
      >
        <div
          className="absolute right-4 top-0 cursor-pointer h-[60px] flex items-center"
          onClick={onClose}
        >
          <X className="lg:hidden" size={40} />
          <X className="hidden lg:block" size={24} />
        </div>
        <div className="overflow-y-auto h-full">{children}</div>
      </div>
    </div>
  );
};
