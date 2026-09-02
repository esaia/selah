"use client";

import { Expand, GripVertical, Plus, Trash2, Zap } from "lucide-react";
import {
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from "react";

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

/** Which half of a card the pointer is over, so a drop knows where to land. */
const sideOf = (event: DragEvent<HTMLElement>) => {
  const box = event.currentTarget.getBoundingClientRect();

  return event.clientY - box.top < box.height / 2 ? "before" : "after";
};

const Card = ({
  message,
  index,
  lifted,
  onLift,
  onDrop,
}: {
  message: TimerMessage;
  index: number;
  lifted: string | null;
  onLift: (id: string | null) => void;
  onDrop: (to: number) => void;
}) => {
  const { updateTimer } = useStudio();
  const [side, setSide] = useState<"before" | "after" | null>(null);

  const patch = (fields: Partial<TimerMessage>) =>
    updateTimer((current) => ({
      ...current,
      messages: current.messages.map((item) =>
        item.id === message.id ? { ...item, ...fields } : item,
      ),
    }));

  const carried = lifted === message.id;
  const target = Boolean(lifted) && !carried;

  return (
    <li
      onDragOver={(event) => {
        if (!target) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setSide(sideOf(event));
      }}
      onDragLeave={() => setSide(null)}
      onDrop={(event) => {
        if (!target) return;

        event.preventDefault();
        setSide(null);
        onDrop(sideOf(event) === "after" ? index + 1 : index);
      }}
      className={cn(
        // The console's ordinary radius, not the larger one: `rounded-studio-lg`
        // is for surfaces that float — a modal, a menu — and a card sitting in
        // a list reads as a pill at that corner.
        "relative rounded-studio border transition-colors duration-150",
        // A message on the screen is tinted rather than repainted: same border
        // width, same padding, so nothing under it moves when it goes up.
        message.visible
          ? "border-studio-accent bg-studio-accent/[0.06]"
          : "border-studio-border bg-white focus-within:border-studio-accent/50",
        carried && "opacity-40",
      )}
    >
      {side ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 z-10 h-0.5 rounded-full bg-studio-accent",
            side === "before" ? "-top-1" : "-bottom-1",
          )}
        />
      ) : null}

      <div className="flex items-stretch">
        <span
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            // Firefox refuses to start a drag without a payload.
            event.dataTransfer.setData("text/plain", message.id);
            onLift(message.id);
          }}
          onDragEnd={() => {
            onLift(null);
            setSide(null);
          }}
          title="Drag to reorder"
          className="flex w-5 shrink-0 cursor-grab items-center justify-center rounded-l-studio text-studio-faint
            transition-colors duration-150 hover:text-studio-muted active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </span>

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

      <div className="flex items-center gap-0.5 border-t border-studio-divider px-2 py-1.5">
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

        <IconButton
          label="Flash this message once, to catch an eye"
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
            style={{
              color: color === "white" ? "#111318" : MESSAGE_COLORS[color],
            }}
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
                : "border-studio-border bg-white text-studio-text hover:bg-studio-surface",
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
                ? "border-studio-accent bg-studio-accent text-white"
                : message.visible
                  ? "border-studio-bar bg-studio-bar text-white/70 hover:text-white"
                  : "border-studio-border bg-white text-studio-muted hover:bg-studio-surface hover:text-studio-text",
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
  const [lifted, setLifted] = useState<string | null>(null);

  // Moved by id rather than by the index it was lifted from: the list can have
  // been rewritten by another console while the card was in the air.
  const moveTo = (to: number) =>
    updateTimer((current) => {
      const from = current.messages.findIndex((item) => item.id === lifted);

      if (from < 0) return current;

      const messages = [...current.messages];
      const [moved] = messages.splice(from, 1);

      messages.splice(from < to ? to - 1 : to, 0, moved);

      return { ...current, messages };
    });

  return (
    <section className="space-y-2">
      <ul className="space-y-2">
        {timer.messages.map((message, index) => (
          <Card
            key={message.id}
            message={message}
            index={index}
            lifted={lifted}
            onLift={setLifted}
            onDrop={(to) => {
              moveTo(to);
              setLifted(null);
            }}
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
