import { Source, Layer, useMap, Popup } from 'react-map-gl';
import { useEffect, useMemo, useState } from 'react';
import type { FeatureCollection, Feature } from 'geojson';
import type { MapMouseEvent } from 'mapbox-gl';
import type { Agent, AgentTier } from '../../modules/ecospatial/a2a/types';
import { useQuery } from '@tanstack/react-query';
import { browseVirtualsAgents } from '../../modules/ecospatial/virtuals';
import { mapVirtualsToAgent } from '../../modules/ecospatial/virtuals/hooks';

// Bioregion centroid lookup (subset for demonstration)
const BIOREGION_CENTROIDS: Record<string, [number, number]> = {
  // Palearctic
  PAL_1: [4.5, 43.5], // Camargue area
  PAL_2: [10.0, 50.0],
  PAL_3: [15.0, 55.0],
  PAL_4: [25.0, 45.0],
  PAL_5: [35.0, 40.0],
  PAL_6: [50.0, 35.0],
  PAL_7: [70.0, 45.0],
  PAL_8: [90.0, 50.0],
  PAL_9: [110.0, 45.0],
  PAL_10: [130.0, 40.0],
  // Nearctic
  NA_1: [-120.0, 45.0],
  NA_2: [-110.0, 40.0],
  NA_3: [-100.0, 45.0],
  NA_4: [-90.0, 35.0],
  NA_5: [-80.0, 30.0],
  NA_6: [-70.0, 42.0],
  NA_7: [-76.0, 38.5], // Chesapeake
  NA_8: [-85.0, 45.0],
  NA_9: [-95.0, 30.0],
  NA_10: [-105.0, 35.0],
  // Neotropic
  NT_1: [-60.0, -10.0],
  NT_2: [-50.0, -20.0],
  NT_3: [-70.0, -15.0],
  NT_4: [-75.0, 5.0],
  NT_5: [-65.0, 0.0],
  // Afrotropic
  AT_1: [20.0, 0.0],
  AT_2: [30.0, -5.0],
  AT_3: [35.0, -25.0],
  AT_4: [15.0, 10.0],
  AT_5: [25.0, -10.0],
  // Indomalayan
  IM_1: [100.0, 15.0],
  IM_2: [75.0, 20.0],
  IM_3: [85.0, 25.0],
  IM_4: [110.0, 5.0],
  IM_5: [95.0, 10.0],
  // Australasia
  AA_1: [145.0, -25.0],
  AA_2: [135.0, -20.0],
  AA_3: [150.0, -35.0],
  AA_4: [175.0, -40.0],
  AA_5: [140.0, -5.0],
  // Oceania
  OC_1: [-150.0, -15.0],
  OC_2: [165.0, -20.0],
  OC_3: [180.0, 0.0],
  OC_4: [-170.0, 5.0],
  OC_5: [-140.0, -25.0],
};

function getCentroid(bioregionId: string): [number, number] | null {
  if (BIOREGION_CENTROIDS[bioregionId]) {
    return BIOREGION_CENTROIDS[bioregionId];
  }
  // Try to extrapolate from prefix
  const prefix = bioregionId.split('_')[0];
  const num = parseInt(bioregionId.split('_')[1] || '1', 10);
  const baseEntry = Object.entries(BIOREGION_CENTROIDS).find(([k]) =>
    k.startsWith(prefix + '_')
  );
  if (baseEntry) {
    // Offset slightly for different regions
    return [
      baseEntry[1][0] + ((num - 1) % 5) * 5,
      baseEntry[1][1] + Math.floor((num - 1) / 5) * 3,
    ];
  }
  return null;
}

// Simple hash for deterministic mock data
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Species names for Species-tier agents
const SPECIES_NAMES: Record<string, string[]> = {
  PAL: ['Greater Flamingo', 'European Eel', 'Camargue Horse', 'Black-winged Stilt'],
  NA: ['Blue Crab', 'Striped Bass', 'Bald Eagle', 'American Eel', 'Diamondback Terrapin'],
  NT: ['Jaguar', 'Giant Otter', 'Harpy Eagle', 'Amazon River Dolphin'],
  AT: ['Forest Elephant', 'Okapi', 'Mountain Gorilla', 'African Grey Parrot'],
  IM: ['Bengal Tiger', 'Asian Elephant', 'Orangutan', 'Clouded Leopard'],
  AA: ['Koala', 'Platypus', 'Tasmanian Devil', 'Wombat'],
  OC: ['Monk Seal', 'Green Sea Turtle', 'Frigatebird', 'Coconut Crab'],
};

// Ecosystem types by region prefix
const ECOSYSTEM_TYPES: Record<string, string[]> = {
  PAL: ['Wetland', 'Mediterranean Scrub', 'Salt Marsh'],
  NA: ['Estuary', 'Temperate Forest', 'Coastal Marsh'],
  NT: ['Rainforest', 'River System', 'Flooded Forest'],
  AT: ['Tropical Forest', 'Savanna', 'Montane'],
  IM: ['Mangrove', 'Monsoon Forest', 'Coral Reef'],
  AA: ['Eucalyptus Forest', 'Reef System', 'Outback'],
  OC: ['Coral Atoll', 'Island Forest', 'Seagrass Meadow'],
};

// Generate mock agents for all bioregions with tier hierarchy
function generateAllAgents(): Agent[] {
  const agents: Agent[] = [];
  const bioregionCodes = Object.keys(BIOREGION_CENTROIDS);
  const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'IDLE', 'OFFLINE'] as const;

  bioregionCodes.forEach((bioregionCode) => {
    const hash = hashCode(bioregionCode);
    const prefix = bioregionCode.split('_')[0];

    // Each bioregion gets 1-2 species agents, 1 ecosystem agent, 1 economic agent
    const speciesCount = 1 + (hash % 2);

    // Species-tier agents
    const speciesNames = SPECIES_NAMES[prefix] || ['Unknown Species'];
    for (let i = 0; i < speciesCount; i++) {
      const agentHash = hashCode(bioregionCode + 'species' + i);
      const speciesName = speciesNames[agentHash % speciesNames.length];
      const address = `0x${agentHash.toString(16).padStart(40, '0')}`;

      agents.push({
        id: `agent-${bioregionCode}-species-${i}`,
        address,
        actorType: 'AGENT',
        agentType: 'REPRESENTATION',
        tier: 'SPECIES',
        status: statuses[agentHash % statuses.length],
        name: `${speciesName} Guardian`,
        reputationScore: 50 + (agentHash % 50),
        active: statuses[agentHash % statuses.length] !== 'OFFLINE',
        esvStaked: 500 + (agentHash % 5000),
        esvEarned: 50 + (agentHash % 2000),
        actionsCompleted: 3 + (agentHash % 30),
        bioregion: { id: bioregionCode, name: bioregionCode },
        yieldDelegation: 5 + (agentHash % 15),
        speciesRepresented: speciesName,
        pillarFocus: 'composition',
        mission: `Protect ${speciesName} habitat and support population recovery`,
        commitments: [{
          id: `commit-${bioregionCode}-species-${i}`,
          actorId: `agent-${bioregionCode}-species-${i}`,
          bioregionId: bioregionCode,
          percentageBps: 10000,
          createdAt: Date.now() / 1000 - (agentHash % 86400 * 60),
          updatedAt: Date.now() / 1000,
        }],
        totalCommitmentBps: 10000,
        totalESVEarned: 50 + (agentHash % 2000),
        proposalsSubmitted: agentHash % 5,
        bountiesCompleted: agentHash % 15,
        createdAt: Date.now() / 1000 - (agentHash % 86400 * 120),
      });
    }

    // Ecosystem-tier agent
    const ecosystemHash = hashCode(bioregionCode + 'ecosystem');
    const ecosystemTypes = ECOSYSTEM_TYPES[prefix] || ['Ecosystem'];
    const ecosystemType = ecosystemTypes[ecosystemHash % ecosystemTypes.length];
    const ecosystemAddress = `0x${ecosystemHash.toString(16).padStart(40, '0')}`;

    agents.push({
      id: `agent-${bioregionCode}-ecosystem`,
      address: ecosystemAddress,
      actorType: 'AGENT',
      agentType: 'MONITORING',
      tier: 'ECOSYSTEM',
      status: 'ACTIVE',
      name: `${bioregionCode} ${ecosystemType} Steward`,
      reputationScore: 60 + (ecosystemHash % 40),
      active: true,
      esvStaked: 2000 + (ecosystemHash % 15000),
      esvEarned: 200 + (ecosystemHash % 8000),
      actionsCompleted: 10 + (ecosystemHash % 80),
      bioregion: { id: bioregionCode, name: bioregionCode },
      yieldDelegation: 15 + (ecosystemHash % 25),
      ecosystemType,
      pillarFocus: 'holistic',
      mission: `Coordinate restoration and monitor ${ecosystemType} health in ${bioregionCode}`,
      commitments: [{
        id: `commit-${bioregionCode}-ecosystem`,
        actorId: `agent-${bioregionCode}-ecosystem`,
        bioregionId: bioregionCode,
        percentageBps: 10000,
        createdAt: Date.now() / 1000 - (ecosystemHash % 86400 * 90),
        updatedAt: Date.now() / 1000,
      }],
      totalCommitmentBps: 10000,
      totalESVEarned: 200 + (ecosystemHash % 8000),
      proposalsSubmitted: ecosystemHash % 12,
      bountiesCompleted: ecosystemHash % 40,
      createdAt: Date.now() / 1000 - (ecosystemHash % 86400 * 180),
    });

    // Economic-tier agent
    const economicHash = hashCode(bioregionCode + 'economic');
    const economicAddress = `0x${economicHash.toString(16).padStart(40, '0')}`;
    const strategies = ['Yield Optimizer', 'Liquidity Provider', 'Market Maker', 'Arbitrageur'];
    const strategy = strategies[economicHash % strategies.length];

    agents.push({
      id: `agent-${bioregionCode}-economic`,
      address: economicAddress,
      actorType: 'AGENT',
      agentType: 'ECONOMIC',
      tier: 'ECONOMIC',
      status: statuses[economicHash % 3], // Slightly more active
      name: `${bioregionCode} ${strategy}`,
      reputationScore: 55 + (economicHash % 45),
      active: statuses[economicHash % 3] !== 'OFFLINE',
      esvStaked: 5000 + (economicHash % 50000),
      esvEarned: 500 + (economicHash % 20000),
      actionsCompleted: 20 + (economicHash % 200),
      bioregion: { id: bioregionCode, name: bioregionCode },
      yieldDelegation: 30 + (economicHash % 50),
      pillarFocus: undefined, // Economic agents don't focus on pillars
      mission: `Generate sustainable yield from ${bioregionCode} while respecting ecosystem constraints`,
      commitments: [{
        id: `commit-${bioregionCode}-economic`,
        actorId: `agent-${bioregionCode}-economic`,
        bioregionId: bioregionCode,
        percentageBps: 10000,
        createdAt: Date.now() / 1000 - (economicHash % 86400 * 45),
        updatedAt: Date.now() / 1000,
      }],
      totalCommitmentBps: 10000,
      totalESVEarned: 500 + (economicHash % 20000),
      proposalsSubmitted: economicHash % 8,
      bountiesCompleted: economicHash % 25,
      createdAt: Date.now() / 1000 - (economicHash % 86400 * 90),
    });
  });

  return agents;
}

// Layer IDs
const SOURCE_ID = 'agent-markers';
const AGENT_GLOW = 'agent-glow';
const AGENT_POINT = 'agent-point';
const AGENT_ICON = 'agent-icon';

interface AgentLayerProps {
  visible: boolean;
  agentsEnabled?: boolean; // Whether agents toggle is active
  onAgentClick?: (address: string) => void;
}

export function AgentLayer({ visible, agentsEnabled = true, onAgentClick }: AgentLayerProps) {
  const { current: map } = useMap();
  const [hoveredAgent, setHoveredAgent] = useState<{
    lng: number;
    lat: number;
    name: string;
    agentType: string;
    tier: AgentTier;
    status: string;
    bioregion: string;
    address: string;
    mission?: string;
    speciesRepresented?: string;
    ecosystemType?: string;
    esvStaked?: number;
    pillarFocus?: string;
  } | null>(null);

  // Fetch agents from Virtuals Protocol + local mock eco-agents
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', 'all', 'virtuals'],
    queryFn: async () => {
      // Get local mock eco-focused agents
      const localAgents = generateAllAgents();

      // Fetch live Virtuals agents
      try {
        const virtualsResponse = await browseVirtualsAgents({
          limit: 50,
          sortBy: 'SUCCESSFUL_JOB_COUNT',
        });

        // Map Virtuals agents to our format with bioregion assignments
        const bioregionCodes = Object.keys(BIOREGION_CENTROIDS);
        const virtualsAgents = virtualsResponse.agents.map((v, i) => {
          // Assign to bioregions round-robin for demo
          const bioregionId = bioregionCodes[i % bioregionCodes.length];
          return mapVirtualsToAgent(v, bioregionId);
        });

        // Combine: local eco-agents first, then Virtuals agents
        return [...localAgents, ...virtualsAgents];
      } catch (error) {
        console.warn('[AgentLayer] Failed to fetch Virtuals agents:', error);
        return localAgents;
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });

  // Show agents if visible and agents toggle is enabled
  const showAgents = visible && agentsEnabled;

  // Build GeoJSON from agents placed at bioregion centroids
  // Offset agents of different tiers so they don't overlap
  const geojson: FeatureCollection = useMemo(() => {
    if (!showAgents) {
      return { type: 'FeatureCollection', features: [] };
    }

    const features: Feature[] = [];

    // Group agents by bioregion to calculate offsets
    const byBioregion = new Map<string, Agent[]>();
    agents.forEach((agent) => {
      const bioregionId = agent.commitments[0]?.bioregionId;
      if (!bioregionId) return;
      if (!byBioregion.has(bioregionId)) {
        byBioregion.set(bioregionId, []);
      }
      byBioregion.get(bioregionId)!.push(agent);
    });

    // Tier offsets (to visually separate tiers)
    const tierOffsets: Record<AgentTier, [number, number]> = {
      SPECIES: [0, 0.3],      // Above center
      ECOSYSTEM: [0, 0],       // Center
      ECONOMIC: [0, -0.3],     // Below center
    };

    byBioregion.forEach((bioregionAgents, bioregionId) => {
      const baseCentroid = getCentroid(bioregionId);
      if (!baseCentroid) return;

      // Count agents per tier for horizontal spread
      const tierCounts: Record<AgentTier, number> = { SPECIES: 0, ECOSYSTEM: 0, ECONOMIC: 0 };

      bioregionAgents.forEach((agent) => {
        const tier = agent.tier || 'ECOSYSTEM';
        const tierOffset = tierOffsets[tier];
        const horizontalIndex = tierCounts[tier]++;

        // Spread multiple agents of same tier horizontally
        const horizontalOffset = (horizontalIndex - 0.5) * 0.4;

        features.push({
          type: 'Feature',
          properties: {
            id: agent.id,
            address: agent.address,
            name: agent.name,
            agentType: agent.agentType,
            tier: tier,
            status: agent.status,
            bioregion: bioregionId,
            icon: getTierIcon(tier),
            mission: agent.mission,
            speciesRepresented: agent.speciesRepresented,
            ecosystemType: agent.ecosystemType,
            esvStaked: agent.esvStaked,
            pillarFocus: agent.pillarFocus,
          },
          geometry: {
            type: 'Point',
            coordinates: [
              baseCentroid[0] + horizontalOffset,
              baseCentroid[1] + tierOffset[1],
            ],
          },
        });
      });
    });

    return { type: 'FeatureCollection', features };
  }, [agents, showAgents]);

  // Click handling
  useEffect(() => {
    if (!map || !showAgents) return;

    const handleClick = (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [AGENT_POINT],
      });

      if (features.length > 0) {
        const address = features[0].properties?.address;
        if (address && onAgentClick) {
          onAgentClick(address);
        }
      }
    };

    const handleMouseMove = (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [AGENT_POINT],
      });

      if (features.length > 0) {
        map.getCanvas().style.cursor = 'pointer';
        const props = features[0].properties;
        const coords = (features[0].geometry as any).coordinates;
        setHoveredAgent({
          lng: coords[0],
          lat: coords[1],
          name: props?.name || 'Agent',
          agentType: props?.agentType || 'MONITORING',
          tier: (props?.tier as AgentTier) || 'ECOSYSTEM',
          status: props?.status || 'ACTIVE',
          bioregion: props?.bioregion || '',
          address: props?.address || '',
          mission: props?.mission,
          speciesRepresented: props?.speciesRepresented,
          ecosystemType: props?.ecosystemType,
          esvStaked: props?.esvStaked,
          pillarFocus: props?.pillarFocus,
        });
      } else {
        map.getCanvas().style.cursor = '';
        setHoveredAgent(null);
      }
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      setHoveredAgent(null);
    };

    map.on('click', AGENT_POINT, handleClick);
    map.on('mousemove', AGENT_POINT, handleMouseMove);
    map.on('mouseleave', AGENT_POINT, handleMouseLeave);

    return () => {
      map.off('click', AGENT_POINT, handleClick);
      map.off('mousemove', AGENT_POINT, handleMouseMove);
      map.off('mouseleave', AGENT_POINT, handleMouseLeave);
    };
  }, [map, showAgents, onAgentClick]);

  if (!showAgents) return null;

  return (
    <>
      <Source id={SOURCE_ID} type="geojson" data={geojson as any}>
        {/* Glow effect - colored by tier */}
        <Layer
          id={AGENT_GLOW}
          type="circle"
          source={SOURCE_ID}
          minzoom={2}
          paint={{
            'circle-radius': [
              'match',
              ['get', 'tier'],
              'SPECIES', 12,
              'ECOSYSTEM', 18,
              'ECONOMIC', 14,
              14,
            ],
            'circle-color': [
              'match',
              ['get', 'tier'],
              'SPECIES', '#34D399',     // Emerald for species
              'ECOSYSTEM', '#60A5FA',   // Blue for ecosystem
              'ECONOMIC', '#FBBF24',    // Amber for economic
              '#818CF8',
            ],
            'circle-opacity': 0.25,
            'circle-blur': 0.8,
          }}
        />

        {/* Main point - sized by tier importance */}
        <Layer
          id={AGENT_POINT}
          type="circle"
          source={SOURCE_ID}
          minzoom={2}
          paint={{
            'circle-radius': [
              'match',
              ['get', 'tier'],
              'SPECIES', 6,
              'ECOSYSTEM', 10,
              'ECONOMIC', 8,
              7,
            ],
            'circle-color': [
              'match',
              ['get', 'tier'],
              'SPECIES', '#10b981',     // Emerald
              'ECOSYSTEM', '#3b82f6',   // Blue
              'ECONOMIC', '#f59e0b',    // Amber
              '#6366f1',
            ],
            'circle-stroke-width': [
              'match',
              ['get', 'status'],
              'ACTIVE', 2.5,
              'IDLE', 1.5,
              'OFFLINE', 1,
              2,
            ],
            'circle-stroke-color': [
              'match',
              ['get', 'status'],
              'ACTIVE', '#ffffff',
              'IDLE', '#fef3c7',
              'OFFLINE', '#9ca3af',
              '#ffffff',
            ],
          }}
        />

        {/* Icon layer using text/emoji */}
        <Layer
          id={AGENT_ICON}
          type="symbol"
          source={SOURCE_ID}
          minzoom={4}
          layout={{
            'text-field': ['get', 'icon'],
            'text-size': [
              'match',
              ['get', 'tier'],
              'SPECIES', 12,
              'ECOSYSTEM', 16,
              'ECONOMIC', 14,
              14,
            ],
            'text-allow-overlap': true,
          }}
        />
      </Source>

      {/* Hover tooltip - tier-aware */}
      {hoveredAgent && (
        <Popup
          longitude={hoveredAgent.lng}
          latitude={hoveredAgent.lat}
          anchor="bottom"
          offset={14}
          closeButton={false}
          closeOnClick={false}
          className="agent-hover-popup"
        >
          <div className="p-2 min-w-[200px]">
            {/* Header with tier badge */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{getTierIcon(hoveredAgent.tier)}</span>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900">{hoveredAgent.name}</div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getTierBadgeClass(hoveredAgent.tier)}`}>
                    {hoveredAgent.tier}
                  </span>
                  <span className="text-xs text-gray-500">{hoveredAgent.bioregion}</span>
                </div>
              </div>
            </div>

            {/* Context based on tier */}
            {hoveredAgent.tier === 'SPECIES' && hoveredAgent.speciesRepresented && (
              <div className="text-xs text-emerald-700 mt-1">
                Representing: {hoveredAgent.speciesRepresented}
              </div>
            )}

            {hoveredAgent.tier === 'ECOSYSTEM' && hoveredAgent.ecosystemType && (
              <div className="text-xs text-blue-700 mt-1">
                {hoveredAgent.ecosystemType} Steward
              </div>
            )}

            {hoveredAgent.tier === 'ECONOMIC' && hoveredAgent.esvStaked && (
              <div className="text-xs text-amber-700 mt-1">
                {formatESV(hoveredAgent.esvStaked)} ESV staked
              </div>
            )}

            {/* Mission preview */}
            {hoveredAgent.mission && (
              <div className="text-[11px] text-gray-500 mt-1.5 line-clamp-2 italic">
                "{hoveredAgent.mission}"
              </div>
            )}

            {/* Pillar focus for non-economic */}
            {hoveredAgent.pillarFocus && (
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-[10px] text-gray-400">Focus:</span>
                <span className={`text-[10px] font-medium ${getPillarColor(hoveredAgent.pillarFocus)}`}>
                  {hoveredAgent.pillarFocus}
                </span>
              </div>
            )}
          </div>
        </Popup>
      )}
    </>
  );
}

function getTierIcon(tier: AgentTier): string {
  switch (tier) {
    case 'SPECIES': return '\uD83E\uDDA9';     // Flamingo
    case 'ECOSYSTEM': return '\uD83C\uDF3F';   // Herb/plant
    case 'ECONOMIC': return '\uD83D\uDCB0';    // Money bag
    default: return '\uD83E\uDD16';
  }
}

function getTierBadgeClass(tier: AgentTier): string {
  switch (tier) {
    case 'SPECIES': return 'bg-emerald-100 text-emerald-700';
    case 'ECOSYSTEM': return 'bg-blue-100 text-blue-700';
    case 'ECONOMIC': return 'bg-amber-100 text-amber-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function formatESV(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

function getPillarColor(pillar: string): string {
  switch (pillar) {
    case 'function': return 'text-pillar-function';
    case 'structure': return 'text-pillar-structure';
    case 'composition': return 'text-pillar-composition';
    case 'holistic': return 'text-blue-600';
    default: return 'text-gray-600';
  }
}
