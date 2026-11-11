import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRegionCountries, getRegionName } from '../../data/regions';
import type { FindSummary } from '../../game/types';
import { useFindGame } from '../../game/useFindGame';
import { cx } from '../../lib/cx';
import { boundsForCountries, type Bounds } from '../../lib/geo';
import { accuracyOf } from '../../lib/scoring';
import { sfx } from '../../lib/sound';
import { useSettings } from '../../state/SettingsProvider';
import { useStats } from '../../state/StatsProvider';
import { useWorldGeo } from '../../state/WorldGeoProvider';
import type { Country, GameModeId, RegionId } from '../../types';
import { Icon } from '../Icon';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  ErrorPanel,
  Eyebrow,
  LoadingPanel,
  Modal,
  ProgressBar,
  Segmented,
  StatTile,
  Toggle,
} from '../ui';
import { WorldMap } from '../map/WorldMap';
import { CountryPill } from './CountryPill';
import { CountdownChip, GameHeader, TimerChip } from './GameHeader';
import { ResultsPanel } from './ResultsPanel';

export interface FindScope {
  id: string;
  name: string;
  pool: Country[];
  note?: string;
}

interface FindConfig {
  scopeId: string;
  scopeName: string;
  pool: Country[];
  timed: boolean;
  secondsPerRound: number;
  retryOnMiss: boolean;
}

export interface FindGameViewProps {
  mode: GameModeId;
  regionId?: RegionId;
  title: string;
  subtitle: string;
  backTo: string;
  backLabel?: string;
  exitLabel?: string;
  scopes: FindScope[];
  initialScopeId?: string;
  lockScope?: boolean;
  headerExtra?: ReactNode;
}

export function FindGameView({
  mode,
  regionId,
  title,
  subtitle,
  backTo,
  backLabel,
  exitLabel = 'Home',
  scopes,
  initialScopeId,
  lockScope = false,
  headerExtra,
}: FindGameViewProps) {
  const [config, setConfig] = useState<FindConfig | null>(null);
  const [runId, setRunId] = useState(0);

  if (!config) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <GameHeader
          title={title}
          subtitle={subtitle}
          backTo={backTo}
          backLabel={backLabel}
        />
        <FindSetup
          scopes={scopes}
          initialScopeId={initialScopeId}
          lockScope={lockScope}
          backTo={backTo}
          onStart={(next) => {
            setConfig(next);
            setRunId((value) => value + 1);
          }}
        />
      </div>
    );
  }

  return (
    <FindBoard
      key={runId}
      config={config}
      mode={mode}
      regionId={regionId}
      title={title}
      backTo={backTo}
      backLabel={backLabel}
      exitLabel={exitLabel}
      headerExtra={headerExtra}
      allowHint={!lockScope}
      onReplay={() => setRunId((value) => value + 1)}
      onChangeSetup={() => setConfig(null)}
    />
  );
}

function FindSetup({
  scopes,
  initialScopeId,
  lockScope,
  backTo,
  onStart,
}: {
  scopes: FindScope[];
  initialScopeId?: string;
  lockScope: boolean;
  backTo: string;
  onStart: (config: FindConfig) => void;
}) {
  const { settings } = useSettings();
  const { stats } = useStats();
  const [scopeId, setScopeId] = useState(initialScopeId ?? scopes[0]?.id ?? '');
  const [timed, setTimed] = useState(settings.timer);
  const [seconds, setSeconds] = useState('25');
  const [retry, setRetry] = useState(true);

  const scope = scopes.find((entry) => entry.id === scopeId) ?? scopes[0];
  if (!scope) return null;

  const modeStats = stats.modes.findCountry;

  return (
    <Card className="animate-fade-up mt-4 p-5 sm:p-6">
      <Eyebrow>Challenge setup</Eyebrow>
      <h2 className="mt-1 font-display text-xl font-bold text-ink">
        {lockScope ? scope.name : 'Choose what to cover'}
      </h2>

      {lockScope ? (
        <div className="mt-3 rounded-xl border border-accent/25 bg-accent/5 p-3">
          <p className="text-sm font-semibold text-ink">{scope.name}</p>
          <p className="text-xs text-muted">{scope.pool.length} countries in this region</p>
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {scopes.map((entry) => {
            const active = entry.id === scope.id;
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={active}
                onClick={() => setScopeId(entry.id)}
                className={cx(
                  'rounded-xl border p-3 text-left transition-colors',
                  active
                    ? 'border-accent/60 bg-accent/8'
                    : 'border-line bg-surface-2 hover:border-line-strong',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{entry.name}</span>
                  {active ? <Icon name="check" size={15} className="text-accent" /> : null}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {entry.pool.length} countries{entry.note ? ` · ${entry.note}` : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5 space-y-1 border-t border-line pt-3">
        <Toggle
          checked={timed}
          onChange={setTimed}
          label="Timed rounds"
          description="Every country gets its own countdown. Untimed rounds only track total time."
        />
        {timed ? (
          <div className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm text-ink">Seconds per country</span>
            <Segmented
              value={seconds}
              options={[
                { value: '15', label: '15' },
                { value: '25', label: '25' },
                { value: '45', label: '45' },
              ]}
              onChange={setSeconds}
              label="Seconds per country"
            />
          </div>
        ) : null}
        <Toggle
          checked={retry}
          onChange={setRetry}
          label="Second chance"
          description="A wrong click lets you try the same country again instead of moving on."
        />
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface-2/60 p-3 text-xs">
        <div className="flex items-center justify-between py-0.5">
          <span className="text-muted">Games played</span>
          <span className="font-semibold text-ink">{modeStats.gamesPlayed}</span>
        </div>
        <div className="flex items-center justify-between py-0.5">
          <span className="text-muted">Best score</span>
          <span className="font-semibold text-ink">{modeStats.bestPercent}%</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button
          size="lg"
          icon="play"
          onClick={() =>
            onStart({
              scopeId: scope.id,
              scopeName: scope.name,
              pool: scope.pool,
              timed,
              secondsPerRound: Number(seconds),
              retryOnMiss: retry,
            })
          }
        >
          Start round · {scope.pool.length} countries
        </Button>
        <ButtonLink to={backTo} variant="ghost" size="lg">
          Cancel
        </ButtonLink>
      </div>
    </Card>
  );
}

function FindBoard({
  config,
  mode,
  regionId,
  title,
  backTo,
  backLabel,
  exitLabel,
  headerExtra,
  allowHint,
  onReplay,
  onChangeSetup,
}: {
  config: FindConfig;
  mode: GameModeId;
  regionId?: RegionId;
  title: string;
  backTo: string;
  backLabel?: string;
  exitLabel: string;
  headerExtra?: ReactNode;
  allowHint: boolean;
  onReplay: () => void;
  onChangeSetup: () => void;
}) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { recordGame } = useStats();
  const worldGeo = useWorldGeo();

  const [summary, setSummary] = useState<FindSummary | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [hint, setHint] = useState<{ index: number; bounds: Bounds } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const handleFinish = useCallback(
    (result: FindSummary) => {
      setSummary(result);
      sfx.finish();
      recordGame({
        mode,
        challenge: 'find',
        regionId,
        correct: result.correct,
        incorrect: result.incorrect,
        total: result.total,
        percent: result.percent,
        accuracy: result.accuracy,
        durationMs: result.durationMs,
        identified: result.identified,
        missed: result.missed,
        difficult: result.difficult,
        timed: config.timed,
        at: Date.now(),
      });
    },
    [config.timed, mode, recordGame, regionId],
  );

  const game = useFindGame({
    pool: config.pool,
    timed: config.timed,
    secondsPerRound: config.secondsPerRound,
    retryOnMiss: config.retryOnMiss,
    onFinish: handleFinish,
  });

  const handleSelect = useCallback(
    (iso3: string) => {
      const outcome = game.guess(iso3);
      if (outcome === 'correct') sfx.correct();
      else if (outcome === 'wrong') sfx.wrong();
    },
    [game.guess],
  );

  const shapes = worldGeo.data?.shapes ?? [];
  const poolCodes = useMemo(() => config.pool.map((country) => country.iso3), [config.pool]);
  const scopeBounds = useMemo(
    () => (worldGeo.data ? boundsForCountries(shapes, poolCodes) : null),
    [worldGeo.data, shapes, poolCodes],
  );

  const hintApplies = hint !== null && hint.index === game.index;
  const activeBounds = hintApplies ? hint.bounds : scopeBounds;
  const fitKey = `${config.scopeId}:${game.index}:${hintApplies ? 'hint' : 'scope'}`;

  const showHint = () => {
    const country = game.current;
    if (!country || game.phase !== 'asking' || !worldGeo.data) return;
    const regionBounds = boundsForCountries(
      shapes,
      getRegionCountries(country.region).map((entry) => entry.iso3),
    );
    const bounds = regionBounds ?? scopeBounds;
    if (!bounds) return;
    setHint({ index: game.index, bounds });
    setNote(`Zoomed to ${getRegionName(country.region)}.`);
    game.registerHint();
    sfx.click();
  };

  const recentSolved = [...game.solved].reverse().slice(0, 8);
  const phaseFeedback =
    game.phase === 'correct' && game.current
      ? { tone: 'success' as const, text: `Correct — ${game.current.name}` }
      : game.phase === 'wrong'
        ? { tone: 'danger' as const, text: 'Not quite — try again' }
        : game.phase === 'missed' && game.current
          ? { tone: 'danger' as const, text: `It was ${game.current.name}` }
          : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
      <GameHeader
        title={title}
        subtitle={`${config.pool.length} countries · ${config.scopeName}${
          config.timed ? ` · ${config.secondsPerRound}s each` : ' · untimed'
        }`}
        backTo={backTo}
        backLabel={backLabel}
        badge={
          summary ? (
            <Badge tone="success" icon="check">
              Complete
            </Badge>
          ) : (
            <Badge tone="accent">
              {game.index + 1}/{game.total}
            </Badge>
          )
        }
        right={
          <>
            {headerExtra}
            {config.timed && !summary ? (
              <CountdownChip seconds={game.timeLeft} total={config.secondsPerRound} />
            ) : (
              <TimerChip ms={summary ? summary.durationMs : game.elapsedMs} />
            )}
            {!summary ? (
              <Button variant="secondary" size="sm" icon="flag" onClick={() => setConfirmEnd(true)}>
                End game
              </Button>
            ) : null}
          </>
        }
      />

      <div
        className={cx(
          'grid gap-3',
          summary ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : 'lg:grid-cols-[minmax(0,1fr)_300px]',
        )}
      >
        <div className="flex flex-col gap-3">
          {!summary && game.current ? (
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <Eyebrow>
                    Round {game.index + 1} of {game.total}
                  </Eyebrow>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span className="text-sm text-muted">Find</span>
                    <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                      {game.current.name}
                    </h2>
                  </div>
                </div>
                <div className="flex gap-2">
                  {allowHint ? (
                    <Button variant="secondary" size="sm" icon="bulb" onClick={showHint}>
                      Hint
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="eye"
                    onClick={() => {
                      game.skip();
                      sfx.wrong();
                    }}
                  >
                    Show me
                  </Button>
                </div>
              </div>
              <ProgressBar
                value={(game.index / Math.max(1, game.total)) * 100}
                className="mt-3"
                label="Rounds completed"
              />
              {config.timed ? (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className={cx(
                      'h-full rounded-full transition-[width] duration-1000 ease-linear',
                      game.timeLeft <= Math.max(4, config.secondsPerRound * 0.25)
                        ? 'bg-danger'
                        : 'bg-warning',
                    )}
                    style={{
                      width: `${(game.timeLeft / Math.max(1, config.secondsPerRound)) * 100}%`,
                    }}
                  />
                </div>
              ) : null}
            </Card>
          ) : null}

          <Card className="relative overflow-hidden p-0">
            <div className="h-[44vh] min-h-[300px] sm:h-[52vh] lg:h-[58vh]">
              {worldGeo.status === 'ready' && worldGeo.data ? (
                <WorldMap
                  shapes={shapes}
                  spherePath={worldGeo.data.spherePath}
                  graticulePath={worldGeo.data.graticulePath}
                  solved={game.solved}
                  missed={summary?.missed}
                  wrongIso3={game.wrongIso3}
                  targetIso3={game.revealedIso3}
                  labels={settings.labels}
                  showAllNames={Boolean(summary)}
                  markers={settings.markers}
                  interactive
                  selectable={game.phase === 'asking' && !summary}
                  fitBounds={activeBounds}
                  fitKey={fitKey}
                  onSelect={handleSelect}
                  ariaLabel={`Interactive world map. Find ${game.current?.name ?? 'countries'}.`}
                />
              ) : worldGeo.status === 'error' ? (
                <ErrorPanel
                  className="h-full"
                  title="The map could not load"
                  message={worldGeo.error ?? 'Unknown error.'}
                  onRetry={worldGeo.retry}
                />
              ) : (
                <LoadingPanel className="h-full" />
              )}
            </div>

            {phaseFeedback ? (
              <div
                key={`${game.index}-${game.phase}`}
                className={cx(
                  'animate-pop pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full border px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur',
                  phaseFeedback.tone === 'success'
                    ? 'border-success/40 bg-success/15 text-success'
                    : 'border-danger/40 bg-danger/15 text-danger',
                )}
                role="status"
                aria-live="polite"
              >
                {phaseFeedback.text}
              </div>
            ) : null}

            {note && !summary ? (
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-line bg-surface/90 px-3 py-1 text-[11px] font-medium text-muted backdrop-blur">
                {note}
              </div>
            ) : null}
          </Card>
        </div>

        <aside className="flex flex-col gap-3">
          {summary ? (
            <ResultsPanel
              summary={summary}
              timed={config.timed}
              revealMissed={settings.revealMissed}
              difficult={summary.difficult}
              onReplay={onReplay}
              onExit={() => navigate(backTo)}
              exitLabel={exitLabel}
              onSecondary={onChangeSetup}
              secondaryLabel="Change options"
            />
          ) : (
            <Card className="p-4">
              <Eyebrow>This round</Eyebrow>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <StatTile label="Found" value={game.solved.length} />
                <StatTile label="Misses" value={game.wrongAttempts} />
                <StatTile
                  label="Accuracy"
                  value={`${accuracyOf(game.solved.length, game.wrongAttempts)}%`}
                />
                <StatTile label="Hints" value={game.hintsUsed} />
              </div>
              <div className="mt-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Recently found
                </h3>
                {recentSolved.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {recentSolved.map((iso3) => (
                      <CountryPill key={iso3} iso3={iso3} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    Correct clicks appear here as you go.
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 w-full"
                icon="settings"
                onClick={onChangeSetup}
              >
                Change options
              </Button>
            </Card>
          )}
        </aside>
      </div>

      <Modal
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="End this round?"
        description="Your results are saved with what you have found so far."
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
          {game.solved.length} of {game.total} countries found · {game.wrongAttempts} misses
        </p>
      </Modal>
    </div>
  );
}
