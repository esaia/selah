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

import { SortHandle } from "@/components/studio/shared/SortHandle";
import { LIFTED_SLOT, useSortable, type Sortable } from "@/components/studio/shared/sortable";

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
        "group relative rounded-studio border transition-colors duration-150",
        message.visible
          ? "border-studio-accent bg-studio-accent/[0.06]"
          : "border-studio-border bg-studio-bg focus-within:border-studio-accent/50",
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

              return {
                ...current,
                messages: messages.length ? messages : [newMessage()],
              };
            })
          }
        >
          <Trash2 className="size-3.5" />
        </IconButton>

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

export const TimerMessages = () => {
  const { timer, updateTimer } = useStudio();

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
