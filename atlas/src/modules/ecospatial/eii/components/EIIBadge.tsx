import { clsx } from 'clsx';

interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getScoreColor(score: number): { bg: string; text: string; border: string } {
  if (score >= 0.7) {
    return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
  } else if (score >= 0.4) {
    return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
  } else {
    return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
  }
}

function getScoreLabel(score: number): string {
  if (score >= 0.7) return 'High Integrity';
  if (score >= 0.4) return 'Moderate';
  return 'Low Integrity';
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function EIIBadge({ score, size = 'md', showLabel = true }: Props) {
  const colors = getScoreColor(score);
  const label = getScoreLabel(score);
  const displayScore = (score * 100).toFixed(0);

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        colors.bg,
        colors.text,
        colors.border,
        sizeClasses[size]
      )}
    >
      <span className="font-mono">{displayScore}</span>
      {showLabel && <span className="font-normal">{label}</span>}
    </span>
  );
}
