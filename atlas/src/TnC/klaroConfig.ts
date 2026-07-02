const klaroConfig = {
  version: 1,
  elementID: "klaro-consent-modal",
  privacyPolicy: "/privacy-policy", // Link to your privacy policy page
  disablePoweredBy: true, // Disable the "powered by Klaro!" link
  translations: {
    en: {
      consentModal: {
        title: "Privacy Settings",
        description:
          "We use cookies to enhance your experience. You can choose which ones to allow below.",
      },
      consentNotice: {
        description:
          "We use cookies to enhance your browsing experience. Manage your preferences or accept all.",
        learnMore: "Customize", // Button text to open the full modal
      },
      purposes: {
        functional: "Essential cookies",
        analytics: "Analytics",
      },
    },
  },
  services: [
    {
      name: "essential",
      title: "Essential Cookies",
      purposes: ["functional"],
      cookies: [""],
      required: true, // These cookies cannot be toggled off
    },
    {
      name: "google-analytics",
      title: "Google Analytics",
      purposes: ["analytics"],
      cookies: ["_ga", "_gid"], // List cookies used by the service
      required: false, // Set to true if this service is always enabled
      default: true,
    },
  ],
};

export default klaroConfig;
