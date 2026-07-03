import { ArrowRight, CaretDown, CaretLeft, CaretRight, Globe, MagnifyingGlass } from "@phosphor-icons/react";
import { ArrowsLeftRight, Coffee, Cpu } from "@phosphor-icons/react";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapRef } from "react-map-gl";
import { Layer, Popup, Source } from "react-map-gl";
import { useNavigate, useSearchParams } from "react-router-dom";
import Footer from "../Footer";
import Header from "../Header";
import { ActivityPanel } from "../aqueduct/components/ActivityPanel";
import {
  AQUEDUCT_SECTION_COLORS,
  ActorExploreCard,
  IntentExploreCard,
  LotExploreCard,
} from "../aqueduct/components/AqueductExploreCards";
import { AqueductFilterBar } from "../aqueduct/components/AqueductFilterBar";
import { AqueductLotsLayer } from "../aqueduct/components/AqueductLotsLayer";
import { AqueductNetworkLayer } from "../aqueduct/components/AqueductNetworkLayer";
import { GlowFarmsLayer, SolarFarmRow, buildGlowFarmLots } from "../aqueduct/components/GlowFarmsLayer";
import { MapLegend } from "../aqueduct/components/MapLegend";
import { TourDock } from "../aqueduct/components/TourDock";
import { useAqueductEconomy } from "../aqueduct/hooks/useAqueductEconomy";
import {
  matchesInstitution,
  matchesIntent,
  matchesLot,
  useAqueductFilters,
} from "../aqueduct/state/aqueductFiltersStore";
import { useNewFiltersDispatch, useNewFiltersState } from "../context/filters";
import type { ActorTypeKey, EntityType, EntityTypeKey } from "../context/filters/filtersContext";
import { useMapState } from "../context/map";
import { loadEIIScores } from "../lib/api";
import type { Asset } from "../modules/assets";
import {
  findBioregionForPoint,
  getBioregionForAsset,
  getBioregionStats,
  loadBioregionGeoJSON,
} from "../modules/intelligence/bioregionIntelligence";
import { BioregionLayer, type BioregionProperties } from "../shared/components/BioregionLayer";
import { CompositeClusterLayer } from "../shared/components/CompositeClusterLayer";
import { MapBox } from "../shared/components/MapBox";
import { BIOREGION_PROXIMITY } from "../shared/consts";
import type { Action, Org } from "../shared/types";
import { ActionBioregionCard } from "./ActionBioregionCard";
import { AssetBioregionCard } from "./AssetBioregionCard";
import { BioregionPanel } from "./BioregionPanel";
import { BioregionExploreCard, type BioregionListItem } from "./ExploreCards";
import { OrgBioregionCard } from "./OrgBioregionCard";
// EntityType still used for URL param handling

export default ({ experimentalMode = false }: { experimentalMode?: boolean } = {}): React.ReactElement => {
  const { filteredAssets, allAssets, filters, selectedAssetId, activeEntityTypes, allOrgs, allActions } =
    useNewFiltersState();
  const dispatch = useNewFiltersDispatch();
  const [showPrimaryAssets] = useState(true);
  // Aqueduct filter store (singleton) — this route's Lots/Routes/Institutions
  // ontology. Explore subscribes so the rail sections, their counts, and the
  // base-Atlas investable overlay all re-render live on any filter toggle.
  const aqFilters = useAqueductFilters();
  const { activeCategories, atlasInvestableOverlay } = aqFilters;
  const mapRef = useRef<MapRef>();
  const { mapStyle } = useMapState();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Panel expand/collapse
  const [panelExpanded, setPanelExpanded] = useState(false);
  const panelWidth = panelExpanded ? 700 : 490;

  // Bioregion selection state
  const [selectedBioregion, setSelectedBioregion] = useState<BioregionProperties | null>(null);

  // Org/Action selection state
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [bioregionDefaultTab, setBioregionDefaultTab] = useState<"overview" | "assets" | "actors" | "actions">(
    "overview",
  );

  // Read ?entity= URL param on mount
  useEffect(() => {
    const entityParam = searchParams.get("entity") as EntityType | null;
    if (entityParam && ["all", "asset", "actor", "action"].includes(entityParam)) {
      dispatch({ type: "SET_ENTITY_TYPE", payload: entityParam });
    }
  }, []);

  useEffect(() => {
    window.dispatchEvent(new Event("resize"));
  }, [filters, selectedAssetId, selectedBioregion, activeEntityTypes, panelExpanded]);

  // Trigger map resize after panel transition completes
  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef?.current?.resize();
    }, 350);
    return () => clearTimeout(timer);
  }, [panelExpanded, selectedBioregion]);

  // Auto-detect bioregion when an asset is selected via map marker click (no bioregion context)
  useEffect(() => {
    if (!selectedAssetId || selectedBioregion) return;
    const asset = allAssets.find((a) => a.id === selectedAssetId);
    if (!asset) return;
    getBioregionForAsset(asset).then((bio) => {
      if (bio) setSelectedBioregion(bio);
    });
  }, [selectedAssetId]);

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
        // Count assets near this bioregion centroid
        const assetCount = filteredAssets.filter(
          (a) =>
            a.coordinates &&
            props.centroid &&
            Math.abs(a.coordinates.latitude - props.centroid[1]) < BIOREGION_PROXIMITY.lat &&
            Math.abs(a.coordinates.longitude - props.centroid[0]) < BIOREGION_PROXIMITY.lng,
        ).length;
        // Count orgs near this bioregion + 1 for owockibot
        const orgCount = allOrgs.filter(
          (o) =>
            o.coordinates &&
            props.centroid &&
            Math.abs(o.coordinates.latitude - props.centroid[1]) < BIOREGION_PROXIMITY.lat &&
            Math.abs(o.coordinates.longitude - props.centroid[0]) < BIOREGION_PROXIMITY.lng,
        ).length;
        const actorCount = orgCount + 1; // +1 for owockibot
        // Count actions near this bioregion
        const actionCount = allActions.filter(
          (a) =>
            a.location &&
            props.centroid &&
            Math.abs(a.location.latitude - props.centroid[1]) < BIOREGION_PROXIMITY.lat &&
            Math.abs(a.location.longitude - props.centroid[0]) < BIOREGION_PROXIMITY.lng,
        ).length;

        return {
          ...props,
          assetCount,
          actorCount,
          actionCount,
          eii: 0,
          eiiDelta: 0,
          vaultTVL: null,
        };
      })
      .filter((b): b is BioregionListItem => b !== null)
      .sort((a, b) => b.assetCount + b.actionCount - (a.assetCount + a.actionCount));
  }, [bioregionGeoJSON, filteredAssets, allOrgs, allActions]);

  const handleAssetMarkerClick = useCallback(
    (assetId: string) => {
      dispatch({ type: "SET_SELECTED_ASSET", payload: assetId });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [dispatch],
  );

  const handleOrgClick = useCallback(({ orgId, lng, lat }: { orgId: number; lng: number; lat: number }) => {
    setSelectedOrgId(orgId);
    mapRef?.current?.flyTo({ center: [lng, lat], zoom: 6 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleActionClick = useCallback(({ actionId, lng, lat }: { actionId: string; lng: number; lat: number }) => {
    setSelectedActionId(actionId);
    mapRef?.current?.flyTo({ center: [lng, lat], zoom: 6 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleAgentClick = useCallback(
    (address: string) => {
      navigate(`/agents/${address}`);
    },
    [navigate],
  );

  const handleActionCardClick = useCallback(
    (action: Action) => {
      if (!action.location) return;
      const { longitude, latitude } = action.location;
      mapRef?.current?.flyTo({ center: [longitude, latitude], zoom: 6 });

      // Detect bioregion and open panel with actions tab
      setBioregionDefaultTab("actions");
      if (bioregionGeoJSON) {
        const feature = findBioregionForPoint(longitude, latitude, bioregionGeoJSON);
        if (feature?.properties) {
          const p = feature.properties as Record<string, any>;
          setSelectedBioregion({
            code: p.code,
            name: p.name ?? p.code,
            realm: p.realm,
            realm_name: p.realm_name,
            color: p.color,
            centroid: typeof p.centroid === "string" ? JSON.parse(p.centroid) : p.centroid,
          });
        }
      }
    },
    [bioregionGeoJSON],
  );

  const handleBioregionSelect = useCallback((bioregion: BioregionProperties) => {
    setBioregionDefaultTab("overview");
    setSelectedBioregion(bioregion);
    if (bioregion.centroid) {
      mapRef.current?.flyTo({
        center: bioregion.centroid,
        zoom: 4.5,
        duration: 1200,
      });
    }
  }, []);

  const handleBioregionClose = useCallback(() => {
    setSelectedBioregion(null);
    setSelectedOrgId(null);
    setSelectedActionId(null);
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
    [dispatch],
  );

  // Back from asset detail to bioregion panel — zoom out to bioregion extent
  const handleBackToBioregion = useCallback(() => {
    dispatch({ type: "SET_SELECTED_ASSET", payload: "" });
    setSelectedActionId(null);
    setSelectedOrgId(null);
    if (selectedBioregion?.centroid) {
      mapRef?.current?.flyTo({
        center: selectedBioregion.centroid,
        zoom: 5,
        duration: 800,
      });
    }
  }, [dispatch, selectedBioregion]);

  // Action detail select — parallel to handleBioregionAssetSelect
  const handleActionDetailSelect = useCallback((action: Action) => {
    setSelectedActionId(action.id);
    if (action.location) {
      mapRef?.current?.flyTo({
        center: [action.location.longitude, action.location.latitude],
        zoom: 6,
      });
    }
  }, []);

  // Org detail select — parallel to handleBioregionAssetSelect
  const handleOrgDetailSelect = useCallback((org: Org) => {
    setSelectedOrgId(org.id);
    if (org.coordinates) {
      mapRef?.current?.flyTo({
        center: [org.coordinates.longitude, org.coordinates.latitude],
        zoom: 8,
      });
    }
  }, []);

  // The base-Atlas action-filter UI (protocol/SDG/time) is gone from this route,
  // so `actionFilters` no longer exists — this memo now just reorders the selected
  // action to the front. It still feeds `actionsWithLocation`, which the
  // still-mounted BioregionLayer/CompositeClusterLayer consume (they render no
  // actions here, but the props stay wired).
  const actionsToDisplay = useMemo(() => {
    if (selectedActionId) {
      const selected = allActions.find((a) => a.id === selectedActionId);
      if (selected) return [selected, ...allActions.filter((a) => a.id !== selectedActionId)];
    }
    return allActions;
  }, [allActions, selectedActionId]);

  // Expand filtered assets to include parent assets of second-order assets
  const expandedFilteredAssets = useMemo(() => {
    if (!showPrimaryAssets) return filteredAssets;
    const ids = new Set(filteredAssets.map((a) => a.id));
    const extras: typeof allAssets = [];
    for (const asset of filteredAssets) {
      if (asset.second_order && asset.parent_assets) {
        for (const parent of asset.parent_assets) {
          if (!ids.has(parent.id)) {
            const full = allAssets.find((a) => a.id === parent.id);
            if (full) {
              extras.push(full);
              ids.add(parent.id);
            }
          }
        }
      }
    }
    return extras.length > 0 ? [...filteredAssets, ...extras] : filteredAssets;
  }, [filteredAssets, allAssets, showPrimaryAssets]);

  // Base-Atlas investable overlay (default off, driven by the store's
  // `atlasInvestableOverlay`). These memos always compute the investable subset;
  // the overlay chip governs VISIBILITY via `overlayActiveTypes` below — when the
  // overlay is off the cluster layer gets an empty active-type set and renders
  // nothing, so the subset is only ever painted when the chip is on. Investable =
  // an asset carrying a real financial-instrument flag (prefinancing/pretoken/
  // yield_bearing), or an org with a populated treasury.
  const investableFilteredAssets = useMemo(
    () => expandedFilteredAssets.filter((a) => a.prefinancing || a.pretoken || a.yield_bearing),
    [expandedFilteredAssets],
  );
  const investableOrgs = useMemo(() => allOrgs.filter((o) => o.treasury && o.treasury.length > 0), [allOrgs]);

  // Stable Set references for the map layers (never inline `new Set()` in JSX —
  // a fresh reference every render defeats the layers' memoization). The overlay
  // shows asset+actor clusters when on, nothing when off; the BioregionLayer gets
  // empty active sets so its polygons/labels survive but its count badges zero.
  const overlayActiveTypes = useMemo<Set<EntityTypeKey>>(
    () => (atlasInvestableOverlay ? new Set<EntityTypeKey>(["asset", "actor"]) : new Set<EntityTypeKey>()),
    [atlasInvestableOverlay],
  );
  const emptyEntityTypes = useMemo<Set<EntityTypeKey>>(() => new Set<EntityTypeKey>(), []);
  const emptyActorTypes = useMemo<Set<ActorTypeKey>>(() => new Set<ActorTypeKey>(), []);

  // Filter actions to only those with valid locations (respecting action filters)
  const actionsWithLocation = useMemo(
    () =>
      actionsToDisplay.filter(
        (a) => a.location && typeof a.location.longitude === "number" && typeof a.location.latitude === "number",
      ),
    [actionsToDisplay],
  );

  // The currently selected asset (for three-state rendering)
  const selectedAsset = useMemo(
    () => (selectedAssetId ? allAssets.find((a) => a.id === selectedAssetId) ?? null : null),
    [selectedAssetId, allAssets],
  );

  const selectedOrg = useMemo(
    () => (selectedOrgId ? allOrgs.find((o) => o.id === selectedOrgId) ?? null : null),
    [selectedOrgId, allOrgs],
  );

  const selectedOrgSiblings = useMemo(() => {
    if (!selectedOrg || !selectedBioregion?.centroid) return [];
    return allOrgs.filter(
      (o) =>
        o.id !== selectedOrg.id &&
        o.coordinates &&
        Math.abs(o.coordinates.latitude - selectedBioregion.centroid![1]) < 5 &&
        Math.abs(o.coordinates.longitude - selectedBioregion.centroid![0]) < 10,
    );
  }, [selectedOrg, selectedBioregion, allOrgs]);

  const selectedAction = useMemo(
    () => (selectedActionId ? allActions.find((a) => a.id === selectedActionId) ?? null : null),
    [selectedActionId, allActions],
  );

  // Build action group (same location + base title) and sibling actions for the detail card
  const selectedActionGroup = useMemo(() => {
    if (!selectedAction) return [];
    const groupKey = (a: Action) => {
      const base = (a.title || "")
        .replace(/\s*[-—]\s*\d{4}\s*$/, "")
        .replace(/\s+\d{4}\s*$/, "")
        .trim();
      const loc = a.location ? `${a.location.latitude.toFixed(2)},${a.location.longitude.toFixed(2)}` : "noloc";
      return `${base}||${loc}`;
    };
    const bioregionActions = selectedBioregion?.centroid
      ? allActions.filter(
          (a) =>
            a.location &&
            Math.abs(a.location.latitude - selectedBioregion.centroid![1]) < 5 &&
            Math.abs(a.location.longitude - selectedBioregion.centroid![0]) < 10,
        )
      : allActions;
    const selectedKey = groupKey(selectedAction);
    return bioregionActions.filter((a) => groupKey(a) === selectedKey);
  }, [selectedAction, selectedBioregion, allActions]);

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
  const mapProjection = selectedAsset?.second_order ? { name: "mercator" as const } : { name: "globe" as const };

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
    lng: number;
    lat: number;
    name: string;
    id: string;
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
      if (target?.coordinates) {
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
    [isSecondOrder, dispatch, allAssets],
  );

  // Mouse move over parent dots — show hover preview
  const handleMapMouseMove = useCallback(
    (e: any) => {
      if (!isSecondOrder) return;
      const feature = e.features?.[0];
      if (feature?.properties?.id && feature.geometry?.type === "Point") {
        const [lng, lat] = feature.geometry.coordinates;
        setHoveredDot({
          lng,
          lat,
          name: feature.properties.name ?? "Asset",
          id: String(feature.properties.id),
        });
      } else {
        setHoveredDot(null);
      }
    },
    [isSecondOrder],
  );

  const handleMapMouseLeave = useCallback(() => {
    setHoveredDot(null);
  }, []);

  // Always show panel on lg (accordion is default content). On md, only when detail selected.
  const showLeftPanel = true;

  // Aqueduct economy — lots / intents & routes / solvers & venues for the rail
  const economy = useAqueductEconomy();

  // The rail reads through the SAME predicate module the map layers do (one
  // predicate, three consumers → rail/map/bar counts always agree). Memoized on
  // the economy slice + the filter snapshot; the snapshot changes only on a user
  // toggle, so these never churn. A category toggled off zeroes its section
  // BOTH by emptying the array here AND by the `activeCategories` gate in the JSX
  // (which also removes the section header) — rail and map vanish in one click.
  const filteredLots = useMemo(() => economy.lots.filter((l) => matchesLot(l, aqFilters)), [economy.lots, aqFilters]);
  // Glow solar farms as the second commodity vertical. Same `buildGlowFarmLots()`
  // source the map's GlowFarmsLayer reads, run through the SAME `matchesLot`
  // predicate — so the rail Lots count and the map's solar markers are always the
  // same N (e.g. commodity→solar-only leaves exactly 10 in both; an EUDR filter
  // derives "gap" for every farm and drops them all from both at once).
  const glowFarmLots = useMemo(() => buildGlowFarmLots(), []);
  const filteredGlowFarms = useMemo(
    () => glowFarmLots.filter((l) => matchesLot(l, aqFilters)),
    [glowFarmLots, aqFilters],
  );
  // Combined Lots-section size = coffee/sim lots + solar farms (both live under the
  // one "lots" category and its single header count).
  const lotsCount = filteredLots.length + filteredGlowFarms.length;
  const filteredIntents = useMemo(
    () => economy.intents.filter((it) => matchesIntent(it, aqFilters)),
    [economy.intents, aqFilters],
  );
  const filteredActors = useMemo(
    () => economy.actors.filter((a) => matchesInstitution(a, aqFilters)),
    [economy.actors, aqFilters],
  );

  // Accordion: priority order Lots > Bioregions > Intents > Solvers (base-Atlas
  // Assets/Actions/Actors sections are gone from this route — rail and map agree).
  type AccordionSection = "bioregion" | "lot" | "intent" | "aqActor";
  const [openSection, setOpenSection] = useState<AccordionSection | null>(null);

  // Auto-select highest priority section when panel content changes. The first
  // branch uses the FILTERED lot count and is gated on the "lots" category (and
  // both are in the dep array), so an all-filtered-out / lots-off state never
  // forces open an empty Lots section.
  useEffect(() => {
    if (selectedBioregion) return; // accordion only used in card-list mode
    if (activeCategories.has("lots") && lotsCount > 0) {
      setOpenSection("lot");
    } else if (bioregionList.length > 0) {
      setOpenSection("bioregion");
    } else {
      setOpenSection(null);
    }
  }, [selectedBioregion, bioregionList.length, lotsCount, activeCategories]);

  const [accordionSearch, setAccordionSearch] = useState("");

  // One quiet header system for all rail sections — color as accent (inset
  // border + icon), not as a field. Seven saturated bars read as seven apps.
  const RAIL_HEADER_CLS =
    "w-full flex items-center justify-between px-4 h-11 md:h-8 text-sm font-semibold text-gray-800 shrink-0 bg-white border-t border-gray-100 hover:bg-gray-50 transition-colors";

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
            "transition-[grid-template-columns] duration-300",
          )}
          style={{ "--panel-w": `${panelWidth}px` } as React.CSSProperties}
        >
          <div
            className={clsx(
              "md:order-3 md:self-start md:row-start-2 md:row-end-3 lg:row-start-1 lg:row-end-2",
              !showLeftPanel && "md:!col-span-2",
            )}
            onClick={() => panelExpanded && setPanelExpanded(false)}
          >
            <div
              className={clsx(
                "w-full overflow-hidden",
                "map-wrapper",
                showLeftPanel && "md:fixed md:top-[100px] md:right-4 md:w-[calc(50vw-32px)] md:h-[calc(100vh-136px)]",
                showLeftPanel && "lg:h-[calc(100vh-72px)]",
                showLeftPanel && "lg:top-[36px] lg:left-[var(--panel-w)] lg:w-[calc(100vw-var(--panel-w))]",
                "transition-[width] duration-300",
              )}
            >
              <MapBox
                mapStyle={mapStyle}
                initialViewState={{
                  // Open framed on Chiapas — the anchor lots (Soconusco) are the content
                  longitude: -92.4,
                  latitude: 15.6,
                  zoom: 5.5,
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
                {/* Aqueduct filter bar (desktop/tablet) — writes the singleton
                    filter store; the two map layers and the rail read it. */}
                <AqueductFilterBar />

                {/* Hide bioregion + cluster layers when viewing second-order assets */}
                {!isSecondOrder && (
                  <>
                    {/* Bioregion polygons/labels survive; count badges zero out
                        (empty active sets) — bioregions are context, not a filtered
                        Aqueduct category. */}
                    <BioregionLayer
                      selectedBioregion={selectedBioregion?.code ?? null}
                      allAssets={expandedFilteredAssets}
                      allOrgs={allOrgs}
                      allActions={actionsWithLocation}
                      activeEntityTypes={emptyEntityTypes}
                      activeActorTypes={emptyActorTypes}
                      onBioregionSelect={handleBioregionSelect}
                    />

                    {/* Base-Atlas investable clusters — visible ONLY when the
                        overlay chip is on (empty active set → renders nothing). */}
                    <CompositeClusterLayer
                      assets={investableFilteredAssets.filter((asset) => !asset.second_order)}
                      orgs={investableOrgs}
                      actions={actionsWithLocation}
                      activeTypes={overlayActiveTypes}
                      onAssetClick={handleAssetMarkerClick}
                      onOrgClick={handleOrgClick}
                      onActionClick={handleActionClick}
                    />

                    {/* Agent markers removed - agents counted with bioregions instead */}

                    {/* The network graph: typed nodes + curved flow arcs,
                        always-on. The tour drives emphasis, not existence.
                        Mounted BEFORE the lot layer so its markers (hubs,
                        venues, arrowheads, solver ring) stack underneath —
                        react-map-gl Markers paint in DOM/mount order, no
                        z-index available, so order is the only lever. */}
                    <AqueductNetworkLayer />
                    {/* Glow solar farms — the second commodity vertical (10 real
                        farms, live-read SNAPSHOT). Mounted BEFORE the coffee lot
                        layer so real coffee lot chips stay on top (mount order =
                        stacking; react-map-gl Markers have no z-index). */}
                    <GlowFarmsLayer />
                    {/* Aqueduct lot markers (EthicHub reads) — separate from
                        the Atlas assets pipeline above. Mounted last so lot
                        chips always stay on top of route lines/nodes. */}
                    <AqueductLotsLayer />
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
              {/* Docked tour + activity pulse + legend — in-layout, this view only */}
              <TourDock mapRef={mapRef as React.RefObject<MapRef>} />
              <ActivityPanel events={economy.events} />
              <MapLegend />
            </div>
          </div>
          {/* Base-Atlas mobile filter row removed — this route has no base-Atlas
              filter row on any viewport. Empty spacer keeps the mobile grid cell's
              top offset intact. */}
          <div
            className={clsx("h-[60px] z-10 md:row-start-1 md:row-end-2 md:order-1 md:col-span-2 lg:hidden", "md:h-0")}
          />
          <div
            className={clsx(
              "md:order-2 md:row-start-2 lg:row-start-1 lg:row-end-2 md:row-end-3",
              "md:bg-cardBackground md:h-[calc(100vh-160px)] md:flex md:flex-col md:overflow-hidden",
              "lg:h-[calc(100vh-72px)]",
              !showLeftPanel && "md:hidden",
              "relative",
            )}
          >
            {/* Expand/collapse toggle — only mount when panel is visible; fixed position sits above the map's stacking context */}
            {showLeftPanel && (
              <button
                onClick={() => setPanelExpanded((prev) => !prev)}
                className="hidden lg:flex items-center justify-center fixed top-1/2 -translate-y-1/2 z-40 w-6 h-12 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-md hover:bg-gray-50 transition-all duration-300 cursor-pointer"
                style={{ left: `${panelWidth - 12}px` }}
              >
                {panelExpanded ? (
                  <CaretLeft size={14} className="text-gray-500" />
                ) : (
                  <CaretRight size={14} className="text-gray-500" />
                )}
              </button>
            )}
            {/* Navigation bar */}
            {selectedBioregion &&
              (() => {
                const hasDetail = selectedAsset || selectedAction || selectedOrg;
                const detailName =
                  selectedAsset?.name ||
                  (selectedAction
                    ? (selectedAction.title || "").replace(/\s*[-—]\s*\d{4}\s*$/, "").trim()
                    : selectedOrg?.name || "");
                return (
                  <div className="flex items-center gap-2 px-3 h-8 bg-gray-900 text-white text-xs shrink-0">
                    <button
                      onClick={hasDetail ? handleBackToBioregion : handleBioregionClose}
                      className="flex items-center gap-1 text-white/60 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      <ArrowRight size={10} className="rotate-180" />
                      <span>{hasDetail ? selectedBioregion.name : "Explore"}</span>
                    </button>
                    <span className="text-white/30">/</span>
                    <span className="font-medium truncate">{hasDetail ? detailName : selectedBioregion.name}</span>
                  </div>
                );
              })()}

            {/* Panel state machine: bioregion+entity → detail card, bioregion → panel, else → card lists */}
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
                        [
                          [Math.min(...lngs), Math.min(...lats)],
                          [Math.max(...lngs), Math.max(...lats)],
                        ],
                        { padding: 60, maxZoom: 8, duration: 800 },
                      );
                    }
                  } else if (target.coordinates) {
                    mapRef?.current?.flyTo({
                      center: [target.coordinates.longitude, target.coordinates.latitude],
                      zoom: 10,
                    });
                  }
                }}
              />
            ) : selectedBioregion && selectedAction ? (
              <ActionBioregionCard
                action={selectedAction}
                actionGroup={selectedActionGroup.length > 1 ? selectedActionGroup : undefined}
              />
            ) : selectedBioregion && selectedOrg ? (
              <OrgBioregionCard
                org={selectedOrg}
                siblingOrgs={selectedOrgSiblings}
                onOrgSelect={(o) => handleOrgDetailSelect(o)}
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
                onActionSelect={handleActionCardClick}
                onActionDetailSelect={handleActionDetailSelect}
                onAgentClick={handleAgentClick}
                onOrgSelect={handleOrgDetailSelect}
                defaultTab={bioregionDefaultTab}
                experimentalMode={experimentalMode}
                eiiScores={eiiScores}
              />
            ) : (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Bioregions */}
                {bioregionList.length > 0 && (
                  <>
                    <button
                      onClick={() => toggleSection("bioregion")}
                      className={RAIL_HEADER_CLS}
                      style={{ boxShadow: "inset 3px 0 0 #16a34a" }}
                    >
                      <span className="flex items-center gap-1.5">
                        <Globe size={14} style={{ color: "#16a34a" }} />
                        Bioregions <span className="font-normal text-gray-400">({bioregionList.length})</span>
                      </span>
                      <CaretDown
                        size={14}
                        className={clsx("transition-transform", openSection === "bioregion" && "rotate-180")}
                      />
                    </button>
                    {openSection === "bioregion" &&
                      (() => {
                        const q = accordionSearch.toLowerCase();
                        const items = q
                          ? bioregionList.filter(
                              (b) => b.name?.toLowerCase().includes(q) || b.realm_name?.toLowerCase().includes(q),
                            )
                          : bioregionList;
                        return (
                          <div className="flex-1 min-h-0 flex flex-col">
                            <div className="relative shrink-0 border-b border-gray-200">
                              <MagnifyingGlass
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                              />
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
                                    handleBioregionSelect(bioregion);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                  </>
                )}

                {/* Lots — Aqueduct commodity lots (filtered; hidden when the
                    "lots" category is off, so rail and map vanish together) */}
                {activeCategories.has("lots") && lotsCount > 0 && (
                  <>
                    <button
                      onClick={() => toggleSection("lot")}
                      className={RAIL_HEADER_CLS}
                      style={{ boxShadow: `inset 3px 0 0 ${AQUEDUCT_SECTION_COLORS.lot}` }}
                    >
                      <span className="flex items-center gap-1.5">
                        <Coffee size={14} style={{ color: AQUEDUCT_SECTION_COLORS.lot }} />
                        Lots <span className="font-normal text-gray-400">({lotsCount.toLocaleString()})</span>
                      </span>
                      <CaretDown
                        size={14}
                        className={clsx("transition-transform", openSection === "lot" && "rotate-180")}
                      />
                    </button>
                    {openSection === "lot" &&
                      (() => {
                        const q = accordionSearch.toLowerCase();
                        const items = q
                          ? filteredLots.filter(
                              (l) =>
                                l.title_redacted.toLowerCase().includes(q) ||
                                (l.origin.region ?? "").toLowerCase().includes(q) ||
                                (l.origin.country ?? "").toLowerCase().includes(q),
                            )
                          : filteredLots;
                        // Solar farms share the Lots section (second vertical). Few
                        // (≤10), so they render in full above the capped coffee list.
                        const solarItems = q
                          ? filteredGlowFarms.filter(
                              (f) => f.farm.name.toLowerCase().includes(q) || f.farm.location.toLowerCase().includes(q),
                            )
                          : filteredGlowFarms;
                        return (
                          <div className="flex-1 min-h-0 flex flex-col">
                            <div className="px-4 pt-2 pb-2 text-xs text-gray-400 shrink-0">
                              coffee and solar lots the swarm can price — real reads labeled
                            </div>
                            <div className="relative shrink-0 border-b border-gray-200">
                              <MagnifyingGlass
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                              />
                              <input
                                type="text"
                                value={accordionSearch}
                                onChange={(e) => setAccordionSearch(e.target.value)}
                                placeholder="Search lots..."
                                className="w-full pl-8 pr-3 py-2 text-xs bg-white focus:outline-none"
                              />
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto">
                              {solarItems.map((farmLot) => (
                                <SolarFarmRow
                                  key={farmLot.aqueduct_id}
                                  farmLot={farmLot}
                                  onLocate={() => {
                                    mapRef?.current?.flyTo({
                                      center: [farmLot.map_marker.longitude, farmLot.map_marker.latitude],
                                      zoom: 9,
                                      duration: 900,
                                    });
                                  }}
                                />
                              ))}
                              {items.slice(0, 80).map((lot) => (
                                <LotExploreCard
                                  key={lot.aqueduct_id}
                                  lot={lot}
                                  onLocate={() => {
                                    if (lot.map_marker) {
                                      mapRef?.current?.flyTo({
                                        center: [lot.map_marker.longitude, lot.map_marker.latitude],
                                        zoom: 9,
                                        duration: 900,
                                      });
                                    }
                                  }}
                                />
                              ))}
                              {items.length > 80 && (
                                <div className="px-4 py-2.5 text-[11px] text-gray-400 border-t border-gray-100">
                                  Showing 80 of {items.length.toLocaleString()} — search to narrow.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                  </>
                )}

                {/* Intents & Routes — Aqueduct order flow (filtered; hidden when
                    the "routes" category is off) */}
                {activeCategories.has("routes") && filteredIntents.length > 0 && (
                  <>
                    <button
                      onClick={() => toggleSection("intent")}
                      className={RAIL_HEADER_CLS}
                      style={{ boxShadow: `inset 3px 0 0 ${AQUEDUCT_SECTION_COLORS.intent}` }}
                    >
                      <span className="flex items-center gap-1.5">
                        <ArrowsLeftRight size={14} style={{ color: AQUEDUCT_SECTION_COLORS.intent }} />
                        Routes{" "}
                        <span className="font-normal text-gray-400">({filteredIntents.length.toLocaleString()})</span>
                      </span>
                      <CaretDown
                        size={14}
                        className={clsx("transition-transform", openSection === "intent" && "rotate-180")}
                      />
                    </button>
                    {openSection === "intent" &&
                      (() => {
                        const q = accordionSearch.toLowerCase();
                        const items = q
                          ? filteredIntents.filter(
                              (it) => it.title.toLowerCase().includes(q) || it.detail.toLowerCase().includes(q),
                            )
                          : filteredIntents;
                        return (
                          <div className="flex-1 min-h-0 flex flex-col">
                            <div className="px-4 pt-2 pb-2 text-xs text-gray-400 shrink-0">
                              asks to sell or finance, and the shipments that fill them
                            </div>
                            <div className="relative shrink-0 border-b border-gray-200">
                              <MagnifyingGlass
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                              />
                              <input
                                type="text"
                                value={accordionSearch}
                                onChange={(e) => setAccordionSearch(e.target.value)}
                                placeholder="Search intents..."
                                className="w-full pl-8 pr-3 py-2 text-xs bg-white focus:outline-none"
                              />
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto">
                              {items.slice(0, 80).map((intent) => (
                                <IntentExploreCard
                                  key={intent.id}
                                  intent={intent}
                                  onLocate={() => {
                                    if (intent.coordinates) {
                                      mapRef?.current?.flyTo({
                                        center: [intent.coordinates.longitude, intent.coordinates.latitude],
                                        zoom: 8,
                                        duration: 900,
                                      });
                                    }
                                  }}
                                />
                              ))}
                              {items.length > 80 && (
                                <div className="px-4 py-2.5 text-[11px] text-gray-400 border-t border-gray-100">
                                  Showing 80 of {items.length.toLocaleString()} — search to narrow.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                  </>
                )}

                {/* Solvers & Venues — Aqueduct market actors (filtered; hidden
                    when the "institutions" category is off, so the section AND the
                    map markers vanish in the same click) */}
                {activeCategories.has("institutions") && filteredActors.length > 0 && (
                  <>
                    <button
                      onClick={() => toggleSection("aqActor")}
                      className={RAIL_HEADER_CLS}
                      style={{ boxShadow: `inset 3px 0 0 ${AQUEDUCT_SECTION_COLORS.actor}` }}
                    >
                      <span className="flex items-center gap-1.5">
                        <Cpu size={14} style={{ color: AQUEDUCT_SECTION_COLORS.actor }} />
                        Institutions <span className="font-normal text-gray-400">({filteredActors.length})</span>
                      </span>
                      <CaretDown
                        size={14}
                        className={clsx("transition-transform", openSection === "aqActor" && "rotate-180")}
                      />
                    </button>
                    {openSection === "aqActor" &&
                      (() => {
                        const q = accordionSearch.toLowerCase();
                        const items = q
                          ? filteredActors.filter(
                              (a) => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q),
                            )
                          : filteredActors;
                        return (
                          <div className="flex-1 min-h-0 flex flex-col">
                            <div className="px-4 pt-2 pb-2 text-xs text-gray-400 shrink-0">
                              coops, buyers, marketplaces, and the agents that serve them
                            </div>
                            <div className="relative shrink-0 border-b border-gray-200">
                              <MagnifyingGlass
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                              />
                              <input
                                type="text"
                                value={accordionSearch}
                                onChange={(e) => setAccordionSearch(e.target.value)}
                                placeholder="Search institutions..."
                                className="w-full pl-8 pr-3 py-2 text-xs bg-white focus:outline-none"
                              />
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto">
                              {items.slice(0, 100).map((actor) => (
                                <ActorExploreCard
                                  key={actor.id}
                                  actor={actor}
                                  href={actor.kind === "coop" ? `/coops/${actor.id}` : undefined}
                                  onLocate={
                                    actor.coordinates
                                      ? () =>
                                          mapRef?.current?.flyTo({
                                            center: [actor.coordinates!.longitude, actor.coordinates!.latitude],
                                            zoom: 6,
                                            duration: 900,
                                          })
                                      : undefined
                                  }
                                />
                              ))}
                              {items.length > 100 && (
                                <div className="px-4 py-2.5 text-[11px] text-gray-400 border-t border-gray-100">
                                  Showing 100 of {items.length.toLocaleString()} — search to narrow.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                  </>
                )}

                {/* Base-Atlas Assets / Actions / Actors rail sections removed on
                    this route — those entities are gone from the map (except via
                    the investable overlay), so keeping their rail sections would
                    make rail and map disagree. Bioregions + the three Aqueduct
                    sections are the whole rail here. */}
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
