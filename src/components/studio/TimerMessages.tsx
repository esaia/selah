"use client";

import { Expand, Plus, Trash2, Zap } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import { useStudio } from "@/lib/studio/StudioProvider";
import {
  MESSAGE_COLORS,
  newMessage,
  type MessageColor,
  type TimerMessage,
} from "@/lib/timer/model";

import { SortHandle } from "./SortHandle";
import { LIFTED_SLOT, useSortable, type Sortable } from "./sortable";

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
      "inline-flex size-6 items-center justify-center rounded-[4px] text-sm leading-none transition-colors",
      "duration-150 focus:outline-none",
      active
        ? "bg-studio-text/10 ring-1 ring-studio-border"
        : "hover:bg-studio-surface",
    )}
  >
    {children}
  </button>
);

const Card = ({
  message,
  index,
  sortable,
}: {
  message: TimerMessage;
  index: number;
  sortable: Sortable<TimerMessage>;
}) => {
  const { updateTimer } = useStudio();

  const patch = (fields: Partial<TimerMessage>) =>
    updateTimer((current) => ({
      ...current,
      messages: current.messages.map((item) =>
        item.id === message.id ? { ...item, ...fields } : item,
      ),
    }));

  return (
    <li
      {...sortable.row(message.id)}
      className={cn(
        // The console's ordinary radius, not the larger one: `rounded-studio-lg`
        // is for surfaces that float — a modal, a menu — and a card sitting in
        // a list reads as a pill at that corner.
        "group relative rounded-studio border transition-colors duration-150",
        // A message on the screen is tinted rather than repainted: same border
        // width, same padding, so nothing under it moves when it goes up.
        message.visible
          ? "border-studio-accent bg-studio-accent/[0.06]"
          : "border-studio-border bg-studio-bg focus-within:border-studio-accent/50",
        // The browser snapshots the ghost before this paints, so the empty
        // berth lands on the slot the card is holding open rather than on the
        // one in the air.
        sortable.lifted === message.id && LIFTED_SLOT,
      )}
    >
      <div className="flex items-stretch">
        <SortHandle
          index={index}
          className="w-6 rounded-l-studio"
          {...sortable.handle(message.id)}
        />

        <textarea
          rows={2}
          value={message.text}
          placeholder="Message for the screen…"
          onChange={(event) => patch({ text: event.target.value })}
          style={{
            // White ink would be invisible on paper, so only the two tints show.
            color:
              message.color === "white"
                ? undefined
                : MESSAGE_COLORS[message.color],
            fontWeight: message.bold ? 700 : 400,
            textTransform: message.caps ? "uppercase" : "none",
          }}
          className="w-full resize-none bg-transparent py-2 pr-3 text-sm leading-snug text-studio-text
            placeholder:text-studio-faint focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-1 border-t border-studio-divider px-2 py-1.5">
        <IconButton
          label="Remove this message"
          tone="danger"
          onClick={() =>
            updateTimer((current) => {
              const messages = current.messages.filter(
                (item) => item.id !== message.id,
              );

              // Never down to nothing: the last card is emptied rather than
              // taken away, so there is always somewhere to write.
              return {
                ...current,
                messages: messages.length ? messages : [newMessage()],
              };
            })
          }
        >
          <Trash2 className="size-3.5" />
        </IconButton>

        {/* Flashing something the outputs are not showing does nothing, so the
            button waits for the message to be up. */}
        <IconButton
          label={
            message.visible
              ? "Flash this message once, to catch an eye"
              : "Show this message first, then it can be flashed"
          }
          disabled={!message.visible}
          onClick={() => patch({ flashAt: Date.now() })}
        >
          <Zap className="size-3.5" />
        </IconButton>

        <span aria-hidden="true" className="mx-1 h-4 w-px bg-studio-divider" />

        {(Object.keys(MESSAGE_COLORS) as MessageColor[]).map((color) => (
          <Chip
            key={color}
            label={`${color} text`}
            active={message.color === color}
            onClick={() => patch({ color })}
            // The swatch is the colour the message will be, and the console is
            // dark: white ink reads as white here, not as the old paper ink.
            style={{ color: MESSAGE_COLORS[color] }}
          >
            <span className="underline">A</span>
          </Chip>
        ))}

        <Chip
          label="Bold"
          active={message.bold}
          onClick={() => patch({ bold: !message.bold })}
        >
          <span className="font-bold">B</span>
        </Chip>

        <Chip
          label="Capitals"
          active={message.caps}
          onClick={() => patch({ caps: !message.caps })}
        >
          <span className="text-[11px] font-semibold">AA</span>
        </Chip>

        <div className="ml-auto flex items-center">
          <button
            type="button"
            aria-pressed={message.visible}
            onClick={() => patch({ visible: !message.visible })}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-l-studio border px-2.5 text-xs font-medium",
              "transition-colors duration-150 focus:outline-none",
              message.visible
                ? "border-studio-bar bg-studio-bar text-white"
                : "border-studio-border bg-studio-bg text-studio-text hover:bg-studio-surface",
            )}
          >
            {/* The label never moves; only the tally lights. */}
            <span
              aria-hidden="true"
              className={cn(
                "size-2 rounded-full transition-colors duration-150",
                message.visible
                  ? "bg-studio-accent shadow-[0_0_6px_1px_var(--color-studio-accent)]"
                  : "bg-studio-faint",
              )}
            />
            Show
          </button>

          <button
            type="button"
            title="Fill the whole screen with this message"
            aria-label="Fill the whole screen with this message"
            aria-pressed={message.fullScreen}
            onClick={() => patch({ fullScreen: !message.fullScreen })}
            className={cn(
              "-ml-px inline-flex h-7 w-8 items-center justify-center rounded-r-studio border",
              "transition-colors duration-150 focus:outline-none",
              message.fullScreen
                ? "border-studio-accent bg-studio-accent text-studio-onaccent"
                : message.visible
                  ? "border-studio-bar bg-studio-bar text-white/70 hover:text-white"
                  : "border-studio-border bg-studio-bg text-studio-muted hover:bg-studio-surface hover:text-studio-text",
            )}
          >
            <Expand className="size-3.5" />
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
 * up at the moment they are needed. One marked full screen takes the output
 * over instead, digits and all.
 *
 * The order is the operator's, dragged by the handle, so the cards read down
 * the column in the order the service will want them.
 */
export const TimerMessages = () => {
  const { timer, updateTimer } = useStudio();

  // Reordered by id rather than by the slots the cards were dragged through:
  // the list can have been rewritten by another console while one was in the air.
  const sortable = useSortable(
    timer.messages,
    (message) => message.id,
    (ids) =>
      updateTimer((current) => {
        const known = new Set(ids);

        return {
          ...current,
          messages: [
            ...ids
              .map((id) => current.messages.find((item) => item.id === id))
              .filter((item): item is TimerMessage => Boolean(item)),
            ...current.messages.filter((item) => !known.has(item.id)),
          ],
        };
      }),
  );

  return (
    <section className="space-y-2">
      {/* The gaps between the cards belong to the list, and a release in one of
          them is still a release on the order the drag arrived at. */}
      <ul className="space-y-2" {...sortable.list()}>
        {sortable.items.map((message, index) => (
          <Card
            key={message.id}
            message={message}
            index={index}
            sortable={sortable}
          />
        ))}
      </ul>

      <Button
        icon={<Plus className="size-3.5" />}
        onClick={() =>
          updateTimer((current) => ({
            ...current,
            messages: [...current.messages, newMessage()],
          }))
        }
      >
        Add message
      </Button>
    </section>
  );
};
