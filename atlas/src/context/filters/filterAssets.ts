import { Asset } from "../../modules/assets";
import { NewFilters } from "../../modules/filters";

export const filterNewAssets = (
  assets: Asset[],
  filters: NewFilters
): Asset[] => {
  const {
    providers: filterProviders,
    assetTypes: filterAssetTypes,
    platforms: filterPlatforms,
    flags: filterFlags,
  } = filters;

  return assets.filter((asset) => {
    const providerId = asset.issuer.id;
    const assetTypeId = asset.asset_types[0].id;
    const assetTypeId2 = asset.asset_types[1]?.id;
    const platforms = asset.platforms;
    const assetSubtypeId = asset.asset_subtypes[0].id;
    const assetSubtypeId2 = asset.asset_subtypes[1]?.id;
    const assetSubtypeId3 = asset.asset_subtypes[2]?.id;

    if (filterProviders.length > 0 && !filterProviders.includes(providerId)) {
      return false;
    }

    if (
      filterPlatforms.length > 0 &&
      !platforms.some((platform) => filterPlatforms.includes(platform.id))
    ) {
      return false;
    }

    if (filterAssetTypes && Object.keys(filterAssetTypes).length > 0) {
      // Check if the asset has any of the selected asset types
      const hasSelectedAssetType =
        filterAssetTypes[assetTypeId] || filterAssetTypes[assetTypeId2];

      if (!hasSelectedAssetType) {
        return false;
      }

      // If the asset has a selected asset type, check if any subtypes are selected
      const selectedSubtypes = new Set<number>();

      // Collect all selected subtypes from both asset types
      if (filterAssetTypes[assetTypeId]) {
        filterAssetTypes[assetTypeId].subtypes.forEach((subtype) =>
          selectedSubtypes.add(subtype)
        );
      }
      if (filterAssetTypes[assetTypeId2]) {
        filterAssetTypes[assetTypeId2].subtypes.forEach((subtype) =>
          selectedSubtypes.add(subtype)
        );
      }

      // If subtypes are selected, check if the asset has any of them
      if (selectedSubtypes.size > 0) {
        const assetSubtypes = [
          assetSubtypeId,
          assetSubtypeId2,
          assetSubtypeId3,
        ].filter(Boolean);
        const hasMatchingSubtype = assetSubtypes.some((subtype) =>
          selectedSubtypes.has(subtype)
        );

        if (!hasMatchingSubtype) {
          return false;
        }
      }
    }

    // Check flags filter
    if (filterFlags) {
      // Check prefinancing flag
      if (
        filterFlags.prefinancing !== null &&
        asset.prefinancing !== filterFlags.prefinancing
      ) {
        return false;
      }

      // Check pretoken flag
      if (
        filterFlags.pretoken !== null &&
        asset.pretoken !== filterFlags.pretoken
      ) {
        return false;
      }

      // Check yield_bearing flag
      if (
        filterFlags.yield_bearing !== null &&
        asset.yield_bearing !== filterFlags.yield_bearing
      ) {
        return false;
      }
    }

    return true;
  });
};
