import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { analytics } from "..";

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const sendPageView = (url: string) => {
      analytics.sendPageView({
        page: url,
        title: document.title,
      });
    };

    sendPageView(location.pathname + location.search);
  }, [location]);
};
