/**
 * Parliament -- Interspecies Parliament feed and epoch viewer.
 * Bioregion-first layout: map + EII above the fold, threaded feed below.
 *
 * Design principles:
 *  - No emoji -- Phosphor icons throughout
 *  - Tooltips on every interactive element
 *  - Threaded discussions with entity cross-links
 *  - Agent PFPs pre-generated via Replicate
 *  - Minimap reference markers for spatial mentions
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import ReactMapGL, { Source, Layer, NavigationControl, Marker } from 'react-map-gl';
import {
  ArrowBendUpLeft,
  ArrowLeft,
  Bird,
  Binoculars,
  Broadcast,
  Brain,
  CaretDown,
  CaretRight,
  Certificate,
  ChatCircleDots,
  CheckCircle,
  ChartLineUp,
  ChartLineDown,
  ArrowsClockwise,
  CurrencyCircleDollar,
  LinkSimple,
  ArrowSquareOut,
  CloudArrowUp,
  Clock,
  // Crosshair,
  CurrencyDollar,
  Eye,
  EyeSlash,
  // Funnel,
  Globe,
  Handshake,
  Info,
  Leaf,
  Lightning,
  ListBullets,
  MapPin,
  MapTrifold,
  MagnifyingGlass,
  Megaphone,
  Pause,
  Plant,
  Play,
  Scales,
  ShieldCheck,
  Spinner,
  Stack,
  Target,
  Trash,
  TreeStructure,
  Trophy,
  Users,
  Wallet,
  Warning,
  X,
} from '@phosphor-icons/react';
import Header from '../../Header';
import Footer from '../../Footer';
import {
  useEpochIndex,
  useEpochArchive,
  useAllEpochSummaries,
  groupFeedByPhase,
} from '../../modules/ecospatial/parliament';
import type {
  FeedMessage,
  Whisper,
  Bounty,
  ParliamentAgentState,
  ParliamentPhase,
  AgentClass,
  Bond,
  EpochArchive,
  EntityRef,
  EpochSummary,
} from '../../modules/ecospatial/parliament/types';
import {
  AGENT_CLASS_COLORS,
  AGENT_CLASS_LABELS,
  PHASE_CONFIG,
  KNOWN_ASSETS,
  KNOWN_ORGS,
  KNOWN_ZONES,
  BOUNTY_CATEGORY_CONFIG,
} from '../../modules/ecospatial/parliament/types';
import { loadBioregionGeoJSON, type BioregionProperties } from '../../modules/intelligence/bioregionIntelligence';
import { useSynapse } from '../../modules/filecoin/useSynapse';
import { getCachedImage, hydrateFromPregenerated } from '../../modules/ecospatial/replicate/client';
import { AgentAvatar as SharedAgentAvatar } from '../../modules/ecospatial/a2a';

// ── Map Parliament AgentClass to Replicate PFP type ──
const CLASS_TO_PFP_TYPE: Record<string, string> = {
  species: 'REPRESENTATION',
  biome: 'MONITORING',
  climate_system: 'MONITORING',
  economic_model: 'ECONOMIC',
  compliance: 'SPECIALIST',
  future: 'REPRESENTATION',
  mrv: 'SPECIALIST',
  restoration: 'MONITORING',
  social: 'SOCIAL',
};

// ── Phosphor icons per agent class ──
const CLASS_ICONS: Record<string, React.ElementType> = {
  species: Bird,
  biome: Leaf,
  climate_system: Globe,
  economic_model: CurrencyDollar,
  compliance: ShieldCheck,
  future: Clock,
  mrv: Eye,
  restoration: Plant,
  social: Brain,
};

const CLASS_ICON_COLORS: Record<string, string> = {
  species: 'text-emerald-500',
  biome: 'text-green-500',
  climate_system: 'text-blue-500',
  economic_model: 'text-amber-500',
  compliance: 'text-gray-400',
  future: 'text-purple-500',
  mrv: 'text-cyan-500',
  restoration: 'text-lime-500',
  social: 'text-rose-500',
};

// ── Phosphor icons per feed message type ──
const FEED_TYPE_ICON: Record<string, React.ElementType> = {
  intelligence_report: MagnifyingGlass,
  eii_report: ChartLineUp,
  anomaly_alert: Warning,
  deliberation: ChatCircleDots,
  reaction: ArrowBendUpLeft,
  bounty_post: Target,
  staking: Stack,
  settlement_reaction: Trophy,
  epoch_reflection: Binoculars,
  asset_spotlight: Certificate,
  org_report: ListBullets,
  treaty_proposal: Handshake,
  social: Megaphone,
};

// ── Tooltip wrapper ──
function Tip({ text, children, position = 'top' }: {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const posClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }[position];

  return (
    <span className="relative group/tip inline-flex">
      {children}
      <span className={`absolute ${posClass} z-50 px-2 py-1 text-[9px] font-medium text-white bg-gray-900 rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity duration-150`}>
        {text}
      </span>
    </span>
  );
}

// ── Bioregion data hook ──
function useBioregionGeoJSON() {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [lookup, setLookup] = useState<Record<string, BioregionProperties>>({});

  useEffect(() => {
    loadBioregionGeoJSON().then(data => {
      setGeojson(data);
      const map: Record<string, BioregionProperties> = {};
      for (const f of data.features) {
        const p = f.properties as Record<string, string>;
        if (p?.code) {
          map[p.code] = {
            code: p.code,
            name: p.name || p.code,
            realm: p.realm || '',
            realm_name: p.realm_name || '',
            color: p.color || '#888',
            centroid: typeof p.centroid === 'string' ? JSON.parse(p.centroid) : (p.centroid as unknown as [number, number]) || [0, 0],
          };
        }
      }
      setLookup(map);
    }).catch(() => {});
  }, []);

  return { geojson, lookup };
}

// ── Agent Avatar wrapper for Parliament ──
// Uses the shared AgentAvatar component with Parliament-specific props
function AgentAvatar({ agentId, agentClass, size = 28, showTooltip = true }: {
  agentId: string;
  agentClass?: string;
  size?: number;
  showTooltip?: boolean;
}) {
  const pfpType = CLASS_TO_PFP_TYPE[agentClass || ''] || 'MONITORING';
  const label = AGENT_CLASS_LABELS[agentClass as AgentClass] || agentClass || agentId;

  const avatar = (
    <SharedAgentAvatar
      address={agentId}
      agentType={pfpType as import('../../modules/ecospatial/a2a/types').AgentType}
      status="ACTIVE"
      size={size}
    />
  );

  if (!showTooltip) return avatar;
  return <Tip text={`${agentId} (${label})`}>{avatar}</Tip>;
}

// ── Batch PFP prefetch hook — counts cached Replicate images ──
function usePrefetchPFPs(agents: ParliamentAgentState[]) {
  const [progress, setProgress] = useState({ total: 0, loaded: 0, generating: false });

  useEffect(() => {
    if (!agents.length) return;
    const cached = agents.filter(a => {
      const pfpType = CLASS_TO_PFP_TYPE[a.class] || 'MONITORING';
      return !!getCachedImage(a.id, pfpType);
    });
    setProgress({ total: agents.length, loaded: cached.length, generating: false });
  }, [agents]);

  return progress;
}

// ── Pillar colors ──
const PILLAR_COLORS: Record<string, string> = {
  function: 'text-green-600',
  structure: 'text-blue-600',
  composition: 'text-amber-600',
  overall: 'text-gray-800',
};

const PILLAR_BG: Record<string, string> = {
  function: 'bg-green-50 border-green-200',
  structure: 'bg-blue-50 border-blue-200',
  composition: 'bg-amber-50 border-amber-200',
  overall: 'bg-gray-50 border-gray-200',
};

// ── Entity reference extraction from message content ──
function extractEntityRefs(content: string): EntityRef[] {
  const refs: EntityRef[] = [];
  const seen = new Set<string>();

  // Match known assets
  for (const [name] of Object.entries(KNOWN_ASSETS)) {
    if (content.includes(name) && !seen.has(name)) {
      seen.add(name);
      refs.push({ type: 'asset', name, id: name });
    }
  }

  // Match known orgs
  for (const org of KNOWN_ORGS) {
    if (content.includes(org) && !seen.has(org)) {
      seen.add(org);
      refs.push({ type: 'actor', name: org });
    }
  }

  // Match known zones
  for (const [zone, coords] of Object.entries(KNOWN_ZONES)) {
    if (content.includes(zone) && !seen.has(zone)) {
      seen.add(zone);
      refs.push({ type: 'zone', name: zone, coordinates: coords });
    }
  }

  return refs;
}

// ── Render content with entity links ──
function LinkedContent({ content, onZoneClick }: {
  content: string;
  onZoneClick?: (coords: [number, number], label: string) => void;
}) {
  const parts: React.ReactNode[] = [];
  let remaining = content;
  let key = 0;

  // Build pattern from all known names (longest first to avoid partial matches)
  const allNames = [
    ...Object.keys(KNOWN_ASSETS),
    ...KNOWN_ORGS,
    ...Object.keys(KNOWN_ZONES),
  ].sort((a, b) => b.length - a.length);

  const pattern = new RegExp(`(${allNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

  let match: RegExpExecArray | null;
  let lastIndex = 0;
  pattern.lastIndex = 0;

  while ((match = pattern.exec(remaining)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{remaining.slice(lastIndex, match.index)}</span>);
    }

    const name = match[1];
    const isAsset = name in KNOWN_ASSETS;
    const isZone = name in KNOWN_ZONES;

    if (isZone && onZoneClick) {
      const coords = KNOWN_ZONES[name];
      parts.push(
        <button
          key={key++}
          onClick={() => onZoneClick(coords, name)}
          className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-medium underline decoration-dotted underline-offset-2 transition-colors"
        >
          <MapPin size={10} weight="fill" />
          {name}
        </button>
      );
    } else if (isAsset) {
      const meta = KNOWN_ASSETS[name];
      parts.push(
        <Tip key={key++} text={`${meta.type} - ${meta.protocol}`}>
          <Link
            to={`/?search=${encodeURIComponent(name)}&entity=asset`}
            className="inline-flex items-center gap-0.5 text-emerald-600 hover:text-emerald-800 font-medium underline decoration-dotted underline-offset-2 transition-colors"
          >
            <Certificate size={10} weight="fill" />
            {name}
          </Link>
        </Tip>
      );
    } else {
      // Org
      parts.push(
        <Tip key={key++} text={`Organization`}>
          <Link
            to={`/?search=${encodeURIComponent(name)}&entity=actor`}
            className="text-indigo-600 hover:text-indigo-800 font-medium underline decoration-dotted underline-offset-2 transition-colors"
          >
            {name}
          </Link>
        </Tip>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < remaining.length) {
    parts.push(<span key={key++}>{remaining.slice(lastIndex)}</span>);
  }

  return <>{parts.length > 0 ? parts : content}</>;
}

// ── Action type config for structured content ──
const ACTION_CONFIG: Record<string, { label: string; color: string; border: string; bg: string; icon: React.ElementType }> = {
  PROPOSAL: { label: 'Proposal', color: 'text-blue-700', border: 'border-l-blue-400', bg: 'bg-blue-50/50', icon: Scales },
  SUPPORT: { label: 'Support', color: 'text-emerald-700', border: 'border-l-emerald-400', bg: 'bg-emerald-50/50', icon: CheckCircle },
  OPPOSE: { label: 'Oppose', color: 'text-red-700', border: 'border-l-red-400', bg: 'bg-red-50/50', icon: Warning },
  CHALLENGE: { label: 'Challenge', color: 'text-orange-700', border: 'border-l-orange-400', bg: 'bg-orange-50/50', icon: Warning },
  BOUNTY: { label: 'Bounty', color: 'text-rose-700', border: 'border-l-rose-400', bg: 'bg-rose-50/50', icon: Target },
  ALERT: { label: 'Alert', color: 'text-amber-700', border: 'border-l-amber-400', bg: 'bg-amber-50/50', icon: Megaphone },
};

// Extract metadata chips from text (Cost: $X, Target: Y, Expected: Z, Reward: X ESV, Deadline: Y epochs)
const META_PATTERNS = [
  { pattern: /Cost:\s*\$[\d,]+(?:\.\d+)?/g, color: 'bg-blue-100 text-blue-700' },
  { pattern: /Target:\s*[\w.]+/g, color: 'bg-gray-100 text-gray-600' },
  { pattern: /Expected:\s*[+-]?[\d.]+\s*\w*/g, color: 'bg-emerald-100 text-emerald-700' },
  { pattern: /Reward:\s*\d+\s*ESV/g, color: 'bg-rose-100 text-rose-700' },
  { pattern: /Deadline:\s*\d+\s*epochs?/g, color: 'bg-amber-100 text-amber-700' },
];

function extractMeta(text: string): { clean: string; chips: Array<{ text: string; color: string }> } {
  const chips: Array<{ text: string; color: string }> = [];
  let clean = text;
  for (const { pattern, color } of META_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = re.exec(text)) !== null) {
      chips.push({ text: m[0], color });
    }
    clean = clean.replace(pattern, '').replace(/\.\s*\./g, '.').trim();
  }
  return { clean, chips };
}

// ── Structured Content — parse action blocks from agent messages ──
function StructuredContent({ content, onZoneClick }: {
  content: string;
  onZoneClick?: (coords: [number, number], label: string) => void;
}) {
  // Split on action keywords at start of text or after sentence boundaries
  const actionPattern = /(?:^|\.\s+|\n\s*)(PROPOSAL|SUPPORT|OPPOSE|CHALLENGE|BOUNTY|ALERT):\s*/g;
  const splits: Array<{ action: string | null; text: string }> = [];

  let lastIdx = 0;
  let m;
  while ((m = actionPattern.exec(content)) !== null) {
    // Capture text before this action
    const before = content.slice(lastIdx, m.index).trim();
    if (before && before !== '.') {
      // Append to previous split if it exists, otherwise create a preamble
      if (splits.length > 0) {
        splits[splits.length - 1].text += (splits[splits.length - 1].text ? '. ' : '') + before;
      } else {
        splits.push({ action: null, text: before });
      }
    }
    splits.push({ action: m[1], text: '' });
    lastIdx = m.index + m[0].length;
  }

  // Remaining text
  const remainder = content.slice(lastIdx).trim();
  if (remainder) {
    if (splits.length > 0) {
      splits[splits.length - 1].text += (splits[splits.length - 1].text ? ' ' : '') + remainder;
    } else {
      splits.push({ action: null, text: remainder });
    }
  }

  // If no structured actions found, fall back to plain rendering
  if (splits.length <= 1 && !splits[0]?.action) {
    return (
      <div className="text-[11px] text-gray-600 leading-relaxed">
        <LinkedContent content={content} onZoneClick={onZoneClick} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {splits.map((block, i) => {
        if (!block.text && !block.action) return null;
        const cfg = block.action ? ACTION_CONFIG[block.action] : null;
        const { clean, chips } = extractMeta(block.text);
        const ActionIcon = cfg?.icon || ChatCircleDots;

        if (!cfg) {
          // Preamble text without action label
          return (
            <div key={i} className="text-[11px] text-gray-600 leading-relaxed">
              <LinkedContent content={block.text} onZoneClick={onZoneClick} />
            </div>
          );
        }

        return (
          <div key={i} className={`border-l-2 ${cfg.border} ${cfg.bg} rounded-r pl-2.5 pr-2 py-1.5`}>
            <div className="flex items-center gap-1 mb-0.5">
              <ActionIcon size={10} weight="fill" className={cfg.color} />
              <span className={`text-[9px] font-bold uppercase ${cfg.color}`}>{cfg.label}</span>
              {chips.length > 0 && (
                <div className="flex items-center gap-1 ml-1">
                  {chips.map((chip, ci) => (
                    <span key={ci} className={`text-[8px] font-medium px-1.5 py-px rounded ${chip.color}`}>
                      {chip.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-[11px] text-gray-600 leading-relaxed">
              <LinkedContent content={clean} onZoneClick={onZoneClick} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Live Simulation Hook ──
type SimStatus = {
  running: boolean;
  paused: boolean;
  phase: string;
  message: string;
  feedCount: number;
  llmCalls: number;
  liveFeed: FeedMessage[];
};

function useSimulation() {
  const [status, setStatus] = useState<SimStatus>({
    running: false, paused: false, phase: 'idle', message: '', feedCount: 0, llmCalls: 0, liveFeed: [],
  });
  const [completionToast, setCompletionToast] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (eventSourceRef.current) return;
    const es = new EventSource('/api/parliament/stream');
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'connected') {
        setStatus(prev => ({ ...prev, running: data.running, paused: data.paused || false, phase: data.progress?.phase || 'idle' }));
      }
      if (data.type === 'progress') {
        setStatus(prev => ({
          ...prev, running: true,
          phase: data.phase, message: data.message,
          feedCount: data.feedCount || prev.feedCount,
          llmCalls: data.llmCalls || prev.llmCalls,
        }));
      }
      if (data.type === 'pause') {
        setStatus(prev => ({ ...prev, paused: data.paused }));
      }
      if (data.type === 'feed' && data.msg) {
        setStatus(prev => {
          const liveFeed = prev.liveFeed.length >= 50
            ? [...prev.liveFeed.slice(-49), data.msg]
            : [...prev.liveFeed, data.msg];
          return { ...prev, liveFeed, feedCount: prev.feedCount + 1 };
        });
      }
      if (data.type === 'complete') {
        setStatus(prev => ({
          ...prev, running: false, paused: false, phase: 'complete',
          message: `Epoch ${data.epochId} complete. ${data.feedCount} messages.`,
        }));
        queryClient.invalidateQueries({ queryKey: ['parliament'] });
        // Completion notification
        const msg = `Epoch ${data.epochId} complete — ${data.feedCount} messages, ${data.llmCalls || '?'} LLM calls`;
        setCompletionToast(msg);
        setTimeout(() => setCompletionToast(null), 8000);
        // Browser notification if permitted
        if (Notification.permission === 'granted') {
          new Notification('Parliament Epoch Complete', { body: msg, icon: '/favicon.ico' });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
        // Audio ping
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.5);
        } catch {}
      }
      if (data.type === 'settlement') {
        setStatus(prev => ({ ...prev, phase: 'settlement' }));
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setTimeout(connect, 3000);
    };
  }, [queryClient]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [connect]);

  const runEpoch = useCallback(async (agentCount = 145) => {
    setStatus(prev => ({ ...prev, running: true, paused: false, phase: 'starting', message: 'Triggering epoch...', liveFeed: [] }));
    try {
      const res = await fetch('/api/parliament/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentCount }),
      });
      if (!res.ok) {
        const err = await res.json();
        setStatus(prev => ({ ...prev, running: false, phase: 'error', message: err.error }));
      }
    } catch (err) {
      setStatus(prev => ({ ...prev, running: false, phase: 'error', message: String(err) }));
    }
  }, []);

  const togglePause = useCallback(async () => {
    try {
      await fetch('/api/parliament/pause', { method: 'POST' });
    } catch (err) {
      console.error('Pause toggle failed:', err);
    }
  }, []);

  const clearEpochs = useCallback(async () => {
    try {
      const res = await fetch('/api/parliament/clear', { method: 'POST' });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['parliament'] });
        setStatus(prev => ({ ...prev, phase: 'idle', message: 'Epochs cleared.' }));
      }
    } catch (err) {
      console.error('Clear failed:', err);
    }
  }, [queryClient]);

  return { status, runEpoch, togglePause, clearEpochs, completionToast, dismissToast: () => setCompletionToast(null) };
}

// ── Bioregion Map ──
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string || '';

function BioregionMap({ bioregionCode, geojson, lookup, markers }: {
  bioregionCode: string;
  geojson: GeoJSON.FeatureCollection | null;
  lookup: Record<string, BioregionProperties>;
  markers?: Array<{ coords: [number, number]; label: string }>;
}) {
  const bio = lookup[bioregionCode];
  const center = bio?.centroid || [4.63, 43.5];

  const highlightGeoJSON = useMemo(() => {
    if (!geojson) return null;
    return {
      type: 'FeatureCollection' as const,
      features: geojson.features.filter(f => f.properties?.code === bioregionCode),
    };
  }, [geojson, bioregionCode]);

  if (!MAPBOX_TOKEN || !geojson) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
        {!MAPBOX_TOKEN ? 'Mapbox token not configured' : 'Loading map...'}
      </div>
    );
  }

  return (
    <ReactMapGL
      initialViewState={{
        longitude: center[0],
        latitude: center[1],
        zoom: 3.5,
      }}
      style={{ width: '100%', height: '100%', borderRadius: 8 }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      mapboxAccessToken={MAPBOX_TOKEN}
      interactive={false}
      attributionControl={false}
    >
      <Source id="bioregions-all" type="geojson" data={geojson}>
        <Layer
          id="bioregions-fill"
          type="fill"
          paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.08 }}
        />
        <Layer
          id="bioregions-line"
          type="line"
          paint={{ 'line-color': '#ccc', 'line-width': 0.5 }}
        />
      </Source>

      {highlightGeoJSON && highlightGeoJSON.features.length > 0 && (
        <Source id="bioregion-selected" type="geojson" data={highlightGeoJSON}>
          <Layer
            id="bioregion-selected-fill"
            type="fill"
            paint={{ 'fill-color': bio?.color || '#4CAF50', 'fill-opacity': 0.3 }}
          />
          <Layer
            id="bioregion-selected-line"
            type="line"
            paint={{ 'line-color': bio?.color || '#4CAF50', 'line-width': 2 }}
          />
        </Source>
      )}

      {/* Zone / entity markers from feed references */}
      {markers?.map((m, i) => (
        <Marker key={i} longitude={m.coords[0]} latitude={m.coords[1]} anchor="bottom">
          <Tip text={m.label}>
            <div className="flex flex-col items-center">
              <div className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                <MapPin size={12} weight="fill" />
              </div>
              <div className="text-[8px] font-bold text-red-700 bg-white/80 px-1 rounded mt-0.5 shadow-sm">
                {m.label}
              </div>
            </div>
          </Tip>
        </Marker>
      ))}

      <NavigationControl position="bottom-right" showCompass={false} />
    </ReactMapGL>
  );
}

// Pre-generated minimap tile lookup (zone label -> local file)
const MINIMAP_TILES: Record<string, string> = {
  'Zone 7': '/simulation/minimaps/zone-7.png',
  'Zone 12': '/simulation/minimaps/zone-12.png',
  'Camargue': '/simulation/minimaps/camargue.png',
  'Rhone Delta': '/simulation/minimaps/rhone-delta.png',
  'Gulf of Lion': '/simulation/minimaps/gulf-of-lion.png',
  'Posidonia': '/simulation/minimaps/posidonia.png',
};

// ── Minimap thumbnail for feed card zone references ──
// Uses pre-generated local tiles, falls back to Mapbox Static API
function FeedMinimap({ coords, label }: { coords: [number, number]; label: string }) {
  // Prefer pre-generated local tile
  const localTile = MINIMAP_TILES[label];
  const [lng, lat] = coords;
  const src = localTile
    ? localTile
    : MAPBOX_TOKEN
      ? `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/pin-s+d94a4a(${lng},${lat})/${lng},${lat},9,0/224x160@2x?access_token=${MAPBOX_TOKEN}&attribution=false&logo=false`
      : null;

  if (!src) return null;

  return (
    <div className="rounded overflow-hidden border border-gray-100 relative">
      <img src={src} alt={label} className="w-full h-auto block" loading="lazy" />
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/40 to-transparent px-1.5 py-1">
        <span className="text-[8px] font-medium text-white flex items-center gap-0.5">
          <MapPin size={7} weight="fill" />
          {label}
        </span>
      </div>
    </div>
  );
}

// ── Build the epoch JSON payload for Filecoin pinning ──
function buildEpochPayload(epoch: EpochArchive) {
  return JSON.stringify({
    attestor: 'Interspecies Parliament',
    schemaVersion: '1.0',
    epochId: epoch.epoch_id,
    bioregion: epoch.bioregion,
    timestamp: epoch.timestamp,
    eii_before: epoch.eii_before,
    eii_after: epoch.eii_after,
    eii_delta: epoch.eii_delta,
    settlement: epoch.settlement,
    proposals: epoch.proposals,
    provenance: epoch.provenance,
    llm_stats: epoch.llm_stats,
    feedCount: epoch.feed.length,
    agentCount: epoch.agent_states.length,
  }, null, 2);
}

// ── Provenance CID Banner ──
function ProvenanceBanner({ epoch, compact = false, onPinned, allEpochIds }: {
  epoch: EpochArchive;
  compact?: boolean;
  onPinned?: () => void;
  allEpochIds?: number[];
}) {
  const synapse = useSynapse();
  const [uploading, setUploading] = useState(false);
  const [uploadedCid, setUploadedCid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [costEstimate, setCostEstimate] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<'match' | 'mismatch' | null>(null);
  const [chainData, setChainData] = useState<Array<{ id: number; cid: string; pinned: boolean }> | null>(null);

  const localCid = epoch.provenance.cid;
  const isLocal = localCid?.startsWith('local:');
  const isPinned = (localCid && !isLocal) || !!uploadedCid;
  const activeCid = uploadedCid || localCid || 'none';

  // Estimate storage cost from payload size (no wallet interaction needed)
  useEffect(() => {
    if (isPinned) return;
    const payload = buildEpochPayload(epoch);
    const size = new TextEncoder().encode(payload).length;
    const gib = size / (1024 * 1024 * 1024);
    // ~$5/GiB/month on Filecoin Calibration warm storage via Storacha
    const monthlyUsd = Math.max(0.001, gib * 5.0);
    setCostEstimate(`~$${monthlyUsd.toFixed(4)}/mo (${(size / 1024).toFixed(1)} KB)`);
  }, [epoch, isPinned]);

  // Load chain data for all epochs
  useEffect(() => {
    if (!allEpochIds || allEpochIds.length === 0) return;
    (async () => {
      const chain: Array<{ id: number; cid: string; pinned: boolean }> = [];
      for (const id of allEpochIds) {
        try {
          const res = await fetch(`/simulation/epoch_${id}.json`);
          if (res.ok) {
            const data = await res.json();
            const cid = data.provenance?.cid || 'none';
            chain.push({ id, cid, pinned: !cid.startsWith('local:') && cid !== 'none' });
          }
        } catch { /* skip */ }
      }
      setChainData(chain);
    })();
  }, [allEpochIds, uploadedCid]); // re-fetch when we pin

  const handleUpload = useCallback(async () => {
    if (!synapse.isFilecoinReady) {
      setError('Storacha not ready');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const connected = await synapse.connect();
      if (!connected) {
        setError(synapse.error || 'Failed to connect to Storacha');
        setUploading(false);
        return;
      }
      const payload = buildEpochPayload(epoch);
      const data = new TextEncoder().encode(payload);
      const result = await synapse.uploadRaw(data);
      if (result) {
        const cid = result.pieceCid;
        setUploadedCid(cid);
        try {
          await fetch('/api/parliament/pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ epochId: epoch.epoch_id, pieceCid: cid }),
          });
          onPinned?.();
        } catch (pinErr) {
          console.error('Failed to persist CID to server:', pinErr);
        }
      } else {
        setError(synapse.error || 'Upload returned no result');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [epoch, synapse, onPinned]);

  // Verify: re-download from Filecoin and compare
  const handleVerify = useCallback(async () => {
    const cidToVerify = uploadedCid || (isLocal ? null : localCid);
    if (!cidToVerify) return;
    setVerifying(true);
    setVerifyResult(null);
    setError(null);
    try {
      const connected = await synapse.connect();
      if (!connected) {
        setError('Failed to connect for verification');
        setVerifying(false);
        return;
      }
      const downloaded = await synapse.downloadProvenance(cidToVerify);
      if (!downloaded) {
        setError('Download returned empty — piece may still be propagating');
        setVerifying(false);
        return;
      }
      // Compare key fields
      const local = {
        epochId: epoch.epoch_id,
        bioregion: epoch.bioregion,
        feedCount: epoch.feed.length,
        agentCount: epoch.agent_states.length,
      };
      const remote = downloaded as unknown as Record<string, unknown>;
      const match = local.epochId === remote.epochId &&
        local.bioregion === remote.bioregion &&
        local.feedCount === remote.feedCount &&
        local.agentCount === remote.agentCount;
      setVerifyResult(match ? 'match' : 'mismatch');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }, [epoch, synapse, uploadedCid, localCid, isLocal]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-mono truncate max-w-[200px] ${isPinned ? 'text-emerald-600' : 'text-gray-500'}`}>
          {activeCid}
        </span>
        {isPinned && <ShieldCheck size={10} weight="fill" className="text-emerald-500" />}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border overflow-hidden ${
      isPinned ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
    }`}>
      {/* Main row */}
      <div className="px-4 py-3 flex items-center gap-3">
        {isPinned ? (
          <ShieldCheck size={18} weight="fill" className="text-emerald-600 flex-shrink-0" />
        ) : (
          <Warning size={18} weight="fill" className="text-amber-600 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${isPinned ? 'text-emerald-800' : 'text-amber-800'}`}>
              {isPinned ? 'Pinned to Filecoin via Storacha' : 'Pin to Filecoin before running next epoch'}
            </span>
            <span className={`text-[9px] px-1.5 py-px rounded font-medium ${
              isPinned ? 'bg-emerald-200 text-emerald-700' : 'bg-amber-200 text-amber-700'
            }`}>
              {isPinned ? 'VERIFIED' : 'UNPINNED'}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Tip text="Content Identifier for provenance record on Filecoin">
              <span className="text-[10px] font-mono text-gray-600 truncate max-w-[300px] block">
                {activeCid}
              </span>
            </Tip>
            {isPinned && !activeCid.startsWith('local:') && (
              <a
                href={`https://w3s.link/ipfs/${activeCid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-[10px] text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap"
              >
                <ArrowSquareOut size={10} /> View on Storacha
              </a>
            )}
            <span className="text-[10px] text-gray-400">
              {epoch.provenance.confidence * 100}% confidence
            </span>
            {costEstimate && !isPinned && (
              <Tip text="Estimated Filecoin warm storage cost via Storacha">
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                  <CurrencyCircleDollar size={10} /> {costEstimate}
                </span>
              </Tip>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Verify button (only when pinned) */}
          {isPinned && (
            <Tip text="Re-download from Filecoin and verify integrity">
              <button
                onClick={handleVerify}
                disabled={verifying}
                className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-lg transition-colors ${
                  verifyResult === 'match'
                    ? 'bg-emerald-200 text-emerald-800'
                    : verifyResult === 'mismatch'
                    ? 'bg-red-200 text-red-800'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {verifying ? (
                  <><Spinner size={10} className="animate-spin" /> Verifying...</>
                ) : verifyResult === 'match' ? (
                  <><ShieldCheck size={10} weight="fill" /> Integrity OK</>
                ) : verifyResult === 'mismatch' ? (
                  <><Warning size={10} weight="fill" /> Mismatch!</>
                ) : (
                  <><ArrowsClockwise size={10} /> Verify</>
                )}
              </button>
            </Tip>
          )}

          {/* Pin button (only when unpinned) */}
          {isLocal && !uploadedCid && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {uploading ? <Spinner size={12} className="animate-spin" /> : <CloudArrowUp size={14} />}
              {uploading ? 'Pinning...' : 'Pin to Filecoin'}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-2 text-xs text-red-600 flex items-center gap-1">
          <Warning size={10} /> {error}
        </div>
      )}

      {/* Provenance chain visualization */}
      {chainData && chainData.length > 1 && (
        <div className="border-t border-gray-200/50 px-4 py-2.5 bg-white/50">
          <div className="flex items-center gap-1.5 mb-1.5">
            <LinkSimple size={10} className="text-gray-400" />
            <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Provenance Chain</span>
          </div>
          <div className="flex items-center gap-1">
            {chainData.map((e, i) => (
              <div key={e.id} className="flex items-center gap-1">
                <Tip text={`Epoch ${e.id}: ${e.pinned ? e.cid : 'local hash only'}`}>
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono ${
                    e.id === epoch.epoch_id
                      ? e.pinned ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300' : 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                      : e.pinned ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {e.pinned ? <ShieldCheck size={8} weight="fill" /> : <Warning size={8} />}
                    E{e.id}
                  </div>
                </Tip>
                {i < chainData.length - 1 && (
                  <span className={`text-[8px] ${
                    e.pinned && chainData[i + 1]?.pinned ? 'text-emerald-400' : 'text-gray-300'
                  }`}>
                    &rarr;
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bioregion Hero ──
function BioregionHero({ epoch, geojson, lookup, markers, onMarkerClear, epochSummaries }: {
  epoch: EpochArchive;
  geojson: GeoJSON.FeatureCollection | null;
  lookup: Record<string, BioregionProperties>;
  markers?: Array<{ coords: [number, number]; label: string }>;
  onMarkerClear?: () => void;
  epochSummaries?: EpochSummary[];
}) {
  const bio = lookup[epoch.bioregion];
  const pillars = ['function', 'structure', 'composition', 'overall'] as const;
  const scores = pillars.filter(p => p !== 'overall').map(p => ({ p, v: epoch.eii_after[p] }));
  const limiting = scores.reduce((min, s) => s.v < min.v ? s : min, scores[0]);
  const pfpProgress = usePrefetchPFPs(epoch.agent_states);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
        {/* Map */}
        <div className="lg:col-span-2 h-[220px] lg:h-auto min-h-[200px] relative">
          <BioregionMap
            bioregionCode={epoch.bioregion}
            geojson={geojson}
            lookup={lookup}
            markers={markers}
          />
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin size={14} weight="fill" className="text-emerald-600" />
              <div>
                <div className="text-xs font-bold text-gray-900">{bio?.name || epoch.bioregion}</div>
                <div className="text-[10px] text-gray-500">{epoch.bioregion} &middot; {bio?.realm_name || ''}</div>
              </div>
            </div>
          </div>
          {markers && markers.length > 0 && onMarkerClear && (
            <button
              onClick={onMarkerClear}
              className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-[9px] font-medium text-gray-500 hover:text-gray-700 shadow-sm transition-colors"
            >
              Clear markers
            </button>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:col-span-3 p-5">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-bold text-gray-900">Ecosystem Integrity</h2>
            <Tip text={`Data from epoch ${epoch.epoch_id}, version ${epoch.version || 1}`}>
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Info size={10} /> Epoch {epoch.epoch_id}
              </span>
            </Tip>
          </div>

          {/* EII Pillars */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {pillars.map(p => {
              const val = epoch.eii_after[p];
              const delta = epoch.eii_delta[p];
              const isLimiting = p !== 'overall' && p === limiting.p;
              return (
                <Tip key={p} text={`${p}: ${val.toFixed(3)} (delta ${delta > 0 ? '+' : ''}${delta.toFixed(3)})${isLimiting ? ' -- LIMITING FACTOR' : ''}`}>
                  <div className={`px-3 py-2 rounded-lg border text-center w-full ${PILLAR_BG[p]} ${isLimiting ? 'ring-2 ring-red-300' : ''}`}>
                    <div className={`text-lg font-bold tabular-nums ${PILLAR_COLORS[p]}`}>
                      {val.toFixed(2)}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-[9px] text-gray-500 uppercase font-medium">{p}</span>
                      <span className={`text-[9px] font-mono ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(3)}
                      </span>
                    </div>
                    {isLimiting && (
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        <Warning size={8} weight="fill" className="text-red-500" />
                        <span className="text-[8px] text-red-500 font-medium">LIMITING</span>
                      </div>
                    )}
                  </div>
                </Tip>
              );
            })}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <Tip text={`${epoch.settlement.funded.length} proposals received funding this epoch`}>
              <div className="text-center w-full">
                <div className="text-lg font-bold text-emerald-600">{epoch.settlement.funded.length}</div>
                <div className="text-[10px] text-gray-500">Funded</div>
              </div>
            </Tip>
            <Tip text={`${epoch.agent_states.length} agents participated in deliberation`}>
              <div className="text-center w-full">
                <div className="text-lg font-bold text-blue-600">{epoch.agent_states.length}</div>
                <div className="text-[10px] text-gray-500">Agents</div>
              </div>
            </Tip>
            <Tip text={`${epoch.feed.length} total feed messages across all phases`}>
              <div className="text-center w-full">
                <div className="text-lg font-bold text-purple-600">{epoch.feed.length}</div>
                <div className="text-[10px] text-gray-500">Messages</div>
              </div>
            </Tip>
            <Tip text="Remaining bioregional treasury after settlement">
              <div className="text-center w-full">
                <div className="text-lg font-bold text-amber-600">
                  ${epoch.settlement.treasury_remaining.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500">Treasury</div>
              </div>
            </Tip>
          </div>

          {/* EII trajectory sparkline */}
          {epochSummaries && epochSummaries.length > 1 && (
            <div className="flex items-center gap-3 mb-3 border border-gray-100 rounded-lg px-3 py-2">
              <span className="text-[9px] text-gray-400 uppercase font-medium">EII Trajectory</span>
              <EIISparkline summaries={epochSummaries} currentEpochId={epoch.epoch_id} />
            </div>
          )}

          {/* PFP generation progress */}
          {pfpProgress.generating && (
            <div className="flex items-center gap-2 mb-3 text-[10px] text-gray-400">
              <Spinner size={10} className="animate-spin" />
              Generating agent portraits: {pfpProgress.loaded}/{pfpProgress.total}
            </div>
          )}

          {/* Provenance + CID */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <Tip text="Confidence level of provenance data">
                <span>{epoch.provenance.confidence * 100}% confidence</span>
              </Tip>
              <Tip text="Total LLM API calls made during this epoch simulation">
                <span>{epoch.llm_stats.totalCalls} LLM calls</span>
              </Tip>
              <Tip text="Epoch archive format version">
                <span>V{epoch.version || 1}</span>
              </Tip>
            </div>
            <ProvenanceBanner epoch={epoch} compact />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Insights (emoji-free) ──
type Insight = {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  body: string;
  bgClass: string;
};

function extractInsights(epoch: EpochArchive): Insight[] {
  const insights: Insight[] = [];

  const topFunded = [...epoch.settlement.funded].sort((a, b) => b.stake - a.stake)[0];
  if (topFunded) {
    insights.push({
      icon: Trophy,
      iconColor: 'text-emerald-600',
      title: `Top Priority: ${topFunded.title}`,
      body: `${topFunded.stake} ESV staked. Cost: $${topFunded.cost.toLocaleString()}.`,
      bgClass: 'bg-emerald-50 border-emerald-200',
    });
  }

  const pillars = ['function', 'structure', 'composition'] as const;
  const bestPillar = pillars.reduce((best, p) => epoch.eii_delta[p] > epoch.eii_delta[best] ? p : best, pillars[0]);
  const worstPillar = pillars.reduce((worst, p) => epoch.eii_delta[p] < epoch.eii_delta[worst] ? p : worst, pillars[0]);

  if (epoch.eii_delta[bestPillar] > 0) {
    insights.push({
      icon: ChartLineUp,
      iconColor: 'text-green-600',
      title: `${bestPillar.charAt(0).toUpperCase() + bestPillar.slice(1)} Improved`,
      body: `+${epoch.eii_delta[bestPillar].toFixed(3)} this epoch. Now at ${epoch.eii_after[bestPillar].toFixed(3)}.`,
      bgClass: 'bg-green-50 border-green-200',
    });
  }

  if (epoch.eii_delta[worstPillar] < 0) {
    insights.push({
      icon: ChartLineDown,
      iconColor: 'text-red-600',
      title: `${worstPillar.charAt(0).toUpperCase() + worstPillar.slice(1)} Declined`,
      body: `${epoch.eii_delta[worstPillar].toFixed(3)} this epoch. Now at ${epoch.eii_after[worstPillar].toFixed(3)}.`,
      bgClass: 'bg-red-50 border-red-200',
    });
  }

  const classCounts: Record<string, number> = {};
  for (const a of epoch.agent_states) {
    classCounts[a.class] = (classCounts[a.class] || 0) + 1;
  }
  const topClass = Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0];
  if (topClass) {
    const label = AGENT_CLASS_LABELS[topClass[0] as AgentClass] || topClass[0];
    const IconComp = CLASS_ICONS[topClass[0]] || Brain;
    insights.push({
      icon: IconComp,
      iconColor: CLASS_ICON_COLORS[topClass[0]] || 'text-gray-500',
      title: `${label} Constituency Dominates`,
      body: `${topClass[1]} of ${epoch.agent_states.length} agents. ${Object.keys(classCounts).length} classes.`,
      bgClass: 'bg-blue-50 border-blue-200',
    });
  }

  if (epoch.bounties && epoch.bounties.length > 0) {
    const totalReward = epoch.bounties.reduce((sum, b) => sum + (b.reward_esv || 0), 0);
    insights.push({
      icon: Target,
      iconColor: 'text-rose-600',
      title: `${epoch.bounties.length} Bounties Posted`,
      body: `${totalReward} ESV total reward. Ground-truth verification needed.`,
      bgClass: 'bg-rose-50 border-rose-200',
    });
  }

  const dynamicProps = epoch.proposals.filter(p => p.source === 'deliberation');
  if (dynamicProps.length > 0) {
    insights.push({
      icon: Lightning,
      iconColor: 'text-indigo-600',
      title: `${dynamicProps.length} Dynamic Proposal${dynamicProps.length > 1 ? 's' : ''}`,
      body: dynamicProps.map(p => p.title).join(', '),
      bgClass: 'bg-indigo-50 border-indigo-200',
    });
  }

  let highTensionCount = 0;
  for (const agent of epoch.agent_states) {
    for (const bond of Object.values(agent.bonds)) {
      if ((bond as Bond).tension > 0.5) highTensionCount++;
    }
  }
  if (highTensionCount > 0) {
    insights.push({
      icon: Warning,
      iconColor: 'text-orange-500',
      title: 'Social Tension',
      body: `${highTensionCount} high-tension bonds (>0.5).`,
      bgClass: 'bg-orange-50 border-orange-200',
    });
  }

  return insights;
}

// ── Threaded Feed Message Card ──
function FeedCard({ msg, agentMap, allMessages, onZoneClick, onAgentClick, isReply = false }: {
  msg: FeedMessage;
  agentMap: Record<string, ParliamentAgentState>;
  allMessages: FeedMessage[];
  onZoneClick?: (coords: [number, number], label: string) => void;
  onAgentClick?: (agent: ParliamentAgentState) => void;
  isReply?: boolean;
}) {
  const [showReplies, setShowReplies] = useState(!isReply);
  const [expanded, setExpanded] = useState(false);
  const isLong = msg.content.length > 200;
  const agent = agentMap[msg.from_id];
  const agentClass = agent?.class as AgentClass | undefined;
  const colorClass = agentClass ? AGENT_CLASS_COLORS[agentClass] : 'text-gray-500';
  const TypeIcon = FEED_TYPE_ICON[msg.type] || ChatCircleDots;

  // Find replies to this message
  const replies = useMemo(() =>
    allMessages.filter(m => m.reply_to === msg.id || (
      m.type === 'reaction' && m.to_id === msg.from_id &&
      m.id !== msg.id &&
      allMessages.indexOf(m) > allMessages.indexOf(msg) &&
      allMessages.indexOf(m) - allMessages.indexOf(msg) < 10
    )),
    [allMessages, msg]
  );

  // Extract entity refs from content
  const entityRefs = useMemo(() => extractEntityRefs(msg.content), [msg.content]);
  const zoneRefs = entityRefs.filter(r => r.type === 'zone' && r.coordinates);
  const nonZoneRefs = entityRefs.filter(r => r.type !== 'zone');

  // Target agent info
  const targetAgent = msg.to_id && msg.to_id !== 'ALL' ? agentMap[msg.to_id] : null;

  const hasMap = zoneRefs.length > 0 && zoneRefs[0].coordinates;

  return (
    <div
      className={`${isReply ? 'pl-3 border-l-2 border-gray-100' : 'bg-white border border-gray-100 rounded-lg p-3 hover:border-gray-200 hover:shadow-sm'} transition-all ${isLong && !expanded && !isReply ? 'cursor-pointer' : ''}`}
      onClick={isLong && !expanded && !isReply ? () => setExpanded(true) : undefined}
    >
      <div className="flex gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <button
            onClick={(e) => { e.stopPropagation(); const a = agentMap[msg.from_id]; if (a && onAgentClick) onAgentClick(a); }}
            className="flex-shrink-0"
          >
            <AgentAvatar agentId={msg.from_id} agentClass={agentClass} size={isReply ? 20 : 26} />
          </button>
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-1.5 mb-0.5">
              <Tip text={`${msg.from_id} - ${AGENT_CLASS_LABELS[agentClass as AgentClass] || 'Unknown'} - Click to view profile`}>
                <button
                  onClick={(e) => { e.stopPropagation(); const a = agentMap[msg.from_id]; if (a && onAgentClick) onAgentClick(a); }}
                  className={`font-semibold text-[11px] ${colorClass} hover:underline`}
                >
                  {msg.from}
                </button>
              </Tip>

              {targetAgent ? (
                <span className="text-gray-300 text-[9px] flex items-center gap-0.5">
                  <ArrowBendUpLeft size={7} />
                  <button
                    onClick={(e) => { e.stopPropagation(); if (targetAgent && onAgentClick) onAgentClick(targetAgent); }}
                    className={`font-medium ${AGENT_CLASS_COLORS[targetAgent.class] || ''} hover:underline`}
                  >
                    {msg.to}
                  </button>
                </span>
              ) : msg.to === 'ALL' ? (
                <Tip text="Broadcast to all agents">
                  <Broadcast size={8} className="text-gray-300" />
                </Tip>
              ) : null}

              <span className="ml-auto flex-shrink-0 flex items-center gap-1 text-gray-300">
                <Tip text={msg.type.replace(/_/g, ' ')}>
                  <TypeIcon size={9} weight="fill" />
                </Tip>
                <span className="text-[9px] hidden sm:inline">{msg.type.replace(/_/g, ' ')}</span>
              </span>
            </div>

            {/* Content -- clamped to 3 lines when collapsed, structured when expanded */}
            {isLong && !expanded ? (
              <div className="text-[11px] text-gray-600 leading-relaxed line-clamp-3">
                <LinkedContent content={msg.content} onZoneClick={onZoneClick} />
              </div>
            ) : (
              <StructuredContent content={msg.content} onZoneClick={onZoneClick} />
            )}

            {/* Expand hint */}
            {isLong && !expanded && !isReply && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                className="text-[9px] text-gray-400 hover:text-gray-600 mt-0.5 transition-colors"
              >
                Show more
              </button>
            )}
            {isLong && expanded && !isReply && (
              <button
                onClick={() => setExpanded(false)}
                className="text-[9px] text-gray-400 hover:text-gray-600 mt-0.5 transition-colors"
              >
                Show less
              </button>
            )}

            {/* Inline entity refs -- only when expanded or short */}
            {(expanded || !isLong) && nonZoneRefs.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {nonZoneRefs.map((ref, i) => {
                  const style = {
                    asset: 'text-emerald-600 bg-emerald-50',
                    actor: 'text-indigo-600 bg-indigo-50',
                    action: 'text-amber-600 bg-amber-50',
                    zone: 'text-blue-600 bg-blue-50',
                  }[ref.type];
                  const PillIcon = {
                    asset: Certificate,
                    actor: Brain,
                    action: Lightning,
                    zone: MapPin,
                  }[ref.type];
                  return (
                    <span key={i} className={`inline-flex items-center gap-0.5 px-1 py-px rounded text-[8px] font-medium ${style}`}>
                      <PillIcon size={7} weight="fill" />
                      {ref.name}
                    </span>
                  );
                })}
                {zoneRefs.map((ref, i) => (
                  <span
                    key={`z${i}`}
                    className="inline-flex items-center gap-0.5 px-1 py-px rounded text-[8px] font-medium text-blue-600 bg-blue-50 cursor-pointer hover:bg-blue-100"
                    onClick={() => ref.coordinates && onZoneClick?.(ref.coordinates, ref.name)}
                  >
                    <MapPin size={7} weight="fill" />
                    {ref.name}
                  </span>
                ))}
              </div>
            )}

            {/* Thread replies */}
            {replies.length > 0 && !isReply && (
              <div className="mt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowReplies(!showReplies); }}
                  className="flex items-center gap-1 text-[9px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showReplies ? <CaretDown size={9} /> : <CaretRight size={9} />}
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </button>
                {showReplies && (
                  <div className="mt-1.5 space-y-1.5">
                    {replies.map(reply => (
                      <FeedCard
                        key={reply.id}
                        msg={reply}
                        agentMap={agentMap}
                        allMessages={allMessages}
                        onZoneClick={onZoneClick}
                        onAgentClick={onAgentClick}
                        isReply
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: minimap thumbnail -- only when expanded or short */}
        {hasMap && !isReply && (expanded || !isLong) && (
          <div className="flex-shrink-0 w-28 self-start">
            <FeedMinimap coords={zoneRefs[0].coordinates!} label={zoneRefs[0].name} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Whisper Card ──
function WhisperCard({ whisper, agentMap }: { whisper: Whisper; agentMap: Record<string, ParliamentAgentState> }) {
  const fromAgent = agentMap[whisper.from_id];
  const isGossip = whisper.type === 'gossip';

  return (
    <div className="border border-gray-100 rounded-lg p-2.5 bg-gray-50">
      <div className="flex items-start gap-2">
        {isGossip ? (
          <Tip text="Gossip -- informal opinion shared between agents">
            <Eye size={16} weight="fill" className="text-gray-400 flex-shrink-0 mt-0.5" />
          </Tip>
        ) : (
          <Tip text="Whisper -- private communication between agents">
            <EyeSlash size={16} weight="fill" className="text-gray-300 flex-shrink-0 mt-0.5" />
          </Tip>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <AgentAvatar agentId={whisper.from_id} agentClass={fromAgent?.class} size={14} />
            <span className="text-[10px] font-medium text-gray-600">{whisper.from}</span>
            <ArrowBendUpLeft size={8} className="text-gray-300" />
            <span className="text-gray-400 text-[10px]">{whisper.to}</span>
            {whisper.about && (
              <span className="text-gray-400 text-[10px] italic">re: {whisper.about}</span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 italic">{whisper.content}</p>
        </div>
      </div>
    </div>
  );
}

// ── Bond Graph ──
function BondGraph({ agents }: { agents: ParliamentAgentState[] }) {
  const [showAll, setShowAll] = useState(false);
  const agentsWithBonds = agents
    .filter(a => a.bonds && Object.keys(a.bonds).length > 0)
    .sort((a, b) => Object.keys(b.bonds).length - Object.keys(a.bonds).length);
  const displayed = showAll ? agentsWithBonds : agentsWithBonds.slice(0, 12);

  return (
    <div className="space-y-1.5">
      {displayed.map(agent => (
        <div key={agent.id} className="flex items-center gap-2">
          <AgentAvatar agentId={agent.id} agentClass={agent.class} size={20} />
          <span className="text-[10px] text-gray-600 w-24 truncate">{agent.name}</span>
          <div className="flex gap-1 flex-wrap">
            {Object.entries(agent.bonds).map(([targetId, bond]: [string, Bond]) => {
              const target = agents.find(a => a.id === targetId);
              if (!target) return null;
              const trustColor = bond.trust > 0.2 ? 'bg-green-500' : bond.trust < -0.2 ? 'bg-red-500' : 'bg-gray-400';
              return (
                <Tip key={targetId} text={`Trust: ${bond.trust.toFixed(2)}, Tension: ${bond.tension.toFixed(2)}, Depth: ${bond.depth.toFixed(2)}`}>
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-[9px]">
                    <div className={`w-1.5 h-1.5 rounded-full ${trustColor}`} />
                    <AgentAvatar agentId={target.id} agentClass={target.class} size={14} showTooltip={false} />
                    {bond.tension > 0.3 && <Warning size={8} weight="fill" className="text-orange-500" />}
                  </div>
                </Tip>
              );
            })}
          </div>
        </div>
      ))}
      {!showAll && agentsWithBonds.length > 12 && (
        <button
          onClick={() => setShowAll(true)}
          className="text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
        >
          Show all {agentsWithBonds.length} agents
        </button>
      )}
    </div>
  );
}

// ── Bounty Card (RentAHuman-inspired) ──
function BountyCard({ bounty, agentMap }: { bounty: Bounty; agentMap: Record<string, ParliamentAgentState> }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig: Record<string, { dot: string; label: string; bg: string; text: string }> = {
    open: { dot: 'bg-rose-400', label: 'Open', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
    claimed: { dot: 'bg-amber-400', label: 'Claimed', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
    verified: { dot: 'bg-green-400', label: 'Verified', bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
    expired: { dot: 'bg-gray-300', label: 'Expired', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500' },
  };
  const cfg = statusConfig[bounty.status] || statusConfig.open;
  const poster = bounty.posted_by_id ? agentMap[bounty.posted_by_id] : null;
  const catCfg = BOUNTY_CATEGORY_CONFIG[bounty.category || ''] || { label: bounty.category || 'General', color: 'text-gray-600', bg: 'bg-gray-100' };

  return (
    <div
      className={`border rounded-lg mx-3 my-2 overflow-hidden transition-all cursor-pointer hover:shadow-sm ${cfg.bg}`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header row */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Target icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            bounty.status === 'open' ? 'bg-rose-100' : bounty.status === 'verified' ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <Target size={16} weight="fill" className={bounty.status === 'open' ? 'text-rose-500' : bounty.status === 'verified' ? 'text-green-500' : 'text-gray-400'} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Category + Status row */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${catCfg.bg} ${catCfg.color}`}>
                {catCfg.label}
              </span>
              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                bounty.status === 'open' ? 'bg-rose-100 text-rose-600 border-rose-200' :
                bounty.status === 'verified' ? 'bg-green-100 text-green-600 border-green-200' :
                bounty.status === 'claimed' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
                {cfg.label}
              </span>
            </div>

            {/* Description */}
            <p className={`text-[11px] text-gray-700 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
              {bounty.description}
            </p>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2">
              <Tip text="ESV reward for completing this bounty">
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                  <CurrencyDollar size={12} weight="bold" />
                  {bounty.reward_esv} ESV
                </span>
              </Tip>

              {poster && (
                <Tip text={`Posted by ${bounty.posted_by}`}>
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <AgentAvatar agentId={poster.id} agentClass={poster.class} size={14} showTooltip={false} />
                    {bounty.posted_by}
                  </span>
                </Tip>
              )}

              {bounty.deadline_epochs && (
                <Tip text={`Must be completed within ${bounty.deadline_epochs} epochs`}>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <Clock size={10} /> {bounty.deadline_epochs} epochs
                  </span>
                </Tip>
              )}

              <span className="ml-auto text-[9px] text-gray-300">
                {expanded ? <CaretDown size={10} /> : <CaretRight size={10} />}
              </span>
            </div>

            {/* Lifecycle step dots */}
            <div className="flex items-center gap-1 mt-2">
              {(['open', 'claimed', 'verified'] as const).map((step, i) => {
                const isReached = step === 'open' ? true :
                  step === 'claimed' ? bounty.status === 'claimed' || bounty.status === 'verified' :
                  bounty.status === 'verified';
                return (
                  <div key={step} className="flex items-center gap-1">
                    {i > 0 && <div className={`h-px w-4 ${isReached ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
                    <Tip text={step.charAt(0).toUpperCase() + step.slice(1)}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold ${
                        bounty.status === step ? 'ring-2 ring-offset-1 ring-emerald-400' : ''
                      } ${isReached ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                        {i + 1}
                      </div>
                    </Tip>
                  </div>
                );
              })}
              {bounty.status === 'expired' && (
                <div className="flex items-center gap-1 ml-1">
                  <div className="h-px w-4 bg-gray-200" />
                  <Tip text="Expired">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold bg-gray-200 text-gray-500 ring-2 ring-offset-1 ring-gray-300">
                      <X size={7} weight="bold" />
                    </div>
                  </Tip>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-200/50 px-4 py-3 bg-white/50">
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <span className="text-gray-400 uppercase font-medium text-[8px]">Acceptance Criteria</span>
              <p className="text-gray-600 mt-0.5">GPS-tagged photographic evidence, timestamped within deadline period.</p>
            </div>
            <div>
              <span className="text-gray-400 uppercase font-medium text-[8px]">Verification</span>
              <p className="text-gray-600 mt-0.5">Requires {poster?.class === 'compliance' ? 'compliance audit' : 'MRV pipeline'} confirmation + 2 agent endorsements.</p>
            </div>
          </div>
          {bounty.status === 'open' && (
            <Tip text="Bounties can be claimed by humans via the RentAHuman integration (coming soon)">
              <button className="mt-3 w-full py-2 text-[11px] font-semibold text-white bg-rose-500 hover:bg-rose-400 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <Target size={12} weight="fill" /> Claim Bounty
              </button>
            </Tip>
          )}
        </div>
      )}
    </div>
  );
}

// ── Proposal Card (Snapshot-inspired) ──
function ProposalCard({ proposal, fundedData, epoch, agentMap }: {
  proposal: EpochArchive['proposals'][0];
  fundedData?: { cost: number; stake: number } | null;
  epoch: EpochArchive;
  agentMap: Record<string, ParliamentAgentState>;
}) {
  const [expanded, setExpanded] = useState(false);
  const isFunded = !!fundedData;
  const isDynamic = proposal.source === 'deliberation';
  const pillar = proposal.target_pillar;
  const pillarColor = pillar === 'function' ? 'bg-emerald-500' : pillar === 'structure' ? 'bg-blue-500' : pillar === 'composition' ? 'bg-amber-500' : 'bg-gray-400';
  const pillarTextColor = pillar === 'function' ? 'text-emerald-600' : pillar === 'structure' ? 'text-blue-600' : pillar === 'composition' ? 'text-amber-600' : 'text-gray-500';
  const pillarBg = pillar === 'function' ? 'bg-emerald-50' : pillar === 'structure' ? 'bg-blue-50' : pillar === 'composition' ? 'bg-amber-50' : 'bg-gray-50';

  const totalStake = proposal.total_stake || proposal.supporters.reduce((s, x) => s + x.amount, 0);
  const maxStake = Math.max(...epoch.proposals.map(p => p.total_stake || 0), 1);
  const barWidth = Math.max(8, (totalStake / maxStake) * 100);

  // Find related deliberation messages about this proposal
  const relatedMessages = useMemo(() => {
    const idLower = proposal.id.toLowerCase();
    const titleWords = proposal.title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    return epoch.feed.filter(m =>
      (m.type === 'deliberation' || m.type === 'reaction' || m.type === 'staking') &&
      (m.content.toLowerCase().includes(idLower) ||
       titleWords.some(w => m.content.toLowerCase().includes(w)))
    ).slice(0, 5);
  }, [epoch.feed, proposal]);

  return (
    <div
      className={`border rounded-lg mx-3 my-2 overflow-hidden transition-all cursor-pointer hover:shadow-sm ${
        isFunded ? 'border-emerald-200 bg-white' : 'border-gray-200 bg-gray-50'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Pillar accent */}
          <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${pillarColor}`} />

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${pillarBg} ${pillarTextColor}`}>
                {pillar}
              </span>
              {isDynamic && (
                <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600">
                  Dynamic
                </span>
              )}
              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                isFunded ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
                {isFunded ? 'Funded' : 'Unfunded'}
              </span>
            </div>

            <h4 className="text-xs font-semibold text-gray-800 leading-snug">{proposal.title}</h4>

            {proposal.proposed_by && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                Proposed by: {proposal.proposed_by}
              </p>
            )}

            {/* Stake bar */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pillarColor} opacity-60 transition-all`} style={{ width: `${barWidth}%` }} />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 w-16 text-right">{totalStake} ESV</span>
              {(fundedData?.cost || proposal.cost_usdc) && (
                <span className="text-[10px] text-gray-400 w-16 text-right">${(fundedData?.cost || proposal.cost_usdc || 0).toLocaleString()}</span>
              )}
            </div>

            {/* Supporters preview */}
            {proposal.supporters.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[9px] text-gray-400 mr-1">Supporters:</span>
                {proposal.supporters.slice(0, 6).map(s => {
                  const agent = agentMap[s.agent_id];
                  return agent ? (
                    <Tip key={s.agent_id} text={`${agent.name}: ${s.amount} ESV`}>
                      <AgentAvatar agentId={agent.id} agentClass={agent.class} size={16} showTooltip={false} />
                    </Tip>
                  ) : null;
                })}
                {proposal.supporters.length > 6 && (
                  <span className="text-[9px] text-gray-400">+{proposal.supporters.length - 6}</span>
                )}
              </div>
            )}
          </div>

          {/* Status icon */}
          <div className="flex-shrink-0 mt-1">
            {isFunded ? (
              <Tip text="Funded by parliament">
                <ShieldCheck size={18} weight="fill" className="text-emerald-500" />
              </Tip>
            ) : (
              <Tip text="Insufficient stake or budget">
                <Warning size={18} weight="fill" className="text-gray-300" />
              </Tip>
            )}
          </div>
        </div>
      </div>

      {/* Expanded: related deliberation + details */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          {/* Stats grid */}
          <div className="px-4 py-3 grid grid-cols-3 gap-3 text-center border-b border-gray-100">
            <div>
              <div className="text-sm font-bold text-gray-800">{totalStake}</div>
              <div className="text-[9px] text-gray-400 uppercase">Total Stake</div>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800">{proposal.supporters.length}</div>
              <div className="text-[9px] text-gray-400 uppercase">Supporters</div>
            </div>
            <div>
              <div className={`text-sm font-bold ${pillarTextColor}`}>
                {proposal.estimated_eii_delta ? `+${proposal.estimated_eii_delta}` : '--'}
              </div>
              <div className="text-[9px] text-gray-400 uppercase">Expected EII</div>
            </div>
          </div>

          {/* Related deliberation */}
          {relatedMessages.length > 0 && (
            <div className="px-4 py-3">
              <h5 className="text-[9px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                <ChatCircleDots size={10} /> Related Deliberation
              </h5>
              <div className="space-y-2">
                {relatedMessages.map(m => {
                  const agent = agentMap[m.from_id];
                  return (
                    <div key={m.id} className="flex items-start gap-2 text-[10px]">
                      <AgentAvatar agentId={m.from_id} agentClass={agent?.class} size={16} showTooltip={false} />
                      <div className="flex-1 min-w-0">
                        <span className={`font-medium ${AGENT_CLASS_COLORS[agent?.class as AgentClass] || 'text-gray-500'}`}>
                          {m.from}
                        </span>
                        <p className="text-gray-500 line-clamp-2 mt-0.5">{m.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Phase Tab ──
function PhaseTab({ phase, count, active, onClick }: {
  phase: ParliamentPhase; count: number; active: boolean; onClick: () => void;
}) {
  const config = PHASE_CONFIG[phase];
  return (
    <Tip text={`${config.label} phase: ${count} messages`}>
      <button
        onClick={onClick}
        className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
          active ? `${config.color} text-white` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
      >
        {config.label} ({count})
      </button>
    </Tip>
  );
}

// ── Conviction Bar ──
function ConvictionBar({ proposal, totalEsvSupply }: {
  proposal: EpochArchive['proposals'][0];
  totalEsvSupply: number;
}) {
  const stake = proposal.total_stake || 0;
  const cost = proposal.cost_usdc || 0;
  const threshold = totalEsvSupply > 0 ? (cost * 10) / totalEsvSupply : 1;
  const conviction = stake; // single-epoch conviction at t=1
  const progress = threshold > 0 ? Math.min(1, conviction / threshold) : 0;
  const isFunded = progress >= 1;

  return (
    <Tip text={`Conviction: ${conviction.toFixed(1)} / ${threshold.toFixed(1)} threshold (${(progress * 100).toFixed(0)}%)`}>
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isFunded ? 'bg-emerald-500' : 'bg-amber-400'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className={`text-[9px] font-mono tabular-nums ${isFunded ? 'text-emerald-600' : 'text-amber-600'}`}>
          {(progress * 100).toFixed(0)}%
        </span>
      </div>
    </Tip>
  );
}

// ── Agent Card (grid view) ──
function AgentCard({ agent, onClick }: {
  agent: ParliamentAgentState;
  onClick: () => void;
}) {
  const colorClass = AGENT_CLASS_COLORS[agent.class] || 'text-gray-500';
  const bondCount = Object.keys(agent.bonds).length;
  const IconComp = CLASS_ICONS[agent.class] || Brain;

  return (
    <button
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:shadow-sm transition-all text-left w-full"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <AgentAvatar agentId={agent.id} agentClass={agent.class} size={32} showTooltip={false} />
        <div className="flex-1 min-w-0">
          <div className={`text-[11px] font-semibold truncate ${colorClass}`}>{agent.name}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <IconComp size={9} weight="fill" className={CLASS_ICON_COLORS[agent.class] || 'text-gray-400'} />
            <span className="text-[9px] text-gray-400">{AGENT_CLASS_LABELS[agent.class as AgentClass] || agent.class}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[8px] text-gray-400 w-10">Soul</span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-purple-400 rounded-full" style={{ width: `${agent.soul_depth * 100}%` }} />
        </div>
        <span className="text-[8px] text-gray-500 tabular-nums">{(agent.soul_depth * 100).toFixed(0)}%</span>
      </div>
      <div className="flex items-center gap-3 text-[9px] text-gray-400">
        <span className="flex items-center gap-0.5">
          <Stack size={8} /> {agent.stake.esv} ESV
        </span>
        <span className="flex items-center gap-0.5">
          <Handshake size={8} /> {bondCount} bonds
        </span>
      </div>
    </button>
  );
}

// ── ESV Dashboard ──
function ESVDashboard({ epoch }: {
  epoch: EpochArchive;
}) {
  const agents = epoch.agent_states;
  const totalMinted = agents.reduce((s, a) => s + a.stake.esv, 0);
  const totalStaked = epoch.proposals.reduce((s, p) => s + (p.total_stake || 0), 0);
  const unstaked = Math.max(0, totalMinted - totalStaked);
  const fundedCost = epoch.settlement.funded.reduce((s, p) => s + p.cost, 0);
  const treasuryTotal = fundedCost + epoch.settlement.treasury_remaining;
  const stakedPct = totalMinted > 0 ? (totalStaked / totalMinted) * 100 : 0;
  const donutGradient = `conic-gradient(#10b981 0% ${stakedPct}%, #e5e7eb ${stakedPct}% 100%)`;

  const sortedAgents = [...agents].sort((a, b) => b.stake.esv - a.stake.esv).slice(0, 10);
  const maxStake = sortedAgents[0]?.stake.esv || 1;

  const classTotals: Record<string, number> = {};
  for (const a of agents) {
    classTotals[a.class] = (classTotals[a.class] || 0) + a.stake.esv;
  }
  const classEntries = Object.entries(classTotals).sort((a, b) => b[1] - a[1]);
  const maxClassStake = classEntries[0]?.[1] || 1;

  return (
    <div className="p-4 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <div className="w-full h-full rounded-full" style={{ background: donutGradient }} />
            <div className="absolute inset-2.5 bg-white rounded-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm font-bold text-gray-800">{totalMinted}</div>
                <div className="text-[8px] text-gray-400">TOTAL ESV</div>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-gray-600">Staked: {totalStaked} ({stakedPct.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-200" />
              <span className="text-[10px] text-gray-600">Unstaked: {unstaked}</span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
          <div className="text-[9px] text-amber-500 uppercase font-medium mb-1">Treasury</div>
          <div className="text-lg font-bold text-amber-700">${epoch.settlement.treasury_remaining.toLocaleString()}</div>
          <div className="h-1.5 bg-amber-200 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${treasuryTotal > 0 ? (fundedCost / treasuryTotal) * 100 : 0}%` }} />
          </div>
          <div className="text-[9px] text-amber-500 mt-1">${fundedCost.toLocaleString()} allocated</div>
        </div>

        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <div className="text-[9px] text-blue-500 uppercase font-medium mb-1">Conviction Voting</div>
          <div className="text-[10px] text-blue-700 leading-relaxed">
            <p>Threshold = cost x 10 / supply</p>
            <p className="mt-1">Decay rate: 0.9 per epoch</p>
            <p className="mt-1">{epoch.settlement.funded.length} of {epoch.proposals.length} proposals funded</p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Top Stakers</h4>
        <div className="space-y-1">
          {sortedAgents.map(a => (
            <div key={a.id} className="flex items-center gap-2">
              <AgentAvatar agentId={a.id} agentClass={a.class} size={18} />
              <span className="text-[10px] text-gray-600 w-28 truncate">{a.name}</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(a.stake.esv / maxStake) * 100}%` }} />
              </div>
              <span className="text-[10px] font-mono text-emerald-600 w-12 text-right">{a.stake.esv}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Stake by Agent Class</h4>
        <div className="space-y-1">
          {classEntries.map(([cls, total]) => {
            const ClsIcon = CLASS_ICONS[cls] || Brain;
            return (
              <div key={cls} className="flex items-center gap-2">
                <ClsIcon size={12} weight="fill" className={CLASS_ICON_COLORS[cls] || 'text-gray-400'} />
                <span className="text-[10px] text-gray-600 w-24 truncate">{AGENT_CLASS_LABELS[cls as AgentClass] || cls}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(total / maxClassStake) * 100}%` }} />
                </div>
                <span className="text-[10px] font-mono text-gray-600 w-12 text-right">{total}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Proposal Funding</h4>
        <div className="space-y-1">
          {epoch.proposals.map(p => {
            const funded = epoch.settlement.funded.find(f => f.id === p.id);
            const pc = p.target_pillar === 'function' ? 'bg-emerald-400' :
              p.target_pillar === 'structure' ? 'bg-blue-400' :
              p.target_pillar === 'composition' ? 'bg-amber-400' : 'bg-gray-300';
            return (
              <div key={p.id} className="flex items-center gap-2">
                <div className={`w-1.5 h-4 rounded-full ${pc}`} />
                <span className={`text-[10px] flex-1 truncate ${funded ? 'text-gray-700' : 'text-gray-400'}`}>{p.title}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  funded ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                }`}>{funded ? 'Funded' : 'Unfunded'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── EII Sparkline (epoch-over-epoch) ──
function EIISparkline({ summaries, currentEpochId }: {
  summaries: EpochSummary[];
  currentEpochId: number;
}) {
  if (summaries.length < 2) return null;

  const values = summaries.map(s => s.eii_after.overall);
  const min = Math.min(...values) - 0.01;
  const max = Math.max(...values) + 0.01;
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  const currentIdx = summaries.findIndex(s => s.epoch_id === currentEpochId);

  return (
    <Tip text={`EII overall across ${summaries.length} epochs: ${values.map((v, i) => `E${summaries[i].epoch_id}=${v.toFixed(3)}`).join(', ')}`}>
      <div className="inline-flex items-center gap-2">
        <svg width={w} height={h} className="overflow-visible">
          <polyline
            points={points}
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {currentIdx >= 0 && (
            <circle
              cx={currentIdx * step}
              cy={h - ((values[currentIdx] - min) / range) * h}
              r="3"
              fill="#10b981"
              stroke="white"
              strokeWidth="1.5"
            />
          )}
        </svg>
        <div className="text-[9px] text-gray-400">
          {summaries.length} epochs
        </div>
      </div>
    </Tip>
  );
}

// ── Feed Search Bar ──
function FeedSearchBar({ search, onSearchChange, typeFilter, onTypeFilterChange, messageCounts }: {
  search: string;
  onSearchChange: (v: string) => void;
  typeFilter: string | null;
  onTypeFilterChange: (v: string | null) => void;
  messageCounts: Record<string, number>;
}) {
  const types = Object.entries(messageCounts).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-2 mb-3">
      <div className="relative">
        <MagnifyingGlass size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search feed messages..."
          className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 focus:bg-white transition-colors"
        />
        {search && (
          <button onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
            <X size={12} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {types.map(([type, count]) => {
          const TypeIcon = FEED_TYPE_ICON[type] || ChatCircleDots;
          const isActive = typeFilter === type;
          return (
            <button
              key={type}
              onClick={() => onTypeFilterChange(isActive ? null : type)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors ${
                isActive ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <TypeIcon size={8} weight={isActive ? 'fill' : 'regular'} />
              {type.replace(/_/g, ' ')} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Parliament Page ──
export default function Parliament() {
  // Hydrate PFP cache from pre-generated file on first visit
  useEffect(() => { hydrateFromPregenerated(); }, []);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { geojson, lookup } = useBioregionGeoJSON();
  const { data: epochs } = useEpochIndex();
  const latestId = epochs && epochs.length > 0 ? Math.max(...epochs) : null;
  const [selectedEpoch, setSelectedEpoch] = useState<number | null>(null);
  const activeEpochId = selectedEpoch ?? latestId;
  const { data: epoch, isLoading } = useEpochArchive(activeEpochId);
  const [activePhase, _setActivePhase] = useState<ParliamentPhase | 'ALL'>('ALL');
  const setActivePhase = (phase: ParliamentPhase | 'ALL') => {
    _setActivePhase(phase);
    setFeedLimit(30);
  };
  const [showWhispers, setShowWhispers] = useState(false);
  const [agentCount, setAgentCount] = useState(145);
  const { status: sim, runEpoch, togglePause, clearEpochs, completionToast, dismissToast } = useSimulation();
  const liveFeedEndRef = useRef<HTMLDivElement>(null);
  const [epochTab, setEpochTab] = useState<'insights' | 'proposals' | 'bounties' | 'bonds' | 'agents' | 'esv'>('proposals');
  const [mapMarkers, setMapMarkers] = useState<Array<{ coords: [number, number]; label: string }>>([]);
  const [feedSearch, setFeedSearch] = useState('');
  const [feedTypeFilter, setFeedTypeFilter] = useState<string | null>(null);
  const { data: epochSummaries } = useAllEpochSummaries(epochs || []);

  // Navigate to the agent's full profile page
  const handleAgentClick = useCallback((agent: ParliamentAgentState) => {
    navigate(`/agents/${agent.id}`);
  }, [navigate]);

  useEffect(() => {
    liveFeedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sim.liveFeed.length]);

  const feedByPhase = useMemo(
    () => (epoch ? groupFeedByPhase(epoch.feed) : null),
    [epoch]
  );

  const agentMap = useMemo(() => {
    const m: Record<string, ParliamentAgentState> = {};
    if (epoch) for (const a of epoch.agent_states) m[a.id] = a;
    return m;
  }, [epoch]);

  const totalEsvSupply = useMemo(() => {
    if (!epoch) return 0;
    return epoch.agent_states.reduce((s, a) => s + a.stake.esv, 0);
  }, [epoch]);

  const messageCounts = useMemo(() => {
    if (!epoch) return {};
    const counts: Record<string, number> = {};
    for (const m of epoch.feed) {
      counts[m.type] = (counts[m.type] || 0) + 1;
    }
    return counts;
  }, [epoch]);

  // Build threaded feed: only show top-level messages (not replies)
  const filteredFeed = useMemo(() => {
    if (!epoch) return [];
    const baseFeed = activePhase === 'ALL' ? epoch.feed : (feedByPhase?.[activePhase] || []);
    const searchLower = feedSearch.toLowerCase();
    return baseFeed.filter(msg => {
      if (msg.reply_to) return false;
      if (msg.type === 'reaction' && msg.to_id && msg.to_id !== 'ALL') {
        const parentIdx = baseFeed.findIndex(m => m.from_id === msg.to_id && m.type !== 'reaction');
        if (parentIdx >= 0 && baseFeed.indexOf(msg) - parentIdx < 10) return false;
      }
      if (feedTypeFilter && msg.type !== feedTypeFilter) return false;
      if (searchLower && !msg.content.toLowerCase().includes(searchLower) && !msg.from.toLowerCase().includes(searchLower)) return false;
      return true;
    });
  }, [epoch, activePhase, feedByPhase, feedSearch, feedTypeFilter]);

  const FEED_PAGE_SIZE = 30;
  const [feedLimit, setFeedLimit] = useState(FEED_PAGE_SIZE);

  const handleZoneClick = useCallback((coords: [number, number], label: string) => {
    setMapMarkers(prev => {
      if (prev.some(m => m.label === label)) return prev;
      return [...prev, { coords, label }];
    });
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 pt-[60px] lg:pt-[36px] px-4 pb-6 max-w-6xl mx-auto w-full">
        {/* Epoch completion toast */}
        {completionToast && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm">
              <CheckCircle size={20} weight="fill" className="flex-shrink-0" />
              <span className="text-sm font-medium">{completionToast}</span>
              <button onClick={dismissToast} className="text-white/70 hover:text-white ml-auto flex-shrink-0 text-lg leading-none">&times;</button>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center gap-3 py-4">
          <Tip text="Back to home">
            <Link to="/" className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-600">
              <ArrowLeft size={18} />
            </Link>
          </Tip>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900">Interspecies Parliament</h1>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {epochs && epochs.length > 0 && (
              <Tip text="Select epoch to view">
                <select
                  value={activeEpochId ?? ''}
                  onChange={e => setSelectedEpoch(Number(e.target.value))}
                  className="bg-white border border-gray-200 rounded px-2 py-1 text-[10px] text-gray-700"
                >
                  {epochs.map(id => (
                    <option key={id} value={id}>Epoch #{id}</option>
                  ))}
                </select>
              </Tip>
            )}

            <Tip text="Number of agents in simulation (8 = fast test, 145 = full census)">
              <select
                value={agentCount}
                onChange={e => setAgentCount(Number(e.target.value))}
                className="bg-white border border-gray-200 rounded px-2 py-1 text-[10px] text-gray-700"
                disabled={sim.running}
              >
                <option value={8}>8 agents</option>
                <option value={50}>50</option>
                <option value={145}>145</option>
                <option value={200}>200</option>
              </select>
            </Tip>

            {sim.running && (
              <Tip text={sim.paused ? 'Resume simulation' : 'Pause simulation'}>
                <button
                  onClick={togglePause}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                    sim.paused
                      ? 'text-white bg-amber-500 hover:bg-amber-400'
                      : 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                  }`}
                >
                  {sim.paused ? <><Play size={10} weight="fill" /> Resume</> : <><Pause size={10} weight="fill" /> Pause</>}
                </button>
              </Tip>
            )}

            <Tip text="Clear all epoch archives and start fresh">
              <button
                onClick={clearEpochs}
                disabled={sim.running}
                className="flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
              >
                <Trash size={10} weight="bold" /> Clear
              </button>
            </Tip>

            <Tip text="Trigger a new epoch simulation (uses OpenRouter LLM credits)">
              <button
                onClick={() => runEpoch(agentCount)}
                disabled={sim.running}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
              >
                {sim.running ? (
                  <><Spinner size={10} className="animate-spin" /> Running...</>
                ) : (
                  <><Play size={10} weight="fill" /> Run Epoch</>
                )}
              </button>
            </Tip>
          </div>
        </div>

        {/* Error message (e.g., unpinned epoch blocking next run) */}
        {sim.phase === 'error' && sim.message && (
          <div className="mb-4 border border-red-200 bg-red-50 rounded-lg px-4 py-3 flex items-center gap-3">
            <Warning size={16} weight="fill" className="text-red-500 flex-shrink-0" />
            <span className="text-xs text-red-700">{sim.message}</span>
          </div>
        )}

        {/* Live simulation panel */}
        {sim.running && (
          <div className={`mb-4 border rounded-lg overflow-hidden ${sim.paused ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}>
            <div className={`px-4 py-2 flex items-center gap-3 ${sim.paused ? 'bg-amber-100' : 'bg-emerald-100'}`}>
              {sim.paused ? (
                <Pause size={14} weight="fill" className="text-amber-600" />
              ) : (
                <Spinner size={14} className="animate-spin text-emerald-600" />
              )}
              <span className={`text-xs font-medium ${sim.paused ? 'text-amber-700' : 'text-emerald-700'}`}>
                {sim.paused ? 'Paused' : (PHASE_CONFIG[sim.phase.toUpperCase() as ParliamentPhase]?.label || sim.phase)}
              </span>
              <span className={`text-[10px] ml-auto ${sim.paused ? 'text-amber-600' : 'text-emerald-600'}`}>
                {sim.feedCount} msgs &middot; {sim.llmCalls} LLM calls
              </span>
            </div>
            {sim.liveFeed.length > 0 && (
              <div className="max-h-[200px] overflow-y-auto px-4 py-2 space-y-1.5">
                {sim.liveFeed.slice(-15).map((msg, i) => (
                  <div key={msg.id || i} className="text-[10px] border-l-2 border-emerald-300 pl-2">
                    <span className="font-medium text-gray-800">{msg.from}</span>
                    <ArrowBendUpLeft size={8} className="inline mx-1 text-gray-300" />
                    <span className="text-gray-500">{msg.to}</span>
                    <p className="text-gray-600 mt-0.5 line-clamp-1">{msg.content}</p>
                  </div>
                ))}
                <div ref={liveFeedEndRef} />
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="text-center text-gray-500 py-20">
            <Spinner size={24} className="animate-spin mx-auto mb-3" />
            Loading epoch data...
          </div>
        )}

        {epoch && (
          <div className="space-y-4">
            <BioregionHero
              epoch={epoch}
              geojson={geojson}
              lookup={lookup}
              markers={mapMarkers}
              onMarkerClear={() => setMapMarkers([])}
              epochSummaries={epochSummaries}
            />

            <ProvenanceBanner
              epoch={epoch}
              allEpochIds={epochs || []}
              onPinned={() => queryClient.invalidateQueries({ queryKey: ['parliament'] })}
            />

            {/* Epoch Details — tabbed panel */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center border-b border-gray-100 px-1 gap-0.5 overflow-x-auto">
                {([
                  { key: 'insights' as const, label: 'Insights', icon: Lightning, count: null },
                  { key: 'proposals' as const, label: 'Proposals', icon: Scales, count: epoch.proposals.length },
                  { key: 'bounties' as const, label: 'Bounties', icon: Target, count: epoch.bounties?.length || 0 },
                  { key: 'agents' as const, label: 'Agents', icon: Users, count: epoch.agent_states.length },
                  { key: 'esv' as const, label: 'ESV', icon: Wallet, count: null },
                  { key: 'bonds' as const, label: 'Bonds', icon: TreeStructure, count: epoch.agent_states.filter(a => Object.keys(a.bonds).length > 0).length },
                ]).map(tab => {
                  const TabIcon = tab.icon;
                  const isActive = epochTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setEpochTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                        isActive
                          ? 'border-gray-800 text-gray-800'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <TabIcon size={13} weight={isActive ? 'fill' : 'regular'} />
                      {tab.label}
                      {tab.count !== null && (
                        <span className={`text-[9px] px-1 py-px rounded ${isActive ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'}`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
                {epochTab === 'proposals' && (
                  <span className="ml-auto text-[10px] text-gray-400 pr-3 whitespace-nowrap">
                    Treasury: ${epoch.settlement.treasury_remaining?.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Tab content */}
              {epochTab === 'insights' && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(() => {
                    const insights = extractInsights(epoch);
                    return insights.map((insight, i) => {
                      const IconComp = insight.icon;
                      return (
                        <div key={i} className={`px-3 py-2.5 rounded-lg border ${insight.bgClass}`}>
                          <div className="flex items-start gap-2">
                            <IconComp size={16} weight="fill" className={`flex-shrink-0 mt-0.5 ${insight.iconColor}`} />
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{insight.title}</p>
                              <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{insight.body}</p>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {epochTab === 'proposals' && (
                <div className="divide-y divide-gray-50">
                  {(() => {
                    const fundedIds = new Set(epoch.settlement.funded.map(f => f.id));
                    const sorted = [...epoch.proposals].sort((a, b) => {
                      const aF = fundedIds.has(a.id) ? 1 : 0;
                      const bF = fundedIds.has(b.id) ? 1 : 0;
                      if (aF !== bF) return bF - aF;
                      return (b.total_stake || 0) - (a.total_stake || 0);
                    });
                    return sorted.map(p => {
                      const fundedData = epoch.settlement.funded.find(f => f.id === p.id);
                      return (
                        <div key={p.id}>
                          <ProposalCard
                            proposal={p}
                            fundedData={fundedData ? { cost: fundedData.cost, stake: fundedData.stake } : null}
                            epoch={epoch}
                            agentMap={agentMap}
                          />
                          <div className="px-7 pb-2">
                            <ConvictionBar proposal={p} totalEsvSupply={totalEsvSupply} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {epochTab === 'bounties' && (
                <div>
                  {epoch.bounties && epoch.bounties.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                      {epoch.bounties.map((b: Bounty) => (
                        <BountyCard key={b.id} bounty={b} agentMap={agentMap} />
                      ))}
                      <div className="px-4 py-2 text-[10px] text-gray-400">
                        {epoch.bounties.reduce((s: number, b: Bounty) => s + b.reward_esv, 0)} ESV total bounty pool
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-xs text-gray-400">No bounties this epoch</div>
                  )}
                </div>
              )}

              {epochTab === 'agents' && (
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {epoch.agent_states
                      .slice()
                      .sort((a, b) => b.stake.esv - a.stake.esv)
                      .map(agent => (
                        <AgentCard
                          key={agent.id}
                          agent={agent}
                          onClick={() => navigate(`/agents/${agent.id}`)}
                        />
                      ))}
                  </div>
                </div>
              )}

              {epochTab === 'esv' && (
                <ESVDashboard epoch={epoch} />
              )}

              {epochTab === 'bonds' && (
                <div className="p-4">
                  <BondGraph agents={epoch.agent_states} />
                </div>
              )}
            </div>

            {/* Phase Tabs + Feed */}
            <div>
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                <Tip text="Show all messages from every phase">
                  <button
                    onClick={() => setActivePhase('ALL')}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                      activePhase === 'ALL'
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    All ({epoch.feed.length})
                  </button>
                </Tip>
                {feedByPhase &&
                  (Object.keys(feedByPhase) as ParliamentPhase[]).map(phase => (
                    <PhaseTab
                      key={phase}
                      phase={phase}
                      count={feedByPhase[phase].length}
                      active={activePhase === phase}
                      onClick={() => setActivePhase(phase)}
                    />
                  ))}

                {/* Map reference toggle */}
                {mapMarkers.length > 0 && (
                  <Tip text={`${mapMarkers.length} locations referenced in feed`}>
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium">
                      <MapTrifold size={10} weight="fill" />
                      {mapMarkers.length} map refs
                    </span>
                  </Tip>
                )}
              </div>

              <FeedSearchBar
                search={feedSearch}
                onSearchChange={setFeedSearch}
                typeFilter={feedTypeFilter}
                onTypeFilterChange={setFeedTypeFilter}
                messageCounts={messageCounts}
              />

              <div className="space-y-2">
                {filteredFeed.slice(0, feedLimit).map(msg => (
                  <FeedCard
                    key={msg.id}
                    msg={msg}
                    agentMap={agentMap}
                    allMessages={epoch.feed}
                    onZoneClick={handleZoneClick}
                    onAgentClick={handleAgentClick}
                  />
                ))}
                {filteredFeed.length > feedLimit && (
                  <button
                    onClick={() => setFeedLimit(prev => prev + FEED_PAGE_SIZE)}
                    className="w-full py-2 text-[10px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Show more ({filteredFeed.length - feedLimit} remaining)
                  </button>
                )}
              </div>
            </div>

            {/* Whisper Channel */}
            {epoch.whispers && epoch.whispers.length > 0 && (
              <div>
                <button
                  onClick={() => setShowWhispers(!showWhispers)}
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors mb-2"
                >
                  {showWhispers ? <EyeSlash size={14} /> : <Eye size={14} />}
                  {showWhispers ? 'Hide' : 'Show'} Whisper Channel ({epoch.whispers.length})
                  <Tip text="Private messages and gossip between agents -- not part of the public record">
                    <Info size={10} className="text-gray-400" />
                  </Tip>
                </button>
                {showWhispers && (
                  <div className="space-y-1.5 pl-4 border-l-2 border-gray-200">
                    {epoch.whispers.map((w: Whisper) => (
                      <WhisperCard key={w.id} whisper={w} agentMap={agentMap} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Provenance detail */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Broadcast size={14} className="text-gray-500" />
                Provenance
                <Tip text="Data sources, methodology, and verification chain for this epoch">
                  <Info size={10} className="text-gray-400" />
                </Tip>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] text-gray-600">
                <div>
                  <span className="text-gray-400 uppercase font-medium">Sources</span>
                  <div className="mt-0.5">{epoch.provenance.data_sources.join(', ')}</div>
                </div>
                <div>
                  <span className="text-gray-400 uppercase font-medium">Methodology</span>
                  <div className="mt-0.5">{epoch.provenance.methodology}</div>
                </div>
                <div>
                  <span className="text-gray-400 uppercase font-medium">Verifiers</span>
                  <div className="mt-0.5">{epoch.provenance.verifiers.join(', ') || 'none'}</div>
                </div>
                {epoch.atlas_context && (
                  <div>
                    <Tip text="Number of real assets and organizations referenced from the Regen Atlas intelligence pipeline">
                      <div>
                        <span className="text-gray-400 uppercase font-medium">Atlas Context</span>
                        <div className="mt-0.5">{epoch.atlas_context.assets_referenced} assets, {epoch.atlas_context.orgs_referenced} orgs</div>
                      </div>
                    </Tip>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!isLoading && !epoch && !sim.running && (
          <div className="text-center py-20">
            <ChatCircleDots size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No epoch data yet.</p>
            <p className="text-xs text-gray-400 mt-2">
              Click <strong>Run Epoch</strong> to trigger a simulation, or run{' '}
              <code className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">node simulation/run.js</code>
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
