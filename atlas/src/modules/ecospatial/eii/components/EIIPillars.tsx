import { EIIPillars as EIIPillarsType, PillarType } from '../types';

interface Props {
  pillars: EIIPillarsType;
  limitingPillar: PillarType;
  showLabels?: boolean;
}

const pillarData = [
  { key: 'function' as const, label: 'Function', color: 'bg-green-500' },
  { key: 'structure' as const, label: 'Structure', color: 'bg-blue-500' },
  { key: 'composition' as const, label: 'Composition', color: 'bg-purple-500' },
];

export function EIIPillars({ pillars, limitingPillar, showLabels = true }: Props) {
  return (
    <div className="space-y-2">
      {pillarData.map((pillar) => {
        const value = pillars[pillar.key];
        const isLimiting = pillar.key === limitingPillar;

        return (
          <div key={pillar.key} className="flex items-center gap-2">
            {showLabels && (
              <span className="w-24 text-xs text-gray-500">{pillar.label}</span>
            )}

            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${pillar.color} ${
                  isLimiting ? 'ring-2 ring-red-400 ring-offset-1' : ''
                }`}
                style={{ width: `${value * 100}%` }}
              />
            </div>

            <span className="w-10 text-xs font-mono text-right">
              {(value * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
