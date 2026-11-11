import { useEffect, useState, type ReactNode } from 'react';
import { useSettings } from '../state/SettingsProvider';
import { useStats } from '../state/StatsProvider';
import { Button, Modal, Segmented, Toggle } from './ui';

function Section({ children, first }: { children: ReactNode; first?: boolean }) {
  return (
    <h3
      className={
        first
          ? 'text-[11px] font-semibold uppercase tracking-[0.16em] text-muted'
          : 'pt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted'
      }
    >
      {children}
    </h3>
  );
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { stats, resetStats } = useStats();
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!open) setConfirmReset(false);
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      description="Preferences are saved in this browser."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" icon="rotate" onClick={resetSettings}>
            Reset preferences
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <Section first>Appearance</Section>
      <div className="flex items-center justify-between gap-3 py-2">
        <div>
          <div className="text-sm font-medium text-ink">Theme</div>
          <div className="text-xs text-muted">Dark by default.</div>
        </div>
        <Segmented
          value={settings.theme}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
          onChange={(theme) => updateSettings({ theme })}
          label="Theme"
        />
      </div>

      <Section>Sound</Section>
      <Toggle
        checked={settings.sound}
        onChange={(sound) => updateSettings({ sound })}
        label="Sound effects"
        description="Short tones for correct answers, misses and finished rounds."
      />

      <Section>Gameplay</Section>
      <Toggle
        checked={settings.timer}
        onChange={(timer) => updateSettings({ timer })}
        label="Show the timer"
        description="Default for new rounds. Find-the-country timing is set during setup."
      />
      <Toggle
        checked={settings.lenientMatching}
        onChange={(lenientMatching) => updateSettings({ lenientMatching })}
        label="Forgiving spelling"
        description="Accept near misses such as “Austraila” or “Brasil”."
      />
      <Toggle
        checked={settings.revealMissed}
        onChange={(revealMissed) => updateSettings({ revealMissed })}
        label="Reveal missed countries"
        description="List the countries you missed on the results screen."
      />

      <Section>Map</Section>
      <Toggle
        checked={settings.markers}
        onChange={(markers) => updateSettings({ markers })}
        label="Microstate markers"
        description="Clickable dots for island nations and countries too small to click at world zoom."
      />
      <div className="flex flex-wrap items-center justify-between gap-3 py-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink">Country labels</div>
          <div className="text-xs text-muted">Names for countries you have already identified.</div>
        </div>
        <Segmented
          value={settings.labels}
          options={[
            { value: 'hover', label: 'Hover' },
            { value: 'always', label: 'Always' },
            { value: 'never', label: 'Never' },
          ]}
          onChange={(labels) => updateSettings({ labels })}
          label="Country labels"
        />
      </div>

      <Section>Your data</Section>
      <div className="rounded-xl border border-line bg-surface-2/60 p-3">
        <div className="text-xs text-muted">
          {stats.gamesPlayed} {stats.gamesPlayed === 1 ? 'game' : 'games'} recorded ·{' '}
          {stats.countriesIdentified.length} of 195 countries identified
        </div>
        {confirmReset ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-danger">Erase all statistics?</span>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                resetStats();
                setConfirmReset(false);
              }}
            >
              Yes, reset
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            className="mt-2"
            icon="trash"
            onClick={() => setConfirmReset(true)}
          >
            Reset statistics
          </Button>
        )}
      </div>

      <p className="pt-4 text-[11px] leading-relaxed text-muted">
        Country data: 195 countries (193 UN member states plus the Holy See and Palestine) with ISO
        3166-1 codes and editable regional classifications. Borders: Natural Earth 1:50m via the
        world-atlas dataset.
      </p>
    </Modal>
  );
}
