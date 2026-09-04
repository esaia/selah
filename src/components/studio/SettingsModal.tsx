'use client';

import { useState } from 'react';

import { AccountSection } from '@/components/studio/AccountSection';
import { DevicesSection } from '@/components/studio/DevicesSection';
import { FontsSection } from '@/components/studio/FontsSection';
import { StreamSection } from '@/components/studio/StreamSection';
import { StyleSection } from '@/components/studio/StyleSection';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { HiOutlineX } from 'react-icons/hi';

const TABS = ['projector', 'stream', 'fonts', 'devices', 'account'] as const;
type SettingsTab = (typeof TABS)[number];

const TAB_LABELS: Record<SettingsTab, string> = {
  projector: 'Projector look',
  stream: 'Stream',
  fonts: 'Fonts',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3 sm:p-6" onClick={onClose}>
      <div
        className="flex h-full max-h-[44rem] w-full max-w-6xl flex-col overflow-hidden rounded-studio-lg bg-white
          shadow-studio-modal sm:flex-row"
        onClick={event => event.stopPropagation()}
      >
        <nav
          className="studio-scroll flex w-full shrink-0 gap-1 overflow-x-auto border-b border-studio-border
            bg-studio-surface px-2 py-2 sm:w-48 sm:flex-col sm:gap-0 sm:border-r sm:border-b-0 sm:px-0 sm:py-3"
        >
          {TABS.map(name => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              className={cn(
                'shrink-0 rounded-studio px-4 py-2 text-left text-sm whitespace-nowrap transition-colors duration-150',
                'sm:w-full sm:rounded-none',
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
          <header
            className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-studio-border px-4
              sm:px-5"
          >
            <h2 className="truncate text-sm font-semibold text-studio-text">{TAB_LABELS[tab]}</h2>
            <IconButton label="Close" onClick={onClose}>
              <HiOutlineX className="text-base" />
            </IconButton>
          </header>

          {/* Extra room on the right: the scrollbar is drawn inside this box, so
              equal padding leaves the widest controls sitting against it. */}
          <div className="studio-scroll min-h-0 flex-1 overflow-y-auto p-4 pr-5 sm:p-5 sm:pr-7">
            {tab === 'projector' ? <StyleSection /> : null}
            {tab === 'stream' ? <StreamSection /> : null}
            {tab === 'fonts' ? <FontsSection /> : null}
            {tab === 'devices' ? <DevicesSection /> : null}
            {tab === 'account' ? <AccountSection /> : null}
          </div>
        </div>
      </div>
    </div>
  );
};
