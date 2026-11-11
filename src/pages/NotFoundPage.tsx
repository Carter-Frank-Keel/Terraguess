import { ButtonLink } from '../components/ui';
import { Icon } from '../components/Icon';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Icon name="compass" size={28} />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink">This route is off the map</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        The page you were looking for does not exist. Head back and pick a challenge.
      </p>
      <ButtonLink to="/" className="mt-5" icon="home">
        Back to home
      </ButtonLink>
    </div>
  );
}
