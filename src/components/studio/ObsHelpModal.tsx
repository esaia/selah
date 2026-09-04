'use client';

import { useState, type ReactNode } from 'react';
import { MdCheck, MdChevronRight, MdContentCopy } from 'react-icons/md';

import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

/**
 * In-app setup for the OBS lower third.
 *
 * In the old app this ran to three steps: enable obs-websocket, add the Browser
 * Source, then come back and connect — plus a warning about mixed content,
 * because a ws:// connection from an https page only reaches loopback. None of
 * that survives: the overlay joins the session's realtime channel like any
 * other output, so adding the Browser Source *is* the setup, and it works from
 * a phone or another machine with nothing extra.
 */

const Code = ({ children }: { children: ReactNode }) => (
  <code
    className="rounded-[4px] border border-studio-border bg-studio-surface px-1.5 py-0.5 font-mono text-[12px]
      text-studio-text"
  >
    {children}
  </code>
);

const Strong = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-studio-text">{children}</strong>
);

/**
 * A value to be carried into OBS, with the copy button next to it.
 *
 * `label` names the value for the copy button's accessible name only — the
 * field it sits in already says what the value is in type the operator can
 * read, and a second "URL" beside it was furniture.
 */
export const CopyField = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        readOnly
        value={value}
        onFocus={event => event.currentTarget.select()}
        className="h-8 min-w-0 flex-1 rounded-studio border border-studio-border bg-studio-surface px-2.5 font-mono
          text-[12px] text-studio-text focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
      />

      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : `Copy the ${label.toLowerCase()}`}
        title={copied ? 'Copied' : `Copy the ${label.toLowerCase()}`}
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-studio border bg-studio-bg transition-colors',
          'duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
          copied
            ? 'border-studio-go text-studio-go'
            : 'border-studio-border text-studio-muted hover:bg-studio-surface hover:text-studio-text',
        )}
      >
        {copied ? <MdCheck className="text-base" /> : <MdContentCopy className="text-sm" />}
      </button>
    </div>
  );
};

const Step = ({ n, title, where, children }: { n: string; title: string; where: string; children: ReactNode }) => (
  <li className="grid grid-cols-[28px_1fr] gap-3">
    <span
      className="flex size-7 items-center justify-center rounded-studio border border-studio-border
        bg-studio-surface font-mono text-xs font-semibold text-studio-accent"
    >
      {n}
    </span>

    <div className="min-w-0 pt-0.5">
      <h4 className="text-sm font-semibold text-studio-text">{title}</h4>
      <p className="mt-0.5 font-mono text-[11px] text-studio-faint">{where}</p>
      <div className="mt-2 space-y-2 text-xs leading-relaxed text-studio-muted">{children}</div>
    </div>
  </li>
);

/** Folded-away detail. Native disclosure, so no state and no keyboard work. */
const More = ({ title, children }: { title: string; children: ReactNode }) => (
  <details className="group rounded-studio border border-studio-border">
    <summary
      className="flex list-none items-center gap-1.5 px-3 py-2 text-xs font-medium text-studio-text
        marker:content-none hover:bg-studio-surface"
    >
      <MdChevronRight className="text-base text-studio-faint transition-transform duration-150 group-open:rotate-90" />
      {title}
    </summary>

    <div className="space-y-2 border-t border-studio-divider px-3 py-2.5 text-xs leading-relaxed text-studio-muted">
      {children}
    </div>
  </details>
);

export const ObsHelpModal = ({ onClose, sourceUrl }: { onClose: () => void; sourceUrl: string }) => (
  <Modal open onClose={onClose} title="Set up the OBS lower third" width="max-w-xl">
    <div className="space-y-5 pb-4">
      <p className="text-xs leading-relaxed text-studio-muted">
        Two steps, and nothing to install. The overlay is an ordinary web page that follows this console, so OBS can be
        on this machine or another one.
      </p>

      <ol className="space-y-4">
        <Step n="1" title="Add the Browser Source" where="OBS → Sources → + → Browser">
          <CopyField label="URL" value={sourceUrl} />

          <p>
            Size <Code>1920</Code> × <Code>1080</Code>. Leave <Strong>Shutdown source when not visible</Strong>{' '}
            unticked, and drag the source <Strong>above your camera</Strong>.
          </p>
        </Step>

        <Step n="2" title="Put a slide up" where="Back in this console">
          <p>
            Click any verse or song slide. It appears over the camera within a moment — the overlay is transparent, so
            there is no chroma key and nothing to align.
          </p>
        </Step>
      </ol>

      <div className="space-y-2">
        <More title="Nothing is showing up in OBS">
          <p>
            Add <Code>?debug=1</Code> to the Browser Source URL and <Strong>Refresh</Strong> the source — a panel in
            the corner shows what the page is receiving.
          </p>
          <ul className="space-y-1.5">
            <li>
              <Strong>Black screen</Strong> — usually correct; the overlay is transparent, so put a camera behind it.
            </li>
            <li>
              <Strong>No debug panel</Strong> — the page is not loading. Check the URL, and that this console is still
              being served.
            </li>
            <li>
              <Strong>Slides received: 0</Strong> — the console is not reaching it. Check a slide is live and that the
              link carries the same session key as the one in Devices.
            </li>
            <li>
              <Strong>Panel right, screen empty</Strong> — the source is under the camera, its eye is off, or the
              overlay is blanked in the Stream panel.
            </li>
            <li>
              <Strong>Nothing changed after an update</Strong> — reload this console <em>and</em> refresh the source.
            </li>
          </ul>
        </More>

        <More title="Sending it on as NDI">
          <p>
            A web page cannot produce NDI. Install the <Strong>DistroAV</Strong> plugin in OBS and switch on its NDI
            output — OBS then broadcasts the whole program, lower third included.
          </p>
        </More>
      </div>
    </div>
  </Modal>
);
