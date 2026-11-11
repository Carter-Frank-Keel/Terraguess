import type { ReactNode } from 'react';
import { formatDuration } from '../../lib/format';
import { Icon } from '../Icon';
import { IconLink } from '../ui';

export function GameHeader({
  title,
  subtitle,
  backTo,
  backLabel = 'Back',
  badge,
  right,
}: {
  title: string;
  subtitle: string;
  backTo: string;
  backLabel?: string;
  badge?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <IconLink to={backTo} label={backLabel} icon="arrowLeft" />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate font-display text-lg font-bold tracking-tight sm:text-2xl">
              {title}
            </h1>
            {badge}
          </div>
          <p className="truncate text-xs text-muted sm:text-sm">{subtitle}</p>
        </div>
      </div>
      {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
    </header>
  );
}

export function TimerChip({ ms, label }: { ms: number; label?: string }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm font-semibold tabular-nums text-ink"
      aria-label={label ?? 'Elapsed time'}
    >
      <Icon name="clock" size={14} className="text-muted" />
      {formatDuration(ms)}
    </div>
  );
}

export function CountdownChip({ seconds, total }: { seconds: number; total: number }) {
  const urgent = seconds <= Math.max(4, total * 0.25);
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold tabular-nums ${
        urgent ? 'border-danger/40 bg-danger/10 text-danger' : 'border-line bg-surface-2 text-ink'
      }`}
      aria-label={`${seconds} seconds left`}
    >
      <Icon name="clock" size={14} />
      {seconds}s
    </div>
  );
}
