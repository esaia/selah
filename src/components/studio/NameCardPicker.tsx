'use client';

import { cn } from '@/lib/cn';
import { TEMPLATES, type Template } from '@/lib/lower3rd/card';

/**
 * One design, drawn from the real markup and shrunk into a tile.
 *
 * The same trick the lower third's own look picker uses, and for the same
 * reason: a drawing of a design and the design itself drift the moment either
 * changes, so the tile renders the thing rather than a picture of it. A new
 * design in the stylesheet previews itself.
 */
const Preview = ({ template, title, subtitle }: { template: Template; title: string; subtitle: string }) => (
  <div className="nc-preview">
    <div className={`namecard namecard--${template} namecard--in`}>
      <div className="namecard-inner">
        <p className="namecard-title">{title}</p>
        {subtitle ? <p className="namecard-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  </div>
);

/**
 * Picks the look of a name card by showing it with the operator's own words
 * in it — "Marquee" and "Offset" mean nothing until you have seen them, and
 * less still until you have seen your own pastor's name in them.
 */
export const NameCardPicker = ({
  value,
  onChange,
  title,
  subtitle,
}: {
  value: Template;
  onChange: (template: Template) => void;
  title: string;
  subtitle: string;
}) => (
  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
    {TEMPLATES.map(({ value: template, label }) => (
      <button
        key={template}
        type="button"
        aria-pressed={value === template}
        onClick={() => onChange(template)}
        className={cn(
          'group overflow-hidden rounded-studio border text-left transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40',
          value === template
            ? 'border-studio-accent ring-1 ring-studio-accent'
            : 'border-studio-border hover:border-studio-faint',
        )}
      >
        <Preview template={template} title={title} subtitle={subtitle} />

        <span
          className={cn(
            'block truncate px-1.5 py-1 text-[11px] font-medium',
            value === template ? 'bg-studio-accent text-white' : 'bg-white text-studio-muted',
          )}
        >
          {label}
        </span>
      </button>
    ))}
  </div>
);
