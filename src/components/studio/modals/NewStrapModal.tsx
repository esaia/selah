'use client';

import { Plus } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { Colorway } from '@/lib/lower3rd/colors';
import type { CustomFont } from '@/lib/projector/fonts';
import { startingTemplate, templateFromVariant, type SlideTemplate, type TemplateTarget } from '@/lib/projector/template';
import { Modal } from '@/components/ui/Modal';
import type { Align } from '@/lib/types';

import { Preview, VARIANTS } from '@/components/studio/pickers/LowerThirdStylePicker';
import { CUSTOM_LOOK } from '@/lib/projector/looks';

export const NewStrapModal = ({
  open,
  onClose,
  kind,
  top,
  lyrics,
  font,
  fonts,
  align,
  colors,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  kind: TemplateTarget;
  top: boolean;
  lyrics: boolean;
  font: string;
  fonts: CustomFont[];
  align: Align;
  colors: Colorway;
  onPick: (template: SlideTemplate) => void;
}) => {
  const pick = (template: SlideTemplate) => {
    onPick(template);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New template" width="max-w-2xl">
      <p className="mb-3 text-[11px] leading-snug text-studio-faint">
        Start from one of the shipped looks, already in your colours, or draw on a blank one.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => pick(startingTemplate(kind))}
          className="block w-full overflow-hidden rounded-studio border border-studio-border text-left
            transition-colors duration-150 hover:border-studio-accent
            focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
        >
          <div className="flex aspect-video w-full items-center justify-center bg-studio-surface text-studio-muted">
            <Plus className="size-5" />
          </div>

          <span className="block truncate bg-studio-bg px-1.5 py-1 text-[11px] font-medium text-studio-muted">
            Blank
          </span>
        </button>

        {VARIANTS.filter(variant => variant.value !== CUSTOM_LOOK).map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => pick(templateFromVariant(value, kind, colors))}
            className={cn(
              'block w-full overflow-hidden rounded-studio border border-studio-border text-left',
              'transition-colors duration-150 hover:border-studio-accent',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
            )}
          >
            <Preview variant={value} top={top} lyrics={lyrics} font={font} fonts={fonts} align={align} colors={colors} />

            <span className="block truncate bg-studio-bg px-1.5 py-1 text-[11px] font-medium text-studio-muted">
              {label}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
};
