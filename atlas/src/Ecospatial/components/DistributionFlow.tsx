import { clsx } from 'clsx';

interface DistributionFlowProps {
  distribution: {
    totalYield: number;
    proposals: { amount: number; percentage: number };
    liquidity: { amount: number; percentage: number };
    treasury: { amount: number; percentage: number };
  };
}

export function DistributionFlow({ distribution }: DistributionFlowProps) {
  const flows = [
    {
      label: 'Proposals',
      sublabel: 'Fund regenerative work',
      amount: distribution.proposals.amount,
      percentage: distribution.proposals.percentage,
      color: 'bg-esv-500',
      textColor: 'text-esv-600',
    },
    {
      label: 'Liquidity',
      sublabel: 'ESV/USDC pool',
      amount: distribution.liquidity.amount,
      percentage: distribution.liquidity.percentage,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
    },
    {
      label: 'Treasury',
      sublabel: 'Emergency reserves',
      amount: distribution.treasury.amount,
      percentage: distribution.treasury.percentage,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Source */}
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Total Epoch Yield</p>
        <p className="text-2xl font-mono font-semibold">
          ${formatNumber(distribution.totalYield)}
        </p>
      </div>

      {/* Flow indicator */}
      <div className="flex justify-center">
        <div className="w-px h-8 bg-gray-300" />
      </div>

      {/* Distribution bars */}
      <div className="space-y-3">
        {flows.map((flow) => (
          <div key={flow.label} className="space-y-1">
            <div className="flex justify-between items-baseline">
              <div>
                <span className={clsx('font-medium', flow.textColor)}>
                  {flow.label}
                </span>
                <span className="text-xs text-gray-500 ml-2">{flow.sublabel}</span>
              </div>
              <div className="text-right">
                <span className="font-mono">${formatNumber(flow.amount)}</span>
                <span className="text-xs text-gray-500 ml-1">
                  ({flow.percentage}%)
                </span>
              </div>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all', flow.color)}
                style={{ width: `${flow.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Targets */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t">
        <FlowTarget
          icon={<ProposalIcon />}
          label="Active Proposals"
          color="text-esv-600"
        />
        <FlowTarget
          icon={<LiquidityIcon />}
          label="LP Pool"
          color="text-blue-600"
        />
        <FlowTarget
          icon={<TreasuryIcon />}
          label="DAO Treasury"
          color="text-amber-600"
        />
      </div>
    </div>
  );
}

function FlowTarget({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={clsx('w-8 h-8', color)}>{icon}</div>
      <p className="text-xs text-gray-500 text-center">{label}</p>
    </div>
  );
}

function ProposalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function LiquidityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
    </svg>
  );
}

function TreasuryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4z" />
      <path d="M8 14v4m4-4v4m4-4v4" />
    </svg>
  );
}

function formatNumber(num: number): string {
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}
