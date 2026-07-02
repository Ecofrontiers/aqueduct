import { Token as UniswapToken } from "@uniswap/sdk-core";
import { Platform } from "../modules/assets";

export type MapStyles = "map" | "satellite" | "terrain";

export type NewStatus = "DRAFT" | "PUBLISHED" | "DELETED";

export interface NewIssuer {
  id: number;
  name: string;
  status?: NewStatus;
  deleted_at?: Date | null;
}

export type AssetNativity =
  | "STATUS_QUO"
  | "ONCHAIN_REPRESENTATION"
  | "ONCHAIN_INTEGRATION"
  | "ONCHAIN_ENFORCEMENT"
  | "FULLY_ONCHAIN"
  | "PRETOKEN";

export interface AssetTypeWithSubtypes {
  id: number;
  name: string;
  asset_subtypes: {
    id: number;
    name: string;
    total_asset_count?: number;
    issuer_counts?: Array<{
      issuer_id: number;
      asset_count: number;
    }>;
  }[];
}

export interface Token extends UniswapToken {
  symbol: string;
}

export interface Org {
  id: number;
  name: string;
  status: NewStatus;
  link: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  description: string;
  impact_link: string | null;
  established: string | null;
  address: string | null;
  social: Array<{
    platform: string;
    link: string;
  }>;
  treasury: Array<{
    link: string;
    platform: Platform;
  }>;
  main_image: string | null;
  issuers: Array<{
    id: number;
    name: string;
    status: NewStatus;
  }>;
  ecosystems: Array<{
    id: number;
    name: string;
    status: NewStatus;
    icon: string;
  }>;
  assets: Array<{
    id: string;
    name: string;
  }>;
  country_codes?: string[];    // ISO 3166-1 alpha-2, e.g. ["KE", "TZ"]
  bioregion_codes?: string[];  // e.g. ["AT14", "AT17"]
}

// SDG types
export interface SDG {
  id: number;
  code: string;
  title: string;
}

// Action Actor types
export interface ActionActor {
  id: string;
  name: string;
  website: string | null;
}

// Action Protocol types
export interface ActionProtocol {
  id: string;
  name: string;
  logo: string | null;
  color: string;
  website: string | null;
}

// Action Proof types
export interface ActionProof {
  id: string;
  proof_link: string;
  minted_at: string | null;
  proof_metadata_link: string | null;
  proof_image_link: string | null;
  proof_transaction_hash: string | null;
  proof_explorer_link: string | null;
  protocol: ActionProtocol;
  platform: {
    id: string;
    name: string;
    shortname: string;
    color: string;
    image: {
      thumb: string;
      small: string;
      large: string;
    };
  };
}

// Certification types (shared with Assets)
export interface Certifier {
  id: number;
  name: string;
  short_name: string;
}

export interface Certification {
  id: number;
  value: number;
  description: string;
  description_short: string;
  certification_source: string;
  certifier: Certifier;
}

// Action types
export interface Action {
  id: string;
  title: string;
  description: string | null;
  status: NewStatus;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  country_code: string | null;
  region: string | null;
  action_start_date: string | null;
  action_end_date: string | null;
  main_image: string | null;
  created_at: string;
  edited_at: string | null;
  actors: ActionActor[];
  sdg_outcomes: SDG[];
  proofs: ActionProof[];
  certifications?: Certification[];
  /** For aggregated actions: individual issuance periods */
  periods?: { date: string; description: string | null; proof_id: string }[];
}
