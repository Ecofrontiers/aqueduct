import ReactGA from "react-ga4";
import { UaEventOptions } from "react-ga4/types/ga4";

export const analytics = {
  sendPageView: ({ page, title }: { page: string; title: string }) => {
    ReactGA.send({
      hitType: "pageview",
      page,
      title,
    });
  },
  sendEvent: ({
    category,
    action,
    value,
    label,
  }: {
    category: string;
    action: string;
    value?: number;
    label?: string;
  }) => {
    const event: UaEventOptions = {
      category,
      action,
    };
    if (value) {
      event.value = value;
    }
    if (label) {
      event.label = label;
    }
    ReactGA.event(event);
  },
  sendFiltersEvent: ({
    action,
    label,
    value,
  }: {
    action: string;
    label: string;
    value?: number;
  }) => {
    const event: UaEventOptions = {
      category: "Filters",
      action,
      label,
    };
    if (value) {
      event.value = value;
    }
    ReactGA.event(event);
  },
  sendSwappingEvent: ({
    action,
    value,
    label,
  }: {
    action: string;
    value?: number;
    label?: string;
  }) => {
    const event: UaEventOptions = {
      category: "Swapping",
      action,
    };
    if (value) {
      event.value = value;
    }
    if (label) {
      event.label = label;
    }
    ReactGA.event(event);
  },
  sendRetiringEvent: ({
    action,
    value,
    label,
  }: {
    action: string;
    value?: number;
    label?: string;
  }) => {
    const event: UaEventOptions = {
      category: "Retirement",
      action,
    };
    if (value) {
      event.value = value;
    }
    if (label) {
      event.label = label;
    }
    ReactGA.event(event);
  },
};
