'use client';

import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { useStudio } from '@/lib/studio/StudioProvider';
import { MESSAGE_COLORS, newMessage, type MessageColor, type TimerMessage } from '@/lib/timer/model';

/** The one-character style buttons under each message. */
const Chip = ({
  label,
  active,
  style,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  style?: CSSProperties;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active}
    onClick={onClick}
    style={style}
    className={cn(
      'inline-flex size-6 items-center justify-center rounded-[4px] text-sm leading-none transition-colors',
      'duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
      active ? 'bg-studio-text/10 ring-1 ring-studio-border' : 'hover:bg-studio-surface',
    )}
  >
    {children}
  </button>
);

const Card = ({ message }: { message: TimerMessage }) => {
  const { updateTimer } = useStudio();

  const patch = (fields: Partial<TimerMessage>) =>
    updateTimer(current => ({
      ...current,
      messages: current.messages.map(item => (item.id === message.id ? { ...item, ...fields } : item)),
    }));

  return (
    <li className="rounded-studio-lg border border-studio-border bg-white">
      <textarea
        rows={2}
        value={message.text}
        placeholder="Message for the screen…"
        onChange={event => patch({ text: event.target.value })}
        style={{
          // White ink would be invisible on paper, so only the two tints show.
          color: message.color === 'white' ? undefined : MESSAGE_COLORS[message.color],
          fontWeight: message.bold ? 700 : 400,
          textTransform: message.caps ? 'uppercase' : 'none',
        }}
        className="w-full resize-none rounded-t-studio-lg bg-transparent px-3 py-2 text-sm leading-snug
          text-studio-text placeholder:text-studio-faint focus:outline-none focus-visible:ring-2
          focus-visible:ring-studio-accent/40 focus-visible:ring-inset"
      />

      <div className="flex items-center gap-0.5 border-t border-studio-divider px-2 py-1.5">
        {(Object.keys(MESSAGE_COLORS) as MessageColor[]).map(color => (
          <Chip
            key={color}
            label={`${color} text`}
            active={message.color === color}
            onClick={() => patch({ color })}
            style={{ color: color === 'white' ? '#111318' : MESSAGE_COLORS[color] }}
          >
            <span className="underline">A</span>
          </Chip>
        ))}

        <Chip label="Bold" active={message.bold} onClick={() => patch({ bold: !message.bold })}>
          <span className="font-bold">B</span>
        </Chip>

        <Chip label="Capitals" active={message.caps} onClick={() => patch({ caps: !message.caps })}>
          <span className="text-[11px] font-semibold">AA</span>
        </Chip>

        <div className="ml-auto flex items-center gap-1">
          <IconButton
            label="Remove this message"
            tone="danger"
            onClick={() =>
              updateTimer(current => {
                const messages = current.messages.filter(item => item.id !== message.id);

                // Never down to nothing: the last card is emptied rather than
                // taken away, so there is always somewhere to write.
                return { ...current, messages: messages.length ? messages : [newMessage()] };
              })
            }
          >
            <Trash2 className="size-3.5" />
          </IconButton>

          <button
            type="button"
            aria-pressed={message.visible}
            onClick={() => patch({ visible: !message.visible })}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-studio border px-2.5 text-xs font-medium',
              'transition-colors duration-150 focus:outline-none focus-visible:ring-2',
              'focus-visible:ring-studio-accent/40',
              message.visible
                ? 'border-studio-accent bg-studio-accent text-white'
                : 'border-studio-border bg-white text-studio-text hover:bg-studio-surface',
            )}
          >
            {message.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            {message.visible ? 'On screen' : 'Show'}
          </button>
        </div>
      </div>
    </li>
  );
};

/**
 * Notes for whoever is on stage: "wrap up", "the mic is live", a name to
 * mention. They sit under the digits on every timer output, and each is shown
 * or hidden on its own — so several can be written before the service and put
 * up at the moment they are needed.
 */
export const TimerMessages = () => {
  const { timer, updateTimer } = useStudio();

  return (
    <section className="space-y-2">
      <ul className="space-y-2">
        {timer.messages.map(message => (
          <Card key={message.id} message={message} />
        ))}
      </ul>

      <Button
        icon={<Plus className="size-3.5" />}
        onClick={() => updateTimer(current => ({ ...current, messages: [...current.messages, newMessage()] }))}
      >
        Add message
      </Button>
    </section>
  );
};
