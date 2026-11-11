import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { cx } from '../lib/cx';
import { Icon } from './Icon';
import { IconButton } from './ui';
import { SettingsModal } from './SettingsModal';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/play/name-countries', label: 'Name countries' },
  { to: '/play/find-country', label: 'Find country' },
  { to: '/play/regions', label: 'Regions' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/12 text-accent ring-1 ring-accent/25">
              <Icon name="compass" size={20} />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight text-ink">
              Terraguess
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-surface-3 text-ink' : 'text-muted hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <IconButton label="Settings" icon="settings" onClick={() => setSettingsOpen(true)} />
        </div>

        <nav
          className="scroll-thin flex gap-1 overflow-x-auto border-t border-line/70 px-3 py-2 sm:hidden"
          aria-label="Main"
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                  isActive ? 'bg-surface-3 text-ink' : 'text-muted',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <footer className="border-t border-line/60 px-4 py-6 text-center text-[11px] leading-relaxed text-muted sm:px-6">
        <p>
          Terraguess · 195 countries: 193 UN member states plus the Holy See and Palestine · 20
          regions
        </p>
        <p className="mt-1">
          Borders from Natural Earth 1:50m (world-atlas). Statistics and settings stay in this
          browser.
        </p>
      </footer>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
