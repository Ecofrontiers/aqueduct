import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import type { Tournament, TournamentStatus } from '../types';

interface Props {
  tournament: Tournament;
}

function formatNumber(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

const statusColors: Record<TournamentStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Active: 'bg-green-100 text-green-800',
  Completed: 'bg-blue-100 text-blue-800',
};

export function TournamentCard({ tournament }: Props) {
  const progressPercent =
    tournament.totalRounds > 0
      ? (tournament.currentRound / tournament.totalRounds) * 100
      : 0;

  return (
    <Link
      to={`/tournaments/${tournament.id}`}
      className="block bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg">{tournament.tournamentType}</h3>
          <p className="text-sm text-gray-500">
            Round {tournament.currentRound} of {tournament.totalRounds}
          </p>
        </div>
        <span
          className={clsx(
            'px-3 py-1 rounded-full text-sm font-medium',
            statusColors[tournament.status]
          )}
        >
          {tournament.status}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-esv-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Prize Pool</span>
          <span className="font-mono font-medium">{formatNumber(tournament.prizePool)} ESV</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Entry Stake</span>
          <span className="font-mono">{formatNumber(tournament.entryStake)} ESV</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Participants</span>
          <span className="font-mono">
            {tournament.activeCount} / {tournament.participantCount}
          </span>
        </div>
      </div>

      {/* Bioregions */}
      {tournament.bioregions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Bioregions:</p>
          <div className="flex flex-wrap gap-2">
            {tournament.bioregions.slice(0, 3).map((b) => (
              <span
                key={b.id}
                className="px-2 py-1 bg-esv-100 text-esv-700 rounded text-xs"
              >
                {b.name}
              </span>
            ))}
            {tournament.bioregions.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                +{tournament.bioregions.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
