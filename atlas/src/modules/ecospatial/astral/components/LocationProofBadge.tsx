/**
 * LocationProofBadge - Shows verification status for asset locations
 * Uses Astral Protocol location attestations
 */

import { useState } from 'react';
import clsx from 'clsx';
import {
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Warning,
  Question,
  ShieldCheck,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import type { LocationVerificationStatus, LocationAttestation, CredibilityVector } from '../types';
import {
  useAssetVerificationStatus,
  getStatusText,
  getStatusColor,
  formatAttestationTime,
  getTimeUntilExpiry,
  calculateCredibilityScore,
} from '../hooks';

interface LocationProofBadgeProps {
  assetId: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

const STATUS_ICONS: Record<LocationVerificationStatus, typeof CheckCircle> = {
  verified: CheckCircle,
  pending: Clock,
  expired: Warning,
  revoked: XCircle,
  failed: XCircle,
  unverified: Question,
};

export function LocationProofBadge({
  assetId,
  size = 'md',
  showDetails = false,
  className,
}: LocationProofBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const { status, attestation, isLoading } = useAssetVerificationStatus(assetId);

  if (isLoading) {
    return (
      <div className={clsx(
        'inline-flex items-center gap-1 animate-pulse',
        size === 'sm' && 'text-[10px]',
        size === 'md' && 'text-xs',
        size === 'lg' && 'text-sm',
        className
      )}>
        <MapPin className="text-white/30" />
        <span className="text-white/30">Checking...</span>
      </div>
    );
  }

  const Icon = STATUS_ICONS[status];
  const colorClass = getStatusColor(status);
  const statusText = getStatusText(status);

  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;

  return (
    <div className={clsx('relative', className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={clsx(
          'inline-flex items-center gap-1 transition-colors',
          size === 'sm' && 'text-[10px]',
          size === 'md' && 'text-xs',
          size === 'lg' && 'text-sm',
          status === 'verified' ? 'hover:text-emerald-300' : 'hover:text-white/70',
          colorClass
        )}
        title={statusText}
      >
        <Icon size={iconSize} weight={status === 'verified' ? 'fill' : 'regular'} />
        {showDetails && <span>{statusText}</span>}
      </button>

      {/* Expanded details popover */}
      {expanded && attestation && (
        <div className="absolute z-50 top-full left-0 mt-2 w-64 p-3 bg-gray-900 border border-white/10 rounded-lg shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span className="text-white text-xs font-medium">Location Proof</span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-white/40 hover:text-white text-xs"
            >
              ×
            </button>
          </div>

          <AttestationDetails attestation={attestation} />

          {/* Link to explorer */}
          <a
            href={`https://base-sepolia.easscan.org/attestation/view/${attestation.uid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            View on EAS Explorer
            <ArrowSquareOut size={10} />
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Compact badge variant for asset cards
 */
export function LocationProofChip({
  assetId,
  className,
}: {
  assetId: string;
  className?: string;
}) {
  const { status, isLoading } = useAssetVerificationStatus(assetId);

  if (isLoading || status === 'unverified') {
    return null;
  }

  const StatusIcon = STATUS_ICONS[status];
  const colorClass = getStatusColor(status);

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium',
        status === 'verified' && 'bg-emerald-500/20',
        status === 'pending' && 'bg-yellow-500/20',
        status === 'expired' && 'bg-orange-500/20',
        (status === 'revoked' || status === 'failed') && 'bg-red-500/20',
        colorClass,
        className
      )}
      title={getStatusText(status)}
    >
      <StatusIcon size={10} weight="fill" />
      <span>
        {status === 'verified' ? 'Verified' : status === 'pending' ? 'Pending' : status}
      </span>
    </div>
  );
}

/**
 * Detailed attestation info
 */
function AttestationDetails({ attestation }: { attestation: LocationAttestation }) {
  const expiry = getTimeUntilExpiry(attestation);

  return (
    <div className="space-y-2 text-[11px]">
      {/* Attester */}
      <div className="flex justify-between">
        <span className="text-white/50">Attester</span>
        <span className="text-white/80 font-mono">
          {attestation.attester.slice(0, 6)}...{attestation.attester.slice(-4)}
        </span>
      </div>

      {/* Timestamp */}
      <div className="flex justify-between">
        <span className="text-white/50">Verified</span>
        <span className="text-white/80">{formatAttestationTime(attestation.timestamp)}</span>
      </div>

      {/* Expiry */}
      {expiry && (
        <div className="flex justify-between">
          <span className="text-white/50">Expires</span>
          <span className={clsx(
            expiry === 'Expired' ? 'text-red-400' : 'text-white/80'
          )}>
            {expiry}
          </span>
        </div>
      )}

      {/* Memo */}
      {attestation.memo && (
        <div className="pt-2 border-t border-white/10">
          <span className="text-white/50 block mb-1">Note</span>
          <span className="text-white/70">{attestation.memo}</span>
        </div>
      )}

      {/* Location preview */}
      {attestation.location && (
        <div className="pt-2 border-t border-white/10">
          <span className="text-white/50 block mb-1">Location</span>
          <LocationPreview geometry={attestation.location} />
        </div>
      )}

      {/* Chain info */}
      <div className="pt-2 border-t border-white/10 flex justify-between">
        <span className="text-white/50">Chain</span>
        <span className="text-white/60 font-mono text-[10px]">
          {attestation.chainId === 84532 ? 'Base Sepolia' :
           attestation.chainId === 8453 ? 'Base' :
           attestation.chainId === 42220 ? 'Celo' :
           `Chain ${attestation.chainId}`}
        </span>
      </div>
    </div>
  );
}

/**
 * Simple location geometry preview
 */
function LocationPreview({ geometry }: { geometry: GeoJSON.Geometry }) {
  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates;
    return (
      <span className="text-white/70 font-mono text-[10px]">
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </span>
    );
  }

  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    return (
      <span className="text-white/70 text-[10px]">
        Polygon boundary
      </span>
    );
  }

  return (
    <span className="text-white/50 text-[10px]">
      {geometry.type}
    </span>
  );
}

/**
 * Credibility vector visualization
 */
export function CredibilityVectorDisplay({
  vector,
  className,
}: {
  vector: CredibilityVector;
  className?: string;
}) {
  const factors = [
    { key: 'gps', label: 'GPS', value: vector.gps },
    { key: 'ip', label: 'IP', value: vector.ip },
    { key: 'wifi', label: 'WiFi', value: vector.wifi },
    { key: 'cellular', label: 'Cell', value: vector.cellular },
    { key: 'temporal', label: 'Time', value: vector.temporal },
    { key: 'consensus', label: 'Consensus', value: vector.consensus },
  ];

  const overallScore = calculateCredibilityScore(vector);

  return (
    <div className={clsx('space-y-2', className)}>
      <div className="flex justify-between items-center">
        <span className="text-white/50 text-[10px]">Credibility Score</span>
        <span className={clsx(
          'text-xs font-medium',
          overallScore >= 0.8 ? 'text-emerald-400' :
          overallScore >= 0.6 ? 'text-yellow-400' : 'text-red-400'
        )}>
          {(overallScore * 100).toFixed(0)}%
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {factors.map((factor) => (
          <div
            key={factor.key}
            className="flex flex-col items-center p-1 bg-white/5 rounded"
          >
            <span className="text-[9px] text-white/40">{factor.label}</span>
            <div className="w-full h-1 bg-white/10 rounded-full mt-0.5">
              <div
                className={clsx(
                  'h-full rounded-full',
                  factor.value >= 0.8 ? 'bg-emerald-500' :
                  factor.value >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${factor.value * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
