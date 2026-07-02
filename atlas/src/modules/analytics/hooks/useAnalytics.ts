import ReactGA from "react-ga4";

export const useAnalytics = () => {
  const isProduction = window.location.hostname.includes("regenatlas.xyz");
  const isLocal = window.location.hostname.includes("localhost");
  const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
  if (gaId && (isProduction || isLocal)) {
    ReactGA.initialize(gaId);
  }
};
