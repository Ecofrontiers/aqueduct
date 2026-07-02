export interface Filters {
  assetTypes: Record<string, AssetTypeFilters>;
  provider: string;
  platform: string;
}

export interface AssetTypeFilters {
  id: string;
  name: string;
  subtypes: Array<string>; // ids
}

export interface AssetSubtype {
  id: string;
  name: string;
}

export type FiltersKeys = keyof Filters;

export interface NewFilters {
  assetTypes: Record<number, NewAssetTypeFilters>;
  providers: number[];
  platforms: string[];
  flags: {
    prefinancing: boolean | null;
    pretoken: boolean | null;
    yield_bearing: boolean | null;
  };
}

export interface NewAssetTypeFilters {
  id: number;
  name: string;
  subtypes: Array<number>; // ids
}

export interface NewAssetSubtype {
  id: number;
  name: string;
}

export type NewFiltersKeys = keyof NewFilters;
