import { formatDuration } from '../../lib/format';
import { verdictFor } from '../../lib/scoring';
import type { GameSummary } from '../../game/types';
import { CountryPill } from './CountryPill';
import { Button, Card, Eyebrow, StatTile } from '../ui';
import { Icon } from '../Icon';

export function ResultsPanel({
  summary,
  timed,
  revealMissed,
  onReplay,
  onExit,
  exitLabel,
  difficult,
  onSecondary,
  secondaryLabel,
  title = 'Round complete',
}: {
  summary: GameSummary;
  timed: boolean;
  revealMissed: boolean;
  onReplay: () => void;
  onExit: () => void;
  exitLabel: string;
  difficult?: { iso3: string; attempts: number }[];
  onSecondary?: () => void;
  secondaryLabel?: string;
  title?: string;
}) {
  return (
    <Card className="animate-fade-up p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent ring-1 ring-accent/25">
          <Icon name="trophy" size={22} />
        </div>
        <div className="min-w-0">
          <Eyebrow>{title}</Eyebrow>
          <h2 className="mt-0.5 font-display text-xl font-bold leading-tight text-ink sm:text-2xl">
            {summary.percent}% · {verdictFor(summary.percent)}
          </h2>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Identified" value={`${summary.correct}/${summary.total}`} />
        <StatTile label="Accuracy" value={`${summary.accuracy}%`} />
        <StatTile label="Wrong tries" value={summary.incorrect} />
        <StatTile label="Time" value={timed ? formatDuration(summary.durationMs) : 'Untimed'} />
      </div>

      {difficult && difficult.length > 0 ? (
        <div className="mt-4">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            <Icon name="target" size={13} /> Trickiest countries
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {difficult.slice(0, 8).map((entry) => (
              <CountryPill
                key={entry.iso3}
                iso3={entry.iso3}
                tone="neutral"
                attempts={entry.attempts}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          <Icon name="map" size={13} />
          {summary.missed.length > 0
            ? `${summary.missed.length} missed`
            : 'Every single one identified'}
        </h3>
        {summary.missed.length === 0 ? (
          <p className="mt-1.5 text-sm text-success">
            A clean sweep — nothing left on the map for this round.
          </p>
        ) : revealMissed ? (
          <div className="scroll-thin mt-2 max-h-40 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-1.5">
              {summary.missed.map((iso3) => (
                <CountryPill key={iso3} iso3={iso3} tone="missed" />
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Missed countries are hidden. Enable “Reveal missed countries” in settings to review them
            after a round.
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button icon="replay" onClick={onReplay}>
          Play again
        </Button>
        <Button variant="secondary" icon="home" onClick={onExit}>
          {exitLabel}
        </Button>
        {onSecondary && secondaryLabel ? (
          <Button variant="ghost" icon="layers" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
