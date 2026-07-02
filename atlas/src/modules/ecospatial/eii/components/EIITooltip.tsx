import { useState } from 'react';
import { EIIPillars as EIIPillarsType, PillarType, PILLAR_LABELS } from '../types';

interface Props {
  pillars: EIIPillarsType;
  limitingPillar: PillarType;
  children: React.ReactNode;
}

const PILLAR_DESCRIPTIONS: Record<PillarType, string> = {
  function:
    'Measures ecosystem processes like carbon cycling, water filtration, and nutrient cycling. Higher values indicate healthy ecosystem function.',
  structure:
    'Measures physical habitat characteristics including vegetation layers, deadwood, and structural complexity. Higher values indicate diverse habitat structure.',
  composition:
    'Measures species diversity and native vs invasive balance. Higher values indicate native-dominated, species-rich communities.',
};

export function EIITooltip({ pillars, limitingPillar, children }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-help"
      >
        {children}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-72 p-4 bg-white border border-gray-200 rounded-lg shadow-lg left-0 top-full mt-2">
          <h4 className="font-semibold text-sm mb-3">EII Pillars</h4>

          <div className="space-y-3">
            {(Object.keys(pillars) as PillarType[]).map((pillar) => {
              const isLimiting = pillar === limitingPillar;
              return (
                <div key={pillar} className={isLimiting ? 'bg-red-50 p-2 rounded -mx-2' : ''}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {PILLAR_LABELS[pillar]}
                      {isLimiting && (
                        <span className="ml-2 text-xs text-red-600">(Limiting)</span>
                      )}
                    </span>
                    <span className="text-sm font-mono">
                      {(pillars[pillar] * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{PILLAR_DESCRIPTIONS[pillar]}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              The EII score equals the minimum pillar value. Improving the limiting pillar has
              the greatest impact on overall ecosystem integrity.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
