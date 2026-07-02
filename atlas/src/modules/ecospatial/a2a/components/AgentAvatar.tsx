/**
 * AgentAvatar - AI-generated avatars for agents with SVG fallback
 * Uses Replicate API for image generation, falls back to procedural SVG
 */

import { useMemo, useState } from 'react';
import type { AgentType, AgentStatus } from '../types';
import { useAgentPFP } from '../../replicate';

interface AgentAvatarProps {
  address: string;
  agentType: AgentType;
  status?: AgentStatus;
  size?: number;
  className?: string;
}

// Color palettes per agent type
const TYPE_PALETTES: Record<AgentType, { primary: string; secondary: string; accent: string }> = {
  MONITORING: { primary: '#10B981', secondary: '#059669', accent: '#D1FAE5' },
  ECONOMIC: { primary: '#F59E0B', secondary: '#D97706', accent: '#FEF3C7' },
  SOCIAL: { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#EDE9FE' },
  SPECIALIST: { primary: '#3B82F6', secondary: '#2563EB', accent: '#DBEAFE' },
  REPRESENTATION: { primary: '#EC4899', secondary: '#DB2777', accent: '#FCE7F3' },
};

// Generate a deterministic hash from a string
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Generate SVG path for abstract shape
function generateShape(hash: number, index: number): string {
  const shapes = [
    // Circle
    (cx: number, cy: number, r: number) => `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`,
    // Square
    (cx: number, cy: number, r: number) => `M ${cx - r} ${cy - r} L ${cx + r} ${cy - r} L ${cx + r} ${cy + r} L ${cx - r} ${cy + r} Z`,
    // Diamond
    (cx: number, cy: number, r: number) => `M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`,
    // Triangle up
    (cx: number, cy: number, r: number) => `M ${cx} ${cy - r} L ${cx + r} ${cy + r * 0.7} L ${cx - r} ${cy + r * 0.7} Z`,
    // Hexagon
    (cx: number, cy: number, r: number) => {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        points.push(`${cx + r * Math.cos(angle)} ${cy + r * Math.sin(angle)}`);
      }
      return `M ${points.join(' L ')} Z`;
    },
  ];

  const shapeIndex = (hash + index * 7) % shapes.length;
  const cx = 32 + ((hash >> (index * 3)) % 20) - 10;
  const cy = 32 + ((hash >> (index * 3 + 1)) % 20) - 10;
  const r = 8 + ((hash >> (index * 3 + 2)) % 12);

  return shapes[shapeIndex](cx, cy, r);
}

// Generate decorative pattern
function generatePattern(hash: number): JSX.Element[] {
  const elements: JSX.Element[] = [];
  const patternCount = 2 + (hash % 3);

  for (let i = 0; i < patternCount; i++) {
    const rotation = ((hash >> (i * 4)) % 360);
    const scale = 0.3 + ((hash >> (i * 4 + 2)) % 40) / 100;
    const opacity = 0.3 + ((hash >> (i * 4 + 3)) % 50) / 100;

    elements.push(
      <path
        key={`pattern-${i}`}
        d={generateShape(hash, i)}
        transform={`rotate(${rotation} 32 32) scale(${scale})`}
        style={{ transformOrigin: '32px 32px' }}
        opacity={opacity}
      />
    );
  }

  return elements;
}

// Icon paths for agent types
const TYPE_ICONS: Record<AgentType, string> = {
  MONITORING: 'M32 16c-8.8 0-16 7.2-16 16s7.2 16 16 16 16-7.2 16-16-7.2-16-16-16zm0 28c-6.6 0-12-5.4-12-12s5.4-12 12-12 12 5.4 12 12-5.4 12-12 12zm0-20c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z', // Eye
  ECONOMIC: 'M32 16c-8.8 0-16 7.2-16 16s7.2 16 16 16 16-7.2 16-16-7.2-16-16-16zm0 28c-2 0-3.6-1.2-4.4-3h8.8c-.8 1.8-2.4 3-4.4 3zm8-6H24v-2h16v2zm-.4-4H24.4c-.4-1-1.4-4 0-7l2.6 1.4c-.6 1.2-.6 2.2-.4 3.2h10.8c.2-1-.2-2-.4-3.2l2.6-1.4c1.4 3 .4 6 0 7z', // Bell
  SOCIAL: 'M44 28c0-3.3-2.7-6-6-6-1.8 0-3.4.8-4.5 2-.8-.6-1.8-1-2.9-1.2-.3-.8-.6-1.6-1.1-2.3 1.4-1.1 2.5-2.8 2.5-4.5 0-3.3-2.7-6-6-6s-6 2.7-6 6c0 1.7 1.1 3.4 2.5 4.5-.5.7-.8 1.5-1.1 2.3-1.1.2-2.1.6-2.9 1.2-1.1-1.2-2.7-2-4.5-2-3.3 0-6 2.7-6 6s2.7 6 6 6c.5 0 1-.1 1.5-.2.5 2.2 2.1 4 4.2 4.8-.2.5-.2 1-.2 1.4 0 3.3 2.7 6 6 6s6-2.7 6-6c0-.5-.1-1-.2-1.4 2.1-.8 3.7-2.6 4.2-4.8.5.1 1 .2 1.5.2 3.3 0 6-2.7 6-6z', // Network
  SPECIALIST: 'M40 20l-4-4-4 4V14h-8v6l-4-4-4 4 4 4h-6v8h6l-4 4 4 4 4-4v6h8v-6l4 4 4-4-4-4h6v-8h-6l4-4zm-8 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z', // Gear/cog
  REPRESENTATION: 'M32 14c-1.1 0-2 .9-2 2v2h-6c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h4v12c0 3.3 2.7 6 6 6h8c1.1 0 2-.9 2-2s-.9-2-2-2h-8c-1.1 0-2-.9-2-2V26h4c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2h-6v-2c0-1.1-.9-2-2-2zm-12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z', // Bird/nature
};

// SVG-only avatar (used as fallback)
function AgentAvatarSVG({
  address,
  agentType,
  status = 'ACTIVE',
  size = 40,
  className = '',
}: AgentAvatarProps) {
  const hash = useMemo(() => hashCode(address), [address]);
  const palette = TYPE_PALETTES[agentType];

  // Generate unique gradient angle
  const gradientAngle = hash % 360;

  // Status indicator color
  const statusColors: Record<AgentStatus, string> = {
    ACTIVE: '#10B981',
    IDLE: '#F59E0B',
    OFFLINE: '#6B7280',
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      style={{ borderRadius: '8px' }}
    >
      <defs>
        <linearGradient
          id={`grad-${address.slice(-8)}`}
          gradientTransform={`rotate(${gradientAngle})`}
        >
          <stop offset="0%" stopColor={palette.primary} />
          <stop offset="100%" stopColor={palette.secondary} />
        </linearGradient>
        <clipPath id={`clip-${address.slice(-8)}`}>
          <rect x="0" y="0" width="64" height="64" rx="8" />
        </clipPath>
      </defs>

      {/* Background */}
      <rect
        x="0"
        y="0"
        width="64"
        height="64"
        rx="8"
        fill={`url(#grad-${address.slice(-8)})`}
      />

      {/* Decorative pattern layer */}
      <g
        clipPath={`url(#clip-${address.slice(-8)})`}
        fill={palette.accent}
      >
        {generatePattern(hash)}
      </g>

      {/* Central icon */}
      <g transform="translate(0, 0)">
        <path
          d={TYPE_ICONS[agentType]}
          fill="white"
          opacity="0.95"
        />
      </g>

      {/* Status indicator */}
      <circle
        cx="54"
        cy="54"
        r="6"
        fill={statusColors[status]}
        stroke="white"
        strokeWidth="2"
      />
    </svg>
  );
}

export function AgentAvatar({
  address,
  agentType,
  status = 'ACTIVE',
  size = 40,
  className = '',
}: AgentAvatarProps) {
  const { data: pfpUrl, isLoading } = useAgentPFP(address, agentType);
  const [imageError, setImageError] = useState(false);

  const statusColors: Record<AgentStatus, string> = {
    ACTIVE: '#10B981',
    IDLE: '#F59E0B',
    OFFLINE: '#6B7280',
  };

  // Show AI-generated image if available
  if (pfpUrl && !imageError) {
    return (
      <div className={`relative ${className}`} style={{ width: size, height: size }}>
        <img
          src={pfpUrl}
          alt={`Agent ${address.slice(0, 6)}...`}
          className="w-full h-full rounded-lg object-cover"
          style={{ borderRadius: '8px' }}
          onError={() => setImageError(true)}
        />
        {/* Status indicator */}
        <div
          className="absolute"
          style={{
            bottom: -2,
            right: -2,
            width: size * 0.2,
            height: size * 0.2,
            backgroundColor: statusColors[status],
            borderRadius: '50%',
            border: '2px solid white',
          }}
        />
        {/* Loading shimmer overlay while fetching */}
        {isLoading && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse rounded-lg" />
        )}
      </div>
    );
  }

  // Fall back to SVG avatar
  return (
    <AgentAvatarSVG
      address={address}
      agentType={agentType}
      status={status}
      size={size}
      className={className}
    />
  );
}

// SVG-only compact avatar (used as fallback)
function AgentAvatarCompactSVG({
  address,
  agentType,
  status = 'ACTIVE',
  size = 32,
  className = '',
}: AgentAvatarProps) {
  const hash = useMemo(() => hashCode(address), [address]);
  const palette = TYPE_PALETTES[agentType];
  const gradientAngle = hash % 360;

  const statusColors: Record<AgentStatus, string> = {
    ACTIVE: '#10B981',
    IDLE: '#F59E0B',
    OFFLINE: '#6B7280',
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={{ borderRadius: '6px' }}
    >
      <defs>
        <linearGradient
          id={`grad-compact-${address.slice(-8)}`}
          gradientTransform={`rotate(${gradientAngle})`}
        >
          <stop offset="0%" stopColor={palette.primary} />
          <stop offset="100%" stopColor={palette.secondary} />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect
        x="0"
        y="0"
        width="32"
        height="32"
        rx="6"
        fill={`url(#grad-compact-${address.slice(-8)})`}
      />

      {/* Scaled icon */}
      <g transform="scale(0.5) translate(0, 0)">
        <path
          d={TYPE_ICONS[agentType]}
          fill="white"
          opacity="0.95"
        />
      </g>

      {/* Status dot */}
      <circle
        cx="26"
        cy="26"
        r="4"
        fill={statusColors[status]}
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/**
 * Compact avatar variant for lists - with AI image support
 */
export function AgentAvatarCompact({
  address,
  agentType,
  status = 'ACTIVE',
  size = 32,
  className = '',
}: AgentAvatarProps) {
  const { data: pfpUrl } = useAgentPFP(address, agentType);
  const [imageError, setImageError] = useState(false);

  const statusColors: Record<AgentStatus, string> = {
    ACTIVE: '#10B981',
    IDLE: '#F59E0B',
    OFFLINE: '#6B7280',
  };

  // Show AI-generated image if available
  if (pfpUrl && !imageError) {
    return (
      <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
        <img
          src={pfpUrl}
          alt={`Agent ${address.slice(0, 6)}...`}
          className="w-full h-full object-cover"
          style={{ borderRadius: '6px' }}
          onError={() => setImageError(true)}
        />
        {/* Status dot */}
        <div
          className="absolute"
          style={{
            bottom: -1,
            right: -1,
            width: size * 0.25,
            height: size * 0.25,
            backgroundColor: statusColors[status],
            borderRadius: '50%',
            border: '1.5px solid white',
          }}
        />
      </div>
    );
  }

  // Fall back to SVG avatar
  return (
    <AgentAvatarCompactSVG
      address={address}
      agentType={agentType}
      status={status}
      size={size}
      className={className}
    />
  );
}

export default AgentAvatar;
