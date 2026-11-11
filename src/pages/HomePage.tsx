import { useMemo, useState, type ReactNode } from 'react';
import { TOTAL_COUNTRIES } from '../data/countries';
import { REGIONS, getContinentCountries } from '../data/regions';
import { formatDuration, formatNumber } from '../lib/format';
import { boundsForCountries } from '../lib/geo';
import { useStats } from '../state/StatsProvider';
import { useWorldGeo } from '../state/WorldGeoProvider';
import { Icon, type IconName } from '../components/Icon';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Eyebrow,
  ProgressBar,
  StatTile,
} from '../components/ui';
import { MapPreview } from '../components/map/MapPreview';
import { SettingsModal } from '../components/SettingsModal';

export default function HomePage() {
  const { stats } = useStats();
  const { data: geo } = useWorldGeo();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const identified = useMemo(() => new Set(stats.countriesIdentified), [stats.countriesIdentified]);
  const identifiedCount = identified.size;
  const completedRegions = REGIONS.filter((region) => stats.regions[region.id]?.completed).length;

  const previews = useMemo(() => {
    if (!geo) return null;
    const continentBounds = (continent: 'south-america' | 'europe') =>
      boundsForCountries(
        geo.shapes,
        getContinentCountries(continent).map((country) => country.iso3),
      );
    return {
      southAmerica: continentBounds('south-america'),
      europe: continentBounds('europe'),
    };
  }, [geo]);

  const findHighlight = useMemo(
    () => new Set(['BRA', 'ARG', 'PER', 'COL', 'CHL', 'BOL']),
    [],
  );
  const regionHighlight = useMemo(
    () => new Set(['FRA', 'DEU', 'ESP', 'ITA', 'POL', 'SWE', 'NOR', 'GBR', 'GRC', 'PRT']),
    [],
  );

  const geoReady = Boolean(geo);
  const shapes = geo?.shapes ?? [];

  const modes: {
    to: string;
    icon: IconName;
    title: string;
    description: string;
    tags: string[];
    preview: ReactNode;
  }[] = [
    {
      to: '/play/name-countries',
      icon: 'flag',
      title: 'Name All Countries',
      description:
        'Type every country in the world from memory. Abbreviations, alternative spellings and older names all count.',
      tags: ['195 countries', 'Timer', 'Forgiving matching'],
      preview: (
        <div className="flex h-full flex-col justify-center gap-2 p-4">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-2 text-[11px] text-muted">
            <Icon name="search" size={12} />
            <span>Type a country name…</span>
            <span className="ml-auto rounded border border-line px-1 text-[9px]">↵</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {['Japan', 'Brazil', 'Kenya', 'Norway', 'Peru', 'Fiji'].map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded border border-success/25 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success"
              >
                <Icon name="check" size={9} />
                {name}
              </span>
            ))}
          </div>
          <div className="text-[10px] text-muted">6 of 195 found · 3% complete</div>
        </div>
      ),
    },
    {
      to: '/play/find-country',
      icon: 'target',
      title: 'Find the Country',
      description:
        'A name appears, you click the country on a real interactive map. Zoom into archipelagos and microstates.',
      tags: ['Interactive map', 'World or continent', 'Timed rounds'],
      preview: (
        <div className="relative h-full w-full">
          {geoReady ? (
            <MapPreview
              shapes={shapes}
              spherePath={geo?.spherePath ?? ''}
              graticulePath={geo?.graticulePath ?? ''}
              focus={previews?.southAmerica ?? null}
              highlight={findHighlight}
              dim
              className="h-full w-full"
            />
          ) : (
            <div className="h-full w-full animate-pulse bg-surface-2" />
          )}
          <div className="pointer-events-none absolute inset-x-3 bottom-2 flex items-center justify-between rounded-lg border border-line bg-surface/90 px-2.5 py-1.5 backdrop-blur">
            <span className="text-[10px] text-muted">Find</span>
            <span className="font-display text-[11px] font-bold text-ink">Brazil</span>
            <span className="text-[10px] text-muted">12/195</span>
          </div>
        </div>
      ),
    },
    {
      to: '/play/regions',
      icon: 'layers',
      title: 'Regions',
      description:
        'Twenty regions, from the Caribbean to Southeast Asia. Each one has a naming challenge and a map challenge.',
      tags: ['20 regions', 'Regional maps', 'Progress per region'],
      preview: (
        <div className="relative h-full w-full">
          {geoReady ? (
            <MapPreview
              shapes={shapes}
              spherePath={geo?.spherePath ?? ''}
              graticulePath={geo?.graticulePath ?? ''}
              focus={previews?.europe ?? null}
              highlight={regionHighlight}
              dim
              className="h-full w-full"
            />
          ) : (
            <div className="h-full w-full animate-pulse bg-surface-2" />
          )}
          <div className="pointer-events-none absolute inset-x-3 bottom-2 flex flex-wrap gap-1">
            {['Western Europe', 'Northern Europe', 'Southern Europe'].map((name) => (
              <span
                key={name}
                className="rounded border border-line bg-surface/90 px-1.5 py-0.5 text-[9px] font-medium text-muted backdrop-blur"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const modeRows = [
    { label: 'Name All Countries', stats: stats.modes.nameAll },
    { label: 'Find the Country', stats: stats.modes.findCountry },
    { label: 'Regions', stats: stats.modes.regions },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="animate-fade-up">
          <Badge tone="accent" icon="compass">
            195 countries · 20 regions
          </Badge>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            How well do you <span className="text-accent">really</span> know the world?
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Name every country from memory, find them on a live world map, or work through the
            regions one at a time. Three ways to play, one atlas to master.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink to="/play/find-country" size="lg" icon="target">
              Find the country
            </ButtonLink>
            <ButtonLink to="/play/name-countries" size="lg" variant="secondary" icon="flag">
              Name all countries
            </ButtonLink>
            <Button size="lg" variant="ghost" icon="settings" onClick={() => setSettingsOpen(true)}>
              Settings
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="map" size={13} /> Real geographic borders
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="trophy" size={13} /> {stats.gamesPlayed || 'No'} games recorded
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="layers" size={13} /> {completedRegions}/20 regions completed
            </span>
          </div>
        </div>

        <Card className="relative overflow-hidden p-2">
          {geoReady ? (
            <MapPreview
              shapes={shapes}
              spherePath={geo?.spherePath ?? ''}
              graticulePath={geo?.graticulePath ?? ''}
              highlight={identified}
              dim={identifiedCount > 0}
              className="h-56 rounded-xl sm:h-64"
            />
          ) : (
            <div className="h-56 animate-pulse rounded-xl bg-surface-2 sm:h-64" />
          )}
          <div className="absolute inset-x-5 bottom-5 rounded-xl border border-line bg-surface/90 p-3 backdrop-blur">
            <div className="flex items-center justify-between text-[11px] font-medium text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="map" size={12} /> Your atlas
              </span>
              <span className="tabular-nums">
                {identifiedCount}/{TOTAL_COUNTRIES}
              </span>
            </div>
            <ProgressBar
              value={(identifiedCount / TOTAL_COUNTRIES) * 100}
              className="mt-2 h-1.5"
              label="Countries identified"
            />
            <p className="mt-1.5 text-[10px] text-muted">
              {identifiedCount === 0
                ? 'Identify countries in any mode and this map fills in.'
                : `${TOTAL_COUNTRIES - identifiedCount} countries still to add.`}
            </p>
          </div>
        </Card>
      </section>

      <section id="modes" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <Eyebrow>Game modes</Eyebrow>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
              Three ways to play
            </h2>
          </div>
          <p className="text-xs text-muted">Every mode is free and instantly replayable.</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {modes.map((mode) => (
            <Card
              key={mode.to}
              className="flex flex-col overflow-hidden p-0 transition-colors hover:border-line-strong"
            >
              <div className="relative h-32 overflow-hidden border-b border-line bg-surface-2/30">
                {mode.preview}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon name={mode.icon} size={16} />
                  </span>
                  <h3 className="font-display text-base font-bold text-ink">{mode.title}</h3>
                </div>
                <p className="text-xs leading-relaxed text-muted">{mode.description}</p>
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {mode.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
                <ButtonLink
                  to={mode.to}
                  size="sm"
                  icon="play"
                  className="w-full justify-center"
                >
                  Play
                </ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <Card className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Eyebrow>Your statistics</Eyebrow>
              <h2 className="mt-1 font-display text-xl font-bold text-ink">Progress so far</h2>
            </div>
            <ButtonLink to="/play/regions" variant="ghost" size="sm" iconRight="arrowRight">
              Browse regions
            </ButtonLink>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Games" value={stats.gamesPlayed} icon="trophy" />
              <StatTile label="Best score" value={`${stats.bestPercent}%`} icon="target" />
              <StatTile
                label="Fastest round"
                value={stats.fastestMs !== null ? formatDuration(stats.fastestMs) : '—'}
                icon="clock"
              />
              <StatTile
                label="Correct answers"
                value={formatNumber(stats.correctAnswers)}
                icon="check"
              />
            </div>

            <div className="space-y-3">
              {modeRows.map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted">{row.label}</span>
                    <span className="font-medium tabular-nums text-ink">
                      {row.stats.bestPercent}% · {row.stats.gamesPlayed}{' '}
                      {row.stats.gamesPlayed === 1 ? 'game' : 'games'}
                    </span>
                  </div>
                  <ProgressBar
                    value={row.stats.bestPercent}
                    tone={row.stats.bestPercent === 100 ? 'success' : 'accent'}
                    className="mt-1 h-1.5"
                  />
                </div>
              ))}
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted">Regions completed</span>
                  <span className="font-medium tabular-nums text-ink">
                    {completedRegions}/{REGIONS.length}
                  </span>
                </div>
                <ProgressBar
                  value={(completedRegions / REGIONS.length) * 100}
                  tone={completedRegions === REGIONS.length ? 'success' : 'accent'}
                  className="mt-1 h-1.5"
                />
              </div>
            </div>
          </div>

          {stats.gamesPlayed === 0 ? (
            <p className="mt-4 text-xs leading-relaxed text-muted">
              No games recorded yet. Your first round starts your atlas — statistics are kept in this
              browser.
            </p>
          ) : null}
        </Card>
      </section>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
