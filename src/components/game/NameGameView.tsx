import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { CONTINENT_BY_ID } from '../../data/regions';
import type { GameSummary } from '../../game/types';
import { useNameGame } from '../../game/useNameGame';
import { cx } from '../../lib/cx';
import { findExactCountryMatch, hasLongerNameStartingWith } from '../../lib/matching';
import { sfx } from '../../lib/sound';
import { useSettings } from '../../state/SettingsProvider';
import { useStats } from '../../state/StatsProvider';
import type { ContinentId, Country, GameModeId, RegionId } from '../../types';
import { Icon } from '../Icon';
import { Badge, Button, ButtonLink, Card, Eyebrow, Modal, ProgressBar, StatTile } from '../ui';
import { CountryPill } from './CountryPill';
import { GameHeader, TimerChip } from './GameHeader';
import { ResultsPanel } from './ResultsPanel';

type Feedback = { tone: 'success' | 'danger' | 'warning'; message: string } | null;

export interface NameGameViewProps {
  pool: Country[];
  mode: GameModeId;
  regionId?: RegionId;
  title: string;
  subtitle: string;
  backTo: string;
  backLabel?: string;
  exitLabel?: string;
  headerExtra?: ReactNode;
}

export function NameGameView({
  pool,
  mode,
  regionId,
  title,
  subtitle,
  backTo,
  backLabel,
  exitLabel = 'Home',
  headerExtra,
}: NameGameViewProps) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { recordGame } = useStats();

  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFinish = useCallback(
    (result: GameSummary) => {
      setSummary(result);
      sfx.finish();
      recordGame({
        mode,
        challenge: 'name',
        regionId,
        correct: result.correct,
        incorrect: result.incorrect,
        total: result.total,
        percent: result.percent,
        accuracy: result.accuracy,
        durationMs: result.durationMs,
        identified: result.identified,
        missed: result.missed,
        difficult: [],
        timed: settings.timer,
        at: Date.now(),
      });
    },
    [mode, recordGame, regionId, settings.timer],
  );

  const game = useNameGame({ pool, lenient: settings.lenientMatching, onFinish: handleFinish });
  const { submit, found, status, reset } = game;

  useEffect(() => {
    if (status === 'playing') inputRef.current?.focus();
  }, [status]);

  const evaluate = useCallback(
    (raw: string) => {
      const outcome = submit(raw);
      switch (outcome.kind) {
        case 'correct':
          setInput('');
          setFeedback({
            tone: 'success',
            message: `${outcome.country.name} added to your atlas.`,
          });
          sfx.correct();
          break;
        case 'duplicate':
          setFeedback({
            tone: 'warning',
            message: `${outcome.country.name} is already on your list.`,
          });
          break;
        case 'outside':
          setFeedback({
            tone: 'warning',
            message: `${outcome.country.name} is not part of this challenge.`,
          });
          sfx.wrong();
          break;
        case 'invalid':
          setFeedback({
            tone: 'danger',
            message: 'That is not a country we recognise — check the spelling and try again.',
          });
          sfx.wrong();
          break;
        case 'empty':
        case 'finished':
          break;
      }
      return outcome;
    },
    [submit],
  );

  const handleChange = (value: string) => {
    setInput(value);
    if (feedback?.tone !== 'success') setFeedback(null);
    const trimmed = value.trim();
    if (trimmed.length < 3) return;

    const exact = findExactCountryMatch(trimmed);
    if (!exact) return;
    // Wait for more letters when the answer is the start of a longer name.
    if (hasLongerNameStartingWith(trimmed, exact.iso3)) return;
    if (!pool.some((country) => country.iso3 === exact.iso3)) return;
    if (found.some((country) => country.iso3 === exact.iso3)) return;

    evaluate(trimmed);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    evaluate(input);
  };

  const handleReplay = () => {
    setSummary(null);
    setFeedback(null);
    setInput('');
    reset();
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const sortedFound = useMemo(
    () => [...found].sort((a, b) => a.name.localeCompare(b.name, 'en')),
    [found],
  );

  const breakdown = useMemo(() => {
    const buckets = new Map<ContinentId, { total: number; found: number }>();
    for (const country of pool) {
      const bucket = buckets.get(country.continent) ?? { total: 0, found: 0 };
      bucket.total += 1;
      buckets.set(country.continent, bucket);
    }
    for (const country of found) {
      const bucket = buckets.get(country.continent);
      if (bucket) bucket.found += 1;
    }
    return [...buckets.entries()].map(([id, value]) => ({
      id,
      name: CONTINENT_BY_ID.get(id)?.name ?? id,
      ...value,
    }));
  }, [pool, found]);

  if (summary) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <GameHeader
          title={title}
          subtitle={subtitle}
          backTo={backTo}
          backLabel={backLabel}
          right={
            <ButtonLink to="/" variant="secondary" size="sm" icon="home">
              Home
            </ButtonLink>
          }
        />
        <ResultsPanel
          summary={summary}
          timed={settings.timer}
          revealMissed={settings.revealMissed}
          onReplay={handleReplay}
          onExit={() => navigate(backTo)}
          exitLabel={exitLabel}
        />
      </div>
    );
  }

  const borderTone =
    feedback?.tone === 'success'
      ? 'border-success/50'
      : feedback?.tone === 'danger'
        ? 'border-danger/60'
        : feedback?.tone === 'warning'
          ? 'border-warning/50'
          : 'border-line focus-within:border-accent/60';

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
      <GameHeader
        title={title}
        subtitle={subtitle}
        backTo={backTo}
        backLabel={backLabel}
        badge={
          <Badge tone="accent">
            {found.length}/{pool.length}
          </Badge>
        }
        right={
          <>
            {headerExtra}
            {settings.timer ? <TimerChip ms={game.elapsedMs} /> : null}
            <Button
              variant="secondary"
              size="sm"
              icon="flag"
              onClick={() => setConfirmEnd(true)}
            >
              End game
            </Button>
          </>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="flex flex-col gap-3">
          <Card className="p-4 sm:p-5">
            <form onSubmit={handleSubmit}>
              <label htmlFor="country-answer" className="sr-only">
                Country name
              </label>
              <div
                className={cx(
                  'relative rounded-2xl border bg-surface-2 transition-colors',
                  borderTone,
                  feedback?.tone === 'danger' && 'animate-shake',
                )}
              >
                <Icon
                  name="search"
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  id="country-answer"
                  ref={inputRef}
                  value={input}
                  onChange={(event) => handleChange(event.target.value)}
                  placeholder="Type a country name…"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={feedback?.tone === 'danger'}
                  aria-describedby="answer-feedback"
                  className="h-14 w-full rounded-2xl bg-transparent pl-12 pr-24 text-base font-medium text-ink outline-none placeholder:text-muted/70 sm:text-lg"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  disabled={!input.trim()}
                >
                  Enter
                </Button>
              </div>
            </form>
            <div
              id="answer-feedback"
              role="status"
              aria-live="polite"
              className={cx(
                'mt-2 min-h-5 text-sm',
                feedback?.tone === 'success'
                  ? 'text-success'
                  : feedback?.tone === 'danger'
                    ? 'text-danger'
                    : feedback?.tone === 'warning'
                      ? 'text-warning'
                      : 'text-muted',
              )}
            >
              {feedback?.message ??
                'Press Enter to submit. Alternative names and spellings are accepted.'}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>
                {found.length} found · {pool.length - found.length} to go
              </span>
              <span className="font-semibold text-ink">{game.percent}%</span>
            </div>
            <ProgressBar value={game.percent} className="mt-1.5" label="Countries identified" />
          </Card>

          <Card className="flex-1 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-ink">Countries found</h2>
              <span className="text-xs text-muted">
                {found.length} of {pool.length}
              </span>
            </div>
            {sortedFound.length === 0 ? (
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Nothing here yet. Every correct answer appears as a chip, so you can see your atlas
                fill up as you go.
              </p>
            ) : (
              <div className="scroll-thin mt-3 flex max-h-[42vh] flex-wrap gap-1.5 overflow-y-auto pr-1">
                {sortedFound.map((country) => (
                  <CountryPill key={country.iso3} iso3={country.iso3} />
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Card className="p-4">
            <Eyebrow>This round</Eyebrow>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <StatTile label="Found" value={found.length} />
              <StatTile label="Remaining" value={pool.length - found.length} />
              <StatTile label="Complete" value={`${game.percent}%`} />
              <StatTile label="Wrong tries" value={game.wrongAttempts} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>Accuracy</span>
              <span className="font-semibold text-ink">{game.accuracy}%</span>
            </div>
          </Card>

          {breakdown.length > 1 ? (
            <Card className="p-4">
              <Eyebrow>By continent</Eyebrow>
              <div className="mt-3 space-y-2.5">
                {breakdown.map((entry) => {
                  const percent = entry.total > 0 ? Math.round((entry.found / entry.total) * 100) : 0;
                  return (
                    <div key={entry.id}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted">{entry.name}</span>
                        <span className="font-medium tabular-nums text-ink">
                          {entry.found}/{entry.total}
                        </span>
                      </div>
                      <ProgressBar
                        value={percent}
                        tone={percent === 100 ? 'success' : 'accent'}
                        className="mt-1 h-1.5"
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}

          <Card className="p-4">
            <Eyebrow className="flex items-center gap-1.5">
              <Icon name="bulb" size={12} /> Tips
            </Eyebrow>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted">
              <li>Names are recognised as you type; pressing Enter also works.</li>
              <li>Abbreviations such as USA, UK and UAE count, as do older names like Burma.</li>
              <li>Duplicates never count twice, and wrong guesses still reveal nothing.</li>
            </ul>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="End this round?"
        description="Your results are saved with the countries identified so far."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmEnd(false)}>
              Keep playing
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon="flag"
              onClick={() => {
                setConfirmEnd(false);
                game.finish();
              }}
            >
              End round
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          {found.length} of {pool.length} countries identified · {game.percent}% · {game.wrongAttempts}{' '}
          wrong {game.wrongAttempts === 1 ? 'try' : 'tries'}
        </p>
      </Modal>
    </div>
  );
}
