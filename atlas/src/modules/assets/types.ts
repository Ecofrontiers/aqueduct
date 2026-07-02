import { AssetNativity } from "../../shared/types";

export interface Issuer {
  id: number;
  name: string;
}

type AssetStatus = "DRAFT" | "PUBLISHED" | "DELETED";

export interface Platform {
  id: string;
  name: string;
  color: string;
  text_color: string;
  background_color?: string;
  image: {
    large: string;
    small: string;
    thumb: string;
  };
}

export interface RelatedAsset {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface Asset {
  id: string;
  name: string;
  description: string;
  nativity: AssetNativity;
  status: AssetStatus;
  issuer_link: string;
  exchange_link: string;
  main_image: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  issuer: Issuer;
  tokens: {
    id: string;
    name: string;
    symbol: string;
    platforms: Array<{
      id: string;
      contract_address: string;
    }>;
  }[];
  platforms: Platform[];
  asset_subtypes: {
    id: number;
    name: string;
  }[];
  asset_types: {
    id: number;
    name: string;
  }[];
  country_code: string;
  region: string;
  child_assets: Array<RelatedAsset>;
  parent_assets: Array<RelatedAsset>;
  certifications: Array<{
    id: number;
    value: number;
    description: string;
    description_short: string;
    certification_source: string;
    certifier: {
      id: number;
      name: string;
      short_name: string;
    };
  }>;
  second_order: boolean;
  metadata: Record<string, any>;
  prefinancing: boolean;
  pretoken: boolean;
  yield_bearing: boolean;
}
