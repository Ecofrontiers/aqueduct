import { EIIScore as EIIScoreType } from '../types';
import { EIIPillars } from './EIIPillars';
import { EIISparkline } from './EIISparkline';

interface Props {
  eii: EIIScoreType;
  history?: EIIScoreType[];
  showSparkline?: boolean;
  showPillars?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

const pillarColors: Record<string, string> = {
  function: 'text-green-500',
  structure: 'text-blue-500',
  composition: 'text-purple-500',
};

export function EIIScore({
  eii,
  history,
  showSparkline = true,
  showPillars = false,
  size = 'md',
}: Props) {
  const displayScore = (eii.eii * 100).toFixed(1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/* Score */}
        <div className="flex flex-col">
          <span className={`font-semibold ${sizeClasses[size]}`}>
            {displayScore}
          </span>
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            EII Score
          </span>
        </div>

        {/* Sparkline */}
        {showSparkline && history && history.length > 1 && (
          <EIISparkline data={history.map((s) => s.eii)} width={80} height={32} />
        )}

        {/* Delta */}
        {eii.delta !== undefined && (
          <div
            className={`text-sm font-medium ${
              eii.delta >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {eii.delta >= 0 ? '+' : ''}
            {(eii.delta * 100).toFixed(2)}%
          </div>
        )}

        {/* Limiting Factor */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Limiting:</span>
          <span className={`text-xs font-medium ${pillarColors[eii.limitingPillar]}`}>
            {eii.limitingPillar.charAt(0).toUpperCase() + eii.limitingPillar.slice(1)}
          </span>
        </div>
      </div>

      {/* Pillars */}
      {showPillars && (
        <EIIPillars pillars={eii.pillars} limitingPillar={eii.limitingPillar} />
      )}
    </div>
  );
}
