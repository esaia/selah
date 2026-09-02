'use client';

import { useState } from 'react';
import { HiOutlineClipboardCopy, HiOutlineDesktopComputer, HiOutlineVideoCamera } from 'react-icons/hi';
import { MdPhoneIphone } from 'react-icons/md';

import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';

import { Field } from './StyleSection';

const CopyRow = ({ label, url }: { label: string; url: string }) => {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[11px] text-studio-faint">{label}</span>

      <input
        readOnly
        value={url}
        onFocus={event => event.currentTarget.select()}
        className="h-8 min-w-0 flex-1 rounded-studio border border-studio-border bg-studio-surface px-2.5 text-xs
          text-studio-text focus:outline-none"
      />

      <button
        type="button"
        aria-label={`Copy the ${label} link`}
        title={`Copy the ${label} link`}
        onClick={() => {
          void navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="flex h-8 w-9 shrink-0 items-center justify-center rounded-studio border border-studio-border
          bg-white text-studio-muted transition-colors duration-150 hover:bg-studio-surface hover:text-studio-text"
      >
        <HiOutlineClipboardCopy className={cn('text-base', copied && 'text-studio-go')} />
      </button>
    </div>
  );
};

const PresenceRow = ({
  icon,
  label,
  hint,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  count: number;
}) => (
  <div className="flex items-center gap-3 border-b border-studio-divider px-3 py-2.5 last:border-b-0">
    <span className="shrink-0 text-studio-muted">{icon}</span>

    <span className="min-w-0 flex-1">
      <span className="block text-xs font-medium text-studio-text">{label}</span>
      {hint ? <span className="block truncate text-[11px] text-studio-faint">{hint}</span> : null}
    </span>

    <span className={cn('shrink-0 text-xs', count ? 'text-studio-go' : 'text-studio-faint')}>
      {count ? (count > 1 ? `${count} connected` : 'Connected') : 'Not yet'}
    </span>
  </div>
);

/**
 * Where this service is playing. The old app addressed outputs by a relay room
 * code that had to be typed in at the other end; a session now carries its own
 * key, so every link below is self-contained and there is nothing to enter.
 */
export const DevicesSection = () => {
  const { session, peers } = useStudio();

  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Field label="Connected" hint="Live from the session itself, so it says what is really there.">
          <div className="rounded-studio border border-studio-border">
            <PresenceRow
              icon={<HiOutlineDesktopComputer className="text-base" />}
              label="Projector"
              hint="Open the Screen link on that machine."
              count={peers.show}
            />
            <PresenceRow
              icon={<HiOutlineVideoCamera className="text-base" />}
              label="Stream"
              hint="A Browser Source in OBS."
              count={peers.lower3rd}
            />
            <PresenceRow icon={<MdPhoneIphone className="text-base" />} label="Consoles" count={peers.console} />
          </div>
        </Field>
      </div>

      <div className="space-y-6">
        <Field label="Links" hint="Each one carries the session, so nothing has to be typed at the other end.">
          <div className="space-y-2">
            <CopyRow label="Screen" url={`${origin}/show/${session.outputKey}`} />
            <CopyRow label="OBS" url={`${origin}/lower3rd/${session.outputKey}`} />
            <CopyRow label="Phone" url={`${origin}/studio`} />
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-studio-faint">
            Anyone holding the Screen or OBS link can see what you put on screen — they carry the session key, which is
            what lets a machine with no sign-in follow along.
          </p>
        </Field>
      </div>
    </div>
  );
};
