import type { MapRef } from "react-map-gl";
import { Source, Layer, Popup } from "react-map-gl";
import FiltersMobile from "./FiltersMobile";
import { useNewFiltersDispatch, useNewFiltersState } from "../../context/filters";
import clsx from "clsx";
import Footer from "../../Footer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMapState } from "../../context/map";
import { MapBox } from "../../shared/components/MapBox";
import Header from "../../Header";
import { AssetBioregionCard } from "./AssetBioregionCard";
import { Asset } from "../../modules/assets";
import { Org, Action } from "../../shared/types";
import { CompositeClusterLayer } from "../../shared/components/CompositeClusterLayer";
import {
  BioregionLayer,
  type BioregionProperties,
} from "../../shared/components/BioregionLayer";
import {
  getBioregionForAsset,
  getBioregionStats,
  loadBioregionGeoJSON,
} from "../../modules/intelligence/bioregionIntelligence";
import { loadEIIScores } from "../../lib/api";
import { BioregionPanel } from "./BioregionPanel";
import { MapFilterBar } from "./MapFilterBar";
import { ArrowRight, CaretLeft, CaretRight, CaretDown, MagnifyingGlass, Globe } from "@phosphor-icons/react";
import { ENTITY_COLORS } from "../../shared/components/CompositeClusterLayer";
import {
  AssetExploreCard,
  OrgExploreCard,
  ActionExploreCard,
  BioregionExploreCard,
  type BioregionListItem,
} from "./ExploreCards";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { EntityType } from "../../context/filters/filtersContext";
// EntityType still used for URL param handling

export default (): React.ReactElement => {
  const {
    filteredAssets,
    allAssets,
    filters,
    selectedAssetId,
    activeEntityTypes,
    activeActorTypes,
    allOrgs,
    allActions,
  } = useNewFiltersState();
  const dispatch = useNewFiltersDispatch();
  const mapRef = useRef<MapRef>();
  const { mapStyle } = useMapState();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Panel expand/collapse
  const [panelExpanded, setPanelExpanded] = useState(false);
  const panelWidth = panelExpanded ? 700 : 490;

  // Bioregion selection state
  const [selectedBioregion, setSelectedBioregion] =
    useState<BioregionProperties | null>(null);

  // Org/Action selection state
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  // Read ?entity= URL param on mount
  useEffect(() => {
    const entityParam = searchParams.get("entity") as EntityType | null;
    if (entityParam && ["all", "asset", "actor", "action"].includes(entityParam)) {
      dispatch({ type: "SET_ENTITY_TYPE", payload: entityParam });
    }
  }, []);

  useEffect(() => {
    window.dispatchEvent(new Event("resize"));
  }, [filters, selectedAssetId, selectedBioregion, activeEntityTypes]);

  // Auto-detect bioregion when an asset is selected via map marker click (no bioregion context)
  useEffect(() => {
    if (!selectedAssetId || selectedBioregion) return;
    const asset = allAssets.find((a) => a.id === selectedAssetId);
    if (!asset) return;
    getBioregionForAsset(asset).then((bio) => {
      if (bio) setSelectedBioregion(bio);
    });
  }, [selectedAssetId]);

  // Filter actions to only those with valid locations
  const actionsWithLocation = useMemo(
    () =>
      allActions.filter(
        (a) =>
          a.location &&
          typeof a.location.longitude === "number" &&
          typeof a.location.latitude === "number"
      ),
    [allActions]
  );

  // Static EII scores from /eii/scores.json (null = not loaded or file missing)
  const [eiiScores, setEiiScores] = useState<Record<string, { eii: number; delta?: number }> | null>(null);
  useEffect(() => {
    loadEIIScores().then(setEiiScores);
  }, []);

  // Bioregion list with EII and vault data
  const [bioregionGeoJSON, setBioregionGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  useEffect(() => {
    loadBioregionGeoJSON().then(setBioregionGeoJSON);
  }, []);

  const bioregionList = useMemo((): BioregionListItem[] => {
    if (!bioregionGeoJSON) return [];
    return bioregionGeoJSON.features
      .map((feature) => {
        const props = feature.properties as BioregionProperties;
        if (!props?.code) return null;
        // Use static JSON scores if available, else deterministic mock
        const staticScore = eiiScores?.[props.code];
        const hash = props.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const eii = staticScore?.eii ?? (0.35 + (hash % 50) * 0.01);
        const eiiDelta = staticScore?.delta ?? ((hash % 7) - 3) * 0.005;
        const hasVault = hash % 3 !== 0;
        const vaultTVL = hasVault ? 30000 + (hash % 200) * 1000 : null;
        // Count assets and actors in this bioregion
        const assetCount = filteredAssets.filter(a =>
          a.region?.toLowerCase().includes(props.name?.toLowerCase() || '') ||
          a.region?.startsWith(props.code.split('_')[0])
        ).length;
        const agentCount = 3 + (hash % 5);
        const orgCount = allOrgs.filter(o =>
          o.coordinates && props.centroid &&
          Math.abs(o.coordinates.latitude - props.centroid[1]) < 5 &&
          Math.abs(o.coordinates.longitude - props.centroid[0]) < 10
        ).length;
        const actorCount = orgCount + agentCount;

        return {
          ...props,
          eii,
          eiiDelta,
          vaultTVL,
          assetCount,
          actorCount,
        };
      })
      .filter((b): b is BioregionListItem => b !== null)
      .sort((a, b) => (b.vaultTVL ?? 0) - (a.vaultTVL ?? 0)); // Sort by vault TVL
  }, [bioregionGeoJSON, filteredAssets, allOrgs, eiiScores]);

  // Item count for the filter bar — reflects what's currently visible
  const itemCount = useMemo(() => {
    let count = 0;
    if (activeEntityTypes.has("asset")) {
      count += filteredAssets.length;
    }
    if (activeEntityTypes.has("actor")) {
      // Count based on active actor type toggles
      if (activeActorTypes.has("orgs")) {
        count += allOrgs.length;
      }
      if (activeActorTypes.has("agents")) {
        // Estimate agent count (sum of agents per bioregion with entities)
        const agentCount = bioregionList.reduce((sum, b) => sum + (3 + (b.code.charCodeAt(0) % 5)), 0);
        count += Math.min(agentCount, 50); // Cap at reasonable number
      }
    }
    if (activeEntityTypes.has("action")) {
      count += allActions.length;
    }
    return count;
  }, [activeEntityTypes, activeActorTypes, filteredAssets.length, allOrgs.length, allActions.length, bioregionList]);

  // Format bioregion stats for the filter bar
  const formattedBioregionStats = useMemo(() => {
    if (!selectedBioregion) return null;
    // Use static JSON scores if available, else deterministic mock
    const staticScore = eiiScores?.[selectedBioregion.code];
    const mockEII = staticScore?.eii ?? (0.45 + (selectedBioregion.code.charCodeAt(0) % 10) * 0.05);
    const mockDelta = staticScore?.delta ?? ((selectedBioregion.code.charCodeAt(1) % 5 - 2) * 0.01);
    const assetsInBioregion = filteredAssets.filter(a =>
      a.region?.startsWith(selectedBioregion.code.split('_')[0])
    ).length;
    const orgsInBioregion = allOrgs.filter(o =>
      o.coordinates && Math.abs(o.coordinates.latitude - (selectedBioregion.centroid?.[1] || 0)) < 5
    ).length;
    // Agent count using same deterministic formula as API mock
    const hash = selectedBioregion.code.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
    const agentsInBioregion = 3 + (hash % 5);
    // Actors = orgs + agents
    const actorCount = orgsInBioregion + agentsInBioregion;

    return {
      id: selectedBioregion.code,
      name: selectedBioregion.name || selectedBioregion.code,
      eii: mockEII,
      eiiDelta: mockDelta,
      assetCount: assetsInBioregion,
      actorCount,
    };
  }, [selectedBioregion, filteredAssets, allOrgs, eiiScores]);

  const handleAssetCardPinClick = (asset: Asset) => {
    dispatch({ type: "SET_SELECTED_ASSET", payload: asset.id });
    mapRef?.current?.flyTo({
      center: [asset.coordinates.longitude, asset?.coordinates?.latitude],
      zoom: 10,
    });
  };

  const handleAssetMarkerClick = useCallback(
    (assetId: string) => {
      dispatch({ type: "SET_SELECTED_ASSET", payload: assetId });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [dispatch]
  );

  const handleOrgClick = useCallback(
    ({ orgId, lng, lat }: { orgId: number; lng: number; lat: number }) => {
      setSelectedOrgId(orgId);
      mapRef?.current?.flyTo({ center: [lng, lat], zoom: 6 });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    []
  );

  const handleActionClick = useCallback(
    ({ actionId, lng, lat }: { actionId: string; lng: number; lat: number }) => {
      setSelectedActionId(actionId);
      mapRef?.current?.flyTo({ center: [lng, lat], zoom: 6 });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    []
  );

  const handleAgentClick = useCallback(
    (address: string) => {
      navigate(`/agents/${address}`);
    },
    [navigate]
  );

  const handleOrgCardClick = (org: Org) => {
    if (org.coordinates) {
      mapRef?.current?.flyTo({
        center: [org.coordinates.longitude, org.coordinates.latitude],
        zoom: 6,
      });
    }
  };

  const handleActionCardClick = (action: Action) => {
    if (action.location) {
      mapRef?.current?.flyTo({
        center: [action.location.longitude, action.location.latitude],
        zoom: 6,
      });
    }
  };

  const handleBioregionSelect = useCallback(
    (bioregion: BioregionProperties) => {
      setSelectedBioregion(bioregion);
    },
    []
  );

  const handleBioregionClose = useCallback(() => {
    setSelectedBioregion(null);
    dispatch({ type: "SET_SELECTED_ASSET", payload: "" });
    mapRef?.current?.flyTo({
      center: [15, 30],
      zoom: 1.6,
      duration: 800,
    });
  }, [dispatch]);

  const handleBioregionAssetSelect = useCallback(
    (asset: Asset) => {
      dispatch({ type: "SET_SELECTED_ASSET", payload: asset.id });
      // Keep selectedBioregion — context persists through drill-down
      mapRef?.current?.flyTo({
        center: [asset.coordinates.longitude, asset.coordinates.latitude],
        zoom: 10,
      });
    },
    [dispatch]
  );

  // Back from asset detail to bioregion panel — zoom out to bioregion extent
  const handleBackToBioregion = useCallback(() => {
    dispatch({ type: "SET_SELECTED_ASSET", payload: "" });
    if (selectedBioregion?.centroid) {
      mapRef?.current?.flyTo({
        center: selectedBioregion.centroid,
        zoom: 5,
        duration: 800,
      });
    }
  }, [dispatch, selectedBioregion]);

  // Reorder orgs/actions to put selected one first
  const orgsToDisplay = useMemo(() => {
    if (!selectedOrgId) return allOrgs;
    const selected = allOrgs.find((o) => o.id === selectedOrgId);
    if (!selected) return allOrgs;
    return [selected, ...allOrgs.filter((o) => o.id !== selectedOrgId)];
  }, [allOrgs, selectedOrgId]);

  const actionsToDisplay = useMemo(() => {
    if (!selectedActionId) return allActions;
    const selected = allActions.find((a) => a.id === selectedActionId);
    if (!selected) return allActions;
    return [selected, ...allActions.filter((a) => a.id !== selectedActionId)];
  }, [allActions, selectedActionId]);

  // The currently selected asset (for three-state rendering)
  const selectedAsset = useMemo(
    () => (selectedAssetId ? allAssets.find((a) => a.id === selectedAssetId) ?? null : null),
    [selectedAssetId, allAssets]
  );

  // Sibling count: other assets in the same bioregion (excluding the selected one)
  const [siblingCount, setSiblingCount] = useState(0);
  useEffect(() => {
    if (!selectedAsset || !selectedBioregion) {
      setSiblingCount(0);
      return;
    }
    loadBioregionGeoJSON().then((geojson) => {
      const stats = getBioregionStats(selectedBioregion.code, allAssets, geojson);
      if (stats) setSiblingCount(Math.max(0, stats.assetCount - 1));
    });
  }, [selectedAsset, selectedBioregion, allAssets]);

  // Flat mercator for second-order assets, globe otherwise
  const mapProjection = selectedAsset?.second_order
    ? { name: "mercator" as const }
    : { name: "globe" as const };

  const isSecondOrder = !!selectedAsset?.second_order;

  // GeoJSON for parent asset dots (second-order assets only)
  const parentAssetGeoJSON = useMemo(() => {
    if (!selectedAsset?.second_order || selectedAsset.parent_assets.length === 0) return null;
    return {
      type: "FeatureCollection" as const,
      features: selectedAsset.parent_assets
        .filter((p) => p.coordinates)
        .map((p) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [p.coordinates.longitude, p.coordinates.latitude],
          },
          properties: { id: p.id, name: p.name },
        })),
    };
  }, [selectedAsset]);

  // Hover state for parent asset dots
  const [hoveredDot, setHoveredDot] = useState<{
    lng: number; lat: number; name: string; id: string;
  } | null>(null);

  // Map click handler — navigates to parent asset when dot is clicked
  const handleMapClick = useCallback(
    (e: any) => {
      if (!isSecondOrder) return;
      const feature = e.features?.[0];
      if (!feature?.properties?.id) return;
      const assetId = String(feature.properties.id);
      setHoveredDot(null);
      dispatch({ type: "SET_SELECTED_ASSET", payload: assetId });
      const target = allAssets.find((a) => a.id === assetId);
      if (target) {
        mapRef?.current?.flyTo({
          center: [target.coordinates.longitude, target.coordinates.latitude],
          zoom: 10,
          duration: 800,
        });
      } else if (feature.geometry?.type === "Point") {
        // Parent not in allAssets — fly to its coordinates
        const [lng, lat] = feature.geometry.coordinates;
        mapRef?.current?.flyTo({ center: [lng, lat], zoom: 10, duration: 800 });
      }
    },
    [isSecondOrder, dispatch, allAssets]
  );

  // Mouse move over parent dots — show hover preview
  const handleMapMouseMove = useCallback(
    (e: any) => {
      if (!isSecondOrder) return;
      const feature = e.features?.[0];
      if (feature?.properties?.id && feature.geometry?.type === "Point") {
        const [lng, lat] = feature.geometry.coordinates;
        setHoveredDot({
          lng, lat,
          name: feature.properties.name ?? "Asset",
          id: String(feature.properties.id),
        });
      } else {
        setHoveredDot(null);
      }
    },
    [isSecondOrder]
  );

  const handleMapMouseLeave = useCallback(() => {
    setHoveredDot(null);
  }, []);

  const showLeftPanel =
    selectedBioregion ||
    selectedAssetId ||
    selectedOrgId ||
    selectedActionId;

  // Accordion: priority order Bioregions > Assets > Actions > Actors, one open at a time
  type AccordionSection = "bioregion" | "asset" | "action" | "actor";
  const [openSection, setOpenSection] = useState<AccordionSection | null>(null);

  // Auto-select highest priority section when panel content changes
  useEffect(() => {
    if (selectedBioregion) return; // accordion only used in card-list mode
    if (bioregionList.length > 0) {
      setOpenSection("bioregion");
    } else if (activeEntityTypes.has("asset") && filteredAssets.length > 0) {
      setOpenSection("asset");
    } else if (activeEntityTypes.has("action") && actionsToDisplay.length > 0) {
      setOpenSection("action");
    } else if (activeEntityTypes.has("actor") && orgsToDisplay.length > 0) {
      setOpenSection("actor");
    } else {
      setOpenSection(null);
    }
  }, [activeEntityTypes, selectedBioregion, bioregionList.length]);

  const [accordionSearch, setAccordionSearch] = useState("");

  const toggleSection = (section: AccordionSection) => {
    setAccordionSearch("");
    setOpenSection((prev) => (prev === section ? null : section));
  };

  return (
    <>
      <Header />
      <div className="main-container lg:!px-0">
        <div
          className={clsx(
            "pt-[60px] lg:pt-[36px]",
            "md:grid md:grid-cols-2 md:gap-4 lg:gap-0",
            `lg:grid-cols-[var(--panel-w)_1fr] xl:grid-cols-[var(--panel-w)_1fr]`,
            "transition-[grid-template-columns] duration-300"
          )}
          style={{ "--panel-w": `${panelWidth}px` } as React.CSSProperties}
        >
          <div
            className={clsx(
              "md:order-3 md:self-start md:row-start-2 md:row-end-3 lg:row-start-1 lg:row-end-2",
              !showLeftPanel && "md:!col-span-2"
            )}
            onClick={() => panelExpanded && setPanelExpanded(false)}
          >
            <div
              className={clsx(
                "w-full overflow-hidden",
                "map-wrapper",
                showLeftPanel &&
                  "md:fixed md:top-[100px] md:right-4 md:w-[calc(50vw-32px)] md:h-[calc(100vh-136px)]",
                showLeftPanel && "lg:h-[calc(100vh-72px)]",
                showLeftPanel && "lg:top-[36px] lg:left-[var(--panel-w)] lg:w-[calc(100vw-var(--panel-w))]",
                "transition-[width] duration-300"
              )}
            >
              <MapBox
                mapStyle={mapStyle}
                initialViewState={{
                  longitude: 15,
                  latitude: 30,
                  zoom: 1.6,
                }}
                showMapStyleSwitch={true}
                mapRef={mapRef as React.RefObject<MapRef>}
                projection={mapProjection}
                interactiveLayerIds={isSecondOrder ? ["parent-asset-dots-circle"] : undefined}
                onClick={isSecondOrder ? handleMapClick : undefined}
                onMouseMove={isSecondOrder ? handleMapMouseMove : undefined}
                onMouseLeave={isSecondOrder ? handleMapMouseLeave : undefined}
                cursor={isSecondOrder && hoveredDot ? "pointer" : undefined}
              >
                {/* Map filter bar (desktop) */}
                <MapFilterBar
                  itemCount={itemCount}
                  selectedBioregion={formattedBioregionStats}
                />

                {/* Hide bioregion + cluster layers when viewing second-order assets */}
                {!isSecondOrder && (
                  <>
                    <BioregionLayer
                      selectedBioregion={selectedBioregion?.code ?? null}
                      allAssets={filteredAssets}
                      allOrgs={allOrgs}
                      activeEntityTypes={activeEntityTypes}
                      activeActorTypes={activeActorTypes}
                      onBioregionSelect={handleBioregionSelect}
                    />

                    <CompositeClusterLayer
                      assets={filteredAssets.filter((asset) => !asset.second_order)}
                      orgs={allOrgs}
                      actions={actionsWithLocation}
                      activeTypes={activeEntityTypes}
                      onAssetClick={handleAssetMarkerClick}
                      onOrgClick={handleOrgClick}
                      onActionClick={handleActionClick}
                    />

                    {/* Agent markers removed - agents counted with bioregions instead */}
                  </>
                )}

                {/* Clickable parent asset dots for second-order navigation */}
                {parentAssetGeoJSON && (
                  <Source id="parent-asset-dots" type="geojson" data={parentAssetGeoJSON}>
                    <Layer
                      id="parent-asset-dots-circle"
                      type="circle"
                      paint={{
                        "circle-radius": 6,
                        "circle-color": "#93c5fd",
                        "circle-stroke-color": "#ffffff",
                        "circle-stroke-width": 1.5,
                        "circle-opacity": 0.9,
                      }}
                    />
                  </Source>
                )}

                {/* Hover popup for parent asset dots */}
                {hoveredDot && (
                  <Popup
                    longitude={hoveredDot.lng}
                    latitude={hoveredDot.lat}
                    offset={12}
                    closeButton={false}
                    closeOnClick={false}
                    className="parent-dot-popup"
                  >
                    <div className="text-xs font-medium text-gray-800 px-1 py-0.5 max-w-[200px] truncate">
                      {hoveredDot.name}
                    </div>
                  </Popup>
                )}
              </MapBox>
            </div>
          </div>
          <div
            className={clsx(
              "h-[60px] z-10 md:row-start-1 md:row-end-2 md:order-1 md:col-span-2 lg:hidden",
              "md:h-0"
            )}
          >
            <div
              className={clsx(
                "filters-row-mobile bg-background",
                "md:fixed md:!top-[70px] md:left-0 md:w-full md:!px-4"
              )}
            >
              <FiltersMobile />
            </div>
          </div>
          <div
            className={clsx(
              "md:order-2 md:row-start-2 lg:row-start-1 lg:row-end-2 md:row-end-3",
              "lg:bg-cardBackground lg:h-[calc(100vh-72px)] lg:flex lg:flex-col lg:overflow-hidden",
              !showLeftPanel && "md:hidden",
              "relative"
            )}
          >
            {/* Expand/collapse toggle — only mount when panel is visible; fixed position sits above the map's stacking context */}
            {showLeftPanel && (
              <button
                onClick={() => setPanelExpanded((prev) => !prev)}
                className="hidden lg:flex items-center justify-center fixed top-1/2 -translate-y-1/2 z-[60] w-6 h-12 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-md hover:bg-gray-50 transition-all duration-300 cursor-pointer"
                style={{ left: `${panelWidth - 12}px` }}
              >
                {panelExpanded ? <CaretLeft size={14} className="text-gray-500" /> : <CaretRight size={14} className="text-gray-500" />}
              </button>
            )}
            {/* Navigation bar */}
            {selectedBioregion && (
              <div className="flex items-center gap-2 px-3 h-8 bg-gray-900 text-white text-xs shrink-0">
                <button
                  onClick={selectedAsset ? handleBackToBioregion : handleBioregionClose}
                  className="flex items-center gap-1 text-white/60 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <ArrowRight size={10} className="rotate-180" />
                  <span>{selectedAsset ? selectedBioregion.name : "Explore"}</span>
                </button>
                <span className="text-white/30">/</span>
                <span className="font-medium truncate">
                  {selectedAsset ? selectedAsset.name : selectedBioregion.name}
                </span>
              </div>
            )}

            {/* Three-state panel: bioregion+asset → card, bioregion → panel, else → card lists */}
            {selectedBioregion && selectedAsset ? (
              <AssetBioregionCard
                asset={selectedAsset}
                bioregion={{
                  name: selectedBioregion.name,
                  code: selectedBioregion.code,
                  color: selectedBioregion.color,
                  realm_name: selectedBioregion.realm_name,
                }}
                siblingCount={siblingCount}
                onBackToBioregion={handleBackToBioregion}
                onAssetSelect={(assetId: string) => {
                  dispatch({ type: "SET_SELECTED_ASSET", payload: assetId });
                  const target = allAssets.find((a) => a.id === assetId);
                  if (!target) return;
                  if (target.second_order && target.parent_assets.length > 0) {
                    const coords = target.parent_assets
                      .filter((p) => p.coordinates)
                      .map((p) => [p.coordinates.longitude, p.coordinates.latitude] as [number, number]);
                    if (coords.length > 0) {
                      const lngs = coords.map((c) => c[0]);
                      const lats = coords.map((c) => c[1]);
                      mapRef?.current?.fitBounds(
                        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
                        { padding: 60, maxZoom: 8, duration: 800 }
                      );
                    }
                  } else {
                    mapRef?.current?.flyTo({
                      center: [target.coordinates.longitude, target.coordinates.latitude],
                      zoom: 10,
                    });
                  }
                }}
              />
            ) : selectedBioregion ? (
              <BioregionPanel
                bioregionCode={selectedBioregion.code}
                bioregionName={selectedBioregion.name}
                bioregionColor={selectedBioregion.color}
                bioregionRealmName={selectedBioregion.realm_name}
                allAssets={allAssets}
                allOrgs={allOrgs}
                allActions={allActions}
                onClose={handleBioregionClose}
                onAssetSelect={handleBioregionAssetSelect}
                onAgentClick={handleAgentClick}
              />
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Bioregions */}
                {bioregionList.length > 0 && (
                  <>
                    <button
                      onClick={() => toggleSection("bioregion")}
                      className="w-full flex items-center justify-between px-4 h-8 text-sm font-semibold text-white shrink-0 bg-esv-600"
                    >
                      <span className="flex items-center gap-1.5">
                        <Globe size={14} />
                        Bioregions ({bioregionList.length})
                      </span>
                      <CaretDown
                        size={14}
                        className={clsx(
                          "transition-transform",
                          openSection === "bioregion" && "rotate-180"
                        )}
                      />
                    </button>
                    {openSection === "bioregion" && (() => {
                      const q = accordionSearch.toLowerCase();
                      const items = q
                        ? bioregionList.filter((b) => b.name?.toLowerCase().includes(q) || b.realm_name?.toLowerCase().includes(q))
                        : bioregionList;
                      return (
                        <div className="flex-1 min-h-0 flex flex-col">
                          <div className="relative shrink-0 border-b border-gray-200">
                            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={accordionSearch}
                              onChange={(e) => setAccordionSearch(e.target.value)}
                              placeholder="Search bioregions..."
                              className="w-full pl-8 pr-3 py-2 text-xs bg-white focus:outline-none"
                            />
                          </div>
                          <div className="flex-1 min-h-0 overflow-y-auto">
                            {items.map((bioregion) => (
                              <BioregionExploreCard
                                key={bioregion.code}
                                bioregion={bioregion}
                                onSelect={() => {
                                  // Navigate to vault page
                                  navigate(`/vaults/${bioregion.code}`);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* Assets */}
                {activeEntityTypes.has("asset") && filteredAssets.length > 0 && (
                  <>
                    <button
                      onClick={() => toggleSection("asset")}
                      className="w-full flex items-center justify-between px-4 h-8 text-sm font-semibold text-white shrink-0"
                      style={{ backgroundColor: ENTITY_COLORS.asset.primary }}
                    >
                      <span>Assets ({filteredAssets.length})</span>
                      <CaretDown
                        size={14}
                        className={clsx(
                          "transition-transform",
                          openSection === "asset" && "rotate-180"
                        )}
                      />
                    </button>
                    {openSection === "asset" && (() => {
                      const q = accordionSearch.toLowerCase();
                      const items = q
                        ? filteredAssets.filter((a) => a.name.toLowerCase().includes(q))
                        : filteredAssets;
                      return (
                        <div className="flex-1 min-h-0 flex flex-col">
                          <div className="relative shrink-0 border-b border-gray-200">
                            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={accordionSearch}
                              onChange={(e) => setAccordionSearch(e.target.value)}
                              placeholder="Search assets..."
                              className="w-full pl-8 pr-3 py-2 text-xs bg-white focus:outline-none"
                            />
                          </div>
                          <div className="flex-1 min-h-0 overflow-y-auto">
                            {items.map((asset) => (
                              <AssetExploreCard
                                key={asset.id}
                                asset={asset}
                                onLocate={() => handleAssetCardPinClick(asset)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* Actions */}
                {activeEntityTypes.has("action") && actionsToDisplay.length > 0 && (
                  <>
                    <button
                      onClick={() => toggleSection("action")}
                      className="w-full flex items-center justify-between px-4 h-8 text-sm font-semibold text-white shrink-0"
                      style={{ backgroundColor: ENTITY_COLORS.action.primary }}
                    >
                      <span>Actions ({actionsToDisplay.length})</span>
                      <CaretDown
                        size={14}
                        className={clsx(
                          "transition-transform",
                          openSection === "action" && "rotate-180"
                        )}
                      />
                    </button>
                    {openSection === "action" && (() => {
                      const q = accordionSearch.toLowerCase();
                      const items = q
                        ? actionsToDisplay.filter((a) => (a.title ?? a.id).toLowerCase().includes(q))
                        : actionsToDisplay;
                      return (
                        <div className="flex-1 min-h-0 flex flex-col">
                          <div className="relative shrink-0 border-b border-gray-200">
                            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={accordionSearch}
                              onChange={(e) => setAccordionSearch(e.target.value)}
                              placeholder="Search actions..."
                              className="w-full pl-8 pr-3 py-2 text-xs bg-white focus:outline-none"
                            />
                          </div>
                          <div className="flex-1 min-h-0 overflow-y-auto">
                            {items.map((action) => (
                              <ActionExploreCard
                                key={action.id}
                                action={action}
                                onLocate={() => handleActionCardClick(action)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                {/* Actors */}
                {activeEntityTypes.has("actor") && orgsToDisplay.length > 0 && (
                  <>
                    <button
                      onClick={() => toggleSection("actor")}
                      className="w-full flex items-center justify-between px-4 h-8 text-sm font-semibold text-white shrink-0"
                      style={{ backgroundColor: ENTITY_COLORS.actor.primary }}
                    >
                      <span>Actors ({orgsToDisplay.length})</span>
                      <CaretDown
                        size={14}
                        className={clsx(
                          "transition-transform",
                          openSection === "actor" && "rotate-180"
                        )}
                      />
                    </button>
                    {openSection === "actor" && (() => {
                      const q = accordionSearch.toLowerCase();
                      const items = q
                        ? orgsToDisplay.filter((o) => o.name.toLowerCase().includes(q))
                        : orgsToDisplay;
                      return (
                        <div className="flex-1 min-h-0 flex flex-col">
                          <div className="relative shrink-0 border-b border-gray-200">
                            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={accordionSearch}
                              onChange={(e) => setAccordionSearch(e.target.value)}
                              placeholder="Search actors..."
                              className="w-full pl-8 pr-3 py-2 text-xs bg-white focus:outline-none"
                            />
                          </div>
                          <div className="flex-1 min-h-0 overflow-y-auto">
                            {items.map((org) => (
                              <OrgExploreCard
                                key={org.id}
                                org={org}
                                onLocate={() => handleOrgCardClick(org)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Footer — pinned to bottom */}
      <div className="hidden lg:block w-full fixed left-0 bottom-0 z-50 h-[36px] bg-background">
        <Footer />
      </div>
    </>
  );
};
