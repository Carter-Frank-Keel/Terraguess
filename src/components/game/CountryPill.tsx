import { getCountry } from '../../data/countries';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';

export function CountryPill({
  iso3,
  tone = 'found',
  attempts,
}: {
  iso3: string;
  tone?: 'found' | 'missed' | 'neutral';
  attempts?: number;
}) {
  const country = getCountry(iso3);
  const styles = {
    found: 'border-success/25 bg-success/10 text-success',
    missed: 'border-danger/25 bg-danger/10 text-danger',
    neutral: 'border-line bg-surface-2 text-muted',
  }[tone];

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium',
        styles,
      )}
    >
      <Icon name={tone === 'found' ? 'check' : 'x'} size={11} />
      {country?.name ?? iso3}
      {attempts && attempts > 1 ? (
        <span className="rounded bg-black/20 px-1 text-[10px] font-bold">{attempts}×</span>
      ) : null}
    </span>
  );
}
