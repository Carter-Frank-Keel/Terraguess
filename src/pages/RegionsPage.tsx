import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  REGIONS,
  REGION_BY_ID,
  REGION_GROUPS,
  getRegionCountries,
  getRegionsForGroup,
} from '../data/regions';
import { useStats } from '../state/StatsProvider';
import type { RegionDefinition, RegionId, RegionStats } from '../types';
import { Badge, ButtonLink, Card, ProgressBar, Segmented } from '../components/ui';
import { NameGameView } from '../components/game/NameGameView';
import { FindGameView } from '../components/game/FindGameView';
import { NotFoundPage } from './NotFoundPage';

export default function RegionsPage() {
  const { regionId } = useParams<{ regionId: string }>();
  const region = regionId ? REGION_BY_ID.get(regionId as RegionId) : undefined;

  if (regionId && !region) return <NotFoundPage />;
  if (region) return <RegionPlay region={region} />;
  return <RegionPicker />;
}

function RegionPicker() {
  const { stats } = useStats();
  const completed = REGIONS.filter((region) => stats.regions[region.id]?.completed).length;
  const started = REGIONS.filter((region) => (stats.regions[region.id]?.gamesPlayed ?? 0) > 0).length;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="animate-fade-up">
        <Badge tone="accent" icon="layers">
          {REGIONS.length} regions
        </Badge>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Regions
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Work through the world one region at a time. Every region has two challenges: name its
          countries from memory, or find them on a regional map that frames the area for you.
        </p>
      </header>

      <Card className="mt-5 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">Overall progress</span>
          <span className="text-xs text-muted">
            {completed} of {REGIONS.length} completed · {started} started
          </span>
        </div>
        <ProgressBar
          value={(completed / REGIONS.length) * 100}
          tone="success"
          className="mt-2"
          label="Regions completed"
        />
      </Card>

      {REGION_GROUPS.map((group) => {
        const regions = getRegionsForGroup(group.id);
        if (regions.length === 0) return null;
        return (
          <section key={group.id} className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">{group.name}</h2>
                <p className="text-xs text-muted">{group.blurb}</p>
              </div>
              <span className="text-xs text-muted">
                {regions.length} {regions.length === 1 ? 'region' : 'regions'}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {regions.map((region) => (
                <RegionCard key={region.id} region={region} stats={stats.regions[region.id]} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RegionCard({
  region,
  stats,
}: {
  region: RegionDefinition;
  stats: RegionStats | undefined;
}) {
  const count = getRegionCountries(region.id).length;
  const best = stats?.bestPercent ?? 0;
  const completed = stats?.completed ?? false;

  return (
    <Card className="flex flex-col gap-3 p-4 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold text-ink">{region.name}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{region.description}</p>
        </div>
        {completed ? (
          <Badge tone="success" icon="check">
            Done
          </Badge>
        ) : null}
      </div>

      <div className="mt-auto">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>
            {count} {count === 1 ? 'country' : 'countries'}
          </span>
          <span>{best}% best</span>
        </div>
        <ProgressBar value={best} tone={completed ? 'success' : 'accent'} className="mt-1.5 h-1.5" />
      </div>

      <div className="flex gap-2">
        <ButtonLink
          to={`/play/regions/${region.id}?challenge=name`}
          size="sm"
          variant="secondary"
          icon="flag"
          className="flex-1"
        >
          Name them
        </ButtonLink>
        <ButtonLink
          to={`/play/regions/${region.id}?challenge=find`}
          size="sm"
          variant="secondary"
          icon="map"
          className="flex-1"
        >
          Find them
        </ButtonLink>
      </div>
    </Card>
  );
}

function RegionPlay({ region }: { region: RegionDefinition }) {
  const [searchParams] = useSearchParams();
  const [challenge, setChallenge] = useState<'name' | 'find'>(
    searchParams.get('challenge') === 'find' ? 'find' : 'name',
  );
  const pool = getRegionCountries(region.id);

  const switcher = (
    <Segmented
      value={challenge}
      options={[
        { value: 'name', label: 'Name them' },
        { value: 'find', label: 'Find them' },
      ]}
      onChange={setChallenge}
      label="Region challenge"
    />
  );

  if (challenge === 'find') {
    return (
      <FindGameView
        key="find"
        mode="regions"
        regionId={region.id}
        title={region.name}
        subtitle={`Find ${pool.length} countries on the regional map`}
        backTo="/play/regions"
        backLabel="All regions"
        exitLabel="All regions"
        scopes={[{ id: region.id, name: region.name, pool }]}
        initialScopeId={region.id}
        lockScope
        headerExtra={switcher}
      />
    );
  }

  return (
    <NameGameView
      key="name"
      pool={pool}
      mode="regions"
      regionId={region.id}
      title={region.name}
      subtitle={`Name the ${pool.length} countries of ${region.name}`}
      backTo="/play/regions"
      backLabel="All regions"
      exitLabel="All regions"
      headerExtra={switcher}
    />
  );
}
