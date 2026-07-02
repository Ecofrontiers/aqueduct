import { useEffect } from "react";

export const useScrollClass = () => {
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        document.body.classList.add("scrolled");
      } else {
        document.body.classList.remove("scrolled");
      }

      if (window.scrollY > 360) {
        document.body.classList.add("scrolled-360");
      } else {
        document.body.classList.remove("scrolled-360");
      }
    };

    window.addEventListener("scroll", handleScroll);

    // Cleanup the event listener on unmount
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
};
