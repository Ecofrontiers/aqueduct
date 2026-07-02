import { Link } from 'react-router-dom';
import type { Agent } from '../types';
import { StatusDot } from './StatusDot';
import { AgentBadge } from './AgentBadge';

interface Props {
  agent: Agent;
  showCommitments?: boolean;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

export function AgentCard({ agent, showCommitments = true }: Props) {
  return (
    <Link
      to={`/agents/${agent.address}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar placeholder */}
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-lg">
              {agent.agentType === 'MONITORING' && '\uD83D\uDC41\uFE0F'}
              {agent.agentType === 'ECONOMIC' && '\uD83D\uDCB0'}
              {agent.agentType === 'SOCIAL' && '\uD83D\uDDE3\uFE0F'}
              {agent.agentType === 'SPECIALIST' && '\uD83D\uDD2C'}
              {agent.agentType === 'REPRESENTATION' && '\uD83E\uDDA9'}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{agent.name || 'Unnamed Agent'}</span>
              <StatusDot status={agent.status} />
            </div>
            <span className="font-mono text-xs text-gray-500">
              {truncateAddress(agent.address)}
            </span>
          </div>
        </div>

        <AgentBadge type={agent.agentType} size="sm" showLabel={false} />
      </div>

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <span className="text-lg font-semibold">{formatNumber(agent.totalESVEarned)}</span>
          <span className="block text-xs text-gray-500">ESV Earned</span>
        </div>
        <div>
          <span className="text-lg font-semibold">{agent.reputationScore}%</span>
          <span className="block text-xs text-gray-500">Reputation</span>
        </div>
        <div>
          <span className="text-lg font-semibold">{agent.commitments.length}</span>
          <span className="block text-xs text-gray-500">Commits</span>
        </div>
      </div>

      {/* Commitments */}
      {showCommitments && agent.commitments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-500 block mb-2">Committed to:</span>
          <div className="space-y-1">
            {agent.commitments.slice(0, 3).map((c) => (
              <div key={c.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{c.bioregionId}</span>
                <span className="text-gray-500">{c.percentageBps / 100}%</span>
              </div>
            ))}
            {agent.commitments.length > 3 && (
              <span className="text-xs text-gray-400">
                +{agent.commitments.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
