'use client';

import { useState } from 'react';

import { AccountSection } from '@/components/studio/AccountSection';
import { DevicesSection } from '@/components/studio/DevicesSection';
import { StreamSection } from '@/components/studio/StreamSection';
import { StyleSection } from '@/components/studio/StyleSection';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { HiOutlineX } from 'react-icons/hi';

const TABS = ['projector', 'stream', 'devices', 'account'] as const;
type SettingsTab = (typeof TABS)[number];

const TAB_LABELS: Record<SettingsTab, string> = {
  projector: 'Projector look',
  stream: 'Stream',
  devices: 'Devices',
  account: 'Account',
};

const isTab = (value: string): value is SettingsTab => (TABS as readonly string[]).includes(value);

/**
 * Setup that is not touched mid-service: how the projector looks, what the
 * stream carries, and where the outputs are. What *is* touched — the languages
 * and translations — stays on the rail, one click from the cards.
 */
export const SettingsModal = ({ tab: opened, onClose }: { tab: string; onClose: () => void }) => {
  const [tab, setTab] = useState<SettingsTab>(isTab(opened) ? opened : 'projector');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6" onClick={onClose}>
      <div
        className="flex h-[36rem] w-full max-w-5xl overflow-hidden rounded-studio-lg bg-white shadow-studio-modal"
        onClick={event => event.stopPropagation()}
      >
        <nav className="w-48 shrink-0 border-r border-studio-border bg-studio-surface py-3">
          {TABS.map(name => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              className={cn(
                'w-full px-4 py-2 text-left text-sm transition-colors duration-150',
                tab === name
                  ? 'bg-white font-medium text-studio-text shadow-studio'
                  : 'text-studio-muted hover:text-studio-text',
              )}
            >
              {TAB_LABELS[name]}
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-studio-border px-5">
            <h2 className="text-sm font-semibold text-studio-text">{TAB_LABELS[tab]}</h2>
            <IconButton label="Close" onClick={onClose}>
              <HiOutlineX className="text-base" />
            </IconButton>
          </header>

          <div className="studio-scroll min-h-0 flex-1 overflow-y-auto p-5">
            {tab === 'projector' ? <StyleSection /> : null}
            {tab === 'stream' ? <StreamSection /> : null}
            {tab === 'devices' ? <DevicesSection /> : null}
            {tab === 'account' ? <AccountSection /> : null}
          </div>
        </div>
      </div>
    </div>
  );
};
